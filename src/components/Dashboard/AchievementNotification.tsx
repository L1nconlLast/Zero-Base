import React, { useEffect } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import { Achievement } from '../../types';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose
}) => {
  useEffect(() => {
    if (achievement) {
      const audio = new Audio('/sounds/achievement.mp3');
      audio.play().catch(() => {});
    }
  }, [achievement]);
  
  if (!achievement) return null;
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg shadow-2xl p-6 max-w-md">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 rounded-full p-3">
            <Trophy className="w-8 h-8" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold uppercase tracking-wide">
                Conquista Desbloqueada!
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRarityStyle(achievement.rarity)}`}>
                {achievement.rarity.toUpperCase()}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold mb-1">
              {achievement.title}
            </h3>
            
            <p className="text-white/90 text-sm mb-2">
              {achievement.description}
            </p>
            
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4" />
              <span className="font-semibold">+{achievement.points} pontos</span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const getRarityStyle = (rarity: Achievement['rarity']) => {
  const styles = {
    common: 'bg-gray-400',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-orange-500'
  };
  return styles[rarity];
};

export default AchievementNotification;
