import type { HomeReviewQueueState } from '../../features/review';
import {
  normalizePresentationLabel,
  normalizeSubjectLabel,
} from '../../utils/uiLabels';

type HomeStudyNowInput = {
  status: 'loading' | 'error' | 'empty' | 'ready';
  title?: string;
  description?: string;
  discipline?: string;
  topic?: string;
  reason?: string;
  supportingText?: string;
  estimatedDurationMinutes?: number;
  sessionTypeLabel?: string;
  progressLabel?: string;
  ctaLabel?: string;
};

type HomeNextSessionCommitInput = {
  title: string;
  detail: string;
};

type HomeContinuationMissionInput = {
  subject: string;
  topic: string;
  questionsDone: number;
  totalQuestions: number;
  estimatedMinutesRemaining: number;
};

export type HomeTodayActionTarget = 'study' | 'reviews' | 'planning';
export type HomePriority = 'review' | 'continue' | 'study' | 'plan';
export type HomeDayPhase = 'inicio' | 'em_andamento' | 'concluido';

export interface HomeTodayPanelRow {
  id: string;
  label: string;
  detail: string;
  badge?: string;
}

export interface HomeTodayState {
  priority: HomePriority;
  phase: HomeDayPhase;
  isDone: boolean;
  hero: {
    mode: 'default' | 'activation';
    eyebrow: string;
    title: string;
    subtitle: string;
    insight: string;
    supportingText?: string;
    primaryActionLabel: string;
    primaryActionTarget: HomeTodayActionTarget;
  };
  dayStatus: {
    label: string;
    value: string;
    detail: string;
    summary: string;
    remainder: string;
  };
  primaryPanel: {
    eyebrow: string;
    title: string;
    description: string;
    sessionLabel: string;
    stateBadgeLabel: string;
    rows: HomeTodayPanelRow[];
  };
  continuityPanel: {
    eyebrow: string;
    title: string;
    actionLabel: string;
    actionTarget: HomeTodayActionTarget;
    rows: HomeTodayPanelRow[];
  };
}

type BuildHomeTodayStateInput = {
  firstName: string;
  isActivationHome: boolean;
  todayMinutes: number;
  dailyGoalMinutes: number;
  weeklyCompletedSessions: number;
  weeklyPlannedSessions: number;
  reviewQueueState: HomeReviewQueueState;
  officialStudyCard?: HomeStudyNowInput;
  nextSessionCommit?: HomeNextSessionCommitInput | null;
  continuationMission?: HomeContinuationMissionInput | null;
};

type ResolvePhaseInput = {
  priority: HomePriority;
  reviewQueueState: HomeReviewQueueState;
  officialStudyCard?: HomeStudyNowInput;
  continuationMission?: HomeContinuationMissionInput | null;
};

const buildPriorityState = (priority: HomePriority, phase: HomeDayPhase) => ({
  priority,
  phase,
  isDone: phase === 'concluido',
});

const formatReviewCount = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

const formatMinuteLabel = (value: number) =>
  value <= 5 ? 'menos de 5 min' : `${value} min`;

const buildWeeklyRemainderLabel = (remainingSessions: number) =>
  remainingSessions > 0
    ? `Faltam ${remainingSessions} ${remainingSessions === 1 ? 'bloco' : 'blocos'} para fechar a semana.`
    : 'Sua meta semanal ja entrou no ritmo.';

const hasOpenContinuationMission = (continuationMission?: HomeContinuationMissionInput | null) => {
  if (!continuationMission) {
    return false;
  }

  const totalQuestions = Math.max(continuationMission.totalQuestions, 1);
  return Math.max(continuationMission.questionsDone, 0) < totalQuestions;
};

const resolveHomePriority = ({
  isActivationHome,
  reviewQueueState,
  officialStudyCard,
  nextSessionCommit,
  continuationMission,
}: Pick<
  BuildHomeTodayStateInput,
  'isActivationHome' | 'reviewQueueState' | 'officialStudyCard' | 'nextSessionCommit' | 'continuationMission'
>): HomePriority => {
  if (isActivationHome) {
    return 'study';
  }

  if (reviewQueueState.dueTodayCount > 0) {
    return 'review';
  }

  if (hasOpenContinuationMission(continuationMission) || Boolean(nextSessionCommit)) {
    return 'continue';
  }

  if (officialStudyCard?.status === 'ready') {
    return 'study';
  }

  return 'plan';
};

