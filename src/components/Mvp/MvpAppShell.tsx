import React from 'react';
import { BarChart3, Flame, LogOut, RefreshCw, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { mvpApiService, type MvpHomePayload, type MvpProfile } from '../../services/mvpApi.service';
import {
  mvpStudySessionsService,
  type StudySession,
  type StudySessionResult,
} from '../../services/mvpStudySessions.service';
import { StudySessionPage } from './StudySessionPage';
import { StudySessionResult as StudySessionResultView } from './StudySessionResult';

type DisciplineSlug = 'linguagens' | 'matematica' | 'natureza' | 'humanas' | 'redacao';

interface MvpAppShellProps {
  onLogout: () => Promise<void> | void;
}

const weakestDisciplineOptions: Array<{ slug: DisciplineSlug; label: string }> = [
  { slug: 'linguagens', label: 'Linguagens' },
  { slug: 'matematica', label: 'Matematica' },
  { slug: 'natureza', label: 'Natureza' },
  { slug: 'humanas', label: 'Humanas' },
  { slug: 'redacao', label: 'Redacao' },
];

const weeklyHourOptions = [3, 6, 10, 15];

const defaultProfile: MvpProfile = {
  examType: 'enem',
  level: 'iniciante',
  weeklyHours: 6,
  preferredGoal: '',
  weakestDisciplines: ['matematica'],
};

const getStudySessionIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionId = new URLSearchParams(window.location.search).get('sessionId');
  return sessionId || null;
};

const setStudySessionIdInUrl = (sessionId: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);

  if (sessionId) {
    url.searchParams.set('sessionId', sessionId);
  } else {
    url.searchParams.delete('sessionId');
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const LoadingCard: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
    <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Zero Base MVP</p>
      <h1 className="mt-2 text-2xl font-bold">Carregando seu fluxo principal</h1>
      <p className="mt-3 text-sm text-slate-600">{label}</p>
    </div>
  </div>
);

const ErrorCard: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
    <div className="mx-auto max-w-3xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Falha no MVP</p>
      <h1 className="mt-2 text-2xl font-bold">Nao foi possivel carregar seu fluxo</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </div>
);

