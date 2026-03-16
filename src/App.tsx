import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Home, GraduationCap, Brain, Clock3, BarChart3, Trophy, Settings, Database, Info, Heart, CalendarDays, HelpCircle, Layers, BookOpen, Zap, Users, GitBranch } from 'lucide-react';
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
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';

// Constants
import { INITIAL_USER_DATA } from './constants';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAchievements } from './hooks/useAchievements';
import { sessionService } from './services/session.service';
import { isSupabaseConfigured, supabase } from './services/supabase.client';
import { saasPlanningService } from './services/saasPlanning.service';
import { studyPreferencesService } from './services/studyPreferences.service';
import { profilePreferencesService } from './services/profilePreferences.service';
import { userProfileService } from './services/userProfile.service';
import { xpEngineService } from './services/xpEngine.service';
import { offlineSyncService } from './services/offlineSync.service';
import { weeklyStreakService } from './services/weeklyStreak.service';
import { STUDY_METHODS } from './data/studyMethods';
import type { SmartScheduleProfile } from './utils/smartScheduleEngine';

// Types & Utils
import { UserData, MateriaTipo } from './types';
import { getDayOfWeek } from './utils/helpers';
import { trackEvent } from './utils/analytics';
import { buildWeeklyRetentionSnapshot } from './utils/weeklyRetention';

