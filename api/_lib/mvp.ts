import { adminSupabase } from './supabase';

const DISCIPLINE_RECOMMENDATION_MAP: Record<string, {
  subject: string;
  disciplineName: string;
  topicSlug: string;
  topic: string;
  topicName: string;
}> = {
  matematica: {
    subject: 'Matematica',
    disciplineName: 'Matematica',
    topicSlug: 'porcentagem',
    topic: 'Porcentagem',
    topicName: 'Porcentagem',
  },
  linguagens: {
    subject: 'Linguagens',
    disciplineName: 'Linguagens',
    topicSlug: 'interpretacao-texto',
    topic: 'Interpretacao de Texto',
    topicName: 'Interpretacao de Texto',
  },
  natureza: {
    subject: 'Natureza',
    disciplineName: 'Natureza',
    topicSlug: 'ecologia',
    topic: 'Ecologia',
    topicName: 'Ecologia',
  },
  humanas: {
    subject: 'Humanas',
    disciplineName: 'Humanas',
    topicSlug: 'revolucao-francesa',
    topic: 'Revolucao Francesa',
    topicName: 'Revolucao Francesa',
  },
  redacao: {
    subject: 'Redacao',
    disciplineName: 'Redacao',
    topicSlug: 'competencia-1',
    topic: 'Competencia 1',
    topicName: 'Competencia 1',
  },
};

const VALID_DISCIPLINES = new Set(Object.keys(DISCIPLINE_RECOMMENDATION_MAP));
const RECOMMENDATION_WINDOW_SIZE = 20;
const RECOMMENDATION_WINDOW_DAYS = 7;
const RECOMMENDATION_MIN_WINDOW_ATTEMPTS = 10;
const RECOMMENDATION_MIN_ERROR_RATE = 0.3;
const RECOMMENDATION_MIN_DELTA = 0.1;

type RecentAttemptRow = {
  subject: string | null;
  topic: string | null;
  correct: boolean;
  created_at: string;
  session_id: string | null;
};

type SubjectDecisionStat = {
  subject: string;
  disciplineSlug: string;
  total: number;
  errors: number;
  errorRate: number;
  lastAttemptAt: string;
};

type TopicDecisionStat = {
  topic: string;
  total: number;
  errors: number;
  errorRate: number;
  lastAttemptAt: string;
};

type RecommendationDecisionContext = {
  windowSize: number;
  windowDays: number;
  usedFallback: boolean;
  attemptsEvaluated: number;
  thresholds: {
    minErrorRate: number;
    minDelta: number;
  };
  subjectStats: Array<{
    subject: string;
    disciplineSlug: string;
    total: number;
    errors: number;
    errorRate: number;
    lastAttemptAt: string;
  }>;
  chosenSubject: string | null;
  chosenTopic: string | null;
  currentRecommendation: {
    subject: string | null;
    topic: string | null;
    decisionType: string | null;
  } | null;
  switched: boolean;
};

type RecommendationInput = {
  subject: string;
  topic: string;
  disciplineSlug: string;
  disciplineName: string;
  topicSlug: string;
  topicName: string;
  reason: string;
  score: number;
  decisionType?: string;
  decisionContext?: RecommendationDecisionContext | Record<string, unknown>;
  sourceSessionId?: string | null;
};

const normalizeTextKey = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getDisciplineEntry = (value?: string | null) => {
  const normalized = normalizeTextKey(value);
  if (!normalized) {
    return null;
  }

  const matched = Object.entries(DISCIPLINE_RECOMMENDATION_MAP).find(([slug, entry]) =>
    normalized === slug
    || normalized === normalizeTextKey(entry.subject)
    || normalized === normalizeTextKey(entry.disciplineName));

  if (!matched) {
    return null;
  }

  const [disciplineSlug, entry] = matched;
  return { disciplineSlug, ...entry };
};

