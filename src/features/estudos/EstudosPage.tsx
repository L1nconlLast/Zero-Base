import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { WorkspaceLayout } from '../../components/Workspace/WorkspaceLayout';
import {
  normalizeBlockLabel,
  normalizePresentationLabel,
  truncatePresentationLabel,
} from '../../utils/uiLabels';
import { useEstudos } from './hooks/useEstudos';
import { SessionHeader } from './components/SessionHeader';
import { SessionInputs } from './components/SessionInputs';
import { ExecutionCore } from './components/ExecutionCore';
import { SupportRail } from './components/SupportRail';
import { PostExecutionBand } from './components/PostExecutionBand';
import { buildStudyTrackPresentation } from './studyTrackPresentation';
import type {
  EstudosPageProps,
  ExecutionCoreData,
  FinishPayload,
  PostExecutionBandData,
  SessionHeaderData,
  SupportRailData,
} from './types';

export type { EstudosPageProps } from './types';

const ACTION_STARTERS = [
  'revisar',
  'resolver',
  'praticar',
  'estudar',
  'fechar',
  'consolidar',
  'validar',
  'retomar',
  'ler',
  'treinar',
  'executar',
];

const resolveTrackLabel = (
  preferredStudyTrack: EstudosPageProps['preferredStudyTrack'],
  hybridEnemWeight: number,
  hybridConcursoWeight: number,
) => {
  if (preferredStudyTrack === 'enem') {
    return 'ENEM';
  }

  if (preferredStudyTrack === 'concursos') {
    return 'Concurso';
  }

  return `Hibrido ${hybridEnemWeight}% ENEM / ${hybridConcursoWeight}% Concurso`;
};

const resolveSessionTitle = (
  objective: string,
  blockLabel: string,
  isBlocked: boolean,
  isTransition: boolean,
  isPostFocus: boolean,
  targetQuestions: number,
) => {
  if (isPostFocus) {
    return `Fechar bloco de ${blockLabel}`;
  }

  if (isTransition) {
    return targetQuestions > 0
      ? `Validar ${blockLabel} com ${targetQuestions} questoes`
      : `Validar ${blockLabel}`;
  }

  if (isBlocked) {
    return `Preparar sessao de ${blockLabel}`;
  }

  if (!objective || objective === 'Bloco oficial do dia') {
    return `Estudar ${blockLabel}`;
  }

  const lowered = objective.trim().toLowerCase();
  const alreadyActionOriented = ACTION_STARTERS.some((starter) => lowered.startsWith(starter));
  return alreadyActionOriented ? objective : `Estudar ${objective}`;
};

const resolveExecutionGoal = (
  objective: string,
  blockLabel: string,
  isBlocked: boolean,
  isTransition: boolean,
  isPostFocus: boolean,
  targetQuestions: number,
) => {
  if (isPostFocus) {
    return `Registrar ${blockLabel} e fechar a sessao`;
  }

  if (isTransition) {
    return targetQuestions > 0
      ? `Resolver ${targetQuestions} questoes de ${blockLabel}`
      : `Validar ${blockLabel}`;
  }

  if (isBlocked) {
    return `Preparar ${blockLabel} antes de iniciar`;
  }

  if (targetQuestions > 0) {
    return `Fechar ${objective} e validar ${targetQuestions} questoes`;
  }

  return resolveSessionTitle(objective, blockLabel, false, false, false, targetQuestions);
};

