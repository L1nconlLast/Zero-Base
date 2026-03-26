export interface UserFacingWeeklyProgress {
  completedSessions: number;
  plannedSessions: number;
  ratio: number;
  label: string;
}

const normalizeReasonValue = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function mapReasonSummaryToCopy(reason?: string): string {
  if (!reason) {
    return 'Recomendado para você agora';
  }

  const normalizedReason = normalizeReasonValue(reason);

  if (
    normalizedReason.includes('priorizado por atraso')
    || normalizedReason.includes('atrasad')
    || normalizedReason.includes('overdue')
  ) {
    return 'Priorizado por atraso';
  }

  if (
    normalizedReason.includes('priorizado por voce')
    || normalizedReason.includes('prioridade alta')
    || normalizedReason.includes('remarcado para hoje')
    || normalizedReason.includes('manual_priority')
  ) {
    return 'Priorizado por você';
  }

  if (
    normalizedReason.includes('foco por desempenho recente')
    || normalizedReason.includes('tema fraco')
    || normalizedReason.includes('ponto de atencao')
    || normalizedReason.includes('desempenho recente fraco')
    || normalizedReason.includes('weakness')
  ) {
    return 'Foco por desempenho recente';
  }

  if (
    normalizedReason.includes('equilibrando sua semana')
    || normalizedReason.includes('baixa cobertura na semana')
    || normalizedReason.includes('melhor equilibrio')
    || normalizedReason.includes('weekly_balance')
  ) {
    return 'Equilibrando sua semana';
  }

  if (
    normalizedReason.includes('mantendo seu ritmo de estudo')
    || normalizedReason.includes('nao apareceu recentemente')
    || normalizedReason.includes('recency')
  ) {
    return 'Mantendo seu ritmo de estudo';
  }

  if (normalizedReason.includes('bom proximo passo')) {
    return 'Bom próximo passo para manter seu ritmo';
  }

  return 'Bom próximo passo para manter seu ritmo';
}

export function buildWeeklySessionProgress(
  completedSessions: number,
  plannedSessions?: number | null,
): UserFacingWeeklyProgress | null {
  const safeCompletedSessions = Math.max(0, Math.round(Number(completedSessions) || 0));
  const safePlannedSessions =
    typeof plannedSessions === 'number' && Number.isFinite(plannedSessions) && plannedSessions > 0
      ? Math.max(safeCompletedSessions, Math.round(plannedSessions))
      : 0;

  if (safePlannedSessions <= 0) {
    return null;
  }

  const ratio = Math.min(1, safeCompletedSessions / safePlannedSessions);

  return {
    completedSessions: safeCompletedSessions,
    plannedSessions: safePlannedSessions,
    ratio,
    label: `${safeCompletedSessions} de ${safePlannedSessions} sessões concluídas`,
  };
}
