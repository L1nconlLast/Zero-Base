import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface NotificationPreferencesRow {
  user_id: string;
  push_enabled: boolean | null;
}

interface ProfileNotificationPreferencesRow {
  user_id: string;
  study_reminders: boolean | null;
  timezone: string | null;
}

interface UserActivityRow {
  user_id: string;
  last_seen_at: string | null;
}

interface PushDeliveryEventRow {
  user_id: string;
  tag: string | null;
}

interface RecentFinishedSessionRow {
  id: string;
  user_id: string;
  finished_at: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DAY1_NOTIFICATION_ROUTE = '/resume-session';
const DAY1_NOTIFICATION_SOURCE = 'd1_notification';
const DAY1_NOTIFICATION_TAG_PREFIX = 'd1_notification_sent:';
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const DAY1_NOTIFICATION_VARIANTS = [
  {
    title: 'Sua proxima missao ja esta pronta (15 min)',
    body: 'Continue de onde parou ontem.',
  },
  {
    title: 'Voce comecou bem ontem',
    body: 'Faltam so 3 questoes para avancar mais um nivel.',
  },
  {
    title: 'Nao quebre sua sequencia.',
    body: 'Volte hoje e continue sua evolucao.',
  },
] as const;

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || 'mailto:suporte@zerobase.app';

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const toWebPushSubscription = (row: PushSubscriptionRow) => ({
  endpoint: row.endpoint,
  keys: {
    p256dh: row.p256dh,
    auth: row.auth,
  },
});

const getZonedParts = (date: Date, timeZone: string): { year: number; month: number; day: number; hour: number } => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const values = formatter.formatToParts(date).reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  return {
    year: Number(values.year || date.getUTCFullYear()),
    month: Number(values.month || date.getUTCMonth() + 1),
    day: Number(values.day || date.getUTCDate()),
    hour: Number(values.hour || 0),
  };
};

const toDateKeyInTimeZone = (date: Date, timeZone: string): string => {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const getCalendarDayDiff = (leftDateKey: string, rightDateKey: string): number => {
  const left = new Date(`${leftDateKey}T00:00:00Z`).getTime();
  const right = new Date(`${rightDateKey}T00:00:00Z`).getTime();
  return Math.round((left - right) / DAY_IN_MS);
};

const hashString = (value: string): number =>
  value.split('').reduce((accumulator, character) => ((accumulator * 31) + character.charCodeAt(0)) >>> 0, 7);

export const buildDay1NotificationTag = (sessionId: string): string =>
  `${DAY1_NOTIFICATION_TAG_PREFIX}${sessionId}`;

export const isWithinDay1ResumeWindow = (date: Date, timeZone: string): boolean => {
  const { hour } = getZonedParts(date, timeZone);
  return hour === 12 || (hour >= 18 && hour <= 20);
};

export const isDay1ResumeDue = (input: {
  finishedAt: string;
  lastSeenAt?: string | null;
  now?: Date;
  timeZone?: string | null;
}): boolean => {
  const timeZone = input.timeZone || DEFAULT_TIMEZONE;
  const finishedAt = new Date(input.finishedAt);
  const now = input.now || new Date();

  if (Number.isNaN(finishedAt.getTime()) || Number.isNaN(now.getTime())) {
    return false;
  }

  if (input.lastSeenAt) {
    const lastSeenAt = new Date(input.lastSeenAt);
    if (!Number.isNaN(lastSeenAt.getTime()) && lastSeenAt.getTime() > finishedAt.getTime()) {
      return false;
    }
  }

  const finishedDateKey = toDateKeyInTimeZone(finishedAt, timeZone);
  const nowDateKey = toDateKeyInTimeZone(now, timeZone);
  return getCalendarDayDiff(nowDateKey, finishedDateKey) === 1 && isWithinDay1ResumeWindow(now, timeZone);
};

export const pickDay1NotificationCopy = (userId: string) =>
  DAY1_NOTIFICATION_VARIANTS[hashString(userId) % DAY1_NOTIFICATION_VARIANTS.length];

const loadRecentFinishedSessions = async (now: Date): Promise<RecentFinishedSessionRow[]> => {
  if (!supabase) {
    return [];
  }

  const cutoffIso = new Date(now.getTime() - (3 * DAY_IN_MS)).toISOString();
  const sprint2Response = await supabase
    .from('study_sessions')
    .select('id, user_id, finished_at, created_at')
    .eq('status', 'finished')
    .not('finished_at', 'is', null)
    .gte('finished_at', cutoffIso)
    .order('finished_at', { ascending: false })
    .limit(500);

  if (!sprint2Response.error) {
    return (sprint2Response.data || [])
      .map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        finished_at: String(row.finished_at || row.created_at || ''),
      }))
      .filter((row) => Boolean(row.finished_at));
  }

  const fallbackResponse = await supabase
    .from('study_sessions')
    .select('id, user_id, date, created_at')
    .eq('goal_met', true)
    .gte('date', cutoffIso)
    .order('date', { ascending: false })
    .limit(500);

  if (fallbackResponse.error) {
    throw new Error(`loadRecentFinishedSessions failed: ${fallbackResponse.error.message}`);
  }

  return (fallbackResponse.data || [])
    .map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      finished_at: String(row.date || row.created_at || ''),
    }))
    .filter((row) => Boolean(row.finished_at));
};

