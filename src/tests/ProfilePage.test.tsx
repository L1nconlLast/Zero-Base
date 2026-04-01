import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '../features/profile';
import type { ProfileTrackContext } from '../features/profile/types';
import type { ScheduleEntry, UserData } from '../types';

const userData: UserData = {
  weekProgress: {
    domingo: { studied: false, minutes: 0 },
    segunda: { studied: true, minutes: 45 },
    terca: { studied: true, minutes: 35 },
    quarta: { studied: false, minutes: 0 },
    quinta: { studied: false, minutes: 0 },
    sexta: { studied: false, minutes: 0 },
    sabado: { studied: false, minutes: 0 },
  },
  completedTopics: {},
  totalPoints: 420,
  streak: 3,
  bestStreak: 6,
  achievements: [],
  level: 4,
  studyHistory: [],
  dailyGoal: 60,
  sessions: [
    {
      date: '2026-03-28T12:00:00.000Z',
      minutes: 45,
      points: 30,
      subject: 'Matematica',
      duration: 2700,
      goalMet: true,
    },
    {
      date: '2026-03-29T12:00:00.000Z',
      minutes: 35,
      points: 20,
      subject: 'Biologia',
      duration: 2100,
      goalMet: true,
    },
  ],
  currentStreak: 3,
};

