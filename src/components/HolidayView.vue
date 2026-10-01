<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  formatFullThaiDate,
  formatShortThaiDate,
  RAW_HOLIDAYS,
  THAI_DAY_NAMES,
  THAI_DAY_SHORT,
  THAI_MONTH_NAMES
} from '../data/holidays'
import type { Holiday, HolidayCategory } from '../types/holiday'

// ==========================================
// 1. Types & Props (Data Isolation for Devs)
// ==========================================
type DutyRoster = {
  date: string
  day: string
  dayShort: string
  md: string
  mdCode: string
  fmo: string
  fmoCode: string
  gso: string
  gsoCode: string
  note: string
}

export type LeaveType = 'vacation' | 'duty_travel' | 'detached' | 'sick' | 'personal'

export interface PersonnelLeaveRecord {
  id: string
  personnelName: string
  division: string
  type: LeaveType
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  reason: string
  orderNo?: string
  dutyReplacement?: string
  createdAt: string
}

export interface OfficerInfo {
  name: string
  division: string
  roles: string
}

// Props รับข้อมูลจากระบบหลัก (รอเชื่อมต่อกับหน้าบุคลากรและ API/Store ในอนาคต)
// TODO: สำหรับ Developer - สามารถเชื่อมโยงข้อมูลบุคลากรจริงจากระบบ Store/API ได้ที่นี่
const props = defineProps<{
  schedule?: DutyRoster[]
  personnelList?: { name: string; division?: string; roles?: string; status?: string }[]
}>()

// ฟังก์ชันดึงข้อมูลเวร (ปิดการเชื่อมโยงไว้ชั่วคราว เพื่อให้ dev ท่านอื่นเชื่อมต่อเอง)
const getDutyForDate = (_dateStr: string): DutyRoster | undefined => {
  // TODO: สำหรับ Developer - นำไปเปิดใช้งานเมื่อต้องการเชื่อมโยงข้อมูลผู้เข้าเวรกับวันหยุด เช่น:
  // return props.schedule?.find((s) => s.date === _dateStr)
  return undefined
}

// รายชื่อบุคลากรประจำหน่วยปฏิบัติการดาวเทียม SATOPS
const defaultPersonnelList: OfficerInfo[] = [
  { name: 'พ.อ. ณรงค์ฤทธิ์ วัฒนชัย', division: 'SOD', roles: 'MD · FMO' },
  { name: 'น.อ. ธนกฤต มณีรัตน์', division: 'SOD', roles: 'MD' },
  { name: 'พ.อ. วิชัย ศุภกิจ', division: 'SOD', roles: 'MD' },
  { name: 'ร.ต.หญิง ปาริชาติ สุขเกษม', division: 'SOD', roles: 'FMO · GSO' },
  { name: 'ร.ต. ธีรภัทร อุดมศรี', division: 'SOD', roles: 'FMO' },
  { name: 'ร.ต.หญิง กมลชนก พูลเพิ่ม', division: 'SOD', roles: 'FMO' },
  { name: 'จ.ส.อ. กิตติพงษ์ แสงทอง', division: 'ISR', roles: 'GSO' },
  { name: 'จ.ส.อ. ชาญณรงค์ พรหมมา', division: 'ISR', roles: 'GSO' },
  { name: 'จ.ส.อ. วีรพล อินทร์แก้ว', division: 'ISR', roles: 'GSO' }
]

const availablePersonnel = computed<OfficerInfo[]>(() => {
  if (props.personnelList && props.personnelList.length > 0) {
    return props.personnelList.map((p) => ({
      name: p.name,
      division: p.division || 'SOD',
      roles: p.roles || 'กำลังพล'
    }))
  }
  return defaultPersonnelList
})

// ==========================================
// 2. State & Persistence (วันหยุดราชการ)
// ==========================================
const HOLIDAY_STORAGE_KEY = 'satops_google_calendar_holidays_v1'

const loadInitialHolidays = (): Holiday[] => {
  try {
    const saved = localStorage.getItem(HOLIDAY_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Error loading holidays from localStorage', err)
  }
  return [...RAW_HOLIDAYS]
}

const holidaysList = ref<Holiday[]>(loadInitialHolidays())

// ==========================================
// 3. State & Persistence (วันลา / จำหน่าย / ไปราชการ)
// ==========================================
const LEAVE_STORAGE_KEY = 'satops_personnel_leaves_v1'

const defaultDemoLeaves: PersonnelLeaveRecord[] = [
  {
    id: 'leave-1',
    personnelName: 'ร.ต. ธีรภัทร อุดมศรี',
    division: 'SOD',
    type: 'vacation',
    startDate: '2026-10-02',
    endDate: '2026-10-07',
    reason: 'ลาพักผ่อนประจำปี (เยี่ยมภูมิลำเนา)',
    orderNo: 'อนุมัติ ศปก.ทบ. 412/69',
    dutyReplacement: 'ร.ต.หญิง กมลชนก พูลเพิ่ม',
    createdAt: '2026-09-25'
  },
  {
    id: 'leave-2',
    personnelName: 'จ.ส.อ. วีรพล อินทร์แก้ว',
    division: 'ISR',
    type: 'duty_travel',
    startDate: '2026-10-05',
    endDate: '2026-10-15',
    reason: 'ไปราชการตรวจซ่อมบำรุงจานรับสัญญาณดาวเทียมภาคพื้นดิน จ.สงขลา',
    orderNo: 'คำสั่ง สห.ทบ. ที่ 88/69',
    dutyReplacement: 'จ.ส.อ. ชาญณรงค์ พรหมมา',
    createdAt: '2026-09-28'
  },
  {
    id: 'leave-3',
    personnelName: 'พ.อ. วิชัย ศุภกิจ',
    division: 'SOD',
    type: 'detached',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    reason: 'จำหน่ายไปช่วยราชการศูนย์ไซเบอร์ทหาร กองบัญชาการกองทัพไทย (1 เดือน)',
    orderNo: 'คำสั่ง กห. 1042/69',
    dutyReplacement: 'พ.อ. ณรงค์ฤทธิ์ วัฒนชัย',
    createdAt: '2026-09-20'
  },
  {
    id: 'leave-4',
    personnelName: 'พ.อ. ณรงค์ฤทธิ์ วัฒนชัย',
    division: 'SOD',
    type: 'duty_travel',
    startDate: '2026-10-16',
    endDate: '2026-10-21',
    reason: 'ไปราชการร่วมประชุมคณะทำงานความมั่นคงด้านอวกาศและการควบคุมวงโคจร',
    orderNo: 'คำสั่ง บก.ทบ. 511/69',
    dutyReplacement: 'น.อ. ธนกฤต มณีรัตน์',
    createdAt: '2026-10-01'
  },
  {
    id: 'leave-5',
    personnelName: 'ร.ต.หญิง กมลชนก พูลเพิ่ม',
    division: 'SOD',
    type: 'vacation',
    startDate: '2026-10-22',
    endDate: '2026-10-28',
    reason: 'ลาพักผ่อนประจำปี (ช่วงปลายเดือน)',
    orderNo: 'อนุมัติ ศปก.ทบ. 458/69',
    dutyReplacement: 'ร.ต.หญิง ปาริชาติ สุขเกษม',
    createdAt: '2026-10-01'
  }
]

const loadInitialLeaves = (): PersonnelLeaveRecord[] => {
  try {
    const saved = localStorage.getItem(LEAVE_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Error loading leaves from localStorage', err)
  }
  return [...defaultDemoLeaves]
}

const leavesList = ref<PersonnelLeaveRecord[]>(loadInitialLeaves())

const saveLeavesToStorage = () => {
  try {
    localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(leavesList.value))
  } catch (err) {
    console.error('Error saving leaves to localStorage', err)
  }
}

// หมวดหมู่วันลา สีและสไตล์ที่สบายตา เรียบหรู ชัดเจน
const LEAVE_TYPE_CONFIG: Record<
  LeaveType,
  { label: string; shortLabel: string; color: string; bgLight: string; border: string; icon: string }
> = {
  vacation: {
    label: 'วันลาพักผ่อน',
    shortLabel: 'ลาพักผ่อน',
    color: '#0f766e',
    bgLight: '#f0fdfa',
    border: '#ccfbf1',
    icon: '🏖️'
  },
  duty_travel: {
    label: 'วันไปราชการ',
    shortLabel: 'ไปราชการ',
    color: '#1d4ed8',
    bgLight: '#eff6ff',
    border: '#dbeafe',
    icon: '🛫'
  },
  detached: {
    label: 'วันจำหน่าย',
    shortLabel: 'จำหน่าย',
    color: '#7e22ce',
    bgLight: '#faf5ff',
    border: '#f3e8ff',
    icon: '📦'
  },
  sick: {
    label: 'วันลาป่วย',
    shortLabel: 'ลาป่วย',
    color: '#b91c1c',
    bgLight: '#fef2f2',
    border: '#fee2e2',
    icon: '🏥'
  },
  personal: {
    label: 'วันลากิจ',
    shortLabel: 'ลากิจ',
    color: '#b45309',
    bgLight: '#fffbeb',
    border: '#fef3c7',
    icon: '📋'
  }
}

// ควบคุมการแสดงวันลาบนปฏิทิน
const showLeavesOnCalendar = ref(true)

// ==========================================
// 4. Calendar Navigation & Clock
// ==========================================
const now = ref(new Date())
let timerId: number | null = null

onMounted(() => {
  timerId = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timerId !== null) clearInterval(timerId)
})

