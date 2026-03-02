/**
 * @deprecated Este serviço é LEGADO e não é importado por nenhum código ativo.
 * Toda a persistência agora usa:
 *   - useLocalStorage (dados locais)
 *   - Supabase services (session.service, userProfile.service, etc.)
 * 
 * Será removido em uma próxima versão.
 * Mantido apenas como referência histórica.
 * 
 * --- Descrição original ---
 *  Serviço de Storage Seguro
 * 
 * Camada de abstração para localStorage com criptografia
 * e validação de dados usando Zod schemas
 */

import SecureLS from 'secure-ls';
import { validateData, schemas } from '../schemas';
import type { User, Session, UserAchievement, ExportData } from '../schemas';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
//  CONFIGURAÇÃO SECURE-LS
// ═══════════════════════════════════════════════════════════════

/**
 * Instância do SecureLS com criptografia AES
 */
const secureStorage = new SecureLS({
  encodingType: 'aes', // Criptografia AES
  isCompression: true,  // Compressão para reduzir tamanho
  encryptionSecret: import.meta.env.VITE_STORAGE_SECRET || 'medicina-do-zero-2025-secret-key',
});

// ═══════════════════════════════════════════════════════════════
//  CHAVES DO LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  USER: 'mdz_user',
  SESSIONS: 'mdz_sessions',
  ACHIEVEMENTS: 'mdz_achievements',
  PREFERENCES: 'mdz_preferences',
  STATS: 'mdz_stats',
  VERSION: 'mdz_version',
} as const;

// ═══════════════════════════════════════════════════════════════
//  CLASSE DE STORAGE SEGURO
// ═══════════════════════════════════════════════════════════════

class SecureStorageService {
  
  // ─────────────────────────────────────────────────────────────
  //  MÉTODOS DE USUÁRIO
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Salva dados do usuário de forma segura
   */
  setUser(user: User): void {
    try {
      // Valida antes de salvar
      const validated = validateData(schemas.User, user);
      
      if (!validated.success) {
        logger.error('Erro ao validar usuário', 'Storage', validated.errors);
        throw new Error('Dados de usuário inválidos');
      }
      
      secureStorage.set(STORAGE_KEYS.USER, validated.data);
      logger.debug('Usuário salvo com segurança', 'Storage');
    } catch (error) {
      logger.error('Erro ao salvar usuário', 'Storage', error);
      throw error;
    }
  }
  
  /**
   * Recupera dados do usuário
   */
  getUser(): User | null {
    try {
      const data = secureStorage.get(STORAGE_KEYS.USER);
      
      if (!data) {
        return null;
      }
      
      // Valida dados recuperados
      const validated = validateData(schemas.User, data);
      
      if (!validated.success) {
        logger.error('Dados de usuário corrompidos', 'Storage', validated.errors);
        this.removeUser(); // Limpa dados corrompidos
        return null;
      }
      
      return validated.data;
    } catch (error) {
      logger.error('Erro ao recuperar usuário', 'Storage', error);
      return null;
    }
  }
  
  /**
   * Remove usuário do storage
   */
  removeUser(): void {
    secureStorage.remove(STORAGE_KEYS.USER);
  }
  
  /**
   * Atualiza dados parciais do usuário
   */
  updateUser(updates: Partial<User>): void {
    const currentUser = this.getUser();
    
    if (!currentUser) {
      throw new Error('Usuário não encontrado');
    }
    
    const updatedUser = { ...currentUser, ...updates };
    this.setUser(updatedUser);
  }
  
  // ─────────────────────────────────────────────────────────────
  //  MÉTODOS DE SESSÕES
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Salva array de sessões
   */
  setSessions(sessions: Session[]): void {
    try {
      // Valida cada sessão
      const validatedSessions = sessions.map(session => {
        const result = validateData(schemas.SessionWithDateValidation, session);
        if (!result.success) {
          logger.error('Sessão inválida', 'Storage', { session, errors: result.errors });
          throw new Error('Sessão inválida');
        }
        return result.data;
      });
      
      secureStorage.set(STORAGE_KEYS.SESSIONS, validatedSessions);
      logger.debug('Sessões salvas', 'Storage', { count: validatedSessions.length });
    } catch (error) {
      logger.error('Erro ao salvar sessões', 'Storage', error);
      throw error;
    }
  }
  
  /**
   * Recupera todas as sessões
   */
  getSessions(): Session[] {
    try {
      const data = secureStorage.get(STORAGE_KEYS.SESSIONS);
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Valida e filtra sessões válidas
      const validSessions: Session[] = [];
      
      for (const session of data) {
        const validated = validateData(schemas.SessionWithDateValidation, session);
        if (validated.success) {
          validSessions.push(validated.data);
        } else {
          console.warn(' Sessão inválida ignorada:', session);
        }
      }
      
      return validSessions;
    } catch (error) {
      console.error(' Erro ao recuperar sessões:', error);
      return [];
    }
  }
  
