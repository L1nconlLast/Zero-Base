import { createClient } from '@supabase/supabase-js';
import { learningGraphService } from './learningGraph.service';
import {
  calculateXpGained,
  computeNextStreak,
  getLevelLabelFromXp,
  getLevelNumberFromXp,
  summarizeAccuracyBySubject,
  summarizeTodayStats,
  summarizeWeekStats,
} from './specDomain.service';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

interface FinishSessionInput {
  endTime: string;
  questionsDone?: number;
  correctAnswers?: number;
}

interface StartSessionInput {
  subjectId: string;
  skillId?: string;
  startTime: string;
}

interface GeneratePlannerInput {
  availableHoursPerDay: number[];
  goals: string[];
  weakSkills?: string[];
  examDate?: string;
}

interface QuestionFilters {
  subjectId?: string;
  skillId?: string;
  difficulty?: 'facil' | 'medio' | 'dificil';
}

interface AnswerInput {
  questionId: string;
  isCorrect: boolean;
  timeSpentSec?: number;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const startOfDayUtc = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDaysUtc = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const firstRelation = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const masteryLevelFromScore = (score: number): 'baixo' | 'medio' | 'alto' => {
  if (score >= 80) return 'alto';
  if (score >= 50) return 'medio';
  return 'baixo';
};

export class StudyPlatformCompatService {
  isConfigured(): boolean {
    return Boolean(supabase);
  }

  private getClient() {
    if (!supabase) {
      throw new Error('Supabase nao configurado no backend (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).');
    }
    return supabase;
  }

  private async ensureUserRow(userId: string, userEmail?: string, userName?: string): Promise<void> {
    const client = this.getClient();

    const { data: existing, error: readError } = await client
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (readError) {
      throw new Error(`ensureUserRow read failed: ${readError.message}`);
    }

    if (existing) return;

    const fallbackEmail = userEmail || `${userId}@local.invalid`;
    const fallbackName = userName || 'Usuario';

    const { error: insertError } = await client
      .from('users')
      .insert({
        id: userId,
        email: fallbackEmail,
        name: fallbackName,
      });

    if (insertError && !insertError.message.toLowerCase().includes('duplicate key')) {
      throw new Error(`ensureUserRow insert failed: ${insertError.message}`);
    }
  }

  async listSubjects() {
    const disciplines = await learningGraphService.listDisciplines();
    return disciplines.map((discipline) => ({
      id: discipline.id,
      name: discipline.nome,
      slug: discipline.slug,
      icon: (discipline as { icone?: string }).icone || null,
      color: (discipline as { cor_hex?: string }).cor_hex || null,
      track: firstRelation(discipline.modalidades)?.nome || null,
      order: discipline.ordem || 0,
    }));
  }

  async getSkillsTree(subjectId?: string, userId?: string) {
    return learningGraphService.buildGraphPayload({
      disciplineId: subjectId,
      userId,
      limit: 5000,
    });
  }

  async getUserSkills(userId: string, subjectId?: string) {
    const progress = await learningGraphService.getUserProgress(userId, subjectId);

    return progress.map((entry) => {
      const score = Number(entry.pontuacao || 0);
      const topic = firstRelation(entry.topicos);
      return {
        skillId: entry.topico_id,
        skillName: topic?.nome || null,
        subjectId: topic?.disciplina_id || null,
        progress: score,
        masteryLevel: masteryLevelFromScore(score),
        lastStudied: entry.atualizado_em,
        status: entry.status,
      };
    });
  }

  async patchUserSkill(
    userId: string,
    skillId: string,
    payload: { progress?: number; masteryLevel?: 'baixo' | 'medio' | 'alto'; lastStudied?: string },
  ) {
    const resolvedProgress = typeof payload.progress === 'number'
      ? Math.max(0, Math.min(100, Math.round(payload.progress)))
      : payload.masteryLevel === 'alto'
        ? 85
        : payload.masteryLevel === 'medio'
          ? 60
          : 30;

    const status = resolvedProgress >= 100
      ? 'completed'
      : resolvedProgress >= 60
        ? 'studying'
        : 'available';

    const progress = await learningGraphService.upsertProgress({
      userId,
      topicId: skillId,
      status,
      score: resolvedProgress,
      studyMinutes: 0,
      attemptsDelta: 0,
    });

    return {
      skillId,
      progress: progress?.pontuacao ?? resolvedProgress,
      masteryLevel: masteryLevelFromScore(progress?.pontuacao ?? resolvedProgress),
      lastStudied: payload.lastStudied || progress?.atualizado_em || new Date().toISOString(),
      status: progress?.status || status,
    };
  }