// legado: foco -> novo: estudos
export const EstudosPage: React.FC<EstudosPageProps> = ({
  darkMode = false,
  banner,
  isBlocked,
  blockedTitle,
  blockedDescription,
  showQuestionTransitionState,
  questionTransitionTitle,
  questionTransitionDescription,
  showPostFocusState,
  postSessionState,
  preferredStudyTrack,
  onTrackChange,
  hybridEnemWeight,
  hybridConcursoWeight,
  onHybridEnemWeightChange,
  weeklyGoalMinutes,
  onWeeklyGoalMinutesChange,
  activeStudyMethodName,
  preferencesSyncStatus,
  lastPreferencesSyncAt,
  currentMode,
  onModeChange,
  timerSectionRef,
  pomodoroContent,
  freeTimerContent,
  currentBlockLabel,
  currentBlockDurationMinutes,
  currentBlockObjective,
  currentTargetQuestions,
  currentBlockSuggestedTopicCopy,
  profileContext = null,
  onFinishResult,
}) => {
  const safePostSessionBlockLabel = postSessionState
    ? normalizeBlockLabel(postSessionState.blockLabel)
    : null;
  const safeCurrentBlockLabel = normalizeBlockLabel(currentBlockLabel);

  const {
    session,
    isRunning,
    isFinishing,
    inputs,
    updateInputs,
    finish,
  } = useEstudos({
    currentBlockLabel,
    currentBlockObjective,
    currentBlockDurationMinutes,
    currentMode,
    weeklyGoalMinutes,
    currentTargetQuestions,
    isBlocked,
    showQuestionTransitionState,
    showPostFocusState,
  });
  const [isApplyingFinish, setIsApplyingFinish] = React.useState(false);

  const handleFinishRecord = React.useCallback(async (payload?: FinishPayload) => {
    if (!showPostFocusState) {
      return null;
    }

    const result = await finish(payload);
    if (!result) {
      return null;
    }

    if (onFinishResult) {
      setIsApplyingFinish(true);
      try {
        await onFinishResult(result, payload || {});
      } finally {
        setIsApplyingFinish(false);
      }
    }

    return result;
  }, [finish, onFinishResult, showPostFocusState]);

  const executionSummary = currentTargetQuestions > 0
    ? `${currentTargetQuestions} questoes previstas para validar este bloco.`
    : 'Bloco continuo preparado para hoje.';
  const executionModeLabel = currentMode === 'pomodoro' ? 'Pomodoro ativo' : 'Timer livre';
  const executionDurationLabel = currentBlockDurationMinutes > 0 ? `~${currentBlockDurationMinutes} min` : 'Sem duracao fixa';
  const safeCurrentObjective = normalizePresentationLabel(
    currentBlockObjective || 'Bloco oficial do dia',
    'Bloco oficial do dia',
  );
  const executionStatus =
    showPostFocusState
      ? 'ready_to_finish'
      : showQuestionTransitionState
        ? 'paused'
        : isBlocked
          ? 'idle'
          : isRunning
            ? 'running'
            : session.remainingSeconds < session.initialSeconds
              ? 'paused'
              : 'idle';
  const executionRailData = React.useMemo(() => ({
    eyebrow: 'Execucao do estudo',
    title: 'O bloco atual conduz esta sessao',
    description: executionSummary,
    blockChipLabel: safeCurrentBlockLabel,
    durationChipLabel: executionDurationLabel,
    modeChipLabel: executionModeLabel,
  }), [executionDurationLabel, executionModeLabel, executionSummary, safeCurrentBlockLabel]);
  const sessionHeaderData = React.useMemo<SessionHeaderData>(() => {
    return {
      contextLabel: safeCurrentBlockLabel,
      sessionTypeLabel:
        showPostFocusState
          ? 'Fechamento'
          : showQuestionTransitionState
            ? 'Validacao'
            : currentTargetQuestions > 0
              ? 'Sessao focada'
              : 'Estudo guiado',
      title: resolveSessionTitle(
        safeCurrentObjective,
        safeCurrentBlockLabel,
        isBlocked,
        showQuestionTransitionState,
        showPostFocusState,
        currentTargetQuestions,
      ),
      status: executionStatus,
      statusLabel:
        showQuestionTransitionState
          ? 'Questoes a seguir'
          : isBlocked
            ? 'Aguardando liberacao'
            : undefined,
      plannedMinutes: currentBlockDurationMinutes > 0 ? currentBlockDurationMinutes : undefined,
      currentStepLabel:
        showPostFocusState
          ? 'Fechamento do bloco'
          : showQuestionTransitionState
            ? 'Transicao do foco para pratica'
            : currentTargetQuestions > 0
              ? `${currentTargetQuestions} questoes depois do foco`
              : executionModeLabel,
      progressLabel:
        showPostFocusState
          ? 'Registro final pronto'
          : !isBlocked && !showQuestionTransitionState && currentTargetQuestions > 0
            ? `${currentTargetQuestions} questoes previstas`
            : undefined,
      primaryActionLabel: banner.primaryActionLabel,
      onPrimaryAction: banner.onPrimaryAction,
      primaryActionDisabled: banner.primaryActionDisabled,
      secondaryActionLabel: banner.secondaryActionLabel,
      onSecondaryAction: banner.onSecondaryAction,
    };
  }, [
    banner.onPrimaryAction,
    banner.onSecondaryAction,
    banner.primaryActionDisabled,
    banner.primaryActionLabel,
    banner.secondaryActionLabel,
    currentBlockDurationMinutes,
    currentTargetQuestions,
    executionStatus,
    executionModeLabel,
    executionSummary,
    isBlocked,
    safeCurrentBlockLabel,
    safeCurrentObjective,
    showPostFocusState,
    showQuestionTransitionState,
  ]);
  const executionCoreData = React.useMemo<ExecutionCoreData>(() => {
    const stepLabel = showPostFocusState
      ? 'Etapa 3 de 3'
      : showQuestionTransitionState
        ? 'Etapa 2 de 3'
        : 'Etapa 1 de 3';
    const progressPercent = showPostFocusState ? 100 : showQuestionTransitionState ? 72 : 38;

    return {
      status: executionStatus,
      timerLabel:
        showPostFocusState
          ? 'Fechamento pronto'
          : showQuestionTransitionState
            ? 'Validacao em seguida'
            : executionDurationLabel,
      timerStateLabel:
        showPostFocusState
          ? 'Sessao pronta para encerrar'
          : executionStatus === 'running'
            ? 'Sessao em andamento'
            : executionStatus === 'paused'
              ? 'Sessao pausada'
              : 'Sessao pronta para comecar',
      primaryGoal: resolveExecutionGoal(
        safeCurrentObjective,
        safeCurrentBlockLabel,
        isBlocked,
        showQuestionTransitionState,
        showPostFocusState,
        currentTargetQuestions,
      ),
      currentStepLabel: stepLabel,
      progressLabel:
        showPostFocusState
          ? 'Registro final pronto'
          : currentTargetQuestions > 0
            ? `${currentTargetQuestions} questoes previstas`
            : 'Bloco principal em foco',
      secondaryProgressLabel:
        showPostFocusState
          ? 'Feche o registro para alimentar revisoes e home.'
          : showQuestionTransitionState
            ? 'O foco terminou. Agora a sessao continua na pratica.'
            : executionSummary,
      progressPercent,
      emphasisLevel:
        showPostFocusState
          ? 'urgent'
          : executionStatus === 'paused'
            ? 'calm'
            : 'default',
    };
  }, [
    currentTargetQuestions,
    executionDurationLabel,
    executionStatus,
    executionSummary,
    isBlocked,
    safeCurrentBlockLabel,
    safeCurrentObjective,
    showPostFocusState,
    showQuestionTransitionState,
  ]);
  const supportRailData = React.useMemo<SupportRailData>(() => {
    const checklistProgressLabel = showPostFocusState
      ? '3 de 3 prontas'
      : showQuestionTransitionState
        ? '2 de 3 prontas'
        : isBlocked
          ? 'Aguardando liberacao'
          : '1 de 3 em andamento';

    return {
      intro: showPostFocusState
        ? 'Use esta coluna so para revisar as etapas finais e registrar o bloco concluido.'
        : 'Consulte esta coluna apenas para acompanhar etapas e fechar o registro quando o bloco terminar.',
      checklist: {
        title: 'Checklist da sessao',
        progressLabel: checklistProgressLabel,
        items: [
          {
            id: 'focus',
            label: 'Executar o bloco principal',
            status: isBlocked ? 'pending' : showQuestionTransitionState || showPostFocusState ? 'completed' : 'active',
            detail: isBlocked ? 'Libere o plano do dia para abrir a sessao.' : !showQuestionTransitionState && !showPostFocusState ? executionSummary : undefined,
          },
          {
            id: 'practice',
            label: currentTargetQuestions > 0 ? `Validar com ${currentTargetQuestions} questoes` : 'Validar o bloco',
            status: showPostFocusState ? 'completed' : showQuestionTransitionState ? 'active' : 'pending',
            detail: showQuestionTransitionState ? 'A pratica entra logo depois do foco.' : undefined,
          },
          {
            id: 'closure',
            label: 'Registrar e encerrar a sessao',
            status: showPostFocusState ? 'active' : 'pending',
            detail: showPostFocusState ? 'Paginas, aulas e dificuldade fecham o ciclo.' : undefined,
          },
        ],
      },
      closure: {
        title: 'Fechamento',
        message: showPostFocusState
          ? 'Falta so registrar o que saiu deste bloco para encerrar a sessao.'
          : showQuestionTransitionState
            ? 'Depois da validacao, o fechamento desta sessao fica disponivel aqui.'
            : isBlocked
              ? 'O fechamento aparece depois que o bloco do dia estiver liberado.'
              : executionStatus === 'paused'
                ? 'Retome o bloco quando estiver pronto. O fechamento continua reservado para o final.'
                : 'Conclua o foco e volte aqui apenas para registrar o que saiu desta sessao.',
        actionLabel: showPostFocusState ? 'Encerrar assim que preencher' : 'Fechamento liberado no fim do bloco',
        emphasis: showPostFocusState ? 'calm' : 'subtle',
      },
    };
  }, [
    currentTargetQuestions,
    executionStatus,
    executionSummary,
    isBlocked,
    showPostFocusState,
    showQuestionTransitionState,
  ]);
  const postExecutionBandData = React.useMemo<PostExecutionBandData>(() => {
    const sequenceLabel = showPostFocusState
      ? 'Etapa 3 de 3'
      : showQuestionTransitionState
        ? 'Etapa 2 de 3'
        : 'Etapa 1 de 3';
    const trackLabel = resolveTrackLabel(
      preferredStudyTrack,
      hybridEnemWeight,
      hybridConcursoWeight,
    );

    return {
      context: {
        contextLabel: `${safeCurrentBlockLabel} / ${safeCurrentObjective}`,
        parentLabel: `${trackLabel} / ${activeStudyMethodName}`,
        sequenceLabel: `${sequenceLabel} / ${weeklyGoalMinutes} min na semana`,
      },
      continuity: {
        nextStepLabel:
          showPostFocusState
            ? 'Proximo: registrar o aprendizado e encerrar este bloco.'
            : showQuestionTransitionState
              ? currentTargetQuestions > 0
                ? `Proximo: validar ${currentTargetQuestions} questoes antes do fechamento.`
                : 'Proximo: validar o bloco antes do fechamento.'
              : isBlocked
                ? 'Proximo: liberar o plano do dia para abrir esta sessao.'
                : currentTargetQuestions > 0
                  ? `Depois desta sessao: validar ${currentTargetQuestions} questoes e registrar o bloco.`
                  : 'Depois desta sessao: registrar o bloco e seguir para a proxima etapa.',
        followUpLabel:
          showPostFocusState
            ? 'Depois do registro, revisoes e proximos blocos entram na fila sem abrir novas escolhas.'
            : showQuestionTransitionState
              ? 'A pratica fecha o foco atual e prepara o registro final da sessao.'
              : isBlocked
                ? 'Quando o bloco estiver liberado, o foco principal volta para o centro da tela.'
                : currentBlockSuggestedTopicCopy || 'A continuidade aparece aqui so para fechar o fluxo desta sessao com o plano maior.',
        progressHintLabel:
          showPostFocusState
            ? 'Fechamento pronto para alimentar Home e Plano'
            : showQuestionTransitionState
              ? 'Retome deste ponto e conclua a etapa restante'
              : isBlocked
                ? 'Ciclo reservado para este bloco'
                : `Ritmo ativo: ${activeStudyMethodName}`,
      },
    };
  }, [
    activeStudyMethodName,
    currentBlockSuggestedTopicCopy,
    currentTargetQuestions,
    hybridConcursoWeight,
    hybridEnemWeight,
    isBlocked,
    preferredStudyTrack,
    safeCurrentBlockLabel,
    safeCurrentObjective,
    showPostFocusState,
    showQuestionTransitionState,
    weeklyGoalMinutes,
  ]);
  const studyPresentation = React.useMemo(
    () => buildStudyTrackPresentation({
      sessionHeader: sessionHeaderData,
      executionCore: executionCoreData,
      supportRail: supportRailData,
      postExecutionBand: postExecutionBandData,
      executionRail: executionRailData,
      preferredStudyTrack,
      context: profileContext,
      state: {
        currentBlockLabel: safeCurrentBlockLabel,
        currentBlockObjective: safeCurrentObjective,
        currentTargetQuestions,
        activeStudyMethodName,
        isBlocked,
        showQuestionTransitionState,
        showPostFocusState,
      },
    }),
    [
      activeStudyMethodName,
      currentTargetQuestions,
      executionCoreData,
      executionRailData,
      isBlocked,
      postExecutionBandData,
      preferredStudyTrack,
      profileContext,
      safeCurrentBlockLabel,
      safeCurrentObjective,
      sessionHeaderData,
      showPostFocusState,
      showQuestionTransitionState,
      supportRailData,
    ],
  );

  return (
    <div className="space-y-5">
      <SessionHeader data={studyPresentation.sessionHeader} darkMode={darkMode} />

      {isBlocked ? (
        <div className={`rounded-[28px] border p-5 shadow-[0_18px_34px_rgba(251,191,36,0.16)] sm:p-6 ${
          darkMode
            ? 'border-amber-900/80 bg-[linear-gradient(135deg,rgba(69,26,3,0.96)_0%,rgba(120,53,15,0.68)_100%)] shadow-[0_18px_34px_rgba(120,53,15,0.38)]'
            : 'border-amber-200/85 bg-[linear-gradient(135deg,rgba(248,240,223,0.98)_0%,rgba(239,223,186,0.88)_100%)]'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${
            darkMode ? 'text-amber-300' : 'text-amber-700'
          }`}>
            Execucao protegida
          </p>
          <h2 className={`mt-2 text-2xl font-bold tracking-tight ${
            darkMode ? 'text-amber-50' : 'text-amber-950'
          }`}>
            {blockedTitle}
          </h2>
          <p className={`mt-2 text-sm ${
            darkMode ? 'text-amber-100/88' : 'text-amber-900/82'
          }`}>{blockedDescription}</p>
        </div>
      ) : showQuestionTransitionState ? (
        <div className={`rounded-[28px] border p-5 shadow-[0_18px_34px_rgba(56,189,248,0.16)] transition-all duration-200 ease-out sm:p-6 ${
          darkMode
            ? 'border-sky-900/80 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(12,74,110,0.60)_100%)] shadow-[0_18px_34px_rgba(14,116,144,0.34)]'
            : 'border-sky-200/85 bg-[linear-gradient(135deg,rgba(232,242,250,0.98)_0%,rgba(214,232,244,0.88)_100%)]'
        }`}>
          <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
            darkMode ? 'text-sky-300' : 'text-sky-700'
          }`}>
            <span className="h-2 w-2 rounded-full bg-sky-500 motion-safe:animate-pulse" />
            Transicao
          </p>
          <h2 className={`mt-2 text-2xl font-bold tracking-tight ${
            darkMode ? 'text-sky-50' : 'text-sky-950'
          }`}>
            {questionTransitionTitle}
          </h2>
          <p className={`mt-2 text-sm ${darkMode ? 'text-sky-100/88' : 'text-sky-900/82'}`}>
            {questionTransitionDescription}
          </p>
        </div>
      ) : showPostFocusState && postSessionState ? (
        <div className={`rounded-[28px] border p-5 shadow-[0_18px_34px_rgba(16,185,129,0.16)] transition-all duration-200 ease-out sm:p-6 ${
          darkMode
            ? 'border-emerald-900/80 bg-[linear-gradient(135deg,rgba(2,44,34,0.96)_0%,rgba(6,78,59,0.60)_100%)] shadow-[0_18px_34px_rgba(4,120,87,0.32)]'
            : 'border-emerald-200/85 bg-[linear-gradient(135deg,rgba(229,243,237,0.98)_0%,rgba(207,233,220,0.88)_100%)]'
        }`}>
          <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
            darkMode ? 'text-emerald-300' : 'text-emerald-700'
          }`}>
            <CheckCircle2 className="h-4 w-4" />
            Depois do foco
          </p>
          <h2 className={`mt-2 text-2xl font-bold tracking-tight ${
            darkMode ? 'text-emerald-50' : 'text-emerald-950'
          }`}>
            Sessao concluida
          </h2>
          <p className={`mt-2 truncate text-sm font-semibold ${
            darkMode ? 'text-emerald-50' : 'text-emerald-950'
          }`} title={safePostSessionBlockLabel || undefined}>
            {safePostSessionBlockLabel ? truncatePresentationLabel(safePostSessionBlockLabel, 28, safePostSessionBlockLabel) : postSessionState.blockLabel}
          </p>
          <p className={`mt-1 text-sm ${darkMode ? 'text-emerald-100/88' : 'text-emerald-900/82'}`}>
            {postSessionState.progressCopy}
          </p>
          <p className={`mt-1 text-sm ${darkMode ? 'text-emerald-100/74' : 'text-emerald-900/74'}`}>
            {postSessionState.weeklyProgressCopy}
          </p>
          <p className={`mt-3 text-sm ${darkMode ? 'text-emerald-100/88' : 'text-emerald-900/82'}`}>
            Voce focou em {safePostSessionBlockLabel || postSessionState.blockLabel}.
          </p>
          <p className={`mt-2 text-sm font-medium ${darkMode ? 'text-emerald-50' : 'text-emerald-900'}`}>
            {postSessionState.planConfidenceCopy}
          </p>
          <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-emerald-100/88' : 'text-emerald-900/82'}`}>
            {postSessionState.secondaryCopy}
          </p>
          {postSessionState.nextSuggestionCopy ? (
            <p className={`mt-2 text-xs ${darkMode ? 'text-emerald-100/64' : 'text-emerald-900/62'}`}>
              {postSessionState.nextSuggestionCopy}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={postSessionState.onPrimaryAction}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
            >
              {postSessionState.primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={postSessionState.onSecondaryAction}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                darkMode
                  ? 'border-emerald-800 bg-emerald-950/24 text-emerald-100 hover:bg-emerald-950/34'
                  : 'border-emerald-200 bg-white/78 text-emerald-800 hover:bg-emerald-100/70'
              }`}
            >
              Ajustar plano
            </button>
          </div>
          <div className="mt-6">
            <SessionInputs
              darkMode={darkMode}
              values={inputs}
              onChange={updateInputs}
              onFinish={handleFinishRecord}
              loading={isFinishing || isApplyingFinish}
              finishEnabled
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5" data-testid="study-page-layout">
          <WorkspaceLayout
            contentClassName="space-y-4"
            rightPanelClassName="space-y-3 xl:top-4 xl:max-w-[304px]"
            rightPanel={(
              <SupportRail data={studyPresentation.supportRail} darkMode={darkMode}>
                <SessionInputs
                  darkMode={darkMode}
                  values={inputs}
                  onChange={updateInputs}
                  onFinish={handleFinishRecord}
                  loading={isFinishing || isApplyingFinish}
                  finishEnabled={showPostFocusState}
                  finishDisabledReason="Conclua o bloco no timer primeiro. O fechamento do registro entra depois da sessao concluida."
                  embedded
                  hideHeader
                />
              </SupportRail>
            )}
          >
            <section className="space-y-4" data-testid="study-main-flow">
              <section
                className={`rounded-[24px] border px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)] ${
                  darkMode
                    ? 'border-slate-800/90 bg-slate-950/82 shadow-[0_12px_24px_rgba(2,6,23,0.30)]'
                    : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(238,244,249,0.98)_0%,rgba(231,239,246,0.96)_100%)] shadow-[0_12px_24px_rgba(148,163,184,0.12)]'
                }`}
                data-testid="study-execution-rail"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        darkMode ? 'text-cyan-300/80' : 'text-cyan-700'
                      }`}>
                      {studyPresentation.executionRail.eyebrow}
                      </p>
                      <h2 className={`mt-2 text-[22px] font-bold tracking-[-0.03em] ${
                        darkMode ? 'text-slate-100' : 'text-slate-900'
                      }`}>
                      {studyPresentation.executionRail.title}
                      </h2>
                      <p className={`mt-1 text-sm ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                      {studyPresentation.executionRail.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-200/90 bg-white/78 text-slate-700'
                    }`}>
                      {studyPresentation.executionRail.blockChipLabel}
                    </span>
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-200/90 bg-white/78 text-slate-700'
                    }`}>
                      {studyPresentation.executionRail.durationChipLabel}
                    </span>
                    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-200/90 bg-white/78 text-slate-700'
                    }`}>
                      {studyPresentation.executionRail.modeChipLabel}
                    </span>
                  </div>
                </div>
              </section>

              <div data-testid="study-execution-panel">
                <ExecutionCore
                  darkMode={darkMode}
                  data={studyPresentation.executionCore}
                  currentMode={currentMode}
                  onModeChange={onModeChange}
                  timerSectionRef={timerSectionRef}
                  pomodoroContent={pomodoroContent}
                  freeTimerContent={freeTimerContent}
                />
              </div>
            </section>
          </WorkspaceLayout>

          <section
            className="pt-0.5"
            data-testid="study-support-strip"
          >
            <PostExecutionBand
              data={studyPresentation.postExecutionBand}
              darkMode={darkMode}
            />
          </section>
        </div>
      )}
    </div>
  );
};

export default EstudosPage;
