import { describe, expect, it } from 'vitest';
import { examStrategyService } from '../services/examStrategy.service';

describe('examStrategyService', () => {
  it('detecta banca CEBRASPE por alias CESPE', () => {
    expect(examStrategyService.detectOrganizer('Como estudar para CESPE?')).toBe('cebraspe');
  });

  it('detecta area ENEM por termo de Ciencias da Natureza', () => {
    expect(examStrategyService.detectEnemArea('tenho dificuldade em Ciencias da Natureza')).toBe('Natureza');
  });

  it('gera mensagem de estrategia por banca', () => {
    const message = examStrategyService.buildMessageForMentor('Qual estrategia para prova da FGV?');
    expect(message).toContain('FGV - estrategia de prova');
    expect(message).toContain('•');
  });

  it('gera mensagem de estrategia ENEM por matriz', () => {
    const message = examStrategyService.buildMessageForMentor('Como usar a matriz do ENEM em matematica?');
    expect(message).toContain('ENEM - foco em Matematica');
    expect(message).toContain('•');
  });
});
