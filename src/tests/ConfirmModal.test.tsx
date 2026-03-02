/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../components/UI/ConfirmModal';

describe('ConfirmModal', () => {
  // ── Renderização ─────────────────────────────────────────
  it('não renderiza quando open=false', () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        title="Titulo"
        message="Mensagem"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza título e mensagem quando open=true', () => {
    render(
      <ConfirmModal
        open={true}
        title="Confirmar ação"
        message="Você tem certeza?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Confirmar ação')).toBeInTheDocument();
    expect(screen.getByText('Você tem certeza?')).toBeInTheDocument();
  });

  // ── Botões ─────────────────────────────────────────────────
  it('mostra botões Confirmar e Cancelar por padrão', () => {
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('usa labels customizados', () => {
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        confirmLabel="Sim, apagar"
        cancelLabel="Não"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Sim, apagar')).toBeInTheDocument();
    expect(screen.getByText('Não')).toBeInTheDocument();
  });

  it('esconde botão cancelar quando alertOnly=true', () => {
    render(
      <ConfirmModal
        open={true}
        title="Info"
        message="Tudo certo"
        alertOnly={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });

  // ── Callbacks ───────────────────────────────────────────────
  it('chama onConfirm ao clicar Confirmar', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('chama onCancel ao clicar Cancelar', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('chama onCancel ao clicar no botão X', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('chama onCancel ao clicar no backdrop', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ── Variantes ──────────────────────────────────────────────
  it('aplica role="dialog" e aria-modal', () => {
    render(
      <ConfirmModal
        open={true}
        title="T"
        message="M"
        variant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
