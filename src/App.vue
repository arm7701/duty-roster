<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HolidayView from './components/HolidayView.vue'
import PersonnelView from './components/PersonnelView.vue'
import { personnelService, formatFullName } from './services/personnelService'
import * as XLSX from 'xlsx'

type DutyRow = { date: string; day: string; dayShort: string; md: string; mdCode: string; fmo: string; fmoCode: string; gso: string; gsoCode: string; note: string }
type DashboardData = { currentUser: { name: string; role: string; initials: string }; summary: Record<string, number>; schedule: DutyRow[]; personnel: { name: string; roles: string }[] }
type DutyRole = 'md' | 'fmo' | 'gso'
type StatisticRow = { fullName: string; rank: string; firstName: string; lastName: string; md: number; fmo: number; gso: number; total: number }

interface ParsedImportRow {
  date: string
  day: string
  dayShort: string
  md: string
  fmo: string
  gso: string
  isValid: boolean
  error?: string
}

const data = ref<DashboardData | null>(null)
const activeNav = ref('ตารางเวร')
const activePersonnelId = ref<number | null>(null)
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
  md: 'น.อ. กิตติพงษ์ ตัวอย่าง',
  mdCode: 'กต',
  fmo: 'ร.อ. ปาริชาติ ตัวอย่าง',
  fmoCode: 'ปต',
  gso: 'จ.อ. ศุภชัย ตัวอย่าง',
  gsoCode: 'ศต',
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
const selectedPersonProfile = computed(() => {
  if (!selectedPerson.value) return null
  return personnelService.getPersonByName(selectedPerson.value)
})
const goToPersonnelPage = (personId: number) => {
  activePersonnelId.value = personId
  activeNav.value = 'บุคลากร'
  selectedPerson.value = ''
}

