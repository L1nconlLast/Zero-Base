/**
 * ValidaÃ§Ãµes de Schema - Zero Base v2.1
 * ValidaÃ§Ã£o segura de dados importados/exportados
 */

import { SessaoEstudo, MateriaTipo } from '../types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

//  Validar SessÃ£o Individual
export const validateSession = (data: unknown): ValidationResult<SessaoEstudo> => {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'SessÃ£o deve ser um objeto' };
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
    return { success: false, error: 'ID invÃ¡lido' };
  }

  // Validar duraÃ§Ã£o
  if (typeof duracaoMinutos !== 'number' || duracaoMinutos <= 0) {
    return { success: false, error: 'DuraÃ§Ã£o deve ser um nÃºmero positivo' };
  }

  // Validar matÃ©ria
  const validSubjects = ['Anatomia', 'Fisiologia', 'Farmacologia', 'Patologia', 'BioquÃ­mica', 'Histologia', 'Outra'];
  if (typeof materia !== 'string' || !validSubjects.includes(materia)) {
    return { success: false, error: `MatÃ©ria invÃ¡lida: ${materia}` };
  }

  // Validar data
  if (!(sessionData instanceof Date || typeof sessionData === 'string')) {
    return { success: false, error: 'Data invÃ¡lida' };
  }

  // Validar pontos
  if (typeof pontos !== 'number' || pontos < 0) {
    return { success: false, error: 'Pontos devem ser um nÃºmero nÃ£o-negativo' };
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

//  Validar MÃºltiplas SessÃµes
export const validateSessions = (data: unknown): ValidationResult<SessaoEstudo[]> => {
  if (!Array.isArray(data)) {
    return { success: false, error: 'SessÃµes devem ser um array' };
  }

  const validSessions: SessaoEstudo[] = [];
  const errors: string[] = [];

  data.forEach((session, index) => {
    const result = validateSession(session);
    if (result.success && result.data) {
      validSessions.push(result.data);
    } else {
      errors.push(`SessÃ£o ${index + 1}: ${result.error}`);
    }
  });

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }

  return { success: true, data: validSessions };
};

//  Validar Dados de ImportaÃ§Ã£o Completos
export interface ImportedData {
  sessions: SessaoEstudo[];
  userLevel: number;
  xp: number;
  exportedAt?: string;
}

export const validateImportData = (data: unknown): ValidationResult<ImportedData> => {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Dados invÃ¡lidos' };
  }

  const { sessions, userLevel, xp } = data as {
    sessions?: unknown;
    userLevel?: unknown;
    xp?: unknown;
    exportedAt?: unknown;
  };

  // Validar sessÃµes
  if (!Array.isArray(sessions)) {
    return { success: false, error: 'SessÃµes deve ser um array' };
  }

  const sessionsValidation = validateSessions(sessions);
  if (!sessionsValidation.success) {
    return { success: false, error: `Erro nas sessÃµes: ${sessionsValidation.error}` };
  }

  // Validar nÃ­vel
  if (typeof userLevel !== 'number' || userLevel < 1) {
    return { success: false, error: 'Level deve ser um nÃºmero maior que 0' };
  }

  // Validar XP
  if (typeof xp !== 'number' || xp < 0) {
    return { success: false, error: 'XP deve ser um nÃºmero nÃ£o-negativo' };
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

//  Validar Email
export const validateEmail = (email: string): ValidationResult<string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Email invÃ¡lido' };
  }

  return { success: true, data: email };
};

//  Validar Nome
export const validateName = (name: string): ValidationResult<string> => {
  if (!name || name.trim().length < 3) {
    return { success: false, error: 'Nome deve ter pelo menos 3 caracteres' };
  }

  return { success: true, data: name.trim() };
};

