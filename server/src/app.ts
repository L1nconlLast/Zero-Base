import express from 'express';
import cors from 'cors';
import mentorRoutes from './routes/mentor.routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api/mentor', mentorRoutes);
