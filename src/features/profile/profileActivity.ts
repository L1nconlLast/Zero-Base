import type { ScheduleEntry, StudySession } from '../../types';
import type { ProfileActivityData, ProfileActivityItemData } from './types';

const MAX_ACTIVITY_ITEMS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const resolveIsoValue = (rawValue?: string | null): string | null => {
  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return `${rawValue}T12:00:00.000Z`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const formatRelativeLabel = (happenedAt: string, now: Date): string => {
  const parsed = new Date(happenedAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recentemente';
  }

  const currentDay = new Date(now);
  currentDay.setHours(12, 0, 0, 0);

  const targetDay = new Date(parsed);
  targetDay.setHours(12, 0, 0, 0);

  const diffDays = Math.round((currentDay.getTime() - targetDay.getTime()) / DAY_MS);

  if (diffDays <= 0) {
    return 'Hoje';
  }

  if (diffDays === 1) {
    return 'Ontem';
  }

  return `Ha ${diffDays} dias`;
};

const formatSubjectContext = (subject?: string | null, topic?: string | null): string | undefined => {
  const safeSubject = String(subject || '').trim();
  const safeTopic = String(topic || '').trim();

  if (safeSubject && safeTopic) {
    return `${safeSubject} - ${safeTopic}`;
  }

  if (safeTopic) {
    return safeTopic;
  }

  if (safeSubject) {
    return safeSubject;
  }

  return undefined;
};

const formatMinutesMeta = (session: StudySession): string | undefined => {
  const safeMinutes = Math.max(0, Number(session.minutes || 0));
  if (safeMinutes > 0) {
    return `${safeMinutes} min`;
  }

  const durationSeconds = Math.max(0, Number(session.duration || 0));
  if (durationSeconds > 0) {
    const roundedMinutes = Math.max(1, Math.round(durationSeconds / 60));
    return `${roundedMinutes} min`;
  }

  return undefined;
};

const buildStudyActivityItems = (sessions: StudySession[], now: Date): ProfileActivityItemData[] =>
  sessions.flatMap((session, index) => {
    const happenedAt = resolveIsoValue(session.timestamp || session.date);
    if (!happenedAt) {
      return [];
    }

    return [{
      id: `study-${session.timestamp || session.date}-${session.subject}-${index}`,
      type: 'study_session',
      title: 'Sessao concluida',
      contextLabel: formatSubjectContext(String(session.subject || '').trim()),
      metaLabel: formatMinutesMeta(session),
      happenedAt,
      relativeLabel: formatRelativeLabel(happenedAt, now),
    }];
  });

const buildReviewActivityItems = (scheduleEntries: ScheduleEntry[], now: Date): ProfileActivityItemData[] =>
  scheduleEntries.flatMap((entry) => {
    if (entry.studyType !== 'revisao') {
      return [];
    }

    const happenedAt = resolveIsoValue(
      entry.lastReviewedAt || (entry.done || entry.status === 'concluido' ? entry.updatedAt || entry.date : undefined),
    );

    if (!happenedAt) {
      return [];
    }

    return [{
      id: `review-${entry.id}-${happenedAt}`,
      type: 'review',
      title: 'Revisao concluida',
      contextLabel: formatSubjectContext(entry.subject, entry.topic),
      metaLabel: entry.lastReviewFeedback ? `Feedback: ${entry.lastReviewFeedback}` : undefined,
      happenedAt,
      relativeLabel: formatRelativeLabel(happenedAt, now),
    }];
  });

export const buildProfileActivityData = (
  sessions: StudySession[],
  scheduleEntries: ScheduleEntry[] = [],
  now: Date = new Date(),
): ProfileActivityData => {
  const items = [
    ...buildStudyActivityItems(sessions, now),
    ...buildReviewActivityItems(scheduleEntries, now),
  ]
    .sort((left, right) => {
      const timeDiff = new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, MAX_ACTIVITY_ITEMS);

  return {
    items,
    emptyLabel: 'Conclua uma sessao ou revisao para comecar seu historico recente.',
  };
};
