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