export const getRecommendationMeta = (subject?: string | null, topic?: string | null) => {
  const matched = getDisciplineEntry(subject);
  if (matched) {
    const { disciplineSlug, ...value } = matched;
    return {
      disciplineSlug,
      disciplineName: value.disciplineName,
      topicSlug: value.topicSlug,
      topicName: topic || value.topicName,
      subject: subject || value.subject,
      topic: topic || value.topic,
    };
  }

  return {
    disciplineSlug: 'matematica',
    disciplineName: subject || 'Matematica',
    topicSlug: 'porcentagem',
    topicName: topic || 'Porcentagem',
    subject: subject || 'Matematica',
    topic: topic || 'Porcentagem',
  };
};

const normalizeArray = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((entry) => getDisciplineEntry(String(entry || ''))?.disciplineSlug || normalizeTextKey(entry))
    .filter((entry) => VALID_DISCIPLINES.has(entry));

  return normalized.filter((entry, index) => normalized.indexOf(entry) === index);
};

const toDateOnly = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const clampStreakDays = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(365, parsed));
};

const pickMostRecentDay = (left?: string | null, right?: string | null): string | null => {
  if (!left) {
    return right || null;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
};

const isMissingOnboardingProfileTableError = (message?: string): boolean => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('onboarding_profile')
    && (
      normalized.includes('does not exist')
      || normalized.includes('undefined table')
      || normalized.includes('schema cache')
    );
};

export type OnboardingStreakState = {
  streakDays: number;
  streakLastDay: string | null;
};

const USER_PROFILE_STREAK_DAYS_KEY = 'onboarding_streak_days';
const USER_PROFILE_STREAK_LAST_DAY_KEY = 'onboarding_streak_last_day';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const getOnboardingStreakFromWeekProgress = (weekProgress: unknown): OnboardingStreakState | null => {
  if (!isObjectRecord(weekProgress)) {
    return null;
  }

  const hasStoredDays = Object.prototype.hasOwnProperty.call(weekProgress, USER_PROFILE_STREAK_DAYS_KEY);
  const hasStoredLastDay = Object.prototype.hasOwnProperty.call(weekProgress, USER_PROFILE_STREAK_LAST_DAY_KEY);

  if (!hasStoredDays && !hasStoredLastDay) {
    return null;
  }

  return {
    streakDays: clampStreakDays(weekProgress[USER_PROFILE_STREAK_DAYS_KEY]),
    streakLastDay: toDateOnly(
      typeof weekProgress[USER_PROFILE_STREAK_LAST_DAY_KEY] === 'string'
        ? weekProgress[USER_PROFILE_STREAK_LAST_DAY_KEY]
        : null,
    ) || null,
  };
};

const buildWeekProgressWithOnboardingStreak = (
  weekProgress: unknown,
  streak: OnboardingStreakState,
): Record<string, unknown> => ({
  ...(isObjectRecord(weekProgress) ? weekProgress : {}),
  [USER_PROFILE_STREAK_DAYS_KEY]: streak.streakDays,
  [USER_PROFILE_STREAK_LAST_DAY_KEY]: streak.streakLastDay,
});

const isMissingUserProfileStorageError = (message?: string): boolean => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('user_profile')
    && (
      normalized.includes('does not exist')
      || normalized.includes('undefined table')
      || normalized.includes('schema cache')
    );
};

export const ensureCoreUserRecords = async (authUser: any): Promise<void> => {
  if (!adminSupabase || !authUser?.id) {
    return;
  }

  const email = String(authUser.email || '').trim().toLowerCase();
  const name = String(
    authUser.user_metadata?.name
    || authUser.user_metadata?.full_name
    || email.split('@')[0]
    || 'Usuario',
  ).trim();

  const { data: existingUser, error: existingUserError } = await adminSupabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(`Falha ao verificar public.users: ${existingUserError.message}`);
  }

  if (existingUser) {
    return;
  }

  const { error } = await adminSupabase
    .from('users')
    .insert({
      id: authUser.id,
      email,
      name,
    });

  if (error && !error.message.toLowerCase().includes('duplicate key')) {
    throw new Error(`Falha ao sincronizar public.users: ${error.message}`);
  }
};

