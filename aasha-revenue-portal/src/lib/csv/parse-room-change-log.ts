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

const HEADER_ROW_MARKER = 'Reservation Number'

/**
 * The raw VHP change log lists each field twice (before/after). Most rows are noise
 * (guest name edits, check-in status flips, "Bed Changed:" text). A row only produces a
 * change record when one of the tracked fields' before/after pair actually differs.
 *
 * The export also opens with a couple of junk rows -- a blank line and a row of empty
 * quoted fields -- before the real header, so the header row is located by content
 * (matching parse-bookings.ts's approach) rather than assumed to be rows[0].
 */
export function parseRoomChangeLog(raw: string): DetectedRoomChange[] {
  const cleaned = raw.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(cleaned, { delimiter: ',' })
  const rows = parsed.data as string[][]

  const headerIndex = rows.findIndex((row) => row.includes(HEADER_ROW_MARKER))
  if (headerIndex === -1) {
    throw new Error(
      `Unrecognized room-change log: could not find header row containing "${HEADER_ROW_MARKER}"`
    )
  }
  const header = rows[headerIndex]

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
  if (reservationNumberIdx === -1) {
    throw new Error('Unrecognized room-change log: missing column "Reservation Number"')
  }
  const changeDateBeforeIdx = header.indexOf('Change Date')
  const changeDateAfterIdx = header.indexOf('Change Date', changeDateBeforeIdx + 1)
  if (changeDateBeforeIdx === -1 || changeDateAfterIdx === -1) {
    throw new Error('Unrecognized room-change log: expected two "Change Date" columns')
  }

  const changes: DetectedRoomChange[] = []

  for (const row of rows.slice(headerIndex + 1)) {
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
