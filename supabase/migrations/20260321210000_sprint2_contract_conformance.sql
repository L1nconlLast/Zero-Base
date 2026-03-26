create extension if not exists "pgcrypto";

alter table public.study_sessions
  add column if not exists status text,
  add column if not exists total_questions integer,
  add column if not exists correct_answers integer not null default 0,
  add column if not exists finished_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.study_sessions
set
  status = coalesce(status, 'finished'),
  updated_at = coalesce(updated_at, created_at, now())
where status is null
   or updated_at is null;

alter table public.study_sessions
  alter column status set default 'active',
  alter column status set not null;

alter table public.study_sessions
  drop constraint if exists study_sessions_status_check;

alter table public.study_sessions
  add constraint study_sessions_status_check
  check (status in ('active', 'finished'));

create index if not exists idx_study_sessions_user_status_created_at
  on public.study_sessions(user_id, status, created_at desc);

create table if not exists public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  question_id uuid not null references public.questoes(id) on delete cascade,
  position integer not null check (position >= 1),
  created_at timestamptz not null default now(),
  unique(session_id, question_id),
  unique(session_id, position)
);

create index if not exists idx_session_questions_session_position
  on public.session_questions(session_id, position);

create index if not exists idx_session_questions_question_id
  on public.session_questions(question_id);

create table if not exists public.user_daily_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  questions_answered integer not null default 0 check (questions_answered >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists idx_user_daily_progress_user_date
  on public.user_daily_progress(user_id, date desc);

alter table public.question_attempts
  add column if not exists session_id uuid references public.study_sessions(id) on delete cascade,
  add column if not exists question_id uuid references public.questoes(id) on delete cascade;

create index if not exists idx_question_attempts_session_created_at
  on public.question_attempts(session_id, created_at desc);

create unique index if not exists idx_question_attempts_session_question_unique
  on public.question_attempts(session_id, question_id)
  where session_id is not null and question_id is not null;

alter table public.session_questions enable row level security;
alter table public.user_daily_progress enable row level security;

drop policy if exists "session_questions_select_own" on public.session_questions;
create policy "session_questions_select_own"
  on public.session_questions for select
  using (
    exists (
      select 1
      from public.study_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "session_questions_insert_own" on public.session_questions;
create policy "session_questions_insert_own"
  on public.session_questions for insert
  with check (
    exists (
      select 1
      from public.study_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "session_questions_update_own" on public.session_questions;
create policy "session_questions_update_own"
  on public.session_questions for update
  using (
    exists (
      select 1
      from public.study_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.study_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "session_questions_delete_own" on public.session_questions;
create policy "session_questions_delete_own"
  on public.session_questions for delete
  using (
    exists (
      select 1
      from public.study_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "user_daily_progress_select_own" on public.user_daily_progress;
create policy "user_daily_progress_select_own"
  on public.user_daily_progress for select
  using (auth.uid() = user_id);

drop policy if exists "user_daily_progress_insert_own" on public.user_daily_progress;
create policy "user_daily_progress_insert_own"
  on public.user_daily_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_daily_progress_update_own" on public.user_daily_progress;
create policy "user_daily_progress_update_own"
  on public.user_daily_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_daily_progress_delete_own" on public.user_daily_progress;
create policy "user_daily_progress_delete_own"
  on public.user_daily_progress for delete
  using (auth.uid() = user_id);
