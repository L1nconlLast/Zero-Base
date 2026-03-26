/**
 * Utilitários de Data - Zero Base v2.1
 */

import { SessaoEstudo } from '../types';

/**
 * Verifica se duas datas são do mesmo dia
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toLocaleDateString() === date2.toLocaleDateString();
};

/**
 * Verifica se uma data é hoje
 */
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

/**
 * Obtém todas as sessões de hoje
 */
export const getTodaysSessions = (sessions: SessaoEstudo[]): SessaoEstudo[] => {
  return sessions.filter(s => isToday(new Date(s.data)));
};

/**
 * Obtém total de minutos de um dia específico
 */
export const getMinutesForDate = (sessions: SessaoEstudo[], date: Date): number => {
  return sessions
    .filter(s => isSameDay(new Date(s.data), date))
    .reduce((total, s) => total + s.duracaoMinutos, 0);
};

/**
 * Obtém total de minutos de hoje
 */
export const getTodaysMinutes = (sessions: SessaoEstudo[]): number => {
  return getMinutesForDate(sessions, new Date());
};

/**
 * Obtém array de dias da semana atual (segunda a domingo)
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
 * Obtém minutos estudados por dia da semana
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
 * Formata durações para display (ex: "2h 30m")
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  
  return `${hours}h ${mins}m`;
};

/**
 * Converte data em formato legível (pt-BR)
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
 * Obtém data no início do dia (00:00:00)
 */
export const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Obtém data no início da semana
 */
export const getStartOfWeek = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Obtém data no início do mês
 */
export const getStartOfMonth = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

