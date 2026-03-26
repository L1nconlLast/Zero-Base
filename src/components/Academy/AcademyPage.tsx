import React from 'react';
import toast from 'react-hot-toast';
import { Crown, CheckCircle2, Lock, GraduationCap, PlayCircle, Target } from 'lucide-react';
import type { AcademyContent, AcademyDepartment, AcademySubDepartment } from '../../types';
import { ACADEMY_CONTENT } from '../../data/academyContent';
import { useAcademyProgress } from '../../hooks/useAcademyProgress';
import {
  DEPARTMENT_MISSION_HEURISTIC_VERSION,
  getDepartmentMissionState,
} from '../../services/departmentMission.service';
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
  onStartStudyNow?: (payload: { subDepartment: AcademySubDepartment; contentTitle: string; methodId?: string }) => void;
  currentStreak?: number;
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
  onStartStudyNow,
  currentStreak = 0,
  isProUser,
}) => {
  const [selectedContent, setSelectedContent] = React.useState<AcademyContent | null>(null);
  const [activeDepartment, setActiveDepartment] = React.useState<AcademyDepartment>('ENEM');
  const [activeSubDepartment, setActiveSubDepartment] = React.useState<AcademySubDepartment>('Natureza');
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isProgressAnimated, setIsProgressAnimated] = React.useState(false);
  const focusViewStartedAtRef = React.useRef<number>(Date.now());
  const lastRecommendedSignatureRef = React.useRef<string | null>(null);
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
  const disciplineActivityStorageKey = React.useMemo(
    () => `mdz_academy_discipline_activity_${(userEmail || 'default').toLowerCase()}`,
    [userEmail],
  );
  const [disciplineActivity, setDisciplineActivity] = React.useState<Record<string, string>>(() => {
    try {
      const raw = window.localStorage.getItem(`mdz_academy_discipline_activity_${(userEmail || 'default').toLowerCase()}`);
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
      window.localStorage.setItem(disciplineActivityStorageKey, JSON.stringify(disciplineActivity));
    } catch {
      // noop
    }
  }, [disciplineActivityStorageKey, disciplineActivity]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(disciplineActivityStorageKey);
      if (!raw) {
        setDisciplineActivity({});
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, string>;
      setDisciplineActivity(typeof parsed === 'object' && parsed !== null ? parsed : {});
    } catch {
      setDisciplineActivity({});
    }
  }, [disciplineActivityStorageKey]);

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
    setIsProgressAnimated(false);
    const animationFrame = window.requestAnimationFrame(() => setIsProgressAnimated(true));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeDepartment]);

  React.useEffect(() => {
    setActiveDepartment(preferredTrack === 'enem' ? 'ENEM' : 'Concursos');
  }, [preferredTrack]);

  React.useEffect(() => {
    focusViewStartedAtRef.current = Date.now();
    trackEvent(
      'department_focus_viewed',
      {
        department: activeDepartment,
        streak: currentStreak,
      },
      { userEmail },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const markDisciplineInteraction = React.useCallback((subDepartment: AcademySubDepartment) => {
    setDisciplineActivity((prev) => ({
      ...prev,
      [subDepartment]: new Date().toISOString(),
    }));
  }, []);

  const smartSubDepartmentStats = React.useMemo(() => {
    const now = Date.now();

    return subDepartmentStats.map((stat, index) => {
      const lastActivityIso = disciplineActivity[stat.subDepartment] || null;
      const daysWithoutStudy = lastActivityIso
        ? Math.floor((now - new Date(lastActivityIso).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const isStrategicPriority =
        activeDepartment === 'ENEM'
          ? ENEM_STRATEGIC_PRIORITIES.includes(stat.subDepartment)
          : index < 2;

      const score =
        (daysWithoutStudy === null ? 10 : Math.min(10, daysWithoutStudy))
        + (100 - stat.completionRate) * 0.2
        + (isStrategicPriority ? 2 : 0);

      return {
        ...stat,
        lastActivityIso,
        daysWithoutStudy,
        isStrategicPriority,
        score,
      };
    });
  }, [subDepartmentStats, disciplineActivity, activeDepartment]);

  const missionState = React.useMemo(
    () =>
      getDepartmentMissionState(
        smartSubDepartmentStats.map((stat) => {
          const disciplineTracks = departmentContent.filter((content) => content.subDepartment === stat.subDepartment);
          const nextContent = disciplineTracks.find((content) => !completedContentIds.includes(content.id)) || disciplineTracks[0];

          return {
            subDepartment: stat.subDepartment,
            disciplineOrder: Math.max(0, SUB_DEPARTMENTS_BY_DEPARTMENT[activeDepartment].indexOf(stat.subDepartment)),
            totalTracks: stat.totalTracks,
            completedTracks: stat.completedTracks,
            completionRate: stat.completionRate,
            totalXp: stat.totalXp,
            completedXp: stat.completedXp,
            daysWithoutStudy: stat.daysWithoutStudy,
            isStrategicPriority: stat.isStrategicPriority,
            nextContentTitle: nextContent?.title || null,
          };
        }),
      ),
    [completedContentIds, departmentContent, smartSubDepartmentStats],
  );
  const missionDisciplineBySubDepartment = React.useMemo(
    () =>
      missionState.zones.reduce((acc, zone) => {
        zone.disciplines.forEach((discipline) => {
          acc[discipline.subDepartment] = discipline;
        });

        return acc;
      }, {} as Record<AcademySubDepartment, (typeof missionState.zones)[number]['disciplines'][number]>),
    [missionState.zones],
  );

  const estimatedDaysToFinish = React.useMemo(() => {
    const remainingTracks = Math.max(0, departmentSummary.totalTracks - departmentSummary.completedTracks);
    return remainingTracks * 4;
  }, [departmentSummary]);
  const activeDisciplineTracks = React.useMemo(
    () => departmentContent.filter((content) => content.subDepartment === activeSubDepartment),
    [activeSubDepartment, departmentContent],
  );
  const activeDisciplineMission = missionDisciplineBySubDepartment[activeSubDepartment] || null;
  const activeDisciplineNextTrack = React.useMemo(
    () => activeDisciplineTracks.find((content) => !completedContentIds.includes(content.id)) || activeDisciplineTracks[0] || null,
    [activeDisciplineTracks, completedContentIds],
  );

  React.useEffect(() => {
    const recommended = missionState.primaryFocus;
    if (!recommended) {
      return;
    }

    const signature = [
      activeDepartment,
      recommended.subDepartment,
      recommended.zone,
      recommended.priorityRank,
      recommended.decisionReasonCode,
      recommended.decisionReason,
      recommended.completionRate,
    ].join('|');

    if (lastRecommendedSignatureRef.current === signature) {
      return;
    }

    lastRecommendedSignatureRef.current = signature;
    focusViewStartedAtRef.current = Date.now();

    trackEvent(
      'department_focus_recommended',
      {
        department: activeDepartment,
        disciplineId: recommended.subDepartment,
        zone: recommended.zone,
        attentionScore: Number(recommended.attentionScore.toFixed(2)),
        completionRate: recommended.completionRate,
        isStrategicPriority: recommended.isStrategicPriority,
        heuristicVersion: DEPARTMENT_MISSION_HEURISTIC_VERSION,
        decisionReasonCode: recommended.decisionReasonCode,
        reason: recommended.decisionReason,
        recommendedRank: recommended.priorityRank,
        streak: currentStreak,
      },
      { userEmail },
    );
  }, [activeDepartment, currentStreak, missionState.primaryFocus, userEmail]);

  const handleOpenDiscipline = (subDepartment: AcademySubDepartment) => {
    markDisciplineInteraction(subDepartment);
    trackEvent(
      'academia_disciplina_expandida',
      {
        department: activeDepartment,
        subDepartment,
      },
      { userEmail },
    );
    setActiveSubDepartment(subDepartment);
  };

  const handleStudyDisciplineNow = (
    subDepartment: AcademySubDepartment,
    source: 'hero' | 'zone' | 'discipline_panel' = 'zone',
  ) => {
    const disciplineTracks = departmentContent.filter((content) => content.subDepartment === subDepartment);
    const nextContent = disciplineTracks.find((content) => !completedContentIds.includes(content.id)) || disciplineTracks[0];

    if (!nextContent) {
      toast('Não há trilhas disponíveis nessa disciplina no momento.');
      return;
    }

    markDisciplineInteraction(subDepartment);
    const stat = missionDisciplineBySubDepartment[subDepartment];
    const recommended = missionState.primaryFocus;
    const wasRecommended = recommended?.subDepartment === subDepartment;
    const elapsedMs = Date.now() - focusViewStartedAtRef.current;
    setActiveSubDepartment(subDepartment);

    trackEvent(
      'department_focus_clicked',
      {
        subject: subDepartment,
        source,
        status: stat?.zone || 'needs_attention',
        completion: stat?.completionRate || 0,
        wasRecommended,
        heuristicVersion: DEPARTMENT_MISSION_HEURISTIC_VERSION,
        recommendedSubject: recommended?.subDepartment || null,
        recommendedDecisionReasonCode: recommended?.decisionReasonCode || null,
        recommendedReason: recommended?.decisionReason || null,
        decisionReasonCode: stat?.decisionReasonCode || null,
        decisionReason: stat?.decisionReason || null,
        attentionScore: stat ? Number(stat.attentionScore.toFixed(2)) : null,
        recommendedAttentionScore: recommended ? Number(recommended.attentionScore.toFixed(2)) : null,
        recommendedRank: recommended?.priorityRank || null,
        streak: currentStreak,
        secondsToClick: Math.max(0, Math.round(elapsedMs / 1000)),
        contentId: nextContent.id,
      },
      { userEmail },
    );

    if (recommended) {
      trackEvent(
        wasRecommended ? 'department_focus_accepted' : 'department_focus_overridden',
        wasRecommended
          ? {
              department: activeDepartment,
              source,
              disciplineId: subDepartment,
              recommendedDisciplineId: recommended.subDepartment,
              zone: stat?.zone || recommended.zone,
              heuristicVersion: DEPARTMENT_MISSION_HEURISTIC_VERSION,
              attentionScore: Number((stat?.attentionScore || recommended.attentionScore).toFixed(2)),
              completionRate: stat?.completionRate || recommended.completionRate,
              decisionReasonCode: stat?.decisionReasonCode || recommended.decisionReasonCode,
              recommendedRank: recommended.priorityRank,
              reason: stat?.decisionReason || recommended.decisionReason,
              secondsToClick: Math.max(0, Math.round(elapsedMs / 1000)),
            }
          : {
              department: activeDepartment,
              source,
              recommendedDisciplineId: recommended.subDepartment,
              chosenDisciplineId: subDepartment,
              recommendedZone: recommended.zone,
              chosenZone: stat?.zone || null,
              heuristicVersion: DEPARTMENT_MISSION_HEURISTIC_VERSION,
              recommendedAttentionScore: Number(recommended.attentionScore.toFixed(2)),
              chosenAttentionScore: stat ? Number(stat.attentionScore.toFixed(2)) : null,
              recommendedDecisionReasonCode: recommended.decisionReasonCode,
              chosenDecisionReasonCode: stat?.decisionReasonCode || null,
              recommendedReason: recommended.decisionReason,
              chosenReason: stat?.decisionReason || null,
              recommendedRank: recommended.priorityRank,
              secondsToClick: Math.max(0, Math.round(elapsedMs / 1000)),
            },
        { userEmail },
      );
    }

    toast.success(`Iniciando sessão de ${subDepartment}`);

    if (onStartStudyNow) {
      onStartStudyNow({
        subDepartment,
        contentTitle: nextContent.title,
        methodId: nextContent.applyMethodId,
      });
      return;
    }

    setSelectedContent(nextContent);
  };

  const handleToggleChecklist = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
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
      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-slate-950/75">
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <GraduationCap className="h-6 w-6 text-blue-500" />
          Centro de Missao
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Abra o Departamento para decidir onde colocar energia hoje e puxar a disciplina certa sem pensar demais.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
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

      <div className="space-y-4">
        <div className="rounded-[30px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(248,250,252,0.88)_44%,rgba(241,245,249,0.7)_100%)] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),rgba(15,23,42,0.92)_28%,rgba(2,6,23,0.98)_100%)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{activeDepartment}</p>
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Seu foco hoje</p>
                <p className="mt-2 text-lg text-slate-700 dark:text-slate-200">
                  {missionState.primaryFocus
                    ? `${missionState.primaryFocus.subDepartment} merece atencao agora`
                    : 'Escolha um departamento para organizar o foco'}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {missionState.primaryFocus
                    ? `${missionState.primaryFocus.headline}. ${missionState.primaryFocus.support}`
                    : 'Use o Departamento para decidir onde puxar a proxima sessao sem abrir varias telas.'}
                </p>
                {missionState.primaryFocus ? (
                  <p className="mt-3 inline-flex rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                    Motivo: {missionState.primaryFocus.decisionReason}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white/10 dark:text-slate-100">
                  {departmentSummary.completionRate}% concluido
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                  {departmentSummary.completedTracks}/{departmentSummary.totalTracks} trilhas
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                  Streak {currentStreak} dia(s)
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                  ETA {estimatedDaysToFinish} dias
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {missionState.primaryFocus ? (
                <button
                  type="button"
                  onClick={() => {
                    if (missionState.primaryFocus) {
                      handleStudyDisciplineNow(missionState.primaryFocus.subDepartment, 'hero');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Target className="h-4 w-4" />
                  Estudar agora
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleOpenDiscipline(activeSubDepartment)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                Ver disciplina
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {missionState.zones.map((zone) => (
            <div
              key={zone.id}
              className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-slate-950/70"
            >
              <div className="border-b border-slate-200/80 pb-4 dark:border-white/8">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{zone.label}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{zone.description}</p>
              </div>

              <div className="mt-4 space-y-3">
                {zone.disciplines.length === 0 ? (
                  <div className="rounded-2xl bg-slate-100/80 px-4 py-3 text-sm text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                    Nada por aqui agora.
                  </div>
                ) : (
                  zone.disciplines.map((discipline) => (
                    <div
                      key={discipline.subDepartment}
                      className={`rounded-2xl border px-4 py-4 transition ${
                        activeSubDepartment === discipline.subDepartment
                          ? 'border-blue-500/30 bg-blue-50/80 dark:border-blue-500/25 dark:bg-blue-500/10'
                          : 'border-transparent bg-slate-100/70 dark:bg-white/[0.03]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenDiscipline(discipline.subDepartment)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{discipline.subDepartment}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{discipline.headline}</p>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {discipline.completionRate}%
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{discipline.support}</p>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${isProgressAnimated ? discipline.completionRate : 0}%`, backgroundColor: 'var(--color-primary)' }}
                          />
                        </div>
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {discipline.completedTracks}/{discipline.totalTracks} trilhas
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStudyDisciplineNow(discipline.subDepartment, 'zone')}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                            zone.id === 'needs_attention'
                              ? 'bg-blue-600 text-white hover:bg-blue-500'
                              : 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]'
                          }`}
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {discipline.actionLabel}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)] dark:border-white/8 dark:bg-slate-950/70">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 dark:border-white/8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Disciplina em foco</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{activeSubDepartment}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {activeDisciplineMission
                  ? `${activeDisciplineMission.headline}. ${activeDisciplineMission.support}`
                  : 'Abra uma disciplina para ver as trilhas disponiveis.'}
              </p>
              {activeDisciplineMission ? (
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Motivo da prioridade: {activeDisciplineMission.decisionReason}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/[0.05]">
                {activeDisciplineMission?.completedTracks || 0}/{activeDisciplineMission?.totalTracks || 0} trilhas
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/[0.05]">
                XP {activeDisciplineMission?.completedXp || 0}/{activeDisciplineMission?.totalXp || 0}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              {activeDisciplineTracks.map((track) => {
                const done = completedContentIds.includes(track.id);
                return (
                  <div
                    key={track.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      activeDisciplineNextTrack?.id === track.id
                        ? 'border-blue-500/25 bg-blue-50/80 dark:border-blue-500/25 dark:bg-blue-500/10'
                        : 'border-transparent bg-slate-100/70 dark:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{track.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {track.estimatedMinutes} min - +{track.xpReward} XP
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold ${done ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {done ? 'Concluido' : activeDisciplineNextTrack?.id === track.id ? 'Proximo' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-slate-100/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Missao da disciplina</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                {activeDisciplineNextTrack?.title || 'Sem trilha disponivel'}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {activeDisciplineNextTrack
                  ? `Puxe esta trilha para mover ${activeSubDepartment} sem perder o ritmo geral.`
                  : 'Ainda nao ha trilhas cadastradas para esta disciplina.'}
              </p>
              <button
                type="button"
                onClick={() => handleStudyDisciplineNow(activeSubDepartment, 'discipline_panel')}
                disabled={!activeDisciplineNextTrack}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" />
                Estudar agora
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trilhas Gratuitas de {activeSubDepartment}</h3>
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
        <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2"><Crown className="w-4 h-4" /> Trilhas PRO de {activeSubDepartment}</h3>
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
