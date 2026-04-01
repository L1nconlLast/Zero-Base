import {
  resolveContestLabel,
  resolveHybridOriginFromLabel,
} from '../../../utils/trackNarrative';
import type { StudySessionBlueprintBuilder } from '../sessionBlueprint';
import { buildConcursoStudySessionBlueprint } from './concurso';
import { buildEnemStudySessionBlueprint } from './enem';

export const buildHibridoStudySessionBlueprint: StudySessionBlueprintBuilder = (args) => {
  const { context, state } = args;
  const primaryFocus = context.hibrido?.primaryFocus || 'equilibrado';
  const origin = resolveHybridOriginFromLabel(state.currentBlockLabel, primaryFocus);
  const contestLabel = resolveContestLabel(
    context.concurso?.name || null,
    context.concurso?.area || null,
  );
  const secondaryFront = origin === 'concurso' ? 'ENEM' : contestLabel;
  const baseBlueprint = origin === 'concurso'
    ? buildConcursoStudySessionBlueprint(args)
    : buildEnemStudySessionBlueprint(args);

  if (!baseBlueprint) {
    return null;
  }

  const balanceHint = primaryFocus === 'equilibrado'
    ? 'Equilibrio ativo entre as duas frentes'
    : primaryFocus === 'concurso'
      ? 'Concurso no centro hoje'
      : 'ENEM no centro hoje';
  const loadHint = context.hibrido?.availableStudyTime === 'baixo'
    ? 'Mantenha a segunda frente leve para proteger a carga da semana.'
    : context.hibrido?.availableStudyTime === 'alto'
      ? 'A segunda frente pode receber um bloco mais robusto depois deste.'
      : 'A segunda frente entra como continuidade controlada depois deste bloco.';
  const originLabel = origin === 'concurso' ? 'Concurso' : 'ENEM';

  return {
    ...baseBlueprint,
    closureTitle: 'Fechamento da rotina hibrida',
    closureMessage: `${baseBlueprint.closureMessage || 'Feche este bloco com clareza.'} ${secondaryFront} fica como continuidade secundaria.`,
    supportIntro: `${baseBlueprint.supportIntro || 'Use esta sessao para fechar o bloco atual.'} ${secondaryFront} segue como segunda frente depois deste bloco.`,
    checklistTitle: origin === 'concurso' ? 'Checklist do bloco Concurso' : 'Checklist do bloco ENEM',
    postContextTitle: origin === 'concurso' ? 'Contexto do bloco Concurso' : 'Contexto do bloco ENEM',
    postContinuityTitle: 'Depois deste bloco hibrido',
    postNextStepLabel: origin === 'concurso'
      ? `Depois desta sessao: feche Concurso e mantenha ${secondaryFront} em continuidade.`
      : `Depois desta sessao: feche ENEM e mantenha ${secondaryFront} em continuidade.`,
    postFollowUpLabel: loadHint,
    postProgressHintLabel: balanceHint,
    executionRailBlockChipLabel: `Origem: ${originLabel}`,
  };
};

export default buildHibridoStudySessionBlueprint;
