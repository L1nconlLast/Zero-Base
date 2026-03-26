import React, { useMemo, useRef, useState } from 'react';
import {
  Zap,
  Trophy,
  BookOpen,
  Brain,
  Clock,
  ChevronRight,
  CheckCircle,
  Languages,
  Globe2,
  Microscope,
  Calculator,
  PenTool,
} from 'lucide-react';

interface EveOfExamPageProps {
  onStartQuiz?: (subject?: string) => void;
  onStartFlashcards?: () => void;
  onStartTimer?: () => void;
}

const TOPICS_REVIEW = [
  {
    subject: 'Linguagens',
    icon: Languages,
    key_points: [
      'Interpretação de texto: identificar tese e argumento central',
      'Reconhecer função de figuras de linguagem no contexto',
      'Relacionar linguagem verbal e não verbal em tirinhas/anúncios',
      'Revisar coesão e coerência em textos dissertativos',
      'Identificar variação linguística sem julgamento normativo',
    ],
  },
  {
    subject: 'Ciências Humanas',
    icon: Globe2,
    key_points: [
      'Revisar processos históricos do Brasil (Colônia → República)',
      'Interpretar temas de geopolítica contemporânea',
      'Relacionar cidadania, Estado e direitos fundamentais',
      'Identificar conceitos de sociologia em situações práticas',
      'Reconhecer correntes filosóficas e suas contribuições',
    ],
  },
  {
    subject: 'Ciências da Natureza',
    icon: Microscope,
    key_points: [
      'Revisar leitura de gráficos e experimentos em Física',
      'Identificar funções orgânicas e reações mais cobradas em Química',
      'Conectar ecologia, genética e fisiologia em Biologia',
      'Revisar energia, trabalho e potência com foco em aplicação',
      'Conferir balanceamento e interpretação de equações químicas',
    ],
  },
  {
    subject: 'Matemática',
    icon: Calculator,
    key_points: [
      'Funções (afim e quadrática): leitura e interpretação de gráfico',
      'Razão, proporção e porcentagem em problemas contextualizados',
      'Geometria plana: áreas e perímetros mais frequentes',
      'Probabilidade básica e análise combinatória essencial',
      'Estatística: média, mediana e desvio com leitura de tabelas',
    ],
  },
  {
    subject: 'Português',
    icon: BookOpen,
    key_points: [
      'Concordância verbal e nominal em estruturas frequentes',
      'Regência e uso de crase em contextos de prova',
      'Pontuação e efeitos de sentido no período composto',
      'Classes de palavras e funções sintáticas principais',
      'Interpretação textual com foco em inferência',
    ],
  },
  {
    subject: 'Redação',
    icon: PenTool,
    key_points: [
      'Estruturar introdução com tese clara e recorte temático',
      'Construir repertório sociocultural pertinente ao tema',
      'Manter progressão argumentativa em cada parágrafo',
      'Evitar fuga ao tema e garantir coesão textual',
      'Fechar com proposta de intervenção completa (agente, ação, meio e finalidade)',
    ],
  },
] as const;

