import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionHeader } from '../features/estudos/components/SessionHeader';
import type { SessionHeaderData } from '../features/estudos';

const createHeaderData = (overrides: Partial<SessionHeaderData> = {}): SessionHeaderData => ({
  contextLabel: 'Matematica',
  sessionTypeLabel: 'Sessao focada',
  title: 'Praticar porcentagem',
  status: 'running',
  plannedMinutes: 25,
  currentStepLabel: '3 questoes depois do foco',
  progressLabel: 'Bloco oficial pronto para hoje',
  primaryActionLabel: 'Continuar sessao',
  onPrimaryAction: vi.fn(),
  secondaryActionLabel: 'Ver plano',
  onSecondaryAction: vi.fn(),
  ...overrides,
});

describe('SessionHeader', () => {
  it('renderiza contexto, titulo, metadados e acoes principais', () => {
    render(<SessionHeader data={createHeaderData()} darkMode={false} />);

    expect(screen.getByTestId('study-session-header')).toBeInTheDocument();
    expect(screen.getByTestId('study-session-header-context')).toHaveTextContent('Matematica');
    expect(screen.getByRole('heading', { level: 1, name: 'Praticar porcentagem' })).toBeInTheDocument();
    expect(screen.getByTestId('study-session-header-status')).toHaveTextContent('Em andamento');
    expect(screen.getByTestId('study-session-header-meta')).toHaveTextContent('25 min planejados');
    expect(screen.getByTestId('study-session-header-meta')).toHaveTextContent('3 questoes depois do foco');
    expect(screen.getByRole('button', { name: 'Continuar sessao' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver plano' })).toBeInTheDocument();
  });

  it('suporta estado idle com CTA de iniciar', () => {
    render(
      <SessionHeader
        data={createHeaderData({
          status: 'idle',
          primaryActionLabel: 'Comecar sessao',
          secondaryActionLabel: undefined,
          onSecondaryAction: undefined,
          progressLabel: undefined,
        })}
      />,
    );

    expect(screen.getByTestId('study-session-header-status')).toHaveTextContent('Pronta para comecar');
    expect(screen.getByRole('button', { name: 'Comecar sessao' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver plano' })).not.toBeInTheDocument();
  });

  it('suporta estado paused com CTA de retomar', () => {
    render(
      <SessionHeader
        data={createHeaderData({
          status: 'paused',
          statusLabel: 'Questoes a seguir',
          primaryActionLabel: 'Retomar sessao',
        })}
      />,
    );

    expect(screen.getByTestId('study-session-header-status')).toHaveTextContent('Questoes a seguir');
    expect(screen.getByRole('button', { name: 'Retomar sessao' })).toBeInTheDocument();
  });

  it('suporta estado ready_to_finish com CTA de encerrar', () => {
    render(
      <SessionHeader
        data={createHeaderData({
          status: 'ready_to_finish',
          title: 'Fechar bloco de Matematica',
          primaryActionLabel: 'Encerrar sessao',
          currentStepLabel: 'Fechamento do bloco',
          progressLabel: 'Registro final pronto',
        })}
      />,
    );

    expect(screen.getByTestId('study-session-header-status')).toHaveTextContent('Pronta para fechar');
    expect(screen.getByRole('heading', { level: 1, name: 'Fechar bloco de Matematica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar sessao' })).toBeInTheDocument();
  });
});