describe('ProfilePage', () => {
  it('renderiza cabecalho e stats basicos do perfil com CTA de ajustes', () => {
    const onOpenSettings = vi.fn();
    const onReviewContext = vi.fn();
    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-03-30',
        subject: 'Biologia',
        topic: 'Citologia',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
      },
      {
        id: 'review-2',
        date: '2026-04-01',
        subject: 'Historia',
        topic: 'Imperio',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'manual',
        lastReviewedAt: '2026-03-30T14:00:00.000Z',
      },
    ];
    const profileContext: ProfileTrackContext = {
      profile: 'hibrido',
      summaryDescription: 'Plano balanceado entre ENEM e concurso, com prioridade atual no edital.',
      concurso: {
        name: 'PF Administrativo 2025',
        board: 'Cebraspe',
      },
      hibrido: {
        primaryFocus: 'concurso',
        availableStudyTime: 'medio',
      },
    };

    render(
      <ProfilePage
        displayName="Lin"
        email="lin@example.com"
        profileAvatar="U"
        examGoal="ENEM 2026"
        examDate="2026-11-09"
        weeklyGoalMinutes={300}
        syncStatusLabel="Sincronizado"
        userData={userData}
        scheduleEntries={scheduleEntries}
        onOpenSettings={onOpenSettings}
        profileContext={profileContext}
        onReviewContext={onReviewContext}
        referenceDate={new Date('2026-03-30T12:00:00.000Z')}
      />,
    );

    expect(screen.getByTestId('profile-page-layout')).toBeInTheDocument();
    expect(screen.getByTestId('profile-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Lin' })).toBeInTheDocument();
    expect(screen.getByTestId('profile-header-metrics')).toHaveTextContent('Nv. 4');
    expect(screen.getByTestId('profile-header-metrics')).toHaveTextContent('420 XP');
    expect(screen.getByTestId('profile-header-metrics')).toHaveTextContent('80/300 min');
    expect(screen.getByTestId('profile-header-metrics')).toHaveTextContent('Sincronizado');
    expect(screen.getByTestId('profile-context-panel')).toBeInTheDocument();
    expect(screen.getByTestId('profile-context-track')).toHaveTextContent('Hibrido');
    expect(screen.getByTestId('profile-context-title')).toHaveTextContent('ENEM + Concurso');
    expect(screen.getByTestId('profile-context-description')).toHaveTextContent('prioridade atual no edital');
    expect(screen.getByText('Foco: Concurso')).toBeInTheDocument();
    expect(screen.getByText('PF Administrativo 2025')).toBeInTheDocument();

    expect(screen.getByTestId('profile-stats-grid')).toBeInTheDocument();
    expect(screen.getByTestId('profile-stat-streak')).toHaveTextContent('3 dias');
    expect(screen.getByTestId('profile-stat-time')).toHaveTextContent('1,3h');
    expect(screen.getByTestId('profile-stat-sessions')).toHaveTextContent('2');
    expect(screen.getByTestId('profile-stat-reviews')).toHaveTextContent('1');
    expect(screen.getByTestId('profile-stat-reviews')).toHaveTextContent('1 pendencia na fila de hoje');
    expect(screen.getByTestId('profile-streak-panel')).toBeInTheDocument();
    expect(screen.getByTestId('profile-streak-current')).toHaveTextContent('3 dias');
    expect(screen.getByTestId('profile-streak-best')).toHaveTextContent('3 dias');
    expect(screen.getByTestId('profile-streak-today-status')).toHaveTextContent('Hoje ja contou na sequencia.');
    expect(screen.getByTestId('profile-streak-recent-summary')).toHaveTextContent('3 de 7 dias ativos');
    expect(screen.getByTestId('profile-goals-panel')).toBeInTheDocument();
    expect(screen.getByTestId('profile-goal-status')).toHaveTextContent('No ritmo');
    expect(screen.getByTestId('profile-goal-progress')).toHaveTextContent('80 min de 300 min');
    expect(screen.getByTestId('profile-goal-remaining')).toHaveTextContent('Faltam 220 min para concluir.');
    expect(screen.getByTestId('profile-activity-panel')).toBeInTheDocument();
    expect(screen.getByText('Revisao concluida')).toBeInTheDocument();
    expect(screen.getByText('Historia - Imperio')).toBeInTheDocument();
    expect(screen.getAllByText('Sessao concluida').length).toBeGreaterThan(0);
    expect(screen.getByText('Hoje')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir ajustes' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar foco' }));
    expect(onReviewContext).toHaveBeenCalledTimes(1);
  });

  it('mantem leitura valida quando ainda nao ha sessoes nem revisoes respondidas', () => {
    render(
      <ProfilePage
        displayName="Novo usuario"
        email="novo@example.com"
        profileAvatar="U"
        examGoal="Plano ativo"
        weeklyGoalMinutes={-1}
        syncStatusLabel="Local"
        userData={{
          ...userData,
          totalPoints: 0,
          level: 1,
          streak: 0,
          bestStreak: 0,
          currentStreak: 0,
          sessions: [],
          studyHistory: [],
          weekProgress: {
            domingo: { studied: false, minutes: 0 },
            segunda: { studied: false, minutes: 0 },
            terca: { studied: false, minutes: 0 },
            quarta: { studied: false, minutes: 0 },
            quinta: { studied: false, minutes: 0 },
            sexta: { studied: false, minutes: 0 },
            sabado: { studied: false, minutes: 0 },
          },
        }}
        scheduleEntries={[]}
        referenceDate={new Date('2026-03-30T12:00:00.000Z')}
      />,
    );

    expect(screen.getByTestId('profile-stat-streak')).toHaveTextContent('0 dias');
    expect(screen.getByTestId('profile-stat-time')).toHaveTextContent('0 min');
    expect(screen.getByTestId('profile-stat-sessions')).toHaveTextContent('0');
    expect(screen.getByTestId('profile-stat-reviews')).toHaveTextContent('Nenhuma pendencia aberta agora');
    expect(screen.getByTestId('profile-streak-current')).toHaveTextContent('0 dias');
    expect(screen.getByTestId('profile-streak-today-status')).toHaveTextContent('Hoje ainda nao entrou na sequencia.');
    expect(screen.getByTestId('profile-goal-status')).toHaveTextContent('Sem meta');
    expect(screen.getByTestId('profile-activity-empty')).toHaveTextContent(
      'Conclua uma sessao ou revisao para comecar seu historico recente.',
    );
  });

  it('destaca quando a melhor sequencia e maior do que a atual', () => {
    render(
      <ProfilePage
        displayName="Ritmo quebrado"
        email="ritmo@example.com"
        profileAvatar="U"
        examGoal="ENEM 2026"
        weeklyGoalMinutes={240}
        syncStatusLabel="Sincronizado"
        userData={{
          ...userData,
          sessions: [
            {
              date: '2026-03-20T12:00:00.000Z',
              minutes: 20,
              points: 10,
              subject: 'Matematica',
              duration: 1200,
            },
            {
              date: '2026-03-21T12:00:00.000Z',
              minutes: 20,
              points: 10,
              subject: 'Matematica',
              duration: 1200,
            },
            {
              date: '2026-03-22T12:00:00.000Z',
              minutes: 20,
              points: 10,
              subject: 'Matematica',
              duration: 1200,
            },
            {
              date: '2026-03-28T12:00:00.000Z',
              minutes: 25,
              points: 15,
              subject: 'Biologia',
              duration: 1500,
            },
          ],
          studyHistory: [],
          currentStreak: 1,
          bestStreak: 3,
        }}
        scheduleEntries={[]}
        referenceDate={new Date('2026-03-30T12:00:00.000Z')}
      />,
    );

    expect(screen.getByTestId('profile-streak-current')).toHaveTextContent('1 dia');
    expect(screen.getByTestId('profile-streak-best')).toHaveTextContent('3 dias');
    expect(screen.getByTestId('profile-streak-today-status')).toHaveTextContent('Hoje ainda nao entrou na sequencia.');
  });

  it('mostra meta concluida quando o alvo semanal ja foi batido', () => {
    render(
      <ProfilePage
        displayName="Meta batida"
        email="meta@example.com"
        profileAvatar="U"
        examGoal="ENEM 2026"
        weeklyGoalMinutes={60}
        syncStatusLabel="Sincronizado"
        userData={userData}
        scheduleEntries={[]}
        referenceDate={new Date('2026-03-30T12:00:00.000Z')}
      />,
    );

    expect(screen.getByTestId('profile-goal-status')).toHaveTextContent('Concluida');
    expect(screen.getByTestId('profile-goal-remaining')).toHaveTextContent('Meta concluida nesta semana.');
  });
});