export const getUserProfile = async (userId: string): Promise<any | null> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await adminSupabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar user_profiles: ${error.message}`);
  }

  return data || null;
};

const getOnboardingStreakFromUserProfileStorage = async (
  userId: string,
): Promise<OnboardingStreakState | null> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await adminSupabase
    .from('user_profile')
    .select('week_progress')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingUserProfileStorageError(error.message)) {
      return null;
    }

    throw new Error(`Falha ao buscar user_profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return getOnboardingStreakFromWeekProgress(data.week_progress);
};

const getOnboardingStreakFromLegacyTable = async (userId: string): Promise<OnboardingStreakState> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await adminSupabase
    .from('onboarding_profile')
    .select('streak_days, streak_last_day')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingOnboardingProfileTableError(error.message)) {
      return {
        streakDays: 0,
        streakLastDay: null,
      };
    }

    throw new Error(`Falha ao buscar onboarding_profile: ${error.message}`);
  }

  return {
    streakDays: clampStreakDays(data?.streak_days),
    streakLastDay: toDateOnly(data?.streak_last_day) || null,
  };
};

const mergeOnboardingStreakIntoUserProfileStorage = async (
  userId: string,
  streak: OnboardingStreakState,
): Promise<OnboardingStreakState | null> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data: current, error: fetchError } = await adminSupabase
    .from('user_profile')
    .select('week_progress')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    if (isMissingUserProfileStorageError(fetchError.message)) {
      return null;
    }

    throw new Error(`Falha ao buscar user_profile: ${fetchError.message}`);
  }

  const { error: upsertError } = await adminSupabase
    .from('user_profile')
    .upsert(
      {
        user_id: userId,
        week_progress: buildWeekProgressWithOnboardingStreak(current?.week_progress, streak),
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    if (isMissingUserProfileStorageError(upsertError.message)) {
      return null;
    }

    throw new Error(`Falha ao salvar user_profile: ${upsertError.message}`);
  }

  return streak;
};

const mergeOnboardingStreakIntoLegacyTable = async (
  userId: string,
  input: OnboardingStreakState,
): Promise<OnboardingStreakState> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const incomingDays = clampStreakDays(input.streakDays);
  const incomingLastDay = toDateOnly(input.streakLastDay);

  let dbDays = 0;
  let dbLastDay: string | null = null;

  const { data: current, error: fetchError } = await adminSupabase
    .from('onboarding_profile')
    .select('streak_days, streak_last_day')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    if (!isMissingOnboardingProfileTableError(fetchError.message)) {
      throw new Error(`Falha ao buscar onboarding_profile: ${fetchError.message}`);
    }
  } else {
    dbDays = clampStreakDays(current?.streak_days);
    dbLastDay = toDateOnly(current?.streak_last_day) || null;
  }

  const mergedState = {
    streakDays: Math.max(dbDays, incomingDays),
    streakLastDay: pickMostRecentDay(dbLastDay, incomingLastDay),
  };

  const { error: upsertError } = await adminSupabase
    .from('onboarding_profile')
    .upsert(
      {
        user_id: userId,
        streak_days: mergedState.streakDays,
        streak_last_day: mergedState.streakLastDay,
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    if (isMissingOnboardingProfileTableError(upsertError.message)) {
      return mergedState;
    }

    throw new Error(`Falha ao salvar onboarding_profile: ${upsertError.message}`);
  }

  return mergedState;
};

export const getOnboardingStreak = async (userId: string): Promise<OnboardingStreakState> => {
  const storedInUserProfile = await getOnboardingStreakFromUserProfileStorage(userId);
  if (storedInUserProfile) {
    return storedInUserProfile;
  }

  return getOnboardingStreakFromLegacyTable(userId);
};

