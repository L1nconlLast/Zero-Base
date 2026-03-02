import { LucideIcon } from 'lucide-react';

export interface User {
  nome: string;
  email: string;
  dataCadastro: string;
  foto: string;
  examGoal?: string;
  examDate?: string;
  preferredTrack?: 'enem' | 'concursos' | 'hibrido';
}

export interface UserData {
  weekProgress: WeekProgress;
  completedTopics: CompletedTopics;
  totalPoints: number;
  streak: number;
  bestStreak: number;
  achievements: string[];
  level: number;
  studyHistory: StudySession[];
  dailyGoal: number;
  sessions: StudySession[];
  currentStreak: number;
}

export interface WeekProgress {
  [key: string]: DayProgress;
}

export interface DayProgress {
  studied: boolean;
  minutes: number;
}

export interface CompletedTopics {
  [key: string]: TopicStatus;
}

export interface TopicStatus {
  completed: boolean;
  date: string | null;
}

export interface StudySession {
  date: string;
  minutes: number;
  points: number;
  subject: MateriaTipo; // Agora obrigatório e tipado
  duration: number;
  methodId?: string;
  goalMet?: boolean;
  timestamp?: string;
}

export interface StudyMethod {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  description: string;
  isPremium: boolean;
}

export interface MethodRecommendationInput {
  dailyAverageMinutes: number;
  streak: number;
  daysToExam?: number;
  interruptedBreaks?: number;
}

export interface AcademyContentModule {
  id: string;
  moduleName: string;
  orderIndex: number;
  moduleText: string;
  studyMaterial?: Array<{
    title: string;
    content: string;
    resourceType?: 'video' | 'pdf' | 'questoes' | 'artigo';
    linkLabel?: string;
    linkUrl?: string;
  }>;
  checklist: string[];
}

export type AcademyDepartment = 'ENEM' | 'Concursos';

export type AcademySubDepartment =
  | 'Natureza'
  | 'Humanas'
  | 'Linguagens'
  | 'Matemática'
  | 'Redação'
  | 'Bancas'
  | 'Carreiras'
  | 'Disciplinas Base'
  | 'Legislação';

export interface AcademyContent {
  id: string;
  title: string;
  department: AcademyDepartment;
  subDepartment: AcademySubDepartment;
  category: string;
  difficultyLevel: 'iniciante' | 'intermediario' | 'avancado';
  estimatedMinutes: number;
  xpReward: number;
  isPremium: boolean;
  preview: string;
  applyMethodId?: string;
  modules: AcademyContentModule[];
}

export interface SessaoEstudo {
  id: string;
  duracaoMinutos: number;
  materia: MateriaTipo;
  data: Date | string;
  pontos: number;
}

export interface StudyResource {
  materia: string;
  topico: string;
  canal: string;
  link: string;
  nivel: string;
  duracao: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: 'study' | 'streak' | 'time' | 'social' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  condition: (data: UserData) => boolean;
  progress?: (data: UserData) => { current: number; target: number };
  reward?: {
    type: 'theme' | 'title' | 'badge';
    value: string;
  };
}

export interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
  icon: string;
  color: string;
}

export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  avgPerDay: number;
  longestSession: number;
  studyDays: number;
  goalAchievementRate: number;
  subjectDistribution: { subject: string; minutes: number; percentage: number }[];
  dailyBreakdown: { date: Date; minutes: number }[];
  comparison: {
    lastWeekMinutes: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
  insights: string[];
}

export interface HeatmapCellData {
  date: Date;
  studyMinutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// ── Cronograma de Estudos ────────────────────────────────────
export interface ScheduleEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  subject: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  done: boolean;
  status?: 'pendente' | 'concluido' | 'adiado';
  topic?: string;
  studyType?: 'teoria_questoes' | 'questoes' | 'revisao' | 'simulado';
  priority?: 'normal' | 'alta';
  aiReason?: string;
  source?: 'manual' | 'motor' | 'ia';
}

export type Theme = 'light' | 'dark' | 'auto';
export type DarkTheme = 'default' | 'oled' | 'sepia';

export interface ThemeSettings {
  theme: Theme;
  darkTheme: DarkTheme;
  autoSchedule: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

// Sistema de Matérias
export type MateriaTipo = 'Anatomia' | 'Fisiologia' | 'Farmacologia' | 'Patologia' | 'Bioquímica' | 'Histologia' | 'Outra';

export const MATERIAS_CONFIG: Record<MateriaTipo, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  Anatomia: { 
    icon: '🦴', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  Fisiologia: { 
    icon: '💓', 
    color: 'text-pink-700', 
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  Farmacologia: { 
    icon: '💊', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  Patologia: { 
    icon: '🧫', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  Bioquímica: { 
    icon: '🧪', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  Histologia: { 
    icon: '🔬', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  Outra: { 
    icon: '📚', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
};
