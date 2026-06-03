-- One Wish Willow — paid wishes + buy-and-burn
-- Each wish now carries the on-chain USDC payment signature, and every Nth
-- paid wish triggers a buy-and-burn recorded in the burns table.

-- The signature of the USDC offering. Unique so an offering can't be replayed.
alter table public.wishes
  add column if not exists payment_signature text;

create unique index if not exists wishes_payment_signature_unique
  on public.wishes (payment_signature)
  where payment_signature is not null;

-- Record of each buy-and-burn run.
create table if not exists public.burns (
  id             uuid primary key default gen_random_uuid(),
  spent_usdc     bigint not null default 0,   -- base units of USDC swapped
  spent_sol      bigint not null default 0,   -- lamports of SOL swapped
  burned         bigint not null default 0,   -- base units of token burned
  swap_signature text,
  burn_signature text,
  status         text not null default 'completed',
  reason         text,
  created_at     timestamptz not null default now()
);

-- If the burns table already existed without spent_sol, add it.
alter table public.burns
  add column if not exists spent_sol bigint not null default 0;

create index if not exists burns_created_at_idx
  on public.burns (created_at desc);

alter table public.burns enable row level security;

drop policy if exists "burns are public" on public.burns;
create policy "burns are public"
  on public.burns for select
  using (true);
