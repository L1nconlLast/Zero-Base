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
      } catch (err: unknown) {
        const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id);
        }
      }
    }

    return sent;
  }

  async runInactivityReminderJob(inactiveHours = 48): Promise<{ users: number; sent: number }> {
    if (!this.isConfigured() || !supabase) return { users: 0, sent: 0 };

    const cutoff = new Date(Date.now() - inactiveHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('user_profile')
      .select('user_id, updated_at')
      .lte('updated_at', cutoff)
      .limit(200);

    if (error || !data?.length) {
      return { users: 0, sent: 0 };
    }

    let sent = 0;
    for (const row of data as Array<{ user_id: string }>) {
      sent += await this.sendToUser(row.user_id, {
        title: 'Seu plano de estudos sente sua falta',
        body: 'Volte hoje com uma meta micro de 15 minutos para manter o ritmo.',
        tag: 'inactivity-48h',
        url: '/',
      });
    }

    return { users: data.length, sent };
  }
}

export const pushNotificationService = new PushNotificationService();
