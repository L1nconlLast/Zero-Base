import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupportRail } from '../features/estudos/components/SupportRail';
import type { SupportRailData } from '../features/estudos';

const createSupportRailData = (): SupportRailData => ({
  intro: 'Use esta coluna so quando precisar acompanhar etapas e fechar o bloco.',
  checklist: {
    title: 'Checklist da sessao',
    progressLabel: '2 de 3 prontas',
    items: [
      {
        id: 'focus',
        label: 'Executar o bloco principal',
        status: 'completed',
      },
      {
        id: 'practice',
        label: 'Validar com 3 questoes',
        status: 'active',
        detail: 'A pratica entra logo depois do foco.',
      },
      {
        id: 'closure',
        label: 'Registrar e encerrar a sessao',
        status: 'pending',
      },
    ],
  },
  closure: {
    title: 'Fechamento',
    message: 'Depois da validacao, o fechamento desta sessao fica disponivel aqui.',
    actionLabel: 'Fechamento liberado no fim do bloco',
    emphasis: 'subtle',
  },
});

describe('SupportRail', () => {
  it('renderiza checklist e fechamento sutis na coluna de apoio', () => {
    render(
      <SupportRail data={createSupportRailData()}>
        <div>Campos de fechamento</div>
      </SupportRail>,
    );

    expect(screen.getByTestId('study-support-rail')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-intro')).toHaveTextContent('Apoio da sessao');
    expect(screen.getByText('Use esta coluna so quando precisar acompanhar etapas e fechar o bloco.')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-checklist-item-focus')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-checklist-item-practice')).toHaveTextContent('A pratica entra logo depois do foco.');
    expect(screen.getByTestId('study-support-closure')).toBeInTheDocument();
    expect(screen.getByText('Fechamento liberado no fim do bloco')).toBeInTheDocument();
    expect(screen.getByText('Campos de fechamento')).toBeInTheDocument();
  });

  it('nao quebra quando o fechamento nao existe', () => {
    const data = createSupportRailData();
    render(
      <SupportRail
        data={{
          ...data,
          closure: undefined,
        }}
      />,
    );

    expect(screen.getByTestId('study-support-rail')).toBeInTheDocument();
    expect(screen.getByTestId('study-support-checklist')).toBeInTheDocument();
    expect(screen.queryByTestId('study-support-closure')).not.toBeInTheDocument();
  });
});
