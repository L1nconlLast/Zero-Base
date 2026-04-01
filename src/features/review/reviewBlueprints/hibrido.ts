import { resolveContestLabel } from '../../../utils/trackNarrative';
import type { ReviewBlueprintBuilder } from '../reviewBlueprint';
import { buildConcursoReviewBlueprint } from './concurso';
import { buildEnemReviewBlueprint } from './enem';

export const buildHibridoReviewBlueprint: ReviewBlueprintBuilder = (args) => {
  const { context, presentation } = args;
  const origin = presentation.core.trackLabel === 'Concurso' ? 'concurso' : 'enem';
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const secondaryFront = origin === 'concurso' ? 'ENEM' : contestLabel;
  const originLabel = origin === 'concurso' ? 'Concurso' : 'ENEM';
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const balanceHint = primaryFocus === 'equilibrado'
    ? 'A rotina segue equilibrada entre as duas frentes.'
    : primaryFocus === origin
      ? `${originLabel} segue como frente principal da rotina.`
      : `${originLabel} entra como bloco ativo enquanto ${secondaryFront} fica em continuidade.`;

  const baseBlueprint = origin === 'concurso'
    ? buildConcursoReviewBlueprint({
      ...args,
      context: {
        ...context,
        profile: 'concurso',
      },
    })
    : buildEnemReviewBlueprint({
      ...args,
      context: {
        ...context,
        profile: 'enem',
      },
    });

  if (!baseBlueprint) {
    return null;
  }

  const headerContextLabel = presentation.header.status === 'completed'
    ? `A fila da frente ${originLabel} terminou. ${secondaryFront} continua como segunda frente da rotina hibrida.`
    : `${baseBlueprint.headerContextLabel || presentation.header.contextLabel} ${secondaryFront} segue como continuidade secundaria desta rotina.`;
  const headerFooterLabel = presentation.header.status === 'active'
    ? `Um item por vez para fechar ${originLabel} sem perder ${secondaryFront} do radar.`
    : baseBlueprint.headerFooterLabel;

  return {
    ...baseBlueprint,
    headerContextLabel,
    headerFooterLabel,
    summaryEyebrow: 'Resumo da rotina hibrida',
    summaryQueueTitle: 'Ordem de hoje nas duas frentes',
    summaryNextStepLabel: presentation.core.status === 'answered'
      ? undefined
      : presentation.core.status === 'completed'
        ? `A fila da frente ${originLabel} terminou. ${secondaryFront} segue como proxima continuidade da rotina hibrida.`
        : `${balanceHint} ${secondaryFront} continua como segunda frente depois deste item.`,
  };
};

export default buildHibridoReviewBlueprint;

