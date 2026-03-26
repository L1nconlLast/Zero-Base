import { describe, expect, it } from 'vitest';
import { normalizeQuestionImportRow, parseQuestionImportPayload } from '../services/questionCatalogImport.service';

describe('questionCatalogImport.service', () => {
  it('parseia CSV e normaliza questao objetiva com metadados de ENEM', () => {
    const rows = parseQuestionImportPayload('csv', [
      'Enunciado,Disciplina,Topico,Objetivo,Tipo,Dificuldade,Option A,Option B,Option C,Correct Option,Ano',
      '"Qual grafico representa a maior media?",Matematica,"Estatistica descritiva",enem,multiple_choice,medio,"Grafico 1","Grafico 2","Grafico 3",B,2024',
    ].join('\n'));

    expect(rows).toHaveLength(1);

    const normalized = normalizeQuestionImportRow(rows[0]);
    expect(normalized).toMatchObject({
      statement: 'Qual grafico representa a maior media?',
      subjectName: 'Matematica',
      topicName: 'Estatistica descritiva',
      objective: 'enem',
      questionType: 'multiple_choice',
      difficulty: 'medio',
      year: 2024,
    });
    expect(normalized.options).toEqual([
      { letter: 'A', text: 'Grafico 1', correct: false },
      { letter: 'B', text: 'Grafico 2', correct: true },
      { letter: 'C', text: 'Grafico 3', correct: false },
    ]);
    expect(normalized.hashes.statementHash).toHaveLength(64);
    expect(normalized.hashes.combinedHash).toHaveLength(64);
  });

  it('gera alternativas default para questao certo/errado', () => {
    const normalized = normalizeQuestionImportRow({
      enunciado: 'A afirmacao esta incorreta.',
      tipo: 'certo_errado',
      objetivo: 'concurso',
      gabarito: 'Errado',
    });

    expect(normalized.questionType).toBe('true_false');
    expect(normalized.options).toEqual([
      { letter: 'A', text: 'Certo', correct: false },
      { letter: 'B', text: 'Errado', correct: true },
    ]);
  });
});
