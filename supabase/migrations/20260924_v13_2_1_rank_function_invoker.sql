-- V13.2.1 · el ranking público no necesita privilegios elevados

create or replace function public.get_player_rank(p_player_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select ranked.position::integer
  from (
    select id,
      row_number() over (
        order by best_score desc, wins desc, best_time_seconds asc nulls last, id asc
      ) as position
    from public.player_profiles
    where games_played > 0
  ) ranked
  where ranked.id = p_player_id;
$$;

revoke all on function public.get_player_rank(uuid) from public;
grant execute on function public.get_player_rank(uuid) to anon, authenticated, service_role;
