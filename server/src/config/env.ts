const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const toBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue;
  return TRUE_VALUES.has(value.trim().toLowerCase());
};

export const isTestEnvironment = (): boolean => process.env.NODE_ENV === 'test';

export const isProductionEnvironment = (): boolean => process.env.NODE_ENV === 'production';

export const isDevelopmentLikeEnvironment = (): boolean => !isProductionEnvironment() && !isTestEnvironment();

export const isFeatureEnabled = (envName: string, defaultValue = false): boolean => toBoolean(process.env[envName], defaultValue);

export const getCorsAllowlist = (): string[] => (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const getApiPort = (): number => Number(process.env.MENTOR_API_PORT || 3001);

export const validateServerEnvironment = (): void => {
  if (isTestEnvironment()) {
    return;
  }

  const missing: string[] = [];
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MENTOR_API_PORT'];

  required.forEach((envName) => {
    if (!process.env[envName]?.trim()) {
      missing.push(envName);
    }
  });

  if (isFeatureEnabled('AI_ENABLED') && !process.env.AI_SERVICE_URL?.trim()) {
    missing.push('AI_SERVICE_URL');
  }

  if ((isFeatureEnabled('QUEUES_ENABLED', true) || isFeatureEnabled('JOBS_ENABLED', false) || isFeatureEnabled('CACHE_ENABLED')) && !process.env.REDIS_URL?.trim()) {
    missing.push('REDIS_URL');
  }

  if (isFeatureEnabled('PUSH_SCHEDULER_ENABLED') || process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PRIVATE_KEY) {
    ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'].forEach((envName) => {
      if (!process.env[envName]?.trim()) {
        missing.push(envName);
      }
    });
  }

  if (isProductionEnvironment()) {
    if (getCorsAllowlist().length === 0) {
      missing.push('CORS_ALLOWED_ORIGINS');
    }

    if (isFeatureEnabled('MENTOR_ALLOW_GUEST')) {
      throw new Error('MENTOR_ALLOW_GUEST=true nao e permitido em producao.');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente criticas ausentes: ${[...new Set(missing)].join(', ')}`);
  }
};