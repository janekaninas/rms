# Foundation & Aasha Core Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Supabase foundation and get Aasha's four daily CSV exports
(Bookings, Cancel, Room Revenue Breakdown, room-change log) flowing into a Postgres schema with
a working, unit-tested commission/VAT/PB1/ARR/lead-time calculation engine — deployed to a real
URL Jane can test against.

**Architecture:** Next.js (App Router, TypeScript) with Supabase (Postgres + Auth + Storage).
CSV parsing and the calculation engine live in server-only TypeScript modules under
`src/lib/`, called from Next.js Server Actions (never exposed to the browser, so the Supabase
service-role key stays server-side). RLS policies on every table are defense-in-depth on top of
that.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (Postgres/Auth/Storage), Vitest,
papaparse.

**Prerequisites (you, not the agent, must do these before Task 1):**
- Node.js 20+ and Docker Desktop installed (Docker is required for local Supabase)
- Supabase CLI: `npm install -g supabase`
- A Supabase account (free tier) — only needed at deploy time (Task 12), not before
- A Vercel account (free tier) — only needed at deploy time (Task 12), not before

Reference spec: `docs/superpowers/specs/2026-08-24-revenue-reporting-portal-design.md`

---

## File Structure

```
aasha-revenue-portal/
  src/
    app/
      upload/page.tsx              # front-office upload UI (Task 11)
      login/page.tsx                # auth (Task 8)
    lib/
      supabase/server.ts            # server-side Supabase client (session-bound)
      supabase/admin.ts             # service-role client, server-only
      csv/parse-bookings.ts         # Task 5
      csv/parse-cancel.ts           # Task 6
      csv/parse-room-revenue.ts     # Task 7
      csv/parse-room-change-log.ts  # Task 9
      csv/vhp-date.ts               # shared DD/MM/YY parser (Task 4)
      calculations/commission.ts    # Task 10
      calculations/engine.ts        # Task 10
      actions/upload-bookings.ts    # Server Action, Task 5
      actions/upload-cancel.ts      # Server Action, Task 6
      actions/upload-room-revenue.ts # Server Action, Task 7
      actions/upload-room-change-log.ts # Server Action, Task 9
    lib/__tests__/                  # Vitest unit tests, colocated per module
  supabase/
    migrations/                     # generated via `supabase migration new`
    seed.sql                        # commission_rules + properties seed (Task 3)
```

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `aasha-revenue-portal/` (entire project via scaffolding tool)

- [ ] **Step 1: Scaffold**

Run:
```bash
npx create-next-app@latest aasha-revenue-portal --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd aasha-revenue-portal
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr papaparse
npm install -D vitest @vitejs/plugin-react @types/papaparse
```

- [ ] **Step 3: Add Vitest config**

Create `aasha-revenue-portal/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Verify the scaffold runs**

Run: `npm run dev` (in background or a separate terminal), then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: `200`. Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Supabase, Vitest"
```

---

### Task 2: Local Supabase environment

**Files:**
- Create: `aasha-revenue-portal/supabase/config.toml` (generated)

- [ ] **Step 1: Initialize Supabase**

```bash
cd aasha-revenue-portal
supabase init
supabase start
```

Expected: output ends with a table of local URLs/keys, including `API URL`, `anon key`,
`service_role key`.

- [ ] **Step 2: Create `.env.local`**

Create `aasha-revenue-portal/.env.local` using the values printed in Step 1:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start output>
```

- [ ] **Step 3: Verify**

Run: `curl -s http://127.0.0.1:54321/rest/v1/ -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)"`
Expected: a JSON response (not a connection error).

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml .gitignore
git commit -m "chore: initialize local Supabase environment"
```

(`.env.local` must NOT be committed — confirm it's covered by the `.gitignore` Next.js
generated in Task 1; if not, add it.)

---

### Task 3: Core schema — properties, commission_rules, monthly_targets

**Files:**
- Create: `aasha-revenue-portal/supabase/migrations/<timestamp>_core_reference_tables.sql`
- Create: `aasha-revenue-portal/supabase/seed.sql`

- [ ] **Step 1: Create the migration file**

```bash
supabase migration new core_reference_tables
```

- [ ] **Step 2: Write the schema**

Edit the generated file to contain:
```sql
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
```

- [ ] **Step 3: Apply it locally**

```bash
supabase db reset
```

Expected: output shows the migration applying with no errors, ending in "Finished
supabase db reset".

- [ ] **Step 4: Write the seed data**

Create `aasha-revenue-portal/supabase/seed.sql`:
```sql
insert into commission_rules (source, villa_group, commission_pct) values
  ('BOOKING.COM', 'bracha', 0.18),
  ('BOOKING.COM', 'default', 0.173),
  ('EXPEDIA.COM', 'bracha', 0.15),
  ('EXPEDIA.COM', 'default', 0.15);

insert into properties (name, portfolio, is_bracha_group, pb1_enabled) values
  ('Bracha 1BD', 'aasha', true, true),
  ('Bracha 2BD', 'aasha', true, true),
  ('Bracha 3BD', 'aasha', true, true),
  ('Casa Amadeo B5B', 'aasha', false, true),
  ('Casa Amadeo A6', 'aasha', false, true),
  ('Casa Amani 1', 'aasha', false, true),
  ('Casa Amani 2', 'aasha', false, true),
  ('Casa Amani 3', 'aasha', false, true),
  ('Villa 128 E', 'aasha', false, true),
  ('Villa 128 F', 'aasha', false, true),
  ('Casa de Fiero 1', 'aasha', false, true),
  ('Casa de Fiero 2', 'aasha', false, true),
  ('Casa de Fiero 7', 'aasha', false, true),
  ('Villa Riso', 'aasha', false, true);
