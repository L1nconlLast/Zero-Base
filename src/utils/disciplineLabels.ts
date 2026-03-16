import type { MateriaTipo } from '../types';

export type StudyTrackLabel = 'enem' | 'concursos' | 'hibrido';

export const ENEM_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, { label: string; icon: string }> = {
  Anatomia: { label: 'Matemática', icon: '📐' },
  Fisiologia: { label: 'Linguagens', icon: '📝' },
  Farmacologia: { label: 'Humanas', icon: '🌍' },
  Patologia: { label: 'Natureza', icon: '🔬' },
  Bioquímica: { label: 'Redação', icon: '✍️' },
  Histologia: { label: 'Atualidades', icon: '🗞️' },
  Outra: { label: 'Outras', icon: '📚' },
};

export const CONCURSO_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, { label: string; icon: string }> = {
  Anatomia: { label: 'Português', icon: '📖' },
  Fisiologia: { label: 'Lógico', icon: '🧠' },
  Farmacologia: { label: 'Const.', icon: '⚖️' },
  Patologia: { label: 'Adm.', icon: '🏛️' },
  Bioquímica: { label: 'Info.', icon: '💻' },
  Histologia: { label: 'Atualid.', icon: '🗞️' },
  Outra: { label: 'Outras', icon: '📚' },
};

export const HIBRIDO_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, { label: string; icon: string }> = {
  Anatomia: { label: 'Matemática', icon: '📐' },
  Fisiologia: { label: 'Português', icon: '📖' },
  Farmacologia: { label: 'Humanas', icon: '🌍' },
  Patologia: { label: 'Lógico', icon: '🧠' },
  Bioquímica: { label: 'Natureza', icon: '🔬' },
  Histologia: { label: 'Info.', icon: '💻' },
  Outra: { label: 'Redação', icon: '✍️' },
};

export const CYCLE_DISCIPLINE_LABELS = ENEM_CYCLE_DISCIPLINE_LABELS;

export const getCycleDisciplineLabels = (
  preferredTrack: StudyTrackLabel,
  _hybridEnemWeight?: number,
): Record<MateriaTipo, { label: string; icon: string }> => {
  if (preferredTrack === 'concursos') {
    return CONCURSO_CYCLE_DISCIPLINE_LABELS;
  }

  if (preferredTrack === 'hibrido') {
    return HIBRIDO_CYCLE_DISCIPLINE_LABELS;
  }

  return ENEM_CYCLE_DISCIPLINE_LABELS;
};

const DISPLAY_BY_SUBJECT: Record<string, { label: string; icon: string }> = {
  ...ENEM_CYCLE_DISCIPLINE_LABELS,
  ...CONCURSO_CYCLE_DISCIPLINE_LABELS,
  ...HIBRIDO_CYCLE_DISCIPLINE_LABELS,
  Matemática: { label: 'Matemática', icon: '📐' },
  Linguagens: { label: 'Linguagens', icon: '📝' },
  'Ciências Humanas': { label: 'Ciências Humanas', icon: '🌍' },
  'Ciências da Natureza': { label: 'Ciências da Natureza', icon: '🔬' },
  Redação: { label: 'Redação', icon: '✍️' },
  Português: { label: 'Português', icon: '📖' },
  'Raciocínio Lógico': { label: 'Raciocínio Lógico', icon: '🧠' },
  'Direito Constitucional': { label: 'Direito Constitucional', icon: '⚖️' },
  'Direito Administrativo': { label: 'Direito Administrativo', icon: '🏛️' },
  Informática: { label: 'Informática', icon: '💻' },
  Atualidades: { label: 'Atualidades', icon: '🗞️' },
};

export const getDisplayDiscipline = (subject: string): { label: string; icon: string } => {
  const found = DISPLAY_BY_SUBJECT[subject];
  if (found) return found;
  return { label: subject, icon: '📚' };
};
