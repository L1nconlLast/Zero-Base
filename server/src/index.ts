import 'dotenv/config';
import { app } from './app';
import { notificationSchedulerService } from './services/notificationScheduler.service';
import { rankingSchedulerService } from './services/rankingScheduler.service';
import { startQueueWorkers } from './workers/queueWorkers';
import { validateServerEnvironment, getApiPort } from './config/env';
import { initServerTelemetry } from './services/telemetry.service';
import { logger } from './services/logger.service';

validateServerEnvironment();
initServerTelemetry();

const PORT = getApiPort();

app.listen(PORT, () => {
  logger.info('server.started', { route: '/', feature: 'startup', port: PORT });
  notificationSchedulerService.start();
  rankingSchedulerService.start();
  startQueueWorkers();
});
