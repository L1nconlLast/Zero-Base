// ============================================================
// src/components/UI/ConfirmModal.tsx
// Modal de confirmação reutilizável — substitui window.confirm/alert
// ============================================================

import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  impact?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'info' | 'warning' | 'danger' | 'success';
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Se true, mostra só o botão de confirmação (estilo alert) */
  alertOnly?: boolean;
}

const VARIANT_STYLES = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
  },
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    confirmBg: 'bg-red-600 hover:bg-red-700',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    confirmBg: 'bg-green-600 hover:bg-green-700',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  impact,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  confirmLoading = false,
  onConfirm,
  onCancel,
  alertOnly = false,
}) => {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant];
  const IconComponent = styles.icon;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={confirmLoading ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={confirmLoading}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-gray-200"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20' :
            variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
            variant === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
            'bg-blue-50 dark:bg-blue-900/20'
          }`}>
            <IconComponent className={`w-6 h-6 ${styles.iconColor}`} />
          </div>

          <h3 id="modal-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
          {impact ? (
            <p className="mb-6 w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {impact}
            </p>
          ) : null}

          <div className="flex gap-3 w-full">
            {!alertOnly && (
              <button
                onClick={onCancel}
                disabled={confirmLoading}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-600 transition"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={confirmLoading}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${styles.confirmBg}`}
            >
              {confirmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLoading ? 'Processando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
