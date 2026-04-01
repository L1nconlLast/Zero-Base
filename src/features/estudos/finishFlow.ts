import { createManualScheduleEntry } from '../../services/studySchedule.service';
import type { ScheduleEntry } from '../../types';
import { buildHomeReviewQueueItems as buildHomeReviewQueueItemsFromReview } from '../review';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
} from '../../utils/uiLabels';

export interface HomeReviewQueueItem {
  id: string;
  title: string;
  when: string;
  tag: string;
  featured?: boolean;
}

interface QueueStudyReviewInput {
  subject: string;
  topic?: string | null;
  completedAt?: string | null;
  hours?: number;
  durationMinutes?: number;
  note?: string;
}

interface QueueStudyReviewResult {
  entries: ScheduleEntry[];
  reviewEntry: ScheduleEntry | null;
  created: boolean;
}

const MAX_HOME_REVIEW_ITEMS = 3;

const normalizeMatchKey = (value?: string | null): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resolveDateKey = (value?: string | null): string => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return toDateKey(new Date());
  }

  return toDateKey(parsed);
};

const addHoursToDateKey = (value: string | null | undefined, hours: number): string => {
  const parsed = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  safeDate.setHours(safeDate.getHours() + Math.max(1, hours));
  return toDateKey(safeDate);
};

const buildReviewReason = (hours: number): string =>
  `Revisao automatica +${Math.max(1, Math.round(hours))}h apos a conclusao do bloco.`;

const extractReviewTag = (entry: Pick<ScheduleEntry, 'aiReason'>): string => {
  const match = String(entry.aiReason || '').match(/\+(\d+)h/i);
  if (match?.[1]) {
    return `${match[1]}h`;
  }

  return 'Revisao';
};

const buildHomeReviewWhen = (dateKey: string, today = new Date()): string => {
  const current = new Date(today);
  current.setHours(12, 0, 0, 0);
  const target = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(target.getTime())) {
    return 'Programada';
  }

  const diffDays = Math.round((target.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return 'Hoje';
  }

  if (diffDays === 1) {
    return 'Amanha';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(target);
};

const buildReviewTitle = (entry: Pick<ScheduleEntry, 'subject' | 'topic'>): string => {
  const subject = normalizeSubjectLabel(entry.subject, 'Revisao');
  const topic = normalizePresentationLabel(entry.topic || '', '');

  if (!topic) {
    return subject;
  }

  return `${subject} - ${topic}`;
};

const isPendingReviewEntry = (entry: ScheduleEntry): boolean =>
  entry.studyType === 'revisao' && !entry.done && entry.status !== 'concluido';

const buildReviewNote = (note?: string): string | undefined => {
  const safeNote = String(note || '').trim();
  return safeNote || undefined;
};

const generateReviewEntryId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const queueStudyReviewEntry = (
  entries: ScheduleEntry[],
  {
    subject,
    topic,
    completedAt,
    hours = 24,
    durationMinutes = 15,
    note,
  }: QueueStudyReviewInput,
): QueueStudyReviewResult => {
  const safeSubject = normalizeSubjectLabel(subject, 'Revisao');
  const safeTopic = normalizePresentationLabel(topic || '', '');
  const reviewDateKey = addHoursToDateKey(completedAt, hours);
  const subjectKey = normalizeMatchKey(safeSubject);
  const topicKey = normalizeMatchKey(safeTopic);

  const existingEntry = entries.find((entry) =>
    isPendingReviewEntry(entry)
    && entry.date === reviewDateKey
    && normalizeMatchKey(entry.subject) === subjectKey
    && normalizeMatchKey(entry.topic) === topicKey,
  ) || null;

  if (existingEntry) {
    return {
      entries,
      reviewEntry: existingEntry,
      created: false,
    };
  }

  const nextEntryId = generateReviewEntryId();
  const now = new Date().toISOString();
  const seededEntries = createManualScheduleEntry(entries, {
    id: nextEntryId,
    date: reviewDateKey,
    subject: safeSubject,
    topic: safeTopic || undefined,
    durationMinutes,
    note: buildReviewNote(note),
    createdAt: now,
    updatedAt: now,
  });

  const nextEntries = seededEntries.map((entry) => {
    if (entry.id !== nextEntryId) {
      return entry;
    }

    return {
      ...entry,
      studyType: 'revisao' as const,
      priority: 'alta' as const,
      source: 'ia' as const,
      aiReason: buildReviewReason(hours),
      note: buildReviewNote(note) ?? entry.note,
      updatedAt: now,
    };
  });

  return {
    entries: nextEntries,
    reviewEntry: nextEntries.find((entry) => entry.id === nextEntryId) || null,
    created: true,
  };
};

export const buildHomeReviewQueueItems = (
  entries: ScheduleEntry[],
  now = new Date(),
): HomeReviewQueueItem[] => buildHomeReviewQueueItemsFromReview(entries, now);
