import {
  ensureRecommendationForUser,
  getRecommendationMeta,
  getUserProfile,
  refreshRecommendationFromRecentAttempts,
} from './mvp';
import { adminSupabase } from './supabase';

type RecommendationContext = {
  subject: string;
  topic: string;
  disciplineSlug: string;
  disciplineName: string;
  topicSlug: string;
  topicName: string;
  reason: string;
};

type TopicRelation = {
  nome: string | null;
  disciplinas?: DisciplineRelation | DisciplineRelation[] | null;
};

type DisciplineRelation = {
  nome: string | null;
};

type QuestionRow = {
  id: string;
  enunciado: string;
  nivel: 'facil' | 'medio' | 'dificil';
  explicacao: string | null;
  assunto: string | null;
  topicos?: TopicRelation | TopicRelation[] | null;
  alternativas: Array<{
    id: string;
    letra: 'A' | 'B' | 'C' | 'D' | 'E';
    texto: string;
    correta: boolean;
  }>;
};

type StudySessionRow = {
  id: string;
  user_id: string;
  date: string;
  minutes: number;
  points: number;
  subject: string;
  duration: number;
  goal_met: boolean | null;
  timestamp: string | null;
  created_at: string;
  status: 'active' | 'finished';
  total_questions: number | null;
  correct_answers: number | null;
  finished_at: string | null;
  updated_at: string | null;
};

type SessionQuestionRow = {
  session_id: string;
  question_id: string;
  position: number;
};

type QuestionAttemptRow = {
  session_id: string;
  question_id: string;
  correct: boolean;
  response_time_seconds: number;
  created_at: string;
};

type StoredSessionAnswer = {
  alternativeId: string;
  letter: string;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeSeconds: number;
};

export type StudySessionQuestion = {
  id: string;
  prompt: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  explanation: string | null;
  subject: string;
  topic: string;
  options: Array<{
    id: string;
    letter: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }>;
};

export type StudySessionView = {
  sessionId: string;
  status: 'active' | 'completed';
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  subject: string;
  topic: string;
  reason: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number;
  questions: StudySessionQuestion[];
  answers: Record<string, StoredSessionAnswer>;
  result: {
    total: number;
    correct: number;
    accuracy: number;
  } | null;
};

export type StudySessionResult = {
  sessionId: string;
  total: number;
  correct: number;
  accuracy: number;
  durationSeconds: number;
};

type HomeStudySummary = {
  sessionsCompleted: number;
  studyMinutes: number;
  totalXp: number;
  streakDays: number;
  lastSession: {
    discipline: string;
    accuracy: number;
    completedAt: string;
  } | null;
  activeSession: {
    sessionId: string;
    answeredQuestions: number;
    totalQuestions: number;
  } | null;
};

const DEFAULT_LIMIT = 5;
const SECONDARY_SIGNAL_LIMIT = 2;
const LEGACY_SESSION_DELIMITER = '||zb-session||';
const LEGACY_ATTEMPT_DELIMITER = '||zb-attempt||';
const STUDY_SESSION_SELECT_LEGACY = 'id, user_id, date, minutes, points, subject, duration, goal_met, timestamp, created_at';

type StudySessionContractMode = 'sprint2' | 'legacy';

type LegacySessionMeta = {
  topicName: string;
  questionIds: string[];
  reason: string;
};

type LegacyAttemptMeta = {
  sessionId: string;
  questionId: string;
};

let studySessionContractModePromise: Promise<StudySessionContractMode> | null = null;

