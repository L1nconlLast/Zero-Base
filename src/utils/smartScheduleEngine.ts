import type { ScheduleEntry } from '../types';

export type DifficultyLevel = 'fraco' | 'medio' | 'forte';
export type SmartStudyStyle = 'teoria_questoes' | 'questoes' | 'pomodoro_25_5';
export type ReviewCadence = 'semanal' | 'quinzenal';
export type PreferredPeriod = 'manha' | 'tarde' | 'noite';

export interface SmartScheduleProfile {
  examName: 'ENEM' | 'CONCURSO';
  examDate: string;
  desiredScore: number;
  hoursPerDay: number;
  availableWeekDays: number[];
  preferredPeriod: PreferredPeriod;
  studyStyle: SmartStudyStyle;
  reviewCadence: ReviewCadence;
  simulationIntervalWeeks: number;
  subjectDifficulty: Record<string, DifficultyLevel>;
  subjectWeight: Record<string, number>;
}

export interface GeneratedPlanItem {
  date: string;
  subject: string;
  topic: string;
  startTime?: string;
  endTime?: string;
  studyType: ScheduleEntry['studyType'];
  priority: ScheduleEntry['priority'];
  aiReason?: string;
}

export interface AiAdjustmentInput {
  missedDaysLastWeek: number;
  weakTopic: string;
  availableHoursNow: number;
}

export interface AiAdjustmentOutput {
  adjusted: ScheduleEntry[];
  summary: string[];
}

const FALLBACK_SUBJECTS = ['Matemática', 'Linguagens', 'Humanas', 'Natureza', 'Redação'];

const SUBJECT_TOPICS: Record<string, string[]> = {
  Matemática: ['Funções', 'Geometria', 'Probabilidade', 'Análise Combinatória'],
  Linguagens: ['Interpretação de Texto', 'Figuras de Linguagem', 'Gramática', 'Literatura'],
  Humanas: ['História do Brasil', 'Geopolítica', 'Filosofia Moderna', 'Sociologia'],
  Natureza: ['Física Mecânica', 'Química Orgânica', 'Biologia Celular', 'Ecologia'],
  Redação: ['Tese', 'Repertório', 'Coesão', 'Proposta de Intervenção'],
};

const DIFFICULTY_WEIGHT: Record<DifficultyLevel, number> = {
  fraco: 3,
  medio: 2,
  forte: 1,
};

const dayMs = 24 * 60 * 60 * 1000;

const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fromDateStr = (value: string): Date => new Date(`${value}T12:00:00`);

const getSubjects = (profile: SmartScheduleProfile): string[] => {
  const weighted = Object.entries(profile.subjectWeight)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject);

  if (weighted.length > 0) {
    return weighted;
  }

  const byDifficulty = Object.keys(profile.subjectDifficulty);
  if (byDifficulty.length > 0) {
    return byDifficulty;
  }

  return FALLBACK_SUBJECTS;
};

const getTopicForSubject = (subject: string, dayIndex: number): string => {
  const topics = SUBJECT_TOPICS[subject] || ['Revisão de base'];
  return topics[dayIndex % topics.length];
};

const getStartHourByPeriod = (period: PreferredPeriod): number => {
  if (period === 'manha') return 8;
  if (period === 'tarde') return 14;
  return 19;
};

const toTime = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

const getSessionSlots = (profile: SmartScheduleProfile): Array<{ startTime: string; endTime: string }> => {
  const slots = Math.max(1, Math.min(6, profile.hoursPerDay));
  const startHour = getStartHourByPeriod(profile.preferredPeriod);
  return Array.from({ length: slots }).map((_, index) => {
    const start = startHour + index;
    return { startTime: toTime(start), endTime: toTime(start + 1) };
  });
};

