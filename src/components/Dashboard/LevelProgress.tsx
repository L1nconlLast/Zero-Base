import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Gift } from 'lucide-react';
import { getLevelByPoints, getProgressToNextLevel } from '../../data/levels';

interface LevelProgressProps {
  userPoints: number;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ userPoints }) => {
  const currentLevel = getLevelByPoints(userPoints);
  const progress = getProgressToNextLevel(userPoints);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  useEffect(() => {
    const lastPoints = parseInt(localStorage.getItem('lastPointsCheck') || '0');
    const lastLevel = getLevelByPoints(lastPoints);
    const currentLevelNum = currentLevel.level;
    
    if (userPoints > lastPoints && currentLevelNum > lastLevel.level) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 5000);
    }
    localStorage.setItem('lastPointsCheck', userPoints.toString());
  }, [userPoints, currentLevel]);
  
  return (
    <>
      <div
        className="level-progress h-fit rounded-2xl p-5 text-white shadow-lg sm:p-6"
        style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm opacity-80 mb-1">Nível Atual</div>
            <div className="text-3xl font-bold flex items-center gap-3">
              <span className="text-5xl">{currentLevel.icon}</span>
              <div>
                <div>{currentLevel.title}</div>
                <div className="text-sm opacity-80">Nível {currentLevel.level}</div>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm opacity-80">Pontos Totais</div>
            <div className="text-2xl font-bold">{userPoints.toLocaleString()}</div>
          </div>
        </div>
        
        {currentLevel.level < 10 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progresso para Nível {currentLevel.level + 1}</span>
              <span>{progress.percentage.toFixed(1)}%</span>
            </div>
            
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            
            <div className="text-xs opacity-80 mt-2">
              {progress.current.toLocaleString()} / {progress.required.toLocaleString()} pontos
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-sm font-semibold mb-2 inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> Vantagens Desbloqueadas</div>
          <div className="space-y-1">
            {currentLevel.perks.map((perk, index) => (
              <div key={index} className="text-sm opacity-90 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {perk}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showLevelUp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-md mx-4 shadow-2xl animate-scaleIn">
            <div className="text-6xl mb-4">{currentLevel.icon}</div>
            <h2 className="text-3xl font-bold mb-2">Level Up!</h2>
            <p className="text-xl mb-4">
              Você alcançou o nível <span className="font-bold">{currentLevel.level}</span>
            </p>
            <p className="text-2xl font-bold mb-4" style={{ color: currentLevel.color }}>
              {currentLevel.title}
            </p>
            
            <div className="text-left bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="font-semibold mb-2 inline-flex items-center gap-2"><Gift className="w-4 h-4" /> Novas Vantagens:</div>
              {currentLevel.perks.map((perk, i) => (
                <div key={i} className="text-sm">• {perk}</div>
              ))}
            </div>
            
            <button
              onClick={() => setShowLevelUp(false)}
              className="mt-6 px-6 py-3 text-white rounded-lg hover:opacity-90 transition"
              style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LevelProgress;
