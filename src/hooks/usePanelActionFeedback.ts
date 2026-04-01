import React from 'react';
import toast from 'react-hot-toast';

export type PanelActionPhase = 'idle' | 'loading' | 'success' | 'error';

export interface PanelActionFeedbackState {
  phase: PanelActionPhase;
  title: string;
  detail?: string;
  retryLabel?: string;
}

interface UsePanelActionFeedbackOptions {
  userId?: string | null;
  onRefresh: () => Promise<void>;
  loginErrorMessage: string;
}

interface RunPanelActionOptions {
  actionKey: string;
  loadingTitle: string;
  loadingDetail?: string;
  successTitle: string;
  successDetail?: string;
  errorTitle?: string;
  retryLabel?: string;
  task: () => Promise<void>;
}

interface LegacyRunPanelActionOverrides {
  loadingTitle?: string;
  loadingDetail?: string;
  successDetail?: string;
  errorTitle?: string;
  retryLabel?: string;
}

const idleFeedbackState: PanelActionFeedbackState = {
  phase: 'idle',
  title: '',
};

export const usePanelActionFeedback = ({
  userId,
  onRefresh,
  loginErrorMessage,
}: UsePanelActionFeedbackOptions) => {
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<PanelActionFeedbackState>(idleFeedbackState);
  const retryRef = React.useRef<(() => Promise<boolean>) | null>(null);

  const runAction = React.useCallback(
    async (
      input: RunPanelActionOptions | string,
      legacyTask?: () => Promise<void>,
      legacySuccessTitle?: string,
      legacyOverrides?: LegacyRunPanelActionOverrides,
    ): Promise<boolean> => {
      const normalized: RunPanelActionOptions =
        typeof input === 'string'
          ? {
              actionKey: input,
              task: legacyTask || (async () => {}),
              successTitle: legacySuccessTitle || 'Acao concluida com sucesso.',
              loadingTitle: legacyOverrides?.loadingTitle || 'Processando sua acao...',
              loadingDetail: legacyOverrides?.loadingDetail,
              successDetail: legacyOverrides?.successDetail,
              errorTitle: legacyOverrides?.errorTitle,
              retryLabel: legacyOverrides?.retryLabel,
            }
          : input;

      const {
        actionKey,
        loadingTitle,
        loadingDetail,
        successTitle,
        successDetail,
        errorTitle,
        retryLabel = 'Tentar novamente',
        task,
      } = normalized;

      if (!userId) {
        setFeedback({
          phase: 'error',
          title: 'Login necessario para continuar',
          detail: loginErrorMessage,
        });
        toast.error(loginErrorMessage);
        retryRef.current = null;
        return false;
      }

      const rerun = () =>
        runAction(normalized);

      retryRef.current = rerun;
      setBusyAction(actionKey);
      setFeedback({
        phase: 'loading',
        title: loadingTitle,
        detail: loadingDetail,
      });

      try {
        await task();
        await onRefresh();
        setFeedback({
          phase: 'success',
          title: successTitle,
          detail: successDetail || 'Interface atualizada com os dados mais recentes.',
        });
        toast.success(successTitle);
        return true;
      } catch (error) {
        const title = errorTitle || 'Nao foi possivel concluir essa acao.';
        const detail = error instanceof Error ? error.message : title;
        setFeedback({
          phase: 'error',
          title,
          detail,
          retryLabel,
        });
        toast.error(detail);
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [loginErrorMessage, onRefresh, userId],
  );

  const retryLastAction = React.useCallback(async () => {
    if (!retryRef.current) {
      return false;
    }

    return retryRef.current();
  }, []);

  const clearFeedback = React.useCallback(() => {
    setFeedback(idleFeedbackState);
  }, []);

  return {
    busyAction,
    feedback,
    runAction,
    retryLastAction,
    clearFeedback,
  };
};
