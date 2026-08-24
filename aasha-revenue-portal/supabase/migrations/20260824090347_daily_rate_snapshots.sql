create table daily_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null,
  snapshot_date date not null,
  room_rate numeric(14, 2) not null,
  room_revenue numeric(14, 2) not null,
  unique (reservation_number, snapshot_date)
);

alter table daily_rate_snapshots enable row level security;

create policy "staff can read daily_rate_snapshots" on daily_rate_snapshots
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
