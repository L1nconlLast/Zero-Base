export type NarrativeTrackProfile = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
export type NarrativeHybridPrimaryFocus = 'enem' | 'concurso' | 'equilibrado';
export type NarrativeLegacyTrack = 'enem' | 'concursos' | 'hibrido';
export type NarrativeHybridOrigin = 'enem' | 'concurso';

const ENEM_LABELS = [
  'matematica',
  'linguagens',
  'linguagem',
  'humanas',
  'natureza',
  'redacao',
  'historia',
  'geografia',
  'filosofia',
  'sociologia',
  'fisica',
  'quimica',
  'biologia',
  'literatura',
  'ingles',
  'espanhol',
  'artes',
  'educacao fisica',
];

const CONCURSO_LABELS = [
  'portugues',
  'raciocinio logico',
  'logico',
  'direito constitucional',
  'const',
  'const.',
  'direito administrativo',
  'adm',
  'adm.',
  'informatica',
  'info',
  'info.',
  'atualidades',
  'atualid',
  'atualid.',
  'administracao publica',
  'arquivologia',
  'direito penal',
  'direito processual penal',
  'direito civil',
  'direito processual civil',
  'direito tributario',
  'direito do trabalho',
  'contabilidade',
  'contabilidade publica',
  'administracao geral',
  'gestao de pessoas',
  'conhecimentos bancarios',
  'atualidades do mercado financeiro',
  'vendas e negociacao',
  'tecnologia da informacao',
  'banco de dados',
  'redes',
  'seguranca da informacao',
  'legislacao',
  'auditoria',
  'administracao financeira',
];

const ENEM_SET = new Set(ENEM_LABELS);
const CONCURSO_SET = new Set(CONCURSO_LABELS);

export const normalizeTrackNarrativeLabel = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const resolveNarrativeProfileFromLegacyTrack = (
  track: NarrativeLegacyTrack,
): NarrativeTrackProfile => {
  if (track === 'concursos') {
    return 'concurso';
  }

  if (track === 'hibrido') {
    return 'hibrido';
  }

  return 'enem';
};

export const resolveContestLabel = (
  name?: string | null,
  area?: string | null,
): string => name || area || 'concurso';

export const resolveHybridOriginFromLabel = (
  label: string,
  primaryFocus?: NarrativeHybridPrimaryFocus | null,
): NarrativeHybridOrigin => {
  const normalized = normalizeTrackNarrativeLabel(label);

  if (CONCURSO_SET.has(normalized)) {
    return 'concurso';
  }

  if (ENEM_SET.has(normalized)) {
    return 'enem';
  }

  if (primaryFocus === 'concurso') {
    return 'concurso';
  }

  return 'enem';
};
