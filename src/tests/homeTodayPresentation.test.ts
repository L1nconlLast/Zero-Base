import { describe, expect, it } from 'vitest';
import { buildHomeTodayPresentation, type HomeTrackContext } from '../components/Home/homeTodayPresentation';
import type { HomeTodayState } from '../components/Home/homeTodayState';

type HomeStateOverrides = Partial<HomeTodayState> & {
  hero?: Partial<HomeTodayState['hero']>;
  dayStatus?: Partial<HomeTodayState['dayStatus']>;
  primaryPanel?: Partial<HomeTodayState['primaryPanel']>;
  continuityPanel?: Partial<HomeTodayState['continuityPanel']>;
};

const buildState = (overrides: HomeStateOverrides = {}): HomeTodayState => {
  const base: HomeTodayState = {
    priority: 'study',
    phase: 'inicio',
    isDone: false,
    hero: {
      mode: 'default',
      eyebrow: 'hoje',
      title: 'Seu estudo esta pronto',
      subtitle: 'Matematica - Funcoes',
      insight: 'Sessao curta pronta.',
      supportingText: 'Seu foco do dia ja esta definido.',
      primaryActionLabel: 'Comecar sessao',
      primaryActionTarget: 'study',
    },
    dayStatus: {
      label: 'Hoje',
      value: 'Estudo pronto',
      detail: 'Seu plano de hoje ja tem foco definido e pronto para entrar.',
      summary: '25 min previstos',
      remainder: 'Nenhuma revisao esta vencida agora.',
    },
    primaryPanel: {
      eyebrow: 'agora',
      title: 'Estudar agora',
      description: 'O plano ja escolheu o bloco do dia.',
      sessionLabel: 'Sessao oficial',
      stateBadgeLabel: 'Hoje',
      rows: [
        { id: 'focus', label: 'Bloco atual', detail: 'Matematica - Funcoes', badge: '25 min' },
      ],
    },
    continuityPanel: {
      eyebrow: 'depois',
      title: 'Depois desse bloco',
      actionLabel: 'Abrir plano',
      actionTarget: 'planning',
      rows: [
        { id: 'next', label: 'Proximo passo', detail: 'Biologia entra em seguida.', badge: '18 min' },
      ],
    },
  };

  return {
    ...base,
    ...overrides,
    hero: {
      ...base.hero,
      ...overrides.hero,
    },
    dayStatus: {
      ...base.dayStatus,
      ...overrides.dayStatus,
    },
    primaryPanel: {
      ...base.primaryPanel,
      ...overrides.primaryPanel,
    },
    continuityPanel: {
      ...base.continuityPanel,
      ...overrides.continuityPanel,
    },
  };
};

const buildContext = (overrides: Partial<HomeTrackContext>): HomeTrackContext => ({
  profile: 'enem',
  ...overrides,
});

describe('buildHomeTodayPresentation', () => {
  it('gera linguagem de preparacao para enem', () => {
    const presentation = buildHomeTodayPresentation(
      buildState(),
      buildContext({
        profile: 'enem',
        enem: {
          targetCollege: 'USP',
          targetCourse: 'Medicina',
        },
      }),
    );

    expect(presentation.hero.eyebrow).toBe('preparacao enem');
    expect(presentation.hero.title).toBe('Seu bloco ENEM de hoje esta pronto');
    expect(presentation.primaryPanel.title).toBe('Estudar ENEM agora');
    expect(presentation.continuityPanel.title).toBe('Depois desse bloco ENEM');
    expect(presentation.support.label).toBe('Radar ENEM');
    expect(presentation.support.headline).toBe('Medicina · USP');
  });

  it('gera linguagem de edital para concurso', () => {
    const presentation = buildHomeTodayPresentation(
      buildState({
        priority: 'review',
        phase: 'inicio',
      }),
      buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
      }),
    );

    expect(presentation.hero.eyebrow).toBe('modo concurso');
    expect(presentation.hero.title).toBe('Comece pela revisao do edital');
    expect(presentation.dayStatus.value).toBe('Revisao do edital pronta');
    expect(presentation.primaryPanel.title).toBe('Revisar edital agora');
    expect(presentation.support.headline).toBe('PF Administrativo 2025 · Cebraspe');
  });

  it('gera linguagem academica para faculdade', () => {
    const presentation = buildHomeTodayPresentation(
      buildState({
        priority: 'plan',
        phase: 'inicio',
      }),
      buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Engenharia de Software',
          semester: '3',
          focus: 'provas',
        },
      }),
    );

    expect(presentation.hero.eyebrow).toBe('modo faculdade');
    expect(presentation.hero.title).toBe('Ajuste sua rotina da faculdade antes de seguir');
    expect(presentation.primaryPanel.title).toBe('Ajustar rotina da faculdade');
    expect(presentation.support.label).toBe('Contexto academico');
    expect(presentation.support.headline).toBe('Engenharia de Software · UFC');
    expect(presentation.support.detail).toContain('provas');
  });

  it('gera linguagem de trilha pessoal para outros', () => {
    const presentation = buildHomeTodayPresentation(
      buildState({
        priority: 'continue',
        phase: 'em_andamento',
      }),
      buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Programacao web',
          focus: 'praticar',
          deadline: null,
        },
      }),
    );

    expect(presentation.hero.eyebrow).toBe('trilha pessoal');
    expect(presentation.hero.title).toBe('Retome sua trilha atual');
    expect(presentation.primaryPanel.title).toBe('Retomar trilha atual');
    expect(presentation.support.label).toBe('Trilha pessoal');
    expect(presentation.support.headline).toBe('Programacao web');
  });

  it('gera narrativa hibrida com foco principal no enem', () => {
    const presentation = buildHomeTodayPresentation(
      buildState(),
      buildContext({
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
    );

    expect(presentation.hero.eyebrow).toBe('modo hibrido');
    expect(presentation.hero.title).toBe('Hoje seu foco principal esta no ENEM, com concurso como continuidade.');
    expect(presentation.continuityPanel.title).toBe('Depois do bloco ENEM');
    expect(presentation.support.label).toBe('Equilibrio hibrido');
  });

  it('gera narrativa hibrida com foco principal no concurso', () => {
    const presentation = buildHomeTodayPresentation(
      buildState(),
      buildContext({
        profile: 'hibrido',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
        hibrido: {
          primaryFocus: 'concurso',
        },
      }),
    );

    expect(presentation.hero.title).toBe('Hoje a prioridade esta no PF Administrativo 2025, mantendo avanco no ENEM.');
    expect(presentation.dayStatus.value).toBe('Concurso no centro');
    expect(presentation.primaryPanel.title).toBe('Estudar bloco principal do concurso');
  });

  it('gera narrativa hibrida equilibrada mesmo em estado concluido', () => {
    const presentation = buildHomeTodayPresentation(
      buildState({
        priority: 'study',
        phase: 'concluido',
        isDone: true,
      }),
      buildContext({
        profile: 'hibrido',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
        hibrido: {
          primaryFocus: 'equilibrado',
        },
      }),
    );

    expect(presentation.tone).toBe('completed');
    expect(presentation.hero.title).toBe('Bloco principal da rotina hibrida concluido');
    expect(presentation.dayStatus.value).toBe('Rotina hibrida concluida');
    expect(presentation.support.headline).toBe('Hoje o plano esta equilibrado entre ENEM e PF Administrativo 2025.');
  });
});
