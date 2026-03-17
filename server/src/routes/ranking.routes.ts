import { Router, type Request, type Response, type NextFunction } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rankingMeRateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { rankingController } from '../controllers/ranking.controller';
import { sendError } from '../utils/apiResponse';

const router = Router();

// ── Worker secret guard ───────────────────────────────────────
const workerSecretMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.WORKER_SECRET?.trim();
  if (!secret || req.headers['x-worker-secret'] !== secret) {
    sendError(req, res, 403, 'FORBIDDEN', 'Acesso negado.');
    return;
  }
  next();
};

// ── Public ────────────────────────────────────────────────────

/** GET /api/ranking — lista geral (paginada) */
router.get('/', (req, res) => {
  void rankingController.getRanking(req, res);
});

/** GET /api/ranking/now-studying — quantos estudando agora */
router.get('/now-studying', (req, res) => {
  void rankingController.getNowStudying(req, res);
});

// ── Autenticadas ──────────────────────────────────────────────

/** GET /api/ranking/me — posição e percentil do usuário */
router.get('/me', authMiddleware, rankingMeRateLimitMiddleware, (req, res) => {
  void rankingController.getMyRanking(req, res);
});

/** POST /api/ranking/sessions/start — iniciar sessão de estudo */
router.post('/sessions/start', authMiddleware, (req, res) => {
  void rankingController.startSession(req, res);
});

/** POST /api/ranking/sessions/end — encerrar sessão de estudo */
router.post('/sessions/end', authMiddleware, (req, res) => {
  void rankingController.endSession(req, res);
});

// ── Worker / admin — protegida por X-Worker-Secret ────────────

/** POST /api/ranking/recalculate — triggered pelo worker cron ou CI */
router.post('/recalculate', workerSecretMiddleware, (req, res) => {
  void rankingController.recalculate(req, res);
});

export default router;
