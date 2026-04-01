import { resolveContestLabel } from '../../../utils/trackNarrative';
import type { ReviewBlueprintBuilder } from '../reviewBlueprint';
import { getDaysUntilDate, resolveContestDescriptor, resolveReviewFocusLabel } from './shared';

const resolveConcursoLevel = (
  experienceLevel?: 'iniciante' | 'intermediario' | 'avancado' | null,
): 'iniciante' | 'intermediario' | 'avancado' => experienceLevel || 'intermediario';

export const buildConcursoReviewBlueprint: ReviewBlueprintBuilder = ({
  context,
  presentation,
}) => {
  if (presentation.header.status === 'empty') {
    return null;
  }

  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const contestDescriptor = resolveContestDescriptor(
    context.concurso?.name || null,
    context.concurso?.area || null,
    context.concurso?.board || null,
  );
  const boardLabel = context.concurso?.board || null;
  const examDate = context.concurso?.examDate || context.examDate || null;
  const daysUntilExam = getDaysUntilDate(examDate);
  const isFinalSprint = typeof daysUntilExam === 'number' && daysUntilExam >= 0 && daysUntilExam <= 45;
  const level = resolveConcursoLevel(context.concurso?.experienceLevel || null);
  const focusLabel = resolveReviewFocusLabel(
    presentation.core.title,
    presentation.core.subjectLabel,
  );

  if (isFinalSprint) {
    return {
      mode: 'reta_final',
      headerContextLabel: presentation.header.status === 'completed'
        ? `A fila diaria de reta final para ${contestLabel} terminou. O proximo ciclo volta para manter os pontos criticos vivos ate a prova.`
        : `Fila diaria de reta final, um item por vez, para manter ${focusLabel} vivo em ${contestLabel} no trecho mais proximo da prova.`,
      headerFooterLabel: presentation.header.status === 'active'
        ? 'Um item por vez para revisar o edital em reta final sem reabrir a prova inteira.'
        : presentation.header.footerLabel,
      coreEyebrowLabel: presentation.core.status === 'completed'
        ? 'Reta final encerrada'
        : 'Item atual da reta final',
      corePromptLabel: presentation.core.status === 'completed'
        ? 'Fechamento da reta final'
        : 'Reta final',
      corePromptText: presentation.core.status === 'completed'
        ? `Os pontos de reta final de ${contestLabel} ja passaram pela fila de hoje. O proximo ciclo volta para segurar o que mais pesa ate a prova.`
        : `Recupere ${focusLabel} como ponto critico de reta final antes de abrir a resposta.`,
      coreNextActionLabel: presentation.core.status === 'active'
        ? 'Recupere este ponto como se ele pudesse decidir a prova antes de abrir a resposta.'
        : presentation.core.status === 'revealed'
          ? 'Compare sua lembranca com a resposta e veja se este ponto ja ficou firme para a reta final.'
          : presentation.core.status === 'completed'
            ? 'A fila de reta final terminou. O proximo passo e proteger so o que ainda ameaca a prova.'
            : undefined,
      summaryEyebrow: 'Resumo da reta final',
      summaryQueueTitle: 'Ordem de hoje na reta final',
      summaryNextStepLabel: presentation.core.status === 'completed'
        ? 'A reta final de hoje terminou. O proximo ciclo volta para manter a prova afiada sem reabrir o edital inteiro.'
        : presentation.core.status === 'answered'
          ? undefined
          : 'Siga a fila para revisar os pontos mais sensiveis do edital sem dispersar a reta final.',
    };
  }

  if (boardLabel && level !== 'iniciante') {
    return {
      mode: 'reforco_banca',
      headerContextLabel: presentation.header.status === 'completed'
        ? `A fila diaria de reforco da banca ${boardLabel} terminou. O proximo ciclo volta para manter o estilo da prova vivo no edital.`
        : `Fila diaria de reforco da banca, um item por vez, para revisar ${focusLabel} no estilo ${boardLabel} dentro de ${contestLabel}.`,
      headerFooterLabel: presentation.header.status === 'active'
        ? `Um item por vez para treinar o edital no estilo ${boardLabel} sem perder o fio da disciplina.`
        : presentation.header.footerLabel,
      coreEyebrowLabel: presentation.core.status === 'completed'
        ? 'Reforco da banca encerrado'
        : 'Item atual do reforco da banca',
      corePromptLabel: presentation.core.status === 'completed'
        ? 'Fechamento da banca'
        : 'Reforco da banca',
      corePromptText: presentation.core.status === 'completed'
        ? `Os pontos de ${contestDescriptor} ja passaram pela fila de hoje. O proximo ciclo volta para sustentar o estilo da banca.`
        : `Reforce ${focusLabel} no estilo ${boardLabel} antes de abrir a resposta.`,
      coreNextActionLabel: presentation.core.status === 'active'
        ? `Recupere este ponto pensando no padrao de ${boardLabel} antes de abrir a resposta.`
        : presentation.core.status === 'revealed'
          ? `Compare sua lembranca com a resposta e veja se este ponto ja aguenta a leitura de ${boardLabel}.`
          : presentation.core.status === 'completed'
            ? `A fila da banca ${boardLabel} terminou. O proximo passo e manter o edital vivo no estilo da prova.`
            : undefined,
      summaryEyebrow: 'Resumo da banca',
      summaryQueueTitle: 'Ordem de hoje no estilo da banca',
      summaryNextStepLabel: presentation.core.status === 'completed'
        ? `O reforco da banca ${boardLabel} terminou. O proximo ciclo volta para manter o edital treinado nesse estilo.`
        : presentation.core.status === 'answered'
          ? undefined
          : `Siga a fila para revisar o edital no estilo ${boardLabel} sem perder o centro da prova.`,
    };
  }

  if (level === 'iniciante' || Boolean(context.concurso?.planningWithoutDate)) {
    return {
      mode: 'fixacao_edital',
      headerContextLabel: presentation.header.status === 'completed'
        ? `A fila diaria de fixacao do edital terminou. O proximo ciclo volta para manter a base de ${contestLabel} viva na memoria.`
        : `Fila diaria de fixacao do edital, um item por vez, para consolidar ${focusLabel} dentro de ${contestLabel}.`,
      headerFooterLabel: presentation.header.status === 'active'
        ? 'Um item por vez para firmar a base do edital antes de acelerar questoes e reta final.'
        : presentation.header.footerLabel,
      coreEyebrowLabel: presentation.core.status === 'completed'
        ? 'Fixacao do edital encerrada'
        : 'Item atual da base do edital',
      corePromptLabel: presentation.core.status === 'completed'
        ? 'Fechamento da base do edital'
        : 'Fixacao do edital',
      corePromptText: presentation.core.status === 'completed'
        ? `Os pontos-base de ${contestLabel} ja passaram pela fila de hoje. O proximo ciclo volta para firmar o edital antes de aumentar o ritmo.`
        : `Reforce ${focusLabel} como parte da base do edital antes de abrir a resposta.`,
      coreNextActionLabel: presentation.core.status === 'active'
        ? 'Recupere a base deste ponto do edital antes de abrir a resposta e consolidar a disciplina.'
        : presentation.core.status === 'revealed'
          ? 'Compare sua lembranca com a resposta e veja se a base ja ficou firme para seguir.'
          : presentation.core.status === 'completed'
            ? 'A fila de base do edital terminou. O proximo passo e transformar fixacao em continuidade do concurso.'
            : undefined,
      summaryEyebrow: 'Resumo da base do edital',
      summaryQueueTitle: 'Ordem de hoje no edital',
      summaryNextStepLabel: presentation.core.status === 'completed'
        ? 'A base do edital de hoje terminou. O proximo ciclo volta para ampliar o concurso sem pular etapas.'
        : presentation.core.status === 'answered'
          ? undefined
          : 'Siga a fila para firmar a base do edital um item por vez, sem dispersar a revisao.',
    };
  }

  return {
    mode: 'revisao_disciplina',
    headerContextLabel: presentation.header.status === 'completed'
      ? `A fila diaria de revisao da disciplina terminou. O proximo ciclo volta para manter ${contestLabel} ativo no edital.`
      : `Fila diaria de revisao da disciplina, um item por vez, para reforcar ${focusLabel} dentro de ${contestDescriptor}.`,
    headerFooterLabel: presentation.header.status === 'active'
      ? 'Um item por vez para revisar a disciplina do edital sem perder a distribuicao da prova.'
      : presentation.header.footerLabel,
    coreEyebrowLabel: presentation.core.status === 'completed'
      ? 'Revisao da disciplina encerrada'
      : 'Item atual da disciplina',
    corePromptLabel: presentation.core.status === 'completed'
      ? 'Fechamento da disciplina'
      : 'Revisao da disciplina',
    corePromptText: presentation.core.status === 'completed'
      ? `Os pontos da disciplina de ${contestLabel} ja passaram pela fila de hoje. O proximo ciclo volta para manter o edital girando.`
      : `Recupere ${focusLabel} pensando no peso que esse ponto tem dentro do edital antes de abrir a resposta.`,
    coreNextActionLabel: presentation.core.status === 'active'
      ? 'Recupere os pontos-chave desta disciplina antes de abrir a resposta e medir sua retencao.'
      : presentation.core.status === 'revealed'
        ? 'Compare sua lembranca com a resposta e veja se a disciplina ja volta com seguranca para o edital.'
        : presentation.core.status === 'completed'
          ? 'A fila da disciplina terminou. O proximo passo e transformar retencao em continuidade do edital.'
          : undefined,
    summaryEyebrow: 'Resumo da disciplina',
    summaryQueueTitle: 'Ordem de hoje no concurso',
    summaryNextStepLabel: presentation.core.status === 'completed'
      ? 'A revisao da disciplina terminou. O proximo ciclo volta para manter o edital distribuido sem perder prioridade.'
      : presentation.core.status === 'answered'
        ? undefined
        : 'Siga a fila para manter as disciplinas prioritarias do edital vivas na memoria.',
  };
};

export default buildConcursoReviewBlueprint;