export const mergeOnboardingStreak = async (
  userId: string,
  input: {
    streakDays?: unknown;
    streakLastDay?: unknown;
  },
): Promise<OnboardingStreakState> => {
  const current = await getOnboardingStreak(userId);
  const incomingState = {
    streakDays: clampStreakDays(input.streakDays),
    streakLastDay: toDateOnly(
      typeof input.streakLastDay === 'string' ? input.streakLastDay : null,
    ) || null,
  };

  const mergedState = {
    streakDays: Math.max(current.streakDays, incomingState.streakDays),
    streakLastDay: pickMostRecentDay(current.streakLastDay, incomingState.streakLastDay),
  };

  const persistedInUserProfile = await mergeOnboardingStreakIntoUserProfileStorage(userId, mergedState);
  if (persistedInUserProfile) {
    return persistedInUserProfile;
  }

  return mergeOnboardingStreakIntoLegacyTable(userId, mergedState);
};

export const upsertUserProfile = async (
  userId: string,
  input: {
    examType: string;
    level: string;
    weeklyHours: number;
    preferredGoal: string;
    weakestDisciplines: string[];
  },
): Promise<any> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const payload = {
    id: userId,
    exam_type: input.examType,
    level: input.level,
    weekly_hours: input.weeklyHours,
    preferred_goal: input.preferredGoal,
    weakest_disciplines: normalizeArray(input.weakestDisciplines).slice(0, 2),
  };

  const { data, error } = await adminSupabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Falha ao salvar user_profiles: ${error.message}`);
  }

  return data;
};

export const buildStarterRecommendation = (profile: {
  weakest_disciplines?: unknown;
  level?: string;
  preferred_goal?: string | null;
}) => {
  const weakestDisciplines = normalizeArray(profile.weakest_disciplines).slice(0, 2);
  const chosenDiscipline = weakestDisciplines[0] || 'matematica';
  const starter = DISCIPLINE_RECOMMENDATION_MAP[chosenDiscipline] || DISCIPLINE_RECOMMENDATION_MAP.matematica;
  const level = String(profile.level || 'iniciante');
  const preferredGoal = String(profile.preferred_goal || '').trim();

  const reasonParts = [
    weakestDisciplines.length > 0
      ? `Voce marcou ${starter.disciplineName} como prioridade de reforco`
      : `Comecamos por ${starter.disciplineName} para te colocar em movimento rapido`,
    level === 'iniciante'
      ? 'com um topico de entrada mais seguro.'
      : 'com um topico de alto retorno para retomar consistencia.',
  ];

  if (preferredGoal) {
    reasonParts.push(`Objetivo declarado: ${preferredGoal}.`);
  }

  return {
    subject: starter.subject,
    topic: starter.topic,
    disciplineSlug: chosenDiscipline,
    disciplineName: starter.disciplineName,
    topicSlug: starter.topicSlug,
    topicName: starter.topicName,
    reason: reasonParts.join(' '),
    score: weakestDisciplines.length > 0 ? 0.84 : 0.72,
  };
};

export const getCurrentRecommendation = async (userId: string): Promise<any | null> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await adminSupabase
    .from('user_recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar recomendacao: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    ...getRecommendationMeta(data.subject, data.topic),
    score: Number(data.score || 0.75),
    generated_at: data.generated_at || data.created_at,
  };
};

export const replaceActiveRecommendation = async (
  userId: string,
  recommendation: RecommendationInput,
): Promise<any> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { error: expireError } = await adminSupabase
    .from('user_recommendations')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (expireError) {
    throw new Error(`Falha ao expirar recomendacao ativa: ${expireError.message}`);
  }

  const { data, error } = await adminSupabase
    .from('user_recommendations')
    .insert({
      user_id: userId,
      subject: recommendation.subject,
      topic: recommendation.topic,
      reason: recommendation.reason,
      score: recommendation.score,
      status: 'active',
      generated_at: new Date().toISOString(),
      source_session_id: recommendation.sourceSessionId || null,
      decision_type: recommendation.decisionType || 'starter_profile',
      decision_context: recommendation.decisionContext || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Falha ao salvar recomendacao: ${error.message}`);
  }

  return {
    ...data,
    ...getRecommendationMeta(data.subject, data.topic),
    score: Number(data.score || recommendation.score || 0.75),
    generated_at: data.generated_at || data.created_at,
  };
};

