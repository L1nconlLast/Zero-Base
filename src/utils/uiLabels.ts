import {
  sanitizeSubjectLabel,
  stripInternalSubjectMetadata,
} from './sanitizeSubject';

const TECHNICAL_METADATA_SEPARATOR = '||';
const BULLET_SEPARATOR = '\u2022';
const FALLBACK_DASH = '\u2014';
const ELLIPSIS = '\u2026';

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const normalizeSegment = (raw: string): string => {
  const withoutTechnicalMetadata = stripInternalSubjectMetadata(String(raw || ''))
    .split(TECHNICAL_METADATA_SEPARATOR)[0]
    .trim();

  if (!withoutTechnicalMetadata) {
    return '';
  }

  const hasExplicitSpacing = /\s/.test(withoutTechnicalMetadata);
  const cleanedBase = hasExplicitSpacing
    ? withoutTechnicalMetadata.replace(/_+/g, ' ')
    : withoutTechnicalMetadata.replace(/[_-]+/g, ' ');

  const collapsed = collapseWhitespace(cleanedBase);
  if (!collapsed) {
    return '';
  }

  return sanitizeSubjectLabel(collapsed, '');
};

export const normalizePresentationLabel = (raw: string, fallback = FALLBACK_DASH): string => {
  const base = stripInternalSubjectMetadata(String(raw || ''));
  const parts = base
    .split(BULLET_SEPARATOR)
    .map((part) => normalizeSegment(part))
    .filter(Boolean);

  if (parts.length === 0) {
    const singleValue = normalizeSegment(base);
    return singleValue || fallback;
  }

  return parts.join(` ${BULLET_SEPARATOR} `);
};

export const normalizeSubjectLabel = (raw: string, fallback = 'Outra'): string =>
  sanitizeSubjectLabel(raw, fallback);

export const normalizeBlockLabel = (raw: string, fallback = 'Bloco atual'): string =>
  normalizePresentationLabel(raw, fallback);

export const truncatePresentationLabel = (raw: string, max = 18, fallback = FALLBACK_DASH): string => {
  const normalized = normalizePresentationLabel(raw, fallback);
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}${ELLIPSIS}`;
};
