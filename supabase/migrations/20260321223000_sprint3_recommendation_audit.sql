alter table public.user_recommendations
  add column if not exists source_session_id uuid references public.study_sessions(id) on delete set null,
  add column if not exists decision_type text,
  add column if not exists decision_context jsonb;

update public.user_recommendations
set
  decision_type = coalesce(decision_type, 'starter_profile'),
  decision_context = coalesce(decision_context, '{}'::jsonb)
where decision_type is null
   or decision_context is null;

alter table public.user_recommendations
  alter column decision_type set default 'starter_profile',
  alter column decision_type set not null,
  alter column decision_context set default '{}'::jsonb,
  alter column decision_context set not null;

alter table public.user_recommendations
  drop constraint if exists user_recommendations_decision_type_check;

alter table public.user_recommendations
  add constraint user_recommendations_decision_type_check
  check (decision_type in ('starter_profile', 'error_rate_recent'));

create index if not exists idx_user_recommendations_source_session_id
  on public.user_recommendations(source_session_id);

create index if not exists idx_user_recommendations_decision_type
  on public.user_recommendations(user_id, decision_type, generated_at desc);
