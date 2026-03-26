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
});
