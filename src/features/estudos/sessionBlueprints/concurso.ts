import { resolveContestLabel } from '../../../utils/trackNarrative';
import type { StudySessionBlueprintBuilder } from '../sessionBlueprint';
import { buildQuestionValidationLabel, formatBlueprintDate, getDaysUntilDate, resolveSessionFocusLabel } from './shared';

const resolveConcursoLevel = (
  experienceLevel?: 'iniciante' | 'intermediario' | 'avancado' | null,
): 'iniciante' | 'intermediario' | 'avancado' => experienceLevel || 'intermediario';

export const buildConcursoStudySessionBlueprint: StudySessionBlueprintBuilder = ({
  context,
  state,
}) => {
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const boardLabel = context.concurso?.board || null;
  const level = resolveConcursoLevel(context.concurso?.experienceLevel || null);
  const examDate = context.concurso?.examDate || context.examDate || null;
  const examDateLabel = formatBlueprintDate(examDate);
  const daysUntilExam = getDaysUntilDate(examDate);
  const focusLabel = resolveSessionFocusLabel(state.currentBlockObjective, state.currentBlockLabel);
  const isFinalSprint = typeof daysUntilExam === 'number' && daysUntilExam >= 0 && daysUntilExam <= 45;
  const isBoardQuestions = !isFinalSprint && Boolean(boardLabel) && state.currentTargetQuestions > 0;
  const isBase = !isFinalSprint && !isBoardQuestions && (level === 'iniciante' || Boolean(context.concurso?.planningWithoutDate));

  if (isFinalSprint) {
    return {
      mode: 'final_sprint',
      sessionTypeLabel: 'Reta final',
      title: `Ajuste final em ${state.currentBlockLabel}`,
      primaryGoal: `Fechar ${focusLabel} com foco de reta final para chegar melhor em ${contestLabel}.`,
      supportIntro: examDateLabel
        ? `Esta sessao encurta a distancia para ${contestLabel}, organizando a reta final antes de ${examDateLabel}.`
        : `Esta sessao encurta a distancia para ${contestLabel}, organizando a reta final do edital.`,
      checklistTitle: 'Checklist da reta final',
      checklistItems: [
        {
          id: 'focus',
          label: `Rever o ponto mais sensivel de ${focusLabel}`,
          detail: 'Entre primeiro no que ainda derruba rendimento na prova.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Validar a disciplina em ritmo de reta final'),
          detail: 'A validacao aqui precisa indicar confianca real para a prova.',
        },
        {
          id: 'closure',
          label: 'Registrar ajuste fino para o proximo bloco',
          detail: 'Feche a sessao deixando claro o ultimo ponto que ainda pede retorno.',
        },
      ],
      closureTitle: 'Fechamento da reta final',
      closureMessage: 'Registre o ajuste fino que ainda falta antes da prova e o que ja pode sair da disputa de atencao.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da reta final',
      postParentLabel: boardLabel
        ? `${contestLabel} / ${boardLabel}`
        : `${contestLabel} / Reta final`,
      postContinuityTitle: 'Depois desta sessao do concurso',
      postNextStepLabel: 'Depois desta sessao: volte apenas ao ponto que ainda ameaca a prova, sem reabrir o edital inteiro.',
      postFollowUpLabel: examDateLabel
        ? `A continuidade precisa proteger o que mais pesa ate ${examDateLabel}.`
        : 'A continuidade precisa proteger o que mais pesa na reta final.',
      postProgressHintLabel: 'Modo atual: reta final',
      executionRailTitle: 'Este bloco de reta final conduz a sessao',
      executionRailDescription: `O bloco comprime a revisao do edital em ${state.currentBlockLabel} para o momento mais proximo da prova.`,
      executionRailBlockChipLabel: `Disciplina: ${state.currentBlockLabel}`,
    };
  }

  if (isBoardQuestions) {
    return {
      mode: 'board_questions',
      sessionTypeLabel: 'Questoes da banca',
      title: `Resolver ${state.currentTargetQuestions} questoes de ${boardLabel}`,
      primaryGoal: `Aplicar ${focusLabel} no estilo ${boardLabel} e medir aderencia real a banca.`,
      supportIntro: `Esta sessao usa ${contestLabel} para puxar a disciplina para o formato de ${boardLabel}, sem sair do edital.`,
      checklistTitle: 'Checklist da banca',
      checklistItems: [
        {
          id: 'focus',
          label: `Retomar ${focusLabel} antes das questoes`,
          detail: 'Entre no estilo da banca com o criterio principal da disciplina bem visivel.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, `Resolver a disciplina no estilo ${boardLabel}`),
          detail: 'A pratica deve refletir a banca, nao so a materia isolada.',
        },
        {
          id: 'closure',
          label: 'Registrar padroes de erro da banca',
          detail: 'Feche a sessao deixando claro o tipo de armadilha que mais apareceu.',
        },
      ],
      closureTitle: 'Fechamento da banca',
      closureMessage: `Registre o que a banca ${boardLabel} cobrou de voce e qual ajuste precisa voltar no proximo bloco.`,
      closureActionLabel: 'Fechamento liberado no fim das questoes',
      postContextTitle: 'Contexto das questoes da banca',
      postParentLabel: `${contestLabel} / ${boardLabel}`,
      postContinuityTitle: 'Depois desta sessao da banca',
      postNextStepLabel: 'Depois desta sessao: revise o padrao de erro dominante antes de abrir outro bloco da banca.',
      postFollowUpLabel: 'A continuidade deve aproveitar o que as questoes mostraram sobre o edital.',
      postProgressHintLabel: `Modo atual: ${boardLabel}`,
      executionRailTitle: 'Este bloco de banca conduz a sessao',
      executionRailDescription: `A sessao valida ${state.currentBlockLabel} no estilo real de ${boardLabel}.`,
      executionRailBlockChipLabel: `Disciplina: ${state.currentBlockLabel}`,
    };
  }

  if (isBase) {
    return {
      mode: 'contest_base',
      sessionTypeLabel: 'Base do edital',
      title: `Construir base em ${state.currentBlockLabel}`,
      primaryGoal: `Firmar ${focusLabel} dentro do edital antes de aumentar a pressao de questoes.`,
      supportIntro: context.concurso?.planningWithoutDate
        ? `Esta sessao monta base para ${contestLabel} mesmo sem data fechada, priorizando constancia e estrutura do edital.`
        : `Esta sessao monta base para ${contestLabel}, organizando a disciplina antes de acelerar o ritmo do edital.`,
      checklistTitle: 'Checklist da base do edital',
      checklistItems: [
        {
          id: 'focus',
          label: `Entender o nucleo de ${focusLabel}`,
          detail: 'Comece pelo conceito central da disciplina antes de ampliar a cobertura.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Consolidar a base da disciplina'),
          detail: 'A consolidacao aqui serve para dar estrutura ao edital, nao para forcar ritmo cedo demais.',
        },
        {
          id: 'closure',
          label: 'Registrar o proximo ponto-base do edital',
          detail: 'Feche a sessao com a proxima disciplina ou subtopo ja definido.',
        },
      ],
      closureTitle: 'Fechamento da base do edital',
      closureMessage: 'Registre o que ficou claro na base da disciplina e qual parte do edital deve abrir o proximo bloco.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da base do edital',
      postParentLabel: boardLabel
        ? `${contestLabel} / ${boardLabel}`
        : `${contestLabel} / Base do edital`,
      postContinuityTitle: 'Depois desta sessao do edital',
      postNextStepLabel: 'Depois desta sessao: avance para o proximo ponto-base sem forcar intensidade antes da hora.',
      postFollowUpLabel: 'A continuidade deve ampliar o edital com constancia antes de virar reta final.',
      postProgressHintLabel: 'Modo atual: base do edital',
      executionRailTitle: 'Esta base do edital conduz a sessao',
      executionRailDescription: `O bloco firma ${state.currentBlockLabel} como parte solida do edital atual.`,
      executionRailBlockChipLabel: `Disciplina: ${state.currentBlockLabel}`,
    };
  }

  return {
    mode: 'discipline_review',
    sessionTypeLabel: 'Revisao da disciplina',
    title: `Reforcar ${focusLabel} em ${state.currentBlockLabel}`,
    primaryGoal: `Revisar ${focusLabel} e deixar a disciplina pronta para o proximo bloco do edital.`,
    supportIntro: boardLabel
      ? `Esta sessao reforca a disciplina dentro de ${contestLabel}, mantendo o olhar da banca ${boardLabel}.`
      : `Esta sessao reforca a disciplina dentro de ${contestLabel}, sem perder o fio do edital.`,
    checklistTitle: 'Checklist da disciplina',
    checklistItems: [
      {
        id: 'focus',
        label: `Retomar os pontos-chave de ${focusLabel}`,
        detail: 'Comece pelo que mais tende a voltar no edital se ficar tempo demais sem revisao.',
      },
      {
        id: 'practice',
        label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Confirmar a disciplina com uma retomada curta'),
        detail: 'A revisao deve sair com um sinal claro de retencao util para o edital.',
      },
      {
        id: 'closure',
        label: 'Registrar o proximo reforco da disciplina',
        detail: 'Feche a sessao apontando o proximo ajuste que mais move a prova.',
      },
    ],
    closureTitle: 'Fechamento da disciplina',
    closureMessage: 'Registre o que ficou firme na disciplina e o que ainda precisa de reforco antes do proximo bloco do edital.',
    closureActionLabel: 'Fechamento liberado no fim da revisao',
    postContextTitle: 'Contexto da disciplina atual',
    postParentLabel: boardLabel
      ? `${contestLabel} / ${boardLabel}`
      : `${contestLabel} / Revisao da disciplina`,
    postContinuityTitle: 'Depois desta sessao do edital',
    postNextStepLabel: 'Depois desta sessao: leve a disciplina revisada para questoes ou para outro ponto critico do edital.',
    postFollowUpLabel: examDateLabel
      ? `A continuidade deve seguir o peso da prova ate ${examDateLabel}.`
      : 'A continuidade deve seguir o que mais pesa no edital atual.',
    postProgressHintLabel: 'Modo atual: revisao da disciplina',
    executionRailTitle: 'Esta revisao da disciplina conduz a sessao',
    executionRailDescription: `O bloco reforca ${state.currentBlockLabel} para manter o edital ativo e bem distribuido.`,
    executionRailBlockChipLabel: `Disciplina: ${state.currentBlockLabel}`,
  };
};

export default buildConcursoStudySessionBlueprint;
