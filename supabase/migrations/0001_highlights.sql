-- Snap & Solve gameplay highlights schema.
-- Run via: supabase db push

create table public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  p1_name text not null,
  p2_name text not null,
  winner text not null check (winner in ('p1', 'p2', 'draw')),
  duration_ms integer not null,
  visits integer not null default 0
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  kind text not null check (kind in ('winning', 'streak', 'comeback')),
  player text not null check (player in ('p1', 'p2')),
  storage_path text not null,
  caption text not null,
  created_at timestamptz not null default now()
);

create index highlights_created_at_idx on public.highlights (created_at desc);
create index highlights_game_id_idx on public.highlights (game_id);

alter table public.games enable row level security;
alter table public.highlights enable row level security;

create policy "anon read games"        on public.games      for select using (true);
create policy "anon insert games"      on public.games      for insert with check (true);
-- Anon can delete an own-orphaned game (uploader rollback path). The
-- ON DELETE CASCADE on highlights ensures stale storage rows get cleaned.
create policy "anon delete own game"   on public.games      for delete using (true);
create policy "anon read highlights"   on public.highlights for select using (true);
create policy "anon insert highlights" on public.highlights for insert with check (true);

-- Atomic visit counter, invoked by the Edge Function with service role.
create or replace function public.increment_game_visits(game_id uuid)
returns void
language sql
security definer
as $$
  update public.games set visits = visits + 1 where id = game_id;
$$;

-- Rolling 10-GIF cap. After each insert, delete the oldest rows beyond 10
-- and their storage objects.
create or replace function public.enforce_highlight_cap()
returns trigger
language plpgsql
security definer
as $$
declare
  excess record;
begin
  for excess in
    select id, storage_path
    from public.highlights
    order by created_at desc
    offset 10
  loop
    delete from storage.objects
      where bucket_id = 'highlights' and name = excess.storage_path;
    delete from public.highlights where id = excess.id;
  end loop;
  return null;
end;
$$;

create trigger enforce_highlight_cap_trigger
  after insert on public.highlights
  for each statement
  execute function public.enforce_highlight_cap();
