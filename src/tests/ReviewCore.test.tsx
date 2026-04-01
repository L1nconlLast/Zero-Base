import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewCore } from '../features/review/components/ReviewCore';

describe('ReviewCore', () => {
  it('mostra o item ativo com resposta oculta antes de revelar', () => {
    render(
      <ReviewCore
        data={{
          itemId: 'review-1',
          title: 'Porcentagem',
          subjectLabel: 'Matematica',
          sourceLabel: '+24h / Fila automatica',
          prompt: 'Recupere os pontos centrais de Porcentagem em Matematica antes de abrir a resposta.',
          answer: 'Revise a relacao entre base, percentual e variacao proporcional.',
          positionLabel: '2 de 5 itens',
          sequenceLabel: '1 concluido / 4 restantes',
          nextActionLabel: 'Tente lembrar primeiro. Quando estiver pronto, revele a resposta deste item para comparar com sua recordacao.',
          actionLabel: 'Ver resposta',
          actionDisabled: false,
          status: 'active',
        }}
      />,
    );

    expect(screen.getByTestId('review-core')).toBeInTheDocument();
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Porcentagem');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Item ativo da fila');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('2 de 5 itens');
    expect(screen.getByTestId('review-core-sequence')).toHaveTextContent('1 concluido / 4 restantes');
    expect(screen.getByTestId('review-core-next-step')).toHaveTextContent('Tente lembrar primeiro. Quando estiver pronto, revele a resposta deste item para comparar com sua recordacao.');
    expect(screen.getByTestId('review-core-prompt')).toHaveTextContent('Recupere os pontos centrais de Porcentagem em Matematica');
    expect(screen.getByTestId('review-core-answer')).not.toHaveTextContent('Revise a relacao entre base, percentual e variacao proporcional.');
    expect(screen.getByTestId('review-core-answer')).toHaveTextContent('Tente recuperar mentalmente antes de abrir a resposta.');
    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Ver resposta');
    expect(screen.getByTestId('review-core-action')).not.toBeDisabled();
  });

  it('mostra a resposta quando o item entra em estado revelado', () => {
    render(
      <ReviewCore
        data={{
          itemId: 'review-1',
          title: 'Porcentagem',
          subjectLabel: 'Matematica',
          sourceLabel: '+24h / Fila automatica',
          prompt: 'Recupere os pontos centrais de Porcentagem em Matematica antes de abrir a resposta.',
          answer: 'Revise a relacao entre base, percentual e variacao proporcional.',
          positionLabel: '2 de 5 itens',
          sequenceLabel: '1 concluido / 4 restantes',
          nextActionLabel: 'Compare a resposta com sua lembranca e escolha uma das quatro decisoes logo abaixo.',
          actionLabel: 'Escolha o feedback abaixo',
          actionDisabled: true,
          status: 'revealed',
        }}
      />,
    );

    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Resposta aberta');
    expect(screen.getByTestId('review-core-answer')).toHaveTextContent('Revise a relacao entre base, percentual e variacao proporcional.');
    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Escolha o feedback abaixo');
    expect(screen.getByTestId('review-core-action')).toBeDisabled();
  });

  it('aceita o CTA de proximo item depois que o feedback ja foi registrado', () => {
    const handleAdvance = vi.fn();

    render(
      <ReviewCore
        data={{
          itemId: 'review-1',
          title: 'Porcentagem',
          subjectLabel: 'Matematica',
          sourceLabel: '+24h / Fila automatica',
          prompt: 'Recupere os pontos centrais de Porcentagem em Matematica antes de abrir a resposta.',
          answer: 'Revise a relacao entre base, percentual e variacao proporcional.',
          positionLabel: '2 de 5 itens',
          sequenceLabel: '1 concluido / 4 restantes',
          nextActionLabel: 'Medio registrado localmente. Avance para o proximo item da fila.',
          actionLabel: 'Proximo item',
          actionDisabled: false,
          status: 'answered',
        }}
        onAction={handleAdvance}
      />,
    );

    fireEvent.click(screen.getByTestId('review-core-action'));
    expect(handleAdvance).toHaveBeenCalledTimes(1);
  });

  it('suporta estado vazio sem quebrar o layout', () => {
    render(
      <ReviewCore
        data={{
          title: 'Nenhum item na fila de hoje',
          prompt: 'Quando uma nova revisao vencer, ela aparece aqui como item ativo.',
          answer: 'A area de resposta continua reservada para o fluxo de revelar e decidir.',
          positionLabel: '0 de 0 itens',
          sequenceLabel: 'Fila limpa para hoje',
          nextActionLabel: 'Nao ha proximo item a revisar agora.',
          actionLabel: 'Aguardando fila',
          actionDisabled: true,
          status: 'empty',
        }}
      />,
    );

    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Nenhum item na fila de hoje');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Nenhuma revisao vence hoje');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('0 de 0 itens');
    expect(screen.getByTestId('review-core-sequence')).toHaveTextContent('Fila limpa para hoje');
    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Aguardando fila');
    expect(screen.getByTestId('review-core-action')).toBeDisabled();
  });

  it('mostra fechamento claro quando a fila diaria ja terminou', () => {
    render(
      <ReviewCore
        data={{
          title: 'Revisoes do dia concluidas',
          prompt: 'Os itens vencidos de hoje ja passaram pela fila diaria.',
          answer: 'O fluxo de revelar resposta e registrar dificuldade entra sobre esta mesma base.',
          positionLabel: '3 de 3 itens',
          sequenceLabel: '3 concluidos / 0 restantes',
          nextActionLabel: 'A fila terminou. O proximo ciclo volta quando novas revisoes vencerem.',
          actionLabel: 'Fila concluida',
          actionDisabled: true,
          status: 'completed',
        }}
      />,
    );

    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Fila concluida');
    expect(screen.getByTestId('review-core-sequence')).toHaveTextContent('3 concluidos / 0 restantes');
    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Fila concluida');
    expect(screen.getByTestId('review-core-action')).toBeDisabled();
  });
});