class PushNotificationService {
  isConfigured(): boolean {
    return Boolean(supabase && vapidPublicKey && vapidPrivateKey);
  }

  getPublicKey(): string | null {
    return vapidPublicKey || null;
  }

  async upsertSubscription(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      throw new Error(`push subscription upsert failed: ${error.message}`);
    }

    await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: input.userId,
          push_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  }

  async markUserActivity(input: {
    userId: string;
    action?: string;
    appVersion?: string;
    platform?: string;
  }): Promise<void> {
    if (!supabase) return;

    await supabase
      .from('user_activity')
      .upsert(
        {
          user_id: input.userId,
          last_seen_at: new Date().toISOString(),
          last_action: input.action || null,
          app_version: input.appVersion || null,
          platform: input.platform || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  }

  private async logDeliveryEvent(input: {
    userId: string;
    subscriptionId?: string;
    title: string;
    body: string;
    tag?: string;
    status: 'sent' | 'failed' | 'expired';
    errorMessage?: string;
  }): Promise<void> {
    if (!supabase) return;

    await supabase.from('push_delivery_events').insert({
      user_id: input.userId,
      subscription_id: input.subscriptionId || null,
      title: input.title,
      body: input.body,
      tag: input.tag || null,
      status: input.status,
      error_message: input.errorMessage || null,
    });
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.isConfigured() || !supabase) return 0;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .eq('user_id', userId);

    if (error || !data?.length) {
      return 0;
    }

    let sent = 0;
    for (const row of data as PushSubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(row),
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            tag: payload.tag || 'zero-base-reminder',
            url: payload.url || '/',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          }),
        );

        sent += 1;

        await supabase
          .from('push_subscriptions')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', row.id);

        await this.logDeliveryEvent({
          userId,
          subscriptionId: row.id,
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          status: 'sent',
        });
      } catch (error: unknown) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
          await this.logDeliveryEvent({
            userId,
            subscriptionId: row.id,
            title: payload.title,
            body: payload.body,
            tag: payload.tag,
            status: 'expired',
            errorMessage: 'Subscription expired (404/410)',
          });
          continue;
        }

        await this.logDeliveryEvent({
          userId,
          subscriptionId: row.id,
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown push error',
        });
      }
    }

    return sent;
  }

  async runDay1ResumeReminderJob(now = new Date()): Promise<{ users: number; sent: number }> {
    if (!this.isConfigured() || !supabase) {
      return { users: 0, sent: 0 };
    }

    const recentFinishedSessions = await loadRecentFinishedSessions(now);
    if (!recentFinishedSessions.length) {
      return { users: 0, sent: 0 };
    }

    const latestSessionByUser = new Map<string, RecentFinishedSessionRow>();
    recentFinishedSessions.forEach((session) => {
      if (!latestSessionByUser.has(session.user_id)) {
        latestSessionByUser.set(session.user_id, session);
      }
    });

    const userIds = [...latestSessionByUser.keys()];
    const [activityResponse, pushPreferencesResponse, profilePreferencesResponse, deliveryEventsResponse] = await Promise.all([
      supabase
        .from('user_activity')
        .select('user_id, last_seen_at')
        .in('user_id', userIds),
      supabase
        .from('user_notification_preferences')
        .select('user_id, push_enabled')
        .in('user_id', userIds),
      supabase
        .from('user_notification_prefs')
        .select('user_id, study_reminders, timezone')
        .in('user_id', userIds),
      supabase
        .from('push_delivery_events')
        .select('user_id, tag')
        .in('user_id', userIds)
        .like('tag', `${DAY1_NOTIFICATION_TAG_PREFIX}%`)
        .gte('created_at', new Date(now.getTime() - (3 * DAY_IN_MS)).toISOString()),
    ]);

    const activityMap = new Map(
      (activityResponse.data || []).map((row) => [row.user_id, row as UserActivityRow]),
    );
    const pushPreferencesMap = new Map(
      (pushPreferencesResponse.data || []).map((row) => [row.user_id, row as NotificationPreferencesRow]),
    );
    const profilePreferencesMap = new Map(
      (profilePreferencesResponse.data || []).map((row) => [row.user_id, row as ProfileNotificationPreferencesRow]),
    );
    const sentTags = new Set((deliveryEventsResponse.data || []).map((row) => (row as PushDeliveryEventRow).tag).filter(Boolean));

    let sent = 0;
    let users = 0;

    for (const [userId, session] of latestSessionByUser.entries()) {
      const pushPreferences = pushPreferencesMap.get(userId);
      const profilePreferences = profilePreferencesMap.get(userId);
      const activity = activityMap.get(userId);
      const timezone = profilePreferences?.timezone || DEFAULT_TIMEZONE;
      const tag = buildDay1NotificationTag(session.id);

      if (pushPreferences?.push_enabled === false) {
        continue;
      }

      if (profilePreferences?.study_reminders === false) {
        continue;
      }

      if (sentTags.has(tag)) {
        continue;
      }

      if (!isDay1ResumeDue({
        finishedAt: session.finished_at,
        lastSeenAt: activity?.last_seen_at,
        now,
        timeZone: timezone,
      })) {
        continue;
      }

      const copy = pickDay1NotificationCopy(userId);
      users += 1;
      sent += await this.sendToUser(userId, {
        title: copy.title,
        body: copy.body,
        tag,
        url: `${DAY1_NOTIFICATION_ROUTE}?source=${DAY1_NOTIFICATION_SOURCE}&resumeKey=${encodeURIComponent(session.id)}`,
      });
    }

    return { users, sent };
  }

  async runInactivityReminderJob(inactiveHours = 48): Promise<{ users: number; sent: number }> {
    if (!this.isConfigured() || !supabase) return { users: 0, sent: 0 };

    const { data: activityRows, error } = await supabase
      .from('user_activity')
      .select('user_id, last_seen_at')
      .limit(400);

    if (error || !activityRows?.length) {
      return { users: 0, sent: 0 };
    }

    const userIds = activityRows.map((row) => row.user_id);
    const { data: prefRows } = await supabase
      .from('user_notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', userIds);

    const prefsMap = new Map(
      (prefRows || [])
        .filter((row) => row.push_enabled !== false)
        .map((row) => [row.user_id, row as NotificationPreferencesRow]),
    );

    const dueUsers = activityRows
      .filter((row) => {
        const threshold = inactiveHours;
        const cutoff = Date.now() - threshold * 60 * 60 * 1000;
        return prefsMap.has(row.user_id) && new Date(row.last_seen_at).getTime() <= cutoff;
      })
      .slice(0, 200);

    if (!dueUsers.length) {
      return { users: 0, sent: 0 };
    }

    let sent = 0;
    for (const row of dueUsers as Array<{ user_id: string }>) {
      sent += await this.sendToUser(row.user_id, {
        title: 'Seu plano de estudos sente sua falta',
        body: 'Volte hoje com uma meta micro de 15 minutos para manter o ritmo.',
        tag: 'inactivity-48h',
        url: '/',
      });
    }

    return { users: dueUsers.length, sent };
  }
}

export const pushNotificationService = new PushNotificationService();
