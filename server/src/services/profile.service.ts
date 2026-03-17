import { createClient } from '@supabase/supabase-js';

export type ProfileTheme = 'light' | 'dark' | 'system';
export type ProfileLanguage = 'pt' | 'en' | 'es';
export type ProfileDensity = 'compact' | 'normal' | 'spacious';
export type ProfilePreferredPeriod = 'morning' | 'afternoon' | 'night' | 'late_night';

export interface SaveProfileInput {
  displayName?: string;
  email?: string;
  avatarIcon?: string;
  avatarUrl?: string | null;
  theme?: ProfileTheme;
  language?: ProfileLanguage;
  density?: ProfileDensity;
  preferredPeriod?: ProfilePreferredPeriod;
}

export interface SaveNotificationPrefsInput {
  studyReminders?: boolean;
  unlockedAchievements?: boolean;
  groupActivity?: boolean;
  weeklyReport?: boolean;
  reminderTime?: string | null;
  timezone?: string;
}

interface DailyActivityRow {
  activity_date: string;
  minutes_studied: number;
  sessions_count: number;
  login_count: number;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const avatarBucket = process.env.SUPABASE_AVATAR_BUCKET?.trim() || 'avatars';

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const toDateOnly = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const buildHeatLevel = (minutes: number): 0 | 1 | 2 | 3 | 4 => {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 90) return 3;
  return 4;
};

const isActiveDay = (row: { minutes_studied?: number; sessions_count?: number; login_count?: number }): boolean => {
  return Number(row.minutes_studied || 0) > 0 || Number(row.sessions_count || 0) > 0 || Number(row.login_count || 0) > 0;
};

const computeCurrentStreak = (rows: DailyActivityRow[]): number => {
  if (rows.length === 0) return 0;

  const activeByDate = new Map<string, boolean>();
  rows.forEach((row) => {
    activeByDate.set(toDateOnly(row.activity_date) || row.activity_date, isActiveDay(row));
  });

  let streak = 0;
  const cursor = new Date();

  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    const active = activeByDate.get(day);

    if (active) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterday = cursor.toISOString().slice(0, 10);
      if (activeByDate.get(yesterday)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }

    break;
  }

  return streak;
};

const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
};

class ProfileService {
  isConfigured(): boolean {
    return Boolean(supabase);
  }

