import type { StudyMethod } from '../types';

export const STUDY_METHODS: StudyMethod[] = [
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    description: 'Ideal para constância e foco em blocos curtos.',
    isPremium: false,
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    focusMinutes: 90,
    breakMinutes: 20,
    longBreakMinutes: 45,
    cyclesBeforeLongBreak: 2,
    description: 'Blocos longos para alta concentração.',
    isPremium: false,
  },
  {
    id: '52-17',
    name: '52/17',
    focusMinutes: 52,
    breakMinutes: 17,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 2,
    description: 'Cadência equilibrada entre foco e recuperação.',
    isPremium: false,
  },
  {
    id: '90-30',
    name: '90/30',
    focusMinutes: 90,
    breakMinutes: 30,
    longBreakMinutes: 60,
    cyclesBeforeLongBreak: 1,
    description: 'Sessões intensas para revisões profundas.',
    isPremium: true,
  },
  {
    id: '120-20',
    name: '120/20',
    focusMinutes: 120,
    breakMinutes: 20,
    longBreakMinutes: 75,
    cyclesBeforeLongBreak: 2,
    description: 'Alta imersão para reta final e revisão pesada.',
    isPremium: true,
  },
  {
    id: 'maratona-180',
    name: 'Maratona 180',
    focusMinutes: 180,
    breakMinutes: 20,
    longBreakMinutes: 90,
    cyclesBeforeLongBreak: 1,
    description: 'Sessão extrema para simulados e consolidação total.',
    isPremium: true,
  },
];

export const getStudyMethodById = (id: string): StudyMethod => {
  return STUDY_METHODS.find((method) => method.id === id) || STUDY_METHODS[0];
};
