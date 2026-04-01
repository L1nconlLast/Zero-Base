import type { PlanoCollegeFocus, PlanoTrackPresentationBuilder } from './types';

const buildAcademicLabel = (course?: string | null, institution?: string | null) =>
  [course, institution].filter(Boolean).join(' - ');

const buildFocusTitle = (focus?: PlanoCollegeFocus | null) => {
  if (focus === 'provas') return 'Plano das provas da faculdade';
  if (focus === 'trabalhos') return 'Plano dos trabalhos da faculdade';
  return 'Plano da rotina da faculdade';
};

const buildFocusSupport = (focus?: PlanoCollegeFocus | null) => {
  if (focus === 'provas') return 'A semana organiza materias e revisoes para as proximas provas.';
  if (focus === 'trabalhos') return 'A semana organiza blocos de execucao e entregas sem perder a base das materias.';
  return 'A semana organiza materias, carga e consistencia para manter a rotina academica viva.';
};

const mapDistributionLabel = (label: string) => {
  if (label === 'Foco principal') return 'Materia principal';
  if (label === 'Em andamento') return 'Materia em andamento';
  if (label === 'Revisao prevista') return 'Revisao academica';
  if (label === 'Ja iniciou') return 'Materia ja iniciada';
  return 'Base da rotina';
};

const mapNextStepLabel = (id: string, fallback: string) => {
  if (id === 'next-focus') return 'Proxima materia';
  if (id === 'next-review') return 'Revisao da semana';
  if (id === 'plan-continuity') return 'Continuidade academica';
  return fallback;
};

export const buildFaculdadePlanoPresentation: PlanoTrackPresentationBuilder = ({
  presentation,
  context,
}) => {
  const academicLabel = buildAcademicLabel(
    context.faculdade?.course || null,
    context.faculdade?.institution || null,
  );
  const focusSupport = buildFocusSupport(context.faculdade?.focus || null);

  return {
    ...presentation,
    header: {
      ...presentation.header,
      eyebrow: 'Plano da faculdade',
      title: buildFocusTitle(context.faculdade?.focus || null),
      contextLine: academicLabel
        ? `${presentation.header.contextLine} - ${academicLabel}`
        : presentation.header.contextLine,
      statusLine: `${presentation.header.statusLine} ${focusSupport}`,
    },
    summaryCards: [
      {
        ...presentation.summaryCards[0],
        eyebrow: 'Carga academica',
        detail: 'Distribuida para sustentar a rotina da semana sem bagunca.',
      },
      {
        ...presentation.summaryCards[1],
        eyebrow: 'Materias ativas',
        support: academicLabel || 'O plano organiza materias ao longo da semana',
      },
      {
        ...presentation.summaryCards[2],
        eyebrow: 'Semana academica',
        support: context.faculdade?.focus
          ? `Foco atual: ${context.faculdade.focus}`
          : presentation.summaryCards[2].support,
      },
    ],
    distribution: {
      copy: {
        eyebrow: 'Distribuicao academica',
        title: 'Como as materias se dividem nesta semana',
        description: 'As materias com mais peso ou urgencia puxam mais carga para manter a rotina academica no trilho.',
        footer: 'O plano deixa visivel onde sua semana esta mais pesada sem esconder revisao, provas ou entregas.',
      },
      items: presentation.distribution.items.map((item) => ({
        ...item,
        statusLabel: mapDistributionLabel(item.statusLabel),
      })),
    },
    nextSteps: {
      copy: {
        eyebrow: 'Proximos passos da semana',
        title: 'O que vem a seguir na sua rotina academica',
        description: 'Um resumo rapido do que merece atencao agora sem abrir o cronograma completo.',
      },
      items: presentation.nextSteps.items.map((item) => ({
        ...item,
        label: mapNextStepLabel(item.id, item.label),
      })),
    },
    support: {
      label: 'Contexto academico',
      title: 'Cronograma academico completo',
      description: academicLabel
        ? `${academicLabel}. ${focusSupport}`
        : focusSupport,
    },
    rebalance: {
      label: presentation.rebalance.label,
      description: 'O ajuste leve redistribui materias, provas e entregas sem desmontar o resto da semana academica.',
    },
    loadBalance: {
      ...presentation.loadBalance,
      todayEyebrow: 'Hoje na faculdade',
      executeLabel: 'Executar bloco da faculdade',
      focusLabel: 'Materia em foco',
      coverageDescription: 'Materias girando ao longo da semana.',
      quickReadLabel: 'Leitura academica',
      quickReadDescription: 'Rotina organizada, execucao concentrada. A semana academica responde abaixo sem perder a hierarquia.',
    },
  };
};

export default buildFaculdadePlanoPresentation;