const resolvePhase = ({
  priority,
  reviewQueueState,
  officialStudyCard,
  continuationMission,
}: ResolvePhaseInput): HomeDayPhase => {
  if (priority === 'review') {
    if (reviewQueueState.dueTodayCount === 0 && reviewQueueState.completedTodayCount > 0) {
      return 'concluido';
    }

    if (reviewQueueState.completedTodayCount > 0) {
      return 'em_andamento';
    }

    return 'inicio';
  }

  if (priority === 'continue') {
    if (!continuationMission) {
      return 'inicio';
    }

    const totalQuestions = Math.max(continuationMission.totalQuestions, 1);
    const questionsDone = Math.max(continuationMission.questionsDone, 0);

    if (questionsDone >= totalQuestions) {
      return 'concluido';
    }

    if (questionsDone > 0) {
      return 'em_andamento';
    }

    return 'inicio';
  }

  if (priority === 'study') {
    const studySignals = `${officialStudyCard?.title || ''} ${officialStudyCard?.sessionTypeLabel || ''}`.toLowerCase();

    if (studySignals.includes('em andamento') || studySignals.includes('continue sua sessao')) {
      return 'em_andamento';
    }

    return 'inicio';
  }

  return 'inicio';
};

const buildReviewRow = (reviewQueueState: HomeReviewQueueState): HomeTodayPanelRow => {
  const leadReview = reviewQueueState.nextItem;

  if (reviewQueueState.status === 'pending_today' && leadReview) {
    return {
      id: 'review-row',
      label: 'Revisao do dia',
      detail: `${leadReview.title} abre a fila com ${formatReviewCount(reviewQueueState.dueTodayCount, 'item pronto', 'itens prontos')} hoje.`,
      badge: reviewQueueState.dueTodayCount > 1 ? `${reviewQueueState.dueTodayCount} hoje` : leadReview.tag,
    };
  }

  if (reviewQueueState.status === 'completed_today') {
    return {
      id: 'review-row',
      label: 'Revisoes em dia',
      detail: leadReview
        ? `${formatReviewCount(reviewQueueState.completedTodayCount, 'revisao concluida', 'revisoes concluidas')} hoje. A proxima janela volta ${leadReview.when.toLowerCase()}.`
        : `${formatReviewCount(reviewQueueState.completedTodayCount, 'revisao concluida', 'revisoes concluidas')} hoje e nenhuma pendencia entrou agora.`,
      badge: 'Concluido',
    };
  }

  if (reviewQueueState.status === 'upcoming' && leadReview) {
    return {
      id: 'review-row',
      label: 'Proxima revisao',
      detail: `${leadReview.title} volta ${leadReview.when.toLowerCase()} com janela ${leadReview.tag}.`,
      badge: 'Em breve',
    };
  }

  return {
    id: 'review-row',
    label: 'Revisoes',
    detail: 'Nenhuma revisao esta vencida agora. O proximo ciclo entra quando uma nova janela abrir.',
    badge: 'Livre',
  };
};

