<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  formatFullThaiDate,
  formatShortThaiDate,
  getHolidaysForMonth,
  getHolidaysForYear,
  getUpcomingHolidays,
  RAW_HOLIDAYS,
  THAI_DAY_NAMES,
  THAI_DAY_SHORT,
  THAI_MONTH_NAMES,
  THAI_MONTH_SHORT
} from '../data/holidays'
import type { DayInfo, Holiday, HolidayCategory } from '../types/holiday'

// วันที่ปัจจุบันของระบบ (อิงตามเวลาเครื่อง/ระบบ)
const now = ref(new Date())
// Props รับข้อมูลตารางเวรจากระบบหลัก
const props = defineProps<{
  schedule?: {
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
  }[]
}>()

const getDutyForDate = (dateStr: string) => {
  return props.schedule?.find((s) => s.date === dateStr)
}

// State ของปฏิทิน
const currentYear = ref(2026) // ปีเริ่มต้น 2569 (2026)
const currentMonth = ref(10)  // เดือนเริ่มต้น ตุลาคม (1-12)
const selectedCategory = ref<'all' | HolidayCategory>('all')
const viewMode = ref<'month' | 'year'>('month')
const selectedHoliday = ref<Holiday | null>(null)
const selectedDay = ref<DayInfo | null>(null)
const showAddModal = ref(false)
const isSidebarOpen = ref(true) // ควบคุมการเปิด/ปิดแถบไฮไลต์ด้านขวา

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// ตรวจสอบว่าเดือนนั้นๆ มีวันหยุดราชการหรือไม่
const hasHolidayInMonth = (year: number, month: number) => {
  return getHolidaysForMonth(year, month).length > 0
}

// วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
const todayString = computed(() => {
  const d = now.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

// สตริงแสดงเวลาเรียลไทม์
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

let timerId: number | null = null

// อัปเดตเวลานาฬิกาเรียลไทม์ทุกวินาที
onMounted(() => {
  timerId = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timerId !== null) clearInterval(timerId)
})

// นำทางเดือน
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
}

const goToToday = () => {
  const d = new Date()
  currentYear.value = d.getFullYear()
  currentMonth.value = d.getMonth() + 1
}

// วันหยุดในเดือนที่เลือก (ผ่านตัวกรองหมวดหมู่)
const monthHolidays = computed(() => {
  const list = getHolidaysForMonth(currentYear.value, currentMonth.value)
  if (selectedCategory.value === 'all') return list
  return list.filter(h => h.category === selectedCategory.value)
})

// วันหยุดทั้งหมดของปี
const allYearHolidays = computed(() => {
  const list = getHolidaysForYear(currentYear.value)
  if (selectedCategory.value === 'all') return list
  return list.filter(h => h.category === selectedCategory.value)
})

// สถิติวันหยุดประจำเดือน
const monthStats = computed(() => {
  const holidays = getHolidaysForMonth(currentYear.value, currentMonth.value)
  const totalGovHolidays = holidays.filter(h => h.isGovernmentHoliday).length
  
  // นับจำนวนวันเสาร์-อาทิตย์ในเดือนนั้น
  const daysInMonth = new Date(currentYear.value, currentMonth.value, 0).getDate()
  let weekendCount = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(currentYear.value, currentMonth.value - 1, day).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++
  }

  // คำนวณวันหยุดถัดไปจากเดือนที่กำลังดูอยู่ หรือจากวันนี้
  const viewDateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`
  const baseDate = viewDateStr > todayString.value ? viewDateStr : todayString.value
  const upcoming = getUpcomingHolidays(baseDate, 1)
  const nextHoliday = upcoming[0] || null

  return {
    totalGovHolidays,
    weekendCount,
    totalHolidayDays: totalGovHolidays + weekendCount,
    daysInMonth,
    nextHoliday
  }
})

// คำนวณตารางวันในเดือนสำหรับปฏิทิน (Grid Days)
const calendarGridDays = computed<DayInfo[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sunday
  
  // วันของเดือนก่อนหน้าเพื่อเติมช่องว่าง
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const cells: DayInfo[] = []

  // ช่องวันจากเดือนก่อนหน้า
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dNumber = prevMonthDays - i
    const prevMonthVal = month === 1 ? 12 : month - 1
    const prevYearVal = month === 1 ? year - 1 : year
    const dateStr = `${prevYearVal}-${String(prevMonthVal).padStart(2, '0')}-${String(dNumber).padStart(2, '0')}`
    const dayOfWeek = new Date(prevYearVal, prevMonthVal - 1, dNumber).getDay()
    cells.push({
      date: dateStr,
      dayNumber: dNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayString.value,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
      holidays: RAW_HOLIDAYS.filter(h => h.date === dateStr)
    })
  }

  // ช่องวันของเดือนปัจจุบัน
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(year, month - 1, d).getDay()
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayString.value,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
      holidays: RAW_HOLIDAYS.filter(h => h.date === dateStr)
    })
  }

  // ช่องวันของเดือนถัดไปเพื่อให้เต็มตาราง 7 x 5 หรือ 7 x 6
  const totalNeeded = cells.length <= 35 ? 35 : 42
  const remaining = totalNeeded - cells.length
  for (let d = 1; d <= remaining; d++) {
    const nextMonthVal = month === 12 ? 1 : month + 1
    const nextYearVal = month === 12 ? year + 1 : year
    const dateStr = `${nextYearVal}-${String(nextMonthVal).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(nextYearVal, nextMonthVal - 1, d).getDay()
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayString.value,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeek,
      holidays: RAW_HOLIDAYS.filter(h => h.date === dateStr)
    })
  }

  return cells
})

