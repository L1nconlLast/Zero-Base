import React from 'react';
import { BrainCircuit, Target, Gauge, Timer, AlertTriangle, CheckCircle2, CalendarClock, Sparkles } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { MateriaTipo } from '../../types';
import { MATERIAS } from '../../constants';
import {
  adaptiveLearningService,
  type DifficultyLevel,
  type AdaptiveSnapshot,
  type SmartTrainingItem,
  type StudyTrack,
} from '../../services/adaptiveLearning.service';
import { adaptiveCloudService } from '../../services/adaptiveCloud.service';
import { isSupabaseConfigured } from '../../services/supabase.client';
import toast from 'react-hot-toast';
import { getDisplayDiscipline } from '../../utils/disciplineLabels';

interface AdaptiveInsightsPageProps {
  userKey: string;
  cloudUserId?: string | null;
  preferredTrack?: StudyTrack;
  hybridEnemWeight?: number;
}

const difficultyOptions: Array<{ value: DifficultyLevel; label: string }> = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Média' },
  { value: 'hard', label: 'Difícil' },
];

const formatDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdaptiveInsightsPage: React.FC<AdaptiveInsightsPageProps> = ({
  userKey,
  cloudUserId = null,
  preferredTrack = 'enem',
  hybridEnemWeight = 70,
}) => {
  const [snapshot, setSnapshot] = React.useState<AdaptiveSnapshot>(() => adaptiveLearningService.getSnapshot(userKey));
  const [subject, setSubject] = React.useState<MateriaTipo>('Anatomia');
  const [topic, setTopic] = React.useState('');
  const [difficulty, setDifficulty] = React.useState<DifficultyLevel>('medium');
  const [correct, setCorrect] = React.useState(true);
  const [responseTimeSeconds, setResponseTimeSeconds] = React.useState(45);
  const [smartTraining, setSmartTraining] = React.useState<SmartTrainingItem[]>([]);
  const [isSyncingCloud, setIsSyncingCloud] = React.useState(false);

  React.useEffect(() => {
    setSnapshot(adaptiveLearningService.getSnapshot(userKey));
  }, [userKey]);

  React.useEffect(() => {
    if (!cloudUserId || !isSupabaseConfigured) {
      return;
    }

    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        setIsSyncingCloud(true);
        const cloudAttempts = await adaptiveCloudService.listByUser(cloudUserId);

        if (cancelled) {
          return;
        }

        if (cloudAttempts.length > 0) {
          const merged = adaptiveLearningService.mergeAttempts(userKey, cloudAttempts);
          setSnapshot(merged);

          await adaptiveCloudService.syncDerivedData(cloudUserId, merged);
        }
      } catch {
        if (!cancelled) {
          toast('Modo offline ativo para IA adaptativa.');
        }
      } finally {
        if (!cancelled) {
          setIsSyncingCloud(false);
        }
      }
    };

    void hydrateFromCloud();

    return () => {
      cancelled = true;
    };
  }, [cloudUserId, userKey]);

  const handleAddAttempt = (event: React.FormEvent) => {
    event.preventDefault();

    if (!topic.trim()) {
      return;
    }

    const nextSnapshot = adaptiveLearningService.recordAttempt(userKey, {
      subject,
      topic,
      difficulty,
      correct,
      responseTimeSeconds,
    });

    setSnapshot(nextSnapshot);
    setTopic('');
    setResponseTimeSeconds(45);
    setSmartTraining([]);

    if (cloudUserId && isSupabaseConfigured && nextSnapshot.attempts[0]) {
      void adaptiveCloudService.create(cloudUserId, nextSnapshot.attempts[0]).catch(() => {
        toast('Tentativa salva localmente. A sincronização com nuvem será retomada automaticamente.');
      });

      void adaptiveCloudService.syncDerivedData(cloudUserId, nextSnapshot).catch(() => {
        toast('Métricas adaptativas ficaram locais por enquanto. Vamos sincronizar na próxima conexão.');
      });
    }
  };

  const handleGenerateSmartTraining = () => {
    const generatedPlan = adaptiveLearningService.generateSmartTraining(
      userKey,
      4,
      preferredTrack,
      hybridEnemWeight
    );
    setSmartTraining(generatedPlan);
  };

  const criticalWeaknesses = snapshot.topicMetrics.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-6 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)]">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 inline-flex items-center gap-2">
          <BrainCircuit className="w-6 h-6" /> Inteligência Adaptativa
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Registre tentativas de questões para o sistema aprender padrões, identificar fraquezas e gerar revisão espaçada automática.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Estratégia ativa: {
            preferredTrack === 'enem'
              ? 'ENEM'
              : preferredTrack === 'concursos'
                ? 'Concurso'
                : `Híbrido (${hybridEnemWeight}% ENEM / ${100 - hybridEnemWeight}% Concurso)`
          }
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {isSyncingCloud
            ? 'Sincronizando IA com nuvem...'
            : cloudUserId && isSupabaseConfigured
              ? 'Sincronização com nuvem ativa.'
              : 'Operando em modo local (offline-first).'}
        </p>
      </div>

      <form onSubmit={handleAddAttempt} className="rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-100">Registrar nova tentativa</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Matéria</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as MateriaTipo)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm"
            >
              {MATERIAS.map((value) => (
                <option key={value} value={value}>{getDisplayDiscipline(value).label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Tópico</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex.: Função do 2º grau"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Dificuldade</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as DifficultyLevel)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm"
            >
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Tempo (s)</span>
            <input
              type="number"
              min={1}
              max={600}
              value={responseTimeSeconds}
              onChange={(event) => setResponseTimeSeconds(Number(event.target.value))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCorrect(true)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${correct ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}
          >
            Acerto
          </button>
          <button
            type="button"
            onClick={() => setCorrect(false)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${!correct ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}
          >
            Erro
          </button>

          <button
            type="submit"
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Salvar tentativa
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Target} label="Acurácia global" value={`${snapshot.summary.globalAccuracyRate}%`} />
        <MetricCard icon={Gauge} label="Tentativas" value={`${snapshot.summary.totalAttempts}`} />
        <MetricCard icon={Timer} label="Tempo médio" value={`${snapshot.summary.averageResponseTimeSeconds}s`} />
        <MetricCard icon={AlertTriangle} label="Tópicos fracos" value={`${snapshot.summary.weakTopics}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard icon={AlertTriangle} label="Inconsistência (TRI)" value={`${snapshot.summary.inconsistencyRate}%`} />
        <MetricCard icon={Gauge} label="Nota estimada ENEM" value={snapshot.summary.estimatedEnemScore > 0 ? `${snapshot.summary.estimatedEnemScore}` : '--'} />
      </div>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-slate-100">Evolução semanal</h3>
          <button
            type="button"
            onClick={handleGenerateSmartTraining}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Sparkles className="w-4 h-4" /> Gerar treino inteligente
          </button>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshot.weeklyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="accuracyRate" name="Acurácia %" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="attempts" name="Tentativas" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 space-y-3">
        <h3 className="text-lg font-bold text-slate-100">Fraquezas críticas detectadas</h3>
        {criticalWeaknesses.length === 0 ? (
          <p className="text-sm text-slate-400">Ainda sem dados suficientes para detectar fraquezas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {criticalWeaknesses.map((metric) => (
              <div key={metric.key} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-sm font-semibold text-slate-100">{getDisplayDiscipline(metric.subject).label} · {metric.topic}</p>
                <p className="text-xs text-slate-400 mt-1">Prioridade: {metric.priorityScore}</p>
                <p className="text-xs text-slate-400 mt-1">Erro: {metric.errorRate}% · Última revisão: {formatDate(metric.lastReviewedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {smartTraining.length > 0 && (
        <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 space-y-3">
          <h3 className="text-lg font-bold text-slate-100">
            Treino inteligente gerado ({
              preferredTrack === 'enem'
                ? 'ENEM'
                : preferredTrack === 'concursos'
                  ? 'Concurso'
                  : `Híbrido ${hybridEnemWeight}/${100 - hybridEnemWeight}`
            })
          </h3>
          <div className="space-y-2">
            {smartTraining.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-sm font-semibold text-slate-100">{getDisplayDiscipline(item.subject).label} · {item.topic}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {item.questionCount} questões · Dificuldade sugerida: {difficultyOptions.find((option) => option.value === item.recommendedDifficulty)?.label}
                </p>
                <p className="text-xs text-slate-300 mt-1">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 space-y-3">
          <h3 className="text-lg font-bold text-slate-100">Domínio por tópico</h3>
          {snapshot.topicMetrics.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados ainda. Registre algumas tentativas para gerar análise adaptativa.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {snapshot.topicMetrics.map((metric) => (
                <div key={metric.key} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100 text-sm">{getDisplayDiscipline(metric.subject).label} · {metric.topic}</p>
                    <span className={`text-xs px-2 py-1 rounded-full border ${metric.status === 'weak'
                      ? 'text-amber-300 border-amber-700/40 bg-amber-950/30'
                      : metric.status === 'developing'
                        ? 'text-sky-300 border-sky-700/40 bg-sky-950/30'
                        : 'text-emerald-300 border-emerald-700/40 bg-emerald-950/30'
                      }`}>
                      {metric.status === 'weak' ? 'Foco' : metric.status === 'developing' ? 'Evolução' : 'Dominado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Score: {metric.weightedDomainScore} · Prioridade: {metric.priorityScore} · Erro: {metric.errorRate}% · Tempo médio: {metric.averageResponseTimeSeconds}s
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 space-y-3">
          <h3 className="text-lg font-bold text-slate-100 inline-flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Revisão espaçada sugerida
          </h3>
          {snapshot.reviewPlan.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma revisão pendente no momento. Continue registrando tentativas.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {snapshot.reviewPlan.slice(0, 16).map((reviewItem) => (
                <div key={reviewItem.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <p className="text-sm font-semibold text-slate-100">
                    {getDisplayDiscipline(reviewItem.subject).label} · {reviewItem.topic}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Etapa {reviewItem.reviewStage} · {formatDate(reviewItem.scheduledFor)}</p>
                  <p className="text-xs text-slate-300 mt-1">{reviewItem.reason}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5">
        <h3 className="text-lg font-bold text-slate-100 mb-3 inline-flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Últimas tentativas
        </h3>
        {snapshot.attempts.length === 0 ? (
          <p className="text-sm text-slate-400">Sem histórico ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {snapshot.attempts.slice(0, 10).map((attempt) => (
              <div key={attempt.id} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm flex items-center justify-between gap-2">
                <div>
                  <p className="text-slate-100 font-medium">{getDisplayDiscipline(attempt.subject).label} · {attempt.topic}</p>
                  <p className="text-xs text-slate-400">{difficultyOptions.find((option) => option.value === attempt.difficulty)?.label} · {attempt.responseTimeSeconds}s · {formatDate(attempt.createdAt)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${attempt.correct
                  ? 'text-emerald-300 border-emerald-700/40 bg-emerald-950/30'
                  : 'text-amber-300 border-amber-700/40 bg-amber-950/30'} `}>
                  {attempt.correct ? 'Acerto' : 'Erro'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-700/70 bg-slate-900 p-4 shadow-[0_10px_28px_-18px_rgba(2,6,23,0.95)]">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-100 tracking-tight">{value}</p>
  </div>
);

export default AdaptiveInsightsPage;
