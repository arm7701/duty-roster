export type HolidayCategory = 
  | 'government'   // วันหยุดราชการประจำปี
  | 'religious'    // วันสำคัญทางพระพุทธศาสนา (หยุดราชการ)
  | 'royal'        // วันสำคัญเกี่ยวกับสถาบันพระมหากษัตริย์ (หยุดราชการ)
  | 'compensatory' // วันหยุดชดเชย
  | 'special'      // วันหยุดราชการกรณีพิเศษ (มติ ครม.)

export interface Holiday {
  id: string
  date: string             // ISO format YYYY-MM-DD
  name: string             // ชื่อวันหยุดภาษาไทย
  nameEn?: string          // ชื่อภาษาอังกฤษ
  category: HolidayCategory
  isGovernmentHoliday: boolean // เป็นวันหยุดราชการหรือไม่ (หยุดงาน)
  description: string      // ความสำคัญหรือประวัติโดยย่อ
  dutyNote?: string        // คำแนะนำสำหรับการจัดเวร SATOPS
  icon?: string            // ไอคอนสำหรับแสดงผล
}

export interface DayInfo {
  date: string             // YYYY-MM-DD
  dayNumber: number        // 1 - 31
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  dayOfWeek: number        // 0 = อาทิตย์, 6 = เสาร์
  holidays: Holiday[]
}
