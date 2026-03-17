import { createClient } from '@supabase/supabase-js';

export interface TrackActivityInput {
  date?: string;
  minutesStudied?: number;
  sessionsCount?: number;
  loginCount?: number;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const toDateOnly = (raw: string | null | undefined): string => {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const normalizeDelta = (n: number | undefined): number => {
  const parsed = Number(n || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
};

const computeStreakDays = (dates: string[]): number => {
  if (dates.length === 0) return 0;

  const activeSet = new Set(dates);
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    if (activeSet.has(day)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterday = cursor.toISOString().slice(0, 10);
      if (activeSet.has(yesterday)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }

    break;
  }

  return streak;
};

class ActivityService {
  async trackActivity(userId: string, input: TrackActivityInput) {
    const date = toDateOnly(input.date);

    if (!supabase) {
      return {
        date,
        minutesStudied: Math.max(0, normalizeDelta(input.minutesStudied)),
        sessionsCount: Math.max(0, normalizeDelta(input.sessionsCount)),
        loginCount: Math.max(0, normalizeDelta(input.loginCount)),
      };
    }

    const { data: current, error: currentError } = await supabase
      .from('user_daily_activity')
      .select('minutes_studied,sessions_count,login_count')
      .eq('user_id', userId)
      .eq('activity_date', date)
      .maybeSingle();

    if (currentError) {
      throw new Error(`trackActivity load current failed: ${currentError.message}`);
    }

    const minutesStudied = Math.max(0, Number(current?.minutes_studied || 0) + normalizeDelta(input.minutesStudied));
    const sessionsCount = Math.max(0, Number(current?.sessions_count || 0) + normalizeDelta(input.sessionsCount));
    const loginCount = Math.max(0, Number(current?.login_count || 0) + normalizeDelta(input.loginCount));

    const { data: row, error: upsertError } = await supabase
      .from('user_daily_activity')
      .upsert({
        user_id: userId,
        activity_date: date,
        minutes_studied: minutesStudied,
        sessions_count: sessionsCount,
        login_count: loginCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,activity_date' })
      .select('activity_date,minutes_studied,sessions_count,login_count,updated_at')
      .single();

    if (upsertError) {
      throw new Error(`trackActivity upsert failed: ${upsertError.message}`);
    }

    await this.refreshAchievements(userId);

    return {
      date: row.activity_date,
      minutesStudied: Number(row.minutes_studied || 0),
      sessionsCount: Number(row.sessions_count || 0),
      loginCount: Number(row.login_count || 0),
      updatedAt: row.updated_at || null,
    };
  }

  private async refreshAchievements(userId: string): Promise<void> {
    if (!supabase) return;

    const [totalsRes, activityRes] = await Promise.all([
      supabase
        .from('user_daily_activity')
        .select('sessions_count')
        .eq('user_id', userId),
      supabase
        .from('user_daily_activity')
        .select('activity_date,minutes_studied,sessions_count,login_count')
        .eq('user_id', userId)
        .gte('activity_date', new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('activity_date', { ascending: false }),
    ]);

    if (totalsRes.error) {
      throw new Error(`refreshAchievements totals failed: ${totalsRes.error.message}`);
    }
    if (activityRes.error) {
      throw new Error(`refreshAchievements activity failed: ${activityRes.error.message}`);
    }

    const totalSessions = (totalsRes.data || []).reduce((acc, row) => acc + Number(row.sessions_count || 0), 0);

    const activeDates = (activityRes.data || [])
      .filter((row) => Number(row.minutes_studied || 0) > 0 || Number(row.sessions_count || 0) > 0 || Number(row.login_count || 0) > 0)
      .map((row) => String(row.activity_date).slice(0, 10));

    const streakDays = computeStreakDays(activeDates);

    const nowIso = new Date().toISOString();

    const achievementRows = [
      {
        user_id: userId,
        achievement_id: 'first_session',
        unlocked: totalSessions >= 1,
        unlocked_at: totalSessions >= 1 ? nowIso : null,
        progress: Math.min(totalSessions, 1),
        progress_target: 1,
      },
      {
        user_id: userId,
        achievement_id: 'streak_7',
        unlocked: streakDays >= 7,
        unlocked_at: streakDays >= 7 ? nowIso : null,
        progress: Math.min(streakDays, 7),
        progress_target: 7,
      },
      {
        user_id: userId,
        achievement_id: 'top_100',
        unlocked: false,
        unlocked_at: null,
        progress: 0,
        progress_target: 100,
      },
    ];

    for (const row of achievementRows) {
      const { data: current, error: currentError } = await supabase
        .from('user_achievements')
        .select('unlocked,unlocked_at,progress,progress_target')
        .eq('user_id', row.user_id)
        .eq('achievement_id', row.achievement_id)
        .maybeSingle();

      if (currentError) {
        throw new Error(`refreshAchievements current failed: ${currentError.message}`);
      }

      const unlockedAlready = Boolean(current?.unlocked);

      const { error } = await supabase
        .from('user_achievements')
        .upsert({
          user_id: row.user_id,
          achievement_id: row.achievement_id,
          unlocked: unlockedAlready || row.unlocked,
          unlocked_at: unlockedAlready ? current?.unlocked_at : row.unlocked_at,
          progress: Math.max(Number(current?.progress || 0), row.progress),
          progress_target: Math.max(Number(current?.progress_target || 1), row.progress_target),
        }, { onConflict: 'user_id,achievement_id' });

      if (error) {
        throw new Error(`refreshAchievements upsert failed: ${error.message}`);
      }
    }
  }
}

export const activityService = new ActivityService();
