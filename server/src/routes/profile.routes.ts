import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { profileController } from '../controllers/profile.controller';
import { sendError } from '../utils/apiResponse';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('INVALID_IMAGE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

router.get('/load', authMiddleware, (req, res) => {
  void profileController.load(req, res);
});

router.post('/save', authMiddleware, (req, res) => {
  void profileController.save(req, res);
});

router.post('/notifications', authMiddleware, (req, res) => {
  void profileController.saveNotifications(req, res);
});

router.post('/avatar/upload', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error) {
      sendError(req, res, 400, 'INVALID_FILE', 'Arquivo invalido. Envie uma imagem de ate 2MB.');
      return;
    }
    next();
  });
}, (req, res) => {
  void profileController.uploadAvatar(req, res);
});

export default router;
