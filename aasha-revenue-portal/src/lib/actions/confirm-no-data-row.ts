export type ConfirmableUploadType = 'bookings' | 'cancel' | 'room_revenue' | 'room_change_log'

export function buildConfirmNoDataRow(uploadType: ConfirmableUploadType, uploadedBy: string) {
  return {
    upload_type: uploadType,
    file_name: null,
    uploaded_by: uploadedBy,
    rows_processed: 0,
    rows_new: 0,
    rows_updated: 0,
    confirmed_empty: true,
  }
}
