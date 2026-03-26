import React from 'react';
import type { Weekday, WeeklyAvailabilityMap, WeeklyPlan } from '../../types';
import WeeklyDayCard from './WeeklyDayCard';

interface WeeklyGridProps {
  weekPlan: WeeklyPlan;
  availability: WeeklyAvailabilityMap;
  today: Weekday;
  completedDays?: Partial<Record<Weekday, boolean>>;
  continuityLabels?: Partial<Record<Weekday, string>>;
  todayContextLabel?: string;
  onEditDay: (day: Weekday) => void;
  onToggleDay: (day: Weekday, nextActive: boolean) => void;
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const WEEKDAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  weekPlan,
  availability,
  today,
  completedDays,
  continuityLabels,
  todayContextLabel,
  onEditDay,
  onToggleDay,
}) => (
  <section className="space-y-4">
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Semana
        </p>
        <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          Entenda sua semana em uma passada de olho
        </h3>
      </div>
      <p className="max-w-sm text-right text-sm text-slate-500 dark:text-slate-400">
        O dia de hoje aparece destacado para conectar planejamento e execução sem depender do calendário mensal.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {WEEKDAY_ORDER.map((day) => (
        <WeeklyDayCard
          key={day}
          day={day}
          label={WEEKDAY_LABELS[day]}
          plan={weekPlan[day]}
          isActive={availability[day]}
          isToday={today === day}
          hasCompletedSession={Boolean(completedDays?.[day])}
          sequenceLabel={continuityLabels?.[day]}
          contextLabel={today === day ? todayContextLabel : undefined}
          onEdit={() => onEditDay(day)}
          onToggleActive={(nextActive) => onToggleDay(day, nextActive)}
        />
      ))}
    </div>
  </section>
);

export default WeeklyGrid;
