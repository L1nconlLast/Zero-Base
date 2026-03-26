import { useEffect, useRef } from 'react';

type Options = {
  threshold?: number;
  minVisibleMs?: number;
  enabled?: boolean;
  storagePrefix?: string;
};

function getStorageKey(prefix: string, key: string) {
  return `${prefix}:${key}`;
}

function hasSeen(prefix: string, key: string) {
  try {
    return sessionStorage.getItem(getStorageKey(prefix, key)) === '1';
  } catch {
    return false;
  }
}

function markSeen(prefix: string, key: string) {
  try {
    sessionStorage.setItem(getStorageKey(prefix, key), '1');
  } catch {
    // ignore
  }
}

export function useTrackImpressionInViewOnce<T extends HTMLElement>(
  key: string,
  onImpression: () => void,
  {
    threshold = 0.5,
    minVisibleMs = 800,
    enabled = true,
    storagePrefix = 'zb_impression_seen',
  }: Options = {},
) {
  const ref = useRef<T | null>(null);
  const firedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || firedRef.current || hasSeen(storagePrefix, key)) return;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (timerRef.current === null) {
            timerRef.current = window.setTimeout(() => {
              if (firedRef.current || hasSeen(storagePrefix, key)) return;
              firedRef.current = true;
              markSeen(storagePrefix, key);
              onImpression();
              clearTimer();
              observer.disconnect();
            }, minVisibleMs);
          }
        } else {
          clearTimer();
        }
      },
      { threshold: [0, threshold, 1] },
    );

    observer.observe(el);

    return () => {
      clearTimer();
      observer.disconnect();
    };
  }, [enabled, key, minVisibleMs, onImpression, storagePrefix, threshold]);

  return ref;
}
