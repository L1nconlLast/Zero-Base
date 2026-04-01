import React from 'react';

import type { ProfileTrackContext } from '../profile/types';
import { ContextShellPage } from '../studyContext/components/ContextShellPage';
import {
  faculdadeDashboardService,
  type FaculdadeDashboardData,
} from '../../services/faculdadeDashboard.service';
import { FaculdadeActivationPanel } from './components/FaculdadeActivationPanel';

export interface FaculdadeShellProps {
  darkMode?: boolean;
  activeTab: string;
  userId?: string | null;
  profileContext: ProfileTrackContext | null;
  homeSlot: React.ReactNode;
  planningSlot: React.ReactNode;
  profileSlot: React.ReactNode;
  onNavigate: (tabId: string) => void;
  onReviewContext: () => void;
}

const FACULDADE_FOCUS_LABELS = {
  rotina: 'Rotina academica',
  provas: 'Foco em provas',
  trabalhos: 'Foco em trabalhos',
} as const;

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const resolveFaculdadeFocusLabel = (focus?: string | null): string => {
  if (!focus || !(focus in FACULDADE_FOCUS_LABELS)) {
    return 'Contexto academico ativo';
  }

  return FACULDADE_FOCUS_LABELS[focus as keyof typeof FACULDADE_FOCUS_LABELS];
};

const formatDateLabel = (value?: string | null): string => {
  if (!value) {
    return 'Sem data';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data';
  }

  return DATE_FORMATTER.format(parsed);
};

