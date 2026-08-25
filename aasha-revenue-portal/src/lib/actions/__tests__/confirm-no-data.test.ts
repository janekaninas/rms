import { describe, it, expect } from 'vitest'
import { buildConfirmNoDataRow } from '../confirm-no-data'

describe('buildConfirmNoDataRow', () => {
  it('builds a csv_uploads row with no file, marked confirmed_empty', () => {
    const row = buildConfirmNoDataRow('cancel', 'user-123')
    expect(row).toEqual({
      upload_type: 'cancel',
      file_name: null,
      uploaded_by: 'user-123',
      rows_processed: 0,
      rows_new: 0,
      rows_updated: 0,
      confirmed_empty: true,
    })
  })
})