const assertAdminSupabase = () => {
  if (!adminSupabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  return adminSupabase;
};

const encodeJsonToken = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const decodeJsonToken = <T,>(value?: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
};

const encodeLegacySessionSubject = (subject: string, meta: LegacySessionMeta): string =>
  `${subject}${LEGACY_SESSION_DELIMITER}${encodeJsonToken(meta)}`;

const parseLegacySessionSubject = (rawSubject?: string | null): {
  displaySubject: string;
  meta: LegacySessionMeta | null;
} => {
  const raw = String(rawSubject || '');
  const delimiterIndex = raw.indexOf(LEGACY_SESSION_DELIMITER);

  if (delimiterIndex === -1) {
    return {
      displaySubject: raw,
      meta: null,
    };
  }

  return {
    displaySubject: raw.slice(0, delimiterIndex),
    meta: decodeJsonToken<LegacySessionMeta>(raw.slice(delimiterIndex + LEGACY_SESSION_DELIMITER.length)),
  };
};

const encodeLegacyAttemptTopic = (topic: string, meta: LegacyAttemptMeta): string =>
  `${topic}${LEGACY_ATTEMPT_DELIMITER}${encodeJsonToken(meta)}`;

const parseLegacyAttemptTopic = (rawTopic?: string | null): {
  displayTopic: string;
  meta: LegacyAttemptMeta | null;
} => {
  const raw = String(rawTopic || '');
  const delimiterIndex = raw.indexOf(LEGACY_ATTEMPT_DELIMITER);

  if (delimiterIndex === -1) {
    return {
      displayTopic: raw,
      meta: null,
    };
  }

  return {
    displayTopic: raw.slice(0, delimiterIndex),
    meta: decodeJsonToken<LegacyAttemptMeta>(raw.slice(delimiterIndex + LEGACY_ATTEMPT_DELIMITER.length)),
  };
};

const getStudySessionContractMode = async (): Promise<StudySessionContractMode> => {
  if (!studySessionContractModePromise) {
    studySessionContractModePromise = (async () => {
      const client = assertAdminSupabase();
      const { error } = await client
        .from('study_sessions')
        .select('id, status, total_questions, correct_answers, finished_at, updated_at')
        .limit(1);

      if (!error) {
        return 'sprint2';
      }

      const message = error.message.toLowerCase();
      if (
        message.includes('study_sessions.status')
        || message.includes('study_sessions.total_questions')
        || message.includes('study_sessions.correct_answers')
        || message.includes('study_sessions.finished_at')
        || message.includes('study_sessions.updated_at')
      ) {
        return 'legacy';
      }

      throw new Error(`Falha ao detectar contrato de study_sessions: ${error.message}`);
    })();
  }

  return studySessionContractModePromise;
};

const normalizeStudySessionRow = (
  row: Record<string, any>,
  contractMode: StudySessionContractMode,
): StudySessionRow => {
  if (contractMode === 'sprint2') {
    return row as StudySessionRow;
  }

  const legacySession = parseLegacySessionSubject(row.subject);

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    date: String(row.date),
    minutes: Number(row.minutes || 0),
    points: Number(row.points || 0),
    subject: String(row.subject || ''),
    duration: Number(row.duration || 0),
    goal_met: row.goal_met === null ? null : Boolean(row.goal_met),
    timestamp: row.timestamp ? String(row.timestamp) : null,
    created_at: String(row.created_at),
    status: row.goal_met ? 'finished' : 'active',
    total_questions: legacySession.meta?.questionIds.length || null,
    correct_answers: null,
    finished_at: row.goal_met ? String(row.date || row.timestamp || row.created_at || '') : null,
    updated_at: row.timestamp ? String(row.timestamp) : String(row.created_at || ''),
  };
};

const firstRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const toDifficulty = (level: string): 'easy' | 'medium' | 'hard' => {
  if (level === 'facil') return 'easy';
  if (level === 'dificil') return 'hard';
  return 'medium';
};

