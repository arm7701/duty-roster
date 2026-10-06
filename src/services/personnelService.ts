import { ref } from 'vue'
import type { DutyRecord, DutySummary, Personnel } from '../types/personnel'

const REFERENCE_DATE = '2026-10-06'
const STORAGE_PERSONNEL_KEY = 'satops_personnel_list'
const STORAGE_DUTIES_KEY = 'satops_duty_history'
const STORAGE_SCHEDULE_KEY = 'satops_custom_schedule'

const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'ไม่ระบุ']
const SAMPLE_NAMES = [
  'กิตติพงษ์', 'ธนกร', 'ปาริชาติ', 'ณัฐวุฒิ', 'ศุภชัย', 'วัชรา',
  'สุรศักดิ์', 'พิมพ์ชนก', 'ธนวัฒน์', 'สุภาวดี', 'พีรพัฒน์', 'อรทัย',
  'วีระ', 'ชลธิชา', 'ณัฐพล', 'กมลวรรณ', 'สมภพ', 'รัตนา',
  'เอกชัย', 'วราภรณ์', 'อนุชา', 'ศิริพร', 'ปกรณ์', 'นภา'
]
const SAMPLE_RANKS = ['น.อ.', 'น.ท.', 'ร.อ.', 'ร.ท.', 'จ.อ.', 'จ.ท.']
const SAMPLE_POSITIONS = [
  'หัวหน้าฝ่ายปฏิบัติการ',
  'รองหัวหน้าฝ่ายปฏิบัติการ',
  'จนท.ปฏิบัติการ',
  'จนท.วิเคราะห์ข้อมูล',
  'จนท.สื่อสาร',
  'จนท.ธุรการ'
]

function createInitialPersonnel(): Personnel[] {
  return SAMPLE_NAMES.map((firstname, index) => ({
    id: index + 1,
    rank: SAMPLE_RANKS[index % 6],
    firstname,
    lastname: 'ตัวอย่าง',
    position: SAMPLE_POSITIONS[index % 6],
    unit: 'หน่วยปฏิบัติการดาวเทียม',
    age: index === 0 ? 42 : 28 + (index % 18),
    blood_type: BLOOD_TYPES[index % 4 === 0 ? 3 : index % 4],
    phone: `08${(index % 9) + 1}-${String(100 + index * 17).slice(0, 3)}-${String(1000 + index * 43).slice(0, 4)}`,
    emergency_name: index === 0 ? 'วราภรณ์ ตัวอย่าง' : 'ผู้ติดต่อ ตัวอย่าง',
    emergency_relationship: index % 2 === 0 ? 'คู่สมรส' : 'บิดา/มารดา',
    emergency_phone: `09${(index % 9) + 1}-${String(200 + index * 13).slice(0, 3)}-${String(2000 + index * 59).slice(0, 4)}`,
    photo: null
  }))
}

function createInitialDuties(people: Personnel[]): DutyRecord[] {
  return people.flatMap((person) =>
    Array.from({ length: 12 }, (_, index) => {
      const day = new Date('2026-09-28T00:00:00Z')
      day.setUTCDate(day.getUTCDate() - index * 7 - ((person.id - 1) % 5))
      const dutyTypes = ['MD', 'FMO', 'GSO']
      const duty = dutyTypes[(person.id - 1) % 3]
      return {
        id: `hist-${person.id}-${index + 1}`,
        personnel_id: person.id,
        date: day.toISOString().slice(0, 10),
        start_time: '08:00',
        end_time: '08:00',
        ends_next_day: true,
        duty,
        status: 'completed' as const,
        note: ''
      }
    })
  )
}

function loadFromStorage<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as T
      }
    }
  } catch (err) {
    console.error(`Failed to load ${key} from localStorage:`, err)
  }
  const initial = fallback()
  try {
    localStorage.setItem(key, JSON.stringify(initial))
  } catch (err) {
    console.error(`Failed to save ${key} initial data:`, err)
  }
  return initial
}

const personnelList = ref<Personnel[]>(loadFromStorage(STORAGE_PERSONNEL_KEY, createInitialPersonnel))
const dutyRecords = ref<DutyRecord[]>(loadFromStorage(STORAGE_DUTIES_KEY, () => createInitialDuties(personnelList.value)))

function persistPersonnel() {
  try {
    localStorage.setItem(STORAGE_PERSONNEL_KEY, JSON.stringify(personnelList.value))
  } catch (err) {
    console.error('Failed to persist personnel:', err)
  }
}

function persistDuties() {
  try {
    localStorage.setItem(STORAGE_DUTIES_KEY, JSON.stringify(dutyRecords.value))
  } catch (err) {
    console.error('Failed to persist duties:', err)
  }
}

export function formatFullName(person?: Personnel | null): string {
  if (!person) return ''
  return `${person.rank} ${person.firstname} ${person.lastname}`.trim()
}

