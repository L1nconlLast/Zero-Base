import { isSupabaseConfigured, supabase } from './supabase.client';
import type { StudySession } from '../types';

export interface StudyHierarchyTopicNode {
  id: string;
  name: string;
  progressPercent: number;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
  accuracyPercent: number;
  answeredQuestions: number;
  estimatedMinutes?: number;
}

export interface StudyHierarchyDisciplineNode {
  id: string;
  name: string;
  progressPercent: number;
  topics: StudyHierarchyTopicNode[];
}

export interface StudyHierarchyAreaNode {
  id: string;
  name: string;
  progressPercent: number;
  disciplines: StudyHierarchyDisciplineNode[];
}

interface ModalidadeRow {
  id: string;
  nome: string;
  disciplinas: DisciplinaRow[] | null;
}

interface DisciplinaRow {
  id: string;
  nome: string;
  topicos: TopicoRow[] | null;
}

interface TopicoRow {
  id: string;
  nome: string;
  tempo_estimado_min: number | null;
}

interface ProgressoTopicoRow {
  topico_id: string;
  progresso_percent: number;
  status: StudyHierarchyTopicNode['status'];
}

interface DesempenhoTopicoRow {
  topico_id: string;
  percentual_acerto: number | null;
  total_questoes_respondidas: number | null;
}

const toSafePercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return toSafePercent(values.reduce((acc, current) => acc + current, 0) / values.length);
};

class LearningHierarchyService {
  async listForUser(userId: string): Promise<StudyHierarchyAreaNode[]> {
    if (!isSupabaseConfigured || !supabase || !userId) {
      return [];
    }

    const [catalogResponse, progressResponse, performanceResponse] = await Promise.all([
      supabase
        .from('modalidades')
        .select(
          `
            id,
            nome,
            disciplinas (
              id,
              nome,
              topicos (
                id,
                nome,
                tempo_estimado_min
              )
            )
          `,
        )
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      supabase
        .from('progresso_topicos')
        .select('topico_id, progresso_percent, status')
        .eq('usuario_id', userId),
      supabase
        .from('vw_desempenho_usuario_topico')
        .select('topico_id, percentual_acerto, total_questoes_respondidas')
        .eq('usuario_id', userId),
    ]);

    if (catalogResponse.error) {
      throw new Error(`Erro ao carregar catálogo de estudos: ${catalogResponse.error.message}`);
    }

    if (progressResponse.error) {
      throw new Error(`Erro ao carregar progresso por tópico: ${progressResponse.error.message}`);
    }

    if (performanceResponse.error) {
      throw new Error(`Erro ao carregar desempenho por tópico: ${performanceResponse.error.message}`);
    }

    const progressByTopic = new Map<string, ProgressoTopicoRow>(
      ((progressResponse.data || []) as ProgressoTopicoRow[]).map((row) => [row.topico_id, row]),
    );

    const performanceByTopic = new Map<string, DesempenhoTopicoRow>(
      ((performanceResponse.data || []) as DesempenhoTopicoRow[]).map((row) => [row.topico_id, row]),
    );

    const areas = ((catalogResponse.data || []) as ModalidadeRow[])
      .map<StudyHierarchyAreaNode>((areaRow) => {
        const disciplines = (areaRow.disciplinas || []).map<StudyHierarchyDisciplineNode>((disciplineRow) => {
          const topics = (disciplineRow.topicos || []).map<StudyHierarchyTopicNode>((topicRow) => {
            const progress = progressByTopic.get(topicRow.id);
            const performance = performanceByTopic.get(topicRow.id);

            return {
              id: topicRow.id,
              name: topicRow.nome,
              progressPercent: toSafePercent(progress?.progresso_percent || 0),
              status: progress?.status || 'nao_iniciado',
              accuracyPercent: toSafePercent(performance?.percentual_acerto || 0),
              answeredQuestions: Math.max(0, performance?.total_questoes_respondidas || 0),
              estimatedMinutes: topicRow.tempo_estimado_min || undefined,
            };
          });

          return {
            id: disciplineRow.id,
            name: disciplineRow.nome,
            progressPercent: average(topics.map((topic) => topic.progressPercent)),
            topics,
          };
        });

        return {
          id: areaRow.id,
          name: areaRow.nome,
          progressPercent: average(disciplines.map((discipline) => discipline.progressPercent)),
          disciplines,
        };
      })
      .filter((area) => area.disciplines.length > 0);

    return areas;
  }

  buildLocalFallback(sessions: StudySession[], weakAreas: string[]): StudyHierarchyAreaNode[] {
    const minutesBySubject = sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.minutes;
      return acc;
    }, {});

    const subjectNames = Array.from(
      new Set([
        ...Object.keys(minutesBySubject).filter((name) => name !== 'Outra'),
        ...weakAreas,
      ]),
    );

    const maxMinutes = Math.max(1, ...Object.values(minutesBySubject));

    const disciplines: StudyHierarchyDisciplineNode[] = subjectNames.map((subjectName) => {
      const minutes = minutesBySubject[subjectName] || 0;
      const progressPercent = toSafePercent((minutes / maxMinutes) * 100);

      return {
        id: `local-discipline-${subjectName}`,
        name: subjectName,
        progressPercent,
        topics: [
          {
            id: `local-topic-${subjectName}`,
            name: 'Revisão guiada',
            progressPercent,
            status: progressPercent >= 70 ? 'concluido' : progressPercent > 0 ? 'em_andamento' : 'nao_iniciado',
            accuracyPercent: 0,
            answeredQuestions: 0,
            estimatedMinutes: 30,
          },
        ],
      };
    });

    if (disciplines.length === 0) {
      return [];
    }

    return [
      {
        id: 'local-area-estudos',
        name: 'Plano de Estudos',
        progressPercent: average(disciplines.map((discipline) => discipline.progressPercent)),
        disciplines,
      },
    ];
  }
}

export const learningHierarchyService = new LearningHierarchyService();