  /**
   * Adiciona uma nova sessão
   */
  addSession(session: Session): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.setSessions(sessions);
  }
  
  /**
   * Remove uma sessão por ID
   */
  removeSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    this.setSessions(filtered);
  }
  
  /**
   * Atualiza uma sessão existente
   */
  updateSession(sessionId: string, updates: Partial<Session>): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) {
      throw new Error('Sessão não encontrada');
    }
    
    sessions[index] = { ...sessions[index], ...updates };
    this.setSessions(sessions);
  }
  
  // ─────────────────────────────────────────────────────────────
  //  MÉTODOS DE CONQUISTAS
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Salva conquistas desbloqueadas
   */
  setAchievements(achievements: UserAchievement[]): void {
    try {
      const validated = achievements.map(ach => {
        const result = validateData(schemas.UserAchievement, ach);
        if (!result.success) {
          throw new Error('Conquista inválida');
        }
        return result.data;
      });
      
      secureStorage.set(STORAGE_KEYS.ACHIEVEMENTS, validated);
    } catch (error) {
      console.error(' Erro ao salvar conquistas:', error);
      throw error;
    }
  }
  
  /**
   * Recupera conquistas
   */
  getAchievements(): UserAchievement[] {
    try {
      const data = secureStorage.get(STORAGE_KEYS.ACHIEVEMENTS);
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      const valid: UserAchievement[] = [];
      
      for (const ach of data) {
        const validated = validateData(schemas.UserAchievement, ach);
        if (validated.success) {
          valid.push(validated.data);
        }
      }
      
      return valid;
    } catch (error) {
      console.error(' Erro ao recuperar conquistas:', error);
      return [];
    }
  }
  
  /**
   * Adiciona uma conquista desbloqueada
   */
  addAchievement(achievement: UserAchievement): void {
    const achievements = this.getAchievements();
    
    // Evita duplicatas
    if (achievements.some(a => a.achievementId === achievement.achievementId)) {
      console.warn(' Conquista já desbloqueada:', achievement.achievementId);
      return;
    }
    
    achievements.push(achievement);
    this.setAchievements(achievements);
  }
  
  // ─────────────────────────────────────────────────────────────
  //  MÉTODOS DE EXPORT/IMPORT
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Exporta todos os dados do usuário
   */
  exportAllData(): ExportData {
    const user = this.getUser();
    
    if (!user) {
      throw new Error('Nenhum usuário logado');
    }
    
    const exportData: ExportData = {
      version: '2.0.0',
      exportDate: new Date(),
      user,
      sessions: this.getSessions(),
      achievements: this.getAchievements(),
    };
    
    // Valida antes de exportar
    const validated = validateData(schemas.ExportData, exportData);
    
    if (!validated.success) {
      console.error(' Erro ao validar export:', validated.errors);
      throw new Error('Erro ao preparar dados para export');
    }
    
    return validated.data;
  }
  
  /**
   * Importa dados validados
   */
  importData(data: unknown): void {
    try {
      // Valida dados importados
      const validated = validateData(schemas.ImportData, data);
      
      if (!validated.success) {
        console.error(' Dados de import inválidos:', validated.errors);
        throw new Error('Dados importados são inválidos');
      }
      
      const importData = validated.data as ExportData;
      
      // Salva dados validados
      this.setUser(importData.user);
      this.setSessions(importData.sessions);
      this.setAchievements(importData.achievements);
      
      console.log(' Dados importados com sucesso');
    } catch (error) {
      console.error(' Erro ao importar dados:', error);
      throw error;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  //  MÉTODOS DE LIMPEZA
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Limpa todos os dados do storage
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      secureStorage.remove(key);
    });
    console.log(' Todos os dados foram removidos');
  }
  
  /**
   * Verifica se há dados salvos
   */
  hasData(): boolean {
    return this.getUser() !== null;
  }
  
  /**
   * Retorna tamanho estimado do storage (em KB)
   */
  getStorageSize(): number {
    let totalSize = 0;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        const data = secureStorage.get(key);
        if (data) {
          totalSize += JSON.stringify(data).length;
        }
      } catch (error) {
        // Ignora erros
      }
    });
    
    return Math.round(totalSize / 1024); // Retorna em KB
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════

/**
 * Instância única do serviço de storage
 */
export const secureStorageService = new SecureStorageService();

/**
 * Export default
 */
export default secureStorageService;

// ═══════════════════════════════════════════════════════════════
//  FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════

/**
 * Migra dados do localStorage padrão para secure storage
 */
export function migrateToSecureStorage(): void {
  console.log(' Iniciando migração para storage seguro...');
  
  try {
    // Tenta recuperar dados antigos
    const oldUser = localStorage.getItem('user');
    const oldSessions = localStorage.getItem('sessions');
    const oldAchievements = localStorage.getItem('achievements');
    
    if (oldUser) {
      const user = JSON.parse(oldUser);
      secureStorageService.setUser(user);
      localStorage.removeItem('user');
      console.log(' Usuário migrado');
    }
    
    if (oldSessions) {
      const sessions = JSON.parse(oldSessions);
      secureStorageService.setSessions(sessions);
      localStorage.removeItem('sessions');
      console.log(' Sessões migradas');
    }
    
    if (oldAchievements) {
      const achievements = JSON.parse(oldAchievements);
      secureStorageService.setAchievements(achievements);
      localStorage.removeItem('achievements');
      console.log(' Conquistas migradas');
    }
    
    console.log(' Migração concluída');
  } catch (error) {
    console.error(' Erro na migração:', error);
  }
}

/**
 * Verifica integridade dos dados
 */
export function verifyDataIntegrity(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  try {
    const user = secureStorageService.getUser();
    if (!user) {
      errors.push('Usuário não encontrado');
    }
    
    const sessions = secureStorageService.getSessions();
    const achievements = secureStorageService.getAchievements();
    
    console.log(` Verificação concluída: ${sessions.length} sessões, ${achievements.length} conquistas`);
    
  } catch (error) {
    errors.push(`Erro na verificação: ${error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
