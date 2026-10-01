<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HolidayView from './components/HolidayView.vue'
// NOTE: ถอดการเชื่อมโยง getHolidayByDate ออกชั่วคราว เพื่อเว้นไว้ให้ dev ท่านอื่นเชื่อมต่อเอง
// import { getHolidayByDate } from './data/holidays'

type DutyRow = { date: string; day: string; dayShort: string; md: string; mdCode: string; fmo: string; fmoCode: string; gso: string; gsoCode: string; note: string }
type DashboardData = { currentUser: { name: string; role: string; initials: string }; summary: Record<string, number>; schedule: DutyRow[]; personnel: { name: string; roles: string }[] }

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
const monthLabel = 'ตุลาคม 2569'
const monthSchedule = computed<DutyRow[]>(() => {
  if (!data.value) return []
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  return Array.from({ length: 31 }, (_, index) => {
    const date = `2026-10-${String(index + 1).padStart(2, '0')}`
    const existing = data.value?.schedule.find((row) => row.date === date)
    if (existing) {
      return existing
    }
    const day = new Date(`${date}T00:00:00`).getDay()
    // TODO: สำหรับ Developer - สามารถเชื่อมโยงข้อมูลวันหยุดจากหน้าวันหยุด (เช่น getHolidayByDate) มาใส่ที่ note ได้ที่นี่
    return { 
      date, 
      day: dayNames[day], 
      dayShort: dayNames[day].slice(0, 2), 
      md: '', mdCode: '', 
      fmo: '', fmoCode: '', 
      gso: '', gsoCode: '', 
      note: '' 
    }
  })
})
const visibleSchedule = computed(() => {
  if (!data.value) return []
  const query = search.value.trim().toLowerCase()
  const filteredByDay = monthSchedule.value.filter((row) => {
    // กรองวันหยุดตามวันเสาร์-อาทิตย์ หรือข้อความหมายเหตุในตารางเวร (เว้นส่วนการเชื่อมข้อมูลวันหยุดไว้ให้ dev เชื่อมต่อเอง)
    // TODO: สำหรับ Developer - สามารถเชื่อมต่อข้อมูลวันหยุดเพิ่มเติมจากหน้าวันหยุดได้ที่นี่
    const isHolidayDate = ['เสาร์', 'อาทิตย์'].includes(row.day) || row.note.includes('ราชการ') || row.note.includes('วันหยุด')
    if (dayFilter.value === 'workday') return !isHolidayDate
    if (dayFilter.value === 'holiday') return isHolidayDate
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
  const rolePools = {
    md: [...new Set(dashboard.schedule.map((row) => row.md).filter(Boolean))],
    fmo: [...new Set(dashboard.schedule.map((row) => row.fmo).filter(Boolean))],
    gso: [...new Set(dashboard.schedule.map((row) => row.gso).filter(Boolean))],
  }
  const randomPerson = (pool: string[], excluded: string[]) => {
    const available = pool.filter((person) => !excluded.includes(person))
    return (available.length ? available : pool)[Math.floor(Math.random() * (available.length ? available : pool).length)]
  }
  for (let day = 11; day <= 31; day += 1) {
    const date = `2026-10-${String(day).padStart(2, '0')}`
    const existing = dashboard.schedule.find((row) => row.date === date)
    if (existing) continue
    const md = randomPerson(rolePools.md, [])
    const fmo = randomPerson(rolePools.fmo, [md])
    const gso = randomPerson(rolePools.gso, [md, fmo])
    const dateValue = new Date(`${date}T00:00:00`)
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    dashboard.schedule.push({ date, day: dayNames[dateValue.getDay()], dayShort: dayNames[dateValue.getDay()].slice(0, 2), md, mdCode: md.slice(0, 2), fmo, fmoCode: fmo.slice(0, 2), gso, gsoCode: gso.slice(0, 2), note: '' })
  }
  dashboard.schedule.sort((first, second) => first.date.localeCompare(second.date))
}
const setupDayFilters = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.toolbar-filters .filter-button'))
  const labels = ['ดูทั้งหมด', 'วันทำงาน จ-ศ', 'วันหยุด / วันหยุดราชการ']
  buttons.forEach((button, index) => {
    button.textContent = labels[index]
    button.onclick = () => {
      dayFilter.value = index === 0 ? 'all' : index === 1 ? 'workday' : 'holiday'
      buttons.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index))
    }
  })
  buttons[0]?.classList.add('active')
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
onMounted(async () => {
  const dashboard: DashboardData = await (await fetch('/data/mock-data.json')).json()
  fillRandomMonthData(dashboard)
  data.value = dashboard
  await nextTick()
  setupDayFilters()
})
</script>

<template>
  <div v-if="data" class="app-shell">
    <aside class="sidebar">
      <div class="brand-lockup"><div class="brand-mark"><span>✦</span></div><div><p class="brand-title">SATOPS</p><p class="brand-subtitle">DUTY CONTROL</p></div></div>
      <div class="sidebar-section-label">เมนูหลัก</div>
      <nav class="main-nav" aria-label="เมนูหลัก"><button v-for="item in ['ภาพรวม', 'ตารางเวร', 'บุคลากร', 'วันหยุด/วันลา/วันจำหน่าย', 'สถิติ']" :key="item" :class="['nav-item', { active: activeNav === item }]" @click="activeNav = item"><span class="nav-icon">{{ { 'ภาพรวม': '⌂', 'ตารางเวร': '▤', 'บุคลากร': '♙', 'วันหยุด/วันลา/วันจำหน่าย': '📅', 'สถิติ': '▥' }[item] }}</span>{{ item }}</button></nav>
      <div class="sidebar-section-label system-label">ระบบ</div>
      <nav class="main-nav"><button v-for="item in ['ประวัติการแก้ไข', 'ผู้ใช้งาน', 'ตั้งค่า']" :key="item" :class="['nav-item', { active: activeNav === item }]" @click="activeNav = item"><span class="nav-icon">{{ { 'ประวัติการแก้ไข': '⌁', 'ผู้ใช้งาน': '♧', 'ตั้งค่า': '⚙' }[item] }}</span>{{ item }}</button></nav>
      <div class="sidebar-footer"><div class="secure-indicator"><span></span> ระบบปฏิบัติการปกติ</div><div class="sidebar-version">SATOPS v1.0.0 · DEMO DATA</div></div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div class="breadcrumb"><span>ระบบบริหารจัดการเวร</span><b>/</b><strong>{{ activeNav }}</strong></div><div class="topbar-actions"><div class="top-search"><span>⌕</span><input v-model="search" placeholder="ค้นหาบุคลากร, วันที่..." aria-label="ค้นหา" /><kbd>⌘ K</kbd></div><button class="icon-button notification-button" aria-label="การแจ้งเตือน" @click="showNotifications = !showNotifications">♢<i></i></button><button class="profile-chip" @click="showProfile = !showProfile"><span class="avatar">{{ data.currentUser.initials }}</span><span><b>{{ data.currentUser.name }}</b><small>{{ data.currentUser.role }}</small></span><em>⌄</em></button></div><div v-if="showNotifications" class="popover notification-popover"><b>การแจ้งเตือน</b><p>มีบุคลากรไม่พร้อมปฏิบัติงาน 3 รายการ</p><small>อัปเดตล่าสุดเมื่อ 09:42 น.</small></div><div v-if="showProfile" class="popover profile-popover"><b>{{ data.currentUser.name }}</b><p>{{ data.currentUser.role }}</p><button>ออกจากระบบ</button></div></header>
      <div class="page-content">
        <!-- หน้าวันหยุด / วันลา / วันจำหน่าย (เชื่อมโยงรายชื่อบุคลากร - รอเชื่อม API/Store) -->
        <HolidayView 
          v-if="activeNav === 'วันหยุด/วันลา/วันจำหน่าย'" 
          :personnelList="data?.personnel" 
        />

        <template v-else>
          <section class="page-heading"><div><p class="eyebrow">ศูนย์ควบคุมการปฏิบัติงาน / 01</p><h1>ตารางเวรปฏิบัติงาน</h1><p class="heading-note">จัดการและติดตามกำลังพลประจำเวรประจำเดือน</p></div><div class="heading-actions"><button class="button button-secondary">⇩ <span>ส่งออก</span></button><button class="button button-primary" @click="openDutyForm()">＋ เพิ่มเวร</button></div></section>
          <section class="metric-grid"><article class="metric-card"><span class="metric-icon blue">♙</span><div><small>บุคลากรทั้งหมด</small><strong>{{ data.summary.personnel }}</strong><p><b>+2</b> จากเดือนที่แล้ว</p></div></article><article class="metric-card"><span class="metric-icon amber">▤</span><div><small>เวรเดือนนี้</small><strong>{{ data.summary.duties }}</strong><p>จากทั้งหมด 31 วัน</p></div></article><article class="metric-card"><span class="metric-icon green">✓</span><div><small>กำลังพลพร้อมเวร</small><strong>{{ data.summary.personnel - data.summary.unavailable }}</strong><p><b>87.5%</b> ของกำลังพล</p></div></article><article class="metric-card alert-card"><span class="metric-icon red">!</span><div><small>ไม่พร้อมปฏิบัติงาน</small><strong>{{ data.summary.unavailable }}</strong><p class="alert-text">ต้องตรวจสอบ</p></div></article></section>
          <section class="schedule-panel"><div class="panel-heading"><div><div class="title-line"><h2>ตารางเวรประจำเดือน</h2><span class="status-badge"><i></i> อยู่ระหว่างตรวจสอบ</span></div><p>แสดงข้อมูลประจำเดือน {{ monthLabel }} · ข้อมูลล่าสุด 18 ก.ย. 2569, 09:42 น.</p></div><div class="month-switcher"><button aria-label="เดือนก่อนหน้า">‹</button><span>{{ monthLabel }}</span><button aria-label="เดือนถัดไป">›</button></div></div><div class="table-toolbar"><div class="toolbar-filters"><button :class="['filter-button', { active: dayFilter === 'all' }]" @click="dayFilter = 'all'">ดูทั้งหมด</button><button :class="['filter-button', { active: dayFilter === 'workday' }]" @click="dayFilter = 'workday'">วันทำงาน จ-ศ</button><button :class="['filter-button', { active: dayFilter === 'holiday' }]" @click="dayFilter = 'holiday'">วันหยุด / วันหยุดราชการ</button></div><div class="table-meta"><span class="legend-dot weekday"></span> วันปกติ <span class="legend-dot weekend"></span> วันหยุด <span class="legend-dot holiday"></span> วันหยุดราชการ</div></div>
            <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th class="day-column">วัน</th><th class="date-column">วันที่ / เดือน / ปี <span>↕</span></th><th class="role-header md-header"><span class="role-code">MD</span></th><th class="role-header fmo-header"><span class="role-code">FMO</span></th><th class="role-header gso-header"><span class="role-code">GSO</span></th><th class="note-column">หมายเหตุ</th></tr></thead><tbody><tr v-for="row in visibleSchedule" :key="row.date" :class="dayClass(row)" @click="selectedRow = row"><td class="day-cell"><span>{{ row.day }}</span><small>{{ row.dayShort }}</small></td><td class="date-cell"><span>{{ formatThaiDate(row.date) }}</span></td><td class="person-cell" @click.stop="openPerson(row.md)"><span class="person-avatar md-avatar">{{ row.mdCode }}</span><span>{{ shortPersonnelName(row.md) }}</span></td><td class="person-cell" @click.stop="openPerson(row.fmo)"><span class="person-avatar fmo-avatar">{{ row.fmoCode }}</span><span>{{ shortPersonnelName(row.fmo) }}</span></td><td class="person-cell" @click.stop="openPerson(row.gso)"><span class="person-avatar gso-avatar">{{ row.gsoCode }}</span><span>{{ shortPersonnelName(row.gso) }}</span></td><td class="note-cell"><span v-if="row.note" :class="{ holiday: row.note.includes('ราชการ') }">{{ row.note }}</span><span v-else class="empty-note">—</span></td></tr></tbody></table><div v-if="!visibleSchedule.length" class="empty-table">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div></div><div class="table-footer"><span>แสดง {{ visibleSchedule.length }} จาก 31 วัน</span><div class="pagination"><button>‹</button><button class="selected-page">1</button><button>2</button><button>3</button><span>...</span><button>4</button><button>›</button></div><span>หน้า 1 จาก 4</span></div></section>
        </template>
      </div>
    </main>
    <div v-if="selectedRow" class="modal-backdrop" @click.self="selectedRow = null"><section class="detail-modal"><button class="modal-close" @click="selectedRow = null">×</button><p class="eyebrow">รายละเอียดเวร</p><h2>{{ selectedRow.day }} {{ formatThaiDate(selectedRow.date) }}</h2><div class="detail-list"><div><span>MD</span><b>{{ shortPersonnelName(selectedRow.md) }}</b></div><div><span>FMO</span><b>{{ shortPersonnelName(selectedRow.fmo) }}</b></div><div><span>GSO</span><b>{{ shortPersonnelName(selectedRow.gso) }}</b></div><div><span>หมายเหตุ</span><b>{{ selectedRow.note || 'ไม่มีหมายเหตุ' }}</b></div></div><button class="button button-primary full-button" @click="openDutyForm(selectedRow)">แก้ไขรายละเอียด</button></section></div>
    <div v-if="selectedPerson" class="modal-backdrop" @click.self="selectedPerson = ''"><section class="person-modal"><button class="modal-close" @click="selectedPerson = ''">×</button><span class="large-person-avatar">{{ selectedPerson.split(' ').slice(-2).map((part) => part[0]).join('') }}</span><p class="eyebrow">บุคลากร</p><h2>{{ normalizeRank(selectedPerson) }}</h2><p>หน่วยปฏิบัติการดาวเทียม · พร้อมปฏิบัติงาน</p><div class="person-modal-stats"><span><b>6</b>เวรเดือนนี้</span><span><b>2</b> วันหยุด</span><span><b>MD</b> สิทธิ์ปฏิบัติการ</span></div></section></div>
    <div v-if="showDutyForm" class="modal-backdrop" @click.self="showDutyForm = false"><section class="duty-form-modal"><button class="modal-close" @click="showDutyForm = false">×</button><p class="eyebrow">ตารางเวร / เพิ่มหรือแก้ไข</p><h2>กำหนดผู้ปฏิบัติหน้าที่</h2><p class="form-range-note">แสดงและจัดเวรเฉพาะวันที่ 1 - 10 ตุลาคม 2569</p><label class="form-label">วันที่ปฏิบัติงาน</label><div class="calendar-picker"><div class="calendar-header"><button>‹</button><strong>ตุลาคม 2569</strong><button>›</button></div><div class="calendar-weekdays"><span>อา.</span><span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span></div><div class="calendar-grid"><button v-for="(date, index) in calendarDays" :key="date ?? `empty-${index}`" :disabled="!date" :class="{ selected: dutyDate === date, assigned: date && data.schedule.some((row) => row.date === date) }" @click="date && (dutyDate = date)">{{ date ? Number(date.slice(-2)) : '' }}</button></div></div><div class="assignment-grid"><div class="assignment-field"><label><span class="role-label md-label">MD</span> Mission Director</label><input v-model="personnelSearch.md" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyMd"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('md')" :key="`md-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label fmo-label">FMO</span> Flight &amp; Mission Ops.</label><input v-model="personnelSearch.fmo" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyFmo"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('fmo')" :key="`fmo-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label gso-label">GSO</span> Ground Station Ops.</label><input v-model="personnelSearch.gso" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyGso"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('gso')" :key="`gso-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div></div><label class="form-label note-label">หมายเหตุ</label><textarea v-model="dutyNote" rows="3" placeholder="เพิ่มหมายเหตุสำหรับวันนี้"></textarea><div class="form-actions"><button class="button button-secondary" @click="showDutyForm = false">ยกเลิก</button><button class="button button-primary" :disabled="!dutyMd || !dutyFmo || !dutyGso" @click="saveDuty">บันทึกเวร</button></div></section></div>
  </div>
  <div v-else class="loading-state"><span class="loader"></span> กำลังโหลดข้อมูลระบบ...</div>
</template>
