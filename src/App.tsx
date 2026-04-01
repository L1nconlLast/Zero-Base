import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Home, GraduationCap, Brain, Clock3, BarChart3, Trophy, Settings, Database, Info, Heart, CalendarDays, HelpCircle, Layers, BookOpen, Zap, Users, GitBranch, Cloud, AlertTriangle, CheckCircle2, Flame, Puzzle, Scale, Sprout, Target, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { NotificationSetup } from './components/NotificationSetup';

// static theme definitions (won't change per render)
const THEME_PALETTES: { [key: string]: { primary: string; secondary: string } } = {
  blue: { primary: '#3b82f6', secondary: '#8b5cf6' },
  green: { primary: '#10b981', secondary: '#059669' },
  purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
  pink: { primary: '#ec4899', secondary: '#db2777' },
  orange: { primary: '#f97316', secondary: '#ea580c' },
  red: { primary: '#ef4444', secondary: '#dc2626' },
  teal: { primary: '#14b8a6', secondary: '#0d9488' },
  indigo: { primary: '#6366f1', secondary: '#4f46e5' },
};
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Components
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { AppSidebar, type AppSidebarNavSection } from './components/Layout/AppSidebar';
import { AppTopbar } from './components/Layout/AppTopbar';
import { PomodoroTimer } from './components/Timer/PomodoroTimer';
import { ModeSelector } from './components/Timer/ModeSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { BeginnerSessionResult } from './components/Beginner/BeginnerSessionResult';
import { BeginnerWeekSummaryModal } from './components/Beginner/BeginnerWeekSummary';
import { ConfirmModal } from './components/UI/ConfirmModal';
import { DevPhaseSwitcher } from './components/UI/DevPhaseSwitcher';
import { StudyExecutionBanner } from './components/Study/StudyExecutionBanner';
import { ProfileAdminSnapshotCard } from './components/profile/ProfileAdminSnapshotCard';
import { StudySessionPage as OfficialStudySessionPage } from './components/Mvp/StudySessionPage';
import { StudySessionResult as OfficialStudySessionResultView } from './components/Mvp/StudySessionResult';
import { FocusWorkspacePage } from './components/Focus/FocusWorkspacePage';
import { HomeWorkspacePage, type HomeContinuationMission } from './components/Home/HomeWorkspacePage';
import {
  createHomeCompletionSignal,
  isHomeCompletionSignalActive,
  type HomeCompletionSignal,
} from './components/Home/homeTodayCompletionSignal';
import type { HomeTrackContext } from './components/Home/homeTodayPresentation';
import type { PlanoTrackContext } from './features/plano/planoTrackPresentation';
import type { ProfileTrackContext } from './features/profile/types';
import { ResumeMissionPage } from './components/Home/ResumeMissionPage';
import { PlanningWorkspacePage } from './components/Planning/PlanningWorkspacePage';
import { UnifiedAdjustmentsCombinedPanel } from './components/UnifiedStudy/UnifiedAdjustmentsCombinedPanel';
import { UnifiedAdjustmentsWorkspacePage } from './components/UnifiedStudy/UnifiedAdjustmentsWorkspacePage';
import { UnifiedMethodSummaryCard } from './components/UnifiedStudy/UnifiedMethodSummaryCard';
import { UnifiedPlanControlsCard } from './components/UnifiedStudy/UnifiedPlanControlsCard';

// Constants
import { INITIAL_USER_DATA, STORAGE_KEYS } from './constants';

// Hooks
import { useAuth } from './hooks/useAuth';
import type { ProductPhase, ProductPhaseOverride } from './hooks/useEffectivePhase';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAchievements } from './hooks/useAchievements';
import { useStudyMode } from './hooks/useStudyMode';
import { sessionService } from './services/session.service';
import { isSupabaseConfigured, supabase } from './services/supabase.client';
import { saasPlanningService } from './services/saasPlanning.service';
import { studyPreferencesService } from './services/studyPreferences.service';
import { profilePreferencesService } from './services/profilePreferences.service';
import { userProfileService } from './services/userProfile.service';
import { xpEngineService } from './services/xpEngine.service';
import { offlineSyncService } from './services/offlineSync.service';
import { pushApiService } from './services/pushApi.service';
import { weeklyStreakService } from './services/weeklyStreak.service';
import { beginnerFlowService } from './services/beginnerFlow.service';
import { beginnerProgressService } from './services/beginnerProgress.service';
import {
  isStudyLoopEmptyStateError,
  studyLoopApiService,
  studyLoopSessionsService,
  type OfficialStudySession,
  type OfficialStudySessionResult,
  type StudyLoopHomePayload,
  type StudyLoopRecommendation,
} from './services/studyLoopApi.service';
import {
  getStudyScheduleStorageKey,
  chooseNextScheduledStudyFocus,
  buildStudyContextForToday,
  createDefaultWeeklyStudySchedule,
  getNextStudyCopy,
  getNextStudySuggestion,
  getPaceCopy,
  getWeekdayFromDate,
  getRecentPaceState,
  persistScheduleEntriesSnapshot,
  readPersistedScheduleEntries,
  STUDY_SCHEDULE_UPDATED_EVENT,
  studyScheduleService,
  getWeeklyPlanConfidenceState,
  getWeeklyPlannedSessions,
  getPlannedSubjectsCount,
  sanitizeWeeklyStudySchedule,
} from './services/studySchedule.service';
import type {
  FinalizeStudySessionAdapterResult,
  FinishPayload,
} from './features/estudos';
import {
  queueStudyReviewEntry,
} from './features/estudos/finishFlow';
import {
  buildHomeReviewQueueState,
  submitReviewDecision,
  type SubmitReviewDecisionInput,
} from './features/review';
import {
  buildWeeklySessionProgress,
  mapReasonSummaryToCopy,
  type UserFacingWeeklyProgress,
} from './services/prioritizationReason';
import { STUDY_METHODS, getStudyMethodById } from './data/studyMethods';
import type { SmartScheduleProfile } from './utils/smartScheduleEngine';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
} from './utils/uiLabels';

// Types & Utils
import type {
  AcademySubDepartment,
  BeginnerPlan,
  BeginnerProgressStage,
  BeginnerState,
  BeginnerStats,
  PersistedStudySession,
  BeginnerWeekSummary,
  StudySession,
  StudyContextForToday,
  StudyExecutionState,
  ScheduleEntry,
  Weekday,
  WeeklyStudySchedule,
} from './types';
import { UserData, MateriaTipo } from './types';
import { getDayOfWeek } from './utils/helpers';
import { analytics, trackEvent } from './utils/analytics';
import { buildWeeklyRetentionSnapshot } from './utils/weeklyRetention';
import {
  getSuggestedContentPathBySubjectLabel,
  getSuggestedNextTopicAligned,
  getSuggestedTopicCopy,
} from './utils/contentTree';
import { getCycleDisciplineLabels, getCycleSubjectByDisplayLabel } from './utils/disciplineLabels';
import { getStableHeroVariant, type HeroVariant } from './lib/ab';
import {
  buildStudyContextInputFromOnboarding,
  getInitialRouteForMode,
  getTabsForMode,
  resolveDetectedProductPhase,
  resolveLegacyTrackFromStudyContextMode,
  resolveStudyContextRoute,
  shouldUseLegacyBeginnerBootstrap,
  type StudyContextMode,
} from './features/studyContext';
import { AppShellResolver } from './features/studyContext/AppShellResolver';
import {
  canResolveNativeShellTab,
  getNativeShellDomains,
  getNativeShellHeroMeta,
  getNativeShellQuickAction,
  getNativeShellQuickStats,
  getNativeSidebarSections,
  isNativeStudyContextMode,
} from './features/studyContext/appShell';
import {
  useStudyContextController,
  type PersistStudyContextInput,
} from './features/studyContext/StudyContextProvider';
import type { UserStudyContextRecord } from './features/studyContext/types';

type StudyMode = 'pomodoro' | 'livre';
type StudyTrack = 'enem' | 'concursos' | 'hibrido';
type SidebarMode = 'compact' | 'expanded';
type QuizTrackFilter = 'enem' | 'concurso' | 'ambos';
type QuickSessionDuration = 15 | 25 | 30 | 50;
type CtaSource = 'hero_cta' | 'next_mission' | 'quick_15' | 'quick_25' | 'quick_50';
type CtrEntry = { impressions: number; clicks: number; ctr: number };
type CtrMetrics = Record<CtaSource, CtrEntry>;
type HeroAttribution = { variant: HeroVariant; clickedAt: number };
type HeroVariantMetricsEntry = {
  impressions: number;
  clicks: number;
  completions: number;
  ctr: number;
  completionRate: number;
  clickToCompletion: number;
};
type HeroAbMetrics = {
  hero_v1: HeroVariantMetricsEntry;
  hero_v2: HeroVariantMetricsEntry;
  upliftCtr: number;
  upliftCompletionRate: number;
  winnerByCtr: HeroVariant | 'tie';
  winnerByCompletionRate: HeroVariant | 'tie';
};
type BeginnerSessionUiResult = {
  completedMissionId: string;
  completedMissionLabel: string;
  nextMissionId?: string;
  nextMissionLabel?: string;
  totalQuestions?: number | null;
  correctAnswers?: number | null;
  xpGained: number;
  isFirstSession?: boolean;
};

type BeginnerAssessmentResult = {
  correctAnswers: number;
  totalQuestions: number;
  xpGained: number;
};

type OfficialStudyCompletionSnapshot = StudySession & {
  topic?: string;
  topicName?: string;
};

type OfficialStudyAssessmentSummary = {
  subject: string;
  correct: number;
  total: number;
};

type OfficialStudyResultMeta = {
  subject: string;
  topic: string;
  xpPoints: number;
  isFirstSession?: boolean;
  beginnerMissionId?: string | null;
  beginnerDayNumber?: number | null;
  nextMissionId?: string | null;
  totalQuestions?: number | null;
};

type NextSessionCommitState = {
  nextSessionScheduled: true;
  scheduledAt: string;
  source: 'beginner' | 'official';
  title: string;
  detail: string;
};

type OnboardingFocusType = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';

type OnboardingCompletionMeta = {
  focus: OnboardingFocusType;
  concurso: {
    id: string;
    nome: string;
    banca: string;
    area: string;
    examDate?: string | null;
    areaId?: string | null;
    experienceMode?: 'starting_now' | 'studied_before' | 'already_taking_exams' | null;
    experienceLevel?: 'iniciante' | 'intermediario' | 'avancado' | null;
    planningWithoutDate?: boolean;
  } | null;
  enem: {
    goalId: string | null;
    targetCollege: string | null;
    targetCourse: string | null;
    triedBefore?: 'sim' | 'nao' | null;
    profileLevel?: 'iniciante' | 'intermediario' | 'avancado' | null;
  } | null;
  hibrido?: {
    primaryFocus: 'enem' | 'concurso' | 'equilibrado';
    availableStudyTime: 'baixo' | 'medio' | 'alto';
    concursoExamDate: string | null;
  } | null;
  faculdade?: {
    institution: string | null;
    course: string | null;
    semester: string | null;
    focus: 'rotina' | 'provas' | 'trabalhos' | null;
  } | null;
  outros?: {
    goalTitle: string | null;
    focus: 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema' | null;
    deadline: string | null;
  } | null;
  contextSummary?: string | null;
  contextDescription?: string | null;
};

const STARTER_FOCUS_BY_CONTEXT: Record<'faculdade' | 'outros', string[]> = {
  faculdade: [
    'Ajustar a rotina',
    'Base da semana',
    'Bloco de provas',
    'Continuidade do curso',
    'Trabalho em andamento',
    'Revisao leve',
    'Fechamento do ciclo',
  ],
  outros: [
    'Primeiro passo',
    'Base do objetivo',
    'Pratica guiada',
    'Ritmo da semana',
    'Aplicacao real',
    'Revisao leve',
    'Fechamento do ciclo',
  ],
};

const STARTER_TOPIC_SETS = [
  ['mapa inicial', 'base ativa', 'primeiro bloco'],
  ['bloco principal', 'pontos-chave', 'continuidade'],
  ['pratica orientada', 'aplicacao guiada', 'fixacao'],
  ['bloco da semana', 'retomada', 'progresso'],
  ['ajuste fino', 'entrega principal', 'tema central'],
  ['erros da semana', 'revisao curta', 'reforco'],
  ['bloco misto', 'fechamento leve', 'consolidacao'],
] as const;

const mapPreferredTrackToOnboardingFocus = (track: StudyTrack): OnboardingFocusType =>
  track === 'concursos' ? 'concurso' : track === 'hibrido' ? 'hibrido' : 'enem';

const resolveProfileExamGoalFromOnboarding = (meta?: OnboardingCompletionMeta): string => {
  if (!meta) return 'Plano ativo';

  if (meta.focus === 'concurso') {
    return meta.concurso?.nome || meta.contextSummary || 'Concurso';
  }

  if (meta.focus === 'hibrido') {
    return meta.contextSummary || 'Plano hibrido';
  }

  if (meta.focus === 'enem') {
    return meta.contextSummary || 'ENEM';
  }

  return meta.contextSummary || 'Plano ativo';
};

const buildOnboardingMetaFromStudyContext = (
  context: UserStudyContextRecord,
): OnboardingCompletionMeta => ({
  focus: context.mode as OnboardingFocusType,
  concurso: context.contextPayload.concurso
    ? {
        id: context.id,
        nome: context.contextPayload.concurso.examName || 'Concurso',
        banca: context.contextPayload.concurso.board || '',
        area: context.contextPayload.concurso.area || '',
        examDate: context.contextPayload.concurso.examDate || null,
        experienceLevel: context.contextPayload.concurso.experience || null,
        planningWithoutDate: context.contextPayload.concurso.planningWithoutDate ?? false,
      }
    : null,
  enem: context.contextPayload.enem
    ? {
        goalId: context.contextPayload.enem.goalId || null,
        targetCollege: context.contextPayload.enem.targetCollege || null,
        targetCourse: context.contextPayload.enem.targetCourse || null,
        triedBefore: context.contextPayload.enem.triedBefore || null,
        profileLevel: context.contextPayload.enem.level || null,
      }
    : null,
  hibrido: context.contextPayload.hibrido
    ? {
        primaryFocus: context.contextPayload.hibrido.primaryFocus || 'equilibrado',
        availableStudyTime: context.contextPayload.hibrido.availableStudyTime || 'medio',
        concursoExamDate: context.contextPayload.hibrido.concurso?.examDate || null,
      }
    : null,
  faculdade: context.contextPayload.faculdade
    ? {
        institution: context.contextPayload.faculdade.institutionName || null,
        course: context.contextPayload.faculdade.courseName || null,
        semester: context.contextPayload.faculdade.academicPeriodLabel || null,
        focus: context.contextPayload.faculdade.focus || null,
      }
    : null,
  outros: context.contextPayload.outros
    ? {
        goalTitle: context.contextPayload.outros.topicName || null,
        focus:
          context.contextPayload.outros.goalType === 'aprender_do_zero'
            ? 'aprender'
            : context.contextPayload.outros.goalType === 'aprofundar'
              ? 'evoluir_tema'
              : context.contextPayload.outros.goalType || null,
        deadline: null,
      }
    : null,
  contextSummary: context.contextSummary || null,
  contextDescription: context.contextDescription || null,
});

const personalizeStarterPlan = (
  plan: BeginnerPlan,
  focus: OnboardingCompletionMeta['focus'] | undefined,
  smartProfile: SmartScheduleProfile,
): BeginnerPlan => {
  if (focus !== 'faculdade' && focus !== 'outros') {
    return plan;
  }

  const rankedSubjects = Object.entries(smartProfile.subjectWeight || {})
    .filter(([, weight]) => Number(weight) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject)
    .filter(Boolean);

  const fallbackSubjects = Object.keys(smartProfile.subjectDifficulty || {}).filter(Boolean);
  const focusAreas = (rankedSubjects.length > 0 ? rankedSubjects : fallbackSubjects).slice(0, 3);

  if (focusAreas.length === 0) {
    return plan;
  }

  const missions = plan.missions.map((mission, index) => {
    const nextTasks = focusAreas.map((subject, subjectIndex) => ({
      discipline: subject,
      topic: STARTER_TOPIC_SETS[index]?.[subjectIndex] || STARTER_TOPIC_SETS[index]?.[0] || 'bloco inicial',
    }));

    return {
      ...mission,
      focus: STARTER_FOCUS_BY_CONTEXT[focus][index] || mission.focus,
      tasks: nextTasks,
    };
  });

  return {
    ...plan,
    focusAreas,
    missions,
  };
};

type ResumeMissionState = {
  version: 1;
  entry: 'next_mission_ready' | 'active_session';
  source: 'beginner' | 'official';
  scheduledAt: string;
  lastSessionCompleted: boolean;
  nextMissionReady: boolean;
  currentMission: {
    id: string;
    sessionId?: string | null;
    subject: string;
    topic: string;
    questionsTotal: number;
    questionsDone: number;
    nextQuestion: number;
  };
};

type ResumeEntrySource = 'idle' | 'auto' | 'notification';

type OfficialStudyAnswerFeedback = {
  tone: 'success' | 'warning';
  message: string;
  detail?: string;
};

const OFFICIAL_STUDY_SESSION_QUESTION_LIMIT = 3;
const OFFICIAL_STUDY_ESTIMATED_DURATION_MINUTES = 5;
const NEXT_SESSION_COMMIT_TITLE = 'Sua proxima sessao esta pronta';
const NEXT_SESSION_COMMIT_DETAIL = '3 questoes rapidas + revisao curta em menos de 5 min.';
const RESUME_SESSION_PATH = '/resume-session';
const RESUME_NOTIFICATION_SOURCE = 'd1_notification';
const RESUME_QUESTION_ESTIMATE_SECONDS = 40;

type FocusStartOverrides = {
  currentBlock?: Partial<StudyExecutionState['currentBlock']>;
  source?: StudyExecutionState['source'];
  methodId?: string;
  studyMode?: StudyMode;
};

type BeginnerWeekSummaryAction = 'continue_guided' | 'explore_tools';
type StudyFlowStep = 'idle' | 'focusing' | 'focusCompleted' | 'questionTransition' | 'questioning';
type LastCompletedFocus = {
  subject: string;
  topicName?: string;
  duration: number;
  targetQuestions: number;
  todaySessionCount: number;
  completedAt: string;
};
type OfficialStudyHomeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'empty';
      title: string;
      description: string;
      supportingText?: string;
    }
  | {
      status: 'error';
      message: string;
    }
  | {
      status: 'ready';
      home: StudyLoopHomePayload & { success: true };
      recommendation: StudyLoopRecommendation | null;
    };

type BeginnerScopedStorageSnapshot = {
  scope: string;
  ready: boolean;
  hasPlan: boolean;
  hasState: boolean;
  hasStats: boolean;
};

const normalizeOfficialStudySubject = (subject: string): MateriaTipo =>
  (String(subject || 'Outra').trim() || 'Outra') as MateriaTipo;

const normalizeStudyLabelMatcher = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getAcademyFocusSubjectLabel = (subDepartment: AcademySubDepartment): string => {
  const normalizedSubDepartment = normalizeStudyLabelMatcher(subDepartment);

  switch (normalizedSubDepartment) {
    case 'matematica':
      return 'Matemática';
    case 'redacao':
      return 'Redação';
    case 'linguagens':
      return 'Linguagens';
    case 'humanas':
      return 'Humanas';
    case 'natureza':
      return 'Natureza';
    default:
      return String(subDepartment || '').trim() || 'Outras';
  }
};

const buildStudySessionIdentityKey = (
  session: Pick<StudySession, 'date' | 'subject' | 'minutes' | 'duration' | 'points'>,
): string =>
  `${session.date}|${session.subject}|${session.minutes}|${session.duration}|${session.points}`;