  async loadProfile(userId: string) {
    if (!supabase) {
      return {
        profile: null,
        notifications: null,
        stats: {
          totalMinutes365: 0,
          totalSessions365: 0,
          totalLogins365: 0,
          activeDays365: 0,
          currentStreakDays: 0,
        },
        achievements: [],
        heatmap: [],
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - 364);
    const sinceDate = since.toISOString().slice(0, 10);

    const [profileRes, notificationsRes, catalogRes, userAchievementsRes, heatmapRes] = await Promise.all([
      supabase
        .from('user_profile_preferences')
        .select('display_name,email,avatar_icon,avatar_url,theme,language,density,preferred_period,updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_notification_prefs')
        .select('study_reminders,unlocked_achievements,group_activity,weekly_report,reminder_time,timezone,updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('achievement_catalog')
        .select('key,title,description,xp_reward,category')
        .order('created_at', { ascending: true }),
      supabase
        .from('user_achievements')
        .select('achievement_id,unlocked,unlocked_at,progress,progress_target')
        .eq('user_id', userId),
      supabase
        .from('user_daily_activity')
        .select('activity_date,minutes_studied,sessions_count,login_count')
        .eq('user_id', userId)
        .gte('activity_date', sinceDate)
        .order('activity_date', { ascending: true }),
    ]);

    if (profileRes.error) throw new Error(`loadProfile profile failed: ${profileRes.error.message}`);
    if (notificationsRes.error) throw new Error(`loadProfile notifications failed: ${notificationsRes.error.message}`);
    if (catalogRes.error) throw new Error(`loadProfile catalog failed: ${catalogRes.error.message}`);
    if (userAchievementsRes.error) throw new Error(`loadProfile user achievements failed: ${userAchievementsRes.error.message}`);
    if (heatmapRes.error) throw new Error(`loadProfile heatmap failed: ${heatmapRes.error.message}`);

    const heatmapRows = (heatmapRes.data || []) as DailyActivityRow[];
    const heatmap = heatmapRows.map((row) => {
      const minutes = Number(row.minutes_studied || 0);
      const sessions = Number(row.sessions_count || 0);
      const logins = Number(row.login_count || 0);
      return {
        date: toDateOnly(row.activity_date) || row.activity_date,
        minutes,
        sessions,
        logins,
        level: buildHeatLevel(minutes),
      };
    });

    const totalMinutes365 = heatmap.reduce((acc, row) => acc + row.minutes, 0);
    const totalSessions365 = heatmap.reduce((acc, row) => acc + row.sessions, 0);
    const totalLogins365 = heatmap.reduce((acc, row) => acc + row.logins, 0);
    const activeDays365 = heatmap.filter((row) => row.minutes > 0 || row.sessions > 0 || row.logins > 0).length;
    const currentStreakDays = computeCurrentStreak(heatmapRows);

    const userAchievementsMap = new Map(
      (userAchievementsRes.data || []).map((row) => [
        row.achievement_id,
        {
          unlocked: Boolean(row.unlocked),
          unlockedAt: row.unlocked_at || null,
          progress: Number(row.progress || 0),
          progressTarget: Number(row.progress_target || 1),
        },
      ]),
    );

    const achievements = (catalogRes.data || []).map((item) => {
      const userProgress = userAchievementsMap.get(item.key);
      return {
        key: item.key,
        title: item.title,
        description: item.description,
        xpReward: Number(item.xp_reward || 0),
        category: item.category || null,
        unlocked: Boolean(userProgress?.unlocked),
        unlockedAt: userProgress?.unlockedAt || null,
        progress: userProgress?.progress ?? 0,
        progressTarget: userProgress?.progressTarget ?? 1,
      };
    });

    return {
      profile: profileRes.data
        ? {
            displayName: profileRes.data.display_name || '',
            email: profileRes.data.email || '',
            avatarIcon: profileRes.data.avatar_icon || 'brain',
            avatarUrl: profileRes.data.avatar_url || null,
            theme: (profileRes.data.theme as ProfileTheme) || 'system',
            language: (profileRes.data.language as ProfileLanguage) || 'pt',
            density: (profileRes.data.density as ProfileDensity) || 'normal',
            preferredPeriod: (profileRes.data.preferred_period as ProfilePreferredPeriod) || 'morning',
            updatedAt: profileRes.data.updated_at || null,
          }
        : null,
      notifications: notificationsRes.data
        ? {
            studyReminders: Boolean(notificationsRes.data.study_reminders),
            unlockedAchievements: Boolean(notificationsRes.data.unlocked_achievements),
            groupActivity: Boolean(notificationsRes.data.group_activity),
            weeklyReport: Boolean(notificationsRes.data.weekly_report),
            reminderTime: notificationsRes.data.reminder_time || null,
            timezone: notificationsRes.data.timezone || 'America/Sao_Paulo',
            updatedAt: notificationsRes.data.updated_at || null,
          }
        : null,
      stats: {
        totalMinutes365,
        totalSessions365,
        totalLogins365,
        activeDays365,
        currentStreakDays,
      },
      achievements,
      heatmap,
    };
  }

  async saveProfile(userId: string, input: SaveProfileInput) {
    if (!supabase) {
      return {
        displayName: input.displayName || '',
        email: input.email || '',
        avatarIcon: input.avatarIcon || 'brain',
        avatarUrl: input.avatarUrl || null,
        theme: input.theme || 'system',
        language: input.language || 'pt',
        density: input.density || 'normal',
        preferredPeriod: input.preferredPeriod || 'morning',
      };
    }

    const nowIso = new Date().toISOString();

    const { data: current, error: currentError } = await supabase
      .from('user_profile_preferences')
      .select('display_name,email,avatar,avatar_icon,avatar_url,theme,language,density,preferred_period,exam_goal,exam_date,preferred_track,profile_change_history')
      .eq('user_id', userId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`saveProfile load current failed: ${currentError.message}`);
    }

    const avatarIcon = input.avatarIcon ?? current?.avatar_icon ?? 'brain';

    const payload = {
      user_id: userId,
      display_name: input.displayName ?? current?.display_name ?? '',
      email: input.email ?? current?.email ?? null,
      avatar: current?.avatar ?? '🧠',
      avatar_icon: avatarIcon,
      avatar_url: input.avatarUrl ?? current?.avatar_url ?? null,
      theme: input.theme ?? ((current?.theme as ProfileTheme | undefined) || 'system'),
      language: input.language ?? ((current?.language as ProfileLanguage | undefined) || 'pt'),
      density: input.density ?? ((current?.density as ProfileDensity | undefined) || 'normal'),
      preferred_period: input.preferredPeriod ?? ((current?.preferred_period as ProfilePreferredPeriod | undefined) || 'morning'),
      exam_goal: current?.exam_goal ?? '',
      exam_date: current?.exam_date ?? null,
      preferred_track: current?.preferred_track ?? 'enem',
      profile_change_history: current?.profile_change_history ?? [],
      last_saved_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('user_profile_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('display_name,email,avatar_icon,avatar_url,theme,language,density,preferred_period,updated_at')
      .single();

    if (error) {
      throw new Error(`saveProfile failed: ${error.message}`);
    }

    return {
      displayName: data.display_name || '',
      email: data.email || '',
      avatarIcon: data.avatar_icon || 'brain',
      avatarUrl: data.avatar_url || null,
      theme: (data.theme as ProfileTheme) || 'system',
      language: (data.language as ProfileLanguage) || 'pt',
      density: (data.density as ProfileDensity) || 'normal',
      preferredPeriod: (data.preferred_period as ProfilePreferredPeriod) || 'morning',
      updatedAt: data.updated_at || null,
    };
  }

  async saveNotificationPrefs(userId: string, input: SaveNotificationPrefsInput) {
    if (!supabase) {
      return {
        studyReminders: input.studyReminders ?? true,
        unlockedAchievements: input.unlockedAchievements ?? true,
        groupActivity: input.groupActivity ?? false,
        weeklyReport: input.weeklyReport ?? true,
        reminderTime: input.reminderTime ?? null,
        timezone: input.timezone || 'America/Sao_Paulo',
      };
    }

    const nowIso = new Date().toISOString();

    const { data: current, error: currentError } = await supabase
      .from('user_notification_prefs')
      .select('study_reminders,unlocked_achievements,group_activity,weekly_report,reminder_time,timezone')
      .eq('user_id', userId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`saveNotificationPrefs load current failed: ${currentError.message}`);
    }

    const payload = {
      user_id: userId,
      study_reminders: input.studyReminders ?? current?.study_reminders ?? true,
      unlocked_achievements: input.unlockedAchievements ?? current?.unlocked_achievements ?? true,
      group_activity: input.groupActivity ?? current?.group_activity ?? false,
      weekly_report: input.weeklyReport ?? current?.weekly_report ?? true,
      reminder_time: input.reminderTime ?? current?.reminder_time ?? null,
      timezone: input.timezone ?? current?.timezone ?? 'America/Sao_Paulo',
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('user_notification_prefs')
      .upsert(payload, { onConflict: 'user_id' })
      .select('study_reminders,unlocked_achievements,group_activity,weekly_report,reminder_time,timezone,updated_at')
      .single();

    if (error) {
      throw new Error(`saveNotificationPrefs failed: ${error.message}`);
    }

    return {
      studyReminders: Boolean(data.study_reminders),
      unlockedAchievements: Boolean(data.unlocked_achievements),
      groupActivity: Boolean(data.group_activity),
      weeklyReport: Boolean(data.weekly_report),
      reminderTime: data.reminder_time || null,
      timezone: data.timezone || 'America/Sao_Paulo',
      updatedAt: data.updated_at || null,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!supabase) {
      return {
        avatarUrl: `https://cdn.zerobase.local/avatars/${userId}/${Date.now()}-${sanitizeFileName(file.originalname || 'avatar.png')}`,
      };
    }

    const safeName = sanitizeFileName(file.originalname || 'avatar.png');
    const path = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(avatarBucket)
      .upload(path, file.buffer, {
        cacheControl: '3600',
        contentType: file.mimetype || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`uploadAvatar storage failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);
    const avatarUrl = data.publicUrl;

    await this.saveProfile(userId, { avatarUrl });

    return { avatarUrl };
  }
}

export const profileService = new ProfileService();
