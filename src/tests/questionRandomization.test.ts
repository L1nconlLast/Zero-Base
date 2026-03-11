import { describe, it, expect } from 'vitest';
import { QUESTIONS_BANK } from '../data/questionsBank';
import { shuffleArray, shuffleQuestionOptions } from '../utils/questionRandomization';

describe('questionRandomization', () => {
  it('shuffleArray preserva tamanho e elementos', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray(input);

    expect(output).toHaveLength(input.length);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffleQuestionOptions preserva as 5 letras unicas e o gabarito correto', () => {
    const baseQuestion = QUESTIONS_BANK[0];
    const originalCorrectText = baseQuestion.options.find(
      (option) => option.letter === baseQuestion.correctAnswer,
    )?.text;

    expect(originalCorrectText).toBeTruthy();

    const shuffled = shuffleQuestionOptions(baseQuestion);
    const letters = shuffled.options.map((option) => option.letter);
    const shuffledCorrectText = shuffled.options.find(
      (option) => option.letter === shuffled.correctAnswer,
    )?.text;

    expect(shuffled.options).toHaveLength(baseQuestion.options.length);
    expect(new Set(letters).size).toBe(letters.length);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(shuffledCorrectText).toBe(originalCorrectText);
  });

  it('nao fica preso em B/C ao embaralhar varias vezes', () => {
    const baseQuestion = QUESTIONS_BANK[0];
    const observedCorrectLetters = new Set<string>();

    for (let i = 0; i < 400; i += 1) {
      const shuffled = shuffleQuestionOptions(baseQuestion);
      observedCorrectLetters.add(shuffled.correctAnswer);
    }

    // Garante que a distribuição usa mais de duas letras com folga.
    expect(observedCorrectLetters.size).toBeGreaterThanOrEqual(4);
  });
});