const shuffle = <T,>(input: T[]): T[] => {
  const copy = [...input];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const getSessionDateKey = (rawDate?: string | null): string =>
  String(rawDate || '').slice(0, 10);

const getRecommendationContext = async (userId: string): Promise<RecommendationContext> => {
  const recommendation = await ensureRecommendationForUser(userId);
  if (!recommendation) {
    throw new Error('Nao foi possivel gerar a recomendacao inicial da sessao.');
  }

  return {
    subject: recommendation.subject,
    topic: recommendation.topic,
    disciplineSlug: recommendation.disciplineSlug,
    disciplineName: recommendation.disciplineName,
    topicSlug: recommendation.topicSlug,
    topicName: recommendation.topicName,
    reason: recommendation.reason,
  };
};

const mapQuestionRow = (
  row: QuestionRow,
  fallbackContext?: Pick<RecommendationContext, 'subject' | 'topicName'>,
): StudySessionQuestion | null => {
  const options = Array.isArray(row.alternativas)
    ? [...row.alternativas].sort((left, right) => left.letra.localeCompare(right.letra))
    : [];
  const correctOptions = options.filter((option) => option.correta);
  const topicRelation = firstRelation(row.topicos);
  const disciplineRelation = firstRelation(topicRelation?.disciplinas);

  if (options.length < 4 || correctOptions.length !== 1) {
    return null;
  }

  return {
    id: row.id,
    prompt: row.enunciado,
    difficulty: row.nivel,
    explanation: row.explicacao,
    subject: disciplineRelation?.nome || fallbackContext?.subject || 'Matematica',
    topic: topicRelation?.nome || row.assunto || fallbackContext?.topicName || 'Porcentagem',
    options: options.map((option) => ({
      id: option.id,
      letter: option.letra,
      text: option.texto,
    })),
  };
};

const getQuestionRowsByIds = async (questionIds: string[]): Promise<QuestionRow[]> => {
  if (questionIds.length === 0) {
    return [];
  }

  const client = assertAdminSupabase();
  const { data, error } = await client
    .from('questoes')
    .select('id, enunciado, nivel, explicacao, assunto, topicos(nome, disciplinas(nome)), alternativas(id, letra, texto, correta)')
    .in('id', questionIds);

  if (error) {
    throw new Error(`Falha ao carregar questoes da sessao: ${error.message}`);
  }

  const byId = new Map((data || []).map((row: any) => [row.id, row as QuestionRow]));
  return questionIds
    .map((questionId) => byId.get(questionId))
    .filter((row): row is QuestionRow => Boolean(row));
};

const getCandidateQuestionRows = async (
  recommendation: RecommendationContext,
  limit: number,
): Promise<QuestionRow[]> => {
  const client = assertAdminSupabase();
  const columns = 'id, enunciado, nivel, explicacao, assunto, topicos(nome, disciplinas(nome)), alternativas(id, letra, texto, correta)';

  const targeted = await client
    .from('questoes')
    .select(columns)
    .eq('ativo', true)
    .eq('assunto', recommendation.topicName)
    .limit(Math.max(limit * 3, 20));

  if (targeted.error) {
    throw new Error(`Falha ao buscar questoes recomendadas: ${targeted.error.message}`);
  }

  const fallback = await client
    .from('questoes')
    .select(columns)
    .eq('ativo', true)
    .limit(30);

  if (fallback.error) {
    throw new Error(`Falha ao buscar questoes fallback: ${fallback.error.message}`);
  }

  const merged = [...(targeted.data || []), ...(fallback.data || [])];
  const seen = new Set<string>();

  return merged.filter((row: any) => {
    const id = String(row.id || '');
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  }) as QuestionRow[];
};

const buildSecondaryRecommendations = (
  profile: any | null,
  primaryRecommendation: RecommendationContext,
): RecommendationContext[] => {
  const weakestDisciplines = Array.isArray(profile?.weakest_disciplines)
    ? profile.weakest_disciplines
    : [];

  return weakestDisciplines
    .map((entry: unknown) => getRecommendationMeta(String(entry || ''), null))
    .filter((
      entry: ReturnType<typeof getRecommendationMeta>,
      index: number,
      all: Array<ReturnType<typeof getRecommendationMeta>>,
    ) =>
      entry.disciplineSlug !== primaryRecommendation.disciplineSlug
      && all.findIndex((candidate) => candidate.disciplineSlug === entry.disciplineSlug) === index)
    .slice(0, 1)
    .map((entry: ReturnType<typeof getRecommendationMeta>) => ({
      subject: entry.subject,
      topic: entry.topic,
      disciplineSlug: entry.disciplineSlug,
      disciplineName: entry.disciplineName,
      topicSlug: entry.topicSlug,
      topicName: entry.topicName,
      reason: `Bloco de sinal em ${entry.disciplineName}.`,
    }));
};

const pickQuestionsForRecommendation = async (
  recommendation: RecommendationContext,
  limit: number,
  excludedIds = new Set<string>(),
): Promise<StudySessionQuestion[]> => {
  if (limit <= 0) {
    return [];
  }

  const candidateRows = await getCandidateQuestionRows(recommendation, limit);
  const validQuestions = candidateRows
    .map((questionRow) => mapQuestionRow(questionRow, recommendation))
    .filter((question): question is StudySessionQuestion => Boolean(question))
    .filter((question) => !excludedIds.has(question.id));

  return shuffle(validQuestions).slice(0, limit);
};

const selectSessionQuestions = async (
  userId: string,
  recommendation: RecommendationContext,
  limit: number,
): Promise<StudySessionQuestion[]> => {
  const profile = await getUserProfile(userId);
  const secondaryRecommendations = buildSecondaryRecommendations(profile, recommendation);
  const selectedQuestions: StudySessionQuestion[] = [];
  const selectedIds = new Set<string>();
  const primaryLimit = secondaryRecommendations.length > 0 && limit > SECONDARY_SIGNAL_LIMIT
    ? limit - SECONDARY_SIGNAL_LIMIT
    : limit;
  const primaryQuestions = await pickQuestionsForRecommendation(recommendation, primaryLimit, selectedIds);

  for (const question of primaryQuestions) {
    selectedQuestions.push(question);
    selectedIds.add(question.id);
  }

  for (const secondaryRecommendation of secondaryRecommendations) {
    const remaining = limit - selectedQuestions.length;
    const secondaryLimit = Math.min(SECONDARY_SIGNAL_LIMIT, remaining);
    const secondaryQuestions = await pickQuestionsForRecommendation(secondaryRecommendation, secondaryLimit, selectedIds);

    for (const question of secondaryQuestions) {
      selectedQuestions.push(question);
      selectedIds.add(question.id);
    }
  }

  if (selectedQuestions.length < limit) {
    const fillQuestions = await pickQuestionsForRecommendation(
      recommendation,
      limit - selectedQuestions.length,
      selectedIds,
    );

    for (const question of fillQuestions) {
      selectedQuestions.push(question);
      selectedIds.add(question.id);
    }
  }

  if (selectedQuestions.length < limit) {
    throw new Error('Nao ha questoes suficientes para montar a sessao curta.');
  }

  return shuffle(selectedQuestions).slice(0, limit);
};

const getStudySessionRow = async (userId: string, sessionId: string): Promise<StudySessionRow | null> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();
  const { data, error } = await client
    .from('study_sessions')
    .select(contractMode === 'sprint2' ? '*' : STUDY_SESSION_SELECT_LEGACY)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar sessao oficial: ${error.message}`);
  }

  return data ? normalizeStudySessionRow(data as Record<string, any>, contractMode) : null;
};

const getLatestActiveStudySessionRow = async (userId: string): Promise<StudySessionRow | null> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();
  const query = client
    .from('study_sessions')
    .select(contractMode === 'sprint2' ? '*' : STUDY_SESSION_SELECT_LEGACY)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data, error } = contractMode === 'sprint2'
    ? await query.eq('status', 'active').maybeSingle()
    : await query.eq('goal_met', false).maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar sessao ativa: ${error.message}`);
  }

  return data ? normalizeStudySessionRow(data as Record<string, any>, contractMode) : null;
};

