/**
 * Constantes da AplicaÃ§Ã£o - Zero Base v2.1
 */

export const APP_CONFIG = {
  // Timing (Pomodoro)
  TIMING: {
    POMODORO_FOCUS: 25 * 60,           // 25 minutos em segundos
    POMODORO_SHORT_BREAK: 5 * 60,      // 5 minutos
    POMODORO_LONG_BREAK: 15 * 60,      // 15 minutos
    POMODORO_CYCLES_FOR_LONG: 4,       // Ciclos atÃ© pausa longa
  },

  // Sistema de XP e NÃ­veis
  XP: {
    PER_MINUTE: 10,                    // 10 XP por minuto de estudo
    PER_LEVEL: 1000,                   // 1000 XP por nÃ­vel
  },

  // Metas e Limites
  GOALS: {
    DAILY_GOAL_MINUTES: 180,           // 3 horas por dia
    MIN_SESSION_MINUTES: 1,            // MÃ­nimo para registrar sessÃ£o
  },

  // Chaves de Storage
  STORAGE_KEYS: {
    SESSIONS: 'medicina-sessions',
    LEVEL: 'medicina-level',
    XP: 'medicina-xp',
    THEME: 'medicina-theme',
    DARK_MODE: 'medicina-dark-mode',
  },

  // MatÃ©rias
  SUBJECTS: {
    ANATOMIA: 'Anatomia',
    FISIOLOGIA: 'Fisiologia',
    FARMACOLOGIA: 'Farmacologia',
    PATOLOGIA: 'Patologia',
    BIOQUIMICA: 'BioquÃ­mica',
    HISTOLOGIA: 'Histologia',
    OUTRA: 'Outra',
  } as const,

  // App Info
  APP: {
    NAME: 'Zero Base',
    VERSION: '2.1.0',
  },
} as const;

// Type-safe access
export type Subject = typeof APP_CONFIG.SUBJECTS[keyof typeof APP_CONFIG.SUBJECTS];

