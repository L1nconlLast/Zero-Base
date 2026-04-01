import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReviewPage, submitReviewDecision } from '../features/review';
import type { ScheduleEntry } from '../types';
import type { SubmitReviewDecisionInput } from '../features/review';
import type { PlanoTrackContext } from '../features/plano/planoTrackPresentation';

const referenceDate = new Date('2026-03-30T12:00:00.000Z');

const enemProfileContext: PlanoTrackContext = {
  profile: 'enem',
};

const ReviewPageHarness: React.FC<{
  initialEntries: ScheduleEntry[];
  profileContext?: PlanoTrackContext | null;
}> = ({ initialEntries, profileContext = enemProfileContext }) => {
  const [entries, setEntries] = React.useState(initialEntries);

  const handleCommitDecision = React.useCallback((input: SubmitReviewDecisionInput) => {
    let result = null;
    setEntries((current) => {
      const mutation = submitReviewDecision(current, input);
      result = mutation?.result ?? null;
      return mutation?.entries ?? current;
    });
    return result;
  }, []);

  return (
    <ReviewPage
      scheduleEntries={entries}
      referenceDate={referenceDate}
      profileContext={profileContext}
      onCommitDecision={handleCommitDecision}
    />
  );
};

describe('ReviewPage', () => {
  it('executa o microloop do item atual ate avancar para o proximo da fila', async () => {
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-29',
        subject: 'Matematica',
        topic: 'Funcoes',
        done: true,
        status: 'concluido',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
        createdAt: '2026-03-28T12:00:00.000Z',
      },
      {
        id: 'review-2',
        date: '2026-03-29',
        subject: 'Biologia',
        topic: 'Citologia',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
        note: 'Revise membrana, organelas e transporte celular.',
        createdAt: '2026-03-28T15:00:00.000Z',
      },
      {
        id: 'review-3',
        date: '2026-03-30',
        subject: 'Linguagens',
        topic: 'Interpretacao',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'manual',
        createdAt: '2026-03-29T09:00:00.000Z',
      },
      {
        id: 'future-review',
        date: '2026-03-31',
        subject: 'Historia',
        topic: 'Imperio',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
      },
      {
        id: 'study-entry',
        date: '2026-03-29',
        subject: 'Quimica',
        topic: 'Ligacoes',
        done: false,
        status: 'pendente',
        studyType: 'questoes',
      },
    ];

    render(<ReviewPageHarness initialEntries={scheduleEntries} />);

    expect(screen.getByTestId('review-page-layout')).toBeInTheDocument();
    expect(screen.getByTestId('review-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Revisao do dia' })).toBeInTheDocument();
    expect(screen.getByText('Revisao ENEM')).toBeInTheDocument();
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('Item 2 de 3');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('2 restantes');
    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Em andamento');
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Citologia');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('2 de 3 itens');
    expect(screen.getByTestId('review-core-sequence')).toHaveTextContent('1 concluido / 2 restantes');
    expect(screen.getByTestId('review-core-next-step')).toHaveTextContent('Recupere os pontos-chave deste topico antes de abrir a resposta e medir sua retencao.');
    expect(screen.getByTestId('review-core-prompt')).toHaveTextContent('Recupere Citologia em Biologia pensando em como esse topico reaparece nas questoes do ENEM');
    expect(screen.getByTestId('review-core-answer')).not.toHaveTextContent('Revise membrana, organelas e transporte celular.');
    expect(screen.getByTestId('review-feedback-option-medio')).toBeDisabled();
    expect(screen.getByTestId('review-summary-item-review-1')).toHaveTextContent('Feito');
    expect(screen.getByTestId('review-summary-item-review-2')).toHaveTextContent('Agora');
    expect(screen.getByTestId('review-summary-item-review-3')).toHaveTextContent('Fila');
    expect(screen.queryByTestId('review-summary-item-future-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('review-summary-item-study-entry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('review-core-action'));

    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Resposta aberta');
    expect(screen.getByTestId('review-core-answer')).toHaveTextContent('Revise membrana, organelas e transporte celular.');
    expect(screen.getByTestId('review-feedback-option-medio')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('review-feedback-option-medio'));

    expect(screen.getByTestId('review-feedback')).toHaveTextContent('Feedback Medio registrado localmente. Avance quando estiver pronto.');
    expect(screen.getByTestId('review-core-meta')).toHaveTextContent('Decisao registrada');
    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Proximo item');

    fireEvent.click(screen.getByTestId('review-core-action'));

    await waitFor(() => {
      expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('Item 3 de 3');
    });
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('1 restante');
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Interpretacao');
    expect(screen.getByTestId('review-core-answer')).not.toHaveTextContent('A resposta guiada entra na proxima etapa, junto com a decisao de dominio.');
    expect(screen.getByTestId('review-summary-item-review-2')).toHaveTextContent('Feito');
    expect(screen.getByTestId('review-summary-item-review-3')).toHaveTextContent('Agora');
  });

  it('mantem a estrutura valida quando a fila diaria esta vazia', () => {
    render(<ReviewPageHarness initialEntries={[]} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Revisao do dia' })).toBeInTheDocument();
    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Fila vazia');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('0 de 0 itens');
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Nenhum item na fila de hoje');
    expect(screen.getByText('Quando novas revisoes vencerem, elas entram aqui com um item ativo por vez.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum item entrou na fila de hoje.')).toBeInTheDocument();
  });

  it('reflete corretamente quando toda a fila diaria ja foi concluida', () => {
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-29',
        subject: 'Matematica',
        topic: 'Funcoes',
        done: true,
        status: 'concluido',
        studyType: 'revisao',
        source: 'ia',
      },
      {
        id: 'review-2',
        date: '2026-03-30',
        subject: 'Biologia',
        topic: 'Citologia',
        done: true,
        status: 'concluido',
        studyType: 'revisao',
        source: 'manual',
      },
    ];

    render(<ReviewPageHarness initialEntries={scheduleEntries} />);

    expect(screen.getByTestId('review-header-status')).toHaveTextContent('Fila concluida');
    expect(screen.getByTestId('review-header-metrics')).toHaveTextContent('2 de 2 itens');
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Revisoes do dia concluidas');
    expect(screen.getByTestId('review-core-sequence')).toHaveTextContent('2 concluidos / 0 restantes');
    expect(screen.getByTestId('review-summary')).toHaveTextContent('2 concluidos');
    expect(screen.getByTestId('review-summary')).toHaveTextContent('0 restantes');
  });

  it('permite fechar localmente a fila quando o ultimo item recebe feedback', async () => {
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-30',
        subject: 'Matematica',
        topic: 'Funcoes',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      },
    ];

    render(<ReviewPageHarness initialEntries={scheduleEntries} />);

    fireEvent.click(screen.getByTestId('review-core-action'));
    fireEvent.click(screen.getByTestId('review-feedback-option-facil'));

    expect(screen.getByTestId('review-core-action')).toHaveTextContent('Fechar fila');

    fireEvent.click(screen.getByTestId('review-core-action'));

    await waitFor(() => {
      expect(screen.getByTestId('review-header-status')).toHaveTextContent('Fila concluida');
    });
    expect(screen.getByTestId('review-core-title')).toHaveTextContent('Revisoes do dia concluidas');
    expect(screen.getByTestId('review-summary')).toHaveTextContent('1 concluido');
  });

  it('explicita a origem do item no modo hibrido', () => {
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-30',
        subject: 'Direito Administrativo',
        topic: 'Poderes Administrativos',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      },
    ];

    render(
      <ReviewPageHarness
        initialEntries={scheduleEntries}
        profileContext={{
          profile: 'hibrido',
          concurso: {
            name: 'PF Administrativo 2025',
            board: 'Cebraspe',
            area: 'Administrativo',
          },
          hibrido: {
            primaryFocus: 'concurso',
          },
        }}
      />,
    );

    expect(screen.getByText('Revisao hibrida')).toBeInTheDocument();
    expect(screen.getByTestId('review-core')).toHaveTextContent('Concurso');
    expect(screen.getByTestId('review-summary-item-review-1')).toHaveTextContent('Concurso / Direito Administrativo');
  });
});
