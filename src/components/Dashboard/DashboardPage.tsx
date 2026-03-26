import React from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Clock3, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { ACADEMY_CONTENT } from '../../data/academyContent';
import type { AdvancedHealthState, BeginnerMission, BeginnerPlan, BeginnerProgressStage, BeginnerState, MateriaTipo, StudySession } from '../../types';
import { getCycleDisciplineLabels } from '../../utils/disciplineLabels';
import { buildWeeklyRetentionSnapshot } from '../../utils/weeklyRetention';
import { StudyFocusPanel } from './StudyFocusPanel';
import { analytics, trackEvent } from '../../utils/analytics';
import type { StudyMode } from '../../hooks/useStudyMode';
import { useEffectivePhase, type ProductPhase, type ProductPhaseOverride } from '../../hooks/useEffectivePhase';
import { useTrackImpressionInViewOnce } from '../../hooks/useTrackImpressionInViewOnce';
import type { HeroVariant } from '../../lib/ab';
import { BeginnerMissionCard } from '../Beginner/BeginnerMissionCard';
import { advancedProgressService } from '../../services/advancedProgress.service';
import { AdvancedDashboardHome } from './AdvancedDashboardHome';
import type { AdvancedTodayPlan } from './AdvancedDashboardHome';
import {
  mapReasonSummaryToCopy,
  type UserFacingWeeklyProgress,
} from '../../services/prioritizationReason';

type CtaSource = 'hero_cta' | 'next_mission' | 'quick_15' | 'quick_25' | 'quick_50';
type QuickSessionDuration = 15 | 25 | 30 | 50;
type PreferredTrack = 'enem' | 'concursos' | 'hibrido';
type MissionTarget = 'questoes' | 'simulado';
type CtrEntry = { impressions: number; clicks: number; ctr: number };
type CtrMetrics = Record<CtaSource, CtrEntry>;
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
type StudyNowCardState =
  | {
      status: 'loading';
      title?: string;
      description?: string;
    }
  | {
      status: 'error';
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
      secondaryAction?: {
        label: string;
        onAction: () => void;
      };
    }
  | {
      status: 'empty';
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
      supportingText?: string;
    }
  | {
      status: 'ready';
      title: string;
      discipline: string;
      topic: string;
      reason: string;
      estimatedDurationMinutes: number;
      sessionTypeLabel: string;
      ctaLabel: string;
      onAction: () => void;
      busy?: boolean;
      progressLabel?: string;
      weeklyProgress?: UserFacingWeeklyProgress | null;
      supportingText?: string;
      secondaryAction?: {
        label: string;
        onAction: () => void;
      };
    };

type StarterPlanDay = {
  dayLabel: string;
  focus: string;
  tasks: Array<{ discipline: string; topic: string }>;
  footer: string;
  target: MissionTarget;
};

const TRACK_AREA_NAME: Record<PreferredTrack, string> = {
  enem: 'ENEM',
  concursos: 'Concurso',
  hibrido: 'Hibrido',
};
const INTERMEDIATE_PENDING_TOOL_KEY = 'zb_intermediate_pending_tool';
const INTERMEDIATE_OVERLOAD_FLAG_PREFIX = 'zb_intermediate_overload';

const SUBJECT_SEQUENCE_BY_TRACK: Record<PreferredTrack, MateriaTipo[]> = {
  enem: ['Anatomia', 'Fisiologia', 'Farmacologia'],
  concursos: ['Anatomia', 'Fisiologia', 'Farmacologia'],
  hibrido: ['Anatomia', 'Fisiologia', 'Farmacologia'],
};

