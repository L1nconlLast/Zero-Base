import { describe, expect, it } from 'vitest';
import {
  buildReviewTrackPresentation,
  type ReviewTrackContext,
} from '../features/review/reviewTrackPresentation';
import type {
  DailyReviewQueueData,
  ReviewCoreData,
  ReviewHeaderData,
  ReviewSummaryData,
} from '../features/review';

const baseHeader: ReviewHeaderData = {
  title: 'Revisao do dia',
  contextLabel: 'Fila diaria de retencao com um item por vez.',
  progressLabel: 'Item 2 de 3',
  queueLabel: '2 restantes',
  status: 'active',
};

const baseCore: ReviewCoreData = {
  itemId: 'review-2',
  title: 'Citologia',
  subjectLabel: 'Biologia',
  sourceLabel: '+24h / Fila automatica',
  prompt: 'Recupere os pontos centrais de Citologia em Biologia antes de abrir a resposta.',
  answer: 'Revise membrana, organelas e transporte celular.',
  positionLabel: '2 de 3 itens',
  sequenceLabel: '1 concluido / 2 restantes',
  nextActionLabel: 'Tente lembrar primeiro.',
  actionLabel: 'Ver resposta',
  actionDisabled: false,
  status: 'active',
};

const baseSummary: ReviewSummaryData = {
  completedLabel: '1 concluido',
  remainingLabel: '2 restantes',
  nextStepLabel: 'Siga a ordem da fila para revisar um item por vez sem reabrir o plano inteiro.',
};

const baseQueue: DailyReviewQueueData = {
  dateLabel: '30 mar.',
  totalItems: 3,
  completedItems: 1,
  remainingItems: 2,
  currentItemId: 'review-2',
  items: [
    {
      id: 'review-1',
      title: 'Funcoes',
      subjectLabel: 'Matematica',
      sourceLabel: '+24h / Fila automatica',
      prompt: 'Recupere os pontos centrais de Funcoes.',
      answer: 'Revise dominio e imagem.',
      dueDate: '2026-03-30',
      status: 'completed',
      position: 1,
      total: 3,
    },
    {
      id: 'review-2',
      title: 'Citologia',
      subjectLabel: 'Biologia',
      sourceLabel: '+24h / Fila automatica',
      prompt: 'Recupere os pontos centrais de Citologia.',
      answer: 'Revise membrana, organelas e transporte celular.',
      dueDate: '2026-03-30',
      status: 'active',
      position: 2,
      total: 3,
    },
    {
      id: 'review-3',
      title: 'Direito Administrativo',
      subjectLabel: 'Direito Administrativo',
      sourceLabel: '+24h / Fila automatica',
      prompt: 'Recupere os pontos centrais de Direito Administrativo.',
      answer: 'Revise poderes administrativos.',
      dueDate: '2026-03-30',
      status: 'pending',
      position: 3,
      total: 3,
    },
  ],
};

const buildContext = (overrides: Partial<ReviewTrackContext>): ReviewTrackContext => ({
  profile: 'enem',
  ...overrides,
});

describe('buildReviewTrackPresentation', () => {
  it('gera narrativa de preparacao para enem', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: baseCore,
      summary: baseSummary,
      queue: baseQueue,
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
      }),
      state: { activeTitle: 'Citologia' },
    });

    expect(presentation.header.eyebrow).toBe('Revisao ENEM');
    expect(presentation.core.trackLabel).toBe('ENEM');
    expect(presentation.summary.queueTitle).toBe('Ordem de hoje na preparacao ENEM');
    expect(presentation.queue.items[1].trackLabel).toBe('ENEM');
    expect(presentation.core.promptLabel).toBe('Revisao de topico');
    expect(presentation.core.prompt).toContain('reaparece nas questoes do ENEM');
  });

  it('gera narrativa de edital para concurso', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: {
        ...baseCore,
        subjectLabel: 'Direito Administrativo',
      },
      summary: baseSummary,
      queue: baseQueue,
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
      }),
      state: { activeTitle: 'Direito Administrativo' },
    });

    expect(presentation.header.eyebrow).toBe('Revisao do concurso');
    expect(presentation.core.trackLabel).toBe('Concurso');
    expect(presentation.header.contextLabel).toContain('Cebraspe');
    expect(presentation.core.promptLabel).toBe('Reforco da banca');
  });

  it('gera narrativa academica para faculdade', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: {
        ...baseCore,
        subjectLabel: 'Calculo I',
        title: 'Limites',
      },
      summary: baseSummary,
      queue: baseQueue,
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Engenharia de Software',
          semester: '3',
          focus: 'provas',
        },
      }),
      state: { activeTitle: 'Limites' },
    });

    expect(presentation.header.eyebrow).toBe('Revisao da faculdade');
    expect(presentation.core.trackLabel).toBe('Faculdade');
    expect(presentation.summary.eyebrow).toBe('Resumo academico');
  });

  it('gera narrativa de trilha para outros', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: {
        ...baseCore,
        subjectLabel: 'JavaScript',
        title: 'Promises',
      },
      summary: baseSummary,
      queue: baseQueue,
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Programacao web',
          focus: 'praticar',
          deadline: null,
        },
      }),
      state: { activeTitle: 'Promises' },
    });

    expect(presentation.header.eyebrow).toBe('Revisao da trilha');
    expect(presentation.core.trackLabel).toBe('Trilha');
    expect(presentation.summary.queueTitle).toBe('Ordem de hoje na trilha');
  });

  it('marca item hibrido como ENEM quando o assunto vem da frente ENEM', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: {
        ...baseCore,
        subjectLabel: 'Biologia',
      },
      summary: baseSummary,
      queue: baseQueue,
      context: buildContext({
        profile: 'hibrido',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
        hibrido: {
          primaryFocus: 'enem',
        },
      }),
      state: { activeTitle: 'Citologia' },
    });

    expect(presentation.core.trackLabel).toBe('ENEM');
    expect(presentation.queue.items[1].trackLabel).toBe('ENEM');
    expect(presentation.summary.queueTitle).toBe('Ordem de hoje nas duas frentes');
    expect(presentation.summary.nextStepLabel).toContain('PF Administrativo 2025');
  });

  it('marca item hibrido como Concurso quando o assunto vem da frente Concurso', () => {
    const presentation = buildReviewTrackPresentation({
      header: baseHeader,
      core: {
        ...baseCore,
        subjectLabel: 'Direito Administrativo',
        title: 'Poderes Administrativos',
      },
      summary: baseSummary,
      queue: {
        ...baseQueue,
        currentItemId: 'review-3',
      },
      context: buildContext({
        profile: 'hibrido',
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
      state: { activeTitle: 'Poderes Administrativos' },
    });

    expect(presentation.core.trackLabel).toBe('Concurso');
    expect(presentation.queue.items[2].trackLabel).toBe('Concurso');
    expect(presentation.header.eyebrow).toBe('Revisao hibrida');
    expect(presentation.core.promptLabel).toBe('Reforco da banca');
    expect(presentation.summary.nextStepLabel).toContain('ENEM');
  });
});
