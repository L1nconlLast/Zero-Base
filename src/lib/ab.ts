export type HeroVariant = 'hero_v1' | 'hero_v2';

const STORAGE_KEY = 'zb_ab_hero_variant';

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function fromQueryParam(): HeroVariant | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ab = params.get('ab');
  if (ab === 'hero_v1' || ab === 'hero_v2') return ab;
  return null;
}

export function getStableHeroVariant(userId: string): HeroVariant {
  const forced = fromQueryParam();
  if (forced) return forced;

  const safeUserId = userId || 'anonymous';

  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(`${STORAGE_KEY}:${safeUserId}`);
    if (saved === 'hero_v1' || saved === 'hero_v2') return saved;
  }

  const bucket = hashString(safeUserId) % 100;
  const variant: HeroVariant = bucket < 50 ? 'hero_v1' : 'hero_v2';

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(`${STORAGE_KEY}:${safeUserId}`, variant);
  }

  return variant;
}
