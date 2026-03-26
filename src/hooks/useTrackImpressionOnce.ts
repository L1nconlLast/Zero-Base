import { useEffect, useRef } from 'react';

const seenInSession = new Set<string>();

export function useTrackImpressionOnce(
  key: string,
  onImpression: () => void,
  enabled = true,
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    if (seenInSession.has(key)) return;

    seenInSession.add(key);
    firedRef.current = true;
    onImpression();
  }, [key, onImpression, enabled]);
}
