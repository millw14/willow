-- One Wish Willow — schema
-- One wish per wallet, enforced at the database level.

create extension if not exists "pgcrypto";

create table if not exists public.wishes (
  id            uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  wish_text      text not null check (char_length(wish_text) between 1 and 280),
  wish_hash      text not null,
  oracle_response text,
  wallet_status  text not null default 'spent',
  wish_number    bigserial,
  created_at     timestamptz not null default now()
);

-- The core rule: a wallet may only ever appear once.
create unique index if not exists wishes_wallet_unique
  on public.wishes (wallet_address);

create index if not exists wishes_created_at_idx
  on public.wishes (created_at desc);

-- Row Level Security
alter table public.wishes enable row level security;

-- Anyone may read the archive.
drop policy if exists "wishes are public" on public.wishes;
create policy "wishes are public"
  on public.wishes for select
  using (true);

-- Inserts happen server-side with the service role, which bypasses RLS.
-- If you want anon inserts instead, uncomment the policy below and remove the
-- service-role usage in src/lib/store.ts.
-- create policy "anyone may cast one wish"
--   on public.wishes for insert
--   with check (true);

-- Live count helper (optional convenience for realtime dashboards).
create or replace view public.wish_totals as
  select count(*)::bigint as total from public.wishes;
