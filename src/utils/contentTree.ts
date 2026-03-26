import { contentTreeV1 } from '../data/contentTreeV1';
import type { FrontNode, SubjectNode, TopicNode } from '../types/content';

const normalizeLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const getSubjectById = (subjectId: string): SubjectNode | undefined =>
  contentTreeV1.find((subject) => subject.id === subjectId);

export const getSubjectByLabel = (label: string): SubjectNode | undefined =>
  contentTreeV1.find((subject) => normalizeLabel(subject.label) === normalizeLabel(label));

export const getFrontById = (
  subjectId: string,
  frontId: string,
): FrontNode | undefined =>
  getSubjectById(subjectId)?.fronts.find((front) => front.id === frontId);

export const getSuggestedFrontBySubjectLabel = (label: string): FrontNode | undefined =>
  getSubjectByLabel(label)?.fronts[0];

export const getTopicById = (
  subjectId: string,
  frontId: string,
  topicId: string,
): TopicNode | undefined =>
  getFrontById(subjectId, frontId)?.topics.find((topic) => topic.id === topicId);

export const listTopicsBySubject = (subjectId: string): TopicNode[] =>
  getSubjectById(subjectId)?.fronts.flatMap((front) => front.topics) ?? [];

export type SuggestionSource =
  | 'front_context'
  | 'daily_plan'
  | 'global_fallback';

export interface SuggestedTopic {
  subjectLabel: string;
  frontLabel?: string;
  topicLabel: string;
  source: SuggestionSource;
}

const getRecentLabelsForSubject = (
  subjectLabel: string,
  recentTopicLabelsBySubject?: Record<string, string[]>,
  recentTopicLabels: string[] = [],
): string[] => recentTopicLabelsBySubject?.[subjectLabel] ?? recentTopicLabels;

const findFrontByTopicLabel = (
  subject: SubjectNode,
  topicLabel?: string | null,
): FrontNode | undefined => {
  if (!topicLabel) {
    return undefined;
  }

  return subject.fronts.find((front) =>
    front.topics.some((topic) => normalizeLabel(topic.label) === normalizeLabel(topicLabel)),
  );
};

const getSuggestedTopicForSubject = (
  subjectLabel: string,
  recentTopicLabels: string[] = [],
): Omit<SuggestedTopic, 'source'> | null => {
  const subject = getSubjectByLabel(subjectLabel.trim());

  if (!subject) {
    return null;
  }

  const recentTopics = new Set(
    recentTopicLabels
      .map((label) => label.trim())
      .filter(Boolean)
      .map(normalizeLabel),
  );

  const orderedFronts = subject.fronts;

  for (const front of orderedFronts) {
    const firstFreshTopic = front.topics.find((topic) => !recentTopics.has(normalizeLabel(topic.label)));
    if (firstFreshTopic) {
      return {
        subjectLabel: subject.label,
        frontLabel: front.label,
        topicLabel: firstFreshTopic.label,
      };
    }
  }

  const fallbackFront = orderedFronts[0];
  const fallbackTopic = fallbackFront?.topics[0];

  if (!fallbackFront || !fallbackTopic) {
    return null;
  }

  return {
    subjectLabel: subject.label,
    frontLabel: fallbackFront.label,
    topicLabel: fallbackTopic.label,
  };
};

export const getSuggestedNextTopicBySubjectLabel = (
  subjectLabel: string,
  recentTopicLabels: string[] = [],
): TopicNode | undefined => {
  const suggestion = getSuggestedTopicForSubject(subjectLabel, recentTopicLabels);

  if (!suggestion) {
    return undefined;
  }

  const subject = getSubjectByLabel(subjectLabel.trim());
  const suggestionFrontLabel = suggestion.frontLabel;
  const front = suggestionFrontLabel
    ? subject?.fronts.find((item) => normalizeLabel(item.label) === normalizeLabel(suggestionFrontLabel))
    : undefined;

  return front?.topics.find((topic) => normalizeLabel(topic.label) === normalizeLabel(suggestion.topicLabel));
};

export const getSuggestedNextTopicByFrontLabel = (
  subjectLabel: string,
  frontLabel: string,
  recentTopicLabels: string[] = [],
): Omit<SuggestedTopic, 'source'> | null => {
  const subject = getSubjectByLabel(subjectLabel.trim());

  if (!subject) {
    return null;
  }

  const front = subject.fronts.find((item) => normalizeLabel(item.label) === normalizeLabel(frontLabel));

  if (!front || front.topics.length === 0) {
    return null;
  }

  const recentTopics = new Set(
    recentTopicLabels
      .map((label) => label.trim())
      .filter(Boolean)
      .map(normalizeLabel),
  );

  const selectedTopic = front.topics.find((topic) => !recentTopics.has(normalizeLabel(topic.label))) ?? front.topics[0];

  if (!selectedTopic) {
    return null;
  }

  return {
    subjectLabel: subject.label,
    frontLabel: front.label,
    topicLabel: selectedTopic.label,
  };
};

