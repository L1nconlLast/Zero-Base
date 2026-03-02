import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { UserData } from '../../types';
import { mentorIAService, type MentorMessage } from '../../services/mentorIA.service';
import { mentorBriefingService } from '../../services/mentorBriefing.service';
import { isSupabaseConfigured } from '../../services/supabase.client';
import { trackEvent } from '../../utils/analytics';
import type { EngineDecision, MentorOutput, MentorTrigger } from '../../types/mentor';
import toast from 'react-hot-toast';

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
  icon: string;
  title: string;
  body: string;
  action: string;
  level: 'urgent' | 'info' | 'success';
}

const QUICK_SUGGESTIONS = [
  'Qual minha área mais fraca?',
  'Crie um plano para esta semana',
  'O que revisar hoje?',
  'Como melhorar minha consistência?',
];

const colorByLevel: Record<AlertItem['level'], string> = {
  urgent: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  success: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
};

const getWeeklyDoneMinutes = (userData: UserData): number => {
  return Object.values(userData.weekProgress || {}).reduce((total, day) => total + (day.minutes || 0), 0);
};

const getSubjectMinutes = (userData: UserData): Record<string, number> => {
  const sessions = userData.sessions || userData.studyHistory || [];
  return sessions.reduce<Record<string, number>>((acc, session) => {
    const key = session.subject || 'Outra';
    acc[key] = (acc[key] || 0) + session.minutes;
    return acc;
  }, {});
};

const buildPlanMessage = (weakArea: string, strongArea: string): string => {
  return [
    'Plano rápido para os próximos 7 dias:',
    `• 3 blocos de 25min em ${weakArea}`,
    `• 2 blocos de 20min em ${strongArea}`,
    '• 1 revisão geral no sábado (45min)',
    'Se mantiver consistência diária, seu ritmo melhora já na próxima semana.',
  ].join('\n');
};

const hasInactivity48h = (userData: UserData): boolean => {
  const sessions = userData.sessions || userData.studyHistory || [];
  if (sessions.length === 0) return true;
  const lastSession = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return Date.now() - new Date(lastSession.date).getTime() >= 48 * 60 * 60 * 1000;
};

