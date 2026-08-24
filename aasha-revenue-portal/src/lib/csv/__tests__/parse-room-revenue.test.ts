import { describe, it, expect } from 'vitest'
import { parseRoomRevenueCsv } from '../parse-room-revenue'

const SAMPLE_CSV = `﻿Room Number;Reservation Number;Room Type;Arrangement Code;Rate Code;Currency;Room Rate;Pax;Adult;Compliment;Child1;Age;Child2;Compliment Child;Local Currency;Room Revenue;Breakfast Revenue;Lunch;Dinner;Other Revenue;Fix Cost;Banquet Revenue;Total Rate;Arrival;Departure;Room Night;Bill Number;Reserve Name;Guest Name;Bill Address;Segment;Nationality;Exchange Rate;Fixed Rate
101;3134;1BRS;RB;;Rp;500,000.00;2;2;0;0;;0;0;500,000.00;400,000.00;;;;100,000.00;;;500,000.00;23/08/26;24/08/26;1;2082;Rasyid ;Zlad , Binhomoud MR;Rasyid ,;OFF-TA;SAU;01.00;No
;0;;;;;;0;0;0;0;;0;0;;;;;;;;;;;;NaN;0;;;;;;;No
24;0;;;;Rp;500,000.00;2;2;0;1;;0;0;500,000.00;400,000.00;;;;100,000.00;;;500,000.00;;;NaN;0;;;;;;;No
`

describe('parseRoomRevenueCsv', () => {
  it('extracts reservation number and that day\'s actual room rate', () => {
    const rows = parseRoomRevenueCsv(SAMPLE_CSV, '2026-08-23')
    // Room Rate (500,000.00) and Room Revenue (400,000.00) genuinely differ in this row: the
    // VHP export's "Other Revenue" column (100,000.00, a Fix Cost line item) is split out of
    // the rate, so Room Revenue = Room Rate - Other Revenue. This holds across every row of the
    // real RoomRevenueBreakdown-92.csv sample, including its TOTAL row (42,285,539.00 =
    // 41,785,539.00 + 500,000.00) -- confirmed by direct inspection, not assumed.
    expect(rows).toEqual([
      {
        reservationNumber: '3134',
        snapshotDate: '2026-08-23',
        roomRate: 500000,
        roomRevenue: 400000,
      },
    ])
  })

  it('skips the trailing footer/summary rows, which use "0" as a placeholder reservation number', () => {
    // The real VHP export ends with a room-count row and a grand-total row, both carrying
    // Reservation Number "0" instead of being left blank. Left unfiltered, two such rows in the
    // same upload would collide under the (reservation_number, snapshot_date) upsert key.
    const rows = parseRoomRevenueCsv(SAMPLE_CSV, '2026-08-23')
    expect(rows.map((r) => r.reservationNumber)).toEqual(['3134'])
    expect(rows.some((r) => r.reservationNumber === '0')).toBe(false)
  })
})
