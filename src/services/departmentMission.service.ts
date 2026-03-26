import type { AcademySubDepartment } from '../types';

export type DepartmentMissionZone = 'needs_attention' | 'in_progress' | 'stable';
export type DepartmentMissionReasonCode =
  | 'strategic_priority_gap'
  | 'not_started_yet'
  | 'no_recent_study_low_completion'
  | 'low_recent_pace'
  | 'stale_but_in_progress'
  | 'stable_progress';

export interface DepartmentMissionDisciplineInput {
  subDepartment: AcademySubDepartment;
  disciplineOrder: number;
  totalTracks: number;
  completedTracks: number;
  completionRate: number;
  totalXp: number;
  completedXp: number;
  daysWithoutStudy: number | null;
  isStrategicPriority: boolean;
  nextContentTitle?: string | null;
}

export interface DepartmentMissionDisciplineState extends DepartmentMissionDisciplineInput {
  zone: DepartmentMissionZone;
  attentionScore: number;
  priorityRank: number;
  headline: string;
  support: string;
  actionLabel: string;
  decisionReasonCode: DepartmentMissionReasonCode;
  decisionReason: string;
}

export interface DepartmentMissionZoneState {
  id: DepartmentMissionZone;
  label: string;
  description: string;
  disciplines: DepartmentMissionDisciplineState[];
}

export interface DepartmentMissionState {
  primaryFocus: DepartmentMissionDisciplineState | null;
  zones: DepartmentMissionZoneState[];
}

export interface DepartmentMissionHeuristicRationaleEntry {
  version: string;
  date: string;
  changedWeights: Array<keyof typeof DEPARTMENT_MISSION_HEURISTIC_WEIGHTS | 'none'>;
  reasonCodesImpacted: DepartmentMissionReasonCode[];
  rationale: string;
  expectedOutcome: string;
}

const DEPARTMENT_MISSION_HEURISTIC_WEIGHTS = {
  missingStudyBase: 6,
  maxRecencyWeight: 8,
  completionGapDivisor: 12,
  freshStartBoost: 2,
  strategicPriorityBoost: 1.5,
} as const;

export const DEPARTMENT_MISSION_HEURISTIC_VERSION = '1.5.0';

export const DEPARTMENT_MISSION_HEURISTIC_RATIONALE: Record<string, DepartmentMissionHeuristicRationaleEntry> = {
  '1.5.0': {
    version: '1.5.0',
    date: '2026-03-20',
    changedWeights: ['none'],
    reasonCodesImpacted: [
      'strategic_priority_gap',
      'not_started_yet',
      'no_recent_study_low_completion',
      'low_recent_pace',
      'stale_but_in_progress',
      'stable_progress',
    ],
    rationale: 'Formaliza o protocolo operacional da heuristica com gates de amostra, leitura por janela e comparacao por versao sem mexer nos pesos base.',
    expectedOutcome: 'Evitar tuning reativo e garantir que qualquer mudanca futura de peso tenha criterio, memoria e comparabilidade.',
  },
};

export const CURRENT_DEPARTMENT_MISSION_HEURISTIC_RATIONALE =
  DEPARTMENT_MISSION_HEURISTIC_RATIONALE[DEPARTMENT_MISSION_HEURISTIC_VERSION];

const ZONE_META: Record<DepartmentMissionZone, { label: string; description: string }> = {
  needs_attention: {
    label: 'Precisa de atencao',
    description: 'Onde vale colocar energia agora.',
  },
  in_progress: {
    label: 'Em andamento',
    description: 'Disciplinas que estao no ritmo e pedem continuidade.',
  },
  stable: {
    label: 'Estavel',
    description: 'Pode esperar sem perder o plano.',
  },
};

const ZONE_ORDER: DepartmentMissionZone[] = ['needs_attention', 'in_progress', 'stable'];

