import type { Question } from '../data/questionsBank';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const shuffleQuestionOptions = (question: Question): Question => {
  const optionsWithOrigin = question.options.map((option) => ({
    ...option,
    originalLetter: option.letter,
  }));

  const shuffledOptions = shuffleArray(optionsWithOrigin);

  const relabeledOptions = shuffledOptions.map((option, index) => ({
    letter: OPTION_LETTERS[index] ?? OPTION_LETTERS[OPTION_LETTERS.length - 1],
    text: option.text,
    originalLetter: option.originalLetter,
  }));

  const updatedCorrect = relabeledOptions.find(
    (option) => option.originalLetter === question.correctAnswer,
  )?.letter;

  if (!updatedCorrect) {
    return question;
  }

  return {
    ...question,
    options: relabeledOptions.map(({ letter, text }) => ({ letter, text })) as Question['options'],
    correctAnswer: updatedCorrect,
  };
};
