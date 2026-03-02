/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import EmptyState from '../components/UI/EmptyState';

describe('EmptyState', () => {
  it('renderiza título, descrição e ícone', () => {
    render(
      <EmptyState
        icon={BookOpen}
        title="Nenhuma sessão"
        description="Comece a estudar para ver seu progresso aqui."
      />,
    );
    expect(screen.getByText('Nenhuma sessão')).toBeInTheDocument();
    expect(screen.getByText('Comece a estudar para ver seu progresso aqui.')).toBeInTheDocument();
  });

  it('renderiza botão primário e chama onAction', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={BookOpen}
        title="Vazio"
        description="Desc"
        actionLabel="Começar agora"
        onAction={onAction}
      />,
    );
    const btn = screen.getByText('Começar agora');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renderiza botão secundário e chama onSecondaryAction', () => {
    const onSecondary = vi.fn();
    render(
      <EmptyState
        icon={BookOpen}
        title="Vazio"
        description="Desc"
        secondaryLabel="Ver tutorial"
        onSecondaryAction={onSecondary}
      />,
    );
    const btn = screen.getByText('Ver tutorial');
    fireEvent.click(btn);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('não renderiza botões quando labels não fornecidos', () => {
    const { container } = render(
      <EmptyState
        icon={BookOpen}
        title="Vazio"
        description="Desc"
      />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  it('renderiza ambos botões simultaneamente', () => {
    render(
      <EmptyState
        icon={BookOpen}
        title="Vazio"
        description="Desc"
        actionLabel="Primário"
        onAction={vi.fn()}
        secondaryLabel="Secundário"
        onSecondaryAction={vi.fn()}
      />,
    );
    expect(screen.getByText('Primário')).toBeInTheDocument();
    expect(screen.getByText('Secundário')).toBeInTheDocument();
  });
});