  async startSession(userId: string, input: StartSessionInput) {
    const client = this.getClient();

    const startTime = new Date(input.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new Error('startTime invalido');
    }

    const { data: discipline, error: disciplineError } = await client
      .from('disciplinas')
      .select('nome')
      .eq('id', input.subjectId)
      .maybeSingle();

    if (disciplineError) {
      throw new Error(`startSession subject lookup failed: ${disciplineError.message}`);
    }

    const subjectName = discipline?.nome || 'Sessao de estudo';

    const { data, error } = await client
      .from('study_sessions')
      .insert({
        user_id: userId,
        date: startTime.toISOString(),
        minutes: 0,
        points: 0,
        subject: subjectName,
        duration: 0,
        goal_met: false,
        timestamp: startTime.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`startSession failed: ${error.message}`);
    }

    return { sessionId: data.id };
  }

  async finishSession(userId: string, sessionId: string, input: FinishSessionInput) {
    const client = this.getClient();

    const endTime = new Date(input.endTime);
    if (Number.isNaN(endTime.getTime())) {
      throw new Error('endTime invalido');
    }

    const { data: currentSession, error: currentSessionError } = await client
      .from('study_sessions')
      .select('id, user_id, date')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (currentSessionError) {
      throw new Error(`finishSession read failed: ${currentSessionError.message}`);
    }

    if (!currentSession) {
      throw new Error('Sessao nao encontrada para o usuario.');
    }

    const startTime = new Date(currentSession.date);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    const safeCorrect = Math.max(0, Math.min(input.questionsDone || 0, input.correctAnswers || 0));
    const xpGained = calculateXpGained({ durationMinutes, correctAnswers: safeCorrect });

    const { error: updateError } = await client
      .from('study_sessions')
      .update({
        minutes: durationMinutes,
        duration: durationMinutes,
        points: xpGained,
        timestamp: endTime.toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`finishSession update failed: ${updateError.message}`);
    }

    const { data: aggregate, error: aggregateError } = await client
      .from('study_sessions')
      .select('points')
      .eq('user_id', userId);

    if (aggregateError) {
      throw new Error(`finishSession aggregate failed: ${aggregateError.message}`);
    }

    const totalXp = (aggregate || []).reduce((acc, row) => acc + Number(row.points || 0), 0);

    await this.ensureUserRow(userId);

    const { data: userRow, error: userError } = await client
      .from('users')
      .select('streak')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      throw new Error(`finishSession user lookup failed: ${userError.message}`);
    }

    const { data: prevSessionRows, error: prevSessionError } = await client
      .from('study_sessions')
      .select('date')
      .eq('user_id', userId)
      .neq('id', sessionId)
      .order('date', { ascending: false })
      .limit(1);

    if (prevSessionError) {
      throw new Error(`finishSession previous session lookup failed: ${prevSessionError.message}`);
    }

    const previous = prevSessionRows?.[0]?.date ? new Date(prevSessionRows[0].date) : null;
    const currentDay = startOfDayUtc(endTime);

    const streak = computeNextStreak({
      previousStreak: Number(userRow?.streak || 0),
      previousSessionDate: previous,
      currentDate: currentDay,
    });

    const { error: userUpdateError } = await client
      .from('users')
      .update({
        xp: totalXp,
        level: getLevelNumberFromXp(totalXp),
        streak,
      })
      .eq('id', userId);

    if (userUpdateError) {
      throw new Error(`finishSession user update failed: ${userUpdateError.message}`);
    }

    return {
      duration: durationMinutes,
      xpGained,
      newLevel: getLevelLabelFromXp(totalXp),
      streak,
    };
  }

