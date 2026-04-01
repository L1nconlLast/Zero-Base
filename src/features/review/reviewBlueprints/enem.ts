import type { ReviewBlueprintBuilder } from '../reviewBlueprint';
import { resolveReviewFocusLabel } from './shared';

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

export const buildEnemReviewBlueprint: ReviewBlueprintBuilder = ({
  context,
  presentation,
}) => {
  if (presentation.header.status === 'empty') {
    return null;
  }

  const level = resolveEnemLevel(
    context.enem?.triedBefore || null,
    context.enem?.profileLevel || null,
  );
  const focusLabel = resolveReviewFocusLabel(
    presentation.core.title,
    presentation.core.subjectLabel,
  );
  const targetLabel = buildTargetLabel(
    context.enem?.targetCourse || null,
    context.enem?.targetCollege || null,
  );
  const baseDescriptor = targetLabel
    ? `${focusLabel} na preparacao para ${targetLabel}`
    : `${focusLabel} na preparacao ENEM`;

  if (level === 'iniciante') {
    return {
      mode: 'fixacao_base',
      headerContextLabel: presentation.header.status === 'completed'
        ? 'A fila diaria de fixacao da base ENEM terminou. O proximo ciclo volta para manter os fundamentos vivos na memoria.'
        : `Fila diaria de fixacao da base, um item por vez, para consolidar ${baseDescriptor} antes dos proximos blocos.`,
      headerFooterLabel: presentation.header.status === 'active'
        ? 'Um item por vez para firmar a base do ENEM sem dispersar a revisao.'
        : presentation.header.footerLabel,
      coreEyebrowLabel: presentation.core.status === 'completed'
        ? 'Fixacao ENEM encerrada'
        : 'Item atual da fixacao',
      corePromptLabel: presentation.core.status === 'completed'
        ? 'Fechamento da base'
        : 'Fixacao da base',
      corePromptText: presentation.core.status === 'completed'
        ? 'Os itens de base do ENEM ja passaram pela fila de hoje. O proximo ciclo volta para segurar os fundamentos antes da prova.'
        : `Reforce ${focusLabel} como parte da base que precisa ficar viva antes do proximo bloco do ENEM.`,
      coreNextActionLabel: presentation.core.status === 'active'
        ? 'Recupere a base deste topico antes de abrir a resposta e consolidar a preparacao.'
        : presentation.core.status === 'revealed'
          ? 'Compare sua lembranca com a resposta e decida se a base ja ficou firme para seguir.'
          : presentation.core.status === 'completed'
            ? 'A fila de fixacao do ENEM terminou. O proximo passo e transformar base em continuidade.'
            : undefined,
      summaryEyebrow: 'Resumo da fixacao',
      summaryQueueTitle: 'Ordem de hoje na base ENEM',
      summaryNextStepLabel: presentation.core.status === 'completed'
        ? 'A fixacao de hoje terminou. O proximo ciclo volta para manter a base do ENEM ativa.'
        : presentation.core.status === 'answered'
          ? undefined
          : 'Siga a fila para firmar a base do ENEM um item por vez, sem reabrir o plano inteiro.',
    };
  }

  if (level === 'avancado') {
    return {
      mode: 'ritmo_prova',
      headerContextLabel: presentation.header.status === 'completed'
        ? 'A fila diaria de ajuste fino do ENEM terminou. O proximo ciclo volta quando outro ponto pedir revisao em ritmo de prova.'
        : `Fila diaria de ajuste fino da preparacao, um item por vez, para manter ${baseDescriptor} em ritmo de prova.`,
      headerFooterLabel: presentation.header.status === 'active'
        ? 'Um item por vez para revisar com cara de prova sem perder ritmo de resolucao.'
        : presentation.header.footerLabel,
      coreEyebrowLabel: presentation.core.status === 'completed'
        ? 'Ajuste fino ENEM encerrado'
        : 'Item atual do ritmo de prova',
      corePromptLabel: presentation.core.status === 'completed'
        ? 'Fechamento do ritmo de prova'
        : 'Ritmo de prova',
      corePromptText: presentation.core.status === 'completed'
        ? 'Os ajustes finos do ENEM de hoje ja passaram pela fila. O proximo ciclo volta para manter a prova viva na memoria.'
        : `Recupere ${focusLabel} pensando no ritmo e na leitura que a prova pede antes de abrir a resposta.`,
      coreNextActionLabel: presentation.core.status === 'active'
        ? 'Traga a resposta em ritmo de prova antes de abrir o apoio guiado.'
        : presentation.core.status === 'revealed'
          ? 'Compare sua lembranca com a resposta e veja se este ponto ja aguenta a pressao da prova.'
          : presentation.core.status === 'completed'
            ? 'A fila de ajuste fino terminou. O proximo bloco deve aproveitar o que ficou mais vivo na prova.'
            : undefined,
      summaryEyebrow: 'Resumo do ajuste fino',
      summaryQueueTitle: 'Ordem de hoje no ritmo ENEM',
      summaryNextStepLabel: presentation.core.status === 'completed'
        ? 'O ajuste fino de hoje terminou. O proximo ciclo volta para manter a prova afiada.'
        : presentation.core.status === 'answered'
          ? undefined
          : 'Siga a fila para ajustar os pontos finos da prova sem quebrar o ritmo da preparacao.',
    };
  }

  return {
    mode: 'revisao_topico',
    headerContextLabel: presentation.header.status === 'completed'
      ? 'A fila diaria de revisao ENEM terminou. O proximo ciclo volta para manter os topicos mais cobrados vivos na memoria.'
      : `Fila diaria de revisao da preparacao, um item por vez, para reforcar ${baseDescriptor} antes do proximo bloco de questoes.`,
    headerFooterLabel: presentation.header.status === 'active'
      ? 'Um item por vez para revisar os topicos do ENEM sem perder a consistencia da preparacao.'
      : presentation.header.footerLabel,
    coreEyebrowLabel: presentation.core.status === 'completed'
      ? 'Revisao ENEM encerrada'
      : 'Item atual da revisao de topico',
    corePromptLabel: presentation.core.status === 'completed'
      ? 'Fechamento da revisao ENEM'
      : 'Revisao de topico',
    corePromptText: presentation.core.status === 'completed'
      ? 'Os topicos do ENEM de hoje ja passaram pela fila. O proximo ciclo volta para sustentar a preparacao.'
      : `Recupere ${focusLabel} pensando em como esse topico reaparece nas questoes do ENEM antes de abrir a resposta.`,
    coreNextActionLabel: presentation.core.status === 'active'
      ? 'Recupere os pontos-chave deste topico antes de abrir a resposta e medir sua retencao.'
      : presentation.core.status === 'revealed'
        ? 'Compare sua lembranca com a resposta e veja se o topico ja volta com seguranca para a prova.'
        : presentation.core.status === 'completed'
          ? 'A fila de revisao ENEM terminou. O proximo passo e transformar retencao em pratica.'
          : undefined,
    summaryEyebrow: 'Resumo da revisao ENEM',
    summaryQueueTitle: 'Ordem de hoje na preparacao ENEM',
    summaryNextStepLabel: presentation.core.status === 'completed'
      ? 'A revisao de hoje terminou. O proximo ciclo volta para manter a preparacao acumulando seguranca.'
      : presentation.core.status === 'answered'
        ? undefined
        : 'Siga a fila para reforcar os topicos do ENEM um item por vez sem reabrir a preparacao inteira.',
  };
};

export default buildEnemReviewBlueprint;

