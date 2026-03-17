import Redis from 'ioredis';
import { isFeatureEnabled } from '../config/env';
import { logger } from './logger.service';

class CacheService {
  private client: Redis | null = null;

  private readonly enabled = isFeatureEnabled('CACHE_ENABLED', false);

  private getClient(): Redis | null {
    if (!this.enabled) return null;
    if (this.client) return this.client;

    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      logger.warn('cache.redis_url_missing');
      return null;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error) => {
      logger.warn('cache.redis_error', { errorMessage: error.message });
    });

    return this.client;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      if (client.status === 'wait') {
        await client.connect();
      }
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch (error) {
      logger.warn('cache.get_failed', { key, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      if (client.status === 'wait') {
        await client.connect();
      }
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn('cache.set_failed', { key, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    }
  }

  async deletePattern(prefix: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      if (client.status === 'wait') {
        await client.connect();
      }

      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100');
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      logger.warn('cache.delete_pattern_failed', { prefix, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    }
  }

  async readiness(): Promise<{ ok: boolean; enabled: boolean }> {
    const client = this.getClient();
    if (!client) {
      return { ok: !this.enabled, enabled: this.enabled };
    }

    try {
      if (client.status === 'wait') {
        await client.connect();
      }
      const pong = await client.ping();
      return { ok: pong === 'PONG', enabled: this.enabled };
    } catch {
      return { ok: false, enabled: this.enabled };
    }
  }
}

export const cacheService = new CacheService();