export const personnelService = {
  referenceDate: REFERENCE_DATE,

  getPersonnel(): Personnel[] {
    return personnelList.value
  },

  getPersonById(id: number): Personnel | undefined {
    return personnelList.value.find((p) => p.id === id)
  },

  getPersonByName(name: string): Personnel | undefined {
    const query = name.trim().toLowerCase()
    return personnelList.value.find((p) => {
      const full = formatFullName(p).toLowerCase()
      const simple = `${p.firstname} ${p.lastname}`.toLowerCase()
      return full === query || simple === query || query.includes(p.firstname)
    })
  },

  getPositions(): string[] {
    return [...new Set(personnelList.value.map((p) => p.position))].filter(Boolean)
  },

  savePerson(payload: Partial<Personnel>, editingId?: number | null): Personnel {
    if (editingId) {
      const index = personnelList.value.findIndex((p) => p.id === editingId)
      if (index === -1) throw new Error('ไม่พบข้อมูลบุคลากรที่ต้องการแก้ไข')
      const updated: Personnel = {
        ...personnelList.value[index],
        ...payload,
        id: editingId
      }
      personnelList.value[index] = updated
      persistPersonnel()
      return updated
    }

    const nextId = personnelList.value.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const newPerson: Personnel = {
      id: nextId,
      rank: payload.rank || 'ร.อ.',
      firstname: payload.firstname || '',
      lastname: payload.lastname || '',
      position: payload.position || '',
      unit: payload.unit || 'หน่วยปฏิบัติการดาวเทียม',
      age: Number(payload.age) || 30,
      blood_type: payload.blood_type || 'ไม่ระบุ',
      phone: payload.phone || '',
      emergency_name: payload.emergency_name || '',
      emergency_relationship: payload.emergency_relationship || '',
      emergency_phone: payload.emergency_phone || '',
      photo: null
    }
    personnelList.value.push(newPerson)
    persistPersonnel()
    return newPerson
  },

  deletePerson(id: number): void {
    personnelList.value = personnelList.value.filter((p) => p.id !== id)
    dutyRecords.value = dutyRecords.value.filter((d) => d.personnel_id !== id)
    persistPersonnel()
    persistDuties()
  },

  savePhoto(id: number, photo: string): Personnel {
    const person = personnelList.value.find((p) => p.id === id)
    if (!person) throw new Error('ไม่พบข้อมูลบุคลากร')
    person.photo = photo
    persistPersonnel()
    return person
  },

  /**
   * ดึงประวัติการเข้าเวรของบุคลากร เชื่อมโยงทั้งจากประวัติเดิม และตารางเวรปัจจุบัน (schedule)
   */
  getDutyHistory(
    personnelId: number,
    options?: { start?: string; end?: string; page?: number; pageSize?: number }
  ): {
    data: DutyRecord[]
    total: number
    page: number
    pageSize: number
    summary: DutySummary
  } {
    const person = personnelList.value.find((p) => p.id === personnelId)
    if (!person) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: options?.pageSize || 4,
        summary: { total: 0, completed: 0, latest: null }
      }
    }

    const personFullName = formatFullName(person)

    // 1. ดึงประวัติการเข้าเวรจาก dutyRecords
    const historyList: DutyRecord[] = dutyRecords.value.filter((d) => d.personnel_id === personnelId)

    // 2. ดึงเวรจากตารางเวรปัจจุบัน (schedule ใน localStorage)
    const scheduleDuties: DutyRecord[] = []
    try {
      const savedSched = localStorage.getItem(STORAGE_SCHEDULE_KEY)
      if (savedSched) {
        const rows = JSON.parse(savedSched)
        if (Array.isArray(rows)) {
          rows.forEach((row, idx) => {
            const rowRoles: { role: 'MD' | 'FMO' | 'GSO'; officer: string }[] = [
              { role: 'MD', officer: row.md },
              { role: 'FMO', officer: row.fmo },
              { role: 'GSO', officer: row.gso }
            ]
            rowRoles.forEach(({ role, officer }) => {
              if (
                officer &&
                (officer === personFullName ||
                  officer.includes(person.firstname) ||
                  officer === `${person.firstname} ${person.lastname}`)
              ) {
                const isPastOrToday = row.date <= REFERENCE_DATE
                scheduleDuties.push({
                  id: `sched-${row.date}-${role}-${idx}`,
                  personnel_id: personnelId,
                  date: row.date,
                  start_time: '08:00',
                  end_time: '08:00',
                  ends_next_day: true,
                  duty: role,
                  status: isPastOrToday ? 'completed' : 'pending',
                  note: row.note || ''
                })
              }
            })
          })
        }
      }
    } catch (e) {
      console.error('Error fetching duty history from schedule:', e)
    }

    // รวมและตัดเวรที่วันที่ซ้ำกัน
    const allDutiesMap = new Map<string, DutyRecord>()
    for (const d of historyList) {
      allDutiesMap.set(`${d.date}-${d.duty}`, d)
    }
    for (const d of scheduleDuties) {
      allDutiesMap.set(`${d.date}-${d.duty}`, d)
    }

    let allDuties = Array.from(allDutiesMap.values())

    // กรองตามช่วงวันที่
    const start = options?.start || ''
    const end = options?.end || ''
    if (start) allDuties = allDuties.filter((d) => d.date >= start)
    if (end) allDuties = allDuties.filter((d) => d.date <= end)

    // เรียงวันที่จากใหม่ไปเก่า
    allDuties.sort((a, b) => b.date.localeCompare(a.date))

    const total = allDuties.length
    const completed = allDuties.filter((d) => d.status === 'completed').length
    const latest = allDuties[0]?.date || null

    const page = options?.page || 1
    const pageSize = options?.pageSize || 4
    const startIndex = (page - 1) * pageSize
    const pagedData = allDuties.slice(startIndex, startIndex + pageSize)

    return {
      data: pagedData,
      total,
      page,
      pageSize,
      summary: { total, completed, latest }
    }
  }
}
