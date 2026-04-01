import type { StudySessionBlueprintBuilder } from '../sessionBlueprint';
import { buildQuestionValidationLabel, formatBlueprintDate, resolveSessionFocusLabel } from './shared';

const resolveEnemLevel = (
  triedBefore?: 'sim' | 'nao' | null,
  profileLevel?: 'iniciante' | 'intermediario' | 'avancado' | null,
): 'iniciante' | 'intermediario' | 'avancado' => {
  if (profileLevel) {
    return profileLevel;
  }

  if (triedBefore === 'nao') {
    return 'iniciante';
  }

  return 'intermediario';
};

const buildTargetLabel = (course?: string | null, college?: string | null) =>
  [course, college].filter(Boolean).join(' / ');

export const buildEnemStudySessionBlueprint: StudySessionBlueprintBuilder = ({
  context,
  state,
}) => {
  const level = resolveEnemLevel(
    context.enem?.triedBefore || null,
    context.enem?.profileLevel || null,
  );
  const targetLabel = buildTargetLabel(
    context.enem?.targetCourse || null,
    context.enem?.targetCollege || null,
  );
  const examDateLabel = formatBlueprintDate(context.examDate);
  const focusLabel = resolveSessionFocusLabel(state.currentBlockObjective, state.currentBlockLabel);
  const isAdvancedExamBlock = level === 'avancado' && state.currentTargetQuestions >= 8;
  const isPractice = !isAdvancedExamBlock && state.currentTargetQuestions > 0 && level !== 'iniciante';

  if (isAdvancedExamBlock) {
    return {
      mode: 'exam_block',
      sessionTypeLabel: 'Bloco de prova',
      title: `Treinar bloco de prova em ${state.currentBlockLabel}`,
      primaryGoal: `Simular ritmo de prova em ${state.currentBlockLabel} e sair com ajuste fino para os proximos blocos.`,
      supportIntro: targetLabel
        ? `Esta sessao puxa ${targetLabel} para um treino mais proximo da prova real, com foco em ritmo e decisao.`
        : 'Esta sessao puxa a preparacao para um treino mais proximo da prova real, com foco em ritmo e decisao.',
      checklistTitle: 'Checklist do bloco de prova',
      checklistItems: [
        {
          id: 'focus',
          label: `Entrar no bloco de prova de ${state.currentBlockLabel}`,
          detail: 'Use o tempo para simular o comportamento de prova, nao so revisar teoria.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Fechar o treino com cara de prova'),
          detail: 'A validacao precisa refletir ritmo, selecao de questoes e controle de erro.',
        },
        {
          id: 'closure',
          label: 'Registrar ajustes finos para a proxima prova',
          detail: 'Feche o bloco apontando o que muda no proximo treino de prova.',
        },
      ],
      closureTitle: 'Fechamento do bloco de prova',
      closureMessage: 'Registre o que travou no ritmo de prova e o ajuste fino que deve entrar no proximo treino.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da preparacao ENEM',
      postParentLabel: targetLabel
        ? `ENEM / ${targetLabel}`
        : 'ENEM / Treino de prova',
      postContinuityTitle: 'Depois deste bloco ENEM',
      postNextStepLabel: 'Depois desta sessao: volte ao ponto que mais derrubou seu rendimento no treino de prova.',
      postFollowUpLabel: examDateLabel
        ? `Use o proximo bloco para ajustar a prova antes de ${examDateLabel}.`
        : 'Use o proximo bloco para ajustar a prova sem perder ritmo.',
      postProgressHintLabel: 'Modo atual: bloco de prova',
      executionRailTitle: 'Este bloco de prova conduz a sessao',
      executionRailDescription: `A sessao aproxima ${state.currentBlockLabel} do formato real da prova do ENEM.`,
      executionRailBlockChipLabel: `Area: ${state.currentBlockLabel}`,
    };
  }

  if (isPractice) {
    return {
      mode: 'practice',
      sessionTypeLabel: 'Pratica ENEM',
      title: `Resolver ${state.currentTargetQuestions} questoes de ${state.currentBlockLabel}`,
      primaryGoal: `Aplicar ${focusLabel} em questoes e medir seguranca real antes de mudar de area.`,
      supportIntro: targetLabel
        ? `Esta sessao usa questoes para aproximar ${targetLabel} de um desempenho mais consistente no ENEM.`
        : 'Esta sessao usa questoes para transformar o bloco atual em preparo real para o ENEM.',
      checklistTitle: 'Checklist da pratica ENEM',
      checklistItems: [
        {
          id: 'focus',
          label: `Retomar ${focusLabel} antes das questoes`,
          detail: 'Entre no bloco com a ideia central fresca antes de validar.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Aplicar o bloco em questoes'),
          detail: 'A pratica deve mostrar se o conteudo saiu da teoria e entrou em resolucao.',
        },
        {
          id: 'closure',
          label: 'Registrar erros e o proximo reforco',
          detail: 'Feche a sessao apontando o ajuste que mais move a sua prova.',
        },
      ],
      closureTitle: 'Fechamento da pratica ENEM',
      closureMessage: 'Registre onde voce acertou o ritmo e qual erro ainda precisa voltar no proximo bloco.',
      closureActionLabel: 'Fechamento liberado no fim da pratica',
      postContextTitle: 'Contexto da pratica ENEM',
      postParentLabel: targetLabel
        ? `ENEM / ${targetLabel}`
        : 'ENEM / Pratica guiada',
      postContinuityTitle: 'Depois desta pratica ENEM',
      postNextStepLabel: 'Depois desta sessao: revise o erro dominante antes de abrir outro bloco de questoes.',
      postFollowUpLabel: 'A continuidade aqui deve reforcar o ponto que mais apareceu nas questoes.',
      postProgressHintLabel: 'Modo atual: pratica ENEM',
      executionRailTitle: 'Este bloco de questoes conduz a sessao',
      executionRailDescription: `A sessao valida ${focusLabel} em formato de prova, sem sair da area atual.`,
      executionRailBlockChipLabel: `Area: ${state.currentBlockLabel}`,
    };
  }

  if (level === 'iniciante') {
    return {
      mode: 'foundation',
      sessionTypeLabel: 'Fundamentos da area',
      title: `Construir base em ${state.currentBlockLabel}`,
      primaryGoal: `Firmar a base de ${focusLabel} antes de aumentar a carga de questoes do ENEM.`,
      supportIntro: targetLabel
        ? `Esta sessao segura a base de ${targetLabel} com menos pressa e mais estrutura para o ENEM.`
        : 'Esta sessao segura a base da area com menos pressa e mais estrutura para o ENEM.',
      checklistTitle: 'Checklist dos fundamentos',
      checklistItems: [
        {
          id: 'focus',
          label: `Entender o nucleo de ${focusLabel}`,
          detail: 'Entre no conceito central antes de se preocupar com cobertura ampla.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Consolidar a base da area'),
          detail: 'A consolidacao aqui serve para confirmar entendimento, nao para acelerar prova.',
        },
        {
          id: 'closure',
          label: 'Registrar o proximo fundamento da area',
          detail: 'Feche a sessao com o proximo ponto-base ja definido.',
        },
      ],
      closureTitle: 'Fechamento dos fundamentos',
      closureMessage: 'Registre o que ficou claro na base da area e qual fundamento deve abrir a proxima sessao.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da base ENEM',
      postParentLabel: targetLabel
        ? `ENEM / ${targetLabel}`
        : 'ENEM / Construindo base',
      postContinuityTitle: 'Depois desta sessao de base',
      postNextStepLabel: 'Depois desta sessao: avance para o proximo fundamento sem acelerar a carga antes da hora.',
      postFollowUpLabel: examDateLabel
        ? `A preparacao segue crescendo em direcao a ${examDateLabel}, sem pular etapas da base.`
        : 'A preparacao segue crescendo sem pular etapas da base.',
      postProgressHintLabel: 'Modo atual: fundamentos',
      executionRailTitle: 'Esta base da area conduz a sessao',
      executionRailDescription: `O bloco monta fundamento real em ${state.currentBlockLabel} antes de empurrar mais pressao de prova.`,
      executionRailBlockChipLabel: `Area: ${state.currentBlockLabel}`,
    };
  }

  return {
    mode: 'review',
    sessionTypeLabel: 'Revisao ENEM',
    title: `Reforcar ${focusLabel} em ${state.currentBlockLabel}`,
    primaryGoal: `Revisar ${focusLabel} e sair com a area pronta para a proxima rodada de questoes.`,
    supportIntro: targetLabel
      ? `Esta sessao reforca o que mais importa para ${targetLabel}, mantendo a preparacao do ENEM ativa.`
      : 'Esta sessao reforca o bloco atual para manter a preparacao do ENEM consistente.',
    checklistTitle: 'Checklist da revisao ENEM',
    checklistItems: [
      {
        id: 'focus',
        label: `Retomar os pontos-chave de ${focusLabel}`,
        detail: 'Comece pelo que mais tende a desaparecer se ficar muito tempo sem voltar.',
      },
      {
        id: 'practice',
        label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Confirmar o bloco com uma retomada curta'),
        detail: 'A revisao deve sair com um sinal claro de retencao, nao so com leitura passiva.',
      },
      {
        id: 'closure',
        label: 'Registrar o que ainda precisa de reforco',
        detail: 'Feche a sessao deixando claro qual ponto volta antes da proxima pratica.',
      },
    ],
    closureTitle: 'Fechamento da revisao ENEM',
    closureMessage: 'Registre o que ficou firme na revisao e o que ainda pede uma nova passada antes da prova.',
    closureActionLabel: 'Fechamento liberado no fim da revisao',
    postContextTitle: 'Contexto da revisao ENEM',
    postParentLabel: targetLabel
      ? `ENEM / ${targetLabel}`
      : 'ENEM / Revisao guiada',
    postContinuityTitle: 'Depois desta revisao ENEM',
    postNextStepLabel: 'Depois desta sessao: leve a area revisada para um bloco de pratica ou para outro ponto-chave.',
    postFollowUpLabel: 'A continuidade deve transformar a revisao em proximos acertos, nao so em mais teoria.',
    postProgressHintLabel: 'Modo atual: revisao ENEM',
    executionRailTitle: 'Esta revisao da area conduz a sessao',
    executionRailDescription: `O bloco recupera ${focusLabel} para manter ${state.currentBlockLabel} pronto para a prova.`,
    executionRailBlockChipLabel: `Area: ${state.currentBlockLabel}`,
  };
};

export default buildEnemStudySessionBlueprint;