export const FaculdadeShell: React.FC<FaculdadeShellProps> = ({
  darkMode = false,
  activeTab,
  userId,
  profileContext,
  homeSlot,
  planningSlot,
  profileSlot,
  onNavigate,
  onReviewContext,
}) => {
  const [dashboard, setDashboard] = React.useState<FaculdadeDashboardData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dashboardStatus = loading ? 'loading' : error ? 'error' : dashboard ? 'ready' : 'empty';

  const loadDashboard = React.useCallback(async () => {
    if (!userId) {
      setDashboard(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await faculdadeDashboardService.getFaculdadeDashboardData(userId);
      setDashboard(data);
    } catch (nextError) {
      setDashboard(null);
      setError(nextError instanceof Error ? nextError.message : 'Nao foi possivel carregar o shell academico.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refreshDashboard = React.useCallback(async () => {
    await loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    (
      window as typeof window & {
        __ZB_FACULDADE_SHELL_DEBUG__?: Record<string, unknown>;
      }
    ).__ZB_FACULDADE_SHELL_DEBUG__ = {
      activeTab,
      dashboardStatus,
      loading,
      error,
      hasDashboard: Boolean(dashboard),
      subjectCount: dashboard?.subjects.length || 0,
      examCount: dashboard?.exams.length || 0,
      assignmentCount: dashboard?.assignments.length || 0,
      eventCount: dashboard?.events.length || 0,
      upcomingEventCount: dashboard?.upcomingEvents.length || 0,
    };

    return () => {
      delete (
        window as typeof window & {
          __ZB_FACULDADE_SHELL_DEBUG__?: Record<string, unknown>;
        }
      ).__ZB_FACULDADE_SHELL_DEBUG__;
    };
  }, [activeTab, dashboard, dashboardStatus, error, loading]);

  const renderShell = (content: React.ReactNode) => (
    <div
      data-native-shell="faculdade"
      data-native-shell-tab={activeTab}
      data-native-shell-status={dashboardStatus}
    >
      {content}
    </div>
  );

  const institution =
    dashboard?.profile.institutionName || profileContext?.faculdade?.institution || 'Instituicao nao informada';
  const course = dashboard?.profile.courseName || profileContext?.faculdade?.course || 'Curso em configuracao';
  const semester =
    dashboard?.profile.currentPeriodLabel || profileContext?.faculdade?.semester || 'Periodo nao informado';
  const focusLabel = resolveFaculdadeFocusLabel(
    profileContext?.faculdade?.focus || dashboard?.profile.focus || null,
  );
  const summaryTitle = dashboard ? `${course} · ${semester}` : profileContext?.summaryTitle || `${course} · ${semester}`;
  const summaryDescription =
    profileContext?.summaryDescription ||
    'Seu shell academico usa instituicao, curso, periodo e foco atual para organizar a rotina.';
  const subjects = dashboard?.subjects || [];
  const visibleSubjects = subjects.filter((subject) => subject.status !== 'trancada');
  const errorSection = error
    ? {
        title: 'Falha ao carregar o snapshot',
        description: 'O shell continua navegavel, mas esta leitura de dominio precisa ser atualizada.',
        items: [
          {
            title: 'Erro de carregamento',
            detail: error,
            badge: 'erro',
          },
        ],
      }
    : null;
  const subjectItems = subjects.slice(0, 4).map((subject) => ({
    title: subject.name,
    detail: subject.professorName
      ? `${subject.professorName} · ${subject.workloadHours ? `${subject.workloadHours}h` : 'Carga livre'}`
      : subject.workloadHours
        ? `${subject.workloadHours}h previstas para o periodo.`
        : 'Disciplina ativa no seu contexto academico.',
    badge: subject.status,
  }));
  const eventItems = (dashboard?.upcomingEvents || []).slice(0, 4).map((event) => ({
    title: event.subjectName ? `${event.title} · ${event.subjectName}` : event.title,
    detail: `${formatDateLabel(event.startAt)} · ${event.type}`,
    badge: event.status,
  }));
  if (activeTab === 'inicio') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Modo Faculdade"
        title={summaryTitle}
        description={summaryDescription}
        actions={[
          { label: 'Abrir planejamento', onClick: () => onNavigate('cronograma') },
          { label: 'Ver disciplinas', onClick: () => onNavigate('departamento'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          {
            label: 'Disciplinas',
            value: String(dashboard?.summary.activeSubjects || subjects.length || 0),
            detail: loading ? 'Carregando materias ativas...' : error || 'Materias ativas no contexto academico.',
          },
          {
            label: 'Proxima prova',
            value: dashboard?.nextExam ? formatDateLabel(dashboard.nextExam.date) : 'Sem prova',
            detail: dashboard?.nextExam
              ? `${dashboard.nextExam.title} · ${dashboard.nextExam.subjectName}`
              : 'Nenhuma prova pendente encontrada.',
          },
          {
            label: 'Proximo trabalho',
            value: dashboard?.nextAssignment ? formatDateLabel(dashboard.nextAssignment.dueDate) : 'Sem entrega',
            detail: dashboard?.nextAssignment
              ? `${dashboard.nextAssignment.title} · ${dashboard.nextAssignment.subjectName}`
              : 'Nenhum trabalho pendente encontrado.',
          },
          {
            label: 'Foco',
            value: focusLabel,
            detail: dashboard
              ? `${dashboard.summary.upcomingEvents} evento(s) academico(s) no radar.`
              : 'Regra que prioriza provas, trabalhos ou constancia.',
          },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Prioridade academica real',
            description: 'A Home academica agora pode se apoiar em dados reais de materias, provas, trabalhos e eventos.',
            items: [
              dashboard?.nextExam
                ? {
                    title: 'Prova mais proxima',
                    detail: `${dashboard.nextExam.title} em ${formatDateLabel(dashboard.nextExam.date)} para ${dashboard.nextExam.subjectName}.`,
                    badge: 'prova',
                  }
                : {
                    title: 'Prova mais proxima',
                    detail: 'Ainda nao existe prova cadastrada para puxar urgencia academica real.',
                    badge: 'setup',
                  },
              dashboard?.nextAssignment
                ? {
                    title: 'Trabalho mais proximo',
                    detail: `${dashboard.nextAssignment.title} vence em ${formatDateLabel(dashboard.nextAssignment.dueDate)} para ${dashboard.nextAssignment.subjectName}.`,
                    badge: dashboard.nextAssignment.priority || 'media',
                  }
                : {
                    title: 'Trabalho mais proximo',
                    detail: 'Ainda nao existe entrega cadastrada para priorizar blocos de execucao.',
                    badge: 'setup',
                  },
              {
                title: 'Semana academica',
                detail: dashboard?.upcomingEvents.length
                  ? `${dashboard.upcomingEvents.length} evento(s) academico(s) ja entram no radar do shell.`
                  : 'Sem eventos academicos futuros por enquanto.',
                badge: 'semana',
              },
            ],
          },
          {
            title: 'Disciplinas ativas',
            description: 'Essa leitura deixa o modo faculdade funcional mesmo antes das telas de edicao.',
            items: visibleSubjects.length > 0
              ? visibleSubjects.slice(0, 4).map((subject) => ({
                  title: subject.name,
                  detail: subject.professorName
                    ? `${subject.professorName} Â· ${subject.workloadHours ? `${subject.workloadHours}h` : 'Carga livre'}`
                    : subject.workloadHours
                      ? `${subject.workloadHours}h previstas para o periodo.`
                      : 'Disciplina ativa no seu contexto academico.',
                  badge: subject.status,
                }))
              : [
                  {
                    title: 'Sem disciplinas ativas ainda',
                    detail: 'Assim que academic_subjects receber dados, esta area passa a mostrar materias reais da semana.',
                    badge: 'setup',
                  },
                ],
          },
        ]}
      >
        {homeSlot}
      </ContextShellPage>
    );
  }

  if (activeTab === 'departamento') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Disciplinas"
        title={`${course} · ${semester}`}
        description="Esse espaco agora comeca a ler materias reais, em vez de depender so de contexto salvo."
        actions={[
          { label: 'Abrir planejamento', onClick: () => onNavigate('cronograma') },
          { label: 'Revisar contexto', onClick: onReviewContext, variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Curso', value: course },
          { label: 'Periodo', value: semester },
          { label: 'Instituicao', value: institution },
          { label: 'Foco', value: focusLabel },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Materias ativas',
            description: 'A lista passa a refletir academic_subjects do usuario, e nao apenas cards estaticos.',
            items: visibleSubjects.length > 0
              ? visibleSubjects.map((subject) => ({
                  title: subject.name,
                  detail: subject.professorName
                    ? `${subject.professorName} · ${subject.workloadHours ? `${subject.workloadHours}h` : 'Carga livre'}`
                    : subject.workloadHours
                      ? `${subject.workloadHours}h previstas para o periodo.`
                      : 'Disciplina ativa no seu contexto academico.',
                  badge: subject.status,
                }))
              : [
                  {
                    title: 'Nenhuma disciplina encontrada',
                    detail: 'A migration e o shell estao prontos. Falta popular academic_subjects para esse usuario.',
                    badge: 'setup',
                  },
                ],
          },
          {
            title: 'Radar academico',
            description: 'A mesma tela ja consegue misturar materia com prazo real do periodo.',
            items: [
              dashboard?.nextExam
                ? {
                    title: 'Proxima prova',
                    detail: `${dashboard.nextExam.title} · ${dashboard.nextExam.subjectName} · ${formatDateLabel(dashboard.nextExam.date)}`,
                    badge: 'prova',
                  }
                : {
                    title: 'Proxima prova',
                    detail: 'Sem prova pendente vinculada a uma disciplina ativa.',
                    badge: 'vazio',
                  },
              dashboard?.nextAssignment
                ? {
                    title: 'Proximo trabalho',
                    detail: `${dashboard.nextAssignment.title} · ${dashboard.nextAssignment.subjectName} · ${formatDateLabel(dashboard.nextAssignment.dueDate)}`,
                    badge: dashboard.nextAssignment.priority || 'media',
                  }
                : {
                    title: 'Proximo trabalho',
                    detail: 'Sem entrega pendente vinculada a uma disciplina ativa.',
                    badge: 'vazio',
                  },
            ],
          },
        ]}
      >
        <FaculdadeActivationPanel
          darkMode={darkMode}
          userId={userId}
          dashboard={dashboard}
          onRefresh={refreshDashboard}
        />
      </ContextShellPage>
    );
  }

  if (activeTab === 'cronograma') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Planejamento"
        title="Planejamento da semana academica"
        description="O plano continua usando seu motor track-aware, agora com contexto academico real no topo do shell."
        actions={[
          { label: 'Ver calendario', onClick: () => onNavigate('arvore') },
          { label: 'Voltar para Home', onClick: () => onNavigate('inicio'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Modo', value: 'Faculdade' },
          { label: 'Centro', value: 'Planejamento semanal' },
          { label: 'Disciplinas', value: String(dashboard?.summary.activeSubjects || 0) },
          { label: 'Eventos', value: String(dashboard?.summary.upcomingEvents || 0) },
        ]}
      >
        {planningSlot}
      </ContextShellPage>
    );
  }

  if (activeTab === 'arvore') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Calendario academico"
        title="Provas, entregas e revisoes no mesmo fluxo"
        description="O calendario deixa de ser estrutural e passa a listar eventos reais do dominio academico."
        actions={[
          { label: 'Abrir disciplinas', onClick: () => onNavigate('departamento') },
          { label: 'Ajustar planejamento', onClick: () => onNavigate('cronograma'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Instituicao', value: institution },
          { label: 'Curso', value: course },
          { label: 'Periodo', value: semester },
          { label: 'Eventos', value: String(dashboard?.summary.upcomingEvents || 0) },
        ]}
        sections={[
          ...(errorSection ? [errorSection] : []),
          {
            title: 'Eventos futuros',
            description: 'A partir daqui o shell pode mostrar provas, entregas e eventos importantes em ordem real.',
            items: eventItems.length > 0
              ? eventItems
              : [
                  {
                    title: 'Sem eventos futuros',
                    detail: 'Quando academic_calendar_events for preenchido, esta area passa a refletir o calendario do periodo.',
                    badge: 'setup',
                  },
                ],
          },
          {
            title: 'Leitura rapida da semana',
            description: 'Os proximos eventos academicos ja podem disputar atencao com base em dado real.',
            items: [
              {
                title: 'Provas pendentes',
                detail: `${dashboard?.summary.pendingExams || 0} prova(s) pendente(s) no contexto atual.`,
                badge: 'provas',
              },
              {
                title: 'Trabalhos pendentes',
                detail: `${dashboard?.summary.pendingAssignments || 0} entrega(s) pendente(s) para organizar.`,
                badge: 'trabalhos',
              },
            ],
          },
        ]}
      />
    );
  }

  if (activeTab === 'perfil') {
    return renderShell(
      <ContextShellPage
        darkMode={darkMode}
        eyebrow="Perfil academico"
        title="Seu contexto salvo continua visivel"
        description="Aqui o modo faculdade reforca curso, periodo e foco com o mesmo snapshot que alimenta o shell."
        actions={[
          { label: 'Revisar contexto', onClick: onReviewContext },
          { label: 'Voltar para Home', onClick: () => onNavigate('inicio'), variant: 'secondary' },
          { label: 'Atualizar snapshot', onClick: () => void refreshDashboard(), variant: 'secondary' },
        ]}
        stats={[
          { label: 'Instituicao', value: institution },
          { label: 'Curso', value: course },
          { label: 'Periodo', value: semester },
          { label: 'Foco', value: focusLabel },
        ]}
      >
        {profileSlot}
      </ContextShellPage>
    );
  }

  return null;
};

export default FaculdadeShell;
