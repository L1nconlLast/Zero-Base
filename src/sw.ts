/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
};

type PushPayload = {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
  icon?: string;
  badge?: string;
};

const APP_FALLBACK_PATH = '/';
const NOTIFICATION_DEFAULT_TAG = 'zero-base-reminder';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return (event.data?.json() || {}) as PushPayload;
    } catch {
      return {} as PushPayload;
    }
  })();

  const title = payload.title || 'Zero Base';
  const body = payload.body || 'Sua proxima missao ja esta pronta.';
  const url = payload.url || APP_FALLBACK_PATH;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || NOTIFICATION_DEFAULT_TAG,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      data: {
        url,
        tag: payload.tag || NOTIFICATION_DEFAULT_TAG,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = String(event.notification.data?.url || APP_FALLBACK_PATH);
  const url = new URL(rawUrl, self.location.origin).toString();

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      const windowClient = client as WindowClient;
      if ('navigate' in windowClient) {
        await windowClient.navigate(url);
        await windowClient.focus();
        return;
      }
    }

    await self.clients.openWindow(url);
  })());
});

export {};
