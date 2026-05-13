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

-- ─── RLS ────────────────────────────────────────────────────────────────
-- Direct table access for anon is intentionally minimal. The anon client
-- never reads games/highlights directly; reads happen via the Edge Function
-- (service role). The anon client only INSERTs new rows. Mutations are
-- routed through SECURITY DEFINER RPCs below.
--
-- We deliberately do NOT grant `select` to anon — that would make every
-- reel enumerable from the public anon key (anyone could `select * from
-- games` and harvest names + storage paths). Reads go via the Edge
-- Function which uses the service role internally.

create policy "anon insert games"       on public.games      for insert with check (true);
create policy "anon insert highlights"  on public.highlights for insert with check (true);

-- ─── RPCs (anon-callable, security definer) ────────────────────────────

-- Insert a game row and return its id. Replaces `.insert().select().single()`
-- in the client (which required anon SELECT). The function runs with the
-- definer's privileges so RLS doesn't gate the RETURNING.
create or replace function public.create_game(
  p1 text,
  p2 text,
  w text,
  dur integer
)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.games (p1_name, p2_name, winner, duration_ms)
  values (p1, p2, w, dur)
  returning id;
$$;

-- Safe orphan-game rollback: only deletes the game if no highlights are
-- attached. Used by the client when ALL gif uploads for a session failed.
create or replace function public.delete_empty_game(game_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.games g
  where g.id = delete_empty_game.game_id
    and not exists (select 1 from public.highlights h where h.game_id = g.id);
$$;

-- Atomic visit counter, invoked by the Edge Function with service role.
create or replace function public.increment_game_visits(game_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.games set visits = visits + 1 where id = increment_game_visits.game_id;
$$;

-- Rolling 10-GIF cap. After each insert, delete the oldest rows beyond 10
-- and their storage objects. Explicit search_path required because the
-- function touches both `public` and `storage` schemas.
create or replace function public.enforce_highlight_cap()
returns trigger
language plpgsql
security definer
set search_path = public, storage
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

-- Allow anon to call the RPCs by name.
grant execute on function public.create_game(text, text, text, integer) to anon;
grant execute on function public.delete_empty_game(uuid) to anon;
-- increment_game_visits is intentionally NOT granted to anon — it can only
-- be called from the Edge Function with service role, so visit counts
-- cannot be arbitrarily inflated.
