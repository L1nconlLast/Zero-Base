import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanoPage } from '../features/plano';
import type { ScheduleEntry, StudyContextForToday, WeeklyStudySchedule } from '../types';
import type { PlanoTrackContext } from '../features/plano/planoTrackPresentation';

const weeklySchedule: WeeklyStudySchedule = {
  weekPlan: {
    monday: { subjectLabels: ['Matematica', 'Linguagens'] },
    tuesday: { subjectLabels: ['Biologia'] },
    wednesday: { subjectLabels: [] },
    thursday: { subjectLabels: ['Historia'] },
    friday: { subjectLabels: ['Quimica'] },
    saturday: { subjectLabels: [] },
    sunday: { subjectLabels: [] },
  },
  availability: {
    monday: true,
    tuesday: true,
    wednesday: false,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },
  preferences: {
    defaultSessionDurationMinutes: 50,
    sessionsPerDay: 2,
    weeklyGoalSessions: 5,
  },
  updatedAt: new Date('2026-03-29T12:00:00.000Z').toISOString(),
};

const studyContextForToday: StudyContextForToday = {
  state: {
    type: 'planned',
    day: 'monday',
    subjectLabels: ['Matematica', 'Linguagens'],
  },
  eligibleSubjects: ['Matematica', 'Linguagens', 'Biologia'],
  defaultSessionDurationMinutes: 50,
};

const enemProfileContext: PlanoTrackContext = {
  profile: 'enem',
  enem: {
    targetCollege: 'USP',
    targetCourse: 'Medicina',
  },
};

