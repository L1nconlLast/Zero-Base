// ============================================================
// src/utils/validation.ts
// Schemas Zod para validar dados importados pelo usuário.
// Instale com: npm install zod
// ============================================================

import { z } from 'zod';
import { MATERIAS, WEEK_DAYS } from '../constants';
import { logger } from './logger';

// ── Schemas primitivos ───────────────────────────────────────

const MateriaTipoSchema = z.enum(MATERIAS);

const DayProgressSchema = z.object({
  studied: z.boolean(),
  minutes: z.number().min(0).max(1440), // máx 24h por dia
});

const WeekProgressSchema = z.record(
  z.enum(WEEK_DAYS),
  DayProgressSchema
);

const TopicStatusSchema = z.object({
  completed: z.boolean(),
  date: z.string().nullable(),
});

const StudySessionSchema = z.object({
  date: z.string().datetime({ message: 'Data da sessão inválida' }),
  minutes: z.number().min(0).max(1440),
  points: z.number().min(0),
  subject: MateriaTipoSchema,
  duration: z.number().min(0),
  methodId: z.string().optional(),
  goalMet: z.boolean().optional(),
  timestamp: z.string().optional(),
});

// ── Schema principal: UserData ────────────────────────────────

export const UserDataSchema = z.object({
  weekProgress: WeekProgressSchema,
  completedTopics: z.record(z.string(), TopicStatusSchema),
  totalPoints: z.number().min(0),
  streak: z.number().min(0),
  bestStreak: z.number().min(0),
  achievements: z.array(z.string()),
  level: z.number().min(1),
  studyHistory: z.array(StudySessionSchema),
  dailyGoal: z.number().min(1).max(1440),
  sessions: z.array(StudySessionSchema),
  currentStreak: z.number().min(0),
});

// ── Schema do arquivo de backup completo ─────────────────────

export const BackupSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  user: z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    dataCadastro: z.string(),
    foto: z.string(),
  }),
  data: UserDataSchema,
});

// ── Tipos inferidos ──────────────────────────────────────────

export type UserDataInput = z.infer<typeof UserDataSchema>;
export type BackupInput = z.infer<typeof BackupSchema>;

// ── Funções de validação prontas para usar ───────────────────

/**
 * Valida um JSON importado pelo usuário.
 * Retorna { success, data } ou { success: false, error } com mensagem legível.
 *
 * Uso:
 *   const result = validateImport(JSON.parse(fileContent));
 *   if (!result.success) toast.error(result.error);
 */
export function validateImport(raw: unknown):
  | { success: true; data: BackupInput }
  | { success: false; error: string } {
  const result = BackupSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Pega o primeiro erro em linguagem amigável
  const first = result.error.issues[0];
  const field = first.path.join(' → ') || 'arquivo';
  const message = `Campo "${field}": ${first.message}`;

  return { success: false, error: message };
}

/**
 * Valida somente o UserData (sem o envelope de backup).
 */
export function validateUserData(raw: unknown):
  | { success: true; data: UserDataInput }
  | { success: false; error: string } {
  const result = UserDataSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const first = result.error.issues[0];
  const field = first.path.join(' → ') || 'dados';
  return { success: false, error: `Campo "${field}": ${first.message}` };
}

/**
 * Faz parse seguro do JSON e depois valida o schema.
 * Nunca lança exceção — sempre retorna { success, data } ou { success: false, error }.
 */
export function safeParseAndValidate(rawText: string):
  | { success: true; data: BackupInput }
  | { success: false; error: string } {

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    logger.warn('JSON malformado na importação', 'Import', { err });
    return {
      success: false,
      error: 'Arquivo inválido: o JSON está corrompido ou mal formatado.',
    };
  }

  return validateImport(parsed);
}
