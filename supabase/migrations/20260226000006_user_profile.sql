-- ============================================================
-- Migration: user_profile (estado principal do usuário)
-- Armazena XP, nível, streak, meta diária, weekProgress
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profile (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points    integer NOT NULL DEFAULT 0,
  level           integer NOT NULL DEFAULT 1,
  current_streak  integer NOT NULL DEFAULT 0,
  best_streak     integer NOT NULL DEFAULT 0,
  daily_goal      integer NOT NULL DEFAULT 90,
  week_progress   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profile_select_own"
  ON public.user_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_profile_insert_own"
  ON public.user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profile_update_own"
  ON public.user_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON public.user_profile(user_id);

-- Function: recalcula XP, nível e streaks a partir das sessions
CREATE OR REPLACE FUNCTION public.recalculate_user_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_points integer;
  v_level integer;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.study_sessions
  WHERE user_id = p_user_id;

  -- Cálculo simples de nível (mesma lógica do frontend)
  v_level := GREATEST(1, FLOOR(v_total_points / 1000.0) + 1);

  INSERT INTO public.user_profile (user_id, total_points, level, updated_at)
  VALUES (p_user_id, v_total_points, v_level, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    level = EXCLUDED.level,
    updated_at = now();
END;
$$;
