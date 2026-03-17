import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/theme.css';

type UiTheme = 'Claro' | 'Escuro' | 'Sistema';

const getSystemThemeAttr = (): 'light' | 'dark' => (
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

const resolveDataTheme = (pref: UiTheme): 'light' | 'dark' => {
  if (pref === 'Escuro') return 'dark';
  if (pref === 'Claro') return 'light';
  return getSystemThemeAttr();
};

const applyTheme = (pref: UiTheme): void => {
  document.documentElement.setAttribute('data-theme', resolveDataTheme(pref));
};

const getStoredPrefTheme = (): UiTheme => {
  const raw = localStorage.getItem('settings-pref-theme');
  if (raw === 'Claro' || raw === 'Escuro' || raw === 'Sistema') return raw;
  return 'Sistema';
};

// 1) aplica no startup (evita flash branco)
const initialPref = getStoredPrefTheme();
applyTheme(initialPref);

// 2) reage a mudanças do sistema quando pref = Sistema
const media = window.matchMedia('(prefers-color-scheme: dark)');
const onSystemThemeChange = (): void => {
  const pref = getStoredPrefTheme();
  if (pref === 'Sistema') applyTheme(pref);
};

if (typeof media.addEventListener === 'function') {
  media.addEventListener('change', onSystemThemeChange);
} else {
  media.addListener(onSystemThemeChange);
}

// 3) reage quando preferência muda em outra aba/janela
window.addEventListener('storage', (event) => {
  if (event.key === 'settings-pref-theme') {
    applyTheme(getStoredPrefTheme());
  }
});

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Force check for new version on each app load.
      void registration.update();

      const activateUpdate = () => {
        if (!registration.waiting) return;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      if (registration.waiting) {
        activateUpdate();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            activateUpdate();
          }
        });
      });

      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