export const getSuggestedNextTopicAligned = ({
  todaySubjectLabels,
  preferredFrontLabelBySubject = {},
  recentTopicLabels = [],
  recentTopicLabelsBySubject,
}: {
  todaySubjectLabels: string[];
  preferredFrontLabelBySubject?: Record<string, string | undefined>;
  recentTopicLabels?: string[];
  recentTopicLabelsBySubject?: Record<string, string[]>;
}): SuggestedTopic | null => {
  const normalizedTodaySubjects = todaySubjectLabels.map((label) => label?.trim()).filter(Boolean);

  for (const subjectLabel of normalizedTodaySubjects) {
    const recentLabels = getRecentLabelsForSubject(subjectLabel, recentTopicLabelsBySubject, recentTopicLabels);
    const preferredFrontLabel = preferredFrontLabelBySubject[subjectLabel];

    if (preferredFrontLabel) {
      const frontSuggestion = getSuggestedNextTopicByFrontLabel(subjectLabel, preferredFrontLabel, recentLabels);

      if (frontSuggestion) {
        return {
          ...frontSuggestion,
          source: 'front_context',
        };
      }
    }

    const subjectSuggestion = getSuggestedTopicForSubject(subjectLabel, recentLabels);

    if (subjectSuggestion) {
      return {
        ...subjectSuggestion,
        source: 'daily_plan',
      };
    }
  }

  for (const subject of contentTreeV1) {
    const recentLabels = getRecentLabelsForSubject(subject.label, recentTopicLabelsBySubject, recentTopicLabels);
    const suggestion = getSuggestedTopicForSubject(subject.label, recentLabels);

    if (suggestion) {
      return {
        ...suggestion,
        source: 'global_fallback',
      };
    }
  }

  return null;
};

export const getSuggestedTopicCopy = ({
  source,
  topicLabel,
  frontLabel,
  variant = 'today',
}: {
  source: SuggestionSource;
  topicLabel: string;
  frontLabel?: string;
  subjectLabel?: string;
  variant?: 'today' | 'study';
}): string => {
  if (!topicLabel) {
    return '';
  }

  if (source === 'front_context') {
    if (variant === 'today') {
      return frontLabel ? `Sugestao inicial em ${frontLabel}: ${topicLabel}` : `Sugestao inicial: ${topicLabel}`;
    }

    return frontLabel ? `Voce pode comecar por ${topicLabel} em ${frontLabel}.` : `Voce pode comecar por ${topicLabel}.`;
  }

  if (source === 'daily_plan') {
    return variant === 'today'
      ? `Sugestao inicial: ${topicLabel}`
      : `Voce pode comecar por ${topicLabel}.`;
  }

  return variant === 'today'
    ? `Se quiser comecar por um topico: ${topicLabel}`
    : `Se quiser seguir por um topico: ${topicLabel}`;
};

export interface SuggestedContentPath {
  subjectLabel: string;
  frontLabel?: string;
  topicLabel?: string;
  shortLabel: string;
  fullLabel: string;
}

export const getSuggestedContentPathBySubjectLabel = (
  subjectLabel: string,
  explicitTopicLabel?: string | null,
  recentTopicLabels: string[] = [],
): SuggestedContentPath => {
  const normalizedSubjectLabel = subjectLabel.trim();
  const subject = getSubjectByLabel(normalizedSubjectLabel);

  if (!subject) {
    return {
      subjectLabel: normalizedSubjectLabel,
      shortLabel: normalizedSubjectLabel,
      fullLabel: normalizedSubjectLabel,
    };
  }

  const frontByTopic = findFrontByTopicLabel(subject, explicitTopicLabel);
  const fallbackSuggestion = getSuggestedTopicForSubject(subject.label, recentTopicLabels);
  const fallbackFrontLabel = fallbackSuggestion?.frontLabel;
  const front = frontByTopic ?? (fallbackFrontLabel
    ? subject.fronts.find((item) => normalizeLabel(item.label) === normalizeLabel(fallbackFrontLabel))
    : subject.fronts[0]);
  const fallbackTopic = fallbackSuggestion?.topicLabel ? { label: fallbackSuggestion.topicLabel } : front?.topics[0];
  const topicLabel = explicitTopicLabel?.trim() || fallbackTopic?.label;
  const shortParts = [subject.label, front?.label].filter(Boolean);
  const fullParts = [subject.label, front?.label, topicLabel].filter(Boolean);

  return {
    subjectLabel: subject.label,
    frontLabel: front?.label,
    topicLabel,
    shortLabel: shortParts.join(' • '),
    fullLabel: fullParts.join(' • '),
  };
};
