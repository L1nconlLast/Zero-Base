import React from 'react';

import type { ProfileTrackContext } from '../profile/types';
import { ContextShellPage } from '../studyContext/components/ContextShellPage';
import {
  outrosDashboardService,
  type OutrosDashboardData,
} from '../../services/outrosDashboard.service';
import { OutrosActivationPanel } from './components/OutrosActivationPanel';
import { OutrosOverviewAlerts } from './components/OutrosOverviewAlerts';
import { OutrosOverviewHero } from './components/OutrosOverviewHero';
import { OutrosOverviewNextAction } from './components/OutrosOverviewNextAction';
import { OutrosOverviewPlanState } from './components/OutrosOverviewPlanState';
import { OutrosOverviewWeeklyRhythm } from './components/OutrosOverviewWeeklyRhythm';

export interface OutrosShellProps {
  darkMode?: boolean;
  activeTab: string;
  userId?: string | null;
  profileContext: ProfileTrackContext | null;
  homeSlot: React.ReactNode;
  profileSlot: React.ReactNode;
  onNavigate: (tabId: string) => void;
  onReviewContext: () => void;
}

const OUTROS_FOCUS_LABELS = {
  aprender: 'Aprender do zero',
  praticar: 'Pratica guiada',
  rotina: 'Criar rotina',
  evoluir_tema: 'Aprofundar no tema',
} as const;

const GOAL_TYPE_LABELS = {
  aprender_do_zero: 'Aprender do zero',
  praticar: 'Praticar',
  rotina: 'Criar rotina',
  aprofundar: 'Aprofundar',
} as const;

const RHYTHM_LABELS = {
  leve: 'Ritmo leve',
  moderado: 'Ritmo moderado',
  intenso: 'Ritmo intenso',
} as const;

const PACE_STATUS_LABELS = {
  abaixo: 'Abaixo do esperado',
  estavel: 'Ritmo estavel',
  acima: 'Acima do alvo',
} as const;

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const resolveOutrosFocusLabel = (focus?: string | null): string => {
  if (!focus || !(focus in OUTROS_FOCUS_LABELS)) {
    return 'Tema livre ativo';
  }

  return OUTROS_FOCUS_LABELS[focus as keyof typeof OUTROS_FOCUS_LABELS];
};

const formatDateLabel = (value?: string | null): string => {
  if (!value) {
    return 'Sem data';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data';
  }

  return DATE_FORMATTER.format(parsed);
};

const formatMinutesLabel = (value: number): string => `${value || 0} min`;

const formatSignedPercent = (value: number): string => {
  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
};

const getBarWidth = (value: number, maxValue: number): string => {
  if (maxValue <= 0) {
    return '8%';
  }

  return `${Math.max(8, Math.round((value / maxValue) * 100))}%`;
};

const getDaysSince = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  const diff = today.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
};

