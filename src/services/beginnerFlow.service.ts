import type {
  BeginnerMission,
  BeginnerPlan,
  BeginnerState,
  BeginnerMissionStatus,
  BeginnerMissionTarget,
} from '../types';

type BeginnerTrack = BeginnerPlan['track'];

type MissionTemplate = {
  focus: string;
  tasks: Array<{ discipline: string; topic: string }>;
  target: BeginnerMissionTarget;
};

type SessionSubmissionInput = {
  plan: BeginnerPlan;
  completedAt?: string;
  missionId?: string;
};

const QUESTION_COUNT = 10;
const REVIEW_MINUTES = 5;

const MISSION_TEMPLATES: Record<BeginnerTrack, { focusAreas: string[]; missions: MissionTemplate[] }> = {
  enem: {
    focusAreas: ['Matematica', 'Linguagens', 'Humanas'],
    missions: [
      { focus: 'Primeiro movimento', tasks: [{ discipline: 'Matematica', topic: 'Porcentagem' }, { discipline: 'Linguagens', topic: 'Interpretacao de texto' }, { discipline: 'Humanas', topic: 'Brasil Colonia' }], target: 'questoes' },
      { focus: 'Ganho de ritmo', tasks: [{ discipline: 'Matematica', topic: 'Regra de 3' }, { discipline: 'Linguagens', topic: 'Figuras de linguagem' }, { discipline: 'Humanas', topic: 'Brasil Imperio' }], target: 'questoes' },
      { focus: 'Base de resolucao', tasks: [{ discipline: 'Matematica', topic: 'Equacao de 1 grau' }, { discipline: 'Linguagens', topic: 'Classes gramaticais' }, { discipline: 'Humanas', topic: 'Republica Velha' }], target: 'questoes' },
      { focus: 'Consistencia', tasks: [{ discipline: 'Matematica', topic: 'Fracoes' }, { discipline: 'Linguagens', topic: 'Concordancia' }, { discipline: 'Humanas', topic: 'Era Vargas' }], target: 'questoes' },
      { focus: 'Ajuste fino', tasks: [{ discipline: 'Matematica', topic: 'Razao e proporcao' }, { discipline: 'Linguagens', topic: 'Coesao e coerencia' }, { discipline: 'Humanas', topic: 'Ditadura militar' }], target: 'questoes' },
      { focus: 'Revisao guiada', tasks: [{ discipline: 'Matematica', topic: 'Erros da semana' }, { discipline: 'Linguagens', topic: 'Erros da semana' }, { discipline: 'Humanas', topic: 'Erros da semana' }], target: 'questoes' },
      { focus: 'Simulado leve', tasks: [{ discipline: 'Matematica', topic: 'Bloco misto' }, { discipline: 'Linguagens', topic: 'Bloco misto' }, { discipline: 'Humanas', topic: 'Bloco misto' }], target: 'simulado' },
    ],
  },
  concursos: {
    focusAreas: ['Portugues', 'Raciocinio Logico', 'Direito Constitucional'],
    missions: [
      { focus: 'Nucleo do edital', tasks: [{ discipline: 'Portugues', topic: 'Interpretacao de texto' }, { discipline: 'Raciocinio Logico', topic: 'Proposicoes' }, { discipline: 'Direito Constitucional', topic: 'Principios fundamentais' }], target: 'questoes' },
      { focus: 'Base para pontuar', tasks: [{ discipline: 'Portugues', topic: 'Classes gramaticais' }, { discipline: 'Raciocinio Logico', topic: 'Conectivos logicos' }, { discipline: 'Direito Constitucional', topic: 'Direitos fundamentais' }], target: 'questoes' },
      { focus: 'Leitura de banca', tasks: [{ discipline: 'Portugues', topic: 'Concordancia' }, { discipline: 'Raciocinio Logico', topic: 'Negacoes' }, { discipline: 'Direito Constitucional', topic: 'Organizacao do Estado' }], target: 'questoes' },
      { focus: 'Rotina objetiva', tasks: [{ discipline: 'Portugues', topic: 'Pontuacao' }, { discipline: 'Raciocinio Logico', topic: 'Tabelas verdade' }, { discipline: 'Direito Constitucional', topic: 'Poderes da Uniao' }], target: 'questoes' },
      { focus: 'Fixacao', tasks: [{ discipline: 'Portugues', topic: 'Crase' }, { discipline: 'Raciocinio Logico', topic: 'Analise combinatoria basica' }, { discipline: 'Direito Constitucional', topic: 'Controle de constitucionalidade' }], target: 'questoes' },
      { focus: 'Revisao de banca', tasks: [{ discipline: 'Portugues', topic: 'Erros da semana' }, { discipline: 'Raciocinio Logico', topic: 'Erros da semana' }, { discipline: 'Direito Constitucional', topic: 'Erros da semana' }], target: 'questoes' },
      { focus: 'Mini simulado', tasks: [{ discipline: 'Portugues', topic: 'Bloco misto' }, { discipline: 'Raciocinio Logico', topic: 'Bloco misto' }, { discipline: 'Direito Constitucional', topic: 'Bloco misto' }], target: 'simulado' },
    ],
  },
  hibrido: {
    focusAreas: ['Matematica', 'Portugues', 'Humanas'],
    missions: [
      { focus: 'Partida hibrida', tasks: [{ discipline: 'Matematica', topic: 'Porcentagem' }, { discipline: 'Portugues', topic: 'Interpretacao de texto' }, { discipline: 'Humanas', topic: 'Brasil Colonia' }], target: 'questoes' },
      { focus: 'Alternancia', tasks: [{ discipline: 'Natureza', topic: 'Leitura de graficos' }, { discipline: 'Raciocinio Logico', topic: 'Proposicoes' }, { discipline: 'Portugues', topic: 'Classes gramaticais' }], target: 'questoes' },
      { focus: 'Base comum', tasks: [{ discipline: 'Humanas', topic: 'Republica Velha' }, { discipline: 'Direito Constitucional', topic: 'Principios fundamentais' }, { discipline: 'Matematica', topic: 'Regra de 3' }], target: 'questoes' },
      { focus: 'Consistencia', tasks: [{ discipline: 'Portugues', topic: 'Concordancia' }, { discipline: 'Natureza', topic: 'Energia e cotidiano' }, { discipline: 'Raciocinio Logico', topic: 'Conectivos logicos' }], target: 'questoes' },
      { focus: 'Ajuste de lacunas', tasks: [{ discipline: 'Matematica', topic: 'Fracoes' }, { discipline: 'Humanas', topic: 'Era Vargas' }, { discipline: 'Direito Constitucional', topic: 'Direitos fundamentais' }], target: 'questoes' },
      { focus: 'Revisao mista', tasks: [{ discipline: 'Matematica', topic: 'Erros da semana' }, { discipline: 'Portugues', topic: 'Erros da semana' }, { discipline: 'Direito Constitucional', topic: 'Erros da semana' }], target: 'questoes' },
      { focus: 'Simulado combinado', tasks: [{ discipline: 'Matematica', topic: 'Bloco misto' }, { discipline: 'Portugues', topic: 'Bloco misto' }, { discipline: 'Humanas', topic: 'Bloco misto' }], target: 'simulado' },
    ],
  },
};

