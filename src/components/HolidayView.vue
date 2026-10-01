<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  formatFullThaiDate,
  formatShortThaiDate,
  RAW_HOLIDAYS,
  THAI_DAY_NAMES,
  THAI_DAY_SHORT,
  THAI_MONTH_NAMES,
  THAI_MONTH_SHORT
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

// Props สำหรับเชื่อมต่อข้อมูลกับหน้าอื่น (เว้นไว้สำหรับ Developer นำไปพัฒนาต่อ)
// TODO: สำหรับ Developer - สามารถรับ props เช่น schedule จากหน้าหลักเพื่อนำมาแสดงผลได้
const props = defineProps<{
  schedule?: DutyRoster[]
}>()

// ฟังก์ชันดึงข้อมูลเวร (ปิดการเชื่อมโยงไว้ชั่วคราว เพื่อให้ dev ท่านอื่นเชื่อมต่อเอง)
const getDutyForDate = (_dateStr: string): DutyRoster | undefined => {
  // TODO: สำหรับ Developer - นำไปเปิดใช้งานเมื่อต้องการเชื่อมโยงข้อมูลผู้เข้าเวรกับวันหยุด เช่น:
  // return props.schedule?.find((s) => s.date === _dateStr)
  return undefined
}

// ==========================================
// 2. State & Persistence (เพิ่ม / แก้ไข / ลบ)
// ==========================================
const STORAGE_KEY = 'satops_google_calendar_holidays_v1'

const loadInitialHolidays = (): Holiday[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
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

const saveHolidaysToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holidaysList.value))
  } catch (err) {
    console.error('Error saving holidays to localStorage', err)
  }
}

const resetHolidaysToDefault = () => {
  if (confirm('คุณต้องการรีเซ็ตข้อมูลวันหยุดทั้งหมดกลับเป็นค่าเริ่มต้นตามประกาศราชการหรือไม่? ข้อมูลที่คุณเพิ่มหรือแก้ไขจะถูกรีเซ็ต')) {
    holidaysList.value = [...RAW_HOLIDAYS]
    saveHolidaysToStorage()
  }
}

// ==========================================
// 3. Calendar Navigation & Clock
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

// ปฏิทินหลักเริ่มต้นที่เดือนตุลาคม 2569 (2026) เพื่อให้ตรงกับข้อมูลระบบดาวเทียม SATOPS
const currentYear = ref(2026)
const currentMonth = ref(10) // 1 - 12
const currentDay = ref(1)

// มินิปฏิทินในแถบด้านข้าง
const miniYear = ref(2026)
const miniMonth = ref(10)

// View modes เหมือน Google Calendar
type ViewMode = 'month' | 'week' | 'day' | 'agenda' | 'year'
const viewMode = ref<ViewMode>('month')
const isSidebarOpen = ref(true)

// ==========================================
// 4. Filters (ค้นหา & หมวดหมู่ปฏิทินของฉัน)
// ==========================================
const searchQuery = ref('')
const categoryFilters = ref<Record<HolidayCategory, boolean>>({
  government: true,
  royal: true,
  religious: true,
  compensatory: true,
  special: true,
})

const toggleAllCategories = () => {
  const allActive = Object.values(categoryFilters.value).every(Boolean)
  const target = !allActive
  Object.keys(categoryFilters.value).forEach((key) => {
    categoryFilters.value[key as HolidayCategory] = target
  })
}

// หมวดหมู่วันหยุดและสีสไตล์ Google Calendar
const CATEGORY_CONFIG: Record<
  HolidayCategory,
  { label: string; color: string; bgLight: string; border: string; icon: string }
