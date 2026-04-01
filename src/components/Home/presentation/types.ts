import type { HomeTodayState } from '../homeTodayState';

export type HomePresentationTone = 'default' | 'active' | 'completed';
export type HomeSupportTone = 'default' | 'quiet';
export type HomeTrackProfile = 'enem' | 'concurso' | 'faculdade' | 'outros' | 'hibrido';
export type HomeHybridPrimaryFocus = 'enem' | 'concurso' | 'equilibrado';
export type HomeCollegeFocus = 'rotina' | 'provas' | 'trabalhos';
export type HomeOtherFocus = 'aprender' | 'praticar' | 'rotina' | 'evoluir_tema';

export interface HomeTrackContext {
  profile: HomeTrackProfile;
  summaryTitle?: string | null;
  summaryDescription?: string | null;
  examGoal?: string | null;
  examDate?: string | null;
  enem?: {
    targetCollege?: string | null;
    targetCourse?: string | null;
  } | null;
  concurso?: {
    name?: string | null;
    board?: string | null;
    area?: string | null;
  } | null;
  faculdade?: {
    institution?: string | null;
    course?: string | null;
    semester?: string | null;
    focus?: HomeCollegeFocus | null;
  } | null;
  outros?: {
    goalTitle?: string | null;
    focus?: HomeOtherFocus | null;
    deadline?: string | null;
  } | null;
  hibrido?: {
    primaryFocus?: HomeHybridPrimaryFocus | null;
  } | null;
}

export interface HomeTodayPresentation {
  tone: HomePresentationTone;
  hero: HomeTodayState['hero'] & {
    chips: string[];
  };
  dayStatus: HomeTodayState['dayStatus'];
  primaryPanel: HomeTodayState['primaryPanel'];
  continuityPanel: HomeTodayState['continuityPanel'];
  support: {
    label: string;
    tone: HomeSupportTone;
    headline?: string;
    detail?: string;
  };
}

export interface HomeTrackPresentationBuilderArgs {
  state: HomeTodayState;
  presentation: HomeTodayPresentation;
  context: HomeTrackContext;
}

export type HomeTrackPresentationBuilder = (
  args: HomeTrackPresentationBuilderArgs,
) => HomeTodayPresentation;
