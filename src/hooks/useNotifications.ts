import { useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

// ── Tipos ─────────────────────────────────────────────────────

export type NotificationType =
  | 'pomodoro_end'
  | 'daily_reminder'
  | 'achievement'
  | 'goal_not_met';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// ── Constantes ─────────────────────────────────────────────────

const ICON = '/pwa-192x192.png';
const BADGE = '/pwa-192x192.png';

// Horários dos lembretes diários (formato 24h)
const DAILY_REMINDER_HOUR = 8;    // 08:00 — lembrete matinal
const GOAL_CHECK_HOUR = 21;       // 21:00 — checar meta do dia

const PAYLOADS: Record<NotificationType, Omit<NotificationPayload, 'type'>> = {
  pomodoro_end: {
    title: 'Pomodoro finalizado',
    body: 'Ótimo trabalho. Hora de uma pausa merecida.',
    tag: 'pomodoro',
  },
  daily_reminder: {
    title: 'Hora de estudar',
    body: 'Seu futuro médico agradece cada minuto de estudo hoje.',
    tag: 'daily-reminder',
  },
  achievement: {
    title: 'Conquista desbloqueada',
    body: 'Você conquistou algo novo. Veja no app!',
    tag: 'achievement',
  },
  goal_not_met: {
    title: 'Meta do dia ainda em aberto',
    body: 'Você ainda não atingiu sua meta hoje. Ainda dá tempo!',
    tag: 'goal-not-met',
  },
};

// ── Hook ──────────────────────────────────────────────────────

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      logger.warn('Notificações não suportadas neste browser', 'Notifications');
      return false;
    }

    if (permissionRef.current === 'granted') return true;
    if (permissionRef.current === 'denied') return false;

    try {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
      logger.info(`Permissão de notificação: ${result}`, 'Notifications');
      return result === 'granted';
    } catch (err) {
      logger.error('Erro ao pedir permissão de notificação', 'Notifications', err);
      return false;
    }
  }, []);

  const notify = useCallback(async (type: NotificationType, overrides?: Partial<NotificationPayload>) => {
    if (permissionRef.current !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const base = PAYLOADS[type];
    const payload: NotificationPayload = {
      type,
      icon: ICON,
      badge: BADGE,
      ...base,
      ...overrides,
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge,
          tag: payload.tag,
          data: payload.data,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon,
          tag: payload.tag,
        });
      }

      logger.debug(`Notificação enviada: ${type}`, 'Notifications');
    } catch (err) {
      logger.error(`Erro ao enviar notificação: ${type}`, 'Notifications', err);
    }
  }, [requestPermission]);

  const notifyPomodoroEnd = useCallback(() =>
    notify('pomodoro_end'),
  [notify]);

  const notifyAchievement = useCallback((achievementName: string) =>
    notify('achievement', {
      body: `Você desbloqueou: "${achievementName}".`,
    }),
  [notify]);

  const notifyGoalNotMet = useCallback((minutesDone: number, goal: number) =>
    notify('goal_not_met', {
      body: `Você estudou ${minutesDone} min de ${goal} min hoje. Ainda dá tempo!`,
    }),
  [notify]);

  useEffect(() => {
    if (permissionRef.current !== 'granted') return;

    const checkSchedule = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      if (hour === DAILY_REMINDER_HOUR && minute === 0) {
        notify('daily_reminder');
      }

      if (hour === GOAL_CHECK_HOUR && minute === 0) {
        notify('goal_not_met');
      }
    };

    const interval = setInterval(checkSchedule, 60 * 1000);
    return () => clearInterval(interval);
  }, [notify]);

  return {
    requestPermission,
    notify,
    notifyPomodoroEnd,
    notifyAchievement,
    notifyGoalNotMet,
    isSupported: typeof Notification !== 'undefined',
    permission: permissionRef.current,
  };
}
