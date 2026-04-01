import { describe, expect, it } from 'vitest';
import { buildReviewBlueprint } from '../features/review/reviewBlueprint';
import type { ReviewTrackContext } from '../features/review/reviewTrackPresentation';
import type { ReviewPresentation, ReviewTrackPresentationState } from '../features/review/presentation/types';

const basePresentation: ReviewPresentation = {
  header: {
    title: 'Revisao do dia',
    contextLabel: 'Fila diaria de retencao com um item por vez.',
    progressLabel: 'Item 2 de 3',
    queueLabel: '2 restantes',
    status: 'active',
  },
  core: {
    itemId: 'review-2',
    title: 'Citologia',
    subjectLabel: 'Biologia',
    sourceLabel: '+24h / Fila automatica',
    prompt: 'Recupere os pontos centrais de Citologia antes de abrir a resposta.',
    answer: 'Revise membrana e transporte celular.',
    positionLabel: '2 de 3 itens',
    sequenceLabel: '1 concluido / 2 restantes',
    nextActionLabel: 'Tente lembrar primeiro.',
    actionLabel: 'Ver resposta',
    actionDisabled: false,
    status: 'active',
  },
  summary: {
    completedLabel: '1 concluido',
    remainingLabel: '2 restantes',
    nextStepLabel: 'Siga a ordem da fila.',
  },
  queue: {
    dateLabel: '30 mar.',
    totalItems: 3,
    completedItems: 1,
    remainingItems: 2,
    currentItemId: 'review-2',
    items: [],
  },
};

const buildContext = (overrides: Partial<ReviewTrackContext>): ReviewTrackContext => ({
  profile: 'enem',
  ...overrides,
});

const buildState = (overrides?: Partial<ReviewTrackPresentationState>): ReviewTrackPresentationState => ({
  activeTitle: 'Citologia',
  ...overrides,
});

describe('buildReviewBlueprint', () => {
  it('gera blueprint de fixacao da base para ENEM iniciante', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'enem',
      presentation: basePresentation,
      state: buildState(),
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'nao',
          profileLevel: 'iniciante',
        },
      }),
    });

    expect(blueprint?.mode).toBe('fixacao_base');
    expect(blueprint?.corePromptLabel).toBe('Fixacao da base');
    expect(blueprint?.summaryQueueTitle).toBe('Ordem de hoje na base ENEM');
  });

  it('gera blueprint de ritmo de prova para ENEM avancado', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'enem',
      presentation: basePresentation,
      state: buildState(),
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'avancado',
        },
      }),
    });

    expect(blueprint?.mode).toBe('ritmo_prova');
    expect(blueprint?.corePromptText).toContain('ritmo');
  });

  it('gera blueprint de fixacao do edital para concurso sem data', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'concursos',
      presentation: {
        ...basePresentation,
        core: {
          ...basePresentation.core,
          title: 'Atos administrativos',
          subjectLabel: 'Direito Administrativo',
        },
      },
      state: buildState({
        activeTitle: 'Atos administrativos',
      }),
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          planningWithoutDate: true,
          experienceLevel: 'iniciante',
        },
      }),
    });

    expect(blueprint?.mode).toBe('fixacao_edital');
    expect(blueprint?.corePromptLabel).toBe('Fixacao do edital');
  });

  it('gera blueprint de reforco da banca para concurso com banca definida', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'concursos',
      presentation: {
        ...basePresentation,
        core: {
          ...basePresentation.core,
          title: 'Poderes administrativos',
          subjectLabel: 'Direito Administrativo',
        },
      },
      state: buildState({
        activeTitle: 'Poderes administrativos',
      }),
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
      }),
    });

    expect(blueprint?.mode).toBe('reforco_banca');
    expect(blueprint?.corePromptText).toContain('Cebraspe');
  });

  it('gera blueprint de reta final para concurso com prova proxima', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    const yyyy = soon.getFullYear();
    const mm = String(soon.getMonth() + 1).padStart(2, '0');
    const dd = String(soon.getDate()).padStart(2, '0');

    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'concursos',
      presentation: {
        ...basePresentation,
        core: {
          ...basePresentation.core,
          title: 'Interpretacao',
          subjectLabel: 'Portugues',
        },
      },
      state: buildState({
        activeTitle: 'Interpretacao',
      }),
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'TRT Tecnico',
          board: 'FGV',
          area: 'Tribunais',
          examDate: `${yyyy}-${mm}-${dd}`,
          experienceLevel: 'avancado',
        },
      }),
    });

    expect(blueprint?.mode).toBe('reta_final');
    expect(blueprint?.summaryEyebrow).toBe('Resumo da reta final');
  });

  it('compoe blueprint hibrido com origem ENEM e continuidade de concurso', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'hibrido',
      presentation: {
        ...basePresentation,
        core: {
          ...basePresentation.core,
          trackLabel: 'ENEM',
        },
      },
      state: buildState(),
      context: buildContext({
        profile: 'hibrido',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
        hibrido: {
          primaryFocus: 'enem',
        },
      }),
    });

    expect(blueprint?.mode).toBe('revisao_topico');
    expect(blueprint?.summaryQueueTitle).toBe('Ordem de hoje nas duas frentes');
    expect(blueprint?.summaryNextStepLabel).toContain('PF Administrativo 2025');
  });

  it('compoe blueprint hibrido com origem Concurso e continuidade de ENEM', () => {
    const blueprint = buildReviewBlueprint({
      preferredStudyTrack: 'hibrido',
      presentation: {
        ...basePresentation,
        core: {
          ...basePresentation.core,
          title: 'Poderes administrativos',
          subjectLabel: 'Direito Administrativo',
          trackLabel: 'Concurso',
        },
      },
      state: buildState({
        activeTitle: 'Poderes administrativos',
      }),
      context: buildContext({
        profile: 'hibrido',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
        hibrido: {
          primaryFocus: 'concurso',
        },
      }),
    });

    expect(blueprint?.mode).toBe('reforco_banca');
    expect(blueprint?.summaryNextStepLabel).toContain('ENEM');
  });
});

