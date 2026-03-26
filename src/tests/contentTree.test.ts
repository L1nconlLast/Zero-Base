import { describe, expect, it } from 'vitest';
import {
  getSuggestedContentPathBySubjectLabel,
  getSuggestedNextTopicAligned,
  getSuggestedNextTopicByFrontLabel,
  getSuggestedNextTopicBySubjectLabel,
  getSuggestedTopicCopy,
} from '../utils/contentTree';

describe('contentTree helpers', () => {
  describe('getSuggestedNextTopicBySubjectLabel', () => {
    it('returns the first topic when there is no recent history', () => {
      const topic = getSuggestedNextTopicBySubjectLabel('Matematica');

      expect(topic?.label).toBe('Razão e proporção');
    });

    it('skips topics already seen recently for the same subject', () => {
      const topic = getSuggestedNextTopicBySubjectLabel('Matematica', [
        'Razão e proporção',
      ]);

      expect(topic?.label).toBe('Porcentagem');
    });
  });

  describe('getSuggestedContentPathBySubjectLabel', () => {
    it('uses the suggested next topic when no explicit topic exists', () => {
      const path = getSuggestedContentPathBySubjectLabel('Matematica', undefined, [
        'Razão e proporção',
      ]);

      expect(path.subjectLabel).toBe('Matemática');
      expect(path.frontLabel).toBe('Aritmética');
      expect(path.topicLabel).toBe('Porcentagem');
    });

    it('preserves the explicit topic when it exists', () => {
      const path = getSuggestedContentPathBySubjectLabel(
        'Matematica',
        'Regra de três',
        ['Razão e proporção'],
      );

      expect(path.topicLabel).toBe('Regra de três');
    });
  });

  describe('getSuggestedNextTopicByFrontLabel', () => {
    it('returns a topic within the requested front', () => {
      const suggestion = getSuggestedNextTopicByFrontLabel('Matematica', 'Aritmetica');

      expect(suggestion).toEqual({
        subjectLabel: 'Matemática',
        frontLabel: 'Aritmética',
        topicLabel: 'Razão e proporção',
      });
    });
  });

  describe('getSuggestedNextTopicAligned', () => {
    it('prioritizes front context when available', () => {
      const result = getSuggestedNextTopicAligned({
        todaySubjectLabels: ['Matemática'],
        preferredFrontLabelBySubject: {
          Matemática: 'Aritmética',
        },
      });

      expect(result?.subjectLabel).toBe('Matemática');
      expect(result?.frontLabel).toBe('Aritmética');
      expect(result?.source).toBe('front_context');
    });

    it('falls back to the subject suggestion when the front is invalid', () => {
      const result = getSuggestedNextTopicAligned({
        todaySubjectLabels: ['Matemática'],
        preferredFrontLabelBySubject: {
          Matemática: 'Frente inexistente',
        },
      });

      expect(result?.subjectLabel).toBe('Matemática');
      expect(result?.source).toBe('daily_plan');
    });

    it('falls back globally when today subjects do not resolve', () => {
      const result = getSuggestedNextTopicAligned({
        todaySubjectLabels: ['Disciplina inexistente'],
      });

      expect(result?.source).toBe('global_fallback');
    });

    it('respects today subject order', () => {
      const result = getSuggestedNextTopicAligned({
        todaySubjectLabels: ['História', 'Matemática'],
      });

      expect(result?.subjectLabel).toBe('História');
      expect(result?.source).toBe('daily_plan');
    });
  });

  describe('getSuggestedTopicCopy', () => {
    it('uses front context copy for today', () => {
      expect(
        getSuggestedTopicCopy({
          source: 'front_context',
          topicLabel: 'Porcentagem',
          frontLabel: 'Aritmética',
          variant: 'today',
        }),
      ).toBe('Sugestao inicial em Aritmética: Porcentagem');
    });

    it('uses global fallback copy for study', () => {
      expect(
        getSuggestedTopicCopy({
          source: 'global_fallback',
          topicLabel: 'Porcentagem',
          variant: 'study',
        }),
      ).toBe('Se quiser seguir por um topico: Porcentagem');
    });
  });
});
