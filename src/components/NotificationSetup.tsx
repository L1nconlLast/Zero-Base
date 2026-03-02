import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationSetup() {
  const { requestPermission, isSupported, permission } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostra o banner só se nunca foi decidido
    if (isSupported && permission === 'default') {
      // Pequeno delay para não aparecer imediatamente no login
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, [isSupported, permission]);

  if (!visible) return null;

  const handleAccept = async () => {
    await requestPermission();
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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-fade-in"
    >
      <span className="mt-0.5" aria-hidden="true"><Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" /></span>

      <div className="flex-1 min-w-0">
        <p id="notif-title" className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          Ativar lembretes de estudo?
        </p>
        <p id="notif-desc" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Receba alertas de Pomodoro, conquistas e metas diárias.
        </p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAccept}
            className="flex-1 py-1.5 px-3 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Ativar notificações
          </button>
          <button
            onClick={handleDismiss}
            className="py-1.5 px-3 text-gray-500 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Agora não
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Fechar"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