const getSessionQuestionLinks = async (session: Pick<StudySessionRow, 'id' | 'subject'>): Promise<SessionQuestionRow[]> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();

  if (contractMode === 'legacy') {
    const legacySession = parseLegacySessionSubject(session.subject);
    return (legacySession.meta?.questionIds || []).map((questionId, index) => ({
      session_id: session.id,
      question_id: questionId,
      position: index + 1,
    }));
  }

  const { data, error } = await client
    .from('session_questions')
    .select('session_id, question_id, position')
    .eq('session_id', session.id)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar session_questions: ${error.message}`);
  }

  return (data || []) as SessionQuestionRow[];
};

const getSessionAttemptRows = async (userId: string, sessionId: string): Promise<QuestionAttemptRow[]> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();

  if (contractMode === 'legacy') {
    const { data, error } = await client
      .from('question_attempts')
      .select('topic, correct, response_time_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      throw new Error(`Falha ao carregar question_attempts: ${error.message}`);
    }

    return (data || [])
      .map((row: any) => {
        const parsedTopic = parseLegacyAttemptTopic(row.topic);
        return {
          session_id: parsedTopic.meta?.sessionId || '',
          question_id: parsedTopic.meta?.questionId || '',
          correct: Boolean(row.correct),
          response_time_seconds: Number(row.response_time_seconds || 0),
          created_at: String(row.created_at || ''),
        } satisfies QuestionAttemptRow;
      })
      .filter((row) => row.session_id === sessionId && Boolean(row.question_id));
  }

  const { data, error } = await client
    .from('question_attempts')
    .select('session_id, question_id, correct, response_time_seconds, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar question_attempts: ${error.message}`);
  }

  return (data || []) as QuestionAttemptRow[];
};

