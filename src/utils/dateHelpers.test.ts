import { describe, it, expect } from 'vitest';
import { isToday, formatDuration, isSameDay } from './dateHelpers';

describe('Utilitários de Data e Tempo (dateHelpers)', () => {
  it('deve identificar corretamente se uma data é o dia de hoje', () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('deve identificar corretamente se duas datas são do mesmo dia', () => {
    const date1 = new Date('2026-03-10T10:00:00');
    const date2 = new Date('2026-03-10T23:59:59');
    const date3 = new Date('2026-03-11T00:00:00');
    
    expect(isSameDay(date1, date2)).toBe(true);
    expect(isSameDay(date1, date3)).toBe(false);
  });

  it('deve formatar a duração de minutos para horas e minutos', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(120)).toBe('2h');
  });
});
