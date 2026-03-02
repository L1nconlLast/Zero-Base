// ============================================================
// src/components/ErrorBoundary.tsx
// Captura erros de render em qualquer componente filho.
// ============================================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  /** Componente customizado para exibir no lugar do erro (opcional) */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // usa logger para registrar
    logger.error(error.message, 'ErrorBoundary', {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-[200px] p-6 rounded-xl border border-red-200 bg-red-50 text-center"
        >
          <span className="text-4xl mb-3" aria-hidden="true"></span>
          <h2 className="text-lg font-semibold text-red-700 mb-1">
            Algo deu errado
          </h2>
          <p className="text-sm text-red-500 mb-4 max-w-sm">
            {this.state.message || 'Ocorreu um erro inesperado nesta seção.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
