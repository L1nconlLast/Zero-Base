import type { StudySessionBlueprintBuilder } from '../sessionBlueprint';
import { buildQuestionValidationLabel, resolveSessionFocusLabel } from './shared';

const buildAcademicDescriptor = (course?: string | null, institution?: string | null) =>
  [course, institution].filter(Boolean).join(' / ');

export const buildFaculdadeStudySessionBlueprint: StudySessionBlueprintBuilder = ({
  context,
  state,
}) => {
  const focus = context.faculdade?.focus || 'rotina';
  const focusLabel = resolveSessionFocusLabel(state.currentBlockObjective, state.currentBlockLabel);
  const descriptor = buildAcademicDescriptor(
    context.faculdade?.course || null,
    context.faculdade?.institution || null,
  );

  if (focus === 'provas') {
    return {
      mode: 'exam_review',
      sessionTypeLabel: 'Preparacao para prova',
      title: `Revisar ${focusLabel} para ${state.currentBlockLabel}`,
      primaryGoal: `Fechar ${focusLabel} e registrar os pontos de maior risco para a prova.`,
      supportIntro: descriptor
        ? `Esta sessao existe para aproximar a prova atual dentro de ${descriptor}, priorizando o que mais pesa agora.`
        : 'Esta sessao existe para aproximar a prova atual, priorizando o que mais pesa agora.',
      checklistTitle: 'Checklist da prova',
      checklistItems: [
        {
          id: 'focus',
          label: `Rever ${focusLabel} com foco em prova`,
          detail: 'Entre primeiro no conteudo mais sensivel antes de ampliar a revisao.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Testar os pontos de maior risco'),
          detail: 'Use a validacao para medir seguranca real antes de encerrar.',
        },
        {
          id: 'closure',
          label: 'Registrar lacunas e o proximo reforco',
          detail: 'Feche a sessao deixando claro o que ainda precisa voltar antes da prova.',
        },
      ],
      closureTitle: 'Fechamento da prova',
      closureMessage: 'Feche a sessao registrando o que ficou seguro e o que ainda precisa de reforco para a prova.',
      closureActionLabel: 'Fechamento liberado no fim da revisao',
      postContextTitle: 'Contexto da prova atual',
      postParentLabel: descriptor
        ? `${descriptor} / Foco em provas`
        : 'Faculdade / Foco em provas',
      postContinuityTitle: 'Depois desta sessao de prova',
      postNextStepLabel: 'Depois desta sessao: priorize a revisao do que ainda ficou inseguro antes da avaliacao.',
      postFollowUpLabel: 'Use o proximo bloco para retomar o ponto de maior risco sem reabrir o plano inteiro.',
      postProgressHintLabel: 'Foco atual: provas',
      executionRailTitle: 'Esta prova atual conduz a sessao',
      executionRailDescription: `O bloco concentra energia em ${focusLabel} para chegar melhor preparado na avaliacao.`,
      executionRailBlockChipLabel: `Materia: ${state.currentBlockLabel}`,
    };
  }

  if (focus === 'trabalhos') {
    return {
      mode: 'assignment_execution',
      sessionTypeLabel: 'Bloco de trabalho',
      title: `Avancar ${focusLabel} em ${state.currentBlockLabel}`,
      primaryGoal: `Fechar um bloco concreto de ${focusLabel} e sair com o proximo passo da entrega definido.`,
      supportIntro: descriptor
        ? `Esta sessao transforma a entrega de ${descriptor} em um bloco executavel, sem deixar o trabalho abstrato demais.`
        : 'Esta sessao transforma a entrega atual em um bloco executavel, sem deixar o trabalho abstrato demais.',
      checklistTitle: 'Checklist da entrega',
      checklistItems: [
        {
          id: 'focus',
          label: `Abrir a parte principal de ${focusLabel}`,
          detail: 'Entre direto na parte que mais move a entrega para frente.',
        },
        {
          id: 'practice',
          label: 'Produzir ou organizar uma parte concreta do trabalho',
          detail: 'Vale texto, referencia, estrutura ou um trecho finalizado.',
        },
        {
          id: 'closure',
          label: 'Registrar o que ficou pronto e o proximo passo',
          detail: 'Feche a sessao deixando clara a proxima parte da entrega.',
        },
      ],
      closureTitle: 'Fechamento da entrega',
      closureMessage: 'Registre o que avancou no trabalho para a proxima retomada nao comecar do zero.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da entrega atual',
      postParentLabel: descriptor
        ? `${descriptor} / Foco em trabalhos`
        : 'Faculdade / Foco em trabalhos',
      postContinuityTitle: 'Depois desta sessao de entrega',
      postNextStepLabel: 'Depois desta sessao: retome a proxima parte do trabalho sem voltar ao planejamento inicial.',
      postFollowUpLabel: 'Mantenha a entrega quebrada em blocos curtos para nao perder tracao entre uma sessao e outra.',
      postProgressHintLabel: 'Foco atual: trabalhos',
      executionRailTitle: 'Esta entrega conduz a sessao',
      executionRailDescription: `O bloco foi montado para tirar ${focusLabel} do papel em uma sessao concreta.`,
      executionRailBlockChipLabel: `Entrega: ${state.currentBlockLabel}`,
    };
  }

  return {
    mode: 'routine',
    sessionTypeLabel: 'Rotina academica',
    title: `Cobrir ${focusLabel} em ${state.currentBlockLabel}`,
    primaryGoal: `Manter ${state.currentBlockLabel} em dia e sair com o proximo topico da semana claro.`,
    supportIntro: descriptor
      ? `Esta sessao protege a rotina academica de ${descriptor}, cobrindo a materia sem acumular pendencias.`
      : 'Esta sessao protege sua rotina academica, cobrindo a materia sem acumular pendencias.',
    checklistTitle: 'Checklist da rotina academica',
    checklistItems: [
      {
        id: 'focus',
        label: `Rever a aula ou leitura principal de ${focusLabel}`,
        detail: 'Use o bloco para fechar o ponto central da semana antes de abrir desvios.',
      },
      {
        id: 'practice',
        label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Consolidar o ponto central da materia'),
        detail: 'A consolidacao pode ser uma questao, exemplo resolvido ou pequena retomada do que foi visto.',
      },
      {
        id: 'closure',
        label: 'Registrar o que avancou e o proximo topico',
        detail: 'Feche a sessao deixando facil a retomada da disciplina.',
      },
    ],
    closureTitle: 'Fechamento academico',
    closureMessage: 'Registre o que ficou em dia nesta materia e o que deve abrir a proxima sessao da rotina.',
    closureActionLabel: 'Fechamento liberado no fim do bloco',
    postContextTitle: 'Contexto da rotina academica',
    postParentLabel: descriptor
      ? `${descriptor} / Rotina academica`
      : 'Faculdade / Rotina academica',
    postContinuityTitle: 'Depois desta sessao da rotina',
    postNextStepLabel: 'Depois desta sessao: siga para a proxima materia da semana ou retome o ponto que ficou aberto.',
    postFollowUpLabel: 'A continuidade deve manter a semana fluindo, sem transformar a sessao em acumulado.',
    postProgressHintLabel: 'Foco atual: rotina',
    executionRailTitle: 'Esta materia da semana conduz a sessao',
    executionRailDescription: `O bloco ajuda a manter ${state.currentBlockLabel} em dia dentro da rotina academica.`,
    executionRailBlockChipLabel: `Materia: ${state.currentBlockLabel}`,
  };
};

export default buildFaculdadeStudySessionBlueprint;
