import type {
  FinalizeStudySessionAdapterResult,
  FinishPayload,
} from '../types';

interface FinalizeStudySessionContext {
  subject: string;
  topic: string;
}

// TEMP: adapter de integração da Fase B.
// Hoje retorna revisão mínima 24h e deltas locais.
// Próxima fase: conectar serviços reais de sessão/plano/home/revisões.
export async function finalizeStudySessionAdapter(
  payload: FinishPayload,
  context: FinalizeStudySessionContext,
): Promise<FinalizeStudySessionAdapterResult> {
  return {
    reviewSuggestion: {
      hours: 24,
      label: '24h',
    },
    deltas: {
      home: 'pending',
      plan: 'pending',
      revisions: 'queued',
    },
    session: {
      subject: context.subject,
      topic: context.topic,
      actualDurationSeconds: payload.actualDurationSeconds ?? 0,
      difficulty: payload.difficulty ?? 3,
    },
  };
}

export default finalizeStudySessionAdapter;