const todayString = computed(() => {
  const d = now.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const liveTimeString = computed(() => {
  const d = now.value
  const dayName = THAI_DAY_NAMES[d.getDay()]
  const date = d.getDate()
  const monthName = THAI_MONTH_NAMES[d.getMonth()]
  const thaiYear = d.getFullYear() + 543
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `วัน${dayName}ที่ ${date} ${monthName} พ.ศ. ${thaiYear} · ${hours}:${minutes}:${seconds} น.`
})

// ปฏิทินหลักเริ่มต้นที่เดือนตุลาคม 2569 (2026)
const currentYear = ref(2026)
const currentMonth = ref(10) // 1 - 12
const currentDay = ref(1)

// วันที่เลือกสำหรับตารางรายชื่อบุคลากรด้านล่าง
const selectedRosterDate = ref('2026-10-01')

// มินิปฏิทินในแถบด้านข้าง
const miniYear = ref(2026)
const miniMonth = ref(10)

const isSidebarOpen = ref(true)

// ==========================================
// 5. Filters (ค้นหา & หมวดหมู่วันหยุด)
// ==========================================
const searchQuery = ref('')
const categoryFilters = ref<Record<HolidayCategory, boolean>>({
  government: true,
  royal: true,
  religious: true,
  compensatory: true,
  special: true
})

const CATEGORY_CONFIG: Record<
  HolidayCategory,
  { label: string; color: string; bgLight: string; border: string; icon: string }
> = {
  government: {
    label: 'วันหยุดราชการประจำปี',
    color: '#d93025',
    bgLight: '#fce8e6',
    border: '#fad2cf',
    icon: '🏛️'
  },
  royal: {
    label: 'วันสำคัญเกี่ยวกับสถาบัน',
    color: '#1a73e8',
    bgLight: '#e8f0fe',
    border: '#d2e3fc',
    icon: '👑'
  },
  religious: {
    label: 'วันสำคัญทางศาสนา',
    color: '#e37400',
    bgLight: '#fef7e0',
    border: '#feefc3',
    icon: '🪷'
  },
  compensatory: {
    label: 'วันหยุดชดเชย',
    color: '#188038',
    bgLight: '#e6f4ea',
    border: '#ceead6',
    icon: '🔄'
  },
  special: {
    label: 'วันหยุดพิเศษ (มติ ครม.)',
    color: '#a142f4',
    bgLight: '#f3e8fd',
    border: '#e9d2fd',
    icon: '✨'
  }
}

// ข้อมูลวันหยุดที่ผ่านการกรอง
const filteredHolidays = computed(() => {
  return holidaysList.value.filter((h) => {
    if (!categoryFilters.value[h.category]) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchName = h.name.toLowerCase().includes(q)
      const matchDesc = h.description.toLowerCase().includes(q)
      const matchDate = h.date.includes(q)
      if (!matchName && !matchDesc && !matchDate) return false
    }
    return true
  })
})

// ค้นหารายการวันลาของบุคลากรในวันที่ระบุ (รองรับระยะยาว)
const getLeavesForDate = (dateStr: string): PersonnelLeaveRecord[] => {
  if (!showLeavesOnCalendar.value) return []
  return leavesList.value.filter((leave) => {
    return leave.startDate <= dateStr && dateStr <= leave.endDate
  })
}

// หัวเรื่องช่วงเวลาปฏิทิน
const periodTitle = computed(() => {
  return `${THAI_MONTH_NAMES[currentMonth.value - 1]} ${currentYear.value + 543}`
})

// ==========================================
// 6. Navigation Controls
// ==========================================
const prevPeriod = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
  miniMonth.value = currentMonth.value
  miniYear.value = currentYear.value
}

const nextPeriod = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
  miniMonth.value = currentMonth.value
  miniYear.value = currentYear.value
}

const goToToday = () => {
  const d = new Date()
  currentYear.value = d.getFullYear()
  currentMonth.value = d.getMonth() + 1
  currentDay.value = d.getDate()
  selectedRosterDate.value = todayString.value
  miniYear.value = currentYear.value
  miniMonth.value = currentMonth.value
}

const jumpToDemoMonth = () => {
  currentYear.value = 2026
  currentMonth.value = 10
  currentDay.value = 1
  selectedRosterDate.value = '2026-10-01'
  miniYear.value = 2026
  miniMonth.value = 10
}

// ==========================================
// 7. Calendar Grid (Cleaned up, แสดงข้อมูลชัดเจน ไม่ซ้อนกัน)
// ==========================================
interface CalendarCell {
  date: string
  dayNumber: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  isSelectedRosterDate: boolean
  dayOfWeek: number
  holidays: Holiday[]
  leaves: PersonnelLeaveRecord[]
}

const monthGridCells = computed<CalendarCell[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    const dow = new Date(y, m - 1, dNum).getDay()
    cells.push({
      date: dateStr,
      dayNumber: dNum,
      month: m,
      year: y,
      isCurrentMonth: false,
      isToday: dateStr === todayString.value,
      isWeekend: dow === 0 || dow === 6,
      isSelectedRosterDate: dateStr === selectedRosterDate.value,
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr),
      leaves: getLeavesForDate(dateStr)
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = new Date(year, month - 1, d).getDay()
    cells.push({
      date: dateStr,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayString.value,
      isWeekend: dow === 0 || dow === 6,
      isSelectedRosterDate: dateStr === selectedRosterDate.value,
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr),
      leaves: getLeavesForDate(dateStr)
    })
  }

  const totalCells = cells.length <= 35 ? 35 : 42
  const remaining = totalCells - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = new Date(y, m - 1, d).getDay()
    cells.push({
      date: dateStr,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: false,
      isToday: dateStr === todayString.value,
      isWeekend: dow === 0 || dow === 6,
      isSelectedRosterDate: dateStr === selectedRosterDate.value,
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr),
      leaves: getLeavesForDate(dateStr)
    })
  }

  return cells
})

// ป็อปอัปดูรายละเอียดวันที่เลือกในปฏิทิน (Day Details Modal)
const isDayDetailModalOpen = ref(false)
const activeDayDetail = ref<CalendarCell | null>(null)

const handleSelectCalendarDay = (cell: CalendarCell) => {
  selectedRosterDate.value = cell.date
  activeDayDetail.value = cell
  isDayDetailModalOpen.value = true
}