// ป้ายหมวดหมู่ภาษาไทย
const categoryLabel = (cat: HolidayCategory) => {
  switch (cat) {
    case 'government': return 'วันหยุดราชการ'
    case 'royal': return 'วันสำคัญพระมหากษัตริย์'
    case 'religious': return 'วันสำคัญทางศาสนา'
    case 'compensatory': return 'วันหยุดชดเชย'
    case 'special': return 'วันหยุดพิเศษ (มติ ครม.)'
    default: return 'วันหยุด'
  }
}

// สีหมวดหมู่
const categoryBadgeClass = (cat: HolidayCategory) => {
  switch (cat) {
    case 'government': return 'badge-gov'
    case 'royal': return 'badge-royal'
    case 'religious': return 'badge-religious'
    case 'compensatory': return 'badge-comp'
    case 'special': return 'badge-special'
    default: return 'badge-gov'
  }
}

// คำนวณจำนวนวันคงเหลือ (Countdown)
const getDaysDiff = (dateStr: string) => {
  const target = new Date(`${dateStr}T00:00:00`).getTime()
  const today = new Date(`${todayString.value}T00:00:00`).getTime()
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))
  return diff
}

const openHolidayModal = (h: Holiday) => {
  selectedHoliday.value = h
}

const openDayModal = (day: DayInfo) => {
  selectedDay.value = day
  if (day.holidays.length > 0) {
    selectedHoliday.value = day.holidays[0]
  }
}

// ฟังก์ชันเพิ่มวันหยุดพิเศษจำลอง
const newHoliday = ref({
  name: '',
  date: '',
  category: 'special' as HolidayCategory,
  description: '',
  dutyNote: 'เวรประจำการเตรียมพร้อมระดับ 1'
})

const addCustomHoliday = () => {
  if (!newHoliday.value.name || !newHoliday.value.date) return
  RAW_HOLIDAYS.push({
    id: `custom-${Date.now()}`,
    date: newHoliday.value.date,
    name: newHoliday.value.name,
    category: newHoliday.value.category,
    isGovernmentHoliday: true,
    description: newHoliday.value.description || 'วันหยุดราชการเพิ่มเติม',
    dutyNote: newHoliday.value.dutyNote,
    icon: '📌'
  })
  showAddModal.value = false
  newHoliday.value = {
    name: '',
    date: '',
    category: 'special',
    description: '',
    dutyNote: 'เวรประจำการเตรียมพร้อมระดับ 1'
  }
}
</script>