const resolveZone = (input: DepartmentMissionDisciplineInput): DepartmentMissionZone => {
  if (input.completionRate >= 75 && input.daysWithoutStudy !== null && input.daysWithoutStudy <= 2) {
    return 'stable';
  }

  if (input.completionRate >= 35 && input.daysWithoutStudy !== null && input.daysWithoutStudy <= 4) {
    return 'in_progress';
  }

  return 'needs_attention';
};

const resolveHeadline = (input: DepartmentMissionDisciplineInput, zone: DepartmentMissionZone): string => {
  if (zone === 'stable') {
    return 'Pode esperar';
  }

  if (zone === 'in_progress') {
    return 'Mantenha o ritmo';
  }

  if (input.daysWithoutStudy === null || input.completionRate === 0) {
    return 'Ainda nao comecou';
  }

  if (input.daysWithoutStudy >= 5) {
    return `Parada ha ${input.daysWithoutStudy} dia(s)`;
  }

  return 'Pede retomada';
};

const resolveSupport = (input: DepartmentMissionDisciplineInput, zone: DepartmentMissionZone): string => {
  if (zone === 'stable') {
    return `${input.completedTracks}/${input.totalTracks} trilhas concluidas.`;
  }

  if (zone === 'in_progress') {
    return input.nextContentTitle
      ? `Continue por ${input.nextContentTitle}.`
      : `${input.completedTracks}/${input.totalTracks} trilhas em movimento.`;
  }

  if (input.daysWithoutStudy === null || input.completionRate === 0) {
    return 'Sem historico recente nesta disciplina.';
  }

  if (input.nextContentTitle) {
    return `Retome por ${input.nextContentTitle}.`;
  }

  return 'Vale puxar esta frente agora.';
};

const resolveActionLabel = (zone: DepartmentMissionZone): string => {
  if (zone === 'stable') {
    return 'Revisar';
  }

  if (zone === 'in_progress') {
    return 'Continuar';
  }

  return 'Estudar agora';
};

const resolveDecisionReasonCode = (
  input: DepartmentMissionDisciplineInput,
  zone: DepartmentMissionZone,
): DepartmentMissionReasonCode => {
  if (zone === 'stable') {
    return 'stable_progress';
  }

  if (zone === 'in_progress') {
    return input.daysWithoutStudy !== null && input.daysWithoutStudy >= 3
      ? 'stale_but_in_progress'
      : 'low_recent_pace';
  }

  if (input.isStrategicPriority) {
    return 'strategic_priority_gap';
  }

  if (input.daysWithoutStudy === null || input.completionRate === 0) {
    return 'not_started_yet';
  }

  return 'no_recent_study_low_completion';
};

const resolveDecisionReason = (
  input: DepartmentMissionDisciplineInput,
  zone: DepartmentMissionZone,
  code: DepartmentMissionReasonCode,
): string => {
  const strategicSuffix = input.isStrategicPriority ? ' em uma disciplina estrategica' : '';

  if (code === 'stable_progress') {
    return `Ritmo recente em dia e ${input.completionRate}% concluido${strategicSuffix}`;
  }

  if (code === 'low_recent_pace') {
    if (input.daysWithoutStudy === 0) {
      return `Ritmo ativo hoje e ${input.completionRate}% concluido${strategicSuffix}`;
    }

    if (input.daysWithoutStudy === null) {
      return `Em andamento, com ${input.completionRate}% concluido${strategicSuffix}`;
    }

    return `Ritmo ativo nos ultimos ${input.daysWithoutStudy} dia(s) e ${input.completionRate}% concluido${strategicSuffix}`;
  }

  if (code === 'stale_but_in_progress') {
    return `Ja iniciou, mas perdeu ritmo ha ${input.daysWithoutStudy ?? 0} dia(s)${strategicSuffix}`;
  }

  if (code === 'strategic_priority_gap') {
    if (input.daysWithoutStudy === null || input.completionRate === 0) {
      return 'Disciplina estrategica ainda sem andamento recente';
    }

    return `Disciplina estrategica sem estudo ha ${input.daysWithoutStudy} dia(s) e com ${input.completionRate}% concluido`;
  }

  if (code === 'not_started_yet') {
    return `Ainda nao iniciada e sem estudo recente${strategicSuffix}`;
  }

  if (zone === 'needs_attention' && input.daysWithoutStudy !== null && input.daysWithoutStudy >= 1) {
    return `Sem estudo ha ${input.daysWithoutStudy} dia(s) e com ${input.completionRate}% concluido${strategicSuffix}`;
  }

  return `Ritmo abaixo do ideal e com ${input.completionRate}% concluido${strategicSuffix}`;
};

