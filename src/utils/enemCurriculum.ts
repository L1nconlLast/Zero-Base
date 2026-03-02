interface SuggestMockExamTopicsInput {
  errorsByTopic: Record<string, number>;
  enemFrequencyByTopic: Record<string, number>;
  daysLeftToExam: number;
  maxTopics: number;
}

export const suggestMockExamTopics = ({
  errorsByTopic,
  enemFrequencyByTopic,
  daysLeftToExam,
  maxTopics,
}: SuggestMockExamTopicsInput): string[] => {
  const urgencyFactor = daysLeftToExam <= 30 ? 1.35 : daysLeftToExam <= 90 ? 1.2 : 1;
  const allTopicKeys = new Set<string>([
    ...Object.keys(errorsByTopic),
    ...Object.keys(enemFrequencyByTopic),
  ]);

  return [...allTopicKeys]
    .map((topicKey) => {
      const errors = errorsByTopic[topicKey] || 0;
      const frequency = enemFrequencyByTopic[topicKey] || 0;
      const score = errors * 4 * urgencyFactor + frequency;
      return { topicKey, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTopics)
    .map((item) => item.topicKey);
};