const toLocalDateKey = (rawDate: string): string => {
  const resolvedDate = new Date(rawDate);
  if (Number.isNaN(resolvedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = resolvedDate.getFullYear();
  const month = String(resolvedDate.getMonth() + 1).padStart(2, '0');
  const day = String(resolvedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalendarDayDiff = (leftDateKey: string, rightDateKey: string): number => {
  const leftTime = new Date(`${leftDateKey}T00:00:00Z`).getTime();
  const rightTime = new Date(`${rightDateKey}T00:00:00Z`).getTime();
  return Math.round((leftTime - rightTime) / (24 * 60 * 60 * 1000));
};

const normalizeResumeMissionId = (subject: string, topic: string, scheduledAt: string): string =>
  `${normalizeStudyLabelMatcher(subject).replace(/\s+/g, '_') || 'missao'}_${normalizeStudyLabelMatcher(topic).replace(/\s+/g, '_') || 'geral'}_${toLocalDateKey(scheduledAt)}`;

const getEstimatedMinutesRemaining = (questionsTotal: number, questionsDone: number): number => {
  const remainingQuestions = Math.max(1, Math.max(questionsTotal, 1) - Math.max(0, questionsDone));
  return Math.max(1, Math.ceil((remainingQuestions * RESUME_QUESTION_ESTIMATE_SECONDS) / 60));
};

const getResumeEntrySourceFromLocation = (): ResumeEntrySource => {
  if (typeof window === 'undefined') {
    return 'idle';
  }

  if (window.location.pathname !== RESUME_SESSION_PATH) {
    return 'idle';
  }

  const url = new URL(window.location.href);
  return url.searchParams.get('source') === RESUME_NOTIFICATION_SOURCE ? 'notification' : 'auto';
};

const clearResumeLocationState = (): void => {
  if (typeof window === 'undefined' || window.location.pathname !== RESUME_SESSION_PATH) {
    return;
  }

  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.delete('source');
  url.searchParams.delete('resumeKey');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const isResumePromptDue = (resumeState: ResumeMissionState | null): boolean => {
  if (!resumeState || resumeState.entry !== 'next_mission_ready') {
    return false;
  }

  const todayKey = toLocalDateKey(new Date().toISOString());
  const scheduledDayKey = toLocalDateKey(resumeState.scheduledAt);
  return getCalendarDayDiff(todayKey, scheduledDayKey) >= 1;
};

const buildOfficialStudyCompletionSnapshot = (
  session: OfficialStudySession,
  result: OfficialStudySessionResult,
): OfficialStudyCompletionSnapshot => {
  const sessionDate = session.startedAt || new Date().toISOString();
  return {
    date: sessionDate,
    timestamp: sessionDate,
    minutes: Math.max(1, Math.ceil(result.durationSeconds / 60)),
    points: Math.max(0, result.correct * 10),
    subject: normalizeOfficialStudySubject(session.subject),
    duration: result.durationSeconds,
    goalMet: true,
    topic: session.topic,
    topicName: session.topic,
  };
};

const summarizeOfficialStudyAssessmentBySubject = (
  session: OfficialStudySession,
): OfficialStudyAssessmentSummary[] => {
  const grouped = new Map<string, OfficialStudyAssessmentSummary>();

  session.questions.forEach((question) => {
    const answer = session.answers[question.id];
    if (!answer) {
      return;
    }

    const subject = normalizeSubjectLabel(String(question.subject || session.subject || 'Outra'), 'Outra');
    const current = grouped.get(subject) || {
      subject,
      correct: 0,
      total: 0,
    };

    current.total += 1;
    if (answer.isCorrect) {
      current.correct += 1;
    }

    grouped.set(subject, current);
  });

  return [...grouped.values()];
};

const readPersistedStudySession = (storageKey: string): PersistedStudySession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedStudySession | null;
    if (!parsed || (parsed.status !== 'running' && parsed.status !== 'paused')) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const getActiveStudySessionEntries = (
  storageScope: string,
): Array<{ storageKey: string; session: PersistedStudySession }> =>
  [
    `study-timer-session_${storageScope}`,
    `pomodoro-session_${storageScope}`,
  ]
    .map((storageKey) => ({
      storageKey,
      session: readPersistedStudySession(storageKey),
    }))
    .filter((entry): entry is { storageKey: string; session: PersistedStudySession } => Boolean(entry.session));

const getLatestActiveStudySessionEntry = (
  storageScope: string,
): { storageKey: string; session: PersistedStudySession } | null => {
  const activeEntries = getActiveStudySessionEntries(storageScope);
  if (activeEntries.length === 0) {
    return null;
  }

  return [...activeEntries].sort((left, right) => {
    const rightTime = Date.parse(right.session.updatedAt || right.session.startedAt);
    const leftTime = Date.parse(left.session.updatedAt || left.session.startedAt);
    return rightTime - leftTime;
  })[0];
};

const clearPersistedStudySession = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // noop
  }
};

const normalizeQuickSessionDuration = (value: number): QuickSessionDuration => {
  if (value <= 15) return 15;
  if (value <= 25) return 25;
  if (value <= 30) return 30;
  return 50;
};

const BEGINNER_UNLOCKED_TABS = new Set(['inicio', 'perfil', 'foco', 'questoes', 'simulado']);
const BEGINNER_LOCKED_LABELS: Record<string, string> = {
  arvore: 'Arvore',
  departamento: 'Departamento',
  mentor: 'Mentor IA',
  'mentor-admin': 'Mentor Admin',
  cronograma: 'Cronograma',
  metodos: 'Metodos',
  dashboard: 'Dashboard',
  flashcards: 'Flashcards',
  vespera: 'Vespera',
  grupos: 'Grupos',
  'ranking-global': 'Ranking Global',
  conquistas: 'Conquistas',
  configuracoes: 'Configuracoes',
  dados: 'Dados',
};

interface QuizPrefilter {
  nonce: number;
  subject?: string;
  topicName?: string;
  track?: QuizTrackFilter;
}

interface MockExamPrefilter {
  nonce: number;
  subject?: string;
  topicName?: string;
  track?: QuizTrackFilter;
}

const StudyTimer = lazy(() => import('./components/Timer/StudyTimer').then((module) => ({ default: module.StudyTimer })));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then((module) => ({ default: module.Dashboard })));
const StudyHeatmap = lazy(() => import('./components/Dashboard/StudyHeatmap'));
const LevelProgress = lazy(() => import('./components/Dashboard/LevelProgress'));
const RankOverview = lazy(() => import('./components/Dashboard/RankOverview'));
const WeeklyReport = lazy(() => import('./components/Dashboard/WeeklyReport'));
const WeeklyChartReal = lazy(() => import('./components/Dashboard/WeeklyChartReal').then((module) => ({ default: module.WeeklyChartReal })));
const MethodPerformance = lazy(() => import('./components/Dashboard/MethodPerformance'));
const MentorIA = lazy(() => import('./components/AI/MentorIA'));
const DataManagement = lazy(() => import('./components/Settings/DataManagement').then((module) => ({ default: module.DataManagement })));
const StudyMethodHub = lazy(() => import('./components/StudyMethods/StudyMethodHub'));
const AcademyPage = lazy(() => import('./components/Academy/AcademyPage'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ConquistasPage = lazy(() => import('./pages/Conquistas'));
const LocalStoragePage = lazy(() => import('./pages/localStorage'));
const SyncCenter = lazy(() => import('./components/Settings/SyncCenter'));
const RetentionAdminPanel = lazy(() => import('./components/Settings/RetentionAdminPanel').then((module) => ({ default: module.RetentionAdminPanel })));
const StudyScheduleCalendar = lazy(() => import('./components/Calendar/StudyScheduleCalendar'));
const QuizPage = lazy(() => import('./components/Questions/QuizPage'));
const MockExam = lazy(() => import('./components/Questions/MockExam'));
const ReviewPage = lazy(() => import('./features/review/ReviewPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const EveOfExamPage = lazy(() => import('./components/ExamPrep/EveOfExamPage'));
const GroupsPage = lazy(() => import('./components/Social/GroupsPage'));
const GlobalRankingPage = lazy(() => import('./components/Social/GlobalRankingPage'));
const FeedbackButton = lazy(() => import('./components/UI/FeedbackButton'));
const EmptyState = lazy(() => import('./components/Dashboard/ProgressEmptyState'));
const MentorAdminDashboard = lazy(() => import('./pages/MentorAdminDashboard'));
const KnowledgeGenealogyTree = lazy(() => import('./components/Dashboard/KnowledgeGenealogyTree'));

function App() {
  // Authentication (Supabase Auth)
  const {
    user,
    isLoggedIn,
    loading: authLoading,
    supabaseUserId: authSupabaseUserId,
    login,
    register,
    logout,
    resetPassword,
    loginWithOAuth,
    enabledOAuthProviders,
  } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const userStorageScope = (user?.email || 'default').toLowerCase();

  // User Data
  const [userData, setUserData] = useLocalStorage<UserData>(
    `${STORAGE_KEYS.DATA_PREFIX}${user?.email || 'default'}`,
    INITIAL_USER_DATA,
    {
      legacyKeys: [`medicinaData_${user?.email || 'default'}`],
    }
  );
  const defaultWeeklySchedule = React.useMemo(() => createDefaultWeeklyStudySchedule(), []);

  // UI State
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);
  const [currentTheme, setCurrentTheme] = useLocalStorage('theme', 'blue');
  const preferredSidebarMode: SidebarMode =
    typeof window !== 'undefined' && window.innerWidth >= 1536 ? 'expanded' : 'compact';
  const [sidebarMode, setSidebarMode] = useLocalStorage<SidebarMode>('zb_sidebar_mode', preferredSidebarMode);
  const [selectedMethodId, setSelectedMethodId] = useLocalStorage(`selectedStudyMethodId_${userStorageScope}`, 'pomodoro');
  const [completedContentIds, setCompletedContentIds] = useLocalStorage<string[]>(`academyCompletedContentIds_${userStorageScope}`, []);
  const [isProUser] = useLocalStorage<boolean>('isProUser', false);
  // supabaseUserId agora vem direto do useAuth (Supabase session)
  const supabaseUserId = authSupabaseUserId;
  const [activeStudyMode, setActiveStudyMode] = useLocalStorage<StudyMode>(`activeStudyMode_${userStorageScope}`, 'pomodoro');
  const [plannedFocusDuration, setPlannedFocusDuration] = useLocalStorage<QuickSessionDuration>(`plannedFocusDuration_${userStorageScope}`, 25);
  const [preferredStudyTrack, setPreferredStudyTrack] = useLocalStorage<StudyTrack>(`preferredStudyTrack_${userStorageScope}`, 'enem');
  const [hybridEnemWeight, setHybridEnemWeight] = useLocalStorage<number>(`hybridEnemWeight_${userStorageScope}`, 70);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useLocalStorage<number>(`weeklyGoalMinutes_${userStorageScope}`, 900);
  const [profileDisplayName, setProfileDisplayName] = useLocalStorage<string>(`profileDisplayName_${userStorageScope}`, '');
  const [profileAvatar, setProfileAvatar] = useLocalStorage<string>(`profileAvatar_${userStorageScope}`, '\u{1F464}');
  const [profileExamGoal, setProfileExamGoal] = useLocalStorage<string>(`profileExamGoal_${userStorageScope}`, 'ENEM');
  const [profileExamDate, setProfileExamDate] = useLocalStorage<string>(`profileExamDate_${userStorageScope}`, '');
  const [smartScheduleOnboardingMeta, setSmartScheduleOnboardingMeta] = useLocalStorage<OnboardingCompletionMeta | null>(
    `smartScheduleOnboardingMeta_${supabaseUserId || 'default'}`,
    null,
  );
  const [lastProfileSavedAt, setLastProfileSavedAt] = useLocalStorage<string | null>(`lastProfileSavedAt_${userStorageScope}`, null);
  const [profileChangeHistory, setProfileChangeHistory] = useLocalStorage<Array<{ at: string; summary: string }>>(
    `profileChangeHistory_${userStorageScope}`,
    []
  );
  const [preferencesSyncStatus, setPreferencesSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [lastPreferencesSyncAt, setLastPreferencesSyncAt] = useState<string | null>(null);
  const [profileSyncStatus, setProfileSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [lastProfileSyncAt, setLastProfileSyncAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inicio');
  const [phaseOverride, setPhaseOverride] = useLocalStorage<ProductPhaseOverride>('zb_phase_override', null);
  const [hasInternalAccess, setHasInternalAccess] = useLocalStorage<boolean>('zb_internal_access', false);
  const [isAdminMode, setIsAdminMode] = useLocalStorage<boolean>('zb_admin_mode', false);
  const [studyExecutionState, setStudyExecutionState] = useLocalStorage<StudyExecutionState | null>(
    `studyExecutionState_${userStorageScope}`,
    null,
  );
  const [showStudyAdjustments, setShowStudyAdjustments] = useState(false);
  const [requestedScheduleEditDay, setRequestedScheduleEditDay] = useState<Weekday | null>(null);
  const [requestedScheduleEditNonce, setRequestedScheduleEditNonce] = useState(0);
  const [studyFlowStep, setStudyFlowStep] = useState<StudyFlowStep>('idle');
  const [lastCompletedFocus, setLastCompletedFocus] = useState<LastCompletedFocus | null>(null);
  const [focusTimerSubjectOverride, setFocusTimerSubjectOverride] = useState<MateriaTipo | null>(null);
  const [showAdminSupportTools, setShowAdminSupportTools] = useState(false);
  const [shouldScrollToRanks, setShouldScrollToRanks] = useState(false);
  const [rankHighlightSignal, setRankHighlightSignal] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quizPrefilter, setQuizPrefilter] = useState<QuizPrefilter | null>(null);
  const [mockExamPrefilter, setMockExamPrefilter] = useState<MockExamPrefilter | null>(null);
  const [syncUiStatus, setSyncUiStatus] = useState(offlineSyncService.getStatus());
  const [academyQuickStartSignal, setAcademyQuickStartSignal] = useState(0);
  const [pendingHeroAttribution, setPendingHeroAttribution] = useState<HeroAttribution | null>(null);
  const [beginnerState, setBeginnerState] = useLocalStorage<BeginnerState | null>(`beginnerState_${userStorageScope}`, null);
  const [beginnerPlan, setBeginnerPlan] = useLocalStorage<BeginnerPlan | null>(`beginnerPlan_${userStorageScope}`, null);
  const [beginnerStats, setBeginnerStats] = useLocalStorage<BeginnerStats | null>(`beginnerStats_${userStorageScope}`, null);
  const [nextSessionCommit, setNextSessionCommit] = useLocalStorage<NextSessionCommitState | null>(`nextSessionCommit_${userStorageScope}`, null);
  const [resumeMissionState, setResumeMissionState] = useLocalStorage<ResumeMissionState | null>(`resumeMissionState_${userStorageScope}`, null);
  const [homeCompletionSignal, setHomeCompletionSignal] = useLocalStorage<HomeCompletionSignal | null>(`homeCompletionSignal_${userStorageScope}`, null);
  const [lastBeginnerResult, setLastBeginnerResult] = useState<BeginnerSessionUiResult | null>(null);
  const [showBeginnerWeekSummary, setShowBeginnerWeekSummary] = useState(false);
  const [officialStudyHomeState, setOfficialStudyHomeState] = useState<OfficialStudyHomeState>({ status: 'idle' });
  const [officialStudySession, setOfficialStudySession] = useState<OfficialStudySession | null>(null);
  const [officialStudyResult, setOfficialStudyResult] = useState<OfficialStudySessionResult | null>(null);
  const [officialStudyResultMeta, setOfficialStudyResultMeta] = useState<OfficialStudyResultMeta | null>(null);
  const [officialStudyAnswerFeedback, setOfficialStudyAnswerFeedback] = useState<OfficialStudyAnswerFeedback | null>(null);
  const [officialStudyStarting, setOfficialStudyStarting] = useState(false);
  const [officialStudyAnswering, setOfficialStudyAnswering] = useState(false);
  const [officialStudyFinishing, setOfficialStudyFinishing] = useState(false);
  const [officialStudyQuestionStartedAt, setOfficialStudyQuestionStartedAt] = useState<number>(Date.now());
  const [resumeEntrySource, setResumeEntrySource] = useState<ResumeEntrySource>(() => getResumeEntrySourceFromLocation());
  const [persistedScheduleEntries, setPersistedScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [lockedNavigationTarget, setLockedNavigationTarget] = useState<{ tabId: string; label: string } | null>(null);
  const [showIntermediateUnlockBanner, setShowIntermediateUnlockBanner] = useState(false);
  const lastMissionViewKeyRef = React.useRef<string | null>(null);
  const lastQuestionsStartKeyRef = React.useRef<string | null>(null);
  const lastPostSessionViewKeyRef = React.useRef<string | null>(null);
  const lastOfficialPostSessionViewKeyRef = React.useRef<string | null>(null);
  const lastWeekSummaryViewKeyRef = React.useRef<string | null>(null);
  const resumeBootIntentInitializedRef = React.useRef(false);
  const lastResumeScreenViewKeyRef = React.useRef<string | null>(null);
  const lastNotificationOpenKeyRef = React.useRef<string | null>(null);
  const resumeAutostartAttemptKeyRef = React.useRef<string | null>(null);
  const lastHeartbeatAtRef = React.useRef(0);
  const questionTransitionTimeoutRef = React.useRef<number | null>(null);
  const lastStudyContextRouteRef = React.useRef<string | null>(null);
  const {
    activeStudyContext,
    bootstrapStatus: studyContextBootstrapStatus,
    persistActiveStudyContext,
    setActiveStudyContext,
  } = useStudyContextController({
    authLoading,
    isLoggedIn,
    userEmail: user?.email,
    userStorageScope,
    supabaseUserId,
    legacyOnboardingSnapshot: smartScheduleOnboardingMeta,
    onLegacyTrackResolved: setPreferredStudyTrack,
  });
  const nativePlannerStorageScope = React.useMemo(() => {
    if (!activeStudyContext || !isNativeStudyContextMode(activeStudyContext.mode)) {
      return null;
    }

    return `${userStorageScope}_${activeStudyContext.id}`;
  }, [activeStudyContext, userStorageScope]);
  const weeklyScheduleStorageKey = React.useMemo(
    () => nativePlannerStorageScope
      ? `weeklyStudySchedule_${nativePlannerStorageScope}`
      : `weeklyStudySchedule_${userStorageScope}`,
    [nativePlannerStorageScope, userStorageScope],
  );
  const scheduleEntriesStorageKey = React.useMemo(
    () => getStudyScheduleStorageKey(nativePlannerStorageScope),
    [nativePlannerStorageScope],
  );
  const shouldSyncScheduleEntriesToCloud = !nativePlannerStorageScope;
  const [weeklyScheduleRaw, setWeeklyScheduleRaw] = useLocalStorage<WeeklyStudySchedule>(
    weeklyScheduleStorageKey,
    defaultWeeklySchedule,
  );
  const [beginnerScopedStorage, setBeginnerScopedStorage] = useState<BeginnerScopedStorageSnapshot>({
    scope: userStorageScope,
    ready: false,
    hasPlan: false,
    hasState: false,
    hasStats: false,
  });
  const isBeginnerFocus = Boolean(beginnerState && beginnerState !== 'week_complete');
  const isLocalEnvironment = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  }, []);
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncPersistedScheduleEntries = (event?: Event) => {
      if (event instanceof CustomEvent) {
        const eventStorageKey = event.detail?.storageKey;
        if (eventStorageKey && eventStorageKey !== scheduleEntriesStorageKey) {
          return;
        }
      }

      if (event instanceof StorageEvent && event.key && event.key !== scheduleEntriesStorageKey) {
        return;
      }

      setPersistedScheduleEntries(readPersistedScheduleEntries(scheduleEntriesStorageKey));
    };

    syncPersistedScheduleEntries();
    window.addEventListener(STUDY_SCHEDULE_UPDATED_EVENT, syncPersistedScheduleEntries as EventListener);
    window.addEventListener('storage', syncPersistedScheduleEntries);

    return () => {
      window.removeEventListener(STUDY_SCHEDULE_UPDATED_EVENT, syncPersistedScheduleEntries as EventListener);
      window.removeEventListener('storage', syncPersistedScheduleEntries);
    };
  }, [scheduleEntriesStorageKey]);
  React.useEffect(() => {
    if (!homeCompletionSignal || isHomeCompletionSignalActive(homeCompletionSignal)) {
      return;
    }

    setHomeCompletionSignal(null);
  }, [homeCompletionSignal, setHomeCompletionSignal]);
  const canAccessInternalTools = isLocalEnvironment || hasInternalAccess || isAdminMode;
  const isSidebarExpanded = sidebarMode === 'expanded';
  const sidebarWidth = isSidebarExpanded ? '256px' : '96px';
  const toggleSidebarMode = React.useCallback(() => {
    setSidebarMode((prev) => (prev === 'expanded' ? 'compact' : 'expanded'));
  }, [setSidebarMode]);

  React.useEffect(() => {
    if (!isLoggedIn || resumeBootIntentInitializedRef.current) {
      return;
    }

    resumeBootIntentInitializedRef.current = true;

    if (resumeEntrySource !== 'idle') {
      return;
    }

    if (resumeMissionState?.entry === 'active_session' || isResumePromptDue(resumeMissionState)) {
      setResumeEntrySource('auto');
    }
  }, [isLoggedIn, resumeEntrySource, resumeMissionState]);

  React.useEffect(() => {
    if (!isLoggedIn || !supabaseUserId) {
      lastHeartbeatAtRef.current = 0;
      return;
    }

    const sendHeartbeat = (action = 'app_opened') => {
      const now = Date.now();
      if (now - lastHeartbeatAtRef.current < 60000 && action === 'app_opened') {
        return;
      }

      lastHeartbeatAtRef.current = now;
      void pushApiService.sendHeartbeat(action);
    };

    sendHeartbeat('app_opened');

    const handleFocus = () => sendHeartbeat('app_opened');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat('app_opened');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoggedIn, supabaseUserId]);

  React.useEffect(() => {
    if (isLoggedIn) {
      return;
    }

    resumeBootIntentInitializedRef.current = false;
    resumeAutostartAttemptKeyRef.current = null;
    lastResumeScreenViewKeyRef.current = null;
    lastNotificationOpenKeyRef.current = null;
    setResumeEntrySource(getResumeEntrySourceFromLocation());
  }, [isLoggedIn]);

  React.useEffect(() => {
    resumeBootIntentInitializedRef.current = false;
    resumeAutostartAttemptKeyRef.current = null;
    lastResumeScreenViewKeyRef.current = null;
    lastNotificationOpenKeyRef.current = null;
    setResumeEntrySource(getResumeEntrySourceFromLocation());
  }, [userStorageScope]);
  const weeklySchedule = React.useMemo(
    () => sanitizeWeeklyStudySchedule(weeklyScheduleRaw),
    [weeklyScheduleRaw],
  );
  const clearNextSessionCommit = React.useCallback(() => {
    setNextSessionCommit(null);
  }, [setNextSessionCommit]);
  const clearLegacyBeginnerBootstrapStorage = React.useCallback((additionalScopes: string[] = []) => {
    if (typeof window === 'undefined') {
      return;
    }

    const scopes = Array.from(
      new Set(
        [userStorageScope, user?.email?.toLowerCase() || null, 'default', ...additionalScopes]
          .filter((scope): scope is string => Boolean(scope)),
      ),
    );

    scopes.forEach((scope) => {
      window.localStorage.removeItem(`beginnerPlan_${scope}`);
      window.localStorage.removeItem(`beginnerState_${scope}`);
      window.localStorage.removeItem(`beginnerStats_${scope}`);
    });
  }, [user?.email, userStorageScope]);
  const scheduleNextSessionCommit = React.useCallback(
    (source: NextSessionCommitState['source'], detail = NEXT_SESSION_COMMIT_DETAIL) => {
      setNextSessionCommit({
        nextSessionScheduled: true,
        scheduledAt: new Date().toISOString(),
        source,
        title: NEXT_SESSION_COMMIT_TITLE,
        detail,
      });
    },
    [setNextSessionCommit],
  );
  const clearResumeMissionState = React.useCallback(() => {
    setResumeMissionState(null);
  }, [setResumeMissionState]);
  const upsertResumeMissionState = React.useCallback((
    input: {
      entry: ResumeMissionState['entry'];
      source: ResumeMissionState['source'];
      scheduledAt?: string;
      subject: string;
      topic: string;
      questionsTotal: number;
      questionsDone: number;
      sessionId?: string | null;
      missionId?: string;
      lastSessionCompleted: boolean;
      nextMissionReady: boolean;
    },
  ) => {
    const scheduledAt = input.scheduledAt || new Date().toISOString();
    const questionsTotal = Math.max(1, input.questionsTotal);
    const questionsDone = Math.max(0, Math.min(questionsTotal, input.questionsDone));
    const sessionId = input.sessionId || null;
    const missionId = input.missionId || sessionId || normalizeResumeMissionId(input.subject, input.topic, scheduledAt);

    setResumeMissionState({
      version: 1,
      entry: input.entry,
      source: input.source,
      scheduledAt,
      lastSessionCompleted: input.lastSessionCompleted,
      nextMissionReady: input.nextMissionReady,
      currentMission: {
        id: missionId,
        sessionId,
        subject: normalizeSubjectLabel(input.subject, 'Matematica'),
        topic: normalizePresentationLabel(input.topic, 'Proxima missao'),
        questionsTotal,
        questionsDone,
        nextQuestion: Math.min(questionsTotal, questionsDone + 1),
      },
    });
  }, [setResumeMissionState]);
  const persistActiveOfficialResumeState = React.useCallback((
    session: OfficialStudySession,
    scheduledAt = session.startedAt || new Date().toISOString(),
  ) => {
    upsertResumeMissionState({
      entry: 'active_session',
      source: 'official',
      scheduledAt,
      subject: session.subject,
      topic: session.topic || session.subject,
      questionsTotal: session.totalQuestions,
      questionsDone: session.answeredQuestions,
      sessionId: session.sessionId,
      missionId: session.sessionId,
      lastSessionCompleted: false,
      nextMissionReady: false,
    });
  }, [upsertResumeMissionState]);
  const persistNextMissionResumeState = React.useCallback((
    input: {
      source: ResumeMissionState['source'];
      subject: string;
      topic: string;
      scheduledAt?: string;
      questionsTotal?: number;
      missionId?: string;
    },
  ) => {
    upsertResumeMissionState({
      entry: 'next_mission_ready',
      source: input.source,
      scheduledAt: input.scheduledAt,
      subject: input.subject,
      topic: input.topic,
      questionsTotal: input.questionsTotal || OFFICIAL_STUDY_SESSION_QUESTION_LIMIT,
      questionsDone: 0,
      missionId: input.missionId,
      lastSessionCompleted: true,
      nextMissionReady: true,
    });
  }, [upsertResumeMissionState]);

  React.useEffect(() => {
    if (JSON.stringify(weeklySchedule) !== JSON.stringify(weeklyScheduleRaw)) {
      setWeeklyScheduleRaw(weeklySchedule);
    }
  }, [setWeeklyScheduleRaw, weeklySchedule, weeklyScheduleRaw]);

  const handleResetInternalMode = React.useCallback(() => {
    try {
      localStorage.removeItem('zb_internal_access');
      localStorage.removeItem('zb_phase_override');
      localStorage.removeItem('zb_admin_mode');
    } catch {
      // ignore local storage failures
    }

    setHasInternalAccess(false);
    setPhaseOverride(null);
    setIsAdminMode(false);
    toast.success('Modo interno resetado');
  }, [setHasInternalAccess, setIsAdminMode, setPhaseOverride]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get('internal') !== '1') {
      return;
    }

    setHasInternalAccess(true);
    setIsAdminMode(true);
    url.searchParams.delete('internal');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    toast.success('Modo interno liberado neste navegador');
  }, [setHasInternalAccess, setIsAdminMode]);

  const applyAchievementReward = React.useCallback(
    (achievementId: string, points: number) => {
      setUserData((prev) => xpEngineService.applyAchievementReward(prev, achievementId, points));
    },
    [setUserData],
  );

  // Achievements Hook (com cloud sync)
  const lastAchievementToastRef = React.useRef<string | null>(null);
  const { newlyUnlocked, unlockedAchievements } = useAchievements(
    userData,
    supabaseUserId,
    applyAchievementReward,
    {
      storageScope: userStorageScope,
      weeklyGoalMinutes,
    },
  );

  // Study mode (Exploracao / Focado) persistido em localStorage
  const { studyMode, toggleStudyMode } = useStudyMode();
  const abUserId = (supabaseUserId || user?.email || userStorageScope || 'anonymous').toLowerCase();
  const heroVariant = React.useMemo<HeroVariant>(() => getStableHeroVariant(abUserId), [abUserId]);

  React.useEffect(() => {
    if (!newlyUnlocked) return;
    if (lastAchievementToastRef.current === newlyUnlocked.id) return;

    lastAchievementToastRef.current = newlyUnlocked.id;
    toast.custom(
      (toastState) => (
        <div
          className={`pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200 bg-slate-950/95 p-4 text-slate-50 shadow-2xl transition-all ${
            toastState.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/25">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                Conquista desbloqueada
              </p>
              <h4 className="mt-1 text-base font-bold text-white">{newlyUnlocked.title}</h4>
              <p className="mt-1 text-sm text-slate-300">{newlyUnlocked.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-200">
                <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 font-semibold uppercase tracking-wide">
                  {newlyUnlocked.rarity}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 font-semibold">
                  +{newlyUnlocked.points} pontos
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        id: `achievement-${newlyUnlocked.id}`,
        duration: 4500,
      },
    );
  }, [newlyUnlocked]);

  const trackBeginnerEvent = React.useCallback(
    (name: Parameters<typeof analytics.trackBeginnerEvent>[0], payload?: Record<string, unknown>) => {
      analytics.trackBeginnerEvent(name, payload, { userEmail: user?.email });
    },
    [user?.email],
  );
  const trackIntermediateEvent = React.useCallback(
    (name: Parameters<typeof analytics.trackIntermediateEvent>[0], payload?: Record<string, unknown>) => {
      analytics.trackIntermediateEvent(name, payload, { userEmail: user?.email });
    },
    [user?.email],
  );
  const weeklyStudyContext = React.useMemo(
    () => buildStudyContextForToday(weeklySchedule),
    [weeklySchedule],
  );
  const defaultExecutionBlueprint = React.useMemo(() => {
    if (weeklyStudyContext.state.type === 'planned') {
      return {
        subject: weeklyStudyContext.eligibleSubjects[0] || 'Matematica',
        topicName: undefined,
        objective: 'Executar o bloco planejado para hoje.',
        duration: normalizeQuickSessionDuration(weeklyStudyContext.defaultSessionDurationMinutes),
        targetQuestions: 10,
      };
    }

    if (beginnerPlan) {
      const mission = beginnerFlowService.getTodayMission(beginnerPlan);
      const firstTask = mission?.tasks?.[0];

      if (mission && firstTask) {
        return {
          subject: firstTask.discipline,
          topicName: firstTask.topic,
          objective: mission.focus,
          duration: mission.studyMinutes,
          targetQuestions: mission.questionCount,
        };
      }
    }

    if (preferredStudyTrack === 'concursos') {
      return {
        subject: 'Portugues',
        topicName: 'Interpretacao de texto',
        objective: 'Executar o bloco principal do plano antes de abrir variacoes.',
        duration: plannedFocusDuration,
        targetQuestions: 10,
      };
    }

    if (preferredStudyTrack === 'hibrido') {
      return {
        subject: 'Matematica',
        topicName: 'Regra de 3',
        objective: 'Manter o bloco central em movimento e validar com pratica guiada.',
        duration: plannedFocusDuration,
        targetQuestions: 10,
      };
    }

    return {
      subject: 'Matematica',
      topicName: 'Porcentagem',
      objective: 'Executar o bloco principal do plano de hoje.',
      duration: plannedFocusDuration,
      targetQuestions: 10,
    };
  }, [beginnerPlan, plannedFocusDuration, preferredStudyTrack, weeklyStudyContext]);
  const buildStudyExecutionState = React.useCallback(
    (overrides?: {
      currentBlock?: Partial<StudyExecutionState['currentBlock']>;
      recommendedMethodId?: string;
      source?: StudyExecutionState['source'];
    }): StudyExecutionState => ({
      currentBlock: {
        subject: defaultExecutionBlueprint.subject,
        topicName: defaultExecutionBlueprint.topicName,
        objective: defaultExecutionBlueprint.objective,
        type: 'focus',
        duration: defaultExecutionBlueprint.duration,
        targetQuestions: defaultExecutionBlueprint.targetQuestions,
        ...(overrides?.currentBlock || {}),
      },
      recommendedMethodId: overrides?.recommendedMethodId || selectedMethodId,
      source: overrides?.source || (beginnerPlan ? 'plan' : 'ai'),
      updatedAt: new Date().toISOString(),
    }),
    [beginnerPlan, defaultExecutionBlueprint, selectedMethodId],
  );
  const effectiveStudyExecutionState = React.useMemo(
    () => studyExecutionState || buildStudyExecutionState(),
    [buildStudyExecutionState, studyExecutionState],
  );
  const activeStudyMethod = React.useMemo(
    () => STUDY_METHODS.find((method) => method.id === effectiveStudyExecutionState.recommendedMethodId) || STUDY_METHODS[0],
    [effectiveStudyExecutionState.recommendedMethodId],
  );
  const setFocusExecutionState = React.useCallback(
    (overrides?: Partial<StudyExecutionState['currentBlock']>, source?: StudyExecutionState['source'], methodId?: string) => {
      setStudyExecutionState(
        buildStudyExecutionState({
          currentBlock: {
            ...overrides,
            type: 'focus',
          },
          source: source || 'plan',
          recommendedMethodId: methodId || activeStudyMethod.id,
        }),
      );
    },
    [activeStudyMethod.id, buildStudyExecutionState, setStudyExecutionState],
  );
  const applyPomodoroMethod = React.useCallback(
    (methodId: string) => {
      const method = getStudyMethodById(methodId);
      setSelectedMethodId(methodId);
      setFocusExecutionState({ duration: method.focusMinutes }, 'manual', methodId);
      setActiveStudyMode('pomodoro');
    },
    [setActiveStudyMode, setFocusExecutionState, setSelectedMethodId],
  );
  const handleStudyModeChange = React.useCallback(
    (nextMode: StudyMode) => {
      const activeSessionEntry = getLatestActiveStudySessionEntry(userStorageScope);
      if (!activeSessionEntry) {
        setActiveStudyMode(nextMode);
        return;
      }

      const lockedMode: StudyMode =
        activeSessionEntry.session.source === 'pomodoro' ? 'pomodoro' : 'livre';

      if (nextMode !== lockedMode) {
        toast.error('Finalize ou reinicie a sessao atual antes de trocar de modo.');
        return;
      }

      setActiveStudyMode(nextMode);
    },
    [setActiveStudyMode, userStorageScope],
  );
  const setQuestionsExecutionState = React.useCallback(
    (overrides?: Partial<StudyExecutionState['currentBlock']>, source?: StudyExecutionState['source']) => {
      setStudyExecutionState(
        buildStudyExecutionState({
          currentBlock: {
            ...effectiveStudyExecutionState.currentBlock,
            ...overrides,
            type: 'questions',
          },
          source: source || 'plan',
          recommendedMethodId: activeStudyMethod.id,
        }),
      );
    },
    [activeStudyMethod.id, buildStudyExecutionState, effectiveStudyExecutionState.currentBlock, setStudyExecutionState],
  );
  const handleStartRecommendedFocus = React.useCallback((overrides?: FocusStartOverrides) => {
    const nextMethodId = overrides?.methodId || activeStudyMethod.id;
    const nextDuration = normalizeQuickSessionDuration(
      Number(
        overrides?.currentBlock?.duration ||
          effectiveStudyExecutionState.currentBlock.duration ||
          plannedFocusDuration,
      ),
    );
    const nextTimerSubjectOverride = overrides?.currentBlock?.subject
      ? getCycleSubjectByDisplayLabel(
          String(overrides.currentBlock.subject),
          preferredStudyTrack,
          hybridEnemWeight,
        )
      : null;

    setLastCompletedFocus(null);
    clearNextSessionCommit();
    setStudyFlowStep('focusing');
    setFocusTimerSubjectOverride(nextTimerSubjectOverride);
    setFocusExecutionState(
      overrides?.currentBlock,
      overrides?.source || effectiveStudyExecutionState.source,
      nextMethodId,
    );
    setPlannedFocusDuration(nextDuration);
    setSelectedMethodId(nextMethodId);
    if (overrides?.studyMode) {
      setActiveStudyMode(overrides.studyMode);
    }
    setActiveTab('foco');
  }, [
    activeStudyMethod.id,
    clearNextSessionCommit,
    effectiveStudyExecutionState.currentBlock.duration,
    effectiveStudyExecutionState.source,
    hybridEnemWeight,
    plannedFocusDuration,
    preferredStudyTrack,
    setActiveStudyMode,
    setActiveTab,
    setFocusExecutionState,
    setFocusTimerSubjectOverride,
    setPlannedFocusDuration,
    setSelectedMethodId,
  ]);
  const handleStartRecommendedQuestions = React.useCallback(() => {
    setStudyFlowStep('questioning');
    const nextFilter = {
      nonce: Date.now(),
      subject: effectiveStudyExecutionState.currentBlock.subject,
      topicName: effectiveStudyExecutionState.currentBlock.topicName,
      track:
        preferredStudyTrack === 'concursos'
          ? 'concurso'
          : preferredStudyTrack === 'enem'
            ? 'enem'
            : 'ambos' as QuizTrackFilter,
    };
    setQuestionsExecutionState(undefined, effectiveStudyExecutionState.source);
    setQuizPrefilter(nextFilter);
    setActiveTab('questoes');
  }, [
    effectiveStudyExecutionState.currentBlock.subject,
    effectiveStudyExecutionState.currentBlock.topicName,
    effectiveStudyExecutionState.source,
    preferredStudyTrack,
    setActiveTab,
    setQuestionsExecutionState,
  ]);
  const focusTimerSectionRef = React.useRef<HTMLDivElement | null>(null);
  const studyFlowTopRef = React.useRef<HTMLDivElement | null>(null);
  const studyQuestionsSectionRef = React.useRef<HTMLDivElement | null>(null);
  const studyAdjustmentsSectionRef = React.useRef<HTMLDivElement | null>(null);
  const scrollToFocusTimer = React.useCallback(() => {
    focusTimerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const homeCtrMetrics = React.useMemo<CtrMetrics>(() => {
    const buildEntry = (): CtrEntry => ({ impressions: 0, clicks: 0, ctr: 0 });
    const metrics: CtrMetrics = {
      hero_cta: buildEntry(),
      next_mission: buildEntry(),
      quick_15: buildEntry(),
      quick_25: buildEntry(),
      quick_50: buildEntry(),
    };

    const events = analytics.getEvents();
    events.forEach((event) => {
      if (event.name !== 'home_cta_click' && event.name !== 'home_cta_impression') return;
      const source = event.payload?.source;
      if (
        source !== 'hero_cta' &&
        source !== 'next_mission' &&
        source !== 'quick_15' &&
        source !== 'quick_25' &&
        source !== 'quick_50'
      ) {
        return;
      }

      if (event.name === 'home_cta_impression') {
        metrics[source].impressions += 1;
      }

      if (event.name === 'home_cta_click') {
        metrics[source].clicks += 1;
      }
    });

    (Object.keys(metrics) as CtaSource[]).forEach((source) => {
      const entry = metrics[source];
      entry.ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
    });

    return metrics;
  }, [activeTab]);

  const homeHeroAbMetrics = React.useMemo<HeroAbMetrics>(() => {
    const buildEntry = (): HeroVariantMetricsEntry => ({
      impressions: 0,
      clicks: 0,
      completions: 0,
      ctr: 0,
      completionRate: 0,
      clickToCompletion: 0,
    });

    const metrics: HeroAbMetrics = {
      hero_v1: buildEntry(),
      hero_v2: buildEntry(),
      upliftCtr: 0,
      upliftCompletionRate: 0,
      winnerByCtr: 'tie',
      winnerByCompletionRate: 'tie',
    };

    const events = analytics.getEvents();
    events.forEach((event) => {
      const source = event.payload?.source;
      const variant = event.payload?.variant;
      if (source !== 'hero_cta' || (variant !== 'hero_v1' && variant !== 'hero_v2')) {
        return;
      }

      if (event.name === 'home_cta_impression') {
        metrics[variant].impressions += 1;
      }

      if (event.name === 'home_cta_click') {
        metrics[variant].clicks += 1;
      }

      if (event.name === 'home_hero_completion') {
        metrics[variant].completions += 1;
      }
    });

    (['hero_v1', 'hero_v2'] as HeroVariant[]).forEach((variant) => {
      const entry = metrics[variant];
      entry.ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
      entry.completionRate = entry.impressions > 0 ? entry.completions / entry.impressions : 0;
      entry.clickToCompletion = entry.clicks > 0 ? entry.completions / entry.clicks : 0;
    });

    const v1Ctr = metrics.hero_v1.ctr;
    const v2Ctr = metrics.hero_v2.ctr;
    const v1Completion = metrics.hero_v1.completionRate;
    const v2Completion = metrics.hero_v2.completionRate;

    metrics.upliftCtr = v1Ctr > 0 ? (v2Ctr - v1Ctr) / v1Ctr : 0;
    metrics.upliftCompletionRate = v1Completion > 0 ? (v2Completion - v1Completion) / v1Completion : 0;

    if (v2Ctr > v1Ctr) {
      metrics.winnerByCtr = 'hero_v2';
    } else if (v1Ctr > v2Ctr) {
      metrics.winnerByCtr = 'hero_v1';
    }

    if (v2Completion > v1Completion) {
      metrics.winnerByCompletionRate = 'hero_v2';
    } else if (v1Completion > v2Completion) {
      metrics.winnerByCompletionRate = 'hero_v1';
    }

    return metrics;
  }, [activeTab, userData.sessions?.length, userData.studyHistory?.length]);

  const startQuickSession = React.useCallback((duration: QuickSessionDuration, source: CtaSource, variant?: HeroVariant) => {
    setLastBeginnerResult(null);
    setShowBeginnerWeekSummary(false);
    setLastCompletedFocus(null);
    clearNextSessionCommit();
    setStudyFlowStep('focusing');
    setPlannedFocusDuration(duration);
    setFocusExecutionState({
      type: 'focus',
      duration,
    }, beginnerPlan ? 'plan' : 'ai', selectedMethodId);
    trackEvent('home_cta_click', { source, variant, ts: Date.now() });
    if (source === 'hero_cta' && variant) {
      setPendingHeroAttribution({ variant, clickedAt: Date.now() });
    } else {
      setPendingHeroAttribution(null);
    }
    setActiveTab('foco');
    setActiveStudyMode('pomodoro');
    if (beginnerPlan) {
      const todayMission = beginnerFlowService.getTodayMission(beginnerPlan);
      setBeginnerStats((prev) =>
        beginnerProgressService.recordSessionStarted(prev, {
          day: todayMission?.dayNumber || 1,
          missionId: todayMission?.id || 'starter-session',
          plannedMinutes: duration,
        }),
      );
      trackBeginnerEvent('beginner_session_started', {
        day: todayMission?.dayNumber || 1,
        missionId: todayMission?.id || 'starter-session',
        plannedMinutes: duration,
      });
      setBeginnerState(beginnerFlowService.startSession(beginnerPlan));
    }
  }, [beginnerPlan, clearNextSessionCommit, selectedMethodId, setActiveStudyMode, setActiveTab, setBeginnerState, setFocusExecutionState, setPendingHeroAttribution, setPlannedFocusDuration, setBeginnerStats, trackBeginnerEvent]);

  // Apply dark mode
  useEffect(() => {
    const resolvedTheme = darkMode ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    window.localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const readPreferredThemeMode = (): 'light' | 'dark' | 'system' => {
      const raw = window.localStorage.getItem('settings-pref-theme');
      if (raw === 'dark' || raw === 'Escuro') return 'dark';
      if (raw === 'light' || raw === 'Claro') return 'light';
      return 'system';
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncDarkModeFromPreference = () => {
      const preferredTheme = readPreferredThemeMode();
      const nextDarkMode = preferredTheme === 'system'
        ? mediaQuery.matches
        : preferredTheme === 'dark';

      if (nextDarkMode !== darkMode) {
        setDarkMode(nextDarkMode);
      }
    };

    syncDarkModeFromPreference();

    const handleSystemThemeChange = () => {
      if (readPreferredThemeMode() === 'system') {
        setDarkMode(mediaQuery.matches);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'settings-pref-theme' || event.key === 'darkMode') {
        syncDarkModeFromPreference();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }

      window.removeEventListener('storage', handleStorageChange);
    };
  }, [darkMode, setDarkMode]);

  // Apply theme colors
  const theme = React.useMemo(() => {
    return THEME_PALETTES[currentTheme] || THEME_PALETTES.blue;
  }, [currentTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
  }, [theme]);

  const handleToggleDarkMode = React.useCallback(() => {
    const nextDarkMode = !darkMode;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('settings-pref-theme', nextDarkMode ? 'dark' : 'light');
      window.localStorage.setItem('darkMode', JSON.stringify(nextDarkMode));
    }
    setDarkMode(nextDarkMode);
  }, [darkMode, setDarkMode]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !shouldScrollToRanks) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById('ranks-section');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShouldScrollToRanks(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, shouldScrollToRanks]);

  // Handlers (memoized to prevent re-creation on every render)
  const handleLogin = React.useCallback(
    async (email: string, password: string) => {
      const result = await login(email, password);
      if (!result.success) {
        throw new Error(result.message);
      }
    },
    [login]
  );

  const handleRegister = React.useCallback(
    async (name: string, email: string, password: string) => {
      const result = await register(name, email, password);

      if (!result.success) {
        return result;
      }

      trackEvent(
        'cadastro_concluido',
        { source: 'app_register', hasName: Boolean(name) },
        { userEmail: email.toLowerCase() }
      );

      return result;
    },
    [register]
  );

  const handleLogout = React.useCallback(async () => {
    await logout();
    setBeginnerState(null);
    setBeginnerPlan(null);
    setBeginnerStats(null);
    clearLegacyBeginnerBootstrapStorage();
    clearResumeMissionState();
    setLastBeginnerResult(null);
    setShowBeginnerWeekSummary(false);
    setShowIntermediateUnlockBanner(false);
    toast.success('Logout realizado com sucesso!');
  }, [clearLegacyBeginnerBootstrapStorage, clearResumeMissionState, logout, setBeginnerPlan, setBeginnerState, setBeginnerStats]);

  const handleSocialLogin = React.useCallback(
    async (provider: 'google' | 'facebook') => {
      const result = await loginWithOAuth(provider);
      if (!result.success) {
        throw new Error(result.message);
      }
      toast.success(result.message);
    },
    [loginWithOAuth],
  );

  // supabaseUserId agora é gerenciado pelo useAuth via onAuthStateChange

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((status) => {
      setSyncUiStatus(status);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !supabaseUserId) {
      return;
    }

    void offlineSyncService.start(supabaseUserId);
  }, [isLoggedIn, supabaseUserId]);

  const handleSyncNow = React.useCallback(async () => {
    if (!supabaseUserId) {
      toast.error('Faça login para sincronizar.');
      return;
    }

    await offlineSyncService.syncNow(supabaseUserId);

    const status = offlineSyncService.getStatus();
    if (status.lastError) {
      toast.error(status.lastError);
    } else {
      toast.success('Sincronização concluída.');
    }
  }, [supabaseUserId]);

  const handleShowConflictHistory = React.useCallback(() => {
    const history = offlineSyncService.getConflictHistory();
    if (history.length === 0) {
      toast('Sem conflitos resolvidos automaticamente at\u00e9 agora.', { icon: 'i' });
      return;
    }

    const preview = history
      .slice(0, 3)
      .map((item) => `${new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${item.detail}`)
      .join('\n');

    toast(preview, { duration: 5000, icon: <Puzzle className="w-4 h-4" /> });
  }, []);

  const syncStatusMeta = React.useMemo(() => {
    if (!syncUiStatus.isOnline) {
      return { label: 'Offline', tone: 'warning' as const };
    }

    if (syncUiStatus.isSyncing) {
      return { label: 'Sincronizando...', tone: 'neutral' as const };
    }

    if (syncUiStatus.lastError) {
      return { label: 'Erro de sync', tone: 'danger' as const };
    }

    if (syncUiStatus.pendingCount > 0) {
      return { label: `${syncUiStatus.pendingCount} pendente(s)`, tone: 'warning' as const };
    }

    return { label: 'Sincronizado', tone: 'success' as const };
  }, [syncUiStatus]);
  const resolvedOnboardingMeta = React.useMemo<OnboardingCompletionMeta | null>(() => {
    if (activeStudyContext) {
      return buildOnboardingMetaFromStudyContext(activeStudyContext);
    }

    return smartScheduleOnboardingMeta;
  }, [activeStudyContext, smartScheduleOnboardingMeta]);
  const resolvedStudyContextMode = React.useMemo<StudyContextMode>(() => {
    if (activeStudyContext?.mode) {
      return activeStudyContext.mode;
    }

    if (resolvedOnboardingMeta?.focus) {
      return resolvedOnboardingMeta.focus;
    }

    return mapPreferredTrackToOnboardingFocus(preferredStudyTrack);
  }, [activeStudyContext?.mode, preferredStudyTrack, resolvedOnboardingMeta?.focus]);
  const usesLegacyBeginnerBootstrap = React.useMemo(
    () => shouldUseLegacyBeginnerBootstrap(resolvedStudyContextMode),
    [resolvedStudyContextMode],
  );
  const studyShellTabs = React.useMemo(
    () => getTabsForMode(resolvedStudyContextMode),
    [resolvedStudyContextMode],
  );
  const homeProfileContext = React.useMemo<HomeTrackContext>(() => {
    const profile: HomeTrackContext['profile'] = activeStudyContext?.mode
      ? activeStudyContext.mode
      : resolvedOnboardingMeta?.focus
        ? resolvedOnboardingMeta.focus
        : preferredStudyTrack === 'concursos'
          ? 'concurso'
          : preferredStudyTrack;

    return {
      profile,
      summaryTitle: activeStudyContext?.contextSummary || resolvedOnboardingMeta?.contextSummary || profileExamGoal,
      summaryDescription: activeStudyContext?.contextDescription || resolvedOnboardingMeta?.contextDescription || null,
      examGoal: profileExamGoal,
      examDate: profileExamDate || null,
      enem: resolvedOnboardingMeta?.enem
        ? {
          targetCollege: resolvedOnboardingMeta.enem.targetCollege,
          targetCourse: resolvedOnboardingMeta.enem.targetCourse,
        }
        : null,
      concurso: resolvedOnboardingMeta?.concurso
        ? {
          name: resolvedOnboardingMeta.concurso.nome,
          board: resolvedOnboardingMeta.concurso.banca,
          area: resolvedOnboardingMeta.concurso.area,
        }
        : null,
      faculdade: resolvedOnboardingMeta?.faculdade
        ? {
          institution: resolvedOnboardingMeta.faculdade.institution,
          course: resolvedOnboardingMeta.faculdade.course,
          semester: resolvedOnboardingMeta.faculdade.semester,
          focus: resolvedOnboardingMeta.faculdade.focus,
        }
        : null,
      outros: resolvedOnboardingMeta?.outros
        ? {
          goalTitle: resolvedOnboardingMeta.outros.goalTitle,
          focus: resolvedOnboardingMeta.outros.focus,
          deadline: resolvedOnboardingMeta.outros.deadline,
        }
        : null,
      hibrido: resolvedOnboardingMeta?.hibrido
        ? {
          primaryFocus: resolvedOnboardingMeta.hibrido.primaryFocus,
        }
        : null,
    };
  }, [activeStudyContext?.contextDescription, activeStudyContext?.contextSummary, activeStudyContext?.mode, preferredStudyTrack, profileExamDate, profileExamGoal, resolvedOnboardingMeta]);
  const planoProfileContext = React.useMemo<PlanoTrackContext>(() => ({
    profile: homeProfileContext.profile,
    summaryTitle: activeStudyContext?.contextSummary || resolvedOnboardingMeta?.contextSummary || profileExamGoal,
    summaryDescription: activeStudyContext?.contextDescription || resolvedOnboardingMeta?.contextDescription || null,
    examGoal: profileExamGoal,
    examDate: profileExamDate || null,
    enem: resolvedOnboardingMeta?.enem
      ? {
        targetCollege: resolvedOnboardingMeta.enem.targetCollege,
        targetCourse: resolvedOnboardingMeta.enem.targetCourse,
        triedBefore: resolvedOnboardingMeta.enem.triedBefore,
        profileLevel: resolvedOnboardingMeta.enem.profileLevel,
      }
      : null,
    concurso: resolvedOnboardingMeta?.concurso
      ? {
        name: resolvedOnboardingMeta.concurso.nome,
        board: resolvedOnboardingMeta.concurso.banca,
        area: resolvedOnboardingMeta.concurso.area,
        examDate: resolvedOnboardingMeta.concurso.examDate || null,
        planningWithoutDate: resolvedOnboardingMeta.concurso.planningWithoutDate ?? null,
        experienceLevel: resolvedOnboardingMeta.concurso.experienceLevel ?? null,
      }
      : null,
    faculdade: resolvedOnboardingMeta?.faculdade
      ? {
        institution: resolvedOnboardingMeta.faculdade.institution,
        course: resolvedOnboardingMeta.faculdade.course,
        semester: resolvedOnboardingMeta.faculdade.semester,
        focus: resolvedOnboardingMeta.faculdade.focus,
      }
      : null,
    outros: resolvedOnboardingMeta?.outros
      ? {
        goalTitle: resolvedOnboardingMeta.outros.goalTitle,
        focus: resolvedOnboardingMeta.outros.focus,
        deadline: resolvedOnboardingMeta.outros.deadline,
      }
      : null,
    hibrido: resolvedOnboardingMeta?.hibrido
      ? {
        primaryFocus: resolvedOnboardingMeta.hibrido.primaryFocus,
        availableStudyTime: resolvedOnboardingMeta.hibrido.availableStudyTime,
        concursoExamDate: resolvedOnboardingMeta.hibrido.concursoExamDate,
      }
      : null,
  }), [activeStudyContext?.contextDescription, activeStudyContext?.contextSummary, homeProfileContext.profile, profileExamDate, profileExamGoal, resolvedOnboardingMeta]);
  const profileTrackContext = React.useMemo<ProfileTrackContext>(() => ({
    profile: homeProfileContext.profile,
    summaryTitle: activeStudyContext?.contextSummary || resolvedOnboardingMeta?.contextSummary || profileExamGoal,
    summaryDescription: activeStudyContext?.contextDescription || resolvedOnboardingMeta?.contextDescription || null,
    examGoal: profileExamGoal,
    examDate: profileExamDate || null,
    enem: resolvedOnboardingMeta?.enem
      ? {
        targetCollege: resolvedOnboardingMeta.enem.targetCollege,
        targetCourse: resolvedOnboardingMeta.enem.targetCourse,
        triedBefore: resolvedOnboardingMeta.enem.triedBefore,
        profileLevel: resolvedOnboardingMeta.enem.profileLevel,
      }
      : null,
    concurso: resolvedOnboardingMeta?.concurso
      ? {
        name: resolvedOnboardingMeta.concurso.nome,
        board: resolvedOnboardingMeta.concurso.banca,
        area: resolvedOnboardingMeta.concurso.area,
        examDate: resolvedOnboardingMeta.concurso.examDate || null,
        planningWithoutDate: resolvedOnboardingMeta.concurso.planningWithoutDate ?? null,
        experienceLevel: resolvedOnboardingMeta.concurso.experienceLevel ?? null,
      }
      : null,
    faculdade: resolvedOnboardingMeta?.faculdade
      ? {
        institution: resolvedOnboardingMeta.faculdade.institution,
        course: resolvedOnboardingMeta.faculdade.course,
        semester: resolvedOnboardingMeta.faculdade.semester,
        focus: resolvedOnboardingMeta.faculdade.focus,
      }
      : null,
    outros: resolvedOnboardingMeta?.outros
      ? {
        goalTitle: resolvedOnboardingMeta.outros.goalTitle,
        focus: resolvedOnboardingMeta.outros.focus,
        deadline: resolvedOnboardingMeta.outros.deadline,
      }
      : null,
    hibrido: resolvedOnboardingMeta?.hibrido
      ? {
        primaryFocus: resolvedOnboardingMeta.hibrido.primaryFocus,
        availableStudyTime: resolvedOnboardingMeta.hibrido.availableStudyTime,
        concursoExamDate: resolvedOnboardingMeta.hibrido.concursoExamDate,
      }
      : null,
  }), [activeStudyContext?.contextDescription, activeStudyContext?.contextSummary, homeProfileContext.profile, profileExamDate, profileExamGoal, resolvedOnboardingMeta]);

  useEffect(() => {
    if (!isLoggedIn || !user?.email) {
      return;
    }

    const migrateLegacyKey = (legacyKey: string, scopedKey: string) => {
      const scopedValue = window.localStorage.getItem(scopedKey);
      if (scopedValue !== null) {
        return;
      }

      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        window.localStorage.setItem(scopedKey, legacyValue);
      }
    };

    migrateLegacyKey('selectedStudyMethodId', `selectedStudyMethodId_${userStorageScope}`);
    migrateLegacyKey('academyCompletedContentIds', `academyCompletedContentIds_${userStorageScope}`);
    migrateLegacyKey('activeStudyMode', `activeStudyMode_${userStorageScope}`);
    migrateLegacyKey('preferredStudyTrack', `preferredStudyTrack_${userStorageScope}`);
    migrateLegacyKey('hybridEnemWeight', `hybridEnemWeight_${userStorageScope}`);
    migrateLegacyKey('weeklyGoalMinutes', `weeklyGoalMinutes_${userStorageScope}`);
    migrateLegacyKey('profileDisplayName', `profileDisplayName_${userStorageScope}`);
    migrateLegacyKey('profileAvatar', `profileAvatar_${userStorageScope}`);
    migrateLegacyKey('profileExamGoal', `profileExamGoal_${userStorageScope}`);
    migrateLegacyKey('profileExamDate', `profileExamDate_${userStorageScope}`);
    migrateLegacyKey('lastProfileSavedAt', `lastProfileSavedAt_${userStorageScope}`);
    migrateLegacyKey('profileChangeHistory', `profileChangeHistory_${userStorageScope}`);
  }, [isLoggedIn, user?.email, userStorageScope]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (authLoading) {
      setBeginnerScopedStorage({
        scope: userStorageScope,
        ready: false,
        hasPlan: false,
        hasState: false,
        hasStats: false,
      });
      return;
    }

    if (!isLoggedIn || !user?.email) {
      setBeginnerScopedStorage({
        scope: userStorageScope,
        ready: false,
        hasPlan: false,
        hasState: false,
        hasStats: false,
      });
      return;
    }

    setBeginnerScopedStorage({
      scope: userStorageScope,
      ready: true,
      hasPlan: window.localStorage.getItem(`beginnerPlan_${userStorageScope}`) !== null,
      hasState: window.localStorage.getItem(`beginnerState_${userStorageScope}`) !== null,
      hasStats: window.localStorage.getItem(`beginnerStats_${userStorageScope}`) !== null,
    });
  }, [authLoading, isLoggedIn, user?.email, userStorageScope]);

  const isBeginnerScopedStorageReady =
    beginnerScopedStorage.ready && beginnerScopedStorage.scope === userStorageScope;
  const hasPersistedBeginnerState = isBeginnerScopedStorageReady && beginnerScopedStorage.hasState;
  const hasPersistedBeginnerPlan = isBeginnerScopedStorageReady && beginnerScopedStorage.hasPlan;
  const hasPersistedBeginnerStats = isBeginnerScopedStorageReady && beginnerScopedStorage.hasStats;
  const hasPersistedBeginnerBootstrap =
    hasPersistedBeginnerPlan || hasPersistedBeginnerState || hasPersistedBeginnerStats;

  useEffect(() => {
    if (studyContextBootstrapStatus === 'loading') {
      return;
    }

    if (!isLoggedIn || !user?.email) {
      setShowOnboarding(false);
      if (beginnerPlan !== null) {
        setBeginnerPlan(null);
      }
      if (beginnerState !== null) {
        setBeginnerState(null);
      }
      if (beginnerStats !== null) {
        setBeginnerStats(null);
      }
      clearLegacyBeginnerBootstrapStorage();
      return;
    }

    const onboardingKey = `mdzOnboardingCompleted_${user.email}`;
    const completed = window.localStorage.getItem(onboardingKey) === 'true' || Boolean(activeStudyContext);
    setShowOnboarding(!completed);

    if (!isBeginnerScopedStorageReady) {
      return;
    }

    if (hasPersistedBeginnerState && beginnerState === null) {
      return;
    }

    setBeginnerState((prev) => {
      if (!completed) {
        return 'onboarding';
      }

      if (!usesLegacyBeginnerBootstrap) {
        return null;
      }

      return beginnerFlowService.syncState(beginnerPlan, prev) ?? 'ready_for_first_session';
    });

    if (completed && !usesLegacyBeginnerBootstrap) {
      clearLegacyBeginnerBootstrapStorage();
    }
  }, [
    activeStudyContext,
    beginnerPlan,
    beginnerState,
    beginnerStats,
    clearLegacyBeginnerBootstrapStorage,
    hasPersistedBeginnerState,
    isBeginnerScopedStorageReady,
    isLoggedIn,
    setBeginnerPlan,
    setBeginnerState,
    setBeginnerStats,
    studyContextBootstrapStatus,
    usesLegacyBeginnerBootstrap,
    user?.email,
  ]);

  useEffect(() => {
    if (!isLoggedIn || showOnboarding || usesLegacyBeginnerBootstrap) {
      return;
    }

    if (beginnerPlan !== null) {
      setBeginnerPlan(null);
    }

    if (beginnerState !== null) {
      setBeginnerState(null);
    }

    if (beginnerStats !== null) {
      setBeginnerStats(null);
    }

    clearLegacyBeginnerBootstrapStorage();

    if (lastBeginnerResult !== null) {
      setLastBeginnerResult(null);
    }

    setShowBeginnerWeekSummary(false);
    setShowIntermediateUnlockBanner(false);
  }, [
    beginnerPlan,
    beginnerState,
    beginnerStats,
    clearLegacyBeginnerBootstrapStorage,
    isLoggedIn,
    lastBeginnerResult,
    setBeginnerPlan,
    setBeginnerState,
    setBeginnerStats,
    showOnboarding,
    usesLegacyBeginnerBootstrap,
  ]);

  useEffect(() => {
    if (!isLoggedIn || showOnboarding || studyContextBootstrapStatus === 'loading') {
      return;
    }

    const nextRouteKey = `${userStorageScope}:${resolvedStudyContextMode}`;
    if (lastStudyContextRouteRef.current === nextRouteKey) {
      return;
    }

    lastStudyContextRouteRef.current = nextRouteKey;
    setActiveTab(getInitialRouteForMode(resolvedStudyContextMode));
  }, [isLoggedIn, resolvedStudyContextMode, setActiveTab, showOnboarding, studyContextBootstrapStatus, userStorageScope]);

  useEffect(() => {
    if (!beginnerPlan || beginnerState === 'onboarding' || !isLoggedIn || !isBeginnerScopedStorageReady) {
      return;
    }

    if (hasPersistedBeginnerState && beginnerState === null) {
      return;
    }

    const syncedState = beginnerFlowService.syncState(beginnerPlan, beginnerState);
    if (syncedState && syncedState !== beginnerState) {
      setBeginnerState(syncedState);
    }
  }, [
    beginnerPlan,
    beginnerState,
    hasPersistedBeginnerState,
    isBeginnerScopedStorageReady,
    isLoggedIn,
    setBeginnerState,
  ]);

  useEffect(() => {
    if (!isLoggedIn || showOnboarding || beginnerPlan || !isBeginnerScopedStorageReady || !usesLegacyBeginnerBootstrap) {
      return;
    }

    if (hasPersistedBeginnerBootstrap) {
      return;
    }

    const dailyGoal = Math.max(30, userData.dailyGoal || INITIAL_USER_DATA.dailyGoal);
    const beginnerTrack: StudyTrack = preferredStudyTrack === 'hibrido'
      ? 'hibrido'
      : preferredStudyTrack === 'concursos'
        ? 'concursos'
        : 'enem';
    const beginnerSetup = beginnerFlowService.completeOnboarding(beginnerTrack, dailyGoal);

    setBeginnerPlan(beginnerSetup.plan);
    setBeginnerState((previous) => beginnerFlowService.syncState(beginnerSetup.plan, previous) ?? beginnerSetup.state);
    setBeginnerStats((previous) =>
      beginnerProgressService.completeOnboarding(
        previous,
        beginnerTrack,
        Math.max(30, Math.min(120, dailyGoal)) as 30 | 60 | 120,
      ),
    );
  }, [
    beginnerPlan,
    hasPersistedBeginnerBootstrap,
    isBeginnerScopedStorageReady,
    isLoggedIn,
    preferredStudyTrack,
    setBeginnerPlan,
    setBeginnerState,
    setBeginnerStats,
    showOnboarding,
    usesLegacyBeginnerBootstrap,
    userStorageScope,
    userData.dailyGoal,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !beginnerPlan || beginnerStats || !isBeginnerScopedStorageReady) {
      return;
    }

    if (hasPersistedBeginnerStats) {
      return;
    }

    setBeginnerStats(beginnerProgressService.createInitialStats());
  }, [
    beginnerPlan,
    beginnerStats,
    hasPersistedBeginnerStats,
    isBeginnerScopedStorageReady,
    isLoggedIn,
    setBeginnerStats,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !beginnerPlan || activeTab !== 'inicio' || showOnboarding || lastBeginnerResult || showBeginnerWeekSummary) {
      return;
    }

    const mission = beginnerFlowService.getTodayMission(beginnerPlan);
    if (!mission) {
      return;
    }

    const nextKey = `${mission.id}:${beginnerState || 'unknown'}`;
    if (lastMissionViewKeyRef.current === nextKey) {
      return;
    }

    lastMissionViewKeyRef.current = nextKey;
    trackBeginnerEvent('beginner_mission_viewed', {
      day: mission.dayNumber,
      missionId: mission.id,
      state: beginnerState,
      target: mission.target,
    });
  }, [activeTab, beginnerPlan, beginnerState, isLoggedIn, lastBeginnerResult, showBeginnerWeekSummary, showOnboarding, trackBeginnerEvent]);

  useEffect(() => {
    if (activeTab !== 'questoes' && activeTab !== 'simulado') {
      lastQuestionsStartKeyRef.current = null;
      return;
    }

    if (!isLoggedIn || !beginnerPlan) {
      return;
    }

    const mission = beginnerFlowService.getTodayMission(beginnerPlan);
    if (!mission) {
      return;
    }

    const nextKey = `${activeTab}:${mission.id}:${quizPrefilter?.nonce || 'default'}`;
    if (lastQuestionsStartKeyRef.current === nextKey) {
      return;
    }

    lastQuestionsStartKeyRef.current = nextKey;
    trackBeginnerEvent('beginner_questions_started', {
      day: mission.dayNumber,
      missionId: mission.id,
      subject: quizPrefilter?.subject || mission.tasks[0]?.discipline || mission.focus,
      topic: quizPrefilter?.topicName || mission.tasks[0]?.topic || null,
      target: activeTab === 'simulado' ? 'simulado' : mission.target,
    });
  }, [activeTab, beginnerPlan, isLoggedIn, quizPrefilter, trackBeginnerEvent]);

  useEffect(() => {
    if (!isLoggedIn || !lastBeginnerResult) {
      return;
    }

    const nextKey = lastBeginnerResult.completedMissionId;
    if (lastPostSessionViewKeyRef.current === nextKey) {
      return;
    }

    lastPostSessionViewKeyRef.current = nextKey;
    trackBeginnerEvent('beginner_post_session_viewed', {
      completedMissionId: lastBeginnerResult.completedMissionId,
      nextMissionId: lastBeginnerResult.nextMissionId || null,
      totalQuestions: typeof lastBeginnerResult.totalQuestions === 'number' ? lastBeginnerResult.totalQuestions : null,
      correctAnswers: typeof lastBeginnerResult.correctAnswers === 'number' ? lastBeginnerResult.correctAnswers : null,
    });
  }, [isLoggedIn, lastBeginnerResult, trackBeginnerEvent]);

  useEffect(() => {
    if (!isLoggedIn || !officialStudyResult || !officialStudyResultMeta?.isFirstSession) {
      return;
    }

    const nextKey = officialStudyResult.sessionId;
    if (lastOfficialPostSessionViewKeyRef.current === nextKey) {
      return;
    }

    lastOfficialPostSessionViewKeyRef.current = nextKey;
    trackBeginnerEvent('beginner_post_session_viewed', {
      completedMissionId: officialStudyResultMeta.beginnerMissionId || officialStudyResult.sessionId,
      nextMissionId: officialStudyResultMeta.nextMissionId || null,
      totalQuestions: officialStudyResultMeta.totalQuestions ?? officialStudyResult.total,
      correctAnswers: officialStudyResult.correct,
      source: 'official_post_session',
    });
  }, [isLoggedIn, officialStudyResult, officialStudyResultMeta, trackBeginnerEvent]);

  useEffect(() => {
    if (!isLoggedIn || !beginnerStats) {
      return;
    }

    if (!beginnerProgressService.shouldTrackReturnNextDay(beginnerStats)) {
      return;
    }

    const nextStats = beginnerProgressService.recordReturnedNextDay(beginnerStats);
    setBeginnerStats(nextStats);
    trackBeginnerEvent('beginner_returned_next_day', {
      day: nextStats.activeDates.length + 1,
      streak: nextStats.streak,
    });

    if (nextStats.progressStage === 'ready_for_intermediate') {
      trackIntermediateEvent('intermediate_returned_next_day', {
        day: nextStats.activeDates.length + 1,
        streak: nextStats.streak,
      });
    }
  }, [beginnerStats, isLoggedIn, setBeginnerStats, trackBeginnerEvent, trackIntermediateEvent]);

  useEffect(() => {
    if (!beginnerProgressService.shouldShowWeekSummary(beginnerStats)) {
      return;
    }

    setShowBeginnerWeekSummary(true);
  }, [beginnerStats]);

  useEffect(() => {
    if (!isLoggedIn || !showBeginnerWeekSummary || !beginnerStats) {
      return;
    }

    const nextKey = `${beginnerStats.sessionsCompleted}:${beginnerStats.progressStage}`;
    if (lastWeekSummaryViewKeyRef.current === nextKey) {
      return;
    }

    lastWeekSummaryViewKeyRef.current = nextKey;
    trackBeginnerEvent('beginner_week_summary_viewed', {
      sessionsCompleted: beginnerStats.sessionsCompleted,
      progressStage: beginnerStats.progressStage,
      returnedNextDayCount: beginnerStats.returnedNextDayCount,
    });
  }, [beginnerStats, isLoggedIn, showBeginnerWeekSummary, trackBeginnerEvent]);

  useEffect(() => {
    if (!isLoggedIn || !beginnerState || beginnerState === 'week_complete') {
      return;
    }

    const resolveDropStep = (): 'onboarding' | 'session' | 'questions' | 'post_session' | null => {
      if (showOnboarding) return 'onboarding';
      if (lastBeginnerResult) return 'post_session';
      if (activeTab === 'questoes' || activeTab === 'simulado') return 'questions';
      if (activeTab === 'foco' && beginnerState === 'in_session') return 'session';
      return null;
    };

    const handleBeforeUnload = () => {
      const dropStep = resolveDropStep();
      if (!dropStep) return;

      setBeginnerStats((previous) => beginnerProgressService.recordDropOff(previous, dropStep));
      trackBeginnerEvent('beginner_dropped_at', {
        step: dropStep,
        day: beginnerFlowService.getTodayMission(beginnerPlan)?.dayNumber || 1,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTab, beginnerPlan, beginnerState, isLoggedIn, lastBeginnerResult, setBeginnerStats, showOnboarding, trackBeginnerEvent]);

  const handleFinishStudySession = React.useCallback(
    (minutes: number, subject: MateriaTipo, methodId?: string) => {
      const keepContinuousPomodoroFlow = activeStudyMode === 'pomodoro' && Boolean(methodId);
      const points = minutes * 10;
      const currentIntermediateStage = beginnerProgressService.evaluateBeginnerState(beginnerStats);
      const existingSessions = userData.sessions || userData.studyHistory || [];
      const completedFocusSubjectLabel =
        getCycleDisciplineLabels(preferredStudyTrack, hybridEnemWeight)[subject]?.label
        || effectiveStudyExecutionState.currentBlock.subject;
      const previousWeeklyRetention = buildWeeklyRetentionSnapshot(existingSessions);
      const isFirstSession = existingSessions.length === 0;
      const newSession = {
        date: new Date().toISOString(),
        minutes,
        points,
        subject,
        duration: minutes,
        methodId,
        topic: effectiveStudyExecutionState.currentBlock.topicName || effectiveStudyExecutionState.currentBlock.objective,
        topicName: effectiveStudyExecutionState.currentBlock.topicName || effectiveStudyExecutionState.currentBlock.objective,
      };
      const nextWeeklyRetention = buildWeeklyRetentionSnapshot([...existingSessions, newSession]);
      const nextTodaySessionCount = [...existingSessions, newSession].filter((session) => {
        const sessionDate = typeof session.date === 'string' ? session.date : '';
        return sessionDate.slice(0, 10) === newSession.date.slice(0, 10);
      }).length;
      if (!keepContinuousPomodoroFlow) {
        setQuestionsExecutionState(
          {
            subject: completedFocusSubjectLabel,
            topicName: effectiveStudyExecutionState.currentBlock.topicName,
            objective: `Validar ${completedFocusSubjectLabel} com pratica recomendada.`,
            targetQuestions: effectiveStudyExecutionState.currentBlock.targetQuestions ?? 10,
          },
          effectiveStudyExecutionState.source,
        );
      }
      if (!isBeginnerFocus && !keepContinuousPomodoroFlow) {
        setLastCompletedFocus({
          subject: completedFocusSubjectLabel,
          topicName: effectiveStudyExecutionState.currentBlock.topicName,
          duration: minutes,
          targetQuestions: effectiveStudyExecutionState.currentBlock.targetQuestions ?? 10,
          todaySessionCount: nextTodaySessionCount,
          completedAt: newSession.date,
        });
        setStudyFlowStep('focusCompleted');
      }

      setUserData((prev) => xpEngineService.applyStudySessions(prev, [newSession]));
      toast.success(`Boa. +${minutes} min focado. Agora valide com questoes e siga em ${nextWeeklyRetention.studiedDays}/${nextWeeklyRetention.targetDays} dias da semana.`, {
        duration: 5000
      });

      trackEvent(
        'study_session_completed',
        {
          minutes,
          subject,
          methodId: methodId || null,
          points,
          weeklyDaysCompleted: nextWeeklyRetention.studiedDays,
          weeklyTarget: nextWeeklyRetention.targetDays,
          weeklyMaintained: nextWeeklyRetention.isMaintained,
        },
        { userEmail: user?.email },
      );

      if (pendingHeroAttribution) {
        const attributionWindowMs = 3 * 60 * 60 * 1000;
        const elapsedMs = Date.now() - pendingHeroAttribution.clickedAt;
        if (elapsedMs >= 0 && elapsedMs <= attributionWindowMs) {
          trackEvent(
            'home_hero_completion',
            {
              source: 'hero_cta',
              variant: pendingHeroAttribution.variant,
              minutes,
              subject,
              methodId: methodId || null,
              ts: Date.now(),
            },
            { userEmail: user?.email },
          );
        }
        setPendingHeroAttribution(null);
      }

      const progressedWeek = nextWeeklyRetention.studiedDays > previousWeeklyRetention.studiedDays;
      if (progressedWeek) {
        trackEvent(
          'weekly_streak_progress',
          {
            weekStart: nextWeeklyRetention.weekStart,
            daysCompleted: nextWeeklyRetention.studiedDays,
            targetDays: nextWeeklyRetention.targetDays,
          },
          { userEmail: user?.email },
        );

        if (nextWeeklyRetention.studiedDays === 1) {
          toast('Você começou sua semana de estudos (1/4).', { icon: <Sprout className="w-4 h-4" /> });
        } else if (nextWeeklyRetention.studiedDays === 2) {
          toast('Ótimo ritmo! Você já está em 2/4 dias da missão semanal.', { icon: <Target className="w-4 h-4" /> });
        } else if (nextWeeklyRetention.studiedDays === 3) {
          toast('Você está consistente! Falta 1 dia para manter a sequência semanal.', { icon: <Flame className="w-4 h-4" /> });
        }
      }

      if (!previousWeeklyRetention.isMaintained && nextWeeklyRetention.isMaintained) {
        trackEvent(
          'weekly_streak_completed',
          {
            weekStart: nextWeeklyRetention.weekStart,
            daysCompleted: nextWeeklyRetention.studiedDays,
          },
          { userEmail: user?.email },
        );
        toast.success('Semana garantida! Você fechou 4/4 dias de estudo.', { duration: 5000 });
      }

      if (isFirstSession) {
        trackEvent(
          'primeira_sessao_concluida',
          {
            minutes,
            subject,
            methodId: methodId || null,
            points,
          },
          { userEmail: user?.email }
        );
      }

      if (currentIntermediateStage === 'ready_for_intermediate') {
        trackIntermediateEvent('intermediate_day_plan_completed', {
          minutes,
          subject,
          methodId: methodId || null,
          points,
          weeklyMaintained: nextWeeklyRetention.isMaintained,
        });
        try {
          sessionStorage.setItem('zb_intermediate_plan_completed_at', newSession.date);
        } catch {
          // ignore session storage failures
        }
      }

      if (beginnerPlan) {
        const currentMission = beginnerFlowService.getTodayMission(beginnerPlan);
        const beginnerProgress = beginnerFlowService.submitSession({
          plan: beginnerPlan,
          completedAt: newSession.date,
        });
        setBeginnerPlan(beginnerProgress.plan);
        setBeginnerState(beginnerProgress.state);
        setBeginnerStats((prev) =>
          beginnerProgressService.recordSessionCompleted(prev, {
            day: currentMission?.dayNumber || beginnerProgress.completedMission?.dayNumber || 1,
            duration: minutes,
            completed: true,
            at: newSession.date,
          }),
        );

        if (beginnerProgress.completedMission) {
          setLastBeginnerResult({
            completedMissionId: beginnerProgress.completedMission.id,
            nextMissionId: beginnerProgress.nextMission?.id,
            completedMissionLabel: `${beginnerProgress.completedMission.dayLabel} • ${beginnerProgress.completedMission.focus}`,
            nextMissionLabel: beginnerProgress.nextMission
              ? `${beginnerProgress.nextMission.dayLabel} • ${beginnerProgress.nextMission.focus}`
              : undefined,
            totalQuestions: beginnerProgress.completedMission.questionCount,
            xpGained: points,
            isFirstSession: beginnerProgress.completedMission.dayNumber === 1,
          });
          setActiveTab('inicio');

          trackEvent(
            'beginner_mission_completed',
            {
              missionId: beginnerProgress.completedMission.id,
              dayNumber: beginnerProgress.completedMission.dayNumber,
              nextMissionId: beginnerProgress.nextMission?.id || null,
            },
            { userEmail: user?.email },
          );
          trackBeginnerEvent('beginner_session_completed', {
            day: beginnerProgress.completedMission.dayNumber,
            missionId: beginnerProgress.completedMission.id,
            nextMissionId: beginnerProgress.nextMission?.id || null,
            duration: minutes,
            completed: true,
          });
        }
      }

      if (isSupabaseConfigured && supabaseUserId) {
        void sessionService
          .create(supabaseUserId, newSession)
          .then(() => weeklyStreakService.recordStudyDay(supabaseUserId, newSession.date, 4))
          .catch(() => {
            toast.error('Falha ao salvar na nuvem. Seus dados continuam salvos localmente.');
          });
      }
    },
    [
      beginnerPlan,
      beginnerStats,
      activeStudyMode,
      effectiveStudyExecutionState.currentBlock.subject,
      effectiveStudyExecutionState.currentBlock.targetQuestions,
      effectiveStudyExecutionState.currentBlock.topicName,
      effectiveStudyExecutionState.source,
      hybridEnemWeight,
      isBeginnerFocus,
      pendingHeroAttribution,
      preferredStudyTrack,
      setActiveTab,
      setBeginnerPlan,
      setBeginnerState,
      setBeginnerStats,
      setQuestionsExecutionState,
      setUserData,
      supabaseUserId,
      trackBeginnerEvent,
      trackIntermediateEvent,
      userData,
    ]
  );

  const handleImportData = React.useCallback((data: UserData) => {
    setUserData(data);
  }, [setUserData]);

  const handleCompleteOnboarding = React.useCallback(
    async ({
      dailyGoal,
      methodId,
      smartProfile,
      onboardingMeta,
    }: {
      dailyGoal: number;
      methodId: string;
      smartProfile: SmartScheduleProfile;
      onboardingMeta?: OnboardingCompletionMeta;
    }) => {
      const nextMode = onboardingMeta?.focus || resolvedStudyContextMode;
      const shouldBootstrapLegacyMode = shouldUseLegacyBeginnerBootstrap(nextMode);
      const studyContextInput: PersistStudyContextInput | null = onboardingMeta
        ? buildStudyContextInputFromOnboarding(onboardingMeta)
        : null;
      if (user?.email) {
        const onboardingKey = `mdzOnboardingCompleted_${user.email}`;
        window.localStorage.setItem(onboardingKey, 'true');
        window.localStorage.setItem(`smartScheduleAutoGenerate_${user.email.toLowerCase()}`, 'true');
        window.localStorage.setItem(`smartScheduleAutoGenerate_${supabaseUserId || 'default'}`, 'true');
        window.localStorage.setItem(`smartScheduleProfile_${supabaseUserId || 'default'}`, JSON.stringify(smartProfile));
        if (onboardingMeta) {
          window.localStorage.setItem(`smartScheduleOnboardingMeta_${supabaseUserId || 'default'}`, JSON.stringify(onboardingMeta));
        }
      }

      trackEvent(
        'onboarding_completed',
        {
          dailyGoal,
          methodId,
          examDate: smartProfile.examDate,
          examName: smartProfile.examName,
          availableDays: smartProfile.availableWeekDays.length,
        },
        {
          userEmail: user?.email,
        }
      );

      const legacyTrackFromContext = onboardingMeta?.focus
        ? resolveLegacyTrackFromStudyContextMode(onboardingMeta.focus)
        : null;
      const beginnerTrack: StudyTrack = legacyTrackFromContext || preferredStudyTrack;
      const beginnerSetup = shouldBootstrapLegacyMode
        ? beginnerFlowService.completeOnboarding(beginnerTrack, dailyGoal)
        : null;
      const personalizedBeginnerPlan = beginnerSetup
        ? personalizeStarterPlan(beginnerSetup.plan, onboardingMeta?.focus, smartProfile)
        : null;
      const nextBeginnerStats = shouldBootstrapLegacyMode
        ? beginnerProgressService.completeOnboarding(
            beginnerStats,
            beginnerTrack,
            Math.max(30, Math.min(120, dailyGoal)) as 30 | 60 | 120,
          )
        : null;

      setUserData((prev) => ({
        ...prev,
        dailyGoal,
      }));
      setSmartScheduleOnboardingMeta(onboardingMeta || null);
      setProfileExamGoal(resolveProfileExamGoalFromOnboarding(onboardingMeta));
      setProfileExamDate(smartProfile.examDate || '');
      if (legacyTrackFromContext) {
        setPreferredStudyTrack(legacyTrackFromContext);
      }
      setSelectedMethodId(methodId);
      setBeginnerPlan(personalizedBeginnerPlan);
      setBeginnerStats(nextBeginnerStats);
      setBeginnerState(
        beginnerSetup
          ? beginnerFlowService.syncState(personalizedBeginnerPlan, beginnerSetup.state) ?? beginnerSetup.state
          : null,
      );
      if (!shouldBootstrapLegacyMode) {
        clearLegacyBeginnerBootstrapStorage();
      }
      setLastBeginnerResult(null);
      setShowIntermediateUnlockBanner(false);
      setActiveStudyMode('pomodoro');

      if (shouldBootstrapLegacyMode) {
        trackBeginnerEvent('onboarding_completed', {
          focus: beginnerTrack,
          timeAvailable: Math.max(30, Math.min(120, dailyGoal)),
        });
      }

      if (studyContextInput) {
        try {
          await persistActiveStudyContext(studyContextInput);
        } catch {
          toast('Contexto salvo localmente. A sincronizacao do novo modo sera retomada automaticamente.');
        }
      } else {
        setActiveStudyContext(null);
      }

      setActiveTab(getInitialRouteForMode(onboardingMeta?.focus || resolvedStudyContextMode));
      setShowOnboarding(false);
      toast.success(
        shouldBootstrapLegacyMode
          ? 'Modo iniciante liberado. Sua 1a missao ja esta pronta.'
          : 'Contexto salvo. Seu shell nativo ja esta pronto.',
      );

      if (supabaseUserId && isSupabaseConfigured) {
        void saasPlanningService
          .upsertProfile(supabaseUserId, smartProfile)
          .then(() => saasPlanningService.upsertSubjectLevels(supabaseUserId, smartProfile.subjectDifficulty))
          .catch(() => {
            toast('Perfil SaaS salvo localmente. A sincronização com a nuvem será retomada automaticamente.');
          });
      }
    },
    [
      beginnerStats,
      clearLegacyBeginnerBootstrapStorage,
      persistActiveStudyContext,
      preferredStudyTrack,
      resolvedStudyContextMode,
      setActiveStudyContext,
      setActiveStudyMode,
      setBeginnerPlan,
      setBeginnerState,
      setBeginnerStats,
      setPreferredStudyTrack,
      setProfileExamDate,
      setProfileExamGoal,
      setSelectedMethodId,
      setUserData,
      setSmartScheduleOnboardingMeta,
      supabaseUserId,
      trackBeginnerEvent,
      user?.email,
    ]
  );

  const handleCompleteBeginnerAssessment = React.useCallback(
    ({ correctAnswers, totalQuestions, xpGained }: BeginnerAssessmentResult) => {
      if (!beginnerPlan) {
        return;
      }

      const completedMission = [...beginnerPlan.missions]
        .reverse()
        .find((mission) => mission.status === 'completed');

      if (!completedMission) {
        return;
      }

      const nextMission = beginnerPlan.missions.find((mission) => mission.status === 'ready') ?? null;
      const primarySubject = completedMission.tasks[0]?.discipline || completedMission.focus;

      setLastBeginnerResult((previous) => ({
        completedMissionId: previous?.completedMissionId || completedMission.id,
        nextMissionId: previous?.nextMissionId || nextMission?.id,
        completedMissionLabel: previous?.completedMissionLabel || `${completedMission.dayLabel} • ${completedMission.focus}`,
        nextMissionLabel: nextMission ? `${nextMission.dayLabel} • ${nextMission.focus}` : undefined,
        correctAnswers,
        totalQuestions,
        xpGained: previous?.xpGained ?? xpGained,
        isFirstSession: previous?.isFirstSession ?? completedMission.dayNumber === 1,
      }));
      setBeginnerStats((previous) =>
        beginnerProgressService.recordAssessmentCompleted(previous, {
          day: completedMission.dayNumber,
          missionId: completedMission.id,
          subject: primarySubject,
          correct: correctAnswers,
          total: totalQuestions,
          xpGained,
        }),
      );
      trackBeginnerEvent('beginner_questions_completed', {
        missionId: completedMission.id,
        correct: correctAnswers,
        total: totalQuestions,
        accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
        subject: primarySubject,
        day: completedMission.dayNumber,
      });
      setActiveTab('inicio');
    },
    [beginnerPlan, setActiveTab, setBeginnerStats, trackBeginnerEvent]
  );

  const beginnerProgressStage = React.useMemo<BeginnerProgressStage>(
    () => beginnerProgressService.evaluateBeginnerState(beginnerStats),
    [beginnerStats],
  );
  const detectedProductPhase = React.useMemo<ProductPhase>(
    () => resolveDetectedProductPhase({
      mode: resolvedStudyContextMode,
      isReadyForIntermediate: beginnerProgressStage === 'ready_for_intermediate',
    }),
    [beginnerProgressStage, resolvedStudyContextMode],
  );
  const effectiveProductPhase = phaseOverride ?? detectedProductPhase;

  const beginnerToolAccessLocked =
    !isNativeStudyContextMode(resolvedStudyContextMode)
    && effectiveProductPhase === 'beginner'
    && isBeginnerFocus
    && (phaseOverride === 'beginner' || beginnerProgressStage !== 'ready_for_intermediate');
  const todayWeekday = React.useMemo(() => getWeekdayFromDate(), []);
  const effectiveStudyContextForToday = React.useMemo<StudyContextForToday>(
    () =>
      beginnerToolAccessLocked
        ? {
            state: {
              type: 'planned',
              day: todayWeekday,
              subjectLabels: [defaultExecutionBlueprint.subject],
            },
            eligibleSubjects: [defaultExecutionBlueprint.subject],
            defaultSessionDurationMinutes: defaultExecutionBlueprint.duration,
          }
        : weeklyStudyContext,
    [beginnerToolAccessLocked, defaultExecutionBlueprint.duration, defaultExecutionBlueprint.subject, todayWeekday, weeklyStudyContext],
  );
  const isStudyFlowBlockedBySchedule = !beginnerToolAccessLocked && effectiveStudyContextForToday.state.type !== 'planned';
  const currentTargetQuestions = effectiveStudyExecutionState.currentBlock.targetQuestions ?? 10;
  const showPostFocusState = !isStudyFlowBlockedBySchedule && studyFlowStep === 'focusCompleted' && Boolean(lastCompletedFocus);
  const showQuestionTransitionState = !isStudyFlowBlockedBySchedule && studyFlowStep === 'questionTransition';
  const canContinueWithQuestions = !isStudyFlowBlockedBySchedule && (lastCompletedFocus?.targetQuestions ?? 0) > 0;
  const todaySessionGoal = Math.max(
    weeklySchedule.preferences.sessionsPerDay || 1,
    lastCompletedFocus?.todaySessionCount || 1,
  );
  const postFocusPrimaryActionLabel = canContinueWithQuestions ? 'Continuar com questões' : 'Continuar estudando';
  const postFocusProgressCopy = lastCompletedFocus
    ? todaySessionGoal > 1
      ? `${lastCompletedFocus.todaySessionCount} de ${todaySessionGoal} sessões concluídas hoje`
      : '1 sessão concluída hoje'
    : 'Mais uma etapa concluída.';
  const postFocusSecondaryCopy = canContinueWithQuestions
    ? 'Agora vamos validar esse conteúdo.'
    : 'Seu cronograma não sugere questões agora. Continue no próximo bloco de foco.';
  const questionTransitionTitle = lastCompletedFocus
    ? `Preparando questões de ${getSuggestedContentPathBySubjectLabel(lastCompletedFocus.subject).shortLabel}...`
    : 'Preparando suas questões...';
  const questionTransitionDescription = lastCompletedFocus
    ? 'Mantendo o contexto do que você acabou de estudar.'
    : 'Estamos abrindo a prática do bloco que você acabou de concluir.';

  const beginnerWeekSummary = React.useMemo<BeginnerWeekSummary>(
    () => beginnerProgressService.generateWeekSummary(beginnerStats, userData.sessions || userData.studyHistory || []),
    [beginnerStats, userData.sessions, userData.studyHistory],
  );

  const attemptProtectedNavigation = React.useCallback(
    (tabId: string): boolean => {
      if (!beginnerToolAccessLocked || BEGINNER_UNLOCKED_TABS.has(tabId)) {
        setActiveTab(tabId);
        return true;
      }

      const targetLabel = BEGINNER_LOCKED_LABELS[tabId] || 'Essa area';
      trackBeginnerEvent('beginner_blocked_feature_clicked', {
        tabId,
        label: targetLabel,
        state: beginnerState,
        progressStage: beginnerProgressStage,
      });
      setLockedNavigationTarget({ tabId, label: targetLabel });
      return false;
    },
    [beginnerProgressStage, beginnerState, beginnerToolAccessLocked, setActiveTab, trackBeginnerEvent],
  );

  const completeBeginnerWeekSummary = React.useCallback(
    (action: BeginnerWeekSummaryAction | 'dismiss') => {
      trackBeginnerEvent('beginner_week_summary_completed', {
        action,
        progressStage: beginnerProgressStage,
        sessionsCompleted: beginnerStats?.sessionsCompleted || 0,
      });
      setBeginnerStats((previous) => beginnerProgressService.markWeekSummarySeen(previous));
      setShowBeginnerWeekSummary(false);
      setShowIntermediateUnlockBanner(true);
      toast.success('Voce subiu de nivel. Novas ferramentas ja foram liberadas.', {
        duration: 5000,
      });
    },
    [beginnerProgressStage, beginnerStats?.sessionsCompleted, setBeginnerStats, trackBeginnerEvent],
  );

  const handleBeginnerWeekSummaryAction = React.useCallback(
    (action: BeginnerWeekSummaryAction) => {
      completeBeginnerWeekSummary(action);

      if (action === 'explore_tools') {
        setActiveTab('dashboard');
        return;
      }

      setActiveTab('inicio');
    },
    [completeBeginnerWeekSummary, setActiveTab],
  );

  useEffect(() => {
    if (!beginnerToolAccessLocked || showOnboarding) {
      return;
    }

    if (!BEGINNER_UNLOCKED_TABS.has(activeTab)) {
      setActiveTab('inicio');
    }
  }, [activeTab, beginnerToolAccessLocked, setActiveTab, showOnboarding]);

  useEffect(() => {
    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured) {
      return;
    }

    let cancelled = false;

    const syncSessionsFromCloud = async () => {
      try {
        const remoteSessions = await sessionService.listByUser(supabaseUserId);
        if (cancelled || remoteSessions.length === 0) {
          return;
        }

        setUserData((prev) => {
          const localSessions = prev.sessions || prev.studyHistory || [];
          const localKeys = new Set(
            localSessions.map(
              (session) =>
                `${session.date}|${session.subject}|${session.minutes}|${session.duration}|${session.points}`
            )
          );

          const sessionsToAdd = remoteSessions.filter(
            (session) =>
              !localKeys.has(
                `${session.date}|${session.subject}|${session.minutes}|${session.duration}|${session.points}`
              )
          );

          if (sessionsToAdd.length === 0) {
            return prev;
          }

          toast.success(`${sessionsToAdd.length} sessão(ões) sincronizadas da nuvem.`);

          return xpEngineService.applyStudySessions(prev, sessionsToAdd);
        });
      } catch {
        if (!cancelled) {
          toast.error('Não foi possível sincronizar sessões da nuvem agora.');
        }
      }
    };

    void syncSessionsFromCloud();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, supabaseUserId, setUserData]);

  // Sync do perfil do usuario (XP, level, streak) com a nuvem
  useEffect(() => {
    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured) return;

    let cancelled = false;

    const hydrateProfile = async () => {
      try {
        const cloudProfile = await userProfileService.get(supabaseUserId);
        if (cancelled || !cloudProfile) return;

        setUserData((prev) => {
          // Merge: nuvem ganha se tiver mais pontos (dados mais recentes)
          const cloudWins = cloudProfile.totalPoints > prev.totalPoints;
          if (!cloudWins) {
            // Local tem mais pontos: push para nuvem
            void userProfileService.upsert(supabaseUserId, {
              totalPoints: prev.totalPoints,
              level: prev.level,
              currentStreak: prev.currentStreak,
              bestStreak: prev.bestStreak,
              dailyGoal: prev.dailyGoal,
              weekProgress: prev.weekProgress,
            }).catch(() => {});
            return prev;
          }

          return {
            ...prev,
            totalPoints: cloudProfile.totalPoints,
            level: cloudProfile.level,
            currentStreak: cloudProfile.currentStreak,
            bestStreak: cloudProfile.bestStreak,
            dailyGoal: cloudProfile.dailyGoal,
            weekProgress: { ...prev.weekProgress, ...cloudProfile.weekProgress },
          };
        });
      } catch {
        // fallback local
      }
    };

    void hydrateProfile();
    return () => { cancelled = true; };
  }, [isLoggedIn, supabaseUserId, setUserData]);

  // Push mudancas de userData para a nuvem (debounced)
  useEffect(() => {
    if (!supabaseUserId || !isSupabaseConfigured || !isLoggedIn) return;

    const timer = window.setTimeout(() => {
      void userProfileService.upsert(supabaseUserId, {
        totalPoints: userData.totalPoints,
        level: userData.level,
        currentStreak: userData.currentStreak,
        bestStreak: userData.bestStreak,
        dailyGoal: userData.dailyGoal,
        weekProgress: userData.weekProgress,
      }).catch(() => {});
    }, 2000); // debounce 2s

    return () => window.clearTimeout(timer);
  }, [
    supabaseUserId, isLoggedIn,
    userData.totalPoints, userData.level,
    userData.currentStreak, userData.bestStreak,
    userData.dailyGoal, userData.weekProgress,
  ]);

  const handleClearData = React.useCallback(() => {
    setUserData(INITIAL_USER_DATA);
    if (usesLegacyBeginnerBootstrap) {
      setBeginnerState('ready_for_first_session');
      setBeginnerStats(beginnerProgressService.createInitialStats());
    } else {
      setBeginnerState(null);
      setBeginnerStats(null);
      setBeginnerPlan(null);
      clearLegacyBeginnerBootstrapStorage();
    }
    setLastBeginnerResult(null);
    setShowBeginnerWeekSummary(false);
    if (usesLegacyBeginnerBootstrap && beginnerPlan) {
      setBeginnerPlan(beginnerFlowService.generatePlan(beginnerPlan.track, INITIAL_USER_DATA.dailyGoal));
    }
  }, [
    beginnerPlan,
    clearLegacyBeginnerBootstrapStorage,
    setBeginnerPlan,
    setBeginnerState,
    setBeginnerStats,
    setUserData,
    usesLegacyBeginnerBootstrap,
  ]);

  const handleCompleteAcademyContent = React.useCallback(
    (contentId: string, xpReward: number) => {
      if (completedContentIds.includes(contentId)) {
        return;
      }

      setCompletedContentIds((prev) => [...prev, contentId]);

      setUserData((prev) => xpEngineService.applyXpDelta(prev, xpReward));

      toast.success(`Conteúdo concluído! +${xpReward} XP`);
    },
    [completedContentIds, setCompletedContentIds, setUserData]
  );

  const handleRevertAcademyContent = React.useCallback(
    (contentId: string, xpReward: number) => {
      setCompletedContentIds((prev) => prev.filter((id) => id !== contentId));

      setUserData((prev) => xpEngineService.applyXpDelta(prev, -xpReward));
    },
    [setCompletedContentIds, setUserData]
  );

  const handleSyncAcademyTotalXp = React.useCallback(
    (newTotalXp: number) => {
      setUserData((prev) => xpEngineService.applyXpAbsolute(prev, newTotalXp));
    },
    [setUserData]
  );

  // Get today's minutes (memoized)
  const todayMinutes = React.useMemo(() => {
    const day = getDayOfWeek();
    return userData.weekProgress[day]?.minutes || 0;
  }, [userData.weekProgress]);

  const effectiveSessions = React.useMemo(() => {
    if (Array.isArray(userData.sessions) && userData.sessions.length > 0) {
      return userData.sessions;
    }

    if (Array.isArray(userData.studyHistory) && userData.studyHistory.length > 0) {
      return userData.studyHistory;
    }

    return [];
  }, [userData.sessions, userData.studyHistory]);
  const progressWeekStart = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() + diffToMonday);
    return start;
  }, []);
  const progressWeekEnd = React.useMemo(() => {
    const end = new Date(progressWeekStart);
    end.setDate(progressWeekStart.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [progressWeekStart]);
  const todayDateKey = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const getSessionProgressDate = React.useCallback((rawDate?: string | null) => {
    if (!rawDate) {
      return null;
    }

    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? new Date(`${rawDate}T12:00:00`)
      : new Date(rawDate);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);
  const weeklyCompletedSessions = React.useMemo(
    () =>
      effectiveSessions.filter((session) => {
        const sessionDate = getSessionProgressDate(session.timestamp || session.date);
        return Boolean(sessionDate && sessionDate >= progressWeekStart && sessionDate <= progressWeekEnd);
      }).length,
    [effectiveSessions, getSessionProgressDate, progressWeekEnd, progressWeekStart],
  );
  const weeklyPlannedSessions = React.useMemo(() => {
    const plannedFromEntries = getWeeklyPlannedSessions(
      persistedScheduleEntries,
      progressWeekStart,
      progressWeekEnd,
    );

    if (plannedFromEntries > 0) {
      return plannedFromEntries;
    }

    if (
      typeof weeklySchedule.preferences.weeklyGoalSessions === 'number'
      && weeklySchedule.preferences.weeklyGoalSessions > 0
    ) {
      return weeklySchedule.preferences.weeklyGoalSessions;
    }

    return getPlannedSubjectsCount(weeklySchedule.weekPlan);
  }, [
    persistedScheduleEntries,
    progressWeekEnd,
    progressWeekStart,
    weeklySchedule.preferences.weeklyGoalSessions,
    weeklySchedule.weekPlan,
  ]);
  const weeklySessionProgress = React.useMemo<UserFacingWeeklyProgress | null>(
    () => buildWeeklySessionProgress(weeklyCompletedSessions, weeklyPlannedSessions),
    [weeklyCompletedSessions, weeklyPlannedSessions],
  );
  const todayCompletedSessions = React.useMemo(
    () =>
      effectiveSessions.filter((session) => {
        const rawDate = session.timestamp || session.date;
        if (!rawDate) {
          return false;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          return rawDate === todayDateKey;
        }

        const sessionDate = getSessionProgressDate(rawDate);
        if (!sessionDate) {
          return false;
        }

        const sessionDateKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
        return sessionDateKey === todayDateKey;
      }).length,
    [effectiveSessions, getSessionProgressDate, todayDateKey],
  );
  const completedWeekdays = React.useMemo(
    () =>
      effectiveSessions.reduce((acc, session) => {
        const sessionDate = getSessionProgressDate(session.timestamp || session.date);
        if (!sessionDate || sessionDate < progressWeekStart || sessionDate > progressWeekEnd) {
          return acc;
        }

        acc[getWeekdayFromDate(sessionDate)] = true;
        return acc;
      }, {} as Partial<Record<Weekday, boolean>>),
    [effectiveSessions, getSessionProgressDate, progressWeekEnd, progressWeekStart],
  );
  const weeklyProgressCopy = weeklySessionProgress
    ? `${weeklySessionProgress.label} esta semana`
    : weeklyCompletedSessions + ' sessoes concluidas esta semana';
  const weeklyPlanConfidenceState = getWeeklyPlanConfidenceState(
    weeklyCompletedSessions,
    weeklySchedule.preferences.weeklyGoalSessions,
  );
  const completedSessionDateKeys = React.useMemo(
    () =>
      effectiveSessions
        .map((session) => session.timestamp || session.date)
        .filter(Boolean) as string[],
    [effectiveSessions],
  );
  const recentPaceState = React.useMemo(
    () => getRecentPaceState(weeklySchedule, completedSessionDateKeys, new Date()),
    [completedSessionDateKeys, weeklySchedule],
  );
  const recentTopicLabelsBySubject = React.useMemo(
    () =>
      effectiveSessions.reduce((acc, session) => {
        const subjectLabel = typeof session.subject === 'string' ? session.subject.trim() : '';
        const topicLabel =
          typeof (session as { topicName?: string }).topicName === 'string'
            ? (session as { topicName?: string }).topicName?.trim()
            : typeof (session as { topic?: string }).topic === 'string'
              ? (session as { topic?: string }).topic?.trim()
              : '';

        if (!subjectLabel || !topicLabel) {
          return acc;
        }

        acc[subjectLabel] = acc[subjectLabel] ?? [];
        if (!acc[subjectLabel].includes(topicLabel)) {
          acc[subjectLabel].push(topicLabel);
        }

        return acc;
      }, {} as Record<string, string[]>),
    [effectiveSessions],
  );
  const paceCopy = React.useMemo(
    () => getPaceCopy({ state: recentPaceState, date: new Date() }),
    [recentPaceState],
  );
  const postFocusPlanConfidenceCopy = recentPaceState !== 'on_track' && paceCopy?.postFocus
    ? paceCopy.postFocus
    : weeklyPlanConfidenceState === 'on_track'
      ? 'Voce esta seguindo seu plano.'
      : 'Seu plano da semana comeca com esta sessao.';
  const currentBlockContentPath = React.useMemo(
    () =>
      getSuggestedContentPathBySubjectLabel(
        effectiveStudyExecutionState.currentBlock.subject,
        effectiveStudyExecutionState.currentBlock.topicName,
        recentTopicLabelsBySubject[effectiveStudyExecutionState.currentBlock.subject] ?? [],
      ),
    [
      effectiveStudyExecutionState.currentBlock.subject,
      effectiveStudyExecutionState.currentBlock.topicName,
      recentTopicLabelsBySubject,
    ],
  );
  const currentBlockDisplayLabel = currentBlockContentPath.shortLabel;
  const currentBlockTimerSubject = React.useMemo(
    () => getCycleSubjectByDisplayLabel(currentBlockDisplayLabel, preferredStudyTrack, hybridEnemWeight),
    [currentBlockDisplayLabel, hybridEnemWeight, preferredStudyTrack],
  );
  const currentBlockSuggestedTopicCopy = React.useMemo(
    () =>
      effectiveStudyExecutionState.currentBlock.topicName
        ? undefined
        : (() => {
            const suggestion = getSuggestedNextTopicAligned({
              todaySubjectLabels: [effectiveStudyExecutionState.currentBlock.subject],
              preferredFrontLabelBySubject: {
                [effectiveStudyExecutionState.currentBlock.subject]: currentBlockContentPath.frontLabel,
              },
              recentTopicLabelsBySubject,
            });

            if (!suggestion) {
              return undefined;
            }

            return getSuggestedTopicCopy({
              source: suggestion.source,
              topicLabel: suggestion.topicLabel,
              frontLabel: suggestion.frontLabel,
              subjectLabel: suggestion.subjectLabel,
              variant: 'study',
            });
          })(),
    [
      currentBlockContentPath.frontLabel,
      effectiveStudyExecutionState.currentBlock.subject,
      effectiveStudyExecutionState.currentBlock.topicName,
      recentTopicLabelsBySubject,
    ],
  );
  const lastCompletedFocusContentPath = React.useMemo(
    () => (lastCompletedFocus ? getSuggestedContentPathBySubjectLabel(lastCompletedFocus.subject) : null),
    [lastCompletedFocus],
  );
  const lastCompletedFocusDisplayLabel = lastCompletedFocusContentPath?.shortLabel || lastCompletedFocus?.subject || '';
  const preferredTreeContext = React.useMemo(() => {
    if (lastCompletedFocus?.subject) {
      return {
        disciplineName: lastCompletedFocus.subject,
        sourceLabel: 'Ultimo foco',
      };
    }

    if (effectiveStudyExecutionState.currentBlock.subject) {
      return {
        disciplineName: effectiveStudyExecutionState.currentBlock.subject,
        sourceLabel: 'Bloco atual',
      };
    }

    if (weeklyStudyContext.state.type === 'planned' && weeklyStudyContext.state.subjectLabels[0]) {
      return {
        disciplineName: weeklyStudyContext.state.subjectLabels[0],
        sourceLabel: 'Plano do dia',
      };
    }

    return null;
  }, [
    effectiveStudyExecutionState.currentBlock.subject,
    lastCompletedFocus?.subject,
    weeklyStudyContext,
  ]);
  const preferredTreeDisciplineName = preferredTreeContext?.disciplineName;
  const preferredTreeDisciplineSourceLabel = preferredTreeContext?.sourceLabel;
  const nextStudySuggestion = React.useMemo(() => {
    if (!lastCompletedFocus) {
      return null;
    }

    return getNextStudySuggestion({
      weeklySchedule,
      today: getWeekdayFromDate(),
      currentSubjectLabel: lastCompletedFocus.subject,
    });
  }, [lastCompletedFocus, weeklySchedule]);
  const nextStudySuggestionCopy = React.useMemo(() => {
    if (!nextStudySuggestion?.subjectLabel) {
      return '';
    }

    const nextContentPath = getSuggestedContentPathBySubjectLabel(
      nextStudySuggestion.subjectLabel,
      undefined,
      recentTopicLabelsBySubject[nextStudySuggestion.subjectLabel] ?? [],
    );

    return getNextStudyCopy({
      ...nextStudySuggestion,
      subjectLabel: nextContentPath.shortLabel,
    });
  }, [nextStudySuggestion, recentTopicLabelsBySubject]);

  const weeklyStudiedMinutes = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return effectiveSessions.reduce((sum, session) => {
      const rawDate = session.timestamp || session.date;
      if (!rawDate) {
        return sum;
      }

      const sessionDate = new Date(rawDate);
      if (Number.isNaN(sessionDate.getTime())) {
        return sum;
      }

      if (sessionDate < start || sessionDate > end) {
        return sum;
      }

      const duration = Number(session.minutes ?? session.duration ?? 0);
      return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    }, 0);
  }, [effectiveSessions]);
  const prioritizationRecentSessions = React.useMemo(
    () =>
      effectiveSessions
        .map((session) => {
          const completedAt = session.timestamp || session.date;
          if (!completedAt) {
            return null;
          }

          const topic =
            typeof (session as { topicName?: string }).topicName === 'string'
              ? (session as { topicName?: string }).topicName
              : typeof (session as { topic?: string }).topic === 'string'
                ? (session as { topic?: string }).topic
                : null;
          const accuracy =
            typeof (session as { accuracy?: number }).accuracy === 'number'
              ? (session as { accuracy?: number }).accuracy
              : null;

          return {
            subject: String(session.subject || ''),
            topic,
            completedAt,
            accuracy,
          };
        })
        .filter(Boolean) as Array<{
          subject: string;
          topic?: string | null;
          completedAt: string;
          accuracy?: number | null;
        }>,
    [effectiveSessions],
  );
  const prioritizedScheduledStudyFocus = React.useMemo(() => {
    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured || showOnboarding) {
      return null;
    }

    return chooseNextScheduledStudyFocus(persistedScheduleEntries, {
      today: new Date(),
      schedule: weeklySchedule,
      recentSessions: prioritizationRecentSessions,
      currentWeakPoint:
        officialStudyHomeState.status === 'ready'
          ? officialStudyHomeState.home.decision.currentWeakPoint
          : null,
      weeklyCompletedSessions,
      weeklyGoalSessions: weeklySchedule.preferences.weeklyGoalSessions,
    });
  }, [
    isLoggedIn,
    officialStudyHomeState,
    persistedScheduleEntries,
    prioritizationRecentSessions,
    showOnboarding,
    supabaseUserId,
    weeklyCompletedSessions,
    weeklySchedule,
  ]);
  const homeReviewQueueState = React.useMemo(
    () => buildHomeReviewQueueState(persistedScheduleEntries),
    [persistedScheduleEntries],
  );
  const homeReviewQueueItems = homeReviewQueueState.items;
  const homeNextSessionCommit = React.useMemo(() => {
    if (nextSessionCommit?.nextSessionScheduled) {
      return {
        title: nextSessionCommit.title,
        detail: nextSessionCommit.detail,
      };
    }

    if (resumeMissionState?.entry === 'next_mission_ready') {
      return {
        title: NEXT_SESSION_COMMIT_TITLE,
        detail: NEXT_SESSION_COMMIT_DETAIL,
      };
    }

    return null;
  }, [nextSessionCommit, resumeMissionState]);
  const homeContinuationMission = React.useMemo<HomeContinuationMission | null>(() => {
    if (!isLoggedIn || showOnboarding || resumeMissionState?.entry !== 'next_mission_ready') {
      return null;
    }

    return {
      subject: normalizeSubjectLabel(resumeMissionState.currentMission.subject, 'Matematica'),
      topic: normalizePresentationLabel(resumeMissionState.currentMission.topic, 'Proxima missao'),
      questionsDone: resumeMissionState.currentMission.questionsDone,
      totalQuestions: resumeMissionState.currentMission.questionsTotal,
      estimatedMinutesRemaining: getEstimatedMinutesRemaining(
        resumeMissionState.currentMission.questionsTotal,
        resumeMissionState.currentMission.questionsDone,
      ),
    };
  }, [isLoggedIn, resumeMissionState, showOnboarding]);

  const effectiveTrackForDepartments: 'enem' | 'concursos' = React.useMemo(() => {
    if (preferredStudyTrack === 'hibrido') {
      return hybridEnemWeight >= 50 ? 'enem' : 'concursos';
    }

    return preferredStudyTrack;
  }, [preferredStudyTrack, hybridEnemWeight]);

  const hybridConcursoWeight = 100 - hybridEnemWeight;

  const resolvedDisplayName = React.useMemo(
    () => (profileDisplayName || user?.nome || 'Usuário').trim(),
    [profileDisplayName, user?.nome]
  );

  const profileHydratedEmailRef = React.useRef<string | null>(null);
  const profileCloudHydratedEmailRef = React.useRef<string | null>(null);

  const fetchOfficialStudyHomeState = React.useCallback(async (): Promise<OfficialStudyHomeState> => {
    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured || showOnboarding) {
      return { status: 'idle' };
    }

    const [homeResult, recommendationResult] = await Promise.allSettled([
      studyLoopApiService.getHome(),
      studyLoopApiService.getCurrentRecommendation(),
    ]);

    const buildOfficialStudyEmptyState = (
      emptyStateErrorCode: string | null = null,
    ): OfficialStudyHomeState => {
      const isProfileGap = emptyStateErrorCode === 'PROFILE_NOT_FOUND';
      return {
        status: 'empty',
        title: isProfileGap
          ? 'Seu proximo estudo ainda nao foi liberado'
          : 'Sem sessoes planejadas hoje',
        description: isProfileGap
          ? 'O contrato oficial ainda nao encontrou contexto suficiente para montar sua primeira sessao.'
          : 'Sem sessoes planejadas hoje. Gere uma sessao para continuar.',
        supportingText: isProfileGap
          ? 'Conclua o onboarding ou ajuste o contexto do plano para liberar a primeira sessao.'
          : 'Abra o cronograma para ajustar o dia ou gere uma nova sessao oficial.',
      };
    };

    if (homeResult.status === 'fulfilled') {
      const recommendation = recommendationResult.status === 'fulfilled'
        ? recommendationResult.value.recommendation
        : null;
      const recommendationError = recommendationResult.status === 'rejected'
        ? recommendationResult.reason
        : null;
      const recommendationEmptyStateError = isStudyLoopEmptyStateError(recommendationError)
        ? recommendationError
        : null;

      if (!homeResult.value.activeStudySession && (!recommendation || recommendationEmptyStateError)) {
        return buildOfficialStudyEmptyState(recommendationEmptyStateError?.code || null);
      }

      return {
        status: 'ready',
        home: homeResult.value,
        recommendation,
      };
    }

    const homeError = homeResult.reason;
    const recommendationError = recommendationResult.status === 'rejected'
      ? recommendationResult.reason
      : null;
    const emptyStateError = isStudyLoopEmptyStateError(homeError)
      ? homeError
      : isStudyLoopEmptyStateError(recommendationError)
        ? recommendationError
        : null;

    if (emptyStateError) {
      return buildOfficialStudyEmptyState(emptyStateError.code);
    }

    return {
      status: 'error',
      message:
        homeError instanceof Error
          ? homeError.message
          : recommendationError instanceof Error
            ? recommendationError.message
            : 'Nao foi possivel carregar sua proxima sessao oficial.',
    };
  }, [isLoggedIn, showOnboarding, supabaseUserId]);

  const loadOfficialStudyHome = React.useCallback(async () => {
    const canLoadOfficialStudyHome = isLoggedIn && supabaseUserId && isSupabaseConfigured && !showOnboarding;
    if (!canLoadOfficialStudyHome) {
      const nextState: OfficialStudyHomeState = { status: 'idle' };
      setOfficialStudyHomeState(nextState);
      return nextState;
    }

    setOfficialStudyHomeState({ status: 'loading' });
    const nextState = await fetchOfficialStudyHomeState();
    setOfficialStudyHomeState(nextState);
    return nextState;
  }, [fetchOfficialStudyHomeState, isLoggedIn, showOnboarding, supabaseUserId]);

  const loadOfficialStudyHomeAfterCompletion = React.useCallback(
    async (finishedSessionId: string) => {
      const canLoadOfficialStudyHome = isLoggedIn && supabaseUserId && isSupabaseConfigured && !showOnboarding;
      if (!canLoadOfficialStudyHome) {
        const nextState: OfficialStudyHomeState = { status: 'idle' };
        setOfficialStudyHomeState(nextState);
        return nextState;
      }

      setOfficialStudyHomeState({ status: 'loading' });
      let lastResolvedState: OfficialStudyHomeState = { status: 'loading' };
      const sanitizeFinishedSessionState = (state: OfficialStudyHomeState): OfficialStudyHomeState => {
        if (state.status !== 'ready' || state.home.activeStudySession?.sessionId !== finishedSessionId) {
          return state;
        }

        return {
          ...state,
          home: {
            ...state.home,
            activeStudySession: null,
          },
        };
      };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const nextState = sanitizeFinishedSessionState(await fetchOfficialStudyHomeState());
        lastResolvedState = nextState;

        const stillShowsFinishedSessionAsActive = nextState.status === 'ready'
          && nextState.home.activeStudySession?.sessionId === finishedSessionId;
        if (!stillShowsFinishedSessionAsActive) {
          setOfficialStudyHomeState(nextState);
          return nextState;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }

      setOfficialStudyHomeState(lastResolvedState);
      return lastResolvedState;
    },
    [fetchOfficialStudyHomeState, isLoggedIn, showOnboarding, supabaseUserId],
  );

  React.useEffect(() => {
    if (!isLoggedIn) {
      setOfficialStudyHomeState({ status: 'idle' });
      setOfficialStudySession(null);
      setOfficialStudyResult(null);
      setOfficialStudyResultMeta(null);
      setOfficialStudyAnswerFeedback(null);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    const shouldLoadOfficialStudySurface = activeTab === 'inicio' || activeTab === 'cronograma';
    if (!shouldLoadOfficialStudySurface || showOnboarding) {
      return;
    }

    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured) {
      return;
    }

    void loadOfficialStudyHome();
  }, [activeTab, isLoggedIn, loadOfficialStudyHome, showOnboarding, supabaseUserId]);

  React.useEffect(() => {
    if (!officialStudySession) {
      return;
    }

    const nextQuestion = officialStudySession.questions.find((question) => !officialStudySession.answers[question.id]);
    if (nextQuestion) {
      setOfficialStudyQuestionStartedAt(Date.now());
    }
  }, [officialStudySession]);

  const applyOfficialStudyCompletionToProgress = React.useCallback(
    (session: OfficialStudySession, result: OfficialStudySessionResult) => {
      const completedSession = buildOfficialStudyCompletionSnapshot(session, result);
      const completedSessionKey = buildStudySessionIdentityKey(completedSession);
      const alreadyTracked = effectiveSessions.some(
        (entry) => buildStudySessionIdentityKey(entry) === completedSessionKey,
      );

      if (!alreadyTracked) {
        setUserData((previous) => xpEngineService.applyStudySessions(previous, [completedSession]));
      }

      return {
        completedSession,
        alreadyTracked,
      };
    },
    [effectiveSessions, setUserData],
  );

  const reflectOfficialStudyCompletionInBeginnerFlow = React.useCallback(
    (session: OfficialStudySession, completedSession: OfficialStudyCompletionSnapshot) => {
      if (!beginnerPlan) {
        return {
          completedMission: null,
          nextMission: null,
        };
      }

      const currentMission = beginnerFlowService.getTodayMission(beginnerPlan);
      if (!currentMission || currentMission.status === 'completed') {
        return {
          completedMission: null,
          nextMission: null,
        };
      }

      const beginnerProgress = beginnerFlowService.submitSession({
        plan: beginnerPlan,
        missionId: currentMission.id,
        completedAt: completedSession.date,
      });

      setBeginnerPlan(beginnerProgress.plan);
      setBeginnerState(beginnerProgress.state);
      setBeginnerStats((previous) => {
        const nextStats = beginnerProgressService.recordSessionCompleted(previous, {
          day: currentMission.dayNumber,
          duration: completedSession.minutes,
          completed: true,
          at: completedSession.date,
        });
        const assessmentMissionId = beginnerProgress.completedMission?.id || currentMission.id;
        const assessmentDay = beginnerProgress.completedMission?.dayNumber || currentMission.dayNumber;

        return summarizeOfficialStudyAssessmentBySubject(session).reduce(
          (stats, summary) =>
            beginnerProgressService.recordAssessmentCompleted(stats, {
              day: assessmentDay,
              missionId: assessmentMissionId,
              subject: summary.subject,
              correct: summary.correct,
              total: summary.total,
              xpGained: summary.correct * 10,
              at: completedSession.date,
            }),
          nextStats,
        );
      });

      return {
        completedMission: beginnerProgress.completedMission || currentMission,
        nextMission: beginnerProgress.nextMission || null,
      };
    },
    [beginnerPlan, setBeginnerPlan, setBeginnerState, setBeginnerStats],
  );

  const reflectOfficialStudyCompletionInSchedule = React.useCallback(
    async (session: OfficialStudySession) => {
      await studyScheduleService.completeEntryForToday(supabaseUserId, {
        subject: session.subject,
        topic: session.topic,
        completedAt: session.startedAt,
      }, {
        storageKey: scheduleEntriesStorageKey,
        enableCloudSync: shouldSyncScheduleEntriesToCloud,
      });
    },
    [scheduleEntriesStorageKey, shouldSyncScheduleEntriesToCloud, supabaseUserId],
  );

  const handleStartOfficialStudy = React.useCallback(async (
    options?: {
      source?: 'default' | 'resume_prompt' | 'notification_resume' | 'auto_resume';
      forceResumeSessionId?: string | null;
    },
  ) => {
    if (!isSupabaseConfigured) {
      toast.error('Contrato oficial de estudo indisponivel neste ambiente.');
      return;
    }

    const startSource = options?.source || 'default';
    setOfficialStudyStarting(true);
    clearNextSessionCommit();
    setOfficialStudyAnswerFeedback(null);

    try {
      const persistedActiveSessionId = resumeMissionState?.entry === 'active_session'
        ? resumeMissionState.currentMission.sessionId || null
        : null;
      const activeSessionId = options?.forceResumeSessionId
        || (officialStudyHomeState.status === 'ready'
          ? officialStudyHomeState.home.activeStudySession?.sessionId || null
          : null)
        || persistedActiveSessionId;
      const beginnerMission = beginnerPlan ? beginnerFlowService.getTodayMission(beginnerPlan) : null;
      const focusOverride = !activeSessionId && prioritizedScheduledStudyFocus
        ? {
            subject: prioritizedScheduledStudyFocus.entry.subject,
            topic: prioritizedScheduledStudyFocus.entry.topic ?? null,
            reason: prioritizedScheduledStudyFocus.reasonSummary,
          }
        : undefined;
      const session = activeSessionId
        ? await studyLoopSessionsService.getSession(activeSessionId)
        : await studyLoopSessionsService.createSession(OFFICIAL_STUDY_SESSION_QUESTION_LIMIT, focusOverride);

      if (session.status !== 'active') {
        clearResumeMissionState();
        setResumeEntrySource('idle');
        await loadOfficialStudyHome();
        toast('A sessao oficial ja foi encerrada. A home foi atualizada.');
        return;
      }

      setOfficialStudyResult(null);
      setOfficialStudyResultMeta(null);
      setOfficialStudySession(session);
      setOfficialStudyQuestionStartedAt(Date.now());
      persistActiveOfficialResumeState(session);

      const isResumeStart = Boolean(activeSessionId) || startSource !== 'default';
      if (isResumeStart) {
        trackEvent(
          'session_resumed',
          {
            source: startSource,
            mode: activeSessionId ? 'active_session' : 'next_mission_ready',
            sessionId: session.sessionId,
            questionsDone: session.answeredQuestions,
            totalQuestions: session.totalQuestions,
            missionId: resumeMissionState?.currentMission.id || session.sessionId,
          },
          { userEmail: user?.email },
        );
      }

      if (startSource === 'notification_resume') {
        trackEvent(
          'd1_resume_started',
          {
            sessionId: session.sessionId,
            missionId: resumeMissionState?.currentMission.id || session.sessionId,
          },
          { userEmail: user?.email },
        );
      }

      if (beginnerPlan && beginnerMission && beginnerMission.status !== 'completed') {
        setBeginnerState(beginnerFlowService.startSession(beginnerPlan));

        if (!activeSessionId) {
          setBeginnerStats((previous) =>
            beginnerProgressService.recordSessionStarted(previous, {
              day: beginnerMission.dayNumber,
              missionId: beginnerMission.id,
              plannedMinutes: OFFICIAL_STUDY_ESTIMATED_DURATION_MINUTES,
            }),
          );
          trackBeginnerEvent('beginner_session_started', {
            day: beginnerMission.dayNumber,
            missionId: beginnerMission.id,
            plannedMinutes: OFFICIAL_STUDY_ESTIMATED_DURATION_MINUTES,
            source: 'official_session',
          });
        }
      }

      clearResumeLocationState();
      if (startSource !== 'default') {
        setResumeEntrySource('idle');
      }
      toast.success(activeSessionId ? 'Sessao oficial retomada.' : 'Sessao oficial iniciada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao abrir a sessao oficial.');
    } finally {
      setOfficialStudyStarting(false);
    }
  }, [
    beginnerPlan,
    clearNextSessionCommit,
    clearResumeMissionState,
    loadOfficialStudyHome,
    officialStudyHomeState,
    persistActiveOfficialResumeState,
    prioritizedScheduledStudyFocus,
    resumeMissionState,
    setBeginnerState,
    setBeginnerStats,
    user?.email,
    trackBeginnerEvent,
  ]);

  const handleAnswerOfficialStudyQuestion = React.useCallback(async (questionId: string, alternativeId: string) => {
    if (!officialStudySession) {
      return;
    }

    setOfficialStudyAnswering(true);

    try {
      const answeredQuestion = officialStudySession.questions.find((question) => question.id === questionId) || null;
      const responseTimeSeconds = Math.max(1, Math.round((Date.now() - officialStudyQuestionStartedAt) / 1000));
      const updatedSession = await studyLoopSessionsService.answerQuestion(officialStudySession.sessionId, {
        questionId,
        alternativeId,
        responseTimeSeconds,
      });

      const submittedAnswer = updatedSession.answers[questionId];
      if (submittedAnswer) {
        const feedbackDetail = answeredQuestion?.explanation || (
          answeredQuestion ? `${answeredQuestion.subject} - ${answeredQuestion.topic}` : undefined
        );
        setOfficialStudyAnswerFeedback({
          tone: submittedAnswer.isCorrect ? 'success' : 'warning',
          message: submittedAnswer.isCorrect
            ? 'Correto. Voce ja entendeu isso.'
            : 'Quase. Vamos reforcar isso agora.',
          detail: feedbackDetail,
        });
      }

      setOfficialStudySession(updatedSession);
      persistActiveOfficialResumeState(updatedSession);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao registrar a resposta.');
    } finally {
      setOfficialStudyAnswering(false);
    }
  }, [officialStudyQuestionStartedAt, officialStudySession, persistActiveOfficialResumeState]);

  const handleFinishOfficialStudy = React.useCallback(async () => {
    if (!officialStudySession) {
      return;
    }

    const sessionToFinish = officialStudySession;
    const isFirstSession = (userData.sessions || userData.studyHistory || []).length === 0;
    setOfficialStudyFinishing(true);
    setOfficialStudyAnswerFeedback(null);

    try {
      const result = await studyLoopSessionsService.finishSession(sessionToFinish.sessionId);
      const { completedSession } = applyOfficialStudyCompletionToProgress(sessionToFinish, result);
      const completedHomePriority = homeContinuationMission ? 'continue' : 'study';
      const beginnerProgressReflection = reflectOfficialStudyCompletionInBeginnerFlow(sessionToFinish, completedSession);
      setOfficialStudySession(null);
      setOfficialStudyResultMeta({
        subject: sessionToFinish.subject,
        topic: sessionToFinish.topic || sessionToFinish.subject,
        xpPoints: completedSession.points,
        isFirstSession,
        beginnerMissionId: beginnerProgressReflection.completedMission?.id || null,
        beginnerDayNumber: beginnerProgressReflection.completedMission?.dayNumber || null,
        nextMissionId: beginnerProgressReflection.nextMission?.id || null,
        totalQuestions: result.total,
      });
      setOfficialStudyResult(result);
      setHomeCompletionSignal(createHomeCompletionSignal(completedHomePriority, completedSession.date));

      if (beginnerProgressReflection.completedMission) {
        trackBeginnerEvent('beginner_session_completed', {
          day: beginnerProgressReflection.completedMission.dayNumber,
          missionId: beginnerProgressReflection.completedMission.id,
          nextMissionId: beginnerProgressReflection.nextMission?.id || null,
          duration: completedSession.minutes,
          completed: true,
          source: 'official_session',
        });
      }

      const scheduleSyncResult = await reflectOfficialStudyCompletionInSchedule(sessionToFinish)
        .then(() => 'matched' as const)
        .catch(() => 'failed' as const);

      const refreshedHomeState = await loadOfficialStudyHomeAfterCompletion(sessionToFinish.sessionId);
      const refreshedRecommendation = refreshedHomeState.status === 'ready'
        ? refreshedHomeState.recommendation
        : null;
      const refreshedMission = refreshedHomeState.status === 'ready'
        ? refreshedHomeState.home.mission
        : null;
      persistNextMissionResumeState({
        source: 'official',
        scheduledAt: completedSession.date,
        subject: refreshedRecommendation?.disciplineName || refreshedMission?.discipline || sessionToFinish.subject,
        topic: refreshedRecommendation?.topicName || refreshedMission?.topic || sessionToFinish.topic || sessionToFinish.subject,
        questionsTotal: OFFICIAL_STUDY_SESSION_QUESTION_LIMIT,
      });
      toast.success(
        scheduleSyncResult === 'failed'
          ? 'Sessao oficial concluida. Home e progresso atualizados; o cronograma sera reconciliado ao reabrir o plano.'
          : 'Sessao oficial concluida. Home, progresso e cronograma atualizados.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao finalizar a sessao oficial.');
    } finally {
      setOfficialStudyFinishing(false);
    }
  }, [
    applyOfficialStudyCompletionToProgress,
    homeContinuationMission,
    loadOfficialStudyHomeAfterCompletion,
    loadOfficialStudyHome,
    officialStudySession,
    persistNextMissionResumeState,
    setHomeCompletionSignal,
    setOfficialStudyAnswerFeedback,
    reflectOfficialStudyCompletionInBeginnerFlow,
    reflectOfficialStudyCompletionInSchedule,
    trackBeginnerEvent,
    userData.sessions,
    userData.studyHistory,
  ]);

  const handleFinalizeEstudosRecord = React.useCallback(async (
    result: FinalizeStudySessionAdapterResult,
    payload: FinishPayload,
  ) => {
    if (!lastCompletedFocus) {
      toast.error('Conclua o bloco no timer antes de fechar este registro.');
      return;
    }

    const completedAt = lastCompletedFocus.completedAt || new Date().toISOString();
    const reviewHours = Math.max(1, result.reviewSuggestion.hours || 24);
    const durationMinutes = Math.max(
      10,
      Math.ceil((result.session.actualDurationSeconds || (lastCompletedFocus.duration * 60)) / 60),
    );
    const reviewContextParts = [
      payload.pages ? `${payload.pages} pag` : null,
      payload.lessons ? `${payload.lessons} aula${payload.lessons === 1 ? '' : 's'}` : null,
      payload.notes ? String(payload.notes).trim() : null,
    ].filter(Boolean);
    const reviewNote = reviewContextParts.length > 0
      ? `Fechamento do bloco: ${reviewContextParts.join(' - ')}.`
      : undefined;
    const reviewSubject = lastCompletedFocus.subject || result.session.subject;
    const reviewTopic = lastCompletedFocus.topicName || result.session.topic;

    await studyScheduleService.completeEntryForToday(supabaseUserId, {
      subject: lastCompletedFocus.subject,
      topic: lastCompletedFocus.topicName,
      completedAt,
    }, {
      storageKey: scheduleEntriesStorageKey,
      enableCloudSync: shouldSyncScheduleEntriesToCloud,
    }).catch(() => null);

    const currentEntries = readPersistedScheduleEntries(scheduleEntriesStorageKey);
    const reviewQueueResult = queueStudyReviewEntry(currentEntries, {
      subject: reviewSubject,
      topic: reviewTopic,
      completedAt,
      hours: reviewHours,
      durationMinutes,
      note: reviewNote,
    });

    if (reviewQueueResult.created && reviewQueueResult.reviewEntry) {
      persistScheduleEntriesSnapshot(reviewQueueResult.entries, scheduleEntriesStorageKey);
      setPersistedScheduleEntries(reviewQueueResult.entries);

      if (shouldSyncScheduleEntriesToCloud && supabaseUserId) {
        await studyScheduleService.upsertEntry(supabaseUserId, reviewQueueResult.reviewEntry).catch(() => undefined);
      }
    }

    toast.success(
      reviewQueueResult.created
        ? `Fechamento salvo. Revisao ${result.reviewSuggestion.label} adicionada ao plano.`
        : `Fechamento salvo. Revisao ${result.reviewSuggestion.label} ja estava na fila.`,
    );
  }, [lastCompletedFocus, scheduleEntriesStorageKey, shouldSyncScheduleEntriesToCloud, supabaseUserId]);

  const handleBackHomeFromOfficialStudy = React.useCallback(async () => {
    const finishedSessionId = officialStudyResult?.sessionId || null;
    setOfficialStudyAnswerFeedback(null);
    setOfficialStudyResult(null);
    setOfficialStudyResultMeta(null);
    setActiveTab('inicio');
    if (finishedSessionId) {
      await loadOfficialStudyHomeAfterCompletion(finishedSessionId);
      return;
    }

    await loadOfficialStudyHome();
  }, [loadOfficialStudyHome, loadOfficialStudyHomeAfterCompletion, officialStudyResult?.sessionId]);

  const handleCommitReviewDecision = React.useCallback(async (input: SubmitReviewDecisionInput) => {
    const currentEntries = readPersistedScheduleEntries(scheduleEntriesStorageKey);
    const mutation = submitReviewDecision(currentEntries, input);
    if (!mutation) {
      return null;
    }

    persistScheduleEntriesSnapshot(mutation.entries, scheduleEntriesStorageKey);
    setPersistedScheduleEntries(mutation.entries);

    if (shouldSyncScheduleEntriesToCloud && supabaseUserId) {
      await studyScheduleService.upsertEntry(supabaseUserId, mutation.updatedEntry).catch(() => undefined);
    }

    const nextReviewQueueState = buildHomeReviewQueueState(mutation.entries);
    if (nextReviewQueueState.status === 'completed_today') {
      setHomeCompletionSignal(createHomeCompletionSignal('review', input.reviewedAt));
    }

    return mutation.result;
  }, [scheduleEntriesStorageKey, setHomeCompletionSignal, shouldSyncScheduleEntriesToCloud, supabaseUserId]);

  const handleContinueFromOfficialStudyResult = React.useCallback(async () => {
    if (officialStudyResultMeta?.isFirstSession) {
      scheduleNextSessionCommit('official');
      if (officialStudyHomeState.status === 'ready') {
        persistNextMissionResumeState({
          source: 'official',
          subject: officialStudyHomeState.recommendation?.disciplineName || officialStudyHomeState.home.mission.discipline,
          topic: officialStudyHomeState.recommendation?.topicName || officialStudyHomeState.home.mission.topic,
          questionsTotal: OFFICIAL_STUDY_SESSION_QUESTION_LIMIT,
          scheduledAt: new Date().toISOString(),
        });
      }
      trackBeginnerEvent('beginner_next_step_clicked', {
        completedMissionId: officialStudyResultMeta.beginnerMissionId || officialStudyResult?.sessionId || 'official-first-session',
        nextMissionId: officialStudyResultMeta.nextMissionId || null,
        source: 'official_post_session',
      });
      trackEvent(
        'official_next_session_scheduled',
        {
          sessionId: officialStudyResult?.sessionId || null,
          source: 'official_post_session',
        },
        { userEmail: user?.email },
      );
    }

    await handleBackHomeFromOfficialStudy();
  }, [
    handleBackHomeFromOfficialStudy,
    officialStudyHomeState,
    officialStudyResult?.sessionId,
    officialStudyResultMeta,
    persistNextMissionResumeState,
    scheduleNextSessionCommit,
    trackBeginnerEvent,
    user?.email,
  ]);

  const handleOpenScheduleFromOfficialStudyResult = React.useCallback(async () => {
    const finishedSessionId = officialStudyResult?.sessionId || null;
    setOfficialStudyAnswerFeedback(null);
    setOfficialStudyResult(null);
    setOfficialStudyResultMeta(null);
    setActiveTab('cronograma');
    if (finishedSessionId) {
      await loadOfficialStudyHomeAfterCompletion(finishedSessionId);
      return;
    }

    await loadOfficialStudyHome();
  }, [loadOfficialStudyHome, loadOfficialStudyHomeAfterCompletion, officialStudyResult?.sessionId]);

  React.useEffect(() => {
    if (!isLoggedIn || !user?.email) {
      profileHydratedEmailRef.current = null;
      profileCloudHydratedEmailRef.current = null;
      setProfileSyncStatus('local');
      setLastProfileSyncAt(null);
      return;
    }

    if (profileHydratedEmailRef.current === user.email) {
      return;
    }

    profileHydratedEmailRef.current = user.email;
    setProfileDisplayName((previous) => previous || user.nome || '');
    setProfileAvatar((previous) => previous || user.foto || '\u{1F464}');
    setProfileExamGoal((previous) => previous || user.examGoal || '');
    setProfileExamDate((previous) => previous || user.examDate || '');
    if (!lastProfileSavedAt && user.preferredTrack) {
      setPreferredStudyTrack(user.preferredTrack);
    }
  }, [
    isLoggedIn,
    user?.email,
    user?.nome,
    user?.foto,
    user?.examGoal,
    user?.examDate,
    user?.preferredTrack,
    lastProfileSavedAt,
    setProfileDisplayName,
    setProfileAvatar,
    setProfileExamGoal,
    setProfileExamDate,
    setLastProfileSavedAt,
    setPreferredStudyTrack,
  ]);

  React.useEffect(() => {
    if (!isLoggedIn || !supabaseUserId || !isSupabaseConfigured || !user?.email) {
      return;
    }

    if (profileCloudHydratedEmailRef.current === user.email) {
      return;
    }

    profileCloudHydratedEmailRef.current = user.email;
    let cancelled = false;

    const hydrateProfilePreferences = async () => {
      try {
        setProfileSyncStatus('syncing');
        const cloudProfile = await profilePreferencesService.getByUser(supabaseUserId);
        if (cancelled) {
          return;
        }

        if (!cloudProfile) {
          setProfileSyncStatus('local');
          return;
        }

        const cloudSavedAt = cloudProfile.lastSavedAt || cloudProfile.updatedAt;
        const localSavedAt = lastProfileSavedAt;
        const cloudWins = !localSavedAt || new Date(cloudSavedAt).getTime() > new Date(localSavedAt).getTime();

        if (cloudWins) {
          setProfileDisplayName(cloudProfile.displayName || '');
          setProfileAvatar(cloudProfile.avatar || '\u{1F464}');
          setProfileExamGoal(cloudProfile.examGoal || '');
          setProfileExamDate(cloudProfile.examDate || '');
          setPreferredStudyTrack(cloudProfile.preferredTrack || 'enem');
          setProfileChangeHistory(cloudProfile.changeHistory || []);
          setLastProfileSavedAt(cloudSavedAt);
          setProfileSyncStatus('synced');
          setLastProfileSyncAt(new Date().toISOString());
          return;
        }

        await profilePreferencesService.upsert(supabaseUserId, {
          displayName: profileDisplayName,
          avatar: profileAvatar,
          examGoal: profileExamGoal,
          examDate: profileExamDate,
          preferredTrack: preferredStudyTrack,
          changeHistory: profileChangeHistory,
          lastSavedAt: localSavedAt,
        });

        if (!cancelled) {
          setProfileSyncStatus('synced');
          setLastProfileSyncAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          setProfileSyncStatus('error');
        }
      }
    };

    void hydrateProfilePreferences();

    return () => {
      cancelled = true;
    };
  }, [
    isLoggedIn,
    supabaseUserId,
    user?.email,
    profileDisplayName,
    profileAvatar,
    profileExamGoal,
    profileExamDate,
    preferredStudyTrack,
    profileChangeHistory,
    lastProfileSavedAt,
    setProfileDisplayName,
    setProfileAvatar,
    setProfileExamGoal,
    setProfileExamDate,
    setPreferredStudyTrack,
    setProfileChangeHistory,
    setLastProfileSavedAt,
  ]);

  const handleSaveProfile = React.useCallback(
    async (payload: {
      name: string;
      avatar: string;
      examGoal: string;
      examDate: string;
      preferredTrack: StudyTrack;
    }) => {
      const savedAt = new Date().toISOString();
      const summary = `${payload.preferredTrack.toUpperCase()} • ${payload.examGoal || 'Objetivo não definido'}`;

      setProfileDisplayName(payload.name);
      setProfileAvatar(payload.avatar);
      setProfileExamGoal(payload.examGoal);
      setProfileExamDate(payload.examDate);
      setPreferredStudyTrack(payload.preferredTrack);
      setLastProfileSavedAt(savedAt);
      setProfileChangeHistory((previous) => [{ at: savedAt, summary }, ...previous].slice(0, 8));

      if (!supabaseUserId || !isSupabaseConfigured || !supabase) {
        setProfileSyncStatus('local');
        setLastProfileSyncAt(new Date().toISOString());
        return { success: true, message: 'Perfil salvo localmente.' };
      }

      try {
        setProfileSyncStatus('syncing');
        const isDataAvatar = /^data:image\//i.test(payload.avatar);
        await profilePreferencesService.upsert(supabaseUserId, {
          displayName: payload.name,
          avatar: payload.avatar,
          examGoal: payload.examGoal,
          examDate: payload.examDate,
          preferredTrack: payload.preferredTrack,
          changeHistory: [{ at: savedAt, summary }, ...profileChangeHistory].slice(0, 8),
          lastSavedAt: savedAt,
        });

        const { error } = await supabase.auth.updateUser({
          data: {
            name: payload.name,
            avatar_url: isDataAvatar ? undefined : payload.avatar,
            exam_goal: payload.examGoal,
            exam_date: payload.examDate,
            preferred_track: payload.preferredTrack,
          },
        });

        if (error) {
          setProfileSyncStatus('error');
          return { success: false, message: 'Perfil salvo localmente, mas falhou ao sincronizar na nuvem.' };
        }

        setProfileSyncStatus('synced');
        setLastProfileSyncAt(new Date().toISOString());
        return { success: true, message: 'Perfil salvo e sincronizado com sucesso.' };
      } catch {
        setProfileSyncStatus('error');
        return { success: false, message: 'Perfil salvo localmente, mas ocorreu erro de sincronização.' };
      }
    },
    [
      supabaseUserId,
      setProfileDisplayName,
      setProfileAvatar,
      setProfileExamGoal,
      setProfileExamDate,
      setPreferredStudyTrack,
      setLastProfileSavedAt,
      setProfileChangeHistory,
      profileChangeHistory,
    ]
  );

  React.useEffect(() => {
    if (!supabaseUserId || !isSupabaseConfigured) {
      setPreferencesSyncStatus('local');
      setLastPreferencesSyncAt(null);
      return;
    }

    let cancelled = false;

    const hydrateStudyPreferences = async () => {
      try {
        setPreferencesSyncStatus('syncing');
        const cloudPreference = await studyPreferencesService.getByUser(supabaseUserId);
        if (!cloudPreference || cancelled) {
          if (!cancelled) {
            setPreferencesSyncStatus('synced');
            setLastPreferencesSyncAt(new Date().toISOString());
          }
          return;
        }

        setPreferredStudyTrack(cloudPreference.goalType);
        setHybridEnemWeight(cloudPreference.hybridEnemWeight);
        setWeeklyGoalMinutes(cloudPreference.weeklyGoalMinutes);
        setPreferencesSyncStatus('synced');
        setLastPreferencesSyncAt(new Date().toISOString());
      } catch {
        if (!cancelled) {
          setPreferencesSyncStatus('error');
        }
        // fallback local permanece ativo
      }
    };

    void hydrateStudyPreferences();

    return () => {
      cancelled = true;
    };
  }, [supabaseUserId, setPreferredStudyTrack, setHybridEnemWeight, setWeeklyGoalMinutes]);

  React.useEffect(() => {
    if (!supabaseUserId || !isSupabaseConfigured) {
      setPreferencesSyncStatus('local');
      setLastPreferencesSyncAt(null);
      return;
    }

    const primaryTrack: 'enem' | 'concursos' =
      preferredStudyTrack === 'hibrido'
        ? hybridEnemWeight >= 50
          ? 'enem'
          : 'concursos'
        : preferredStudyTrack;

    const secondaryTrack: 'enem' | 'concursos' | null =
      preferredStudyTrack === 'hibrido'
        ? primaryTrack === 'enem'
          ? 'concursos'
          : 'enem'
        : null;

    const timer = window.setTimeout(() => {
      setPreferencesSyncStatus('syncing');
      void studyPreferencesService
        .upsert(supabaseUserId, {
          goalType: preferredStudyTrack,
          hybridEnemWeight,
          weeklyGoalMinutes,
          primaryTrack,
          secondaryTrack,
        })
        .then(() => {
          setPreferencesSyncStatus('synced');
          setLastPreferencesSyncAt(new Date().toISOString());
        })
        .catch(() => {
          setPreferencesSyncStatus('error');
          // fallback local permanece ativo
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [supabaseUserId, preferredStudyTrack, hybridEnemWeight, weeklyGoalMinutes]);

  // tabs list is static and used only when logged in; to avoid changing
  // hook order when login state flips we compute it here so the useMemo runs
  // on every render regardless of isLoggedIn.
  const tabList = React.useMemo(
    () => {
      const shellTabLabels = new Map(studyShellTabs.map((tab) => [tab.id, tab.label] as const));
      return [
      { id: 'inicio', label: shellTabLabels.get('inicio') || 'Inicio', icon: Home },
      { id: 'perfil', label: shellTabLabels.get('perfil') || 'Perfil', icon: Heart },
      { id: 'arvore', label: shellTabLabels.get('arvore') || 'Trilha', icon: GitBranch },
      { id: 'departamento', label: shellTabLabels.get('departamento') || 'Disciplinas', icon: GraduationCap },
      { id: 'mentor', label: 'Mentor IA', icon: Brain },
      { id: 'mentor-admin', label: 'Mentor Admin', icon: BarChart3 },
      { id: 'cronograma', label: shellTabLabels.get('cronograma') || 'Planejamento', icon: CalendarDays },
      { id: 'metodos', label: 'Metodos', icon: Brain },
      { id: 'foco', label: 'Sessao', icon: Clock3 },
      { id: 'dashboard', label: 'Estatisticas', icon: BarChart3 },
      { id: 'questoes', label: 'Questoes', icon: HelpCircle },
      { id: 'simulado', label: 'Simulados', icon: Layers },
      { id: 'flashcards', label: 'Revisoes', icon: BookOpen },
      { id: 'vespera', label: 'Reta final', icon: Zap },
      { id: 'grupos', label: 'Grupos', icon: Users },
      { id: 'ranking-global', label: 'Ranking', icon: Trophy },
      { id: 'conquistas', label: 'Conquistas', icon: Trophy },
      { id: 'configuracoes', label: 'Configuracoes', icon: Settings },
      { id: 'dados', label: 'Dados', icon: Database },
    ];
    },
    [studyShellTabs]
  );

  const genericDomainList = React.useMemo(
    () => [
      {
        id: 'inicio-domain',
        label: 'Inicio',
        icon: Home,
        defaultTab: 'inicio',
        tabIds: ['inicio'],
        eyebrow: 'Painel central',
        description: 'Resumo do dia, constancia, proxima missao e progresso semanal sem te fazer navegar demais.',
      },
      {
        id: 'perfil-domain',
        label: 'Perfil',
        icon: Heart,
        defaultTab: 'perfil',
        tabIds: ['perfil'],
        eyebrow: 'Identidade e progresso',
        description: 'Veja sua evolucao, consistencia e base acumulada em uma leitura curta e acionavel.',
      },
      {
        id: 'plano-domain',
        label: 'Plano',
        icon: Target,
        defaultTab: 'cronograma',
        tabIds: ['cronograma', 'metodos', 'departamento', 'arvore'],
        eyebrow: 'Base do seu estudo',
        description: 'Organize semana, disciplinas, trilha e metodo antes de executar. Aqui o plano ganha forma.',
      },
      {
        id: 'estudo-domain',
        label: 'Estudo',
        icon: Clock3,
        defaultTab: 'foco',
        tabIds: ['foco', 'questoes'],
        eyebrow: 'Execucao do agora',
        description: 'Sessao, foco e pratica guiada. Menos menu, mais fluxo continuo para estudar de verdade.',
      },
      {
        id: 'revisao-domain',
        label: 'Revisoes',
        icon: BookOpen,
        defaultTab: 'flashcards',
        tabIds: ['flashcards', 'vespera'],
        eyebrow: 'Memoria e consolidacao',
        description: 'Separe o que precisa revisar hoje, o que esta atrasado e o que ja ficou consolidado.',
      },
      {
        id: 'simulados-domain',
        label: 'Simulados',
        icon: Layers,
        defaultTab: 'simulado',
        tabIds: ['simulado'],
        eyebrow: 'Teste sob pressao',
        description: 'Registre simulados, acompanhe desempenho por disciplina e veja sua evolucao no tempo.',
      },
      {
        id: 'analise-domain',
        label: 'Analise',
        icon: BarChart3,
        defaultTab: 'dashboard',
        tabIds: ['dashboard', 'conquistas'],
        eyebrow: 'Leitura do que mudou',
        description: 'Historico, estatisticas, consistencia e marcos reais do que voce ja construiu.',
      },
      {
        id: 'mais-domain',
        label: 'Mais',
        icon: Settings,
        defaultTab: 'mentor',
        tabIds: ['mentor', 'mentor-admin', 'grupos', 'ranking-global', 'configuracoes', 'dados'],
        eyebrow: 'Ferramentas extras',
        description: 'Recursos sociais, mentor, configuracoes e camadas avancadas que complementam o fluxo principal.',
      },
    ],
    []
  );

  const domainList = React.useMemo(
    () => (
      isNativeStudyContextMode(resolvedStudyContextMode)
        ? getNativeShellDomains(resolvedStudyContextMode)
        : genericDomainList
    ),
    [genericDomainList, resolvedStudyContextMode],
  );

  const activeDomainId = React.useMemo(() => {
    const found = domainList.find((domain) => domain.tabIds.includes(activeTab));
    return found?.id ?? 'inicio-domain';
  }, [domainList, activeTab]);

  const activeDomain = React.useMemo(
    () => domainList.find((domain) => domain.id === activeDomainId) ?? domainList[0],
    [domainList, activeDomainId]
  );

  const isUnifiedStudyFlow = activeDomain.id === 'estudo-domain';
  const isAnalysisDomain = activeDomain.id === 'analise-domain';

  const activeSubTabs = React.useMemo(
    () =>
      tabList.filter((tab) => {
        if (!activeDomain.tabIds.includes(tab.id)) {
          return false;
        }

        if (tab.id === 'mentor-admin' && !canAccessInternalTools) {
          return false;
        }

        return true;
      }),
    [activeDomain, canAccessInternalTools, tabList]
  );

  const activeTabMeta = React.useMemo(
    () => tabList.find((tab) => tab.id === activeTab) ?? tabList[0],
    [activeTab, tabList],
  );

  const genericSidebarNavSections = React.useMemo<AppSidebarNavSection[]>(
    () => [
      {
        id: 'principal',
        label: 'Principal',
        items: [
          {
            id: 'inicio-nav',
            label: 'Inicio',
            meta: 'Painel central',
            icon: Home,
            tabId: 'inicio',
            isActive: activeTab === 'inicio',
          },
          {
            id: 'plano-nav',
            label: 'Plano',
            meta: 'Base do seu estudo',
            icon: Target,
            tabId: 'cronograma',
            isActive: ['cronograma', 'metodos', 'departamento', 'arvore'].includes(activeTab),
          },
          {
            id: 'estudo-nav',
            label: 'Estudo',
            meta: 'Execucao do agora',
            icon: Clock3,
            tabId: 'foco',
            isActive: ['foco', 'questoes'].includes(activeTab),
          },
          {
            id: 'revisoes-nav',
            label: 'Revisoes',
            meta: 'Memoria e consolidacao',
            icon: BookOpen,
            tabId: 'flashcards',
            isActive: ['flashcards', 'vespera'].includes(activeTab),
          },
          {
            id: 'simulados-nav',
            label: 'Simulados',
            meta: 'Teste sob pressao',
            icon: Layers,
            tabId: 'simulado',
            isActive: activeTab === 'simulado',
          },
        ],
      },
      {
        id: 'analise',
        label: 'Analise',
        items: [
          {
            id: 'perfil-nav',
            label: 'Perfil',
            meta: 'Identidade e progresso',
            icon: Heart,
            tabId: 'perfil',
            isActive: activeTab === 'perfil',
          },
          {
            id: 'historico-nav',
            label: 'Historico',
            meta: 'Marcos e constancia',
            icon: Flame,
            tabId: 'conquistas',
            isActive: activeTab === 'conquistas',
          },
          {
            id: 'estatisticas-nav',
            label: 'Estatisticas',
            meta: 'Leitura do seu ritmo',
            icon: BarChart3,
            tabId: 'dashboard',
            isActive: activeTab === 'dashboard',
          },
        ],
      },
      {
        id: 'mais',
        label: 'Mais',
        items: [
          {
            id: 'mentor-nav',
            label: 'Mentor',
            meta: 'Suporte e direcao',
            icon: Brain,
            tabId: 'mentor',
            isActive: ['mentor', 'mentor-admin'].includes(activeTab),
          },
          {
            id: 'ranking-nav',
            label: 'Ranking',
            meta: 'Ranking e comunidade',
            icon: Trophy,
            tabId: 'ranking-global',
            isActive: ['ranking-global', 'grupos'].includes(activeTab),
          },
          {
            id: 'ajustes-nav',
            label: 'Ajustes',
            meta: 'Conta e preferencias',
            icon: Settings,
            tabId: 'configuracoes',
            isActive: ['configuracoes', 'dados'].includes(activeTab),
          },
        ],
      },
    ],
    [activeTab],
  );

  const sidebarNavSections = React.useMemo<AppSidebarNavSection[]>(
    () => (
      isNativeStudyContextMode(resolvedStudyContextMode)
        ? getNativeSidebarSections(resolvedStudyContextMode, activeTab)
        : genericSidebarNavSections
    ),
    [activeTab, genericSidebarNavSections, resolvedStudyContextMode],
  );

  const shellQuickStats = React.useMemo(
    () => (
      isNativeStudyContextMode(resolvedStudyContextMode)
        ? getNativeShellQuickStats(resolvedStudyContextMode)
        : [
            { label: 'Hoje', value: `${todayMinutes} min` },
            { label: 'Semana', value: `${weeklyCompletedSessions}/${weeklyPlannedSessions}` },
            { label: 'Ritmo', value: `${userData.currentStreak || userData.streak || 0} dias` },
            { label: 'Sync', value: syncStatusMeta.label },
          ]
    ),
    [
      resolvedStudyContextMode,
      syncStatusMeta.label,
      todayMinutes,
      userData.currentStreak,
      userData.streak,
      weeklyCompletedSessions,
      weeklyPlannedSessions,
    ],
  );

  React.useEffect(() => {
    if (!isLoggedIn || typeof window === 'undefined') {
      return;
    }

    const syncTabFromUrl = () => {
      const requestedTab = new URL(window.location.href).searchParams.get('tab');
      if (!requestedTab) {
        return;
      }

      const targetTab = resolveStudyContextRoute(resolvedStudyContextMode, requestedTab);

      if (beginnerToolAccessLocked && !BEGINNER_UNLOCKED_TABS.has(targetTab)) {
        return;
      }

      setActiveTab(targetTab);
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, [beginnerToolAccessLocked, isLoggedIn, resolvedStudyContextMode, tabList]);

  useEffect(() => {
    if (!isUnifiedStudyFlow) {
      return;
    }

    if (activeTab === 'metodos' || activeTab === 'cronograma') {
      setShowStudyAdjustments(true);
    }

    const targetRef =
      activeTab === 'questoes'
        ? studyQuestionsSectionRef
        : activeTab === 'foco'
          ? focusTimerSectionRef
          : activeTab === 'metodos' || activeTab === 'cronograma'
            ? studyAdjustmentsSectionRef
            : studyFlowTopRef;

    const frameId = window.requestAnimationFrame(() => {
      if (activeTab === 'metodos' || activeTab === 'cronograma') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, isUnifiedStudyFlow]);

  const beginnerUnlockedTabs = React.useMemo(() => new Set(['inicio', 'foco', 'questoes', 'simulado']), []);
  const openScheduleForDay = React.useCallback(
    (day: Weekday) => {
      setRequestedScheduleEditDay(day);
      setRequestedScheduleEditNonce((current) => current + 1);
      setShowStudyAdjustments(true);
      setActiveTab('cronograma');
    },
    [setActiveTab],
  );
  const handleOpenTodaySchedule = React.useCallback(() => {
    openScheduleForDay(todayWeekday);
  }, [openScheduleForDay, todayWeekday]);
  const clearQuestionTransitionTimeout = React.useCallback(() => {
    if (questionTransitionTimeoutRef.current) {
      window.clearTimeout(questionTransitionTimeoutRef.current);
      questionTransitionTimeoutRef.current = null;
    }
  }, []);
  const handleStartStudyFlowSafely = React.useCallback((overrides?: FocusStartOverrides) => {
    if (isStudyFlowBlockedBySchedule) {
      handleOpenTodaySchedule();
      return;
    }

    handleStartRecommendedFocus(overrides);
  }, [handleOpenTodaySchedule, handleStartRecommendedFocus, isStudyFlowBlockedBySchedule]);
  const handleStartQuestionsSafely = React.useCallback(() => {
    if (isStudyFlowBlockedBySchedule) {
      handleOpenTodaySchedule();
      return;
    }

    handleStartRecommendedQuestions();
  }, [handleOpenTodaySchedule, handleStartRecommendedQuestions, isStudyFlowBlockedBySchedule]);
  const handleContinueAfterFocus = React.useCallback(() => {
    if (canContinueWithQuestions) {
      setStudyFlowStep('questionTransition');
      clearQuestionTransitionTimeout();
      questionTransitionTimeoutRef.current = window.setTimeout(() => {
        questionTransitionTimeoutRef.current = null;
        handleStartQuestionsSafely();
      }, 420);
      return;
    }

    handleStartStudyFlowSafely();
  }, [canContinueWithQuestions, clearQuestionTransitionTimeout, handleStartQuestionsSafely, handleStartStudyFlowSafely]);
  const officialStudyFallbackLabel = beginnerToolAccessLocked ? 'Abrir bloco de questoes' : 'Abrir cronograma';
  const handleOpenOfficialStudyFallback = React.useCallback(() => {
    if (beginnerToolAccessLocked) {
      handleStartQuestionsSafely();
      return;
    }

    attemptProtectedNavigation('cronograma');
  }, [attemptProtectedNavigation, beginnerToolAccessLocked, handleStartQuestionsSafely]);
  const officialStudySurfaceCard = React.useMemo(() => {
    if (showOnboarding || !isLoggedIn || !supabaseUserId || !isSupabaseConfigured) {
      return undefined;
    }

    if (officialStudyHomeState.status === 'idle' || officialStudyHomeState.status === 'loading') {
      return {
        status: 'loading' as const,
        title: 'Carregando sua sessao oficial',
        description: 'Buscando o foco atual, o motivo da recomendacao e o proximo CTA real do estudo.',
      };
    }

    if (officialStudyHomeState.status === 'error') {
      return {
        status: 'error' as const,
        title: 'Nao foi possivel abrir seu proximo estudo',
        description: 'Nao foi possivel carregar agora. Tente novamente.',
        actionLabel: 'Tentar novamente',
        onAction: () => {
          void loadOfficialStudyHome();
        },
        secondaryAction: {
          label: officialStudyFallbackLabel,
          onAction: handleOpenOfficialStudyFallback,
        },
      };
    }

    if (officialStudyHomeState.status === 'empty') {
      return {
        status: 'empty' as const,
        title: officialStudyHomeState.title,
        description: officialStudyHomeState.description,
        supportingText: officialStudyHomeState.supportingText,
        actionLabel: officialStudyFallbackLabel,
        onAction: handleOpenOfficialStudyFallback,
      };
    }

    const { home, recommendation } = officialStudyHomeState;
    const activeSession = home.activeStudySession;
    const totalQuestions = activeSession?.totalQuestions || OFFICIAL_STUDY_SESSION_QUESTION_LIMIT;
    const estimatedDurationMinutes = OFFICIAL_STUDY_ESTIMATED_DURATION_MINUTES;
    const prioritizedFocus = !activeSession ? prioritizedScheduledStudyFocus : null;
    const resolvedDiscipline = normalizeSubjectLabel(
      prioritizedFocus?.entry.subject || recommendation?.disciplineName || home.mission.discipline,
      'Outra',
    );
    const resolvedTopic = normalizePresentationLabel(
      prioritizedFocus?.entry.topic || recommendation?.topicName || home.mission.topic,
      'Topico livre',
    );
    const resolvedReason = prioritizedFocus?.reasonSummary || recommendation?.reason || home.mission.reason;
    const resolvedReasonCopy = mapReasonSummaryToCopy(resolvedReason);
    const supportingText = activeSession
      ? 'Sua sessao continua pronta para retomar exatamente do ponto em que voce parou.'
      : prioritizedFocus
        ? 'Bom próximo passo para manter seu ritmo hoje.'
        : 'Recomendado para manter sua semana andando com consistencia.';

    return {
      status: 'ready' as const,
      title: activeSession ? 'Continue sua sessao oficial' : 'Seu proximo estudo ja esta pronto',
      discipline: resolvedDiscipline,
      topic: resolvedTopic,
      reason: resolvedReasonCopy,
      estimatedDurationMinutes,
      sessionTypeLabel: activeSession
        ? 'Sessao curta em andamento'
        : prioritizedFocus
          ? 'Sessao curta priorizada'
          : 'Sessao curta oficial',
      progressLabel: activeSession
        ? `Faltam so ${Math.max(activeSession.totalQuestions - activeSession.answeredQuestions, 0)} questoes para fechar o dia`
        : `Faltam so ${totalQuestions} questoes para fechar o dia`,
      weeklyProgress: weeklySessionProgress,
      supportingText,
      ctaLabel: activeSession ? 'Continuar agora' : 'Estudar agora',
      busy: officialStudyStarting,
      onAction: () => {
        void handleStartOfficialStudy();
      },
      secondaryAction: {
        label: 'Abrir cronograma',
        onAction: handleOpenOfficialStudyFallback,
      },
    };
  }, [
    beginnerToolAccessLocked,
    handleOpenOfficialStudyFallback,
    handleStartOfficialStudy,
    isLoggedIn,
    loadOfficialStudyHome,
    officialStudyFallbackLabel,
    officialStudyHomeState,
    officialStudyStarting,
    prioritizedScheduledStudyFocus,
    showOnboarding,
    supabaseUserId,
    weeklySessionProgress,
  ]);
  const officialStudyCard = React.useMemo(
    () => (activeTab === 'inicio' ? officialStudySurfaceCard : undefined),
    [activeTab, officialStudySurfaceCard],
  );
  const officialStudyNextStep = React.useMemo(() => {
    if (!officialStudyResult) {
      return null;
    }

    const prioritizedFocus = prioritizedScheduledStudyFocus;
    if (prioritizedFocus) {
      return {
        discipline: normalizeSubjectLabel(prioritizedFocus.entry.subject, 'Outra'),
        topic: prioritizedFocus.entry.topic || 'Próximo bloco disponível',
        reason: mapReasonSummaryToCopy(prioritizedFocus.reasonSummary),
      };
    }

    if (officialStudyHomeState.status === 'ready') {
      return {
        discipline: normalizeSubjectLabel(
          officialStudyHomeState.recommendation?.disciplineName || officialStudyHomeState.home.mission.discipline,
          'Outra',
        ),
        topic: officialStudyHomeState.recommendation?.topicName || officialStudyHomeState.home.mission.topic,
        reason: mapReasonSummaryToCopy(
          officialStudyHomeState.recommendation?.reason || officialStudyHomeState.home.mission.reason,
        ),
      };
    }

    return null;
  }, [officialStudyHomeState, officialStudyResult, prioritizedScheduledStudyFocus]);
  const resumePromptMission = React.useMemo(() => {
    if (!isLoggedIn || showOnboarding || resumeEntrySource === 'idle') {
      return null;
    }

    if (officialStudyHomeState.status === 'ready' && officialStudyHomeState.home.activeStudySession) {
      return null;
    }

    if (resumeMissionState?.entry === 'next_mission_ready') {
      return {
        source: resumeEntrySource === 'notification' ? 'notification' as const : 'auto' as const,
        missionId: resumeMissionState.currentMission.id,
        subject: resumeMissionState.currentMission.subject,
        topic: resumeMissionState.currentMission.topic,
        questionsDone: resumeMissionState.currentMission.questionsDone,
        totalQuestions: resumeMissionState.currentMission.questionsTotal,
      };
    }

    if (officialStudyHomeState.status === 'ready' && !officialStudyHomeState.home.activeStudySession) {
      return {
        source: resumeEntrySource === 'notification' ? 'notification' as const : 'auto' as const,
        missionId: normalizeResumeMissionId(
          officialStudyHomeState.recommendation?.disciplineName || officialStudyHomeState.home.mission.discipline,
          officialStudyHomeState.recommendation?.topicName || officialStudyHomeState.home.mission.topic,
          new Date().toISOString(),
        ),
        subject: normalizeSubjectLabel(
          officialStudyHomeState.recommendation?.disciplineName || officialStudyHomeState.home.mission.discipline,
          'Matematica',
        ),
        topic: normalizePresentationLabel(
          officialStudyHomeState.recommendation?.topicName || officialStudyHomeState.home.mission.topic,
          'Proxima missao',
        ),
        questionsDone: 0,
        totalQuestions: OFFICIAL_STUDY_SESSION_QUESTION_LIMIT,
      };
    }

    return null;
  }, [isLoggedIn, officialStudyHomeState, resumeEntrySource, resumeMissionState, showOnboarding]);
  const continuationActionMission = React.useMemo(() => {
    if (resumePromptMission) {
      return resumePromptMission;
    }

    if (!homeContinuationMission || resumeMissionState?.entry !== 'next_mission_ready') {
      return null;
    }

    return {
      source: 'auto' as const,
      missionId: resumeMissionState.currentMission.id,
      subject: homeContinuationMission.subject,
      topic: homeContinuationMission.topic,
      questionsDone: homeContinuationMission.questionsDone,
      totalQuestions: homeContinuationMission.totalQuestions,
    };
  }, [homeContinuationMission, resumeMissionState, resumePromptMission]);
  const sidebarQuickAction = React.useMemo(() => {
    if (isNativeStudyContextMode(resolvedStudyContextMode)) {
      return getNativeShellQuickAction(resolvedStudyContextMode);
    }

    if (activeDomainId === 'estudo-domain') {
      const totalQuestions = resumePromptMission?.totalQuestions || resumeMissionState?.currentMission.questionsTotal || 3;
      const answeredQuestions = resumePromptMission?.questionsDone || resumeMissionState?.currentMission.questionsDone || 0;
      const remainingQuestions = Math.max(1, totalQuestions - answeredQuestions);
      const estimatedMinutes = Math.max(2, Math.round((remainingQuestions * 40) / 60));
      const missionSubject = normalizeSubjectLabel(
        resumePromptMission?.subject
          || resumeMissionState?.currentMission.subject
          || officialStudyCard?.discipline
          || officialStudyNextStep?.discipline
          || 'Matematica',
        'Matematica',
      );
      const missionTopic = normalizePresentationLabel(
        resumePromptMission?.topic
          || resumeMissionState?.currentMission.topic
          || officialStudyCard?.topic
          || officialStudyNextStep?.topic
          || 'Sessao pronta',
        'Sessao pronta',
      );

      return {
        heading: `Continuar ${missionSubject}`,
        description: `${remainingQuestions} questoes rapidas / ~${estimatedMinutes} min / ${missionTopic}`,
        actionLabel: resumePromptMission ? 'Retomar agora' : 'Abrir sessao',
        compactLabel: resumePromptMission ? 'Retomar' : 'Abrir',
        targetTab: 'foco',
      };
    }

    if (activeDomainId === 'analise-domain') {
      return {
        heading: 'Ler seus sinais',
        description: 'Historico, consistencia e estatisticas sem sair do fluxo.',
        actionLabel: 'Ver leitura',
        compactLabel: 'Ler',
        targetTab: activeDomain.defaultTab,
      };
    }

    return {
      heading: `Abrir ${activeDomain.label}`,
      description: 'Mentor, ranking e ajustes ficam por aqui quando voce precisar.',
      actionLabel: `Ir para ${activeDomain.label}`,
      compactLabel: 'Abrir',
      targetTab: activeDomain.defaultTab,
    };
  }, [
    activeDomain.defaultTab,
    activeDomain.label,
    activeDomainId,
    officialStudyCard?.discipline,
    officialStudyCard?.topic,
    officialStudyNextStep?.discipline,
    officialStudyNextStep?.topic,
    resolvedStudyContextMode,
    resumeMissionState?.currentMission.questionsDone,
    resumeMissionState?.currentMission.questionsTotal,
    resumeMissionState?.currentMission.subject,
    resumeMissionState?.currentMission.topic,
    resumePromptMission,
  ]);
  const shouldHoldScreenForResumeLoad = resumeEntrySource !== 'idle'
    && !showOnboarding
    && Boolean(isSupabaseConfigured && supabaseUserId)
    && !officialStudySession
    && !officialStudyResult
    && !lastBeginnerResult
    && !resumePromptMission
    && (officialStudyHomeState.status === 'idle' || officialStudyHomeState.status === 'loading');

  React.useEffect(() => {
    if (officialStudyHomeState.status !== 'ready' || resumeMissionState?.entry !== 'next_mission_ready') {
      return;
    }

    const nextSubject = officialStudyHomeState.recommendation?.disciplineName || officialStudyHomeState.home.mission.discipline;
    const nextTopic = officialStudyHomeState.recommendation?.topicName || officialStudyHomeState.home.mission.topic;
    const currentSubject = resumeMissionState.currentMission.subject;
    const currentTopic = resumeMissionState.currentMission.topic;

    if (nextSubject === currentSubject && nextTopic === currentTopic) {
      return;
    }

    persistNextMissionResumeState({
      source: resumeMissionState.source,
      scheduledAt: resumeMissionState.scheduledAt,
      subject: nextSubject,
      topic: nextTopic,
      questionsTotal: resumeMissionState.currentMission.questionsTotal,
      missionId: resumeMissionState.currentMission.id,
    });
  }, [officialStudyHomeState, persistNextMissionResumeState, resumeMissionState]);

  React.useEffect(() => {
    if (!isLoggedIn || showOnboarding || resumeEntrySource !== 'notification') {
      return;
    }

    const notificationKey = `${window.location.pathname}|${resumeMissionState?.currentMission.id || 'resume'}`;
    if (lastNotificationOpenKeyRef.current === notificationKey) {
      return;
    }

    lastNotificationOpenKeyRef.current = notificationKey;
    trackEvent(
      'd1_notification_opened',
      {
        missionId: resumeMissionState?.currentMission.id || null,
      },
      { userEmail: user?.email },
    );
    void pushApiService.sendHeartbeat('d1_notification_opened');
  }, [isLoggedIn, resumeEntrySource, resumeMissionState?.currentMission.id, showOnboarding, user?.email]);

  React.useEffect(() => {
    if (!resumePromptMission || officialStudySession || officialStudyResult || lastBeginnerResult) {
      return;
    }

    const nextKey = `${resumeEntrySource}:${resumePromptMission.missionId}:${resumePromptMission.questionsDone}`;
    if (lastResumeScreenViewKeyRef.current === nextKey) {
      return;
    }

    lastResumeScreenViewKeyRef.current = nextKey;
    trackEvent(
      'resume_screen_viewed',
      {
        source: resumeEntrySource,
        missionId: resumePromptMission.missionId,
        questionsDone: resumePromptMission.questionsDone,
        totalQuestions: resumePromptMission.totalQuestions,
      },
      { userEmail: user?.email },
    );
  }, [
    lastBeginnerResult,
    officialStudyResult,
    officialStudySession,
    resumeEntrySource,
    resumePromptMission,
    user?.email,
  ]);

  React.useEffect(() => {
    if (!isLoggedIn || showOnboarding || resumeEntrySource === 'idle' || officialStudySession || officialStudyResult || lastBeginnerResult) {
      return;
    }

    const activeSessionId = resumeMissionState?.entry === 'active_session'
      ? resumeMissionState.currentMission.sessionId || null
      : officialStudyHomeState.status === 'ready'
        ? officialStudyHomeState.home.activeStudySession?.sessionId || null
        : null;

    if (!activeSessionId) {
      return;
    }

    const attemptKey = `${resumeEntrySource}:${activeSessionId}`;
    if (resumeAutostartAttemptKeyRef.current === attemptKey) {
      return;
    }

    resumeAutostartAttemptKeyRef.current = attemptKey;
    void handleStartOfficialStudy({
      source: resumeEntrySource === 'notification' ? 'notification_resume' : 'auto_resume',
      forceResumeSessionId: activeSessionId,
    });
  }, [
    handleStartOfficialStudy,
    isLoggedIn,
    lastBeginnerResult,
    officialStudyHomeState,
    officialStudyResult,
    officialStudySession,
    resumeEntrySource,
    resumeMissionState,
    showOnboarding,
  ]);

  React.useEffect(() => {
    if (resumeEntrySource === 'idle' || showOnboarding || officialStudySession || officialStudyResult || lastBeginnerResult) {
      return;
    }

    if (officialStudyHomeState.status === 'error' || officialStudyHomeState.status === 'empty') {
      clearResumeLocationState();
      setResumeEntrySource('idle');
    }
  }, [
    lastBeginnerResult,
    officialStudyHomeState.status,
    officialStudyResult,
    officialStudySession,
    resumeEntrySource,
    showOnboarding,
  ]);

  const handleContinueResumeMission = React.useCallback(() => {
    if (!continuationActionMission) {
      return;
    }

    trackEvent(
      'resume_clicked',
      {
        source: continuationActionMission.source,
        missionId: continuationActionMission.missionId,
        questionsDone: continuationActionMission.questionsDone,
        totalQuestions: continuationActionMission.totalQuestions,
      },
      { userEmail: user?.email },
    );
    void handleStartOfficialStudy({
      source: continuationActionMission.source === 'notification' ? 'notification_resume' : 'resume_prompt',
    });
  }, [continuationActionMission, handleStartOfficialStudy, user?.email]);

  React.useEffect(() => {
    if (studyFlowStep !== 'questionTransition') {
      clearQuestionTransitionTimeout();
      return;
    }

    if (isStudyFlowBlockedBySchedule || activeTab !== 'foco') {
      clearQuestionTransitionTimeout();
      setStudyFlowStep((current) => (current === 'questionTransition' ? 'idle' : current));
    }
  }, [activeTab, clearQuestionTransitionTimeout, isStudyFlowBlockedBySchedule, studyFlowStep]);

  React.useEffect(() => () => {
    clearQuestionTransitionTimeout();
  }, [clearQuestionTransitionTimeout]);

  // Aguardar verificação de sessão do Supabase
  const studySessionRestoreAppliedRef = React.useRef(false);

  React.useEffect(() => {
    studySessionRestoreAppliedRef.current = false;
  }, [userStorageScope]);

  React.useEffect(() => {
    if (!isLoggedIn || !user?.email || studySessionRestoreAppliedRef.current) {
      return;
    }

    studySessionRestoreAppliedRef.current = true;

    const persistedSessionEntries = getActiveStudySessionEntries(userStorageScope);
    if (persistedSessionEntries.length === 0) {
      return;
    }

    const restoredEntry = getLatestActiveStudySessionEntry(userStorageScope);
    if (!restoredEntry) {
      return;
    }

    persistedSessionEntries.forEach((entry) => {
      if (entry.storageKey !== restoredEntry.storageKey) {
        clearPersistedStudySession(entry.storageKey);
      }
    });

    const restoredSession = restoredEntry.session;

    clearQuestionTransitionTimeout();
    setLastCompletedFocus(null);
    setShowStudyAdjustments(false);
    setStudyFlowStep('focusing');

    const restoredFocusMinutes = Math.max(1, Math.round(restoredSession.plannedDurationMs / 60000));
    const normalizedRestoredDuration = normalizeQuickSessionDuration(restoredFocusMinutes);

    setFocusExecutionState(
      {
        subject: restoredSession.subject,
        ...(restoredSession.source === 'pomodoro'
          ? { duration: normalizedRestoredDuration }
          : {}),
      },
      'manual',
      restoredSession.methodId ?? activeStudyMethod.id,
    );

    if (restoredSession.methodId) {
      setSelectedMethodId(restoredSession.methodId);
    }

    if (restoredSession.source === 'pomodoro') {
      setPlannedFocusDuration(normalizedRestoredDuration);
      setActiveStudyMode('pomodoro');
    } else {
      setActiveStudyMode('livre');
    }

    setActiveTab('foco');
  }, [
    activeStudyMethod.id,
    clearQuestionTransitionTimeout,
    isLoggedIn,
    setActiveStudyMode,
    setActiveTab,
    setFocusExecutionState,
    setPlannedFocusDuration,
    setSelectedMethodId,
    user?.email,
    userStorageScope,
  ]);
  const shouldRenderNativeShell = canResolveNativeShellTab(resolvedStudyContextMode, activeTab);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    (
      window as typeof window & {
        __ZB_STUDY_CONTEXT_DEBUG__?: Record<string, unknown>;
      }
    ).__ZB_STUDY_CONTEXT_DEBUG__ = {
      authLoading,
      isLoggedIn,
      studyContextBootstrapStatus,
      activeStudyContextMode: activeStudyContext?.mode || null,
      activeStudyContextUpdatedAt: activeStudyContext?.updatedAt || null,
      resolvedStudyContextMode,
      detectedProductPhase,
      effectiveProductPhase,
      usesLegacyBeginnerBootstrap,
      beginnerToolAccessLocked,
      showOnboarding,
      activeTab,
      shouldRenderNativeShell,
      nativeShellMode: shouldRenderNativeShell ? resolvedStudyContextMode : null,
      officialStudyHomeStatus: officialStudyHomeState.status,
      userStorageScope,
    };

    return () => {
      delete (
        window as typeof window & {
          __ZB_STUDY_CONTEXT_DEBUG__?: Record<string, unknown>;
        }
      ).__ZB_STUDY_CONTEXT_DEBUG__;
    };
  }, [
    activeStudyContext?.mode,
    activeStudyContext?.updatedAt,
    activeTab,
    authLoading,
    beginnerToolAccessLocked,
    detectedProductPhase,
    effectiveProductPhase,
    isLoggedIn,
    officialStudyHomeState.status,
    resolvedStudyContextMode,
    shouldRenderNativeShell,
    showOnboarding,
    studyContextBootstrapStatus,
    userStorageScope,
    usesLegacyBeginnerBootstrap,
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show auth screens
  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="top-center" />
        {showRegister ? (
          <RegisterForm
            onRegister={handleRegister}
            onSocialLogin={handleSocialLogin}
            enabledSocialProviders={enabledOAuthProviders}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm
            onLogin={handleLogin}
            onSocialLogin={handleSocialLogin}
            enabledSocialProviders={enabledOAuthProviders}
            onResetPassword={resetPassword}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </>
    );
  }

  if (shouldHoldScreenForResumeLoad) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-3xl rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resume session</p>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">
              Carregando sua continuidade
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Estamos abrindo a sua proxima missao sem passar pela home.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (resumePromptMission && !officialStudySession && !officialStudyResult && !lastBeginnerResult) {
    return (
      <>
        <Toaster position="top-center" />
        <ResumeMissionPage
          subject={resumePromptMission.subject}
          topic={resumePromptMission.topic}
          questionsDone={resumePromptMission.questionsDone}
          totalQuestions={resumePromptMission.totalQuestions}
          estimatedMinutesRemaining={getEstimatedMinutesRemaining(
            resumePromptMission.totalQuestions,
            resumePromptMission.questionsDone,
          )}
          source={resumePromptMission.source}
          onContinue={handleContinueResumeMission}
        />
      </>
    );
  }

  if (officialStudySession) {
    return (
      <>
        <Toaster position="top-center" />
        <OfficialStudySessionPage
          session={officialStudySession}
          answering={officialStudyAnswering}
          finishing={officialStudyFinishing}
          latestFeedback={officialStudyAnswerFeedback}
          onAnswer={handleAnswerOfficialStudyQuestion}
          onFinish={handleFinishOfficialStudy}
        />
      </>
    );
  }

  if (officialStudyResult) {
    return (
      <>
        <Toaster position="top-center" />
        <OfficialStudySessionResultView
          result={officialStudyResult}
          topicLabel={officialStudyResultMeta?.topic || officialStudyResultMeta?.subject || null}
          xpPoints={officialStudyResultMeta?.xpPoints || 0}
          isFirstSession={Boolean(officialStudyResultMeta?.isFirstSession)}
          nextStep={officialStudyNextStep}
          nextStepLoading={officialStudyFinishing || officialStudyHomeState.status === 'loading'}
          weeklyProgress={weeklySessionProgress}
          onContinue={handleContinueFromOfficialStudyResult}
          onViewSchedule={handleOpenScheduleFromOfficialStudyResult}
        />
      </>
    );
  }

  const homePageContent = (
    <HomeWorkspacePage
      darkMode={darkMode}
      preferredTrack={preferredStudyTrack}
      hybridEnemWeight={hybridEnemWeight}
      profileContext={homeProfileContext}
      userName={resolvedDisplayName}
      todayMinutes={todayMinutes}
      dailyGoalMinutes={userData.dailyGoal || 90}
      currentStreak={userData.currentStreak || userData.streak || 0}
      weeklyCompletedSessions={weeklyCompletedSessions}
      weeklyPlannedSessions={weeklyPlannedSessions}
      totalPoints={userData.totalPoints}
      completedContentCount={completedContentIds.length}
      syncStatusLabel={syncStatusMeta.label}
      syncStatusTone={syncStatusMeta.tone}
      sessions={effectiveSessions}
      officialStudyCard={officialStudyCard}
      reviewQueueItems={homeReviewQueueItems}
      reviewQueueState={homeReviewQueueState}
      nextSessionCommit={homeNextSessionCommit}
      continuationMission={homeContinuationMission}
      completionSignal={homeCompletionSignal}
      onStartStudy={() => {
        setHomeCompletionSignal(null);

        if (homeContinuationMission) {
          handleContinueResumeMission();
          return;
        }

        if (officialStudyCard?.status === 'ready' && officialStudyCard.onAction) {
          officialStudyCard.onAction();
          return;
        }

        if (isStudyFlowBlockedBySchedule) {
          handleOpenTodaySchedule();
          return;
        }

        startQuickSession(25, 'hero_cta', heroVariant);
      }}
      onOpenPlanning={() => {
        setHomeCompletionSignal(null);
        attemptProtectedNavigation('cronograma');
      }}
      onOpenReviews={() => {
        setHomeCompletionSignal(null);
        attemptProtectedNavigation('flashcards');
      }}
      onOpenStatistics={() => {
        setHomeCompletionSignal(null);
        attemptProtectedNavigation('dashboard');
      }}
      onOpenSimulados={() => attemptProtectedNavigation('simulado')}
      onOpenTrail={() => attemptProtectedNavigation('arvore')}
      onOpenMentor={() => attemptProtectedNavigation('mentor')}
      onConsumeCompletionSignal={() => setHomeCompletionSignal(null)}
    />
  );

  const profilePageContent = (
    <Suspense fallback={<div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Carregando perfil...</div>}>
      <ProfilePage
        darkMode={darkMode}
        displayName={resolvedDisplayName}
        email={user?.email}
        profileAvatar={profileAvatar}
        examGoal={profileExamGoal}
        examDate={profileExamDate}
        weeklyGoalMinutes={weeklyGoalMinutes}
        syncStatusLabel={syncStatusMeta.label}
        userData={userData}
        sessions={effectiveSessions}
        scheduleEntries={persistedScheduleEntries}
        onOpenSettings={() => attemptProtectedNavigation('configuracoes')}
        profileContext={profileTrackContext}
        onReviewContext={() => setShowOnboarding(true)}
      />
    </Suspense>
  );

  const planningPageContent = (
    <PlanningWorkspacePage
      darkMode={darkMode}
      weeklySchedule={weeklySchedule}
      studyContextForToday={effectiveStudyContextForToday}
      weeklyCompletedSessions={weeklyCompletedSessions}
      weeklyPlannedSessions={weeklyPlannedSessions}
      todayCompletedSessions={todayCompletedSessions}
      currentBlockLabel={currentBlockDisplayLabel}
      currentBlockObjective={effectiveStudyExecutionState.currentBlock.objective}
      currentBlockDurationMinutes={effectiveStudyExecutionState.currentBlock.duration || plannedFocusDuration}
      scheduleEntries={persistedScheduleEntries}
      onStartStudy={handleStartStudyFlowSafely}
      onEditDay={openScheduleForDay}
      profileContext={planoProfileContext}
      calendar={(
        <StudyScheduleCalendar
          userId={supabaseUserId}
          weeklySchedule={weeklySchedule}
          onChangeWeeklySchedule={setWeeklyScheduleRaw}
          studyContextMode={isNativeStudyContextMode(resolvedStudyContextMode) ? resolvedStudyContextMode : null}
          scheduleScope={nativePlannerStorageScope}
          studyContextForToday={effectiveStudyContextForToday}
          officialTodayActionCard={officialStudySurfaceCard}
          weeklyCompletedSessions={weeklyCompletedSessions}
          todayCompletedSessions={todayCompletedSessions}
          completedWeekdays={completedWeekdays}
          requestedEditDay={requestedScheduleEditDay}
          requestedEditNonce={requestedScheduleEditNonce}
        />
      )}
    />
  );

  const nativeShellMeta = isNativeStudyContextMode(resolvedStudyContextMode)
    ? getNativeShellHeroMeta(resolvedStudyContextMode)
    : null;
  const nativeShellContent = shouldRenderNativeShell ? (
    <AppShellResolver
      mode={resolvedStudyContextMode}
      activeTab={activeTab}
      darkMode={darkMode}
      userId={supabaseUserId}
      profileContext={profileTrackContext}
      homeSlot={homePageContent}
      planningSlot={planningPageContent}
      profileSlot={profilePageContent}
      onNavigate={attemptProtectedNavigation}
      onReviewContext={() => setShowOnboarding(true)}
    />
  ) : null;

  // Main app
  return (
    <div className={`relative min-h-screen overflow-x-clip transition-colors ${darkMode ? 'dark' : ''}`}>
      <Toaster position="top-center" />
      <NotificationSetup />

      {showOnboarding && (
        <OnboardingFlow
          userName={resolvedDisplayName}
          initialDailyGoal={userData.dailyGoal || 60}
          initialMethodId={selectedMethodId}
          initialFocusType={resolvedOnboardingMeta?.focus || resolvedStudyContextMode}
          onComplete={handleCompleteOnboarding}
        />
      )}

      <div className="fixed inset-0 -z-20 bg-[linear-gradient(180deg,#e8eef5_0%,#f3f6fa_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-90 [background-image:radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.10),transparent_22%)] dark:[background-image:radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_18%)]" />

      <main className="mx-auto max-w-[1500px] px-3 pb-10 pt-3 sm:px-4 sm:pt-4 lg:px-6">
        <div
          className="grid grid-cols-1 gap-4 xl:gap-6 xl:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)] xl:[transition:grid-template-columns_240ms_cubic-bezier(0.22,1,0.36,1)]"
          style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
        >
          <AppSidebar
            darkMode={darkMode}
            isExpanded={isSidebarExpanded}
            isDisabled={beginnerToolAccessLocked}
            modeBadgeLabel={studyMode === 'focus' ? 'Foco' : 'Fluxo'}
            quickStats={shellQuickStats}
            sections={sidebarNavSections}
            quickAction={{
              heading: sidebarQuickAction.heading,
              description: sidebarQuickAction.description,
              actionLabel: sidebarQuickAction.actionLabel,
              compactLabel: sidebarQuickAction.compactLabel,
              onAction: () => {
                attemptProtectedNavigation(sidebarQuickAction.targetTab);
              },
            }}
            onToggle={toggleSidebarMode}
            onNavigate={(tabId) => {
              attemptProtectedNavigation(tabId);
            }}
          />

          <section className="min-w-0 xl:pt-0.5">
            <AppTopbar
              darkMode={darkMode}
              contextEyebrow={activeDomain.eyebrow}
              contextTitle={activeDomain.label}
              contextMeta={activeTabMeta.label}
              syncStatusLabel={syncStatusMeta.label}
              syncStatusTone={syncStatusMeta.tone}
              studyMode={studyMode}
              onToggleStudyMode={toggleStudyMode}
              userName={resolvedDisplayName}
              userAvatar={profileAvatar}
              onOpenHelp={() => attemptProtectedNavigation('mentor')}
              onToggleDarkMode={handleToggleDarkMode}
              onOpenSettings={() => attemptProtectedNavigation('configuracoes')}
              onOpenData={() => attemptProtectedNavigation('dados')}
              onSyncNow={handleSyncNow}
              disableSyncNow={syncUiStatus.isSyncing}
              onShowConflictHistory={handleShowConflictHistory}
              onLogout={() => {
                void handleLogout();
              }}
            />

            <div className={`xl:hidden flex gap-3 overflow-x-auto pb-2 transition-opacity ${beginnerToolAccessLocked ? 'opacity-60' : 'opacity-100'}`}>
              {domainList.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => attemptProtectedNavigation(domain.defaultTab)}
                  className={`min-w-[146px] rounded-[24px] border px-4 py-3 text-left transition ${
                    activeDomainId === domain.id
                      ? darkMode
                        ? 'border-cyan-900/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.22)_0%,rgba(15,23,42,0.96)_100%)] text-slate-100 shadow-[0_18px_32px_-22px_rgba(8,145,178,0.5)]'
                        : 'border-[#c6fbff] bg-[#dffcff] text-slate-900 shadow-[0_18px_32px_-22px_rgba(14,165,233,0.24)]'
                      : 'border-slate-200/80 bg-white/90 text-slate-700 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <domain.icon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{domain.eyebrow}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{domain.label}</p>
                </button>
              ))}
            </div>

            <div className={`relative mb-6 overflow-hidden rounded-[32px] border p-4 shadow-[0_22px_55px_-34px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:mb-8 sm:p-6 ${
              isAnalysisDomain
                ? darkMode
                  ? 'border-slate-800/90 bg-slate-950/92 shadow-[0_28px_65px_-34px_rgba(2,6,23,0.68)]'
                  : 'border-sky-100/90 bg-white/92 shadow-[0_28px_65px_-34px_rgba(125,211,252,0.18)]'
                : darkMode
                  ? 'border-slate-800/90 bg-slate-950/92 shadow-[0_28px_65px_-34px_rgba(2,6,23,0.68)]'
                  : 'border-slate-200/70 bg-white/92'
            }`}>
              <div
                className={`absolute inset-0 ${isAnalysisDomain && !darkMode ? 'opacity-100' : 'opacity-95'}`}
                style={{
                  background: isAnalysisDomain
                    ? darkMode
                      ? 'radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 28%), radial-gradient(circle at bottom left, rgba(59,130,246,0.14), transparent 26%), linear-gradient(135deg, rgba(2,6,23,0.96), rgba(15,23,42,0.94), rgba(30,41,59,0.90))'
                      : 'radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 26%), radial-gradient(circle at bottom left, rgba(125,211,252,0.18), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,249,253,0.97), rgba(236,246,255,0.96))'
                    : darkMode
                      ? 'radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 28%), radial-gradient(circle at bottom left, rgba(59,130,246,0.14), transparent 26%), linear-gradient(135deg, rgba(2,6,23,0.96), rgba(15,23,42,0.94), rgba(30,41,59,0.9))'
                      : 'radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,249,252,0.92))',
                }}
              />
              <div className="relative">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      isAnalysisDomain
                        ? darkMode
                          ? 'border-slate-700/70 bg-slate-950/78 text-slate-200 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.38)]'
                          : 'border-sky-100/80 bg-white/78 text-sky-800 shadow-[0_10px_24px_-16px_rgba(56,189,248,0.22)]'
                        : darkMode
                          ? 'border-slate-700/70 bg-slate-950/78 text-slate-300'
                          : 'border-white/60 bg-white/55 text-slate-500 backdrop-blur-sm'
                    }`}>
                      {activeDomain.eyebrow}
                    </span>
                    <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] sm:text-[2.1rem] ${
                      isAnalysisDomain ? (darkMode ? 'text-slate-50' : 'text-slate-900') : darkMode ? 'text-slate-50' : 'text-slate-900'
                    }`}>
                      {activeDomain.label}
                    </h2>
                    <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-[15px] ${
                      isAnalysisDomain ? (darkMode ? 'text-slate-300' : 'text-slate-600') : darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {activeDomain.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[420px]">
                    {shellQuickStats.map((stat) => (
                      <div key={stat.label} className={`rounded-[22px] border px-4 py-3 shadow-sm ${
                        isAnalysisDomain
                          ? darkMode
                            ? 'border-slate-800/80 bg-slate-950/82 shadow-[0_14px_28px_-22px_rgba(2,6,23,0.45)]'
                            : 'border-sky-100/90 bg-white/76 shadow-[0_14px_28px_-22px_rgba(56,189,248,0.18)]'
                          : darkMode
                            ? 'border-slate-800/80 bg-slate-950/82'
                            : 'border-white/55 bg-white/52 backdrop-blur-sm'
                      }`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          isAnalysisDomain ? (darkMode ? 'text-slate-400' : 'text-slate-500') : darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>{stat.label}</p>
                        <p className={`mt-2 text-sm font-semibold ${
                          isAnalysisDomain ? (darkMode ? 'text-slate-50' : 'text-slate-900') : darkMode ? 'text-slate-50' : 'text-slate-900'
                        }`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className={`inline-flex items-center gap-2 text-sm ${
                    isAnalysisDomain ? (darkMode ? 'text-slate-300' : 'text-slate-600') : darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      isAnalysisDomain
                        ? darkMode
                          ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                          : 'border-sky-100/80 bg-white/76 text-slate-700'
                        : darkMode
                          ? 'border-slate-700 bg-slate-950/76 text-slate-200'
                          : 'border-white/60 bg-white/55 text-slate-700 backdrop-blur-sm'
                    }`}>
                      {nativeShellMeta?.tabLabel || activeTabMeta.label}
                    </span>
                    <span>{nativeShellMeta?.detail || 'Nova linha visual: painel clean, cards analíticos e navegação mais executiva.'}</span>
                  </div>

                  {activeSubTabs.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {activeSubTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => attemptProtectedNavigation(tab.id)}
                          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                            activeTab === tab.id
                              ? 'border-transparent text-white shadow-sm'
                              : isAnalysisDomain
                                ? darkMode
                                  ? 'border-slate-700 bg-slate-950/80 text-slate-300 hover:bg-slate-900'
                                  : 'border-slate-200/90 bg-white/78 text-slate-600 hover:bg-white shadow-[0_10px_24px_-18px_rgba(148,163,184,0.2)]'
                                : 'border-white/60 bg-white/52 text-slate-600 hover:bg-white/72 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900'
                          }`}
                          style={activeTab === tab.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 rounded-[32px] border border-slate-200/70 bg-white/55 p-3 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/70 dark:shadow-[0_24px_60px_-40px_rgba(2,6,23,0.62)] sm:p-4 lg:p-6">
          {nativeShellContent}
          {/* Página Início */}
          {!shouldRenderNativeShell && activeTab === 'inicio' && homePageContent}

          {/* Página Métodos */}
          {!shouldRenderNativeShell && activeTab === 'perfil' && profilePageContent}

          {isUnifiedStudyFlow && activeTab !== 'metodos' && activeTab !== 'cronograma' && activeTab !== 'foco' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {isStudyFlowBlockedBySchedule ? (
                <div ref={studyFlowTopRef}>
                  <StudyExecutionBanner
                    darkMode={darkMode}
                    eyebrow="Antes de estudar"
                    title={
                      effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'Hoje está livre no seu cronograma'
                        : 'Defina as disciplinas de hoje antes de começar'
                    }
                    description={
                      effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'O estudo não vai inventar uma sessão normal hoje. Reative o dia no cronograma para voltar ao fluxo.'
                        : 'O dia está ativo, mas sem disciplinas definidas. Ajuste o cronograma para o estudo subir com contexto.'
                    }
                    primaryActionLabel={
                      effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'Abrir cronograma'
                        : 'Definir disciplinas'
                    }
                    onPrimaryAction={handleOpenTodaySchedule}
                    meta={[]}
                  />
                </div>
              ) : showQuestionTransitionState ? (
                <div
                  ref={studyFlowTopRef}
                  className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm transition-all duration-200 ease-out dark:border-sky-900 dark:bg-sky-950/30"
                >
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                    <span className="h-2 w-2 rounded-full bg-sky-500 motion-safe:animate-pulse" />
                    Transição
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-sky-950 dark:text-sky-100">
                    {questionTransitionTitle}
                  </h2>
                  <p className="mt-2 text-sm text-sky-900/80 dark:text-sky-100/80">
                    {questionTransitionDescription}
                  </p>
                </div>
              ) : showPostFocusState && lastCompletedFocus ? (
                <div ref={studyFlowTopRef}>
                  <StudyExecutionBanner
                    darkMode={darkMode}
                    eyebrow="Depois do foco"
                    title="Sessão concluída"
                    description={`Você focou em ${lastCompletedFocusDisplayLabel}.`}
                    supportingText={[postFocusPlanConfidenceCopy, postFocusSecondaryCopy, nextStudySuggestionCopy]
                      .filter(Boolean)
                      .join(' ')}
                    primaryActionLabel={postFocusPrimaryActionLabel}
                    onPrimaryAction={handleContinueAfterFocus}
                    secondaryActionLabel="Ajustar plano"
                    onSecondaryAction={handleOpenTodaySchedule}
                    className="transition-all duration-200 ease-out"
                    meta={[
                      { label: 'Bloco', value: lastCompletedFocusDisplayLabel },
                      { label: 'Hoje', value: postFocusProgressCopy },
                      { label: 'Semana', value: weeklyProgressCopy },
                      { label: 'Próximo passo', value: canContinueWithQuestions ? 'Continuar com questões' : 'Continuar estudando' },
                    ]}
                  />
                </div>
              ) : (
              <div ref={studyFlowTopRef}>
                <StudyExecutionBanner
                  darkMode={darkMode}
                  eyebrow={isStudyFlowBlockedBySchedule ? 'Antes de estudar' : 'Agora'}
                  title={`${currentBlockDisplayLabel} • ${effectiveStudyExecutionState.currentBlock.duration || plannedFocusDuration} min de foco`}
                  description="Seu proximo passo e comecar. As questoes entram depois."
                  supportingText={!isStudyFlowBlockedBySchedule ? currentBlockSuggestedTopicCopy : undefined}
                  primaryActionLabel="Comecar agora"
                  onPrimaryAction={scrollToFocusTimer}
                  meta={[]}
                />
              </div>
              )}

              {!isStudyFlowBlockedBySchedule && !showPostFocusState && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Sessao de foco</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Foco</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Execute primeiro. Depois disso, a tela continua em pratica recomendada.
                  </p>
                </div>

                <div
                  ref={focusTimerSectionRef}
                  className="mt-6 space-y-5"
                  data-testid="study-focus-container"
                >
                  {activeStudyMode === 'pomodoro' ? (
                    <PomodoroTimer
                      onFinishSession={handleFinishStudySession}
                      selectedMethodId={selectedMethodId}
                      onSelectMethod={(methodId) => {
                        applyPomodoroMethod(methodId);
                      }}
                      quickStartSignal={academyQuickStartSignal}
                      preferredSubject={focusTimerSubjectOverride || currentBlockTimerSubject}
                      initialFocusMinutes={effectiveStudyExecutionState.currentBlock.duration}
                      preferredTrack={preferredStudyTrack}
                      hybridEnemWeight={hybridEnemWeight}
                      compact
                      displaySubjectLabel={currentBlockDisplayLabel}
                      sessionStorageScope={userStorageScope}
                      userEmail={user?.email}
                    />
                  ) : (
                    <div className="max-w-2xl mx-auto">
                      <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando timer...</div>}>
                        <StudyTimer
                          onFinishSession={handleFinishStudySession}
                          preferredTrack={preferredStudyTrack}
                          hybridEnemWeight={hybridEnemWeight}
                          quickStartSignal={academyQuickStartSignal}
                          preferredSubject={focusTimerSubjectOverride || currentBlockTimerSubject}
                          compact
                          displaySubjectLabel={currentBlockDisplayLabel}
                          sessionStorageScope={userStorageScope}
                          userEmail={user?.email}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </section>
              )}

              {!isStudyFlowBlockedBySchedule && !showQuestionTransitionState && (
              <section ref={studyQuestionsSectionRef} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Depois do foco</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {showPostFocusState ? 'Agora vamos validar esse conteúdo' : 'Valide o que você acabou de estudar'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {showPostFocusState
                        ? 'A pratica entra como continuacao natural da sessao que voce acabou de concluir.'
                        : 'Pratique o bloco recomendado antes de abrir qualquer outra frente.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartQuestionsSafely}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:border-slate-700"
                  >
                    {showPostFocusState ? 'Continuar com questões' : 'Validar com questões'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className={activeTab === 'questoes' ? 'mt-6' : 'hidden'}>
                  <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando questões...</div>}>
                {isStudyFlowBlockedBySchedule ? (
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Pratica protegida</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100">
                      Ajuste o dia antes de validar com questoes
                    </h2>
                    <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
                      O fluxo de pratica so abre quando o cronograma de hoje estiver coerente com o que pode subir na execucao.
                    </p>
                  </div>
                ) : (
                  <QuizPage
                    supabaseUserId={supabaseUserId}
                    initialFilter={quizPrefilter || undefined}
                    recommendedContext={
                      lastCompletedFocus
                        ? {
                            title: `Questões de ${lastCompletedFocusDisplayLabel}`,
                            subtitle: 'Baseado na sua última sessão',
                          }
                        : undefined
                    }
                    onEarnXP={(xp) => {
                      setUserData((prev) => xpEngineService.applyXpDelta(prev, xp));
                      toast.success(`+${xp} XP ganhos nas questões!`);
                    }}
                    onCompleteAttempt={handleCompleteBeginnerAssessment}
                  />
                )}
                  </Suspense>
                </div>
              </section>
              )}

              <section ref={studyAdjustmentsSectionRef} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudyAdjustments(true);
                    setActiveTab('cronograma');
                  }}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Ajustes opcionais</p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Abrir ajustes do plano em um espaco separado
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      Cronograma e metodo ficam fora da tela principal para nao competir com a execucao.
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </button>

                {showStudyAdjustments && activeTab === 'metodos' && (
                  <UnifiedAdjustmentsCombinedPanel
                    controls={(
                      <UnifiedPlanControlsCard
                        eyebrow="Modo da sessao"
                        description="Ajuste trilha, peso e meta semanal apenas quando isso melhorar a execucao real."
                        currentMode={activeStudyMode}
                        onModeChange={handleStudyModeChange}
                        preferredStudyTrack={preferredStudyTrack}
                        onTrackChange={setPreferredStudyTrack}
                        hybridEnemWeight={hybridEnemWeight}
                        hybridConcursoWeight={hybridConcursoWeight}
                        onHybridEnemWeightChange={setHybridEnemWeight}
                        weeklyGoalMinutes={weeklyGoalMinutes}
                        onWeeklyGoalMinutesChange={setWeeklyGoalMinutes}
                        activeStudyMethodName={activeStudyMethod.name}
                        showModeBadge
                        showSyncStatus
                        preferencesSyncStatus={preferencesSyncStatus}
                      />
                    )}
                    methodHub={(
                      <StudyMethodHub
                        userData={userData}
                        selectedMethodId={selectedMethodId}
                        onSelectMethod={(methodId) => {
                          applyPomodoroMethod(methodId);
                        }}
                        onStartMethod={(methodId) => {
                          applyPomodoroMethod(methodId);
                          scrollToFocusTimer();
                        }}
                      />
                    )}
                    calendar={(
                      <StudyScheduleCalendar
                        userId={supabaseUserId}
                        weeklySchedule={weeklySchedule}
                        onChangeWeeklySchedule={setWeeklyScheduleRaw}
                        studyContextMode={isNativeStudyContextMode(resolvedStudyContextMode) ? resolvedStudyContextMode : null}
                        scheduleScope={nativePlannerStorageScope}
                        studyContextForToday={effectiveStudyContextForToday}
                        officialTodayActionCard={officialStudySurfaceCard}
                        weeklyCompletedSessions={weeklyCompletedSessions}
                        todayCompletedSessions={todayCompletedSessions}
                        completedWeekdays={completedWeekdays}
                        requestedEditDay={requestedScheduleEditDay}
                        requestedEditNonce={requestedScheduleEditNonce}
                      />
                    )}
                  />
                )}
              </section>
            </div>
          )}

          {isUnifiedStudyFlow && (activeTab === 'metodos' || activeTab === 'cronograma') && (
            <UnifiedAdjustmentsWorkspacePage
              containerRef={studyAdjustmentsSectionRef}
              activeTab={activeTab === 'cronograma' ? 'cronograma' : 'metodos'}
              onTabChange={setActiveTab}
              onBackToFocus={() => {
                setActiveTab('foco');
                window.setTimeout(() => {
                  scrollToFocusTimer();
                }, 60);
              }}
              title={activeTab === 'cronograma' ? 'Organize sua semana' : 'Como voce vai focar'}
              meta={[
                { label: 'Bloco atual', value: currentBlockDisplayLabel },
                { label: 'Modo ativo', value: activeStudyMode === 'pomodoro' ? 'Pomodoro' : 'Cronometro livre' },
                { label: 'Meta semanal', value: `${weeklyGoalMinutes} min` },
              ]}
              cronogramaControls={(
                <UnifiedPlanControlsCard
                  eyebrow="Configuracao base"
                  description="Ajuste o contexto da sua semana antes de mexer no cronograma."
                  currentMode={activeStudyMode}
                  onModeChange={handleStudyModeChange}
                  preferredStudyTrack={preferredStudyTrack}
                  onTrackChange={setPreferredStudyTrack}
                  hybridEnemWeight={hybridEnemWeight}
                  hybridConcursoWeight={hybridConcursoWeight}
                  onHybridEnemWeightChange={setHybridEnemWeight}
                  weeklyGoalMinutes={weeklyGoalMinutes}
                  onWeeklyGoalMinutesChange={setWeeklyGoalMinutes}
                  activeStudyMethodName={activeStudyMethod.name}
                />
              )}
              calendar={(
                <StudyScheduleCalendar
                  userId={supabaseUserId}
                  weeklySchedule={weeklySchedule}
                  onChangeWeeklySchedule={setWeeklyScheduleRaw}
                  studyContextMode={isNativeStudyContextMode(resolvedStudyContextMode) ? resolvedStudyContextMode : null}
                  scheduleScope={nativePlannerStorageScope}
                  studyContextForToday={effectiveStudyContextForToday}
                  officialTodayActionCard={officialStudySurfaceCard}
                  weeklyCompletedSessions={weeklyCompletedSessions}
                  todayCompletedSessions={todayCompletedSessions}
                  completedWeekdays={completedWeekdays}
                  requestedEditDay={requestedScheduleEditDay}
                  requestedEditNonce={requestedScheduleEditNonce}
                />
              )}
              methodSummary={(
                <UnifiedMethodSummaryCard
                  currentMode={activeStudyMode}
                  onModeChange={handleStudyModeChange}
                  activeStudyMethodName={activeStudyMethod.name}
                  weeklyGoalMinutes={weeklyGoalMinutes}
                  currentBlockLabel={currentBlockDisplayLabel}
                />
              )}
              methodHub={(
                <StudyMethodHub
                  userData={userData}
                  selectedMethodId={selectedMethodId}
                  onSelectMethod={(methodId) => {
                    applyPomodoroMethod(methodId);
                  }}
                  onStartMethod={(methodId) => {
                    applyPomodoroMethod(methodId);
                    handleStartStudyFlowSafely();
                  }}
                />
              )}
            />
          )}

          {!isUnifiedStudyFlow && activeTab === 'metodos' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando métodos...</div>}>
              <div className="space-y-6">
                <StudyExecutionBanner
                  darkMode={darkMode}
                  eyebrow="Metodo recomendado hoje"
                  title={`${activeStudyMethod.name} para destravar a execucao do bloco atual`}
                  description="Metodo deixa de ser catalogo e vira apoio de execucao. Se nada mudou no seu ritmo, use o recomendado e comece."
                  primaryActionLabel="Usar metodo e iniciar foco"
                  onPrimaryAction={() => {
                    setSelectedMethodId(activeStudyMethod.id);
                    handleStartStudyFlowSafely();
                  }}
                  meta={[
                    { label: 'Metodo ativo', value: activeStudyMethod.name },
                    { label: 'Bloco atual', value: currentBlockDisplayLabel },
                    { label: 'Objetivo', value: effectiveStudyExecutionState.currentBlock.objective },
                  ]}
                />
                <StudyMethodHub
                userData={userData}
                selectedMethodId={selectedMethodId}
                onSelectMethod={(methodId) => {
                  applyPomodoroMethod(methodId);
                }}
                onStartMethod={(methodId) => {
                  applyPomodoroMethod(methodId);
                  handleStartStudyFlowSafely();
                }}
                />
              </div>
            </Suspense>
          )}

          {/* Página Mentor IA */}
          {activeTab === 'mentor' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando mentor...</div>}>
              <MentorIA
                userName={resolvedDisplayName}
                userEmail={user?.email}
                cloudUserId={supabaseUserId}
                userData={userData}
                weeklyGoalMinutes={weeklyGoalMinutes}
                examGoal={profileExamGoal}
                examDate={profileExamDate}
                preferredTrack={preferredStudyTrack}
                onGoToFocus={() => {
                  handleStartStudyFlowSafely();
                }}
                onGoToAcademy={() => {
                  attemptProtectedNavigation('departamento');
                }}
              />
            </Suspense>
          )}

          {activeTab === 'mentor-admin' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dashboard admin...</div>}>
              <MentorAdminDashboard
                userEmail={user?.email}
                currentDisciplineName={preferredTreeDisciplineName}
                currentDisciplineSourceLabel={preferredTreeDisciplineSourceLabel}
                profileDisplayName={resolvedDisplayName}
                profileAvatar={profileAvatar}
                profileExamGoal={profileExamGoal}
                profileExamDate={profileExamDate}
                profileSyncStatus={profileSyncStatus}
              />
            </Suspense>
          )}

          {/* Página Departamento */}
          {!shouldRenderNativeShell && activeTab === 'departamento' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando departamento...</div>}>
              <AcademyPage
                userId={supabaseUserId}
                userEmail={user?.email}
                preferredTrack={effectiveTrackForDepartments}
                completedContentIds={completedContentIds}
                isProUser={isProUser}
                onCompleteContent={handleCompleteAcademyContent}
                onRevertCompleteContent={handleRevertAcademyContent}
                onSyncTotalXp={handleSyncAcademyTotalXp}
                currentStreak={userData.currentStreak || 0}
                onStartStudyNow={({ subDepartment, contentTitle, methodId }) => {
                  const subject = getAcademyFocusSubjectLabel(subDepartment);
                  const effectiveMethodId = methodId || selectedMethodId;
                  const effectiveDuration = methodId
                    ? getStudyMethodById(methodId).focusMinutes
                    : (effectiveStudyExecutionState.currentBlock.duration as QuickSessionDuration) || plannedFocusDuration;

                  handleStartStudyFlowSafely({
                    currentBlock: {
                      subject,
                      objective: `Estudar ${contentTitle}`,
                      duration: effectiveDuration,
                      targetQuestions: effectiveStudyExecutionState.currentBlock.targetQuestions ?? 10,
                    },
                    source: 'manual',
                    methodId: effectiveMethodId,
                    studyMode: methodId ? 'pomodoro' : undefined,
                  });
                  setAcademyQuickStartSignal((prev) => prev + 1);
                }}
                onApplyMethod={(methodId) => {
                  applyPomodoroMethod(methodId);
                  handleStartStudyFlowSafely();
                }}
              />
            </Suspense>
          )}

          {/* Pagina Arvore */}
          {!shouldRenderNativeShell && activeTab === 'arvore' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando árvore...</div>}>
              <KnowledgeGenealogyTree
                supabaseUserId={supabaseUserId}
                preferredDisciplineName={preferredTreeDisciplineName}
              />
            </Suspense>
          )}

          {/* Página Foco */}
          {activeTab === 'foco' && (
            <FocusWorkspacePage
              darkMode={darkMode}
              banner={{
                eyebrow: 'Próximo passo recomendado',
                title:
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'Hoje está livre no seu cronograma'
                      : 'Defina as disciplinas de hoje antes de começar'
                    : showQuestionTransitionState
                      ? questionTransitionTitle
                      : showPostFocusState
                        ? 'Sessão concluída'
                        : 'Iniciar sua sessão de foco'
                ,
                description:
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'O estudo não sobe uma sessão normal hoje. Reative o dia no cronograma para continuar.'
                      : 'O dia está ativo, mas sem disciplinas definidas. Ajuste o cronograma antes de entrar na execução.'
                    : showQuestionTransitionState
                      ? questionTransitionDescription
                      : showPostFocusState && lastCompletedFocus
                        ? `Você focou em ${lastCompletedFocusDisplayLabel}.`
                        : 'Foco deixa de ser uma ferramenta solta e vira o centro da execução. Método, matéria e objetivo já estão definidos.'
                ,
                primaryActionLabel:
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'Abrir cronograma'
                      : 'Definir disciplinas'
                    : showQuestionTransitionState
                      ? 'Aguarde'
                      : showPostFocusState
                        ? postFocusPrimaryActionLabel
                        : 'Começar sessão agora'
                ,
                onPrimaryAction:
                  isStudyFlowBlockedBySchedule
                    ? handleOpenTodaySchedule
                    : showQuestionTransitionState
                      ? () => {}
                      : showPostFocusState
                        ? handleContinueAfterFocus
                        : scrollToFocusTimer
                ,
                primaryActionDisabled: showQuestionTransitionState,
                supportingText:
                  showPostFocusState
                    ? [postFocusSecondaryCopy, nextStudySuggestionCopy].filter(Boolean).join(' ')
                    : !isStudyFlowBlockedBySchedule && currentBlockSuggestedTopicCopy
                      ? currentBlockSuggestedTopicCopy
                      : undefined
                ,
                secondaryActionLabel: showPostFocusState ? 'Ajustar plano' : undefined,
                onSecondaryAction: showPostFocusState ? handleOpenTodaySchedule : undefined,
                className: showPostFocusState ? 'transition-all duration-200 ease-out' : undefined,
                meta: [
                  showPostFocusState && lastCompletedFocus
                    ? { label: 'Bloco', value: lastCompletedFocusDisplayLabel }
                    : { label: 'Método ativo', value: activeStudyMethod.name },
                  showPostFocusState && lastCompletedFocus
                    ? { label: 'Hoje', value: postFocusProgressCopy }
                    : { label: 'Bloco atual', value: currentBlockDisplayLabel },
                  showPostFocusState && lastCompletedFocus
                    ? { label: 'Semana', value: weeklyProgressCopy }
                    : { label: 'Ritmo', value: `${weeklyGoalMinutes} min/semana` },
                  showPostFocusState && lastCompletedFocus
                    ? { label: 'Próximo passo', value: canContinueWithQuestions ? 'Continuar com questões' : 'Continuar estudando' }
                    : { label: 'Objetivo da sessão', value: effectiveStudyExecutionState.currentBlock.objective },
                ]}}
              isBlocked={isStudyFlowBlockedBySchedule}
              blockedTitle="O foco so abre quando o dia estiver coerente"
              blockedDescription="Ajuste o cronograma de hoje e depois volte para estudar. Isso evita iniciar sessao fora do plano do dia."
              showQuestionTransitionState={showQuestionTransitionState}
              questionTransitionTitle={questionTransitionTitle}
              questionTransitionDescription={questionTransitionDescription}
              showPostFocusState={showPostFocusState}
              postSessionState={
                showPostFocusState && lastCompletedFocus
                  ? {
                      blockLabel: lastCompletedFocusDisplayLabel,
                      progressCopy: postFocusProgressCopy,
                      weeklyProgressCopy: weeklyProgressCopy,
                      planConfidenceCopy: postFocusPlanConfidenceCopy,
                      secondaryCopy: postFocusSecondaryCopy,
                      nextSuggestionCopy: nextStudySuggestionCopy,
                      primaryActionLabel: postFocusPrimaryActionLabel,
                      onPrimaryAction: handleContinueAfterFocus,
                      onSecondaryAction: handleOpenTodaySchedule,
                    }
                  : undefined
              }
              preferredStudyTrack={preferredStudyTrack}
              onTrackChange={setPreferredStudyTrack}
              hybridEnemWeight={hybridEnemWeight}
              hybridConcursoWeight={hybridConcursoWeight}
              onHybridEnemWeightChange={setHybridEnemWeight}
              weeklyGoalMinutes={weeklyGoalMinutes}
              onWeeklyGoalMinutesChange={setWeeklyGoalMinutes}
              activeStudyMethodName={activeStudyMethod.name}
              preferencesSyncStatus={preferencesSyncStatus}
              lastPreferencesSyncAt={lastPreferencesSyncAt}
              currentMode={activeStudyMode}
              onModeChange={handleStudyModeChange}
              timerSectionRef={focusTimerSectionRef}
              pomodoroContent={(
                <PomodoroTimer
                  onFinishSession={handleFinishStudySession}
                  selectedMethodId={selectedMethodId}
                  onSelectMethod={(methodId) => {
                    applyPomodoroMethod(methodId);
                  }}
                  quickStartSignal={academyQuickStartSignal}
                  preferredSubject={focusTimerSubjectOverride || currentBlockTimerSubject}
                  initialFocusMinutes={effectiveStudyExecutionState.currentBlock.duration}
                  preferredTrack={preferredStudyTrack}
                  hybridEnemWeight={hybridEnemWeight}
                  compact
                  displaySubjectLabel={currentBlockDisplayLabel}
                  sessionStorageScope={userStorageScope}
                  userEmail={user?.email}
                />
              )}
              freeTimerContent={(
                <div className="max-w-2xl mx-auto">
                  <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando timer...</div>}>
                    <StudyTimer
                      onFinishSession={handleFinishStudySession}
                      preferredTrack={preferredStudyTrack}
                      hybridEnemWeight={hybridEnemWeight}
                      quickStartSignal={academyQuickStartSignal}
                      preferredSubject={focusTimerSubjectOverride || currentBlockTimerSubject}
                      compact
                      displaySubjectLabel={currentBlockDisplayLabel}
                      sessionStorageScope={userStorageScope}
                      userEmail={user?.email}
                    />
                  </Suspense>
                </div>
              )}
              currentBlockLabel={currentBlockDisplayLabel}
              currentBlockDurationMinutes={effectiveStudyExecutionState.currentBlock.duration || plannedFocusDuration}
              currentBlockObjective={effectiveStudyExecutionState.currentBlock.objective}
              currentTargetQuestions={currentTargetQuestions}
              currentBlockSuggestedTopicCopy={currentBlockSuggestedTopicCopy}
              profileContext={planoProfileContext}
              onFinishResult={handleFinalizeEstudosRecord}
            />
          )}

          {/* Página Dashboard */}
          {!shouldRenderNativeShell && activeTab === 'dashboard' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dashboard...</div>}>
              {(userData.sessions?.length || userData.studyHistory?.length) ? (
              <div className="space-y-6">
                <ErrorBoundary>
                  <Dashboard
                    userData={userData}
                    todayMinutes={todayMinutes}
                    userName={resolvedDisplayName}
                    darkMode={darkMode}
                    preferredTrack={preferredStudyTrack}
                    hybridEnemWeight={hybridEnemWeight}
                    onStartFocusSession={() => {
                      handleStartStudyFlowSafely();
                    }}
                    onStartLongSession={() => {
                      const longestMethod = [...STUDY_METHODS].sort((a, b) => {
                        if (b.longBreakMinutes !== a.longBreakMinutes) {
                          return b.longBreakMinutes - a.longBreakMinutes;
                        }
                        return b.focusMinutes - a.focusMinutes;
                      })[0];

                      if (longestMethod) {
                        setSelectedMethodId(longestMethod.id);
                        setFocusExecutionState(
                          { duration: longestMethod.focusMinutes },
                          'manual',
                          longestMethod.id,
                        );
                      }

                      handleStartStudyFlowSafely();
                    }}
                    onOpenQuestions={() => {
                      handleStartQuestionsSafely();
                    }}
                    onOpenFlashcards={() => setActiveTab('flashcards')}
                  />
                </ErrorBoundary>
                <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                  <LevelProgress userPoints={userData.totalPoints} />
                  <RankOverview
                    userPoints={userData.totalPoints}
                    highlightSignal={rankHighlightSignal}
                    darkMode={darkMode}
                  />
                </div>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className={`rounded-xl border p-6 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.32)] ${
                    darkMode
                      ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_60px_-34px_rgba(2,6,23,0.55)]'
                      : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(240,247,252,0.95))]'
                  }`}>
                    <StudyHeatmap sessions={userData.sessions || userData.studyHistory || []} />
                  </div>
                  <div className={`rounded-xl border p-6 shadow-[0_18px_40px_-30px_rgba(148,163,184,0.32)] ${
                    darkMode
                      ? 'border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_60px_-34px_rgba(2,6,23,0.55)]'
                      : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(240,247,252,0.95))]'
                  }`}>
                    <h3 className={`mb-2 text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Grafico Semanal</h3>
                    <WeeklyChartReal
                      sessions={userData.sessions || userData.studyHistory || []}
                      dailyGoalMinutes={userData.dailyGoal || 180}
                    />
                  </div>
                </div>
                <MethodPerformance darkMode={darkMode} sessions={userData.sessions || userData.studyHistory || []} />
                <WeeklyReport
                  darkMode={darkMode}
                  sessions={userData.sessions || userData.studyHistory || []}
                  preferredTrack={preferredStudyTrack}
                  hybridEnemWeight={hybridEnemWeight}
                />
              </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Nenhuma sessão registrada"
                  description="Comece sua primeira sessão de estudo para ver estatísticas, gráficos e progresso detalhado aqui."
                  actionLabel="Começar a Estudar"
                  onAction={handleStartStudyFlowSafely}
                  secondaryLabel="Ver Departamento"
                  onSecondaryAction={() => attemptProtectedNavigation('departamento')}
                />
              )}
            </Suspense>
          )}

          {/* Página Cronograma */}
          {!shouldRenderNativeShell && !isUnifiedStudyFlow && activeTab === 'cronograma' && (
            <PlanningWorkspacePage
              darkMode={darkMode}
              weeklySchedule={weeklySchedule}
              studyContextForToday={effectiveStudyContextForToday}
              weeklyCompletedSessions={weeklyCompletedSessions}
              weeklyPlannedSessions={weeklyPlannedSessions}
              todayCompletedSessions={todayCompletedSessions}
              currentBlockLabel={currentBlockDisplayLabel}
              currentBlockObjective={effectiveStudyExecutionState.currentBlock.objective}
              currentBlockDurationMinutes={effectiveStudyExecutionState.currentBlock.duration || plannedFocusDuration}
              scheduleEntries={persistedScheduleEntries}
              onStartStudy={handleStartStudyFlowSafely}
              onEditDay={openScheduleForDay}
              profileContext={planoProfileContext}
              calendar={(
                <StudyScheduleCalendar
                  userId={supabaseUserId}
                  weeklySchedule={weeklySchedule}
                  onChangeWeeklySchedule={setWeeklyScheduleRaw}
                  studyContextMode={isNativeStudyContextMode(resolvedStudyContextMode) ? resolvedStudyContextMode : null}
                  scheduleScope={nativePlannerStorageScope}
                  studyContextForToday={effectiveStudyContextForToday}
                  officialTodayActionCard={officialStudySurfaceCard}
                  weeklyCompletedSessions={weeklyCompletedSessions}
                  todayCompletedSessions={todayCompletedSessions}
                  completedWeekdays={completedWeekdays}
                  requestedEditDay={requestedScheduleEditDay}
                  requestedEditNonce={requestedScheduleEditNonce}
                />
              )}
            />
          )}

          {/* Página Questões */}
          {!isUnifiedStudyFlow && activeTab === 'questoes' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando questões...</div>}>
              <div className="space-y-6">
                <StudyExecutionBanner
                  eyebrow="Pratica recomendada"
                  title={
                    isStudyFlowBlockedBySchedule
                      ? effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'Hoje esta livre no seu cronograma'
                        : 'Defina as disciplinas de hoje antes de abrir questoes'
                      : currentTargetQuestions > 0
                        ? `${currentTargetQuestions} questoes de ${currentBlockDisplayLabel} para validar o bloco atual`
                        : `Pratica recomendada de ${currentBlockDisplayLabel}`
                  }
                  description={
                    isStudyFlowBlockedBySchedule
                      ? effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'A pratica recomendada nao sobe em dia inativo. Reative o dia no cronograma para continuar.'
                        : 'O dia esta ativo, mas sem disciplinas definidas. Ajuste o cronograma antes de abrir a pratica.'
                      : 'Questões deixam de ser caos de filtros e viram validação do que você acabou de estudar. Se quiser explorar, os filtros continuam abaixo.'
                  }
                  primaryActionLabel={
                    isStudyFlowBlockedBySchedule
                      ? effectiveStudyContextForToday.state.type === 'inactive'
                        ? 'Abrir cronograma'
                        : 'Definir disciplinas'
                      : 'Comecar pratica recomendada'
                  }
                  onPrimaryAction={isStudyFlowBlockedBySchedule ? handleOpenTodaySchedule : handleStartQuestionsSafely}
                  meta={[
                    { label: 'Bloco', value: currentBlockDisplayLabel },
                    { label: 'Topico', value: currentBlockContentPath.topicLabel || 'Bloco atual' },
                    { label: 'Objetivo', value: effectiveStudyExecutionState.currentBlock.objective },
                  ]}
                />
                {isStudyFlowBlockedBySchedule ? (
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Pratica protegida</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100">
                      Ajuste o dia antes de validar com questoes
                    </h2>
                    <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
                      O fluxo de pratica so abre quando o cronograma de hoje estiver coerente com o que pode subir na execucao.
                    </p>
                  </div>
                ) : (
                  <QuizPage
                supabaseUserId={supabaseUserId}
                initialFilter={quizPrefilter || undefined}
                recommendedContext={
                  lastCompletedFocus
                    ? {
                        title: `Questões de ${lastCompletedFocusDisplayLabel}`,
                        subtitle: 'Baseado na sua última sessão',
                      }
                    : undefined
                }
                onEarnXP={(xp) => {
                  setUserData((prev) => xpEngineService.applyXpDelta(prev, xp));
                  toast.success(`+${xp} XP ganhos nas questões!`);
                }}
                onCompleteAttempt={handleCompleteBeginnerAssessment}
                />
                )}
              </div>
            </Suspense>
          )}

          {/* Página Simulado */}
          {activeTab === 'simulado' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando simulado...</div>}>
              <MockExam
                supabaseUserId={supabaseUserId}
                initialFilter={mockExamPrefilter || undefined}
                onEarnXP={(xp) => {
                  setUserData((prev) => xpEngineService.applyXpDelta(prev, xp));
                  toast.success(`+${xp} XP ganhos no simulado!`);
                }}
                onCompleteAttempt={handleCompleteBeginnerAssessment}
              />
            </Suspense>
          )}

          {/* Página Flashcards */}
          {activeTab === 'flashcards' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando revisoes...</div>}>
              <ReviewPage
                darkMode={darkMode}
                scheduleEntries={persistedScheduleEntries}
                profileContext={planoProfileContext}
                onCommitDecision={handleCommitReviewDecision}
              />
            </Suspense>
          )}

          {/* Página Véspera de Prova */}
          {activeTab === 'vespera' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando véspera...</div>}>
              <EveOfExamPage
                onStartQuiz={() => {
                  setActiveTab('questoes');
                }}
                onStartFlashcards={() => setActiveTab('flashcards')}
                onStartTimer={() => {
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
              />
            </Suspense>
          )}

          {/* Página Grupos */}
          {activeTab === 'grupos' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando grupos...</div>}>
              <GroupsPage
                userId={supabaseUserId}
                userName={resolvedDisplayName}
                userTotalPoints={userData.totalPoints}
                weeklyGoalMinutes={weeklyGoalMinutes}
                weeklyStudiedMinutes={weeklyStudiedMinutes}
                onStartSession={() => {
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
              />
            </Suspense>
          )}

          {/* Página Ranking Global */}
          {activeTab === 'ranking-global' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando ranking global...</div>}>
              <GlobalRankingPage />
            </Suspense>
          )}

          {/* Página Conquistas */}
            {activeTab === 'conquistas' && (
              <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando conquistas...</div>}>
                <ConquistasPage
                  userData={{ ...userData, achievements: unlockedAchievements }}
                  storageScope={userStorageScope}
                  weeklyGoalMinutes={weeklyGoalMinutes}
                />
              </Suspense>
            )}

          {/* Página Configurações */}
          {activeTab === 'configuracoes' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando configurações...</div>}>
              <SettingsPage
                userData={userData}
                userName={resolvedDisplayName}
                userEmail={user?.email}
                profileAvatar={profileAvatar}
                profileExamGoal={profileExamGoal}
                profileExamDate={profileExamDate}
                preferredStudyTrack={preferredStudyTrack}
                darkMode={darkMode}
                currentTheme={currentTheme}
                weeklyGoalMinutes={weeklyGoalMinutes}
                onToggleDarkMode={handleToggleDarkMode}
                onSelectTheme={setCurrentTheme}
                profileSyncStatus={profileSyncStatus}
                lastProfileSyncAt={lastProfileSyncAt}
                lastProfileSavedAt={lastProfileSavedAt}
                profileChangeHistory={profileChangeHistory}
                onSaveProfile={handleSaveProfile}
                onImportData={handleImportData}
              />
            </Suspense>
          )}

          {/* Página Gerenciamento de Dados */}
          {activeTab === 'dados' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dados...</div>}>
              <div className="space-y-6">
                {canAccessInternalTools ? (
                  <>
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Central de operacao
                          </p>
                          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Admin do produto e leitura operacional em uma unica vista
                          </h2>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            O foco principal aqui e decidir o que ajustar no produto. Sync, retencao e manutencao local continuam disponiveis como ferramentas de suporte.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[520px]">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Sessões</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {(userData.sessions || userData.studyHistory || []).length}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Fase detectada</p>
                            <p className="mt-2 text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">
                              {effectiveProductPhase}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Modo interno</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {isAdminMode ? 'Admin ativo' : 'Interno ativo'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Disciplina em foco</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {preferredTreeDisciplineName || 'Sem contexto'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {preferredTreeDisciplineSourceLabel || 'Aguardando ultimo foco ou plano do dia'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ProfileAdminSnapshotCard
                      displayName={resolvedDisplayName}
                      email={user?.email}
                      avatar={profileAvatar}
                      examGoal={profileExamGoal}
                      examDate={profileExamDate}
                      syncStatus={profileSyncStatus}
                      title="Perfil refletido na operacao"
                      subtitle="Confere aqui se a area admin interna esta lendo o mesmo perfil salvo em Configuracoes."
                    />

                    <DataManagement
                      data={{
                        sessions: userData.sessions || userData.studyHistory || [],
                        userLevel: userData.level,
                        xp: userData.totalPoints,
                        exportedAt: new Date().toISOString(),
                      }}
                      onClear={handleClearData}
                    />

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                      <button
                        type="button"
                        onClick={() => setShowAdminSupportTools((previous) => !previous)}
                        className="flex w-full items-center justify-between gap-4 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Ferramentas de suporte
                          </p>
                          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Sync, retencao e dados locais sem disputar atencao com a operacao
                          </h3>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Abra esta area quando precisar diagnosticar sincronizacao, retention panel ou manutencao manual dos dados.
                          </p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {showAdminSupportTools ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </span>
                      </button>

                      {showAdminSupportTools && (
                        <div className="mt-6 space-y-6">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              Sincronizacao
                            </p>
                            <div className="mt-4">
                              <SyncCenter userId={supabaseUserId} />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              Retencao e diagnostico
                            </p>
                            <div className="mt-4">
                              <RetentionAdminPanel />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              Dados locais
                            </p>
                            <div className="mt-4">
                              <LocalStoragePage
                                userData={userData}
                                onImportData={handleImportData}
                                onClearData={handleClearData}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800">Modo interno necessario</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Ative o modo admin no switcher interno para liberar analytics, operacao e paineis de produto.
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Para liberar neste navegador em producao, abra a URL com <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">?internal=1</span> uma vez.
                    </p>
                  </div>
                )}
              </div>
            </Suspense>
          )}
            </div>
          </section>
        </div>
      </main>

      {canAccessInternalTools && (
        <DevPhaseSwitcher
          detectedPhase={detectedProductPhase}
          effectivePhase={effectiveProductPhase}
          phaseOverride={phaseOverride}
          isAdminMode={isAdminMode}
          onChangePhaseOverride={setPhaseOverride}
          onToggleAdminMode={() => setIsAdminMode((previous) => !previous)}
          onResetInternalMode={handleResetInternalMode}
        />
      )}

      {showBeginnerWeekSummary && (
        <BeginnerWeekSummaryModal
          summary={beginnerWeekSummary}
          progressStage={beginnerProgressStage}
          onAction={handleBeginnerWeekSummaryAction}
          onClose={() => completeBeginnerWeekSummary('dismiss')}
        />
      )}

      {(() => {
        const beginnerResult = lastBeginnerResult;
        if (!beginnerResult) {
          return null;
        }

        return (
          <BeginnerSessionResult
            completedMissionLabel={beginnerResult!.completedMissionLabel}
            nextMissionLabel={beginnerResult!.nextMissionLabel}
            correctAnswers={beginnerResult!.correctAnswers}
            totalQuestions={beginnerResult!.totalQuestions}
            xpGained={beginnerResult!.xpGained}
            isFirstSession={Boolean(beginnerResult!.isFirstSession)}
            streak={userData.currentStreak || userData.streak || 0}
            onPrimaryAction={() => {
              trackBeginnerEvent('beginner_next_step_clicked', {
                completedMissionId: beginnerResult!.completedMissionId,
                nextMissionId: beginnerResult!.nextMissionId || null,
                source: 'post_session_modal',
              });
              if (beginnerResult!.isFirstSession) {
                scheduleNextSessionCommit('beginner');
                persistNextMissionResumeState({
                  source: 'beginner',
                  subject: 'Matematica',
                  topic: beginnerResult!.nextMissionLabel || 'Proxima missao',
                  questionsTotal: beginnerResult!.totalQuestions || OFFICIAL_STUDY_SESSION_QUESTION_LIMIT,
                  scheduledAt: new Date().toISOString(),
                  missionId: beginnerResult!.nextMissionId || undefined,
                });
                trackEvent(
                  'beginner_next_session_scheduled',
                  {
                    missionId: beginnerResult!.completedMissionId,
                    source: 'post_session_modal',
                  },
                  { userEmail: user?.email },
                );
              }
              setLastBeginnerResult(null);
              setActiveTab('inicio');
            }}
            onClose={() => {
              setLastBeginnerResult(null);
              setActiveTab('inicio');
            }}
          />
        );
      })()}

      <ConfirmModal
        open={Boolean(lockedNavigationTarget)}
        title="Voce vai desbloquear isso automaticamente apos sua primeira semana"
        message={`${lockedNavigationTarget?.label || 'Essa ferramenta'} entra logo depois que voce ganhar ritmo. Agora o foco e so completar sua semana guiada. Depois disso, essas ferramentas entram para acelerar sua evolucao.`}
        confirmLabel="Voltar para a missão"
        variant="info"
        alertOnly
        onConfirm={() => {
          setLockedNavigationTarget(null);
          setActiveTab('inicio');
        }}
        onCancel={() => setLockedNavigationTarget(null)}
      />

      {/* Feedback Button */}
      <Suspense fallback={null}>
        <FeedbackButton userId={supabaseUserId} currentPage={activeTab} />
      </Suspense>

      {/* Footer */}
      <footer className="mt-14 border-t border-white/60 bg-white/55 py-8 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 text-center text-slate-600 dark:text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-800 dark:text-slate-100">Zero Base 2.0</p>
            <p className="mt-2 text-sm">
              Shell reorganizado para estudar com mais clareza, inspirado na logica do Estudei e adaptado ao Zero Base.
            </p>
          </div>
          <p className="text-sm font-medium">
            Desenvolvido com <Heart className="inline h-4 w-4 align-[-2px]" /> para estudos inteligentes
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
