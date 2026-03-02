-- ============================================================
-- Migration: questions exam sessions
-- Persistência de simulados e quiz diário para sync em nuvem
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mock_exam_sessions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                        timestamptz NOT NULL DEFAULT now(),
  track                       text NOT NULL CHECK (track IN ('enem', 'concurso', 'ambos')),
  model_id                    text,
  model_name                  text,
  banca                       text,
  total_questions             integer NOT NULL CHECK (total_questions > 0),
  correct_count               integer NOT NULL CHECK (correct_count >= 0),
  xp_earned                   integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  avg_time_per_question_sec   numeric(8,2) NOT NULL DEFAULT 0,
  mistakes_by_topic           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_quiz_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             timestamptz NOT NULL DEFAULT now(),
  track            text NOT NULL CHECK (track IN ('enem', 'concurso', 'ambos')),
  total_questions  integer NOT NULL CHECK (total_questions > 0),
  correct_count    integer NOT NULL CHECK (correct_count >= 0),
  xp_earned        integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  streak           integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  weak_topics      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_exam_sessions_select_own"
  ON public.mock_exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "mock_exam_sessions_insert_own"
  ON public.mock_exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mock_exam_sessions_update_own"
  ON public.mock_exam_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_quiz_sessions_select_own"
  ON public.daily_quiz_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "daily_quiz_sessions_insert_own"
  ON public.daily_quiz_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_quiz_sessions_update_own"
  ON public.daily_quiz_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_sessions_user_date
  ON public.mock_exam_sessions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_sessions_user_date
  ON public.daily_quiz_sessions(user_id, date DESC);