interface OnboardingCardProps {
  initialProfile: MvpProfile;
  userName: string;
  onSubmit: (profile: MvpProfile) => Promise<void>;
  submitting: boolean;
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({
  initialProfile,
  userName,
  onSubmit,
  submitting,
}) => {
  const [profile, setProfile] = React.useState<MvpProfile>(initialProfile);

  const toggleWeakestDiscipline = (slug: DisciplineSlug) => {
    setProfile((current) => {
      const alreadySelected = current.weakestDisciplines.includes(slug);
      if (!alreadySelected && current.weakestDisciplines.length >= 2) {
        return current;
      }

      return {
        ...current,
        weakestDisciplines: alreadySelected
          ? current.weakestDisciplines.filter((entry) => entry !== slug)
          : [...current.weakestDisciplines, slug],
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Sprint 1 MVP</p>
        <h1 className="mt-2 text-3xl font-bold">Vamos definir seu ponto de partida, {userName}.</h1>
        <p className="mt-3 text-sm text-slate-600">
          Aqui a regra e simples: o backend usa essas respostas para gerar sua primeira recomendacao real.
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(profile);
          }}
        >
          <section className="space-y-3">
            <label className="text-sm font-semibold text-slate-800">Nivel atual</label>
            <div className="grid gap-3 md:grid-cols-3">
              {(['iniciante', 'intermediario', 'avancado'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setProfile((current) => ({ ...current, level }))}
                  className={`rounded-2xl border p-4 text-left text-sm transition ${
                    profile.level === level
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold capitalize">{level}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label className="text-sm font-semibold text-slate-800">Horas disponiveis por semana</label>
            <div className="grid gap-3 md:grid-cols-4">
              {weeklyHourOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProfile((current) => ({ ...current, weeklyHours: value }))}
                  className={`rounded-2xl border p-4 text-left text-sm transition ${
                    profile.weeklyHours === value
                      ? 'border-emerald-600 bg-emerald-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold">{value}h</p>
                  <p className="mt-1 text-xs text-slate-500">por semana</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label htmlFor="mvp-preferred-goal" className="text-sm font-semibold text-slate-800">
              Objetivo principal
            </label>
            <input
              id="mvp-preferred-goal"
              type="text"
              value={profile.preferredGoal || ''}
              onChange={(event) => setProfile((current) => ({ ...current, preferredGoal: event.target.value }))}
              placeholder="Ex: melhorar base e constancia"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
          </section>

          <section className="space-y-3">
            <label className="text-sm font-semibold text-slate-800">Areas mais fracas</label>
            <p className="text-xs text-slate-500">Escolha no maximo 2 areas para orientar o primeiro foco.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {weakestDisciplineOptions.map((option) => {
                const selected = profile.weakestDisciplines.includes(option.slug);
                return (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => toggleWeakestDiscipline(option.slug)}
                    className={`rounded-2xl border p-4 text-left text-sm transition ${
                      selected
                        ? 'border-amber-500 bg-amber-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold">{option.label}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Salvando...' : 'Montar meu plano inicial'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface HomeCardProps {
  home: MvpHomePayload;
  onReload: () => Promise<void>;
  onStartStudy: () => Promise<void>;
  startingStudy: boolean;
  onLogout: () => Promise<void> | void;
}

const HomeCard: React.FC<HomeCardProps> = ({ home, onReload, onStartStudy, startingStudy, onLogout }) => (
  <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Zero Base MVP</p>
          <h1 className="mt-2 text-3xl font-bold">Seu ponto fraco atual e {home.decision.currentWeakPoint}</h1>
          <p className="mt-2 text-sm text-slate-600">{home.mission.reason}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={startingStudy}
            onClick={() => void onStartStudy()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {startingStudy ? 'Abrindo sessao...' : home.mission.ctaLabel}
          </button>
          <button
            type="button"
            onClick={() => void onReload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </button>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Target className="h-4 w-4" />
            Motor de decisao
          </div>
          <p className="mt-3 text-sm text-slate-500">Seu ponto fraco atual</p>
          <p className="mt-1 text-xl font-bold">{home.decision.currentWeakPoint}</p>
          <p className="mt-3 text-sm text-slate-500">Proximo foco</p>
          <p className="mt-1 text-sm text-slate-700">{home.decision.nextFocus}</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Flame className="h-4 w-4" />
            Ritmo
          </div>
          <p className="mt-3 text-3xl font-bold">{home.gamification.streakDays}</p>
          <p className="mt-2 text-sm text-slate-600">dias de streak</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <BarChart3 className="h-4 w-4" />
            Semana
          </div>
          <p className="mt-3 text-3xl font-bold">{home.weeklyProgress.goalMinutes}</p>
          <p className="mt-2 text-sm text-slate-600">minutos planejados</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">XP</p>
            <p className="mt-1 text-2xl font-bold">{home.gamification.xp}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Nivel</p>
            <p className="mt-1 text-2xl font-bold">{home.gamification.level}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Sessoes na semana</p>
            <p className="mt-1 text-2xl font-bold">{home.weeklyProgress.sessionsCompleted}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Loop de estudo</p>
          {home.activeStudySession ? (
            <>
              <p className="mt-3 text-xl font-bold">Sessao em andamento</p>
              <p className="mt-2 text-sm text-slate-600">
                {home.activeStudySession.answeredQuestions}/{home.activeStudySession.totalQuestions} questoes ja foram respondidas.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-xl font-bold">Nenhuma sessao ativa agora</p>
              <p className="mt-2 text-sm text-slate-600">
                O CTA acima abre uma sessao curta real com 5 questoes do banco.
              </p>
            </>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimo resultado</p>
          {home.lastSession ? (
            <>
              <p className="mt-3 text-xl font-bold">{home.lastSession.discipline}</p>
              <p className="mt-2 text-sm text-slate-600">
                Precisao de {Math.round(home.lastSession.accuracy * 100)}% na ultima sessao.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-xl font-bold">Ainda sem sessao concluida</p>
              <p className="mt-2 text-sm text-slate-600">
                Assim que voce finalizar a primeira sessao, o resultado aparece aqui.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const MvpAppShell: React.FC<MvpAppShellProps> = ({ onLogout }) => {
  const [loadingLabel, setLoadingLabel] = React.useState('Buscando seu estado atual...');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = React.useState(false);
  const [isStartingStudy, setIsStartingStudy] = React.useState(false);
  const [isAnsweringStudy, setIsAnsweringStudy] = React.useState(false);
  const [isFinishingStudy, setIsFinishingStudy] = React.useState(false);
  const [profile, setProfile] = React.useState<MvpProfile>(defaultProfile);
  const [home, setHome] = React.useState<MvpHomePayload | null>(null);
  const [studySession, setStudySession] = React.useState<StudySession | null>(null);
  const [studyResult, setStudyResult] = React.useState<StudySessionResult | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = React.useState<number>(Date.now());
  const [userName, setUserName] = React.useState('estudante');
  const [view, setView] = React.useState<'loading' | 'onboarding' | 'home' | 'study' | 'result'>('loading');

  const loadBootstrap = React.useCallback(async () => {
    setError(null);
    setView('loading');
    setStudyResult(null);
    setLoadingLabel('Buscando usuario e onboarding...');

    try {
      const me = await mvpApiService.getMe();
      setUserName(me.user.name);

      if (!me.onboardingCompleted) {
        const onboarding = await mvpApiService.getOnboarding();
        setProfile(onboarding.profile || defaultProfile);
        setView('onboarding');
        return;
      }

      setLoadingLabel('Carregando recomendacao e home...');
      const persistedSessionId = getStudySessionIdFromUrl();

      if (persistedSessionId) {
        try {
          const resumedSession = await mvpStudySessionsService.getSession(persistedSessionId);
          if (resumedSession.status === 'active') {
            setStudySession(resumedSession);
            setQuestionStartedAt(Date.now());
            setView('study');
            return;
          }

          setStudySession(null);
          setStudySessionIdInUrl(null);
        } catch {
          setStudySession(null);
          setStudySessionIdInUrl(null);
        }
      }

      await mvpApiService.getCurrentRecommendation();
      const homePayload = await mvpApiService.getHome();
      setHome(homePayload);
      setView('home');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o fluxo do MVP.');
    }
  }, []);

  React.useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const handleSubmitOnboarding = React.useCallback(async (nextProfile: MvpProfile) => {
    setIsSubmittingOnboarding(true);
    setError(null);

    try {
      const response = await mvpApiService.saveOnboarding(nextProfile);
      setProfile(response.profile);
      toast.success('Onboarding salvo. Missao do dia liberada.');
      const homePayload = await mvpApiService.getHome();
      setHome(homePayload);
      setView('home');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar onboarding.');
    } finally {
      setIsSubmittingOnboarding(false);
    }
  }, []);

  React.useEffect(() => {
    if (view !== 'study' || !studySession) {
      return;
    }

    const nextQuestion = studySession.questions.find((question) => !studySession.answers[question.id]);
    if (nextQuestion) {
      setQuestionStartedAt(Date.now());
    }
  }, [studySession, view]);

  const handleStartStudy = React.useCallback(async () => {
    setIsStartingStudy(true);

    try {
      const session = await mvpStudySessionsService.createSession(5);
      setStudySession(session);
      setStudyResult(null);
      setStudySessionIdInUrl(session.sessionId);
      setQuestionStartedAt(Date.now());
      setView('study');
      toast.success(session.answeredQuestions > 0 ? 'Sessao retomada.' : 'Sessao de estudo iniciada.');
    } catch (startError) {
      toast.error(startError instanceof Error ? startError.message : 'Falha ao iniciar sessao.');
    } finally {
      setIsStartingStudy(false);
    }
  }, []);

  const handleAnswerQuestion = React.useCallback(async (questionId: string, alternativeId: string) => {
    if (!studySession) {
      return;
    }

    setIsAnsweringStudy(true);

    try {
      const responseTimeSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
      const updatedSession = await mvpStudySessionsService.answerQuestion(studySession.sessionId, {
        questionId,
        alternativeId,
        responseTimeSeconds,
      });

      setStudySession(updatedSession);
      toast.success('Resposta registrada.');
    } catch (answerError) {
      toast.error(answerError instanceof Error ? answerError.message : 'Falha ao registrar resposta.');
    } finally {
      setIsAnsweringStudy(false);
    }
  }, [questionStartedAt, studySession]);

  const handleFinishStudy = React.useCallback(async () => {
    if (!studySession) {
      return;
    }

    setIsFinishingStudy(true);

    try {
      const result = await mvpStudySessionsService.finishSession(studySession.sessionId);
      setStudyResult(result);
      setStudySession(null);
      setStudySessionIdInUrl(null);

      try {
        const homePayload = await mvpApiService.getHome();
        setHome(homePayload);
      } catch {
        // A tela de resultado continua disponivel mesmo se a Home atrasar.
      }

      setView('result');
      toast.success('Sessao finalizada. Home atualizada.');
    } catch (finishError) {
      toast.error(finishError instanceof Error ? finishError.message : 'Falha ao finalizar sessao.');
    } finally {
      setIsFinishingStudy(false);
    }
  }, [studySession]);

  const handleBackHome = React.useCallback(async () => {
    await loadBootstrap();
  }, [loadBootstrap]);

  if (error) {
    return <ErrorCard message={error} onRetry={() => void loadBootstrap()} />;
  }

  if (view === 'loading' || (view === 'home' && !home) || (view === 'study' && !studySession) || (view === 'result' && !studyResult)) {
    return <LoadingCard label={loadingLabel} />;
  }

  if (view === 'onboarding') {
    return (
      <OnboardingCard
        initialProfile={profile}
        userName={userName}
        onSubmit={handleSubmitOnboarding}
        submitting={isSubmittingOnboarding}
      />
    );
  }

  if (view === 'study' && studySession) {
    return (
      <StudySessionPage
        session={studySession}
        answering={isAnsweringStudy}
        finishing={isFinishingStudy}
        onAnswer={handleAnswerQuestion}
        onFinish={handleFinishStudy}
      />
    );
  }

  if (view === 'result' && studyResult) {
    return <StudySessionResultView result={studyResult} onBackHome={handleBackHome} />;
  }

  return (
    <HomeCard
      home={home!}
      onReload={loadBootstrap}
      onStartStudy={handleStartStudy}
      startingStudy={isStartingStudy}
      onLogout={onLogout}
    />
  );
};
