import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionCore } from '../features/estudos/components/ExecutionCore';
import type { ExecutionCoreData } from '../features/estudos';

const createExecutionData = (overrides: Partial<ExecutionCoreData> = {}): ExecutionCoreData => ({
  status: 'running',
  timerLabel: '~25 min',
  timerStateLabel: 'Sessao em andamento',
  primaryGoal: 'Fechar porcentagem e validar 3 questoes',
  progressLabel: '3 questoes previstas',
  secondaryProgressLabel: 'Etapa principal pronta para hoje.',
  currentStepLabel: 'Etapa 1 de 3',
  progressPercent: 38,
  emphasisLevel: 'default',
  ...overrides,
});

describe('ExecutionCore', () => {
  it('renderiza tempo, objetivo, progresso e a superficie principal da execucao', () => {
    render(
      <ExecutionCore
        data={createExecutionData()}
        currentMode="pomodoro"
        onModeChange={vi.fn()}
        pomodoroContent={<button type="button">Iniciar foco</button>}
        freeTimerContent={<button type="button">Iniciar livre</button>}
      />,
    );

    expect(screen.getByTestId('study-execution-core')).toBeInTheDocument();
    expect(screen.getByTestId('study-execution-goal')).toHaveTextContent('Fechar porcentagem e validar 3 questoes');
    expect(screen.getByTestId('study-execution-state')).toHaveTextContent('Sessao em andamento');
    expect(screen.getByTestId('study-execution-timer-label')).toHaveTextContent('~25 min');
    expect(screen.getByTestId('study-execution-progress')).toHaveTextContent('3 questoes previstas');
    expect(screen.getByTestId('study-execution-progress')).toHaveTextContent('Etapa principal pronta para hoje.');
    expect(screen.getByTestId('study-execution-progress-bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar foco' })).toBeInTheDocument();
  });

  it('suporta estado idle sem quebrar o progresso opcional', () => {
    render(
      <ExecutionCore
        data={createExecutionData({
          status: 'idle',
          timerStateLabel: 'Sessao pronta para comecar',
          progressLabel: undefined,
          secondaryProgressLabel: 'Bloco principal pronto para hoje.',
          progressPercent: 12,
          emphasisLevel: 'calm',
        })}
        currentMode="livre"
        onModeChange={vi.fn()}
        pomodoroContent={<div>Pomodoro</div>}
        freeTimerContent={<button type="button">Iniciar livre</button>}
      />,
    );

    expect(screen.getByTestId('study-execution-state')).toHaveTextContent('Sessao pronta para comecar');
    expect(screen.queryByText('3 questoes previstas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar livre' })).toBeInTheDocument();
  });

  it('suporta estado paused com leitura de retomada', () => {
    render(
      <ExecutionCore
        data={createExecutionData({
          status: 'paused',
          timerStateLabel: 'Sessao pausada',
          currentStepLabel: 'Etapa 2 de 3',
          progressLabel: 'Retomar validacao',
          secondaryProgressLabel: 'O foco terminou. Agora a sessao continua na pratica.',
          emphasisLevel: 'calm',
        })}
        currentMode="pomodoro"
        onModeChange={vi.fn()}
        pomodoroContent={<button type="button">Continuar foco</button>}
        freeTimerContent={<div>Livre</div>}
      />,
    );

    expect(screen.getByTestId('study-execution-state')).toHaveTextContent('Sessao pausada');
    expect(screen.getByTestId('study-execution-progress')).toHaveTextContent('Etapa 2 de 3');
    expect(screen.getByRole('button', { name: 'Continuar foco' })).toBeInTheDocument();
  });

  it('suporta estado ready_to_finish com enfase de fechamento', () => {
    render(
      <ExecutionCore
        data={createExecutionData({
          status: 'ready_to_finish',
          timerLabel: 'Fechamento pronto',
          timerStateLabel: 'Sessao pronta para encerrar',
          primaryGoal: 'Registrar Matematica e fechar a sessao',
          progressLabel: 'Registro final pronto',
          secondaryProgressLabel: 'Feche o registro para alimentar revisoes e home.',
          currentStepLabel: 'Etapa 3 de 3',
          progressPercent: 100,
          emphasisLevel: 'urgent',
        })}
        currentMode="pomodoro"
        onModeChange={vi.fn()}
        pomodoroContent={<button type="button">Concluir foco</button>}
        freeTimerContent={<div>Livre</div>}
      />,
    );

    expect(screen.getByTestId('study-execution-state')).toHaveTextContent('Sessao pronta para encerrar');
    expect(screen.getByTestId('study-execution-goal')).toHaveTextContent('Registrar Matematica e fechar a sessao');
    expect(screen.getByRole('button', { name: 'Concluir foco' })).toBeInTheDocument();
  });
});
