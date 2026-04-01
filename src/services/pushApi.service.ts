import { supabase } from './supabase.client';

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
};

const runtimeEnv = ((import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env) || {};

const normalizeApiBaseUrl = (value?: string): string | null => {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  return normalized || null;
};

const serverApiBaseUrl = normalizeApiBaseUrl(
  runtimeEnv.VITE_SERVER_API_BASE_URL || runtimeEnv.VITE_API_BASE_URL,
);

const SAME_ORIGIN_NOTIFICATIONS_BASE = '/api/notifications';
const EXTERNAL_NOTIFICATIONS_BASE = serverApiBaseUrl
  ? `${serverApiBaseUrl}/api/notifications`
  : null;

const buildEndpointCandidates = (path: string): string[] => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const candidates = [SAME_ORIGIN_NOTIFICATIONS_BASE];

  if (EXTERNAL_NOTIFICATIONS_BASE && EXTERNAL_NOTIFICATIONS_BASE !== SAME_ORIGIN_NOTIFICATIONS_BASE) {
    candidates.push(EXTERNAL_NOTIFICATIONS_BASE);
  }

  return candidates.map((base) => `${base}${normalizedPath}`);
};

const isHtmlResponse = (response: Response): boolean =>
  (response.headers.get('content-type') || '').toLowerCase().includes('text/html');

class PushApiService {
  private async getAccessToken(): Promise<string | null> {
    const session = await supabase?.auth.getSession();
    return session?.data?.session?.access_token || null;
  }

  private async request(
    path: string,
    init?: RequestInit,
    options?: {
      expectJson?: boolean;
    },
  ): Promise<Response | null> {
    const candidates = buildEndpointCandidates(path);
    let lastResponse: Response | null = null;
    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const isLastCandidate = index === candidates.length - 1;

      try {
        const response = await fetch(candidate, init);
        const invalidHtmlPayload = isHtmlResponse(response);
        const shouldTryNext =
          !isLastCandidate
          && (
            response.status === 404
            || response.status === 405
            || response.status === 500
            || response.status === 502
            || response.status === 503
            || response.status === 504
            || invalidHtmlPayload
          );

        if (response.ok && !invalidHtmlPayload) {
          return response;
        }

        lastResponse = response;
        if (invalidHtmlPayload && !shouldTryNext) {
          return null;
        }

        if (!shouldTryNext) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (isLastCandidate) {
          throw error;
        }
      }
    }

    if (lastResponse) {
      return lastResponse;
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  }

  async getPublicKey(): Promise<string | null> {
    const response = await this.request('/public-key', undefined, { expectJson: true });
    if (!response?.ok) return null;

    const data = (await response.json()) as { publicKey?: string };
    return data.publicKey || null;
  }

  async subscribeUser(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const publicKey = await this.getPublicKey();
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      });
    }

    const response = await this.request('/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscription),
    });

    return Boolean(response?.ok);
  }

  async sendTest(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const response = await this.request('/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    return Boolean(response?.ok);
  }

  async sendHeartbeat(action = 'app_opened'): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const response = await this.request('/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action,
        platform: navigator.platform || 'web',
      }),
    });

    return Boolean(response?.ok);
  }
}

export const pushApiService = new PushApiService();