const STARTER_PLAN_BY_TRACK: Record<PreferredTrack, { focusAreas: string[]; days: StarterPlanDay[] }> = {
  enem: {
    focusAreas: ['Matematica', 'Linguagens', 'Humanas'],
    days: [
      { dayLabel: 'Dia 1', focus: 'Primeiro movimento', tasks: [{ discipline: 'Matematica', topic: 'Porcentagem' }, { discipline: 'Linguagens', topic: 'Interpretacao de texto' }, { discipline: 'Humanas', topic: 'Brasil Colonia' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 2', focus: 'Ganho de ritmo', tasks: [{ discipline: 'Matematica', topic: 'Regra de 3' }, { discipline: 'Linguagens', topic: 'Figuras de linguagem' }, { discipline: 'Humanas', topic: 'Brasil Imperio' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 3', focus: 'Base de resolucao', tasks: [{ discipline: 'Matematica', topic: 'Equacao de 1 grau' }, { discipline: 'Linguagens', topic: 'Classes gramaticais' }, { discipline: 'Humanas', topic: 'Republica Velha' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 4', focus: 'Consistencia', tasks: [{ discipline: 'Matematica', topic: 'Fracoes' }, { discipline: 'Linguagens', topic: 'Concordancia' }, { discipline: 'Humanas', topic: 'Era Vargas' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 5', focus: 'Ajuste fino', tasks: [{ discipline: 'Matematica', topic: 'Razao e proporcao' }, { discipline: 'Linguagens', topic: 'Coesao e coerencia' }, { discipline: 'Humanas', topic: 'Ditadura militar' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 6', focus: 'Revisao guiada', tasks: [{ discipline: 'Matematica', topic: 'Erros da semana' }, { discipline: 'Linguagens', topic: 'Erros da semana' }, { discipline: 'Humanas', topic: 'Erros da semana' }], footer: '20 questoes misturadas', target: 'questoes' },
      { dayLabel: 'Dia 7', focus: 'Simulado leve', tasks: [{ discipline: 'Matematica', topic: 'Bloco misto' }, { discipline: 'Linguagens', topic: 'Bloco misto' }, { discipline: 'Humanas', topic: 'Bloco misto' }], footer: '30 questoes', target: 'simulado' },
    ],
  },
  concursos: {
    focusAreas: ['Portugues', 'Raciocinio Logico', 'Dir. Constitucional'],
    days: [
      { dayLabel: 'Dia 1', focus: 'Nucleo do edital', tasks: [{ discipline: 'Portugues', topic: 'Interpretacao de texto' }, { discipline: 'Raciocinio Logico', topic: 'Proposicoes' }, { discipline: 'Direito Constitucional', topic: 'Principios fundamentais' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 2', focus: 'Base para pontuar', tasks: [{ discipline: 'Portugues', topic: 'Classes gramaticais' }, { discipline: 'Raciocinio Logico', topic: 'Conectivos logicos' }, { discipline: 'Direito Constitucional', topic: 'Direitos fundamentais' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 3', focus: 'Leitura de banca', tasks: [{ discipline: 'Portugues', topic: 'Concordancia' }, { discipline: 'Raciocinio Logico', topic: 'Negacoes' }, { discipline: 'Direito Constitucional', topic: 'Organizacao do Estado' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 4', focus: 'Rotina objetiva', tasks: [{ discipline: 'Portugues', topic: 'Pontuacao' }, { discipline: 'Raciocinio Logico', topic: 'Tabelas verdade' }, { discipline: 'Direito Constitucional', topic: 'Poderes da Uniao' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 5', focus: 'Fixacao', tasks: [{ discipline: 'Portugues', topic: 'Crase' }, { discipline: 'Raciocinio Logico', topic: 'Analise combinatoria basica' }, { discipline: 'Direito Constitucional', topic: 'Controle de constitucionalidade' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 6', focus: 'Revisao de banca', tasks: [{ discipline: 'Portugues', topic: 'Erros da semana' }, { discipline: 'Raciocinio Logico', topic: 'Erros da semana' }, { discipline: 'Direito Constitucional', topic: 'Erros da semana' }], footer: '20 questoes da banca', target: 'questoes' },
      { dayLabel: 'Dia 7', focus: 'Mini simulado', tasks: [{ discipline: 'Portugues', topic: 'Bloco misto' }, { discipline: 'Raciocinio Logico', topic: 'Bloco misto' }, { discipline: 'Direito Constitucional', topic: 'Bloco misto' }], footer: '30 questoes', target: 'simulado' },
    ],
  },
  hibrido: {
    focusAreas: ['Matematica', 'Portugues', 'Humanas'],
    days: [
      { dayLabel: 'Dia 1', focus: 'Partida hibrida', tasks: [{ discipline: 'Matematica', topic: 'Porcentagem' }, { discipline: 'Portugues', topic: 'Interpretacao de texto' }, { discipline: 'Humanas', topic: 'Brasil Colonia' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 2', focus: 'Alternancia', tasks: [{ discipline: 'Natureza', topic: 'Leitura de graficos' }, { discipline: 'Raciocinio Logico', topic: 'Proposicoes' }, { discipline: 'Portugues', topic: 'Classes gramaticais' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 3', focus: 'Base comum', tasks: [{ discipline: 'Humanas', topic: 'Republica Velha' }, { discipline: 'Direito Constitucional', topic: 'Principios fundamentais' }, { discipline: 'Matematica', topic: 'Regra de 3' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 4', focus: 'Consistencia', tasks: [{ discipline: 'Portugues', topic: 'Concordancia' }, { discipline: 'Natureza', topic: 'Energia e cotidiano' }, { discipline: 'Raciocinio Logico', topic: 'Conectivos logicos' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 5', focus: 'Ajuste de lacunas', tasks: [{ discipline: 'Matematica', topic: 'Fracoes' }, { discipline: 'Humanas', topic: 'Era Vargas' }, { discipline: 'Direito Constitucional', topic: 'Direitos fundamentais' }], footer: '25 min + 10 questoes + 5 min revisao', target: 'questoes' },
      { dayLabel: 'Dia 6', focus: 'Revisao mista', tasks: [{ discipline: 'Matematica', topic: 'Erros da semana' }, { discipline: 'Portugues', topic: 'Erros da semana' }, { discipline: 'Direito Constitucional', topic: 'Erros da semana' }], footer: '20 questoes misturadas', target: 'questoes' },
      { dayLabel: 'Dia 7', focus: 'Simulado combinado', tasks: [{ discipline: 'Matematica', topic: 'Bloco misto' }, { discipline: 'Portugues', topic: 'Bloco misto' }, { discipline: 'Humanas', topic: 'Bloco misto' }], footer: '30 questoes', target: 'simulado' },
    ],
  },
};

interface DashboardPageProps {
  userName?: string;
  totalPoints: number;
  level: number;
  heroVariant: HeroVariant;
  todayMinutes: number;
  dailyGoalMinutes?: number;
  completedContentIds: string[];
  currentStreak?: number;
  sessions?: StudySession[];
  supabaseUserId?: string | null;
  beginnerState?: BeginnerState | null;
  beginnerPlan?: BeginnerPlan | null;
  beginnerProgressStage?: BeginnerProgressStage;
  beginnerPromotedAt?: string | null;
  phaseOverride?: ProductPhaseOverride;
  showIntermediateUnlockBanner?: boolean;
  preferredTrack?: PreferredTrack;
  studyMode?: StudyMode;
  onContinueNow: () => void;
  onDismissIntermediateUnlockBanner?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenTopicQuestions?: (payload: {
    areaName: string;
    disciplineName: string;
    topicName: string;
    target?: MissionTarget;
  }) => void;
  onStartQuickSession?: (duration: QuickSessionDuration, source: CtaSource, variant?: HeroVariant) => void;
  ctrMetrics?: CtrMetrics;
  heroAbMetrics?: HeroAbMetrics;
  onRecalculateAI?: () => void;
  onOpenRanks?: () => void;
  officialStudyCard?: StudyNowCardState;
}

const StudyNowCard: React.FC<{ card: StudyNowCardState }> = ({ card }) => {
  if (card.status === 'loading') {
    return (
      <section
        data-testid="study-now-card"
        data-card-status="loading"
        className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm"
      >
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Para estudar agora
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{card.title || 'Carregando seu proximo estudo'}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {card.description || 'Buscando o foco atual, o motivo da recomendacao e a melhor proxima acao.'}
        </p>
      </section>
    );
  }

  if (card.status === 'error') {
    return (
      <section
        data-testid="study-now-card"
        data-card-status="error"
        className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-sm"
      >
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
          <AlertTriangle className="h-4 w-4" />
          Para estudar agora
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{card.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{card.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={card.onAction}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            {card.actionLabel}
          </button>
          {card.secondaryAction ? (
            <button
              type="button"
              onClick={card.secondaryAction.onAction}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              {card.secondaryAction.label}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (card.status === 'empty') {
    return (
      <section
        data-testid="study-now-card"
        data-card-status="empty"
        className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm"
      >
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          <Sparkles className="h-4 w-4" />
          Para estudar agora
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{card.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{card.description}</p>
        {card.supportingText ? (
          <p className="mt-2 text-sm font-medium text-amber-900/80">{card.supportingText}</p>
        ) : null}
        <button
          type="button"
          onClick={card.onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <ArrowRight className="h-4 w-4" />
          {card.actionLabel}
        </button>
      </section>
    );
  }

  const reasonCopy = mapReasonSummaryToCopy(card.reason);

  return (
    <section
      data-testid="study-now-card"
      data-card-status="ready"
      data-study-discipline={card.discipline}
      data-study-topic={card.topic}
      className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            <BookOpen className="h-4 w-4" />
            Para estudar agora
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{card.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {card.discipline} • {card.topic}
          </p>
          <p data-testid="study-now-card-reason" className="mt-3 text-sm font-medium text-slate-800">{reasonCopy}</p>
          {card.supportingText ? (
            <p className="mt-2 text-sm font-medium text-blue-900/75">{card.supportingText}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800">
              <Clock3 className="h-3.5 w-3.5" />
              {card.estimatedDurationMinutes} min estimados
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {card.sessionTypeLabel}
            </span>
            {card.progressLabel ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {card.progressLabel}
              </span>
            ) : null}
          </div>
          {card.weeklyProgress ? (
            <div data-testid="study-now-card-weekly-progress" className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Progresso semanal
                </p>
                <p className="text-sm font-semibold text-slate-700">{card.weeklyProgress.label}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  data-testid="study-now-card-weekly-progress-bar"
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${Math.max(4, Math.round(card.weeklyProgress.ratio * 100))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[240px]">
          <button
            type="button"
            disabled={Boolean(card.busy)}
            onClick={card.onAction}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {card.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {card.ctaLabel}
          </button>
          {card.secondaryAction ? (
            <button
              type="button"
              onClick={card.secondaryAction.onAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" />
              {card.secondaryAction.label}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const DashboardPage: React.FC<DashboardPageProps> = ({
  userName,
  totalPoints,
  heroVariant,
  todayMinutes,
  dailyGoalMinutes = 90,
  completedContentIds,
  currentStreak = 0,
  sessions = [],
  beginnerState,
  beginnerPlan,
  beginnerProgressStage,
  beginnerPromotedAt,
  phaseOverride = null,
  showIntermediateUnlockBanner = false,
  preferredTrack = 'enem',
  studyMode = 'exploration',
  onContinueNow,
  onDismissIntermediateUnlockBanner,
  onNavigate,
  onOpenTopicQuestions,
  onStartQuickSession,
  onRecalculateAI,
  onOpenRanks,
  officialStudyCard,
}) => {
  const isFocused = studyMode === 'focus';
  const isReadyForIntermediate = beginnerProgressStage === 'ready_for_intermediate';
  const cycleLabels = React.useMemo(() => getCycleDisciplineLabels(preferredTrack), [preferredTrack]);
  const starterPlan = React.useMemo(() => {
    if (!beginnerPlan) {
      return STARTER_PLAN_BY_TRACK[preferredTrack];
    }

    return {
      focusAreas: beginnerPlan.focusAreas,
      days: beginnerPlan.missions.map((mission) => ({
        dayLabel: mission.dayLabel,
        focus: mission.focus,
        tasks: mission.tasks,
        footer:
          mission.reviewMinutes > 0
            ? `${mission.studyMinutes} min + ${mission.questionCount} questoes + ${mission.reviewMinutes} min revisao`
            : `${mission.studyMinutes} min + ${mission.questionCount} questoes`,
        target: mission.target,
      })),
    };
  }, [beginnerPlan, preferredTrack]);

  const nextContentInfo = React.useMemo(() => {
    const content = ACADEMY_CONTENT.find((item) => !item.isPremium && !completedContentIds.includes(item.id));
    if (!content) return null;
    return content;
  }, [completedContentIds]);

  const weeklyRetention = React.useMemo(() => buildWeeklyRetentionSnapshot(sessions, 4), [sessions]);
  const weeklyProgressPercent = Math.min(100, Math.round((weeklyRetention.studiedDays / weeklyRetention.targetDays) * 100));
  const intermediateSnapshot = React.useMemo(
    () => analytics.getIntermediateSnapshot(),
    [beginnerProgressStage, currentStreak, sessions.length, todayMinutes],
  );
  const advancedSnapshot = React.useMemo(
    () => analytics.getAdvancedSnapshot(),
    [beginnerProgressStage, currentStreak, sessions.length, todayMinutes],
  );
  const advancedPriorityTable = React.useMemo(
    () => analytics.getAdvancedPriorityTable(),
    [beginnerProgressStage, currentStreak, sessions.length, todayMinutes],
  );
  const advancedOperation = React.useMemo(
    () => analytics.getAdvancedOperationSnapshot(),
    [beginnerProgressStage, currentStreak, sessions.length, todayMinutes],
  );
  const advancedScorecard = React.useMemo(
    () => analytics.getAdvancedWeeklyScorecard(),
    [beginnerProgressStage, currentStreak, sessions.length, todayMinutes],
  );
  const weeksInIntermediate = React.useMemo(() => {
    if (!beginnerPromotedAt) {
      return 0;
    }

    const promotedAtTime = new Date(beginnerPromotedAt).getTime();
    if (Number.isNaN(promotedAtTime)) {
      return 0;
    }

    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return Math.max(1, Math.floor((Date.now() - promotedAtTime) / weekMs) + 1);
  }, [beginnerPromotedAt]);
  const intermediateChoiceAbandonmentRate = React.useMemo(
    () =>
      intermediateSnapshot.counts.homeViewed > 0
        ? intermediateSnapshot.counts.choiceAbandoned / intermediateSnapshot.counts.homeViewed
        : null,
    [intermediateSnapshot.counts.choiceAbandoned, intermediateSnapshot.counts.homeViewed],
  );
  const intermediateManualChoiceWithoutExecutionRate = React.useMemo(
    () =>
      intermediateSnapshot.counts.manualChoiceMade > 0
        ? Math.max(
            intermediateSnapshot.counts.manualChoiceMade - intermediateSnapshot.counts.dayPlanCompleted,
            0,
          ) / intermediateSnapshot.counts.manualChoiceMade
        : null,
    [intermediateSnapshot.counts.dayPlanCompleted, intermediateSnapshot.counts.manualChoiceMade],
  );
  const weeklyConsistencyRate = React.useMemo(
    () =>
      weeklyRetention.targetDays > 0
        ? weeklyRetention.studiedDays / weeklyRetention.targetDays
        : null,
    [weeklyRetention.studiedDays, weeklyRetention.targetDays],
  );
  const detectedAdvancedMode = React.useMemo(
    () =>
      beginnerProgressStage === 'ready_for_intermediate' &&
      advancedProgressService.shouldPromoteToAdvanced({
        weeksInIntermediate,
        completedDayPlansCount: intermediateSnapshot.counts.dayPlanCompleted,
        dayPlanCompletionRate: intermediateSnapshot.conversion.dayPlanCompletionRate,
        weeklyConsistencyRate,
        nextDayReturnRate: intermediateSnapshot.conversion.nextDayReturnRate,
        recommendedToolUsageRate: intermediateSnapshot.conversion.recommendedToolUsageRate,
        toolBounceRate: intermediateSnapshot.conversion.toolBounceRate,
        choiceAbandonmentRate: intermediateChoiceAbandonmentRate,
        manualChoiceWithoutExecutionRate: intermediateManualChoiceWithoutExecutionRate,
        overloadSignalCount: intermediateSnapshot.counts.overloadSignal,
      }),
    [
      beginnerProgressStage,
      intermediateChoiceAbandonmentRate,
      intermediateManualChoiceWithoutExecutionRate,
      intermediateSnapshot.conversion.dayPlanCompletionRate,
      intermediateSnapshot.conversion.nextDayReturnRate,
      intermediateSnapshot.conversion.recommendedToolUsageRate,
      intermediateSnapshot.conversion.toolBounceRate,
      intermediateSnapshot.counts.dayPlanCompleted,
      intermediateSnapshot.counts.overloadSignal,
      weeklyConsistencyRate,
      weeksInIntermediate,
    ],
  );
  const detectedPhase = React.useMemo<ProductPhase>(
    () => (detectedAdvancedMode ? 'advanced' : isReadyForIntermediate ? 'intermediate' : 'beginner'),
    [detectedAdvancedMode, isReadyForIntermediate],
  );
  const { effectivePhase, isOverridden } = useEffectivePhase(detectedPhase, phaseOverride);
  const advancedHealthState = React.useMemo<AdvancedHealthState>(
    () => advancedProgressService.evaluateAdvancedState(advancedSnapshot),
    [advancedSnapshot],
  );
  const isAdvancedMode = effectivePhase === 'advanced';
  const isIntermediateMode = effectivePhase === 'intermediate';
  const isStarterMode = effectivePhase === 'beginner';

  const weakAreas = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recentSubjects = new Set(sessions.filter((session) => new Date(session.date) >= cutoff).map((session) => session.subject));
    return SUBJECT_SEQUENCE_BY_TRACK[preferredTrack].filter((subject) => !recentSubjects.has(subject)).slice(0, 3);
  }, [preferredTrack, sessions]);

  const focusToday = weakAreas.map((area) => cycleLabels[area]?.label ?? area);
  const todayMission = React.useMemo<BeginnerMission>(() => {
    if (beginnerPlan?.missions?.length) {
      return (
        beginnerPlan.missions.find((mission) => mission.status === 'ready') ??
        beginnerPlan.missions[beginnerPlan.missions.length - 1]
      );
    }

    const firstDay = starterPlan.days[0];
    return {
      id: 'starter-day-1',
      dayNumber: 1,
      dayLabel: firstDay?.dayLabel || 'Dia 1',
      focus: firstDay?.focus || 'Primeiro passo',
      tasks: firstDay?.tasks || [],
      studyMinutes: 25,
      questionCount: 10,
      reviewMinutes: 5,
      target: firstDay?.target || 'questoes',
      status: 'ready',
      completedAt: null,
    };
  }, [beginnerPlan, starterPlan]);
  const completedMissionCount = React.useMemo(
    () => beginnerPlan?.missions.filter((mission) => mission.status === 'completed').length ?? 0,
    [beginnerPlan],
  );
  const totalMissionCount = beginnerPlan?.missions.length ?? starterPlan.days.length;
  const todayPlanDay = React.useMemo(
    () => starterPlan.days[Math.max(0, todayMission.dayNumber - 1)] || starterPlan.days[0],
    [starterPlan.days, todayMission.dayNumber],
  );

  const currentDiscipline = React.useMemo(() => {
    if (sessions.length === 0) return undefined;
    const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const raw = sorted[0]?.subject as MateriaTipo | undefined;
    if (!raw) return undefined;
    return cycleLabels[raw]?.label ?? raw;
  }, [cycleLabels, sessions]);
  const intermediateInteractionMadeRef = React.useRef(false);
  const intermediateViewedAtRef = React.useRef<number | null>(null);

  const trackIntermediateEvent = React.useCallback(
    (name: Parameters<typeof analytics.trackIntermediateEvent>[0], payload?: Record<string, unknown>) => {
      if (isOverridden) {
        return;
      }

      trackEvent(name, {
        day: todayMission.dayNumber,
        track: preferredTrack,
        ...payload,
      });
    },
    [isOverridden, preferredTrack, todayMission.dayNumber],
  );
  const trackAdvancedEvent = React.useCallback(
    (name: Parameters<typeof analytics.trackAdvancedEvent>[0], payload?: Record<string, unknown>) => {
      if (isOverridden) {
        return;
      }

      trackEvent(name, {
        day: todayMission.dayNumber,
        track: preferredTrack,
        ...payload,
      });
    },
    [isOverridden, preferredTrack, todayMission.dayNumber],
  );

  const markIntermediateInteraction = React.useCallback(() => {
    intermediateInteractionMadeRef.current = true;
  }, []);

  const persistPendingIntermediateTool = React.useCallback((tool: string, source: string) => {
    try {
      sessionStorage.setItem(
        INTERMEDIATE_PENDING_TOOL_KEY,
        JSON.stringify({
          tool,
          source,
          openedAt: Date.now(),
          day: todayMission.dayNumber,
        }),
      );
    } catch {
      // ignore session storage failures
    }
  }, [todayMission.dayNumber]);

  const triggerQuick = React.useCallback((duration: QuickSessionDuration, source: CtaSource, variant?: HeroVariant) => {
    if (onStartQuickSession) {
      onStartQuickSession(duration, source, variant);
      return;
    }
    onContinueNow();
  }, [onContinueNow, onStartQuickSession]);

  const openStarterMission = React.useCallback((day: StarterPlanDay) => {
    const firstTask = day.tasks[0];
    if (onOpenTopicQuestions && firstTask) {
      onOpenTopicQuestions({
        areaName: TRACK_AREA_NAME[preferredTrack],
        disciplineName: firstTask.discipline,
        topicName: firstTask.topic,
        target: day.target,
      });
      return;
    }
    onNavigate?.(day.target === 'simulado' ? 'simulado' : 'questoes');
  }, [onNavigate, onOpenTopicQuestions, preferredTrack]);

  const resolveQuickDuration = React.useCallback((minutes: number): QuickSessionDuration => {
    if (minutes <= 15) return 15;
    if (minutes <= 25) return 25;
    if (minutes <= 30) return 30;
    return 50;
  }, []);

  React.useEffect(() => {
    if (!isIntermediateMode || isOverridden) {
      return;
    }

    intermediateInteractionMadeRef.current = false;
    intermediateViewedAtRef.current = Date.now();
    trackIntermediateEvent('intermediate_home_viewed', {
      focusAreas: starterPlan.focusAreas,
    });

    try {
      const rawPendingTool = sessionStorage.getItem(INTERMEDIATE_PENDING_TOOL_KEY);
      if (rawPendingTool) {
        const pendingTool = JSON.parse(rawPendingTool) as { tool?: string; source?: string; openedAt?: number; day?: number };
        if (pendingTool.openedAt && Date.now() - pendingTool.openedAt <= 120000) {
          trackIntermediateEvent('intermediate_tool_bounced', {
            tool: pendingTool.tool || 'unknown',
            source: pendingTool.source || 'unknown',
            openedDay: pendingTool.day || todayMission.dayNumber,
          });
        }
        sessionStorage.removeItem(INTERMEDIATE_PENDING_TOOL_KEY);
      }
    } catch {
      // ignore session storage failures
    }

    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const overloadFlagKey = `${INTERMEDIATE_OVERLOAD_FLAG_PREFIX}:${todayKey}`;
      if (sessionStorage.getItem(overloadFlagKey) !== '1') {
        const todayEvents = analytics
          .getEvents()
          .filter((event) => event.timestamp.slice(0, 10) === todayKey);
        const manualChoices = todayEvents.filter((event) => event.name === 'intermediate_manual_choice_made').length;
        const automaticChoices = todayEvents.filter((event) => event.name === 'intermediate_continue_automatic_clicked').length;
        const toolBounces = todayEvents.filter((event) => event.name === 'intermediate_tool_bounced').length;

        if ((manualChoices >= 2 && manualChoices > automaticChoices) || toolBounces >= 2) {
          trackIntermediateEvent('intermediate_overload_signal', {
            manualChoices,
            automaticChoices,
            toolBounces,
          });
          sessionStorage.setItem(overloadFlagKey, '1');
        }
      }
    } catch {
      // ignore session storage failures
    }

    return () => {
      const viewedAt = intermediateViewedAtRef.current;
      if (!viewedAt || intermediateInteractionMadeRef.current) {
        return;
      }

      if (Date.now() - viewedAt >= 8000) {
        trackIntermediateEvent('intermediate_choice_abandoned', {
          source: 'intermediate_home',
        });
      }
    };
  }, [isIntermediateMode, isOverridden, starterPlan.focusAreas, todayMission.dayNumber, trackIntermediateEvent]);

  React.useEffect(() => {
    if (!isAdvancedMode || isOverridden) {
      return;
    }

    trackAdvancedEvent('advanced_home_viewed', {
      healthState: advancedHealthState,
      topKpi: advancedPriorityTable[0]?.kpi || null,
      weeklyConsistencyRate: advancedSnapshot.weeklyConsistencyRate,
      planExecutionRate: advancedSnapshot.planExecutionRate,
    });
  }, [
    advancedHealthState,
    advancedPriorityTable,
    advancedSnapshot.planExecutionRate,
    advancedSnapshot.weeklyConsistencyRate,
    isAdvancedMode,
    isOverridden,
    trackAdvancedEvent,
  ]);

  const intermediateReviewTarget = React.useMemo(
    () => focusToday[0] || todayMission.tasks[1]?.discipline || starterPlan.focusAreas[0] || 'seu ponto mais sensivel',
    [focusToday, starterPlan.focusAreas, todayMission.tasks],
  );

  const intermediateSignal = React.useMemo(() => {
    if (focusToday.length > 0) {
      return `Voce esta ganhando ritmo. Agora vale reforcar ${focusToday[0]} para manter o plano equilibrado.`;
    }

    if (currentDiscipline) {
      return `Seu ritmo recente mostra mais consistencia em ${currentDiscipline}. O proximo passo e sustentar esse ritmo com revisoes curtas e pratica.`;
    }

    return 'Seu plano agora combina foco, revisao e pratica para te dar mais autonomia sem perder direcao.';
  }, [currentDiscipline, focusToday]);

  const handleIntermediateContinueAutomatic = React.useCallback((source: string) => {
    markIntermediateInteraction();
    trackIntermediateEvent('intermediate_continue_automatic_clicked', {
      source,
    });
    triggerQuick(resolveQuickDuration(todayMission.studyMinutes), source === 'plan_block' ? 'next_mission' : 'hero_cta', heroVariant);
  }, [heroVariant, markIntermediateInteraction, resolveQuickDuration, todayMission.studyMinutes, trackIntermediateEvent, triggerQuick]);

  const handleIntermediateAdjustLight = React.useCallback((source: string) => {
    markIntermediateInteraction();
    trackIntermediateEvent('intermediate_adjust_light_clicked', {
      source,
    });
    trackIntermediateEvent('intermediate_manual_choice_made', {
      source,
      choice: 'adjust_light',
    });

    if (onRecalculateAI) {
      onRecalculateAI();
      return;
    }

    onNavigate?.('cronograma');
  }, [markIntermediateInteraction, onNavigate, onRecalculateAI, trackIntermediateEvent]);

  const handleIntermediateMethodOpen = React.useCallback((source: string) => {
    markIntermediateInteraction();
    trackIntermediateEvent('intermediate_method_opened', { source });
    trackIntermediateEvent('intermediate_recommended_tool_used', {
      tool: 'metodos',
      source,
    });
    persistPendingIntermediateTool('metodos', source);
    onNavigate?.('metodos');
  }, [markIntermediateInteraction, onNavigate, persistPendingIntermediateTool, trackIntermediateEvent]);

  const handleIntermediateScheduleOpen = React.useCallback((source: string) => {
    markIntermediateInteraction();
    trackIntermediateEvent('intermediate_schedule_opened', { source });
    trackIntermediateEvent('intermediate_recommended_tool_used', {
      tool: 'cronograma',
      source,
    });
    persistPendingIntermediateTool('cronograma', source);
    onNavigate?.('cronograma');
  }, [markIntermediateInteraction, onNavigate, persistPendingIntermediateTool, trackIntermediateEvent]);

  const handleIntermediateQuestionsOpen = React.useCallback((source: string) => {
    markIntermediateInteraction();
    trackIntermediateEvent('intermediate_questions_opened', { source });
    trackIntermediateEvent('intermediate_recommended_tool_used', {
      tool: todayPlanDay?.target === 'simulado' ? 'simulado' : 'questoes',
      source,
    });
    persistPendingIntermediateTool(todayPlanDay?.target === 'simulado' ? 'simulado' : 'questoes', source);
    openStarterMission(todayPlanDay);
  }, [markIntermediateInteraction, openStarterMission, persistPendingIntermediateTool, todayPlanDay, trackIntermediateEvent]);

  const intermediatePlanBlocks = React.useMemo(
    () => [
      {
        id: 'focus',
        eyebrow: 'Bloco 1',
        title: `${todayMission.tasks[0]?.discipline || starterPlan.focusAreas[0] || 'Foco principal'} • ${todayMission.tasks[0]?.topic || todayMission.focus}`,
        detail: `${todayMission.studyMinutes} min de foco guiado para manter o plano em movimento.`,
        actionLabel: 'Comecar foco',
        onAction: () => handleIntermediateContinueAutomatic('plan_block'),
      },
      {
        id: 'review',
        eyebrow: 'Bloco 2',
        title: `Revisao adaptativa • ${intermediateReviewTarget}`,
        detail: `${todayMission.reviewMinutes || 15} min para consolidar o que ainda pede repeticao leve.`,
        actionLabel: onRecalculateAI ? 'Ajustar leve com IA' : 'Ver cronograma',
        onAction: () => handleIntermediateAdjustLight('plan_block'),
      },
      {
        id: 'questions',
        eyebrow: 'Bloco 3',
        title: `${todayMission.questionCount} questoes aplicadas`,
        detail: 'Pratica guiada para transformar o estudo de hoje em retencao real.',
        actionLabel: todayPlanDay?.target === 'simulado' ? 'Abrir simulado' : 'Abrir questoes',
        onAction: () => handleIntermediateQuestionsOpen('plan_block'),
      },
    ],
    [
      handleIntermediateAdjustLight,
      handleIntermediateContinueAutomatic,
      handleIntermediateQuestionsOpen,
      intermediateReviewTarget,
      onRecalculateAI,
      starterPlan.focusAreas,
      todayMission.focus,
      todayMission.questionCount,
      todayMission.reviewMinutes,
      todayMission.studyMinutes,
      todayMission.tasks,
      todayPlanDay,
    ],
  );

  const intermediateToolCards = React.useMemo(
    () => [
      {
        id: 'metodos',
        title: 'Metodos com recomendacao',
        description: 'Pomodoro e blocos mais longos liberados, com um caminho padrao para nao te soltar cedo demais.',
        cta: 'Explorar metodos',
        onAction: () => handleIntermediateMethodOpen('recommended_card'),
      },
      {
        id: 'cronograma',
        title: 'Cronograma inteligente',
        description: 'Agora voce pode ver sua estrutura do dia sem perder o plano automatico como base.',
        cta: 'Abrir cronograma',
        onAction: () => handleIntermediateScheduleOpen('recommended_card'),
      },
      {
        id: 'questoes',
        title: 'Banco de questoes guiado',
        description: 'Filtros leves e recomendacao padrao para praticar com mais autonomia, sem virar caos.',
        cta: 'Praticar agora',
        onAction: () => handleIntermediateQuestionsOpen('recommended_card'),
      },
    ],
    [handleIntermediateMethodOpen, handleIntermediateQuestionsOpen, handleIntermediateScheduleOpen],
  );
  const advancedTodayPlan = React.useMemo<AdvancedTodayPlan>(
    () => ({
      focusBlock: `${todayMission.studyMinutes} min de foco em ${todayMission.focus}`,
      questionBlock: `${todayMission.questionCount} questoes em ${todayPlanDay?.tasks?.[0]?.discipline || 'bloco prioritario'}`,
      reviewBlock: `${todayMission.reviewMinutes || 15} min revisando ${intermediateReviewTarget}`,
      status:
        todayMinutes === 0
          ? 'nao_iniciado'
          : todayMinutes >= todayMission.studyMinutes + (todayMission.reviewMinutes || 0)
            ? 'concluido'
            : 'em_andamento',
    }),
    [intermediateReviewTarget, todayMinutes, todayMission.focus, todayMission.questionCount, todayMission.reviewMinutes, todayMission.studyMinutes, todayPlanDay?.tasks],
  );
  const advancedRecommendedAdjustment = React.useMemo(
    () => advancedOperation.weeklyDecision?.action || advancedPriorityTable[0]?.recommendedAction || 'Ajuste o plano com base no sinal principal desta semana.',
    [advancedOperation.weeklyDecision, advancedPriorityTable],
  );
  const advancedStrongest = React.useMemo(
    () => currentDiscipline || 'Seu bloco mais consistente nesta fase',
    [currentDiscipline],
  );
  const advancedWeakest = React.useMemo(
    () => focusToday[0] || intermediateReviewTarget,
    [focusToday, intermediateReviewTarget],
  );
  const advancedLastMockLabel = React.useMemo(() => {
    if (advancedSnapshot.mockCompletionRate === null) {
      return 'Nenhum simulado forte o bastante para leitura ainda.';
    }

    return advancedSnapshot.mockCompletionRate >= 60
      ? 'Seu ultimo bloco de simulado sustenta bem a estrategia.'
      : 'Seu bloco de simulado ainda esta pedindo fechamento melhor.';
  }, [advancedSnapshot.mockCompletionRate]);
  const advancedTrendLabel = React.useMemo(
    () => advancedScorecard.summary,
    [advancedScorecard.summary],
  );
  const advancedRecommendations = React.useMemo(() => {
    const topKpi = advancedPriorityTable[0]?.kpi;

    if (topKpi === 'planningWithoutExecutionRate') {
      return [
        { id: 'cronograma' as const, label: 'Cronograma completo', reason: 'Simplifique a semana antes de abrir novos desvios.' },
        { id: 'questoes' as const, label: 'Questoes com filtro', reason: 'Transforme o plano em pratica objetiva hoje.' },
        { id: 'metodos' as const, label: 'Metodos livres', reason: 'Ajuste o metodo so depois de reduzir o excesso de planejamento.' },
      ];
    }

    if (topKpi === 'toolFragmentationRate') {
      return [
        { id: 'questoes' as const, label: 'Questoes com filtro', reason: 'Escolha uma rota principal e reduza trocas entre ferramentas.' },
        { id: 'cronograma' as const, label: 'Cronograma completo', reason: 'Use o plano como ancora para limitar dispersao.' },
        { id: 'metodos' as const, label: 'Metodos livres', reason: 'Mexa no metodo so se ele apoiar a execucao do bloco atual.' },
      ];
    }

    if (topKpi === 'strategicReviewApplyRate') {
      return [
        { id: 'metodos' as const, label: 'Metodos livres', reason: 'Ajuste sua forma de estudar com base na leitura da semana.' },
        { id: 'cronograma' as const, label: 'Cronograma completo', reason: 'Converta a revisao em mudanca real no plano.' },
        { id: 'questoes' as const, label: 'Questoes com filtro', reason: 'Teste rapido para validar o ajuste aplicado.' },
      ];
    }

    return [
      { id: 'cronograma' as const, label: 'Cronograma completo', reason: 'Veja a semana inteira antes de decidir o proximo ajuste.' },
      { id: 'metodos' as const, label: 'Metodos livres', reason: 'Escolha o metodo com base no tipo de bloco, nao por impulso.' },
      { id: 'questoes' as const, label: 'Questoes com filtro', reason: 'Mantenha a estrategia conectada a pratica e verificacao.' },
    ];
  }, [advancedPriorityTable]);
  const handleAdvancedAdjustPlan = React.useCallback(() => {
    trackAdvancedEvent('advanced_plan_adjusted', {
      source: 'weekly_plan',
      healthState: advancedHealthState,
    });
    if (onRecalculateAI) {
      onRecalculateAI();
      return;
    }
    onNavigate?.('cronograma');
  }, [advancedHealthState, onNavigate, onRecalculateAI, trackAdvancedEvent]);
  const handleAdvancedKeepStrategy = React.useCallback(() => {
    onContinueNow();
  }, [onContinueNow]);
  const handleAdvancedExecuteDayPlan = React.useCallback(() => {
    onContinueNow();
  }, [onContinueNow]);
  const handleAdvancedApplyAdjustment = React.useCallback(() => {
    trackAdvancedEvent('advanced_strategy_review_applied', {
      source: 'primary_insight',
      focus: advancedOperation.weeklyDecision?.focus || null,
    });
    if (onRecalculateAI) {
      onRecalculateAI();
      return;
    }
    onNavigate?.('mentor');
  }, [advancedOperation.weeklyDecision?.focus, onNavigate, onRecalculateAI, trackAdvancedEvent]);
  const handleAdvancedStartMock = React.useCallback(() => {
    trackAdvancedEvent('advanced_mock_exam_started', {
      source: 'mock_card',
    });
    onNavigate?.('simulado');
  }, [onNavigate, trackAdvancedEvent]);
  const handleAdvancedReviewPerformance = React.useCallback(() => {
    trackAdvancedEvent('advanced_performance_analysis_opened', {
      source: 'mock_card',
    });
    onNavigate?.('dashboard');
  }, [onNavigate, trackAdvancedEvent]);
  const handleAdvancedOpenTool = React.useCallback((toolId: string) => {
    if (toolId === 'cronograma') {
      trackAdvancedEvent('advanced_manual_schedule_used', { source: 'recommended_tool' });
      onNavigate?.('cronograma');
      return;
    }

    if (toolId === 'questoes') {
      trackAdvancedEvent('advanced_advanced_filters_used', { source: 'recommended_tool' });
      onNavigate?.('questoes');
      return;
    }

    trackAdvancedEvent('advanced_study_strategy_changed', {
      source: 'recommended_tool',
      tool: toolId,
    });
    onNavigate?.('metodos');
  }, [onNavigate, trackAdvancedEvent]);

  const heroRef = useTrackImpressionInViewOnce<HTMLElement>('home:hero_cta', () => {
    trackEvent('home_cta_impression', { source: 'hero_cta', variant: heroVariant, ts: Date.now() });
  });

  const missionRef = useTrackImpressionInViewOnce<HTMLElement>('home:next_mission', () => {
    trackEvent('home_cta_impression', { source: 'next_mission', ts: Date.now() });
    if (isIntermediateMode) {
      trackIntermediateEvent('intermediate_plan_viewed', {
        blockCount: intermediatePlanBlocks.length,
      });
    }
  });

  const quickRef = useTrackImpressionInViewOnce<HTMLElement>('home:quick_group', () => {
    const ts = Date.now();
    trackEvent('home_cta_impression', { source: 'quick_15', ts });
    trackEvent('home_cta_impression', { source: 'quick_25', ts });
    trackEvent('home_cta_impression', { source: 'quick_50', ts });
  });

  if (isAdvancedMode) {
    return (
      <div className={`grid gap-6 ${isFocused ? 'xl:grid-cols-[minmax(0,1fr)_288px]' : ''}`}>
        <div className="space-y-5">
          {officialStudyCard ? <StudyNowCard card={officialStudyCard} /> : null}

          <AdvancedDashboardHome
            snapshot={advancedSnapshot}
            priorityTable={advancedPriorityTable}
            operation={advancedOperation}
            scorecard={advancedScorecard}
            healthState={advancedHealthState}
            todayPlan={advancedTodayPlan}
            strongest={advancedStrongest}
            weakest={advancedWeakest}
            recommendedAdjustment={advancedRecommendedAdjustment}
            lastMockLabel={advancedLastMockLabel}
            trendLabel={advancedTrendLabel}
            recommendations={advancedRecommendations}
            onAdjustPlan={handleAdvancedAdjustPlan}
            onKeepStrategy={handleAdvancedKeepStrategy}
            onExecuteDayPlan={handleAdvancedExecuteDayPlan}
            onApplyAdjustment={handleAdvancedApplyAdjustment}
            onStartMock={handleAdvancedStartMock}
            onReviewPerformance={handleAdvancedReviewPerformance}
            onOpenTool={handleAdvancedOpenTool}
          />

          {!isFocused && onOpenRanks && (
            <div className="flex justify-start">
              <button onClick={onOpenRanks} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                Ver ranking
              </button>
            </div>
          )}
        </div>

        {isFocused && (
          <StudyFocusPanel
            todayMinutes={todayMinutes}
            dailyGoalMinutes={dailyGoalMinutes}
            currentStreak={currentStreak}
            currentDiscipline={currentDiscipline}
            onStartFocus={handleAdvancedExecuteDayPlan}
            studyMode={studyMode}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${isFocused ? 'xl:grid-cols-[minmax(0,1fr)_288px]' : ''}`}>
      <div className="space-y-5">
        {showIntermediateUnlockBanner && beginnerProgressStage === 'ready_for_intermediate' && (
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Novo nivel desbloqueado</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Seu plano agora se adapta melhor ao seu desempenho.</h2>
                <p className="mt-1 text-sm text-slate-600">Metodos, cronograma e ajustes mais inteligentes ja estao liberados para voce explorar no seu ritmo.</p>
              </div>
              <button
                onClick={() => onDismissIntermediateUnlockBanner?.()}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Entendi
              </button>
            </div>
          </section>
        )}

        <section
          ref={heroRef}
          className={`rounded-2xl border p-6 shadow-sm ${
              isStarterMode
                ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50'
                : isIntermediateMode
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50'
                  : 'border-blue-200 bg-gradient-to-br from-blue-50 to-white'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {isStarterMode
                  ? `Vamos dar direcao para o seu comeco, ${userName || 'Estudante'}.`
                  : isIntermediateMode
                    ? `Seu plano do dia esta pronto, ${userName || 'Estudante'}.`
                  : `Bora continuar, ${userName || 'Estudante'}.`}
              </h1>
              <p className={`mt-2 text-sm ${isStarterMode ? 'text-slate-500' : 'text-slate-600'}`}>
                {isStarterMode
                  ? 'Comece simples. O resto o app ajusta.'
                  : isIntermediateMode
                    ? 'Agora voce ja pode seguir no automatico ou fazer ajustes leves sem perder a direcao.'
                  : `Voce esta a ${weeklyRetention.remainingDays} dias de completar sua meta semanal.`}
              </p>
            </div>
            {isIntermediateMode && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                AUTONOMIA GUIADA
              </span>
            )}
            <span className={`${isIntermediateMode ? 'hidden ' : ''}rounded-full px-3 py-1 text-xs font-semibold ${isStarterMode ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {isStarterMode ? 'PRIMEIRA SESSAO' : `HOJE • ${nextContentInfo?.estimatedMinutes || 25} min`}
            </span>
          </div>

          {isStarterMode ? null : (
            <>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${weeklyProgressPercent}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{weeklyProgressPercent}% da meta semanal</p>
            </>
          )}

          <div className="mt-4 rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">
              {isStarterMode ? 'Missao pronta' : isIntermediateMode ? 'Plano do dia' : `Proxima sessao: ${nextContentInfo?.title || 'Revisao estrategica'}`}
            </p>
            {isIntermediateMode && (
              <p className="mt-1 text-sm text-slate-700">
                {todayMission.studyMinutes} min de foco - {todayMission.reviewMinutes || 15} min de revisao - {todayMission.questionCount} questoes
              </p>
            )}
            <p className={`${isIntermediateMode ? 'hidden ' : ''}mt-1 text-sm text-slate-700`}>
              {isStarterMode ? `${todayMission.studyMinutes} min de estudo • ${todayMission.questionCount} questoes${todayMission.reviewMinutes ? ` • ${todayMission.reviewMinutes} min de revisao` : ''}` : `+${nextContentInfo?.xpReward || 40} XP em ${(nextContentInfo?.estimatedMinutes || 25)} min`}
            </p>
            <div className={`mt-3 flex flex-wrap gap-2 ${isStarterMode ? 'hidden' : ''}`}>
              <button
                onClick={() => {
                  if (isIntermediateMode) {
                    handleIntermediateContinueAutomatic('hero');
                    return;
                  }

                  triggerQuick(resolveQuickDuration(todayMission.studyMinutes), 'hero_cta', heroVariant);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${isStarterMode ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isStarterMode ? 'Fazer minha 1 sessao' : isIntermediateMode ? 'Continuar automatico' : 'Comecar agora'}
              </button>
              {isStarterMode && (
                <button
                  onClick={() => openStarterMission(starterPlan.days[Math.max(0, todayMission.dayNumber - 1)] || starterPlan.days[0])}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Abrir 10 questoes
                </button>
              )}
              {isIntermediateMode && (
                <button
                  onClick={() => handleIntermediateAdjustLight('hero')}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ajustar leve
                </button>
              )}
            </div>
          </div>
        </section>

        {officialStudyCard ? <StudyNowCard card={officialStudyCard} /> : null}

        {isStarterMode ? (
          <>
            <section ref={missionRef}>
              <BeginnerMissionCard
                beginnerState={beginnerState}
                mission={todayMission}
                completedCount={completedMissionCount}
                totalCount={totalMissionCount}
                onPrimaryAction={() => {
                  if (beginnerState === 'week_complete') {
                    onNavigate?.('dashboard');
                    return;
                  }

                  triggerQuick(resolveQuickDuration(todayMission.studyMinutes), 'hero_cta', heroVariant);
                }}
                onSecondaryAction={() => openStarterMission(starterPlan.days[Math.max(0, todayMission.dayNumber - 1)] || starterPlan.days[0])}
              />
            </section>

            {beginnerState === 'week_complete' && (
              <section ref={quickRef} className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">Semana concluida</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{completedMissionCount}/{totalMissionCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Missoes completas no modo iniciante.</p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">Proximo passo</p>
                  <p className="mt-3 text-sm text-slate-700">Voce ja pode explorar o dashboard normal, revisoes e historico.</p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">Regra de ouro</p>
                  <p className="mt-3 text-sm text-slate-700">Agora o app ja tem dados reais para orientar melhor seus proximos estudos.</p>
                </div>
              </section>
            )}
          </>
        ) : isIntermediateMode ? (
          <>
            <section ref={missionRef} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Plano adaptativo do dia</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">3 blocos para evoluir com autonomia sem perder o trilho</h3>
                  <p className="mt-1 text-sm text-slate-600">O automatico continua como base. Voce so escolhe onde quer ajustar leve.</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Leitura inteligente</p>
                  <p className="mt-2 text-sm text-slate-700">{intermediateSignal}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {intermediatePlanBlocks.map((block) => (
                  <div key={block.id} className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{block.eyebrow}</p>
                    <h4 className="mt-2 text-base font-bold text-slate-900">{block.title}</h4>
                    <p className="mt-2 text-sm text-slate-600">{block.detail}</p>
                    <button
                      onClick={block.onAction}
                      className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      {block.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 shadow-sm">
                <p className="text-sm font-semibold text-cyan-800">Escolha controlada</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Quer manter o plano automatico ou ajustar?</h3>
                <p className="mt-2 text-sm text-slate-700">O recomendado e continuar no automatico. Use ajuste leve quando quiser reorganizar sem perder a base.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleIntermediateContinueAutomatic('choice_control')}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Continuar automatico
                  </button>
                  <button
                    onClick={() => handleIntermediateAdjustLight('choice_control')}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ajustar leve
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Meta de hoje</p>
                <p className="mt-3 text-sm text-slate-700">{todayMinutes} min de {dailyGoalMinutes} min</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Streak</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{currentStreak} dias</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">XP da semana</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{sessions.reduce((sum, session) => sum + (session.points || 0), 0)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {intermediateToolCards.map((tool) => (
                <div key={tool.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">{tool.title}</p>
                  <p className="mt-3 text-sm text-slate-700">{tool.description}</p>
                  <button
                    onClick={tool.onAction}
                    className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {tool.cta}
                  </button>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            <section ref={missionRef} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Proxima missao</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{nextContentInfo ? `${nextContentInfo.subDepartment} • ${nextContentInfo.title}` : 'Revisao guiada • Questoes mistas'}</h3>
              <p className="mt-1 text-sm text-slate-600">Foco recomendado para manter sua rotina.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => triggerQuick(25, 'next_mission')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Comecar agora</button>
                {onRecalculateAI && (
                  <button onClick={onRecalculateAI} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ajustar com IA</button>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Sequencia semanal</h3>
                <div className="mt-3 grid grid-cols-7 gap-2 text-center">
                  {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((label, index) => {
                    const studied = weeklyRetention.studiedDayIndexes.includes(index);
                    return (
                      <div key={label} className="rounded-lg border bg-white p-2">
                        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                        <p className="mt-1 text-base">{studied ? 'OK' : 'o'}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {weeklyRetention.isMaintained ? 'Sequencia mantida. Continue firme.' : `Faltam ${weeklyRetention.remainingDays} dias para manter sua sequencia.`}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Foco de hoje</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{focusToday.length ? focusToday.join(' + ') : starterPlan.focusAreas.join(' + ')}</p>
                <p className="mt-1 text-xs text-slate-500">Recomendado pela IA</p>
              </div>
            </section>

            <section ref={quickRef} className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Comeco rapido</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => triggerQuick(15, 'quick_15')} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">15 min</button>
                  <button onClick={() => triggerQuick(25, 'quick_25')} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">25 min</button>
                  <button onClick={() => triggerQuick(50, 'quick_50')} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">50 min</button>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">XP da semana</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{sessions.reduce((sum, session) => sum + (session.points || 0), 0)}</p>
                <p className="mt-1 text-xs text-slate-500">Somando todo o historico registrado.</p>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Meta de hoje</p>
                <p className="mt-3 text-sm text-slate-700">{todayMinutes} min de {dailyGoalMinutes} min</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100))}%` }} />
                </div>
              </div>
            </section>
          </>
        )}

        {!isFocused && onOpenRanks && !isStarterMode && (
          <div className="flex justify-start">
            <button onClick={onOpenRanks} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
              Ver ranking
            </button>
          </div>
        )}
      </div>

      {isFocused && (
        <StudyFocusPanel
          todayMinutes={todayMinutes}
          dailyGoalMinutes={dailyGoalMinutes}
          currentStreak={currentStreak}
          currentDiscipline={currentDiscipline}
          onStartFocus={() => triggerQuick(25, 'hero_cta', heroVariant)}
          studyMode={studyMode}
        />
      )}
    </div>
  );
};

export default DashboardPage;
