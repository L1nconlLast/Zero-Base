import { createClient } from '@supabase/supabase-js';

interface UpsertStreakInput {
  userId: string;
  incomingDays: number;
  incomingLastDay: string | null;
}

interface OnboardingStreakSnapshot {
  streakDays: number;
  streakLastDay: string | null;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const toDateOnly = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const isMissingTableError = (message?: string): boolean => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('onboarding_profile') && (normalized.includes('does not exist') || normalized.includes('undefined table'));
};

class OnboardingService {
  isConfigured(): boolean {
    return Boolean(supabase);
  }

  async getStreak(userId: string): Promise<OnboardingStreakSnapshot> {
    if (!supabase) {
      return { streakDays: 0, streakLastDay: null };
    }

    const { data, error } = await supabase
      .from('onboarding_profile')
      .select('streak_days, streak_last_day')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error.message)) {
        return { streakDays: 0, streakLastDay: null };
      }
      throw new Error(`getStreak failed: ${error.message}`);
    }

    return {
      streakDays: Number(data?.streak_days || 0),
      streakLastDay: toDateOnly(data?.streak_last_day) || null,
    };
  }

  async mergeAndSaveStreak(input: UpsertStreakInput): Promise<OnboardingStreakSnapshot> {
    if (!supabase) {
      return {
        streakDays: Math.max(0, Number(input.incomingDays || 0)),
        streakLastDay: toDateOnly(input.incomingLastDay),
      };
    }

    const current = await this.getStreak(input.userId);
    const incomingLastDay = toDateOnly(input.incomingLastDay);

    const mergedDays = Math.max(current.streakDays, Math.max(0, Number(input.incomingDays || 0)));
    const mergedLastDay = (() => {
      if (!current.streakLastDay) return incomingLastDay;
      if (!incomingLastDay) return current.streakLastDay;
      return current.streakLastDay > incomingLastDay ? current.streakLastDay : incomingLastDay;
    })();

    const { error } = await supabase
      .from('onboarding_profile')
      .upsert(
        {
          user_id: input.userId,
          streak_days: mergedDays,
          streak_last_day: mergedLastDay,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      if (isMissingTableError(error.message)) {
        return {
          streakDays: mergedDays,
          streakLastDay: mergedLastDay,
        };
      }
      throw new Error(`mergeAndSaveStreak failed: ${error.message}`);
    }

    return {
      streakDays: mergedDays,
      streakLastDay: mergedLastDay,
    };
  }
}

export const onboardingService = new OnboardingService();