const OverviewCommandCard: React.FC<{
  darkMode: boolean;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  featured?: boolean;
  cardId: string;
}> = ({ darkMode, title, description, badge, children, featured = false, cardId }) => (
  <article
    data-outros-command-card={cardId}
    className={`rounded-[26px] border p-5 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.16)] ${
      featured
        ? darkMode
          ? 'border-cyan-800/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.94),rgba(15,23,42,0.98))]'
          : 'border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(239,246,255,0.96))]'
        : darkMode
          ? 'border-slate-800 bg-slate-950/72'
          : 'border-slate-200/80 bg-white/92'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {title}
        </p>
        <p className={`mt-2 text-sm leading-6 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {description}
        </p>
      </div>
      {badge ? (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          darkMode
            ? 'border-slate-700 bg-slate-950 text-slate-300'
            : 'border-slate-200 bg-white text-slate-500'
        }`}>
          {badge}
        </span>
      ) : null}
    </div>
    <div className="mt-4">
      {children}
    </div>
  </article>
);

export const OutrosShell: React.FC<OutrosShellProps> = ({
  darkMode = false,
  activeTab,
  userId,
  profileContext,
  homeSlot,
  profileSlot,
  onNavigate,
  onReviewContext,
}) => {
  const [dashboard, setDashboard] = React.useState<OutrosDashboardData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dashboardStatus = loading ? 'loading' : error ? 'error' : dashboard ? 'ready' : 'empty';

  const loadDashboard = React.useCallback(async () => {
    if (!userId) {
      setDashboard(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await outrosDashboardService.getOutrosDashboardData(userId);
      setDashboard(data);
    } catch (nextError) {
      setDashboard(null);
      setError(nextError instanceof Error ? nextError.message : 'Nao foi possivel carregar o modo livre.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refreshDashboard = React.useCallback(async () => {
    await loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    (
      window as typeof window & {
        __ZB_OUTROS_SHELL_DEBUG__?: Record<string, unknown>;
      }
    ).__ZB_OUTROS_SHELL_DEBUG__ = {
      activeTab,
      dashboardStatus,
      loading,
      error,
      hasDashboard: Boolean(dashboard),
      activeContextId: dashboard?.activeContext?.id || null,
      topicCount: dashboard?.topics.length || 0,
      goalCount: dashboard?.goals.length || 0,
      pathCount: dashboard?.paths.length || 0,
      stepCount: dashboard?.steps.length || 0,
      eventCount: dashboard?.events.length || 0,
      upcomingEventCount: dashboard?.upcomingEvents.length || 0,
      rankSnapshot: dashboard?.rank || null,
      rhythmSnapshot: dashboard?.rhythm || null,
      overviewSnapshot: dashboard?.overview || null,
    };

    return () => {
      delete (
        window as typeof window & {
          __ZB_OUTROS_SHELL_DEBUG__?: Record<string, unknown>;
        }
      ).__ZB_OUTROS_SHELL_DEBUG__;
    };
  }, [activeTab, dashboard, dashboardStatus, error, loading]);

  const renderShell = (content: React.ReactNode) => (
    <div
      data-native-shell="outros"
      data-native-shell-tab={activeTab}
      data-native-shell-status={dashboardStatus}
      data-outros-study-context-id={dashboard?.activeContext?.id || 'none'}
      data-outros-rank-scope={dashboard?.rank.scopeMode || 'outros'}
    >
      {content}
    </div>
  );

  const rank = dashboard?.rank;
  const rhythm = dashboard?.rhythm;
  const overview = dashboard?.overview;
  const topic = dashboard?.profile.mainTopic || profileContext?.outros?.goalTitle || 'Tema principal';
  const focusLabel = resolveOutrosFocusLabel(profileContext?.outros?.focus || dashboard?.profile.goal || null);
  const summaryTitle =
    dashboard?.activeTopic?.name || dashboard?.profile.mainTopic || profileContext?.summaryTitle || topic;
  const summaryDescription =
    dashboard?.activeContext?.description ||
    profileContext?.summaryDescription ||
    'Seu shell livre parte do tema, do objetivo e do ritmo salvo para manter constancia sem ficar pesado.';
  const activeGoalLabel = dashboard?.activeGoal?.goalType
    ? GOAL_TYPE_LABELS[dashboard.activeGoal.goalType]
    : dashboard?.profile.goal || focusLabel;
  const rhythmLabel = dashboard?.profile.rhythm
    ? RHYTHM_LABELS[dashboard.profile.rhythm as keyof typeof RHYTHM_LABELS] || dashboard.profile.rhythm
    : 'Ritmo nao definido';
  const paceStatusLabel = rank ? PACE_STATUS_LABELS[rank.paceStatus] : 'Ritmo estavel';
  const weeklyMinutesLabel = rank ? `${rank.weeklyMinutes}/${rank.weeklyTargetMinutes || 0} min` : '0/0 min';
  const nextReviewLabel = rank?.nextReviewDueAt ? formatDateLabel(rank.nextReviewDueAt) : 'Sem data';
  const rhythmPeakMinutes = Math.max(...(rhythm?.dailyBars.map((item) => item.minutes) || [0]), 0);
  const rhythmDominantFocus = rhythm?.dominantFocus || null;
  const rhythmBestDay = rhythm?.bestDay || null;
  const rhythmAction = rhythm?.nextBestAction || null;
  const stepCounts = {
    total: dashboard?.steps.length || 0,
    completed: (dashboard?.steps || []).filter((step) => step.status === 'concluido').length,
    inProgress: (dashboard?.steps || []).filter((step) => step.status === 'em_andamento').length,
    queued: (dashboard?.steps || []).filter((step) => step.status === 'nao_iniciado').length,
  };
  const errorSection = error
    ? {
        title: 'Falha ao carregar o snapshot',
        description: 'O shell continua operacional, mas a leitura do dominio livre precisa ser atualizada.',
        items: [
          {
            title: 'Erro de carregamento',
            detail: error,
            badge: 'erro',
          },
        ],
      }
    : null;
  const eventItems = (dashboard?.upcomingEvents || []).slice(0, 4).map((event) => ({
    title: event.title,
    detail: `${formatDateLabel(event.startAt)} - ${event.type}`,
    badge: event.type,
  }));
  const handleOverviewNavigate = React.useCallback((tabId: string) => {
    onNavigate(tabId);
  }, [onNavigate]);

  if (activeTab === 'inicio') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Visao geral"
        title={overview?.hero.focusTitle || summaryTitle}
        description={overview?.hero.whyItMatters || summaryDescription}
        stats={[
          {
            label: 'Foco atual',
            value: overview?.hero.focusTitle || dashboard?.activeTopic?.name || topic,
            detail: overview?.hero.focusDetail
              || (dashboard?.activeTopic?.level
                ? `Nivel ${dashboard.activeTopic.level}${dashboard.activeTopic.category ? ` - ${dashboard.activeTopic.category}` : ''}`
                : loading
                  ? 'Carregando tema ativo...'
                  : error || 'Centro da sua experiencia de estudo livre.'),
          },
          {
            label: 'Estagio',
            value: overview?.hero.stageLabel || 'Setup inicial',
            detail: overview?.hero.stageDetail || 'A Visao geral organiza foco, plano e execucao num mesmo lugar.',
          },
          {
            label: 'Ritmo',
            value: rank ? `${rank.streakCurrent} dias` : '0 dias',
            detail: `${weeklyMinutesLabel} - ${paceStatusLabel}`,
          },
          {
            label: 'Revisoes',
            value: String(rank?.pendingReviewsCount || 0),
            detail: rank?.nextReviewDueAt ? `Proxima em ${nextReviewLabel}` : 'Sem revisoes pendentes agora.',
          },
        ]}
        sections={errorSection ? [errorSection] : []}
      >
        {overview ? (
          <div className="space-y-4">
            <OutrosOverviewHero
              darkMode={darkMode}
              data={overview.hero}
            />

            <OutrosOverviewNextAction
              darkMode={darkMode}
              data={overview.nextAction}
              onPrimaryAction={() => handleOverviewNavigate(overview.nextAction.ctaTarget)}
              onSecondaryAction={
                overview.nextAction.secondaryTarget
                  ? () => handleOverviewNavigate(overview.nextAction.secondaryTarget!)
                  : null
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <OutrosOverviewPlanState
                darkMode={darkMode}
                data={overview.planState}
              />
              <OutrosOverviewWeeklyRhythm
                darkMode={darkMode}
                data={overview.weeklyRhythm}
              />
            </div>

            <OutrosOverviewAlerts
              darkMode={darkMode}
              alerts={overview.alerts}
              onAction={handleOverviewNavigate}
            />
          </div>
        ) : null}
      </ContextShellPage>
    );
  }

  if (activeTab === 'departamento') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Meu foco"
        title={dashboard?.activeTopic?.name || topic}
        description="Aqui o modo livre guarda a identidade do estudo: tema, objetivo, contexto salvo e o motivo que sustenta a jornada."
        actions={[
          { label: 'Refinar foco', onClick: onReviewContext },
          { label: 'Abrir plano', onClick: () => onNavigate('arvore'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Tema', value: dashboard?.activeTopic?.name || topic },
          { label: 'Objetivo', value: activeGoalLabel || focusLabel },
          { label: 'Nivel', value: dashboard?.activeTopic?.level || dashboard?.profile.level || 'Nao definido' },
          { label: 'Ritmo desejado', value: rhythmLabel },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Contexto do foco',
            description: 'O shell mostra o que esta sendo construido, por que isso importa e qual intensidade faz sentido agora.',
            items: [
              dashboard?.activeTopic
                ? {
                    title: 'Tema principal',
                    detail: dashboard.activeTopic.category
                      ? `${dashboard.activeTopic.name} - ${dashboard.activeTopic.category}`
                      : dashboard.activeTopic.name,
                    badge: dashboard.activeTopic.status,
                  }
                : {
                    title: 'Tema principal',
                    detail: 'Nenhum tema ativo encontrado no dominio livre.',
                    badge: 'setup',
                  },
              {
                title: 'Motivo do contexto',
                detail: dashboard?.activeContext?.summary || summaryDescription,
                badge: dashboard?.activeContext ? 'contexto' : 'vazio',
              },
              {
                title: 'Ritmo esperado',
                detail: dashboard?.profile.dailyMinutes
                  ? `${dashboard.profile.dailyMinutes} min por dia - ${rhythmLabel}`
                  : rhythmLabel,
                badge: dashboard?.profile.dailyMinutes ? 'meta' : 'ajuste',
              },
            ],
          },
          {
            title: 'Objetivo ativo',
            description: 'Objetivo e continuidade aparecem juntos antes da manutencao do dominio.',
            items: [
              dashboard?.activeGoal
                ? {
                    title: 'Objetivo ativo',
                    detail: dashboard.activeGoal.description || GOAL_TYPE_LABELS[dashboard.activeGoal.goalType],
                    badge: GOAL_TYPE_LABELS[dashboard.activeGoal.goalType],
                  }
                : {
                    title: 'Objetivo ativo',
                    detail: 'Nenhum objetivo ativo encontrado em learning_goals.',
                    badge: 'setup',
                  },
              dashboard?.nextStep
                ? {
                    title: 'Proximo passo ligado ao foco',
                    detail: dashboard.nextStep.title,
                    badge: `etapa ${dashboard.nextStep.stepOrder}`,
                  }
                : {
                    title: 'Sem continuidade pronta',
                    detail: 'Monte uma trilha ou adicione um passo para destravar a execucao.',
                    badge: 'setup',
                  },
            ],
          },
        ]}
      >
        <OutrosActivationPanel
          darkMode={darkMode}
          userId={userId}
          dashboard={dashboard}
          onRefresh={refreshDashboard}
        />
      </ContextShellPage>
    );
  }

  if (activeTab === 'arvore') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Plano"
        title={dashboard?.activePath?.title || 'Plano do foco'}
        description="Plano agora significa estrutura de evolucao: trilha, backlog, revisoes e o que ainda falta para o foco andar."
        actions={[
          { label: 'Abrir execucao', onClick: () => onNavigate('cronograma') },
          { label: 'Ver ritmo', onClick: () => onNavigate('dashboard'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Tema', value: dashboard?.activeTopic?.name || topic },
          { label: 'Trilha ativa', value: dashboard?.activePath ? `${dashboard.activePath.progressPercent}%` : 'Sem trilha' },
          { label: 'Passos ativos', value: String(stepCounts.inProgress + stepCounts.queued), detail: `${stepCounts.completed}/${stepCounts.total} concluidos` },
          { label: 'Revisoes', value: String(rank?.pendingReviewsCount || 0), detail: rank?.nextReviewDueAt ? `Proxima em ${nextReviewLabel}` : 'Sem fila agora.' },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Trilha ativa',
            description: 'A trilha atual concentra o plano principal do foco e o passo que sustenta a continuidade.',
            items: [
              dashboard?.activePath
                ? {
                    title: 'Trilha ativa',
                    detail: `${dashboard.activePath.title} - ${dashboard.activePath.progressPercent}% concluido - ${stepCounts.completed} de ${stepCounts.total} passos resolvidos`,
                    badge: dashboard.activePath.status,
                  }
                : {
                    title: 'Trilha ativa',
                    detail: 'Nenhuma trilha ativa foi encontrada para o tema atual.',
                    badge: 'setup',
                  },
              dashboard?.nextStep
                ? {
                    title: 'Proximo passo',
                    detail: dashboard.nextStep.description || dashboard.nextStep.title,
                    badge: `etapa ${dashboard.nextStep.stepOrder}`,
                  }
                : {
                    title: 'Proximo passo',
                    detail: 'Sem passo pendente para a trilha atual.',
                    badge: 'vazio',
                  },
            ],
          },
          {
            title: 'Backlog do plano',
            description: 'A fila separa o que esta ativo agora, o que vem depois e o que ja saiu do backlog principal.',
            items: [
              {
                title: 'Em progresso',
                detail: `${stepCounts.inProgress} passo(s) em andamento agora.`,
                badge: 'ativo',
              },
              {
                title: 'Proximo',
                detail: `${stepCounts.queued} passo(s) ainda na fila imediata.`,
                badge: 'fila',
              },
              {
                title: 'Concluido recentemente',
                detail: `${stepCounts.completed} passo(s) ja viraram historico.`,
                badge: 'historico',
              },
            ],
          },
          {
            title: 'Revisoes ligadas a trilha',
            description: 'O plano tambem protege retencao e nao apenas a lista de passos.',
            items: [
              {
                title: 'Fila de revisao',
                detail: rank?.pendingReviewsCount
                  ? `${rank.pendingReviewsCount} revisao(oes) pendente(s) no foco atual.`
                  : 'Nenhuma revisao pendente agora.',
                badge: rank?.pendingReviewsCount ? 'revisao' : 'ok',
              },
              {
                title: 'Processadas',
                detail: `${rank?.processedReviews || 0} revisao(oes) ja concluida(s) dentro do foco atual.`,
                badge: 'historico',
              },
            ],
          },
        ]}
      />
    );
  }

  if (activeTab === 'cronograma') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Execucao"
        title={dashboard?.nextStep?.title || 'Executar o foco'}
        description="Execucao transforma plano em acao real: tarefa do momento, revisao do radar e o que libera depois."
        actions={[
          { label: 'Concluir passo atual', onClick: () => onNavigate('departamento') },
          { label: 'Abrir ritmo', onClick: () => onNavigate('dashboard'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Agora', value: dashboard?.nextStep?.title || 'Sem passo pronto', detail: dashboard?.activePath?.title || 'Monte uma trilha para destravar.' },
          { label: 'Fila imediata', value: String(stepCounts.queued), detail: `${stepCounts.inProgress} em andamento` },
          { label: 'Revisoes pendentes', value: String(rank?.pendingReviewsCount || 0), detail: rank?.nextReviewDueAt ? `Proxima em ${nextReviewLabel}` : 'Sem revisao agora.' },
          { label: 'Ritmo da semana', value: formatMinutesLabel(rank?.weeklyMinutes || 0), detail: paceStatusLabel },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Tarefa do momento',
            description: 'O shell destaca o passo mais importante para evitar que a rotina dependa de decisao manual toda vez.',
            items: [
              dashboard?.nextStep
                ? {
                    title: dashboard.nextStep.title,
                    detail: dashboard.nextStep.description || 'Passo principal para o momento atual.',
                    badge: `etapa ${dashboard.nextStep.stepOrder}`,
                  }
                : {
                    title: 'Sem tarefa do momento',
                    detail: 'Volte para Meu foco e adicione um passo acionavel.',
                    badge: 'setup',
                  },
              {
                title: 'Impacto esperado',
                detail: dashboard?.activePath
                  ? `Avanca a trilha ${dashboard.activePath.title} e protege a continuidade do estudo.`
                  : 'Ajuda a transformar foco em plano real.',
                badge: dashboard?.activePath?.status || 'fluxo',
              },
            ],
          },
          {
            title: 'Proxima revisao',
            description: 'Revisoes entram como apoio da execucao, nao como ruido paralelo.',
            items: [
              rank?.pendingReviewsCount
                ? {
                    title: 'Item no radar',
                    detail: `Ha ${rank.pendingReviewsCount} revisao(oes) pendente(s). A proxima vence em ${nextReviewLabel}.`,
                    badge: 'revisao',
                  }
                : {
                    title: 'Sem revisao imediata',
                    detail: 'A fila de revisoes do foco esta zerada agora.',
                    badge: 'ok',
                  },
            ],
          },
          {
            title: 'Continuidade',
            description: 'Esse bloco lembra o que sera liberado depois da acao atual.',
            items: eventItems.length > 0
              ? eventItems
              : [
                  {
                    title: 'Sem agenda de apoio',
                    detail: 'Quando houver meta, estudo ou revisao no foco atual, eles aparecem aqui como suporte.',
                    badge: 'setup',
                  },
                ],
          },
        ]}
      />
    );
  }

  if (activeTab === 'dashboard') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Ritmo"
        title="Ritmo do foco atual"
        description="O ritmo deste modo e calculado so com sessoes, revisoes, trilhas e eventos do foco atual, sem puxar linguagem ou agregados globais de outros modos."
        actions={[
          { label: 'Ajustar semana', onClick: () => onNavigate('cronograma') },
          { label: 'Voltar para visao geral', onClick: () => onNavigate('inicio'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Hoje', value: formatMinutesLabel(rhythm?.todayMinutes || 0), detail: 'Somente sessoes concluidas do foco atual.' },
          { label: 'Semana', value: formatMinutesLabel(rhythm?.weekMinutes || 0), detail: `${rhythm?.weekTargetMinutes || 0} min de alvo semanal` },
          { label: 'Evolucao', value: formatSignedPercent(rhythm?.evolutionPercent || 0), detail: `${formatMinutesLabel(rhythm?.previousWeekMinutes || 0)} na semana anterior` },
          { label: 'Sequencia', value: rank ? `${rank.streakCurrent} dias` : '0 dias', detail: `Melhor marca: ${rank?.streakBest || 0} dias` },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Rank do foco atual',
            description: 'Todas as metricas deste bloco respeitam o contexto ativo do modo livre.',
            items: [
              {
                title: 'Tempo acumulado',
                detail: `${rank?.totalHoursLabel || '0,0h'} no foco atual - ${rank?.completedSessions || 0} sessoes concluidas.`,
                badge: 'tempo',
              },
              {
                title: 'Sequencia',
                detail: `${rank?.streakCurrent || 0} dia(s) agora - melhor de ${rank?.streakBest || 0}.`,
                badge: 'streak',
              },
              {
                title: 'Revisoes processadas',
                detail: `${rank?.processedReviews || 0} concluida(s) - ${rank?.pendingReviewsCount || 0} pendente(s).`,
                badge: 'revisao',
              },
            ],
          },
          {
            title: 'Agenda util',
            description: 'Sessao, meta e revisao aparecem aqui como suporte de ritmo, sem planner legado cruzado.',
            items: eventItems.length > 0
              ? eventItems
              : [
                  {
                    title: 'Sem eventos agendados',
                    detail: 'Quando houver meta, estudo ou revisao no foco atual, eles aparecem aqui.',
                    badge: 'setup',
                  },
                ],
          },
          {
            title: 'Alertas de ritmo',
            description: 'O shell avisa quando a constancia esta em risco ou quando o foco pode destravar com um ajuste pequeno.',
            items: [
              rank?.pendingReviewsCount
                ? {
                    title: 'Revisao no radar',
                    detail: `A fila de revisoes do foco atual tem ${rank.pendingReviewsCount} item(ns).`,
                    badge: 'revisao',
                  }
                : {
                    title: 'Revisoes sob controle',
                    detail: 'Nao ha revisoes pendentes agora.',
                    badge: 'ok',
                  },
              rank && rank.weeklyTargetMinutes > 0
                ? {
                    title: rank.paceStatus === 'abaixo' ? 'Carga abaixo do esperado' : 'Semana em equilibrio',
                    detail: `${rank.weeklyMinutes} de ${rank.weeklyTargetMinutes} min previstos nesta semana.`,
                    badge: paceStatusLabel,
                  }
                : {
                    title: 'Semana sem meta',
                    detail: 'Defina minutos diarios no contexto para o ritmo deixar de depender de memoria.',
                    badge: 'meta',
                  },
              dashboard?.nextStep
                ? {
                    title: 'Continuidade pronta',
                    detail: `${dashboard.nextStep.title} segue como melhor proximo passo da trilha.`,
                    badge: 'proximo',
                  }
                : {
                    title: 'Sem continuidade pronta',
                    detail: 'O foco precisa de um novo passo para a execucao voltar a andar.',
                    badge: 'plano',
                  },
                ],
          },
        ]}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]">
          <OverviewCommandCard
            darkMode={darkMode}
            title="Horas que viram progresso"
            description="Barras diarias e meta semanal calculadas apenas com sessoes concluidas deste foco."
            badge={`${rank?.activeDaysLast7 || 0}/7 dias`}
            cardId="outros-rhythm-daily"
            featured
          >
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2">
                {(rhythm?.dailyBars || []).map((bar) => (
                  <div key={bar.date} className="flex flex-col items-center gap-2">
                    <div className={`flex h-28 w-full items-end rounded-2xl px-1.5 pb-1.5 ${
                      darkMode ? 'bg-slate-900/78' : 'bg-white/80'
                    }`}>
                      <div
                        className={`w-full rounded-xl ${
                          bar.isToday
                            ? 'bg-[linear-gradient(180deg,#06b6d4,#0ea5e9)]'
                            : darkMode
                              ? 'bg-[linear-gradient(180deg,#475569,#94a3b8)]'
                              : 'bg-[linear-gradient(180deg,#94a3b8,#cbd5e1)]'
                        }`}
                        style={{ height: getBarWidth(bar.minutes, rhythmPeakMinutes) }}
                      />
                    </div>
                    <div className="text-center">
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        bar.isToday
                          ? darkMode
                            ? 'text-cyan-300'
                            : 'text-cyan-700'
                          : darkMode
                            ? 'text-slate-400'
                            : 'text-slate-500'
                      }`}>
                        {bar.day}
                      </p>
                      <p className={`mt-1 text-xs ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {formatMinutesLabel(bar.minutes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`rounded-2xl border p-4 ${
                darkMode ? 'border-slate-800/80 bg-slate-950/84' : 'border-slate-200/80 bg-white/84'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      darkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      Meta semanal
                    </p>
                    <p className={`mt-2 text-sm ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {formatMinutesLabel(rhythm?.weekMinutes || 0)} de {formatMinutesLabel(rhythm?.weekTargetMinutes || 0)}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    darkMode
                      ? 'border-slate-700 bg-slate-950 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}>
                    {paceStatusLabel}
                  </span>
                </div>
                <div className={`mt-3 h-2.5 overflow-hidden rounded-full ${
                  darkMode ? 'bg-slate-900' : 'bg-slate-200'
                }`}>
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#22c55e)]"
                    style={{
                      width: rhythm?.weekTargetMinutes
                        ? `${Math.max(8, Math.min(100, Math.round(((rhythm?.weekMinutes || 0) / rhythm.weekTargetMinutes) * 100)))}%`
                        : '8%',
                    }}
                  />
                </div>
              </div>
            </div>
          </OverviewCommandCard>

          <OverviewCommandCard
            darkMode={darkMode}
            title="Horas por foco"
            description="A distribuicao da semana usa temas do foco atual, nao rotulos globais."
            badge={rhythmDominantFocus ? `Lider: ${rhythmDominantFocus.label}` : 'sem foco'}
            cardId="outros-rhythm-distribution"
          >
            <div className="space-y-3">
              {(rhythm?.distributionByFocus || []).length > 0 ? (
                (rhythm?.distributionByFocus || []).map((entry) => (
                  <div
                    key={entry.label}
                    className={`rounded-2xl border p-3.5 ${
                      darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${
                          darkMode ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {entry.label}
                        </p>
                        <p className={`mt-1 text-xs ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {entry.sessions} sessao(oes) na semana
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          darkMode ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {formatMinutesLabel(entry.minutes)}
                        </p>
                        <p className={`mt-1 text-xs ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {entry.sharePercent}% da semana
                        </p>
                      </div>
                    </div>
                    <div className={`mt-3 h-2 overflow-hidden rounded-full ${
                      darkMode ? 'bg-slate-950' : 'bg-slate-200'
                    }`}>
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#06b6d4)]"
                        style={{ width: `${Math.max(8, entry.sharePercent)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className={`rounded-2xl border p-4 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/78 text-slate-300' : 'border-slate-200/80 bg-slate-50/88 text-slate-600'
                }`}>
                  Conclua sessoes no foco atual para liberar a distribuicao por tema/trilha desta semana.
                </div>
              )}
            </div>
          </OverviewCommandCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <OverviewCommandCard
            darkMode={darkMode}
            title="Insights"
            description="Melhor dia, foco dominante e revisoes permanecem isolados dentro do contexto atual."
            cardId="outros-rhythm-insights"
          >
            <div className="space-y-3">
              <div className={`rounded-2xl border p-3.5 ${
                darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Melhor dia
                </p>
                <p className={`mt-2 text-sm font-semibold ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {rhythmBestDay ? `${formatDateLabel(rhythmBestDay.date)} - ${formatMinutesLabel(rhythmBestDay.minutes)}` : 'Seu melhor dia aparece depois das primeiras sessoes.'}
                </p>
              </div>

              <div className={`rounded-2xl border p-3.5 ${
                darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Foco dominante
                </p>
                <p className={`mt-2 text-sm font-semibold ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {rhythmDominantFocus ? `${rhythmDominantFocus.label} lidera a semana` : 'O foco dominante aparece quando a semana ganhar volume.'}
                </p>
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {rhythmDominantFocus
                    ? `${formatMinutesLabel(rhythmDominantFocus.minutes)} em ${rhythmDominantFocus.sessions} sessao(oes).`
                    : 'A distribuicao so considera os temas do contexto atual.'}
                </p>
              </div>

              <div className={`rounded-2xl border p-3.5 ${
                darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Revisoes e constancia
                </p>
                <p className={`mt-2 text-sm font-semibold ${
                  darkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {rank?.pendingReviewsCount
                    ? `${rank.pendingReviewsCount} revisao(oes) ainda pedem atencao`
                    : 'A fila de revisoes do foco atual esta sob controle'}
                </p>
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {rank?.processedReviews || 0} revisao(oes) processada(s) e {rank?.activeDaysLast7 || 0} dia(s) ativos nos ultimos 7.
                </p>
              </div>
            </div>
          </OverviewCommandCard>

          <OverviewCommandCard
            darkMode={darkMode}
            title="Proxima melhor acao"
            description="A recomendacao sai do proprio foco: revisao pendente, passo da trilha ou evento mais proximo."
            badge={rhythmAction?.type || 'sem acao'}
            cardId="outros-rhythm-next-action"
            featured
          >
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${
                darkMode ? 'border-slate-800/80 bg-slate-950/84' : 'border-white/80 bg-white/88'
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Sessao recomendada
                </p>
                <p className={`mt-2 text-lg font-semibold ${
                  darkMode ? 'text-slate-50' : 'text-slate-900'
                }`}>
                  {rhythmAction?.title || 'Ainda nao existe uma acao recomendada para este foco.'}
                </p>
                <p className={`mt-2 text-sm leading-6 ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {rhythmAction?.reason || 'Assim que houver revisao, passo ou evento no foco atual, a recomendacao aparece aqui.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`rounded-2xl border p-3.5 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
                }`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Tipo
                  </p>
                  <p className={`mt-2 text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {rhythmAction?.type || 'Aguardando'}
                  </p>
                </div>

                <div className={`rounded-2xl border p-3.5 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
                }`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Impacto
                  </p>
                  <p className={`mt-2 text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {dashboard?.activePath ? 'Protege a trilha ativa' : 'Mantem a constancia'}
                  </p>
                </div>

                <div className={`rounded-2xl border p-3.5 ${
                  darkMode ? 'border-slate-800/80 bg-slate-900/78' : 'border-slate-200/80 bg-slate-50/88'
                }`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Duracao
                  </p>
                  <p className={`mt-2 text-sm font-semibold ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {formatMinutesLabel(rhythmAction?.estimatedMinutes || 0)}
                  </p>
                </div>
              </div>
            </div>
          </OverviewCommandCard>
        </div>
      </ContextShellPage>
    );
  }

  if (activeTab === 'perfil') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Perfil"
        title="Quem voce esta se tornando"
        description="Perfil consolida a narrativa do foco: onde voce esta, quanto ja investiu e como o estudo mudou ao longo da jornada."
        actions={[
          { label: 'Recalibrar objetivo', onClick: onReviewContext },
          { label: 'Voltar para visao geral', onClick: () => onNavigate('inicio'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Foco principal', value: dashboard?.activeTopic?.name || topic },
          { label: 'Nivel', value: dashboard?.activeTopic?.level || dashboard?.profile.level || 'Nao definido' },
          { label: 'Horas investidas', value: rank?.totalHoursLabel || '0,0h' },
          { label: 'Constancia', value: rank ? `${rank.streakCurrent} dias` : '0 dias', detail: paceStatusLabel },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Narrativa atual',
            description: 'Esse bloco resume foco, estagio e ritmo da jornada atual.',
            items: [
              {
                title: 'Foco dominante',
                detail: `${dashboard?.activeTopic?.name || topic}${dashboard?.activeTopic?.category ? ` - ${dashboard.activeTopic.category}` : ''}`,
                badge: dashboard?.activeTopic?.status || 'setup',
              },
              {
                title: 'Estagio atual',
                detail: dashboard?.activePath
                  ? `${dashboard.activePath.title} - ${dashboard.activePath.progressPercent}% concluido`
                  : 'Sem trilha ativa consolidada.',
                badge: dashboard?.activePath?.status || 'plano',
              },
              {
                title: 'Tempo investido',
                detail: `${rank?.totalHoursLabel || '0,0h'} acumuladas em ${rank?.completedSessions || 0} sessoes do foco atual.`,
                badge: 'tempo',
              },
            ],
          },
          {
            title: 'Painel de evolucao',
            description: 'Sessoes, revisoes e consistencia ajudam a contar a historia da evolucao recente.',
            items: [
              {
                title: 'Sessoes e revisoes',
                detail: `${rank?.completedSessions || 0} sessoes concluidas - ${rank?.processedReviews || 0} revisoes processadas.`,
                badge: 'dados',
              },
              {
                title: 'Constancia recente',
                detail: `${rank?.activeDaysLast7 || 0} dia(s) ativo(s) nos ultimos 7 e melhor sequencia de ${rank?.streakBest || 0}.`,
                badge: 'ritmo',
              },
              {
                title: 'Meta semanal',
                detail: weeklyMinutesLabel,
                badge: paceStatusLabel,
              },
            ],
          },
        ]}
      >
        {profileSlot}
      </ContextShellPage>
    );
  }

  return null;
};

export default OutrosShell;
