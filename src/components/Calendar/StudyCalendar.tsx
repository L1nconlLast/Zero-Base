import React, { useMemo } from 'react';
import { Target, Flame, ChevronRight, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import type { StudySession } from '../../types';

interface StudyCalendarProps {
  sessions: StudySession[];
  dailyGoalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  onStartStudy?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const StudyCalendar: React.FC<StudyCalendarProps> = ({
  sessions,
  dailyGoalMinutes,
  currentStreak,
  bestStreak,
  onStartStudy,
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());

  // Mapa data → minutos estudados
  const dailyMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      const date = new Date(s.date).toISOString().split('T')[0];
      map[date] = (map[date] || 0) + s.minutes;
    });
    return map;
  }, [sessions]);

  // Gera os dias do mês atual no calendário
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    // Preencher até múltiplo de 7
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const getDayColor = (mins: number): string => {
    if (mins === 0) return '';
    const pct = mins / dailyGoalMinutes;
    if (pct >= 1) return 'bg-green-500';
    if (pct >= 0.5) return 'bg-yellow-400';
    return 'bg-blue-300';
  };

  const todayStr = today.toISOString().split('T')[0];
  const studyDaysThisMonth = Object.entries(dailyMinutes).filter(([d]) => {
    const date = new Date(d);
    return date.getFullYear() === viewYear && date.getMonth() === viewMonth && dailyMinutes[d] > 0;
  }).length;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Calendário de Estudos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visualize e mantenha sua consistência diária</p>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-4 flex items-center gap-3">
          <Flame className="w-8 h-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
            <p className="text-xs text-orange-500 font-medium">Dias seguidos</p>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 flex items-center gap-3">
          <Target className="w-8 h-8 text-purple-500" />
          <div>
            <p className="text-2xl font-bold text-purple-600">{bestStreak}</p>
            <p className="text-xs text-purple-500 font-medium">Melhor sequência</p>
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Navegação */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 font-bold">
            ‹
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 font-bold">
            ›
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 mb-2">
          {WEEK_SHORT.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const mins = dailyMinutes[dateStr] || 0;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const color = getDayColor(mins);
            const goalMet = mins >= dailyGoalMinutes;

            return (
              <div
                key={day}
                title={mins > 0 ? `${mins} min estudados` : isFuture ? '' : 'Sem estudo'}
                className={`relative flex items-center justify-center rounded-lg text-xs font-medium transition cursor-default aspect-square
                  ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${isFuture ? 'text-gray-300 dark:text-gray-600' : color ? `${color} text-white` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}
                `}
              >
                {day}
                {goalMet && (
                  <CheckCircle className="absolute top-0 right-0 w-2.5 h-2.5 text-white -mt-0.5 -mr-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-300" />Parcial</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-400" />&gt;50% meta</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500" />Meta atingida</div>
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Dias estudados</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{studyDaysThisMonth}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Meta diária</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{dailyGoalMinutes} min</p>
          </div>
        </div>
      </div>

      {onStartStudy && (
        <button
          onClick={onStartStudy}
          className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <ChevronRight className="w-5 h-5" /> Estudar Agora
        </button>
      )}
    </div>
  );
};

export default StudyCalendar;
