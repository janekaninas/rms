create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  portfolio text not null check (portfolio in ('aasha', 'balinest')),
  room_number text,
  room_type_code text,
  is_bracha_group boolean not null default false,
  owner_name text,
  pb1_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table monthly_targets (
  id uuid primary key default gen_random_uuid(),
  portfolio text not null check (portfolio in ('aasha', 'balinest')),
  year int not null,
  month int not null check (month between 1 and 12),
  target_amount numeric(14, 2) not null,
  bottom_amount numeric(14, 2) not null,
  unique (portfolio, year, month)
);

create table commission_rules (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  villa_group text not null default 'default',
  commission_pct numeric(6, 5) not null,
  effective_from date not null default '2020-01-01',
  unique (source, villa_group, effective_from)
);

alter table properties enable row level security;
alter table monthly_targets enable row level security;
alter table commission_rules enable row level security;

create policy "staff can read properties" on properties
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' in ('staff', 'front_office'));

create policy "staff can read monthly_targets" on monthly_targets
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');

create policy "staff can read commission_rules" on commission_rules
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
