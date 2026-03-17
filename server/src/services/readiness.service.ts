import { createClient } from '@supabase/supabase-js';
import { cacheService } from './cache.service';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

class ReadinessService {
  async checkDb(): Promise<{ ok: boolean; configured: boolean }> {
    if (!supabase) {
      return { ok: false, configured: false };
    }

    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return { ok: !error, configured: true };
    } catch {
      return { ok: false, configured: true };
    }
  }

  async checkRedis(): Promise<{ ok: boolean; enabled: boolean }> {
    return cacheService.readiness();
  }

  async checkAiService(): Promise<{ ok: boolean; enabled: boolean }> {
    const enabled = ['1', 'true', 'yes', 'on'].includes((process.env.AI_ENABLED || '').trim().toLowerCase());
    if (!enabled) {
      return { ok: true, enabled: false };
    }

    const baseUrl = process.env.AI_SERVICE_URL?.trim();
    if (!baseUrl) {
      return { ok: false, enabled: true };
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`);
      return { ok: response.ok, enabled: true };
    } catch {
      return { ok: false, enabled: true };
    }
  }

  async snapshot() {
    const [db, redis, ai] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkAiService(),
    ]);

    return {
      ok: db.ok && redis.ok && ai.ok,
      checks: {
        db,
        redis,
        ai,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const readinessService = new ReadinessService();