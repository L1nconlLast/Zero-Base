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
  inactivity_threshold_hours: number;
}

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
      } catch (err: unknown) {
        const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
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
          errorMessage: err instanceof Error ? err.message : 'Unknown push error',
        });
      }
    }

    return sent;
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
      .select('user_id, inactivity_threshold_hours, push_enabled')
      .in('user_id', userIds);

    const prefsMap = new Map(
      (prefRows || [])
        .filter((row) => row.push_enabled !== false)
        .map((row) => [row.user_id, row as NotificationPreferencesRow & { user_id: string }]),
    );

    const dueUsers = activityRows
      .filter((row) => {
        const pref = prefsMap.get(row.user_id);
        const threshold = pref?.inactivity_threshold_hours || inactiveHours;
        const cutoff = Date.now() - threshold * 60 * 60 * 1000;
        return new Date(row.last_seen_at).getTime() <= cutoff;
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
