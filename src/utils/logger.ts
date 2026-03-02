// ============================================================
// src/utils/logger.ts
// Logger estruturado — funciona em dev e produção.
// Em produção, erros e warnings ficam salvos no localStorage para diagnóstico.
// Integração com Sentry (quando VITE_SENTRY_DSN estiver disponível).
// ============================================================


type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;       // ex: 'Auth', 'Import', 'Timer'
  data?: unknown;         // dados extras opcionais
  timestamp: string;
  userEmail?: string;     // preenchido automaticamente se disponível
}

// ── Configuração ─────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;
const MAX_STORED_LOGS = 50;                     // máx de erros no localStorage
const STORAGE_KEY = 'medicina_error_log';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// ── Sentry (lazy init) ──────────────────────────────────────

let sentryModule: typeof import('@sentry/browser') | null = null;
let sentryInitialized = false;

async function initSentry(): Promise<void> {
  if (sentryInitialized || !SENTRY_DSN || IS_DEV) return;

  try {
    sentryModule = await import('@sentry/browser');
    sentryModule.init({
      dsn: SENTRY_DSN,
      environment: IS_DEV ? 'development' : 'production',
      sampleRate: 1.0,
      tracesSampleRate: 0.2,
      beforeSend(event: Parameters<NonNullable<import('@sentry/browser').BrowserOptions['beforeSend']>>[0]) {
        // Remove dados sensíveis
        if (event.user) {
          delete event.user.ip_address;
        }
        return event;
      },
    });
    sentryInitialized = true;
  } catch {
    // Sentry não disponível — ignora silenciosamente
  }
}

// Inicializa assincronamente (fire-and-forget)
void initSentry();

// ── Helpers internos ─────────────────────────────────────────

function getStoredLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_STORED_LOGS)));
  } catch {
    // localStorage cheio — ignora silenciosamente
  }
}

function getUserEmail(): string | undefined {
  try {
    const raw = localStorage.getItem('medicinaUser');
    if (!raw) return undefined;
    const user = JSON.parse(raw) as { email?: string };
    return user?.email;
  } catch {
    return undefined;
  }
}

function buildEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown
): LogEntry {
  return {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
    userEmail: getUserEmail(),
  };
}

// Placeholder para integração futura (Sentry, Datadog, etc.)
function _sendToRemote(entry: LogEntry): void {
  if (!sentryModule || !sentryInitialized) return;

  try {
    if (entry.data instanceof Error) {
      sentryModule.captureException(entry.data, {
        tags: { context: entry.context || 'unknown' },
        extra: { message: entry.message },
      });
    } else {
      sentryModule.captureMessage(entry.message, {
        level: entry.level === 'error' ? 'error' : 'warning',
        tags: { context: entry.context || 'unknown' },
        extra: { data: entry.data },
      });
    }
  } catch {
    // Falha silenciosa — não quebrar o app por causa de logging
  }
}

// ── Função principal ──────────────────────────────────────────

function log(
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown
): void {
  const entry = buildEntry(level, message, context, data);

  // Console apenas em dev
  if (IS_DEV) {
    const prefix = context ? `[${context}]` : '';
    const style: Record<LogLevel, string> = {
      debug: 'color: gray',
      info:  'color: dodgerblue',
      warn:  'color: orange; font-weight: bold',
      error: 'color: red; font-weight: bold',
    };
    console[level === 'debug' ? 'log' : level](
      `%c${entry.timestamp} ${prefix} ${message}`,
      style[level],
      data ?? ''
    );
  }

  // Persiste erros e warnings no localStorage
  if (level === 'error' || level === 'warn') {
    const logs = getStoredLogs();
    logs.push(entry);
    saveLogs(logs);
  }

  // Envia erros para serviço remoto
  if (level === 'error') {
    _sendToRemote(entry);
  }
}

// ── API pública ───────────────────────────────────────────────

export const logger = {
  debug: (message: string, context?: string, data?: unknown) =>
    log('debug', message, context, data),

  info: (message: string, context?: string, data?: unknown) =>
    log('info', message, context, data),

  warn: (message: string, context?: string, data?: unknown) =>
    log('warn', message, context, data),

  error: (message: string, context?: string, data?: unknown) =>
    log('error', message, context, data),

  /** Retorna todos os erros/warnings salvos (útil para tela de suporte) */
  getStoredLogs,

  /** Limpa os logs salvos */
  clearLogs(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Exporta logs como JSON (para o usuário enviar no suporte) */
  exportLogs(): string {
    return JSON.stringify(getStoredLogs(), null, 2);
  },
};
