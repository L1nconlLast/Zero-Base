const ZB_DOUBLE_PIPE_METADATA_RE = /\|\|zb-[^|]+\|\|[^\s|]*/gi;
const ZB_SINGLE_PIPE_METADATA_RE = /\|zb-[^|\s]+\|[^\s|]*/gi;
const TECHNICAL_SUBJECT_TOKENS = ['session', 'payload', 'mentor', 'json', 'hash', 'uuid'];
const SUBJECT_VARIANT_SUFFIXES = new Set([
  'basico',
  'intermediario',
  'avancado',
  'revisao',
  'oficial',
  'oficial1',
  'oficial2',
  'simulado',
  'questoes',
  'bloco',
]);
const LOWERCASE_CONNECTORS = new Set(['a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em']);
const SUBJECT_ALIAS_MAP: Record<string, string> = {
  math: 'Matematica',
  mathematics: 'Matematica',
  mathematical: 'Matematica',
  matematical: 'Matematica',
  language: 'Linguagens',
  languages: 'Linguagens',
  writing: 'Redacao',
  essay: 'Redacao',
  portuguese: 'Portugues',
  nature: 'Natureza',
  science: 'Natureza',
  sciences: 'Natureza',
  humanities: 'Humanas',
};

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const toPresentationCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      const normalizedWord = word.toLowerCase();
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }

      if (index > 0 && LOWERCASE_CONNECTORS.has(normalizedWord)) {
        return normalizedWord;
      }

      return `${normalizedWord.charAt(0).toUpperCase()}${normalizedWord.slice(1)}`;
    })
    .join(' ');

const normalizeMatcher = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

export const stripInternalSubjectMetadata = (input: unknown): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return collapseWhitespace(
    input
      .replace(ZB_DOUBLE_PIPE_METADATA_RE, '')
      .replace(ZB_SINGLE_PIPE_METADATA_RE, ''),
  );
};

const looksTechnicalSubject = (value: string): boolean => {
  const lower = value.toLowerCase();
  const compact = value.replace(/\s+/g, '');

  return (
    !value
    || value.startsWith('{')
    || value.startsWith('[')
    || /^[a-f0-9-]{16,}$/i.test(compact)
    || (/^[A-Za-z0-9+/=_-]{24,}$/.test(compact) && !/\s/.test(value))
    || (!/\s/.test(value) && value.length > 32)
    || value.length > 64
    || TECHNICAL_SUBJECT_TOKENS.some((token) => lower.includes(token))
  );
};

export const sanitizeSubjectLabel = (input: unknown, fallback = 'Outra'): string => {
  const stripped = stripInternalSubjectMetadata(input);
  if (!stripped) {
    return fallback;
  }

  const rawSegment = collapseWhitespace(stripped.split(/[|/]/)[0] || '');
  if (!rawSegment) {
    return fallback;
  }

  const underscoreParts = rawSegment.split('_').map((part) => collapseWhitespace(part)).filter(Boolean);
  const shouldTrimVariantSuffix = underscoreParts.length > 1
    && underscoreParts.slice(1).every((part) => SUBJECT_VARIANT_SUFFIXES.has(part.toLowerCase()));
  const baseSegment = shouldTrimVariantSuffix ? underscoreParts[0] : rawSegment;
  const hasExplicitSpacing = /\s/.test(baseSegment);
  const cleanedBase = hasExplicitSpacing
    ? baseSegment.replace(/_+/g, ' ')
    : baseSegment.replace(/[_-]+/g, ' ');
  const normalized = collapseWhitespace(cleanedBase);

  if (looksTechnicalSubject(normalized)) {
    return fallback;
  }

  const alias = SUBJECT_ALIAS_MAP[normalizeMatcher(normalized)];
  if (alias) {
    return alias;
  }

  return normalized === normalized.toLowerCase()
    ? toPresentationCase(normalized)
    : normalized;
};
