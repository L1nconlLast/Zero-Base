import {
  Award,
  BookOpen,
  Flame,
  Moon,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import type { Achievement, AchievementContext, AchievementProgressSnapshot } from '../types';

const progress = (current: number, target: number): AchievementProgressSnapshot => ({
  current: Math.max(0, Math.min(Math.round(current), target)),
  target,
});

const totalMinutesProgress = (context: AchievementContext, targetMinutes: number) =>
  progress(context.totalMinutes, targetMinutes);

const sessionsProgress = (context: AchievementContext, targetSessions: number) =>
  progress(context.sessionCount, targetSessions);

const mockExamProgress = (context: AchievementContext, targetExams: number) =>
  progress(context.completedMockExams, targetExams);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    title: 'Primeiro passo',
    description: 'Complete sua primeira sessao de estudo.',
    icon: Award,
    category: 'milestone',
    rarity: 'common',
    points: 10,
    condition: (context) => context.sessionCount >= 1,
    progress: (context) => sessionsProgress(context, 1),
  },
  {
    id: 'sessions_10',
    title: 'Ritmo de base',
    description: 'Complete 10 sessoes de estudo.',
    icon: BookOpen,
    category: 'milestone',
    rarity: 'common',
    points: 120,
    condition: (context) => context.sessionCount >= 10,
    progress: (context) => sessionsProgress(context, 10),
  },
  {
    id: 'sessions_100',
    title: 'Bibliotecario',
    description: 'Complete 100 sessoes de estudo.',
    icon: BookOpen,
    category: 'milestone',
    rarity: 'rare',
    points: 300,
    condition: (context) => context.sessionCount >= 100,
    progress: (context) => sessionsProgress(context, 100),
  },
  {
    id: 'streak_3',
    title: 'Ignicao',
    description: 'Estude por 3 dias seguidos.',
    icon: Flame,
    category: 'streak',
    rarity: 'common',
    points: 60,
    condition: (context) => context.currentStreak >= 3,
    progress: (context) => progress(context.currentStreak, 3),
  },
  {
    id: 'streak_7',
    title: 'Raio',
    description: 'Mantenha 7 dias de estudos consecutivos.',
    icon: Zap,
    category: 'streak',
    rarity: 'common',
    points: 100,
    condition: (context) => context.currentStreak >= 7,
    progress: (context) => progress(context.currentStreak, 7),
  },
  {
    id: 'streak_30',
    title: 'Chama eterna',
    description: 'Mantenha 30 dias de estudos consecutivos.',
    icon: Flame,
    category: 'streak',
    rarity: 'epic',
    points: 500,
    condition: (context) => context.currentStreak >= 30,
    progress: (context) => progress(context.currentStreak, 30),
  },
  {
    id: 'streak_100',
    title: 'Imortal',
    description: 'Mantenha 100 dias de estudos consecutivos.',
    icon: Star,
    category: 'streak',
    rarity: 'legendary',
    points: 2000,
    condition: (context) => context.currentStreak >= 100,
    progress: (context) => progress(context.currentStreak, 100),
    reward: {
      type: 'title',
      value: 'O Imortal',
    },
  },
  {
    id: 'time_1h',
    title: 'Primeira hora',
    description: 'Acumule 1 hora total de estudo.',
    icon: Timer,
    category: 'time',
    rarity: 'common',
    points: 40,
    condition: (context) => context.totalMinutes >= 60,
    progress: (context) => totalMinutesProgress(context, 60),
  },
  {
    id: 'time_10h',
    title: 'Ritmo de ferro',
    description: 'Acumule 10 horas totais de estudo.',
    icon: Timer,
    category: 'time',
    rarity: 'rare',
    points: 180,
    condition: (context) => context.totalMinutes >= 600,
    progress: (context) => totalMinutesProgress(context, 600),
  },
  {
    id: 'time_50h',
    title: 'Forja mental',
    description: 'Acumule 50 horas totais de estudo.',
    icon: Trophy,
    category: 'time',
    rarity: 'epic',
    points: 650,
    condition: (context) => context.totalMinutes >= 3000,
    progress: (context) => totalMinutesProgress(context, 3000),
  },
  {
    id: 'time_100h',
    title: 'Centuriao do foco',
    description: 'Acumule 100 horas totais de estudo.',
    icon: Trophy,
    category: 'time',
    rarity: 'legendary',
    points: 1400,
    condition: (context) => context.totalMinutes >= 6000,
    progress: (context) => totalMinutesProgress(context, 6000),
    reward: {
      type: 'badge',
      value: '100h',
    },
  },
  {
    id: 'marathoner',
    title: 'Maratonista',
    description: 'Estude 4 horas em um unico dia.',
    icon: Trophy,
    category: 'time',
    rarity: 'rare',
    points: 200,
    condition: (context) => context.bestSingleDayMinutes >= 240,
    progress: (context) => progress(context.bestSingleDayMinutes, 240),
  },
  {
    id: 'speedster',
    title: 'Velocista',
    description: 'Bata sua meta diaria em ate 2 horas no mesmo dia.',
    icon: Zap,
    category: 'goal',
    rarity: 'common',
    points: 50,
    condition: (context) =>
      context.todayMinutes >= context.userData.dailyGoal && context.todayMinutes <= 120,
    progress: (context) => progress(context.todayMinutes, context.userData.dailyGoal),
  },
  {
    id: 'night_owl',
    title: 'Coruja noturna',
    description: 'Complete 10 sessoes depois das 22h.',
    icon: Moon,
    category: 'time',
    rarity: 'rare',
    points: 150,
    condition: (context) => context.nightSessionCount >= 10,
    progress: (context) => progress(context.nightSessionCount, 10),
  },
  {
    id: 'weekly_goal_1',
    title: 'Meta da semana',
    description: 'Bata sua meta semanal de estudo.',
    icon: Target,
    category: 'goal',
    rarity: 'common',
    points: 80,
    condition: (context) => context.weeklyGoalReached,
    progress: (context) => progress(context.weeklyStudiedMinutes, context.weeklyGoalMinutes),
  },
  {
    id: 'week_warrior',
    title: 'Guerreiro semanal',
    description: 'Estude todos os 7 dias da semana.',
    icon: Trophy,
    category: 'goal',
    rarity: 'rare',
    points: 250,
    condition: (context) => context.studyDaysLast7 >= 7,
    progress: (context) => progress(context.studyDaysLast7, 7),
  },
  {
    id: 'precision',
    title: 'Precisao cirurgica',
    description: 'Atinga sua meta em 30 dias do ultimo ciclo.',
    icon: Target,
    category: 'goal',
    rarity: 'epic',
    points: 500,
    condition: (context) => context.goalMetDaysLast30 >= 30,
    progress: (context) => progress(context.goalMetDaysLast30, 30),
  },
  {
    id: 'phoenix',
    title: 'Fenix',
    description: 'Retorne aos estudos depois de uma pausa de 7 dias.',
    icon: Flame,
    category: 'milestone',
    rarity: 'rare',
    points: 100,
    condition: (context) => {
      const orderedSessions = [...context.sessions].sort(
        (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
      );

      for (let index = 1; index < orderedSessions.length; index += 1) {
        const current = new Date(orderedSessions[index].date).getTime();
        const previous = new Date(orderedSessions[index - 1].date).getTime();
        const daysDiff = Math.floor((current - previous) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 7) {
          return true;
        }
      }

      return false;
    },
  },
  {
    id: 'exam_first',
    title: 'Primeiro simulado',
    description: 'Conclua seu primeiro simulado.',
    icon: Award,
    category: 'exam',
    rarity: 'common',
    points: 90,
    condition: (context) => context.completedMockExams >= 1,
    progress: (context) => mockExamProgress(context, 1),
  },
  {
    id: 'exam_5',
    title: 'Rotina de prova',
    description: 'Conclua 5 simulados.',
    icon: Trophy,
    category: 'exam',
    rarity: 'rare',
    points: 240,
    condition: (context) => context.completedMockExams >= 5,
    progress: (context) => mockExamProgress(context, 5),
  },
  {
    id: 'exam_ace',
    title: 'Acima da media',
    description: 'Atinja 80% de acerto em um simulado.',
    icon: Star,
    category: 'exam',
    rarity: 'epic',
    points: 320,
    condition: (context) => context.bestMockExamAccuracy >= 80,
    progress: (context) => progress(context.bestMockExamAccuracy, 80),
  },
];
