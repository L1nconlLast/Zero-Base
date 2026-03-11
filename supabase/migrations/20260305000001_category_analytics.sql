-- ============================================================
-- Analytics by Exam Category
-- ============================================================

-- Create the tracking table
create table if not exists public.user_category_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  correct_count integer not null default 0,
  total_answered integer not null default 0,
  total_time_spent_sec integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one row per user per category
  unique(user_id, category)
);

-- Enable Row Level Security
alter table public.user_category_analytics enable row level security;

-- Policies for user_category_analytics
drop policy if exists "Users can view their own category analytics" on public.user_category_analytics;
create policy "Users can view their own category analytics"
  on public.user_category_analytics
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own category analytics" on public.user_category_analytics;
create policy "Users can insert their own category analytics"
  on public.user_category_analytics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own category analytics" on public.user_category_analytics;
create policy "Users can update their own category analytics"
  on public.user_category_analytics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add updated_at trigger
drop trigger if exists set_user_category_analytics_updated_at on public.user_category_analytics;
create trigger set_user_category_analytics_updated_at
  before update on public.user_category_analytics
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- RPC for updating category analytics from the client
-- ============================================================
create or replace function public.update_category_analytics(
  p_user_id uuid,
  p_category text,
  p_correct_count integer,
  p_total_questions integer,
  p_time_spent_sec integer
)
returns public.user_category_analytics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.user_category_analytics;
begin
  -- Ensure users can only update their own analytics unless called by service role
  if auth.uid() is not null and auth.uid() != p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.user_category_analytics (
    user_id, 
    category, 
    correct_count, 
    total_answered, 
    total_time_spent_sec
  )
  values (
    p_user_id, 
    p_category, 
    p_correct_count, 
    p_total_questions, 
    p_time_spent_sec
  )
  on conflict (user_id, category)
  do update set
    correct_count = user_category_analytics.correct_count + p_correct_count,
    total_answered = user_category_analytics.total_answered + p_total_questions,
    total_time_spent_sec = user_category_analytics.total_time_spent_sec + p_time_spent_sec,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

-- Grant execution to authenticated users
revoke all on function public.update_category_analytics(uuid, text, integer, integer, integer) from public;
grant execute on function public.update_category_analytics(uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.update_category_analytics(uuid, text, integer, integer, integer) to service_role;