export const ensureRecommendationForUser = async (userId: string): Promise<any | null> => {
  const current = await getCurrentRecommendation(userId);
  if (current) {
    return current;
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    return null;
  }

  const generated = buildStarterRecommendation(profile);
  return replaceActiveRecommendation(userId, generated);
};

const getRecentAttemptsForDecision = async (
  userId: string,
): Promise<{ rows: RecentAttemptRow[]; usedFallback: boolean }> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const windowStart = new Date(Date.now() - RECOMMENDATION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const recentQuery = adminSupabase
    .from('question_attempts')
    .select('subject, topic, correct, created_at, session_id')
    .eq('user_id', userId)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(RECOMMENDATION_WINDOW_SIZE);

  const { data: recentRows, error: recentError } = await recentQuery;

  if (recentError) {
    throw new Error(`Falha ao buscar tentativas recentes: ${recentError.message}`);
  }

  if ((recentRows || []).length >= RECOMMENDATION_MIN_WINDOW_ATTEMPTS) {
    return {
      rows: (recentRows || []) as RecentAttemptRow[],
      usedFallback: false,
    };
  }

  const { data: fallbackRows, error: fallbackError } = await adminSupabase
    .from('question_attempts')
    .select('subject, topic, correct, created_at, session_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fallbackError) {
    throw new Error(`Falha ao buscar tentativas de fallback: ${fallbackError.message}`);
  }

  return {
    rows: (fallbackRows || []) as RecentAttemptRow[],
    usedFallback: true,
  };
};

  const compareIsoDesc = (left: string, right: string): number =>
  right.localeCompare(left);

const buildSubjectDecisionStats = (rows: RecentAttemptRow[]): SubjectDecisionStat[] => {
  const statsBySubject = new Map<string, SubjectDecisionStat>();

  for (const row of rows) {
    const meta = getRecommendationMeta(row.subject, row.topic);
    const subject = meta.subject;
    const disciplineSlug = meta.disciplineSlug;
    const key = disciplineSlug;
    const current = statsBySubject.get(key) || {
      subject,
      disciplineSlug,
      total: 0,
      errors: 0,
      errorRate: 0,
      lastAttemptAt: row.created_at,
    };

    current.total += 1;
    current.errors += row.correct ? 0 : 1;
    current.lastAttemptAt = current.lastAttemptAt.localeCompare(row.created_at) >= 0
      ? current.lastAttemptAt
      : row.created_at;
    statsBySubject.set(key, current);
  }

  return [...statsBySubject.values()]
    .map((entry) => ({
      ...entry,
      errorRate: entry.total > 0 ? entry.errors / entry.total : 0,
    }))
    .sort((left, right) => {
      if (right.errorRate !== left.errorRate) {
        return right.errorRate - left.errorRate;
      }

      if (right.errors !== left.errors) {
        return right.errors - left.errors;
      }

      const recency = compareIsoDesc(left.lastAttemptAt, right.lastAttemptAt);
      if (recency !== 0) {
        return recency;
      }

      return normalizeTextKey(left.subject).localeCompare(normalizeTextKey(right.subject));
    });
};

const buildTopicDecisionStats = (
  rows: RecentAttemptRow[],
  subject: string,
): TopicDecisionStat[] => {
  const targetSubject = normalizeTextKey(subject);
  const statsByTopic = new Map<string, TopicDecisionStat>();

  for (const row of rows) {
    if (normalizeTextKey(row.subject) !== targetSubject) {
      continue;
    }

    const topic = String(row.topic || '').trim() || 'Geral';
    const current = statsByTopic.get(topic) || {
      topic,
      total: 0,
      errors: 0,
      errorRate: 0,
      lastAttemptAt: row.created_at,
    };

    current.total += 1;
    current.errors += row.correct ? 0 : 1;
    current.lastAttemptAt = current.lastAttemptAt.localeCompare(row.created_at) >= 0
      ? current.lastAttemptAt
      : row.created_at;
    statsByTopic.set(topic, current);
  }

  return [...statsByTopic.values()]
    .map((entry) => ({
      ...entry,
      errorRate: entry.total > 0 ? entry.errors / entry.total : 0,
    }))
    .sort((left, right) => {
      if (right.errors !== left.errors) {
        return right.errors - left.errors;
      }

      const recency = compareIsoDesc(left.lastAttemptAt, right.lastAttemptAt);
      if (recency !== 0) {
        return recency;
      }

      return normalizeTextKey(left.topic).localeCompare(normalizeTextKey(right.topic));
    });
};

