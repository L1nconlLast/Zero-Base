import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Home, GraduationCap, Brain, Clock3, BarChart3, Trophy, Settings, Database, Info, Heart, CalendarDays, HelpCircle, Layers, BookOpen, Zap, Users, GitBranch, Cloud, AlertTriangle, CheckCircle2, Flame, Package, Puzzle, Scale, Sprout, Target, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
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
import { Header } from './components/Layout/Header';
import { PomodoroTimer } from './components/Timer/PomodoroTimer';
import { ModeSelector } from './components/Timer/ModeSelector';
import AchievementNotification from './components/Dashboard/AchievementNotification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BeginnerOnboarding, type BeginnerOnboardingPayload } from './components/Beginner/BeginnerOnboarding';
import { BeginnerSessionResult } from './components/Beginner/BeginnerSessionResult';
import { BeginnerWeekSummaryModal } from './components/Beginner/BeginnerWeekSummary';
import { ConfirmModal } from './components/UI/ConfirmModal';
import { DevPhaseSwitcher } from './components/UI/DevPhaseSwitcher';
import { StudyExecutionBanner } from './components/Study/StudyExecutionBanner';
import { ProfileAdminSnapshotCard } from './components/profile/ProfileAdminSnapshotCard';
import { StudySessionPage as OfficialStudySessionPage } from './components/Mvp/StudySessionPage';
import { StudySessionResult as OfficialStudySessionResultView } from './components/Mvp/StudySessionResult';

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
  buildStudyContextForToday,
  createDefaultWeeklyStudySchedule,
  getNextStudyCopy,
  getNextStudySuggestion,
  getPaceCopy,
  getWeekdayFromDate,
  getRecentPaceState,
  studyScheduleService,
  getWeeklyPlanConfidenceState,
  sanitizeWeeklyStudySchedule,
} from './services/studySchedule.service';
import { STUDY_METHODS, getStudyMethodById } from './data/studyMethods';
import { createDefaultSmartProfile, type SmartScheduleProfile } from './utils/smartScheduleEngine';

