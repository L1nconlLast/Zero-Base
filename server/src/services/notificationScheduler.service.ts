import { pushNotificationService } from './pushNotification.service';

const intervalMinutes = Number(process.env.PUSH_INACTIVITY_JOB_INTERVAL_MINUTES || 60);
const schedulerEnabled = String(process.env.PUSH_SCHEDULER_ENABLED || 'true').toLowerCase() === 'true';

class NotificationSchedulerService {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!schedulerEnabled) {
      return;
    }

    if (!pushNotificationService.isConfigured()) {
      return;
    }

    if (this.timer) {
      return;
    }

    const run = async () => {
      try {
        const result = await pushNotificationService.runInactivityReminderJob(48);
        if (result.sent > 0) {
          console.log(`[push-scheduler] inactivity reminders sent=${result.sent} users=${result.users}`);
        }
      } catch (error) {
        console.error('[push-scheduler] job failed', error);
      }
    };

    this.timer = setInterval(() => {
      void run();
    }, Math.max(5, intervalMinutes) * 60 * 1000);

    void run();
  }
}

export const notificationSchedulerService = new NotificationSchedulerService();
