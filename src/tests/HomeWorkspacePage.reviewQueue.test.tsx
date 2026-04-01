import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkspacePage } from '../components/Home/HomeWorkspacePage';
import type { HomeWorkspacePageProps } from '../components/Home/HomeWorkspacePage';
import { createHomeCompletionSignal } from '../components/Home/homeTodayCompletionSignal';
import type { HomeReviewQueueState } from '../features/review';

const buildProps = (reviewQueueState: HomeReviewQueueState): HomeWorkspacePageProps => ({
  darkMode: false,
  preferredTrack: 'enem',
  hybridEnemWeight: 70,
  userName: 'QA',
  todayMinutes: 25,
  dailyGoalMinutes: 60,
  currentStreak: 3,
  weeklyCompletedSessions: 2,
  weeklyPlannedSessions: 4,
  totalPoints: 180,
  completedContentCount: 4,
  syncStatusLabel: 'Sincronizado',
  syncStatusTone: 'success',
  sessions: [],
  officialStudyCard: {
    status: 'ready',
    discipline: 'Biologia',
    topic: 'Citologia',
    estimatedDurationMinutes: 18,
    progressLabel: 'Revisao curta + pratica',
    ctaLabel: 'Comecar sessao',
    reason: 'Foco em continuidade da semana',
  },
  reviewQueueItems: reviewQueueState.items,
  reviewQueueState,
  onStartStudy: vi.fn(),
  onOpenPlanning: vi.fn(),
  onOpenReviews: vi.fn(),
  onOpenStatistics: vi.fn(),
  onOpenSimulados: vi.fn(),
  onOpenTrail: vi.fn(),
  onOpenMentor: vi.fn(),
});

describe('HomeWorkspacePage review queue states', () => {
  it('mostra revisao pendente de hoje sem inventar fila paralela', () => {
    render(
      <HomeWorkspacePage
        {...buildProps({
          status: 'pending_today',
          dueTodayCount: 2,
          completedTodayCount: 0,
          upcomingCount: 1,
          totalPendingCount: 3,
          items: [
            { id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true },
          ],
          nextItem: { id: 'review-1', title: 'Biologia - Citologia', when: 'Hoje', tag: '24h', featured: true },
        })}
      />,
    );

    expect(screen.getByText('Comece pela revisao do ENEM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comecar revisao' })).toBeInTheDocument();

    const progressPrimary = screen.getByTestId('home-progress-primary');
    const primaryPanel = screen.getByTestId('home-primary-panel');
    const continuityPanel = screen.getByTestId('home-continuity-panel');

    expect(progressPrimary).toHaveAttribute('data-priority', 'review');
    expect(progressPrimary).toHaveAttribute('data-phase', 'inicio');
    expect(progressPrimary).toHaveAttribute('data-tone', 'default');
    expect(progressPrimary).toHaveTextContent('Revisao ENEM pronta');
    expect(primaryPanel).toHaveTextContent('Revisar ENEM agora');
    expect(primaryPanel).toHaveAttribute('data-priority', 'review');
    expect(primaryPanel).toHaveAttribute('data-phase', 'inicio');
    expect(primaryPanel).toHaveAttribute('data-tone', 'default');
    expect(primaryPanel).toHaveTextContent('Biologia - Citologia');
    expect(primaryPanel).toHaveTextContent('2 revisoes prontas agora.');
    expect(continuityPanel).toHaveTextContent('Depois da revisao ENEM');
    expect(continuityPanel).toHaveTextContent('Biologia - Citologia ja esta preparado para entrar sem atrito.');
    expect(within(continuityPanel).getByRole('button', { name: 'Abrir revisoes' })).toBeInTheDocument();
  });

  it('distingue revisoes concluidas hoje de um dia sem revisao', () => {
    render(
      <HomeWorkspacePage
        {...buildProps({
          status: 'completed_today',
          dueTodayCount: 0,
          completedTodayCount: 1,
          upcomingCount: 1,
          totalPendingCount: 1,
          items: [
            { id: 'review-next', title: 'Linguagens - Interpretacao', when: 'Amanha', tag: '48h', featured: true },
          ],
          nextItem: { id: 'review-next', title: 'Linguagens - Interpretacao', when: 'Amanha', tag: '48h', featured: true },
        })}
      />,
    );

    const continuityPanel = screen.getByTestId('home-continuity-panel');

    expect(continuityPanel).toHaveTextContent('Depois desse bloco ENEM');
    expect(continuityPanel).toHaveTextContent('Revisoes em dia');
    expect(continuityPanel).toHaveTextContent('1 revisao concluida hoje. A proxima janela volta amanha.');
    expect(within(continuityPanel).getByRole('button', { name: 'Abrir revisoes' })).toBeInTheDocument();
    expect(screen.queryByText('Sem revisoes hoje')).not.toBeInTheDocument();
  });

  it('mostra fechamento transitório da revisao antes de puxar a proxima prioridade', () => {
    render(
      <HomeWorkspacePage
        {...buildProps({
          status: 'empty',
          dueTodayCount: 0,
          completedTodayCount: 0,
          upcomingCount: 0,
          totalPendingCount: 0,
          items: [],
          nextItem: null,
        })}
        completionSignal={createHomeCompletionSignal('review')}
        continuationMission={{
          subject: 'Matematica',
          topic: 'Porcentagem',
          questionsDone: 0,
          totalQuestions: 3,
          estimatedMinutesRemaining: 5,
        }}
      />,
    );

    expect(screen.getAllByText('Revisao ENEM concluida').length).toBeGreaterThan(0);
    expect(screen.getByTestId('study-now-card')).toHaveAttribute('data-tone', 'completed');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-priority', 'review');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-phase', 'concluido');
    expect(screen.getByTestId('home-primary-panel')).toHaveAttribute('data-tone', 'completed');
    expect(screen.getByText('Revisao encerrada')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Continuar sessao' }).length).toBeGreaterThan(0);
  });
});
