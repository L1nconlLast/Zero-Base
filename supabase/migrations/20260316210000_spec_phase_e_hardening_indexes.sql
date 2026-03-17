-- ============================================================
-- SPEC Phase E hardening indexes
-- Alinhado ao schema real do projeto Zero Base.
-- ============================================================

create index if not exists idx_study_sessions_user_date_desc
  on public.study_sessions(user_id, date desc);

create index if not exists idx_respostas_usuarios_usuario_questao_data
  on public.respostas_usuarios(usuario_id, questao_id, data_resposta desc);

create index if not exists idx_progresso_topicos_usuario_topico
  on public.progresso_topicos(usuario_id, topico_id);

create index if not exists idx_user_learning_progress_usuario_topico
  on public.user_learning_progress(usuario_id, topico_id);

create index if not exists idx_user_learning_progress_usuario_disciplina_lookup
  on public.user_learning_progress(usuario_id, atualizado_em desc, topico_id);