```

Note: this seed covers the villas visible in the sample data provided during design. The full
26-villa list (all Aasha + Balinest properties) must be reconciled against the `Mapping` sheet
of `Aasha Revenue Report - 20260823 copy.xlsx` before go-live — track this as a follow-up, not
a blocker for this plan.

- [ ] **Step 5: Apply seed and verify**

```bash
supabase db reset
```

Then run: `supabase db query "select count(*) from properties;"` (or, if your CLI version is
below 2.79.0, use `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from properties;"`)
Expected: `14`.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add core reference schema (properties, commission_rules, monthly_targets)"
```

---

### Task 4: VHP date parser (shared utility)

VHP CSVs use `DD/MM/YY` dates (e.g. `23/08/26` = 2026-08-23). This is used by every parser
task below, so it's built and tested first.

**Files:**
- Create: `aasha-revenue-portal/src/lib/csv/vhp-date.ts`
- Test: `aasha-revenue-portal/src/lib/csv/__tests__/vhp-date.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { parseVhpDate, parseVhpNumber } from '../vhp-date'

describe('parseVhpDate', () => {
  it('parses DD/MM/YY into an ISO date string', () => {
    expect(parseVhpDate('23/08/26')).toBe('2026-08-23')
  })

  it('parses single-digit day/month', () => {
    expect(parseVhpDate('4/9/26')).toBe('2026-09-04')
  })
})

