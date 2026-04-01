import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewHeader } from '../features/review/components/ReviewHeader';

describe('ReviewHeader', () => {
  it('renderiza o enquadramento da revisao do dia com fila ativa', () => {
    render(
      <ReviewHeader
        data={{
          title: 'Revisao do dia',
          contextLabel: 'Fila diaria de retencao com um item por vez.',
          progressLabel: 'Item 2 de 5',
          queueLabel: '4 restantes',
          status: 'active',
        }}
      />,
    );

    expect(screen.getByTestId('review-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Revisao do dia' })).toBeInTheDocument();
    expect(screen.getByTestId('review-header-context')).toHaveTextContent('Fila diaria de retencao com um item por vez.');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('Item 2 de 5');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('4 restantes');
    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Em andamento');
  });

  it('mostra estado vazio sem quebrar a moldura da fila', () => {
    render(
      <ReviewHeader
        data={{
          title: 'Revisao do dia',
          contextLabel: 'Nenhum item vence hoje.',
          progressLabel: '0 de 0 itens',
          queueLabel: '0 restantes',
          status: 'empty',
        }}
      />,
    );

    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Fila vazia');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('0 de 0 itens');
  });

  it('mostra a fila concluida quando nao ha item ativo restante', () => {
    render(
      <ReviewHeader
        data={{
          title: 'Revisao do dia',
          contextLabel: 'A fila diaria terminou.',
          progressLabel: '3 de 3 itens',
          queueLabel: '0 restantes',
          status: 'completed',
        }}
      />,
    );

    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Fila concluida');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('3 de 3 itens');
  });
});