export const buildHomeTodayState = ({
  firstName,
  isActivationHome,
  todayMinutes,
  dailyGoalMinutes,
  weeklyCompletedSessions,
  weeklyPlannedSessions,
  reviewQueueState,
  officialStudyCard,
  nextSessionCommit,
  continuationMission,
}: BuildHomeTodayStateInput): HomeTodayState => {
  const remainingSessions = Math.max(weeklyPlannedSessions - weeklyCompletedSessions, 0);
  const normalizedStudyDiscipline = normalizeSubjectLabel(officialStudyCard?.discipline || '', 'Matematica');
  const normalizedStudyTopic = normalizePresentationLabel(officialStudyCard?.topic || '', 'Proxima missao');
  const studyFocusLabel = `${normalizedStudyDiscipline} - ${normalizedStudyTopic}`;
  const studyDurationMinutes = officialStudyCard?.estimatedDurationMinutes || 25;
  const studyDurationLabel = formatMinuteLabel(studyDurationMinutes);
  const leadReview = reviewQueueState.nextItem;
  const hasContinuation = hasOpenContinuationMission(continuationMission) || Boolean(nextSessionCommit);
  const priority = resolveHomePriority({
    isActivationHome,
    reviewQueueState,
    officialStudyCard,
    nextSessionCommit,
    continuationMission,
  });
  const phase = resolvePhase({
    priority,
    reviewQueueState,
    officialStudyCard,
    continuationMission,
  });
  const priorityState = buildPriorityState(priority, phase);
  const continuationSubject = normalizeSubjectLabel(
    continuationMission?.subject || officialStudyCard?.discipline || '',
    'Matematica',
  );
  const continuationTopic = normalizePresentationLabel(
    continuationMission?.topic || officialStudyCard?.topic || '',
    'Proxima missao',
  );
  const continuationFocusLabel = `${continuationSubject} - ${continuationTopic}`;
  const continuationQuestionsTotal = Math.max(continuationMission?.totalQuestions || 3, 1);
  const continuationQuestionsDone = Math.max(continuationMission?.questionsDone || 0, 0);
  const continuationQuestionsRemaining = Math.max(continuationQuestionsTotal - continuationQuestionsDone, 0);
  const continuationDurationMinutes = continuationMission?.estimatedMinutesRemaining || studyDurationMinutes;
  const continuationDurationLabel = formatMinuteLabel(continuationDurationMinutes);
  const continuationProgressLabel = continuationMission
    ? continuationQuestionsRemaining === 0
      ? 'Este bloco ja foi concluido e nao precisa mais disputar sua atencao.'
      : `Faltam ${continuationQuestionsRemaining} ${continuationQuestionsRemaining === 1 ? 'questao' : 'questoes'} para fechar este bloco.`
    : officialStudyCard?.progressLabel || 'Bloco curto pronto para manter o dia andando.';
  const reviewRow = buildReviewRow(reviewQueueState);
  const weeklyRow: HomeTodayPanelRow = {
    id: 'weekly-row',
    label: remainingSessions > 0 ? 'Semana aberta' : 'Semana em dia',
    detail: buildWeeklyRemainderLabel(remainingSessions),
    badge: remainingSessions > 0 ? `${remainingSessions} restantes` : 'No ritmo',
  };
  const nextStudyRow: HomeTodayPanelRow = hasContinuation
    ? {
        id: 'next-study-row',
        label: 'Depois da revisao',
        detail: `${continuationFocusLabel} fica pronto para voltar assim que a fila do dia limpar.`,
        badge: continuationDurationLabel,
      }
    : officialStudyCard?.status === 'ready'
      ? {
          id: 'next-study-row',
          label: 'Depois do agora',
          detail: `${studyFocusLabel} ja esta preparado para entrar sem atrito.`,
          badge: studyDurationLabel,
        }
      : {
          id: 'next-study-row',
          label: 'Depois do agora',
          detail: 'Se o foco do dia mudar, o plano e o cronograma mostram o proximo bloco.',
          badge: 'Plano',
        };

  if (isActivationHome) {
    const activationDurationMinutes = officialStudyCard?.estimatedDurationMinutes || 5;
    return {
      ...priorityState,
      hero: {
        mode: 'activation',
        eyebrow: 'primeiro passo',
        title: 'Comece sua primeira sessao',
        subtitle: activationDurationMinutes <= 5 ? 'Leva menos de 5 min' : `Leva ${activationDurationMinutes} min`,
        insight: `${officialStudyCard?.progressLabel || '3 questoes rapidas'} e revisao curta para voce sair do zero hoje.`,
        supportingText: 'Voce comeca, entende o basico e ja deixa o amanha preparado.',
        primaryActionLabel: `Comecar primeira sessao (leva ${activationDurationMinutes} min)`,
        primaryActionTarget: 'study',
      },
      dayStatus: {
        label: 'Hoje',
        value: 'Primeiro passo',
        detail: 'Basta um bloco curto para o dia deixar de estar vazio.',
        summary: '1 sessao curta ja conta',
        remainder: 'Depois disso, o sistema libera a continuidade natural.',
      },
      primaryPanel: {
        eyebrow: 'agora',
        title: 'Comece pelo primeiro bloco',
        description: 'A Home ativa o fluxo mais simples possivel para voce ganhar tracao hoje.',
        sessionLabel: 'Sessao inicial',
        stateBadgeLabel: 'Hoje',
        rows: [
          {
            id: 'activation-now',
            label: 'Agora',
            detail: `${officialStudyCard?.progressLabel || '3 questoes rapidas'} com revisao curta para destravar o dia.`,
            badge: activationDurationMinutes <= 5 ? '<5 min' : `${activationDurationMinutes} min`,
          },
          {
            id: 'activation-next',
            label: 'Depois',
            detail: 'A proxima sessao passa a aparecer com contexto real do plano.',
            badge: 'Continua',
          },
        ],
      },
      continuityPanel: {
        eyebrow: 'depois',
        title: 'O que vem logo em seguida',
        actionLabel: 'Abrir plano',
        actionTarget: 'planning',
        rows: [weeklyRow],
      },
    };
  }

  if (priority === 'review' && leadReview) {
    const completedTodayLabel = reviewQueueState.completedTodayCount > 0
      ? `${formatReviewCount(reviewQueueState.completedTodayCount, 'revisao ja feita', 'revisoes ja feitas')} hoje.`
      : 'Nenhuma revisao foi fechada hoje ainda.';
    const reviewStarted = phase === 'em_andamento';

    return {
      ...priorityState,
      hero: {
        mode: 'default',
        eyebrow: 'hoje',
        title: reviewStarted ? 'Continue pelas revisoes do dia' : 'Comece pelas revisoes do dia',
        subtitle: leadReview.title,
        insight: `${formatReviewCount(reviewQueueState.dueTodayCount, 'item pede revisao agora', 'itens pedem revisao agora')} antes do proximo bloco.`,
        supportingText: nextStudyRow.detail,
        primaryActionLabel: reviewStarted ? 'Continuar revisao' : 'Comecar revisao',
        primaryActionTarget: 'reviews',
      },
      dayStatus: {
        label: 'Hoje',
        value: reviewStarted ? 'Revisao em andamento' : 'Revisao pronta',
        detail: reviewStarted
          ? 'Voce ja iniciou a fila vencida. Feche o que resta antes de voltar ao proximo bloco.'
          : 'A fila vencida entra antes do estudo para manter a retencao em dia.',
        summary: formatReviewCount(reviewQueueState.dueTodayCount, 'item vencido', 'itens vencidos'),
        remainder: nextStudyRow.detail,
      },
      primaryPanel: {
        eyebrow: 'agora',
        title: reviewStarted ? 'Continuar revisao' : 'Revisar agora',
        description: reviewStarted
          ? 'A fila do dia ja foi iniciada e continua como a prioridade ativa ate limpar.'
          : 'O dia comeca limpando o que ja venceu. Depois disso, o estudo planejado entra com menos friccao.',
        sessionLabel: 'Revisao do dia',
        stateBadgeLabel: `${reviewQueueState.dueTodayCount} hoje`,
        rows: [
          {
            id: 'review-now',
            label: 'Item atual',
            detail: leadReview.title,
            badge: leadReview.tag,
          },
          {
            id: 'review-queue',
            label: 'Fila do dia',
            detail: `${formatReviewCount(reviewQueueState.dueTodayCount, 'revisao pronta', 'revisoes prontas')} agora. ${completedTodayLabel}`,
            badge: 'Prioridade',
          },
          nextStudyRow,
        ],
      },
      continuityPanel: {
        eyebrow: 'depois',
        title: 'Quando a fila limpar',
        actionLabel: 'Abrir revisoes',
        actionTarget: 'reviews',
        rows: [nextStudyRow, weeklyRow],
      },
    };
  }

  if (priority === 'continue') {
    const continuationStarted = phase === 'em_andamento';

    return {
      ...priorityState,
      hero: {
        mode: 'default',
        eyebrow: 'hoje',
        title: continuationStarted ? 'Voce ja retomou este bloco' : 'Hoje voce continua daqui',
        subtitle: continuationFocusLabel,
        insight: `${continuationProgressLabel} Leva ${continuationDurationLabel}.`,
        supportingText: reviewRow.detail,
        primaryActionLabel: 'Continuar sessao',
        primaryActionTarget: 'study',
      },
      dayStatus: {
        label: 'Hoje',
        value: continuationStarted ? 'Continuacao em andamento' : 'Continuacao pronta',
        detail: continuationStarted
          ? 'Voce ja retomou este bloco e ele segue como a primeira acao do momento.'
          : 'A continuidade ja esta pronta e deve puxar a primeira acao do dia.',
        summary: continuationProgressLabel,
        remainder: reviewRow.detail,
      },
      primaryPanel: {
        eyebrow: 'agora',
        title: 'Continuar agora',
        description: continuationStarted
          ? nextSessionCommit?.detail || 'Seu retorno ja foi iniciado e so precisa te recolocar no ponto salvo.'
          : nextSessionCommit?.detail || 'Seu retorno ficou preparado para voce retomar sem reabrir decisao.',
        sessionLabel: 'Continuidade',
        stateBadgeLabel: continuationDurationLabel,
        rows: [
          {
            id: 'continuation-focus',
            label: 'Bloco atual',
            detail: continuationFocusLabel,
            badge: continuationDurationLabel,
          },
          {
            id: 'continuation-progress',
            label: 'Ponto da sessao',
            detail: continuationProgressLabel,
            badge: 'Retomar',
          },
          reviewRow,
        ],
      },
      continuityPanel: {
        eyebrow: 'depois',
        title: 'O que vem em seguida',
        actionLabel: reviewQueueState.status === 'empty' ? 'Abrir plano' : 'Abrir revisoes',
        actionTarget: reviewQueueState.status === 'empty' ? 'planning' : 'reviews',
        rows: [reviewRow, weeklyRow],
      },
    };
  }

  if (priority === 'study' && officialStudyCard?.status === 'ready') {
    const studyInProgress = phase === 'em_andamento';

    return {
      ...priorityState,
      hero: {
        mode: 'default',
        eyebrow: 'hoje',
        title: studyInProgress
          ? officialStudyCard.title || 'Continue seu estudo oficial'
          : 'Seu bloco de hoje esta pronto',
        subtitle: studyFocusLabel,
        insight: studyInProgress
          ? `${officialStudyCard.progressLabel || 'Sessao em andamento'} - retome do ponto em que voce parou.`
          : `${officialStudyCard.progressLabel || 'Sessao curta pronta'} - leva ${studyDurationLabel}.`,
        supportingText: studyInProgress
          ? `${officialStudyCard.supportingText || 'Esse bloco ja foi iniciado e so precisa do proximo passo.'} ${reviewRow.detail}`
          : `${officialStudyCard.reason || 'Seu foco do dia ja esta definido.'} ${buildWeeklyRemainderLabel(remainingSessions)}`,
        primaryActionLabel: officialStudyCard.ctaLabel || (studyInProgress ? 'Continuar agora' : 'Comecar sessao'),
        primaryActionTarget: 'study',
      },
      dayStatus: {
        label: 'Hoje',
        value: studyInProgress ? 'Estudo em andamento' : 'Estudo pronto',
        detail: studyInProgress
          ? 'Este bloco ja foi iniciado e segue como o foco mais direto para fechar a sessao.'
          : 'Seu plano de hoje ja tem foco definido e pronto para entrar.',
        summary: studyInProgress
          ? officialStudyCard.progressLabel || 'Retomar sessao'
          : `${studyDurationMinutes} min previstos`,
        remainder: reviewRow.detail,
      },
      primaryPanel: {
        eyebrow: 'agora',
        title: studyInProgress ? 'Continuar estudo' : 'Estudar agora',
        description: studyInProgress
          ? officialStudyCard.supportingText
            || officialStudyCard.description
            || 'Seu estudo ja foi iniciado e a Home so precisa recolocar voce no ponto certo.'
          : officialStudyCard.description
            || officialStudyCard.supportingText
            || 'O plano ja escolheu o bloco do dia. Agora a Home so precisa abrir o caminho.',
        sessionLabel: officialStudyCard.sessionTypeLabel || 'Sessao oficial',
        stateBadgeLabel: studyDurationLabel,
        rows: [
          {
            id: 'study-focus',
            label: 'Bloco atual',
            detail: studyFocusLabel,
            badge: studyDurationLabel,
          },
          {
            id: 'study-why',
            label: studyInProgress ? 'Status do bloco' : 'Por que agora',
            detail: studyInProgress
              ? officialStudyCard.progressLabel || 'Seu retorno ja esta aberto e pronto para continuar.'
              : officialStudyCard.reason || 'Este bloco segura o ritmo da semana com menos friccao.',
            badge: studyInProgress ? 'Retomar' : 'Hoje',
          },
          reviewRow,
        ],
      },
      continuityPanel: {
        eyebrow: 'depois',
        title: 'Depois desse bloco',
        actionLabel: reviewQueueState.status === 'empty' ? 'Abrir plano' : 'Abrir revisoes',
        actionTarget: reviewQueueState.status === 'empty' ? 'planning' : 'reviews',
        rows: [reviewRow, weeklyRow],
      },
    };
  }

  if (officialStudyCard?.status === 'empty' || officialStudyCard?.status === 'error') {
    const fallbackTitle = officialStudyCard.title || `Ola, ${firstName}. Seu dia precisa de ajuste.`;
    const fallbackDescription = officialStudyCard.description
      || officialStudyCard.supportingText
      || 'O proximo passo ainda nao ficou claro. Ajuste o planejamento para liberar a acao do dia.';

    return {
      ...priorityState,
      hero: {
        mode: 'default',
        eyebrow: 'hoje',
        title: fallbackTitle,
        subtitle: reviewRow.label,
        insight: fallbackDescription,
        supportingText: reviewRow.detail,
        primaryActionLabel: officialStudyCard.ctaLabel || 'Abrir planejamento',
        primaryActionTarget: 'planning',
      },
      dayStatus: {
        label: 'Hoje',
        value: 'Planejamento aberto',
        detail: fallbackDescription,
        summary: reviewRow.label,
        remainder: reviewRow.detail,
      },
      primaryPanel: {
        eyebrow: 'agora',
        title: 'Ajustar antes de executar',
        description: fallbackDescription,
        sessionLabel: 'Organizacao',
        stateBadgeLabel: 'Planejar',
        rows: [reviewRow, weeklyRow],
      },
      continuityPanel: {
        eyebrow: 'depois',
        title: 'Quando o foco abrir',
        actionLabel: 'Abrir plano',
        actionTarget: 'planning',
        rows: [reviewRow, weeklyRow],
      },
    };
  }

  return {
    ...priorityState,
    hero: {
      mode: 'default',
      eyebrow: 'hoje',
      title: `Ola, ${firstName}. Seu dia esta em movimento.`,
      subtitle: reviewRow.label,
      insight: reviewRow.detail,
      supportingText: buildWeeklyRemainderLabel(remainingSessions),
      primaryActionLabel: 'Abrir plano',
      primaryActionTarget: 'planning',
    },
    dayStatus: {
      label: 'Hoje',
      value: 'Planejamento aberto',
      detail: `Sua meta diaria esta em ${dailyGoalMinutes} min e o plano define o proximo passo.`,
      summary: `${dailyGoalMinutes} min previstos`,
      remainder: buildWeeklyRemainderLabel(remainingSessions),
    },
    primaryPanel: {
      eyebrow: 'agora',
      title: 'Abrir o proximo passo',
      description: 'Quando nao ha uma acao unica pronta, a Home joga a decisao de volta para o plano do dia.',
      sessionLabel: 'Planejamento',
      stateBadgeLabel: 'Hoje',
      rows: [reviewRow, weeklyRow],
    },
    continuityPanel: {
      eyebrow: 'depois',
      title: 'O que acompanhar',
      actionLabel: reviewQueueState.status === 'empty' ? 'Abrir plano' : 'Abrir revisoes',
      actionTarget: reviewQueueState.status === 'empty' ? 'planning' : 'reviews',
      rows: [reviewRow, weeklyRow],
    },
  };
};