const persistWeakestDisciplines = async (userId: string, weakestDisciplines: string[]): Promise<void> => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const normalized = normalizeArray(weakestDisciplines).slice(0, 2);
  const { error } = await adminSupabase
    .from('user_profiles')
    .update({ weakest_disciplines: normalized })
    .eq('id', userId);

  if (error) {
    throw new Error(`Falha ao atualizar weakest_disciplines: ${error.message}`);
  }
};

const formatPercentage = (value: number): number =>
  Math.round(value * 100);

const buildErrorRateRecommendation = (
  subjectStat: SubjectDecisionStat,
  topicStat: TopicDecisionStat | null,
  decisionContext: RecommendationDecisionContext,
  sourceSessionId: string,
): RecommendationInput => {
  const meta = getRecommendationMeta(subjectStat.subject, topicStat?.topic || null);
  const topicName = topicStat?.topic || meta.topicName;
  const errors = subjectStat.errors;
  const total = subjectStat.total;
  const errorPercent = formatPercentage(subjectStat.errorRate);

  return {
    subject: meta.subject,
    topic: topicName,
    disciplineSlug: meta.disciplineSlug,
    disciplineName: meta.disciplineName,
    topicSlug: meta.topicSlug,
    topicName,
    reason: `Voce errou ${errors} de ${total} em ${meta.disciplineName} (${errorPercent}%) nas ultimas tentativas. Foco em ${topicName}.`,
    score: Math.min(0.95, 0.72 + subjectStat.errorRate * 0.25),
    decisionType: 'error_rate_recent',
    decisionContext,
    sourceSessionId,
  };
};

const buildKeepCurrentRecommendation = (
  currentRecommendation: any,
  candidateSubjectStat: SubjectDecisionStat,
  decisionContext: RecommendationDecisionContext,
  sourceSessionId: string,
): RecommendationInput => {
  const meta = getRecommendationMeta(currentRecommendation.subject, currentRecommendation.topic);
  const errorPercent = formatPercentage(candidateSubjectStat.errorRate);

  return {
    subject: meta.subject,
    topic: currentRecommendation.topic || meta.topicName,
    disciplineSlug: meta.disciplineSlug,
    disciplineName: meta.disciplineName,
    topicSlug: meta.topicSlug,
    topicName: currentRecommendation.topic || meta.topicName,
    reason: `Seu maior erro recente apareceu em ${candidateSubjectStat.subject} (${errorPercent}%), mas a diferenca ainda nao justifica trocar o foco atual. Seguimos em ${meta.disciplineName} com ${currentRecommendation.topic || meta.topicName}.`,
    score: Number(currentRecommendation.score || 0.75),
    decisionType: 'error_rate_recent',
    decisionContext,
    sourceSessionId,
  };
};

