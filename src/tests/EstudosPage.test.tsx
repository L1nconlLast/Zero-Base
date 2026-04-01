import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EstudosPage } from '../features/estudos';
import type { EstudosPageProps } from '../features/estudos';
import type { PlanoTrackContext } from '../features/plano/planoTrackPresentation';

const enemProfileContext: PlanoTrackContext = {
  profile: 'enem',
  enem: {
    targetCollege: 'USP',
    targetCourse: 'Medicina',
  },
};

const createProps = (): EstudosPageProps => ({
  darkMode: false,
  banner: {
    eyebrow: 'Sessao oficial',
    title: 'Matematica - Porcentagem - 25 min de foco',
    description: 'Hoje voce vai revisar o bloco principal antes da pratica.',
    supportingText: 'Foque no bloco atual e feche a sessao depois do timer.',
    primaryActionLabel: 'Continuar sessao',
    onPrimaryAction: vi.fn(),
    secondaryActionLabel: 'Ver plano',
    onSecondaryAction: vi.fn(),
    meta: [
      { label: 'Disciplina', value: 'Matematica' },
      { label: 'Topico', value: 'Porcentagem' },
      { label: 'Duracao', value: '25 min' },
    ],
  },
  isBlocked: false,
  blockedTitle: 'Bloqueado',
  blockedDescription: 'Ajuste o plano antes de iniciar.',
  showQuestionTransitionState: false,
  questionTransitionTitle: 'Transicao',
  questionTransitionDescription: 'As questoes entram depois do foco.',
  showPostFocusState: false,
  postSessionState: null,
  preferredStudyTrack: 'enem',
  onTrackChange: vi.fn(),
  hybridEnemWeight: 70,
  hybridConcursoWeight: 30,
  onHybridEnemWeightChange: vi.fn(),
  weeklyGoalMinutes: 300,
  onWeeklyGoalMinutesChange: vi.fn(),
  activeStudyMethodName: 'Ciclo guiado',
  preferencesSyncStatus: 'synced',
  lastPreferencesSyncAt: '2026-03-30T12:00:00.000Z',
  currentMode: 'pomodoro',
  onModeChange: vi.fn(),
  pomodoroContent: <div>Pomodoro principal</div>,
  freeTimerContent: <div>Timer livre</div>,
  currentBlockLabel: 'Matematica',
  currentBlockDurationMinutes: 25,
  currentBlockObjective: 'Porcentagem',
  currentTargetQuestions: 3,
  profileContext: enemProfileContext,
});

describe('EstudosPage', () => {
  it('organiza a pagina com a execucao no centro e o apoio em segundo plano', () => {
    render(<EstudosPage {...createProps()} />);

    expect(screen.getByTestId('study-page-layout')).toBeInTheDocument();
    expect(screen.getByTestId('study-main-flow')).toBeInTheDocument();
    expect(screen.getByTestId('study-execution-rail')).toBeInTheDocument();
    expect(screen.getByTestId('study-execution-panel')).toBeInTheDocument();
    expect(screen.getByTestId('study-execution-core')).toBeInTheDocument();
    expect(screen.getByTestId('study-execution-goal')).toHaveTextContent(
      'Aplicar Porcentagem em questoes e medir seguranca real antes de mudar de area.',
    );
    expect(screen.getByTestId('study-execution-state')).toHaveTextContent('Sessao em andamento');
    expect(screen.getByText('Execucao ENEM')).toBeInTheDocument();
    expect(screen.getByText('Este bloco de questoes conduz a sessao')).toBeInTheDocument();
    expect(screen.getByText('Troque o ritmo da sessao sem sair do bloco principal do ENEM.')).toBeInTheDocument();
    expect(screen.getAllByText('3 questoes previstas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Etapa 1 de 3').length).toBeGreaterThan(0);
    expect(screen.getByText('Pomodoro principal')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-rail')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-intro')).toBeInTheDocument();
    expect(screen.getByText('Apoio ENEM')).toBeInTheDocument();
    expect(screen.getByText('Checklist da pratica ENEM')).toBeInTheDocument();
    expect(
      screen.getByText('Esta sessao usa questoes para aproximar Medicina / USP de um desempenho mais consistente no ENEM.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('study-support-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-closure')).toBeInTheDocument();
    expect(
      screen.getByText('Registre onde voce acertou o ritmo e qual erro ainda precisa voltar no proximo bloco.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('study-support-strip')).toBeInTheDocument();
    expect(screen.getByTestId('study-post-execution-band')).toBeInTheDocument();
    expect(screen.getByTestId('study-post-execution-context')).toBeInTheDocument();
    expect(screen.getByTestId('study-post-execution-continuity')).toBeInTheDocument();
    expect(screen.getByText('Contexto da pratica ENEM')).toBeInTheDocument();
    expect(screen.getByText('Depois desta pratica ENEM')).toBeInTheDocument();
    expect(screen.getByText('Matematica / Porcentagem')).toBeInTheDocument();
    expect(screen.getByText('Depois desta sessao: revise o erro dominante antes de abrir outro bloco de questoes.')).toBeInTheDocument();
    expect(screen.getByText('A continuidade aqui deve reforcar o ponto que mais apareceu nas questoes.')).toBeInTheDocument();
  });
});