> = {
  government: {
    label: 'วันหยุดราชการประจำปี',
    color: '#d93025', // Google Red
    bgLight: '#fce8e6',
    border: '#fad2cf',
    icon: '🏛️'
  },
  royal: {
    label: 'วันสำคัญเกี่ยวกับสถาบัน',
    color: '#1a73e8', // Google Blue
    bgLight: '#e8f0fe',
    border: '#d2e3fc',
    icon: '👑'
  },
  religious: {
    label: 'วันสำคัญทางศาสนา',
    color: '#e37400', // Google Orange / Amber
    bgLight: '#fef7e0',
    border: '#feefc3',
    icon: '🪷'
  },
  compensatory: {
    label: 'วันหยุดชดเชย',
    color: '#188038', // Google Green
    bgLight: '#e6f4ea',
    border: '#ceead6',
    icon: '🔄'
  },
  special: {
    label: 'วันหยุดพิเศษ (มติ ครม.)',
    color: '#a142f4', // Google Purple
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

// สถิติและจำนวนตามหมวดหมู่
const categoryCounts = computed(() => {
  const counts: Record<HolidayCategory, number> = {
    government: 0,
    royal: 0,
    religious: 0,
    compensatory: 0,
    special: 0
  }
  holidaysList.value.forEach((h) => {
    if (counts[h.category] !== undefined) {
      counts[h.category]++
    }
  })
  return counts
})

// หัวเรื่องช่วงเวลาปัจจุบัน (Header Display)
const periodTitle = computed(() => {
  if (viewMode.value === 'month') {
    return `${THAI_MONTH_NAMES[currentMonth.value - 1]} ${currentYear.value + 543}`
  }
  if (viewMode.value === 'day') {
    const d = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    return `วัน${THAI_DAY_NAMES[d.getDay()]}ที่ ${currentDay.value} ${THAI_MONTH_NAMES[currentMonth.value - 1]} ${currentYear.value + 543}`
  }
  if (viewMode.value === 'week') {
    const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    const start = new Date(cur)
    start.setDate(cur.getDate() - cur.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.getDate()} ${THAI_MONTH_SHORT[start.getMonth()]} - ${end.getDate()} ${THAI_MONTH_SHORT[end.getMonth()]} ${end.getFullYear() + 543}`
  }
  if (viewMode.value === 'agenda') {
    return `กำหนดการวันหยุด ปี ${currentYear.value + 543}`
  }
  return `ปฏิทินวันหยุดตลอดปี ${currentYear.value + 543}`
})

// ==========================================
// 5. Navigation Controls (Google Calendar)
// ==========================================
const prevPeriod = () => {
  if (viewMode.value === 'month' || viewMode.value === 'year') {
    if (currentMonth.value === 1) {
      currentMonth.value = 12
      currentYear.value -= 1
    } else {
      currentMonth.value -= 1
    }
    miniMonth.value = currentMonth.value
    miniYear.value = currentYear.value
  } else if (viewMode.value === 'week') {
    const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    cur.setDate(cur.getDate() - 7)
    currentYear.value = cur.getFullYear()
    currentMonth.value = cur.getMonth() + 1
    currentDay.value = cur.getDate()
    miniMonth.value = currentMonth.value
    miniYear.value = currentYear.value
  } else if (viewMode.value === 'day') {
    const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    cur.setDate(cur.getDate() - 1)
    currentYear.value = cur.getFullYear()
    currentMonth.value = cur.getMonth() + 1
    currentDay.value = cur.getDate()
  }
}

const nextPeriod = () => {
  if (viewMode.value === 'month' || viewMode.value === 'year') {
    if (currentMonth.value === 12) {
      currentMonth.value = 1
      currentYear.value += 1
    } else {
      currentMonth.value += 1
    }
    miniMonth.value = currentMonth.value
    miniYear.value = currentYear.value
  } else if (viewMode.value === 'week') {
    const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    cur.setDate(cur.getDate() + 7)
    currentYear.value = cur.getFullYear()
    currentMonth.value = cur.getMonth() + 1
    currentDay.value = cur.getDate()
    miniMonth.value = currentMonth.value
    miniYear.value = currentYear.value
  } else if (viewMode.value === 'day') {
    const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
    cur.setDate(cur.getDate() + 1)
    currentYear.value = cur.getFullYear()
    currentMonth.value = cur.getMonth() + 1
    currentDay.value = cur.getDate()
  }
}

const goToToday = () => {
  const d = new Date()
  currentYear.value = d.getFullYear()
  currentMonth.value = d.getMonth() + 1
  currentDay.value = d.getDate()
  miniYear.value = currentYear.value
  miniMonth.value = currentMonth.value
}

const jumpToDemoMonth = () => {
  currentYear.value = 2026
  currentMonth.value = 10
  currentDay.value = 1
  miniYear.value = 2026
  miniMonth.value = 10
}

// ==========================================
// 6. Calendar Grids Calculations
// ==========================================
interface CalendarCell {
  date: string
  dayNumber: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  dayOfWeek: number
  holidays: Holiday[]
}

// ตารางเดือนหลัก (Google Calendar Month Grid)
const monthGridCells = computed<CalendarCell[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sunday
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const cells: CalendarCell[] = []

  // ช่องวันจากเดือนก่อนหน้า
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
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr)
    })
  }

  // ช่องวันของเดือนปัจจุบัน
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
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr)
    })
  }

  // ช่องวันของเดือนถัดไป (เติมให้เต็ม 35 หรือ 42 ช่อง)
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
      month: m,
      year: y,
      isCurrentMonth: false,
      isToday: dateStr === todayString.value,
      isWeekend: dow === 0 || dow === 6,
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr)
    })
  }

  return cells
})

// สัปดาห์ปัจจุบัน (Week View)
const weekGridDays = computed<CalendarCell[]>(() => {
  const cur = new Date(currentYear.value, currentMonth.value - 1, currentDay.value)
  const start = new Date(cur)
  start.setDate(cur.getDate() - cur.getDay())

  const days: CalendarCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const dNum = d.getDate()
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    const dow = d.getDay()
    days.push({
      date: dateStr,
      dayNumber: dNum,
      month: m,
      year: y,
      isCurrentMonth: m === currentMonth.value,
      isToday: dateStr === todayString.value,
      isWeekend: dow === 0 || dow === 6,
      dayOfWeek: dow,
      holidays: filteredHolidays.value.filter((h) => h.date === dateStr)
    })
  }
  return days
})

// วันปัจจุบัน (Day View)
const currentDayCell = computed<CalendarCell>(() => {
  const y = currentYear.value
  const m = currentMonth.value
  const dNum = currentDay.value
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
  const dow = new Date(y, m - 1, dNum).getDay()
  return {
    date: dateStr,
    dayNumber: dNum,
    month: m,
    year: y,
    isCurrentMonth: true,
    isToday: dateStr === todayString.value,
    isWeekend: dow === 0 || dow === 6,
    dayOfWeek: dow,
    holidays: filteredHolidays.value.filter((h) => h.date === dateStr)
  }
})

// มินิปฏิทินข้างซ้าย (Mini Calendar)
const miniCalendarCells = computed(() => {
  const y = miniYear.value
  const m = miniMonth.value
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDow = new Date(y, m - 1, 1).getDay()
  const prevDays = new Date(y, m - 1, 0).getDate()
  const list: { date: string; day: number; isCurrentMonth: boolean; hasHoliday: boolean; isSelected: boolean }[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const dNum = prevDays - i
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    list.push({
      date: dStr,
      day: dNum,
      isCurrentMonth: false,
      hasHoliday: holidaysList.value.some((h) => h.date === dStr),
      isSelected: dStr === `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(currentDay.value).padStart(2, '0')}`
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    list.push({
      date: dStr,
      day: d,
      isCurrentMonth: true,
      hasHoliday: holidaysList.value.some((h) => h.date === dStr),
      isSelected: dStr === `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(currentDay.value).padStart(2, '0')}`
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
      hasHoliday: holidaysList.value.some((h) => h.date === dStr),
      isSelected: dStr === `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(currentDay.value).padStart(2, '0')}`
    })
  }

  return list
})

const selectDateFromMini = (cell: { date: string }) => {
  const [y, m, d] = cell.date.split('-').map(Number)
  currentYear.value = y
  currentMonth.value = m
  currentDay.value = d
}

// ==========================================
// 7. Holiday Modal & Form (เพิ่ม / แก้ไข / ลบ)
// ==========================================
const isModalOpen = ref(false)
const modalMode = ref<'view' | 'create' | 'edit'>('view')
const selectedHoliday = ref<Holiday | null>(null)

const holidayForm = ref<Holiday>({
  id: '',
  date: '',
  name: '',
  nameEn: '',
  category: 'government',
  isGovernmentHoliday: true,
  description: '',
  dutyNote: '',
  icon: '🏛️'
})

// เปิด Modal สร้างวันหยุดใหม่
const openCreateModal = (dateStr?: string) => {
  const targetDate =
    dateStr ||
    `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(currentDay.value).padStart(2, '0')}`

  holidayForm.value = {
    id: `holiday-${Date.now()}`,
    date: targetDate,
    name: '',
    nameEn: '',
    category: 'special',
    isGovernmentHoliday: true,
    description: '',
    dutyNote: 'เวรประจำการเตรียมพร้อมระดับ 1 ควบคุมระบบดาวเทียม 24 ชั่วโมง',
    icon: '✨'
  }
  modalMode.value = 'create'
  isModalOpen.value = true
}

// เปิดดูรายละเอียดวันหยุด
const openViewModal = (h: Holiday) => {
  selectedHoliday.value = h
  holidayForm.value = { ...h }
  modalMode.value = 'view'
  isModalOpen.value = true
}

// สลับไปยังโหมดแก้ไข
const switchToEditModal = () => {
  if (selectedHoliday.value) {
    holidayForm.value = { ...selectedHoliday.value }
    modalMode.value = 'edit'
  }
}

// บันทึกวันหยุด (สร้างใหม่ หรือ บันทึกการแก้ไข)
const handleSaveHoliday = () => {
  if (!holidayForm.value.name.trim() || !holidayForm.value.date) {
    alert('กรุณาระบุชื่อวันหยุดและเลือกวันที่')
    return
  }

  if (modalMode.value === 'create') {
    holidaysList.value.push({ ...holidayForm.value })
  } else if (modalMode.value === 'edit') {
    const index = holidaysList.value.findIndex((h) => h.id === holidayForm.value.id)
    if (index !== -1) {
      holidaysList.value[index] = { ...holidayForm.value }
    }
  }

  saveHolidaysToStorage()
  isModalOpen.value = false
}

// ลบวันหยุด
const handleDeleteHoliday = (id: string) => {
  if (confirm('คุณต้องการลบวันหยุดนี้ออกจากปฏิทินใช่หรือไม่?')) {
    holidaysList.value = holidaysList.value.filter((h) => h.id !== id)
    saveHolidaysToStorage()
    isModalOpen.value = false
  }
}

// คำนวณวันคงเหลือ
const getDaysDiff = (dateStr: string) => {
  const target = new Date(`${dateStr}T00:00:00`).getTime()
  const today = new Date(`${todayString.value}T00:00:00`).getTime()
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
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
            <h2>ปฏิทินวันหยุด</h2>
            <span class="brand-sub">{{ liveTimeString }}</span>
          </div>
        </div>

        <!-- ปุ่มวันนี้ (Today) -->
        <button class="gcal-today-btn" @click="goToToday">วันนี้</button>
        <button class="demo-period-btn" title="ไปที่เดือนตุลาคม 2569" @click="jumpToDemoMonth">
          ต.ค. 2569
        </button>

        <!-- ลูกศรเลื่อนเดือน / สัปดาห์ / วัน -->
        <div class="nav-arrows">
          <button class="icon-btn arrow-btn" title="ก่อนหน้า" @click="prevPeriod">‹</button>
          <button class="icon-btn arrow-btn" title="ถัดไป" @click="nextPeriod">›</button>
        </div>

        <!-- หัวเรื่องช่วงเวลา (Period Title) -->
        <h3 class="period-title-text">{{ periodTitle }}</h3>
      </div>

      <div class="topbar-right">
        <!-- ช่องค้นหา Google Style -->
        <div class="gcal-search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาวันหยุด, มติ ครม., วงรอบเวร..."
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
        </div>

        <!-- ตัวเลือกมุมมอง (View Switcher Dropdown) -->
        <div class="view-switcher">
          <select v-model="viewMode" class="gcal-view-select">
            <option value="month">เดือน</option>
            <option value="week">สัปดาห์</option>
            <option value="day">วัน</option>
            <option value="agenda">กำหนดการ</option>
            <option value="year">ทั้งปี 2569</option>
          </select>
        </div>

        <!-- ปุ่มสร้างวันหยุด Google FAB Style (+ สร้าง) -->
        <button class="gcal-create-fab" @click="openCreateModal()">
          <span class="fab-plus-icon">＋</span>
          <span class="fab-text">สร้างวันหยุด</span>
        </button>
      </div>
    </header>

    <!-- พื้นที่ทำงานหลัก (Sidebar + Main Calendar View) -->
    <div class="gcal-body-layout">
      <!-- แถบด้านข้างซ้าย (Google Calendar Left Sidebar) -->
      <aside v-if="isSidebarOpen" class="gcal-sidebar">
        <!-- ปุ่ม + สร้าง ขนาดใหญ่ใน Sidebar -->
        <button class="sidebar-big-create-btn" @click="openCreateModal()">
          <span class="big-plus">＋</span>
          <span>สร้างวันหยุดใหม่</span>
        </button>

        <!-- มินิปฏิทิน (Mini Month Picker) -->
        <div class="mini-calendar-wrap">
          <div class="mini-header">
            <span class="mini-month-label">
              {{ THAI_MONTH_NAMES[miniMonth - 1] }} {{ miniYear + 543 }}
            </span>
            <div class="mini-nav">
              <button
                class="mini-nav-btn"
                @click="
                  miniMonth === 1 ? ((miniMonth = 12), miniYear--) : miniMonth--
                "
              >
                ‹
              </button>
              <button
                class="mini-nav-btn"
                @click="
                  miniMonth === 12 ? ((miniMonth = 1), miniYear++) : miniMonth++
                "
              >
                ›
              </button>
            </div>
          </div>

          <div class="mini-grid">
            <div
              v-for="dow in ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']"
              :key="dow"
              class="mini-dow"
            >
              {{ dow }}
            </div>
            <button
              v-for="cell in miniCalendarCells"
              :key="cell.date"
              :class="[
                'mini-day-cell',
                {
                  'other-month': !cell.isCurrentMonth,
                  'has-event': cell.hasHoliday,
                  selected: cell.isSelected
                }
              ]"
              @click="selectDateFromMini(cell)"
            >
              {{ cell.day }}
            </button>
          </div>
        </div>

        <!-- ส่วนตัวกรอง "ปฏิทินของฉัน" (My Calendars) -->
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <h4>ปฏิทินวันหยุด (หมวดหมู่)</h4>
            <button class="text-link-btn" @click="toggleAllCategories">
              {{ Object.values(categoryFilters).every(Boolean) ? 'ล้าง' : 'เลือกหมด' }}
            </button>
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
              <span class="cat-count-badge">{{ categoryCounts[catKey as HolidayCategory] }}</span>
            </label>
          </div>
        </div>

        <!-- การ์ดสถานะ SATOPS & ปุ่มรีเซ็ตข้อมูล -->
        <div class="sidebar-section satops-info-box">
          <div class="satops-badge">🛰️ SATOPS SYSTEM</div>
          <p class="satops-desc">
            ข้อมูลวันหยุดทำงานแบบแยกส่วนอิสระ (Standalone) รองรับการเพิ่ม แก้ไข และบันทึกใน Local Storage
          </p>
          <button class="btn-reset-defaults" @click="resetHolidaysToDefault">
            🔄 รีเซ็ตวันหยุดตามประกาศทางการ
          </button>
        </div>
      </aside>

      <!-- ส่วนตารางปฏิทินหลัก (Main View Container) -->
      <main class="gcal-main-content">
        <!-- 1. MONTH VIEW (มุมมองแบบเดือน Google Calendar) -->
        <div v-if="viewMode === 'month'" class="month-view-container">
          <!-- แถวหัวคอลัมน์ชื่อวัน (Sun - Sat) -->
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

          <!-- ตารางวัน 7 คอลัมน์ (Google Month Grid) -->
          <div class="month-cells-grid">
            <div
              v-for="cell in monthGridCells"
              :key="cell.date"
              :class="[
                'gcal-month-cell',
                {
                  'not-current-month': !cell.isCurrentMonth,
                  'is-today': cell.isToday,
                  'is-weekend': cell.isWeekend
                }
              ]"
              @click="openCreateModal(cell.date)"
            >
              <div class="cell-top-bar">
                <span :class="['date-number-bubble', { 'today-bubble': cell.isToday }]">
                  {{ cell.dayNumber }}
                </span>
                <span class="cell-quick-add" title="คลิกเพื่อเพิ่มวันหยุดในวันนี้">＋</span>
              </div>

              <!-- รายการ Event Pills ในช่องวัน -->
              <div class="cell-events-list">
                <div
                  v-for="h in cell.holidays"
                  :key="h.id"
                  class="gcal-event-pill"
                  :style="{
                    backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                    borderLeft: `4px solid ${CATEGORY_CONFIG[h.category].color}`,
                    color: CATEGORY_CONFIG[h.category].color
                  }"
                  :title="`${h.name} (${CATEGORY_CONFIG[h.category].label})`"
                  @click.stop="openViewModal(h)"
                >
                  <span class="pill-emoji">{{ h.icon || CATEGORY_CONFIG[h.category].icon }}</span>
                  <span class="pill-name">{{ h.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. WEEK VIEW (มุมมองแบบสัปดาห์) -->
        <div v-else-if="viewMode === 'week'" class="week-view-container">
          <div class="week-header-row">
            <div
              v-for="day in weekGridDays"
              :key="day.date"
              :class="['week-col-header', { 'is-today': day.isToday }]"
            >
              <span class="week-dow">{{ THAI_DAY_SHORT[day.dayOfWeek] }}</span>
              <span :class="['week-daynum', { 'today-bubble': day.isToday }]">
                {{ day.dayNumber }}
              </span>
            </div>
          </div>

          <div class="week-body-columns">
            <div
              v-for="day in weekGridDays"
              :key="day.date"
              class="week-day-column"
              @click="openCreateModal(day.date)"
            >
              <div class="col-add-prompt">＋ เพิ่มวันหยุด</div>
              <div class="week-column-events">
                <div
                  v-for="h in day.holidays"
                  :key="h.id"
                  class="week-event-card"
                  :style="{
                    borderLeft: `5px solid ${CATEGORY_CONFIG[h.category].color}`,
                    backgroundColor: CATEGORY_CONFIG[h.category].bgLight
                  }"
                  @click.stop="openViewModal(h)"
                >
                  <div class="card-head">
                    <span class="card-emoji">{{ h.icon || '🏛️' }}</span>
                    <strong :style="{ color: CATEGORY_CONFIG[h.category].color }">{{ h.name }}</strong>
                  </div>
                  <p class="card-desc">{{ h.description }}</p>
                  <div class="card-meta">
                    <span class="card-cat-badge">{{ CATEGORY_CONFIG[h.category].label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. DAY VIEW (มุมมองแบบวันเดี่ยว) -->
        <div v-else-if="viewMode === 'day'" class="day-view-container">
          <div class="day-view-header-card">
            <div class="day-title-info">
              <h2>{{ formatFullThaiDate(currentDayCell.date) }}</h2>
              <p v-if="currentDayCell.isWeekend" class="text-amber">วันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์)</p>
              <p v-else class="text-green">วันทำงานปกติ</p>
            </div>
            <button class="btn-primary" @click="openCreateModal(currentDayCell.date)">
              ＋ เพิ่มวันหยุดในวันนี้
            </button>
          </div>

          <div class="day-events-panel">
            <div v-if="currentDayCell.holidays.length === 0" class="empty-day-state">
              <div class="empty-icon">🗓️</div>
              <h3>ไม่มีวันหยุดราชการหรือกิจกรรมพิเศษในวันนี้</h3>
              <p>สามารถคลิกปุ่มด้านบนเพื่อเพิ่มวันหยุดหรือกิจกรรมใหม่ได้ตลอดเวลา</p>
            </div>

            <div
              v-for="h in currentDayCell.holidays"
              :key="h.id"
              class="day-detailed-card"
              :style="{ borderLeft: `6px solid ${CATEGORY_CONFIG[h.category].color}` }"
            >
              <div class="detailed-header">
                <div class="detailed-title-wrap">
                  <span class="detailed-icon">{{ h.icon || '🏛️' }}</span>
                  <div>
                    <h3>{{ h.name }}</h3>
                    <span v-if="h.nameEn" class="text-muted">{{ h.nameEn }}</span>
                  </div>
                </div>
                <div class="detailed-actions">
                  <button class="btn-edit-sm" @click="openViewModal(h); switchToEditModal()">
                    ✏️ แก้ไข
                  </button>
                  <button class="btn-delete-sm" @click="handleDeleteHoliday(h.id)">
                    🗑️ ลบ
                  </button>
                </div>
              </div>

              <div class="detailed-body">
                <div class="detailed-row">
                  <span class="row-label">หมวดหมู่:</span>
                  <span
                    class="badge-pill"
                    :style="{
                      backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                      color: CATEGORY_CONFIG[h.category].color
                    }"
                  >
                    {{ CATEGORY_CONFIG[h.category].label }}
                  </span>
                </div>

                <div class="detailed-row">
                  <span class="row-label">สถานะวันหยุด:</span>
                  <span>{{ h.isGovernmentHoliday ? '✓ หยุดราชการตามประกาศสำนักนายกฯ' : 'วันสำคัญ (ไม่หยุดทำการ)' }}</span>
                </div>

                <div class="detailed-row">
                  <span class="row-label">ประวัติ / รายละเอียด:</span>
                  <p>{{ h.description }}</p>
                </div>

                <div class="satops-duty-box">
                  <strong>⚡ ระเบียบคำสั่งเวร SATOPS:</strong>
                  <p>{{ h.dutyNote || 'จัดเจ้าหน้าที่เวรปฏิบัติงาน 24 ชั่วโมงตามระเบียบ' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. AGENDA VIEW (มุมมองกำหนดการ) -->
        <div v-else-if="viewMode === 'agenda'" class="agenda-view-container">
          <div class="agenda-header-banner">
            <div>
              <h3>รายการวันหยุดราชการและวันสำคัญ (กำหนดการ)</h3>
              <p>พบทั้งหมด {{ filteredHolidays.length }} รายการตามตัวกรองที่เลือก</p>
            </div>
            <button class="btn-primary" @click="openCreateModal()">
              ＋ เพิ่มวันหยุด
            </button>
          </div>

          <div class="agenda-list">
            <div
              v-for="h in filteredHolidays"
              :key="h.id"
              class="agenda-item-card"
              @click="openViewModal(h)"
            >
              <div class="agenda-date-col">
                <span class="agenda-day">{{ h.date.split('-')[2] }}</span>
                <span class="agenda-month">{{ THAI_MONTH_SHORT[Number(h.date.split('-')[1]) - 1] }}</span>
                <span class="agenda-dow">{{ THAI_DAY_SHORT[new Date(h.date).getDay()] }}</span>
              </div>

              <div class="agenda-content-col">
                <div class="agenda-title-line">
                  <span class="agenda-icon">{{ h.icon || '🏛️' }}</span>
                  <strong>{{ h.name }}</strong>
                  <span
                    class="cat-chip"
                    :style="{
                      backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                      color: CATEGORY_CONFIG[h.category].color
                    }"
                  >
                    {{ CATEGORY_CONFIG[h.category].label }}
                  </span>
                </div>
                <p class="agenda-desc">{{ h.description }}</p>
              </div>

              <div class="agenda-action-col">
                <span
                  v-if="getDaysDiff(h.date) > 0"
                  class="countdown-tag"
                >
                  อีก {{ getDaysDiff(h.date) }} วัน
                </span>
                <span
                  v-else-if="getDaysDiff(h.date) === 0"
                  class="countdown-tag today"
                >
                  วันนี้!
                </span>
                <button
                  class="btn-icon-more"
                  title="แก้ไขหรือลบ"
                  @click.stop="openViewModal(h)"
                >
                  ⋮
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. YEAR VIEW (มุมมองทั้งปี) -->
        <div v-else class="year-view-container">
          <div class="year-header-banner">
            <div>
              <h3>ปฏิทินวันหยุดตลอดปี พ.ศ. {{ currentYear + 543 }} ({{ currentYear }})</h3>
              <p>แสดงวันหยุดทั้งหมดตามประกาศราชการและมติ ครม. สามารถคลิกรายการเพื่อแก้ไขได้</p>
            </div>
            <button class="btn-primary" @click="openCreateModal()">
              ＋ เพิ่มวันหยุดใหม่
            </button>
          </div>

          <div class="year-table-wrap">
            <table class="year-table">
              <thead>
                <tr>
                  <th style="width: 140px">วันที่</th>
                  <th style="width: 90px">วัน</th>
                  <th>ชื่อวันหยุดราชการ</th>
                  <th style="width: 180px">หมวดหมู่</th>
                  <th>รายละเอียดความสำคัญ</th>
                  <th style="width: 130px; text-align: right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="h in filteredHolidays"
                  :key="h.id"
                  class="year-table-row"
                  @click="openViewModal(h)"
                >
                  <td class="date-cell">
                    <b>{{ formatShortThaiDate(h.date) }}</b>
                  </td>
                  <td>{{ THAI_DAY_SHORT[new Date(h.date).getDay()] }}</td>
                  <td>
                    <span class="table-icon">{{ h.icon }}</span>
                    <strong>{{ h.name }}</strong>
                  </td>
                  <td>
                    <span
                      class="cat-chip"
                      :style="{
                        backgroundColor: CATEGORY_CONFIG[h.category].bgLight,
                        color: CATEGORY_CONFIG[h.category].color
                      }"
                    >
                      {{ CATEGORY_CONFIG[h.category].label }}
                    </span>
                  </td>
                  <td class="desc-cell">{{ h.description }}</td>
                  <td class="action-cell">
                    <button
                      class="btn-row-action"
                      title="แก้ไข"
                      @click.stop="openViewModal(h); switchToEditModal()"
                    >
                      ✏️
                    </button>
                    <button
                      class="btn-row-action delete"
                      title="ลบ"
                      @click.stop="handleDeleteHoliday(h.id)"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- ========================================== -->
    <!-- Google Calendar Modal (ดู / เพิ่ม / แก้ไข) -->
    <!-- ========================================== -->
    <div
      v-if="isModalOpen"
      class="gcal-modal-backdrop"
      @click.self="isModalOpen = false"
    >
      <div class="gcal-modal-card">
        <!-- 1. MODE: ดูรายละเอียด (View Details) -->
        <div v-if="modalMode === 'view' && selectedHoliday" class="modal-view-mode">
          <div
            class="modal-color-strip"
            :style="{ backgroundColor: CATEGORY_CONFIG[selectedHoliday.category].color }"
          ></div>
          <div class="modal-top-actions">
            <button
              class="icon-action-btn"
              title="แก้ไขวันหยุดนี้"
              @click="switchToEditModal"
            >
              ✏️ แก้ไข
            </button>
            <button
              class="icon-action-btn delete"
              title="ลบวันหยุดนี้"
              @click="handleDeleteHoliday(selectedHoliday.id)"
            >
              🗑️ ลบ
            </button>
            <button
              class="icon-action-btn close"
              title="ปิด"
              @click="isModalOpen = false"
            >
              ✕
            </button>
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
                  <span
                    v-if="getDaysDiff(selectedHoliday.date) > 0"
                    class="diff-text"
                  >
                    (อีก {{ getDaysDiff(selectedHoliday.date) }} วัน)
                  </span>
                  <span
                    v-else-if="getDaysDiff(selectedHoliday.date) === 0"
                    class="diff-text today"
                  >
                    (วันนี้คือวันหยุด!)
                  </span>
                </div>
              </div>

              <div class="modal-info-item">
                <span class="info-icon">🏷️</span>
                <div class="info-content">
                  <span
                    class="cat-chip"
                    :style="{
                      backgroundColor: CATEGORY_CONFIG[selectedHoliday.category].bgLight,
                      color: CATEGORY_CONFIG[selectedHoliday.category].color
                    }"
                  >
                    {{ CATEGORY_CONFIG[selectedHoliday.category].label }}
                  </span>
                  <span v-if="selectedHoliday.isGovernmentHoliday" class="official-tag">
                    ✓ หยุดราชการตามประกาศ
                  </span>
                </div>
              </div>

              <div v-if="selectedHoliday.description" class="modal-info-item">
                <span class="info-icon">📖</span>
                <div class="info-content">
                  <p class="modal-description">{{ selectedHoliday.description }}</p>
                </div>
              </div>

              <div class="modal-info-item">
                <span class="info-icon">⚡</span>
                <div class="info-content satops-duty-info">
                  <strong>คำสั่งเวร SATOPS:</strong>
                  <p>{{ selectedHoliday.dutyNote || 'จัดเวร 3 ผลัด ปฏิบัติหน้าที่ตรวจติดตามสัญญาณดาวเทียมตลอด 24 ชม.' }}</p>
                </div>
              </div>

              <!-- TODO: สำหรับ Developer - ส่วนแสดงข้อมูลผู้เข้าเวรในวันหยุดนี้ (เว้นไว้สำหรับเชื่อมต่อกับหน้าตารางเวร) -->
              <div v-if="getDutyForDate(selectedHoliday.date)?.md" class="modal-roster-box">
                <div class="roster-box-title">🛡️ กำลังพลประจำเวรในวันหยุดนี้ (เชื่อมโยงจากตารางเวร):</div>
                <div class="roster-box-grid">
                  <div class="roster-item-card">
                    <span class="role-badge-sm md">MD</span>
                    <div class="officer-name">{{ getDutyForDate(selectedHoliday.date)?.md }}</div>
                  </div>
                  <div class="roster-item-card">
                    <span class="role-badge-sm fmo">FMO</span>
                    <div class="officer-name">{{ getDutyForDate(selectedHoliday.date)?.fmo }}</div>
                  </div>
                  <div class="roster-item-card">
                    <span class="role-badge-sm gso">GSO</span>
                    <div class="officer-name">{{ getDutyForDate(selectedHoliday.date)?.gso }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. MODE: ฟอร์มสร้าง / แก้ไข (Create or Edit Form) -->
        <div v-else class="modal-form-mode">
          <div class="form-modal-header">
            <h3>{{ modalMode === 'create' ? 'เพิ่มวันหยุด / กิจกรรมใหม่' : 'แก้ไขข้อมูลวันหยุด' }}</h3>
            <button class="icon-action-btn close" @click="isModalOpen = false">✕</button>
          </div>

          <form @submit.prevent="handleSaveHoliday" class="gcal-form">
            <div class="form-group">
              <label>ชื่อวันหยุดราชการ / กิจกรรม *</label>
              <input
                v-model="holidayForm.name"
                type="text"
                class="form-input"
                placeholder="เช่น วันหยุดราชการกรณีพิเศษ หรือ วันครบรอบหน่วย..."
                required
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>วันที่ *</label>
                <input
                  v-model="holidayForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label>หมวดหมู่</label>
                <select v-model="holidayForm.category" class="form-select">
                  <option value="government">วันหยุดราชการประจำปี</option>
                  <option value="royal">วันสำคัญเกี่ยวกับสถาบัน</option>
                  <option value="religious">วันสำคัญทางศาสนา</option>
                  <option value="compensatory">วันหยุดชดเชย</option>
                  <option value="special">วันหยุดพิเศษ (มติ ครม.)</option>
                </select>
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>ไอคอนสัญลักษณ์</label>
                <div class="icon-selector-row">
                  <input
                    v-model="holidayForm.icon"
                    type="text"
                    class="form-input icon-input"
                    maxlength="2"
                    placeholder="🏛️"
                  />
                  <div class="preset-icons">
                    <span
                      v-for="ico in ['🏛️', '👑', '🪷', '🔄', '✨', '🎉', '💦', '📌']"
                      :key="ico"
                      class="preset-icon-btn"
                      @click="holidayForm.icon = ico"
                    >
                      {{ ico }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-group checkbox-group">
                <label class="toggle-checkbox-label">
                  <input
                    v-model="holidayForm.isGovernmentHoliday"
                    type="checkbox"
                    class="gcal-checkbox"
                  />
                  <span>เป็นวันหยุดทำการราชการอย่างเป็นทางการ</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>รายละเอียด / ที่มาความสำคัญ</label>
              <textarea
                v-model="holidayForm.description"
                rows="2"
                class="form-textarea"
                placeholder="ระบุรายละเอียดความสำคัญ หรือมติ ครม. ที่เกี่ยวข้อง"
              ></textarea>
            </div>

            <div class="form-group">
              <label>คำแนะนำการจัดเวร SATOPS</label>
              <input
                v-model="holidayForm.dutyNote"
                type="text"
                class="form-input"
                placeholder="เช่น ผลัดเวรเตรียมพร้อมระดับ 1 ควบคุมระบบตลอด 24 ชั่วโมง"
              />
            </div>

            <div class="form-modal-footer">
              <button
                type="button"
                class="btn-secondary"
                @click="isModalOpen = false"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="!holidayForm.name || !holidayForm.date"
              >
                {{ modalMode === 'create' ? 'สร้างวันหยุด' : 'บันทึกการแก้ไข' }}
              </button>
            </div>
          </form>
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
  --gcal-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
  font-family: 'IBM Plex Sans Thai', 'Roboto', sans-serif;
  color: var(--gcal-gray-text);
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid var(--gcal-gray-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  min-height: 800px;
  overflow: hidden;
}

/* ========================================================
   TOPBAR (GOOGLE CALENDAR HEADER)
   ======================================================== */
.gcal-topbar {
  height: 64px;
  padding: 0 18px;
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
  gap: 12px;
}

.hamburger-btn {
  width: 40px;
  height: 40px;
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
  margin-right: 8px;
}

.gcal-logo-icon {
  width: 38px;
  height: 38px;
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
.logo-day { font-size: 15px; font-weight: 800; color: var(--gcal-blue); line-height: 1.1; }

.brand-text h2 { margin: 0; font-size: 18px; font-weight: 600; color: #202124; letter-spacing: -0.3px; }
.brand-sub { font-size: 9px; font-weight: 700; color: var(--gcal-blue); letter-spacing: 1px; }

.gcal-today-btn {
  border: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  color: var(--gcal-gray-text);
  font-size: 13px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.gcal-today-btn:hover { background: #f8f9fa; border-color: #c6c9ce; }

.demo-period-btn {
  border: 1px solid #d2e3fc;
  background: #e8f0fe;
  color: var(--gcal-blue);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.demo-period-btn:hover { background: #d2e3fc; }

.nav-arrows { display: flex; align-items: center; gap: 2px; }
.arrow-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--gcal-gray-sub);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.arrow-btn:hover { background: var(--gcal-gray-light); }

.period-title-text {
  font-size: 19px;
  font-weight: 500;
  color: #202124;
  margin: 0 0 0 8px;
  white-space: nowrap;
}

.gcal-search-box {
  display: flex;
  align-items: center;
  background: var(--gcal-gray-light);
  border-radius: 8px;
  padding: 6px 12px;
  gap: 8px;
  width: 250px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.gcal-search-box:focus-within {
  background: #ffffff;
  border-color: var(--gcal-blue);
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.search-icon { font-size: 13px; color: var(--gcal-gray-sub); }
.gcal-search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--gcal-gray-text);
  width: 100%;
}
.clear-search-btn {
  border: none;
  background: transparent;
  color: var(--gcal-gray-sub);
  cursor: pointer;
  font-size: 11px;
}

.gcal-view-select {
  border: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  color: var(--gcal-gray-text);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 14px;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}
.gcal-view-select:hover { background: #f8f9fa; }

.gcal-create-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 24px;
  border: 1px solid #dadce0;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
  color: #3c4043;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.gcal-create-fab:hover {
  background: #f8fafd;
  box-shadow: 0 2px 6px rgba(60,64,67,0.3), 0 6px 12px 4px rgba(60,64,67,0.15);
}
.fab-plus-icon {
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(45deg, #ea4335, #4285f4, #34a853, #fbbc05);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ========================================================
   BODY LAYOUT (SIDEBAR + MAIN)
   ======================================================== */
.gcal-body-layout {
  display: flex;
  flex: 1;
  min-height: 720px;
}

/* SIDEBAR */
.gcal-sidebar {
  width: 256px;
  flex-shrink: 0;
  border-right: 1px solid var(--gcal-gray-border);
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #ffffff;
}

.sidebar-big-create-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  border-radius: 28px;
  border: 1px solid #dadce0;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(60,64,67,0.25);
  color: #3c4043;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}
.sidebar-big-create-btn:hover {
  background: #fafbfd;
  box-shadow: 0 3px 8px rgba(60,64,67,0.25);
}
.big-plus {
  font-size: 20px;
  background: linear-gradient(45deg, #ea4335, #4285f4, #34a853, #fbbc05);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Mini Calendar */
.mini-calendar-wrap {
  background: #ffffff;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gcal-gray-border);
}
.mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
}
.mini-month-label { font-size: 13px; font-weight: 600; color: #202124; }
.mini-nav { display: flex; gap: 4px; }
.mini-nav-btn {
  border: none;
  background: transparent;
  color: var(--gcal-gray-sub);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 16px;
}
.mini-nav-btn:hover { background: var(--gcal-gray-light); }

.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
}
.mini-dow {
  font-size: 10px;
  font-weight: 600;
  color: var(--gcal-gray-sub);
  padding: 4px 0;
}
.mini-day-cell {
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--gcal-gray-text);
  height: 28px;
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
.mini-day-cell.selected {
  background: #d2e3fc;
  color: var(--gcal-blue);
  font-weight: 700;
}

/* Category Checkboxes */
.sidebar-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.sidebar-section-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--gcal-gray-sub);
}
.text-link-btn {
  border: none;
  background: transparent;
  color: var(--gcal-blue);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.category-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.category-checkbox-item {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  color: var(--gcal-gray-text);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.1s;
}
.category-checkbox-item:hover { background: var(--gcal-gray-light); }
.cat-color-badge { width: 10px; height: 10px; border-radius: 3px; }
.cat-label-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-count-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--gcal-gray-sub);
  background: var(--gcal-gray-light);
  padding: 1px 5px;
  border-radius: 10px;
}

.satops-info-box {
  margin-top: auto;
  padding: 12px;
  background: #f8fafd;
  border: 1px solid #e2edfc;
  border-radius: 8px;
}
.satops-badge { font-size: 10px; font-weight: 700; color: var(--gcal-blue); margin-bottom: 6px; }
.satops-desc { font-size: 11px; color: var(--gcal-gray-sub); margin: 0 0 10px; line-height: 1.4; }
.btn-reset-defaults {
  border: 1px solid #dadce0;
  background: #ffffff;
  color: #5f6368;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  width: 100%;
  cursor: pointer;
}
.btn-reset-defaults:hover { background: #f1f3f4; color: #202124; }

/* ========================================================
   MAIN CONTENT & MONTH VIEW
   ======================================================== */
.gcal-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: auto;
}

.month-view-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.month-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--gcal-gray-border);
  background: #ffffff;
}
.month-dow-header {
  text-align: center;
  padding: 10px 4px;
  font-size: 12px;
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
  grid-auto-rows: minmax(115px, 1fr);
  flex: 1;
}

.gcal-month-cell {
  border-right: 1px solid var(--gcal-gray-border);
  border-bottom: 1px solid var(--gcal-gray-border);
  padding: 6px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: background 0.15s;
  background: #ffffff;
  min-height: 110px;
}
.gcal-month-cell:nth-child(7n) { border-right: none; }
.gcal-month-cell:hover { background: #f8f9fa; }
.gcal-month-cell.not-current-month { background: #fafbfc; }
.gcal-month-cell.not-current-month .date-number-bubble { color: #9aa0a6; }
.gcal-month-cell.is-weekend { background: #fafbfc; }

.cell-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.date-number-bubble {
  font-size: 12px;
  font-weight: 600;
  color: var(--gcal-gray-text);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.date-number-bubble.today-bubble {
  background: var(--gcal-blue);
  color: #ffffff;
}
.cell-quick-add {
  font-size: 13px;
  color: #bdc1c6;
  opacity: 0;
  transition: opacity 0.15s;
}
.gcal-month-cell:hover .cell-quick-add { opacity: 1; color: var(--gcal-blue); }

.cell-events-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

/* Event Pill (Google Calendar Style) */
.gcal-event-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  transition: transform 0.1s, box-shadow 0.1s;
}
.gcal-event-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.12);
}
.pill-emoji { font-size: 11px; }
.pill-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ========================================================
   WEEK VIEW
   ======================================================== */
.week-view-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.week-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--gcal-gray-border);
}
.week-col-header {
  text-align: center;
  padding: 10px 4px;
  border-right: 1px solid var(--gcal-gray-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.week-col-header:last-child { border-right: none; }
.week-dow { font-size: 11px; font-weight: 600; color: var(--gcal-gray-sub); }
.week-daynum {
  font-size: 20px;
  font-weight: 500;
  color: var(--gcal-gray-text);
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.week-daynum.today-bubble { background: var(--gcal-blue); color: #ffffff; }

.week-body-columns {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
}
.week-day-column {
  border-right: 1px solid var(--gcal-gray-border);
  padding: 10px 6px;
  min-height: 500px;
  cursor: pointer;
  background: #ffffff;
}
.week-day-column:last-child { border-right: none; }
.week-day-column:hover { background: #fafbfc; }
.col-add-prompt {
  font-size: 11px;
  color: var(--gcal-blue);
  text-align: center;
  padding: 6px;
  border: 1px dashed #d2e3fc;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  margin-bottom: 8px;
}
.week-day-column:hover .col-add-prompt { opacity: 1; }

.week-column-events {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.week-event-card {
  padding: 8px 10px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
}
.week-event-card .card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.week-event-card .card-head strong { font-size: 12px; }
.week-event-card .card-desc { font-size: 11px; color: var(--gcal-gray-sub); margin: 0 0 6px; line-height: 1.3; }
.week-event-card .card-cat-badge { font-size: 9px; font-weight: 600; color: #5f6368; background: #ffffff; padding: 2px 6px; border-radius: 4px; }

/* ========================================================
   DAY VIEW
   ======================================================== */
.day-view-container {
  padding: 24px 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.day-view-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8fafd;
  border: 1px solid #d2e3fc;
  border-radius: 8px;
}
.day-title-info h2 { margin: 0 0 4px; font-size: 22px; color: #202124; }
.day-title-info p { margin: 0; font-size: 13px; font-weight: 600; }
.text-amber { color: #d93025; }
.text-green { color: #188038; }

.day-events-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.empty-day-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--gcal-gray-sub);
}
.empty-day-state .empty-icon { font-size: 40px; margin-bottom: 12px; }

.day-detailed-card {
  background: #ffffff;
  border: 1px solid var(--gcal-gray-border);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}
.detailed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.detailed-title-wrap { display: flex; align-items: center; gap: 12px; }
.detailed-icon { font-size: 30px; }
.detailed-title-wrap h3 { margin: 0; font-size: 19px; color: #202124; }
.detailed-actions { display: flex; gap: 8px; }
.btn-edit-sm {
  border: 1px solid var(--gcal-gray-border);
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-delete-sm {
  border: 1px solid #fce8e6;
  background: #fce8e6;
  color: #c5221f;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.detailed-body { display: flex; flex-direction: column; gap: 10px; font-size: 13px; }
.detailed-row { display: flex; gap: 12px; align-items: baseline; }
.row-label { width: 140px; color: var(--gcal-gray-sub); font-weight: 500; }
.badge-pill { padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; }

.satops-duty-box {
  margin-top: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px 16px;
  border-left: 4px solid var(--gcal-blue);
}
.satops-duty-box strong { color: var(--gcal-blue); display: block; margin-bottom: 4px; }
.satops-duty-box p { margin: 0; color: #3c4043; }

/* ========================================================
   AGENDA VIEW & YEAR VIEW
   ======================================================== */
.agenda-view-container, .year-view-container {
  padding: 24px 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.agenda-header-banner, .year-header-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--gcal-gray-border);
  padding-bottom: 14px;
}
.agenda-header-banner h3, .year-header-banner h3 { margin: 0 0 4px; font-size: 20px; color: #202124; }
.agenda-header-banner p, .year-header-banner p { margin: 0; color: var(--gcal-gray-sub); font-size: 13px; }

.agenda-list { display: flex; flex-direction: column; gap: 10px; }
.agenda-item-card {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border: 1px solid var(--gcal-gray-border);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  gap: 20px;
}
.agenda-item-card:hover {
  background: #f8fafd;
  border-color: #c2dbff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.agenda-date-col {
  width: 70px;
  text-align: center;
  border-right: 1px solid var(--gcal-gray-border);
  padding-right: 16px;
}
.agenda-day { font-size: 24px; font-weight: 700; color: var(--gcal-blue); display: block; line-height: 1; }
.agenda-month { font-size: 11px; font-weight: 600; color: var(--gcal-gray-sub); display: block; }
.agenda-dow { font-size: 10px; color: #9aa0a6; }

.agenda-content-col { flex: 1; }
.agenda-title-line { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.agenda-title-line strong { font-size: 15px; color: #202124; }
.cat-chip { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.agenda-desc { margin: 0; font-size: 12px; color: var(--gcal-gray-sub); }

.agenda-action-col { display: flex; align-items: center; gap: 12px; }
.countdown-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--gcal-blue);
  background: #e8f0fe;
  padding: 3px 8px;
  border-radius: 12px;
}
.countdown-tag.today { color: #d93025; background: #fce8e6; }
.btn-icon-more {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--gcal-gray-sub);
  cursor: pointer;
}

.year-table-wrap { overflow-x: auto; }
.year-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.year-table th {
  text-align: left;
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid var(--gcal-gray-border);
  color: var(--gcal-gray-sub);
  font-weight: 600;
  font-size: 11px;
}
.year-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--gcal-gray-border);
  color: var(--gcal-gray-text);
}
.year-table-row { cursor: pointer; transition: background 0.1s; }
.year-table-row:hover { background: #f8fafd; }
.table-icon { margin-right: 6px; }
.desc-cell { color: var(--gcal-gray-sub); font-size: 12px; max-width: 320px; }
.btn-row-action {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 6px;
  font-size: 14px;
  border-radius: 4px;
}
.btn-row-action:hover { background: var(--gcal-gray-light); }
.btn-row-action.delete:hover { background: #fce8e6; }

/* ========================================================
   GOOGLE CALENDAR MODAL (VIEW / CREATE / EDIT)
   ======================================================== */
.gcal-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(32, 33, 36, 0.6);
  display: grid;
  place-items: center;
  padding: 20px;
  animation: fadeIn 0.15s ease-out;
}

.gcal-modal-card {
  width: min(580px, 100%);
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2);
  overflow: hidden;
  animation: scaleUp 0.18s cubic-bezier(0, 0, 0.2, 1);
  position: relative;
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-color-strip { height: 8px; width: 100%; }

.modal-top-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 0;
}
.icon-action-btn {
  border: none;
  background: transparent;
  color: var(--gcal-gray-sub);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.icon-action-btn:hover { background: var(--gcal-gray-light); color: var(--gcal-gray-text); }
.icon-action-btn.delete:hover { background: #fce8e6; color: #c5221f; }

.modal-body-content { padding: 12px 28px 28px; }
.modal-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.modal-big-icon { font-size: 36px; }
.modal-title-row h2 { margin: 0; font-size: 22px; color: #202124; line-height: 1.2; }
.modal-en-title { font-size: 12px; color: var(--gcal-gray-sub); }

.modal-info-list { display: flex; flex-direction: column; gap: 16px; }
.modal-info-item { display: flex; align-items: flex-start; gap: 14px; font-size: 13px; }
.info-icon { font-size: 18px; width: 22px; text-align: center; }
.info-content { flex: 1; }
.diff-text { color: var(--gcal-blue); font-weight: 600; margin-left: 8px; }
.diff-text.today { color: #d93025; }
.official-tag { margin-left: 10px; color: #188038; font-weight: 600; font-size: 11px; }
.modal-description { margin: 0; color: #3c4043; line-height: 1.5; }
.satops-duty-info {
  background: #f8f9fa;
  border-left: 4px solid var(--gcal-blue);
  padding: 10px 14px;
  border-radius: 4px;
}
.satops-duty-info strong { color: var(--gcal-blue); display: block; margin-bottom: 4px; }
.satops-duty-info p { margin: 0; color: #3c4043; }

/* Duty Roster Box inside Modal (for future devs) */
.modal-roster-box {
  margin-top: 14px;
  background: #f0f7ff;
  border: 1px solid #cce1fa;
  border-radius: 6px;
  padding: 12px 14px;
}
.roster-box-title { font-size: 12px; font-weight: 700; color: #174ea6; margin-bottom: 8px; }
.roster-box-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.roster-item-card { background: #ffffff; padding: 6px 8px; border-radius: 4px; border: 1px solid #d2e3fc; }
.role-badge-sm { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; }
.role-badge-sm.md { background: #e8f0fe; color: #1a73e8; }
.role-badge-sm.fmo { background: #fef7e0; color: #e37400; }
.role-badge-sm.gso { background: #e6f4ea; color: #188038; }
.officer-name { font-size: 11px; font-weight: 600; margin-top: 2px; }

/* FORM MODE */
.modal-form-mode { padding: 24px 28px; }
.form-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.form-modal-header h3 { margin: 0; font-size: 18px; color: #202124; }
.gcal-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--gcal-gray-sub); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.form-input, .form-select, .form-textarea {
  border: 1px solid var(--gcal-gray-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--gcal-gray-text);
  outline: none;
  font-family: inherit;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--gcal-blue);
  box-shadow: 0 0 0 2px rgba(26,115,232,0.15);
}

.icon-selector-row { display: flex; align-items: center; gap: 10px; }
.icon-input { width: 50px; text-align: center; font-size: 18px; }
.preset-icons { display: flex; gap: 4px; }
.preset-icon-btn {
  font-size: 18px;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
}
.preset-icon-btn:hover { background: var(--gcal-gray-light); }

.checkbox-group { justify-content: center; }
.toggle-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #3c4043;
  cursor: pointer;
}

.form-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--gcal-gray-border);
}

.btn-primary {
  background: var(--gcal-blue);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { background: var(--gcal-blue-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: transparent;
  color: var(--gcal-gray-sub);
  border: 1px solid var(--gcal-gray-border);
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary:hover { background: var(--gcal-gray-light); color: var(--gcal-gray-text); }

/* ========================================================
   RESPONSIVENESS
   ======================================================== */
@media (max-width: 900px) {
  .gcal-sidebar { display: none; }
  .dow-full { display: none; }
  .dow-short { display: inline; }
  .gcal-search-box { width: 160px; }
  .period-title-text { font-size: 16px; }
  .form-row-2 { grid-template-columns: 1fr; }
}
</style>
