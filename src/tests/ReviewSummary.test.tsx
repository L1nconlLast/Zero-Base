import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewSummary } from '../features/review/components/ReviewSummary';
import type { DailyReviewQueueData } from '../features/review';

const queueWithItems: DailyReviewQueueData = {
  dateLabel: '30 de mar.',
  totalItems: 3,
  completedItems: 1,
  remainingItems: 2,
  currentItemId: 'review-2',
  items: [
    {
      id: 'review-1',
      title: 'Funcoes',
      subjectLabel: 'Matematica',
      sourceLabel: '+24h / Fila automatica',
      prompt: 'Prompt 1',
      answer: 'Resposta 1',
      dueDate: '2026-03-29',
      status: 'completed',
      position: 1,
      total: 3,
    },
    {
      id: 'review-2',
      title: 'Citologia',
      subjectLabel: 'Biologia',
      sourceLabel: '+24h / Fila automatica',
      prompt: 'Prompt 2',
      answer: 'Resposta 2',
      dueDate: '2026-03-30',
      status: 'active',
      position: 2,
      total: 3,
    },
    {
      id: 'review-3',
      title: 'Interpretacao',
      subjectLabel: 'Linguagens',
      sourceLabel: '+48h / Fila automatica',
      prompt: 'Prompt 3',
      answer: 'Resposta 3',
      dueDate: '2026-03-30',
      status: 'pending',
      position: 3,
      total: 3,
    },
  ],
};

describe('ReviewSummary', () => {
  it('resume concluido, restante e a ordem da fila diaria', () => {
    render(
      <ReviewSummary
        data={{
          completedLabel: '1 concluido',
          remainingLabel: '2 restantes',
          nextStepLabel: 'Siga a ordem da fila para revisar um item por vez.',
        }}
        queue={queueWithItems}
      />,
    );

    expect(screen.getByTestId('review-summary')).toBeInTheDocument();
    expect(screen.getByText('Resumo da fila')).toBeInTheDocument();
    expect(screen.getByText('1 concluido')).toBeInTheDocument();
    expect(screen.getByText('2 restantes')).toBeInTheDocument();
    expect(screen.getByTestId('review-summary-item-review-1')).toHaveTextContent('Feito');
    expect(screen.getByTestId('review-summary-item-review-2')).toHaveTextContent('Agora');
    expect(screen.getByTestId('review-summary-item-review-3')).toHaveTextContent('Fila');
  });

  it('mantem um empty state claro quando nao ha itens para hoje', () => {
    render(
      <ReviewSummary
        data={{
          completedLabel: '0 concluidos',
          remainingLabel: '0 restantes',
          nextStepLabel: 'Quando novas revisoes vencerem, elas entram aqui.',
        }}
        queue={{
          dateLabel: '30 de mar.',
          totalItems: 0,
          completedItems: 0,
          remainingItems: 0,
          items: [],
        }}
      />,
    );

    expect(screen.getByText('Nenhum item entrou na fila de hoje.')).toBeInTheDocument();
  });
});
