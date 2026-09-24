-- V13.1 · logros e insignias persistentes

alter table public.player_profiles
  add column if not exists achievement_count integer not null default 0 check (achievement_count >= 0);

create table if not exists public.achievement_definitions (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('exploration','combat','cooperation','mastery')),
  icon text not null,
  points integer not null default 10 check (points >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.player_achievements (
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  match_id uuid null,
  primary key (player_id, achievement_id)
);

alter table public.achievement_definitions enable row level security;
alter table public.player_achievements enable row level security;

revoke all on public.achievement_definitions from anon, authenticated;
grant select on public.achievement_definitions to anon, authenticated;
grant all on public.achievement_definitions to service_role;

revoke all on public.player_achievements from anon, authenticated;
grant select on public.player_achievements to anon, authenticated;
grant all on public.player_achievements to service_role;

create policy "public achievement definitions"
on public.achievement_definitions for select to anon, authenticated using (true);

create policy "public unlocked achievements"
on public.player_achievements for select to anon, authenticated using (true);

insert into public.achievement_definitions (id,title,description,category,icon,points,sort_order) values
('primer_paso','Primer paso','Completa tu primer nivel.','exploration','🧭',10,10),
('viajero_egipto','Rumbo a Egipto','Alcanza el nivel 7.','exploration','🏺',20,20),
('viajero_maya','Templo maya','Alcanza el nivel 8.','exploration','🗿',20,30),
('viajero_azteca','Corazón azteca','Alcanza el nivel 9.','exploration','🌋',25,40),
('sombras_imperiales','Sombras imperiales','Alcanza el nivel 10.','exploration','🥷',25,50),
('grecia_antigua','Hacia el Olimpo','Alcanza el nivel 11.','exploration','🏛️',30,60),
('primera_sangre','Primera sangre','Derrota a tu primer enemigo.','combat','🎯',10,110),
('cazador_10','Cazador','Derrota 10 enemigos en total.','combat','🏹',20,120),
('cazador_50','Veterano del combate','Derrota 50 enemigos en total.','combat','⚔️',40,130),
('cazador_100','Centurión','Derrota 100 enemigos en total.','combat','💯',75,140),
('guardian_desierto','Cae el Guardián','Da el golpe final al Guardián del Desierto.','combat','🐻',40,150),
('rescatista','Rescatista','Reanima a un compañero por primera vez.','cooperation','🩹',15,210),
('paramedico','Paramédico','Realiza 5 reanimaciones en total.','cooperation','⛑️',30,220),
('heroe_coop','Héroe cooperativo','Realiza 20 reanimaciones en total.','cooperation','🤝',60,230),
('duo_victorioso','Dúo victorioso','Completa una expedición en modo cooperativo.','cooperation','👥',50,240),
('primera_victoria','Primera victoria','Completa los 11 niveles por primera vez.','mastery','🏆',50,310),
('expedicion_completa','Explorador extremo','Completa los 11 niveles en una sola expedición.','mastery','🌎',75,320),
('velocista','Velocista','Gana una expedición en 15 minutos o menos.','mastery','⚡',75,330),
('puntaje_25000','25.000 puntos','Alcanza un mejor puntaje de 25.000.','mastery','⭐',40,340),
('leyenda','Leyenda de la expedición','Consigue 5 victorias.','mastery','👑',100,350)
on conflict (id) do update set
  title=excluded.title, description=excluded.description, category=excluded.category,
  icon=excluded.icon, points=excluded.points, sort_order=excluded.sort_order;

create index if not exists player_achievements_player_unlocked_idx
  on public.player_achievements (player_id, unlocked_at desc);

create or replace function public.unlock_player_achievements(
  p_player_id uuid, p_match_id uuid, p_mode text, p_won boolean,
  p_score bigint, p_time_seconds integer, p_max_level smallint,
  p_enemies_defeated integer, p_revives integer, p_levels_completed integer,
  p_bosses_defeated integer
)
returns text[]
language plpgsql security definer set search_path = public
as $$
declare
  prof public.player_profiles;
  unlocked text[];
begin
  select * into prof from public.player_profiles where id = p_player_id;
  if prof.id is null then raise exception 'player_not_found'; end if;

  with candidates(id) as (
    select 'primer_paso' where p_levels_completed >= 1 or prof.levels_completed >= 1
    union all select 'viajero_egipto' where greatest(p_max_level, prof.max_level) >= 7
    union all select 'viajero_maya' where greatest(p_max_level, prof.max_level) >= 8
    union all select 'viajero_azteca' where greatest(p_max_level, prof.max_level) >= 9
    union all select 'sombras_imperiales' where greatest(p_max_level, prof.max_level) >= 10
    union all select 'grecia_antigua' where greatest(p_max_level, prof.max_level) >= 11
    union all select 'primera_sangre' where prof.enemies_defeated >= 1
    union all select 'cazador_10' where prof.enemies_defeated >= 10
    union all select 'cazador_50' where prof.enemies_defeated >= 50
    union all select 'cazador_100' where prof.enemies_defeated >= 100
    union all select 'guardian_desierto' where p_bosses_defeated >= 1
    union all select 'rescatista' where prof.revives >= 1
    union all select 'paramedico' where prof.revives >= 5
    union all select 'heroe_coop' where prof.revives >= 20
    union all select 'duo_victorioso' where p_won and p_mode = 'coop'
    union all select 'primera_victoria' where prof.wins >= 1
    union all select 'expedicion_completa' where p_won and p_levels_completed >= 11
    union all select 'velocista' where p_won and p_time_seconds <= 900
    union all select 'puntaje_25000' where prof.best_score >= 25000
    union all select 'leyenda' where prof.wins >= 5
  ),
  inserted as (
    insert into public.player_achievements(player_id, achievement_id, match_id)
    select p_player_id, id, p_match_id from candidates
    on conflict (player_id, achievement_id) do nothing
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id order by achievement_id), '{}'::text[])
  into unlocked from inserted;

  update public.player_profiles
  set achievement_count = (
    select count(*)::integer from public.player_achievements pa where pa.player_id = p_player_id
  )
  where id = p_player_id;

  return coalesce(unlocked, '{}'::text[]);