const getStarterStudyMinutes = (dailyGoalMinutes: number): number => {
  if (dailyGoalMinutes <= 35) {
    return 15;
  }

  if (dailyGoalMinutes <= 90) {
    return 25;
  }

  return 30;
};

const createMission = (
  track: BeginnerTrack,
  template: MissionTemplate,
  index: number,
  studyMinutes: number,
  status: BeginnerMissionStatus,
): BeginnerMission => ({
  id: `${track}-day-${index + 1}`,
  dayNumber: index + 1,
  dayLabel: `Dia ${index + 1}`,
  focus: template.focus,
  tasks: template.tasks,
  studyMinutes,
  questionCount: index === 5 ? 20 : index === 6 ? 30 : QUESTION_COUNT,
  reviewMinutes: index === 6 ? 0 : REVIEW_MINUTES,
  target: template.target,
  status,
  completedAt: null,
});

const getPendingMission = (plan: BeginnerPlan): BeginnerMission | null =>
  plan.missions.find((mission) => mission.status === 'ready') ?? null;

const getCompletedCount = (plan: BeginnerPlan): number =>
  plan.missions.filter((mission) => mission.status === 'completed').length;

const deriveStateFromPlan = (plan: BeginnerPlan, fallback: BeginnerState = 'ready_for_first_session'): BeginnerState => {
  const completedCount = getCompletedCount(plan);
  if (completedCount === 0) {
    return fallback === 'in_session' ? fallback : 'ready_for_first_session';
  }

  if (completedCount >= plan.missions.length) {
    return 'week_complete';
  }

  return completedCount === 1 ? 'post_session' : 'day_2';
};

