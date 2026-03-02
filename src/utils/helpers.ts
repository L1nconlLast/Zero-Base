import bcrypt from 'bcryptjs';
import DOMPurify from 'dompurify';
import { logger } from './logger';
import type { WeekProgress, DayProgress } from '../types';

// Constantes
const SALT_ROUNDS = 10;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

// Criptografia de senha
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Sanitização de inputs
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

// Validações
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Senha deve ter no mínimo 6 caracteres' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Senha deve conter letras e números' };
  }
  return { valid: true, message: '' };
};

export const validateName = (name: string): boolean => {
  return name.length >= 3;
};

// Formatação de tempo
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Formatação de data
export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR');
};

// Cálculo de nível
export const calculateLevel = (points: number): number => {
  return Math.floor(points / 1000) + 1;
};

// Geração de token de sessão
export const generateSessionToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Verificação de sessão válida
export const isSessionValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < SESSION_TIMEOUT;
};

// Rate limiting simples
const loginAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30 * 1000; // 30 segundos

export const checkRateLimit = (email: string): { allowed: boolean; message: string } => {
  const now = Date.now();
  const attempt = loginAttempts.get(email);

  if (!attempt) {
    loginAttempts.set(email, { count: 1, timestamp: now });
    return { allowed: true, message: '' };
  }

  // loga tentativa extra
  logger.debug('Tentativa de login', 'Auth', { email, count: attempt.count + 1 });

  // Reset se passou o tempo de bloqueio
  if (now - attempt.timestamp > LOCKOUT_TIME) {
    loginAttempts.set(email, { count: 1, timestamp: now });
    return { allowed: true, message: '' };
  }

  // Verificar se excedeu tentativas
  if (attempt.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempt.timestamp)) / 1000);
    logger.warn('Conta bloqueada por excesso de tentativas', 'Auth', { email });
    return { 
      allowed: false, 
      message: `Muitas tentativas. Tente novamente em ${remainingTime}s` 
    };
  }

  // Incrementar tentativas
  loginAttempts.set(email, { count: attempt.count + 1, timestamp: attempt.timestamp });
  return { allowed: true, message: '' };
};

export const resetRateLimit = (email: string): void => {
  loginAttempts.delete(email);
};

// Calcular progresso da meta diária
export const calculateDailyProgress = (studiedMinutes: number, goal: number): number => {
  return Math.min(Math.round((studiedMinutes / goal) * 100), 100);
};

// Obter dia da semana em português
export const getDayOfWeek = (): string => {
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return days[new Date().getDay()];
};

// Calcular total de minutos estudados
export const getTotalStudiedMinutes = (weekProgress: WeekProgress): number => {
  return Object.values(weekProgress).reduce((total: number, day: DayProgress) => {
    return total + (day.minutes || 0);
  }, 0);
};

// Calcular dias estudados na semana
export const getStudiedDaysCount = (weekProgress: WeekProgress): number => {
  return Object.values(weekProgress).filter((day: DayProgress) => day.studied).length;
};
