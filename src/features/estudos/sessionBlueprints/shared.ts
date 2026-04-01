export const isGenericObjective = (value: string): boolean => {
  const safeValue = value.trim().toLowerCase();
  return !safeValue || safeValue === 'bloco oficial do dia';
};

export const resolveSessionFocusLabel = (
  objective: string,
  blockLabel: string,
): string => {
  const safeObjective = objective.trim();
  const safeBlockLabel = blockLabel.trim();

  if (!safeBlockLabel) {
    return safeObjective || 'bloco principal';
  }

  if (isGenericObjective(safeObjective)) {
    return safeBlockLabel;
  }

  const normalizedObjective = safeObjective.toLowerCase();
  const normalizedBlock = safeBlockLabel.toLowerCase();

  if (normalizedObjective === normalizedBlock || normalizedObjective.includes(normalizedBlock)) {
    return safeBlockLabel;
  }

  return safeObjective;
};

export const buildQuestionValidationLabel = (count: number, fallback: string): string =>
  count > 0 ? `Validar com ${count} questoes` : fallback;

export const formatBlueprintDate = (value?: string | null): string | null => {
  if (!value) return null;

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
};

export const getDaysUntilDate = (value?: string | null): number | null => {
  if (!value) return null;

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  return Math.round((target - today) / 86400000);
};
