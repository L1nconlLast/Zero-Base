/**
 * ypt-app-settings-groups-integration.sql
 *
 * INTEGRAÇÃO FINAL: Settings + Groups com atomicidade e anti-abuse
 * Migração incremental — adiciona ao projeto Zero Base
 *
 * Includes:
 * - Tabelas: user_settings, user_study_schedule, study_groups, group_members, etc
 * - RPC: join_group_atomic (previne race condition)
 * - Índices de performance
 * - RLS policies
 * - Trigger para defaults
 */

-- ============================================================
-- SETTINGS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pomodoro
  pomodoro_enabled           BOOLEAN DEFAULT FALSE,
  pomodoro_work_min          INT DEFAULT 25 CHECK (pomodoro_work_min BETWEEN 5 AND 120),
  pomodoro_break_min         INT DEFAULT 5  CHECK (pomodoro_break_min BETWEEN 1 AND 60),

  -- Modo desconectado
  offline_mode               BOOLEAN DEFAULT FALSE,

  -- Descanso
  rest_between_sessions_min  INT DEFAULT 5,
  rest_confirm_resume        BOOLEAN DEFAULT FALSE,

  -- Tema
  theme                      TEXT DEFAULT 'dark' CHECK (theme IN ('light','dark','system')),

  -- Lembretes
  reminder_enabled           BOOLEAN DEFAULT TRUE,
  reminder_time              TIME DEFAULT '08:00',

  -- D-Day
  d_day_event_name           VARCHAR(100),
  d_day_event_date           DATE CHECK (d_day_event_date IS NULL OR d_day_event_date >= CURRENT_DATE),

  -- Meta semanal
  weekly_goal_minutes        INT DEFAULT 420 CHECK (weekly_goal_minutes >= 60),

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cronograma semanal ──
CREATE TABLE IF NOT EXISTS user_study_schedule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week      INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  subject_label    VARCHAR(100),
  enabled          BOOLEAN DEFAULT TRUE,
  recurrence_start DATE DEFAULT CURRENT_DATE,
  recurrence_end   DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT start_before_end CHECK (start_time < end_time)
);

-- ── Allowed apps ──
CREATE TABLE IF NOT EXISTS allowed_apps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name   VARCHAR(100) NOT NULL,
  app_url    TEXT,
  enabled    BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────

