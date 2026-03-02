-- Adaptive Learning Schema
-- Armazena tentativas, métricas por tópico e planos de revisão por usuário.

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  correct boolean not null,
  response_time_seconds integer not null check (response_time_seconds > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_question_attempts_user_id_created_at
  on public.question_attempts(user_id, created_at desc);
create index if not exists idx_question_attempts_user_subject_topic
  on public.question_attempts(user_id, subject, topic);

create table if not exists public.topic_performance_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  total_attempts integer not null default 0,
  correct_attempts integer not null default 0,
  average_response_time_seconds numeric(10,2) not null default 0,
  weighted_domain_score numeric(10,2) not null default 0,
  status text not null check (status in ('weak', 'developing', 'strong')) default 'developing',
  updated_at timestamptz not null default now(),
  unique(user_id, subject, topic)
);

create index if not exists idx_topic_performance_metrics_user_status
  on public.topic_performance_metrics(user_id, status);

create table if not exists public.review_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  review_stage integer not null default 1 check (review_stage in (1, 2, 3, 4)),
  scheduled_for timestamptz not null,
  reason text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_review_plan_items_user_scheduled
  on public.review_plan_items(user_id, scheduled_for asc);
create index if not exists idx_review_plan_items_user_completed
  on public.review_plan_items(user_id, completed);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_topic_performance_metrics_touch_updated_at on public.topic_performance_metrics;
create trigger trigger_topic_performance_metrics_touch_updated_at
before update on public.topic_performance_metrics
for each row execute function public.touch_updated_at();

drop trigger if exists trigger_review_plan_items_touch_updated_at on public.review_plan_items;
create trigger trigger_review_plan_items_touch_updated_at
before update on public.review_plan_items
for each row execute function public.touch_updated_at();

alter table public.question_attempts enable row level security;
alter table public.topic_performance_metrics enable row level security;
alter table public.review_plan_items enable row level security;

drop policy if exists "Users can select own question attempts" on public.question_attempts;
create policy "Users can select own question attempts"
  on public.question_attempts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own question attempts" on public.question_attempts;
create policy "Users can insert own question attempts"
  on public.question_attempts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own question attempts" on public.question_attempts;
create policy "Users can update own question attempts"
  on public.question_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own question attempts" on public.question_attempts;
create policy "Users can delete own question attempts"
  on public.question_attempts
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select own topic performance metrics" on public.topic_performance_metrics;
create policy "Users can select own topic performance metrics"
  on public.topic_performance_metrics
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own topic performance metrics" on public.topic_performance_metrics;
create policy "Users can insert own topic performance metrics"
  on public.topic_performance_metrics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own topic performance metrics" on public.topic_performance_metrics;
create policy "Users can update own topic performance metrics"
  on public.topic_performance_metrics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own topic performance metrics" on public.topic_performance_metrics;
create policy "Users can delete own topic performance metrics"
  on public.topic_performance_metrics
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select own review plan items" on public.review_plan_items;
create policy "Users can select own review plan items"
  on public.review_plan_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own review plan items" on public.review_plan_items;
create policy "Users can insert own review plan items"
  on public.review_plan_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own review plan items" on public.review_plan_items;
create policy "Users can update own review plan items"
  on public.review_plan_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own review plan items" on public.review_plan_items;
create policy "Users can delete own review plan items"
  on public.review_plan_items
  for delete
  using (auth.uid() = user_id);
