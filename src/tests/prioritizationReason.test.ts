import { describe, expect, it } from 'vitest';
import {
  buildWeeklySessionProgress,
  mapReasonSummaryToCopy,
} from '../services/prioritizationReason';

describe('prioritizationReason', () => {
  it('maps overdue reasons to a user-facing copy', () => {
    expect(mapReasonSummaryToCopy('Atrasado e Prioridade alta')).toBe('Priorizado por atraso');
  });

  it('maps manual priority reasons to a user-facing copy', () => {
    expect(mapReasonSummaryToCopy('Prioridade alta')).toBe('Priorizado por você');
  });

  it('maps weakness reasons to a user-facing copy', () => {
    expect(mapReasonSummaryToCopy('Tema fraco e Desempenho recente fraco')).toBe('Foco por desempenho recente');
  });

  it('falls back to a stable default copy', () => {
    expect(mapReasonSummaryToCopy()).toBe('Recomendado para você agora');
    expect(mapReasonSummaryToCopy('Sinal desconhecido')).toBe('Bom próximo passo para manter seu ritmo');
  });

  it('builds weekly session progress summary', () => {
    expect(buildWeeklySessionProgress(2, 5)).toEqual({
      completedSessions: 2,
      plannedSessions: 5,
      ratio: 0.4,
      label: '2 de 5 sessões concluídas',
    });
  });
});
