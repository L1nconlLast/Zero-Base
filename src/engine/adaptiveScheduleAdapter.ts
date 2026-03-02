export type StudyBlock = {
  id: string;
  date: string;
  subject: string;
  topic?: string;
  status: 'pendente' | 'concluido' | 'faltou';
  difficulty: 'fraco' | 'medio' | 'forte';
};

export type AdaptationContext = {
  blocks: StudyBlock[];
  hoursPerDay: number;
};

const ensureSuffix = (topic: string | undefined, suffix: string): string => {
  const base = (topic || 'Revisão').trim();
  if (base.toLowerCase().includes(suffix.toLowerCase())) {
    return base;
  }
  return `${base} ${suffix}`;
};

export function reduceLoad(blocks: StudyBlock[]) {
  return blocks.map((block) =>
    block.status === 'pendente'
      ? { ...block, topic: ensureSuffix(block.topic, '(revisão leve)') }
      : block,
  );
}

export function reinforceSubject(blocks: StudyBlock[], subject: string) {
  return blocks.map((block) =>
    block.subject === subject
      ? { ...block, topic: ensureSuffix(block.topic, '(prioritário)') }
      : block,
  );
}

export function adaptSchedule(context: AdaptationContext) {
  const { blocks, hoursPerDay } = context;

  const faltas = blocks.filter((block) => block.status === 'faltou');
  const fracos = blocks.filter((block) => block.difficulty === 'fraco');

  if (faltas.length >= 2 || hoursPerDay <= 2) {
    return reduceLoad(blocks);
  }

  if (fracos.length >= 3) {
    return reinforceSubject(blocks, fracos[0].subject);
  }

  return blocks;
}