export const beginnerFlowService = {
  generatePlan(track: BeginnerTrack, dailyGoalMinutes: number): BeginnerPlan {
    const template = MISSION_TEMPLATES[track];
    const studyMinutes = getStarterStudyMinutes(dailyGoalMinutes);

    return {
      track,
      generatedAt: new Date().toISOString(),
      focusAreas: template.focusAreas,
      missions: template.missions.map((mission, index) =>
        createMission(track, mission, index, studyMinutes, index === 0 ? 'ready' : 'locked'),
      ),
    };
  },

  completeOnboarding(track: BeginnerTrack, dailyGoalMinutes: number): { state: BeginnerState; plan: BeginnerPlan } {
    const plan = this.generatePlan(track, dailyGoalMinutes);
    return { state: 'ready_for_first_session', plan };
  },

  getTodayMission(plan: BeginnerPlan | null | undefined): BeginnerMission | null {
    if (!plan) {
      return null;
    }

    return getPendingMission(plan) ?? plan.missions[plan.missions.length - 1] ?? null;
  },

  startSession(plan: BeginnerPlan | null | undefined): BeginnerState {
    if (!plan) {
      return 'in_session';
    }

    return deriveStateFromPlan(plan, 'in_session');
  },

  submitSession({ plan, missionId, completedAt = new Date().toISOString() }: SessionSubmissionInput): {
    plan: BeginnerPlan;
    state: BeginnerState;
    completedMission: BeginnerMission | null;
    nextMission: BeginnerMission | null;
  } {
    const targetMissionId = missionId ?? getPendingMission(plan)?.id;
    if (!targetMissionId) {
      return {
        plan,
        state: deriveStateFromPlan(plan),
        completedMission: null,
        nextMission: null,
      };
    }

    let completedMission: BeginnerMission | null = null;
    let unlockNext = false;

    const missions: BeginnerMission[] = plan.missions.map((mission) => {
      if (mission.id === targetMissionId) {
        completedMission = {
          ...mission,
          status: 'completed',
          completedAt,
        };
        unlockNext = true;
        return completedMission;
      }

      if (unlockNext && mission.status === 'locked') {
        unlockNext = false;
        return {
          ...mission,
          status: 'ready',
        };
      }

      return mission;
    });

    const nextPlan: BeginnerPlan = {
      ...plan,
      missions,
    };

    return {
      plan: nextPlan,
      state: deriveStateFromPlan(nextPlan),
      completedMission,
      nextMission: getPendingMission(nextPlan),
    };
  },

  syncState(plan: BeginnerPlan | null | undefined, currentState: BeginnerState | null | undefined): BeginnerState | null {
    if (!plan) {
      return currentState ?? null;
    }

    if (currentState === 'onboarding') {
      return currentState;
    }

    return deriveStateFromPlan(plan, currentState ?? 'ready_for_first_session');
  },
};
