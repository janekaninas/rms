alter table properties drop column room_number;
alter table properties drop column room_type_code;

create table room_mappings (
  room_number text primary key,
  property_id uuid not null references properties(id)
);

alter table room_mappings enable row level security;

create policy "staff and front_office can read room_mappings" on room_mappings
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' in ('staff', 'front_office'));
