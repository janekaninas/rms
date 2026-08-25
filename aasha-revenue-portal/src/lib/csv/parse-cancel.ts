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
