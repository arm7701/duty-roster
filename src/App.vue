<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HolidayView from './components/HolidayView.vue'

type DutyRow = { date: string; day: string; dayShort: string; md: string; mdCode: string; fmo: string; fmoCode: string; gso: string; gsoCode: string; note: string }
type DashboardData = { currentUser: { name: string; role: string; initials: string }; summary: Record<string, number>; schedule: DutyRow[]; personnel: { name: string; roles: string }[] }
type DutyRole = 'md' | 'fmo' | 'gso'
type StatisticRow = { fullName: string; rank: string; firstName: string; lastName: string; md: number; fmo: number; gso: number; total: number }

const data = ref<DashboardData | null>(null)
const activeNav = ref('ตารางเวร')
const search = ref('')
const dayFilter = ref<'all' | 'workday' | 'holiday'>('all')
const selectedRow = ref<DutyRow | null>(null)
const selectedPerson = ref('')
const showDutyForm = ref(false)
const dutyDate = ref('2026-10-01')
const dutyMd = ref('')
const dutyFmo = ref('')
const dutyGso = ref('')
const dutyNote = ref('')
const personnelSearch = ref({ md: '', fmo: '', gso: '' })
const calendarMonth = ref(10)
const calendarYear = ref(2026)
const showNotifications = ref(false)
const showProfile = ref(false)
const statisticRole = ref<'all' | DutyRole>('all')
const statisticPeriod = ref<1 | 2 | 3>(1)
const showStatisticRoleMenu = ref(false)
const showStatisticPeriodMenu = ref(false)
const monthLabel = 'ตุลาคม 2569'

const monthSchedule = computed<DutyRow[]>(() => {
  if (!data.value) return []
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  return Array.from({ length: 31 }, (_, index) => {
    const date = `2026-10-${String(index + 1).padStart(2, '0')}`
    const existing = data.value?.schedule.find((row) => row.date === date)
    if (existing) return existing
    const day = new Date(`${date}T00:00:00`).getDay()
    return { date, day: dayNames[day], dayShort: dayNames[day].slice(0, 2), md: '', mdCode: '', fmo: '', fmoCode: '', gso: '', gsoCode: '', note: '' }
  })
})

const overviewYesterdayFallback: DutyRow = {
  date: '2026-09-30',
  day: 'พุธ',
  dayShort: 'พ.',
  md: 'พ.อ. วิชัย ศุภกิจ',
  mdCode: 'WS',
  fmo: 'ร.ต. ธีรภัทร อุดมศรี',
  fmoCode: 'TU',
  gso: 'จ.ส.อ. วีรพล อินทร์แก้ว',
  gsoCode: 'VI',
  note: '',
}

const overviewDays = computed(() => {
  if (!data.value) return []
  const referenceDate = new Date('2026-10-01T00:00:00')
  const labels = ['เมื่อวาน', 'วันนี้', 'พรุ่งนี้']
  return [-1, 0, 1].map((offset, index) => {
    const date = new Date(referenceDate)
    date.setDate(referenceDate.getDate() + offset)
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const schedule = data.value?.schedule.find((row) => row.date === isoDate)
      ?? (isoDate === overviewYesterdayFallback.date ? overviewYesterdayFallback : undefined)
    return {
      label: labels[index],
      isoDate,
      dateLabel: new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
      isToday: offset === 0,
      schedule,
    }
  })
})

const visibleSchedule = computed(() => {
  if (!data.value) return []
  const query = search.value.trim().toLowerCase()
  const filteredByDay = monthSchedule.value.filter((row) => {
    if (dayFilter.value === 'workday') return !['เสาร์', 'อาทิตย์'].includes(row.day) && !row.note.includes('ราชการ')
    if (dayFilter.value === 'holiday') return ['เสาร์', 'อาทิตย์'].includes(row.day) || row.note.includes('ราชการ')
    return true
  })
  if (!query) return filteredByDay
  return filteredByDay.filter((row) => [row.day, row.date, row.md, row.fmo, row.gso, row.note].some((value) => value.toLowerCase().includes(query)))
})

const formatThaiDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-')
  return `${day} / ${month} / ${Number(year) + 543}`
}
const normalizeRank = (name: string) => name.replaceAll('จ.ส.อ.', 'จ.อ.')
const shortPersonnelName = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 3) return name
  const surname = parts.pop() ?? ''
  return `${normalizeRank(parts.join(' '))} ${surname.charAt(0)}.`
}
const dayClass = (row: DutyRow) => row.day === 'อาทิตย์' ? 'sunday' : row.day === 'เสาร์' ? 'saturday' : ''
const openPerson = (name: string) => { selectedPerson.value = name }
const calendarDays = computed<(string | null)[]>(() => {
  const firstDayOffset = new Date(calendarYear.value, calendarMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear.value, calendarMonth.value, 0).getDate()
  return [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => `${calendarYear.value}-${String(calendarMonth.value).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)]
})
const personnelNames = computed(() => {
  if (!data.value) return []
  return [...new Set([...data.value.personnel.map((person) => person.name), ...data.value.schedule.flatMap((row) => [row.md, row.fmo, row.gso])])]
})
const filteredPersonnel = (role: 'md' | 'fmo' | 'gso') => personnelNames.value.filter((name) => name.toLowerCase().includes(personnelSearch.value[role].toLowerCase()))
const splitPersonnelName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/)
  return {
    rank: parts.shift() ?? '',
    lastName: parts.pop() ?? '',
    firstName: parts.join(' '),
  }
}
const personnelInitials = (fullName: string) => {
  const { firstName, lastName } = splitPersonnelName(fullName)
  return `${firstName.charAt(0)}${lastName.charAt(0)}`
}
const statisticSchedule = computed<DutyRow[]>(() => {
  if (!data.value) return []
  const currentRows = data.value.schedule.filter((row) => row.date.startsWith('2026-10-'))
  const personnelPool = [...new Set(currentRows.flatMap((row) => [row.md, row.fmo, row.gso]).filter(Boolean))]
  const history = [...currentRows]
  for (let monthsAgo = 1; monthsAgo < statisticPeriod.value; monthsAgo += 1) {
    const monthDate = new Date(2026, 9 - monthsAgo, 1)
    const daysInMonth = new Date(2026, 10 - monthsAgo, 0).getDate()
    for (let day = 1; day <= daysInMonth; day += 1) {
      const baseIndex = day + monthsAgo * 3
      const md = personnelPool[baseIndex % personnelPool.length]
      const fmo = personnelPool[(baseIndex + Math.ceil(personnelPool.length / 3)) % personnelPool.length]
      const gso = personnelPool[(baseIndex + Math.ceil(personnelPool.length * 2 / 3)) % personnelPool.length]
      const date = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      history.push({ date, day: '', dayShort: '', md, mdCode: '', fmo, fmoCode: '', gso, gsoCode: '', note: '' })
    }
  }
  return history
})
const statisticRows = computed<StatisticRow[]>(() => {
  const totals = new Map<string, StatisticRow>()
  for (const duty of statisticSchedule.value) {
    for (const role of ['md', 'fmo', 'gso'] as DutyRole[]) {
      const fullName = duty[role]
      if (!fullName) continue
      if (!totals.has(fullName)) {
        const name = splitPersonnelName(fullName)
        totals.set(fullName, { fullName, ...name, md: 0, fmo: 0, gso: 0, total: 0 })
      }
      const row = totals.get(fullName)!
      row[role] += 1
      row.total += 1
    }
  }
  const query = search.value.trim().toLowerCase()
  return [...totals.values()]
    .filter((row) => !query || row.fullName.toLowerCase().includes(query))
    .filter((row) => statisticRole.value === 'all' || row[statisticRole.value] > 0)
    .sort((first, second) => {
      const firstCount = statisticRole.value === 'all' ? first.total : first[statisticRole.value]
      const secondCount = statisticRole.value === 'all' ? second.total : second[statisticRole.value]
      return secondCount - firstCount || first.fullName.localeCompare(second.fullName, 'th')
    })
})
const statisticSummary = computed(() => {
  const rows = statisticRows.value
  const selectedCount = (row: StatisticRow) => statisticRole.value === 'all' ? row.total : row[statisticRole.value]
  const total = rows.reduce((sum, row) => sum + selectedCount(row), 0)
  return {
    personnel: rows.length,
    total,
    average: rows.length ? (total / rows.length).toFixed(1) : '0.0',
    highest: rows[0] ? selectedCount(rows[0]) : 0,
  }
})
const statisticPeriodLabel = computed(() => statisticPeriod.value === 1 ? 'ตุลาคม 2569' : statisticPeriod.value === 2 ? 'กันยายน – ตุลาคม 2569' : 'สิงหาคม – ตุลาคม 2569')
const statisticRoleLabel = computed(() => ({ all: 'ทุกตำแหน่ง', md: 'MD', fmo: 'FMO', gso: 'GSO' })[statisticRole.value])
const statisticPeriodOptionLabel = computed(() => `ย้อนหลัง ${statisticPeriod.value} เดือน`)
const selectStatisticRole = (role: 'all' | DutyRole) => {
  statisticRole.value = role
  showStatisticRoleMenu.value = false
}
const selectStatisticPeriod = (period: 1 | 2 | 3) => {
  statisticPeriod.value = period
  showStatisticPeriodMenu.value = false
}
const openDutyForm = (row?: DutyRow) => {
  dutyDate.value = row?.date ?? '2026-10-01'
  const [year, month] = dutyDate.value.split('-').map(Number)
  calendarYear.value = year
  calendarMonth.value = month
  dutyMd.value = row?.md ?? ''
  dutyFmo.value = row?.fmo ?? ''
  dutyGso.value = row?.gso ?? ''
  dutyNote.value = row?.note ?? ''
  personnelSearch.value = { md: '', fmo: '', gso: '' }
  selectedRow.value = null
  showDutyForm.value = true
}
const changeCalendarMonth = (offset: number) => {
  const nextMonth = new Date(calendarYear.value, calendarMonth.value - 1 + offset, 1)
  calendarYear.value = nextMonth.getFullYear()
  calendarMonth.value = nextMonth.getMonth() + 1
}
const saveDuty = () => {
  if (!data.value || !dutyMd.value || !dutyFmo.value || !dutyGso.value) return
  const existing = data.value.schedule.find((row) => row.date === dutyDate.value)
  if (existing) {
    existing.md = dutyMd.value; existing.fmo = dutyFmo.value; existing.gso = dutyGso.value; existing.note = dutyNote.value
  } else {
    const date = new Date(`${dutyDate.value}T00:00:00`)
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    data.value.schedule.push({ date: dutyDate.value, day: dayNames[date.getDay()], dayShort: dayNames[date.getDay()].slice(0, 2), md: dutyMd.value, mdCode: dutyMd.value.slice(0, 2), fmo: dutyFmo.value, fmoCode: dutyFmo.value.slice(0, 2), gso: dutyGso.value, gsoCode: dutyGso.value.slice(0, 2), note: dutyNote.value })
    data.value.schedule.sort((a, b) => a.date.localeCompare(b.date))
  }
  showDutyForm.value = false
}
const fillRandomMonthData = (dashboard: DashboardData) => {
  const personnelPool = [...new Set(dashboard.schedule.flatMap((row) => [row.md, row.fmo, row.gso]).filter(Boolean))]
  const secondRoleOffset = Math.ceil(personnelPool.length / 3)
  const thirdRoleOffset = Math.ceil(personnelPool.length * 2 / 3)
  for (let day = 11; day <= 31; day += 1) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    const existing = dashboard.schedule.find((row) => row.date === date)
    if (existing) continue
    const baseIndex = day - 11
    const md = personnelPool[baseIndex % personnelPool.length]
    const fmo = personnelPool[(baseIndex + secondRoleOffset) % personnelPool.length]
    const gso = personnelPool[(baseIndex + thirdRoleOffset) % personnelPool.length]
    const dateValue = new Date(`${date}T00:00:00`)
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    dashboard.schedule.push({ date, day: dayNames[dateValue.getDay()], dayShort: dayNames[dateValue.getDay()].slice(0, 2), md, mdCode: md.slice(0, 2), fmo, fmoCode: fmo.slice(0, 2), gso, gsoCode: gso.slice(0, 2), note: '' })
  }
  dashboard.schedule.sort((first, second) => first.date.localeCompare(second.date))
}
const setupCalendarNavigation = () => {
  const header = document.querySelector<HTMLElement>('.calendar-header')
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.calendar-header button'))
  const title = header?.querySelector('strong')
  if (!header || buttons.length < 2 || !title) return
  const updateTitle = () => { title.textContent = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(calendarYear.value, calendarMonth.value - 1, 1)) }
  buttons[0].onclick = () => { changeCalendarMonth(-1); updateTitle() }
  buttons[1].onclick = () => { changeCalendarMonth(1); updateTitle() }
  updateTitle()
}
watch(showDutyForm, async (isVisible) => {
  if (isVisible) {
    await nextTick()
    setupCalendarNavigation()
  }
})
watch([calendarMonth, calendarYear], async () => {
  if (showDutyForm.value) {
    await nextTick()
    setupCalendarNavigation()
  }
})
watch(activeNav, () => { search.value = '' })
onMounted(async () => {
  const dashboard: DashboardData = await (await fetch('/data/mock-data.json')).json()
  fillRandomMonthData(dashboard)
  data.value = dashboard
})
</script>

<template>
  <div v-if="data" class="app-shell" @click="showStatisticRoleMenu = false; showStatisticPeriodMenu = false">
    <aside class="sidebar">
      <div class="brand-lockup"><div class="brand-mark"><span>✦</span></div><div><p class="brand-title">SATOPS</p><p class="brand-subtitle">DUTY CONTROL</p></div></div>
      <div class="sidebar-section-label">เมนูหลัก</div>
      <nav class="main-nav" aria-label="เมนูหลัก"><button v-for="item in ['ภาพรวม', 'ตารางเวร', 'บุคลากร', 'วันหยุด/วันลา/วันจำหน่าย', 'สถิติ']" :key="item" :class="['nav-item', { active: activeNav === item }]" @click="activeNav = item"><span class="nav-icon">{{ { 'ภาพรวม': '⌂', 'ตารางเวร': '▤', 'บุคลากร': '♙', 'วันหยุด/วันลา/วันจำหน่าย': '▦', 'สถิติ': '▥' }[item] }}</span>{{ item }}</button></nav>
      <div class="sidebar-section-label system-label">ระบบ</div>
      <nav class="main-nav"><button v-for="item in ['ประวัติการแก้ไข', 'ผู้ใช้งาน', 'ตั้งค่า']" :key="item" :class="['nav-item', { active: activeNav === item }]" @click="activeNav = item"><span class="nav-icon">{{ { 'ประวัติการแก้ไข': '⌁', 'ผู้ใช้งาน': '♧', 'ตั้งค่า': '⚙' }[item] }}</span>{{ item }}</button></nav>
      <div class="sidebar-footer"><div class="secure-indicator"><span></span> ระบบปฏิบัติการปกติ</div><div class="sidebar-version">SATOPS v1.0.0 · DEMO DATA</div></div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div class="breadcrumb"><span>ระบบบริหารจัดการเวร</span><b>/</b><strong>{{ activeNav }}</strong></div><div class="topbar-actions"><div class="top-search"><span>⌕</span><input v-model="search" :placeholder="activeNav === 'สถิติ' ? 'ค้นหายศ ชื่อ หรือนามสกุล...' : 'ค้นหาบุคลากร, วันที่...'" aria-label="ค้นหา" /><kbd>⌘ K</kbd></div><button class="icon-button notification-button" aria-label="การแจ้งเตือน" @click="showNotifications = !showNotifications">♢<i></i></button><button class="profile-chip" @click="showProfile = !showProfile"><span class="avatar">{{ data.currentUser.initials }}</span><span><b>{{ data.currentUser.name }}</b><small>{{ data.currentUser.role }}</small></span><em>⌄</em></button></div><div v-if="showNotifications" class="popover notification-popover"><b>การแจ้งเตือน</b><p>มีบุคลากรไม่พร้อมปฏิบัติงาน 3 รายการ</p><small>อัปเดตล่าสุดเมื่อ 09:42 น.</small></div><div v-if="showProfile" class="popover profile-popover"><b>{{ data.currentUser.name }}</b><p>{{ data.currentUser.role }}</p><button>ออกจากระบบ</button></div></header>

      <!-- 1. หน้าภาพรวม (Three-day Overview) ตามรูปแบบต้นฉบับ -->
      <div v-if="activeNav === 'ภาพรวม'" class="page-content overview-page">
        <section class="page-heading overview-heading"><div><p class="eyebrow">ศูนย์ควบคุมการปฏิบัติงาน / วันนี้</p><h1>ภาพรวมการเข้าเวร</h1><p class="heading-note">ตรวจสอบผู้ปฏิบัติหน้าที่เมื่อวาน วันนี้ และพรุ่งนี้ได้ในหน้าเดียว</p></div><button class="button button-secondary" @click="activeNav = 'ตารางเวร'">ดูตารางเวรทั้งหมด →</button></section>
        <section class="overview-status" aria-label="สถานะเวรวันนี้"><div><span class="live-dot"></span><span>สถานะกำลังพลวันนี้</span></div><strong>จัดเวรครบทั้ง 3 ตำแหน่ง</strong><small>อัปเดตล่าสุด 09:42 น.</small></section>
        <section class="overview-day-grid" aria-label="เวรเมื่อวาน วันนี้ และพรุ่งนี้">
          <article v-for="day in overviewDays" :key="day.isoDate" :class="['overview-day-card', { today: day.isToday }]">
            <header><div><span class="day-state">{{ day.label }}</span><h2>{{ day.dateLabel }}</h2></div><span v-if="day.isToday" class="today-badge">กำลังปฏิบัติหน้าที่</span><span v-else class="day-code">{{ day.schedule?.dayShort }}</span></header>
            <div v-if="day.schedule" class="overview-duty-list">
              <button type="button" @click="openPerson(day.schedule.md)"><span class="overview-role md-role">MD</span><span class="overview-person"><b>{{ normalizeRank(day.schedule.md) }}</b><small>Mission Director</small></span><span class="person-avatar md-avatar">{{ day.schedule.mdCode }}</span></button>
              <button type="button" @click="openPerson(day.schedule.fmo)"><span class="overview-role fmo-role">FMO</span><span class="overview-person"><b>{{ normalizeRank(day.schedule.fmo) }}</b><small>Flight &amp; Mission Ops.</small></span><span class="person-avatar fmo-avatar">{{ day.schedule.fmoCode }}</span></button>
              <button type="button" @click="openPerson(day.schedule.gso)"><span class="overview-role gso-role">GSO</span><span class="overview-person"><b>{{ normalizeRank(day.schedule.gso) }}</b><small>Ground Station Ops.</small></span><span class="person-avatar gso-avatar">{{ day.schedule.gsoCode }}</span></button>
            </div>
            <div v-else class="overview-empty"><span>—</span><b>ยังไม่มีข้อมูลเวร</b><small>เพิ่มข้อมูลได้จากหน้าตารางเวร</small></div>
            <footer><span>{{ day.schedule?.note || 'เวรปกติ' }}</span><button type="button" @click="day.schedule && (selectedRow = day.schedule)">ดูรายละเอียด</button></footer>
          </article>
        </section>
      </div>

      <!-- 2. หน้าสถิติ (Statistics Page) ตามรูปแบบต้นฉบับ -->
      <div v-else-if="activeNav === 'สถิติ'" class="page-content statistics-page">
        <section class="page-heading statistics-heading"><div><div class="statistics-kicker"><span></span> DUTY ANALYTICS</div><h1>สถิติการเข้าเวร</h1><p class="heading-note">ดูความถี่การปฏิบัติหน้าที่ของบุคลากรครบทั้ง MD, FMO และ GSO</p></div><div class="statistics-period-note"><span class="period-icon">◷</span><div><span>ช่วงข้อมูลที่กำลังแสดง</span><strong>{{ statisticPeriodLabel }}</strong></div></div></section>
        <section class="statistics-summary" aria-label="ภาพรวมสถิติ"><article><span class="summary-icon people-icon">♙</span><div><span>บุคลากรในรายการ</span><strong>{{ statisticSummary.personnel }}</strong><small>นาย</small></div></article><article><span class="summary-icon duty-icon">▤</span><div><span>จำนวนเวรรวม</span><strong>{{ statisticSummary.total }}</strong><small>ครั้ง</small></div></article><article><span class="summary-icon average-icon">≈</span><div><span>เฉลี่ยต่อบุคคล</span><strong>{{ statisticSummary.average }}</strong><small>ครั้ง</small></div></article><article class="summary-highlight"><span class="summary-icon peak-icon">↗</span><div><span>สูงสุดในช่วงนี้</span><strong>{{ statisticSummary.highest }}</strong><small>ครั้ง</small></div></article></section>
        <section class="statistics-panel">
          <div class="statistics-panel-head"><div><h2>ภาพรวมรายบุคคล</h2><p>{{ statisticRole === 'all' ? 'บุคลากรทุกคนสามารถหมุนเวียนปฏิบัติหน้าที่ได้ครบทั้ง 3 ตำแหน่ง' : `แสดงเฉพาะข้อมูลการปฏิบัติหน้าที่ตำแหน่ง ${statisticRoleLabel}` }}</p></div><span class="all-role-badge"><i></i> {{ statisticRole === 'all' ? 'ALL-ROLE READY' : `${statisticRoleLabel} ONLY` }}</span></div>
          <div class="statistics-toolbar"><div class="statistics-search"><span>⌕</span><input v-model="search" placeholder="ค้นหายศ ชื่อ หรือนามสกุล" aria-label="ค้นหาบุคลากรในหน้าสถิติ" /></div><div class="statistic-field" @click.stop @keydown.esc="showStatisticRoleMenu = false"><span>ตำแหน่งเวร</span><button class="modern-select-trigger" type="button" :aria-expanded="showStatisticRoleMenu" aria-controls="role-options" @click="showStatisticRoleMenu = !showStatisticRoleMenu; showStatisticPeriodMenu = false"><span><i :class="['select-role-dot', statisticRole]"></i>{{ statisticRoleLabel }}</span><b :class="{ open: showStatisticRoleMenu }">⌄</b></button><div v-if="showStatisticRoleMenu" id="role-options" class="modern-select-menu role-menu" role="listbox"><button v-for="option in [{ value: 'all', label: 'ทุกตำแหน่ง', detail: 'แสดงครบทั้ง 3 ตำแหน่ง' }, { value: 'md', label: 'MD', detail: 'Mission Director' }, { value: 'fmo', label: 'FMO', detail: 'Flight & Mission Ops.' }, { value: 'gso', label: 'GSO', detail: 'Ground Station Ops.' }]" :key="option.value" type="button" role="option" :aria-selected="statisticRole === option.value" :class="{ selected: statisticRole === option.value }" @click="selectStatisticRole(option.value as 'all' | DutyRole)"><i :class="['select-role-dot', option.value]"></i><span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small></span><em v-if="statisticRole === option.value">✓</em></button></div></div><div class="statistic-field" @click.stop @keydown.esc="showStatisticPeriodMenu = false"><span>ช่วงเวลา</span><button class="modern-select-trigger" type="button" :aria-expanded="showStatisticPeriodMenu" aria-controls="period-options" @click="showStatisticPeriodMenu = !showStatisticPeriodMenu; showStatisticRoleMenu = false"><span><i class="period-select-icon">◷</i>{{ statisticPeriodOptionLabel }}</span><b :class="{ open: showStatisticPeriodMenu }">⌄</b></button><div v-if="showStatisticPeriodMenu" id="period-options" class="modern-select-menu period-menu" role="listbox"><button v-for="period in [1, 2, 3]" :key="period" type="button" role="option" :aria-selected="statisticPeriod === period" :class="{ selected: statisticPeriod === period }" @click="selectStatisticPeriod(period as 1 | 2 | 3)"><span class="period-option-number">{{ period }}</span><span><strong>ย้อนหลัง {{ period }} เดือน</strong><small>{{ period === 1 ? 'ตุลาคม 2569' : period === 2 ? 'ก.ย. – ต.ค. 2569' : 'ส.ค. – ต.ค. 2569' }}</small></span><em v-if="statisticPeriod === period">✓</em></button></div></div></div>
          <div class="statistics-table-wrap"><table :class="['statistics-table', { 'single-role': statisticRole !== 'all' }]"><thead><tr><th class="row-number">ลำดับ</th><th>ยศ</th><th>ชื่อ</th><th>นามสกุล</th><th v-if="statisticRole === 'all' || statisticRole === 'md'" class="role-total md-total"><span>MD</span><small>Mission Director</small></th><th v-if="statisticRole === 'all' || statisticRole === 'fmo'" class="role-total fmo-total"><span>FMO</span><small>Flight &amp; Mission Ops.</small></th><th v-if="statisticRole === 'all' || statisticRole === 'gso'" class="role-total gso-total"><span>GSO</span><small>Ground Station Ops.</small></th><th v-if="statisticRole === 'all'" class="grand-total">รวม</th></tr></thead><tbody><tr v-for="(person, index) in statisticRows" :key="person.fullName"><td class="row-number">{{ String(index + 1).padStart(2, '0') }}</td><td class="rank-cell">{{ person.rank }}</td><td class="first-name-cell"><span class="stat-person-avatar">{{ personnelInitials(person.fullName) }}</span><strong>{{ person.firstName }}</strong></td><td>{{ person.lastName }}</td><td v-if="statisticRole === 'all' || statisticRole === 'md'" class="count-cell"><span :class="['count-pill', 'md-count', { zero: !person.md }]">{{ person.md }}</span></td><td v-if="statisticRole === 'all' || statisticRole === 'fmo'" class="count-cell"><span :class="['count-pill', 'fmo-count', { zero: !person.fmo }]">{{ person.fmo }}</span></td><td v-if="statisticRole === 'all' || statisticRole === 'gso'" class="count-cell"><span :class="['count-pill', 'gso-count', { zero: !person.gso }]">{{ person.gso }}</span></td><td v-if="statisticRole === 'all'" class="grand-total-cell"><strong>{{ person.total }}</strong><small>ครั้ง</small></td></tr></tbody></table><div v-if="!statisticRows.length" class="empty-table">ไม่พบข้อมูลบุคลากรตามตัวกรองที่เลือก</div></div>
          <div class="statistics-footer"><span>แสดง {{ statisticRows.length }} รายการ</span><div class="position-legend"><span v-if="statisticRole === 'all' || statisticRole === 'md'"><i class="md-dot"></i> MD</span><span v-if="statisticRole === 'all' || statisticRole === 'fmo'"><i class="fmo-dot"></i> FMO</span><span v-if="statisticRole === 'all' || statisticRole === 'gso'"><i class="gso-dot"></i> GSO</span></div><span>ข้อมูล ณ ตุลาคม 2569</span></div>
        </section>
      </div>

      <!-- 3. หน้าวันหยุด / วันลา / วันจำหน่าย -->
      <div v-else-if="activeNav === 'วันหยุด/วันลา/วันจำหน่าย'" class="page-content holiday-page-content">
        <HolidayView :personnelList="data?.personnel" />
      </div>

      <!-- 4. หน้าตารางเวร (Monthly Schedule) -->
      <div v-else class="page-content">
        <section class="page-heading"><div><p class="eyebrow">ศูนย์ควบคุมการปฏิบัติงาน / 01</p><h1>ตารางเวรปฏิบัติงาน</h1><p class="heading-note">จัดการและติดตามกำลังพลประจำเวรประจำเดือน</p></div><div class="heading-actions"><button class="button button-secondary">⇩ <span>ส่งออก</span></button><button class="button button-primary" @click="openDutyForm()">＋ เพิ่มเวร</button></div></section>
        <section class="metric-grid"><article class="metric-card"><span class="metric-icon blue">♙</span><div><small>บุคลากรทั้งหมด</small><strong>{{ data.summary.personnel }}</strong><p><b>+2</b> จากเดือนที่แล้ว</p></div></article><article class="metric-card"><span class="metric-icon amber">▤</span><div><small>เวรเดือนนี้</small><strong>{{ data.summary.duties }}</strong><p>จากทั้งหมด 31 วัน</p></div></article><article class="metric-card"><span class="metric-icon green">✓</span><div><small>กำลังพลพร้อมเวร</small><strong>{{ data.summary.personnel - data.summary.unavailable }}</strong><p><b>87.5%</b> ของกำลังพล</p></div></article><article class="metric-card alert-card"><span class="metric-icon red">!</span><div><small>ไม่พร้อมปฏิบัติงาน</small><strong>{{ data.summary.unavailable }}</strong><p class="alert-text">ต้องตรวจสอบ</p></div></article></section>
        <section class="schedule-panel"><div class="panel-heading"><div><div class="title-line"><h2>ตารางเวรประจำเดือน</h2><span class="status-badge"><i></i> อยู่ระหว่างตรวจสอบ</span></div><p>แสดงข้อมูลประจำเดือน {{ monthLabel }} · ข้อมูลล่าสุด 18 ก.ย. 2569, 09:42 น.</p></div><div class="month-switcher"><button aria-label="เดือนก่อนหน้า">‹</button><span>{{ monthLabel }}</span><button aria-label="เดือนถัดไป">›</button></div></div><div class="table-toolbar"><div class="toolbar-filters"><button :class="['filter-button', { active: dayFilter === 'all' }]" @click="dayFilter = 'all'">ดูทั้งหมด</button><button :class="['filter-button', { active: dayFilter === 'workday' }]" @click="dayFilter = 'workday'">วันทำงาน จ-ศ</button><button :class="['filter-button', { active: dayFilter === 'holiday' }]" @click="dayFilter = 'holiday'">วันหยุด / วันหยุดราชการ</button></div><div class="table-meta"><span class="legend-dot weekday"></span> วันปกติ <span class="legend-dot weekend"></span> วันหยุด <span class="legend-dot holiday"></span> วันหยุดราชการ</div></div>
          <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th class="day-column">วัน</th><th class="date-column">วันที่ / เดือน / ปี <span>↕</span></th><th class="role-header md-header"><span class="role-code">MD</span></th><th class="role-header fmo-header"><span class="role-code">FMO</span></th><th class="role-header gso-header"><span class="role-code">GSO</span></th><th class="note-column">หมายเหตุ</th></tr></thead><tbody><tr v-for="row in visibleSchedule" :key="row.date" :class="dayClass(row)" @click="selectedRow = row"><td class="day-cell"><span>{{ row.day }}</span><small>{{ row.dayShort }}</small></td><td class="date-cell"><span>{{ formatThaiDate(row.date) }}</span></td><td class="person-cell" @click.stop="openPerson(row.md)"><span class="person-avatar md-avatar">{{ row.mdCode }}</span><span>{{ shortPersonnelName(row.md) }}</span></td><td class="person-cell" @click.stop="openPerson(row.fmo)"><span class="person-avatar fmo-avatar">{{ row.fmoCode }}</span><span>{{ shortPersonnelName(row.fmo) }}</span></td><td class="person-cell" @click.stop="openPerson(row.gso)"><span class="person-avatar gso-avatar">{{ row.gsoCode }}</span><span>{{ shortPersonnelName(row.gso) }}</span></td><td class="note-cell"><span v-if="row.note" :class="{ holiday: row.note.includes('ราชการ') }">{{ row.note }}</span><span v-else class="empty-note">—</span></td></tr></tbody></table><div v-if="!visibleSchedule.length" class="empty-table">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div></div><div class="table-footer"><span>แสดง {{ visibleSchedule.length }} จาก 31 วัน</span><div class="pagination"><button>‹</button><button class="selected-page">1</button><button>2</button><button>3</button><span>...</span><button>4</button><button>›</button></div><span>หน้า 1 จาก 4</span></div></section>
      </div>
    </main>

    <!-- Modal รายละเอียดเวร -->
    <div v-if="selectedRow" class="modal-backdrop" @click.self="selectedRow = null"><section class="detail-modal"><button class="modal-close" @click="selectedRow = null">×</button><p class="eyebrow">รายละเอียดเวร</p><h2>{{ selectedRow.day }} {{ formatThaiDate(selectedRow.date) }}</h2><div class="detail-list"><div><span>MD</span><b>{{ shortPersonnelName(selectedRow.md) }}</b></div><div><span>FMO</span><b>{{ shortPersonnelName(selectedRow.fmo) }}</b></div><div><span>GSO</span><b>{{ shortPersonnelName(selectedRow.gso) }}</b></div><div><span>หมายเหตุ</span><b>{{ selectedRow.note || 'ไม่มีหมายเหตุ' }}</b></div></div><button class="button button-primary full-button" @click="openDutyForm(selectedRow)">แก้ไขรายละเอียด</button></section></div>

    <!-- Modal ข้อมูลบุคลากร -->
    <div v-if="selectedPerson" class="modal-backdrop" @click.self="selectedPerson = ''"><section class="person-modal"><button class="modal-close" @click="selectedPerson = ''">×</button><span class="large-person-avatar">{{ selectedPerson.split(' ').slice(-2).map((part) => part[0]).join('') }}</span><p class="eyebrow">บุคลากร</p><h2>{{ normalizeRank(selectedPerson) }}</h2><p>หน่วยปฏิบัติการดาวเทียม · พร้อมปฏิบัติงาน</p><div class="person-modal-stats"><span><b>6</b>เวรเดือนนี้</span><span><b>2</b> วันหยุด</span><span><b>MD</b> สิทธิ์ปฏิบัติการ</span></div></section></div>

    <!-- Modal เพิ่ม/แก้ไขเวร -->
    <div v-if="showDutyForm" class="modal-backdrop" @click.self="showDutyForm = false"><section class="duty-form-modal"><button class="modal-close" @click="showDutyForm = false">×</button><p class="eyebrow">ตารางเวร / เพิ่มหรือแก้ไข</p><h2>กำหนดผู้ปฏิบัติหน้าที่</h2><p class="form-range-note">แสดงและจัดเวรเฉพาะวันที่ 1 - 10 ตุลาคม 2569</p><label class="form-label">วันที่ปฏิบัติงาน</label><div class="calendar-picker"><div class="calendar-header"><button>‹</button><strong>ตุลาคม 2569</strong><button>›</button></div><div class="calendar-weekdays"><span>อา.</span><span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span></div><div class="calendar-grid"><button v-for="(date, index) in calendarDays" :key="date ?? `empty-${index}`" :disabled="!date" :class="{ selected: dutyDate === date, assigned: date && data.schedule.some((row) => row.date === date) }" @click="date && (dutyDate = date)">{{ date ? Number(date.slice(-2)) : '' }}</button></div></div><div class="assignment-grid"><div class="assignment-field"><label><span class="role-label md-label">MD</span> Mission Director</label><input v-model="personnelSearch.md" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyMd"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('md')" :key="`md-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label fmo-label">FMO</span> Flight &amp; Mission Ops.</label><input v-model="personnelSearch.fmo" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyFmo"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('fmo')" :key="`fmo-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label gso-label">GSO</span> Ground Station Ops.</label><input v-model="personnelSearch.gso" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyGso"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('gso')" :key="`gso-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div></div><label class="form-label note-label">หมายเหตุ</label><textarea v-model="dutyNote" rows="3" placeholder="เพิ่มหมายเหตุสำหรับวันนี้"></textarea><div class="form-actions"><button class="button button-secondary" @click="showDutyForm = false">ยกเลิก</button><button class="button button-primary" :disabled="!dutyMd || !dutyFmo || !dutyGso" @click="saveDuty">บันทึกเวร</button></div></section></div>
  </div>
  <div v-else class="loading-state"><span class="loader"></span> กำลังโหลดข้อมูลระบบ...</div>
</template>