<template>
  <div class="holiday-container">
    <!-- แถบหัวเรื่องและเวลานาฬิกาเรียลไทม์ -->
    <header class="holiday-header">
      <div class="header-left">
        <div class="live-clock-badge">
          <span class="live-dot"></span>
          <span class="live-text">{{ liveTimeString }}</span>
        </div>
        <h1 class="page-title">ปฏิทินวันหยุดราชการ</h1>
        <p class="page-desc">
          รวบรวมวันหยุดราชการ วันสำคัญ และวันหยุดชดเชยตามประกาศสำนักนายกรัฐมนตรี สำหรับวางแผนจัดกำลังพลเวรศูนย์ปฏิบัติการดาวเทียม
        </p>
      </div>

      <div class="header-actions">
        <div class="view-mode-toggle">
          <button 
            :class="['mode-btn', { active: viewMode === 'month' }]" 
            @click="viewMode = 'month'"
          >
            📅 รายเดือน
          </button>
          <button 
            :class="['mode-btn', { active: viewMode === 'year' }]" 
            @click="viewMode = 'year'"
          >
            📋 ทั้งปี 2569
          </button>
        </div>

        <button class="btn-primary" @click="showAddModal = true">
          <span>＋</span> เพิ่มวันหยุดพิเศษ (ครม.)
        </button>
      </div>
    </header>

    <!-- การ์ดตัวชี้วัดสถิติประจำเดือน -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon icon-red">🏛️</div>
        <div class="kpi-body">
          <span class="kpi-label">วันหยุดราชการ (เดือน{{ THAI_MONTH_NAMES[currentMonth - 1] }})</span>
          <strong class="kpi-value">{{ monthStats.totalGovHolidays }} <small>วัน</small></strong>
          <span class="kpi-hint">ประกาศหยุดงานตามมติ ครม.</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-amber">🌴</div>
        <div class="kpi-body">
          <span class="kpi-label">วันหยุดสุดสัปดาห์ (ส.-อา.)</span>
          <strong class="kpi-value">{{ monthStats.weekendCount }} <small>วัน</small></strong>
          <span class="kpi-hint">จากทั้งหมด {{ monthStats.daysInMonth }} วันในเดือน</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-blue">📊</div>
        <div class="kpi-body">
          <span class="kpi-label">รวมวันหยุดทั้งหมดในเดือน</span>
          <strong class="kpi-value">{{ monthStats.totalHolidayDays }} <small>วัน</small></strong>
          <span class="kpi-hint">{{ Math.round((monthStats.totalHolidayDays / monthStats.daysInMonth) * 100) }}% ของวันในเดือนนี้</span>
        </div>
      </div>

      <div class="kpi-card next-holiday-card">
        <div class="kpi-icon icon-green">⏳</div>
        <div class="kpi-body">
          <span class="kpi-label">วันหยุดราชการถัดไป</span>
          <template v-if="monthStats.nextHoliday">
            <strong class="kpi-value next-title">{{ monthStats.nextHoliday.holiday.name }}</strong>
            <span class="kpi-hint highlight-hint">
              📅 {{ formatShortThaiDate(monthStats.nextHoliday.holiday.date) }} 
              <b v-if="monthStats.nextHoliday.daysLeft > 0">(อีก {{ monthStats.nextHoliday.daysLeft }} วัน)</b>
              <b v-else-if="monthStats.nextHoliday.daysLeft === 0">(วันนี้!)</b>
            </span>
          </template>
          <template v-else>
            <strong class="kpi-value">ไม่มีวันหยุดใกล้เคียง</strong>
            <span class="kpi-hint">ช่วงเวลานี้เป็นวันปฏิบัติงานปกติ</span>
          </template>
        </div>
      </div>
    </section>

    <!-- มุมมองแบบรายเดือน (Monthly Calendar View) -->
    <template v-if="viewMode === 'month'">
      <div :class="['calendar-workspace', { 'sidebar-collapsed': !isSidebarOpen }]">
        <!-- ฝั่งซ้าย: ตารางปฏิทินแบบเรียลไทม์ -->
        <div class="calendar-main-card">
          <!-- แถบควบคุมเดือนและปี + ปุ่มเลื่อนปิดเปิดแถบขวา -->
          <div class="month-navigation-bar">
            <div class="nav-cluster">
              <button class="nav-arrow-btn" aria-label="เดือนก่อนหน้า" title="เดือนก่อนหน้า" @click="prevMonth">‹</button>
              <div class="current-month-display">
                <h2>{{ THAI_MONTH_NAMES[currentMonth - 1] }}</h2>
              </div>
              <button class="nav-arrow-btn" aria-label="เดือนถัดไป" title="เดือนถัดไป" @click="nextMonth">›</button>
              <button class="today-shortcut-btn" title="กลับมาเดือนและวันปัจจุบัน" @click="goToToday">
                <span class="today-dot"></span> วันนี้
              </button>
            </div>

            <div class="month-actions-right">
              <!-- ตัวเลือกปีแบบ Dropdown -->
              <div class="year-dropdown-wrap">
                <select v-model="currentYear" class="year-select">
                  <option :value="2025">พ.ศ. 2568 (2025)</option>
                  <option :value="2026">พ.ศ. 2569 (2026) · ปัจจุบัน</option>
                  <option :value="2027">พ.ศ. 2570 (2027)</option>
                </select>
              </div>

              <!-- ปุ่มเลื่อนปิด-เปิดบาร์ไฮไลต์ทางขวา -->
              <button 
                class="sidebar-toggle-btn"
                :class="{ 'btn-active': !isSidebarOpen }"
                :title="isSidebarOpen ? 'ย่อ/ซ่อนแถบไฮไลต์ทางขวา' : 'เปิดแสดงแถบไฮไลต์ทางขวา'"
                @click="toggleSidebar"
              >
                <span class="toggle-icon">{{ isSidebarOpen ? '⇥' : '⇤' }}</span>
                <span>{{ isSidebarOpen ? 'ซ่อนไฮไลต์' : 'เปิดไฮไลต์ (' + monthHolidays.length + ')' }}</span>
              </button>
            </div>
          </div>

          <!-- แถบเลือกเดือนด่วน 12 เดือน (Month Quick Bar) สะดวก สบายตา ไม่รก -->
          <div class="month-quick-bar">
            <button 
              v-for="(mShort, idx) in THAI_MONTH_SHORT" 
              :key="mShort"
              :class="['month-tab', { active: currentMonth === idx + 1 }]"
              @click="currentMonth = idx + 1"
            >
              <span>{{ mShort }}</span>
              <span v-if="hasHolidayInMonth(currentYear, idx + 1)" class="month-tab-dot" title="มีวันหยุดราชการในเดือนนี้"></span>
            </button>
          </div>

          <!-- ตัวกรองประเภทวันหยุด -->
          <div class="category-filters-bar">
            <button 
              :class="['filter-chip', { active: selectedCategory === 'all' }]"
              @click="selectedCategory = 'all'"
            >
              ทั้งหมด
              <span v-if="getHolidaysForMonth(currentYear, currentMonth).length > 0" class="chip-count">
                {{ getHolidaysForMonth(currentYear, currentMonth).length }}
              </span>
            </button>
            <button 
              :class="['filter-chip chip-gov', { active: selectedCategory === 'government' }]"
              @click="selectedCategory = 'government'"
            >
              🏛️ วันหยุดราชการ
            </button>
            <button 
              :class="['filter-chip chip-royal', { active: selectedCategory === 'royal' }]"
              @click="selectedCategory = 'royal'"
            >
              👑 สถาบันพระมหากษัตริย์
            </button>
            <button 
              :class="['filter-chip chip-religious', { active: selectedCategory === 'religious' }]"
              @click="selectedCategory = 'religious'"
            >
              🪷 วันสำคัญทางศาสนา
            </button>
            <button 
              :class="['filter-chip chip-comp', { active: selectedCategory === 'compensatory' }]"
              @click="selectedCategory = 'compensatory'"
            >
              🔄 วันหยุดชดเชย
            </button>
          </div>

          <!-- ตารางปฏิทิน 7 คอลัมน์ ขนาดเท่ากันทุกคอลัมน์ -->
          <div class="calendar-grid-container">
            <!-- แถวชื่อวันในสัปดาห์ -->
            <div class="weekday-header-row">
              <div 
                v-for="(dayName, idx) in THAI_DAY_SHORT" 
                :key="dayName"
                :class="['weekday-col', { 'col-sunday': idx === 0, 'col-saturday': idx === 6 }]"
              >
                <span>{{ dayName }}</span>
              </div>
            </div>

            <!-- ช่องวันของเดือน -->
            <div class="calendar-days-grid">
              <div
                v-for="cell in calendarGridDays"
                :key="cell.date"
                :class="[
                  'day-card',
                  {
                    'other-month': !cell.isCurrentMonth,
                    'is-today': cell.isToday,
                    'is-weekend': cell.isWeekend,
                    'has-holiday': cell.isCurrentMonth && cell.holidays.length > 0
                  }
                ]"
                @click="openDayModal(cell)"
              >
                <div class="day-card-top">
                  <span class="day-number">{{ cell.dayNumber }}</span>
                  <span v-if="cell.isToday" class="today-tag">วันนี้</span>
                </div>

                <!-- แสดงแท็กวันหยุดในช่อง เฉพาะเดือนปัจจุบัน ป้องกันข้อความยาวดันคอลัมน์ยืด -->
                <div v-if="cell.isCurrentMonth && cell.holidays.length > 0" class="day-holiday-chips">
                  <div
                    v-for="h in cell.holidays"
                    :key="h.id"
                    :class="['holiday-pill', categoryBadgeClass(h.category)]"
                    :title="h.name"
                    @click.stop="openHolidayModal(h)"
                  >
                    <span class="pill-icon">{{ h.icon || '📌' }}</span>
                    <span class="pill-text">{{ h.name }}</span>
                  </div>
                </div>

                <!-- วันหยุดของเดือนติดกัน แสดงเป็นจุดเล็กๆ สุภาพ ไม่ดันความกว้างของช่อง -->
                <div v-else-if="!cell.isCurrentMonth && cell.holidays.length > 0" class="other-month-dot-wrap">
                  <span class="other-dot" :title="cell.holidays[0].name"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- แถบคำอธิบายสัญลักษณ์ (Legend) -->
          <footer class="calendar-legend-bar">
            <span class="legend-title">สัญลักษณ์:</span>
            <div class="legend-item"><span class="legend-sample bg-gov"></span> วันหยุดราชการประจำปี</div>
            <div class="legend-item"><span class="legend-sample bg-royal"></span> วันสำคัญเกี่ยวกับสถาบัน</div>
            <div class="legend-item"><span class="legend-sample bg-religious"></span> วันสำคัญทางศาสนา</div>
            <div class="legend-item"><span class="legend-sample bg-comp"></span> วันหยุดชดเชย</div>
            <div class="legend-item"><span class="legend-sample bg-today-sample"></span> วันนี้</div>
            <div class="legend-item"><span class="legend-sample bg-weekend-sample"></span> วันหยุดเสาร์-อาทิตย์</div>
          </footer>
        </div>

        <!-- ฝั่งขวา: พาเนลไฮไลต์วันหยุดประจำเดือน (Monthly Highlights - เลื่อนปิด/เปิดได้) -->
        <aside v-if="isSidebarOpen" class="month-highlights-panel">
          <div class="panel-top-banner">
            <div class="banner-title-group">
              <span class="banner-sparkle">✦</span>
              <div>
                <h3 class="panel-heading">ไฮไลต์วันหยุดประจำเดือน</h3>
                <p class="panel-subheading">{{ THAI_MONTH_NAMES[currentMonth - 1] }} {{ currentYear + 543 }}</p>
              </div>
            </div>
            <div class="banner-actions-group">
              <span class="highlight-count-badge">
                {{ monthHolidays.length }} รายการ
              </span>
              <button class="panel-close-btn" title="ซ่อนแถบไฮไลต์" @click="isSidebarOpen = false">✕</button>
            </div>
          </div>

          <!-- รายการการ์ดวันหยุดของเดือนนี้ -->
          <div class="highlights-list">
            <template v-if="monthHolidays.length > 0">
              <article
                v-for="item in monthHolidays"
                :key="item.id"
                class="highlight-card"
                @click="openHolidayModal(item)"
              >
                <div class="card-date-badge">
                  <span class="badge-day">{{ item.date.split('-')[2] }}</span>
                  <span class="badge-month">{{ THAI_MONTH_SHORT[Number(item.date.split('-')[1]) - 1] }}</span>
                  <span class="badge-weekday">{{ THAI_DAY_SHORT[new Date(item.date).getDay()] }}</span>
                </div>

                <div class="card-content">
                  <div class="card-meta">
                    <span :class="['category-pill', categoryBadgeClass(item.category)]">
                      {{ categoryLabel(item.category) }}
                    </span>
                    
                    <!-- ตัวนับถอยหลัง -->
                    <span 
                      v-if="getDaysDiff(item.date) > 0" 
                      class="countdown-chip upcoming"
                    >
                      อีก {{ getDaysDiff(item.date) }} วัน
                    </span>
                    <span 
                      v-else-if="getDaysDiff(item.date) === 0" 
                      class="countdown-chip today"
                    >
                      วันนี้!
                    </span>
                    <span 
                      v-else 
                      class="countdown-chip past"
                    >
                      ผ่านมาแล้ว
                    </span>
                  </div>

                  <h4 class="holiday-title">
                    <span class="holiday-icon">{{ item.icon }}</span> {{ item.name }}
                  </h4>

                  <p class="holiday-desc">{{ item.description }}</p>

                  <div class="satops-duty-note">
                    <span class="note-bullet">⚡ คำสั่งเวร SATOPS:</span>
                    <span class="note-text">{{ item.dutyNote || 'จัดกำลังพลเวร 3 ผลัด ปฏิบัติหน้าที่ตรวจติดตามสัญญาณดาวเทียมตลอด 24 ชม.' }}</span>
                  </div>

                  <!-- เชื่อมโยงข้อมูลกำลังพลเข้าเวรจริงจากระบบ (Connected Duty Data) -->
                  <div v-if="getDutyForDate(item.date)?.md" class="duty-roster-box">
                    <div class="roster-header">🛡️ กำลังพลเข้าเวรวันหยุดนี้:</div>
                    <div class="roster-chips">
                      <span class="roster-chip md"><b>MD:</b> {{ getDutyForDate(item.date)?.md }}</span>
                      <span class="roster-chip fmo"><b>FMO:</b> {{ getDutyForDate(item.date)?.fmo }}</span>
                      <span class="roster-chip gso"><b>GSO:</b> {{ getDutyForDate(item.date)?.gso }}</span>
                    </div>
                  </div>
                </div>
              </article>
            </template>

            <!-- กรณีไม่มีวันหยุดราชการในเดือนนั้น -->
            <div v-else class="empty-holidays-state">
              <div class="empty-icon">🌱</div>
              <h4>เดือนนี้ไม่มีวันหยุดราชการ</h4>
              <p>ปฏิบัติงานตามวันและเวลาปกติ (วันจันทร์ - ศุกร์) โดยมีเฉพาะวันหยุดเสาร์-อาทิตย์ {{ monthStats.weekendCount }} วัน</p>
              <button class="btn-secondary-sm" @click="nextMonth">
                ดูวันหยุดเดือนถัดไป ➔
              </button>
            </div>
          </div>

          <!-- ตัวอย่างวันหยุดในเดือนถัดไป (Sneak Peek) -->
          <div class="next-month-peek">
            <h5 class="peek-title">วันหยุดที่กำลังจะมาถึงเร็วๆ นี้</h5>
            <div class="peek-list">
              <div 
                v-for="peek in getUpcomingHolidays(todayString, 3)" 
                :key="peek.holiday.id" 
                class="peek-item"
                @click="openHolidayModal(peek.holiday)"
              >
                <div class="peek-date">{{ formatShortThaiDate(peek.holiday.date) }}</div>
                <div class="peek-name">{{ peek.holiday.name }}</div>
                <div class="peek-days">
                  <span v-if="peek.daysLeft > 0">อีก {{ peek.daysLeft }} วัน</span>
                  <span v-else-if="peek.daysLeft === 0" class="today-text">วันนี้</span>
                  <span v-else>ผ่านมาแล้ว</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <!-- มุมมองแบบรายการทั้งปี (Annual List View) -->
    <template v-else>
      <div class="annual-view-card">
        <div class="annual-toolbar">
          <h3>ตารางวันหยุดราชการประจำปี พ.ศ. {{ currentYear + 543 }} ({{ currentYear }})</h3>
          <span class="annual-total-badge">รวม {{ allYearHolidays.length }} วันหยุดตามประกาศ</span>
        </div>

        <div class="annual-table-wrap">
          <table class="annual-table">
            <thead>
              <tr>
                <th style="width: 140px;">วันที่</th>
                <th style="width: 110px;">วันในสัปดาห์</th>
                <th>ชื่อวันหยุดราชการ</th>
                <th style="width: 180px;">ประเภท</th>
                <th>คำอธิบายความสำคัญ</th>
                <th>การจัดเวร SATOPS</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="h in allYearHolidays" 
                :key="h.id"
                :class="{ 'row-today': h.date === todayString }"
                @click="openHolidayModal(h)"
              >
                <td class="date-cell-bold">{{ formatShortThaiDate(h.date) }}</td>
                <td>{{ THAI_DAY_NAMES[new Date(h.date).getDay()] }}</td>
                <td class="holiday-name-cell">
                  <span class="table-icon">{{ h.icon }}</span>
                  <b>{{ h.name }}</b>
                </td>
                <td>
                  <span :class="['category-pill', categoryBadgeClass(h.category)]">
                    {{ categoryLabel(h.category) }}
                  </span>
                </td>
                <td class="desc-cell">{{ h.description }}</td>
                <td class="duty-cell">{{ h.dutyNote || 'ผลัดเวรพิเศษ 24 ชม.' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal รายละเอียดวันหยุด -->
    <div v-if="selectedHoliday" class="modal-backdrop" @click.self="selectedHoliday = null">
      <section class="holiday-detail-modal">
        <button class="modal-close-btn" @click="selectedHoliday = null">×</button>
        <div class="modal-badge-row">
          <span :class="['category-pill', categoryBadgeClass(selectedHoliday.category)]">
            {{ categoryLabel(selectedHoliday.category) }}
          </span>
          <span v-if="selectedHoliday.isGovernmentHoliday" class="status-official">
            ✓ วันหยุดราชการอย่างเป็นทางการ
          </span>
        </div>

        <div class="modal-icon-header">
          <span class="huge-icon">{{ selectedHoliday.icon || '🏛️' }}</span>
          <div>
            <h2 class="modal-holiday-title">{{ selectedHoliday.name }}</h2>
            <p v-if="selectedHoliday.nameEn" class="modal-holiday-en">{{ selectedHoliday.nameEn }}</p>
          </div>
        </div>

        <div class="modal-info-box">
          <div class="info-row">
            <span class="info-label">📅 วันที่:</span>
            <strong class="info-val">{{ formatFullThaiDate(selectedHoliday.date) }}</strong>
          </div>
          <div class="info-row">
            <span class="info-label">⏳ สถานะ:</span>
            <span class="info-val">
              <template v-if="getDaysDiff(selectedHoliday.date) > 0">
                เหลืออีก <b>{{ getDaysDiff(selectedHoliday.date) }}</b> วัน
              </template>
              <template v-else-if="getDaysDiff(selectedHoliday.date) === 0">
                <b class="today-text">🎉 วันนี้คือวันหยุด!</b>
              </template>
              <template v-else>
                ผ่านมาแล้ว {{ Math.abs(getDaysDiff(selectedHoliday.date)) }} วัน
              </template>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">📖 รายละเอียด:</span>
            <p class="info-desc">{{ selectedHoliday.description }}</p>
          </div>
        </div>

        <div class="modal-satops-box">
          <div class="satops-box-header">
            <span>📡 ระเบียบการเข้าเวรสถานีควบคุมดาวเทียม (SATOPS)</span>
          </div>
          <p class="satops-box-body">
            {{ selectedHoliday.dutyNote || 'วันหยุดราชการ: กำหนดให้เจ้าหน้าที่ชุดเวรประจำสถานีผลัดละ 3 นาย (MD, FMO, GSO) ปฏิบัติงานต่อเนื่องตลอด 24 ชั่วโมงตามคำสั่งศูนย์ควบคุม พร้อมบันทึก Logbook ครบถ้วน' }}
          </p>
        </div>

        <!-- รายชื่อผู้เข้าเวรในวันหยุดนี้จากตารางจริง -->
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

        <div class="modal-footer-actions">
          <button class="btn-secondary" @click="selectedHoliday = null">ปิดหน้าต่าง</button>
        </div>
      </section>
    </div>

    <!-- Modal เพิ่มวันหยุดพิเศษ (มติ ครม.) -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <section class="add-holiday-modal">
        <button class="modal-close-btn" @click="showAddModal = false">×</button>
        <span class="eyebrow-text">มติคณะรัฐมนตรี / ประกาศพิเศษ</span>
        <h2 class="modal-title">เพิ่มวันหยุดราชการพิเศษ</h2>
        <p class="modal-subtitle">บันทึกวันหยุดเพิ่มเติมตามประกาศของรัฐบาลเพื่อปรับตารางเวรให้ถูกต้อง</p>

        <form @submit.prevent="addCustomHoliday" class="add-form">
          <div class="form-group">
            <label>ชื่อวันหยุดราชการ *</label>
            <input 
              v-model="newHoliday.name" 
              type="text" 
              placeholder="เช่น วันหยุดราชการกรณีพิเศษช่วงเทศกาล..." 
              required
            />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>วันที่ *</label>
              <input 
                v-model="newHoliday.date" 
                type="date" 
                required 
              />
            </div>
            <div class="form-group">
              <label>ประเภทวันหยุด</label>
              <select v-model="newHoliday.category">
                <option value="special">วันหยุดราชการกรณีพิเศษ (มติ ครม.)</option>
                <option value="compensatory">วันหยุดชดเชย</option>
                <option value="government">วันหยุดราชการประจำปี</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>คำอธิบายความสำคัญ</label>
            <textarea 
              v-model="newHoliday.description" 
              rows="2" 
              placeholder="ระบุที่มาหรือรายละเอียดมติ ครม."
            ></textarea>
          </div>

          <div class="form-group">
            <label>คำแนะนำการจัดเวร SATOPS</label>
            <input 
              v-model="newHoliday.dutyNote" 
              type="text" 
              placeholder="เช่น จัดเวรเตรียมพร้อมตามปกติ"
            />
          </div>

          <div class="form-actions-row">
            <button type="button" class="btn-secondary" @click="showAddModal = false">ยกเลิก</button>
            <button type="submit" class="btn-primary" :disabled="!newHoliday.name || !newHoliday.date">
              บันทึกวันหยุด
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ================= Base Layout ================= */
.holiday-container {
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================= Header ================= */
.holiday-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  background: #ffffff;
  padding: 24px 28px;
  border-radius: 8px;
  border: 1px solid var(--line, #e1e8f0);
}

.live-clock-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f0f7ff;
  border: 1px solid #c8e0fa;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 11px;
  color: #1e5c9b;
  font-weight: 500;
  margin-bottom: 10px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.25); }
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--ink, #182b43);
  letter-spacing: -0.3px;
}

