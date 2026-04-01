import { describe, expect, it, vi } from 'vitest';
import {
  buildStudyTrackPresentation,
  type StudyTrackContext,
} from '../features/estudos/studyTrackPresentation';
import type {
  ExecutionCoreData,
  PostExecutionBandData,
  SessionHeaderData,
  StudyExecutionRailData,
  SupportRailData,
} from '../features/estudos';

const baseSessionHeader: SessionHeaderData = {
  contextLabel: 'Matematica',
  sessionTypeLabel: 'Sessao focada',
  title: 'Praticar porcentagem',
  status: 'running',
  plannedMinutes: 25,
  currentStepLabel: '3 questoes depois do foco',
  progressLabel: 'Bloco oficial pronto para hoje',
  primaryActionLabel: 'Continuar sessao',
  onPrimaryAction: vi.fn(),
  secondaryActionLabel: 'Ver plano',
  onSecondaryAction: vi.fn(),
};

const baseExecutionCore: ExecutionCoreData = {
  status: 'running',
  timerLabel: '~25 min',
  timerStateLabel: 'Sessao em andamento',
  primaryGoal: 'Fechar Porcentagem e validar 3 questoes',
  progressLabel: '3 questoes previstas',
  secondaryProgressLabel: '3 questoes previstas para validar este bloco.',
  currentStepLabel: 'Etapa 1 de 3',
  progressPercent: 38,
  emphasisLevel: 'default',
};

const baseSupportRail: SupportRailData = {
  intro: 'Consulte esta coluna apenas para acompanhar etapas e fechar o registro quando o bloco terminar.',
  checklist: {
    title: 'Checklist da sessao',
    progressLabel: '1 de 3 em andamento',
    items: [
      { id: 'focus', label: 'Executar o bloco principal', status: 'active' },
      { id: 'practice', label: 'Validar com 3 questoes', status: 'pending' },
      { id: 'closure', label: 'Registrar e encerrar a sessao', status: 'pending' },
    ],
  },
  closure: {
    title: 'Fechamento',
    message: 'Conclua o foco e volte aqui apenas para registrar o que saiu desta sessao.',
    actionLabel: 'Fechamento liberado no fim do bloco',
    emphasis: 'subtle',
  },
};

const basePostExecutionBand: PostExecutionBandData = {
  context: {
    contextLabel: 'Matematica / Porcentagem',
    parentLabel: 'ENEM / Ciclo guiado',
    sequenceLabel: 'Etapa 1 de 3 / 300 min na semana',
  },
  continuity: {
    nextStepLabel: 'Depois desta sessao: validar 3 questoes e registrar o bloco.',
    followUpLabel: 'A continuidade aparece aqui so para fechar o fluxo desta sessao com o plano maior.',
    progressHintLabel: 'Ritmo ativo: Ciclo guiado',
  },
};

const baseExecutionRail: StudyExecutionRailData = {
  eyebrow: 'Execucao do estudo',
  title: 'O bloco atual conduz esta sessao',
  description: '3 questoes previstas para validar este bloco.',
  blockChipLabel: 'Matematica',
  durationChipLabel: '~25 min',
  modeChipLabel: 'Pomodoro ativo',
};

const buildContext = (overrides: Partial<StudyTrackContext>): StudyTrackContext => ({
  profile: 'enem',
  ...overrides,
});

