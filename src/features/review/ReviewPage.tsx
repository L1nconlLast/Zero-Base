import React from 'react';
import { ReviewCore } from './components/ReviewCore';
import { ReviewFeedback } from './components/ReviewFeedback';
import { ReviewHeader } from './components/ReviewHeader';
import { ReviewSummary } from './components/ReviewSummary';
import { buildReviewTrackPresentation } from './reviewTrackPresentation';
import type {
  DailyReviewQueueData,
  DailyReviewQueueItem,
  ReviewCoreData,
  ReviewFeedbackData,
  ReviewFeedbackValue,
  ReviewHeaderData,
  ReviewPageProps,
  ReviewSummaryData,
} from './types';
import { normalizePresentationLabel, normalizeSubjectLabel } from '../../utils/uiLabels';

interface ResolvedQueueItem extends DailyReviewQueueItem {
  sortKey: string;
}

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const resolveDateKey = (value: string | undefined, fallback: string): string => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return toDateKey(parsed);
};

const buildSortKey = (
  dateKey: string,
  createdAt: string | undefined,
  id: string,
): string => `${dateKey}__${String(createdAt || '')}__${id}`;

const formatDateLabel = (referenceDate: Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(referenceDate);

const extractReviewTag = (reason?: string): string => {
  const match = String(reason || '').match(/\+(\d+)h/i);
  if (match?.[1]) {
    return `+${match[1]}h`;
  }

  return 'Revisao';
};

const buildQueueTitle = (subject: string, topic?: string): string => {
  const safeTopic = normalizePresentationLabel(topic || '', '');
  if (safeTopic) {
    return safeTopic;
  }

  return normalizeSubjectLabel(subject, 'Revisao');
};

const buildSourceLabel = (
  tag: string,
  source?: 'manual' | 'motor' | 'ia',
): string => {
  const sourceLabel = source === 'manual'
    ? 'Fila manual'
    : source === 'motor'
      ? 'Fila do plano'
      : 'Fila automatica';

  return `${tag} / ${sourceLabel}`;
};

const buildPrompt = (
  title: string,
  subjectLabel?: string,
): string => {
  if (subjectLabel && title !== subjectLabel) {
    return `Recupere os pontos centrais de ${title} em ${subjectLabel} antes de abrir a resposta.`;
  }

  return `Recupere os pontos centrais de ${title} antes de abrir a resposta e registrar a dificuldade.`;
};

const buildAnswerPreview = (note?: string): string =>
  String(note || '').trim() || 'A resposta guiada entra na proxima etapa, junto com a decisao de dominio.';

const formatCountLabel = (
  value: number,
  singular: string,
  plural: string,
): string => `${value} ${value === 1 ? singular : plural}`;

const REVIEW_FEEDBACK_OPTIONS: Array<{ value: ReviewFeedbackValue; label: string }> = [
  { value: 'facil', label: 'Facil' },
  { value: 'medio', label: 'Medio' },
  { value: 'dificil', label: 'Dificil' },
  { value: 'errei', label: 'Errei' },
];

const REVIEW_FEEDBACK_LABELS: Record<ReviewFeedbackValue, string> = {
  facil: 'Facil',
  medio: 'Medio',
  dificil: 'Dificil',
  errei: 'Errei',
};

export const ReviewPage: React.FC<ReviewPageProps> = ({
  darkMode = false,
  scheduleEntries = [],
  referenceDate = new Date(),
  profileContext = null,
  onCommitDecision,
}) => {
  const todayKey = React.useMemo(() => toDateKey(referenceDate), [referenceDate]);
  const dateLabel = React.useMemo(() => formatDateLabel(referenceDate), [referenceDate]);
  const [revealedItemId, setRevealedItemId] = React.useState<string | null>(null);
  const [selectedFeedbackByItemId, setSelectedFeedbackByItemId] = React.useState<Record<string, ReviewFeedbackValue | undefined>>({});
  const [completedSessionItemsById, setCompletedSessionItemsById] = React.useState<Record<string, ResolvedQueueItem>>({});
  const [commitState, setCommitState] = React.useState<'idle' | 'saving' | 'error'>('idle');
  const [commitErrorMessage, setCommitErrorMessage] = React.useState<string | null>(null);

  const baseQueueItems = React.useMemo<ResolvedQueueItem[]>(() => {
    const dueEntries = scheduleEntries
      .filter((entry) =>
        entry.studyType === 'revisao'
        && resolveDateKey(entry.date, todayKey) <= todayKey,
      )
      .sort((left, right) => {
        const leftDate = resolveDateKey(left.date, todayKey);
        const rightDate = resolveDateKey(right.date, todayKey);
        const dateDiff = leftDate.localeCompare(rightDate);
        if (dateDiff !== 0) {
          return dateDiff;
        }

        const createdDiff = String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
        if (createdDiff !== 0) {
          return createdDiff;
        }

        return left.id.localeCompare(right.id);
      });

    return dueEntries.map((entry, index) => {
      const title = buildQueueTitle(entry.subject, entry.topic);
      const subjectLabel = normalizeSubjectLabel(entry.subject, 'Revisao');
      const reviewTag = extractReviewTag(entry.aiReason);

      return {
        id: entry.id,
        title,
        subjectLabel,
        sourceLabel: buildSourceLabel(reviewTag, entry.source),
        prompt: buildPrompt(title, subjectLabel),
        answer: buildAnswerPreview(entry.note),
        dueDate: resolveDateKey(entry.date, todayKey),
        sortKey: buildSortKey(resolveDateKey(entry.date, todayKey), entry.createdAt, entry.id),
        status: entry.done || entry.status === 'concluido' ? 'completed' : 'pending',
        position: index + 1,
        total: dueEntries.length,
      };
    });
  }, [scheduleEntries, todayKey]);

  const queue = React.useMemo<DailyReviewQueueData>(() => {
    const mergedItems = [...baseQueueItems];
    Object.values(completedSessionItemsById).forEach((item) => {
      if (!mergedItems.some((baseItem) => baseItem.id === item.id)) {
        mergedItems.push(item);
      }
    });

    mergedItems.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    let activeAssigned = false;
    const items = mergedItems.map((item, index) => {
      const isCompleted = item.status === 'completed';
      if (isCompleted) {
        return {
          ...item,
          status: 'completed' as const,
          position: index + 1,
          total: mergedItems.length,
        };
      }

      if (!activeAssigned) {
        activeAssigned = true;
        return {
          ...item,
          status: 'active' as const,
          position: index + 1,
          total: mergedItems.length,
        };
      }

      return {
        ...item,
        status: 'pending' as const,
        position: index + 1,
        total: mergedItems.length,
      };
    });

    return {
      dateLabel,
      totalItems: items.length,
      completedItems: items.filter((item) => item.status === 'completed').length,
      remainingItems: items.filter((item) => item.status !== 'completed').length,
      currentItemId: items.find((item) => item.status === 'active')?.id,
      items,
    };
  }, [baseQueueItems, completedSessionItemsById, dateLabel]);

  const activeItem = React.useMemo(
    () => queue.items.find((item) => item.status === 'active') || null,
    [queue.items],
  );
  const answerRevealed = Boolean(activeItem && revealedItemId === activeItem.id);
  const selectedFeedbackValue = activeItem ? selectedFeedbackByItemId[activeItem.id] : undefined;

  React.useEffect(() => {
    setCommitState('idle');
    setCommitErrorMessage(null);
  }, [activeItem?.id]);

  const handleRevealAnswer = React.useCallback(() => {
    if (!activeItem || answerRevealed) {
      return;
    }

    setRevealedItemId(activeItem.id);
  }, [activeItem, answerRevealed]);

  const handleSelectFeedback = React.useCallback((value: ReviewFeedbackValue) => {
    if (!activeItem || !answerRevealed || selectedFeedbackValue) {
      return;
    }

    setSelectedFeedbackByItemId((current) => ({
      ...current,
      [activeItem.id]: value,
    }));
  }, [activeItem, answerRevealed, selectedFeedbackValue]);

  const handleAdvanceItem = React.useCallback(() => {
    if (!activeItem || !selectedFeedbackValue || commitState === 'saving') {
      return;
    }

    const reviewedAt = new Date().toISOString();
    const currentActiveId = activeItem.id;
    const currentSortKey = baseQueueItems.find((item) => item.id === currentActiveId)?.sortKey
      || buildSortKey(activeItem.dueDate, undefined, currentActiveId);

    setCommitState('saving');
    setCommitErrorMessage(null);

    Promise.resolve(
      onCommitDecision?.({
        reviewId: currentActiveId,
        feedback: selectedFeedbackValue,
        reviewedAt,
      }) ?? null,
    )
      .then((result) => {
        if (!result) {
          throw new Error('Nao foi possivel salvar esta revisao agora.');
        }

        setCompletedSessionItemsById((current) => ({
          ...current,
          [currentActiveId]: {
            ...activeItem,
            sortKey: currentSortKey,
            status: 'completed',
          },
        }));
        setSelectedFeedbackByItemId((current) => {
          const next = { ...current };
          delete next[currentActiveId];
          return next;
        });
        setRevealedItemId(null);
        setCommitState('idle');
      })
      .catch((error: unknown) => {
        setCommitState('error');
        setCommitErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar esta revisao agora.');
      });
  }, [activeItem, baseQueueItems, commitState, onCommitDecision, selectedFeedbackValue]);

  const headerData = React.useMemo<ReviewHeaderData>(() => {
    if (queue.totalItems === 0) {
      return {
        title: 'Revisao do dia',
        contextLabel: `Nenhum item vence em ${queue.dateLabel}. A fila diaria fica limpa ate a proxima revisao.`,
        progressLabel: '0 de 0 itens',
        queueLabel: '0 restantes',
        status: 'empty',
      };
    }

    if (!activeItem) {
      return {
        title: 'Revisao do dia',
        contextLabel: `A fila diaria de ${queue.dateLabel} terminou. O proximo ciclo volta quando novas revisoes vencerem.`,
        progressLabel: `${queue.totalItems} de ${queue.totalItems} itens`,
        queueLabel: '0 restantes',
        status: 'completed',
      };
    }

    return {
      title: 'Revisao do dia',
      contextLabel: 'Fila diaria de retencao com um item por vez para limpar o que venceu sem reabrir o plano inteiro.',
      progressLabel: `Item ${activeItem.position} de ${queue.totalItems}`,
      queueLabel: formatCountLabel(queue.remainingItems, 'restante', 'restantes'),
      status: 'active',
    };
  }, [activeItem, queue]);

  const coreData = React.useMemo<ReviewCoreData>(() => {
    if (queue.totalItems === 0) {
      return {
        title: 'Nenhum item na fila de hoje',
        prompt: 'Quando uma revisao vencer, ela entra aqui como item ativo da fila diaria.',
        answer: 'A area de resposta continua reservada para o fluxo de revelar e decidir.',
        positionLabel: '0 de 0 itens',
        sequenceLabel: 'Fila limpa para hoje',
        nextActionLabel: 'Nao ha proximo item a revisar agora.',
        actionLabel: 'Aguardando fila',
        actionDisabled: true,
        status: 'empty',
      };
    }

    if (!activeItem) {
      return {
        title: 'Revisoes do dia concluidas',
        prompt: 'Os itens vencidos de hoje ja passaram pela fila diaria. Na proxima etapa, cada resposta vai reagendar automaticamente o proximo intervalo.',
        answer: 'O fluxo de revelar resposta e registrar dificuldade entra sobre esta mesma base sequencial.',
        positionLabel: `${queue.totalItems} de ${queue.totalItems} itens`,
        sequenceLabel: `${formatCountLabel(queue.completedItems, 'concluido', 'concluidos')} / 0 restantes`,
        nextActionLabel: 'A fila terminou. O proximo ciclo volta quando novas revisoes vencerem.',
        actionLabel: 'Fila concluida',
        actionDisabled: true,
        status: 'completed',
      };
    }

    if (selectedFeedbackValue) {
      return {
        itemId: activeItem.id,
        title: activeItem.title,
        subjectLabel: activeItem.subjectLabel,
        sourceLabel: activeItem.sourceLabel,
        prompt: activeItem.prompt,
        answer: activeItem.answer,
        positionLabel: `${activeItem.position} de ${activeItem.total} itens`,
        sequenceLabel: `${formatCountLabel(queue.completedItems, 'concluido', 'concluidos')} / ${formatCountLabel(queue.remainingItems, 'restante', 'restantes')}`,
        nextActionLabel: commitState === 'saving'
          ? 'Salvando a decisao deste item e recalculando a fila diaria.'
          : commitState === 'error'
            ? (commitErrorMessage || 'Nao foi possivel salvar esta revisao agora.')
            : `${REVIEW_FEEDBACK_LABELS[selectedFeedbackValue]} registrado localmente. ${queue.remainingItems > 1 ? 'Avance para o proximo item da fila.' : 'Feche a fila para concluir as revisoes de hoje.'}`,
        actionLabel: commitState === 'saving'
          ? 'Salvando...'
          : queue.remainingItems > 1 ? 'Proximo item' : 'Fechar fila',
        actionDisabled: commitState === 'saving',
        status: 'answered',
      };
    }

    if (answerRevealed) {
      return {
        itemId: activeItem.id,
        title: activeItem.title,
        subjectLabel: activeItem.subjectLabel,
        sourceLabel: activeItem.sourceLabel,
        prompt: activeItem.prompt,
        answer: activeItem.answer,
        positionLabel: `${activeItem.position} de ${activeItem.total} itens`,
        sequenceLabel: `${formatCountLabel(queue.completedItems, 'concluido', 'concluidos')} / ${formatCountLabel(queue.remainingItems, 'restante', 'restantes')}`,
        nextActionLabel: 'Compare a resposta com sua lembranca e escolha uma das quatro decisoes logo abaixo.',
        actionLabel: 'Escolha o feedback abaixo',
        actionDisabled: true,
        status: 'revealed',
      };
    }

    return {
      itemId: activeItem.id,
      title: activeItem.title,
      subjectLabel: activeItem.subjectLabel,
      sourceLabel: activeItem.sourceLabel,
      prompt: activeItem.prompt,
      answer: activeItem.answer,
      positionLabel: `${activeItem.position} de ${activeItem.total} itens`,
      sequenceLabel: `${formatCountLabel(queue.completedItems, 'concluido', 'concluidos')} / ${formatCountLabel(queue.remainingItems, 'restante', 'restantes')}`,
      nextActionLabel: 'Tente lembrar primeiro. Quando estiver pronto, revele a resposta deste item para comparar com sua recordacao.',
      actionLabel: 'Ver resposta',
      actionDisabled: false,
      status: 'active',
    };
  }, [activeItem, answerRevealed, queue, selectedFeedbackValue]);

  const feedbackData = React.useMemo<ReviewFeedbackData>(() => ({
    revealed: answerRevealed,
    selectedValue: selectedFeedbackValue,
    options: REVIEW_FEEDBACK_OPTIONS.map((option) => ({
      ...option,
      disabled: !activeItem || !answerRevealed || Boolean(selectedFeedbackValue) || commitState === 'saving',
    })),
    helperLabel: !activeItem
      ? 'Quando houver item ativo, o feedback da revisao aparece aqui.'
      : !answerRevealed
        ? 'Revele a resposta para liberar as quatro decisoes desta revisao.'
        : commitState === 'saving'
          ? 'Salvando a decisao deste item no sistema.'
          : commitState === 'error'
            ? (commitErrorMessage || 'Nao foi possivel salvar esta revisao agora.')
        : selectedFeedbackValue
          ? `Feedback ${REVIEW_FEEDBACK_LABELS[selectedFeedbackValue]} registrado localmente. Avance quando estiver pronto.`
          : 'Agora decida como este item voltou para voce.',
  }), [activeItem, answerRevealed, commitErrorMessage, commitState, selectedFeedbackValue]);

  const summaryData = React.useMemo<ReviewSummaryData>(() => {
    if (queue.totalItems === 0) {
      return {
        completedLabel: '0 concluidos',
        remainingLabel: '0 restantes',
        nextStepLabel: 'Quando novas revisoes vencerem, elas entram aqui com um item ativo por vez.',
      };
    }

    if (!activeItem) {
      return {
        completedLabel: formatCountLabel(queue.completedItems, 'concluido', 'concluidos'),
        remainingLabel: '0 restantes',
        nextStepLabel: 'A fila diaria terminou. Na proxima etapa, cada resposta vai reagendar o item automaticamente.',
      };
    }

    if (selectedFeedbackValue) {
      return {
        completedLabel: formatCountLabel(queue.completedItems, 'concluido', 'concluidos'),
        remainingLabel: formatCountLabel(queue.remainingItems, 'restante', 'restantes'),
        nextStepLabel: commitState === 'saving'
          ? 'A decisao esta sendo salva e a fila sera recalculada logo em seguida.'
          : 'A decisao deste item ja foi registrada localmente. Use o CTA principal para consolidar o proximo passo da fila.',
      };
    }

    return {
      completedLabel: formatCountLabel(queue.completedItems, 'concluido', 'concluidos'),
      remainingLabel: formatCountLabel(queue.remainingItems, 'restante', 'restantes'),
      nextStepLabel: 'Siga a ordem da fila para revisar um item por vez sem reabrir o plano inteiro.',
    };
  }, [activeItem, commitState, queue, selectedFeedbackValue]);
  const reviewPresentation = React.useMemo(
    () => buildReviewTrackPresentation({
      header: headerData,
      core: coreData,
      summary: summaryData,
      queue,
      context: profileContext,
      state: {
        activeTitle: activeItem?.title || null,
      },
    }),
    [activeItem?.title, coreData, headerData, profileContext, queue, summaryData],
  );

  return (
    <section
      className={`px-4 py-4 sm:px-6 sm:py-5 lg:px-8 ${
        darkMode ? 'text-slate-100' : 'text-slate-900'
      }`}
      data-testid="review-page-layout"
    >
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3.5 sm:gap-4">
        <ReviewHeader data={reviewPresentation.header} darkMode={darkMode} />

        <main className="flex flex-col gap-3.5 sm:gap-4" data-testid="review-main-flow">
          <ReviewCore
            data={reviewPresentation.core}
            darkMode={darkMode}
            onAction={
              reviewPresentation.core.status === 'active'
                ? handleRevealAnswer
                : reviewPresentation.core.status === 'answered'
                  ? handleAdvanceItem
                  : undefined
            }
          />
          <ReviewFeedback
            data={feedbackData}
            darkMode={darkMode}
            onSelect={handleSelectFeedback}
          />
          <ReviewSummary data={reviewPresentation.summary} queue={reviewPresentation.queue} darkMode={darkMode} />
        </main>
      </div>
    </section>
  );
};

export default ReviewPage;
