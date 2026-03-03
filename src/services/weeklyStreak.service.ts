import { isSupabaseConfigured, supabase } from './supabase.client';

interface RecordWeeklyStreakResult {
  success: boolean;
  weekStart?: string;
  daysCompleted?: number;
  targetDays?: number;
  completed?: boolean;
  dayRegistered?: boolean;
  error?: string;
}

const assertClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).');
  }

  return supabase;
};

class WeeklyStreakService {
  async recordStudyDay(userId: string, studyDateIso?: string, targetDays = 4): Promise<RecordWeeklyStreakResult> {
    const client = assertClient();

    const normalizedDate = (() => {
      if (!studyDateIso) return undefined;
      const parsed = new Date(studyDateIso);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return parsed.toISOString().slice(0, 10);
    })();

    const { data, error } = await client.rpc('record_weekly_streak_day', {
      p_user_id: userId,
      p_study_date: normalizedDate ?? null,
      p_target_days: targetDays,
    });

    if (error) {
      throw new Error(`Erro ao registrar streak semanal: ${error.message}`);
    }

    const result = data as {
      success?: boolean;
      week_start?: string;
      days_completed?: number;
      target_days?: number;
      completed?: boolean;
      day_registered?: boolean;
      error?: string;
    } | null;

    return {
      success: Boolean(result?.success),
      weekStart: result?.week_start,
      daysCompleted: result?.days_completed,
      targetDays: result?.target_days,
      completed: result?.completed,
      dayRegistered: result?.day_registered,
      error: result?.error,
    };
  }
}

export const weeklyStreakService = new WeeklyStreakService();
