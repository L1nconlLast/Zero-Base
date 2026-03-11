import NodeCache from 'node-cache';
import { createHash } from 'crypto';

interface BuildCacheKeyInput {
  userId: string;
  message: string;
  strongArea: string;
  weakArea: string;
  weeklyPct: number;
}

const DAY_SECONDS = 24 * 60 * 60;

class MentorCacheService {
  private readonly cache = new NodeCache({
    stdTTL: DAY_SECONDS,
    checkperiod: 120,
    useClones: false,
  });

  buildKey(input: BuildCacheKeyInput): string {
    const raw = [
      input.userId,
      input.message.trim().toLowerCase(),
      input.strongArea.trim().toLowerCase(),
      input.weakArea.trim().toLowerCase(),
      String(Math.round(input.weeklyPct)),
    ].join('|');

    return createHash('sha256').update(raw).digest('hex');
  }

  get(key: string): string | null {
    return this.cache.get<string>(key) || null;
  }

  set(key: string, value: string): void {
    this.cache.set(key, value, DAY_SECONDS);
  }
}

export const mentorCacheService = new MentorCacheService();