const getAttentionScore = (input: DepartmentMissionDisciplineInput): number => {
  const recencyWeight =
    input.daysWithoutStudy === null
      ? DEPARTMENT_MISSION_HEURISTIC_WEIGHTS.missingStudyBase
      : Math.min(DEPARTMENT_MISSION_HEURISTIC_WEIGHTS.maxRecencyWeight, input.daysWithoutStudy);
  const completionWeight = (100 - input.completionRate) / DEPARTMENT_MISSION_HEURISTIC_WEIGHTS.completionGapDivisor;
  const freshStartWeight = input.completionRate === 0 ? DEPARTMENT_MISSION_HEURISTIC_WEIGHTS.freshStartBoost : 0;
  const priorityWeight = input.isStrategicPriority ? DEPARTMENT_MISSION_HEURISTIC_WEIGHTS.strategicPriorityBoost : 0;

  return recencyWeight + completionWeight + freshStartWeight + priorityWeight;
};

const compareDisciplines = (
  left: DepartmentMissionDisciplineState,
  right: DepartmentMissionDisciplineState,
): number => {
  if (left.attentionScore !== right.attentionScore) {
    return right.attentionScore - left.attentionScore;
  }

  if (left.isStrategicPriority !== right.isStrategicPriority) {
    return left.isStrategicPriority ? -1 : 1;
  }

  if (left.completionRate !== right.completionRate) {
    return left.completionRate - right.completionRate;
  }

  if (left.disciplineOrder !== right.disciplineOrder) {
    return left.disciplineOrder - right.disciplineOrder;
  }

  return left.subDepartment.localeCompare(right.subDepartment);
};

export const getDepartmentMissionState = (
  disciplines: DepartmentMissionDisciplineInput[],
): DepartmentMissionState => {
  const mapped = disciplines
    .map<DepartmentMissionDisciplineState>((discipline) => {
      const zone = resolveZone(discipline);
      const decisionReasonCode = resolveDecisionReasonCode(discipline, zone);

      return {
        ...discipline,
        zone,
        attentionScore: getAttentionScore(discipline),
        priorityRank: 0,
        headline: resolveHeadline(discipline, zone),
        support: resolveSupport(discipline, zone),
        actionLabel: resolveActionLabel(zone),
        decisionReasonCode,
        decisionReason: resolveDecisionReason(discipline, zone, decisionReasonCode),
      };
    })
    .sort(compareDisciplines)
    .map((discipline, index) => ({
      ...discipline,
      priorityRank: index + 1,
    }));

  const zones: DepartmentMissionZoneState[] = ZONE_ORDER.map((zoneId) => ({
    id: zoneId,
    label: ZONE_META[zoneId].label,
    description: ZONE_META[zoneId].description,
    disciplines: mapped.filter((discipline) => discipline.zone === zoneId).sort(compareDisciplines),
  }));

  const primaryFocus = ZONE_ORDER
    .map((zoneId) => zones.find((zone) => zone.id === zoneId) ?? null)
    .find((zone) => zone && zone.disciplines.length > 0)?.disciplines[0] ?? null;

  return {
    primaryFocus,
    zones,
  };
};
