-- V13 · perfiles, estadísticas y ranking persistente

create table public.player_profiles (
  id uuid primary key,
  display_name text not null check (char_length(display_name) between 2 and 18),
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  best_score bigint not null default 0 check (best_score >= 0),
  best_time_seconds integer null check (best_time_seconds is null or best_time_seconds > 0),
  max_level smallint not null default 1 check (max_level between 1 and 11),
  enemies_defeated integer not null default 0 check (enemies_defeated >= 0),
  revives integer not null default 0 check (revives >= 0),
  levels_completed integer not null default 0 check (levels_completed >= 0),
  total_score bigint not null default 0 check (total_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_credentials (
  player_id uuid primary key references public.player_profiles(id) on delete cascade,
  secret_hash text not null check (char_length(secret_hash) = 64),
  created_at timestamptz not null default now()
);

create table public.player_matches (
  id uuid primary key,
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  won boolean not null default false,
  score bigint not null default 0 check (score >= 0),
  time_seconds integer not null check (time_seconds > 0),
  max_level smallint not null check (max_level between 1 and 11),
  enemies_defeated integer not null default 0 check (enemies_defeated >= 0),
  revives integer not null default 0 check (revives >= 0),
  levels_completed integer not null default 0 check (levels_completed between 0 and 11),
  created_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;
alter table public.player_credentials enable row level security;
alter table public.player_matches enable row level security;

revoke all on public.player_profiles from anon, authenticated;
grant select on public.player_profiles to anon, authenticated;
grant all on public.player_profiles to service_role;

revoke all on public.player_credentials from anon, authenticated;
grant all on public.player_credentials to service_role;

revoke all on public.player_matches from anon, authenticated;
grant all on public.player_matches to service_role;

create policy "public leaderboard profiles"
on public.player_profiles for select
to anon, authenticated
using (true);

create policy "deny browser access to credentials"
on public.player_credentials for all
to anon, authenticated
using (false)
with check (false);

create policy "deny browser access to match history"
on public.player_matches for all
to anon, authenticated
using (false)
with check (false);

create index player_profiles_best_score_idx
  on public.player_profiles (best_score desc, wins desc, best_time_seconds asc nulls last);
create index player_profiles_wins_idx
  on public.player_profiles (wins desc, best_score desc);
create index player_matches_player_created_idx
  on public.player_matches (player_id, created_at desc);

create or replace function public.touch_player_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_profiles_touch_updated_at
before update on public.player_profiles
for each row execute function public.touch_player_profiles_updated_at();

create or replace function public.record_player_match(
  p_match_id uuid,
  p_player_id uuid,
  p_won boolean,
  p_score bigint,
  p_time_seconds integer,
  p_max_level smallint,
  p_enemies_defeated integer,
  p_revives integer,
  p_levels_completed integer
)
returns public.player_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.player_profiles;
  inserted_count integer;
begin
  insert into public.player_matches (
    id, player_id, won, score, time_seconds, max_level,
    enemies_defeated, revives, levels_completed
  ) values (
    p_match_id, p_player_id, p_won, p_score, p_time_seconds, p_max_level,
    p_enemies_defeated, p_revives, p_levels_completed
  )
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    select * into updated from public.player_profiles where id = p_player_id;
    return updated;
  end if;

  update public.player_profiles
  set
    games_played = games_played + 1,
    wins = wins + case when p_won then 1 else 0 end,
    best_score = greatest(best_score, p_score),
    best_time_seconds = case
      when p_won and p_time_seconds > 0 then
        case
          when best_time_seconds is null then p_time_seconds
          else least(best_time_seconds, p_time_seconds)
        end
      else best_time_seconds
    end,
    max_level = greatest(max_level, p_max_level),
    enemies_defeated = enemies_defeated + p_enemies_defeated,
    revives = revives + p_revives,
    levels_completed = levels_completed + p_levels_completed,
    total_score = total_score + p_score
  where id = p_player_id
  returning * into updated;

  if updated.id is null then raise exception 'player_not_found'; end if;
  return updated;
end;
$$;

revoke all on function public.record_player_match(uuid, uuid, boolean, bigint, integer, smallint, integer, integer, integer)
from public, anon, authenticated;
grant execute on function public.record_player_match(uuid, uuid, boolean, bigint, integer, smallint, integer, integer, integer)
to service_role;
