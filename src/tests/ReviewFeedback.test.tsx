import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewFeedback } from '../features/review/components/ReviewFeedback';

describe('ReviewFeedback', () => {
  it('mantem as opcoes desabilitadas antes de revelar a resposta', () => {
    render(
      <ReviewFeedback
        data={{
          revealed: false,
          helperLabel: 'Revele a resposta para liberar as quatro decisoes desta revisao.',
          options: [
            { value: 'facil', label: 'Facil', disabled: true },
            { value: 'medio', label: 'Medio', disabled: true },
            { value: 'dificil', label: 'Dificil', disabled: true },
            { value: 'errei', label: 'Errei', disabled: true },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('review-feedback')).toBeInTheDocument();
    expect(screen.getByText('Decisao da revisao')).toBeInTheDocument();
    expect(screen.getByText('Revele a resposta para liberar as quatro decisoes desta revisao.')).toBeInTheDocument();
    expect(screen.getByTestId('review-feedback-option-facil')).toBeDisabled();
    expect(screen.getByTestId('review-feedback-option-medio')).toBeDisabled();
    expect(screen.getByTestId('review-feedback-option-dificil')).toBeDisabled();
    expect(screen.getByTestId('review-feedback-option-errei')).toBeDisabled();
  });

  it('habilita o feedback depois que a resposta foi revelada', () => {
    const handleSelect = vi.fn();

    render(
      <ReviewFeedback
        data={{
          revealed: true,
          helperLabel: 'Agora decida como este item voltou para voce.',
          options: [
            { value: 'facil', label: 'Facil' },
            { value: 'medio', label: 'Medio' },
            { value: 'dificil', label: 'Dificil' },
            { value: 'errei', label: 'Errei' },
          ],
        }}
        onSelect={handleSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('review-feedback-option-medio'));
    expect(handleSelect).toHaveBeenCalledWith('medio');
    expect(screen.getByTestId('review-feedback-option-facil')).not.toBeDisabled();
  });

  it('marca visualmente o feedback escolhido quando a decisao ja foi registrada', () => {
    render(
      <ReviewFeedback
        data={{
          revealed: true,
          selectedValue: 'dificil',
          helperLabel: 'Feedback Dificil registrado localmente. Avance quando estiver pronto.',
          options: [
            { value: 'facil', label: 'Facil', disabled: true },
            { value: 'medio', label: 'Medio', disabled: true },
            { value: 'dificil', label: 'Dificil', disabled: true },
            { value: 'errei', label: 'Errei', disabled: true },
          ],
        }}
      />,
    );

    expect(screen.getByText('Feedback Dificil registrado localmente. Avance quando estiver pronto.')).toBeInTheDocument();
    expect(screen.getByTestId('review-feedback-option-dificil')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('review-feedback-option-dificil')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('review-feedback-option-dificil')).toBeDisabled();
  });
});
