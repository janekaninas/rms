create table csv_uploads (
  id uuid primary key default gen_random_uuid(),
  upload_type text not null check (upload_type in ('bookings', 'cancel', 'room_revenue', 'room_change_log', 'balinest')),
  file_name text not null,
  storage_path text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  rows_processed int not null default 0,
  rows_new int not null default 0,
  rows_updated int not null default 0
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  property_id uuid references properties(id),
  room_number text,
  guest_name text,
  source text not null,
  segment text,
  booking_date date,
  arrival_date date not null,
  departure_date date not null,
  nights int not null,
  gross_amount numeric(14, 2) not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'departed')),
  raw_upload_id uuid references csv_uploads(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table csv_uploads enable row level security;
alter table reservations enable row level security;

create policy "staff can read csv_uploads" on csv_uploads
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
create policy "front_office can read own csv_uploads" on csv_uploads
  for select using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'front_office'
    and uploaded_by = auth.uid()
  );

create policy "staff can read reservations" on reservations
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