const WEEK_DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
type StudyMode = 'pomodoro' | 'livre';
type StudyTrack = 'enem' | 'concursos' | 'hibrido';
type QuizTrackFilter = 'enem' | 'concurso' | 'ambos';

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
const EmptyState = lazy(() => import('./components/UI/EmptyState'));
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
    `medicinaData_${user?.email || 'default'}`,
    INITIAL_USER_DATA
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
  const [preferredStudyTrack, setPreferredStudyTrack] = useLocalStorage<StudyTrack>(`preferredStudyTrack_${userStorageScope}`, 'enem');
  const [hybridEnemWeight, setHybridEnemWeight] = useLocalStorage<number>(`hybridEnemWeight_${userStorageScope}`, 70);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useLocalStorage<number>(`weeklyGoalMinutes_${userStorageScope}`, 900);
  const [profileDisplayName, setProfileDisplayName] = useLocalStorage<string>(`profileDisplayName_${userStorageScope}`, '');
  const [profileAvatar, setProfileAvatar] = useLocalStorage<string>(`profileAvatar_${userStorageScope}`, '🧑‍⚕️');
  const [profileExamGoal, setProfileExamGoal] = useLocalStorage<string>(`profileExamGoal_${userStorageScope}`, 'ENEM Medicina');
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
  const [shouldScrollToRanks, setShouldScrollToRanks] = useState(false);
  const [rankHighlightSignal, setRankHighlightSignal] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quizPrefilter, setQuizPrefilter] = useState<QuizPrefilter | null>(null);
  const [mockExamPrefilter, setMockExamPrefilter] = useState<MockExamPrefilter | null>(null);
  const [syncUiStatus, setSyncUiStatus] = useState(offlineSyncService.getStatus());
  const [academyQuickStartSignal, setAcademyQuickStartSignal] = useState(0);

  const applyAchievementReward = React.useCallback(
    (achievementId: string, points: number) => {
      setUserData((prev) => xpEngineService.applyAchievementReward(prev, achievementId, points));
    },
    [setUserData],
  );

  // Achievements Hook (com cloud sync)
  const { newlyUnlocked } = useAchievements(userData, supabaseUserId, applyAchievementReward);

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
    toast.success('Logout realizado com sucesso!');
  }, [logout]);

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
      toast('Sem conflitos resolvidos automaticamente até agora.', { icon: 'ℹ️' });
      return;
    }

    const preview = history
      .slice(0, 3)
      .map((item) => `${new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${item.detail}`)
      .join('\n');

    toast(preview, { duration: 5000, icon: '🧩' });
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
    if (!isLoggedIn || !user?.email) {
      setShowOnboarding(false);
      return;
    }

    const onboardingKey = `mdzOnboardingCompleted_${user.email}`;
    const completed = window.localStorage.getItem(onboardingKey) === 'true';
    setShowOnboarding(!completed);
  }, [isLoggedIn, user?.email]);

  const handleFinishStudySession = React.useCallback(
    (minutes: number, subject: MateriaTipo, methodId?: string) => {
      const points = minutes * 10;
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

      setUserData((prev) => xpEngineService.applyStudySessions(prev, [newSession]));
      toast.success(`Sessão finalizada. Você ganhou ${points} pontos.`, {
        duration: 4000
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
          toast('🌱 Você começou sua semana de estudos (1/4).', { icon: '🌱' });
        } else if (nextWeeklyRetention.studiedDays === 2) {
          toast('💪 Ótimo ritmo! Você já está em 2/4 dias da missão semanal.', { icon: '💪' });
        } else if (nextWeeklyRetention.studiedDays === 3) {
          toast('🔥 Você está consistente! Falta 1 dia para manter a sequência semanal.', { icon: '🔥' });
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
        toast.success('🏆 Semana garantida! Você fechou 4/4 dias de estudo.', { duration: 5000 });
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

      if (isSupabaseConfigured && supabaseUserId) {
        void sessionService
          .create(supabaseUserId, newSession)
          .then(() => weeklyStreakService.recordStudyDay(supabaseUserId, newSession.date, 4))
          .catch(() => {
            toast.error('Falha ao salvar na nuvem. Seus dados continuam salvos localmente.');
          });
      }
    },
    [userData, setUserData, supabaseUserId, user?.email]
  );

  const handleImportData = React.useCallback((data: UserData) => {
    setUserData(data);
  }, [setUserData]);

  const handleCompleteOnboarding = React.useCallback(
    ({
      dailyGoal,
      methodId,
      smartProfile,
    }: {
      dailyGoal: number;
      methodId: string;
      smartProfile: SmartScheduleProfile;
    }) => {
      if (user?.email) {
        const onboardingKey = `mdzOnboardingCompleted_${user.email}`;
        window.localStorage.setItem(onboardingKey, 'true');
        window.localStorage.setItem(`smartScheduleAutoGenerate_${user.email.toLowerCase()}`, 'true');
        window.localStorage.setItem(`smartScheduleAutoGenerate_${supabaseUserId || 'default'}`, 'true');
        window.localStorage.setItem(`smartScheduleProfile_${supabaseUserId || 'default'}`, JSON.stringify(smartProfile));
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

      setUserData((prev) => ({
        ...prev,
        dailyGoal,
      }));
      setSelectedMethodId(methodId);
      setActiveStudyMode('pomodoro');
      setActiveTab('cronograma');
      setShowOnboarding(false);
      toast.success('Configuração inicial concluída! Cronograma inteligente gerado.');

      if (supabaseUserId && isSupabaseConfigured) {
        void saasPlanningService
          .upsertProfile(supabaseUserId, smartProfile)
          .then(() => saasPlanningService.upsertSubjectLevels(supabaseUserId, smartProfile.subjectDifficulty))
          .catch(() => {
            toast('Perfil SaaS salvo localmente. A sincronização com a nuvem será retomada automaticamente.');
          });
      }
    },
    [setUserData, setSelectedMethodId, setActiveStudyMode, user?.email, supabaseUserId]
  );

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

  // ── Sync do perfil do usuário (XP, level, streak) com a nuvem ──
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
            // Local tem mais pontos — push para nuvem
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

  // ── Push mudanças de userData para a nuvem (debounced) ──
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
  }, [setUserData]);

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
    setProfileAvatar((previous) => previous || user.foto || '🧑‍⚕️');
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
          setProfileAvatar(cloudProfile.avatar || '🧑‍⚕️');
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
      { id: 'arvore', label: 'Árvore', icon: GitBranch },
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
        label: 'Árvore',
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

  const activeSubTabs = React.useMemo(
    () => tabList.filter((tab) => activeDomain.tabIds.includes(tab.id)),
    [tabList, activeDomain]
  );

  const configTabs = React.useMemo(
    () => tabList.filter((tab) => tab.id === 'configuracoes' || tab.id === 'dados'),
    [tabList]
  );

  // Aguardar verificação de sessão do Supabase
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

  // Main app
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors ${darkMode ? 'dark' : ''}`}>
      <Toaster position="top-center" />
      <NotificationSetup />
      {/* Achievement Notification */}
      {newlyUnlocked && (
        <AchievementNotification 
          achievement={newlyUnlocked} 
          onClose={() => {}} 
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
      />

      {showOnboarding && (
        <OnboardingFlow
          userName={resolvedDisplayName}
          initialDailyGoal={userData.dailyGoal || 90}
          initialMethodId={selectedMethodId}
          onComplete={handleCompleteOnboarding}
        />
      )}

      <main className="max-w-[1440px] mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 lg:gap-8">
          <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-24 h-[calc(100vh-7rem)] rounded-2xl bg-slate-900 border border-slate-800 p-3">
            <p className="px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold">Navegação</p>

            <div className="space-y-1.5 mt-1">
              {domainList.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setActiveTab(domain.defaultTab)}
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
                  onClick={() => setActiveTab(tab.id)}
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
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
                {domainList.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setActiveTab(domain.defaultTab)}
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

              <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">
                {configTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
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

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 font-semibold">Área ativa</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{activeDomain.label}</p>
              </div>

              {activeSubTabs.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {activeSubTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
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
                todayMinutes={todayMinutes}
                completedContentIds={completedContentIds}
                currentStreak={userData.currentStreak || 0}
                sessions={userData.sessions || userData.studyHistory || []}
                supabaseUserId={supabaseUserId}
                preferredTrack={preferredStudyTrack}
                onNavigate={(tab) => setActiveTab(tab)}
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
                    setMockExamPrefilter(prefilterPayload);
                    setActiveTab('simulado');
                    return;
                  }

                  setQuizPrefilter(prefilterPayload);
                  setActiveTab('questoes');
                }}
                onOpenRanks={() => {
                  setActiveTab('dashboard');
                  setShouldScrollToRanks(true);
                  setRankHighlightSignal((previous) => previous + 1);
                }}
                onContinueNow={() => {
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
              />
            </Suspense>
          )}

          {/* Página Métodos */}
          {activeTab === 'metodos' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando métodos...</div>}>
              <StudyMethodHub
                userData={userData}
                selectedMethodId={selectedMethodId}
                onSelectMethod={setSelectedMethodId}
                onStartMethod={(methodId) => {
                  setSelectedMethodId(methodId);
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
              />
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
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
                onGoToAcademy={() => {
                  setActiveTab('departamento');
                }}
              />
            </Suspense>
          )}

          {activeTab === 'mentor-admin' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dashboard admin...</div>}>
              <MentorAdminDashboard userEmail={user?.email} />
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
                    setSelectedMethodId(methodId);
                  }
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                  setAcademyQuickStartSignal((prev) => prev + 1);
                }}
                onApplyMethod={(methodId) => {
                  setSelectedMethodId(methodId);
                  setActiveTab('foco');
                  setActiveStudyMode('pomodoro');
                }}
              />
            </Suspense>
          )}

          {/* Página Árvore */}
          {activeTab === 'arvore' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando árvore...</div>}>
              <KnowledgeGenealogyTree supabaseUserId={supabaseUserId} />
            </Suspense>
          )}

          {/* Página Foco */}
          {activeTab === 'foco' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Zona de Foco</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Escolha o modo e comece a pontuar.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">
                      🎯 Objetivo de Estudo
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
                        ? '📘 ENEM: foco em competências e provas multidisciplinares.'
                        : preferredStudyTrack === 'concursos'
                          ? '🏛️ Concurso: treino orientado por edital, banca e objetividade.'
                          : '🔀 Híbrido: equilíbrio dinâmico entre ENEM e Concurso.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {preferredStudyTrack === 'hibrido' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/60">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-2">
                        ⚖️ Peso por objetivo
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
                      🗓️ Meta semanal
                    </p>
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                      <span>{weeklyGoalMinutes} min/semana</span>
                      <span>{(weeklyGoalMinutes / 60).toFixed(1)} h</span>
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
                    <p className="text-sky-600 dark:text-sky-300">☁️ Sincronizando preferências na nuvem...</p>
                  )}
                  {preferencesSyncStatus === 'synced' && (
                    <p className="text-emerald-600 dark:text-emerald-300">✅ Preferências sincronizadas com a nuvem.</p>
                  )}
                  {preferencesSyncStatus === 'error' && (
                    <p className="text-amber-600 dark:text-amber-300">⚠️ Modo local ativo. A sincronização será retomada quando possível.</p>
                  )}
                  {preferencesSyncStatus === 'local' && (
                    <p className="text-slate-500 dark:text-slate-400">📦 Preferências salvas localmente neste dispositivo.</p>
                  )}
                  {lastPreferencesSyncAt && preferencesSyncStatus === 'synced' && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Última sincronização: {new Date(lastPreferencesSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              {preferredStudyTrack === 'enem' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 shadow-sm">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">🧠 Método completo para ENEM</h3>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <li>• Estude por competência (interpretação, contexto e resolução), não por matéria isolada.</li>
                    <li>• Ciclo semanal: Seg Matemática+Redação, Ter Linguagens, Qua Humanas, Qui Natureza, Sex revisão, Sáb simulado, Dom análise de erros.</li>
                    <li>• Redação toda semana: modelo dissertativo-argumentativo + proposta de intervenção completa.</li>
                    <li>• Regra de ouro: 70% questões, 20% teoria, 10% revisão.</li>
                  </ul>
                </div>
              ) : preferredStudyTrack === 'concursos' ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3 shadow-sm">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">📚 Método completo para Concurso</h3>
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
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">🔀 Método híbrido ENEM + Concurso</h3>
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
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">🤖 Sistema inteligente de estudos</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  O app já ajusta prioridades por desempenho. Regra adaptativa ativa: abaixo de 60% revisa em 24h, entre 60% e 80% revisa em 7 dias, acima de 80% revisa em 30 dias.
                </p>
              </div>

              <ModeSelector currentMode={activeStudyMode} onModeChange={setActiveStudyMode} />

              {activeStudyMode === 'pomodoro' ? (
                <div className="space-y-6">
                  <PomodoroTimer
                    onFinishSession={handleFinishStudySession}
                    selectedMethodId={selectedMethodId}
                    onSelectMethod={setSelectedMethodId}
                    quickStartSignal={academyQuickStartSignal}
                    preferredTrack={preferredStudyTrack}
                    hybridEnemWeight={hybridEnemWeight}
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
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {/* Página Dashboard */}
          {activeTab === 'dashboard' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando dashboard...</div>}>
              {(userData.sessions?.length || userData.studyHistory?.length) ? (
              <div className="space-y-6">
                <LevelProgress userPoints={userData.totalPoints} />
                <RankOverview
                  userPoints={userData.totalPoints}
                  highlightSignal={rankHighlightSignal}
                  darkMode={darkMode}
                />
                <ErrorBoundary>
                  <Dashboard
                    userData={userData}
                    todayMinutes={todayMinutes}
                    userName={resolvedDisplayName}
                    onStartFocusSession={() => {
                      setActiveTab('foco');
                      setActiveStudyMode('pomodoro');
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
                      }

                      setActiveTab('foco');
                      setActiveStudyMode('pomodoro');
                    }}
                    onOpenQuestions={() => setActiveTab('questoes')}
                    onOpenFlashcards={() => setActiveTab('flashcards')}
                  />
                </ErrorBoundary>
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
                <MethodPerformance sessions={userData.sessions || userData.studyHistory || []} />
                <WeeklyReport sessions={userData.sessions || userData.studyHistory || []} />
              </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Nenhuma sessão registrada"
                  description="Comece sua primeira sessão de estudo para ver estatísticas, gráficos e progresso detalhado aqui."
                  actionLabel="Começar a Estudar"
                  onAction={() => { setActiveTab('foco'); setActiveStudyMode('pomodoro'); }}
                  secondaryLabel="Ver Departamento"
                  onSecondaryAction={() => setActiveTab('departamento')}
                />
              )}
            </Suspense>
          )}

          {/* Página Cronograma */}
          {activeTab === 'cronograma' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando cronograma...</div>}>
              <StudyScheduleCalendar userId={supabaseUserId} />
            </Suspense>
          )}

          {/* Página Questões */}
          {activeTab === 'questoes' && (
            <Suspense fallback={<div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Carregando questões...</div>}>
              <QuizPage
                supabaseUserId={supabaseUserId}
                initialFilter={quizPrefilter || undefined}
                onEarnXP={(xp) => {
                  setUserData((prev) => xpEngineService.applyXpDelta(prev, xp));
                  toast.success(`+${xp} XP ganhos nas questões!`);
                }}
              />
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
                onStartQuiz={(subject) => {
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
              <ConquistasPage userData={userData} />
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
                <LocalStoragePage
                  userData={userData}
                  onImportData={handleImportData}
                  onClearData={handleClearData}
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
                <SyncCenter userId={supabaseUserId} />
                <RetentionAdminPanel />
              </div>
            </Suspense>
          )}
            </div>
          </section>
        </div>
      </main>

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
