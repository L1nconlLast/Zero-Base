import type { ScheduleEntry } from '../../types';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
} from '../../utils/uiLabels';
import type { HomeReviewQueueItem, HomeReviewQueueState } from './types';

const MAX_HOME_REVIEW_ITEMS = 3;

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resolveDateKey = (value?: string | null, fallback?: string): string => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return fallback || toDateKey(new Date());
  }

  return toDateKey(parsed);
};

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

const compareReviewEntries = (
  left: ScheduleEntry,
  right: ScheduleEntry,
  todayKey: string,
): number => {
  const dateDiff = resolveDateKey(left.date, todayKey).localeCompare(resolveDateKey(right.date, todayKey));
  if (dateDiff !== 0) {
    return dateDiff;
  }

  if ((left.priority || 'normal') !== (right.priority || 'normal')) {
    return left.priority === 'alta' ? -1 : 1;
  }

  const createdDiff = String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return left.id.localeCompare(right.id);
};

const mapEntryToHomeItem = (
  entry: ScheduleEntry,
  now: Date,
  featured = false,
): HomeReviewQueueItem => ({
  id: entry.id,
  title: buildReviewTitle(entry),
  when: buildHomeReviewWhen(resolveDateKey(entry.date), now),
  tag: extractReviewTag(entry),
  featured,
});

export const getPendingReviewEntries = (
  entries: ScheduleEntry[],
  now = new Date(),
): ScheduleEntry[] => {
  const todayKey = toDateKey(now);
  return entries
    .filter(isPendingReviewEntry)
    .sort((left, right) => compareReviewEntries(left, right, todayKey));
};

export const getCompletedReviewEntriesToday = (
  entries: ScheduleEntry[],
  now = new Date(),
): ScheduleEntry[] => {
  const todayKey = toDateKey(now);
  return entries
    .filter((entry) =>
      entry.studyType === 'revisao'
      && Boolean(entry.lastReviewedAt)
      && resolveDateKey(entry.lastReviewedAt, todayKey) === todayKey,
    )
    .sort((left, right) =>
      String(right.lastReviewedAt || right.updatedAt || '').localeCompare(String(left.lastReviewedAt || left.updatedAt || '')));
};

export const buildHomeReviewQueueState = (
  entries: ScheduleEntry[],
  now = new Date(),
): HomeReviewQueueState => {
  const todayKey = toDateKey(now);
  const pendingEntries = getPendingReviewEntries(entries, now);
  const dueTodayEntries = pendingEntries.filter((entry) => resolveDateKey(entry.date, todayKey) <= todayKey);
  const upcomingEntries = pendingEntries.filter((entry) => resolveDateKey(entry.date, todayKey) > todayKey);
  const completedTodayEntries = getCompletedReviewEntriesToday(entries, now);
  const visibleEntries = dueTodayEntries.length > 0 ? dueTodayEntries : upcomingEntries;
  const items = visibleEntries
    .slice(0, MAX_HOME_REVIEW_ITEMS)
    .map((entry, index) => mapEntryToHomeItem(entry, now, index === 0));

  if (dueTodayEntries.length > 0) {
    return {
      status: 'pending_today',
      dueTodayCount: dueTodayEntries.length,
      completedTodayCount: completedTodayEntries.length,
      upcomingCount: upcomingEntries.length,
      totalPendingCount: pendingEntries.length,
      items,
      nextItem: items[0] || null,
    };
  }

  if (completedTodayEntries.length > 0) {
    return {
      status: 'completed_today',
      dueTodayCount: 0,
      completedTodayCount: completedTodayEntries.length,
      upcomingCount: upcomingEntries.length,
      totalPendingCount: pendingEntries.length,
      items,
      nextItem: items[0] || null,
    };
  }

  if (upcomingEntries.length > 0) {
    return {
      status: 'upcoming',
      dueTodayCount: 0,
      completedTodayCount: 0,
      upcomingCount: upcomingEntries.length,
      totalPendingCount: pendingEntries.length,
      items,
      nextItem: items[0] || null,
    };
  }

  return {
    status: 'empty',
    dueTodayCount: 0,
    completedTodayCount: completedTodayEntries.length,
    upcomingCount: 0,
    totalPendingCount: 0,
    items: [],
    nextItem: null,
  };
};

export const buildHomeReviewQueueItems = (
  entries: ScheduleEntry[],
  now = new Date(),
): HomeReviewQueueItem[] => buildHomeReviewQueueState(entries, now).items;
