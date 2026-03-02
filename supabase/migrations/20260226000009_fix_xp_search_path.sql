-- ============================================================
-- Fix: Function Search Path Mutable (XP functions)
-- Security Advisor indicou funções criadas após o fix inicial
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_user_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_points integer;
  v_level integer;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total_points
  FROM public.study_sessions
  WHERE user_id = p_user_id;

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

CREATE OR REPLACE FUNCTION public.award_session_xp(
  p_user_id uuid,
  p_minutes integer,
  p_subject text,
  p_method_id text DEFAULT NULL,
  p_session_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_points integer;
  v_daily_minutes integer;
  v_session_id uuid;
  v_new_total integer;
  v_new_level integer;
BEGIN
  IF p_minutes < 1 OR p_minutes > 480 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minutos devem estar entre 1 e 480.'
    );
  END IF;

  IF p_session_date > now() + interval '1 hour' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sessão com data futura não é permitida.'
    );
  END IF;

  SELECT COALESCE(SUM(duration), 0) INTO v_daily_minutes
  FROM public.study_sessions
  WHERE user_id = p_user_id
    AND date::date = p_session_date::date;

  IF v_daily_minutes + p_minutes > 2880 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Limite diário de estudo excedido.'
    );
  END IF;

  v_points := p_minutes * 10;

  INSERT INTO public.study_sessions (user_id, date, minutes, points, subject, duration, method_id)
  VALUES (p_user_id, p_session_date, p_minutes, v_points, p_subject, p_minutes, p_method_id)
  RETURNING id INTO v_session_id;

  SELECT COALESCE(SUM(points), 0) INTO v_new_total
  FROM public.study_sessions
  WHERE user_id = p_user_id;

  v_new_level := GREATEST(1, FLOOR(v_new_total / 1000.0) + 1);

  INSERT INTO public.user_profile (user_id, total_points, level, updated_at)
  VALUES (p_user_id, v_new_total, v_new_level, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    level = EXCLUDED.level,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'points', v_points,
    'total_points', v_new_total,
    'level', v_new_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_xp_integrity(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sessions_total integer;
  v_profile_total integer;
  v_is_valid boolean;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_sessions_total
  FROM public.study_sessions
  WHERE user_id = p_user_id;

  SELECT COALESCE(total_points, 0) INTO v_profile_total
  FROM public.user_profile
  WHERE user_id = p_user_id;

  v_is_valid := (v_sessions_total = v_profile_total) OR (v_profile_total IS NULL);

  IF NOT v_is_valid THEN
    PERFORM public.recalculate_user_profile(p_user_id);
  END IF;

  RETURN jsonb_build_object(
    'sessions_total', v_sessions_total,
    'profile_total', v_profile_total,
    'valid', v_is_valid,
    'corrected', NOT v_is_valid
  );
END;
$$;
