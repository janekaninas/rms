create table room_changes (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null,
  changed_field text not null check (changed_field in ('room_number', 'room_type', 'arrival', 'departure')),
  old_value text,
  new_value text,
  change_date date,
  detected_at timestamptz not null default now()
);

alter table room_changes enable row level security;

create policy "staff can read room_changes" on room_changes
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
