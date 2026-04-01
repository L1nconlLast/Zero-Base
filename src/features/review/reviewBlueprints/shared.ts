import { resolveContestLabel } from '../../../utils/trackNarrative';

export const resolveReviewFocusLabel = (
  title?: string | null,
  subjectLabel?: string | null,
): string => {
  const safeTitle = String(title || '').trim();
  const safeSubject = String(subjectLabel || '').trim();

  if (safeTitle && safeSubject && safeTitle !== safeSubject) {
    return `${safeTitle} em ${safeSubject}`;
  }

  return safeTitle || safeSubject || 'este ponto';
};

export const getDaysUntilDate = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

export const resolveContestDescriptor = (
  name?: string | null,
  area?: string | null,
  board?: string | null,
): string => {
  const contestLabel = resolveContestLabel(name || null, area || null);

  return board ? `${contestLabel} / ${board}` : contestLabel;
};