const getSessionTopicName = (questions: StudySessionQuestion[]): string =>
  questions[0]?.topic || 'Porcentagem';

const buildAnswerMap = (attempts: QuestionAttemptRow[]): Record<string, StoredSessionAnswer> =>
  attempts.reduce<Record<string, StoredSessionAnswer>>((accumulator, attempt) => {
    accumulator[attempt.question_id] = {
      alternativeId: '',
      letter: '',
      isCorrect: Boolean(attempt.correct),
      answeredAt: attempt.created_at,
      responseTimeSeconds: Number(attempt.response_time_seconds || 0),
    };
    return accumulator;
  }, {});

const sumResponseTime = (attempts: QuestionAttemptRow[]): number =>
  attempts.reduce((sum, attempt) => sum + Math.max(1, Number(attempt.response_time_seconds || 0)), 0);

const countCorrectAnswers = (attempts: QuestionAttemptRow[]): number =>
  attempts.filter((attempt) => attempt.correct).length;

const serializeStudySession = async (row: StudySessionRow): Promise<StudySessionView> => {
  const legacySession = parseLegacySessionSubject(row.subject);
  const [questionLinks, attempts] = await Promise.all([
    getSessionQuestionLinks(row),
    getSessionAttemptRows(row.user_id, row.id),
  ]);
  const questionIds = questionLinks.map((entry) => entry.question_id);
  const questionRows = await getQuestionRowsByIds(questionIds);
  const questionsById = new Map(
    questionRows
      .map((entry) => [entry.id, mapQuestionRow(entry)] as const)
      .filter((entry): entry is readonly [string, StudySessionQuestion] => Boolean(entry[1])),
  );
  const orderedQuestions = questionLinks
    .map((entry) => questionsById.get(entry.question_id))
    .filter((entry): entry is StudySessionQuestion => Boolean(entry));
  const answers = buildAnswerMap(attempts);
  const totalQuestions = Number(row.total_questions || legacySession.meta?.questionIds.length || questionLinks.length || orderedQuestions.length);
  const correctAnswers = Number(row.correct_answers ?? countCorrectAnswers(attempts));
  const answeredQuestions = Object.keys(answers).length;
  const durationSeconds = Math.max(0, Number(row.duration || sumResponseTime(attempts)));
  const topicName = legacySession.meta?.topicName || getSessionTopicName(orderedQuestions);
  const recommendation = row.status === 'active' && !legacySession.meta?.reason
    ? await getRecommendationContext(row.user_id)
    : null;

  return {
    sessionId: row.id,
    status: row.status === 'finished' ? 'completed' : 'active',
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    subject: legacySession.displaySubject || row.subject || recommendation?.subject || 'Matematica',
    topic: topicName,
    reason: legacySession.meta?.reason || recommendation?.reason || `Sessao curta de ${topicName} pronta para consolidar seu progresso.`,
    startedAt: row.timestamp || row.date || row.created_at,
    finishedAt: row.finished_at || (row.status === 'finished' ? row.date : null),
    durationSeconds,
    questions: orderedQuestions,
    answers,
    result: row.status === 'finished'
      ? {
        total: totalQuestions,
        correct: correctAnswers,
        accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
      }
      : null,
  };
};

const getCompletedSessionDateKeys = (rows: StudySessionRow[]): string[] =>
  rows
    .map((row) => getSessionDateKey(row.finished_at || row.date))
    .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index)
    .sort((left, right) => right.localeCompare(left));

