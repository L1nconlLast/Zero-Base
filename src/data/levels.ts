import { Level } from '../types';

export const LEVELS: Level[] = [
  {
    level: 1,
    title: 'Calouro',
    minPoints: 0,
    maxPoints: 999,
    perks: ['Acesso básico ao app'],
    icon: 'L1',
    color: '#94a3b8'
  },
  {
    level: 2,
    title: 'Estudante',
    minPoints: 1000,
    maxPoints: 2999,
    perks: ['Temas extras', 'Estatísticas básicas'],
    icon: 'L2',
    color: '#60a5fa'
  },
  {
    level: 3,
    title: 'Monitor',
    minPoints: 3000,
    maxPoints: 5999,
    perks: ['Relatórios semanais', 'Exportação de dados'],
    icon: 'L3',
    color: '#34d399'
  },
  {
    level: 4,
    title: 'Dedicado',
    minPoints: 6000,
    maxPoints: 9999,
    perks: ['Criar grupos de estudo', 'Planejador semanal'],
    icon: 'L4',
    color: '#fbbf24'
  },
  {
    level: 5,
    title: 'Aplicado',
    minPoints: 10000,
    maxPoints: 14999,
    perks: ['Análises avançadas', 'Pomodoro Timer'],
    icon: 'L5',
    color: '#f97316'
  },
  {
    level: 6,
    title: 'Residente',
    minPoints: 15000,
    maxPoints: 24999,
    perks: ['Recomendações IA', 'Badges exclusivos'],
    icon: 'L6',
    color: '#a855f7'
  },
  {
    level: 7,
    title: 'Especialista',
    minPoints: 25000,
    maxPoints: 39999,
    perks: ['Ferramentas médicas', 'Prioridade no suporte'],
    icon: 'L7',
    color: '#ec4899'
  },
  {
    level: 8,
    title: 'Mestre',
    minPoints: 40000,
    maxPoints: 59999,
    perks: ['Mentorias', 'Acesso antecipado a features'],
    icon: 'L8',
    color: '#ef4444'
  },
  {
    level: 9,
    title: 'Doutor',
    minPoints: 60000,
    maxPoints: 99999,
    perks: ['Título exclusivo', 'Customização total'],
    icon: 'L9',
    color: '#8b5cf6'
  },
  {
    level: 10,
    title: 'Lenda',
    minPoints: 100000,
    maxPoints: Infinity,
    perks: ['Tudo desbloqueado', 'Hall da Fama', 'Reconhecimento na comunidade'],
    icon: 'L10',
    color: '#fbbf24'
  }
];

export const getLevelByPoints = (points: number): Level => {
  return LEVELS.find(level => 
    points >= level.minPoints && points <= level.maxPoints
  ) || LEVELS[0];
};

export const getProgressToNextLevel = (points: number): { 
  current: number; 
  required: number; 
  percentage: number 
} => {
  const currentLevel = getLevelByPoints(points);
  
  if (currentLevel.level === 10) {
    return { current: points, required: points, percentage: 100 };
  }
  
  const nextLevel = LEVELS[currentLevel.level];
  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  const percentage = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
  
  return {
    current: pointsInCurrentLevel,
    required: pointsNeededForNextLevel,
    percentage
  };
};