const pickSubject = (
  subjects: string[],
  profile: SmartScheduleProfile,
  previousDaySubjects: Set<string>,
  lastSubject: string | null,
  seed: number,
): string => {
  const scored = subjects.map((subject, index) => {
    const customWeight = profile.subjectWeight[subject] || 20;
    const difficulty = profile.subjectDifficulty[subject] || 'medio';
    const difficultyWeight = DIFFICULTY_WEIGHT[difficulty] * 12;
    const repeatedSameDayPenalty = previousDaySubjects.has(subject) ? -25 : 0;
    const repeatDayPenalty = subject === lastSubject ? -60 : 0;
    const deterministicNoise = (seed + index * 13) % 9;

    return {
      subject,
      score: customWeight + difficultyWeight + repeatedSameDayPenalty + repeatDayPenalty + deterministicNoise,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.subject || subjects[0] || FALLBACK_SUBJECTS[0];
};

const buildMainStudyType = (
  style: SmartStudyStyle,
  slotIndex: number,
  totalSlots: number,
): ScheduleEntry['studyType'] => {
  if (style === 'questoes') return 'questoes';
  if (style === 'pomodoro_25_5') {
    return slotIndex % 2 === 0 ? 'teoria_questoes' : 'questoes';
  }

  const theoryLimit = Math.ceil(totalSlots * 0.5);
  const questionsLimit = Math.ceil(totalSlots * 0.9);

  if (slotIndex < theoryLimit) return 'teoria_questoes';
  if (slotIndex < questionsLimit) return 'questoes';
  return 'revisao';
};

export const createDefaultSmartProfile = (): SmartScheduleProfile => ({
  examName: 'ENEM',
  examDate: '',
  desiredScore: 780,
  hoursPerDay: 3,
  availableWeekDays: [1, 2, 3, 4, 5],
  preferredPeriod: 'manha',
  studyStyle: 'teoria_questoes',
  reviewCadence: 'semanal',
  simulationIntervalWeeks: 2,
  subjectDifficulty: {
    Matemática: 'fraco',
    Linguagens: 'medio',
    Humanas: 'medio',
    Natureza: 'fraco',
    Redação: 'medio',
  },
  subjectWeight: {
    Matemática: 35,
    Linguagens: 20,
    Humanas: 15,
    Natureza: 20,
    Redação: 10,
  },
});

export const generateBasePlan = (profile: SmartScheduleProfile, startDate: string, horizonDays = 30): GeneratedPlanItem[] => {
  const subjects = getSubjects(profile);
  const slots = getSessionSlots(profile);
  const start = fromDateStr(startDate);
  const generated: GeneratedPlanItem[] = [];
  let lastDayMainSubject: string | null = null;

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset++) {
    const currentDate = new Date(start.getTime() + dayOffset * dayMs);
    const weekday = currentDate.getDay();

    if (!profile.availableWeekDays.includes(weekday)) {
      continue;
    }

    const daySubjects = new Set<string>();

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      const subject = pickSubject(subjects, profile, daySubjects, lastDayMainSubject, dayOffset + slotIndex + currentDate.getDate());
      const topic = getTopicForSubject(subject, dayOffset + slotIndex);
      const studyType = buildMainStudyType(profile.studyStyle, slotIndex, slots.length);
      const date = toDateStr(currentDate);

      generated.push({
        date,
        subject,
        topic,
        startTime: slot.startTime,
        endTime: slot.endTime,
        studyType,
        priority: profile.subjectDifficulty[subject] === 'fraco' ? 'alta' : 'normal',
        aiReason: profile.subjectDifficulty[subject] === 'fraco'
          ? 'Priorizado por nível fraco informado no onboarding.'
          : 'Distribuição baseada no peso da matéria.',
      });

      daySubjects.add(subject);
    }

    lastDayMainSubject = [...daySubjects][0] || lastDayMainSubject;

    const shouldAddSimulado = profile.simulationIntervalWeeks > 0
      && (dayOffset + 1) % (profile.simulationIntervalWeeks * 7) === 0;

    if (shouldAddSimulado) {
      generated.push({
        date: toDateStr(currentDate),
        subject: profile.examName === 'ENEM' ? 'Simulado ENEM' : 'Simulado Concurso',
        topic: 'Prova completa',
        startTime: slots[0]?.startTime,
        endTime: slots[0]?.endTime,
        studyType: 'simulado',
        priority: 'alta',
        aiReason: 'Simulado periódico (a cada 14 dias).',
      });
    }
  }

  const base = [...generated];

  base.forEach((item) => {
    const sourceDate = fromDateStr(item.date);

    [7, 30].forEach((offset) => {
      const reviewDate = new Date(sourceDate.getTime() + offset * dayMs);
      if (!profile.availableWeekDays.includes(reviewDate.getDay())) {
        return;
      }

      if ((reviewDate.getTime() - start.getTime()) / dayMs >= horizonDays) {
        return;
      }

      generated.push({
        date: toDateStr(reviewDate),
        subject: item.subject,
        topic: item.topic,
        startTime: item.startTime,
        endTime: item.endTime,
        studyType: 'revisao',
        priority: 'alta',
        aiReason: `Revisão automática +${offset} dias (spaced repetition).`,
      });
    });
  });

  return generated.sort((a, b) => `${a.date}-${a.startTime || ''}`.localeCompare(`${b.date}-${b.startTime || ''}`));
};

export const adjustPlanWithAi = (entries: ScheduleEntry[], input: AiAdjustmentInput): AiAdjustmentOutput => {
  const futurePending = entries
    .filter((entry) => !entry.done)
    .sort((a, b) => `${a.date}-${a.startTime || ''}`.localeCompare(`${b.date}-${b.startTime || ''}`));

  if (futurePending.length === 0) {
    return {
      adjusted: [],
      summary: ['Não há blocos futuros pendentes para ajustar.'],
    };
  }

  const summary: string[] = [];
  const adjusted = futurePending.map((entry) => ({ ...entry }));

  if (input.weakTopic.trim()) {
    const weakToken = input.weakTopic.trim().toLowerCase();
    adjusted.forEach((entry, index) => {
      const hit = (entry.topic || '').toLowerCase().includes(weakToken)
        || (entry.subject || '').toLowerCase().includes(weakToken)
        || index < 3;

      if (hit) {
        entry.priority = 'alta';
        entry.aiReason = `Ajuste IA: reforço em ${input.weakTopic} por baixo desempenho.`;
      }
    });

    summary.push(`Aumentei prioridade dos blocos ligados a ${input.weakTopic}.`);
  }

  if (input.missedDaysLastWeek >= 2) {
    for (let i = 1; i < adjusted.length; i += 3) {
      if (adjusted[i].studyType !== 'revisao' && adjusted[i].studyType !== 'simulado') {
        adjusted[i].studyType = 'questoes';
        adjusted[i].aiReason = 'Ajuste IA: carga reduzida por faltas recentes.';
      }
    }
    summary.push('Reduzi carga cognitiva de blocos longos após faltas na semana.');
  }

  if (input.availableHoursNow > 0 && input.availableHoursNow < 2) {
    adjusted.forEach((entry) => {
      if (entry.studyType === 'teoria_questoes') {
        entry.studyType = 'questoes';
      }
      if (entry.studyType !== 'revisao' && entry.studyType !== 'simulado') {
        entry.aiReason = 'Ajuste IA: tempo diário menor, foco em blocos curtos.';
      }
    });
    summary.push('Replanejei sessões para seu novo limite de tempo diário.');
  }

  if (summary.length === 0) {
    summary.push('A IA manteve o plano atual, sem necessidade de remanejamento forte.');
  }

  return { adjusted, summary };
};