const computeStreakDays = (rows: StudySessionRow[]): number => {
  const uniqueDates = getCompletedSessionDateKeys(rows);
  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(`${uniqueDates[0]}T12:00:00Z`);

  for (const dateKey of uniqueDates) {
    const current = new Date(`${dateKey}T12:00:00Z`);
    if (current.getTime() !== cursor.getTime()) {
      break;
    }

    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
};

const upsertDailyProgress = async (
  userId: string,
  questionsAnswered: number,
  correctAnswers: number,
  finishedAt: string,
): Promise<void> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();

  if (contractMode === 'legacy') {
    return;
  }

  const dateKey = getSessionDateKey(finishedAt);

  const { data, error } = await client
    .from('user_daily_progress')
    .select('id, questions_answered, correct_answers')
    .eq('user_id', userId)
    .eq('date', dateKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar user_daily_progress: ${error.message}`);
  }

  if (!data) {
    const { error: insertError } = await client
      .from('user_daily_progress')
      .insert({
        user_id: userId,
        date: dateKey,
        questions_answered: questionsAnswered,
        correct_answers: correctAnswers,
        updated_at: finishedAt,
      });

    if (insertError) {
      throw new Error(`Falha ao inserir user_daily_progress: ${insertError.message}`);
    }

    return;
  }

  const { error: updateError } = await client
    .from('user_daily_progress')
    .update({
      questions_answered: Number(data.questions_answered || 0) + questionsAnswered,
      correct_answers: Number(data.correct_answers || 0) + correctAnswers,
      updated_at: finishedAt,
    })
    .eq('id', data.id);

  if (updateError) {
    throw new Error(`Falha ao atualizar user_daily_progress: ${updateError.message}`);
  }
};

export const createOrResumeStudySession = async (
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<StudySessionView> => {
  const contractMode = await getStudySessionContractMode();
  const activeSession = await getLatestActiveStudySessionRow(userId);

  if (activeSession) {
    const linkedQuestions = await getSessionQuestionLinks(activeSession);

    if (linkedQuestions.length > 0) {
      return serializeStudySession(activeSession);
    }

    const client = assertAdminSupabase();
    await client
      .from('study_sessions')
      .delete()
      .eq('id', activeSession.id)
      .eq('user_id', userId);
  }

  const recommendation = await getRecommendationContext(userId);
  const questions = await selectSessionQuestions(userId, recommendation, limit);
  const client = assertAdminSupabase();
  const now = new Date().toISOString();

  const basePayload = {
    user_id: userId,
    date: now,
    minutes: 0,
    points: 0,
    duration: 0,
    goal_met: false,
    timestamp: now,
  };

  const { data, error } = contractMode === 'sprint2'
    ? await client
      .from('study_sessions')
      .insert({
        ...basePayload,
        subject: recommendation.disciplineName,
        status: 'active',
        total_questions: questions.length,
        correct_answers: 0,
        updated_at: now,
      })
      .select('*')
      .single()
    : await client
      .from('study_sessions')
      .insert({
        ...basePayload,
        subject: encodeLegacySessionSubject(recommendation.disciplineName, {
          topicName: getSessionTopicName(questions),
          questionIds: questions.map((question) => question.id),
          reason: recommendation.reason,
        }),
      })
      .select(STUDY_SESSION_SELECT_LEGACY)
      .single();

  if (error || !data) {
    throw new Error(`Falha ao criar study_sessions: ${error?.message || 'sessao nao criada'}`);
  }

  const sessionRow = normalizeStudySessionRow(data as Record<string, any>, contractMode);

  if (contractMode === 'legacy') {
    return serializeStudySession(sessionRow);
  }

  const sessionQuestionsPayload = questions.map((question, index) => ({
    session_id: sessionRow.id,
    question_id: question.id,
    position: index + 1,
  }));

  const { error: sessionQuestionsError } = await client
    .from('session_questions')
    .insert(sessionQuestionsPayload);

  if (sessionQuestionsError) {
    await client.from('study_sessions').delete().eq('id', sessionRow.id);
    throw new Error(`Falha ao congelar session_questions: ${sessionQuestionsError.message}`);
  }

  return serializeStudySession(sessionRow);
};

export const getStudySession = async (userId: string, sessionId: string): Promise<StudySessionView | null> => {
  const row = await getStudySessionRow(userId, sessionId);
  if (!row) {
    return null;
  }

  return serializeStudySession(row);
};

export const submitStudySessionAnswer = async (
  userId: string,
  sessionId: string,
  input: {
    questionId: string;
    alternativeId: string;
    responseTimeSeconds?: number;
  },
): Promise<StudySessionView> => {
  const row = await getStudySessionRow(userId, sessionId);
  if (!row) {
    throw new Error('Sessao nao encontrada.');
  }

  if (row.status !== 'active') {
    throw new Error('Sessao ja finalizada.');
  }

  const questionLinks = await getSessionQuestionLinks(row);
  if (!questionLinks.some((entry) => entry.question_id === input.questionId)) {
    throw new Error('Questao nao pertence a esta sessao.');
  }

  const existingAttempts = await getSessionAttemptRows(userId, sessionId);
  if (existingAttempts.some((attempt) => attempt.question_id === input.questionId)) {
    throw new Error('Questao ja respondida nesta sessao.');
  }

  const questionRows = await getQuestionRowsByIds([input.questionId]);
  const rawQuestion = questionRows[0];
  const question = rawQuestion ? mapQuestionRow(rawQuestion) : null;

  if (!question || !rawQuestion) {
    throw new Error('Questao da sessao nao encontrada.');
  }

  const selectedOption = question.options.find((option) => option.id === input.alternativeId);
  if (!selectedOption) {
    throw new Error('Alternativa invalida para a questao informada.');
  }

  const correctOption = rawQuestion.alternativas.find((option) => option.correta);
  if (!correctOption) {
    throw new Error('Questao sem alternativa correta configurada.');
  }

  const responseTimeSeconds = Math.max(1, Math.round(Number(input.responseTimeSeconds || 30)));
  const isCorrect = correctOption.id === input.alternativeId;
  const answeredAt = new Date().toISOString();
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();
  const legacySession = parseLegacySessionSubject(row.subject);
  const displaySubject = legacySession.displaySubject || row.subject || question.subject;
  const attemptSubject = question.subject || displaySubject;

  const { error: attemptError } = contractMode === 'sprint2'
    ? await client
      .from('question_attempts')
      .insert({
        user_id: userId,
        session_id: sessionId,
        question_id: question.id,
        subject: attemptSubject,
        topic: question.topic,
        difficulty: toDifficulty(question.difficulty),
        correct: isCorrect,
        response_time_seconds: responseTimeSeconds,
        created_at: answeredAt,
      })
    : await client
      .from('question_attempts')
      .insert({
        user_id: userId,
        subject: attemptSubject,
        topic: encodeLegacyAttemptTopic(question.topic, {
          sessionId,
          questionId: question.id,
        }),
        difficulty: toDifficulty(question.difficulty),
        correct: isCorrect,
        response_time_seconds: responseTimeSeconds,
        created_at: answeredAt,
      });

  if (attemptError) {
    if (attemptError.message.toLowerCase().includes('duplicate') || attemptError.code === '23505') {
      throw new Error('Questao ja respondida nesta sessao.');
    }

    throw new Error(`Falha ao registrar question_attempts: ${attemptError.message}`);
  }

  const refreshedAttempts = await getSessionAttemptRows(userId, sessionId);
  const correctAnswers = countCorrectAnswers(refreshedAttempts);
  const durationSeconds = sumResponseTime(refreshedAttempts);
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));

  const updateQuery = client
    .from('study_sessions')
    .update(
      contractMode === 'sprint2'
        ? {
          correct_answers: correctAnswers,
          duration: durationSeconds,
          minutes,
          updated_at: answeredAt,
        }
        : {
          duration: durationSeconds,
          minutes,
        },
    )
    .eq('id', sessionId)
    .eq('user_id', userId);

  const { error: updateError } = contractMode === 'sprint2'
    ? await updateQuery.eq('status', 'active')
    : await updateQuery.eq('goal_met', false);

  if (updateError) {
    throw new Error(`Falha ao atualizar study_sessions: ${updateError.message}`);
  }

  const refreshedRow = await getStudySessionRow(userId, sessionId);
  if (!refreshedRow) {
    throw new Error('Sessao nao encontrada.');
  }

  return serializeStudySession(refreshedRow);
};

export const finishStudySession = async (
  userId: string,
  sessionId: string,
): Promise<StudySessionResult> => {
  const row = await getStudySessionRow(userId, sessionId);
  if (!row) {
    throw new Error('Sessao nao encontrada.');
  }

  if (row.status !== 'active') {
    throw new Error('Sessao ja finalizada.');
  }

  const [questionLinks, attempts] = await Promise.all([
    getSessionQuestionLinks(row),
    getSessionAttemptRows(userId, sessionId),
  ]);
  const total = questionLinks.length;
  const answeredCount = attempts.length;

  if (answeredCount < total) {
    throw new Error('Responda todas as questoes antes de finalizar.');
  }

  const correct = countCorrectAnswers(attempts);
  const accuracy = total > 0 ? correct / total : 0;
  const durationSeconds = sumResponseTime(attempts);
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const finishedAt = new Date().toISOString();
  const xpEarned = correct * 10;
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();

  const finishQuery = client
    .from('study_sessions')
    .update(
      contractMode === 'sprint2'
        ? {
          status: 'finished',
          correct_answers: correct,
          finished_at: finishedAt,
          updated_at: finishedAt,
          points: xpEarned,
          minutes,
          duration: durationSeconds,
          goal_met: true,
        }
        : {
          date: finishedAt,
          points: xpEarned,
          minutes,
          duration: durationSeconds,
          goal_met: true,
        },
    )
    .eq('id', sessionId)
    .eq('user_id', userId);

  const { data: updatedRows, error: finishError } = contractMode === 'sprint2'
    ? await finishQuery.eq('status', 'active').select('*')
    : await finishQuery.eq('goal_met', false).select(STUDY_SESSION_SELECT_LEGACY);

  if (finishError) {
    throw new Error(`Falha ao finalizar study_sessions: ${finishError.message}`);
  }

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Sessao ja finalizada.');
  }

  await upsertDailyProgress(userId, total, correct, finishedAt);
  await refreshRecommendationFromRecentAttempts(userId, sessionId);

  return {
    sessionId,
    total,
    correct,
    accuracy,
    durationSeconds,
  };
};

export const getHomeStudySummary = async (userId: string): Promise<HomeStudySummary> => {
  const client = assertAdminSupabase();
  const contractMode = await getStudySessionContractMode();
  const { data, error } = await client
    .from('study_sessions')
    .select(contractMode === 'sprint2'
      ? 'id, user_id, date, minutes, points, subject, duration, goal_met, timestamp, created_at, status, total_questions, correct_answers, finished_at, updated_at'
      : STUDY_SESSION_SELECT_LEGACY)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Falha ao buscar resumo da home: ${error.message}`);
  }

  const rows = (data || []).map((row: any) => normalizeStudySessionRow(row, contractMode));
  const completed = rows.filter((entry) => entry.status === 'finished');
  const active = rows.find((entry) => entry.status === 'active') || null;
  const now = new Date();
  const rollingWindowStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const weeklyCompleted = completed.filter((entry) => new Date(entry.finished_at || entry.date) >= rollingWindowStart);
  const totalXp = completed.reduce((sum, entry) => sum + Math.max(0, Number(entry.points || 0)), 0);
  const studyMinutes = weeklyCompleted.reduce((sum, entry) => sum + Math.max(0, Number(entry.minutes || 0)), 0);

  let activeSummary: HomeStudySummary['activeSession'] = null;

  if (active) {
    const activeMeta = parseLegacySessionSubject(active.subject);
    const attempts = await getSessionAttemptRows(userId, active.id);
    activeSummary = {
      sessionId: active.id,
      answeredQuestions: attempts.length,
      totalQuestions: Number(active.total_questions || activeMeta.meta?.questionIds.length || 0),
    };
  }

  const latestCompleted = completed[0] || null;
  const latestCompletedMeta = latestCompleted ? parseLegacySessionSubject(latestCompleted.subject) : null;
  const latestCompletedAttempts = latestCompleted
    ? await getSessionAttemptRows(userId, latestCompleted.id)
    : [];
  const latestCompletedCorrect = latestCompleted
    ? Number(latestCompleted.correct_answers ?? countCorrectAnswers(latestCompletedAttempts))
    : 0;
  const latestCompletedTotal = latestCompleted
    ? Number(latestCompleted.total_questions || latestCompletedMeta?.meta?.questionIds.length || latestCompletedAttempts.length)
    : 0;

  return {
    sessionsCompleted: weeklyCompleted.length,
    studyMinutes,
    totalXp,
    streakDays: computeStreakDays(completed),
    lastSession: latestCompleted
      ? {
        discipline: latestCompletedMeta?.displaySubject || latestCompleted.subject || 'Matematica',
        accuracy: latestCompletedTotal > 0
          ? latestCompletedCorrect / latestCompletedTotal
          : 0,
        completedAt: latestCompleted.finished_at || latestCompleted.updated_at || latestCompleted.date,
      }
      : null,
    activeSession: activeSummary,
  };
};
