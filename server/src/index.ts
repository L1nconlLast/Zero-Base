import 'dotenv/config';
import { app } from './app';

const PORT = Number(process.env.MENTOR_API_PORT || 3001);

app.listen(PORT, () => {
  console.log(`[mentor-api] listening on http://localhost:${PORT}`);
});
