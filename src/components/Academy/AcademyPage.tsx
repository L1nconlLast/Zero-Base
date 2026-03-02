import React from 'react';
import toast from 'react-hot-toast';
import { Crown, CheckCircle2, Lock, GraduationCap, AlertTriangle, TrendingUp } from 'lucide-react';
import type { AcademyContent, AcademyDepartment, AcademySubDepartment } from '../../types';
import { ACADEMY_CONTENT } from '../../data/academyContent';
import { useAcademyProgress } from '../../hooks/useAcademyProgress';
import { trackEvent } from '../../utils/analytics';

interface AcademyPageProps {
  userId?: string | null;
  userEmail?: string;
  preferredTrack?: 'enem' | 'concursos';
  completedContentIds: string[];
  onCompleteContent: (contentId: string, xpReward: number) => void;
  onRevertCompleteContent?: (contentId: string, xpReward: number) => void;
  onSyncTotalXp?: (newTotalXp: number) => void;
  onApplyMethod: (methodId: string) => void;
  isProUser: boolean;
}

const SUB_DEPARTMENTS_BY_DEPARTMENT: Record<AcademyDepartment, AcademySubDepartment[]> = {
  ENEM: ['Natureza', 'Humanas', 'Linguagens', 'Matemática', 'Redação'],
  Concursos: ['Bancas', 'Carreiras', 'Disciplinas Base', 'Legislação'],
};

const ENEM_STRATEGIC_PRIORITIES: AcademySubDepartment[] = ['Redação', 'Matemática', 'Linguagens'];