const calendarDays = computed<(string | null)[]>(() => {
  const firstDayOffset = new Date(calendarYear.value, calendarMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear.value, calendarMonth.value, 0).getDate()
  return [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => `${calendarYear.value}-${String(calendarMonth.value).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)]
})

const personnelList = computed(() => personnelService.getPersonnel())
const personnelNames = computed(() => {
  const fromService = personnelList.value.map((p) => formatFullName(p))
  if (fromService.length) return fromService
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

const statisticRows = computed<StatisticRow[]>(() => {
  const totals = new Map<string, StatisticRow>()
  const allPeople = personnelList.value

  for (const person of allPeople) {
    const fullName = formatFullName(person)
    totals.set(fullName, {
      fullName,
      rank: person.rank,
      firstName: person.firstname,
      lastName: person.lastname,
      md: 0,
      fmo: 0,
      gso: 0,
      total: 0
    })
  }

  // นับจากตารางเวรเดือนตุลาคม 2569
  const currentMonthRows = data.value?.schedule.filter((row) => row.date.startsWith('2026-10-')) ?? []
  for (const row of currentMonthRows) {
    for (const role of ['md', 'fmo', 'gso'] as DutyRole[]) {
      const officer = row[role]
      if (!officer) continue
      let foundRow = totals.get(officer)
      if (!foundRow) {
        for (const val of totals.values()) {
          if (officer.includes(val.firstName)) {
            foundRow = val
            break
          }
        }
      }
      if (foundRow) {
        foundRow[role] += 1
        foundRow.total += 1
      }
    }
  }

  // หากเลือกดูย้อนหลัง 2 หรือ 3 เดือน ให้นับจากประวัติการเข้าเวรในอดีต (ส.ค. - ก.ย. 2569)
  if (statisticPeriod.value > 1) {
    const startDate = statisticPeriod.value === 2 ? '2026-09-01' : '2026-08-01'
    const endDate = '2026-09-30'
    for (const person of allPeople) {
      const hist = personnelService.getDutyHistory(person.id, { start: startDate, end: endDate, pageSize: 100 })
      const targetRow = totals.get(formatFullName(person))
      if (targetRow) {
        for (const record of hist.data) {
          const roleKey = record.duty.toLowerCase() as DutyRole
          if (roleKey === 'md' || roleKey === 'fmo' || roleKey === 'gso') {
            targetRow[roleKey] += 1
            targetRow.total += 1
          }
        }
      }
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
    existing.mdCode = generatePersonCode(dutyMd.value)
    existing.fmoCode = generatePersonCode(dutyFmo.value)
    existing.gsoCode = generatePersonCode(dutyGso.value)
  } else {
    const date = new Date(`${dutyDate.value}T00:00:00`)
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    data.value.schedule.push({
      date: dutyDate.value,
      day: dayNames[date.getDay()],
      dayShort: dayNames[date.getDay()].slice(0, 2),
      md: dutyMd.value,
      mdCode: generatePersonCode(dutyMd.value),
      fmo: dutyFmo.value,
      fmoCode: generatePersonCode(dutyFmo.value),
      gso: dutyGso.value,
      gsoCode: generatePersonCode(dutyGso.value),
      note: dutyNote.value
    })
    data.value.schedule.sort((a, b) => a.date.localeCompare(b.date))
  }
  try {
    localStorage.setItem('satops_custom_schedule', JSON.stringify(data.value.schedule))
  } catch (e) {}
  showDutyForm.value = false
}

// -------------------------------------------------------------
// ระบบนำเข้าไฟล์ Excel (Import Excel Schedule) 4 ช่องตายตัว
// -------------------------------------------------------------
const showImportModal = ref(false)
const importFileName = ref('')
const importRows = ref<ParsedImportRow[]>([])
const importError = ref('')
const isDragging = ref(false)
const overwriteExisting = ref(true)
const excelFileInput = ref<HTMLInputElement | null>(null)
const toastMessage = ref('')
let toastTimeout: any = null

const showToast = (msg: string) => {
  toastMessage.value = msg
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const validImportRows = computed(() => importRows.value.filter((r) => r.isValid))
const invalidImportRows = computed(() => importRows.value.filter((r) => !r.isValid))

const openImportModal = () => {
  importFileName.value = ''
  importRows.value = []
  importError.value = ''
  isDragging.value = false
  overwriteExisting.value = true
  showImportModal.value = true
}

const triggerFileInput = () => {
  excelFileInput.value?.click()
}

const handleFileInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processExcelFile(file)
  }
  target.value = ''
}

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    processExcelFile(file)
  }
}

const parseDateToIso = (raw: any): string | null => {
  if (raw === null || raw === undefined || raw === '') return null

  if (typeof raw === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(raw)
    if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
      let y = dateObj.y
      if (y > 2400) y -= 543
      return `${y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`
    }
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    let y = raw.getFullYear()
    if (y > 2400) y -= 543
    return `${y}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`
  }

  const str = String(raw).trim()
  if (!str) return null

  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    let y = parseInt(isoMatch[1], 10)
    if (y > 2400) y -= 543
    const m = parseInt(isoMatch[2], 10)
    const d = parseInt(isoMatch[3], 10)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10)
    let y = parseInt(dmyMatch[3], 10)
    if (y > 2400) y -= 543
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const thaiMonths: Record<string, number> = {
    'ม.ค.': 1, 'มกราคม': 1,
    'ก.พ.': 2, 'กุมภาพันธ์': 2,
    'มี.ค.': 3, 'มีนาคม': 3,
    'เม.ย.': 4, 'เมษายน': 4,
    'พ.ค.': 5, 'พฤษภาคม': 5,
    'มิ.ย.': 6, 'มิถุนายน': 6,
    'ก.ค.': 7, 'กรกฎาคม': 7,
    'ส.ค.': 8, 'สิงหาคม': 8,
    'ก.ย.': 9, 'กันยายน': 9,
    'ต.ค.': 10, 'ตุลาคม': 10,
    'พ.ย.': 11, 'พฤศจิกายน': 11,
    'ธ.ค.': 12, 'ธันวาคม': 12
  }
  for (const [thMonth, mNum] of Object.entries(thaiMonths)) {
    if (str.includes(thMonth)) {
      const parts = str.split(/\s+/)
      const dayNum = parseInt(parts[0], 10)
      const yearPart = parts[parts.length - 1]
      let yearNum = parseInt(yearPart, 10)
      if (yearNum > 2400) yearNum -= 543
      if (!isNaN(dayNum) && !isNaN(yearNum)) {
        return `${yearNum}-${String(mNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      }
    }
  }

  return null
}

const getDayNames = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00`)
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const day = dayNames[d.getDay()] || ''
  return { day, dayShort: day.slice(0, 2) }
}

const generatePersonCode = (name: string): string => {
  if (!name) return ''
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const first = parts[1] || ''
    const last = parts[parts.length - 1] || ''
    return `${first.charAt(0)}${last.charAt(0)}`
  }
  return trimmed.slice(0, 2)
}

const processExcelFile = async (file: File) => {
  importError.value = ''
  importRows.value = []
  importFileName.value = file.name

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
    if (!workbook.SheetNames.length) {
      importError.value = 'ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel นี้'
      return
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][]
    if (!rawData.length) {
      importError.value = 'ไฟล์ไม่มีข้อมูล'
      return
    }

    let headerRowIndex = -1
    const colMap = { date: 0, md: 1, fmo: 2, gso: 3 }

    for (let r = 0; r < Math.min(rawData.length, 5); r++) {
      const row = rawData[r]
      if (!Array.isArray(row)) continue
      const strRow = row.map((c) => String(c).trim().toLowerCase())

      const hasDate = strRow.some((c) => c.includes('วัน') || c.includes('date'))
      const hasMd = strRow.some((c) => c.includes('md'))
      const hasFmo = strRow.some((c) => c.includes('fmo'))
      const hasGso = strRow.some((c) => c.includes('gso'))

      if (hasDate || (hasMd && hasFmo && hasGso)) {
        headerRowIndex = r
        strRow.forEach((c, idx) => {
          if (c.includes('วัน') || c.includes('date')) colMap.date = idx
          else if (c.includes('md')) colMap.md = idx
          else if (c.includes('fmo')) colMap.fmo = idx
          else if (c.includes('gso')) colMap.gso = idx
        })
        break
      }
    }

    const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0
    const parsedList: ParsedImportRow[] = []

    for (let r = startIndex; r < rawData.length; r++) {
      const row = rawData[r]
      if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
        continue
      }

      const rawDate = row[colMap.date]
      const rawMd = String(row[colMap.md] ?? '').trim()
      const rawFmo = String(row[colMap.fmo] ?? '').trim()
      const rawGso = String(row[colMap.gso] ?? '').trim()

      const isoDate = parseDateToIso(rawDate)
      if (!isoDate) {
        parsedList.push({
          date: String(rawDate || `แถวที่ ${r + 1}`),
          day: '—',
          dayShort: '—',
          md: rawMd,
          fmo: rawFmo,
          gso: rawGso,
          isValid: false,
          error: 'รูปแบบวันที่ไม่ถูกต้อง'
        })
        continue
      }

      const { day, dayShort } = getDayNames(isoDate)
      const hasPersonnel = rawMd || rawFmo || rawGso
      parsedList.push({
        date: isoDate,
        day,
        dayShort,
        md: rawMd,
        fmo: rawFmo,
        gso: rawGso,
        isValid: true,
        error: !hasPersonnel ? 'ไม่มีรายชื่อผู้เข้าเวร' : undefined
      })
    }

    if (!parsedList.length) {
      importError.value = 'ไม่พบข้อมูลตารางเวรในไฟล์ที่เลือก'
      return
    }

    importRows.value = parsedList
  } catch (err: any) {
    console.error('Error parsing excel file', err)
    importError.value = `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err?.message || 'ไฟล์อาจไม่ถูกต้อง'}`
  }
}

const confirmImport = () => {
  if (!data.value) return
  const validRows = importRows.value.filter((r) => r.isValid)
  if (!validRows.length) return

  let addedCount = 0
  let updatedCount = 0

  validRows.forEach((r) => {
    const existing = data.value!.schedule.find((s) => s.date === r.date)
    if (existing) {
      if (overwriteExisting.value) {
        if (r.md) { existing.md = r.md; existing.mdCode = generatePersonCode(r.md) }
        if (r.fmo) { existing.fmo = r.fmo; existing.fmoCode = generatePersonCode(r.fmo) }
        if (r.gso) { existing.gso = r.gso; existing.gsoCode = generatePersonCode(r.gso) }
        updatedCount++
      }
    } else {
      data.value!.schedule.push({
        date: r.date,
        day: r.day,
        dayShort: r.dayShort,
        md: r.md,
        mdCode: generatePersonCode(r.md),
        fmo: r.fmo,
        fmoCode: generatePersonCode(r.fmo),
        gso: r.gso,
        gsoCode: generatePersonCode(r.gso),
        note: ''
      })
      addedCount++
    }
  })

  data.value.schedule.sort((a, b) => a.date.localeCompare(b.date))

  const octDuties = data.value.schedule.filter((s) => s.date.startsWith('2026-10-')).length
  if (octDuties > 0) {
    data.value.summary.duties = octDuties
  }

  try {
    localStorage.setItem('satops_custom_schedule', JSON.stringify(data.value.schedule))
  } catch (e) {
    console.error('LocalStorage save error', e)
  }

  const totalProcessed = addedCount + updatedCount
  showToast(`นำเข้าตารางเวรสำเร็จ ${totalProcessed} วัน (เพิ่มใหม่ ${addedCount}, อัปเดต ${updatedCount})`)
  showImportModal.value = false
}

// -------------------------------------------------------------
// ระบบส่งออกไฟล์ Excel (Export Excel Schedule) รายเดือน / รายสัปดาห์
// -------------------------------------------------------------
interface WeekOption {
  index: number
  label: string
  startDate: string
  endDate: string
  count: number
}

const showExportModal = ref(false)
const exportScope = ref<'month' | 'week'>('month')
const exportSelectedMonth = ref('2026-10')
const exportSelectedWeekIndex = ref(0)

const openExportModal = () => {
  exportScope.value = 'month'
  exportSelectedMonth.value = `${calendarYear.value}-${String(calendarMonth.value).padStart(2, '0')}`
  exportSelectedWeekIndex.value = 0
  showExportModal.value = true
}

const availableWeeks = computed<WeekOption[]>(() => {
  if (!exportSelectedMonth.value) return []
  const [yearStr, monthStr] = exportSelectedMonth.value.split('-')
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const daysInMonth = new Date(y, m, 0).getDate()

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const thMonthName = thaiMonths[m - 1]
  const thYear = y + 543

  const weeks: WeekOption[] = []
  const weekRanges = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: 28 },
    { start: 29, end: daysInMonth }
  ]

  weekRanges.forEach((range, idx) => {
    if (range.start > daysInMonth) return
    const endDay = Math.min(range.end, daysInMonth)
    const startDate = `${y}-${String(m).padStart(2, '0')}-${String(range.start).padStart(2, '0')}`
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

    const count = data.value?.schedule.filter(
      (s) => s.date >= startDate && s.date <= endDate
    ).length ?? (endDay - range.start + 1)

    weeks.push({
      index: idx,
      label: `สัปดาห์ที่ ${idx + 1} (${range.start} – ${endDay} ${thMonthName} ${thYear})`,
      startDate,
      endDate,
      count
    })
  })

  return weeks
})

const rowsToExport = computed<DutyRow[]>(() => {
  if (!data.value) return []

  if (exportScope.value === 'month') {
    const prefix = exportSelectedMonth.value
    return data.value.schedule.filter((row) => row.date.startsWith(prefix))
  }

  if (exportScope.value === 'week') {
    const currentWeek = availableWeeks.value[exportSelectedWeekIndex.value]
    if (!currentWeek) return []
    return data.value.schedule.filter(
      (row) => row.date >= currentWeek.startDate && row.date <= currentWeek.endDate
    )
  }

  return data.value.schedule
})

const exportFileName = computed(() => {
  const [yearStr, monthStr] = exportSelectedMonth.value.split('-')
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthStr, 10)
  const fullThaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  const mName = fullThaiMonths[m - 1]
  const thYear = y + 543

  if (exportScope.value === 'month') {
    return `ตารางเวร_SATOPS_${mName}_${thYear}.xlsx`
  }

  if (exportScope.value === 'week') {
    const weekNum = exportSelectedWeekIndex.value + 1
    const currentWeek = availableWeeks.value[exportSelectedWeekIndex.value]
    const rangeTag = currentWeek ? `_${currentWeek.startDate.slice(-2)}-${currentWeek.endDate.slice(-2)}` : ''
    return `ตารางเวร_SATOPS_สัปดาห์ที่${weekNum}${rangeTag}_${mName}_${thYear}.xlsx`
  }

  return `ตารางเวร_SATOPS_${exportSelectedMonth.value}.xlsx`
})

const executeExportExcel = () => {
  const rows = rowsToExport.value
  if (!rows.length) {
    showToast('⚠️ ไม่พบข้อมูลตารางเวรในช่วงเวลาที่เลือก')
    return
  }

  const exportData = rows.map((row, index) => ({
    'ลำดับ': index + 1,
    'วันที่': row.date,
    'วัน': row.day,
    'MD (Mission Director)': row.md,
    'FMO (Flight Ops.)': row.fmo,
    'GSO (Ground Station)': row.gso,
    'หมายเหตุ': row.note || ''
  }))

  const ws = XLSX.utils.json_to_sheet(exportData)
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 16 }, // วันที่
    { wch: 12 }, // วัน
    { wch: 30 }, // MD
    { wch: 30 }, // FMO
    { wch: 30 }, // GSO
    { wch: 22 }  // หมายเหตุ
  ]

  const wb = XLSX.utils.book_new()
  const sheetTitle = exportScope.value === 'week' ? `สัปดาห์ที่ ${exportSelectedWeekIndex.value + 1}` : 'ตารางเวร'
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle)

  const filename = exportFileName.value
  XLSX.writeFile(wb, filename)

  showToast(`ส่งออกไฟล์ ${filename} สำเร็จ (${rows.length} รายการ)`)
  showExportModal.value = false
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

  try {
    const saved = localStorage.getItem('satops_custom_schedule')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasOldMock = parsed.some(
          (r: DutyRow) => r.md?.includes('วิชัย') || r.md?.includes('ณรงค์ฤทธิ์')
        )
        if (!hasOldMock) {
          dashboard.schedule = parsed
        } else {
          localStorage.setItem('satops_custom_schedule', JSON.stringify(dashboard.schedule))
        }
      }
    } else {
      localStorage.setItem('satops_custom_schedule', JSON.stringify(dashboard.schedule))
    }
  } catch (e) {
    console.error('Error loading saved schedule from localStorage', e)
  }

  // ซิงค์บุคลากรจริงจาก personnelService
  dashboard.summary.personnel = personnelService.getPersonnel().length
  dashboard.personnel = personnelService.getPersonnel().map((p) => ({
    name: formatFullName(p),
    roles: p.position
  }))

  data.value = dashboard
})
</script>

<template>
  <div v-if="data" class="app-shell" @click="showStatisticRoleMenu = false; showStatisticPeriodMenu = false">
    <aside class="sidebar">
      <div class="brand-lockup"><div class="brand-mark"><span>✦</span></div><div><p class="brand-title">SATOPS</p><p class="brand-subtitle">DUTY CONTROL</p></div></div>
      <div class="sidebar-section-label">เมนูหลัก</div>
      <nav class="main-nav" aria-label="เมนูหลัก"><button v-for="item in ['ภาพรวม', 'ตารางเวร', 'บุคลากร', 'วันหยุด/วันลา/วันจำหน่าย', 'สถิติ']" :key="item" :class="['nav-item', { active: activeNav === item }]" @click="activeNav = item"><span class="nav-icon">{{ { 'ภาพรวม': '⌂', 'ตารางเวร': '▤', 'บุคลากร': '♙', 'วันหยุด/วันลา/วันจำหน่าย': '📅', 'สถิติ': '▥' }[item] }}</span>{{ item }}</button></nav>
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

      <!-- 3. หน้าบุคลากร (Personnel Page) -->
      <div v-else-if="activeNav === 'บุคลากร'" class="page-content personnel-page">
        <PersonnelView :initialPersonId="activePersonnelId" />
      </div>

      <!-- 4. หน้าวันหยุด / วันลา / วันจำหน่าย -->
      <div v-else-if="activeNav === 'วันหยุด/วันลา/วันจำหน่าย'" class="page-content holiday-page-content">
        <HolidayView
          :schedule="data?.schedule"
          :personnelList="personnelList.map(p => ({ name: formatFullName(p), division: p.unit, roles: p.position }))"
        />
      </div>

      <!-- 5. หน้าตารางเวร (Monthly Schedule) -->
      <div v-else class="page-content">
        <section class="page-heading">
          <div>
            <p class="eyebrow">ศูนย์ควบคุมการปฏิบัติงาน / 01</p>
            <h1>ตารางเวรปฏิบัติงาน</h1>
            <p class="heading-note">จัดการและติดตามกำลังพลประจำเวรประจำเดือน</p>
          </div>
          <div class="heading-actions">
            <button class="button button-export" @click="openExportModal">⇩ <span>Export ตารางเวร</span></button>
            <button class="button button-import" @click="openImportModal">⇧ <span>Import ตารางเวร</span></button>
            <button class="button button-primary" @click="openDutyForm()">＋ เพิ่มเวร</button>
          </div>
        </section>
        <section class="metric-grid"><article class="metric-card"><span class="metric-icon blue">♙</span><div><small>บุคลากรทั้งหมด</small><strong>{{ personnelList.length }}</strong><p>กำลังพลในระบบ</p></div></article><article class="metric-card"><span class="metric-icon amber">▤</span><div><small>เวรเดือนนี้</small><strong>{{ data.summary.duties }}</strong><p>จากทั้งหมด 31 วัน</p></div></article><article class="metric-card"><span class="metric-icon green">✓</span><div><small>กำลังพลพร้อมเวร</small><strong>{{ personnelList.length }}</strong><p><b>100%</b> พร้อมปฏิบัติงาน</p></div></article><article class="metric-card alert-card"><span class="metric-icon red">!</span><div><small>ไม่พร้อมปฏิบัติงาน</small><strong>0</strong><p class="alert-text">ไม่มีรายงานการลา</p></div></article></section>
        <section class="schedule-panel"><div class="panel-heading"><div><div class="title-line"><h2>ตารางเวรประจำเดือน</h2><span class="status-badge"><i></i> อยู่ระหว่างตรวจสอบ</span></div><p>แสดงข้อมูลประจำเดือน {{ monthLabel }} · ข้อมูลล่าสุด 18 ก.ย. 2569, 09:42 น.</p></div><div class="month-switcher"><button aria-label="เดือนก่อนหน้า">‹</button><span>{{ monthLabel }}</span><button aria-label="เดือนถัดไป">›</button></div></div><div class="table-toolbar"><div class="toolbar-filters"><button :class="['filter-button', { active: dayFilter === 'all' }]" @click="dayFilter = 'all'">ดูทั้งหมด</button><button :class="['filter-button', { active: dayFilter === 'workday' }]" @click="dayFilter = 'workday'">วันทำงาน จ-ศ</button><button :class="['filter-button', { active: dayFilter === 'holiday' }]" @click="dayFilter = 'holiday'">วันหยุด / วันหยุดราชการ</button></div><div class="table-meta"><span class="legend-dot weekday"></span> วันปกติ <span class="legend-dot weekend"></span> วันหยุด <span class="legend-dot holiday"></span> วันหยุดราชการ</div></div>
          <div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th class="day-column">วัน</th><th class="date-column">วันที่ / เดือน / ปี <span>↕</span></th><th class="role-header md-header"><span class="role-code">MD</span></th><th class="role-header fmo-header"><span class="role-code">FMO</span></th><th class="role-header gso-header"><span class="role-code">GSO</span></th><th class="note-column">หมายเหตุ</th></tr></thead><tbody><tr v-for="row in visibleSchedule" :key="row.date" :class="dayClass(row)" @click="selectedRow = row"><td class="day-cell"><span>{{ row.day }}</span><small>{{ row.dayShort }}</small></td><td class="date-cell"><span>{{ formatThaiDate(row.date) }}</span></td><td class="person-cell" @click.stop="openPerson(row.md)"><span class="person-avatar md-avatar">{{ row.mdCode }}</span><span>{{ shortPersonnelName(row.md) }}</span></td><td class="person-cell" @click.stop="openPerson(row.fmo)"><span class="person-avatar fmo-avatar">{{ row.fmoCode }}</span><span>{{ shortPersonnelName(row.fmo) }}</span></td><td class="person-cell" @click.stop="openPerson(row.gso)"><span class="person-avatar gso-avatar">{{ row.gsoCode }}</span><span>{{ shortPersonnelName(row.gso) }}</span></td><td class="note-cell"><span v-if="row.note" :class="{ holiday: row.note.includes('ราชการ') }">{{ row.note }}</span><span v-else class="empty-note">—</span></td></tr></tbody></table><div v-if="!visibleSchedule.length" class="empty-table">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div></div><div class="table-footer"><span>แสดง {{ visibleSchedule.length }} จาก 31 วัน</span><div class="pagination"><button>‹</button><button class="selected-page">1</button><button>2</button><button>3</button><span>...</span><button>4</button><button>›</button></div><span>หน้า 1 จาก 4</span></div></section>
      </div>
    </main>

    <!-- Modal รายละเอียดเวร -->
    <div v-if="selectedRow" class="modal-backdrop" @click.self="selectedRow = null"><section class="detail-modal"><button class="modal-close" @click="selectedRow = null">×</button><p class="eyebrow">รายละเอียดเวร</p><h2>{{ selectedRow.day }} {{ formatThaiDate(selectedRow.date) }}</h2><div class="detail-list"><div><span>MD</span><b>{{ shortPersonnelName(selectedRow.md) }}</b></div><div><span>FMO</span><b>{{ shortPersonnelName(selectedRow.fmo) }}</b></div><div><span>GSO</span><b>{{ shortPersonnelName(selectedRow.gso) }}</b></div><div><span>หมายเหตุ</span><b>{{ selectedRow.note || 'ไม่มีหมายเหตุ' }}</b></div></div><button class="button button-primary full-button" @click="openDutyForm(selectedRow)">แก้ไขรายละเอียด</button></section></div>

    <!-- Modal ข้อมูลบุคลากร -->
    <div v-if="selectedPerson" class="modal-backdrop" @click.self="selectedPerson = ''">
      <section class="person-modal">
        <button class="modal-close" @click="selectedPerson = ''">×</button>
        <img v-if="selectedPersonProfile?.photo" :src="selectedPersonProfile.photo" class="large-person-avatar-img" :alt="selectedPersonProfile.firstname" />
        <span v-else class="large-person-avatar">{{ selectedPerson.split(' ').slice(-2).map((part) => part[0]).join('') }}</span>
        <p class="eyebrow">บุคลากรหน่วยปฏิบัติการดาวเทียม</p>
        <h2>{{ selectedPersonProfile ? formatFullName(selectedPersonProfile) : normalizeRank(selectedPerson) }}</h2>
        <p>{{ selectedPersonProfile?.position || 'หน่วยปฏิบัติการดาวเทียม · พร้อมปฏิบัติงาน' }}</p>
        <div v-if="selectedPersonProfile" class="person-modal-info">
          <div><span>อายุ</span><b>{{ selectedPersonProfile.age }} ปี</b></div>
          <div><span>กรุ๊ปเลือด</span><b>{{ selectedPersonProfile.blood_type }}</b></div>
          <div><span>เบอร์โทร</span><b>{{ selectedPersonProfile.phone || '—' }}</b></div>
          <div><span>ผู้ติดต่อฉุกเฉิน</span><b>{{ selectedPersonProfile.emergency_name || '—' }} ({{ selectedPersonProfile.emergency_relationship || '—' }})</b></div>
        </div>
        <div class="person-modal-actions">
          <button v-if="selectedPersonProfile" class="button button-primary full-button" @click="goToPersonnelPage(selectedPersonProfile.id)">
            ดูประวัติและจัดการข้อมูลในหน้าบุคลากร →
          </button>
        </div>
      </section>
    </div>

    <!-- Modal เพิ่ม/แก้ไขเวร -->
    <div v-if="showDutyForm" class="modal-backdrop" @click.self="showDutyForm = false"><section class="duty-form-modal"><button class="modal-close" @click="showDutyForm = false">×</button><p class="eyebrow">ตารางเวร / เพิ่มหรือแก้ไข</p><h2>กำหนดผู้ปฏิบัติหน้าที่</h2><p class="form-range-note">แสดงและจัดเวรเฉพาะวันที่ 1 - 10 ตุลาคม 2569</p><label class="form-label">วันที่ปฏิบัติงาน</label><div class="calendar-picker"><div class="calendar-header"><button>‹</button><strong>ตุลาคม 2569</strong><button>›</button></div><div class="calendar-weekdays"><span>อา.</span><span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span></div><div class="calendar-grid"><button v-for="(date, index) in calendarDays" :key="date ?? `empty-${index}`" :disabled="!date" :class="{ selected: dutyDate === date, assigned: date && data.schedule.some((row) => row.date === date) }" @click="date && (dutyDate = date)">{{ date ? Number(date.slice(-2)) : '' }}</button></div></div><div class="assignment-grid"><div class="assignment-field"><label><span class="role-label md-label">MD</span> Mission Director</label><input v-model="personnelSearch.md" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyMd"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('md')" :key="`md-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label fmo-label">FMO</span> Flight &amp; Mission Ops.</label><input v-model="personnelSearch.fmo" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyFmo"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('fmo')" :key="`fmo-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div><div class="assignment-field"><label><span class="role-label gso-label">GSO</span> Ground Station Ops.</label><input v-model="personnelSearch.gso" placeholder="ค้นหา หรือเลือกบุคลากร" /><select v-model="dutyGso"><option disabled value="">เลือกบุคลากร</option><option v-for="person in filteredPersonnel('gso')" :key="`gso-${person}`" :value="person">{{ shortPersonnelName(person) }}</option></select></div></div><label class="form-label note-label">หมายเหตุ</label><textarea v-model="dutyNote" rows="3" placeholder="เพิ่มหมายเหตุสำหรับวันนี้"></textarea><div class="form-actions"><button class="button button-secondary" @click="showDutyForm = false">ยกเลิก</button><button class="button button-primary" :disabled="!dutyMd || !dutyFmo || !dutyGso" @click="saveDuty">บันทึกเวร</button></div></section></div>

    <!-- Toast แจ้งเตือนความสำเร็จ -->
    <div v-if="toastMessage" class="app-toast">
      <span>✓</span> {{ toastMessage }}
    </div>

    <!-- Modal นำเข้าตารางเวร (Import Excel) -->
    <div v-if="showImportModal" class="modal-backdrop" @click.self="showImportModal = false">
      <section class="import-modal">
        <button class="modal-close" @click="showImportModal = false">×</button>
        <p class="eyebrow">ระบบนำเข้าข้อมูล / EXCEL</p>
        <h2>นำเข้าตารางเวรปฏิบัติงาน</h2>
        <p class="import-subtitle">
          นำเข้าตารางเวรจากไฟล์ Excel (.xlsx / .xls) แบบฟอร์ม 4 คอลัมน์ตายตัว: วันที่, MD, FMO, GSO
        </p>

        <!-- แถบดาวน์โหลดฟอร์มตัวอย่าง -->
        <div class="template-download-strip">
          <div class="template-info">
            <span class="excel-badge-icon">📊</span>
            <div>
              <strong>ไฟล์ฟอร์มมาตรฐาน 4 ช่อง</strong>
              <small>คอลัมน์: [วันที่] [MD] [FMO] [GSO]</small>
            </div>
          </div>
          <a
            href="/duty_roster_template.xlsx"
            download="duty_roster_template.xlsx"
            class="button-download-template"
            title="ดาวน์โหลดไฟล์ Excel ตัวอย่าง 4 ช่องเพื่อนำไปกรอกข้อมูล"
          >
            📥 ดาวน์โหลดฟอร์มตัวอย่าง (.xlsx)
          </a>
        </div>

        <!-- กล่องอัปโหลด / ลากวางไฟล์ -->
        <div
          class="upload-dropzone"
          :class="{ 'is-dragging': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
        >
          <input
            ref="excelFileInput"
            type="file"
            accept=".xlsx, .xls, .csv"
            style="display: none;"
            @change="handleFileInputChange"
          />
          <div v-if="!importFileName" class="dropzone-content">
            <span class="upload-cloud-icon">☁️</span>
            <strong>คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่</strong>
            <p>รองรับไฟล์ .xlsx, .xls หรือ .csv (ใช้ไฟล์ <code>duty_roster_template.xlsx</code> ที่อยู่ในโฟลเดอร์นี้ได้ทันที)</p>
          </div>
          <div v-else class="dropzone-file-selected">
            <span class="file-icon-green">📊</span>
            <div class="file-meta">
              <strong>{{ importFileName }}</strong>
              <small v-if="importRows.length">อ่านข้อมูลพบ {{ importRows.length }} รายการ (ผ่านเกณฑ์ {{ validImportRows.length }} วัน)</small>
            </div>
            <button type="button" class="btn-change-file" @click.stop="triggerFileInput">
              เปลี่ยนไฟล์
            </button>
          </div>
        </div>

        <!-- แจ้งเตือนข้อผิดพลาด (ถ้ามี) -->
        <div v-if="importError" class="import-alert-error">
          ⚠️ {{ importError }}
        </div>

        <!-- ตาราง Preview ข้อมูลที่อ่านได้ -->
        <div v-if="importRows.length > 0" class="import-preview-box">
          <div class="preview-header">
            <div class="preview-title">
              <strong>ตรวจสอบข้อมูลก่อนนำเข้า</strong>
              <span class="badge-success">✓ พร้อมนำเข้า {{ validImportRows.length }} วัน</span>
              <span v-if="invalidImportRows.length" class="badge-warning">⚠️ ไม่สมบูรณ์ {{ invalidImportRows.length }} แถว</span>
            </div>
            <label class="checkbox-overwrite">
              <input v-model="overwriteExisting" type="checkbox" />
              <span>เขียนทับวันที่มีข้อมูลอยู่แล้วในระบบ</span>
            </label>
          </div>

          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">ลำดับ</th>
                  <th style="width: 120px;">วันที่</th>
                  <th style="width: 80px;">วัน</th>
                  <th>MD (Mission Director)</th>
                  <th>FMO (Flight Ops.)</th>
                  <th>GSO (Ground Station)</th>
                  <th style="width: 90px; text-align: center;">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in importRows"
                  :key="idx"
                  :class="{ 'row-invalid': !row.isValid }"
                >
                  <td class="text-center">{{ idx + 1 }}</td>
                  <td><strong>{{ formatThaiDate(row.date) || row.date }}</strong></td>
                  <td><span class="preview-day-tag">{{ row.day }}</span></td>
                  <td><span class="preview-person md">{{ row.md || '—' }}</span></td>
                  <td><span class="preview-person fmo">{{ row.fmo || '—' }}</span></td>
                  <td><span class="preview-person gso">{{ row.gso || '—' }}</span></td>
                  <td class="text-center">
                    <span v-if="row.isValid" class="status-valid-badge">✓ พร้อม</span>
                    <span v-else class="status-error-badge" :title="row.error">✕ {{ row.error || 'ผิดพลาด' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ปุ่มดำเนินการ -->
        <div class="form-actions">
          <button class="button button-secondary" @click="showImportModal = false">
            ยกเลิก
          </button>
          <button
            class="button button-import"
            :disabled="validImportRows.length === 0"
            @click="confirmImport"
          >
            บันทึกนำเข้าตารางเวร ({{ validImportRows.length }} วัน)
          </button>
        </div>
      </section>
    </div>

    <!-- Modal ส่งออกตารางเวร (Export Excel Modal) -->
    <div v-if="showExportModal" class="modal-backdrop" @click.self="showExportModal = false">
      <section class="export-modal">
        <button class="modal-close" @click="showExportModal = false">×</button>
        <p class="eyebrow">ระบบส่งออกข้อมูล / EXCEL EXPORT</p>
        <h2>ส่งออกข้อมูลตารางเวร</h2>
        <p class="export-subtitle">
          ดาวน์โหลดข้อมูลตารางเวรปฏิบัติการเป็นไฟล์ Excel (.xlsx) เลือกได้ทั้งแบบรายเดือน หรือรายสัปดาห์
        </p>

        <!-- แถบเลือกโหมด: รายเดือน หรือ รายสัปดาห์ -->
        <div class="export-scope-selector">
          <button
            type="button"
            :class="['scope-tab-btn', { active: exportScope === 'month' }]"
            @click="exportScope = 'month'"
          >
            <span class="scope-icon">📅</span>
            <div>
              <strong>ส่งออกรายเดือน (Monthly)</strong>
              <small>ข้อมูลเวรทั้งเดือน</small>
            </div>
          </button>

          <button
            type="button"
            :class="['scope-tab-btn', { active: exportScope === 'week' }]"
            @click="exportScope = 'week'"
          >
            <span class="scope-icon">📆</span>
            <div>
              <strong>ส่งออกรายสัปดาห์ (Weekly)</strong>
              <small>เลือกเฉพาะสัปดาห์ที่ต้องการ</small>
            </div>
          </button>
        </div>

        <!-- ตัวเลือกกรณี: ส่งออกรายเดือน -->
        <div v-if="exportScope === 'month'" class="export-options-card">
          <label class="export-field-label">เลือกเดือนที่ต้องการส่งออก</label>
          <div class="month-select-row">
            <select v-model="exportSelectedMonth" class="form-select export-select">
              <option value="2026-10">ตุลาคม 2569 (เดือนปัจจุบัน)</option>
              <option value="2026-09">กันยายน 2569</option>
              <option value="2026-11">พฤศจิกายน 2569</option>
            </select>
            <span class="rows-count-chip">
              พบข้อมูล {{ rowsToExport.length }} วัน
            </span>
          </div>
        </div>

        <!-- ตัวเลือกกรณี: ส่งออกรายสัปดาห์ -->
        <div v-if="exportScope === 'week'" class="export-options-card">
          <div class="week-header-row">
            <label class="export-field-label">เลือกสัปดาห์ที่ต้องการส่งออก (เดือนตุลาคม 2569)</label>
            <span class="rows-count-chip">
              พบข้อมูล {{ rowsToExport.length }} วัน
            </span>
          </div>

          <div class="week-pills-grid">
            <button
              v-for="week in availableWeeks"
              :key="week.index"
              type="button"
              :class="['week-pill-card', { active: exportSelectedWeekIndex === week.index }]"
              @click="exportSelectedWeekIndex = week.index"
            >
              <div class="week-pill-top">
                <span class="week-num-badge">สัปดาห์ที่ {{ week.index + 1 }}</span>
                <span class="week-days-count">{{ week.count }} วัน</span>
              </div>
              <strong class="week-date-range">{{ formatThaiDate(week.startDate) }} – {{ formatThaiDate(week.endDate) }}</strong>
            </button>
          </div>
        </div>

        <!-- กล่องสรุปไฟล์ที่จะได้รับ (Preview Summary) -->
        <div class="export-summary-box">
          <div class="summary-meta-item">
            <span class="meta-icon">📄</span>
            <div>
              <small>ชื่อไฟล์ที่จะได้รับ</small>
              <strong>{{ exportFileName }}</strong>
            </div>
          </div>
          <div class="summary-meta-item">
            <span class="meta-icon">📊</span>
            <div>
              <small>จำนวนข้อมูลที่จะส่งออก</small>
              <strong class="highlight-count">{{ rowsToExport.length }} รายการ</strong>
            </div>
          </div>
          <div class="summary-meta-item">
            <span class="meta-icon">📋</span>
            <div>
              <small>รูปแบบไฟล์</small>
              <strong>Excel (.xlsx)</strong>
            </div>
          </div>
        </div>

        <!-- พรีวิวตารางข้อมูล 3-5 แถวแรก -->
        <div v-if="rowsToExport.length > 0" class="export-mini-preview">
          <div class="mini-preview-title">
            <span>ตัวอย่างข้อมูลในไฟล์ (แสดงสูงสุด 5 วันแรก):</span>
          </div>
          <div class="mini-table-scroll">
            <table class="mini-export-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>วัน</th>
                  <th>MD</th>
                  <th>FMO</th>
                  <th>GSO</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rowsToExport.slice(0, 5)" :key="r.date">
                  <td><b>{{ formatThaiDate(r.date) }}</b></td>
                  <td>{{ r.day }}</td>
                  <td><span class="text-md">{{ r.md }}</span></td>
                  <td><span class="text-fmo">{{ r.fmo }}</span></td>
                  <td><span class="text-gso">{{ r.gso }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="export-empty-alert">
          ⚠️ ไม่พบข้อมูลตารางเวรในช่วงเวลาที่เลือก
        </div>

        <!-- ปุ่มดำเนินการ -->
        <div class="form-actions">
          <button type="button" class="button button-secondary" @click="showExportModal = false">
            ยกเลิก
          </button>
          <button
            type="button"
            class="button button-download-main"
            :disabled="rowsToExport.length === 0"
            @click="executeExportExcel"
          >
            <span>📥</span> ดาวน์โหลดไฟล์ Excel ({{ rowsToExport.length }} รายการ)
          </button>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="loading-state"><span class="loader"></span> กำลังโหลดข้อมูลระบบ...</div>
</template>
