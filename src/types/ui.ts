/**
 * Tipos de UI - Zero Base v2.1
 * Tipos reutilizÃ¡veis para componentes de interface
 */

import { LucideIcon } from 'lucide-react';

/**
 * Abas da navegaÃ§Ã£o
 */
export type TabName = 'home' | 'timer' | 'methods' | 'dashboard' | 'settings';

export interface Tab {
  id: TabName;
  label: string;
  icon: LucideIcon;
}

/**
 * Estados de carregamento
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStatus {
  state: LoadingState;
  message?: string;
  error?: string;
}

/**
 * Resposta de notificaÃ§Ã£o
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal
 */
export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Resposta genÃ©rica da API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * PaginaÃ§Ã£o
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Filtros
 */
export interface FilterState {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Props de componente reutilizÃ¡vel
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Props com estado de carregamento
 */
export interface LoadableComponentProps extends BaseComponentProps {
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

/**
 * Cores de tema
 */
export type ThemeColor = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info';

export type ThemeSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Tamanhos de texto
 */
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

export type TextWeight = 'light' | 'normal' | 'semibold' | 'bold';

