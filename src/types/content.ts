export type ContentTree = SubjectNode[];

export interface SubjectNode {
  id: string;
  label: string;
  fronts: FrontNode[];
}

export interface FrontNode {
  id: string;
  label: string;
  topics: TopicNode[];
}

export interface TopicNode {
  id: string;
  label: string;
}
