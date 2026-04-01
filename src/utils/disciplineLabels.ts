import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Atom,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Castle,
  Dumbbell,
  FlaskConical,
  FolderOpen,
  Globe2,
  Landmark,
  Languages,
  Laptop,
  Microscope,
  Newspaper,
  Palette,
  PenTool,
  Scale,
  ScrollText,
  Sigma,
  Speech,
  Briefcase,
  Coins,
  Hammer,
} from 'lucide-react';
import type { MateriaTipo } from '../types';
import { sanitizeSubjectLabel } from './sanitizeSubject';

export type StudyTrackLabel = 'enem' | 'concursos' | 'hibrido';

export interface DisciplineDisplay {
  label: string;
  Icon: LucideIcon;
}

export const ENEM_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, DisciplineDisplay> = {
  Anatomia: { label: 'Matemática', Icon: Calculator },
  Fisiologia: { label: 'Linguagens', Icon: Languages },
  Farmacologia: { label: 'Humanas', Icon: Globe2 },
  Patologia: { label: 'Natureza', Icon: Microscope },
  Bioquímica: { label: 'Redação', Icon: PenTool },
  Histologia: { label: 'Atualidades', Icon: Newspaper },
  Outra: { label: 'Outras', Icon: BookOpen },
};

export const CONCURSO_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, DisciplineDisplay> = {
  Anatomia: { label: 'Português', Icon: BookOpen },
  Fisiologia: { label: 'Lógico', Icon: Brain },
  Farmacologia: { label: 'Const.', Icon: Scale },
  Patologia: { label: 'Adm.', Icon: Landmark },
  Bioquímica: { label: 'Info.', Icon: Laptop },
  Histologia: { label: 'Atualid.', Icon: Newspaper },
  Outra: { label: 'Outras', Icon: BookOpen },
};

export const HIBRIDO_CYCLE_DISCIPLINE_LABELS: Record<MateriaTipo, DisciplineDisplay> = {
  Anatomia: { label: 'Matemática', Icon: Calculator },
  Fisiologia: { label: 'Português', Icon: BookOpen },
  Farmacologia: { label: 'Humanas', Icon: Globe2 },
  Patologia: { label: 'Lógico', Icon: Brain },
  Bioquímica: { label: 'Natureza', Icon: Microscope },
  Histologia: { label: 'Info.', Icon: Laptop },
  Outra: { label: 'Redação', Icon: PenTool },
};

export const CYCLE_DISCIPLINE_LABELS = ENEM_CYCLE_DISCIPLINE_LABELS;

export const getCycleDisciplineLabels = (
  preferredTrack: StudyTrackLabel,
  hybridEnemWeight?: number,
): Record<MateriaTipo, DisciplineDisplay> => {
  void hybridEnemWeight;
  if (preferredTrack === 'concursos') {
    return CONCURSO_CYCLE_DISCIPLINE_LABELS;
  }

  if (preferredTrack === 'hibrido') {
    return HIBRIDO_CYCLE_DISCIPLINE_LABELS;
  }

  return ENEM_CYCLE_DISCIPLINE_LABELS;
};

const normalizeDisciplineMatcher = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getCycleSubjectByDisplayLabel = (
  label: string,
  preferredTrack: StudyTrackLabel,
  hybridEnemWeight?: number,
): MateriaTipo => {
  const cycleLabels = getCycleDisciplineLabels(preferredTrack, hybridEnemWeight);
  const labelCandidates = String(label || '')
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);

  if (labelCandidates.length === 0) {
    return 'Outra';
  }

  for (const candidate of labelCandidates) {
    const normalizedCandidate = normalizeDisciplineMatcher(candidate);
    const matchingEntry = (Object.entries(cycleLabels) as Array<[MateriaTipo, DisciplineDisplay]>).find(
      ([, discipline]) => normalizeDisciplineMatcher(discipline.label) === normalizedCandidate,
    );

    if (matchingEntry) {
      return matchingEntry[0];
    }
  }

  return 'Outra';
};

export const resolveTrackedDisciplineLabel = (
  subject: string,
  preferredTrack: StudyTrackLabel,
  hybridEnemWeight?: number,
): string => {
  const safeSubject = sanitizeSubjectLabel(subject, 'Outra');
  const cycleLabels = getCycleDisciplineLabels(preferredTrack, hybridEnemWeight);

  if (safeSubject in cycleLabels) {
    return cycleLabels[safeSubject as MateriaTipo].label;
  }

  return getDisplayDiscipline(safeSubject).label;
};

