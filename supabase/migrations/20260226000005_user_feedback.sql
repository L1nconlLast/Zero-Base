-- ============================================================
-- Migration: user_feedback
-- Tabela para armazenar feedback dos usuários
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('bug', 'feature', 'elogio', 'outro')),
  message     text NOT NULL CHECK (char_length(message) >= 3 AND char_length(message) <= 2000),
  page        text,
  rating      smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_feedback_insert_own"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_feedback_select_own"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
