import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '../components/Dashboard/DashboardPage';

vi.mock('../hooks/useTrackImpressionInViewOnce', () => ({
  useTrackImpressionInViewOnce: () => ({ current: null }),
}));

const renderDashboard = (officialStudyCard: React.ComponentProps<typeof DashboardPage>['officialStudyCard']) =>
  render(
    <DashboardPage
      userName="QA"
      totalPoints={120}
      level={2}
      heroVariant="hero_v1"
      todayMinutes={0}
      completedContentIds={[]}
      currentStreak={0}
      sessions={[]}
      onContinueNow={vi.fn()}
      onNavigate={vi.fn()}
      officialStudyCard={officialStudyCard}
    />,
  );

describe('DashboardPage official study card states', () => {
  it('renderiza fallback empty com CTA funcional', () => {
    const onAction = vi.fn();

    renderDashboard({
      status: 'empty',
      title: 'Ainda nao existe uma recomendacao pronta',
      description: 'A home oficial ainda nao recebeu uma recomendacao valida para montar o proximo estudo.',
      supportingText: 'Abra o cronograma, organize o dia e volte para gerar a proxima sessao real.',
      actionLabel: 'Abrir cronograma',
      onAction,
    });

    expect(screen.getByText('Para estudar agora')).toBeInTheDocument();
    expect(screen.getByText('Ainda nao existe uma recomendacao pronta')).toBeInTheDocument();
    expect(screen.getByText('Abra o cronograma, organize o dia e volte para gerar a proxima sessao real.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir cronograma' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renderiza fallback de erro com retry e acao secundaria', () => {
    const onRetry = vi.fn();
    const onSecondary = vi.fn();

    renderDashboard({
      status: 'error',
      title: 'Nao foi possivel abrir seu proximo estudo',
      description: 'Falha forcada ao carregar a home oficial.',
      actionLabel: 'Tentar novamente',
      onAction: onRetry,
      secondaryAction: {
        label: 'Abrir cronograma',
        onAction: onSecondary,
      },
    });

    expect(screen.getByText('Nao foi possivel abrir seu proximo estudo')).toBeInTheDocument();
    expect(screen.getByText('Falha forcada ao carregar a home oficial.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir cronograma' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('renderiza copy explicavel e progresso semanal no card oficial', () => {
    renderDashboard({
      status: 'ready',
      title: 'Seu proximo estudo ja esta pronto',
      discipline: 'Linguagens',
      topic: 'Interpretacao',
      reason: 'Atrasado e Prioridade alta',
      estimatedDurationMinutes: 15,
      sessionTypeLabel: 'Sessao curta priorizada',
      ctaLabel: 'Estudar agora',
      onAction: vi.fn(),
      weeklyProgress: {
        completedSessions: 2,
        plannedSessions: 5,
        ratio: 0.4,
        label: '2 de 5 sessoes concluidas',
      },
    });

    expect(screen.getByTestId('study-now-card-reason')).toHaveTextContent('Priorizado por atraso');
    expect(screen.getByTestId('study-now-card-weekly-progress')).toHaveTextContent('2 de 5 sessoes concluidas');
  });

  it('renderiza disciplina e topico saneados no card oficial', () => {
    renderDashboard({
      status: 'ready',
      title: 'Seu proximo estudo ja esta pronto',
      discipline: 'Matematical|zb-session|eyJ0b2tlbiI6IngifQ==',
      topic: 'revisao_de_funcoes||zb-session||abc123',
      reason: 'Atrasado e Prioridade alta',
      estimatedDurationMinutes: 20,
      sessionTypeLabel: 'Sessao curta priorizada',
      ctaLabel: 'Estudar agora',
      onAction: vi.fn(),
    });

    expect(screen.getByTestId('study-now-card')).toHaveAttribute('data-study-discipline', 'Matematica');
    expect(screen.getByTestId('study-now-card')).toHaveAttribute('data-study-topic', 'Revisao de Funcoes');
    expect(screen.queryByText(/zb-session/i)).not.toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Matematica') && content.includes('Revisao de Funcoes'))).toBeInTheDocument();
  });
});
