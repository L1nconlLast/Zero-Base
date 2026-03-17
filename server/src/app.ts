import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mentorRoutes from './routes/mentor.routes';
import adminRoutes from './routes/admin.routes';
import notificationsRoutes from './routes/notifications.routes';
import learningGraphRoutes from './routes/learningGraph.routes';
import studyPlatformCompatRoutes from './routes/studyPlatformCompat.routes';
import rankingRoutes from './routes/ranking.routes';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { requestLoggingMiddleware } from './middlewares/requestLogging.middleware';
import { metricsService } from './services/metrics.service';
import { readinessService } from './services/readiness.service';
import { getCorsAllowlist, isDevelopmentLikeEnvironment } from './config/env';

export const app = express();

const corsAllowlist = getCorsAllowlist();

app.use(helmet());
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsAllowlist.length === 0 && isDevelopmentLikeEnvironment()) {
      callback(null, true);
      return;
    }

    if (corsAllowlist.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin nao permitido pelo CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, requestId: req.id, timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  const readiness = await readinessService.snapshot();
  res.status(readiness.ok ? 200 : 503).json({ ...readiness, requestId: req.id });
});

app.get('/metrics', (req, res) => {
  res.status(200).json({ requestId: req.id, ...metricsService.snapshot() });
});

app.use('/api/mentor', mentorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/learning-graph', learningGraphRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api', studyPlatformCompatRoutes);
