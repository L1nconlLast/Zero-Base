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

const isValidSupabaseUrl = (value?: string): value is string =>
  Boolean(value?.startsWith('https://') && value.includes('.supabase.co'));

const isValidSupabaseKey = (value?: string): value is string => {
  if (!value) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('eyJ');
};

const envSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const envSupabaseKey = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const hasValidEnv = isValidSupabaseUrl(envSupabaseUrl)
  && isValidSupabaseKey(envSupabaseKey);

const supabaseUrl = hasValidEnv ? envSupabaseUrl : undefined;
const supabaseAnonKey = hasValidEnv ? envSupabaseKey : undefined;

export const supabaseRuntimeDiagnostics = {
  hasValidEnv,
  loadedUrl: supabaseUrl || null,
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.slice(0, 20) : null,
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
