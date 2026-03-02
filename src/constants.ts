// ============================================================
// src/constants.ts
// Todas as constantes do projeto centralizadas aqui.
// ============================================================

import type { UserData } from './types';

// ── Armazenamento ────────────────────────────────────────────
export const STORAGE_KEYS = {
  USER: 'medicinaUser',
  DATA_PREFIX: 'medicinaData_', // uso: `${STORAGE_KEYS.DATA_PREFIX}${email}`
  THEME: 'medicinaTheme',
  SESSION: 'medicinaSession',
} as const;

// ── Autenticação ─────────────────────────────────────────────
export const AUTH = {
  SALT_ROUNDS: 10,
  MAX_ATTEMPTS: 3,
  LOCKOUT_TIME_MS: 30 * 1000,        // 30 segundos
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 horas
} as const;

// ── Metas e Gamificação ──────────────────────────────────────
export const STUDY = {
  DEFAULT_DAILY_GOAL_MINUTES: 90,
  POINTS_PER_MINUTE: 10,
  DEFAULT_POMODORO_MINUTES: 25,
  DEFAULT_BREAK_MINUTES: 5,
} as const;

// ── XP / Níveis ──────────────────────────────────────────────
export const XP = {
  LEVEL_BASE: 100,          // XP necessário para o nível 1
  LEVEL_MULTIPLIER: 1.5,    // cada nível exige 1.5× mais XP que o anterior
  MAX_LEVEL: 50,
} as const;

// ── Dias da semana (chaves do weekProgress) ──────────────────
export const WEEK_DAYS = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
] as const;
export type WeekDay = typeof WEEK_DAYS[number];

// ── Estado inicial do UserData ───────────────────────────────
export const INITIAL_WEEK_PROGRESS = Object.fromEntries(
  WEEK_DAYS.map((day) => [day, { studied: false, minutes: 0 }])
) as Record<WeekDay, { studied: boolean; minutes: number }>;

export const INITIAL_USER_DATA: UserData = {
  weekProgress: INITIAL_WEEK_PROGRESS,
  completedTopics: {},
  totalPoints: 0,
  streak: 0,
  bestStreak: 0,
  achievements: [],
  level: 1,
  studyHistory: [],
  dailyGoal: STUDY.DEFAULT_DAILY_GOAL_MINUTES,
  sessions: [],
  currentStreak: 0,
};

// ── Matérias ─────────────────────────────────────────────────
export const MATERIAS = [
  'Anatomia',
  'Fisiologia',
  'Farmacologia',
  'Patologia',
  'Bioquímica',
  'Histologia',
  'Outra',
] as const;
