/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORAGE_SECRET: string;
  readonly VITE_SUPABASE_OAUTH_PROVIDERS?: string;
  readonly VITE_MENTOR_LLM_ENABLED?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
