# PWA Integracao

## Vite

Use a configuracao com suporte a PWA em `vite.config.ts`, incluindo:

- manifest
- icones
- cache offline

## Icones obrigatorios

Coloque em `public/`:

- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/apple-touch-icon.png`

## App

Adicionar `NotificationSetup` na arvore principal:

```tsx
import { NotificationSetup } from './components/NotificationSetup';
```

Render esperado:

```tsx
<NotificationSetup />
```

## Timer

No fim do Pomodoro, disparar notificacao com `useNotifications`.

## Conquistas

Ao desbloquear conquista, disparar notificacao com `notifyAchievement`.

## Meta diaria

Pode ser verificada por agendamento no hook ou por disparo manual com `notifyGoalNotMet`.

## Validacao local

1. Abrir `http://localhost:5173` no Chrome
2. Conferir `Application > Service Workers`
3. Conferir `Application > Manifest`
