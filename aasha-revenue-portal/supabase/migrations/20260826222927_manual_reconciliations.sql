create table manual_reconciliations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique references reservations(reservation_number),
  amount numeric(14, 2) not null,
  entered_by uuid references auth.users(id),
  entered_at timestamptz not null default now()
);

alter table manual_reconciliations enable row level security;

create policy "staff can read manual_reconciliations" on manual_reconciliations
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
