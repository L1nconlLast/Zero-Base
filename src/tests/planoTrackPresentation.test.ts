import { describe, expect, it } from 'vitest';
import type { UsePlanoResult } from '../features/plano/hooks/usePlano';
import {
  buildPlanoTrackPresentation,
  type PlanoTrackContext,
} from '../features/plano/planoTrackPresentation';

const basePlan: UsePlanoResult = {
  plan: [],
  distribution: [
    {
      id: 'matematica',
      subject: 'Matematica',
      minutes: 100,
      sessions: 2,
      shareOfCycle: 40,
      relativeWeight: 100,
      statusTone: 'primary',
      statusLabel: 'Foco principal',
      detailLabel: '100 min previstos',
    },
  ],
  nextSteps: [
    {
      id: 'next-focus',
      label: 'Proximo foco',
      title: 'Matematica - Funcoes',
      detail: 'Sessao curta prevista para hoje',
      tone: 'focus',
    },
    {
      id: 'plan-continuity',
      label: 'Continuidade do plano',
      title: '3 sessoes restantes no ciclo',
      detail: 'Ajuste leve recomendado em Quarta',
      tone: 'continuity',
    },
  ],
  header: {
    eyebrow: 'Plano da semana',
    title: 'Plano principal de estudos',
    contextLine: '4.2h por semana - foco em Matematica e Linguagens',
    statusLine: 'Ciclo ativo. Hoje voce tem 2 blocos prontos e 3 sessoes restantes.',
    metrics: [
      { label: 'Carga', value: '4.2h por semana' },
      { label: 'Dias ativos', value: '4 dias' },
      { label: 'Ciclo', value: '2/5 sessoes' },
    ],
  },
  reviewState: {
    status: 'pending_today',
    label: '1 revisao pronta hoje',
    detail: 'Biologia lidera a fila de hoje.',
  },
  plannedMinutes: 250,
  activeDays: 4,
  uniqueSubjects: 4,
  averageDailyMinutes: 63,
  todayStatus: {
    label: 'Hoje ja tem trilho definido',
    detail: '2 disciplinas prontas para a execucao oficial.',
    tone: 'success',
  },
  heaviestDay: {
    label: 'Segunda',
    minutes: 100,
    subjects: 2,
  },
  lightestDay: {
    label: 'Quinta',
    minutes: 50,
    subjects: 1,
  },
  recommendedEditDay: 'thursday',
  recommendedEditCopy: 'Ajustar Quinta',
};

const buildContext = (overrides: Partial<PlanoTrackContext>): PlanoTrackContext => ({
  profile: 'enem',
  ...overrides,
});

describe('buildPlanoTrackPresentation', () => {
  it('gera leitura de preparacao para enem', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Matematica',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
        profile: 'enem',
        enem: {
          targetCollege: 'USP',
          targetCourse: 'Medicina',
        },
      }),
    });

    expect(presentation.header.title).toBe('Plano principal do ENEM');
    expect(presentation.summaryCards[0].eyebrow).toBe('Carga ENEM');
    expect(presentation.distribution.copy.title).toBe('Como sua preparacao ENEM se divide');
    expect(presentation.support.label).toBe('Radar ENEM');
  });

  it('gera leitura de edital para concurso', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Direito Administrativo',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
        examDate: '2026-08-18',
      }),
    });

    expect(presentation.header.title).toBe('Plano principal do edital');
    expect(presentation.summaryCards[1].eyebrow).toBe('Disciplinas do edital');
    expect(presentation.nextSteps.copy.title).toBe('O que pede atencao no concurso');
    expect(presentation.support.description).toContain('PF Administrativo 2025 - Cebraspe');
  });

  it('gera leitura academica para faculdade', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Calculo I',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Engenharia de Software',
          semester: '3',
          focus: 'provas',
        },
      }),
    });

    expect(presentation.header.title).toBe('Plano das provas da faculdade');
    expect(presentation.summaryCards[0].eyebrow).toBe('Carga academica');
    expect(presentation.distribution.copy.title).toBe('Como as materias se dividem nesta semana');
    expect(presentation.support.label).toBe('Contexto academico');
  });

  it('gera leitura de trilha para outros', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Programacao Web',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Programacao web',
          focus: 'praticar',
          deadline: null,
        },
      }),
    });

    expect(presentation.header.title).toBe('Plano principal da sua trilha');
    expect(presentation.summaryCards[1].eyebrow).toBe('Temas ativos');
    expect(presentation.nextSteps.copy.title).toBe('O que vem a seguir na sua evolucao');
    expect(presentation.support.label).toBe('Trilha pessoal');
  });

  it('gera narrativa hibrida com foco principal no enem', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Matematica',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
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
    });

    expect(presentation.header.title).toBe('Plano hibrido com ENEM no centro');
    expect(presentation.summaryCards[2].value).toBe('ENEM no centro');
    expect(presentation.support.label).toBe('Equilibrio hibrido');
  });

  it('gera narrativa hibrida com foco principal no concurso', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Direito Administrativo',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
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
    });

    expect(presentation.header.title).toBe('Plano hibrido com concurso no centro');
    expect(presentation.summaryCards[2].value).toBe('PF Administrativo 2025 no centro');
    expect(presentation.nextSteps.copy.title).toBe('O que vem a seguir nas duas frentes');
  });

  it('gera narrativa hibrida equilibrada', () => {
    const presentation = buildPlanoTrackPresentation({
      plan: basePlan,
      currentBlockLabel: 'Matematica',
      weeklyCompletedSessions: 2,
      weeklyPlannedSessions: 5,
      context: buildContext({
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
    });

    expect(presentation.header.title).toBe('Plano hibrido equilibrado');
    expect(presentation.summaryCards[2].value).toBe('Equilibrio entre as frentes');
    expect(presentation.support.description).toContain('As duas frentes seguem ativas');
  });
});
