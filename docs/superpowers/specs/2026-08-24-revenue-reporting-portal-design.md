# Aasha/Balinest Revenue Reporting Portal — Design

**Status:** Approved for planning
**Date:** 2026-08-24
**Author:** Jane Setiawan (owner/sales manager, Aasha Villas) + Claude

## 1. Background

Aasha Villas manages 26 villas across Seminyak (portfolio "Aasha") plus a second portfolio,
"Balinest," which shares some ownership with Aasha (e.g. the Amadeo villas) but runs through a
different channel stack.

**Current pricing/distribution flow (Aasha):** PriceLabs (dynamic pricing) → STAAH (channel
manager, distributes rates to OTAs and blocks calendars on booking) → VHP (property management
system used by front office/ops for reservations, cancellations, room changes).

**Current pricing/distribution flow (Balinest):** Guesty, direct — not connected to
VHP/STAAH.

**Current reporting process (manual, in Excel):** Every day, front office exports several CSVs
from VHP and Jane pastes/pivots them through a chain of sheets (`Bookings`, `CANCEL`,
`ROOM REV`, `Direct`, `Room change`, `Mapping`, `Arrival Report`) into a master `All Bookings`
table, which is then pivoted into monthly date×villa views (e.g. `Aug '26`) and a
year-to-date `Summary`. This is slow, manual, single-user (Excel), and error-prone to reformat
every day.

**Goal:** Replace the manual Excel pipeline with a web portal that front office can upload daily
CSVs into, and that automatically produces the same (and some new) reports — filterable, without
manual formatting — while still allowing Excel-style download for accounting/owners who want
the familiar spreadsheet.

## 2. Scope

### Phase 1 (this spec)
- Daily CSV ingestion for Aasha (Bookings, Cancel, Room Revenue Breakdown, room-change log) and
  Balinest (Guesty export)
- Manual reconciliation queue for direct/travel-agent flat-rate bookings
- Calculation engine: commission, VAT, PB1, net revenue, reservation-level and property-level ARR
- Reporting: All Bookings (filterable), Monthly pivot (date × villa, occupancy heatmap),
  Property ARR analysis, Pickup/Pace report, Summary (YTD vs. target), Owner payout report
- Excel export (with live formulas, not just pasted values) for every report
- Multi-user roles: front office (upload only), owner/manager + accounting (full view + export
  + resolve reconciliation)

### Phase 2 (future spec, not built now)
- Daily bank mutation upload
- Matching engine for OTA payouts against bank transactions (Booking.com: monthly bulk transfer
  per Aasha villa group; Airbnb: near-daily scattered transfers)
- Accounting-facing reconciliation review UI
- Discrepancy alert surfaced to the owner/manager (Jane) — not a full reconciliation UI for her,
  just a notification when something doesn't match

## 3. Architecture

- **Next.js** (App Router) web app — single portal, minimalist UI, usable on mobile (front
  office uploads from the property)
- **Supabase Postgres** — source of truth for all bookings, cancellations, daily rate
  snapshots, manual reconciliations, room changes
- **Supabase Auth** — two roles for Phase 1: `front_office` (upload only) and `staff` (Jane +
  accounting: full view, export, resolve reconciliation queue). Owners do not get logins;
  reports are exported and sent to them manually.
- **Supabase Storage** — raw CSVs retained for audit trail (every number traceable back to its
  source file)
- **Processing functions** (server-side) — run on each upload: parse CSV, upsert affected rows,
  re-run the calculation engine for affected reservations
- **Vercel** — hosting, gives a persistent shareable URL for testing between sessions

## 4. Data model

| Table | Purpose |
|---|---|
| `properties` | Villa master list: name, portfolio (`aasha`/`balinest`), room count, owner, Bracha-group flag (commission rule), monthly target/bottom thresholds |
| `reservations` | One row per booking: reservation number, property, room, guest, source, arrival/departure, nights, gross amount, status, booking date |
| `daily_rate_snapshots` | Daily Room Revenue Breakdown import (Aasha) — reservation + snapshot date + that day's actual rate. Appended, never overwritten, so historical daily rates are reconstructable |
| `manual_reconciliations` | Direct/TA flat-rate entries — imported history (from the existing "Rekap Pembayaran" Google Sheet) plus new entries from the in-app reconciliation prompt |
| `room_changes` | Detected room/room-type/date changes, parsed from the raw VHP change-log CSV (see §5) |
| `balinest_bookings` | Guesty feed — fully replaced on each upload (no reliable booking-date key to diff against) |
| `commission_rules` | Editable table: OTA source × villa group → commission % (admin-editable, not hardcoded) |
| `revenue_calculations` (view) | Computed per reservation: commission %, commission amount, VAT, PB1, net revenue — derived live, not stored |

## 5. Daily upload & processing flow

**Aasha (front office uploads after night audit):**
1. `Bookings` CSV → upsert by reservation number
2. `Cancel` CSV → matching reservations flagged cancelled (cancellation always wins regardless
   of upload order)
3. `RoomRevenueBreakdown` CSV → appended as today's rate snapshot (like the current `ROOM REV`
   sheet's `CURRENT DATE` column)