describe('buildStudyTrackPresentation', () => {
  it('gera linguagem de preparacao para enem', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'enem',
        enem: {
          triedBefore: 'nao',
          profileLevel: 'iniciante',
          targetCollege: 'USP',
          targetCourse: 'Medicina',
        },
      }),
      state: {
        currentBlockLabel: 'Matematica',
        currentBlockObjective: 'Porcentagem',
        currentTargetQuestions: 3,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('ENEM / Matematica');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Fundamentos da area');
    expect(presentation.sessionHeader.title).toBe('Construir base em Matematica');
    expect(presentation.executionCore.eyebrowLabel).toBe('Nucleo do ENEM');
    expect(presentation.executionCore.primaryGoal).toContain('Firmar a base');
    expect(presentation.supportRail.eyebrow).toBe('Apoio ENEM');
    expect(presentation.supportRail.checklist.title).toBe('Checklist dos fundamentos');
    expect(presentation.postExecutionBand.contextTitle).toBe('Contexto da base ENEM');
  });

  it('gera linguagem de edital para concurso', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
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
      state: {
        currentBlockLabel: 'Direito Administrativo',
        currentBlockObjective: 'Lei seca',
        currentTargetQuestions: 3,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('Concurso / Direito Administrativo');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Questoes da banca');
    expect(presentation.sessionHeader.title).toBe('Resolver 3 questoes de Cebraspe');
    expect(presentation.executionRail.title).toBe('Este bloco de banca conduz a sessao');
    expect(presentation.supportRail.checklist.title).toBe('Checklist da banca');
  });

  it('gera linguagem academica para faculdade', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'faculdade',
        faculdade: {
          institution: 'UFC',
          course: 'Engenharia de Software',
          semester: '3',
          focus: 'provas',
        },
      }),
      state: {
        currentBlockLabel: 'Calculo I',
        currentBlockObjective: 'Limites',
        currentTargetQuestions: 0,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('Faculdade / Calculo I');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Preparacao para prova');
    expect(presentation.sessionHeader.title).toBe('Revisar Limites para Calculo I');
    expect(presentation.executionCore.primaryGoal).toContain('pontos de maior risco');
    expect(presentation.supportRail.eyebrow).toBe('Apoio academico');
    expect(presentation.supportRail.checklist.title).toBe('Checklist da prova');
    expect(presentation.executionRail.title).toBe('Esta prova atual conduz a sessao');
  });

  it('gera linguagem de trilha para outros', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
      preferredStudyTrack: 'enem',
      context: buildContext({
        profile: 'outros',
        outros: {
          goalTitle: 'Programacao web',
          focus: 'praticar',
          deadline: null,
        },
      }),
      state: {
        currentBlockLabel: 'JavaScript',
        currentBlockObjective: 'Fetch API',
        currentTargetQuestions: 0,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('Trilha / JavaScript');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Pratica guiada');
    expect(presentation.sessionHeader.title).toBe('Praticar Fetch API');
    expect(presentation.supportRail.checklist.title).toBe('Checklist da pratica');
    expect(presentation.supportRail.eyebrow).toBe('Apoio da trilha');
    expect(presentation.executionRail.title).toBe('Esta pratica conduz a sessao');
  });

  it('gera contexto explicito para hibrido com bloco ENEM', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
      preferredStudyTrack: 'hibrido',
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
      state: {
        currentBlockLabel: 'Matematica',
        currentBlockObjective: 'Porcentagem',
        currentTargetQuestions: 3,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('ENEM / Matematica');
    expect(presentation.executionRail.blockChipLabel).toBe('Origem: ENEM');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Pratica ENEM');
    expect(presentation.supportRail.checklist.title).toBe('Checklist do bloco ENEM');
    expect(presentation.postExecutionBand.continuity.progressHintLabel).toBe('ENEM no centro hoje');
  });

  it('gera contexto explicito para hibrido com bloco Concurso', () => {
    const presentation = buildStudyTrackPresentation({
      sessionHeader: baseSessionHeader,
      executionCore: baseExecutionCore,
      supportRail: baseSupportRail,
      postExecutionBand: basePostExecutionBand,
      executionRail: baseExecutionRail,
      preferredStudyTrack: 'hibrido',
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
      state: {
        currentBlockLabel: 'Direito Administrativo',
        currentBlockObjective: 'Lei seca',
        currentTargetQuestions: 3,
        activeStudyMethodName: 'Ciclo guiado',
        isBlocked: false,
        showQuestionTransitionState: false,
        showPostFocusState: false,
      },
    });

    expect(presentation.sessionHeader.contextLabel).toBe('Concurso / Direito Administrativo');
    expect(presentation.executionRail.blockChipLabel).toBe('Origem: Concurso');
    expect(presentation.sessionHeader.sessionTypeLabel).toBe('Questoes da banca');
    expect(presentation.postExecutionBand.continuity.nextStepLabel).toContain('ENEM');
  });
});
