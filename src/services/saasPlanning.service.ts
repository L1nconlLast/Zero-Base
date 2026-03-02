import { isSupabaseConfigured, supabase } from './supabase.client';
import type { DifficultyLevel, SmartScheduleProfile } from '../utils/smartScheduleEngine';

const PROFILE_TABLE = 'profiles';
const SUBJECT_LEVELS_TABLE = 'subject_levels';

interface ProfileRow {
  id: string;
  goal: string;
  exam_date: string;
  hours_per_day: number;
  study_days: string[];
  study_style: string;
  desired_score: number | null;
  preferred_period: string | null;
}

interface SubjectLevelRow {
  id: string;
  user_id: string;
  subject: string;
  level: DifficultyLevel;
}

const weekdayToCode = (day: number): string => {
  const map: Record<number, string> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  return map[day] || 'seg';
};

const codeToWeekday = (code: string): number => {
  const map: Record<string, number> = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };
  return map[code] ?? 1;
};

const toProfileRow = (userId: string, profile: SmartScheduleProfile): Omit<ProfileRow, 'id'> & { id: string } => ({
  id: userId,
  goal: profile.examName,
  exam_date: profile.examDate,
  hours_per_day: profile.hoursPerDay,
  study_days: profile.availableWeekDays.map(weekdayToCode),
  study_style: profile.studyStyle,
  desired_score: profile.desiredScore,
  preferred_period: profile.preferredPeriod,
});

const toSmartProfile = (row: ProfileRow, levels: SubjectLevelRow[]): SmartScheduleProfile => {
  const subjectDifficulty = levels.reduce<Record<string, DifficultyLevel>>((acc, level) => {
    acc[level.subject] = level.level;
    return acc;
  }, {});

  const subjectWeight = Object.keys(subjectDifficulty).reduce<Record<string, number>>((acc, subject) => {
    const level = subjectDifficulty[subject];
    acc[subject] = level === 'fraco' ? 35 : level === 'medio' ? 20 : 10;
    return acc;
  }, {});

  return {
    examName: row.goal === 'CONCURSO' ? 'CONCURSO' : 'ENEM',
    examDate: row.exam_date,
    desiredScore: row.desired_score ?? 780,
    hoursPerDay: row.hours_per_day,
    availableWeekDays: row.study_days.map(codeToWeekday),
    preferredPeriod: (row.preferred_period as SmartScheduleProfile['preferredPeriod']) || 'manha',
    studyStyle: (row.study_style as SmartScheduleProfile['studyStyle']) || 'teoria_questoes',
    reviewCadence: 'semanal',
    simulationIntervalWeeks: 2,
    subjectDifficulty,
    subjectWeight,
  };
};

class SaasPlanningService {
  async upsertProfile(userId: string, profile: SmartScheduleProfile): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase.from(PROFILE_TABLE).upsert(toProfileRow(userId, profile), { onConflict: 'id' });

    if (error) {
      throw new Error(`Erro ao salvar profile SaaS: ${error.message}`);
    }
  }

  async upsertSubjectLevels(userId: string, levels: Record<string, DifficultyLevel>): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const payload = Object.entries(levels).map(([subject, level]) => ({
      user_id: userId,
      subject,
      level,
    }));

    if (payload.length === 0) return;

    const { error } = await supabase.from(SUBJECT_LEVELS_TABLE).upsert(payload, { onConflict: 'user_id,subject' });
    if (error) {
      throw new Error(`Erro ao salvar níveis por matéria: ${error.message}`);
    }
  }

  async getProfile(userId: string): Promise<SmartScheduleProfile | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    const [{ data: profileData, error: profileError }, { data: levelsData, error: levelsError }] = await Promise.all([
      supabase.from(PROFILE_TABLE).select('*').eq('id', userId).maybeSingle(),
      supabase.from(SUBJECT_LEVELS_TABLE).select('*').eq('user_id', userId),
    ]);

    if (profileError) {
      throw new Error(`Erro ao carregar profile SaaS: ${profileError.message}`);
    }

    if (levelsError) {
      throw new Error(`Erro ao carregar níveis das matérias: ${levelsError.message}`);
    }

    if (!profileData) {
      return null;
    }

    return toSmartProfile(profileData as ProfileRow, (levelsData || []) as SubjectLevelRow[]);
  }
}

export const saasPlanningService = new SaasPlanningService();
