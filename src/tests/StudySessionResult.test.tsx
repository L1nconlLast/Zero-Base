import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudySessionResult } from '../components/Mvp/StudySessionResult';

describe('StudySessionResult', () => {
  it('renderiza feedback de sessao com proximo passo e CTAs', () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    const onViewSchedule = vi.fn().mockResolvedValue(undefined);

    render(
      <StudySessionResult
        result={{
          sessionId: 'session-1',
          total: 5,
          correct: 4,
          accuracy: 0.8,
          durationSeconds: 900,
        }}
        topicLabel="Porcentagem"
        xpPoints={40}
        nextStep={{
          discipline: 'Linguagens',
          topic: 'Interpretacao',
          reason: 'Priorizado por atraso',
        }}
        weeklyProgress={{
          completedSessions: 1,
          plannedSessions: 4,
          ratio: 0.25,
          label: '1 de 4 sessões concluídas',
        }}
        onContinue={onContinue}
        onViewSchedule={onViewSchedule}
      />,
    );

    expect(screen.getByText('Você avançou em Porcentagem.')).toBeInTheDocument();
    expect(screen.getByTestId('session-result-next-step')).toHaveTextContent('Linguagens • Interpretacao');
    expect(screen.getByTestId('session-result-weekly-progress')).toHaveTextContent('1 de 4 sessões concluídas');

    fireEvent.click(screen.getByTestId('session-result-continue-cta'));
    fireEvent.click(screen.getByTestId('session-result-schedule-cta'));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onViewSchedule).toHaveBeenCalledTimes(1);
  });
});
