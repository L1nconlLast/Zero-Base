import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudySession } from '../types';
import { processarDadosSemanais } from '../utils/chartHelpers';

const createSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  date: '2026-03-23T12:00:00.000Z',
  minutes: 60,
  points: 0,
  subject: 'Outra',
  duration: 60,
  ...overrides,
});

describe('processarDadosSemanais', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('alinha o grafico semanal com a semana atual e saneia labels do tooltip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T12:00:00.000Z'));

    const data = processarDadosSemanais([
      createSession({
        date: '2026-03-22T12:00:00.000Z',
        minutes: 30,
        duration: 30,
        subject: 'Matematical|zb-session|abc' as StudySession['subject'],
      }),
      createSession({
        date: '2026-03-23T12:00:00.000Z',
        minutes: 90,
        duration: 90,
        subject: 'Linguagens' as StudySession['subject'],
      }),
      createSession({
        date: '2026-03-28T12:00:00.000Z',
        minutes: 45,
        duration: 45,
        subject: 'session_payload_bruta' as StudySession['subject'],
      }),
      createSession({
        date: '2026-03-15T12:00:00.000Z',
        minutes: 120,
        duration: 120,
        subject: 'Natureza' as StudySession['subject'],
      }),
    ], 60);

    expect(data).toHaveLength(7);
    expect(data[0]).toMatchObject({
      name: 'Seg',
      minutos: 90,
      metGoal: true,
    });
    expect(data[0].detalhes).toEqual([{ label: 'Linguagens', minutes: 90 }]);
    expect(data[5]).toEqual(
      expect.objectContaining({
        name: 'Sab',
        minutos: 45,
        metGoal: false,
      }),
    );
    expect(data[5].detalhes).toEqual([{ label: 'Outra', minutes: 45 }]);
    expect(data[6]).toMatchObject({
      name: 'Dom',
      minutos: 0,
      metGoal: false,
    });
    expect(data.reduce((sum, day) => sum + day.minutos, 0)).toBe(135);
  });
});
