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
