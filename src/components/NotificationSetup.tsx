import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { pushApiService } from '../services/pushApi.service';

export function NotificationSetup() {
  const { requestPermission, isSupported, permission } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSupported && permission === 'default') {
      const timeoutId = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [isSupported, permission]);

  if (!visible) {
    return null;
  }

  const handleAccept = async () => {
    const granted = await requestPermission();
    if (granted) {
      await pushApiService.subscribeUser();
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="notif-title"
      aria-describedby="notif-desc"
      className="fixed bottom-4 left-1/2 z-50 flex w-[90vw] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl animate-fade-in dark:border-gray-700 dark:bg-gray-800"
    >
      <span className="mt-0.5" aria-hidden="true">
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-200" />
      </span>

      <div className="min-w-0 flex-1">
        <p id="notif-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Ativar lembretes para continuar amanha?
        </p>
        <p id="notif-desc" className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Sua proxima missao chega pronta e abre direto na continuidade.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Ativar notificacoes
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-700"
          >
            Agora nao
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar"
        className="text-gray-400 transition-colors hover:text-gray-600 focus:outline-none dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
