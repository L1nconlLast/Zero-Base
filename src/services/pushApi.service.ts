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

class PushApiService {
  private readonly endpointBase = '/api/notifications';

  private async getAccessToken(): Promise<string | null> {
    const session = await supabase?.auth.getSession();
    return session?.data?.session?.access_token || null;
  }

  async getPublicKey(): Promise<string | null> {
    const response = await fetch(`${this.endpointBase}/public-key`);
    if (!response.ok) return null;

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

    const response = await fetch(`${this.endpointBase}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscription),
    });

    return response.ok;
  }

  async sendTest(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const response = await fetch(`${this.endpointBase}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    return response.ok;
  }

  async sendHeartbeat(action = 'app_opened'): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    const response = await fetch(`${this.endpointBase}/heartbeat`, {
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

    return response.ok;
  }
}

export const pushApiService = new PushApiService();
