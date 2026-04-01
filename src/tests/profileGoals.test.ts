import { describe, expect, it } from 'vitest';
import { buildProfileGoalsData } from '../features/profile/profileGoals';

describe('buildProfileGoalsData', () => {
  it('marca a meta como on_track quando o progresso acompanha a semana', () => {
    const result = buildProfileGoalsData(
      300,
      80,
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.primaryGoal.status).toBe('on_track');
    expect(result.primaryGoal.progressLabel).toBe('80 min de 300 min');
    expect(result.primaryGoal.remainingLabel).toBe('Faltam 220 min para concluir.');
    expect(result.primaryGoal.completionPercent).toBe(27);
  });

  it('marca a meta como concluida quando o alvo semanal foi batido', () => {
    const result = buildProfileGoalsData(
      180,
      220,
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.primaryGoal.status).toBe('completed');
    expect(result.primaryGoal.remainingLabel).toBe('Meta concluida nesta semana.');
    expect(result.primaryGoal.completionPercent).toBe(100);
  });

  it('marca a meta como behind quando o progresso esta abaixo do ritmo esperado', () => {
    const result = buildProfileGoalsData(
      300,
      60,
      new Date('2026-04-03T12:00:00.000Z'),
    );

    expect(result.primaryGoal.status).toBe('behind');
    expect(result.primaryGoal.helperLabel).toContain('recuperar o ritmo');
  });

  it('gera empty state quando nao existe meta valida', () => {
    const result = buildProfileGoalsData(
      0,
      0,
      new Date('2026-03-30T12:00:00.000Z'),
    );

    expect(result.primaryGoal.status).toBe('empty');
    expect(result.primaryGoal.targetLabel).toBe('Sem meta definida');
    expect(result.primaryGoal.remainingLabel).toBe('Defina um alvo semanal para acompanhar seu progresso.');
  });
});
