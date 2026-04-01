import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkspacePage } from '../components/Home/HomeWorkspacePage';
import { createHomeCompletionSignal } from '../components/Home/homeTodayCompletionSignal';

describe('HomeWorkspacePage activation mode', () => {
  it('simplifica a home quando o usuario ainda nao iniciou a primeira sessao', () => {
    render(
      <HomeWorkspacePage
        darkMode={false}
        preferredTrack="enem"
        hybridEnemWeight={70}
        userName="QA"
        todayMinutes={0}
        dailyGoalMinutes={60}
        currentStreak={0}
        weeklyCompletedSessions={0}
        weeklyPlannedSessions={4}
        totalPoints={0}
        completedContentCount={0}
        syncStatusLabel="Sincronizado"
        syncStatusTone="neutral"
        sessions={[]}
        officialStudyCard={{
          status: 'ready',
          discipline: 'Matematica',
          topic: 'Funcoes',
          estimatedDurationMinutes: 15,
          progressLabel: '3 questoes rapidas',
          ctaLabel: 'Estudar agora',
        }}
        reviewQueueItems={[]}
        onStartStudy={vi.fn()}
        onOpenPlanning={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenStatistics={vi.fn()}
        onOpenSimulados={vi.fn()}
        onOpenTrail={vi.fn()}
        onOpenMentor={vi.fn()}
      />,
    );

    expect(screen.getByText('Comece sua primeira sessao ENEM')).toBeInTheDocument();
    expect(screen.getByText('Leva 15 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comecar primeira sessao (leva 15 min)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir planejamento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir mentor' })).not.toBeInTheDocument();
    expect(screen.queryByText('Um bloco curto para sair do zero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-progress-strip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-primary-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-progress-primary')).not.toBeInTheDocument();
  });

  it('destaca a retomada quando existe uma missao de continuidade pronta mesmo com sinais iniciais zerados', () => {
    render(
      <HomeWorkspacePage
        darkMode={false}
        preferredTrack="enem"
        hybridEnemWeight={70}
        userName="QA"
        todayMinutes={0}
        dailyGoalMinutes={60}
        currentStreak={0}
        weeklyCompletedSessions={0}
        weeklyPlannedSessions={3}
        totalPoints={20}
        completedContentCount={0}
        syncStatusLabel="Sincronizado"
        syncStatusTone="neutral"
        sessions={[]}
        officialStudyCard={{
          status: 'ready',
          discipline: 'Matematica',
          topic: 'Porcentagem',
          estimatedDurationMinutes: 5,
          progressLabel: 'Faltam so 3 questoes para fechar o dia',
          ctaLabel: 'Estudar agora',
        }}
        nextSessionCommit={{
          title: 'Sua proxima sessao esta pronta',
          detail: '3 questoes rapidas + revisao curta em menos de 5 min.',
        }}
        continuationMission={{
          subject: 'Matematica',
          topic: 'Porcentagem',
          questionsDone: 0,
          totalQuestions: 3,
          estimatedMinutesRemaining: 5,
        }}
        reviewQueueItems={[]}
        onStartStudy={vi.fn()}
        onOpenPlanning={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenStatistics={vi.fn()}
        onOpenSimulados={vi.fn()}
        onOpenTrail={vi.fn()}
        onOpenMentor={vi.fn()}
      />,
    );

    expect(screen.getByText('Seu bloco ENEM espera daqui')).toBeInTheDocument();
    expect(screen.queryByText('Comece sua primeira sessao ENEM')).not.toBeInTheDocument();
    expect(screen.getAllByText('Faltam 3 questoes para fechar este bloco. Leva menos de 5 min.').length).toBeGreaterThan(0);
    expect(screen.getByTestId('home-progress-strip')).toBeInTheDocument();
    expect(screen.getByTestId('home-progress-primary')).toBeInTheDocument();
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-priority', 'continue');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-phase', 'inicio');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-tone', 'default');
    expect(screen.getByTestId('home-progress-primary')).toHaveTextContent('Retomada ENEM pronta');
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByTestId('home-primary-panel')).toBeInTheDocument();
    expect(screen.getByTestId('home-primary-panel')).toHaveAttribute('data-priority', 'continue');
    expect(screen.getByTestId('home-primary-panel')).toHaveAttribute('data-phase', 'inicio');
    expect(screen.getByTestId('home-primary-panel')).toHaveAttribute('data-tone', 'default');
    expect(screen.getByTestId('home-continuity-panel')).toBeInTheDocument();
    expect(screen.getByTestId('home-support-strip')).toBeInTheDocument();
    expect(screen.getByTestId('home-support-strip')).toHaveAttribute('data-support-tone', 'quiet');
    expect(screen.getByText('Radar ENEM')).toBeInTheDocument();
    expect(screen.queryByTestId('home-support-grid')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Continuar sessao' }).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId('home-continuity-panel')).getByRole('button', { name: 'Abrir plano' })).toBeInTheDocument();
    expect(screen.queryByTestId('next-session-commit-banner')).not.toBeInTheDocument();
    expect(screen.queryByText('O produto ja tem base. Agora ele esta ganhando presenca.')).not.toBeInTheDocument();
  });

  it('usa um hero mais direto quando existe rotina em andamento sem missao de retorno', () => {
    render(
      <HomeWorkspacePage
        darkMode={false}
        preferredTrack="enem"
        hybridEnemWeight={70}
        userName="QA"
        todayMinutes={20}
        dailyGoalMinutes={60}
        currentStreak={2}
        weeklyCompletedSessions={2}
        weeklyPlannedSessions={4}
        totalPoints={120}
        completedContentCount={3}
        syncStatusLabel="Sincronizado"
        syncStatusTone="success"
        sessions={[]}
        officialStudyCard={{
          status: 'ready',
          discipline: 'Biologia',
          topic: 'Citologia',
          estimatedDurationMinutes: 18,
          progressLabel: 'Revisao curta + pratica',
          ctaLabel: 'Estudar agora',
          reason: 'Foco em continuidade da semana',
        }}
        reviewQueueItems={[]}
        onStartStudy={vi.fn()}
        onOpenPlanning={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenStatistics={vi.fn()}
        onOpenSimulados={vi.fn()}
        onOpenTrail={vi.fn()}
        onOpenMentor={vi.fn()}
      />,
    );

    expect(screen.getByText('Seu bloco ENEM de hoje esta pronto')).toBeInTheDocument();
    expect(screen.getAllByText('Biologia - Citologia').length).toBeGreaterThan(0);
    expect(screen.getByTestId('home-progress-primary')).toBeInTheDocument();
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-priority', 'study');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-phase', 'inicio');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-tone', 'default');
    expect(screen.getByTestId('home-progress-primary')).toHaveTextContent('Estudo ENEM pronto');
    expect(screen.getByTestId('home-progress-primary')).not.toHaveTextContent('Dia em andamento');
    expect(screen.getByTestId('home-support-strip')).toBeInTheDocument();
    expect(screen.getByTestId('home-support-strip')).toHaveAttribute('data-support-tone', 'default');
    expect(screen.getByText('Radar ENEM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estudar agora' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar sessao' })).not.toBeInTheDocument();
  });

  it('mostra fechamento transitório do estudo antes de abrir o proximo passo', () => {
    render(
      <HomeWorkspacePage
        darkMode={false}
        preferredTrack="enem"
        hybridEnemWeight={70}
        userName="QA"
        todayMinutes={20}
        dailyGoalMinutes={60}
        currentStreak={2}
        weeklyCompletedSessions={2}
        weeklyPlannedSessions={4}
        totalPoints={120}
        completedContentCount={3}
        syncStatusLabel="Sincronizado"
        syncStatusTone="success"
        sessions={[]}
        officialStudyCard={{
          status: 'ready',
          discipline: 'Biologia',
          topic: 'Citologia',
          estimatedDurationMinutes: 18,
          progressLabel: 'Revisao curta + pratica',
          ctaLabel: 'Estudar agora',
          reason: 'Foco em continuidade da semana',
        }}
        reviewQueueItems={[]}
        completionSignal={createHomeCompletionSignal('study')}
        onStartStudy={vi.fn()}
        onOpenPlanning={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenStatistics={vi.fn()}
        onOpenSimulados={vi.fn()}
        onOpenTrail={vi.fn()}
        onOpenMentor={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Bloco ENEM concluido').length).toBeGreaterThan(0);
    expect(screen.getByTestId('study-now-card')).toHaveAttribute('data-tone', 'completed');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-priority', 'study');
    expect(screen.getByTestId('home-progress-primary')).toHaveAttribute('data-phase', 'concluido');
  expect(screen.getByTestId('home-primary-panel')).toHaveAttribute('data-tone', 'completed');
  expect(screen.getByText('Estudo encerrado')).toBeInTheDocument();
  expect(screen.getByTestId('home-support-strip')).toHaveAttribute('data-support-tone', 'quiet');
  });

  it('usa narrativa hibrida quando o perfil salvo combina enem e concurso', () => {
    render(
      <HomeWorkspacePage
        darkMode={false}
        preferredTrack="hibrido"
        hybridEnemWeight={70}
        profileContext={{
          profile: 'hibrido',
          concurso: {
            name: 'PF Administrativo 2025',
            board: 'Cebraspe',
            area: 'Administrativo',
          },
          hibrido: {
            primaryFocus: 'enem',
          },
        }}
        userName="QA"
        todayMinutes={20}
        dailyGoalMinutes={60}
        currentStreak={2}
        weeklyCompletedSessions={2}
        weeklyPlannedSessions={4}
        totalPoints={120}
        completedContentCount={3}
        syncStatusLabel="Sincronizado"
        syncStatusTone="success"
        sessions={[]}
        officialStudyCard={{
          status: 'ready',
          discipline: 'Biologia',
          topic: 'Citologia',
          estimatedDurationMinutes: 18,
          progressLabel: 'Revisao curta + pratica',
          ctaLabel: 'Estudar agora',
          reason: 'Foco em continuidade da semana',
        }}
        reviewQueueItems={[]}
        onStartStudy={vi.fn()}
        onOpenPlanning={vi.fn()}
        onOpenReviews={vi.fn()}
        onOpenStatistics={vi.fn()}
        onOpenSimulados={vi.fn()}
        onOpenTrail={vi.fn()}
        onOpenMentor={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Hoje seu foco principal esta no ENEM, com concurso como continuidade.').length).toBeGreaterThan(0);
    expect(screen.getByTestId('home-progress-primary')).toHaveTextContent('ENEM no centro');
    expect(screen.getByTestId('home-continuity-panel')).toHaveTextContent('Depois do bloco ENEM');
    expect(screen.getByTestId('home-support-strip')).toHaveTextContent('Equilibrio hibrido');
  });
});