const EveOfExamPage: React.FC<EveOfExamPageProps> = ({ onStartQuiz, onStartFlashcards, onStartTimer }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [supportOpen, setSupportOpen] = useState(false);
  const checklistRef = useRef<HTMLDivElement | null>(null);

  const toggleCheck = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalItems = TOPICS_REVIEW.reduce((sum, topic) => sum + topic.key_points.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const remainingCount = totalItems - checkedCount;
  const pct = Math.round((checkedCount / totalItems) * 100);
  const nextMilestone = Math.max(0, remainingCount);

  const missionCopy = useMemo(() => {
    if (pct === 100) {
      return {
        eyebrow: 'Missão final concluída',
        title: 'Você concluiu sua revisão final',
        subtitle: 'Agora é só preservar energia e entrar na prova com clareza.',
      };
    }

    if (remainingCount <= 3) {
      return {
        eyebrow: 'Quase lá',
        title: `Faltam só ${remainingCount} pontos críticos`,
        subtitle: 'Feche esses últimos pontos e você encerra sua reta final com segurança.',
      };
    }

    return {
      eyebrow: 'Modo Véspera ativado',
      title: 'Última revisão antes da prova',
      subtitle: 'Entre em fluxo único, percorra os pontos mais críticos e termine essa reta final sem dispersão.',
    };
  }, [pct, remainingCount]);

  const progressCopy = useMemo(() => {
    if (pct === 100) {
      return 'Tudo foi revisado. Sua véspera já está fechada.';
    }

    if (checkedCount === 0) {
      return `Você ainda não começou. São ${totalItems} pontos críticos nesta sessão final.`;
    }

    if (remainingCount <= 3) {
      return `Você completou ${checkedCount} de ${totalItems} pontos críticos. Restam ${remainingCount} para fechar a véspera.`;
    }

    return `Você completou ${checkedCount} de ${totalItems} pontos críticos. Restam ${nextMilestone} para encerrar essa revisão final.`;
  }, [checkedCount, nextMilestone, pct, remainingCount, totalItems]);

  const handleStartMission = () => {
    checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.2),transparent_26%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_24%),linear-gradient(180deg,rgba(88,28,135,0.92),rgba(15,23,42,0.98))] p-6 shadow-[0_32px_120px_rgba(76,29,149,0.28)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">
              <Zap className="h-3.5 w-3.5" />
              {missionCopy.eyebrow}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                {missionCopy.title}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                {missionCopy.subtitle}
              </p>
            </div>

            <div className="max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/85">
                    Sessão única de reta final
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {progressCopy}
                  </p>
                </div>

                <button
                  onClick={handleStartMission}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-lg font-semibold text-slate-950 transition hover:bg-amber-300 sm:w-auto sm:min-w-[320px]"
                >
                  <Zap className="h-5 w-5" />
                  {pct === 100 ? 'Ver revisão concluída' : 'Começar revisão final'}
                </button>

                <p className="text-sm text-white/75">
                  Sem escolher modo, sem abrir outras rotas. Agora é só percorrer os pontos críticos e fechar a véspera.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 self-start">
            <div className="rounded-[24px] border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Progresso vivo</p>
              <p className="mt-2 text-5xl font-semibold text-white">{checkedCount}</p>
              <p className="mt-1 text-sm text-white/75">pontos concluídos de {totalItems}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-amber-300 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                <p className="text-2xl font-semibold text-white">{remainingCount}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-amber-100/75">Restantes</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-2xl font-semibold text-white">{pct}%</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/65">Feito</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
              {remainingCount > 0
                ? `Você está a ${remainingCount} pontos de encerrar sua preparação final.`
                : 'Sua reta final está concluída. Preserve energia e vá descansado.'}
            </div>
          </div>
        </div>
      </div>

      <div ref={checklistRef} className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.28)]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Checklist final</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {pct === 100 ? 'Tudo pronto para a prova' : 'Percorra os pontos críticos sem sair do ritmo'}
            </h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            {checkedCount}/{totalItems} pontos marcados
          </div>
        </div>

        <div className="space-y-3">
          {TOPICS_REVIEW.map((topic) => {
            const TopicIcon = topic.icon;
            const checkedInTopic = topic.key_points.filter((_, index) => checked[`${topic.subject}-${index}`]).length;
            const allDone = checkedInTopic === topic.key_points.length;

            return (
              <div
                key={topic.subject}
                className={`rounded-[24px] border p-4 transition ${
                  allDone
                    ? 'border-emerald-400/30 bg-emerald-400/10 shadow-[0_16px_50px_rgba(16,185,129,0.12)]'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-2 ${allDone ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.05] text-slate-200'}`}>
                      <TopicIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{topic.subject}</h3>
                      <p className="text-xs text-slate-400">
                        {allDone ? 'Capítulo concluído na sua revisão final.' : `${checkedInTopic} de ${topic.key_points.length} pontos críticos revisados.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        allDone
                          ? 'bg-emerald-400/15 text-emerald-100'
                          : 'bg-white/[0.05] text-slate-300'
                      }`}
                    >
                      {checkedInTopic}/{topic.key_points.length}
                    </span>
                    {allDone ? <CheckCircle className="h-4 w-4 text-emerald-300" /> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  {topic.key_points.map((point, index) => {
                    const key = `${topic.subject}-${index}`;
                    const isChecked = checked[key];

                    return (
                      <button
                        key={key}
                        onClick={() => toggleCheck(key)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          isChecked
                            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50'
                            : 'border-white/5 bg-white/[0.02] text-slate-200 hover:border-white/10 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            isChecked
                              ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                              : 'border-slate-500 bg-transparent text-transparent'
                          }`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </div>
                        <span className={isChecked ? 'line-through opacity-75' : ''}>{point}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <button
          onClick={() => setSupportOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Ferramentas de apoio</p>
            <p className="mt-1 text-sm text-slate-300">Use só se precisar sair da trilha principal da véspera.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-slate-300">
            {supportOpen ? 'Ocultar' : 'Mostrar'}
            <ChevronRight className={`h-4 w-4 transition ${supportOpen ? 'rotate-90' : ''}`} />
          </span>
        </button>

        {supportOpen && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => onStartQuiz?.()}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-slate-200 transition hover:border-blue-400/30 hover:bg-blue-400/10"
            >
              <Brain className="h-6 w-6 text-blue-300" />
              Quiz rápido
            </button>
            <button
              onClick={onStartFlashcards}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-400/10"
            >
              <BookOpen className="h-6 w-6 text-violet-300" />
              Flashcards
            </button>
            <button
              onClick={onStartTimer}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              <Clock className="h-6 w-6 text-emerald-300" />
              Pomodoro
            </button>
          </div>
        )}
      </div>

      {pct === 100 ? (
        <div className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-6 text-center shadow-[0_24px_90px_rgba(16,185,129,0.16)]">
          <div className="mb-3 flex justify-center">
            <Trophy className="h-12 w-12 text-emerald-300" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200/85">Sessão encerrada</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Você concluiu sua revisão final</h3>
          <p className="mt-2 text-sm text-emerald-100/80">
            Agora é hora de preservar a cabeça, descansar e entrar na prova com a sensação de que a reta final foi cumprida.
          </p>
        </div>
      ) : checkedCount > 0 ? (
        <div className="rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-5 text-amber-50 shadow-[0_20px_80px_rgba(245,158,11,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/80">Avanço real</p>
          <p className="mt-2 text-xl font-semibold">
            Você já avançou {checkedCount} ponto{checkedCount > 1 ? 's' : ''} crítico{checkedCount > 1 ? 's' : ''}.
          </p>
          <p className="mt-1 text-sm text-amber-50/80">
            Continue daqui se quiser fechar tudo agora. Se parar, você já sai melhor do que entrou.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default EveOfExamPage;
