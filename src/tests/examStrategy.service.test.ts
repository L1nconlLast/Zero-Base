import { describe, expect, it } from 'vitest';
import { examStrategyService } from '../services/examStrategy.service';

describe('examStrategyService', () => {
  it('detecta banca CEBRASPE por alias CESPE', () => {
    expect(examStrategyService.detectOrganizer('Como estudar para CESPE?')).toBe('cebraspe');
  });

  it('detecta banca VUNESP por nome direto', () => {
    expect(examStrategyService.detectOrganizer('Qual a melhor estrategia para VUNESP?')).toBe('vunesp');
  });

  it('detecta disciplina ENEM por topico especifico', () => {
    expect(examStrategyService.detectEnemSubject('Tenho dificuldade em genetica no ENEM')).toBe('Biologia');
  });

  it('detecta area ENEM por termo de Ciencias da Natureza', () => {
    expect(examStrategyService.detectEnemArea('tenho dificuldade em Ciencias da Natureza')).toBe('Natureza');
  });

  it('detecta disciplina de concurso por assunto juridico', () => {
    expect(examStrategyService.detectConcursoDiscipline('Como revisar ato administrativo?')).toBe('Direito Administrativo');
  });

  it('gera mensagem de estrategia por banca', () => {
    const message = examStrategyService.buildMessageForMentor('Qual estrategia para prova da FGV?');
    expect(message).toContain('FGV');
    expect(message).toContain('estrategia de prova');
    expect(message).toContain('Formato:');
    expect(message).toContain('•');
  });

  it('gera mensagem de estrategia ENEM por matriz', () => {
    const message = examStrategyService.buildMessageForMentor('Como usar a matriz do ENEM em matematica?');
    expect(message).toContain('ENEM');
    expect(message).toContain('Matematica');
    expect(message).toContain('•');
  });

  it('gera mensagem de estrategia para disciplina especifica do ENEM', () => {
    const message = examStrategyService.buildMessageForMentor('Como estudar genetica para o ENEM?');
    expect(message).toContain('Biologia');
    expect(message).toContain('Temas mais cobrados');
  });

  it('gera mensagem de estrategia para disciplina de concurso sem banca', () => {
    const message = examStrategyService.buildMessageForMentor('Como estudar direito constitucional para concurso?');
    expect(message).toContain('Concurso');
    expect(message).toContain('Direito Constitucional');
    expect(message).toContain('•');
  });

  it('prioriza banca antes de disciplina de concurso', () => {
    const message = examStrategyService.buildMessageForMentor('Como estudar portugues para FCC?');
    expect(message).toContain('FCC');
    expect(message).toContain('Formato:');
  });

  it('gera resumo geral por area ENEM', () => {
    const summary = examStrategyService.getEnemAreaSummary('Humanas');
    expect(summary.title).toContain('Humanas');
    expect(summary.bullets.length).toBeGreaterThan(1);
  });
});
