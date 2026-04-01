import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResumeMissionPage } from '../components/Home/ResumeMissionPage';

describe('ResumeMissionPage', () => {
  it('mostra continuidade sem home intermediaria e CTA unico', () => {
    const onContinue = vi.fn();

    render(
      <ResumeMissionPage
        subject="Matematica"
        topic="Porcentagem"
        questionsDone={1}
        totalQuestions={3}
        estimatedMinutesRemaining={2}
        source="notification"
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Hoje voce continua daqui')).toBeInTheDocument();
    expect(screen.getByText('Sua proxima sessao ja esta pronta. Sem menu e sem escolha nova.')).toBeInTheDocument();
    expect(screen.getByText('Matematica - Porcentagem')).toBeInTheDocument();
    expect(screen.getByText('Hoje voce continua daqui: 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Faltam so ~2 min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar sessao' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
