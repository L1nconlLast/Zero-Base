-- Adaptive analytics computed server-side from question_attempts

alter table public.topic_performance_metrics
  add column if not exists incorrect_attempts integer not null default 0,
  add column if not exists error_rate numeric(10,2) not null default 0,
  add column if not exists average_difficulty_weight numeric(10,2) not null default 1,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists recency_factor numeric(10,2) not null default 1,
  add column if not exists priority_score numeric(10,2) not null default 0;

create or replace function public.compute_adaptive_status(weighted_score numeric)
returns text
language sql
immutable
as $$
  select case
    when weighted_score < 60 then 'weak'
    when weighted_score < 85 then 'developing'
    else 'strong'
  end;
$$;

create or replace function public.rebuild_adaptive_analytics(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.topic_performance_metrics where user_id = p_user_id;

  insert into public.topic_performance_metrics (
    user_id,
    subject,
    topic,
    total_attempts,
    correct_attempts,
    incorrect_attempts,
    average_response_time_seconds,
    weighted_domain_score,
    status,
    error_rate,
    average_difficulty_weight,
    last_reviewed_at,
    recency_factor,
    priority_score,
    updated_at
  )
  with topic_base as (
    select
      qa.user_id,
      qa.subject,
      qa.topic,
      count(*)::int as total_attempts,
      sum(case when qa.correct then 1 else 0 end)::int as correct_attempts,
      count(*)::int - sum(case when qa.correct then 1 else 0 end)::int as incorrect_attempts,
      avg(qa.response_time_seconds::numeric) as avg_response_time_seconds,
      avg(
        case qa.difficulty
          when 'easy' then 0.9
          when 'medium' then 1.0
          when 'hard' then 1.15
          else 1.0
        end
      ) as avg_difficulty_weight,
      max(qa.created_at) as last_reviewed_at,
      100.0 * sum(case when qa.correct then 1 else 0 end)::numeric / nullif(count(*)::numeric, 0) as accuracy_rate
    from public.question_attempts qa
    where qa.user_id = p_user_id
    group by qa.user_id, qa.subject, qa.topic
  ),
  scored as (
    select
      tb.user_id,
      tb.subject,
      tb.topic,
      tb.total_attempts,
      tb.correct_attempts,
      tb.incorrect_attempts,
      round(tb.avg_response_time_seconds, 2) as average_response_time_seconds,
      round(tb.avg_difficulty_weight, 2) as average_difficulty_weight,
      tb.last_reviewed_at,
      round((100 - tb.accuracy_rate), 2) as error_rate,
      greatest(
        0,
        least(
          100,
          tb.accuracy_rate
          * tb.avg_difficulty_weight
          * case
              when tb.avg_response_time_seconds > 120 then 0.88
              when tb.avg_response_time_seconds > 80 then 0.94
              else 1
            end
        )
      ) as weighted_domain_score,
      greatest(
        1,
        least(
          2.5,
          1 + (extract(epoch from (now() - tb.last_reviewed_at)) / 86400) / 7
        )
      ) as recency_factor
    from topic_base tb
  )
  select
    s.user_id,
    s.subject,
    s.topic,
    s.total_attempts,
    s.correct_attempts,
    s.incorrect_attempts,
    s.average_response_time_seconds,
    round(s.weighted_domain_score, 2) as weighted_domain_score,
    public.compute_adaptive_status(s.weighted_domain_score),
    s.error_rate,
    s.average_difficulty_weight,
    s.last_reviewed_at,
    round(s.recency_factor, 2) as recency_factor,
    round(((1 - ((100 - s.error_rate) / 100)) * s.average_difficulty_weight * s.recency_factor * 100), 2) as priority_score,
    now()
  from scored s;

  delete from public.review_plan_items where user_id = p_user_id;

  insert into public.review_plan_items (
    user_id,
    subject,
    topic,
    review_stage,
    scheduled_for,
    reason,
    completed,
    created_at,
    updated_at
  )
  with weak_topics as (
    select
      tpm.user_id,
      tpm.subject,
      tpm.topic,
      tpm.priority_score
    from public.topic_performance_metrics tpm
    where tpm.user_id = p_user_id
      and (tpm.status <> 'strong' or tpm.priority_score >= 45)
    order by tpm.priority_score desc
    limit 6
  ),
  review_intervals as (
    select 1::int as review_stage, interval '1 day' as interval_value, 'Primeira revisão após erro recorrente.'::text as reason
    union all
    select 2, interval '3 day', 'Consolidação inicial de memória.'
    union all
    select 3, interval '7 day', 'Reforço de retenção intermediária.'
    union all
    select 4, interval '15 day', 'Revisão de retenção longa.'
  )
  select
    wt.user_id,
    wt.subject,
    wt.topic,
    ri.review_stage,
    now() + ri.interval_value,
    ri.reason,
    false,
    now(),
    now()
  from weak_topics wt
  cross join review_intervals ri;
end;
$$;

create or replace function public.trigger_rebuild_adaptive_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  if target_user_id is not null then
    perform public.rebuild_adaptive_analytics(target_user_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_question_attempts_rebuild_adaptive on public.question_attempts;
create trigger trigger_question_attempts_rebuild_adaptive
after insert or update or delete on public.question_attempts
for each row
execute function public.trigger_rebuild_adaptive_analytics();

grant execute on function public.rebuild_adaptive_analytics(uuid) to authenticated;