describe('PlanoPage', () => {
  it('organiza a pagina em resumo, distribuicao, proximos passos e apoio', () => {
    render(
      <PlanoPage
        darkMode={false}
        weeklySchedule={weeklySchedule}
        studyContextForToday={studyContextForToday}
        weeklyCompletedSessions={2}
        weeklyPlannedSessions={5}
        todayCompletedSessions={1}
        currentBlockLabel="Matematica"
        currentBlockObjective="Porcentagem"
        currentBlockDurationMinutes={50}
        scheduleEntries={[]}
        onStartStudy={vi.fn()}
        onEditDay={vi.fn()}
        profileContext={enemProfileContext}
        calendar={<div>Calendario operacional</div>}
      />,
    );

    expect(screen.getByTestId('plan-header')).toBeInTheDocument();
    expect(screen.getByText('Plano principal do ENEM')).toBeInTheDocument();
    expect(screen.getByText(/por semana - foco em Matematica e Linguagens - Medicina - USP/)).toBeInTheDocument();
    expect(screen.getByText(/Ciclo ativo\. Hoje voce tem 2 blocos prontos e 3 sessoes restantes\./)).toBeInTheDocument();
    expect(screen.getByTestId('plan-header-metrics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajustar plano' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver cronograma' })).toBeInTheDocument();
    expect(screen.getByTestId('plan-summary-strip')).toBeInTheDocument();
    expect(screen.getByTestId('plan-summary-load')).toBeInTheDocument();
    expect(screen.getByTestId('plan-summary-subjects')).toBeInTheDocument();
    expect(screen.getByTestId('plan-summary-cycle')).toBeInTheDocument();
    expect(screen.getByText('Carga ENEM')).toBeInTheDocument();
    expect(screen.getByText('Areas ativas')).toBeInTheDocument();
    expect(screen.getByText('Ciclo ENEM')).toBeInTheDocument();
    expect(screen.getByTestId('plan-distribution-block')).toBeInTheDocument();
    expect(screen.getByTestId('plan-distribution-list')).toBeInTheDocument();
    expect(screen.getByText('Como sua preparacao ENEM se divide')).toBeInTheDocument();
    expect(screen.getByTestId('plan-distribution-item-matematica')).toBeInTheDocument();
    expect(screen.getByTestId('plan-distribution-item-linguagens')).toBeInTheDocument();
    expect(screen.getByText('Area principal')).toBeInTheDocument();
    expect(screen.getByTestId('plan-next-steps-column')).toBeInTheDocument();
    expect(screen.getByTestId('plan-next-steps-panel')).toBeInTheDocument();
    expect(screen.getByText('O que vem a seguir na sua preparacao')).toBeInTheDocument();
    expect(screen.getByTestId('plan-next-step-next-focus')).toBeInTheDocument();
    expect(screen.getByTestId('plan-next-step-plan-continuity')).toBeInTheDocument();
    expect(screen.getByText('Proximo bloco ENEM')).toBeInTheDocument();
    expect(screen.getByText('Continuidade ENEM')).toBeInTheDocument();
    expect(screen.getByTestId('plan-support-block')).toBeInTheDocument();
    expect(screen.getByText('Cronograma ENEM completo')).toBeInTheDocument();
    expect(screen.queryByText('Seu ciclo da semana ja esta montado')).not.toBeInTheDocument();
  });

  it('reflete revisao pendente de hoje no plano e nos proximos passos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));

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
        aiReason: 'Revisao automatica +24h apos a conclusao do bloco.',
      },
    ];

    try {
      render(
        <PlanoPage
          darkMode={false}
          weeklySchedule={weeklySchedule}
          studyContextForToday={studyContextForToday}
          weeklyCompletedSessions={2}
          weeklyPlannedSessions={5}
          todayCompletedSessions={1}
          currentBlockLabel="Matematica"
          currentBlockObjective="Porcentagem"
          currentBlockDurationMinutes={50}
          scheduleEntries={scheduleEntries}
          onStartStudy={vi.fn()}
          onEditDay={vi.fn()}
          profileContext={enemProfileContext}
          calendar={<div>Calendario operacional</div>}
        />,
      );

      expect(screen.getByText('1 revisao pronta hoje')).toBeInTheDocument();
      expect(screen.getByText(/1 Revisao pronta para hoje\./)).toBeInTheDocument();
      expect(screen.getByTestId('plan-next-step-next-review')).toHaveTextContent('Revisao pronta para hoje');
    } finally {
      vi.useRealTimers();
    }
  });

  it('mostra revisao concluida hoje sem manter pendencia fantasma no plano', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));

    const scheduleEntries: ScheduleEntry[] = [
      {
        id: 'review-1',
        date: '2026-04-01',
        subject: 'Biologia',
        topic: 'Citologia',
        done: false,
        status: 'pendente',
        studyType: 'revisao',
        source: 'ia',
        aiReason: 'Revisao automatica +48h apos feedback medio.',
        lastReviewedAt: '2026-03-30T14:30:00.000Z',
        lastReviewFeedback: 'medio',
        nextReviewAt: '2026-04-01',
        reviewIntervalDays: 2,
        reviewCount: 1,
      },
    ];

    try {
      render(
        <PlanoPage
          darkMode={false}
          weeklySchedule={weeklySchedule}
          studyContextForToday={studyContextForToday}
          weeklyCompletedSessions={2}
          weeklyPlannedSessions={5}
          todayCompletedSessions={1}
          currentBlockLabel="Matematica"
          currentBlockObjective="Porcentagem"
          currentBlockDurationMinutes={50}
          scheduleEntries={scheduleEntries}
          onStartStudy={vi.fn()}
          onEditDay={vi.fn()}
          profileContext={enemProfileContext}
          calendar={<div>Calendario operacional</div>}
        />,
      );

      expect(screen.getByText('Revisoes do dia em dia')).toBeInTheDocument();
      expect(screen.getByTestId('plan-next-step-next-review')).toHaveTextContent('Revisao de hoje concluida. Volta ao ciclo em Quarta');
      expect(screen.queryByText('1 revisao pronta hoje')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('aplica narrativa hibrida quando o track pede balanceamento real', () => {
    render(
      <PlanoPage
        darkMode={false}
        weeklySchedule={weeklySchedule}
        studyContextForToday={studyContextForToday}
        weeklyCompletedSessions={2}
        weeklyPlannedSessions={5}
        todayCompletedSessions={1}
        currentBlockLabel="Direito Administrativo"
        currentBlockObjective="Lei seca"
        currentBlockDurationMinutes={50}
        scheduleEntries={[]}
        onStartStudy={vi.fn()}
        onEditDay={vi.fn()}
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
        calendar={<div>Calendario operacional</div>}
      />,
    );

    expect(screen.getByText('Plano hibrido com concurso no centro')).toBeInTheDocument();
    expect(screen.getByText('Frentes ativas')).toBeInTheDocument();
    expect(screen.getAllByText('PF Administrativo 2025 no centro').length).toBeGreaterThan(0);
    expect(screen.getByText('Visao completa da semana hibrida')).toBeInTheDocument();
  });
});