const containsBlockedIntent = (text: string): boolean => {
  return /(qual assunto vai cair|atalho|chute|gabarito|milagre)/i.test(text);
};

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
  const [followedAction, setFollowedAction] = useState<string | null>(null);
  const userKey = userEmail || userName || 'default';
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: mentorIAService.createMessage('assistant', 'init').id,
      role: 'assistant',
      createdAt: new Date().toISOString(),
      content: `Olá, ${userName || 'estudante'}! Já analisei seu momento atual e preparei alertas + ações práticas para hoje.`,
    },
  ]);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const weeklyDone = useMemo(() => getWeeklyDoneMinutes(userData), [userData]);
  const weeklyPct = Math.min(Math.round((weeklyDone / Math.max(weeklyGoalMinutes, 1)) * 100), 100);
  const subjectMinutes = useMemo(() => getSubjectMinutes(userData), [userData]);

  const sortedAreas = useMemo(() => {
    return Object.entries(subjectMinutes).sort(([, a], [, b]) => a - b);
  }, [subjectMinutes]);

  const weakArea = sortedAreas[0]?.[0] || 'Redação';
  const secondWeakArea = sortedAreas[1]?.[0] || 'Matemática';
  const strongArea = sortedAreas[sortedAreas.length - 1]?.[0] || 'Natureza';

  const engineDecision = useMemo<EngineDecision>(
    () => ({
      prioridadeAtual: weakArea,
      justificativa: `Baixa recorrência recente em ${weakArea} e janela de ${daysToExam} dias até a prova.`,
      acoesSemana: [
        `Revisar ${weakArea} por 20min em 3 dias da semana`,
        `Resolver 15 questões de ${weakArea} em blocos curtos`,
        `Manter consistência em ${strongArea} com 2 blocos leves`,
      ],
    }),
    [weakArea, strongArea, daysToExam],
  );

  const trigger = useMemo<MentorTrigger>(() => {
    if (daysToExam <= 30) return 'final_30_days';
    if (hasInactivity48h(userData)) return 'inactivity_48h';
    if (weeklyPct < 70) return 'goal_below_70';
    const day = new Date().getDay();
    if (day === 1) return 'weekly_start';
    return 'chat_opened';
  }, [daysToExam, userData, weeklyPct]);

  const alerts = useMemo<AlertItem[]>(() => {
    return [
      {
        id: 1,
        icon: '⚠️',
        title: `${weakArea} com baixa frequência`,
        body: `Essa área está entre as menos praticadas. Recomendo 20 minutos hoje para recuperar ritmo.`,
        action: `Iniciar foco em ${weakArea}`,
        level: 'urgent',
      },
      {
        id: 2,
        icon: '💡',
        title: `Meta semanal em ${weeklyPct}%`,
        body: weeklyPct >= 50
          ? 'Bom progresso. Manter sessões curtas diárias deve garantir sua meta.'
          : 'Você ainda está abaixo do ideal. Vale priorizar 2 sessões extras até sexta.',
        action: 'Ajustar plano da semana',
        level: 'info',
      },
      {
        id: 3,
        icon: '🚀',
        title: `${strongArea} em evolução`,
        body: `Seu melhor desempenho recente está em ${strongArea}. Use isso para ganhar XP com consistência.`,
        action: 'Continuar trilha forte',
        level: 'success',
      },
    ];
  }, [strongArea, weakArea, weeklyPct]);

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
        if (cancelled || cloudMessages.length === 0) {
          return;
        }

        const merged = mentorIAService.mergeMessages(localMessages, cloudMessages);
        setMessages(merged);
        mentorIAService.saveLocalMessages(userKey, merged);
      } catch {
        if (!cancelled) {
          toast('Histórico do Mentor carregado em modo local.');
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
      const result = await mentorBriefingService.getBriefing({
        userKey,
        objective: 'enem',
        examName: 'ENEM',
        daysToExam,
        level: weeklyPct >= 85 ? 'avancado' : weeklyPct >= 55 ? 'intermediario' : 'iniciante',
        strongPoints: [strongArea],
        weakPoints: [weakArea, secondWeakArea],
        recentFrequency: `${weeklyPct}% da meta semanal`,
        engineDecision,
        trigger,
      });

      if (cancelled) {
        return;
      }

      setBriefing(result.output);
      setBriefingSource(result.source);

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
    userKey,
    daysToExam,
    weeklyPct,
    strongArea,
    weakArea,
    secondWeakArea,
    engineDecision,
    trigger,
  ]);

  useEffect(() => {
    mentorIAService.saveLocalMessages(userKey, messages);
  }, [messages, userKey]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const respond = (text: string): string => {
    if (containsBlockedIntent(text)) {
      return 'Não posso orientar atalhos ou previsões de prova. Posso te orientar em estratégia real com base no seu plano atual.';
    }

    if (briefing) {
      if (text.toLowerCase().includes('hoje')) {
        return `Prioridade de hoje: ${briefing.prioridade}. ${briefing.acao_semana[0] || 'Siga o primeiro bloco planejado.'}`;
      }

      if (text.toLowerCase().includes('focar') || text.toLowerCase().includes('fraco')) {
        return `${briefing.justificativa} Ação prática: ${briefing.acao_semana.join(' | ')}`;
      }
    }

    const lower = text.toLowerCase();

    if (lower.includes('fraca') || lower.includes('dificuldade')) {
      return `Hoje suas áreas mais frágeis são ${weakArea} e ${secondWeakArea}. Minha sugestão: 15min em ${weakArea} antes de qualquer outra tarefa.`;
    }

    if (lower.includes('plano') || lower.includes('semana')) {
      return buildPlanMessage(weakArea, strongArea);
    }

    if (lower.includes('revisar') || lower.includes('hoje')) {
      return `Para hoje: 1) ${weakArea} (15min), 2) ${strongArea} (20min), 3) revisão leve (10min). Total: 45min.`;
    }

    if (lower.includes('consist') || lower.includes('streak')) {
      return `Seu streak está em ${userData.currentStreak || userData.streak} dias. Para manter: sessão mínima diária de 15min + revisão curta no fim do dia.`;
    }

    return `Entendi. Com ${daysToExam} dias para a prova, o melhor agora é constância diária e foco em ${weakArea}. Quer que eu monte um plano de 14 dias?`;
  };

  const handleFollowWeekAction = (action: string) => {
    setFollowedAction(action);
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
    toast.success('Ação registrada. Foque nela hoje.');
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
    if (!content) {
      return;
    }

    const userMessage = mentorIAService.createMessage('user', content);

    setInput('');
    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);

    trackEvent(
      'mentor_message_sent',
      {
        contentLength: content.length,
        hasQuickSuggestion: QUICK_SUGGESTIONS.includes(content),
      },
      { userEmail }
    );

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const assistantMessage = mentorIAService.createMessage('assistant', respond(content));

    setTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);

    if (cloudUserId && isSupabaseConfigured) {
      void Promise.all([
        mentorIAService.pushCloudMessage(cloudUserId, userMessage),
        mentorIAService.pushCloudMessage(cloudUserId, assistantMessage),
      ]).catch(() => {
        toast('Resposta salva localmente. A nuvem será sincronizada depois.');
      });
    }
  };

  const modeLabel = briefing?.tom === 'recovery'
    ? 'Recuperação de atraso'
    : briefing?.tom === 'reta_final'
      ? 'Foco em reta final'
      : 'Treinador estratégico';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mentor IA Proativo</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ações personalizadas para acelerar seu progresso semanal.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">🎯 {daysToExam}d para prova</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">🔥 {userData.currentStreak || userData.streak} dias</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {([
            { id: 'alertas', label: 'Alertas' },
            { id: 'analise', label: 'Análise Semanal' },
            { id: 'chat', label: 'Chat' },
          ] as Array<{ id: TabId; label: string }>).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                tab === item.id
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
              style={tab === item.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {briefing && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">📌 Briefing semanal do Mentor</p>
            <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-200">
              {modeLabel}
            </span>
          </div>

          <p className="text-sm text-gray-900 dark:text-white"><strong>Prioridade:</strong> {briefing.prioridade}</p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{briefing.justificativa}</p>
          <div className="space-y-1">
            {briefing.acao_semana.map((action) => (
              <button
                key={action}
                onClick={() => handleFollowWeekAction(action)}
                className={`w-full text-left text-xs rounded-md px-2 py-1 transition border ${
                  followedAction === action
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-transparent text-gray-700 dark:text-gray-200 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/20'
                }`}
              >
                • {action}
              </button>
            ))}
          </div>
          <p className="text-xs text-indigo-700 dark:text-indigo-200">{briefing.mensagem_motivacional}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Fonte: {briefingSource === 'llm' ? 'LLM' : 'Fallback determinístico'}</p>
        </div>
      )}

      {tab === 'alertas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl border p-4 ${colorByLevel[alert.level]}`}>
              <p className="text-lg mb-1">{alert.icon}</p>
              <h3 className="font-bold text-sm mb-1">{alert.title}</h3>
              <p className="text-xs leading-relaxed text-gray-300">{alert.body}</p>
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
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Meta semanal</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{weeklyPct}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{Math.round(weeklyDone / 60)}h {weeklyDone % 60}m de {Math.round(weeklyGoalMinutes / 60)}h</p>
          </div>

          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${weeklyPct}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }} />
          </div>

          <div className="space-y-2">
            {Object.entries(subjectMinutes).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados suficientes por matéria ainda. Conclua mais sessões para análise completa.</p>
            ) : (
              Object.entries(subjectMinutes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([subject, minutes]) => (
                  <div key={subject} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{subject}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{minutes} min</span>
                  </div>
                ))
            )}
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            <p className="font-semibold mb-1">💬 Análise do Mentor</p>
            <p>
              Bom avanço em <strong>{strongArea}</strong>. Para equilibrar desempenho, priorize <strong>{weakArea}</strong> nos próximos 3 dias.
            </p>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div ref={chatRef} className="h-[360px] overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {typing && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Mentor IA está digitando...</div>
            )}
          </div>

          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  void sendMessage(suggestion);
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void sendMessage();
                }
              }}
              placeholder="Pergunte ao seu Mentor IA..."
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none"
            />
            <button
              onClick={() => {
                void sendMessage();
              }}
              className="px-4 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
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
