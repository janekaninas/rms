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
    // The export ends with footer/summary rows (room count, grand total) that use "0" as a
    // placeholder Reservation Number rather than leaving it blank -- skip those along with any
    // genuinely blank rows, or they'd collide with each other under the
    // (reservation_number, snapshot_date) upsert key within the same batch.
    .filter((row) => row[idx.reservationNumber]?.trim() && row[idx.reservationNumber].trim() !== '0')
    .map((row) => ({
      reservationNumber: row[idx.reservationNumber].trim(),
      snapshotDate,
      roomRate: parseVhpNumber(row[idx.roomRate]),
      roomRevenue: parseVhpNumber(row[idx.roomRevenue]),
    }))
}
