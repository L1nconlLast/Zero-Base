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
          label: '1 de 4 sessoes concluidas',
        }}
        onContinue={onContinue}
        onViewSchedule={onViewSchedule}
      />,
    );

    expect(screen.getByText('Voce avancou em Porcentagem.')).toBeInTheDocument();
    expect(screen.getByTestId('session-result-next-step')).toHaveTextContent('Linguagens - Interpretacao');
    expect(screen.getByTestId('session-result-weekly-progress')).toHaveTextContent('1 de 4 sessoes concluidas');

    fireEvent.click(screen.getByTestId('session-result-continue-cta'));
    fireEvent.click(screen.getByTestId('session-result-schedule-cta'));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onViewSchedule).toHaveBeenCalledTimes(1);
  });

  it('torna o amanha obrigatorio na primeira sessao', () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);

    render(
      <StudySessionResult
        result={{
          sessionId: 'session-2',
          total: 3,
          correct: 2,
          accuracy: 0.66,
          durationSeconds: 780,
        }}
        topicLabel="Funcoes"
        xpPoints={30}
        isFirstSession
        nextStep={{
          discipline: 'Matematica',
          topic: 'Funcoes basicas',
          reason: 'Seu melhor proximo passo e manter o bloco curto amanha.',
        }}
        onContinue={onContinue}
        onViewSchedule={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Voce comecou. Seu plano de amanha ja esta pronto.')).toBeInTheDocument();
    expect(screen.getByTestId('session-result-initial-progress')).toHaveTextContent('1/7 dias');
    expect(screen.queryByTestId('session-result-tomorrow-step')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByTestId('session-result-tomorrow-step')).toHaveTextContent('Seu plano de amanha ja esta pronto.');
    expect(screen.getByTestId('session-result-tomorrow-step')).toHaveTextContent('3 questoes rapidas');
    expect(screen.getByRole('button', { name: 'Continuar amanha' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar amanha' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