4. Raw reservation change-log CSV → parsed for real room changes. Each row has before/after
   column pairs (Room Number, Room Type, Arrival, Departure, plus noise fields like Guest Name
   and check-in status). A row becomes a `room_changes` record only when Room Number, Room
   Type, Arrival, or Departure actually differs between the pair — everything else is discarded
   as noise (guest name edits, "Bed Changed:" text, check-in status flips).
5. System flags direct/TA reservations with no manual amount on file → added to the
   reconciliation queue rather than blocking the upload
6. Staff resolve queued items via a form (enter flat amount) → saved to
   `manual_reconciliations`, gross amount updates immediately

**Balinest:**
1. Front office (or Jane) uploads today's Guesty export
2. Since there's no reliable booking-date key, this **replaces** `balinest_bookings` fully,
   inside a transaction (a failed upload leaves yesterday's data intact)

Every upload shows a summary ("42 rows processed, 3 new reconciliations needed, 1 duplicate
skipped") and keeps the raw file in Storage.

## 6. Calculation engine

Recomputes automatically whenever underlying data changes (new booking, cancellation,
reconciliation entered, room change applied):

- **Commission %** — from `commission_rules`, keyed by OTA source + villa group (e.g.
  Booking.com: 18% for Bracha villas, 17.3% otherwise; Expedia: 15%; direct/TA/other OTAs: 0%)
- **Commission amount** = Gross × Commission %
- **VAT 11%** = Commission × 11%
- **PB1** = Gross ÷ 1.1 × 10%, excluded for Bracha villas (Aasha). Same PB1 logic built into the
  schema for Balinest, toggle-able per property, since Balinest PB1 is a planned but not-yet-
  active requirement
- **Net revenue** = Gross − Commission − VAT − PB1
- **Reservation ARR** = Total revenue ÷ nights
- **Property ARR** = SUM(revenue) ÷ SUM(room nights) for a villa over a chosen period — its own
  analysis view, for comparing pricing performance across the portfolio
- **Lead time** = arrival_date − booking_date, per reservation
- **Balinest**: Commission = Accommodation Fare − Total Payout; PB1 applied on top once enabled;
  Net payout = Total Payout − PB1

## 7. Reporting UI

All views are filterable/searchable and have a "Download as Excel" button producing a workbook
with **live formulas** (subtotal rows, commission/VAT/PB1 math), not pasted-in values — so
accounting can audit by clicking cells, same as today.

- **All Bookings** — searchable/filterable table (guest, villa, date range, source, status),
  with gross/commission/VAT/PB1/net/lead-time columns
- **Monthly view** — date × villa pivot with occupancy heatmap, split Aasha/Balinest panels,
  switchable by month (matches current `Aug '26` sheet layout)
- **Property ARR analysis** — pick a villa + period, see ARR trend vs. portfolio average
- **Pickup/Pace report** — daily, per portfolio (and per villa): # new bookings, room nights
  sold, new booking amount; # cancellations, room nights cancelled, cancelled amount; Net;
  running Accumulation; Road to Target (against the monthly target) — matches current "PICKUP
  AASHA" sheet
- **Summary** — month-by-month revenue vs. Target/Bottom per villa, rolling through year-end
- **Reconciliation queue** — direct/TA bookings awaiting a manual amount
- **Owner payout report** — per villa/owner, clean revenue/commission/payout breakdown, ready to
  export and send manually (no owner login in Phase 1)

## 8. Error handling & edge cases

- **Duplicate CSV re-upload** — detected by reservation number + row hash; safe to re-run
  (upsert), reports "0 new, X unchanged"
- **Malformed/unexpected CSV columns** (VHP export format changes) — upload rejected with a
  clear error naming the missing/renamed column, rather than silently importing garbage
- **Reservation in Bookings but already cancelled** — cancellation always wins regardless of
  upload order; net revenue zeroes out
- **Room change references a reservation not yet in the system** — change is queued and applied
  once the reservation appears
- **Balinest full-replace upload fails partway** — happens inside a transaction; a failed
  upload leaves yesterday's data intact
- **Missing manual reconciliation** — reservation still appears in reports using the gross
  amount, visibly flagged "pending reconciliation" so numbers are never silently wrong or
  missing

## 9. Testing

- Unit tests for the calculation engine (commission/VAT/PB1/ARR/lead time) against known values
  from the actual current workbook (`Aasha Revenue Report - 20260823 copy.xlsx`) and sample CSVs
  already provided, used as fixtures/golden data — verifying the new system's numbers match the
  existing Excel output exactly before relying on it
- Integration tests per upload type (Bookings, Cancel, Room Revenue, room-change log, Balinest)
  covering the edge cases in §8
- Manual golden-path testing in the browser during development: upload real sample CSVs, compare
  against current Excel output

## 10. Historical data migration

Full 2026 history (Jan–Dec sheets from the existing workbook, plus the "Rekap Pembayaran /
Rekap Booking Amani OFF TA" Google Sheet for direct/TA reconciliation) is imported into the new
system so Summary/YTD views are complete from day one, rather than starting empty.

## 11. Open items / assumptions carried into planning

- Exact commission rule table (all OTA × villa-group combinations) will be extracted in full
  from the existing workbook's formulas during implementation, not just the examples cited above
- Balinest PB1 activation date/trigger is not yet defined by the business — schema supports it,
  activation is a config flip when ready
- Phase 2 (bank reconciliation) is out of scope here; captured above for continuity into its own
  future spec
