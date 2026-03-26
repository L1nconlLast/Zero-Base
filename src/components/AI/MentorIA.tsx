import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Flame,
  Lightbulb,
  MessageSquareText,
  Pin,
  Rocket,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserData } from '../../types';
import { useMentorMemory } from '../../hooks/useMentorMemory';
import { mentorBriefingService } from '../../services/mentorBriefing.service';
import { mentorChatApiService, type MentorChatPayload } from '../../services/mentorChatApi.service';
import { mentorIAService, type MentorMessage } from '../../services/mentorIA.service';
import { examStrategyService } from '../../services/examStrategy.service';
import { isSupabaseConfigured } from '../../services/supabase.client';
import type { EngineDecision, MentorOutput, MentorTrigger } from '../../types/mentor';
import { trackEvent } from '../../utils/analytics';

interface MentorIAProps {
  userName?: string;
  userEmail?: string;
  cloudUserId?: string | null;
  userData: UserData;
  weeklyGoalMinutes: number;
  daysToExam?: number;
  onGoToFocus?: () => void;
  onGoToAcademy?: () => void;
}

type TabId = 'alertas' | 'analise' | 'chat';

interface AlertItem {
  id: number;
  Icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  level: 'urgent' | 'info' | 'success';
}

const QUICK_SUGGESTIONS = [
  'Qual minha area mais fraca?',
  'Crie um plano para esta semana',
  'O que revisar hoje?',
  'Como melhorar minha consistencia?',
  'Como estudar para CEBRASPE/FGV/FCC?',
];

