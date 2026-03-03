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

export type StudyHierarchyTrack = 'enem' | 'concursos' | 'hibrido';

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

interface HierarchyCatalogArea {
  name: string;
  disciplines: Array<{
    name: string;
    topics: Array<{ name: string; estimatedMinutes?: number }>;
  }>;
}

const HIERARCHY_CATALOG: Record<StudyHierarchyTrack, HierarchyCatalogArea[]> = {
  enem: [
    {
      name: 'ENEM',
      disciplines: [
        {
          name: 'Linguagens',
          topics: [
            { name: 'Interpretação de Texto', estimatedMinutes: 35 },
            { name: 'Funções da Linguagem', estimatedMinutes: 35 },
            { name: 'Figuras de Linguagem', estimatedMinutes: 35 },
            { name: 'Variação Linguística', estimatedMinutes: 35 },
            { name: 'Gêneros Textuais', estimatedMinutes: 40 },
            { name: 'Gramática Aplicada', estimatedMinutes: 40 },
            { name: 'Redação ENEM', estimatedMinutes: 55 },
          ],
        },
        {
          name: 'História Geral',
          topics: [
            { name: 'Idade Moderna', estimatedMinutes: 35 },
            { name: 'Revoluções Industriais', estimatedMinutes: 40 },
            { name: 'Guerras Mundiais', estimatedMinutes: 45 },
          ],
        },
        {
          name: 'História do Brasil',
          topics: [
            { name: 'Período Colonial', estimatedMinutes: 35 },
            { name: 'Império e República', estimatedMinutes: 40 },
            { name: 'Brasil Contemporâneo', estimatedMinutes: 45 },
          ],
        },
        {
          name: 'Geografia',
          topics: [
            { name: 'Geopolítica Global', estimatedMinutes: 35 },
            { name: 'Climatologia', estimatedMinutes: 35 },
            { name: 'Questões Ambientais', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Filosofia/Sociologia',
          topics: [
            { name: 'Filosofia Moderna', estimatedMinutes: 35 },
            { name: 'Ética e Política', estimatedMinutes: 35 },
            { name: 'Sociologia Brasileira', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Física',
          topics: [
            { name: 'Mecânica', estimatedMinutes: 45 },
            { name: 'Termologia', estimatedMinutes: 35 },
            { name: 'Eletricidade', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Química',
          topics: [
            { name: 'Química Geral', estimatedMinutes: 40 },
            { name: 'Química Orgânica', estimatedMinutes: 45 },
            { name: 'Eletroquímica', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Matemática',
          topics: [
            { name: 'Funções', estimatedMinutes: 45 },
            { name: 'Geometria', estimatedMinutes: 40 },
            { name: 'Probabilidade e Estatística', estimatedMinutes: 35 },
          ],
        },
      ],
    },
  ],
  concursos: [
    {
      name: 'Concurso',
      disciplines: [
        {
          name: 'Português',
          topics: [
            { name: 'Interpretação', estimatedMinutes: 35 },
            { name: 'Gramática', estimatedMinutes: 40 },
            { name: 'Redação Oficial', estimatedMinutes: 35 },
          ],
        },
        {
          name: 'Raciocínio Lógico',
          topics: [
            { name: 'Lógica Proposicional', estimatedMinutes: 35 },
            { name: 'Conjuntos e Diagramas', estimatedMinutes: 35 },
            { name: 'Análise Combinatória', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Direito Constitucional',
          topics: [
            { name: 'Direitos Fundamentais', estimatedMinutes: 40 },
            { name: 'Organização do Estado', estimatedMinutes: 40 },
            { name: 'Controle de Constitucionalidade', estimatedMinutes: 45 },
          ],
        },
        {
          name: 'Direito Administrativo',
          topics: [
            { name: 'Atos Administrativos', estimatedMinutes: 35 },
            { name: 'Licitações', estimatedMinutes: 40 },
            { name: 'Agentes Públicos', estimatedMinutes: 35 },
          ],
        },
        {
          name: 'Informática',
          topics: [
            { name: 'Pacote Office', estimatedMinutes: 35 },
            { name: 'Segurança da Informação', estimatedMinutes: 35 },
            { name: 'Internet e Redes', estimatedMinutes: 35 },
          ],
        },
        {
          name: 'Atualidades',
          topics: [
            { name: 'Política Nacional', estimatedMinutes: 30 },
            { name: 'Economia', estimatedMinutes: 30 },
            { name: 'Ciência e Tecnologia', estimatedMinutes: 30 },
          ],
        },
      ],
    },
  ],
  hibrido: [
    {
      name: 'ENEM',
      disciplines: [
        {
          name: 'Linguagens',
          topics: [
            { name: 'Interpretação de Texto', estimatedMinutes: 35 },
            { name: 'Redação ENEM', estimatedMinutes: 55 },
          ],
        },
        {
          name: 'Matemática',
          topics: [
            { name: 'Funções', estimatedMinutes: 45 },
            { name: 'Geometria', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Ciências Humanas',
          topics: [
            { name: 'História do Brasil', estimatedMinutes: 40 },
            { name: 'Geopolítica', estimatedMinutes: 35 },
          ],
        },
        {
          name: 'Ciências da Natureza',
          topics: [
            { name: 'Física Mecânica', estimatedMinutes: 40 },
            { name: 'Química Orgânica', estimatedMinutes: 40 },
          ],
        },
      ],
    },
    {
      name: 'Concurso',
      disciplines: [
        {
          name: 'Português',
          topics: [
            { name: 'Interpretação', estimatedMinutes: 35 },
            { name: 'Gramática', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Raciocínio Lógico',
          topics: [
            { name: 'Lógica Proposicional', estimatedMinutes: 35 },
            { name: 'Análise Combinatória', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Direito Constitucional',
          topics: [
            { name: 'Direitos Fundamentais', estimatedMinutes: 40 },
            { name: 'Organização do Estado', estimatedMinutes: 40 },
          ],
        },
        {
          name: 'Informática',
          topics: [
            { name: 'Pacote Office', estimatedMinutes: 35 },
            { name: 'Segurança da Informação', estimatedMinutes: 35 },
          ],
        },
      ],
    },
  ],
};

const toSafePercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return toSafePercent(values.reduce((acc, current) => acc + current, 0) / values.length);
};

const normalizeKey = (value: string): string => value.trim().toLowerCase();

class LearningHierarchyService {
  private createTemplateHierarchy(track: StudyHierarchyTrack): StudyHierarchyAreaNode[] {
    return HIERARCHY_CATALOG[track].map((area) => {
      const disciplines = area.disciplines.map((discipline) => {
        const topics: StudyHierarchyTopicNode[] = discipline.topics.map((topic, index) => ({
          id: `template-${track}-${normalizeKey(area.name).replace(/\s+/g, '-')}-${normalizeKey(discipline.name).replace(/\s+/g, '-')}-${index}`,
          name: topic.name,
          progressPercent: 0,
          status: 'nao_iniciado',
          accuracyPercent: 0,
          answeredQuestions: 0,
          estimatedMinutes: topic.estimatedMinutes ?? 35,
        }));

        return {
          id: `template-${track}-${normalizeKey(area.name).replace(/\s+/g, '-')}-${normalizeKey(discipline.name).replace(/\s+/g, '-')}`,
          name: discipline.name,
          progressPercent: average(topics.map((topic) => topic.progressPercent)),
          topics,
        };
      });

      return {
        id: `template-${track}-${normalizeKey(area.name).replace(/\s+/g, '-')}`,
        name: area.name,
        progressPercent: average(disciplines.map((discipline) => discipline.progressPercent)),
        disciplines,
      };
    });
  }

  normalizeHierarchyForTrack(
    data: StudyHierarchyAreaNode[],
    track: StudyHierarchyTrack,
  ): StudyHierarchyAreaNode[] {
    const template = this.createTemplateHierarchy(track);

    const areaByName = new Map<string, StudyHierarchyAreaNode>(
      data.map((area) => [normalizeKey(area.name), area]),
    );

    return template.map((templateArea) => {
      const existingArea = areaByName.get(normalizeKey(templateArea.name));
      const disciplineByName = new Map<string, StudyHierarchyDisciplineNode>(
        (existingArea?.disciplines || []).map((discipline) => [normalizeKey(discipline.name), discipline]),
      );

      const disciplines = templateArea.disciplines.map((templateDiscipline) => {
        const existingDiscipline = disciplineByName.get(normalizeKey(templateDiscipline.name));
        const topicByName = new Map<string, StudyHierarchyTopicNode>(
          (existingDiscipline?.topics || []).map((topic) => [normalizeKey(topic.name), topic]),
        );

        const topics = templateDiscipline.topics.map((templateTopic) => {
          const existingTopic = topicByName.get(normalizeKey(templateTopic.name));
          return existingTopic
            ? {
                ...templateTopic,
                id: existingTopic.id,
                progressPercent: toSafePercent(existingTopic.progressPercent),
                status: existingTopic.status,
                accuracyPercent: toSafePercent(existingTopic.accuracyPercent),
                answeredQuestions: Math.max(0, existingTopic.answeredQuestions),
                estimatedMinutes: existingTopic.estimatedMinutes || templateTopic.estimatedMinutes,
              }
            : templateTopic;
        });

        return {
          id: existingDiscipline?.id || templateDiscipline.id,
          name: templateDiscipline.name,
          progressPercent: average(topics.map((topic) => topic.progressPercent)),
          topics,
        };
      });

      return {
        id: existingArea?.id || templateArea.id,
        name: templateArea.name,
        progressPercent: average(disciplines.map((discipline) => discipline.progressPercent)),
        disciplines,
      };
    });
  }

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

  buildLocalFallback(sessions: StudySession[], weakAreas: string[], track: StudyHierarchyTrack = 'enem'): StudyHierarchyAreaNode[] {
    const normalizedTemplate = this.normalizeHierarchyForTrack([], track);
    if (sessions.length === 0 && weakAreas.length === 0) {
      return normalizedTemplate;
    }

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
      return normalizedTemplate;
    }

    const localData: StudyHierarchyAreaNode[] = [
      {
        id: 'local-area-estudos',
        name: 'Plano de Estudos',
        progressPercent: average(disciplines.map((discipline) => discipline.progressPercent)),
        disciplines,
      },
    ];

    return this.normalizeHierarchyForTrack(localData, track);
  }
}

export const learningHierarchyService = new LearningHierarchyService();
