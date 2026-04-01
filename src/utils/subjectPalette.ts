import { sanitizeSubjectLabel } from './sanitizeSubject';

export interface SubjectPalette {
  key: string;
  hex: string;
}

const SUBJECT_PALETTES: Record<string, SubjectPalette> = {
  math: { key: 'math', hex: '#38bdf8' },
  portuguese: { key: 'portuguese', hex: '#f472b6' },
  humanities: { key: 'humanities', hex: '#f59e0b' },
  logic: { key: 'logic', hex: '#a78bfa' },
  nature: { key: 'nature', hex: '#34d399' },
  writing: { key: 'writing', hex: '#fb7185' },
  info: { key: 'info', hex: '#22d3ee' },
  current: { key: 'current', hex: '#818cf8' },
  anatomy: { key: 'anatomy', hex: '#22d3ee' },
  physiology: { key: 'physiology', hex: '#f472b6' },
  pharmacology: { key: 'pharmacology', hex: '#34d399' },
  pathology: { key: 'pathology', hex: '#38bdf8' },
  biochemistry: { key: 'biochemistry', hex: '#fbbf24' },
  histology: { key: 'histology', hex: '#a78bfa' },
  other: { key: 'other', hex: '#94a3b8' },
};

const SUBJECT_ALIAS_MAP: Record<string, keyof typeof SUBJECT_PALETTES> = {
  matematica: 'math',
  math: 'math',
  portugues: 'portuguese',
  portuguess: 'portuguese',
  linguagens: 'portuguese',
  literatura: 'portuguese',
  ingles: 'portuguese',
  espanhol: 'portuguese',
  humanas: 'humanities',
  'ciencias humanas': 'humanities',
  historia: 'humanities',
  geografia: 'humanities',
  filosofia: 'humanities',
  sociologia: 'humanities',
  logico: 'logic',
  'raciocinio logico': 'logic',
  natureza: 'nature',
  'ciencias da natureza': 'nature',
  biologia: 'nature',
  quimica: 'nature',
  fisica: 'nature',
  redacao: 'writing',
  informatica: 'info',
  info: 'info',
  atualidades: 'current',
  atualid: 'current',
  anatomia: 'anatomy',
  fisiologia: 'physiology',
  farmacologia: 'pharmacology',
  patologia: 'pathology',
  bioquimica: 'biochemistry',
  histologia: 'histology',
  outra: 'other',
  outras: 'other',
  outros: 'other',
};

const normalizePaletteKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

export const getSubjectPalette = (subject: string): SubjectPalette => {
  const safeSubject = sanitizeSubjectLabel(subject, 'Outra');
  const normalized = normalizePaletteKey(safeSubject);
  const mappedKey = SUBJECT_ALIAS_MAP[normalized] || 'other';
  return SUBJECT_PALETTES[mappedKey];
};

export const withAlpha = (hex: string, alpha: number): string => {
  const safeHex = hex.replace('#', '');
  if (safeHex.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};