const colorByLevel: Record<AlertItem['level'], string> = {
  urgent: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  success: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

const getSubjectMinutes = (userData: UserData): Record<string, number> => {
  const sessions = userData.sessions || userData.studyHistory || [];
  return sessions.reduce<Record<string, number>>((acc, session) => {
    const key = session.subject || 'Outra';
    acc[key] = (acc[key] || 0) + session.minutes;
    return acc;
  }, {});
};

const buildPlanMessage = (focusArea: string, strongArea: string): string =>
  [
    'Plano rapido para os proximos 7 dias:',
    `- 3 blocos de 25min em ${focusArea}`,
    `- 2 blocos de 20min em ${strongArea}`,
    '- 1 revisao geral no sabado (45min)',
    'Se mantiver consistencia diaria, seu ritmo melhora ja na proxima semana.',
  ].join('\n');

const formatAnalysisRecency = (timestamp: number): string => {
  if (!timestamp) return 'Primeira leitura em andamento';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 1) return 'Atualizado agora';
  if (diffMinutes < 60) return `Atualizado ha ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Atualizado ha ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  return `Atualizado ha ${diffDays}d`;
};

const hasInactivity48h = (userData: UserData): boolean => {
  const sessions = userData.sessions || userData.studyHistory || [];
  if (sessions.length === 0) return true;
  const lastSession = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return Date.now() - new Date(lastSession.date).getTime() >= 48 * 60 * 60 * 1000;
};

const containsBlockedIntent = (text: string): boolean =>
  /(qual assunto vai cair|atalho|chute|gabarito|milagre)/i.test(text);

const MentorIA: React.FC<MentorIAProps> = ({
  userName,
  userEmail,
  cloudUserId = null,
  userData,
  weeklyGoalMinutes,
  daysToExam = 247,
  onGoToFocus,
  onGoToAcademy,
}) => {
  const [tab, setTab] = useState<TabId>('alertas');
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [briefing, setBriefing] = useState<MentorOutput | null>(null);
  const [briefingSource, setBriefingSource] = useState<'llm' | 'fallback'>('fallback');
  const userKey = userEmail || userName || 'default';
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: mentorIAService.createMessage('assistant', 'init').id,
      role: 'assistant',
      createdAt: new Date().toISOString(),
      content: `Ola, ${userName || 'estudante'}! Ja analisei seu momento atual e preparei alertas com memoria do seu estudo.`,
    },
  ]);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const trigger = useMemo<MentorTrigger>(() => {
    const currentWeeklyMinutes = Object.values(userData.weekProgress || {}).reduce(
      (total, day) => total + (day.minutes || 0),
      0,
    );

    if (daysToExam <= 30) return 'final_30_days';
    if (hasInactivity48h(userData)) return 'inactivity_48h';
    if (currentWeeklyMinutes < weeklyGoalMinutes * 0.7) return 'goal_below_70';
    if (new Date().getDay() === 1) return 'weekly_start';
    return 'chat_opened';
  }, [daysToExam, userData, weeklyGoalMinutes]);

  const {
    memory: mentorMemory,
    runtime: mentorRuntime,
    saveBriefing,
    rememberFollowedAction,
  } = useMentorMemory({
    userKey,
    userData,
    weeklyGoalMinutes,
    daysToExam,
    trigger,
  });

  const mentorFocus = mentorRuntime.recommendedFocus;
  const mentorSecondaryFocus = mentorRuntime.secondaryFocus;
  const mentorStrongArea = mentorRuntime.strongArea;
  const mentorPreviousFocus = mentorMemory.previousFocus;
  const weeklyPct = mentorRuntime.weeklyPct;
  const weeklyDone = mentorRuntime.weeklyMinutesDone;
  const subjectMinutes = Object.keys(mentorMemory.subjectMinutes).length > 0
    ? mentorMemory.subjectMinutes
    : getSubjectMinutes(userData);
  const subjectEntries = useMemo(
    () => Object.entries(subjectMinutes).sort(([, a], [, b]) => b - a),
    [subjectMinutes],
  );
  const followedAction = mentorMemory.lastActionFollowed;
  const lastRecommendation = mentorMemory.lastRecommendations[0] || null;
  const lastAnalysisLabel = formatAnalysisRecency(mentorMemory.lastAnalysisAt);

  const mentorEngineDecision = useMemo<EngineDecision>(
    () => ({
      prioridadeAtual: mentorFocus,
      justificativa: `${mentorRuntime.focusShiftReason} Janela atual de ${daysToExam} dias ate a prova.`,
      acoesSemana: [
        `Revisar ${mentorFocus} por 20min em 3 dias da semana`,
        `Resolver 15 questoes de ${mentorFocus} em blocos curtos`,
        `Manter consistencia em ${mentorStrongArea} com 2 blocos leves`,
      ],
    }),
    [daysToExam, mentorFocus, mentorRuntime.focusShiftReason, mentorStrongArea],
  );

  const alerts = useMemo<AlertItem[]>(
    () => [
      {
        id: 1,
        Icon: AlertTriangle,
        title: `${mentorFocus} pede atencao agora`,
        body: `${mentorRuntime.focusShiftReason} Recomendo 20 minutos hoje para recuperar ritmo sem perder consistencia.`,
        action: `Iniciar foco em ${mentorFocus}`,
        level: 'urgent',
      },
      {
        id: 2,
        Icon: Lightbulb,
        title: `Meta semanal em ${weeklyPct}%`,
        body: weeklyPct >= 50
          ? 'Bom progresso. Manter sessoes curtas diarias deve garantir sua meta.'
          : 'Voce ainda esta abaixo do ideal. Vale priorizar 2 sessoes extras ate sexta.',
        action: 'Ajustar plano da semana',
        level: 'info',
      },
      {
        id: 3,
        Icon: Rocket,
        title: `${mentorStrongArea} em evolucao`,
        body: `Seu melhor desempenho recente esta em ${mentorStrongArea}. Use isso para ganhar XP com consistencia.`,
        action: 'Continuar trilha forte',
        level: 'success',
      },
    ],
    [mentorFocus, mentorRuntime.focusShiftReason, mentorStrongArea, weeklyPct],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateMessages = async () => {
      const localMessages = mentorIAService.getLocalMessages(userKey);

      if (localMessages.length > 0 && !cancelled) {
        setMessages(localMessages);
      }

      if (!cloudUserId || !isSupabaseConfigured) {
        return;
      }

      try {
        const cloudMessages = await mentorIAService.listCloudMessages(cloudUserId);
        if (cancelled || cloudMessages.length === 0) return;

        const merged = mentorIAService.mergeMessages(localMessages, cloudMessages);
        setMessages(merged);
        mentorIAService.saveLocalMessages(userKey, merged);
      } catch {
        if (!cancelled) {
          toast('Historico do Mentor carregado em modo local.');
        }
      }
    };

    void hydrateMessages();

    return () => {
      cancelled = true;
    };
  }, [cloudUserId, userKey]);

  useEffect(() => {
    let cancelled = false;

    const runBriefing = async () => {
      if (!mentorRuntime.shouldRefreshBriefing && mentorMemory.lastBriefing) {
        setBriefing(mentorMemory.lastBriefing);
        setBriefingSource(mentorMemory.lastBriefingSource || 'fallback');
        return;
      }

      const result = await mentorBriefingService.getBriefing({
        userKey,
        objective: 'enem',
        examName: 'ENEM',
        daysToExam,
        level: weeklyPct >= 85 ? 'avancado' : weeklyPct >= 55 ? 'intermediario' : 'iniciante',
        strongPoints: [mentorStrongArea],
        weakPoints: [mentorFocus, mentorSecondaryFocus],
        recentFrequency: `${weeklyPct}% da meta semanal`,
        engineDecision: mentorEngineDecision,
        trigger,
      });

      if (cancelled) return;

      setBriefing(result.output);
      setBriefingSource(result.source);
      saveBriefing(result.output, result.source);

      trackEvent(
        'mentor_briefing_generated',
        {
          mentor_mode: result.output.tom,
          acao_semana: result.output.acao_semana,
          source: result.source,
          trigger,
          weeklyPct,
          daysToExam,
        },
        { userEmail },
      );

      trackEvent(
        result.source === 'llm' ? 'mentor_source_llm' : 'mentor_source_fallback',
        {
          mentor_mode: result.output.tom,
          trigger,
        },
        { userEmail },
      );
    };

    void runBriefing();

    return () => {
      cancelled = true;
    };
  }, [
    daysToExam,
    mentorEngineDecision,
    mentorFocus,
    mentorMemory.lastBriefing,
    mentorMemory.lastBriefingSource,
    mentorRuntime.shouldRefreshBriefing,
    mentorSecondaryFocus,
    mentorStrongArea,
    saveBriefing,
    trigger,
    userEmail,
    userKey,
    weeklyPct,
  ]);

  useEffect(() => {
    mentorIAService.saveLocalMessages(userKey, messages);
  }, [messages, userKey]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const getLocalFallbackReply = (text: string): string => {
    if (containsBlockedIntent(text)) {
      return 'Nao posso orientar atalhos ou previsoes de prova. Posso te orientar em estrategia real com base no seu momento atual.';
    }

    const strategyMessage = examStrategyService.buildMessageForMentor(text);
    if (strategyMessage) {
      return strategyMessage;
    }

    if (briefing) {
      if (text.toLowerCase().includes('hoje')) {
        return `Prioridade de hoje: ${briefing.prioridade}. ${briefing.acao_semana[0] || 'Siga o primeiro bloco planejado.'}`;
      }

      if (text.toLowerCase().includes('focar') || text.toLowerCase().includes('fraco')) {
        return `${briefing.justificativa} Acao pratica: ${briefing.acao_semana.join(' | ')}`;
      }
    }

    const lower = text.toLowerCase();

    if (lower.includes('fraca') || lower.includes('dificuldade')) {
      return `Hoje suas areas mais frageis sao ${mentorFocus} e ${mentorSecondaryFocus}. Minha sugestao: 15min em ${mentorFocus} antes de qualquer outra tarefa.`;
    }

    if (lower.includes('plano') || lower.includes('semana')) {
      return buildPlanMessage(mentorFocus, mentorStrongArea);
    }

    if (lower.includes('revisar') || lower.includes('hoje')) {
      return `Para hoje: 1) ${mentorFocus} (15min), 2) ${mentorStrongArea} (20min), 3) revisao leve (10min). Total: 45min.`;
    }

    if (lower.includes('consist') || lower.includes('streak')) {
      return `Seu streak esta em ${mentorRuntime.currentStreak} dias. Para manter: sessao minima diaria de 15min + revisao curta no fim do dia.`;
    }

    if (lower.includes('mudou') || lower.includes('foco')) {
      return mentorPreviousFocus && mentorPreviousFocus !== mentorFocus
        ? `Seu foco mudou de ${mentorPreviousFocus} para ${mentorFocus}. ${mentorRuntime.focusShiftReason}`
        : mentorRuntime.focusShiftReason;
    }

    return lastRecommendation
      ? `Entendi. Sua ultima recomendacao foi "${lastRecommendation}". Agora o melhor passo e manter foco em ${mentorFocus}. Quer que eu monte um plano de 14 dias?`
      : `Entendi. Com ${daysToExam} dias para a prova, o melhor agora e constancia diaria e foco em ${mentorFocus}. Quer que eu monte um plano de 14 dias?`;
  };

  const handleFollowWeekAction = (action: string) => {
    rememberFollowedAction(action);
    trackEvent(
      'mentor_week_action_followed',
      {
        acao_semana: action,
        mentor_mode: briefing?.tom || 'default',
        source: briefingSource,
        trigger,
      },
      { userEmail },
    );
    toast.success('Acao registrada. Foque nela hoje.');
  };

  const handleAlertAction = (alert: AlertItem) => {
    const destination = alert.id === 1 ? 'focus' : 'academy';

    trackEvent(
      'mentor_action_clicked',
      {
        origin: 'alert_card',
        acao_semana: alert.action,
        mentor_mode: briefing?.tom || 'default',
        source: briefingSource,
        trigger,
        destination,
      },
      { userEmail },
    );

    trackEvent(
      'mentor_action_followed',
      {
        origin: 'alert_card',
        acao_semana: alert.action,
        destination,
      },
      { userEmail },
    );

    if (alert.id === 1) {
      onGoToFocus?.();
      return;
    }

    onGoToAcademy?.();
  };

  const sendMessage = async (raw?: string) => {
    const content = (raw ?? input).trim();
    if (!content) return;

    const userMessage = mentorIAService.createMessage('user', content);
    const assistantMessage = mentorIAService.createMessage('assistant', '');
    let streamedReply = '';

    setInput('');
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setTyping(true);

    trackEvent(
      'mentor_message_sent',
      {
        contentLength: content.length,
        hasQuickSuggestion: QUICK_SUGGESTIONS.includes(content),
      },
      { userEmail },
    );

    const recentHistory = messages
      .concat(userMessage)
      .slice(-10)
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const payload: MentorChatPayload = {
      message: content,
      history: recentHistory,
      studentContext: {
        userName: userName ?? 'estudante',
        daysToExam,
        strongArea: mentorStrongArea,
        weakArea: mentorFocus,
        weeklyPct,
        streak: mentorRuntime.currentStreak,
        previousFocus: mentorPreviousFocus || undefined,
        lastRecommendation: lastRecommendation || undefined,
        sessionsLast7Days: mentorRuntime.sessionsLast7Days,
        completedMockExams: mentorRuntime.completedMockExams,
        trigger,
      },
    };

    try {
      await mentorChatApiService.sendStream(payload, {
        onChunk: (chunk) => {
          streamedReply += chunk;
          setMessages((prev) => prev.map((message) => (
            message.id === assistantMessage.id
              ? { ...message, content: streamedReply }
              : message
          )));
        },
      });

      if (!streamedReply.trim()) {
        const fallback = getLocalFallbackReply(content);
        streamedReply = fallback;
        setMessages((prev) => prev.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: fallback }
            : message
        )));
      }

      if (cloudUserId && isSupabaseConfigured) {
        void Promise.all([
          mentorIAService.pushCloudMessage(cloudUserId, userMessage),
          mentorIAService.pushCloudMessage(cloudUserId, {
            ...assistantMessage,
            content: streamedReply,
          }),
        ]).catch(() => {
          toast('Resposta salva localmente. A nuvem sera sincronizada depois.');
        });
      }
    } catch (error) {
      setTyping(false);

      const errorMessage = error instanceof Error ? error.message : 'unknown';
      const lowerErrorMessage = errorMessage.toLowerCase();

      if (
        errorMessage.includes('401')
        || lowerErrorMessage.includes('unauthorized')
        || lowerErrorMessage.includes('sessao ausente')
      ) {
        const authMessage = 'Voce precisa estar logado para usar o Mentor IA online. Entre na sua conta para continuar.';
        setMessages((prev) => prev.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: authMessage }
            : message
        )));

        trackEvent('mentor_auth_required', { errorMessage }, { userEmail });

        if (!import.meta.env.DEV) {
          toast.error('Sessao expirada ou ausente. Faca login novamente.');
        }
      } else if (
        lowerErrorMessage.includes('quota')
        || lowerErrorMessage.includes('billing')
        || lowerErrorMessage.includes('insufficient_quota')
        || lowerErrorMessage.includes('cota')
        || lowerErrorMessage.includes('faturamento')
      ) {
        const fallback = getLocalFallbackReply(content);
        const quotaMessage = `${fallback}\n\nAviso: cota da IA atingida. Estou respondendo em modo local temporario.`;
        setMessages((prev) => prev.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: quotaMessage }
            : message
        )));

        trackEvent('mentor_ai_quota_exceeded', { errorMessage }, { userEmail });
        toast.error('Cota da IA esgotada. Verifique plano ou faturamento.');
      } else if (errorMessage.includes('429')) {
        const blockMessage = 'Atingiu o limite diario de uso do Mentor IA. Volte amanha para continuarmos a sua evolucao.';
        setMessages((prev) => prev.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: blockMessage }
            : message
        )));

        trackEvent(
          'mentor_circuit_breaker_triggered',
          { trigger: 'daily_limit_exceeded' },
          { userEmail },
        );

        toast.error('Limite diario atingido. Volte amanha.');
      } else {
        const fallback = getLocalFallbackReply(content);
        setMessages((prev) => prev.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: fallback }
            : message
        )));

        trackEvent(
          'mentor_chat_error',
          {
            errorMessage,
            fallbackUsed: true,
          },
          { userEmail },
        );
      }
    } finally {
      setTyping(false);
    }
  };

  const modeLabel = briefing?.tom === 'recovery'
    ? 'Recuperacao de atraso'
    : briefing?.tom === 'reta_final'
      ? 'Foco em reta final'
      : 'Treinador estrategico';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mentor IA Proativo</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Recomendacoes com memoria curta e contexto real do seu estudo.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-400">
              <Target className="h-3.5 w-3.5" /> {daysToExam}d para prova
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400">
              <Flame className="h-3.5 w-3.5" /> {mentorRuntime.currentStreak} dias
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {([
            { id: 'alertas', label: 'Alertas' },
            { id: 'analise', label: 'Analise semanal' },
            { id: 'chat', label: 'Chat' },
          ] as Array<{ id: TabId; label: string }>).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === item.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
              style={tab === item.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {briefing && (
        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              <Pin className="h-3.5 w-3.5" /> Briefing semanal do Mentor
            </p>
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] text-indigo-700 dark:bg-indigo-800/50 dark:text-indigo-200">
              {modeLabel}
            </span>
          </div>

          <p className="text-sm text-gray-900 dark:text-white">
            <strong>Prioridade:</strong> {briefing.prioridade}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{briefing.justificativa}</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-200/70 bg-white/70 p-3 dark:border-indigo-800/70 dark:bg-indigo-950/20">
              <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-500 dark:text-indigo-300">Memoria ativa</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{lastAnalysisLabel}</p>
            </div>
            <div className="rounded-xl border border-indigo-200/70 bg-white/70 p-3 dark:border-indigo-800/70 dark:bg-indigo-950/20">
              <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-500 dark:text-indigo-300">Mudanca de foco</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{mentorRuntime.focusShiftReason}</p>
            </div>
            <div className="rounded-xl border border-indigo-200/70 bg-white/70 p-3 dark:border-indigo-800/70 dark:bg-indigo-950/20">
              <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-500 dark:text-indigo-300">Ultima recomendacao</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {lastRecommendation || 'Mentor montando sua primeira acao.'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {briefing.acao_semana.map((action) => (
              <button
                key={action}
                onClick={() => handleFollowWeekAction(action)}
                className={`w-full rounded-md border px-2 py-1 text-left text-xs transition ${
                  followedAction === action
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'border-transparent text-gray-700 hover:border-indigo-200 hover:bg-indigo-100/60 dark:text-gray-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20'
                }`}
              >
                - {action}
              </button>
            ))}
          </div>

          <p className="text-xs text-indigo-700 dark:text-indigo-200">{briefing.mensagem_motivacional}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Fonte: {briefingSource === 'llm' ? 'LLM' : 'Fallback deterministico'}
          </p>
        </div>
      )}

      {tab === 'alertas' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl border p-4 ${colorByLevel[alert.level]}`}>
              <alert.Icon className="mb-1 h-5 w-5" />
              <h3 className="mb-1 text-sm font-bold">{alert.title}</h3>
              <p className="text-xs leading-relaxed opacity-80">{alert.body}</p>
              <button
                onClick={() => handleAlertAction(alert)}
                className="mt-3 text-xs font-bold underline underline-offset-2"
              >
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'analise' && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Meta semanal</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{weeklyPct}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(weeklyDone / 60)}h {weeklyDone % 60}m de {Math.round(weeklyGoalMinutes / 60)}h
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full"
              style={{
                width: `${weeklyPct}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
              }}
            />
          </div>

          <div className="space-y-2">
            {subjectEntries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sem dados suficientes por materia ainda. Conclua mais sessoes para analise completa.
              </p>
            ) : (
              subjectEntries.slice(0, 5).map(([subject, minutes]) => (
                <div key={subject} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{subject}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{minutes} min</span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            <p className="mb-1 inline-flex items-center gap-1 font-semibold">
              <MessageSquareText className="h-4 w-4" /> Analise do Mentor
            </p>
            <p>
              {mentorPreviousFocus && mentorPreviousFocus !== mentorFocus ? (
                <>
                  Bom avanco em <strong>{mentorPreviousFocus}</strong>. O foco agora mudou para <strong>{mentorFocus}</strong> para equilibrar seu desempenho.
                </>
              ) : (
                <>
                  Bom avanco em <strong>{mentorStrongArea}</strong>. Para equilibrar desempenho, priorize <strong>{mentorFocus}</strong> nos proximos 3 dias.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div ref={chatRef} className="h-[360px] space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {typing && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Mentor IA esta digitando...</div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  void sendMessage(suggestion);
                }}
                className="whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
            <label htmlFor="mentor-chat-input" className="sr-only">
              Pergunta para o Mentor IA
            </label>
            <input
              id="mentor-chat-input"
              name="mentor-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void sendMessage();
                }
              }}
              placeholder="Pergunte ao seu Mentor IA..."
              className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={() => {
                void sendMessage();
              }}
              className="rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
              disabled={!input.trim()}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorIA;
