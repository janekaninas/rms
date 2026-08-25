import { describe, it, expect } from 'vitest'
import { parseRoomChangeLog } from '../parse-room-change-log'

// The real VHP export opens with a BOM, a blank line, and a row of empty quoted fields
// before the actual header row -- reproduced here so a regression that reverts the
// dynamic header-row lookup back to assuming rows[0] is the header gets caught.
const SAMPLE_CSV =
  '﻿' +
  `
"","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Reservation Number","Reservation Name","Arrival","Arrival","Departure","Departure","Quantity","Quantity","Adult","Adult","Child","Child","Compliment","Compliment","Room Type","Room Type","Room Number","Room Number","Arrangement Code","Arrangement Code","Rate","Rate","Fixed Rate","Fixed Rate","Guest Name","Guest Name","Id","Id","Change Date","Change Date","Time"
"3108","Trip.Com","21/08/26","21/08/26","22/08/26","22/08/26","1","1","4","4","0","0","0","0","CDF2  ","CDF2  ","","","RO","RO","1,554,630.00","1,554,630.00","YES","YES","Bed Changed:","' -> Double","**","31","","20/08/26","00:01:42"
"3108","Trip.Com","21/08/26","21/08/26","22/08/26","22/08/26","1","1","4","4","0","0","0","0","CDF2  ","CDF2  ","","CDF2","RO","RO","1,554,630.00","1,554,630.00","YES","YES","SHEN, LIN ","SHEN, LIN ","**","31","","20/08/26","00:01:43"
"3110","AGODA","09/09/26","10/09/26","13/09/26","13/09/26","1","1","2","2","0","0","0","0","1BRS  ","1BRS  ","102","102","RO","RO","1,561,823.00","1,561,823.00","YES","YES","Null, Daniel ","Null, Daniel ","**","31","20/08/26","20/08/26","00:02:29"
`

describe('parseRoomChangeLog', () => {
  it('ignores rows where nothing in Room Number/Type/Arrival/Departure differs', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes.find((c) => c.reservationNumber === '3108' && c.changedField === 'room_number' && c.newValue === null)).toBeUndefined()
  })

  it('detects a real room number assignment', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes).toContainEqual({
      reservationNumber: '3108',
      changedField: 'room_number',
      oldValue: '',
      newValue: 'CDF2',
      changeDate: '2026-08-20',
    })
  })

  it('detects a real arrival date change', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes).toContainEqual({
      reservationNumber: '3110',
      changedField: 'arrival',
      oldValue: '09/09/26',
      newValue: '10/09/26',
      changeDate: '2026-08-20',
    })
  })

  it('produces no changes for a row with only noise fields differing', () => {
    const changes = parseRoomChangeLog(SAMPLE_CSV)
    expect(changes.filter((c) => c.reservationNumber === '3108')).toHaveLength(1)
  })
})