-- ============================================================
-- GROUPS MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS study_groups (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
  description          TEXT,
  category             TEXT DEFAULT 'Outros' CHECK (category IN (
                         'REP-ENEM','EM3-ENEM','REP-ITA/IME','Graduação','Outros'
                       )),
  emblem_url           TEXT,
  leader_user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public            BOOLEAN DEFAULT TRUE,
  is_promoted          BOOLEAN DEFAULT FALSE,
  goal_minutes_daily   INT DEFAULT 360 CHECK (goal_minutes_daily >= 60),
  max_members          INT DEFAULT 30 CHECK (max_members >= 2),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Membros ──
CREATE TABLE IF NOT EXISTS group_members (
  group_id   UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member' CHECK (role IN ('leader','admin','member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  status     TEXT DEFAULT 'active' CHECK (status IN ('active','left')),
  PRIMARY KEY (group_id, user_id)
);

-- ── Sessões do grupo ──
CREATE TABLE IF NOT EXISTS group_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at           TIMESTAMPTZ NOT NULL,
  ended_at             TIMESTAMPTZ,
  duration_min         INT,
  camera_on            BOOLEAN DEFAULT FALSE,
  valid_for_ranking    BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Missões semanais ──
CREATE TABLE IF NOT EXISTS group_missions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  week_ref     DATE NOT NULL,
  target_value INT NOT NULL DEFAULT 60 CHECK (target_value > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Progresso de missões ──
CREATE TABLE IF NOT EXISTS group_mission_progress (
  mission_id    UUID REFERENCES group_missions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value INT DEFAULT 0 CHECK (current_value >= 0),
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  PRIMARY KEY (mission_id, user_id)
);

-- ────────────────────────────────────────────────────────────

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_settings_user              ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_user              ON user_study_schedule(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_enabled           ON user_study_schedule(enabled, start_time) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_members_user         ON group_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_group        ON group_members(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_sessions_group       ON group_sessions(group_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_sessions_user        ON group_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_group_week        ON group_missions(group_id, week_ref);
CREATE INDEX IF NOT EXISTS idx_mission_progress_user      ON group_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_group_category             ON study_groups(category) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_promoted             ON study_groups(is_promoted DESC) WHERE is_public = TRUE;

-- ────────────────────────────────────────────────────────────

-- ============================================================
-- STORED FUNCTIONS (RPC)
-- ============================================================

/** ✅ join_group_atomic: Previne race condition em max_members **/
CREATE OR REPLACE FUNCTION join_group_atomic(p_group_id UUID, p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group study_groups%ROWTYPE;
  v_current_count INT;
  v_already_member BOOLEAN;
BEGIN
  -- 1. Lock linha do grupo para garantir consistência
  SELECT * INTO v_group
  FROM study_groups
  WHERE id = p_group_id
  FOR UPDATE;

  IF v_group.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Grupo não encontrado', 'code', 'NOT_FOUND');
  END IF;

  -- 2. Verifica se já é membro
  SELECT COUNT(*) > 0 INTO v_already_member
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_already_member THEN
    RETURN jsonb_build_object('error', 'Já é membro do grupo', 'code', 'ALREADY_MEMBER');
  END IF;

  -- 3. Conta membros ativos
  SELECT COUNT(*) INTO v_current_count
  FROM group_members
  WHERE group_id = p_group_id AND status = 'active';

  -- 4. Valida max_members
  IF v_current_count >= v_group.max_members THEN
    RETURN jsonb_build_object('error', 'Grupo cheio', 'code', 'MAX_MEMBERS_EXCEEDED', 'current', v_current_count, 'max', v_group.max_members);
  END IF;

  -- 5. Insert atomicamente
  INSERT INTO group_members (group_id, user_id, role, status)
  VALUES (p_group_id, p_user_id, 'member', 'active');

  RETURN jsonb_build_object('success', TRUE, 'message', 'Adicionado ao grupo');
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('error', 'Já é membro do grupo', 'code', 'ALREADY_MEMBER');
WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'code', 'DB_ERROR');
END;
$$;

-- ────────────────────────────────────────────────────────────

-- ============================================================
-- AUTO-CREATE DEFAULTS ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_settings();

-- ────────────────────────────────────────────────────────────

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE user_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_apps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_missions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_mission_progress ENABLE ROW LEVEL SECURITY;

-- ── Settings: own only ──
CREATE POLICY "settings_own" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "schedule_own" ON user_study_schedule
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "apps_own" ON allowed_apps
  FOR ALL USING (auth.uid() = user_id);

-- ── Groups: public readable, member actions, leader writes ──
CREATE POLICY "groups_select" ON study_groups FOR SELECT USING (
  is_public = TRUE
  OR leader_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = study_groups.id AND user_id = auth.uid()
  )
);

CREATE POLICY "groups_insert" ON study_groups FOR INSERT
  WITH CHECK (auth.uid() = leader_user_id);

CREATE POLICY "groups_update" ON study_groups FOR UPDATE USING (
  auth.uid() = leader_user_id
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = study_groups.id AND user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "members_select_all" ON group_members FOR SELECT USING (TRUE);
CREATE POLICY "members_own"        ON group_members FOR ALL  USING (auth.uid() = user_id);

CREATE POLICY "sessions_own"       ON group_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sessions_select_group" ON group_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_sessions.group_id AND user_id = auth.uid())
);

CREATE POLICY "missions_select" ON group_missions FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_missions.group_id AND user_id = auth.uid())
);

CREATE POLICY "progress_own" ON group_mission_progress FOR ALL USING (auth.uid() = user_id);