.page-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
  max-width: 720px;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: flex;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 3px;
  border: 1px solid #e2e8f0;
}

.mode-btn {
  border: 0;
  background: transparent;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  transition: all 0.15s ease;
}

.mode-btn.active {
  background: #ffffff;
  color: #1e40af;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.btn-primary {
  background: #2474c3;
  color: #ffffff;
  border: 0;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(36, 116, 195, 0.25);
  transition: background 0.15s;
}

.btn-primary:hover {
  background: #1d61a5;
}

.btn-secondary {
  background: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s;
}

.btn-secondary:hover {
  background: #f8fafc;
}

.btn-secondary-sm {
  background: #ffffff;
  color: #2474c3;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 10px;
}

.btn-secondary-sm:hover {
  background: #f0f7ff;
}

/* ================= KPI Cards ================= */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.15s, box-shadow 0.15s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 43, 67, 0.05);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex: 0 0 auto;
}

.icon-red { background: #fee2e2; color: #dc2626; }
.icon-amber { background: #fef3c7; color: #d97706; }
.icon-blue { background: #e0f2fe; color: #0284c7; }
.icon-green { background: #dcfce7; color: #16a34a; }

.kpi-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kpi-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  font-family: 'Space Grotesk', sans-serif;
  margin: 3px 0 2px;
}

.kpi-value small {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.kpi-hint {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-title {
  font-size: 15px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'IBM Plex Sans Thai', sans-serif;
}

.highlight-hint b {
  color: #0284c7;
}

/* ================= Calendar Workspace (2 Columns) ================= */
.calendar-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 20px;
  align-items: start;
  transition: all 0.25s ease-in-out;
}

.calendar-workspace.sidebar-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

/* Left Main Calendar Card */
.calendar-main-card {
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.month-navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafcff;
}

.nav-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-arrow-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 18px;
  display: grid;
  place-items: center;
  transition: all 0.15s;
}

.nav-arrow-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.current-month-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-month-display h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.today-shortcut-btn {
  border: 1px solid #b6d4f4;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.today-shortcut-btn:hover {
  background: #dbeafe;
}

.today-dot {
  width: 6px;
  height: 6px;
  background: #2563eb;
  border-radius: 50%;
}

.month-actions-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.year-select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  background: #ffffff;
  outline: none;
}

.sidebar-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-toggle-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.sidebar-toggle-btn.btn-active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.toggle-icon {
  font-size: 14px;
  line-height: 1;
}

/* Month Quick Bar (12 Months Pills) */
.month-quick-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #edf2f7;
  overflow-x: auto;
}

.month-tab {
  flex: 1;
  min-width: 40px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  padding: 5px 2px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  position: relative;
  transition: all 0.15s;
  cursor: pointer;
}

.month-tab:hover {
  background: #ffffff;
  color: #1e3a5f;
  border-color: #cbd5e1;
}

.month-tab.active {
  background: #173252;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(23, 50, 82, 0.2);
}

.month-tab-dot {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
}

.month-tab.active .month-tab-dot {
  background: #fbbf24;
}

/* Category Filter Bar */
.category-filters-bar {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  overflow-x: auto;
}

.filter-chip {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.filter-chip:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.filter-chip.active {
  background: #1e3a5f;
  color: #ffffff;
  border-color: #1e3a5f;
}

.chip-count {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 5px;
  border-radius: 10px;
  font-size: 10px;
}

.filter-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Calendar Grid */
.calendar-grid-container {
  padding: 14px 16px 16px;
}

.weekday-header-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 6px;
}

.weekday-col {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  padding: 7px 0;
  border-radius: 4px;
  background: #f8fafc;
}

.col-sunday {
  color: #dc2626;
  background: #fef2f2;
}

.col-saturday {
  color: #475569;
  background: #f1f5f9;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.day-card {
  min-width: 0;
  min-height: 84px;
  height: 90px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: all 0.15s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.day-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.day-card.other-month {
  background: #fafafc;
  opacity: 0.4;
}

.day-card.is-weekend:not(.other-month) {
  background: #fbfbfc;
}

.day-card.is-today {
  border: 2px solid #2563eb !important;
  background: #f0f7ff !important;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.15);
}

.day-card.has-holiday {
  background: #fffdf9;
  border-color: #fed7aa;
}

.day-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.day-number {
  font-size: 13px;
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
  color: #1e293b;
  line-height: 1;
}

.day-card.is-weekend:not(.other-month) .day-number {
  color: #475569;
}

.today-tag {
  background: #2563eb;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.2;
}

.day-holiday-chips {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 3px;
  min-width: 0;
  width: 100%;
}

.holiday-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-left: 3px solid transparent;
  transition: transform 0.1s;
}

.holiday-pill:hover {
  transform: scale(1.02);
}

.pill-icon {
  font-size: 9px;
  flex: 0 0 auto;
}

.pill-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.other-month-dot-wrap {
  margin-top: 4px;
  display: flex;
  justify-content: center;
}

.other-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #cbd5e1;
}

