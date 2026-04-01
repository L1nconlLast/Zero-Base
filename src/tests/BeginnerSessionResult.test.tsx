import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BeginnerSessionResult } from '../components/Beginner/BeginnerSessionResult';

describe('BeginnerSessionResult', () => {
  it('obriga o usuario a passar pelo bloco de amanha na primeira sessao', () => {
    const onPrimaryAction = vi.fn();

    render(
      <BeginnerSessionResult
        completedMissionLabel="Dia 1 - Primeiro movimento"
        xpGained={30}
        streak={0}
        nextMissionLabel="Dia 2 - Ganho de ritmo"
        correctAnswers={2}
        totalQuestions={3}
        isFirstSession
        onPrimaryAction={onPrimaryAction}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Voce comecou. Seu plano de amanha ja esta pronto.')).toBeInTheDocument();
    expect(screen.getByTestId('beginner-result-initial-progress')).toHaveTextContent('1/7 dias');
    expect(screen.queryByRole('button', { name: 'Voltar para a home' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByTestId('beginner-result-tomorrow-step')).toHaveTextContent('Seu plano de amanha ja esta pronto.');
    expect(screen.getByTestId('beginner-result-tomorrow-step')).toHaveTextContent('3 questoes rapidas');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar amanha' }));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
