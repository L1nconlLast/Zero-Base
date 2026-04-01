import type { StudySessionBlueprintBuilder } from '../sessionBlueprint';
import { buildQuestionValidationLabel, resolveSessionFocusLabel } from './shared';

export const buildOutrosStudySessionBlueprint: StudySessionBlueprintBuilder = ({
  context,
  state,
}) => {
  const focus = context.outros?.focus || 'aprender';
  const goalTitle = context.outros?.goalTitle || context.summaryTitle || 'sua trilha';
  const focusLabel = resolveSessionFocusLabel(state.currentBlockObjective, state.currentBlockLabel);

  if (focus === 'praticar') {
    return {
      mode: 'practice',
      sessionTypeLabel: 'Pratica guiada',
      title: `Praticar ${focusLabel}`,
      primaryGoal: `Aplicar ${focusLabel} ate ganhar repeticao util dentro da sua trilha.`,
      supportIntro: `Esta sessao serve para colocar ${goalTitle} em pratica com repeticao suficiente para virar progresso real.`,
      checklistTitle: 'Checklist da pratica',
      checklistItems: [
        {
          id: 'focus',
          label: `Abrir o exercicio principal de ${focusLabel}`,
          detail: 'Comece pela aplicacao mais representativa do que quer treinar.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Repetir a aplicacao ate ganhar seguranca'),
          detail: 'A sessao vale mais pela repeticao util do que pela cobertura de conteudo.',
        },
        {
          id: 'closure',
          label: 'Registrar o que funcionou e o proximo treino',
          detail: 'Feche a sessao deixando claro qual pratica continua daqui.',
        },
      ],
      closureTitle: 'Fechamento da pratica',
      closureMessage: 'Registre o que ja virou repertorio e o que ainda precisa de repeticao no proximo bloco.',
      closureActionLabel: 'Fechamento liberado no fim da pratica',
      postContextTitle: 'Contexto da pratica atual',
      postParentLabel: `${goalTitle} / Pratica`,
      postContinuityTitle: 'Depois desta sessao de pratica',
      postNextStepLabel: 'Depois desta sessao: retome o proximo treino mantendo o mesmo tema ativo.',
      postFollowUpLabel: 'A continuidade fica melhor quando o proximo bloco reaproveita o que acabou de ser praticado.',
      postProgressHintLabel: 'Foco atual: praticar',
      executionRailTitle: 'Esta pratica conduz a sessao',
      executionRailDescription: `O bloco foi montado para transformar ${focusLabel} em repeticao util dentro de ${goalTitle}.`,
      executionRailBlockChipLabel: `Tema: ${state.currentBlockLabel}`,
    };
  }

  if (focus === 'rotina') {
    return {
      mode: 'consistency',
      sessionTypeLabel: 'Constancia da trilha',
      title: `Manter constancia em ${goalTitle}`,
      primaryGoal: `Cumprir um bloco leve, claro e sem atrito para manter a trilha ativa.`,
      supportIntro: `Esta sessao existe para reduzir friccao e proteger sua consistencia em ${goalTitle}, mesmo quando a energia estiver baixa.`,
      checklistTitle: 'Checklist da consistencia',
      checklistItems: [
        {
          id: 'focus',
          label: `Abrir um passo simples em ${focusLabel}`,
          detail: 'Comece por uma entrada facil para nao travar a sessao.',
        },
        {
          id: 'practice',
          label: 'Concluir um bloco curto e fechavel',
          detail: 'O objetivo aqui e manter o ritmo, nao forcar uma sessao pesada.',
        },
        {
          id: 'closure',
          label: 'Registrar o proximo passo mais facil',
          detail: 'Deixe a proxima retomada o mais leve possivel.',
        },
      ],
      closureTitle: 'Fechamento da consistencia',
      closureMessage: 'Registre um fechamento simples para que a proxima sessao comece com baixa friccao.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto da trilha ativa',
      postParentLabel: `${goalTitle} / Consistencia`,
      postContinuityTitle: 'Depois desta sessao de consistencia',
      postNextStepLabel: 'Depois desta sessao: mantenha a trilha viva com outro passo curto e claro.',
      postFollowUpLabel: 'A regularidade aqui vale mais do que aumentar a carga antes da hora.',
      postProgressHintLabel: 'Foco atual: criar rotina',
      executionRailTitle: 'Este bloco leve conduz a sessao',
      executionRailDescription: `O bloco foi pensado para manter ${goalTitle} ativo sem depender de prazo ou carga alta.`,
      executionRailBlockChipLabel: `Trilha: ${state.currentBlockLabel}`,
    };
  }

  if (focus === 'evoluir_tema') {
    return {
      mode: 'topic_progression',
      sessionTypeLabel: 'Evolucao no tema',
      title: `Aprofundar ${focusLabel}`,
      primaryGoal: `Levar ${goalTitle} um passo adiante com continuidade clara depois da sessao.`,
      supportIntro: `Esta sessao existe para aprofundar ${goalTitle} sem perder a linha de progressao do tema atual.`,
      checklistTitle: 'Checklist da progressao',
      checklistItems: [
        {
          id: 'focus',
          label: `Retomar o ponto atual de ${focusLabel}`,
          detail: 'Comece exatamente de onde a trilha parou.',
        },
        {
          id: 'practice',
          label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Aprofundar o aspecto central do tema'),
          detail: 'O bloco deve sair com um avanco claro, nao so com exposicao superficial.',
        },
        {
          id: 'closure',
          label: 'Registrar o proximo salto do tema',
          detail: 'Feche a sessao com a proxima pergunta ou subtarefa definida.',
        },
      ],
      closureTitle: 'Fechamento da progressao',
      closureMessage: 'Registre o avanco feito no tema e deixe a continuidade pronta para o proximo bloco.',
      closureActionLabel: 'Fechamento liberado no fim do bloco',
      postContextTitle: 'Contexto do tema em evolucao',
      postParentLabel: `${goalTitle} / Progressao`,
      postContinuityTitle: 'Depois desta sessao de aprofundamento',
      postNextStepLabel: 'Depois desta sessao: avance para o proximo passo do tema sem perder a linha de progressao.',
      postFollowUpLabel: 'A melhor continuidade aqui e a que retoma exatamente o ponto onde voce parou.',
      postProgressHintLabel: 'Foco atual: evoluir em um tema',
      executionRailTitle: 'Este tema em evolucao conduz a sessao',
      executionRailDescription: `O bloco organiza ${focusLabel} como um passo claro dentro da sua progressao em ${goalTitle}.`,
      executionRailBlockChipLabel: `Tema: ${state.currentBlockLabel}`,
    };
  }

  return {
    mode: 'learning',
    sessionTypeLabel: 'Aprendizado guiado',
    title: `Construir base em ${focusLabel}`,
    primaryGoal: `Entender ${focusLabel} e sair com um resumo acionavel para continuar ${goalTitle}.`,
    supportIntro: `Esta sessao existe para absorver conteudo novo em ${goalTitle} sem depender de prazo rigido.`,
    checklistTitle: 'Checklist de aprendizado',
    checklistItems: [
      {
        id: 'focus',
        label: `Ler ou assistir o nucleo de ${focusLabel}`,
        detail: 'Entre no conceito principal antes de tentar ampliar demais o bloco.',
      },
      {
        id: 'practice',
        label: buildQuestionValidationLabel(state.currentTargetQuestions, 'Identificar o ponto-chave do conteudo'),
        detail: 'Mesmo sem prova, a sessao deve sair com um conceito bem fechado.',
      },
      {
        id: 'closure',
        label: 'Registrar o proximo conceito da trilha',
        detail: 'Feche a sessao com um passo claro para a continuidade do aprendizado.',
      },
    ],
    closureTitle: 'Fechamento do aprendizado',
    closureMessage: 'Registre o principal insight do bloco e qual conceito deve abrir a proxima sessao.',
    closureActionLabel: 'Fechamento liberado no fim do bloco',
    postContextTitle: 'Contexto do aprendizado atual',
    postParentLabel: `${goalTitle} / Aprendizado`,
    postContinuityTitle: 'Depois desta sessao de aprendizado',
    postNextStepLabel: 'Depois desta sessao: avance para o proximo conceito mantendo a base organizada.',
    postFollowUpLabel: 'A continuidade aqui funciona melhor quando cada sessao deixa um conceito principal bem resolvido.',
    postProgressHintLabel: 'Foco atual: aprender',
    executionRailTitle: 'Este conceito conduz a sessao',
    executionRailDescription: `O bloco organiza ${focusLabel} como um passo claro de aprendizado dentro de ${goalTitle}.`,
    executionRailBlockChipLabel: `Tema: ${state.currentBlockLabel}`,
  };
};

export default buildOutrosStudySessionBlueprint;
