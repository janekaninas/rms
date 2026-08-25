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

  let reservationsUpdated = 0
  const unmappedRoomNumbers = new Set<string>()

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
    //
    // A room_number change can move a reservation to a different property entirely (e.g. a
    // guest upgraded from Casa Amani 1 to Casa Amani 2), so property_id must be re-resolved
    // via room_mappings here too -- it is NOT recomputed automatically just because
    // room_number changed. Skipping this would let property_id silently go stale, which was
    // exactly the bug Task 3.5 fixed for initial ingestion.
    //
    // If the new room number ISN'T in room_mappings (typo, brand-new unit, unusual internal
    // code), the reservation likely already carries a correct property_id from initial
    // ingestion -- don't overwrite it with null. Only room_number is updated in that case, and
    // the unresolved room number is surfaced in the return value (mirroring
    // upload-bookings.ts's unmappedRoomNumbers) rather than silently dropped.
    const roomNumberChanges = changes.filter((c) => c.changedField === 'room_number' && c.newValue)
    if (roomNumberChanges.length > 0) {
      const { data: mappings, error: mappingsError } = await supabase
        .from('room_mappings')
        .select('room_number, property_id')
      if (mappingsError) throw mappingsError
      const propertyIdByRoomNumber = new Map(mappings.map((m) => [m.room_number, m.property_id]))

      for (const change of roomNumberChanges) {
        const propertyId = propertyIdByRoomNumber.get(change.newValue) ?? null
        if (!propertyId) unmappedRoomNumbers.add(change.newValue)

        const update: Record<string, unknown> = {
          room_number: change.newValue,
          updated_at: new Date().toISOString(),
        }
        // Only touch property_id when it resolves -- omitting the key (rather than setting it
        // to null) leaves an already-correct property_id on the reservation untouched.
        if (propertyId) update.property_id = propertyId

        const { data: updated, error: reservationUpdateError } = await supabase
          .from('reservations')
          .update(update)
          .eq('reservation_number', change.reservationNumber)
          .select('id')
        if (reservationUpdateError) throw reservationUpdateError
        reservationsUpdated += updated?.length ?? 0
      }
    }
  }

  const { error: updateUploadError } = await supabase
    .from('csv_uploads')
    .update({ rows_new: changes.length, rows_updated: reservationsUpdated })
    .eq('id', upload.id)
  if (updateUploadError) throw updateUploadError

  return { changesDetected: changes.length, unmappedRoomNumbers: [...unmappedRoomNumbers] }
}
