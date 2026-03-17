-- ============================================================
-- Ranking Global — Hardening para produção
-- Adiciona: active_sessions, study_sessions (fonte de verdade),
-- ranking_snapshots enriquecido, percentil por categoria,
-- e função calculate_ranking_snapshot atualizada.
-- Migration incremental — não destrói dados existentes.
-- ============================================================

-- ── 1. study_sessions (fonte de verdade de estudo) ───────────
CREATE TABLE IF NOT EXISTS public.study_sessions_ranking (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ NOT NULL,
  duration_min  INT GENERATED ALWAYS AS (
    GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::INT
  ) STORED,
  category      TEXT NOT NULL DEFAULT 'Outros'
    CHECK (category IN ('REP-ENEM','EM3-ENEM','REP-ITA/IME','Graduação','Outros')),
  camera_on     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ranking_sessions_user_started
  ON public.study_sessions_ranking (user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_ranking_sessions_started
  ON public.study_sessions_ranking (started_at);

-- ── 2. active_sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.active_study_sessions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category    TEXT NOT NULL DEFAULT 'Outros'
    CHECK (category IN ('REP-ENEM','EM3-ENEM','REP-ITA/IME','Graduação','Outros')),
  camera_on   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. ranking_snapshots com percentil global + categoria ────
CREATE TABLE IF NOT EXISTS public.ranking_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period               TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  ref_date             DATE NOT NULL,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT NOT NULL,
  avatar_url           TEXT,
  category             TEXT,
  total_valid_min      INT NOT NULL DEFAULT 0,
  position             INT NOT NULL,
  percentile           INT NOT NULL DEFAULT 0,  -- global (retrocompat)
  percentile_global    INT NOT NULL DEFAULT 0,
  percentile_category  INT NOT NULL DEFAULT 0,
  position_category    INT NOT NULL DEFAULT 0,
  total_users_global   INT NOT NULL DEFAULT 0,
  total_users_category INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, ref_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_period_date_pos
  ON public.ranking_snapshots (period, ref_date, position);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_user
  ON public.ranking_snapshots (user_id, period, ref_date);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_category
  ON public.ranking_snapshots (period, ref_date, category, position_category);

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE public.study_sessions_ranking    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_study_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_snapshots         ENABLE ROW LEVEL SECURITY;

-- study_sessions: dono vê/escreve as suas
DROP POLICY IF EXISTS "ranking_sessions_own" ON public.study_sessions_ranking;
CREATE POLICY "ranking_sessions_own"
  ON public.study_sessions_ranking FOR ALL
  USING (auth.uid() = user_id);

-- active_sessions: leitura pública (para contar), escrita própria
DROP POLICY IF EXISTS "active_sessions_select_all" ON public.active_study_sessions;
CREATE POLICY "active_sessions_select_all"
  ON public.active_study_sessions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "active_sessions_own" ON public.active_study_sessions;
CREATE POLICY "active_sessions_own"
  ON public.active_study_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ranking_snapshots: leitura pública
DROP POLICY IF EXISTS "ranking_snapshots_select_all" ON public.ranking_snapshots;
CREATE POLICY "ranking_snapshots_select_all"
  ON public.ranking_snapshots FOR SELECT USING (TRUE);

-- ── 5. Anti-abuso: verifica se sessão é válida ───────────────
CREATE OR REPLACE FUNCTION public.is_ranking_session_valid(
  p_duration_min  INT,
  p_total_day_min INT
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- >9h contínua OR >20h/dia acumulado: inválido
  IF p_duration_min  >= 540  THEN RETURN FALSE; END IF;
  IF p_total_day_min >= 1200 THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$;

-- ── 6. calculate_ranking_snapshot (versão hardened) ──────────
CREATE OR REPLACE FUNCTION public.calculate_ranking_snapshot(
  p_period   TEXT,
  p_ref_date DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start         TIMESTAMPTZ;
  v_end           TIMESTAMPTZ;
  v_total_global  INT;
  v_inserted      INT;
BEGIN
  -- Janela de tempo
  IF p_period = 'daily' THEN
    v_start := p_ref_date::TIMESTAMPTZ;
    v_end   := v_start + INTERVAL '1 day';
  ELSIF p_period = 'weekly' THEN
    v_start := date_trunc('week', p_ref_date::TIMESTAMPTZ);
    v_end   := v_start + INTERVAL '7 days';
  ELSIF p_period = 'monthly' THEN
    v_start := date_trunc('month', p_ref_date::TIMESTAMPTZ);
    v_end   := v_start + INTERVAL '1 month';
  ELSE
    RAISE EXCEPTION 'periodo invalido: %', p_period;
  END IF;

  -- Remove snapshot anterior do mesmo período/data
  DELETE FROM public.ranking_snapshots
  WHERE period = p_period AND ref_date = p_ref_date;

  -- Total de usuários globais no período
  SELECT COUNT(DISTINCT user_id) INTO v_total_global
  FROM public.study_sessions_ranking
  WHERE started_at >= v_start AND started_at < v_end;

  -- Insere snapshot com percentis
  WITH day_totals AS (
    -- Soma por usuário por dia (para verificar limite diário)
    SELECT
      user_id,
      started_at::DATE AS study_date,
      SUM(duration_min) AS total_day_min
    FROM public.study_sessions_ranking
    WHERE started_at >= v_start AND started_at < v_end
    GROUP BY user_id, started_at::DATE
  ),
  valid_sessions AS (
    -- Somente sessões que passam nas regras anti-abuso
    SELECT s.user_id, s.duration_min, s.category
    FROM public.study_sessions_ranking s
    JOIN day_totals dt
      ON dt.user_id = s.user_id
     AND dt.study_date = s.started_at::DATE
    WHERE s.started_at >= v_start
      AND s.started_at < v_end
      AND public.is_ranking_session_valid(s.duration_min, dt.total_day_min)
  ),
  aggregated AS (
    SELECT
      user_id,
      SUM(duration_min) AS total_valid_min,
      MAX(category)     AS category   -- categoria mais recente do período
    FROM valid_sessions
    GROUP BY user_id
  ),
  category_counts AS (
    SELECT category, COUNT(*) AS cnt
    FROM aggregated
    GROUP BY category
  ),
  ranked_global AS (
    SELECT
      a.user_id,
      a.total_valid_min,
      a.category,
      ROW_NUMBER() OVER (ORDER BY a.total_valid_min DESC, a.user_id) AS position,
      COUNT(*) OVER ()                                                 AS total_global
    FROM aggregated a
  ),
  ranked_category AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_valid_min DESC, user_id) AS pos_cat,
      cc.cnt AS total_category
    FROM aggregated a
    JOIN category_counts cc USING (category)
  )
  INSERT INTO public.ranking_snapshots (
    period, ref_date, user_id, username, avatar_url, category,
    total_valid_min,
    position,
    percentile,
    percentile_global,
    percentile_category,
    position_category,
    total_users_global,
    total_users_category
  )
  SELECT
    p_period,
    p_ref_date,
    rg.user_id,
    COALESCE(p.username, 'Estudante'),
    p.avatar_url,
    rg.category,
    rg.total_valid_min,
    rg.position::INT,
    -- percentile (retrocompat = global)
    CASE WHEN rg.total_global > 0
      THEN ROUND((1 - rg.position::NUMERIC / rg.total_global) * 100)::INT
      ELSE 0 END,
    -- percentile_global
    CASE WHEN rg.total_global > 0
      THEN ROUND((1 - rg.position::NUMERIC / rg.total_global) * 100)::INT
      ELSE 0 END,
    -- percentile_category
    CASE WHEN rc.total_category > 0
      THEN ROUND((1 - rc.pos_cat::NUMERIC / rc.total_category) * 100)::INT
      ELSE 0 END,
    rc.pos_cat::INT,
    rg.total_global::INT,
    rc.total_category::INT
  FROM ranked_global rg
  JOIN ranked_category rc USING (user_id)
  LEFT JOIN public.profiles p ON p.id = rg.user_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'period',         p_period,
    'ref_date',       p_ref_date,
    'total_global',   v_total_global,
    'rows_inserted',  v_inserted
  );
END;
$$;

-- ── 7. Profiles (se não existir) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  category   TEXT DEFAULT 'Outros'
    CHECK (category IN ('REP-ENEM','EM3-ENEM','REP-ITA/IME','Graduação','Outros')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
