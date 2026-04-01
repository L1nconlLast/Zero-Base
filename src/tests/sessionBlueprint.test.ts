import { describe, expect, it } from 'vitest';
import { buildStudySessionBlueprint } from '../features/estudos/sessionBlueprint';
import type { StudyTrackContext } from '../features/estudos/studyTrackPresentation';
import type { StudyTrackPresentationBuilderState } from '../features/estudos/presentation/types';

const buildState = (overrides: Partial<StudyTrackPresentationBuilderState>): StudyTrackPresentationBuilderState => ({
  currentBlockLabel: 'Bloco atual',
  currentBlockObjective: 'Bloco oficial do dia',
  currentTargetQuestions: 0,
  activeStudyMethodName: 'Ciclo guiado',
  isBlocked: false,
  showQuestionTransitionState: false,
  showPostFocusState: false,
  ...overrides,
});

const buildContext = (overrides: Partial<StudyTrackContext>): StudyTrackContext => ({
  profile: 'faculdade',
  ...overrides,
});

describe('buildStudySessionBlueprint', () => {
  it('gera blueprint de fundamentos para ENEM iniciante', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'enem',
        examDate: '2026-11-09',
        enem: {
          triedBefore: 'nao',
          profileLevel: 'iniciante',
          targetCollege: 'UFPI',
          targetCourse: 'Direito',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Matematica',
        currentBlockObjective: 'Porcentagem',
      }),
    });

    expect(blueprint?.mode).toBe('foundation');
    expect(blueprint?.sessionTypeLabel).toBe('Fundamentos da area');
    expect(blueprint?.checklistTitle).toBe('Checklist dos fundamentos');
  });

  it('gera blueprint de pratica para ENEM intermediario', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Natureza',
        currentBlockObjective: 'Ecologia',
        currentTargetQuestions: 6,
      }),
    });

    expect(blueprint?.mode).toBe('practice');
    expect(blueprint?.title).toContain('Resolver 6 questoes');
    expect(blueprint?.postProgressHintLabel).toBe('Modo atual: pratica ENEM');
  });

  it('gera blueprint de bloco de prova para ENEM avancado', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'sim',
          profileLevel: 'avancado',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Linguagens',
        currentBlockObjective: 'Interpretacao',
        currentTargetQuestions: 10,
      }),
    });

    expect(blueprint?.mode).toBe('exam_block');
    expect(blueprint?.sessionTypeLabel).toBe('Bloco de prova');
  });

  it('gera blueprint de base do edital para concurso iniciante', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'concursos',
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
      state: buildState({
        currentBlockLabel: 'Direito Administrativo',
        currentBlockObjective: 'Atos administrativos',
      }),
    });

    expect(blueprint?.mode).toBe('contest_base');
    expect(blueprint?.checklistTitle).toBe('Checklist da base do edital');
  });

  it('gera blueprint de questoes da banca para concurso com banca definida', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'concursos',
      context: buildContext({
        profile: 'concurso',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Direito Administrativo',
        currentBlockObjective: 'Lei seca',
        currentTargetQuestions: 8,
      }),
    });

    expect(blueprint?.mode).toBe('board_questions');
    expect(blueprint?.sessionTypeLabel).toBe('Questoes da banca');
  });

  it('gera blueprint de reta final para concurso com prova proxima', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 20);
    const yyyy = soon.getFullYear();
    const mm = String(soon.getMonth() + 1).padStart(2, '0');
    const dd = String(soon.getDate()).padStart(2, '0');

    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'concursos',
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
      state: buildState({
        currentBlockLabel: 'Portugues',
        currentBlockObjective: 'Interpretacao',
        currentTargetQuestions: 6,
      }),
    });

    expect(blueprint?.mode).toBe('final_sprint');
    expect(blueprint?.sessionTypeLabel).toBe('Reta final');
  });

  it('compõe blueprint hibrido com origem ENEM e continuidade de concurso', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'hibrido',
      context: buildContext({
        profile: 'hibrido',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
        },
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
        hibrido: {
          primaryFocus: 'enem',
          availableStudyTime: 'medio',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Matematica',
        currentBlockObjective: 'Porcentagem',
        currentTargetQuestions: 5,
      }),
    });

    expect(blueprint?.mode).toBe('practice');
    expect(blueprint?.checklistTitle).toBe('Checklist do bloco ENEM');
    expect(blueprint?.postNextStepLabel).toContain('PF Administrativo 2025');
  });

  it('compõe blueprint hibrido com origem Concurso e continuidade ENEM', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'hibrido',
      context: buildContext({
        profile: 'hibrido',
        concurso: {
          name: 'PF Administrativo 2025',
          board: 'Cebraspe',
          area: 'Administrativo',
          experienceLevel: 'intermediario',
        },
        enem: {
          triedBefore: 'sim',
          profileLevel: 'intermediario',
        },
        hibrido: {
          primaryFocus: 'concurso',
          availableStudyTime: 'baixo',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Direito Administrativo',
        currentBlockObjective: 'Lei seca',
        currentTargetQuestions: 6,
      }),
    });

    expect(blueprint?.mode).toBe('board_questions');
    expect(blueprint?.checklistTitle).toBe('Checklist do bloco Concurso');
    expect(blueprint?.postNextStepLabel).toContain('ENEM');
  });

  it('gera blueprint de rotina para faculdade', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Biologia',
          semester: '2',
          focus: 'rotina',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Biologia Celular',
        currentBlockObjective: 'Citologia',
      }),
    });

    expect(blueprint?.mode).toBe('routine');
    expect(blueprint?.title).toBe('Cobrir Citologia em Biologia Celular');
    expect(blueprint?.checklistTitle).toBe('Checklist da rotina academica');
  });

  it('gera blueprint de provas para faculdade', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Quimica',
          semester: '4',
          focus: 'provas',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Bioquimica',
        currentBlockObjective: 'Enzimas',
        currentTargetQuestions: 6,
      }),
    });

    expect(blueprint?.mode).toBe('exam_review');
    expect(blueprint?.sessionTypeLabel).toBe('Preparacao para prova');
    expect(blueprint?.primaryGoal).toContain('pontos de maior risco');
  });

  it('gera blueprint de trabalhos para faculdade', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'IFPI',
          course: 'ADS',
          semester: '5',
          focus: 'trabalhos',
        },
      }),
      state: buildState({
        currentBlockLabel: 'Metodologia Cientifica',
        currentBlockObjective: 'Introducao do relatorio',
      }),
    });

    expect(blueprint?.mode).toBe('assignment_execution');
    expect(blueprint?.checklistTitle).toBe('Checklist da entrega');
    expect(blueprint?.executionRailBlockChipLabel).toBe('Entrega: Metodologia Cientifica');
  });

  it('gera blueprint de aprendizado para outros', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'JavaScript',
          focus: 'aprender',
          deadline: null,
        },
      }),
      state: buildState({
        currentBlockLabel: 'JavaScript',
        currentBlockObjective: 'Closures',
      }),
    });

    expect(blueprint?.mode).toBe('learning');
    expect(blueprint?.title).toBe('Construir base em Closures');
    expect(blueprint?.checklistTitle).toBe('Checklist de aprendizado');
  });

  it('gera blueprint de pratica para outros', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'JavaScript',
          focus: 'praticar',
          deadline: null,
        },
      }),
      state: buildState({
        currentBlockLabel: 'JavaScript',
        currentBlockObjective: 'Fetch API',
        currentTargetQuestions: 4,
      }),
    });

    expect(blueprint?.mode).toBe('practice');
    expect(blueprint?.checklistTitle).toBe('Checklist da pratica');
    expect(blueprint?.primaryGoal).toContain('repeticao util');
  });

  it('gera blueprint de consistencia para outros', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Ingles',
          focus: 'rotina',
          deadline: null,
        },
      }),
      state: buildState({
        currentBlockLabel: 'Listening',
        currentBlockObjective: 'Bloco oficial do dia',
      }),
    });

    expect(blueprint?.mode).toBe('consistency');
    expect(blueprint?.title).toBe('Manter constancia em Ingles');
    expect(blueprint?.postProgressHintLabel).toBe('Foco atual: criar rotina');
  });

  it('gera blueprint de progressao para outros', () => {
    const blueprint = buildStudySessionBlueprint({
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Programacao funcional',
          focus: 'evoluir_tema',
          deadline: null,
        },
      }),
      state: buildState({
        currentBlockLabel: 'Programacao funcional',
        currentBlockObjective: 'Funcoes puras',
      }),
    });

    expect(blueprint?.mode).toBe('topic_progression');
    expect(blueprint?.checklistTitle).toBe('Checklist da progressao');
    expect(blueprint?.postProgressHintLabel).toBe('Foco atual: evoluir em um tema');
  });
});
