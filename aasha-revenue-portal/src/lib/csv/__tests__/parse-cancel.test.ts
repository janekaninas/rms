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
