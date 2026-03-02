import React, { useMemo, useState } from 'react';
import { StudySession, HeatmapCellData } from '../../types';

interface StudyHeatmapProps {
  sessions: StudySession[];
  startDate?: Date;
  numWeeks?: number;
}

const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ 
  sessions, 
  startDate,
  numWeeks = 52 
}) => {
  const start = useMemo(
    () => startDate || new Date(new Date().setDate(new Date().getDate() - 365)),
    [startDate]
  );
  
  const heatmapData = useMemo(() => {
    const endDate = new Date();
    const allDates: Date[] = [];
    const current = new Date(start);
    
    while (current <= endDate) {
      allDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    const minutesMap = new Map<string, number>();
    sessions.forEach(session => {
      const dateKey = session.date;
      const minutes = session.minutes || session.duration || 0;
      minutesMap.set(dateKey, (minutesMap.get(dateKey) || 0) + minutes);
    });
    
    return allDates.map(date => {
      const dateKey = formatDateKey(date);
      const minutes = minutesMap.get(dateKey) || 0;
      
      return {
        date,
        studyMinutes: minutes,
        level: getIntensityLevel(minutes)
      };
    });
  }, [sessions, start]);
  
  const weeks = useMemo(() => {
    const weeks: HeatmapCellData[][] = [];
    let currentWeek: HeatmapCellData[] = [];
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      if (day.date.getDay() === 6 || index === heatmapData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks.slice(-numWeeks);
  }, [heatmapData, numWeeks]);
  
  return (
    <div className="study-heatmap">
      <h3 className="text-lg font-semibold mb-4">Histórico de Estudos</h3>
      
      <div className="flex mb-2">
        <div className="w-12" />
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
          <div key={i} className="w-3 text-xs text-gray-500 text-center mx-0.5">
            {i % 2 === 0 ? day : ''}
          </div>
        ))}
      </div>
      
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <HeatmapCell 
                key={dayIndex} 
                data={day}
              />
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div 
            key={level}
            className={`w-3 h-3 rounded-sm ${getLevelColor(level as 0 | 1 | 2 | 3 | 4)}`}
          />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
};

const HeatmapCell: React.FC<{ data: HeatmapCellData }> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          w-3 h-3 rounded-sm cursor-pointer transition-all
          ${getLevelColor(data.level)}
          hover:ring-2 hover:ring-blue-400
        `}
      />
      
      {showTooltip && (
        <div className="absolute z-10 bg-gray-900 text-white text-xs rounded p-2 -top-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap shadow-lg">
          <div className="font-semibold">
            {formatDateBR(data.date)}
          </div>
          <div>
            {data.studyMinutes > 0 
              ? `${data.studyMinutes} minutos` 
              : 'Nenhum estudo'}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

const getIntensityLevel = (minutes: number): 0 | 1 | 2 | 3 | 4 => {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
};

const getLevelColor = (level: 0 | 1 | 2 | 3 | 4): string => {
  const colors = {
    0: 'bg-gray-100 dark:bg-gray-800',
    1: 'bg-blue-200 dark:bg-blue-900',
    2: 'bg-blue-400 dark:bg-blue-700',
    3: 'bg-blue-600 dark:bg-blue-500',
    4: 'bg-blue-800 dark:bg-blue-400'
  };
  return colors[level];
};

const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDateBR = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long' 
  });
};

export default StudyHeatmap;