.banner-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 11px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.panel-close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* Badge Categories Colors */
.badge-gov, .bg-gov {
  background: #fee2e2;
  color: #991b1b;
  border-left-color: #ef4444;
}

.badge-royal, .bg-royal {
  background: #fef3c7;
  color: #92400e;
  border-left-color: #f59e0b;
}

.badge-religious, .bg-religious {
  background: #ede9fe;
  color: #5b21b6;
  border-left-color: #8b5cf6;
}

.badge-comp, .bg-comp {
  background: #e0f2fe;
  color: #075985;
  border-left-color: #0284c7;
}

.badge-special, .bg-special {
  background: #dcfce7;
  color: #166534;
  border-left-color: #22c55e;
}

.bg-today-sample {
  background: #2563eb;
  border: 1px solid #1d4ed8;
}

.bg-weekend-sample {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
}

/* Legend */
.calendar-legend-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
}

.legend-title {
  font-weight: 700;
  color: #334155;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-sample {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

/* ================= Right Sidebar: Highlights ================= */
.month-highlights-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-top-banner {
  background: linear-gradient(135deg, #173252, #1f4a7a);
  color: #ffffff;
  padding: 18px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.banner-sparkle {
  color: #f5b949;
  font-size: 20px;
}

.panel-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.panel-subheading {
  margin: 2px 0 0;
  font-size: 11px;
  color: #9cb8d9;
}

.highlight-count-badge {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.highlight-card {
  background: #ffffff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 14px;
  transition: all 0.15s ease;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.highlight-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 14px rgba(24, 43, 67, 0.08);
}

.card-date-badge {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  flex: 0 0 54px;
  border: 1px solid #e2e8f0;
}

.badge-day {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  font-family: 'Space Grotesk', sans-serif;
  line-height: 1;
}

.badge-month {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-top: 3px;
}

.badge-weekday {
  font-size: 10px;
  color: #94a3b8;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 6px;
}

.category-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.countdown-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
}

.countdown-chip.upcoming {
  background: #fef3c7;
  color: #b45309;
}

.countdown-chip.today {
  background: #fee2e2;
  color: #b91c1c;
  animation: pulse 1.5s infinite;
}

.countdown-chip.past {
  background: #f1f5f9;
  color: #94a3b8;
}

.holiday-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.holiday-icon {
  margin-right: 2px;
}

.holiday-desc {
  margin: 0 0 10px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.satops-duty-note {
  background: #f8fafc;
  border-left: 3px solid #f59e0b;
  padding: 6px 10px;
  border-radius: 0 4px 4px 0;
  font-size: 11px;
}

.note-bullet {
  font-weight: 700;
  color: #b45309;
  margin-right: 4px;
}

.note-text {
  color: #475569;
}

/* Empty State */
.empty-holidays-state {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 32px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-holidays-state h4 {
  margin: 0 0 6px;
  font-size: 15px;
  color: #334155;
}

.empty-holidays-state p {
  margin: 0 0 12px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

/* Sneak Peek */
.next-month-peek {
  background: #ffffff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 16px;
}

.peek-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.peek-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.peek-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}

.peek-item:hover {
  background: #eff6ff;
}

.peek-date {
  font-weight: 600;
  color: #1e40af;
  white-space: nowrap;
}

.peek-name {
  color: #334155;
  font-weight: 500;
  flex: 1;
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.peek-days {
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
}

/* ================= Annual Table View ================= */
.annual-view-card {
  background: #ffffff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.annual-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.annual-toolbar h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.annual-total-badge {
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.annual-table-wrap {
  overflow-x: auto;
}

.annual-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.annual-table th {
  background: #f8fafc;
  color: #64748b;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  white-space: nowrap;
}

.annual-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.annual-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

.annual-table tbody tr:hover {
  background: #f0f7ff;
}

.annual-table tr.row-today {
  background: #eff6ff;
  border-left: 3px solid #2563eb;
}

.date-cell-bold {
  font-weight: 700;
  color: #1e40af;
  white-space: nowrap;
}

.holiday-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-icon {
  font-size: 16px;
}

.desc-cell {
  color: #64748b;
  max-width: 320px;
}

.duty-cell {
  font-size: 11px;
  color: #0f766e;
  max-width: 260px;
}

/* ================= Modals ================= */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.holiday-detail-modal, .add-holiday-modal {
  width: min(540px, 100%);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
  padding: 28px;
  position: relative;
  animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 32px;
  height: 32px;
  border: 0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.status-official {
  font-size: 11px;
  color: #15803d;
  font-weight: 600;
}

.modal-icon-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.huge-icon {
  font-size: 38px;
  line-height: 1;
}

.modal-holiday-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.modal-holiday-en {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.modal-info-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.info-val {
  color: #1e293b;
}

.info-desc {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.modal-satops-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 6px;
  padding: 14px;
  margin-bottom: 20px;
}

.satops-box-header {
  font-size: 12px;
  font-weight: 700;
  color: #b45309;
  margin-bottom: 4px;
}

.satops-box-body {
  margin: 0;
  font-size: 12px;
  color: #78350f;
  line-height: 1.5;
}

.modal-footer-actions {
  display: flex;
  justify-content: flex-end;
}

/* Add Form */
.eyebrow-text {
  font-size: 10px;
  font-weight: 700;
  color: #0284c7;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.modal-title {
  margin: 4px 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  margin: 0 0 20px;
  font-size: 12px;
  color: #64748b;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.form-group input,
.form-group select,
.form-group textarea {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.today-text {
  color: #2563eb;
  font-weight: 700;
}

/* Duty Roster Box (Connected Data) */
.duty-roster-box {
  margin-top: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 8px 10px;
}

.roster-header {
  font-size: 11px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 5px;
}

.roster-chips {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.roster-chip {
  font-size: 11px;
  color: #1e293b;
  background: #ffffff;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #dcfce7;
}

.roster-chip b {
  font-family: 'Space Grotesk', sans-serif;
  margin-right: 4px;
}

.roster-chip.md b { color: #2563eb; }
.roster-chip.fmo b { color: #d97706; }
.roster-chip.gso b { color: #16a34a; }

/* Modal Roster Box */
.modal-roster-box {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 20px;
}

.roster-box-title {
  font-size: 12px;
  font-weight: 700;
  color: #15803d;
  margin-bottom: 10px;
}

.roster-box-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.roster-item-card {
  background: #ffffff;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-badge-sm {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: 'Space Grotesk', sans-serif;
}

.role-badge-sm.md { background: #e0f2fe; color: #0284c7; }
.role-badge-sm.fmo { background: #fef3c7; color: #b45309; }
.role-badge-sm.gso { background: #dcfce7; color: #15803d; }

.officer-name {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

/* ================= Responsive ================= */
@media (max-width: 1200px) {
  .calendar-workspace {
    grid-template-columns: 1fr;
  }
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  .holiday-header {
    flex-direction: column;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .day-card {
    min-height: 80px;
    padding: 4px;
  }
  .holiday-pill .pill-text {
    display: none;
  }
}
</style>
