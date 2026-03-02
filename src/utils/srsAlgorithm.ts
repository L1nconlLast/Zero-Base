// ============================================================
// src/utils/srsAlgorithm.ts
// Algoritmo SM-2 (SuperMemo) para revisão espaçada
// ============================================================

export interface SRSCard {
  id: string;
  easeFactor: number;   // começa em 2.5, mínimo 1.3
  interval: number;      // dias até próxima revisão
  repetitions: number;   // quantas vezes revisado com sucesso
  nextReview: string;    // ISO date string
  lastReview?: string;
}

// Qualidade de resposta: 0–5
// 0-2 = errou, 3-5 = acertou (3=forçado, 4=bom, 5=perfeito)
export const calcSRS = (card: SRSCard, quality: 0 | 1 | 2 | 3 | 4 | 5): SRSCard => {
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    // Errou: reinicia as repetições, intervalo vai para 1 dia
    repetitions = 0;
    interval = 1;
  } else {
    // Acertou: calcula próximo intervalo
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Atualiza o ease factor (fator de facilidade)
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview: nextReview.toISOString().split('T')[0],
    lastReview: new Date().toISOString().split('T')[0],
  };
};

export const isDue = (card: SRSCard): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return card.nextReview <= today;
};

export const createNewCard = (id: string): SRSCard => ({
  id,
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
  nextReview: new Date().toISOString().split('T')[0],
});

export const getDueCount = (cards: Record<string, SRSCard>): number =>
  Object.values(cards).filter(isDue).length;

export const getIntervalLabel = (interval: number): string => {
  if (interval === 1) return 'amanhã';
  if (interval < 7) return `em ${interval} dias`;
  if (interval < 30) return `em ${Math.round(interval / 7)} sem.`;
  return `em ${Math.round(interval / 30)} mês`;
};