const DISPLAY_BY_SUBJECT: Record<string, DisciplineDisplay> = {
  ...ENEM_CYCLE_DISCIPLINE_LABELS,
  ...CONCURSO_CYCLE_DISCIPLINE_LABELS,
  ...HIBRIDO_CYCLE_DISCIPLINE_LABELS,
  Matemática: { label: 'Matemática', Icon: Calculator },
  Linguagens: { label: 'Linguagens', Icon: Languages },
  'Ciências Humanas': { label: 'Ciências Humanas', Icon: Globe2 },
  'Ciências da Natureza': { label: 'Ciências da Natureza', Icon: FlaskConical },
  Redação: { label: 'Redação', Icon: PenTool },
  Português: { label: 'Português', Icon: BookOpen },
  'Raciocínio Lógico': { label: 'Raciocínio Lógico', Icon: Brain },
  'Direito Constitucional': { label: 'Direito Constitucional', Icon: Scale },
  'Direito Administrativo': { label: 'Direito Administrativo', Icon: Landmark },
  Informática: { label: 'Informática', Icon: Laptop },
  Atualidades: { label: 'Atualidades', Icon: Newspaper },
  Literatura: { label: 'Literatura', Icon: ScrollText },
  Inglês: { label: 'Inglês', Icon: Languages },
  Espanhol: { label: 'Espanhol', Icon: Languages },
  Artes: { label: 'Artes', Icon: Palette },
  'Educação Física': { label: 'Educação Física', Icon: Dumbbell },
  História: { label: 'História', Icon: Castle },
  Geografia: { label: 'Geografia', Icon: Globe2 },
  Filosofia: { label: 'Filosofia', Icon: Brain },
  Sociologia: { label: 'Sociologia', Icon: Speech },
  Física: { label: 'Física', Icon: Atom },
  Química: { label: 'Química', Icon: FlaskConical },
  Biologia: { label: 'Biologia', Icon: Microscope },
  'Administração Pública': { label: 'Administração Pública', Icon: Landmark },
  'Direito Penal': { label: 'Direito Penal', Icon: Briefcase },
  'Direito Processual Penal': { label: 'Direito Processual Penal', Icon: ScrollText },
  'Direito Civil': { label: 'Direito Civil', Icon: Building2 },
  'Direito Processual Civil': { label: 'Direito Processual Civil', Icon: FolderOpen },
  'Direito Tributário': { label: 'Direito Tributário', Icon: Coins },
  'Direito do Trabalho': { label: 'Direito do Trabalho', Icon: Hammer },
  Contabilidade: { label: 'Contabilidade', Icon: BarChart3 },
  'Contabilidade Pública': { label: 'Contabilidade Pública', Icon: BarChart3 },
  'Administração Geral': { label: 'Administração Geral', Icon: Building2 },
  'Gestão de Pessoas': { label: 'Gestão de Pessoas', Icon: Briefcase },
  Arquivologia: { label: 'Arquivologia', Icon: Archive },
  Lógico: { label: 'Lógico', Icon: Brain },
  'Const.': { label: 'Const.', Icon: Scale },
  'Adm.': { label: 'Adm.', Icon: Landmark },
  'Info.': { label: 'Info.', Icon: Laptop },
  'Atualid.': { label: 'Atualid.', Icon: Newspaper },
  Outras: { label: 'Outras', Icon: BookOpen },
  Aleatório: { label: 'Aleatório', Icon: Sigma },
};

export const getDisplayDiscipline = (subject: string): DisciplineDisplay => {
  const found = DISPLAY_BY_SUBJECT[subject];
  if (found) return found;
  return { label: subject, Icon: BookOpen };
};

export const getDisciplineIconById = (id: string): LucideIcon => {
  const iconById: Record<string, LucideIcon> = {
    anatomia: Calculator,
    fisiologia: Languages,
    farmacologia: Globe2,
    patologia: Microscope,
    bioquimica: PenTool,
    histologia: Newspaper,
    outra: BookOpen,
    port: BookOpen,
    lit: ScrollText,
    red: PenTool,
    ing: Languages,
    esp: Languages,
    art: Palette,
    edf: Dumbbell,
    hist: Castle,
    geo: Globe2,
    fil: Brain,
    soc: Speech,
    fis: Atom,
    qui: FlaskConical,
    bio: Microscope,
    mat: Calculator,
    raci: Brain,
    info: Laptop,
    admPub: Landmark,
    atual: Newspaper,
    dirConst: Scale,
    dirAdm: Landmark,
    dirPen: Briefcase,
    dirProcPen: ScrollText,
    dirCivil: Building2,
    dirProcCivil: FolderOpen,
    dirTrib: Coins,
    dirTrab: Hammer,
    cont: BarChart3,
    contPub: BarChart3,
    adm: Building2,
    gestPes: Briefcase,
    arquiv: Archive,
    matematica: Calculator,
    biologia: Microscope,
    quimica: FlaskConical,
    fisica: Atom,
    historia: Castle,
    direito_adm: Landmark,
    direito_const: Scale,
    portugues: BookOpen,
    raciocinio_logico: Brain,
  };

  return iconById[id] || BookOpen;
};
