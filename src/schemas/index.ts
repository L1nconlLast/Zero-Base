/**
 *  Schemas de Validação com Zod
 * 
 * Este arquivo define todos os schemas de validação para garantir
 * a integridade dos dados em runtime, especialmente durante Import/Export
 */

import { z } from 'zod';
import { STRONG_PASSWORD_REGEX } from '../utils/passwordPolicy';

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS BÁSICOS
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Usuário
 */
export const UserSchema = z.object({
  id: z.string().uuid('ID de usuário inválido'),
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email muito curto')
    .max(100, 'Email muito longo'),
  name: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .optional(),
  passwordHash: z.string().min(1, 'Hash de senha é obrigatório'),
  createdAt: z.coerce.date(),
  totalXP: z.number()
    .int('XP deve ser inteiro')
    .min(0, 'XP não pode ser negativo'),
  level: z.number()
    .int('Nível deve ser inteiro')
    .min(1, 'Nível mínimo é 1')
    .max(10, 'Nível máximo é 10'),
  preferences: z.object({
    theme: z.enum(['blue', 'green', 'purple', 'pink', 'orange', 'teal', 'red', 'indigo'])
      .default('blue'),
    isDarkMode: z.boolean().default(false),
    notifications: z.boolean().default(true),
    sounds: z.boolean().default(true),
  }).optional(),
});

export type User = z.infer<typeof UserSchema>;

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE SESSÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Sessão de Estudo
 */
export const SessionSchema = z.object({
  id: z.string().uuid('ID de sessão inválido'),
  userId: z.string().uuid('ID de usuário inválido'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  duration: z.number()
    .int('Duração deve ser inteiro')
    .min(1, 'Duração mínima é 1 minuto')
    .max(720, 'Duração máxima é 12 horas'), // 720 minutos = 12h
  xpEarned: z.number()
    .int('XP deve ser inteiro')
    .min(0, 'XP não pode ser negativo'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  notes: z.string().max(500, 'Notas muito longas').optional(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Validação adicional: endTime deve ser depois de startTime
 */
export const SessionSchemaWithDateValidation = SessionSchema.refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endTime'],
  }
);

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE CONQUISTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Conquista
 */
export const AchievementSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  category: z.enum(['time', 'consistency', 'level', 'special']).optional(),
});

export type Achievement = z.infer<typeof AchievementSchema>;

/**
 * Schema de Conquista Desbloqueada pelo Usuário
 */
export const UserAchievementSchema = z.object({
  achievementId: z.string().min(1, 'ID da conquista é obrigatório'),
  unlockedAt: z.coerce.date(),
  notified: z.boolean().default(false),
});

export type UserAchievement = z.infer<typeof UserAchievementSchema>;

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Estatísticas
 */
export const StatsSchema = z.object({
  totalSessions: z.number().int().min(0),
  totalMinutes: z.number().int().min(0),
  averageSessionMinutes: z.number().min(0),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  studyDays: z.number().int().min(0),
  weeklyGoal: z.number().int().min(0).optional(),
  monthlyGoal: z.number().int().min(0).optional(),
});

export type Stats = z.infer<typeof StatsSchema>;

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE IMPORT/EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Schema para Export Completo de Dados
 */
export const ExportDataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Versão inválida'),
  exportDate: z.coerce.date(),
  user: UserSchema,
  sessions: z.array(SessionSchemaWithDateValidation),
  achievements: z.array(UserAchievementSchema),
  stats: StatsSchema.optional(),
});

export type ExportData = z.infer<typeof ExportDataSchema>;

/**
 * Schema para Import de Dados (mais permissivo)
 */
export const ImportDataSchema = ExportDataSchema.partial({
  exportDate: true,
  stats: true,
}).extend({
  version: z.string().optional(), // Opcional para compatibilidade
});

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Credenciais de Login
 */
export const LoginCredentialsSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(5, 'Email muito curto')
    .max(100, 'Email muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      STRONG_PASSWORD_REGEX,
      'A senha deve conter ao menos 1 letra maiúscula, 1 número e 1 símbolo.',
    )
    .max(100, 'Senha muito longa'),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

/**
 * Schema de Registro
 */
export const RegisterDataSchema = LoginCredentialsSchema.extend({
  name: z.string()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .optional(),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  }
);

export type RegisterData = z.infer<typeof RegisterDataSchema>;

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════

/**
 * Schema de Preferências do Usuário
 */
export const UserPreferencesSchema = z.object({
  theme: z.enum(['blue', 'green', 'purple', 'pink', 'orange', 'teal', 'red', 'indigo']),
  isDarkMode: z.boolean(),
  notifications: z.boolean(),
  sounds: z.boolean(),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']).default('pt-BR'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  weeklyGoal: z.number().int().min(0).max(168).optional(), // 168h = 7 dias
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ═══════════════════════════════════════════════════════════════
//  FUNÇÕES DE VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Valida dados de forma segura e retorna resultado
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Valida e formata erros de forma legível
 */
export function getValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

/**
 * Valida dados de export antes de salvar
 */
export function validateExportData(data: unknown): ExportData {
  return ExportDataSchema.parse(data);
}

/**
 * Valida dados de import (mais permissivo)
 */
export function validateImportData(data: unknown): ExportData {
  const result = ImportDataSchema.parse(data);
  
  // Se não tem version, assume a atual
  if (!result.version) {
    result.version = '2.0.0';
  }
  
  // Se não tem exportDate, usa a data atual
  if (!result.exportDate) {
    result.exportDate = new Date();
  }
  
  return result as ExportData;
}

/**
 * Valida array de sessões
 */
export function validateSessions(sessions: unknown[]): Session[] {
  return z.array(SessionSchemaWithDateValidation).parse(sessions);
}

/**
 * Valida usuário
 */
export function validateUser(user: unknown): User {
  return UserSchema.parse(user);
}

// ═══════════════════════════════════════════════════════════════
//  SCHEMAS DE MIGRAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Schema para migração de dados antigos (v1.0)
 */
export const LegacyDataSchema = z.object({
  user: z.object({
    email: z.string().email(),
    // v1.0 pode não ter todos os campos
  }).passthrough(), // Permite campos extras
  sessions: z.array(z.any()).optional(),
  // Aceita estrutura antiga
}).passthrough();

/**
 * Migra dados antigos para o formato novo
 */
export function migrateFromV1(legacyData: unknown): ExportData {
  const legacy = LegacyDataSchema.parse(legacyData);
  
  // Converte para o formato novo
  const migratedData: ExportData = {
    version: '2.0.0',
    exportDate: new Date(),
    user: {
      id: crypto.randomUUID(),
      email: legacy.user.email || '',
      passwordHash: '',
      createdAt: new Date(),
      totalXP: 0,
      level: 1,
    },
    sessions: [],
    achievements: [],
  };
  
  return validateExportData(migratedData);
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export const schemas = {
  User: UserSchema,
  Session: SessionSchema,
  SessionWithDateValidation: SessionSchemaWithDateValidation,
  Achievement: AchievementSchema,
  UserAchievement: UserAchievementSchema,
  Stats: StatsSchema,
  ExportData: ExportDataSchema,
  ImportData: ImportDataSchema,
  LoginCredentials: LoginCredentialsSchema,
  RegisterData: RegisterDataSchema,
  UserPreferences: UserPreferencesSchema,
} as const;

export default schemas;
