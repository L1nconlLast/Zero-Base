import React from 'react';
import { Trophy, Star, Flame, Target, Clock, Award, Zap, Heart } from 'lucide-react';
import { UserData } from '../../types';

interface AchievementsProps {
  userData: UserData;
}

export const Achievements: React.FC<AchievementsProps> = ({ userData }) => {
  const allAchievements = [
    {
      id: 'first30',
      title: 'Primeira Meia Hora',
      description: 'Estudou por 30 minutos em uma sessão',
      icon: Clock,
      color: 'blue',
      condition: (data: UserData) => data.studyHistory.some(s => s.minutes >= 30)
    },
    {
      id: 'first60',
      title: 'Uma Hora Completa',
      description: 'Estudou por 60 minutos em uma sessão',
      icon: Target,
      color: 'purple',
      condition: (data: UserData) => data.studyHistory.some(s => s.minutes >= 60)
    },
    {
      id: 'streak7',
      title: 'Uma Semana',
      description: 'Estudou por 7 dias seguidos',
      icon: Flame,
      color: 'orange',
      condition: (data: UserData) => data.streak >= 7
    },
    {
      id: 'level5',
      title: 'Nível 5',
      description: 'Alcançou o nível 5',
      icon: Star,
      color: 'yellow',
      condition: (data: UserData) => data.level >= 5
    },
    {
      id: 'points1000',
      title: 'Mil Pontos',
      description: 'Acumulou 1000 pontos',
      icon: Trophy,
      color: 'green',
      condition: (data: UserData) => data.totalPoints >= 1000
    },
    {
      id: 'sessions10',
      title: 'Dedicado',
      description: 'Completou 10 sessões de estudo',
      icon: Award,
      color: 'indigo',
      condition: (data: UserData) => data.studyHistory.length >= 10
    },
    {
      id: 'early',
      title: 'Madrugador',
      description: 'Estudou antes das 7h da manhã',
      icon: Zap,
      color: 'pink',
      condition: (data: UserData) => data.studyHistory.some(s => {
        const hour = new Date(s.date).getHours();
        return hour >= 5 && hour < 7;
      })
    },
    {
      id: 'consistent',
      title: 'Consistente',
      description: 'Atingiu a meta diária 5 vezes',
      icon: Heart,
      color: 'red',
      condition: (data: UserData) => {
        const metaDays = data.studyHistory.filter(s => s.minutes >= data.dailyGoal).length;
        return metaDays >= 5;
      }
    }
  ];

  const colorClasses: { [key: string]: string } = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-yellow-500" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Conquistas
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {userData.achievements.length}/{allAchievements.length} desbloqueadas
            </p>
          </div>
        </div>

        {/* Barra de Progresso Global */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(userData.achievements.length / allAchievements.length) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Grid de Conquistas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {allAchievements.map((achievement) => {
            const isUnlocked = achievement.condition(userData);
            const Icon = achievement.icon;

            return (
              <div
                key={achievement.id}
                className={`rounded-xl p-6 text-white transition-all ${
                  isUnlocked
                    ? `bg-gradient-to-br ${colorClasses[achievement.color]} shadow-lg transform hover:scale-105`
                    : 'bg-gray-300 dark:bg-gray-700 opacity-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <Icon size={48} className="mb-3" />
                  <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
                  <p className="text-sm opacity-90">{achievement.description}</p>
                  {isUnlocked && (
                    <div className="mt-3 bg-white bg-opacity-20 rounded-full px-3 py-1">
                      <span className="text-xs font-semibold">✓ Desbloqueada</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
