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

  // Resolve room_number -> property_id via room_mappings (a prior task's schema fix). A room
  // number with no mapping row means an unrecognized/new unit -- gross_amount and other fields
  // still get stored so the reservation isn't lost, but property_id is left null and the room
  // number is flagged for follow-up rather than silently attributed to the wrong villa.
  const { data: mappings, error: mappingsError } = await supabase
    .from('room_mappings')
    .select('room_number, property_id')
  if (mappingsError) throw mappingsError
  const propertyIdByRoomNumber = new Map(mappings.map((m) => [m.room_number, m.property_id]))

  let rowsNew = 0
  let rowsUpdated = 0
  const unmappedRoomNumbers = new Set<string>()

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_number', row.reservationNumber)
      .maybeSingle()

    const propertyId = propertyIdByRoomNumber.get(row.roomNumber) ?? null
    if (!propertyId) unmappedRoomNumbers.add(row.roomNumber)

    const { error } = await supabase.from('reservations').upsert(
      {
        reservation_number: row.reservationNumber,
        property_id: propertyId,
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

  return {
    rowsProcessed: rows.length,
    rowsNew,
    rowsUpdated,
    unmappedRoomNumbers: [...unmappedRoomNumbers],
  }
}
