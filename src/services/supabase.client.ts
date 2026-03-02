import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const normalizeEnvValue = (value?: string): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^['\"]|['\"]$/g, '');

  if (!unquoted || unquoted === 'undefined' || unquoted === 'null') {
    return undefined;
  }

  return unquoted;
};

const SUPABASE_PROJECT_REF = 'vcsgapomoeucqpsbcuvj';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZMMddIpFvGv8VPRIFwZhow_1SIzOMnT';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2dhcG9tb2V1Y3Fwc2JjdXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODg2MzEsImV4cCI6MjA4NzY2NDYzMX0.4TyQi-u089t8NRD59tYhR0HM5GqAVCH90zoIsm9oCqI';

const isValidSupabaseUrl = (value?: string): value is string =>
  Boolean(value?.startsWith('https://') && value.includes('.supabase.co'));

const isValidSupabaseKey = (value?: string): value is string => {
  if (!value) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('eyJ');
};

const isKeyUrlPairConsistent = (url?: string, key?: string): boolean => {
  if (!url || !key) return false;
  if (!url.includes(`${SUPABASE_PROJECT_REF}.supabase.co`)) return false;

  if (key.startsWith('sb_publishable_')) {
    return key === DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  }

  if (key.startsWith('eyJ')) {
    return key === DEFAULT_SUPABASE_ANON_KEY;
  }

  return false;
};

const envSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const envSupabaseKey = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const hasValidEnv = isValidSupabaseUrl(envSupabaseUrl)
  && isValidSupabaseKey(envSupabaseKey)
  && isKeyUrlPairConsistent(envSupabaseUrl, envSupabaseKey);

const supabaseUrl = hasValidEnv ? envSupabaseUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = hasValidEnv
  ? envSupabaseKey
  : (DEFAULT_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY);

export const supabaseRuntimeDiagnostics = {
  hasValidEnv,
  loadedUrl: supabaseUrl,
  keyPrefix: supabaseAnonKey.slice(0, 20),
};

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;
export const isSupabaseConfigured = Boolean(client);