end;
$$;

revoke all on function public.unlock_player_achievements(uuid,uuid,text,boolean,bigint,integer,smallint,integer,integer,integer,integer)
from public, anon, authenticated;
grant execute on function public.unlock_player_achievements(uuid,uuid,text,boolean,bigint,integer,smallint,integer,integer,integer,integer)
to service_role;

-- Retrocompatibilidad: desbloquea logros acumulativos para perfiles V13 existentes.
insert into public.player_achievements(player_id, achievement_id, match_id)
select p.id, a.id, null
from public.player_profiles p
cross join lateral (
  select 'primer_paso' as id where p.levels_completed >= 1
  union all select 'viajero_egipto' where p.max_level >= 7
  union all select 'viajero_maya' where p.max_level >= 8
  union all select 'viajero_azteca' where p.max_level >= 9
  union all select 'sombras_imperiales' where p.max_level >= 10
  union all select 'grecia_antigua' where p.max_level >= 11
  union all select 'primera_sangre' where p.enemies_defeated >= 1
  union all select 'cazador_10' where p.enemies_defeated >= 10
  union all select 'cazador_50' where p.enemies_defeated >= 50
  union all select 'cazador_100' where p.enemies_defeated >= 100
  union all select 'rescatista' where p.revives >= 1
  union all select 'paramedico' where p.revives >= 5
  union all select 'heroe_coop' where p.revives >= 20
  union all select 'primera_victoria' where p.wins >= 1
  union all select 'puntaje_25000' where p.best_score >= 25000
  union all select 'leyenda' where p.wins >= 5
) a
on conflict (player_id, achievement_id) do nothing;

update public.player_profiles p
set achievement_count = (
  select count(*)::integer from public.player_achievements pa where pa.player_id = p.id
);