  async getPlannerWeek(userId: string, start: string) {
    const client = this.getClient();
    const startDate = new Date(`${start}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime())) {
      throw new Error('Parametro start invalido. Use YYYY-MM-DD.');
    }

    const endDate = addDaysUtc(startDate, 6);

    const { data, error } = await client
      .from('study_schedule')
      .select('id, date, subject, note, done')
      .eq('user_id', userId)
      .gte('date', toIsoDate(startDate))
      .lte('date', toIsoDate(endDate))
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`getPlannerWeek failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      day: row.date,
      subject: row.subject,
      note: row.note || null,
      status: row.done ? 'CONCLUIDO' : (row.note || '').startsWith('[FALTOU]') ? 'FALTOU' : 'PENDENTE',
    }));
  }

  async generatePlanner(input: GeneratePlannerInput) {
    const now = startOfDayUtc(new Date());
    const goals = input.goals.length > 0 ? input.goals : ['Matematica', 'Portugues', 'Natureza', 'Humanas', 'Redacao'];

    const weeklyPlan = Array.from({ length: 7 }).map((_, idx) => {
      const day = addDaysUtc(now, idx);
      const hours = Math.max(0, Math.min(12, Number(input.availableHoursPerDay[idx] || 0)));
      const subject = goals[idx % goals.length];
      const weakSkill = input.weakSkills?.[idx % Math.max(1, input.weakSkills?.length || 1)] || null;

      return {
        date: toIsoDate(day),
        subject,
        skill: weakSkill,
        durationMin: Math.max(30, hours * 60),
      };
    });

    return { weeklyPlan, source: 'fallback' as const };
  }

  async updatePlannerStatus(userId: string, id: string, status: 'PENDENTE' | 'CONCLUIDO' | 'FALTOU') {
    const client = this.getClient();

    const done = status === 'CONCLUIDO';
    const notePrefix = status === 'FALTOU' ? '[FALTOU] ' : '';

    const { data: current, error: currentError } = await client
      .from('study_schedule')
      .select('id, note')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`updatePlannerStatus read failed: ${currentError.message}`);
    }

    if (!current) {
      throw new Error('Item do planner nao encontrado para o usuario.');
    }

    const rawNote = current.note || '';
    const cleanNote = rawNote.replace(/^\[FALTOU\]\s*/i, '');

    const { data, error } = await client
      .from('study_schedule')
      .update({
        done,
        note: notePrefix + cleanNote,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, date, subject, note, done')
      .single();

    if (error) {
      throw new Error(`updatePlannerStatus failed: ${error.message}`);
    }

    return {
      id: data.id,
      day: data.date,
      subject: data.subject,
      note: data.note || null,
      status: data.done ? 'CONCLUIDO' : (data.note || '').startsWith('[FALTOU]') ? 'FALTOU' : 'PENDENTE',
    };
  }

  async getQuestions(filters: QuestionFilters) {
    const client = this.getClient();

    let query = client
      .from('questoes')
      .select('id, enunciado, nivel, explicacao, topico_id, topicos(nome, disciplina_id, disciplinas(nome))')
      .eq('ativo', true)
      .limit(50);

    if (filters.difficulty) {
      query = query.eq('nivel', filters.difficulty);
    }

    if (filters.skillId) {
      query = query.eq('topico_id', filters.skillId);
    }

    if (filters.subjectId) {
      query = query.eq('topicos.disciplina_id', filters.subjectId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`getQuestions failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      ...(function () {
        const topic = firstRelation(row.topicos);
        const discipline = firstRelation(topic?.disciplinas);
        return {
          subjectId: topic?.disciplina_id || null,
          subject: discipline?.nome || null,
          skill: topic?.nome || null,
        };
      })(),
      id: row.id,
      skillId: row.topico_id,
      difficulty: row.nivel,
      question: row.enunciado,
      explanation: row.explicacao || null,
    }));
  }

  async submitAnswer(userId: string, input: AnswerInput) {
    const client = this.getClient();
    await this.ensureUserRow(userId);

    const safeTime = Math.max(1, Math.min(3600, Number(input.timeSpentSec || 30)));

    const { data: question, error: questionError } = await client
      .from('questoes')
      .select('id, topico_id')
      .eq('id', input.questionId)
      .maybeSingle();

    if (questionError) {
      throw new Error(`submitAnswer question lookup failed: ${questionError.message}`);
    }

    if (!question) {
      throw new Error('Questao nao encontrada.');
    }

    const { error: insertError } = await client
      .from('respostas_usuarios')
      .insert({
        usuario_id: userId,
        questao_id: input.questionId,
        correta: input.isCorrect,
        tempo_resposta_seg: safeTime,
        modo_estudo: 'treino',
      });

    if (insertError) {
      throw new Error(`submitAnswer insert failed: ${insertError.message}`);
    }

    const { data: attempts, error: attemptsError } = await client
      .from('respostas_usuarios')
      .select('correta, questoes(topico_id)')
      .eq('usuario_id', userId)
      .eq('questoes.topico_id', question.topico_id);

    if (attemptsError) {
      throw new Error(`submitAnswer attempts lookup failed: ${attemptsError.message}`);
    }

    const total = attempts?.length || 0;
    const hits = (attempts || []).reduce((acc, row) => acc + (row.correta ? 1 : 0), 0);
    const score = total > 0 ? Math.round((hits / total) * 100) : 0;

    const status = score >= 80 ? 'completed' : score >= 50 ? 'studying' : 'available';

    await learningGraphService.upsertProgress({
      userId,
      topicId: question.topico_id,
      status,
      score,
      attemptsDelta: 1,
      studyMinutes: 0,
    });

    return {
      skillId: question.topico_id,
      accuracy: score,
      masteryLevel: masteryLevelFromScore(score),
    };
  }

  async getTodayStats(userId: string) {
    const client = this.getClient();
    const start = startOfDayUtc(new Date());
    const end = addDaysUtc(start, 1);

    const { data: sessions, error: sessionsError } = await client
      .from('study_sessions')
      .select('duration, points')
      .eq('user_id', userId)
      .gte('date', start.toISOString())
      .lt('date', end.toISOString());

    if (sessionsError) {
      throw new Error(`getTodayStats sessions failed: ${sessionsError.message}`);
    }

    const { data: userRow, error: userError } = await client
      .from('users')
      .select('streak, daily_goal_minutes')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      throw new Error(`getTodayStats user failed: ${userError.message}`);
    }

    return summarizeTodayStats(sessions || [], userRow?.daily_goal_minutes || 90, userRow?.streak || 0);
  }

  async getWeekStats(userId: string) {
    const client = this.getClient();

    const now = new Date();
    const start = addDaysUtc(startOfDayUtc(now), -6);
    const end = addDaysUtc(startOfDayUtc(now), 1);

    const { data, error } = await client
      .from('study_sessions')
      .select('date, duration, points')
      .eq('user_id', userId)
      .gte('date', start.toISOString())
      .lt('date', end.toISOString());

    if (error) {
      throw new Error(`getWeekStats failed: ${error.message}`);
    }

    return summarizeWeekStats(data || [], end);
  }

  async getAccuracyBySubject(userId: string) {
    const client = this.getClient();

    const { data, error } = await client
      .from('respostas_usuarios')
      .select('correta, questoes(topicos(disciplinas(nome)))')
      .eq('usuario_id', userId);

    if (error) {
      throw new Error(`getAccuracyBySubject failed: ${error.message}`);
    }

    return summarizeAccuracyBySubject((data || []).map((row) => {
      const question = firstRelation(row.questoes);
      const topic = firstRelation(question?.topicos);
      const discipline = firstRelation(topic?.disciplinas);
      return {
        subject: discipline?.nome || 'Sem disciplina',
        isCorrect: Boolean(row.correta),
      };
    }));
  }

  async getSkillsWeakness(userId: string) {
    const progress = await learningGraphService.getUserProgress(userId);

    return progress
      .map((entry) => ({
        ...(function () {
          const topic = firstRelation(entry.topicos);
          return { skill: topic?.nome || 'Topico' };
        })(),
        skillId: entry.topico_id,
        score: Number(entry.pontuacao || 0),
        attempts: Number(entry.tentativas || 0),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);
  }
}

export const studyPlatformCompatService = new StudyPlatformCompatService();