export const refreshRecommendationFromRecentAttempts = async (
  userId: string,
  sourceSessionId: string,
): Promise<any | null> => {
  const currentRecommendation = await getCurrentRecommendation(userId);
  const { rows, usedFallback } = await getRecentAttemptsForDecision(userId);

  if (rows.length === 0) {
    return currentRecommendation;
  }

  const subjectStats = buildSubjectDecisionStats(rows);
  const weakestDisciplines = subjectStats
    .slice(0, 2)
    .map((entry) => entry.disciplineSlug);

  await persistWeakestDisciplines(userId, weakestDisciplines);

  const selectedSubjectStat = subjectStats[0];
  const topicStats = buildTopicDecisionStats(rows, selectedSubjectStat.subject);
  const selectedTopicStat = topicStats[0] || null;
  const currentSubjectMeta = currentRecommendation
    ? getRecommendationMeta(currentRecommendation.subject, currentRecommendation.topic)
    : null;
  const currentSubjectStat = currentSubjectMeta
    ? subjectStats.find((entry) => entry.disciplineSlug === currentSubjectMeta.disciplineSlug) || null
    : null;
  const isSameDiscipline = Boolean(
    currentSubjectMeta && currentSubjectMeta.disciplineSlug === selectedSubjectStat.disciplineSlug,
  );
  const currentErrorRate = currentSubjectStat?.errorRate || 0;
  const shouldSwitchDiscipline = !isSameDiscipline
    && selectedSubjectStat.errorRate >= RECOMMENDATION_MIN_ERROR_RATE
    && (selectedSubjectStat.errorRate - currentErrorRate) >= RECOMMENDATION_MIN_DELTA;

  const decisionContext: RecommendationDecisionContext = {
    windowSize: RECOMMENDATION_WINDOW_SIZE,
    windowDays: RECOMMENDATION_WINDOW_DAYS,
    usedFallback,
    attemptsEvaluated: rows.length,
    thresholds: {
      minErrorRate: RECOMMENDATION_MIN_ERROR_RATE,
      minDelta: RECOMMENDATION_MIN_DELTA,
    },
    subjectStats: subjectStats.map((entry) => ({
      subject: entry.subject,
      disciplineSlug: entry.disciplineSlug,
      total: entry.total,
      errors: entry.errors,
      errorRate: Number(entry.errorRate.toFixed(4)),
      lastAttemptAt: entry.lastAttemptAt,
    })),
    chosenSubject: selectedSubjectStat.subject,
    chosenTopic: selectedTopicStat?.topic || null,
    currentRecommendation: currentRecommendation
      ? {
        subject: currentRecommendation.subject || null,
        topic: currentRecommendation.topic || null,
        decisionType: currentRecommendation.decision_type || null,
      }
      : null,
    switched: shouldSwitchDiscipline,
  };

  const nextRecommendation = (!currentRecommendation || isSameDiscipline || shouldSwitchDiscipline)
    ? buildErrorRateRecommendation(selectedSubjectStat, selectedTopicStat, decisionContext, sourceSessionId)
    : buildKeepCurrentRecommendation(currentRecommendation, selectedSubjectStat, decisionContext, sourceSessionId);

  return replaceActiveRecommendation(userId, nextRecommendation);
};

export const getGamificationSnapshot = async (userId: string) => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await adminSupabase
    .from('study_sessions')
    .select('date, finished_at, points, status')
    .eq('user_id', userId)
    .eq('status', 'finished')
    .order('date', { ascending: false })
    .limit(90);

  if (error) {
    throw new Error(`Falha ao buscar gamificacao da home: ${error.message}`);
  }

  const completedDates = (data || [])
    .map((row: any) => ({
      date: String(row.finished_at || row.date || '').slice(0, 10),
      xpEarned: Number(row.points || 0),
    }));

  const distinctDates = completedDates
    .map((entry) => entry.date)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort((left, right) => right.localeCompare(left));

  let streakDays = 0;
  let cursor = distinctDates[0] ? new Date(`${distinctDates[0]}T12:00:00Z`) : null;

  for (const dateKey of distinctDates) {
    if (!cursor) {
      break;
    }

    const current = new Date(`${dateKey}T12:00:00Z`);
    if (current.getTime() !== cursor.getTime()) {
      break;
    }

    streakDays += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  const xp = completedDates.reduce((sum, entry) => sum + entry.xpEarned, 0);

  return {
    xp,
    level: Math.max(1, Math.floor(xp / 50) + 1),
    streakDays,
    dailyGoal: 90,
  };
};
