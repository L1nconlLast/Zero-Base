import { 
  Zap, 
  Moon, 
  Flame, 
  Trophy, 
  BookOpen, 
  Target,
  Star,
  Award
} from 'lucide-react';
import { Achievement } from '../types';

const toDayKey = (value: string) => value.slice(0, 10);

export const ACHIEVEMENTS: Achievement[] = [
  // CONQUISTAS DE STREAK
  {
    id: 'streak_7',
    title: 'Raio',
    description: 'Mantenha 7 dias de estudos consecutivos',
    icon: Zap,
    category: 'streak',
    rarity: 'common',
    points: 100,
    condition: (data) => (data.currentStreak || data.streak) >= 7,
    progress: (data) => ({ current: data.currentStreak || data.streak, target: 7 })
  },
  {
    id: 'streak_30',
    title: 'Chama Eterna',
    description: 'Mantenha 30 dias de estudos consecutivos',
    icon: Flame,
    category: 'streak',
    rarity: 'epic',
    points: 500,
    condition: (data) => (data.currentStreak || data.streak) >= 30,
    progress: (data) => ({ current: data.currentStreak || data.streak, target: 30 })
  },
  {
    id: 'streak_100',
    title: 'Imortal',
    description: 'Mantenha 100 dias de estudos consecutivos',
    icon: Star,
    category: 'streak',
    rarity: 'legendary',
    points: 2000,
    condition: (data) => (data.currentStreak || data.streak) >= 100,
    progress: (data) => ({ current: data.currentStreak || data.streak, target: 100 }),
    reward: {
      type: 'title',
      value: 'O Imortal'
    }
  },
  
  // CONQUISTAS DE TEMPO
  {
    id: 'marathoner',
    title: 'Maratonista',
    description: 'Estude 4 horas em um único dia',
    icon: Trophy,
    category: 'time',
    rarity: 'rare',
    points: 200,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      return sessions.some(s => (s.minutes || s.duration) >= 240);
    }
  },
  {
    id: 'speedster',
    title: 'Velocista',
    description: 'Complete sua meta diária em menos de 2 horas',
    icon: Zap,
    category: 'time',
    rarity: 'common',
    points: 50,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = sessions.filter(s => toDayKey(s.date) === today);
      const totalToday = todaySessions.reduce((sum, s) => sum + (s.minutes || s.duration), 0);
      return totalToday >= data.dailyGoal && totalToday <= 120;
    }
  },
  {
    id: 'night_owl',
    title: 'Coruja Noturna',
    description: 'Complete 10 sessões de estudo após as 22h',
    icon: Moon,
    category: 'time',
    rarity: 'rare',
    points: 150,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const nightSessions = sessions.filter(s => {
        const hour = s.timestamp ? new Date(s.timestamp).getHours() : 22;
        return hour >= 22 || hour < 6;
      });
      return nightSessions.length >= 10;
    },
    progress: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const nightSessions = sessions.filter(s => {
        const hour = s.timestamp ? new Date(s.timestamp).getHours() : 22;
        return hour >= 22 || hour < 6;
      }).length;
      return { current: nightSessions, target: 10 };
    }
  },
  
  // CONQUISTAS DE MILESTONE
  {
    id: 'sessions_100',
    title: 'Bibliotecário',
    description: 'Complete 100 sessões de estudo',
    icon: BookOpen,
    category: 'milestone',
    rarity: 'rare',
    points: 300,
    condition: (data) => (data.sessions || data.studyHistory || []).length >= 100,
    progress: (data) => ({ 
      current: (data.sessions || data.studyHistory || []).length, 
      target: 100 
    })
  },
  {
    id: 'precision',
    title: 'Precisão Cirúrgica',
    description: 'Atinja sua meta por 30 dias consecutivos',
    icon: Target,
    category: 'milestone',
    rarity: 'epic',
    points: 500,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const last30Days = sessions.filter(s => {
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysDiff < 30;
      });
      
      const goalMetDays = new Set(
        last30Days.filter(s => s.goalMet).map(s => s.date)
      );
      
      return goalMetDays.size >= 30;
    }
  },
  {
    id: 'phoenix',
    title: 'Fênix Renascida',
    description: 'Retorne aos estudos após uma pausa de 7+ dias',
    icon: Flame,
    category: 'milestone',
    rarity: 'rare',
    points: 100,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const sortedSessions = [...sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      for (let i = 1; i < sortedSessions.length; i++) {
        const daysDiff = Math.floor(
          (new Date(sortedSessions[i].date).getTime() - 
           new Date(sortedSessions[i-1].date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff >= 7) return true;
      }
      return false;
    }
  },
  {
    id: 'first_session',
    title: 'Primeira Conquista',
    description: 'Complete sua primeira sessão de estudos',
    icon: Award,
    category: 'milestone',
    rarity: 'common',
    points: 10,
    condition: (data) => (data.sessions || data.studyHistory || []).length >= 1
  },
  {
    id: 'week_warrior',
    title: 'Guerreiro Semanal',
    description: 'Estude todos os 7 dias da semana',
    icon: Trophy,
    category: 'streak',
    rarity: 'rare',
    points: 250,
    condition: (data) => {
      const sessions = data.sessions || data.studyHistory || [];
      const last7Days = new Set();
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.add(dateStr);
      }
      
      const studiedDays = new Set(
        sessions
          .map((session) => toDayKey(session.date))
          .filter((day) => last7Days.has(day))
      );
      
      return studiedDays.size === 7;
    }
  }
];