const RESOURCE_TYPE_META: Record<'video' | 'pdf' | 'questoes' | 'artigo', { label: string; className: string }> = {
  video: {
    label: 'Vídeo',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
  pdf: {
    label: 'PDF',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
  questoes: {
    label: 'Questões',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  artigo: {
    label: 'Artigo',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  },
};

const ContentCard: React.FC<{
  content: AcademyContent;
  completed: boolean;
  isProUser: boolean;
  onOpen: (content: AcademyContent) => void;
}> = ({ content, completed, isProUser, onOpen }) => {
  const locked = content.isPremium && !isProUser;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{content.title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {content.estimatedMinutes} min · +{content.xpReward} XP · {content.difficultyLevel}
          </p>
        </div>
        {content.isPremium ? (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> PRO</span>
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Grátis
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{content.preview}</p>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onOpen(content)}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Ver conteúdo
        </button>

        {completed && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</span>
        )}

        {locked && (
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Bloqueado</span>
        )}
      </div>
    </div>
  );
};

const AcademyPage: React.FC<AcademyPageProps> = ({
  userId = null,
  userEmail,
  preferredTrack = 'enem',
  completedContentIds,
  onCompleteContent,
  onRevertCompleteContent,
  onSyncTotalXp,
  onApplyMethod,
  isProUser,
}) => {
  const [selectedContent, setSelectedContent] = React.useState<AcademyContent | null>(null);
  const [activeDepartment, setActiveDepartment] = React.useState<AcademyDepartment>('ENEM');
  const [activeSubDepartment, setActiveSubDepartment] = React.useState<AcademySubDepartment>('Natureza');
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const notesStorageKey = React.useMemo(
    () => `mdz_academy_notes_${(userEmail || 'default').toLowerCase()}`,
    [userEmail]
  );
  const [notesByContentId, setNotesByContentId] = React.useState<Record<string, string>>(() => {
    try {
      const raw = window.localStorage.getItem(`mdz_academy_notes_${(userEmail || 'default').toLowerCase()}`);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw) as Record<string, string>;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const { handleCompleteContent, isLoadingContentId } = useAcademyProgress(userId);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(notesStorageKey, JSON.stringify(notesByContentId));
    } catch {
      // noop
    }
  }, [notesStorageKey, notesByContentId]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (!raw) {
        setNotesByContentId({});
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, string>;
      setNotesByContentId(typeof parsed === 'object' && parsed !== null ? parsed : {});
    } catch {
      setNotesByContentId({});
    }
  }, [notesStorageKey]);

  React.useEffect(() => {
    const [firstSubDepartment] = SUB_DEPARTMENTS_BY_DEPARTMENT[activeDepartment];
    setActiveSubDepartment(firstSubDepartment);
  }, [activeDepartment]);

  React.useEffect(() => {
    setActiveDepartment(preferredTrack === 'enem' ? 'ENEM' : 'Concursos');
  }, [preferredTrack]);

  const departmentContent = React.useMemo(
    () => ACADEMY_CONTENT.filter((content) => content.department === activeDepartment),
    [activeDepartment]
  );

  const subDepartmentContent = React.useMemo(
    () => departmentContent.filter((content) => content.subDepartment === activeSubDepartment),
    [departmentContent, activeSubDepartment]
  );

  const subDepartmentStats = React.useMemo(
    () =>
      SUB_DEPARTMENTS_BY_DEPARTMENT[activeDepartment]
        .map((subDepartment) => {
          const items = departmentContent.filter((content) => content.subDepartment === subDepartment);
          const totalTracks = items.length;
          const completedTracks = items.filter((content) => completedContentIds.includes(content.id)).length;
          const completionRate = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
          const totalXp = items.reduce((sum, content) => sum + content.xpReward, 0);
          const completedXp = items
            .filter((content) => completedContentIds.includes(content.id))
            .reduce((sum, content) => sum + content.xpReward, 0);

          return {
            subDepartment,
            totalTracks,
            completedTracks,
            completionRate,
            totalXp,
            completedXp,
          };
        })
        .sort((a, b) => {
          if (activeDepartment === 'ENEM') {
            const aPriorityIndex = ENEM_STRATEGIC_PRIORITIES.indexOf(a.subDepartment);
            const bPriorityIndex = ENEM_STRATEGIC_PRIORITIES.indexOf(b.subDepartment);

            if (aPriorityIndex !== -1 && bPriorityIndex === -1) {
              return -1;
            }

            if (bPriorityIndex !== -1 && aPriorityIndex === -1) {
              return 1;
            }

            if (aPriorityIndex !== -1 && bPriorityIndex !== -1) {
              return aPriorityIndex - bPriorityIndex;
            }
          }

          if (a.completionRate !== b.completionRate) {
            return a.completionRate - b.completionRate;
          }

          return b.totalTracks - a.totalTracks;
        }),
    [activeDepartment, departmentContent, completedContentIds]
  );

  const freeContent = React.useMemo(
    () => subDepartmentContent.filter((content) => !content.isPremium),
    [subDepartmentContent]
  );

  const proContent = React.useMemo(
    () => subDepartmentContent.filter((content) => content.isPremium),
    [subDepartmentContent]
  );

  const departmentSummary = React.useMemo(() => {
    const totalTracks = departmentContent.length;
    const completedTracks = departmentContent.filter((content) => completedContentIds.includes(content.id)).length;
    const completionRate = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
    const totalXp = departmentContent.reduce((sum, content) => sum + content.xpReward, 0);
    const completedXp = departmentContent
      .filter((content) => completedContentIds.includes(content.id))
      .reduce((sum, content) => sum + content.xpReward, 0);

    return {
      totalTracks,
      completedTracks,
      completionRate,
      totalXp,
      completedXp,
    };
  }, [departmentContent, completedContentIds]);

  const priorityFocus = React.useMemo(
    () => subDepartmentStats.slice(0, activeDepartment === 'ENEM' ? 3 : 2),
    [subDepartmentStats, activeDepartment]
  );

  const handleToggleChecklist = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyNotes = async (contentId: string) => {
    const note = notesByContentId[contentId] || '';

    if (!note.trim()) {
      toast('Não há anotações para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(note);
      toast.success('Anotações copiadas para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar as anotações agora.');
    }
  };

  const handleDownloadNotes = (contentId: string, title: string) => {
    const note = notesByContentId[contentId] || '';

    if (!note.trim()) {
      toast('Não há anotações para exportar.');
      return;
    }

    const safeTitle = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `anotacoes-${safeTitle || 'academia'}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    toast.success('Arquivo de anotações baixado.');
  };

  const handleImportNotes = (contentId: string, file?: File | null) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast.error('Selecione um arquivo .txt válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const importedText = typeof reader.result === 'string' ? reader.result : '';
      setNotesByContentId((prev) => ({
        ...prev,
        [contentId]: importedText,
      }));
      toast.success('Anotações importadas com sucesso.');
    };
    reader.onerror = () => {
      toast.error('Falha ao importar arquivo de anotações.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleComplete = async (content: AcademyContent) => {
    if (completedContentIds.includes(content.id)) {
      toast('Conteúdo já concluído anteriormente.');
      return;
    }

    const isFirstAcademyCompletion = completedContentIds.length === 0;

    try {
      const result = await handleCompleteContent(
        content.id,
        () => onCompleteContent(content.id, content.xpReward),
        () => onRevertCompleteContent?.(content.id, content.xpReward),
        onSyncTotalXp
      );

      if (result.status === 'saved') {
        if (isFirstAcademyCompletion) {
          trackEvent(
            'primeiro_conteudo_academia_concluido',
            {
              contentId: content.id,
              xpReward: content.xpReward,
              mode: 'cloud',
            },
            { userEmail }
          );
        }
        toast.success(`+${content.xpReward} XP recebido!`);
        return;
      }

      if (result.status === 'already_completed') {
        toast('Conteúdo já concluído no servidor. XP não alterado.');
        return;
      }

      if (result.status === 'blocked') {
        toast.error(result.message || 'Conteúdo bloqueado para seu plano atual.');
        return;
      }

      if (isFirstAcademyCompletion) {
        trackEvent(
          'primeiro_conteudo_academia_concluido',
          {
            contentId: content.id,
            xpReward: content.xpReward,
            mode: 'offline_fallback',
          },
          { userEmail }
        );
      }

      toast('Progresso salvo localmente. Vamos sincronizar com a nuvem quando possível.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar progresso.';
      toast.error(errorMessage);
    }
  };

  const locked = selectedContent?.isPremium && !isProUser;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 inline-flex items-center gap-2"><GraduationCap className="w-6 h-6" /> Academia de Estudo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Estrutura por departamentos para escala de grande porte: ENEM e Concursos.
        </p>

        <div className="mt-4 inline-flex rounded-xl bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-700">
          {(['ENEM', 'Concursos'] as AcademyDepartment[]).map((department) => (
            <button
              key={department}
              onClick={() => setActiveDepartment(department)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeDepartment === department
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              style={activeDepartment === department ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {department}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Departamento ativo</p>
        <p className="text-lg font-bold text-slate-100 mt-1">{activeDepartment}</p>

        <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Trilhas</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{departmentSummary.completedTracks}/{departmentSummary.totalTracks}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Conclusão</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{departmentSummary.completionRate}%</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">XP conquistado</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{departmentSummary.completedXp}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">XP potencial</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{departmentSummary.totalXp}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-700/30 bg-amber-950/20 p-3">
          <p className="text-xs font-semibold text-amber-200 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Prioridade de intervenção
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {priorityFocus.map((item) => (
              <button
                key={item.subDepartment}
                onClick={() => setActiveSubDepartment(item.subDepartment)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-700/40 bg-amber-900/30 text-amber-100 hover:bg-amber-900/40"
              >
                {item.subDepartment} · {item.completionRate}%
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {subDepartmentStats.map((stat, index) => {
            const isStrategicPriority =
              activeDepartment === 'ENEM'
                ? ENEM_STRATEGIC_PRIORITIES.includes(stat.subDepartment)
                : index < 2;

            return (
              <button
                key={stat.subDepartment}
                onClick={() => setActiveSubDepartment(stat.subDepartment)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  activeSubDepartment === stat.subDepartment
                    ? 'text-white border-transparent'
                    : 'text-slate-200 border-slate-700 bg-slate-800'
                }`}
                style={activeSubDepartment === stat.subDepartment ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold tracking-tight">{stat.subDepartment}</p>
                  {isStrategicPriority && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-950/40 text-amber-200 inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {activeDepartment === 'ENEM' ? 'Prioridade estratégica' : 'Prioridade alta'}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 opacity-90">{stat.completedTracks}/{stat.totalTracks} trilhas · {stat.completionRate}%</p>
                <p className="text-xs mt-1 opacity-90">XP: {stat.completedXp}/{stat.totalXp}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trilhas Gratuitas</h3>
        {freeContent.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            Não há trilhas gratuitas para {activeSubDepartment} neste momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                completed={completedContentIds.includes(content.id)}
                isProUser={isProUser}
                onOpen={setSelectedContent}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Crown className="w-4 h-4" /> Trilhas PRO</h3>
        {proContent.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            Não há trilhas PRO para {activeSubDepartment} neste momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proContent.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                completed={completedContentIds.includes(content.id)}
                isProUser={isProUser}
                onOpen={setSelectedContent}
              />
            ))}
          </div>
        )}
      </div>

      {selectedContent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedContent.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedContent.estimatedMinutes} min · +{selectedContent.xpReward} XP · {selectedContent.category}
                </p>
              </div>
              <button
                onClick={() => setSelectedContent(null)}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                Fechar
              </button>
            </div>

            {locked ? (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4">
                <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2 inline-flex items-center gap-2"><Lock className="w-4 h-4" /> Conteúdo PRO</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">{selectedContent.preview}</p>
                <button
                  onClick={() => toast('Fluxo de assinatura PRO será o próximo passo.')}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold"
                >
                  Desbloquear PRO
                </button>
              </div>
            ) : (
              <>
                {selectedContent.modules
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((module) => (
                    <div key={module.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2">{module.moduleName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{module.moduleText}</p>

                      {module.studyMaterial && module.studyMaterial.length > 0 && (
                        <div className="mb-3 space-y-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">Material de apoio</p>
                          {module.studyMaterial.map((material) => (
                            <div key={`${module.id}-${material.title}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{material.title}</p>
                                {material.resourceType && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${RESOURCE_TYPE_META[material.resourceType].className}`}>
                                    {RESOURCE_TYPE_META[material.resourceType].label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{material.content}</p>
                              {material.linkUrl && (
                                <a
                                  href={material.linkUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex mt-2 text-xs font-semibold"
                                  style={{ color: 'var(--color-primary)' }}
                                >
                                  {material.linkLabel || 'Abrir material'}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        {module.checklist.map((item, index) => {
                          const checklistId = `${module.id}-${index}`;
                          return (
                            <label key={checklistId} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedItems[checklistId])}
                                onChange={() => handleToggleChecklist(checklistId)}
                                className="mt-0.5"
                              />
                              <span>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 dark:text-white">Bloco de notas</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyNotes(selectedContent.id)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadNotes(selectedContent.id, selectedContent.title)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        Baixar .txt
                      </button>
                      <button
                        type="button"
                        onClick={() => importInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        Importar .txt
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">salvo automaticamente</span>
                    </div>
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      handleImportNotes(selectedContent.id, file);
                      event.target.value = '';
                    }}
                  />
                  <textarea
                    value={notesByContentId[selectedContent.id] || ''}
                    onChange={(event) =>
                      setNotesByContentId((prev) => ({
                        ...prev,
                        [selectedContent.id]: event.target.value,
                      }))
                    }
                    placeholder="Anote insights, fórmulas, dúvidas e pontos para revisar depois..."
                    className="w-full min-h-[140px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 p-3"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleComplete(selectedContent)}
                    disabled={isLoadingContentId === selectedContent.id}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoadingContentId === selectedContent.id
                      ? 'Salvando...'
                      : `Concluir conteúdo (+${selectedContent.xpReward} XP)`}
                  </button>

                  {selectedContent.applyMethodId && (
                    <button
                      onClick={() => {
                        onApplyMethod(selectedContent.applyMethodId!);
                        setSelectedContent(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                    >
                      Aplicar agora
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyPage;