describe('parseVhpNumber', () => {
  it('parses comma-thousands numbers into a JS number', () => {
    expect(parseVhpNumber('1,191,465.00')).toBe(1191465)
  })

  it('treats a blank string as 0', () => {
    expect(parseVhpNumber('')).toBe(0)
    expect(parseVhpNumber('-')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/csv/__tests__/vhp-date.test.ts`
Expected: FAIL with "Cannot find module '../vhp-date'"

- [ ] **Step 3: Write the implementation**

Create `aasha-revenue-portal/src/lib/csv/vhp-date.ts`:
```typescript
/** VHP exports dates as DD/MM/YY. Returns an ISO date string (YYYY-MM-DD). */
export function parseVhpDate(raw: string): string {
  const [day, month, year] = raw.trim().split('/').map(Number)
  const fullYear = year < 100 ? 2000 + year : year
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${fullYear}-${mm}-${dd}`
}

/** VHP exports amounts as "1,191,465.00" strings. Returns a plain number, 0 for blank/"-" . */
export function parseVhpNumber(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') return 0
  return Number(trimmed.replace(/,/g, ''))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/csv/__tests__/vhp-date.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv/vhp-date.ts src/lib/csv/__tests__/vhp-date.test.ts
git commit -m "feat: add VHP date/number parsing utilities"
```

---

### Task 5: reservations table + Bookings CSV ingestion

**Files:**
- Create: `aasha-revenue-portal/supabase/migrations/<timestamp>_reservations_and_uploads.sql`
- Create: `aasha-revenue-portal/src/lib/csv/parse-bookings.ts`
- Create: `aasha-revenue-portal/src/lib/actions/upload-bookings.ts`
- Test: `aasha-revenue-portal/src/lib/csv/__tests__/parse-bookings.test.ts`

- [ ] **Step 1: Migration for `csv_uploads` and `reservations`**

```bash
supabase migration new reservations_and_uploads
```

```sql
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
  for select using (uploaded_by = auth.uid());

create policy "staff can read reservations" on reservations
  for select using (auth.jwt() -> 'app_metadata' ->> 'role' = 'staff');
```

Apply: `supabase db reset` — expected: applies cleanly, seed still loads 14 properties.

- [ ] **Step 2: Write the failing parser test**

Create `aasha-revenue-portal/src/lib/csv/__tests__/parse-bookings.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseBookingsCsv } from '../parse-bookings'

const SAMPLE_CSV = `﻿AASHA VILLAS;;;;;;;;;;;;;;;;;;;;;;;;;
Jl. Beraban No. 55; Br. Taman; Kerobokan; Seminyak;;;;;;;;;;;;Date: 24/08/2026;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;
Tel +62-3619342077;;;;;;;;;;;;Period: 23/08/26 - 23/08/26;;;;;;;;;;;;;
Reservation By Creation Date;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;
No;Created Date;Reservation Number;Reservation Name;Arrival;Departure;Room Number;Room Quantity;Night;Room Type;Nationality;Adult;Compliment;Arrangement;Rate Code;Room Rate;Total Revenue;Guest Name;Segment;Voucher No;SOB;Status;Created By;Created Id;Last Changed Date;Changed By
1;23/08/26;3134;Rasyid , T&T;23/08/26;24/08/26;101;1;1;1BRS;SAU;2;0;RB;Undefined;500,000.00;500,000.00;Zlad , Binhomoud MR;OFF-TA; ';Offline & TA;Departed;Shanti;32;;
2;23/08/26;3136;Airbnb;04/10/26;13/10/26;CDF2;1;9;CDF2;IDN;2;0;RO;RO-STAHH;1,639,587.00;14,756,283.00;Cottom, Archie ;OTA;HMTXPRKDCA';OTA;Guaranted;User Not Found;**;;
`

describe('parseBookingsCsv', () => {
  it('skips the 6-row VHP letterhead and parses data rows', () => {
    const rows = parseBookingsCsv(SAMPLE_CSV)
    expect(rows).toHaveLength(2)
  })

  it('extracts fields with correct types', () => {
    const rows = parseBookingsCsv(SAMPLE_CSV)
    expect(rows[0]).toEqual({
      reservationNumber: '3134',
      reservationName: 'Rasyid , T&T',
      arrivalDate: '2026-08-23',
      departureDate: '2026-08-24',
      roomNumber: '101',
      nights: 1,
      roomTypeCode: '1BRS',
      grossAmount: 500000,
      guestName: 'Zlad , Binhomoud MR',
      segment: 'OFF-TA',
      status: 'Departed',
      bookingDate: '2026-08-23',
    })
  })

  it('normalizes status to lowercase for cancelled/departed/confirmed matching', () => {
    const rows = parseBookingsCsv(SAMPLE_CSV)
    expect(rows[1].status).toBe('Guaranted')
    expect(rows[1].nights).toBe(9)
    expect(rows[1].grossAmount).toBe(14756283)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/csv/__tests__/parse-bookings.test.ts`
Expected: FAIL with "Cannot find module '../parse-bookings'"

- [ ] **Step 4: Write the implementation**

Create `aasha-revenue-portal/src/lib/csv/parse-bookings.ts`:
```typescript
import Papa from 'papaparse'
import { parseVhpDate, parseVhpNumber } from './vhp-date'

export interface ParsedBookingRow {
  reservationNumber: string
  reservationName: string
  arrivalDate: string
  departureDate: string
  roomNumber: string
  nights: number
  roomTypeCode: string
  grossAmount: number
  guestName: string
  segment: string
  status: string
  bookingDate: string
}

const HEADER_ROW_MARKER = 'Reservation Number'

export function parseBookingsCsv(raw: string): ParsedBookingRow[] {
  const cleaned = raw.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(cleaned, { delimiter: ';' })
  const rows = parsed.data as string[][]

  const headerIndex = rows.findIndex((row) => row.includes(HEADER_ROW_MARKER))
  if (headerIndex === -1) {
    throw new Error(
      `Unrecognized Bookings CSV: could not find header row containing "${HEADER_ROW_MARKER}"`
    )
  }

  const header = rows[headerIndex]
  const col = (name: string) => {
    const idx = header.indexOf(name)
    if (idx === -1) throw new Error(`Unrecognized Bookings CSV: missing column "${name}"`)
    return idx
  }

  const idx = {
    createdDate: col('Created Date'),
    reservationNumber: col('Reservation Number'),
    reservationName: col('Reservation Name'),
    arrival: col('Arrival'),
    departure: col('Departure'),
    roomNumber: col('Room Number'),
    night: col('Night'),
    roomType: col('Room Type'),
    totalRevenue: col('Total Revenue'),
    guestName: col('Guest Name'),
    segment: col('Segment'),
    status: col('Status'),
  }

  return rows
    .slice(headerIndex + 1)
    .filter((row) => row[idx.reservationNumber]?.trim())
    .map((row) => ({
      reservationNumber: row[idx.reservationNumber].trim(),
      reservationName: row[idx.reservationName]?.trim() ?? '',
      arrivalDate: parseVhpDate(row[idx.arrival]),
      departureDate: parseVhpDate(row[idx.departure]),
      roomNumber: row[idx.roomNumber]?.trim() ?? '',
      nights: Number(row[idx.night]),
      roomTypeCode: row[idx.roomType]?.trim() ?? '',
      grossAmount: parseVhpNumber(row[idx.totalRevenue]),
      guestName: row[idx.guestName]?.trim() ?? '',
      segment: row[idx.segment]?.trim() ?? '',
      status: row[idx.status]?.trim() ?? '',
      bookingDate: parseVhpDate(row[idx.createdDate]),
    }))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/csv/__tests__/parse-bookings.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the Server Action that upserts parsed rows**

Create `aasha-revenue-portal/src/lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

/** Service-role client. Server-only — never import this from a Client Component. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

Create `aasha-revenue-portal/src/lib/actions/upload-bookings.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseBookingsCsv } from '@/lib/csv/parse-bookings'

export async function uploadBookingsCsv(fileName: string, csvText: string, uploadedBy: string) {
  const rows = parseBookingsCsv(csvText)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'bookings', file_name: fileName, uploaded_by: uploadedBy, rows_processed: rows.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  let rowsNew = 0
  let rowsUpdated = 0

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_number', row.reservationNumber)
      .maybeSingle()

    const { error } = await supabase.from('reservations').upsert(
      {
        reservation_number: row.reservationNumber,
        room_number: row.roomNumber,
        guest_name: row.guestName,
        source: row.reservationName,
        segment: row.segment,
        booking_date: row.bookingDate,
        arrival_date: row.arrivalDate,
        departure_date: row.departureDate,
        nights: row.nights,
        gross_amount: row.grossAmount,
        status: row.status.toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed',
        raw_upload_id: upload.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'reservation_number' }
    )
    if (error) throw error
    existing ? rowsUpdated++ : rowsNew++
  }

  await supabase
    .from('csv_uploads')
    .update({ rows_new: rowsNew, rows_updated: rowsUpdated })
    .eq('id', upload.id)

  return { rowsProcessed: rows.length, rowsNew, rowsUpdated }
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/lib/csv/parse-bookings.ts src/lib/csv/__tests__/parse-bookings.test.ts src/lib/actions/upload-bookings.ts src/lib/supabase/admin.ts
git commit -m "feat: ingest Bookings CSV into reservations table"
```

---

### Task 6: Cancel CSV ingestion

**Files:**
- Create: `aasha-revenue-portal/src/lib/csv/parse-cancel.ts`
- Create: `aasha-revenue-portal/src/lib/actions/upload-cancel.ts`
- Test: `aasha-revenue-portal/src/lib/csv/__tests__/parse-cancel.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { parseCancelCsv } from '../parse-cancel'

const SAMPLE_CSV = `﻿Reservation Number;Column Number;Room Number;Guest Name;Reservation Name;Arrival;Night;Departure;Room Quantity;Room Type;Adult;Child;Compliment;Arrangement Code;Room Rate;Cancel Date;Cancel Time;Cancelled Id;Created Date;Reservation Status;Cancel Reason;Voucher
3048;0;;Eagleton, Rebecca ;Make My Trip;07/10/26;2;09/10/26;1;2BR ;2;0;0;RB;2,471,587.50;23/08/26;17.17.00;**;11/08/26;Guaranteed;Cancelled by BookEngine;184353913
TOTAL;;;ROOM: 1;;;NIGHT: 2;;;;ADULT: 2;;;;CHILD: 0;;;;COMPLIMENT: 0;;;
`

describe('parseCancelCsv', () => {
  it('parses cancelled reservation numbers, skipping the TOTAL row', () => {
    const rows = parseCancelCsv(SAMPLE_CSV)
    expect(rows).toEqual([
      { reservationNumber: '3048', cancelDate: '2026-08-23' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/csv/__tests__/parse-cancel.test.ts`
Expected: FAIL with "Cannot find module '../parse-cancel'"

- [ ] **Step 3: Write the implementation**

Create `aasha-revenue-portal/src/lib/csv/parse-cancel.ts`:
```typescript
import Papa from 'papaparse'
import { parseVhpDate } from './vhp-date'

export interface ParsedCancelRow {
  reservationNumber: string
  cancelDate: string
}

export function parseCancelCsv(raw: string): ParsedCancelRow[] {
  const cleaned = raw.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(cleaned, { delimiter: ';', header: false })
  const rows = parsed.data as string[][]

  const header = rows[0]
  const col = (name: string) => {
    const idx = header.indexOf(name)
    if (idx === -1) throw new Error(`Unrecognized Cancel CSV: missing column "${name}"`)
    return idx
  }
  const idx = {
    reservationNumber: col('Reservation Number'),
    cancelDate: col('Cancel Date'),
  }

  return rows
    .slice(1)
    .filter((row) => row[idx.reservationNumber]?.trim() && row[idx.reservationNumber] !== 'TOTAL')
    .map((row) => ({
      reservationNumber: row[idx.reservationNumber].trim(),
      cancelDate: parseVhpDate(row[idx.cancelDate]),
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/csv/__tests__/parse-cancel.test.ts`
Expected: PASS

- [ ] **Step 5: Write the Server Action**

Create `aasha-revenue-portal/src/lib/actions/upload-cancel.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseCancelCsv } from '@/lib/csv/parse-cancel'

export async function uploadCancelCsv(fileName: string, csvText: string, uploadedBy: string) {
  const rows = parseCancelCsv(csvText)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'cancel', file_name: fileName, uploaded_by: uploadedBy, rows_processed: rows.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  let rowsUpdated = 0
  for (const row of rows) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('reservation_number', row.reservationNumber)
      .select('id')
    if (error) throw error
    if (data && data.length > 0) rowsUpdated++
  }

  await supabase.from('csv_uploads').update({ rows_updated: rowsUpdated }).eq('id', upload.id)
  return { rowsProcessed: rows.length, rowsUpdated }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/csv/parse-cancel.ts src/lib/csv/__tests__/parse-cancel.test.ts src/lib/actions/upload-cancel.ts
git commit -m "feat: ingest Cancel CSV, mark matching reservations cancelled"
```

---

### Task 7: Room Revenue Breakdown ingestion (daily rate snapshots)

**Files:**
- Create: `aasha-revenue-portal/supabase/migrations/<timestamp>_daily_rate_snapshots.sql`
- Create: `aasha-revenue-portal/src/lib/csv/parse-room-revenue.ts`
- Create: `aasha-revenue-portal/src/lib/actions/upload-room-revenue.ts`
- Test: `aasha-revenue-portal/src/lib/csv/__tests__/parse-room-revenue.test.ts`

- [ ] **Step 1: Migration**

```bash
supabase migration new daily_rate_snapshots
```

```sql
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
```

Apply: `supabase db reset`

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { parseRoomRevenueCsv } from '../parse-room-revenue'

const SAMPLE_CSV = `﻿Room Number;Reservation Number;Room Type;Arrangement Code;Rate Code;Currency;Room Rate;Pax;Adult;Compliment;Child1;Age;Child2;Compliment Child;Local Currency;Room Revenue;Breakfast Revenue;Lunch;Dinner;Other Revenue;Fix Cost;Banquet Revenue;Total Rate;Arrival;Departure;Room Night;Bill Number;Reserve Name;Guest Name;Bill Address;Segment;Nationality;Exchange Rate;Fixed Rate
101;3134;1BRS;RB;;Rp;500,000.00;2;2;0;0;;0;0;500,000.00;400,000.00;;;;100,000.00;;;500,000.00;23/08/26;24/08/26;1;2082;Rasyid ;Zlad , Binhomoud MR;Rasyid ,;OFF-TA;SAU;01.00;No
`

describe('parseRoomRevenueCsv', () => {
  it('extracts reservation number and that day\\'s actual room rate', () => {
    const rows = parseRoomRevenueCsv(SAMPLE_CSV, '2026-08-23')
    expect(rows).toEqual([
      {
        reservationNumber: '3134',
        snapshotDate: '2026-08-23',
        roomRate: 500000,
        roomRevenue: 500000,
      },
    ])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/csv/__tests__/parse-room-revenue.test.ts`
Expected: FAIL with "Cannot find module '../parse-room-revenue'"

- [ ] **Step 4: Write the implementation**

Create `aasha-revenue-portal/src/lib/csv/parse-room-revenue.ts`:
```typescript
import Papa from 'papaparse'
import { parseVhpNumber } from './vhp-date'

export interface ParsedRoomRevenueRow {
  reservationNumber: string
  snapshotDate: string
  roomRate: number
  roomRevenue: number
}

/**
 * VHP's RoomRevenueBreakdown export has no date column of its own — it's a snapshot of
 * "today's" actual rate. The upload UI supplies the snapshot date (defaults to today).
 */
export function parseRoomRevenueCsv(raw: string, snapshotDate: string): ParsedRoomRevenueRow[] {
  const cleaned = raw.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(cleaned, { delimiter: ';', header: false })
  const rows = parsed.data as string[][]

  const header = rows[0]
  const col = (name: string) => {
    const idx = header.indexOf(name)
    if (idx === -1) throw new Error(`Unrecognized Room Revenue CSV: missing column "${name}"`)
    return idx
  }
  const idx = {
    reservationNumber: col('Reservation Number'),
    roomRate: col('Room Rate'),
    roomRevenue: col('Room Revenue'),
  }

  return rows
    .slice(1)
    .filter((row) => row[idx.reservationNumber]?.trim())
    .map((row) => ({
      reservationNumber: row[idx.reservationNumber].trim(),
      snapshotDate,
      roomRate: parseVhpNumber(row[idx.roomRate]),
      roomRevenue: parseVhpNumber(row[idx.roomRevenue]),
    }))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/csv/__tests__/parse-room-revenue.test.ts`
Expected: PASS

- [ ] **Step 6: Write the Server Action**

Create `aasha-revenue-portal/src/lib/actions/upload-room-revenue.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseRoomRevenueCsv } from '@/lib/csv/parse-room-revenue'

export async function uploadRoomRevenueCsv(
  fileName: string,
  csvText: string,
  snapshotDate: string,
  uploadedBy: string
) {
  const rows = parseRoomRevenueCsv(csvText, snapshotDate)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'room_revenue', file_name: fileName, uploaded_by: uploadedBy, rows_processed: rows.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  const { error } = await supabase.from('daily_rate_snapshots').upsert(
    rows.map((row) => ({
      reservation_number: row.reservationNumber,
      snapshot_date: row.snapshotDate,
      room_rate: row.roomRate,
      room_revenue: row.roomRevenue,
    })),
    { onConflict: 'reservation_number,snapshot_date' }
  )
  if (error) throw error

  await supabase.from('csv_uploads').update({ rows_new: rows.length }).eq('id', upload.id)
  return { rowsProcessed: rows.length }
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/lib/csv/parse-room-revenue.ts src/lib/csv/__tests__/parse-room-revenue.test.ts src/lib/actions/upload-room-revenue.ts
git commit -m "feat: ingest daily Room Revenue Breakdown as append-only rate snapshots"
```

---

### Task 8: Auth — front_office and staff roles

**Files:**
- Create: `aasha-revenue-portal/src/lib/supabase/server.ts`
- Create: `aasha-revenue-portal/src/app/login/page.tsx`
- Create: `aasha-revenue-portal/src/middleware.ts`
- Test: `aasha-revenue-portal/src/lib/supabase/__tests__/role.test.ts`

- [ ] **Step 1: Session-bound server client**

Create `aasha-revenue-portal/src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export type UserRole = 'staff' | 'front_office'

export function getRole(user: { app_metadata?: { role?: string } } | null): UserRole | null {
  const role = user?.app_metadata?.role
  return role === 'staff' || role === 'front_office' ? role : null
}
```

- [ ] **Step 2: Write the failing test for role extraction**

Create `aasha-revenue-portal/src/lib/supabase/__tests__/role.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getRole } from '../server'

describe('getRole', () => {
  it('returns the role when valid', () => {
    expect(getRole({ app_metadata: { role: 'staff' } })).toBe('staff')
    expect(getRole({ app_metadata: { role: 'front_office' } })).toBe('front_office')
  })

  it('returns null for missing or invalid roles', () => {
    expect(getRole(null)).toBeNull()
    expect(getRole({ app_metadata: {} })).toBeNull()
    expect(getRole({ app_metadata: { role: 'owner' } })).toBeNull()
  })
})
```

Run: `npx vitest run src/lib/supabase/__tests__/role.test.ts` — expect PASS immediately since
`getRole` was written in Step 1 (this is the one utility function simple enough to write
alongside its test; every other module in this plan follows strict red-green).

- [ ] **Step 3: Create test users locally**

Run:
```bash
supabase db query "select id, email from auth.users;"
```
If empty, create the two accounts you'll use for local testing via the Supabase Studio at
`http://127.0.0.1:54323` → Authentication → Add user, for:
- `jane@aashavillas.test` (you'll set `app_metadata.role = "staff"`)
- `frontoffice@aashavillas.test` (`app_metadata.role = "front_office"`)

For each user, in Studio → Authentication → Users → (user) → edit `raw_app_metadata` to
`{"role": "staff"}` or `{"role": "front_office"}` respectively. (Never set this via
`user_metadata` — it's user-editable and unsafe for authorization.)

- [ ] **Step 4: Login page**

Create `aasha-revenue-portal/src/app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }
    router.push('/upload')
    router.refresh()
  }

  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Aasha Revenue Portal</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Log in
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Middleware to require login**

Create `aasha-revenue-portal/src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => response.cookies.set(name, value))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Manual verification**

Run `npm run dev`, visit `http://localhost:3000` — expect redirect to `/login`. Log in as
`frontoffice@aashavillas.test` — expect redirect to `/upload` (page doesn't exist yet, 404 is
fine for now; confirms auth + redirect works).

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/supabase/__tests__/role.test.ts src/app/login/page.tsx src/middleware.ts
git commit -m "feat: add Supabase auth with staff/front_office roles"
```

---

### Task 9: Room-change log ingestion (before/after diff detection)

**Files:**
- Create: `aasha-revenue-portal/supabase/migrations/<timestamp>_room_changes.sql`
- Create: `aasha-revenue-portal/src/lib/csv/parse-room-change-log.ts`
- Create: `aasha-revenue-portal/src/lib/actions/upload-room-change-log.ts`
- Test: `aasha-revenue-portal/src/lib/csv/__tests__/parse-room-change-log.test.ts`

- [ ] **Step 1: Migration**

```bash
supabase migration new room_changes
```

```sql
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
```

Apply: `supabase db reset`

- [ ] **Step 2: Write the failing test**

Create `aasha-revenue-portal/src/lib/csv/__tests__/parse-room-change-log.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseRoomChangeLog } from '../parse-room-change-log'

// Real sample from VHP export: header has each field twice (before/after).
// Row 1: Room Number "" -> "" (no change, noise). Row 2: "" -> "CDF2" (real assignment).
// Row 3: Room Number "CDF2" -> "CDF2" (no change) but this row is otherwise pure noise
// (a "RTC changed" audit marker, not a real diff) -- covered by the no-actual-diff rule.
const SAMPLE_CSV = `﻿"Reservation Number","Reservation Name","Arrival","Arrival","Departure","Departure","Quantity","Quantity","Adult","Adult","Child","Child","Compliment","Compliment","Room Type","Room Type","Room Number","Room Number","Arrangement Code","Arrangement Code","Rate","Rate","Fixed Rate","Fixed Rate","Guest Name","Guest Name","Id","Id","Change Date","Change Date","Time"
"3108","Trip.Com","21/08/26","21/08/26","22/08/26","22/08/26","1","1","4","4","0","0","0","0","CDF2  ","CDF2  ","","","RO","RO","1,554,630.00","1,554,630.00","YES","YES","Bed Changed:","' -> Double","**","31","","20/08/26","00:01:42"
"3108","Trip.Com","21/08/26","21/08/26","22/08/26","22/08/26","1","1","4","4","0","0","0","0","CDF2  ","CDF2  ","","CDF2","RO","RO","1,554,630.00","1,554,630.00","YES","YES","SHEN, LIN ","SHEN, LIN ","**","31","","20/08/26","00:01:43"
"3110","AGODA","09/09/26","10/09/26","13/09/26","13/09/26","1","1","2","2","0","0","0","0","1BRS  ","1BRS  ","102","102","RO","RO","1,561,823.00","1,561,823.00","YES","YES","Null, Daniel ","Null, Daniel ","**","31","20/08/26","20/08/26","00:02:29"
`

describe('parseRoomChangeLog', () => {
  it('ignores rows where nothing in Room Number/Type/Arrival/Departure differs', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes.find((c) => c.reservationNumber === '3108' && c.changedField === 'room_number' && c.newValue === null)).toBeUndefined()
  })

  it('detects a real room number assignment', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes).toContainEqual({
      reservationNumber: '3108',
      changedField: 'room_number',
      oldValue: '',
      newValue: 'CDF2',
      changeDate: '2026-08-20',
    })
  })

  it('detects a real arrival date change', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes).toContainEqual({
      reservationNumber: '3110',
      changedField: 'arrival',
      oldValue: '09/09/26',
      newValue: '10/09/26',
      changeDate: '2026-08-20',
    })
  })

  it('produces no changes for a row with only noise fields differing', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes.filter((c) => c.reservationNumber === '3108')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/csv/__tests__/parse-room-change-log.test.ts`
Expected: FAIL with "Cannot find module '../parse-room-change-log'"

- [ ] **Step 4: Write the implementation**

Create `aasha-revenue-portal/src/lib/csv/parse-room-change-log.ts`:
```typescript
import Papa from 'papaparse'
import { parseVhpDate } from './vhp-date'

export interface DetectedRoomChange {
  reservationNumber: string
  changedField: 'room_number' | 'room_type' | 'arrival' | 'departure'
  oldValue: string
  newValue: string
  changeDate: string | null
}

const TRACKED_FIELDS: Array<{ name: string; field: DetectedRoomChange['changedField'] }> = [
  { name: 'Room Number', field: 'room_number' },
  { name: 'Room Type', field: 'room_type' },
  { name: 'Arrival', field: 'arrival' },
  { name: 'Departure', field: 'departure' },
]

/**
 * The raw VHP change log lists each field twice (before/after). Most rows are noise
 * (guest name edits, check-in status flips, "Bed Changed:" text). A row only produces a
 * change record when one of the tracked fields' before/after pair actually differs.
 */
export function parseRoomChangeLog(raw: string): DetectedRoomChange[] {
  const cleaned = raw.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(cleaned, { delimiter: ',', header: false })
  const rows = parsed.data as string[][]

  const header = rows[0]

  // Each tracked field name appears twice consecutively: [before, after].
  const fieldIndexes = TRACKED_FIELDS.map(({ name, field }) => {
    const first = header.indexOf(name)
    const second = header.indexOf(name, first + 1)
    if (first === -1 || second === -1) {
      throw new Error(`Unrecognized room-change log: expected two "${name}" columns`)
    }
    return { field, before: first, after: second }
  })

  const reservationNumberIdx = header.indexOf('Reservation Number')
  const changeDateBeforeIdx = header.indexOf('Change Date')
  const changeDateAfterIdx = header.indexOf('Change Date', changeDateBeforeIdx + 1)

  const changes: DetectedRoomChange[] = []

  for (const row of rows.slice(1)) {
    const reservationNumber = row[reservationNumberIdx]?.trim()
    if (!reservationNumber) continue

    const rawChangeDate = row[changeDateAfterIdx]?.trim() || row[changeDateBeforeIdx]?.trim()
    const changeDate = rawChangeDate ? parseVhpDate(rawChangeDate) : null

    for (const { field, before, after } of fieldIndexes) {
      const oldValue = row[before]?.trim() ?? ''
      const newValue = row[after]?.trim() ?? ''
      if (oldValue !== newValue) {
        changes.push({ reservationNumber, changedField: field, oldValue, newValue, changeDate })
      }
    }
  }

  return changes
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/csv/__tests__/parse-room-change-log.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Write the Server Action**

Create `aasha-revenue-portal/src/lib/actions/upload-room-change-log.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseRoomChangeLog } from '@/lib/csv/parse-room-change-log'

export async function uploadRoomChangeLog(fileName: string, csvText: string, uploadedBy: string) {
  const changes = parseRoomChangeLog(csvText)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'room_change_log', file_name: fileName, uploaded_by: uploadedBy, rows_processed: changes.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  if (changes.length > 0) {
    const { error } = await supabase.from('room_changes').insert(
      changes.map((c) => ({
        reservation_number: c.reservationNumber,
        changed_field: c.changedField,
        old_value: c.oldValue,
        new_value: c.newValue,
        change_date: c.changeDate,
      }))
    )
    if (error) throw error

    // Apply room_number changes to the live reservation. Other fields (room_type is
    // display-only, arrival/departure) are logged for audit but reservations stays keyed
    // off the Bookings CSV for date/type accuracy going forward.
    for (const change of changes.filter((c) => c.changedField === 'room_number' && c.newValue)) {
      await supabase
        .from('reservations')
        .update({ room_number: change.newValue, updated_at: new Date().toISOString() })
        .eq('reservation_number', change.reservationNumber)
    }
  }

  await supabase.from('csv_uploads').update({ rows_new: changes.length }).eq('id', upload.id)
  return { changesDetected: changes.length }
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/lib/csv/parse-room-change-log.ts src/lib/csv/__tests__/parse-room-change-log.test.ts src/lib/actions/upload-room-change-log.ts
git commit -m "feat: parse raw VHP change log, detect real room/date changes only"
```

---

### Task 10: Calculation engine (commission, VAT, PB1, ARR, lead time)

**Files:**
- Create: `aasha-revenue-portal/src/lib/calculations/commission.ts`
- Create: `aasha-revenue-portal/src/lib/calculations/engine.ts`
- Test: `aasha-revenue-portal/src/lib/calculations/__tests__/engine.test.ts`

This is the highest-value, highest-risk part of the system — get the math wrong and every
report is wrong. Test values below are derived directly from the formulas confirmed against
the existing workbook (`All Bookings!U2:Z2`) during design.

- [ ] **Step 1: Write the failing tests**

Create `aasha-revenue-portal/src/lib/calculations/__tests__/engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateRevenue } from '../engine'

describe('calculateRevenue', () => {
  it('applies 0% commission and full PB1 for a non-Bracha direct/TA booking', () => {
    // Confirmed fixture: Reservation 3137, Casa de Fiero 2, Make My Trip, gross 1,191,465
    const result = calculateRevenue({
      grossAmount: 1191465,
      source: 'MAKE MY TRIP',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0)
    expect(result.commissionAmount).toBe(0)
    expect(result.vat).toBe(0)
    expect(result.pb1).toBeCloseTo(108315, 2)
    expect(result.netRevenue).toBeCloseTo(1083150, 2)
    expect(result.arr).toBe(1191465)
  })

  it('applies Bracha-group Booking.com commission and excludes PB1', () => {
    const result = calculateRevenue({
      grossAmount: 2000000,
      source: 'BOOKING.COM',
      isBrachaGroup: true,
      pb1Enabled: true,
      nights: 2,
    })
    expect(result.commissionPct).toBe(0.18)
    expect(result.commissionAmount).toBe(360000)
    expect(result.vat).toBeCloseTo(39600, 2)
    expect(result.pb1).toBe(0)
    expect(result.netRevenue).toBeCloseTo(1600400, 2)
    expect(result.arr).toBe(1000000)
  })

  it('applies non-Bracha Booking.com commission (17.3%) with PB1', () => {
    const result = calculateRevenue({
      grossAmount: 1000000,
      source: 'BOOKING.COM',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0.173)
    expect(result.commissionAmount).toBe(173000)
    expect(result.vat).toBeCloseTo(19030, 2)
    expect(result.pb1).toBeCloseTo(90909.09, 2)
    expect(result.netRevenue).toBeCloseTo(717060.91, 2)
  })

  it('skips PB1 when pb1Enabled is false (Balinest default today)', () => {
    const result = calculateRevenue({
      grossAmount: 1000000,
      source: 'AIRBNB',
      isBrachaGroup: false,
      pb1Enabled: false,
      nights: 1,
    })
    expect(result.pb1).toBe(0)
    expect(result.netRevenue).toBe(1000000)
  })

  it('falls back to 0% commission for an unrecognized source', () => {
    const result = calculateRevenue({
      grossAmount: 500000,
      source: 'AGODA',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calculations/__tests__/engine.test.ts`
Expected: FAIL with "Cannot find module '../engine'"

- [ ] **Step 3: Write the commission rule lookup**

Create `aasha-revenue-portal/src/lib/calculations/commission.ts`:
```typescript
export interface CommissionRule {
  source: string
  villaGroup: 'bracha' | 'default'
  commissionPct: number
}

const RULES: CommissionRule[] = [
  { source: 'BOOKING.COM', villaGroup: 'bracha', commissionPct: 0.18 },
  { source: 'BOOKING.COM', villaGroup: 'default', commissionPct: 0.173 },
  { source: 'EXPEDIA.COM', villaGroup: 'bracha', commissionPct: 0.15 },
  { source: 'EXPEDIA.COM', villaGroup: 'default', commissionPct: 0.15 },
]

/** Mirrors the seeded `commission_rules` table (Task 3). Kept in sync manually for now;
 *  Task 3's seed.sql is the source of truth for the database. */
export function lookupCommissionPct(source: string, isBrachaGroup: boolean): number {
  const villaGroup = isBrachaGroup ? 'bracha' : 'default'
  const normalizedSource = source.trim().toUpperCase()
  const rule = RULES.find((r) => r.source === normalizedSource && r.villaGroup === villaGroup)
  return rule?.commissionPct ?? 0
}
```

- [ ] **Step 4: Write the calculation engine**

Create `aasha-revenue-portal/src/lib/calculations/engine.ts`:
```typescript
import { lookupCommissionPct } from './commission'

export interface RevenueInput {
  grossAmount: number
  source: string
  isBrachaGroup: boolean
  pb1Enabled: boolean
  nights: number
}

export interface RevenueResult {
  commissionPct: number
  commissionAmount: number
  vat: number
  pb1: number
  netRevenue: number
  arr: number
}

const VAT_RATE = 0.11
const PB1_DIVISOR = 1.1
const PB1_RATE = 0.1

export function calculateRevenue(input: RevenueInput): RevenueResult {
  const commissionPct = lookupCommissionPct(input.source, input.isBrachaGroup)
  const commissionAmount = round2(input.grossAmount * commissionPct)
  const vat = commissionAmount > 0 ? round2(commissionAmount * VAT_RATE) : 0
  const pb1 = input.pb1Enabled ? round2((input.grossAmount / PB1_DIVISOR) * PB1_RATE) : 0
  const netRevenue = round2(input.grossAmount - commissionAmount - vat - pb1)
  const arr = input.nights > 0 ? round2(input.grossAmount / input.nights) : 0

  return { commissionPct, commissionAmount, vat, pb1, netRevenue, arr }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/calculations/__tests__/engine.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Property-level ARR aggregate (separate function, its own test)**

Add to `aasha-revenue-portal/src/lib/calculations/__tests__/engine.test.ts`:
```typescript
import { calculatePropertyArr } from '../engine'

describe('calculatePropertyArr', () => {
  it('divides total revenue by total room nights across reservations', () => {
    const arr = calculatePropertyArr([
      { grossAmount: 1000000, nights: 2 },
      { grossAmount: 1500000, nights: 3 },
    ])
    expect(arr).toBe(500000) // (1,000,000 + 1,500,000) / (2 + 3)
  })

  it('returns 0 for no reservations', () => {
    expect(calculatePropertyArr([])).toBe(0)
  })
})
```

Add to `aasha-revenue-portal/src/lib/calculations/engine.ts`:
```typescript
export function calculatePropertyArr(reservations: Array<{ grossAmount: number; nights: number }>): number {
  const totalRevenue = reservations.reduce((sum, r) => sum + r.grossAmount, 0)
  const totalNights = reservations.reduce((sum, r) => sum + r.nights, 0)
  return totalNights > 0 ? round2(totalRevenue / totalNights) : 0
}
```

Run: `npx vitest run src/lib/calculations/__tests__/engine.test.ts`
Expected: PASS (7 tests total)

- [ ] **Step 7: Lead time (separate function, its own test)**

Add to the test file:
```typescript
import { calculateLeadTimeDays } from '../engine'

describe('calculateLeadTimeDays', () => {
  it('returns days between booking date and arrival date', () => {
    expect(calculateLeadTimeDays('2026-08-01', '2026-08-23')).toBe(22)
  })

  it('returns 0 for a same-day booking', () => {
    expect(calculateLeadTimeDays('2026-08-23', '2026-08-23')).toBe(0)
  })
})
```

Add to `engine.ts`:
```typescript
export function calculateLeadTimeDays(bookingDate: string, arrivalDate: string): number {
  const booking = new Date(bookingDate)
  const arrival = new Date(arrivalDate)
  const diffMs = arrival.getTime() - booking.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}
```

Run: `npx vitest run src/lib/calculations/__tests__/engine.test.ts`
Expected: PASS (9 tests total)

- [ ] **Step 8: Commit**

```bash
git add src/lib/calculations/
git commit -m "feat: add commission/VAT/PB1/ARR/lead-time calculation engine"
```

---

### Task 11: Minimal upload UI

**Files:**
- Create: `aasha-revenue-portal/src/app/upload/page.tsx`
- Create: `aasha-revenue-portal/src/app/upload/upload-form.tsx`

- [ ] **Step 1: Upload page (Server Component, fetches recent upload history)**

Create `aasha-revenue-portal/src/app/upload/page.tsx`:
```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UploadForm } from './upload-form'

export default async function UploadPage() {
  const supabase = await createServerSupabaseClient()
  const { data: recentUploads } = await supabase
    .from('csv_uploads')
    .select('upload_type, file_name, uploaded_at, rows_processed, rows_new, rows_updated')
    .order('uploaded_at', { ascending: false })
    .limit(10)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Daily Upload</h1>
      <UploadForm />
      <section className="mt-10">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Recent uploads</h2>
        <ul className="divide-y rounded border">
          {recentUploads?.map((u, i) => (
            <li key={i} className="flex justify-between px-3 py-2 text-sm">
              <span>{u.upload_type}: {u.file_name}</span>
              <span className="text-gray-500">{u.rows_new} new, {u.rows_updated} updated</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Upload form (Client Component)**

Create `aasha-revenue-portal/src/app/upload/upload-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { uploadBookingsCsv } from '@/lib/actions/upload-bookings'
import { uploadCancelCsv } from '@/lib/actions/upload-cancel'
import { uploadRoomRevenueCsv } from '@/lib/actions/upload-room-revenue'
import { uploadRoomChangeLog } from '@/lib/actions/upload-room-change-log'

type UploadType = 'bookings' | 'cancel' | 'room_revenue' | 'room_change_log'

const LABELS: Record<UploadType, string> = {
  bookings: 'Bookings (Reservation by Creation Date)',
  cancel: 'Cancelled Reservations',
  room_revenue: 'Room Revenue Breakdown (today\'s rates)',
  room_change_log: 'Reservation Change Log',
}

export function UploadForm() {
  const [status, setStatus] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleUpload(type: UploadType, file: File) {
    setStatus('Uploading...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Not logged in')
      return
    }
    const text = await file.text()

    try {
      let result
      if (type === 'bookings') result = await uploadBookingsCsv(file.name, text, user.id)
      else if (type === 'cancel') result = await uploadCancelCsv(file.name, text, user.id)
      else if (type === 'room_revenue')
        result = await uploadRoomRevenueCsv(file.name, text, new Date().toISOString().slice(0, 10), user.id)
      else result = await uploadRoomChangeLog(file.name, text, user.id)

      setStatus(`Done: ${JSON.stringify(result)}`)
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(LABELS) as UploadType[]).map((type) => (
        <label key={type} className="flex flex-col gap-1 rounded border p-3">
          <span className="text-sm font-medium">{LABELS[type]}</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(type, file)
            }}
          />
        </label>
      ))}
      {status && <p className="text-sm text-gray-700">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, log in as `frontoffice@aashavillas.test`, go to `/upload`, upload the sample
`Reservation by Creation Date-63.csv` from the project's `sample-data/` folder.
Expected: status shows `Done: {"rowsProcessed":4,...}` and the row appears in "Recent uploads".
Verify in Studio (`http://127.0.0.1:54323` → Table Editor → `reservations`) that 4 rows exist.

- [ ] **Step 4: Commit**

```bash
git add src/app/upload/
git commit -m "feat: add minimal CSV upload UI for front office"
```

---

### Task 12: Deploy to Vercel + hosted Supabase

This task requires accounts you control — the agent cannot create them for you.

**Files:**
- Create: `aasha-revenue-portal/.env.production` (documented, not committed)

- [ ] **Step 1: Create a hosted Supabase project**

Go to https://supabase.com/dashboard, create a new project (note the database password you
set). Once ready, copy the Project URL, anon key, and service_role key from
Settings → API.

- [ ] **Step 2: Push schema and seed to the hosted project**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Then run the contents of `supabase/seed.sql` against the hosted database (via the SQL Editor
in the Supabase dashboard, or `psql` with the connection string from Settings → Database).

- [ ] **Step 3: Recreate the two auth users**

In the hosted project's dashboard → Authentication → Users, create `staff`/`front_office`
accounts the same way as Task 8 Step 3, against the hosted project this time.

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel deploy --prod
```

(Paste the hosted project's values, from Step 1, when prompted for each env var.)

Expected: command output ends with a `https://<project>.vercel.app` URL.

- [ ] **Step 5: Verify the live deployment**

Visit the printed URL, log in as the staff test user, confirm redirect works and (if you
completed Task 11) the upload page loads.

- [ ] **Step 6: Share the link**

Send Jane the `https://<project>.vercel.app` URL — this is the persistent testable link
referenced throughout the design conversation.

---

## Plan Self-Review Notes

- **Spec coverage:** This plan covers spec §5 (Aasha upload flow: Bookings, Cancel, Room
  Revenue, room-change log), §6 (calculation engine: commission/VAT/PB1/ARR/lead time), and the
  Phase 1 auth/roles requirement from §3. It deliberately does NOT cover Balinest ingestion,
  the reconciliation queue, any reporting UI beyond the upload page, or Excel export — those are
  Plans 2 and 3, since they depend on this foundation existing first.
- **Type consistency:** `ParsedBookingRow`, `ParsedCancelRow`, `ParsedRoomRevenueRow`, and
  `DetectedRoomChange` are each defined once (in their respective parser file) and consumed
  only by their matching Server Action — no cross-file signature drift.
- **Known gap carried forward:** Task 3's property seed only covers villas visible in the
  sample data. The full 26-villa + Balinest property list must be completed (from the `Mapping`
  sheet) before Plan 2's Balinest work or go-live — flagged in Task 3, not silently dropped.