// Types & Utils
import type {
  BeginnerPlan,
  BeginnerProgressStage,
  BeginnerState,
  BeginnerStats,
  PersistedStudySession,
  BeginnerWeekSummary,
  StudySession,
  StudyContextForToday,
  StudyExecutionState,
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
import { getStableHeroVariant, type HeroVariant } from './lib/ab';

type StudyMode = 'pomodoro' | 'livre';
type StudyTrack = 'enem' | 'concursos' | 'hibrido';
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

const buildStudySessionIdentityKey = (
  session: Pick<StudySession, 'date' | 'subject' | 'minutes' | 'duration' | 'points'>,
): string =>
  `${session.date}|${session.subject}|${session.minutes}|${session.duration}|${session.points}`;

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

    const subject = String(question.subject || session.subject || 'Outra').trim() || 'Outra';
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

const BEGINNER_UNLOCKED_TABS = new Set(['inicio', 'foco', 'questoes', 'simulado']);
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
const DashboardPage = lazy(() => import('./components/Dashboard/DashboardPage'));
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
const FlashcardsPage = lazy(() => import('./components/Flashcards/FlashcardsPage'));
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
  const [weeklyScheduleRaw, setWeeklyScheduleRaw] = useLocalStorage<WeeklyStudySchedule>(
    `weeklyStudySchedule_${userStorageScope}`,
    defaultWeeklySchedule,
  );

  // UI State
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);
  const [currentTheme, setCurrentTheme] = useLocalStorage('theme', 'blue');
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
  const [lastBeginnerResult, setLastBeginnerResult] = useState<BeginnerSessionUiResult | null>(null);
  const [showBeginnerWeekSummary, setShowBeginnerWeekSummary] = useState(false);
  const [officialStudyHomeState, setOfficialStudyHomeState] = useState<OfficialStudyHomeState>({ status: 'idle' });
  const [officialStudySession, setOfficialStudySession] = useState<OfficialStudySession | null>(null);
  const [officialStudyResult, setOfficialStudyResult] = useState<OfficialStudySessionResult | null>(null);
  const [officialStudyStarting, setOfficialStudyStarting] = useState(false);
  const [officialStudyAnswering, setOfficialStudyAnswering] = useState(false);
  const [officialStudyFinishing, setOfficialStudyFinishing] = useState(false);
  const [officialStudyQuestionStartedAt, setOfficialStudyQuestionStartedAt] = useState<number>(Date.now());
  const [lockedNavigationTarget, setLockedNavigationTarget] = useState<{ tabId: string; label: string } | null>(null);
  const [showIntermediateUnlockBanner, setShowIntermediateUnlockBanner] = useState(false);
  const lastMissionViewKeyRef = React.useRef<string | null>(null);
  const lastQuestionsStartKeyRef = React.useRef<string | null>(null);
  const lastPostSessionViewKeyRef = React.useRef<string | null>(null);
  const lastWeekSummaryViewKeyRef = React.useRef<string | null>(null);
  const questionTransitionTimeoutRef = React.useRef<number | null>(null);
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
  const canAccessInternalTools = isLocalEnvironment || hasInternalAccess || isAdminMode;
  const weeklySchedule = React.useMemo(
    () => sanitizeWeeklyStudySchedule(weeklyScheduleRaw),
    [weeklyScheduleRaw],
  );

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
  const { newlyUnlocked, dismissNewlyUnlocked, unlockedAchievements } = useAchievements(
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
  const handleStartRecommendedFocus = React.useCallback(() => {
    setLastCompletedFocus(null);
    setStudyFlowStep('focusing');
    setFocusExecutionState(undefined, effectiveStudyExecutionState.source, activeStudyMethod.id);
    setPlannedFocusDuration((effectiveStudyExecutionState.currentBlock.duration as QuickSessionDuration) || plannedFocusDuration);
    setSelectedMethodId(activeStudyMethod.id);
    setActiveTab('foco');
  }, [
    activeStudyMethod.id,
    effectiveStudyExecutionState.currentBlock.duration,
    effectiveStudyExecutionState.source,
    plannedFocusDuration,
    setActiveTab,
    setFocusExecutionState,
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
  }, [beginnerPlan, selectedMethodId, setActiveStudyMode, setActiveTab, setBeginnerState, setFocusExecutionState, setPendingHeroAttribution, setPlannedFocusDuration, setBeginnerStats, trackBeginnerEvent]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Apply theme colors
  const theme = React.useMemo(() => {
    return THEME_PALETTES[currentTheme] || THEME_PALETTES.blue;
  }, [currentTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
  }, [theme]);

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
    setLastBeginnerResult(null);
    setShowBeginnerWeekSummary(false);
    setShowIntermediateUnlockBanner(false);
    toast.success('Logout realizado com sucesso!');
  }, [logout, setBeginnerPlan, setBeginnerState, setBeginnerStats]);

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
    if (!isLoggedIn || !user?.email) {
      setShowOnboarding(false);
      setBeginnerState(null);
      return;
    }

    const onboardingKey = `mdzOnboardingCompleted_${user.email}`;
    const completed = window.localStorage.getItem(onboardingKey) === 'true';
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

      return beginnerFlowService.syncState(beginnerPlan, prev) ?? 'ready_for_first_session';
    });
  }, [
    beginnerPlan,
    beginnerState,
    hasPersistedBeginnerState,
    isBeginnerScopedStorageReady,
    isLoggedIn,
    setBeginnerState,
    user?.email,
  ]);

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
    if (!isLoggedIn || showOnboarding || beginnerPlan || !isBeginnerScopedStorageReady) {
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
      const previousWeeklyRetention = buildWeeklyRetentionSnapshot(existingSessions);
      const isFirstSession = existingSessions.length === 0;
      const newSession = {
        date: new Date().toISOString(),
        minutes,
        points,
        subject,
        duration: minutes,
        methodId,
      };
      const nextWeeklyRetention = buildWeeklyRetentionSnapshot([...existingSessions, newSession]);
      const nextTodaySessionCount = [...existingSessions, newSession].filter((session) => {
        const sessionDate = typeof session.date === 'string' ? session.date : '';
        return sessionDate.slice(0, 10) === newSession.date.slice(0, 10);
      }).length;
      if (!keepContinuousPomodoroFlow) {
        setQuestionsExecutionState(
          {
            subject: effectiveStudyExecutionState.currentBlock.subject,
            topicName: effectiveStudyExecutionState.currentBlock.topicName,
            objective: `Validar ${effectiveStudyExecutionState.currentBlock.subject} com pratica recomendada.`,
            targetQuestions: effectiveStudyExecutionState.currentBlock.targetQuestions ?? 10,
          },
          effectiveStudyExecutionState.source,
        );
      }
      if (!isBeginnerFocus && !keepContinuousPomodoroFlow) {
        setLastCompletedFocus({
          subject: effectiveStudyExecutionState.currentBlock.subject,
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
      isBeginnerFocus,
      pendingHeroAttribution,
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
    ({
      dailyGoal,
      methodId,
      smartProfile,
      onboardingMeta,
    }: {
      dailyGoal: number;
      methodId: string;
      smartProfile: SmartScheduleProfile;
      onboardingMeta?: {
        focus: 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
        concurso: {
          id: string;
          nome: string;
          banca: string;
          area: string;
        } | null;
        enem: {
          goalId: string | null;
          targetCollege: string | null;
          targetCourse: string | null;
        } | null;
      };
    }) => {
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

      const beginnerTrack: StudyTrack =
        onboardingMeta?.focus === 'hibrido'
          ? 'hibrido'
          : onboardingMeta?.focus === 'concurso'
            ? 'concursos'
            : preferredStudyTrack === 'hibrido'
              ? 'hibrido'
              : 'enem';
      const beginnerSetup = beginnerFlowService.completeOnboarding(beginnerTrack, dailyGoal);
      const nextBeginnerStats = beginnerProgressService.completeOnboarding(
        beginnerStats,
        beginnerTrack,
        Math.max(30, Math.min(120, dailyGoal)) as 30 | 60 | 120,
      );

      setUserData((prev) => ({
        ...prev,
        dailyGoal,
      }));
      setPreferredStudyTrack(beginnerTrack);
      setSelectedMethodId(methodId);
      setBeginnerPlan(beginnerSetup.plan);
      setBeginnerStats(nextBeginnerStats);
      setBeginnerState(beginnerSetup.state);
      setLastBeginnerResult(null);
      setShowIntermediateUnlockBanner(false);
      setActiveStudyMode('pomodoro');
      setActiveTab('inicio');
      setShowOnboarding(false);
      toast.success('Modo iniciante liberado. Sua 1a missao ja esta pronta.');

      trackBeginnerEvent('onboarding_completed', {
        focus: beginnerTrack,
        timeAvailable: Math.max(30, Math.min(120, dailyGoal)),
      });

      if (supabaseUserId && isSupabaseConfigured) {
        void saasPlanningService
          .upsertProfile(supabaseUserId, smartProfile)
          .then(() => saasPlanningService.upsertSubjectLevels(supabaseUserId, smartProfile.subjectDifficulty))
          .catch(() => {
            toast('Perfil SaaS salvo localmente. A sincronização com a nuvem será retomada automaticamente.');
          });
      }
    },
    [beginnerStats, preferredStudyTrack, setBeginnerPlan, setBeginnerState, setBeginnerStats, setPreferredStudyTrack, setSelectedMethodId, setUserData, setActiveStudyMode, supabaseUserId, trackBeginnerEvent]
  );

  const handleCompleteBeginnerOnboarding = React.useCallback(
    ({ focus, dailyGoalMinutes }: BeginnerOnboardingPayload) => {
      const smartProfile = createDefaultSmartProfile();

      smartProfile.hoursPerDay = Math.max(1, Math.round(dailyGoalMinutes / 60));
      smartProfile.studyStyle = 'pomodoro_25_5';
      smartProfile.availableWeekDays = [1, 2, 3, 4, 5];

      if (focus === 'concursos') {
        smartProfile.examName = 'CONCURSO';
        smartProfile.subjectDifficulty = {
          Portugues: 'fraco',
          'Raciocinio Logico': 'medio',
          'Direito Constitucional': 'medio',
          'Direito Administrativo': 'medio',
          Informatica: 'fraco',
        };
        smartProfile.subjectWeight = {
          Portugues: 30,
          'Raciocinio Logico': 24,
          'Direito Constitucional': 20,
          'Direito Administrativo': 14,
          Informatica: 12,
        };
      }

      handleCompleteOnboarding({
        dailyGoal: dailyGoalMinutes,
        methodId: 'pomodoro',
        smartProfile,
        onboardingMeta: {
          focus: focus === 'concursos' ? 'concurso' : focus,
          concurso:
            focus === 'concursos'
              ? {
                  id: 'starter-beginner',
                  nome: 'Base inicial',
                  banca: 'Mista',
                  area: 'Geral',
                }
              : null,
          enem:
            focus === 'concursos'
              ? null
              : {
                  goalId: null,
                  targetCollege: null,
                  targetCourse: null,
                },
        },
      });
    },
    [handleCompleteOnboarding]
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
    () => (beginnerProgressStage === 'ready_for_intermediate' ? 'intermediate' : 'beginner'),
    [beginnerProgressStage],
  );
  const effectiveProductPhase = phaseOverride ?? detectedProductPhase;

  const beginnerToolAccessLocked =
    effectiveProductPhase === 'beginner' && isBeginnerFocus && (phaseOverride === 'beginner' || beginnerProgressStage !== 'ready_for_intermediate');
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
    setBeginnerState('ready_for_first_session');
    setBeginnerStats(beginnerProgressService.createInitialStats());
    setLastBeginnerResult(null);
    setShowBeginnerWeekSummary(false);
    if (beginnerPlan) {
      setBeginnerPlan(beginnerFlowService.generatePlan(beginnerPlan.track, INITIAL_USER_DATA.dailyGoal));
    }
  }, [beginnerPlan, setBeginnerPlan, setBeginnerState, setBeginnerStats, setUserData]);

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
  const weeklyProgressCopy = weeklySchedule.preferences.weeklyGoalSessions
    ? weeklyCompletedSessions + ' de ' + weeklySchedule.preferences.weeklyGoalSessions + ' sessoes concluidas esta semana'
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
          : 'Ainda nao existe uma recomendacao pronta',
        description: isProfileGap
          ? 'O contrato oficial ainda nao encontrou contexto suficiente para montar sua primeira sessao.'
          : 'A home oficial ainda nao recebeu uma recomendacao valida para montar o proximo estudo.',
        supportingText: isProfileGap
          ? 'Conclua o onboarding ou ajuste o contexto do plano para liberar a primeira sessao.'
          : 'Abra o cronograma, organize o dia e volte para gerar a proxima sessao real.',
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
        return;
      }

      const currentMission = beginnerFlowService.getTodayMission(beginnerPlan);
      if (!currentMission || currentMission.status === 'completed') {
        return;
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
    },
    [beginnerPlan, setBeginnerPlan, setBeginnerState, setBeginnerStats],
  );

  const reflectOfficialStudyCompletionInSchedule = React.useCallback(
    async (session: OfficialStudySession) => {
      await studyScheduleService.completeEntryForToday(supabaseUserId, {
        subject: session.subject,
        topic: session.topic,
        completedAt: session.startedAt,
      });
    },
    [supabaseUserId],
  );

  const handleStartOfficialStudy = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast.error('Contrato oficial de estudo indisponivel neste ambiente.');
      return;
    }

    setOfficialStudyStarting(true);

    try {
      const activeSessionId = officialStudyHomeState.status === 'ready'
        ? officialStudyHomeState.home.activeStudySession?.sessionId || null
        : null;
      const session = activeSessionId
        ? await studyLoopSessionsService.getSession(activeSessionId)
        : await studyLoopSessionsService.createSession(5);

      if (session.status !== 'active') {
        await loadOfficialStudyHome();
        toast('A sessao oficial ja foi encerrada. A home foi atualizada.');
        return;
      }

      setOfficialStudyResult(null);
      setOfficialStudySession(session);
      setOfficialStudyQuestionStartedAt(Date.now());
      toast.success(activeSessionId ? 'Sessao oficial retomada.' : 'Sessao oficial iniciada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao abrir a sessao oficial.');
    } finally {
      setOfficialStudyStarting(false);
    }
  }, [loadOfficialStudyHome, officialStudyHomeState]);

  const handleAnswerOfficialStudyQuestion = React.useCallback(async (questionId: string, alternativeId: string) => {
    if (!officialStudySession) {
      return;
    }

    setOfficialStudyAnswering(true);

    try {
      const responseTimeSeconds = Math.max(1, Math.round((Date.now() - officialStudyQuestionStartedAt) / 1000));
      const updatedSession = await studyLoopSessionsService.answerQuestion(officialStudySession.sessionId, {
        questionId,
        alternativeId,
        responseTimeSeconds,
      });

      setOfficialStudySession(updatedSession);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao registrar a resposta.');
    } finally {
      setOfficialStudyAnswering(false);
    }
  }, [officialStudyQuestionStartedAt, officialStudySession]);

  const handleFinishOfficialStudy = React.useCallback(async () => {
    if (!officialStudySession) {
      return;
    }

    const sessionToFinish = officialStudySession;
    setOfficialStudyFinishing(true);

    try {
      const result = await studyLoopSessionsService.finishSession(sessionToFinish.sessionId);
      const { completedSession } = applyOfficialStudyCompletionToProgress(sessionToFinish, result);
      reflectOfficialStudyCompletionInBeginnerFlow(sessionToFinish, completedSession);
      setOfficialStudySession(null);
      setOfficialStudyResult(result);
      const scheduleSyncResult = await reflectOfficialStudyCompletionInSchedule(sessionToFinish)
        .then(() => 'matched' as const)
        .catch(() => 'failed' as const);

      await loadOfficialStudyHomeAfterCompletion(sessionToFinish.sessionId);
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
    loadOfficialStudyHomeAfterCompletion,
    loadOfficialStudyHome,
    officialStudySession,
    reflectOfficialStudyCompletionInBeginnerFlow,
    reflectOfficialStudyCompletionInSchedule,
  ]);

  const handleBackHomeFromOfficialStudy = React.useCallback(async () => {
    const finishedSessionId = officialStudyResult?.sessionId || null;
    setOfficialStudyResult(null);
    setActiveTab('inicio');
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
    () => [
      { id: 'inicio', label: 'Início', icon: Home },
      { id: 'arvore', label: '\u00c1rvore', icon: GitBranch },
      { id: 'departamento', label: 'Departamento', icon: GraduationCap },
      { id: 'mentor', label: 'Mentor IA', icon: Brain },
      { id: 'mentor-admin', label: 'Mentor Admin', icon: BarChart3 },
      { id: 'cronograma', label: 'Cronograma', icon: CalendarDays },
      { id: 'metodos', label: 'Métodos', icon: Brain },
      { id: 'foco', label: 'Foco', icon: Clock3 },
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'questoes', label: 'Questões', icon: HelpCircle },
      { id: 'simulado', label: 'Simulado', icon: Layers },
      { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
      { id: 'vespera', label: 'Véspera', icon: Zap },
      { id: 'grupos', label: 'Grupos', icon: Users },
      { id: 'ranking-global', label: 'Ranking Global', icon: Trophy },
      { id: 'conquistas', label: 'Conquistas', icon: Trophy },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
      { id: 'dados', label: 'Dados', icon: Database },
    ],
    []
  );

  const domainList = React.useMemo(
    () => [
      {
        id: 'inicio-domain',
        label: 'Início',
        icon: Home,
        defaultTab: 'inicio',
        tabIds: ['inicio'],
      },
      {
        id: 'estudo-domain',
        label: 'Estudo',
        icon: Clock3,
        defaultTab: 'foco',
        tabIds: ['foco', 'questoes', 'metodos', 'cronograma'],
      },
      {
        id: 'arvore-domain',
        label: '\u00c1rvore',
        icon: GitBranch,
        defaultTab: 'arvore',
        tabIds: ['arvore'],
      },
      {
        id: 'departamento-domain',
        label: 'Departamento',
        icon: GraduationCap,
        defaultTab: 'departamento',
        tabIds: ['departamento'],
      },
      {
        id: 'revisao-domain',
        label: 'Revisão',
        icon: BookOpen,
        defaultTab: 'flashcards',
        tabIds: ['flashcards', 'vespera'],
      },
        {
          id: 'grupos-domain',
          label: 'Grupos',
          icon: Users,
          defaultTab: 'grupos',
          tabIds: ['grupos', 'ranking-global'],
        },
      {
        id: 'simulados-domain',
        label: 'Simulados',
        icon: Layers,
        defaultTab: 'simulado',
        tabIds: ['simulado'],
      },
      {
        id: 'progresso-domain',
        label: 'Progresso',
        icon: BarChart3,
        defaultTab: 'dashboard',
        tabIds: ['dashboard', 'conquistas'],
      },
      {
        id: 'mentor-domain',
        label: 'Mentor IA',
        icon: Brain,
        defaultTab: 'mentor',
        tabIds: ['mentor', 'mentor-admin'],
      },
    ],
    []
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

  const configTabs = React.useMemo(
    () =>
      tabList.filter((tab) =>
        tab.id === 'configuracoes'
        || tab.id === 'dados'
        || (canAccessInternalTools && tab.id === 'mentor-admin')
      ),
    [canAccessInternalTools, tabList]
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

      const targetTab = tabList.find((tab) => tab.id === requestedTab)?.id;
      if (!targetTab) {
        return;
      }

      if (beginnerToolAccessLocked && !BEGINNER_UNLOCKED_TABS.has(targetTab)) {
        return;
      }

      setActiveTab(targetTab);
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, [beginnerToolAccessLocked, isLoggedIn, tabList]);

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
  const handleStartStudyFlowSafely = React.useCallback(() => {
    if (isStudyFlowBlockedBySchedule) {
      handleOpenTodaySchedule();
      return;
    }

    handleStartRecommendedFocus();
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
        description: officialStudyHomeState.message,
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
    const totalQuestions = activeSession?.totalQuestions || 5;
    const estimatedDurationMinutes = Math.max(10, totalQuestions * 3);

    return {
      status: 'ready' as const,
      title: activeSession ? 'Continue sua sessao oficial' : 'Seu proximo estudo ja esta pronto',
      discipline: recommendation?.disciplineName || home.mission.discipline,
      topic: recommendation?.topicName || home.mission.topic,
      reason: recommendation?.reason || home.mission.reason,
      estimatedDurationMinutes,
      sessionTypeLabel: activeSession ? 'Sessao curta em andamento' : 'Sessao curta oficial',
      progressLabel: activeSession
        ? `${activeSession.answeredQuestions}/${activeSession.totalQuestions} questoes respondidas`
        : `${totalQuestions} questoes guiadas`,
      supportingText: activeSession
        ? 'A home oficial detectou uma sessao ativa e ja pode retomar do ponto em que voce parou.'
        : `Meta semanal: ${home.weeklyProgress.studyMinutes}/${home.weeklyProgress.goalMinutes} min`,
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
    showOnboarding,
    supabaseUserId,
  ]);
  const officialStudyCard = React.useMemo(
    () => (activeTab === 'inicio' ? officialStudySurfaceCard : undefined),
    [activeTab, officialStudySurfaceCard],
  );

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

  if (officialStudySession) {
    return (
      <>
        <Toaster position="top-center" />
        <OfficialStudySessionPage
          session={officialStudySession}
          answering={officialStudyAnswering}
          finishing={officialStudyFinishing}
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
          onBackHome={handleBackHomeFromOfficialStudy}
        />
      </>
    );
  }

  // Main app
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors ${darkMode ? 'dark' : ''}`}>
      <Toaster position="top-center" />
        <NotificationSetup />
        {/* Achievement Notification */}
        {newlyUnlocked && (
          <AchievementNotification 
            achievement={newlyUnlocked} 
            onClose={dismissNewlyUnlocked} 
          />
        )}
      
      <Header
        userName={resolvedDisplayName}
        userAvatar={profileAvatar}
        darkMode={darkMode}
        currentTheme={currentTheme}
        syncStatusLabel={syncStatusMeta.label}
        syncStatusTone={syncStatusMeta.tone}
        onSyncNow={handleSyncNow}
        disableSyncNow={syncUiStatus.isSyncing}
        onShowConflictHistory={handleShowConflictHistory}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSelectTheme={setCurrentTheme}
        onLogout={handleLogout}
        studyMode={studyMode}
        onToggleStudyMode={toggleStudyMode}
      />

      {showOnboarding && (
        <BeginnerOnboarding
          userName={resolvedDisplayName}
          initialFocus={preferredStudyTrack}
          initialDailyGoalMinutes={userData.dailyGoal || 60}
          onComplete={handleCompleteBeginnerOnboarding}
        />
      )}

      <main className="max-w-[1440px] mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 lg:gap-8">
          <aside className={`hidden lg:flex lg:flex-col lg:sticky lg:top-24 h-[calc(100vh-7rem)] rounded-2xl bg-slate-900 border border-slate-800 p-3 transition-opacity ${beginnerToolAccessLocked ? 'opacity-60' : 'opacity-100'}`}>
            <p className="px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold">Navegação</p>

            <div className="space-y-1.5 mt-1">
              {domainList.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => attemptProtectedNavigation(domain.defaultTab)}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2.5 ${
                    activeDomainId === domain.id
                      ? 'text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  style={activeDomainId === domain.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  <domain.icon className="w-4 h-4" />
                  {domain.label}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-3 border-t border-slate-800 space-y-1.5">
              {configTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => attemptProtectedNavigation(tab.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-6 sm:mb-8 space-y-3">
              <div className={`lg:hidden flex gap-2 overflow-x-auto pb-1 transition-opacity ${beginnerToolAccessLocked ? 'opacity-60' : 'opacity-100'}`}>
                {domainList.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => attemptProtectedNavigation(domain.defaultTab)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                      activeDomainId === domain.id
                        ? 'text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    style={activeDomainId === domain.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                  >
                    <domain.icon className="w-3.5 h-3.5" />
                    {domain.label}
                  </button>
                ))}
              </div>

              <div className={`lg:hidden flex gap-2 overflow-x-auto pb-1 transition-opacity ${beginnerToolAccessLocked ? 'opacity-60' : 'opacity-100'}`}>
                {configTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => attemptProtectedNavigation(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    style={activeTab === tab.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {!isUnifiedStudyFlow && activeSubTabs.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {activeSubTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => attemptProtectedNavigation(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition ${
                        activeTab === tab.id
                          ? 'text-white border-transparent'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={activeTab === tab.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-6">
          {/* Página Início */}
          {activeTab === 'inicio' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando página...</div>}>
              <DashboardPage
                userName={resolvedDisplayName}
                totalPoints={userData.totalPoints}
                level={userData.level}
                heroVariant={heroVariant}
                todayMinutes={todayMinutes}
                dailyGoalMinutes={userData.dailyGoal || 90}
                completedContentIds={completedContentIds}
                currentStreak={userData.currentStreak || 0}
                sessions={userData.sessions || userData.studyHistory || []}
                supabaseUserId={supabaseUserId}
                beginnerState={beginnerState}
                beginnerPlan={beginnerPlan}
                beginnerProgressStage={beginnerProgressStage}
                beginnerPromotedAt={beginnerStats?.promotedAt || null}
                phaseOverride={canAccessInternalTools ? phaseOverride : null}
                showIntermediateUnlockBanner={showIntermediateUnlockBanner}
                preferredTrack={preferredStudyTrack}
                studyMode={studyMode}
                onDismissIntermediateUnlockBanner={() => setShowIntermediateUnlockBanner(false)}
                onNavigate={(tab) => attemptProtectedNavigation(tab)}
                onRecalculateAI={() => attemptProtectedNavigation('mentor')}
                onOpenTopicQuestions={({ areaName, disciplineName, topicName, target }) => {
                  const normalizedArea = areaName.trim().toLowerCase();
                  const inferredTrack: QuizTrackFilter | undefined = normalizedArea.includes('enem')
                    ? 'enem'
                    : normalizedArea.includes('concurso')
                      ? 'concurso'
                      : undefined;

                  const prefilterPayload = {
                    nonce: Date.now(),
                    subject: disciplineName,
                    topicName,
                    track: inferredTrack,
                  };

                  if (target === 'simulado') {
                    setQuestionsExecutionState({
                      type: 'questions',
                      subject: disciplineName,
                      topicName,
                      objective: `Validar ${disciplineName} com pratica de simulado.`,
                    }, 'plan');
                  } else {
                    setQuestionsExecutionState({
                      type: 'questions',
                      subject: disciplineName,
                      topicName,
                      objective: `Praticar ${disciplineName} no bloco atual.`,
                    }, 'plan');
                  }

                  if (target === 'simulado') {
                    setMockExamPrefilter(prefilterPayload);
                    setActiveTab('simulado');
                    return;
                  }

                  setQuizPrefilter(prefilterPayload);
                  setActiveTab('questoes');
                }}
                onOpenRanks={() => {
                  if (!attemptProtectedNavigation('dashboard')) {
                    return;
                  }
                  setShouldScrollToRanks(true);
                  setRankHighlightSignal((previous) => previous + 1);
                }}
                ctrMetrics={homeCtrMetrics}
                heroAbMetrics={homeHeroAbMetrics}
                officialStudyCard={officialStudyCard}
                onStartQuickSession={(duration, source, variant) => {
                  if (isStudyFlowBlockedBySchedule) {
                    handleOpenTodaySchedule();
                    return;
                  }

                  startQuickSession(duration, source, variant);
                }}
                onContinueNow={() => {
                  if (isStudyFlowBlockedBySchedule) {
                    handleOpenTodaySchedule();
                    return;
                  }

                  startQuickSession(25, 'hero_cta', heroVariant);
                }}
              />
            </Suspense>
          )}

          {/* Página Métodos */}
          {isUnifiedStudyFlow && activeTab !== 'metodos' && activeTab !== 'cronograma' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {isStudyFlowBlockedBySchedule ? (
                <div ref={studyFlowTopRef}>
                  <StudyExecutionBanner
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
                  <div className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        Modo da sessao
                      </p>
                      <div className="mt-4">
                        <ModeSelector currentMode={activeStudyMode} onModeChange={handleStudyModeChange} />
                      </div>

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Configuracao do estudo</p>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Ajuste trilha, peso e meta semanal apenas quando isso melhorar a execucao real.
                          </p>
                        </div>
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full border"
                          style={{
                            color: 'var(--color-primary)',
                            borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                          }}
                        >
                          Modo ativo: {preferredStudyTrack === 'enem' ? 'ENEM' : preferredStudyTrack === 'concursos' ? 'Concurso' : 'Hibrido'}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => setPreferredStudyTrack('enem')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'enem'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'enem' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            ENEM
                          </button>
                          <button
                            onClick={() => setPreferredStudyTrack('concursos')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'concursos'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'concursos' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            Concurso
                          </button>
                          <button
                            onClick={() => setPreferredStudyTrack('hibrido')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'hibrido'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'hibrido' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            Hibrido
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {preferredStudyTrack === 'hibrido' && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">Peso por objetivo</p>
                            <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                              <span>ENEM: {hybridEnemWeight}%</span>
                              <span>Concurso: {hybridConcursoWeight}%</span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={90}
                              step={5}
                              value={hybridEnemWeight}
                              onChange={(event) => setHybridEnemWeight(Number(event.target.value))}
                              className="w-full accent-[var(--color-primary)]"
                            />
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">Meta semanal</p>
                          <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            <span>{weeklyGoalMinutes} min/semana</span>
                            <span>{activeStudyMethod.name}</span>
                          </div>
                          <input
                            type="range"
                            min={300}
                            max={2400}
                            step={30}
                            value={weeklyGoalMinutes}
                            onChange={(event) => setWeeklyGoalMinutes(Number(event.target.value))}
                            className="w-full accent-[var(--color-primary)]"
                          />
                        </div>
                      </div>

                      <div className="mt-4 text-xs rounded-lg bg-white border border-slate-200 p-3 dark:bg-slate-900 dark:border-slate-700">
                        {preferencesSyncStatus === 'syncing' && (
                          <p className="text-sky-600 dark:text-sky-300 inline-flex items-center gap-1"><Cloud className="w-3.5 h-3.5" />Sincronizando preferencias na nuvem...</p>
                        )}
                        {preferencesSyncStatus === 'synced' && (
                          <p className="text-emerald-600 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Preferencias sincronizadas com a nuvem.</p>
                        )}
                        {preferencesSyncStatus === 'error' && (
                          <p className="text-amber-600 dark:text-amber-300 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Modo local ativo. A sincronizacao sera retomada quando possivel.</p>
                        )}
                        {preferencesSyncStatus === 'local' && (
                          <p className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" />Preferencias salvas localmente neste dispositivo.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Metodo</p>
                          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Escolha metodo so quando isso ajudar a executar melhor
                          </h3>
                        </div>
                        <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando métodos...</div>}>
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
                        </Suspense>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Cronograma</p>
                          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Seu plano base ja esta definido. Ajuste so se precisar.
                          </h3>
                        </div>
                        <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
                          <StudyScheduleCalendar
                            userId={supabaseUserId}
                            weeklySchedule={weeklySchedule}
                            onChangeWeeklySchedule={setWeeklyScheduleRaw}
                            studyContextForToday={effectiveStudyContextForToday}
                            officialTodayActionCard={officialStudySurfaceCard}
                            weeklyCompletedSessions={weeklyCompletedSessions}
                            todayCompletedSessions={todayCompletedSessions}
                            completedWeekdays={completedWeekdays}
                            requestedEditDay={requestedScheduleEditDay}
                            requestedEditNonce={requestedScheduleEditNonce}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {isUnifiedStudyFlow && (activeTab === 'metodos' || activeTab === 'cronograma') && (
            <div ref={studyAdjustmentsSectionRef} className="max-w-6xl mx-auto space-y-6">
              <StudyExecutionBanner
                eyebrow="Ajustes do plano"
                title={activeTab === 'cronograma' ? 'Organize sua semana' : 'Como voce vai focar'}
                description="Aqui voce decide o plano. Depois, volta para continuar a execucao do bloco principal."
                primaryActionLabel="Voltar para estudar"
                onPrimaryAction={() => {
                  setActiveTab('foco');
                  window.setTimeout(() => {
                    scrollToFocusTimer();
                  }, 60);
                }}
                meta={[
                  { label: 'Bloco atual', value: currentBlockDisplayLabel },
                  { label: 'Modo ativo', value: activeStudyMode === 'pomodoro' ? 'Pomodoro' : 'Cronometro livre' },
                  { label: 'Meta semanal', value: `${weeklyGoalMinutes} min` },
                ]}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('cronograma')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                    activeTab === 'cronograma'
                      ? 'text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  style={activeTab === 'cronograma' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  Cronograma
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('metodos')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                    activeTab === 'metodos'
                      ? 'text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  style={activeTab === 'metodos' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  Metodo
                </button>
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                {activeTab === 'cronograma' ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        Configuracao base
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Ajuste o contexto da sua semana antes de mexer no cronograma.
                      </p>
                      <div className="mt-4">
                        <ModeSelector currentMode={activeStudyMode} onModeChange={handleStudyModeChange} />
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => setPreferredStudyTrack('enem')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'enem'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'enem' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            ENEM
                          </button>
                          <button
                            onClick={() => setPreferredStudyTrack('concursos')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'concursos'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'concursos' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            Concurso
                          </button>
                          <button
                            onClick={() => setPreferredStudyTrack('hibrido')}
                            className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                              preferredStudyTrack === 'hibrido'
                                ? 'text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            style={preferredStudyTrack === 'hibrido' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                          >
                            Hibrido
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Cronograma inteligente</p>
                        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                          Monte sua semana de estudo
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Defina quando e o que estudar. A execucao do dia continua separada.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">Meta semanal</p>
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                          <span>{weeklyGoalMinutes} min/semana</span>
                          <span>{activeStudyMethod.name}</span>
                        </div>
                        <input
                          type="range"
                          min={300}
                          max={2400}
                          step={30}
                          value={weeklyGoalMinutes}
                          onChange={(event) => setWeeklyGoalMinutes(Number(event.target.value))}
                          className="w-full accent-[var(--color-primary)]"
                        />
                      </div>
                      <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
                        <StudyScheduleCalendar
                          userId={supabaseUserId}
                          weeklySchedule={weeklySchedule}
                          onChangeWeeklySchedule={setWeeklyScheduleRaw}
                          studyContextForToday={effectiveStudyContextForToday}
                          officialTodayActionCard={officialStudySurfaceCard}
                          weeklyCompletedSessions={weeklyCompletedSessions}
                          todayCompletedSessions={todayCompletedSessions}
                          completedWeekdays={completedWeekdays}
                          requestedEditDay={requestedScheduleEditDay}
                          requestedEditNonce={requestedScheduleEditNonce}
                        />
                      </Suspense>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        Resumo do plano atual
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Use este resumo para decidir sem quebrar o ritmo da execucao atual.
                      </p>
                      <div className="mt-4">
                        <ModeSelector currentMode={activeStudyMode} onModeChange={handleStudyModeChange} />
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <span>Metodo</span>
                          <span>{activeStudyMethod.name}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Meta semanal: {(weeklyGoalMinutes / 60).toFixed(1)} h
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Foco atual: {currentBlockDisplayLabel}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Metodo de estudo</p>
                        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                          Escolha o metodo padrao fora da tela de execucao
                        </h3>
                      </div>
                      <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando metodos...</div>}>
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
                      </Suspense>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {!isUnifiedStudyFlow && activeTab === 'metodos' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando métodos...</div>}>
              <div className="space-y-6">
                <StudyExecutionBanner
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
          {activeTab === 'departamento' && (
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
                onStartStudyNow={({ methodId }) => {
                  if (methodId) {
                    applyPomodoroMethod(methodId);
                  } else {
                    setFocusExecutionState();
                  }
                  handleStartStudyFlowSafely();
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
          {activeTab === 'arvore' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando árvore...</div>}>
              <KnowledgeGenealogyTree
                supabaseUserId={supabaseUserId}
                preferredDisciplineName={preferredTreeDisciplineName}
              />
            </Suspense>
          )}

          {/* Página Foco */}
          {!isUnifiedStudyFlow && activeTab === 'foco' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <StudyExecutionBanner
                eyebrow="Próximo passo recomendado"
                title={
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'Hoje está livre no seu cronograma'
                      : 'Defina as disciplinas de hoje antes de começar'
                    : showQuestionTransitionState
                      ? questionTransitionTitle
                      : showPostFocusState
                        ? 'Sessão concluída'
                        : 'Iniciar sua sessão de foco'
                }
                description={
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'O estudo não sobe uma sessão normal hoje. Reative o dia no cronograma para continuar.'
                      : 'O dia está ativo, mas sem disciplinas definidas. Ajuste o cronograma antes de entrar na execução.'
                    : showQuestionTransitionState
                      ? questionTransitionDescription
                      : showPostFocusState && lastCompletedFocus
                        ? `Você focou em ${lastCompletedFocusDisplayLabel}.`
                        : 'Foco deixa de ser uma ferramenta solta e vira o centro da execução. Método, matéria e objetivo já estão definidos.'
                }
                primaryActionLabel={
                  isStudyFlowBlockedBySchedule
                    ? effectiveStudyContextForToday.state.type === 'inactive'
                      ? 'Abrir cronograma'
                      : 'Definir disciplinas'
                    : showQuestionTransitionState
                      ? 'Aguarde'
                      : showPostFocusState
                        ? postFocusPrimaryActionLabel
                        : 'Começar sessão agora'
                }
                onPrimaryAction={
                  isStudyFlowBlockedBySchedule
                    ? handleOpenTodaySchedule
                    : showQuestionTransitionState
                      ? () => {}
                      : showPostFocusState
                        ? handleContinueAfterFocus
                        : scrollToFocusTimer
                }
                primaryActionDisabled={showQuestionTransitionState}
                supportingText={
                  showPostFocusState
                    ? [postFocusSecondaryCopy, nextStudySuggestionCopy].filter(Boolean).join(' ')
                    : !isStudyFlowBlockedBySchedule && currentBlockSuggestedTopicCopy
                      ? currentBlockSuggestedTopicCopy
                      : undefined
                }
                secondaryActionLabel={showPostFocusState ? 'Ajustar plano' : undefined}
                onSecondaryAction={showPostFocusState ? handleOpenTodaySchedule : undefined}
                className={showPostFocusState ? 'transition-all duration-200 ease-out' : undefined}
                meta={[
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
                ]}
              />
              {isStudyFlowBlockedBySchedule ? (
                <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Execução protegida</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100">
                    O foco só abre quando o dia estiver coerente
                  </h2>
                  <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
                    Ajuste o cronograma de hoje e depois volte para estudar. Isso evita iniciar sessão fora do plano do dia.
                  </p>
                </div>
              ) : showQuestionTransitionState ? (
                <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-5 shadow-sm transition-all duration-200 ease-out dark:border-sky-900 dark:bg-sky-950/30 sm:p-6">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
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
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm transition-all duration-200 ease-out dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Depois do foco
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
                    Sessão concluída
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    {lastCompletedFocusDisplayLabel}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                    {postFocusProgressCopy}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/70 dark:text-emerald-100/70">
                    {weeklyProgressCopy}
                  </p>
                  <p className="mt-3 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                    Você focou em {lastCompletedFocusDisplayLabel}.
                  </p>
                  <p className="mt-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {postFocusPlanConfidenceCopy}
                  </p>
                  <p className="mt-1 text-sm font-medium text-emerald-900/80 dark:text-emerald-100/80">
                    {postFocusSecondaryCopy}
                  </p>
                  {nextStudySuggestionCopy ? (
                    <p className="mt-2 text-xs text-emerald-900/60 dark:text-emerald-100/60">
                      {nextStudySuggestionCopy}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleContinueAfterFocus}
                      className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
                    >
                      {postFocusPrimaryActionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenTodaySchedule}
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/60 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100"
                    >
                      Ajustar plano
                    </button>
                  </div>
                </div>
              ) : (
                <>
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Zona de Foco</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Escolha o modo e comece a pontuar.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">
                      <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" />Objetivo de Estudo</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Defina sua trilha principal e ajuste os pesos da rotina.
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{
                      color: 'var(--color-primary)',
                      borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                    }}
                  >
                    Modo ativo: {preferredStudyTrack === 'enem' ? 'ENEM' : preferredStudyTrack === 'concursos' ? 'Concurso' : 'Híbrido'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setPreferredStudyTrack('enem')}
                      className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        preferredStudyTrack === 'enem'
                          ? 'text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/70'
                      }`}
                      style={preferredStudyTrack === 'enem' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      ENEM
                    </button>
                    <button
                      onClick={() => setPreferredStudyTrack('concursos')}
                      className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        preferredStudyTrack === 'concursos'
                          ? 'text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/70'
                      }`}
                      style={preferredStudyTrack === 'concursos' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      Concurso
                    </button>
                    <button
                      onClick={() => setPreferredStudyTrack('hibrido')}
                      className={`px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        preferredStudyTrack === 'hibrido'
                          ? 'text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/70'
                      }`}
                      style={preferredStudyTrack === 'hibrido' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                    >
                      Híbrido
                    </button>
                  </div>
                  <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5">
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
                      {preferredStudyTrack === 'enem'
                        ? 'ENEM: foco em competências e provas multidisciplinares.'
                        : preferredStudyTrack === 'concursos'
                          ? 'Concurso: treino orientado por edital, banca e objetividade.'
                          : 'Híbrido: equilíbrio dinâmico entre ENEM e Concurso.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {preferredStudyTrack === 'hibrido' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/60">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                        <span className="inline-flex items-center gap-1"><Scale className="w-3.5 h-3.5" />Peso por objetivo</span>
                      </p>
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                        <span>ENEM: {hybridEnemWeight}%</span>
                        <span>Concurso: {hybridConcursoWeight}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        step={5}
                        value={hybridEnemWeight}
                        onChange={(event) => setHybridEnemWeight(Number(event.target.value))}
                        className="w-full accent-[var(--color-primary)]"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Fórmula ativa: P = {(hybridEnemWeight / 100).toFixed(2)}E + {(hybridConcursoWeight / 100).toFixed(2)}C
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Meta semanal</span>
                    </p>
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                      <span>{weeklyGoalMinutes} min/semana</span>
                      <span>{activeStudyMethod.name}</span>
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={2400}
                      step={30}
                      value={weeklyGoalMinutes}
                      onChange={(event) => setWeeklyGoalMinutes(Number(event.target.value))}
                      className="w-full accent-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                  {preferencesSyncStatus === 'syncing' && (
                    <p className="text-sky-600 dark:text-sky-300 inline-flex items-center gap-1"><Cloud className="w-3.5 h-3.5" />Sincronizando preferências na nuvem...</p>
                  )}
                  {preferencesSyncStatus === 'synced' && (
                    <p className="text-emerald-600 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Preferências sincronizadas com a nuvem.</p>
                  )}
                  {preferencesSyncStatus === 'error' && (
                    <p className="text-amber-600 dark:text-amber-300 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Modo local ativo. A sincronização será retomada quando possível.</p>
                  )}
                  {preferencesSyncStatus === 'local' && (
                    <p className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" />Preferências salvas localmente neste dispositivo.</p>
                  )}
                  {lastPreferencesSyncAt !== null && preferencesSyncStatus === 'synced' && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Última sincronização: {lastPreferencesSyncAt
                        ? new Date(String(lastPreferencesSyncAt)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </p>
                  )}
                </div>
              </div>

              {preferredStudyTrack === 'enem' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 shadow-sm">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"><Brain className="w-4 h-4" />Método completo para ENEM</h3>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <li>• Estude por competência (interpretação, contexto e resolução), não por matéria isolada.</li>
                    <li>• Ciclo semanal: Seg Matemática+Redação, Ter Linguagens, Qua Humanas, Qui Natureza, Sex revisão, Sáb simulado, Dom análise de erros.</li>
                    <li>• Redação toda semana: modelo dissertativo-argumentativo + proposta de intervenção completa.</li>
                    <li>• Regra de ouro: 70% questões, 20% teoria, 10% revisão.</li>
                  </ul>
                </div>
              ) : preferredStudyTrack === 'concursos' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 shadow-sm">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"><BookOpen className="w-4 h-4" />Método completo para Concurso</h3>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <li>• Estude pelo edital e banca (Cebraspe, FGV, FCC), evitando assuntos soltos.</li>
                    <li>• Disciplinas-base: Português, Raciocínio Lógico, Direito Constitucional, Direito Administrativo, Informática e Atualidades.</li>
                    <li>• Método 4F: Foco no edital, Fazer questões da banca, Fichas de revisão, Flashcards.</li>
                    <li>• Ciclo sugerido: Seg Português, Ter Constitucional+Administrativo, Qua Informática, Qui Raciocínio, Sex Atualidades+revisão, Sáb simulado de banca.</li>
                    <li>• Aprofunde parte técnica e resolução objetiva por estilo de cobrança.</li>
                    <li>• Regra de ouro: 80% questões, 15% teoria, 5% revisão ativa diária.</li>
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 shadow-sm">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"><GitBranch className="w-4 h-4" />Método híbrido ENEM + Concurso</h3>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <li>• Foco principal e secundário com pesos dinâmicos ({hybridEnemWeight}% ENEM / {hybridConcursoWeight}% Concurso).</li>
                    <li>• Disciplinas ENEM: Matemática, Linguagens, Ciências Humanas, Ciências da Natureza e Redação.</li>
                    <li>• Disciplinas Concurso: Português, Raciocínio Lógico, Direito Constitucional, Direito Administrativo, Informática e Atualidades.</li>
                    <li>• Ciclo misto recomendado: Matemática ENEM, Português, Humanas, Constitucional/Administrativo, Natureza, Informática, Redação e simulado misto.</li>
                    <li>• O sistema redistribui treino por desempenho e nunca deixa uma trilha zerar.</li>
                    <li>• Estratégia: interpretação + técnica de banca com revisão espaçada contínua.</li>
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 inline-flex items-center gap-2"><Brain className="w-4 h-4" />Sistema inteligente de estudos</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  O app já ajusta prioridades por desempenho. Regra adaptativa ativa: abaixo de 60% revisa em 24h, entre 60% e 80% revisa em 7 dias, acima de 80% revisa em 30 dias.
                </p>
              </div>

              <div ref={focusTimerSectionRef} data-testid="study-focus-container">
                <ModeSelector currentMode={activeStudyMode} onModeChange={handleStudyModeChange} />

              {activeStudyMode === 'pomodoro' ? (
                <div className="space-y-6">
                  <PomodoroTimer
                    onFinishSession={handleFinishStudySession}
                    selectedMethodId={selectedMethodId}
                    onSelectMethod={(methodId) => {
                      applyPomodoroMethod(methodId);
                    }}
                    quickStartSignal={academyQuickStartSignal}
                    initialFocusMinutes={effectiveStudyExecutionState.currentBlock.duration}
                    preferredTrack={preferredStudyTrack}
                    hybridEnemWeight={hybridEnemWeight}
                    sessionStorageScope={userStorageScope}
                    userEmail={user?.email}
                  />
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Como usar o Pomodoro?
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2">
                      <li>• Escolha o método para carregar foco, pausa curta e pausa longa automaticamente</li>
                      <li>• O timer alterna: foco → pausa curta → foco ... até pausa longa</li>
                      <li>• Você pode trocar entre modos e métodos sem perder controle da sessão</li>
                      <li>• A matéria selecionada + método ficam salvos no histórico</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando timer...</div>}>
                    <StudyTimer
                      onFinishSession={handleFinishStudySession}
                      preferredTrack={preferredStudyTrack}
                      hybridEnemWeight={hybridEnemWeight}
                      sessionStorageScope={userStorageScope}
                      userEmail={user?.email}
                    />
                  </Suspense>
                </div>
              )}
              </div>
                </>
              )}
            </div>
          )}

          {/* Página Dashboard */}
          {activeTab === 'dashboard' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dashboard...</div>}>
              {(userData.sessions?.length || userData.studyHistory?.length) ? (
              <div className="space-y-6">
                <ErrorBoundary>
                  <Dashboard
                    userData={userData}
                    todayMinutes={todayMinutes}
                    userName={resolvedDisplayName}
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
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                  <LevelProgress userPoints={userData.totalPoints} />
                  <RankOverview
                    userPoints={userData.totalPoints}
                    highlightSignal={rankHighlightSignal}
                    darkMode={darkMode}
                  />
                </div>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="bg-slate-900 rounded-xl border border-slate-700/70 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] p-6">
                    <StudyHeatmap sessions={userData.sessions || userData.studyHistory || []} />
                  </div>
                  <div className="bg-slate-900 rounded-xl border border-slate-700/70 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)] p-6">
                  <h3 className="text-xl font-bold text-slate-100 mb-2">Gráfico Semanal</h3>
                  <WeeklyChartReal
                    sessions={userData.sessions || userData.studyHistory || []}
                    dailyGoalMinutes={userData.dailyGoal || 180}
                  />
                </div>
                </div>
                <MethodPerformance sessions={userData.sessions || userData.studyHistory || []} />
                <WeeklyReport sessions={userData.sessions || userData.studyHistory || []} />
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
          {!isUnifiedStudyFlow && activeTab === 'cronograma' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
              <div className="space-y-6">
                <StudyExecutionBanner
                  eyebrow="Plano base"
                  title="Seu plano base ja esta definido. Ajuste so se precisar."
                  description="Cronograma vira origem do estudo, nao primeira tarefa. O caminho dominante continua sendo executar o bloco de hoje."
                  primaryActionLabel="Executar plano de hoje"
                  onPrimaryAction={handleStartStudyFlowSafely}
                  meta={[
                    { label: 'Bloco atual', value: currentBlockDisplayLabel },
                    { label: 'Duracao prevista', value: `${effectiveStudyExecutionState.currentBlock.duration || plannedFocusDuration} min` },
                    { label: 'Origem', value: effectiveStudyExecutionState.source === 'manual' ? 'Manual' : effectiveStudyExecutionState.source === 'plan' ? 'Plano' : 'IA' },
                  ]}
                />
                <StudyScheduleCalendar
                  userId={supabaseUserId}
                  weeklySchedule={weeklySchedule}
                  onChangeWeeklySchedule={setWeeklyScheduleRaw}
                  studyContextForToday={effectiveStudyContextForToday}
                  officialTodayActionCard={officialStudySurfaceCard}
                  weeklyCompletedSessions={weeklyCompletedSessions}
                  todayCompletedSessions={todayCompletedSessions}
                  completedWeekdays={completedWeekdays}
                  requestedEditDay={requestedScheduleEditDay}
                  requestedEditNonce={requestedScheduleEditNonce}
                />
              </div>
            </Suspense>
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
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando flashcards...</div>}>
              <FlashcardsPage />
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
                onToggleDarkMode={() => setDarkMode(!darkMode)}
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
            streak={userData.currentStreak || userData.streak || 0}
            onPrimaryAction={() => {
              trackBeginnerEvent('beginner_next_step_clicked', {
                completedMissionId: beginnerResult!.completedMissionId,
                nextMissionId: beginnerResult!.nextMissionId || null,
                source: 'post_session_modal',
              });
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
      <footer className="bg-white dark:bg-gray-800 mt-12 py-6 border-t dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p className="font-semibold">Zero Base 2.0</p>
          <p className="text-sm mt-1">
            Desenvolvido com <Heart className="inline w-4 h-4" /> para estudos inteligentes
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