// เลื่อนลงไปดูตารางด้านล่างแบบนุ่มนวล
const scrollToRosterTable = () => {
  isDayDetailModalOpen.value = false
  const el = document.getElementById('personnel-roster-table-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// มินิปฏิทินข้างซ้าย
const miniCalendarCells = computed(() => {
  const y = miniYear.value
  const m = miniMonth.value
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDow = new Date(y, m - 1, 1).getDay()
  const prevDays = new Date(y, m - 1, 0).getDate()
  const list: { date: string; day: number; isCurrentMonth: boolean; hasEvent: boolean; isSelected: boolean }[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const dNum = prevDays - i
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    list.push({
      date: dStr,
      day: dNum,
      isCurrentMonth: false,
      hasEvent: holidaysList.value.some((h) => h.date === dStr) || leavesList.value.some((l) => l.startDate <= dStr && dStr <= l.endDate),
      isSelected: dStr === selectedRosterDate.value
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    list.push({
      date: dStr,
      day: d,
      isCurrentMonth: true,
      hasEvent: holidaysList.value.some((h) => h.date === dStr) || leavesList.value.some((l) => l.startDate <= dStr && dStr <= l.endDate),
      isSelected: dStr === selectedRosterDate.value
    })
  }

  const remaining = 35 - list.length > 0 ? 35 - list.length : 42 - list.length
  for (let d = 1; d <= remaining; d++) {
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    list.push({
      date: dStr,
      day: d,
      isCurrentMonth: false,
      hasEvent: holidaysList.value.some((h) => h.date === dStr) || leavesList.value.some((l) => l.startDate <= dStr && dStr <= l.endDate),
      isSelected: dStr === selectedRosterDate.value
    })
  }

  return list
})

const selectDateFromMini = (cell: { date: string }) => {
  const [y, m, d] = cell.date.split('-').map(Number)
  currentYear.value = y
  currentMonth.value = m
  currentDay.value = d
  selectedRosterDate.value = cell.date
}

// ==========================================
// 8. CATEGORIZED LEAVE MANAGEMENT (แยกหมวดหมู่ตารางการลา)
// ==========================================
// หมวดหมู่หลัก: ทั้งหมด | ลาพักผ่อน | ไปราชการ | วันจำหน่าย | ลาป่วย/ลากิจ | ตารางเช็คชื่อกำลังพล
type LeaveCategoryTab = 'all' | 'vacation' | 'duty_travel' | 'detached' | 'sick_personal' | 'officer_roster'
const activeCategoryTab = ref<LeaveCategoryTab>('all')

// ตัวกรองสถานะช่วงเวลา: ทั้งหมด | กำลังลาอยู่ในช่วงนี้ | ล่วงหน้า | สิ้นสุดแล้ว
type LeaveStatusFilter = 'all' | 'active' | 'upcoming' | 'past'
const leaveStatusFilter = ref<LeaveStatusFilter>('all')

const leaveSearch = ref('')

// คำนวณจำนวนวัน
const calculateDurationDays = (start: string, end: string) => {
  if (!start || !end) return 0
  const s = new Date(`${start}T00:00:00`).getTime()
  const e = new Date(`${end}T00:00:00`).getTime()
  if (e < s) return 0
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
}

// ตัดข้อความชื่อสั้น
const getShortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`
  }
  return fullName
}

// สรุปสถานะรายการลาเมื่อเทียบกับวันที่เลือก
const getLeaveStatusInfo = (leave: PersonnelLeaveRecord, targetDate: string) => {
  if (leave.startDate <= targetDate && targetDate <= leave.endDate) {
    return { text: '🔴 กำลังลาอยู่ในช่วงนี้', status: 'active', bg: '#fef2f2', color: '#b91c1c' }
  }
  if (leave.startDate > targetDate) {
    return { text: '🔵 มีกำหนดล่วงหน้า', status: 'upcoming', bg: '#eff6ff', color: '#1d4ed8' }
  }
  return { text: '⚪ สิ้นสุดแล้ว', status: 'past', bg: '#f8fafc', color: '#64748b' }
}

// นับจำนวนในแต่ละหมวดหมู่
const categoryCounts = computed(() => {
  const list = leavesList.value
  return {
    all: list.length,
    vacation: list.filter((l) => l.type === 'vacation').length,
    duty_travel: list.filter((l) => l.type === 'duty_travel').length,
    detached: list.filter((l) => l.type === 'detached').length,
    sick_personal: list.filter((l) => l.type === 'sick' || l.type === 'personal').length,
    officer_roster: availablePersonnel.value.length
  }
})

// รายการวันลาที่กรองตามหมวดหมู่ คำค้นหา และสถานะ
const filteredLeaveRecords = computed(() => {
  const targetDate = selectedRosterDate.value

  return leavesList.value.filter((leave) => {
    // 1. กรองตามหมวดหมู่ (Category Tab)
    if (activeCategoryTab.value === 'vacation' && leave.type !== 'vacation') return false
    if (activeCategoryTab.value === 'duty_travel' && leave.type !== 'duty_travel') return false
    if (activeCategoryTab.value === 'detached' && leave.type !== 'detached') return false
    if (activeCategoryTab.value === 'sick_personal' && leave.type !== 'sick' && leave.type !== 'personal') return false

    // 2. กรองตามสถานะช่วงเวลา
    const statusInfo = getLeaveStatusInfo(leave, targetDate)
    if (leaveStatusFilter.value !== 'all' && statusInfo.status !== leaveStatusFilter.value) {
      return false
    }

    // 3. กรองตามคำค้นหา
    if (leaveSearch.value.trim()) {
      const q = leaveSearch.value.trim().toLowerCase()
      const matchName = leave.personnelName.toLowerCase().includes(q)
      const matchReason = leave.reason.toLowerCase().includes(q)
      const matchDiv = leave.division.toLowerCase().includes(q)
      const matchOrder = leave.orderNo ? leave.orderNo.toLowerCase().includes(q) : false
      const matchRep = leave.dutyReplacement ? leave.dutyReplacement.toLowerCase().includes(q) : false
      if (!matchName && !matchReason && !matchDiv && !matchOrder && !matchRep) return false
    }

    return true
  }).sort((a, b) => b.startDate.localeCompare(a.startDate))
})

// ข้อมูลเช็คชื่อรายบุคคล (สำหรับแท็บ "ตารางเช็คชื่อกำลังพล")
interface OfficerRosterItem {
  officer: OfficerInfo
  currentLeave: PersonnelLeaveRecord | null
  nextLeave: PersonnelLeaveRecord | null
  totalLeavesCount: number
}

const dailyOfficerRoster = computed<OfficerRosterItem[]>(() => {
  const targetDate = selectedRosterDate.value

  return availablePersonnel.value.map((officer) => {
    const officerLeaves = leavesList.value.filter((l) => l.personnelName === officer.name)
    const currentLeave = officerLeaves.find((l) => l.startDate <= targetDate && targetDate <= l.endDate) || null
    const upcomingLeaves = officerLeaves
      .filter((l) => l.startDate > targetDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    const nextLeave = upcomingLeaves[0] || null

    return {
      officer,
      currentLeave,
      nextLeave,
      totalLeavesCount: officerLeaves.length
    }
  })
})

// สถิติกำลังพลในวันที่เลือก
const dailyOfficerStats = computed(() => {
  const list = dailyOfficerRoster.value
  const total = list.length
  const onLeave = list.filter((item) => item.currentLeave !== null).length
  const available = total - onLeave
  const hasUpcoming = list.filter((item) => item.nextLeave !== null).length
  return { total, onLeave, available, hasUpcoming }
})

// เลื่อนเปลี่ยนวันที่เลือกในตาราง
const changeRosterDate = (offsetDays: number) => {
  const current = new Date(`${selectedRosterDate.value}T00:00:00`)
  current.setDate(current.getDate() + offsetDays)
  const y = current.getFullYear()
  const m = String(current.getMonth() + 1).padStart(2, '0')
  const d = String(current.getDate()).padStart(2, '0')
  selectedRosterDate.value = `${y}-${m}-${d}`

  currentYear.value = y
  currentMonth.value = current.getMonth() + 1
  currentDay.value = current.getDate()
}

// ==========================================
// 9. Modals: บันทึกวันลากำลังพล (พร้อมปุ่มระยะเวลารวดเร็ว)
// ==========================================
const isLeaveModalOpen = ref(false)
const leaveModalMode = ref<'create' | 'edit'>('create')
const selectedLeave = ref<PersonnelLeaveRecord | null>(null)

const leaveForm = ref<PersonnelLeaveRecord>({
  id: '',
  personnelName: '',
  division: 'SOD',
  type: 'vacation',
  startDate: '',
  endDate: '',
  reason: '',
  orderNo: '',
  dutyReplacement: '',
  createdAt: ''
})

const leaveFormDays = computed(() => {
  return calculateDurationDays(leaveForm.value.startDate, leaveForm.value.endDate)
})

// ปุ่มลัดคำนวณวันสิ้นสุดอัตโนมัติ (เช่น 1 วัน, 3 วัน, 5 วัน, 14 วัน, 30 วัน)
const setDurationShortcut = (days: number) => {
  if (!leaveForm.value.startDate) {
    leaveForm.value.startDate = selectedRosterDate.value
  }
  const start = new Date(`${leaveForm.value.startDate}T00:00:00`)
  start.setDate(start.getDate() + (days - 1))
  const y = start.getFullYear()
  const m = String(start.getMonth() + 1).padStart(2, '0')
  const d = String(start.getDate()).padStart(2, '0')
  leaveForm.value.endDate = `${y}-${m}-${d}`
}

// กดเพิ่มคนที่จะลาในวันนั้นๆ
const openAddLeaveForDate = (dateStr?: string, preselectedOfficer?: string, defaultType?: LeaveType) => {
  const targetDate = dateStr || selectedRosterDate.value
  selectedRosterDate.value = targetDate
  const officerName = preselectedOfficer || (availablePersonnel.value[0]?.name ?? '')
  const officerObj = availablePersonnel.value.find((p) => p.name === officerName)

  leaveForm.value = {
    id: `leave-${Date.now()}`,
    personnelName: officerName,
    division: officerObj?.division || 'SOD',
    type: defaultType || (activeCategoryTab.value !== 'officer_roster' && activeCategoryTab.value !== 'all' && activeCategoryTab.value !== 'sick_personal' ? activeCategoryTab.value : 'vacation'),
    startDate: targetDate,
    endDate: targetDate,
    reason: '',
    orderNo: '',
    dutyReplacement: '',
    createdAt: new Date().toISOString().split('T')[0]
  }
  leaveModalMode.value = 'create'
  isLeaveModalOpen.value = true
  isDayDetailModalOpen.value = false
}

const openEditLeaveModal = (leave: PersonnelLeaveRecord) => {
  selectedLeave.value = leave
  leaveForm.value = { ...leave }
  leaveModalMode.value = 'edit'
  isLeaveModalOpen.value = true
  isDayDetailModalOpen.value = false
}

const handleOfficerSelect = (name: string) => {
  leaveForm.value.personnelName = name
  const officer = availablePersonnel.value.find((p) => p.name === name)
  if (officer?.division) {
    leaveForm.value.division = officer.division
  }
}

const handleSaveLeave = () => {
  if (!leaveForm.value.personnelName) {
    alert('กรุณาเลือกกำลังพล')
    return
  }
  if (!leaveForm.value.startDate || !leaveForm.value.endDate) {
    alert('กรุณาระบุวันเริ่มต้นและสิ้นสุด')
    return
  }
  if (leaveForm.value.endDate < leaveForm.value.startDate) {
    alert('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น')
    return
  }
  if (!leaveForm.value.reason.trim()) {
    alert('กรุณาระบุเหตุผลหรือวัตถุประสงค์')
    return
  }

  if (leaveModalMode.value === 'create') {
    leavesList.value.unshift({ ...leaveForm.value })
  } else if (leaveModalMode.value === 'edit') {
    const idx = leavesList.value.findIndex((l) => l.id === leaveForm.value.id)
    if (idx !== -1) {
      leavesList.value[idx] = { ...leaveForm.value }
    }
  }

  saveLeavesToStorage()
  isLeaveModalOpen.value = false
}

const handleDeleteLeave = (id: string) => {
  if (confirm('คุณต้องการยกเลิกวันลารายการนี้ใช่หรือไม่?')) {
    leavesList.value = leavesList.value.filter((l) => l.id !== id)
    saveLeavesToStorage()
    isLeaveModalOpen.value = false
    isDayDetailModalOpen.value = false
  }
}

// ==========================================
// 10. Modals: วันหยุดราชการ (Holiday Modal)
// ==========================================
const isHolidayModalOpen = ref(false)
const selectedHoliday = ref<Holiday | null>(null)

const openViewHolidayModal = (h: Holiday) => {
  selectedHoliday.value = h
  isHolidayModalOpen.value = true
}

const getOfficerInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return parts[parts.length - 2][0] + parts[parts.length - 1][0]
  }
  return name.slice(0, 2)
}
</script>

<template>
  <div class="google-calendar-app">
    <!-- แถบด้านบนแบบ Google Calendar (Top Navigation Bar) -->
    <header class="gcal-topbar">
      <div class="topbar-left">
        <!-- ปุ่มเปิด/ปิด Sidebar (Hamburger) -->
        <button
          class="icon-btn hamburger-btn"
          title="แถบเมนูหลัก"
          aria-label="สลับแถบด้านข้าง"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>

        <!-- โลโก้ปฏิทิน Google Style -->
        <div class="gcal-brand">
          <div class="gcal-logo-icon">
            <span class="logo-month">ต.ค.</span>
            <span class="logo-day">{{ currentDay }}</span>
          </div>
          <div class="brand-text">
            <h2>ปฏิทินวันหยุด / วันลา / วันจำหน่าย</h2>
            <span class="brand-sub">{{ liveTimeString }}</span>
          </div>
        </div>

        <!-- ปุ่มวันนี้ & ต.ค. 2569 -->
        <button class="gcal-today-btn" @click="goToToday">วันนี้</button>
        <button class="demo-period-btn" title="ไปที่เดือนตุลาคม 2569" @click="jumpToDemoMonth">
          ต.ค. 2569
        </button>

        <!-- ลูกศรเลื่อนเดือน -->
        <div class="nav-arrows">
          <button class="icon-btn arrow-btn" title="ก่อนหน้า" @click="prevPeriod">‹</button>
          <button class="icon-btn arrow-btn" title="ถัดไป" @click="nextPeriod">›</button>
        </div>

        <h3 class="period-title-text">{{ periodTitle }}</h3>
      </div>

      <div class="topbar-right">
        <!-- ช่องค้นหาวันหยุด -->
        <div class="gcal-search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาวันหยุด..."
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
        </div>

        <!-- ตัวเลือกเปิด/ปิดการแสดงวันลาบนปฏิทิน -->
        <button
          :class="['calendar-view-toggle-btn', { active: showLeavesOnCalendar }]"
          title="เปิด/ปิดการแสดงรายการคนลาบนช่องปฏิทิน"
          @click="showLeavesOnCalendar = !showLeavesOnCalendar"
        >
          <span>{{ showLeavesOnCalendar ? '👁️ กำลังแสดงวันลาบนปฏิทิน' : '👁️ ซ่อนวันลา (ดูเฉพาะวันหยุด)' }}</span>
        </button>

        <!-- ปุ่มด่วน: เพิ่มคนลาในวันที่เลือก -->
        <button class="btn-quick-add-leave" @click="openAddLeaveForDate()">
          <span>＋</span> เพิ่มคนลาวันนั้นๆ
        </button>
      </div>
    </header>

    <!-- พื้นที่ทำงานหลัก (Sidebar + Main Calendar View) -->
    <div class="gcal-body-layout">
      <!-- แถบด้านข้างซ้าย (Left Sidebar) -->
      <aside v-if="isSidebarOpen" class="gcal-sidebar">
        <!-- ปุ่มสร้างด่วนใน Sidebar -->
        <button class="sidebar-big-create-btn" @click="openAddLeaveForDate()">
          <span class="big-plus">＋</span>
          <span>เพิ่มคนลาในวันที่เลือก</span>
        </button>

        <!-- มินิปฏิทิน (Mini Month Picker) -->
        <div class="mini-calendar-wrap">
          <div class="mini-header">
            <span class="mini-month-label">
              {{ THAI_MONTH_NAMES[miniMonth - 1] }} {{ miniYear + 543 }}
            </span>
            <div class="mini-nav">
              <button class="mini-nav-btn" @click="miniMonth === 1 ? ((miniMonth = 12), miniYear--) : miniMonth--">‹</button>
              <button class="mini-nav-btn" @click="miniMonth === 12 ? ((miniMonth = 1), miniYear++) : miniMonth++">›</button>
            </div>
          </div>

          <div class="mini-grid">
            <div v-for="dow in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']" :key="dow" class="mini-dow">
              {{ dow }}
            </div>
            <button
              v-for="cell in miniCalendarCells"
              :key="cell.date"
              :class="[
                'mini-day-cell',
                {
                  'other-month': !cell.isCurrentMonth,
                  'has-event': cell.hasEvent,
                  selected: cell.isSelected
                }
              ]"
              @click="selectDateFromMini(cell)"
            >
              {{ cell.day }}
            </button>
          </div>
        </div>

        <!-- ตัวกรองปฏิทินวันหยุดราชการ -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <h4>ปฏิทินวันหยุดราชการ</h4>
          </div>
          <div class="category-checkbox-list">
            <label
              v-for="(cfg, catKey) in CATEGORY_CONFIG"
              :key="catKey"
              class="category-checkbox-item"
            >
              <input
                v-model="categoryFilters[catKey as HolidayCategory]"
                type="checkbox"
                class="gcal-checkbox"
                :style="{ accentColor: cfg.color }"
              />
              <span class="cat-color-badge" :style="{ backgroundColor: cfg.color }"></span>
              <span class="cat-label-text">{{ cfg.label }}</span>
            </label>
          </div>
        </div>

        <!-- สัญลักษณ์ประเภทการลา (Leave Legend) -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <h4>สัญลักษณ์ประเภทการลา</h4>
          </div>
          <div class="leave-legend-list">
            <div v-for="(cfg, lKey) in LEAVE_TYPE_CONFIG" :key="lKey" class="leave-legend-item">
              <span class="legend-color-tag" :style="{ backgroundColor: cfg.bgLight, color: cfg.color, borderColor: cfg.border }">
                {{ cfg.icon }} {{ cfg.shortLabel }}
              </span>
            </div>
          </div>
        </div>

        <!-- คำแนะนำการใช้งาน -->
        <div class="sidebar-section satops-guide-box">
          <div class="guide-title">💡 คำแนะนำการใช้งาน</div>
          <p class="guide-text">
            คลิกที่ช่องวันที่ใดๆ ในปฏิทิน เพื่อเปิดดูรายละเอียดวันหยุดและรายชื่อคนลาทั้งหมดในวันนั้น พร้อมกดเพิ่มคนลาได้ทันที
          </p>
        </div>
      </aside>

      <!-- ตารางปฏิทินหลัก (แสดงข้อมูลชัดเจน สไตล์ Google Calendar) -->
      <main class="gcal-main-content">
        <div class="month-view-container">
          <!-- แถวชื่อวันในสัปดาห์ -->
          <div class="month-header-row">
            <div
              v-for="(dayName, idx) in ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']"
              :key="dayName"
              :class="['month-dow-header', { 'is-weekend': idx === 0 || idx === 6 }]"
            >
              <span class="dow-full">{{ dayName }}</span>
              <span class="dow-short">{{ THAI_DAY_SHORT[idx] }}</span>
            </div>
          </div>

          <!-- ตารางวัน 7 คอลัมน์ (แสดงชิปรายการลาและวันหยุดแบบอ่านง่าย ไม่ซ้อนกัน) -->
          <div class="month-cells-grid">
            <div
              v-for="cell in monthGridCells"
              :key="cell.date"
              :class="[
                'gcal-month-cell',
                {
                  'not-current-month': !cell.isCurrentMonth,
                  'is-today': cell.isToday,
                  'is-weekend': cell.isWeekend,
                  'is-selected-date': cell.isSelectedRosterDate
                }
              ]"
              @click="handleSelectCalendarDay(cell)"
            >
              <div class="cell-top-bar">
                <span :class="['date-number-bubble', { 'today-bubble': cell.isToday, 'selected-bubble': cell.isSelectedRosterDate }]">
                  {{ cell.dayNumber }}
                </span>
                <span v-if="cell.leaves.length > 0 || cell.holidays.length > 0" class="cell-event-count">
                  {{ cell.holidays.length + (showLeavesOnCalendar ? cell.leaves.length : 0) }} รายการ
                </span>
              </div>

              <!-- รายการ Event ในช่องวัน (แสดงสูงสุด 2 รายการ และมีปุ่มดูเพิ่มเติมถ้ามีมากกว่านั้น) -->
              <div class="cell-events-list">
                <!-- 1. วันหยุดราชการ -->
                <div
                  v-for="h in cell.holidays.slice(0, 1)"
                  :key="h.id"
                  class="gcal-event-pill holiday-pill"
                  :style="{
                    backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                    borderLeft: `3px solid ${CATEGORY_CONFIG[h.category].color}`,
                    color: CATEGORY_CONFIG[h.category].color
                  }"
                  :title="`${h.name} (${CATEGORY_CONFIG[h.category].label})`"
                  @click.stop="openViewHolidayModal(h)"
                >
                  <span class="pill-emoji">{{ h.icon || '🏛️' }}</span>
                  <span class="pill-name">{{ h.name }}</span>
                </div>

                <!-- 2. แสดงรายการคนลาแบบแยกชิปชัดเจน (Google Calendar Style) -->
                <template v-if="showLeavesOnCalendar">
                  <!-- แสดง 1-2 คนแรกเป็นชิปพร้อมชื่อและสถานะอย่างชัดเจน -->
                  <div
                    v-for="leave in cell.leaves.slice(0, cell.holidays.length > 0 ? 1 : 2)"
                    :key="leave.id"
                    class="gcal-event-pill leave-pill"
                    :style="{
                      backgroundColor: LEAVE_TYPE_CONFIG[leave.type].bgLight,
                      borderLeft: `3px solid ${LEAVE_TYPE_CONFIG[leave.type].color}`,
                      color: LEAVE_TYPE_CONFIG[leave.type].color
                    }"
                    :title="`${leave.personnelName} (${LEAVE_TYPE_CONFIG[leave.type].label}): ${leave.reason}`"
                    @click.stop="openEditLeaveModal(leave)"
                  >
                    <span class="pill-emoji">{{ LEAVE_TYPE_CONFIG[leave.type].icon }}</span>
                    <span class="pill-name">
                      <b>{{ getShortName(leave.personnelName) }}</b>
                      <small class="leave-type-tag">({{ LEAVE_TYPE_CONFIG[leave.type].shortLabel }})</small>
                    </span>
                  </div>

                  <!-- หากมีรายการมากกว่าที่แสดง ให้ปุ่มกดดูรายการเพิ่มเติม -->
                  <div
                    v-if="cell.leaves.length > (cell.holidays.length > 0 ? 1 : 2)"
                    class="gcal-event-pill more-pill"
                    title="คลิกเพื่อดูรายละเอียดรายการทั้งหมดในวันนั้น"
                    @click.stop="handleSelectCalendarDay(cell)"
                  >
                    <span class="pill-name">
                      +{{ cell.leaves.length - (cell.holidays.length > 0 ? 1 : 2) }} เพิ่มเติม...
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- ========================================================
         ส่วนจัดการวันลาแยกตามหมวดหมู่ (Categorized Leave Management)
         ไม่ซ้อนกัน ชัดเจน มีแท็บแยกประเภท และตารางเช็คชื่อกำลังพล
         ======================================================== -->
    <section id="personnel-roster-table-section" class="roster-table-section">
      <!-- ส่วนหัวของตาราง พร้อมตัวเลือกวันที่ -->
      <div class="roster-header-bar">
        <div class="roster-title-group">
          <div class="title-row">
            <h2>การจัดการวันหยุด / วันลา / วันจำหน่าย</h2>
            <span class="integration-pill">เชื่อมโยงหน้าบุคลากร (รอเชื่อม API/Store)</span>
          </div>
          <p class="roster-subtitle">
            แยกหมวดหมู่ชัดเจน รองรับการลาระยะยาว ค้นหาและตรวจสอบสถานะกำลังพลได้ทันที
          </p>
        </div>

        <!-- ตัวเลือกและเลื่อนวันที่อ้างอิง -->
        <div class="date-navigator-box">
          <div class="date-nav-controls">
            <button class="btn-arrow" title="วันก่อนหน้า" @click="changeRosterDate(-1)">‹</button>
            <div class="current-date-badge">
              <span class="cal-mini-icon">📅</span>
              <strong>{{ formatFullThaiDate(selectedRosterDate) }}</strong>
            </div>
            <button class="btn-arrow" title="วันถัดไป" @click="changeRosterDate(1)">›</button>
          </div>
          <button class="btn-roster-add-main" @click="openAddLeaveForDate()">
            <span>＋</span> เพิ่มคนลาในวันที่นี้
          </button>
        </div>
      </div>

      <!-- แถบสถิติกำลังพลประจำวันที่เลือก -->
      <div class="roster-stats-strip">
        <div class="stat-bubble total">
          <span class="stat-label">กำลังพลทั้งหมด:</span>
          <strong>{{ dailyOfficerStats.total }} นาย</strong>
        </div>
        <div class="stat-bubble available">
          <span class="stat-dot green"></span>
          <span class="stat-label">พร้อมปฏิบัติงานวันนี้:</span>
          <strong>{{ dailyOfficerStats.available }} นาย</strong>
        </div>
        <div class="stat-bubble on-leave">
          <span class="stat-dot red"></span>
          <span class="stat-label">ไม่อยู่ / ลาในวันนี้:</span>
          <strong>{{ dailyOfficerStats.onLeave }} นาย</strong>
        </div>
        <div class="stat-bubble future">
          <span class="stat-dot blue"></span>
          <span class="stat-label">มีแผนลาล่วงหน้า:</span>
          <strong>{{ dailyOfficerStats.hasUpcoming }} นาย</strong>
        </div>
      </div>

      <!-- แถบเลือกหมวดหมู่ (Category Tabs) - แยกเป็นหมวดหมู่ตามที่ผู้ใช้ร้องขอ -->
      <div class="category-tabs-container">
        <div class="category-tabs-row">
          <button
            :class="['category-tab-btn', { active: activeCategoryTab === 'all' }]"
            @click="activeCategoryTab = 'all'"
          >
            <span class="tab-icon">📋</span>
            <span class="tab-text">รายการลาทั้งหมด</span>
            <span class="tab-count-badge">{{ categoryCounts.all }}</span>
          </button>

          <button
            :class="['category-tab-btn', { active: activeCategoryTab === 'vacation' }]"
            @click="activeCategoryTab = 'vacation'"
          >
            <span class="tab-icon">🏖️</span>
            <span class="tab-text">วันลาพักผ่อน</span>
            <span class="tab-count-badge teal">{{ categoryCounts.vacation }}</span>
          </button>

          <button
            :class="['category-tab-btn', { active: activeCategoryTab === 'duty_travel' }]"
            @click="activeCategoryTab = 'duty_travel'"
          >
            <span class="tab-icon">🛫</span>
            <span class="tab-text">วันไปราชการ</span>
            <span class="tab-count-badge blue">{{ categoryCounts.duty_travel }}</span>
          </button>

          <button
            :class="['category-tab-btn', { active: activeCategoryTab === 'detached' }]"
            @click="activeCategoryTab = 'detached'"
          >
            <span class="tab-icon">📦</span>
            <span class="tab-text">วันจำหน่าย (ช่วยราชการ)</span>
            <span class="tab-count-badge purple">{{ categoryCounts.detached }}</span>
          </button>

          <button
            :class="['category-tab-btn', { active: activeCategoryTab === 'sick_personal' }]"
            @click="activeCategoryTab = 'sick_personal'"
          >
            <span class="tab-icon">🏥</span>
            <span class="tab-text">วันลาป่วย / ลากิจ</span>
            <span class="tab-count-badge amber">{{ categoryCounts.sick_personal }}</span>
          </button>

          <button
            :class="['category-tab-btn roster-tab', { active: activeCategoryTab === 'officer_roster' }]"
            @click="activeCategoryTab = 'officer_roster'"
          >
            <span class="tab-icon">👥</span>
            <span class="tab-text">สถานะกำลังพลรายบุคคล (เช็คชื่อ)</span>
            <span class="tab-count-badge dark">{{ categoryCounts.officer_roster }}</span>
          </button>
        </div>

        <!-- เครื่องมือค้นหาและตัวกรองสถานะ -->
        <div class="category-subbar">
          <!-- กรณีเปิดแท็บหมวดหมู่การลา -->
          <div v-if="activeCategoryTab !== 'officer_roster'" class="status-subfilters">
            <span class="subfilter-label">สถานะช่วงเวลา:</span>
            <button
              :class="['subfilter-btn', { active: leaveStatusFilter === 'all' }]"
              @click="leaveStatusFilter = 'all'"
            >
              ทั้งหมด
            </button>
            <button
              :class="['subfilter-btn', { active: leaveStatusFilter === 'active' }]"
              @click="leaveStatusFilter = 'active'"
            >
              🔴 กำลังลาอยู่ในช่วงนี้
            </button>
            <button
              :class="['subfilter-btn', { active: leaveStatusFilter === 'upcoming' }]"
              @click="leaveStatusFilter = 'upcoming'"
            >
              🔵 มีกำหนดล่วงหน้า
            </button>
            <button
              :class="['subfilter-btn', { active: leaveStatusFilter === 'past' }]"
              @click="leaveStatusFilter = 'past'"
            >
              ⚪ สิ้นสุดแล้ว
            </button>
          </div>

          <div v-else class="status-subfilters">
            <span class="subfilter-label">ข้อมูลกำลังพลประจำวันที่:</span>
            <strong>{{ formatShortThaiDate(selectedRosterDate) }}</strong>
          </div>

          <div class="table-search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="leaveSearch"
              type="text"
              placeholder="ค้นหาชื่อ, เหตุผล, คำสั่ง..."
            />
          </div>
        </div>
      </div>

      <!-- ========================================================
           VIEW 1: ตารางรายการลาตามหมวดหมู่ (Leave Records Table)
           คอลัมน์กว้าง ชัดเจน ข้อมูลไม่ซ้อนกัน
           ======================================================== -->
      <div v-if="activeCategoryTab !== 'officer_roster'" class="clean-table-container">
        <table class="roster-data-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ลำดับ</th>
              <th style="width: 250px;">กำลังพล</th>
              <th style="width: 140px;">หมวดหมู่ / ประเภท</th>
              <th style="width: 190px;">ช่วงวันที่</th>
              <th style="width: 110px; text-align: center;">ระยะเวลา</th>
              <th style="width: 160px;">สถานะช่วงเวลา</th>
              <th>วัตถุประสงค์ / เหตุผลความจำเป็น</th>
              <th style="width: 200px;">คำสั่ง / ผู้ปฏิบัติแทน</th>
              <th style="width: 130px; text-align: center;">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(leave, index) in filteredLeaveRecords"
              :key="leave.id"
              class="roster-row"
            >
              <td class="text-center text-muted">{{ index + 1 }}</td>

              <!-- กำลังพล -->
              <td class="officer-name-cell">
                <div class="officer-info-wrap">
                  <span class="officer-avatar-sm">{{ getOfficerInitials(leave.personnelName) }}</span>
                  <div class="name-block">
                    <strong class="name-text">{{ leave.personnelName }}</strong>
                    <span class="division-badge">{{ leave.division }}</span>
                  </div>
                </div>
              </td>

              <!-- หมวดหมู่ / ประเภท -->
              <td>
                <span
                  class="status-pill-badge"
                  :style="{
                    backgroundColor: LEAVE_TYPE_CONFIG[leave.type].bgLight,
                    color: LEAVE_TYPE_CONFIG[leave.type].color,
                    border: `1px solid ${LEAVE_TYPE_CONFIG[leave.type].border}`
                  }"
                >
                  {{ LEAVE_TYPE_CONFIG[leave.type].icon }} {{ LEAVE_TYPE_CONFIG[leave.type].label }}
                </span>
              </td>

              <!-- ช่วงวันที่ -->
              <td class="date-range-cell">
                <div class="date-pair">
                  <span class="date-item"><b>เริ่ม:</b> {{ formatShortThaiDate(leave.startDate) }}</span>
                  <span class="date-item"><b>ถึง:</b> {{ formatShortThaiDate(leave.endDate) }}</span>
                </div>
              </td>

              <!-- ระยะเวลา -->
              <td class="text-center">
                <span class="duration-badge" :class="{ 'long-term': calculateDurationDays(leave.startDate, leave.endDate) >= 5 }">
                  {{ calculateDurationDays(leave.startDate, leave.endDate) }} วัน
                </span>
              </td>

              <!-- สถานะช่วงเวลา -->
              <td>
                <span
                  class="leave-timing-pill"
                  :style="{
                    backgroundColor: getLeaveStatusInfo(leave, selectedRosterDate).bg,
                    color: getLeaveStatusInfo(leave, selectedRosterDate).color
                  }"
                >
                  {{ getLeaveStatusInfo(leave, selectedRosterDate).text }}
                </span>
              </td>

              <!-- วัตถุประสงค์ / เหตุผลความจำเป็น -->
              <td class="reason-cell">
                <div class="reason-text-full">
                  {{ leave.reason }}
                </div>
              </td>

              <!-- คำสั่ง / ผู้ปฏิบัติแทน -->
              <td class="order-replacement-cell">
                <div v-if="leave.orderNo" class="order-chip" title="เลขที่คำสั่ง/อนุมัติ">
                  📄 {{ leave.orderNo }}
                </div>
                <div v-if="leave.dutyReplacement" class="replacement-chip" title="ผู้ปฏิบัติหน้าที่แทน">
                  👤 แทน: {{ getShortName(leave.dutyReplacement) }}
                </div>
                <span v-if="!leave.orderNo && !leave.dutyReplacement" class="text-dash">—</span>
              </td>

              <!-- ปุ่มดำเนินการ -->
              <td class="action-cell">
                <div class="action-btn-group">
                  <button
                    class="btn-table-action edit"
                    title="แก้ไขรายการนี้"
                    @click="openEditLeaveModal(leave)"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    class="btn-table-action delete"
                    title="ยกเลิก/ลบรายการนี้"
                    @click="handleDeleteLeave(leave.id)"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <!-- กรณีไม่พบข้อมูลในหมวดหมู่ที่เลือก -->
            <tr v-if="filteredLeaveRecords.length === 0">
              <td colspan="9" class="empty-table-cell">
                <div class="empty-state-box">
                  <span class="empty-icon">📭</span>
                  <p class="empty-title">ไม่พบรายการในหมวดหมู่นี้</p>
                  <p class="empty-sub">คุณสามารถกดปุ่มเพื่อเพิ่มรายการลาใหม่ในหมวดหมู่นี้ได้ทันที</p>
                  <button class="btn-primary-sm" @click="openAddLeaveForDate()">
                    ＋ บันทึกวันลาใหม่
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ========================================================
           VIEW 2: ตารางสถานะกำลังพลรายบุคคล (Officer Attendance Roster)
           แสดงรายชื่อกำลังพลทั้งหมด พร้อมสถานะและปุ่มกดตั้งวันลาโดยตรง
           ======================================================== -->
      <div v-else class="clean-table-container">
        <table class="roster-data-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ลำดับ</th>
              <th style="width: 250px;">ยศ - ชื่อ - สกุล</th>
              <th style="width: 100px;">สังกัด</th>
              <th style="width: 140px;">ตำแหน่ง / สิทธิ์เวร</th>
              <th style="width: 240px;">สถานะในวันที่เลือก ({{ formatShortThaiDate(selectedRosterDate) }})</th>
              <th>รายละเอียด / กำหนดการถัดไป</th>
              <th style="width: 150px; text-align: center;">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in dailyOfficerRoster"
              :key="item.officer.name"
              :class="['roster-row', { 'row-on-leave': item.currentLeave !== null }]"
            >
              <td class="text-center text-muted">{{ index + 1 }}</td>

              <!-- ชื่อกำลังพล -->
              <td class="officer-name-cell">
                <div class="officer-info-wrap">
                  <span class="officer-avatar-sm">{{ getOfficerInitials(item.officer.name) }}</span>
                  <strong class="name-text">{{ item.officer.name }}</strong>
                </div>
              </td>

              <!-- สังกัด -->
              <td>
                <span class="division-badge">{{ item.officer.division }}</span>
              </td>

              <!-- สิทธิ์เวร / ตำแหน่ง -->
              <td>
                <span class="role-pill">{{ item.officer.roles }}</span>
              </td>

              <!-- สถานะในวันที่เลือก -->
              <td>
                <!-- หากกำลังลาในวันนั้น -->
                <div v-if="item.currentLeave">
                  <span
                    class="status-pill-badge"
                    :style="{
                      backgroundColor: LEAVE_TYPE_CONFIG[item.currentLeave.type].bgLight,
                      color: LEAVE_TYPE_CONFIG[item.currentLeave.type].color,
                      border: `1px solid ${LEAVE_TYPE_CONFIG[item.currentLeave.type].border}`
                    }"
                  >
                    {{ LEAVE_TYPE_CONFIG[item.currentLeave.type].icon }} {{ LEAVE_TYPE_CONFIG[item.currentLeave.type].label }}
                  </span>
                  <div class="leave-date-span">
                    {{ formatShortThaiDate(item.currentLeave.startDate) }} - {{ formatShortThaiDate(item.currentLeave.endDate) }}
                    ({{ calculateDurationDays(item.currentLeave.startDate, item.currentLeave.endDate) }} วัน)
                  </div>
                </div>

                <!-- หากพร้อมปฏิบัติงาน -->
                <div v-else class="status-available-badge">
                  <span class="available-dot"></span>
                  <span>🟢 พร้อมปฏิบัติงาน</span>
                </div>
              </td>

              <!-- รายละเอียด / กำหนดการถัดไป -->
              <td>
                <div v-if="item.currentLeave" class="reason-note-box">
                  <span class="reason-title"><b>เหตุผล:</b> {{ item.currentLeave.reason }}</span>
                  <small v-if="item.currentLeave.orderNo" class="order-sub">📄 {{ item.currentLeave.orderNo }}</small>
                </div>
                <div v-else-if="item.nextLeave" class="upcoming-note-box">
                  <span class="upcoming-badge">
                    คิวลาถัดไป: {{ formatShortThaiDate(item.nextLeave.startDate) }}
                    ({{ LEAVE_TYPE_CONFIG[item.nextLeave.type].shortLabel }} {{ calculateDurationDays(item.nextLeave.startDate, item.nextLeave.endDate) }} วัน)
                  </span>
                </div>
                <span v-else class="text-muted text-sm">ไม่มีคิวลาที่วางแผนไว้</span>
              </td>

              <!-- การดำเนินการ -->
              <td class="action-cell">
                <!-- หากกำลังลา: แก้ไข -->
                <div v-if="item.currentLeave" class="action-btn-group">
                  <button
                    class="btn-table-action edit"
                    title="แก้ไขการลาของคนนี้"
                    @click="openEditLeaveModal(item.currentLeave)"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    class="btn-table-action delete"
                    title="ยกเลิกการลา"
                    @click="handleDeleteLeave(item.currentLeave.id)"
                  >
                    🗑️
                  </button>
                </div>

                <!-- หากพร้อมปฏิบัติงาน: เพิ่มคนนี้ลาในวันนั้นทันที -->
                <div v-else>
                  <button
                    class="btn-table-add-leave"
                    title="กำหนดวันลาให้นายนี้ในวันที่เลือก"
                    @click="openAddLeaveForDate(selectedRosterDate, item.officer.name)"
                  >
                    ＋ ตั้งวันลา
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ========================================================
         MODAL 1: ป็อปอัปแสดงรายละเอียดประจำวัน (Day Details Modal)
         เปิดเมื่อคลิกช่องวันที่ในปฏิทิน เพื่อดูวันหยุดและคนลาทั้งหมดในวันนั้น
         ======================================================== -->
    <div
      v-if="isDayDetailModalOpen && activeDayDetail"
      class="gcal-modal-backdrop"
      @click.self="isDayDetailModalOpen = false"
    >
      <div class="gcal-modal-card day-detail-modal-card">
        <div class="day-modal-header">
          <div class="day-modal-title">
            <span class="day-big-num">{{ activeDayDetail.dayNumber }}</span>
            <div>
              <h3>{{ formatFullThaiDate(activeDayDetail.date) }}</h3>
              <span class="day-sub-info">
                {{ activeDayDetail.isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันทำการปกติ' }} ·
                {{ activeDayDetail.holidays.length }} วันหยุดราชการ ·
                กำลังพลลา {{ activeDayDetail.leaves.length }} นาย
              </span>
            </div>
          </div>
          <button class="icon-action-btn close" @click="isDayDetailModalOpen = false">✕</button>
        </div>

        <div class="day-modal-body">
          <!-- 1. วันหยุดราชการในวันนี้ -->
          <div v-if="activeDayDetail.holidays.length > 0" class="day-section-block">
            <h4 class="day-block-heading">🏛️ วันหยุดราชการ / วันสำคัญ</h4>
            <div class="day-holidays-list">
              <div
                v-for="h in activeDayDetail.holidays"
                :key="h.id"
                class="day-holiday-card"
                :style="{
                  backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                  borderLeft: `4px solid ${CATEGORY_CONFIG[h.category].color}`
                }"
              >
                <div class="holiday-card-title">
                  <span class="h-icon">{{ h.icon || '🏛️' }}</span>
                  <div>
                    <strong>{{ h.name }}</strong>
                    <span class="h-cat-label" :style="{ color: CATEGORY_CONFIG[h.category].color }">
                      ({{ CATEGORY_CONFIG[h.category].label }})
                    </span>
                  </div>
                </div>
                <p v-if="h.description" class="holiday-card-desc">{{ h.description }}</p>
              </div>
            </div>
          </div>

          <!-- 2. รายการกำลังพลที่ลา / ไปราชการ / จำหน่าย ในวันนี้ -->
          <div class="day-section-block">
            <div class="day-block-header-flex">
              <h4 class="day-block-heading">👥 กำลังพลที่ลา / ไปราชการ / จำหน่าย ในวันนี้</h4>
              <span class="badge-count">{{ activeDayDetail.leaves.length }} นาย</span>
            </div>

            <div v-if="activeDayDetail.leaves.length > 0" class="day-leaves-list">
              <div
                v-for="leave in activeDayDetail.leaves"
                :key="leave.id"
                class="day-leave-card"
                :style="{ borderLeft: `4px solid ${LEAVE_TYPE_CONFIG[leave.type].color}` }"
              >
                <div class="day-leave-top">
                  <div class="officer-leave-header">
                    <span class="officer-avatar-sm">{{ getOfficerInitials(leave.personnelName) }}</span>
                    <div>
                      <strong class="leave-officer-name">{{ leave.personnelName }}</strong>
                      <span class="leave-div-tag">{{ leave.division }}</span>
                    </div>
                  </div>
                  <div class="leave-type-badge-group">
                    <span
                      class="status-pill-badge"
                      :style="{
                        backgroundColor: LEAVE_TYPE_CONFIG[leave.type].bgLight,
                        color: LEAVE_TYPE_CONFIG[leave.type].color,
                        border: `1px solid ${LEAVE_TYPE_CONFIG[leave.type].border}`
                      }"
                    >
                      {{ LEAVE_TYPE_CONFIG[leave.type].icon }} {{ LEAVE_TYPE_CONFIG[leave.type].label }}
                    </span>
                  </div>
                </div>

                <div class="day-leave-details">
                  <div class="leave-detail-row">
                    <span class="label">📅 ระยะเวลา:</span>
                    <span>{{ formatShortThaiDate(leave.startDate) }} ถึง {{ formatShortThaiDate(leave.endDate) }}</span>
                    <strong class="days-badge">({{ calculateDurationDays(leave.startDate, leave.endDate) }} วัน)</strong>
                  </div>
                  <div class="leave-detail-row">
                    <span class="label">📝 วัตถุประสงค์:</span>
                    <span>{{ leave.reason }}</span>
                  </div>
                  <div v-if="leave.orderNo" class="leave-detail-row">
                    <span class="label">📄 คำสั่งอนุมัติ:</span>
                    <span>{{ leave.orderNo }}</span>
                  </div>
                  <div v-if="leave.dutyReplacement" class="leave-detail-row">
                    <span class="label">👤 ผู้ปฏิบัติหน้าที่แทน:</span>
                    <span>{{ leave.dutyReplacement }}</span>
                  </div>
                </div>

                <div class="day-leave-actions">
                  <button class="btn-table-action edit" @click="openEditLeaveModal(leave)">
                    ✏️ แก้ไขข้อมูล
                  </button>
                  <button class="btn-table-action delete" @click="handleDeleteLeave(leave.id)">
                    🗑️ ยกเลิก
                  </button>
                </div>
              </div>
            </div>

            <!-- หากไม่มีใครลาในวันนี้ -->
            <div v-else class="day-empty-leaves">
              <span class="empty-icon-green">🟢</span>
              <p>ไม่มีกำลังพลลาในวันนี้ กำลังพลทุกคนพร้อมปฏิบัติหน้าที่เต็มอัตรา</p>
            </div>
          </div>
        </div>

        <div class="day-modal-footer">
          <button class="btn-secondary" @click="scrollToRosterTable">
            📋 ไปที่ตารางด้านล่าง
          </button>
          <button
            class="btn-primary"
            @click="openAddLeaveForDate(activeDayDetail.date)"
          >
            <span>＋</span> เพิ่มคนลาในวันนี้
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================
         MODAL 2: บันทึก / แก้ไขสถานะการลากำลังพล
         ======================================================== -->
    <div
      v-if="isLeaveModalOpen"
      class="gcal-modal-backdrop"
      @click.self="isLeaveModalOpen = false"
    >
      <div class="gcal-modal-card leave-modal-card">
        <div
          class="modal-color-strip"
          :style="{ backgroundColor: LEAVE_TYPE_CONFIG[leaveForm.type].color }"
        ></div>

        <div class="modal-form-mode">
          <div class="form-modal-header">
            <div class="leave-header-title">
              <span class="leave-type-icon-lg">{{ LEAVE_TYPE_CONFIG[leaveForm.type].icon }}</span>
              <div>
                <h3>{{ leaveModalMode === 'create' ? 'บันทึกคนลา / จำหน่าย / ไปราชการ' : 'แก้ไขสถานะกำลังพล' }}</h3>
                <span class="header-dev-note">เชื่อมโยงหน้าบุคลากร (รอเชื่อม API/Store)</span>
              </div>
            </div>
            <button class="icon-action-btn close" @click="isLeaveModalOpen = false">✕</button>
          </div>

          <form @submit.prevent="handleSaveLeave" class="gcal-form">
            <!-- เลือกกำลังพล & ประเภทการลา -->
            <div class="form-row-2">
              <div class="form-group">
                <label>เลือกกำลังพล *</label>
                <select
                  :value="leaveForm.personnelName"
                  class="form-select"
                  required
                  @change="handleOfficerSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option disabled value="">-- เลือกกำลังพล --</option>
                  <option
                    v-for="person in availablePersonnel"
                    :key="person.name"
                    :value="person.name"
                  >
                    {{ person.name }} ({{ person.division }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>ประเภทสถานะ *</label>
                <select v-model="leaveForm.type" class="form-select" required>
                  <option value="vacation">🏖️ วันลาพักผ่อน</option>
                  <option value="duty_travel">🛫 วันไปราชการ</option>
                  <option value="detached">📦 วันจำหน่าย (ช่วยราชการ/รักษาตัว)</option>
                  <option value="sick">🏥 วันลาป่วย</option>
                  <option value="personal">📋 วันลากิจ</option>
                </select>
              </div>
            </div>

            <!-- วันที่เริ่มต้น และ วันที่สิ้นสุด (รองรับระยะยาว) -->
            <div class="form-row-2">
              <div class="form-group">
                <label>วันที่เริ่มต้น *</label>
                <input v-model="leaveForm.startDate" type="date" class="form-input" required />
              </div>
              <div class="form-group">
                <label>วันที่สิ้นสุด *</label>
                <input v-model="leaveForm.endDate" type="date" class="form-input" required />
              </div>
            </div>

            <!-- ปุ่มลัดตั้งระยะเวลารวดเร็ว (1 วัน, 3 วัน, 5 วัน, 14 วัน, 1 เดือน) -->
            <div class="quick-duration-strip">
              <span class="quick-label">⚡ กำหนดระยะเวลารวดเร็ว:</span>
              <div class="quick-buttons">
                <button type="button" class="btn-quick-day" @click="setDurationShortcut(1)">1 วัน</button>
                <button type="button" class="btn-quick-day" @click="setDurationShortcut(3)">3 วัน</button>
                <button type="button" class="btn-quick-day" @click="setDurationShortcut(5)">5 วัน</button>
                <button type="button" class="btn-quick-day" @click="setDurationShortcut(7)">1 สัปดาห์</button>
                <button type="button" class="btn-quick-day" @click="setDurationShortcut(14)">2 สัปดาห์</button>
                <button type="button" class="btn-quick-day highlight" @click="setDurationShortcut(30)">1 เดือน (30 วัน)</button>
              </div>
            </div>

            <!-- คำนวณจำนวนวัน -->
            <div v-if="leaveForm.startDate && leaveForm.endDate" class="duration-calc-alert">
              <span>⏱️ รวมระยะเวลา: <b>{{ leaveFormDays }} วัน</b></span>
              <span v-if="leaveFormDays >= 5" class="long-term-tag">⚠️ เป็นการลาระยะยาว (มากกว่า 5 วัน)</span>
            </div>

            <!-- เหตุผล -->
            <div class="form-group">
              <label>วัตถุประสงค์ / เหตุผลความจำเป็น *</label>
              <textarea
                v-model="leaveForm.reason"
                rows="2"
                class="form-textarea"
                placeholder="เช่น ลาพักผ่อนประจำปี, ตรวจสถานีรับสัญญาณภาคพื้นดิน จ.สงขลา, ช่วยราชการ ศปก.ทบ."
                required
              ></textarea>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>หนังสือคำสั่ง / เลขที่อนุมัติ (ถ้ามี)</label>
                <input
                  v-model="leaveForm.orderNo"
                  type="text"
                  class="form-input"
                  placeholder="เช่น คำสั่ง ทบ. ที่ 142/69 หรือ ใบรับรองแพทย์"
                />
              </div>

              <div class="form-group">
                <label>ผู้ปฏิบัติหน้าที่แทน</label>
                <select v-model="leaveForm.dutyReplacement" class="form-select">
                  <option value="">-- ไม่ระบุ --</option>
                  <option
                    v-for="person in availablePersonnel.filter((p) => p.name !== leaveForm.personnelName)"
                    :key="`rep-${person.name}`"
                    :value="person.name"
                  >
                    {{ person.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-modal-footer">
              <button
                v-if="leaveModalMode === 'edit'"
                type="button"
                class="btn-delete"
                @click="handleDeleteLeave(leaveForm.id)"
              >
                ลบรายการนี้
              </button>
              <button type="button" class="btn-secondary" @click="isLeaveModalOpen = false">
                ยกเลิก
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="!leaveForm.personnelName || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()"
              >
                {{ leaveModalMode === 'create' ? 'บันทึกสถานะกำลังพล' : 'บันทึกการแก้ไข' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 3: ดูวันหยุดราชการ -->
    <div
      v-if="isHolidayModalOpen && selectedHoliday"
      class="gcal-modal-backdrop"
      @click.self="isHolidayModalOpen = false"
    >
      <div class="gcal-modal-card">
        <div
          class="modal-color-strip"
          :style="{ backgroundColor: CATEGORY_CONFIG[selectedHoliday.category].color }"
        ></div>
        <div class="modal-top-actions">
          <button class="icon-action-btn close" @click="isHolidayModalOpen = false">✕</button>
        </div>
        <div class="modal-body-content">
          <div class="modal-title-row">
            <span class="modal-big-icon">{{ selectedHoliday.icon || '🏛️' }}</span>
            <div>
              <h2>{{ selectedHoliday.name }}</h2>
              <span v-if="selectedHoliday.nameEn" class="modal-en-title">{{ selectedHoliday.nameEn }}</span>
            </div>
          </div>
          <div class="modal-info-list">
            <div class="modal-info-item">
              <span class="info-icon">📅</span>
              <div class="info-content">
                <strong>{{ formatFullThaiDate(selectedHoliday.date) }}</strong>
              </div>
            </div>
            <div class="modal-info-item">
              <span class="info-icon">🏷️</span>
              <div class="info-content">
                <span class="cat-chip" :style="{ backgroundColor: CATEGORY_CONFIG[selectedHoliday.category].bgLight, color: CATEGORY_CONFIG[selectedHoliday.category].color }">
                  {{ CATEGORY_CONFIG[selectedHoliday.category].label }}
                </span>
              </div>
            </div>
            <div v-if="selectedHoliday.description" class="modal-info-item">
              <span class="info-icon">📖</span>
              <div class="info-content">
                <p class="modal-description">{{ selectedHoliday.description }}</p>
              </div>
            </div>
            <!-- TODO: สำหรับ Developer - ส่วนแสดงข้อมูลผู้เข้าเวรในวันหยุดนี้ (เว้นไว้สำหรับเชื่อมต่อกับหน้าตารางเวร) -->
            <div v-if="getDutyForDate(selectedHoliday.date)?.md" class="modal-roster-box">
              <div class="roster-box-title">🛡️ กำลังพลประจำเวรในวันหยุดนี้:</div>
              <div class="roster-box-grid">
                <div class="roster-item-card">
                  <span class="role-badge-sm md">MD</span>
                  <div class="officer-name">{{ getDutyForDate(selectedHoliday.date)?.md }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================================
   GOOGLE CALENDAR APP CONTAINER & VARIABLES
   ======================================================== */
.google-calendar-app {
  --gcal-blue: #1a73e8;
  --gcal-blue-hover: #1765cc;
  --gcal-bg: #ffffff;
  --gcal-gray-border: #dadce0;
  --gcal-gray-light: #f1f3f4;
  --gcal-gray-text: #3c4043;
  --gcal-gray-sub: #70757a;
  font-family: 'IBM Plex Sans Thai', 'Roboto', sans-serif;
  color: var(--gcal-gray-text);
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid var(--gcal-gray-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  min-height: 800px;
}

/* ========================================================
   TOPBAR
   ======================================================== */
.gcal-topbar {
  min-height: 64px;
  padding: 8px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  gap: 16px;
  flex-wrap: wrap;
}

.topbar-left, .topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hamburger-btn {
  width: 38px;
  height: 38px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.hamburger-btn:hover { background: var(--gcal-gray-light); }
.hamburger-line { width: 18px; height: 2px; background: var(--gcal-gray-sub); border-radius: 1px; }

.gcal-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 6px;
}

.gcal-logo-icon {
  width: 36px;
  height: 36px;
  border: 2px solid var(--gcal-blue);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(26,115,232,0.15);
}
.logo-month { font-size: 8px; font-weight: 700; color: #ffffff; background: var(--gcal-blue); width: 100%; text-align: center; border-radius: 4px 4px 0 0; }
.logo-day { font-size: 14px; font-weight: 800; color: var(--gcal-blue); line-height: 1.1; }

.brand-text h2 { margin: 0; font-size: 17px; font-weight: 600; color: #202124; letter-spacing: -0.3px; }
.brand-sub { font-size: 10px; font-weight: 500; color: var(--gcal-gray-sub); }

.gcal-today-btn {
  border: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  color: var(--gcal-gray-text);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
}
.gcal-today-btn:hover { background: #f8f9fa; border-color: #c6c9ce; }

.demo-period-btn {
  border: 1px solid #d2e3fc;
  background: #e8f0fe;
  color: var(--gcal-blue);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.demo-period-btn:hover { background: #d2e3fc; }

.nav-arrows { display: flex; align-items: center; gap: 2px; }
.arrow-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--gcal-gray-sub);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.arrow-btn:hover { background: var(--gcal-gray-light); }

.period-title-text {
  font-size: 17px;
  font-weight: 500;
  color: #202124;
  margin: 0 0 0 4px;
  white-space: nowrap;
}

.gcal-search-box {
  display: flex;
  align-items: center;
  background: var(--gcal-gray-light);
  border-radius: 8px;
  padding: 6px 12px;
  gap: 8px;
  width: 170px;
  border: 1px solid transparent;
}
.gcal-search-box input { border: none; background: transparent; outline: none; font-size: 12px; color: var(--gcal-gray-text); width: 100%; }
.clear-search-btn { border: none; background: transparent; color: var(--gcal-gray-sub); cursor: pointer; font-size: 11px; }

.calendar-view-toggle-btn {
  border: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  color: var(--gcal-gray-sub);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
}
.calendar-view-toggle-btn.active {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #7dd3fc;
}

.btn-quick-add-leave {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(37,99,235,0.25);
  transition: all 0.15s;
}
.btn-quick-add-leave:hover { background: #1d4ed8; }

/* ========================================================
   BODY LAYOUT (SIDEBAR + MAIN CALENDAR)
   ======================================================== */
.gcal-body-layout {
  display: flex;
  flex: 1;
  border-bottom: 1px solid var(--gcal-gray-border);
}

/* Sidebar */
.gcal-sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--gcal-gray-border);
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #ffffff;
}

.sidebar-big-create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 24px;
  border: 1px solid #dadce0;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(60,64,67,0.2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.sidebar-big-create-btn:hover { background: #fafbfd; box-shadow: 0 2px 6px rgba(60,64,67,0.25); }
.big-plus {
  font-size: 17px;
  background: linear-gradient(45deg, #ea4335, #4285f4, #34a853, #fbbc05);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Mini Calendar */
.mini-calendar-wrap { padding-bottom: 10px; border-bottom: 1px solid var(--gcal-gray-border); }
.mini-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding: 0 4px; }
.mini-month-label { font-size: 12px; font-weight: 600; color: #202124; }
.mini-nav { display: flex; gap: 2px; }
.mini-nav-btn { border: none; background: transparent; color: var(--gcal-gray-sub); width: 22px; height: 22px; border-radius: 50%; cursor: pointer; }
.mini-nav-btn:hover { background: var(--gcal-gray-light); }

.mini-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; text-align: center; }
.mini-dow { font-size: 9.5px; font-weight: 600; color: var(--gcal-gray-sub); padding: 3px 0; }
.mini-day-cell {
  border: none;
  background: transparent;
  font-size: 10.5px;
  color: var(--gcal-gray-text);
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
  position: relative;
}
.mini-day-cell:hover { background: var(--gcal-gray-light); }
.mini-day-cell.other-month { color: #bdc1c6; }
.mini-day-cell.has-event::after {
  content: '';
  position: absolute;
  bottom: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gcal-blue);
}
.mini-day-cell.selected { background: #d2e3fc; color: var(--gcal-blue); font-weight: 700; }

.sidebar-section-header h4 { margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--gcal-gray-sub); }
.category-checkbox-list { display: flex; flex-direction: column; gap: 5px; }
.category-checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--gcal-gray-text); cursor: pointer; }
.cat-color-badge { width: 10px; height: 10px; border-radius: 3px; }
.cat-label-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.leave-legend-list { display: flex; flex-direction: column; gap: 5px; }
.legend-color-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
}

.satops-guide-box {
  margin-top: auto;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
}
.guide-title { font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
.guide-text { font-size: 10.5px; color: #64748b; margin: 0; line-height: 1.4; }

/* Main Calendar (Clean Month Grid) */
.gcal-main-content { flex: 1; display: flex; flex-direction: column; background: #ffffff; }
.month-view-container { display: flex; flex-direction: column; flex: 1; }
.month-header-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--gcal-gray-border); }
.month-dow-header {
  text-align: center;
  padding: 8px 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gcal-gray-sub);
  border-right: 1px solid var(--gcal-gray-border);
}
.month-dow-header:last-child { border-right: none; }
.month-dow-header.is-weekend { color: #d93025; }
.dow-short { display: none; }

.month-cells-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(105px, 1fr);
  flex: 1;
}

.gcal-month-cell {
  border-right: 1px solid var(--gcal-gray-border);
  border-bottom: 1px solid var(--gcal-gray-border);
  padding: 4px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.15s;
  background: #ffffff;
}
.gcal-month-cell:nth-child(7n) { border-right: none; }
.gcal-month-cell:hover { background: #f8fafd; }
.gcal-month-cell.not-current-month { background: #fafbfc; }
.gcal-month-cell.not-current-month .date-number-bubble { color: #9aa0a6; }
.gcal-month-cell.is-selected-date { background: #eff6ff; box-shadow: inset 0 0 0 2px #3b82f6; }

.cell-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.date-number-bubble {
  font-size: 12px;
  font-weight: 600;
  color: var(--gcal-gray-text);
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.date-number-bubble.today-bubble { background: var(--gcal-blue); color: #ffffff; }
.date-number-bubble.selected-bubble { background: #2563eb; color: #ffffff; }
.cell-event-count { font-size: 9.5px; color: #64748b; font-weight: 600; }

.cell-events-list { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.gcal-event-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: transform 0.1s;
}
.gcal-event-pill:hover { transform: translateY(-1px); filter: brightness(0.96); }
.pill-emoji { font-size: 10px; flex-shrink: 0; }
.pill-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.leave-type-tag { font-size: 9px; opacity: 0.85; margin-left: 2px; }

.more-pill {
  background: #f1f5f9;
  color: #475569;
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  justify-content: center;
}
.more-pill:hover { background: #e2e8f0; color: #1e293b; }

/* ========================================================
   ROSTER & CATEGORIZED LEAVE SECTION
   ======================================================== */
.roster-table-section {
  padding: 24px 22px 36px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.roster-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 14px;
}

.title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.title-row h2 { margin: 0; font-size: 19px; font-weight: 700; color: #0f172a; }
.integration-pill {
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 12px;
}
.roster-subtitle { margin: 3px 0 0; font-size: 12px; color: #64748b; }

.date-navigator-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-nav-controls {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 3px 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.btn-arrow {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.btn-arrow:hover { background: #f1f5f9; color: #0f172a; }
.current-date-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 13px;
  color: #0f172a;
  white-space: nowrap;
}
.cal-mini-icon { font-size: 14px; }

.btn-roster-add-main {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(2,132,199,0.25);
  transition: all 0.15s;
}
.btn-roster-add-main:hover { background: #0369a1; }

/* Stats Strip */
.roster-stats-strip {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-bubble {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 7px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}
.stat-bubble.total strong { color: #0f172a; }
.stat-bubble.available strong { color: #15803d; }
.stat-bubble.on-leave strong { color: #b91c1c; }
.stat-bubble.future strong { color: #1d4ed8; }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; }
.stat-dot.green { background: #22c55e; }
.stat-dot.red { background: #ef4444; }
.stat-dot.blue { background: #3b82f6; }

/* Category Navigation Tabs */
.category-tabs-container {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.category-tabs-row {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  padding: 6px 8px 0;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}

.category-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.category-tab-btn:hover { background: #e2e8f0; color: #0f172a; }
.category-tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  border-color: #e2e8f0;
  border-bottom-color: #ffffff;
  margin-bottom: -1px;
}
.category-tab-btn.roster-tab.active {
  color: #2563eb;
}

.tab-icon { font-size: 14px; }
.tab-count-badge {
  background: #e2e8f0;
  color: #475569;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}
.tab-count-badge.teal { background: #ccfbf1; color: #0f766e; }
.tab-count-badge.blue { background: #dbeafe; color: #1d4ed8; }
.tab-count-badge.purple { background: #f3e8ff; color: #7e22ce; }
.tab-count-badge.amber { background: #fef3c7; color: #b45309; }
.tab-count-badge.dark { background: #e0f2fe; color: #0369a1; }

.category-subbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #ffffff;
  gap: 12px;
  flex-wrap: wrap;
}

.status-subfilters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.subfilter-label { font-size: 11.5px; color: #64748b; margin-right: 4px; }
.subfilter-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.subfilter-btn:hover { background: #f8fafc; color: #0f172a; }
.subfilter-btn.active { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }

.table-search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 5px 10px;
  width: 240px;
}
.table-search-box input { border: none; outline: none; font-size: 12px; width: 100%; color: #1e293b; }

/* Clean Data Table */
.clean-table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.roster-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.roster-data-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 11.5px;
  white-space: nowrap;
}

.roster-data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  vertical-align: middle;
}

.roster-row:hover { background: #f8fafc; }
.roster-row.row-on-leave { background: #fffbfb; }

.officer-info-wrap { display: flex; align-items: center; gap: 10px; }
.officer-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.name-block { display: flex; flex-direction: column; gap: 2px; }
.name-text { font-size: 13px; color: #0f172a; }

.division-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #475569;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
}

.role-pill {
  font-size: 11px;
  font-weight: 600;
  color: #0369a1;
  background: #f0f9ff;
  padding: 2px 7px;
  border-radius: 4px;
}

.status-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.date-range-cell .date-pair { display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; }
.date-item b { color: #64748b; font-weight: 600; }

.duration-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}
.duration-badge.long-term {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.leave-timing-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.reason-cell { max-width: 280px; }
.reason-text-full { font-size: 12px; line-height: 1.4; color: #1e293b; }

.order-replacement-cell { font-size: 11px; display: flex; flex-direction: column; gap: 3px; }
.order-chip { color: #2563eb; font-weight: 600; }
.replacement-chip { color: #0f766e; }

.status-available-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #15803d;
  font-size: 11.5px;
  font-weight: 600;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 3px 8px;
  border-radius: 12px;
}
.available-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

.leave-date-span { font-size: 10.5px; color: #64748b; margin-top: 3px; }

.reason-note-box { font-size: 11.5px; display: flex; flex-direction: column; gap: 2px; }
.reason-title { color: #1e293b; }
.order-sub { color: #2563eb; }

.upcoming-note-box { font-size: 11px; }
.upcoming-badge {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 600;
}

.action-btn-group { display: flex; gap: 6px; justify-content: center; }
.btn-table-action {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-table-action:hover { background: #f1f5f9; }
.btn-table-action.delete:hover { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

.btn-table-add-leave {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-table-add-leave:hover { background: #e0f2fe; border-color: #7dd3fc; }

.empty-table-cell { padding: 36px 20px; text-align: center; }
.empty-state-box { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.empty-icon { font-size: 32px; }
.empty-title { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
.empty-sub { margin: 0; font-size: 12px; color: #64748b; }
.btn-primary-sm {
  margin-top: 6px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.text-dash { color: #cbd5e1; }
.text-muted { color: #94a3b8; }
.text-sm { font-size: 11px; }
.text-center { text-align: center; }

/* ========================================================
   MODALS
   ======================================================== */
.gcal-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
  padding: 20px;
  animation: fadeIn 0.15s ease-out;
}

.gcal-modal-card {
  width: min(580px, 100%);
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  overflow: hidden;
  position: relative;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.day-detail-modal-card { width: min(650px, 100%); }
.leave-modal-card { width: min(620px, 100%); }
.modal-color-strip { height: 6px; width: 100%; flex-shrink: 0; }

.modal-top-actions { display: flex; justify-content: flex-end; padding: 10px 14px 0; }
.icon-action-btn {
  border: none;
  background: transparent;
  color: var(--gcal-gray-sub);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.icon-action-btn:hover { background: var(--gcal-gray-light); }

.modal-body-content { padding: 12px 24px 24px; overflow-y: auto; }
.modal-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.modal-big-icon { font-size: 32px; }
.modal-title-row h2 { margin: 0; font-size: 19px; color: #0f172a; }
.modal-en-title { font-size: 11.5px; color: #64748b; }

.modal-info-list { display: flex; flex-direction: column; gap: 12px; font-size: 12.5px; }
.modal-info-item { display: flex; gap: 10px; align-items: baseline; }
.info-icon { font-size: 15px; width: 18px; text-align: center; }
.cat-chip { padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 600; }
.modal-description { margin: 0; color: #334155; line-height: 1.4; }

.modal-roster-box {
  margin-top: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
}
.roster-box-title { font-size: 11.5px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
.roster-box-grid { display: flex; gap: 8px; }
.roster-item-card { background: #ffffff; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; }
.role-badge-sm { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; }
.role-badge-sm.md { background: #e0f2fe; color: #0369a1; }
.officer-name { font-size: 11px; font-weight: 600; margin-top: 2px; }

/* Day Details Modal */
.day-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.day-modal-title { display: flex; align-items: center; gap: 14px; }
.day-big-num {
  font-size: 26px;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  border: 2px solid #bfdbfe;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.day-modal-title h3 { margin: 0; font-size: 16.5px; color: #0f172a; }
.day-sub-info { font-size: 11px; color: #64748b; margin-top: 2px; display: block; }

.day-modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.day-section-block { display: flex; flex-direction: column; gap: 8px; }
.day-block-heading { margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; }
.day-block-header-flex { display: flex; justify-content: space-between; align-items: center; }
.badge-count { font-size: 11px; background: #e2e8f0; color: #334155; padding: 1px 7px; border-radius: 10px; font-weight: 700; }

.day-holidays-list { display: flex; flex-direction: column; gap: 6px; }
.day-holiday-card {
  padding: 10px 14px;
  border-radius: 6px;
}
.holiday-card-title { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #0f172a; }
.holiday-card-desc { margin: 4px 0 0; font-size: 11.5px; color: #475569; line-height: 1.4; }

.day-leaves-list { display: flex; flex-direction: column; gap: 8px; }
.day-leave-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.day-leave-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.officer-leave-header { display: flex; align-items: center; gap: 8px; }
.leave-officer-name { font-size: 13px; color: #0f172a; }
.leave-div-tag { background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; }

.day-leave-details { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #334155; }
.leave-detail-row { display: flex; gap: 6px; align-items: baseline; }
.leave-detail-row .label { color: #64748b; font-weight: 600; width: 130px; flex-shrink: 0; }
.days-badge { color: #0284c7; font-weight: 700; }

.day-leave-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }

.day-empty-leaves {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 12px 14px;
  border-radius: 6px;
  color: #15803d;
  font-size: 12px;
}
.day-empty-leaves p { margin: 0; }

.day-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* Leave Form Mode */
.modal-form-mode { padding: 20px 24px; overflow-y: auto; }
.form-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.leave-header-title { display: flex; align-items: center; gap: 10px; }
.leave-type-icon-lg { font-size: 24px; }
.form-modal-header h3 { margin: 0; font-size: 17px; color: #0f172a; }
.header-dev-note { font-size: 10.5px; color: #2563eb; background: #eff6ff; padding: 1px 6px; border-radius: 4px; font-weight: 600; }

.gcal-form { display: flex; flex-direction: column; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 11.5px; font-weight: 600; color: #475569; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.form-input, .form-select, .form-textarea {
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 7px 10px;
  font-size: 12.5px;
  color: #1e293b;
  outline: none;
  font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
}

/* Quick Duration Strip */
.quick-duration-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.quick-label { font-size: 11px; font-weight: 600; color: #475569; }
.quick-buttons { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-quick-day {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-quick-day:hover { background: #f1f5f9; color: #0f172a; }
.btn-quick-day.highlight { background: #faf5ff; border-color: #d8b4fe; color: #7e22ce; }

.duration-calc-alert {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 11.5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #15803d;
}
.long-term-tag { font-weight: 700; color: #b45309; }

.form-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary:hover { background: #f8fafc; color: #1e293b; }

.btn-delete {
  margin-right: auto;
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: 5px;
  padding: 7px 12px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-delete:hover { background: #fecaca; }

@media (max-width: 900px) {
  .gcal-sidebar { display: none; }
  .dow-full { display: none; }
  .dow-short { display: inline; }
  .gcal-search-box { width: 130px; }
  .period-title-text { font-size: 15px; }
  .form-row-2 { grid-template-columns: 1fr; }
  .category-tabs-row { overflow-x: auto; }
}
</style>
