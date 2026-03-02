/**
 * UtilitÃ¡rios de Data - Zero Base v2.1
 */

import { SessaoEstudo } from '../types';

/**
 * Verifica se duas datas sÃ£o do mesmo dia
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toLocaleDateString() === date2.toLocaleDateString();
};

/**
 * Verifica se uma data Ã© hoje
 */
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

/**
 * ObtÃ©m todas as sessÃµes de hoje
 */
export const getTodaysSessions = (sessions: SessaoEstudo[]): SessaoEstudo[] => {
  return sessions.filter(s => isToday(new Date(s.data)));
};

/**
 * ObtÃ©m total de minutos de um dia especÃ­fico
 */
export const getMinutesForDate = (sessions: SessaoEstudo[], date: Date): number => {
  return sessions
    .filter(s => isSameDay(new Date(s.data), date))
    .reduce((total, s) => total + s.duracaoMinutos, 0);
};

/**
 * ObtÃ©m total de minutos de hoje
 */
export const getTodaysMinutes = (sessions: SessaoEstudo[]): number => {
  return getMinutesForDate(sessions, new Date());
};

/**
 * ObtÃ©m array de dias da semana atual (segunda a domingo)
 */
export const getWeekDays = (): { day: string; date: Date; dateStr: string }[] => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return days.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      day,
      date,
      dateStr: date.toISOString().split('T')[0],
    };
  });
};

/**
 * ObtÃ©m minutos estudados por dia da semana
 */
export const getWeeklyMinutes = (sessions: SessaoEstudo[]) => {
  const weekDays = getWeekDays();
  
  return weekDays.map(({ day, date, dateStr }) => {
    const minutes = getMinutesForDate(sessions, date);
    return {
      day,
      date,
      dateStr,
      minutes,
    };
  });
};

/**
 * Calcula total da semana
 */
export const getWeeklyTotal = (sessions: SessaoEstudo[]): number => {
  return getWeeklyMinutes(sessions).reduce((total, day) => total + day.minutes, 0);
};

/**
 * Formata duraÃ§Ãµes para display (ex: "2h 30m")
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  
  return `${hours}h ${mins}m`;
};

/**
 * Converte data em formato legÃ­vel (pt-BR)
 */
export const formatDateBR = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * ObtÃ©m data no inÃ­cio do dia (00:00:00)
 */
export const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * ObtÃ©m data no inÃ­cio da semana
 */
export const getStartOfWeek = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * ObtÃ©m data no inÃ­cio do mÃªs
 */
export const getStartOfMonth = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

