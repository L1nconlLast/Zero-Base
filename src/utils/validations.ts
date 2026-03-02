/**
 * Validações legadas de schema.
 *
 * Preferência atual: `src/utils/validation.ts` (Zod).
 * Este arquivo é mantido por compatibilidade com formatos antigos.
 */

import { MATERIAS } from '../constants';
import { SessaoEstudo, MateriaTipo } from '../types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Validar Sessão Individual
export const validateSession = (data: unknown): ValidationResult<SessaoEstudo> => {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Sessão deve ser um objeto' };
  }

  const { id, duracaoMinutos, materia, data: sessionData, pontos } = data as {
    id?: unknown;
    duracaoMinutos?: unknown;
    materia?: unknown;
    data?: unknown;
    pontos?: unknown;
  };

  // Validar ID
  if (!id || typeof id !== 'string') {
    return { success: false, error: 'ID inválido' };
  }

  // Validar duração
  if (typeof duracaoMinutos !== 'number' || duracaoMinutos <= 0) {
    return { success: false, error: 'Duração deve ser um número positivo' };
  }

  // Validar matéria
  if (typeof materia !== 'string' || !MATERIAS.includes(materia as MateriaTipo)) {
    return { success: false, error: `Matéria inválida: ${materia}` };
  }

  // Validar data
  if (!(sessionData instanceof Date || typeof sessionData === 'string')) {
    return { success: false, error: 'Data inválida' };
  }

  // Validar pontos
  if (typeof pontos !== 'number' || pontos < 0) {
    return { success: false, error: 'Pontos devem ser um número não-negativo' };
  }

  return {
    success: true,
    data: {
      id,
      duracaoMinutos,
      materia: materia as MateriaTipo,
      data: sessionData instanceof Date ? sessionData : new Date(sessionData),
      pontos,
    },
  };
};

// Validar Múltiplas Sessões
export const validateSessions = (data: unknown): ValidationResult<SessaoEstudo[]> => {
  if (!Array.isArray(data)) {
    return { success: false, error: 'Sessões devem ser um array' };
  }

  const validSessions: SessaoEstudo[] = [];
  const errors: string[] = [];

  data.forEach((session, index) => {
    const result = validateSession(session);
    if (result.success && result.data) {
      validSessions.push(result.data);
    } else {
      errors.push(`Sessão ${index + 1}: ${result.error}`);
    }
  });

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }

  return { success: true, data: validSessions };
};

// Validar Dados de Importação Completos
export interface ImportedData {
  sessions: SessaoEstudo[];
  userLevel: number;
  xp: number;
  exportedAt?: string;
}

export const validateImportData = (data: unknown): ValidationResult<ImportedData> => {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Dados inválidos' };
  }

  const { sessions, userLevel, xp } = data as {
    sessions?: unknown;
    userLevel?: unknown;
    xp?: unknown;
    exportedAt?: unknown;
  };

  // Validar sessões
  if (!Array.isArray(sessions)) {
    return { success: false, error: 'Sessões deve ser um array' };
  }

  const sessionsValidation = validateSessions(sessions);
  if (!sessionsValidation.success) {
    return { success: false, error: `Erro nas sessões: ${sessionsValidation.error}` };
  }

  // Validar nível
  if (typeof userLevel !== 'number' || userLevel < 1) {
    return { success: false, error: 'Level deve ser um nÃºmero maior que 0' };
  }

  // Validar XP
  if (typeof xp !== 'number' || xp < 0) {
    return { success: false, error: 'XP deve ser um número não-negativo' };
  }

  return {
    success: true,
    data: {
      sessions: sessionsValidation.data || [],
      userLevel,
      xp,
      exportedAt: typeof (data as { exportedAt?: unknown }).exportedAt === 'string'
        ? (data as { exportedAt?: string }).exportedAt
        : undefined,
    },
  };
};

// Validar Email
export const validateEmail = (email: string): ValidationResult<string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Email inválido' };
  }

  return { success: true, data: email };
};

// Validar Nome
export const validateName = (name: string): ValidationResult<string> => {
  if (!name || name.trim().length < 3) {
    return { success: false, error: 'Nome deve ter pelo menos 3 caracteres' };
  }

  return { success: true, data: name.trim() };
};

