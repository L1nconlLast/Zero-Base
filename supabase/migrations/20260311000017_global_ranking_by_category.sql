-- ============================================================
-- Global Ranking by Category
-- ============================================================

-- Create ranking table for global and category-based rankings
create table if not exists public.user_ranking_global (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  rank_position int,
  total_correct integer not null default 0,
  total_answered integer not null default 0,
  accuracy numeric not null default 0,
  streak integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one row per user per category
  unique(user_id, category)
);

-- Enable Row Level Security
alter table public.user_ranking_global enable row level security;

-- Policies for user_ranking_global
drop policy if exists "Users can view global ranking" on public.user_ranking_global;
create policy "Users can view global ranking"
  on public.user_ranking_global
  for select
  using (true);

-- Add indexes for performance
create index if not exists idx_ranking_global_category on public.user_ranking_global(category, rank_position);
create index if not exists idx_ranking_global_user on public.user_ranking_global(user_id, category);
create index if not exists idx_ranking_global_accuracy on public.user_ranking_global(category, accuracy desc);

-- ============================================================
-- RPC Function: Recalculate Rankings for a Category
-- ============================================================
create or replace function public.recalc_category_ranking(
  p_category text default null
)
returns table(
  user_id uuid,
  category text,
  rank_position int,
  total_correct integer,
  total_answered integer,
  accuracy numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If no category specified, calculate for all categories
  if p_category is null then
    -- Clear and recalculate all rankings
    delete from public.user_ranking_global;
    
    insert into public.user_ranking_global (
      user_id,
      category,
      rank_position,
      total_correct,
      total_answered,
      accuracy,
      updated_at
    )
    with ranked_data as (
      select
        uca.user_id,
        uca.category,
        row_number() over (
          partition by uca.category 
          order by uca.correct_count desc, uca.total_answered desc
        ) as rank_pos,
        uca.correct_count,
        uca.total_answered,
        case 
          when uca.total_answered > 0 
          then round(100.0 * uca.correct_count / uca.total_answered, 2)
          else 0
        end as acc
      from public.user_category_analytics uca
    )
    select
      ranked_data.user_id,
      ranked_data.category,
      ranked_data.rank_pos,
      ranked_data.correct_count,
      ranked_data.total_answered,
      ranked_data.acc
    from ranked_data
    where ranked_data.rank_pos <= 100; -- Top 100 per category
    
  else
    -- Recalculate for specific category
    delete from public.user_ranking_global
    where category = p_category;
    
    insert into public.user_ranking_global (
      user_id,
      category,
      rank_position,
      total_correct,
      total_answered,
      accuracy,
      updated_at
    )
    with ranked_data as (
      select
        uca.user_id,
        uca.category,
        row_number() over (
          order by uca.correct_count desc, uca.total_answered desc
        ) as rank_pos,
        uca.correct_count,
        uca.total_answered,
        case 
          when uca.total_answered > 0 
          then round(100.0 * uca.correct_count / uca.total_answered, 2)
          else 0
        end as acc
      from public.user_category_analytics uca
      where uca.category = p_category
    )
    select
      ranked_data.user_id,
      ranked_data.category,
      ranked_data.rank_pos,
      ranked_data.correct_count,
      ranked_data.total_answered,
      ranked_data.acc
    from ranked_data
    where ranked_data.rank_pos <= 100; -- Top 100
  end if;
  
  return query
  select
    urb.user_id,
    urb.category,
    urb.rank_position,
    urb.total_correct,
    urb.total_answered,
    urb.accuracy
  from public.user_ranking_global urb
  order by urb.category, urb.rank_position;
end;
$$;

-- Grant execution to all authenticated users
revoke all on function public.recalc_category_ranking(text) from public;
grant execute on function public.recalc_category_ranking(text) to authenticated, service_role;

-- ============================================================
-- RPC Function: Get Ranking for a Specific Category
-- ============================================================
create or replace function public.get_category_ranking(
  p_category text,
  p_limit integer default 50
)
returns table(
  rank_position int,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_correct integer,
  total_answered integer,
  accuracy numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    urb.rank_position,
    urb.user_id,
    coalesce(up.display_name, 'Anônimo') as display_name,
    up.avatar_url,
    urb.total_correct,
    urb.total_answered,
    urb.accuracy
  from public.user_ranking_global urb
  left join public.user_profiles up on up.user_id = urb.user_id
  where urb.category = p_category
  order by urb.rank_position asc
  limit p_limit;
end;
$$;

grant execute on function public.get_category_ranking(text, integer) to authenticated;

-- ============================================================
-- RPC Function: Get User's Rank in a Category
-- ============================================================
create or replace function public.get_user_rank_in_category(
  p_user_id uuid,
  p_category text
)
returns table(
  rank_position int,
  total_correct integer,
  total_answered integer,
  accuracy numeric,
  percentile numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank int;
  v_total_users int;
  v_percentile numeric;
begin
  -- Get user's rank
  select urb.rank_position, urb.total_correct, urb.total_answered, urb.accuracy
  into v_rank, v_rank, v_rank, v_percentile
  from public.user_ranking_global urb
  where urb.user_id = p_user_id and urb.category = p_category;
  
  -- If not ranked, return null
  if v_rank is null then
    return;
  end if;
  
  -- Count total users in category
  select count(*)
  into v_total_users
  from public.user_ranking_global
  where category = p_category;
  
  -- Calculate percentile
  v_percentile := case 
    when v_total_users > 0
    then round(100.0 * (1 - (v_rank - 1)::numeric / v_total_users), 2)
    else 0
  end;
  
  return query
  select
    urb.rank_position,
    urb.total_correct,
    urb.total_answered,
    urb.accuracy,
    v_percentile
  from public.user_ranking_global urb
  where urb.user_id = p_user_id and urb.category = p_category;
end;
$$;

grant execute on function public.get_user_rank_in_category(uuid, text) to authenticated;
