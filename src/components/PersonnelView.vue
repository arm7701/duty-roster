<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  UserRound,
  UsersRound,
  X
} from 'lucide-vue-next'
import type { DutyRecord, DutySummary, Personnel } from '../types/personnel'
import { formatFullName, personnelService } from '../services/personnelService'

const props = defineProps<{
  initialPersonId?: number | null
}>()

const emit = defineEmits<{
  (e: 'person-selected', person: Personnel): void
}>()

const people = ref<Personnel[]>([])
const positions = ref<string[]>([])
const selected = ref<Personnel | null>(null)
const selectedId = ref<number | null>(null)
const search = ref('')
const position = ref('')
const page = ref(1)
const total = ref(0)
const sort = ref<'id' | 'rank' | 'name' | 'position'>('id')
const direction = ref<'asc' | 'desc'>('asc')
const loading = ref(false)
const view = ref<'personal' | 'history'>('personal')
const openMenu = ref<number | null>(null)

// History state
const history = ref<DutyRecord[]>([])
const historyPage = ref(1)
const historyTotal = ref(0)
const historyLoading = ref(false)
const summary = ref<DutySummary>({ total: 0, completed: 0, latest: null })
const referenceDate = ref(personnelService.referenceDate)
const range = ref('90')
const startDate = ref('2026-07-09')
const endDate = ref('2026-10-06')
const datePickerOpen = ref(false)

// Modal & Form state
const modal = ref<'profile' | null>(null)
const editingId = ref<number | null>(null)
const form = ref<Partial<Personnel>>({})
const saving = ref(false)
const formError = ref('')
const deleteTarget = ref<Personnel | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const photoSaving = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

let searchTimer: any
let toastTimer: any

const pages = computed(() => Math.max(1, Math.ceil(total.value / 6)))
const historyPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / 4)))

const thaiDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const personalFields = computed(() => {
  if (!selected.value) return []
  return [
    ['ยศ', selected.value.rank],
    ['ชื่อ', selected.value.firstname],
    ['สกุล', selected.value.lastname],
    ['ตำแหน่ง', selected.value.position],
    ['อายุ', `${selected.value.age} ปี`],
    ['กรุ๊ปเลือด', selected.value.blood_type],
    ['เบอร์ติดต่อ', selected.value.phone || '—']
  ]
})

function notify(message: string, type: 'success' | 'error' = 'success') {
  clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 4000)
}

function loadPositions() {
  positions.value = personnelService.getPositions()
}

function loadPeople(preferredId?: number | null) {
  loading.value = true
  openMenu.value = null

  const all = personnelService.getPersonnel()
  const q = search.value.trim().toLowerCase()

  let filtered = all.filter((person) => {
    const full = `${person.rank} ${person.firstname} ${person.lastname} ${person.position}`.toLowerCase()
    const matchSearch = !q || full.includes(q)
    const matchPosition = !position.value || person.position === position.value
    return matchSearch && matchPosition
  })

  // Sort
  const dir = direction.value === 'desc' ? -1 : 1
  filtered.sort((a, b) => {
    if (sort.value === 'id') return dir * (a.id - b.id)
    if (sort.value === 'name') {
      const nameA = `${a.firstname} ${a.lastname}`
      const nameB = `${b.firstname} ${b.lastname}`
      return dir * nameA.localeCompare(nameB, 'th')
    }
    const valA = String(a[sort.value] || '')
    const valB = String(b[sort.value] || '')
    return dir * valA.localeCompare(valB, 'th')
  })

  total.value = filtered.length

  if (page.value > pages.value) {
    page.value = pages.value
  }

  const pageSize = 6
  const startIdx = (page.value - 1) * pageSize
  people.value = filtered.slice(startIdx, startIdx + pageSize)

  const targetId =
    preferredId ||
    (people.value.some((p) => p.id === selectedId.value) ? selectedId.value : people.value[0]?.id)

  if (targetId) {
    selectPerson(targetId)
  } else {
    selected.value = null
    selectedId.value = null
  }

  loading.value = false
}

function selectPerson(id: number) {
  selectedId.value = id
  openMenu.value = null
  const found = personnelService.getPersonById(id)
  selected.value = found || null
  if (found) {
    emit('person-selected', found)
  }
}

function changePage(next: number) {
  if (next < 1 || next > pages.value || next === page.value) return
  page.value = next
  loadPeople(selectedId.value)
}

function sortBy(key: 'id' | 'rank' | 'name' | 'position') {
  direction.value = sort.value === key && direction.value === 'asc' ? 'desc' : 'asc'
  sort.value = key
  page.value = 1
  loadPeople(selectedId.value)
}

function applyRange() {
  endDate.value = referenceDate.value
  if (range.value === 'all') {
    startDate.value = ''
  } else {
    const date = new Date(`${endDate.value}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - Number(range.value) + 1)
    startDate.value = date.toISOString().slice(0, 10)
  }
  historyPage.value = 1
  loadHistory()
}

function loadHistory() {
  if (!selectedId.value) return
  historyLoading.value = true

  const result = personnelService.getDutyHistory(selectedId.value, {
    page: historyPage.value,
    pageSize: 4,
    start: startDate.value,
    end: endDate.value
  })

  history.value = result.data
  historyTotal.value = result.total
  summary.value = result.summary
  historyLoading.value = false
}

function showHistory(id: number = selectedId.value ?? 0) {
  if (!id) return
  if (id !== selectedId.value) selectPerson(id)
  view.value = 'history'
  historyPage.value = 1
  applyRange()
}

function changeHistoryPage(next: number) {
  if (next < 1 || next > historyPages.value || next === historyPage.value) return
  historyPage.value = next
  loadHistory()
}

function changeDates() {
  datePickerOpen.value = false
  range.value = 'custom'
  historyPage.value = 1
  loadHistory()
}

function openForm(person: Personnel | null = null) {
  editingId.value = person?.id || null
  form.value = person
    ? { ...person }
    : {
        rank: 'ร.อ.',
        firstname: '',
        lastname: '',
        position: '',
        unit: 'หน่วยปฏิบัติการดาวเทียม',
        age: 30,
        blood_type: 'ไม่ระบุ',
        phone: '',
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: ''
      }
  formError.value = ''
  modal.value = 'profile'
  openMenu.value = null
}

function editPerson(id: number) {
  selectPerson(id)
  if (selected.value?.id === id) {
    openForm(selected.value)
  }
}

function savePerson() {
  saving.value = true
  formError.value = ''
  try {
    if (!form.value.firstname?.trim() || !form.value.lastname?.trim() || !form.value.position?.trim()) {
      throw new Error('กรุณากรอกยศ ชื่อ นามสกุล และตำแหน่งให้ครบถ้วน')
    }
    const saved = personnelService.savePerson(form.value, editingId.value)
    modal.value = null
    loadPositions()
    loadPeople(saved.id)
    notify(editingId.value ? 'บันทึกข้อมูลบุคลากรเรียบร้อย' : 'เพิ่มบุคลากรเรียบร้อย')
  } catch (cause: any) {
    formError.value = cause?.message || 'เกิดข้อผิดพลาดในการบันทึก'
  } finally {
    saving.value = false
  }
}

function removePerson() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    personnelService.deletePerson(deleteTarget.value.id)
    deleteTarget.value = null
    loadPositions()
    loadPeople()
    notify('ลบข้อมูลบุคลากรเรียบร้อย')
  } catch (cause: any) {
    formError.value = cause?.message || 'ไม่สามารถลบข้อมูลได้'
  } finally {
    saving.value = false
  }
}

function uploadPhoto(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !selected.value) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    notify('เลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB', 'error')
    target.value = ''
    return
  }

  photoSaving.value = true
  const id = selected.value.id
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const base64 = String(reader.result)
      const updated = personnelService.savePhoto(id, base64)
      if (selectedId.value === id) {
        selected.value = updated
      }
      loadPeople(id)
      notify('อัปโหลดรูปเรียบร้อย')
    } catch (e: any) {
      notify(e.message || 'ไม่สามารถบันทึกรูปได้', 'error')
    } finally {
      photoSaving.value = false
      target.value = ''
    }
  }
  reader.onerror = () => {
    notify('ไม่สามารถอ่านไฟล์รูปได้', 'error')
    photoSaving.value = false
    target.value = ''
  }
  reader.readAsDataURL(file)
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && !saving.value) {
    modal.value = null
    deleteTarget.value = null
    openMenu.value = null
    datePickerOpen.value = false
  }
}

watch(search, () => {
  if (saving.value) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadPeople()
  }, 250)
})

watch(position, () => {
  if (!saving.value) {
    page.value = 1
    loadPeople()
  }
})

watch(
  () => props.initialPersonId,
  (newId) => {
    if (newId) {
      selectPerson(newId)
    }
  }
)

onMounted(() => {
  loadPositions()
  loadPeople(props.initialPersonId)
  window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  clearTimeout(toastTimer)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="personnel-view-container" @click="openMenu = null">
    <template v-if="view === 'personal'">
      <div class="page-heading">
        <div>
          <div class="heading-line">
            <h1>บุคลากร</h1>
            <span class="status-badge-verified"><span></span>กำลังพลพร้อมปฏิบัติหน้าที่</span>
          </div>
          <p>ค้นหารายชื่อ จัดการข้อมูล และดูประวัติการปฏิบัติหน้าที่</p>
        </div>
        <span class="record-count">
          <UsersRound :size="16" />{{ total }} บุคลากร
        </span>
      </div>

      <div class="personnel-grid">
        <!-- ฝั่งซ้าย: ตารางรายชื่อบุคลากร -->
        <section class="list-card" aria-label="รายชื่อบุคลากร">
          <div class="list-toolbar">
            <div class="search-field">
              <Search :size="19" />
              <input v-model="search" aria-label="ค้นหาบุคลากร" placeholder="ค้นหาชื่อ–สกุล หรือยศ..." />
              <button v-if="search" class="clear-search" aria-label="ล้างการค้นหา" @click="search = ''">
                <X :size="15" />
              </button>
            </div>
            <select v-model="position" aria-label="กรองตำแหน่ง">
              <option value="">ทุกตำแหน่ง</option>
              <option v-for="item in positions" :key="item">{{ item }}</option>
            </select>
            <button class="primary-button add-button" @click="openForm()">
              <Plus :size="18" />เพิ่มบุคลากร
            </button>
          </div>

          <div class="table-scroll">
            <table class="personnel-table">
              <thead>
                <tr>
                  <th>
                    <button @click="sortBy('rank')">
                      ยศ <ArrowUpDown :size="12" />
                    </button>
                  </th>
                  <th>
                    <button @click="sortBy('name')">
                      ชื่อ – สกุล <ArrowUpDown :size="12" />
                    </button>
                  </th>
                  <th>
                    <button @click="sortBy('position')">
                      ตำแหน่ง <ArrowUpDown :size="12" />
                    </button>
                  </th>
                  <th class="actions-heading">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading && !people.length">
                  <td colspan="4" class="empty-cell">
                    <LoaderCircle class="spin" :size="22" />กำลังโหลดบุคลากร...
                  </td>
                </tr>
                <tr v-else-if="!people.length">
                  <td colspan="4" class="empty-cell">
                    <UsersRound :size="27" />ไม่พบบุคลากร{{ search || position ? ' ที่ตรงกับการค้นหา' : '' }}
                  </td>
                </tr>
                <tr
                  v-for="person in people"
                  :key="person.id"
                  :class="{ selected: person.id === selectedId }"
                  @click="selectPerson(person.id)"
                >
                  <td>{{ person.rank }}</td>
                  <td>
                    <button class="person-name" @click.stop="selectPerson(person.id)">
                      {{ person.firstname }} {{ person.lastname }}
                    </button>
                  </td>
                  <td>{{ person.position }}</td>
                  <td class="row-actions">
                    <button
                      class="icon-button"
                      :aria-label="`จัดการ ${person.firstname}`"
                      :aria-expanded="openMenu === person.id"
                      @click.stop="openMenu = openMenu === person.id ? null : person.id"
                    >
                      <MoreVertical :size="18" />
                    </button>
                    <div v-if="openMenu === person.id" class="row-menu" @click.stop>
                      <button @click="editPerson(person.id)">
                        <Pencil :size="15" />แก้ไขข้อมูล
                      </button>
                      <button @click="showHistory(person.id)">
                        <Clock3 :size="15" />ประวัติการเข้าเวร
                      </button>
                      <button class="danger-text" @click="deleteTarget = person; openMenu = null">
                        <X :size="15" />ลบบุคลากร
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="list-footer">
            <span>จนท. = เจ้าหน้าที่</span>
            <div class="pagination">
              <span class="pagination-summary">
                {{ total ? `แสดง ${(page - 1) * 6 + 1} – ${Math.min(page * 6, total)} จาก ${total} คน` : '0 คน' }}
              </span>
              <button aria-label="หน้าก่อนหน้า" :disabled="page === 1" @click="changePage(page - 1)">
                <ChevronLeft :size="16" />
              </button>
              <button
                v-for="number in pages"
                :key="number"
                :class="{ current: page === number }"
                :aria-label="`หน้าที่ ${number}`"
                @click="changePage(number)"
              >
                {{ number }}
              </button>
              <button aria-label="หน้าถัดไป" :disabled="page === pages" @click="changePage(page + 1)">
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </section>

        <!-- ฝั่งขวา: รายละเอียดบุคลากร -->
        <section class="detail-card" aria-label="รายละเอียดบุคลากร">
          <div class="detail-heading">
            <h2>รายละเอียดบุคลากร</h2>
            <button class="outline-button" :disabled="!selected" @click="openForm(selected)">
              <Pencil :size="16" />แก้ไขข้อมูล
            </button>
          </div>

          <div class="tabs" role="tablist" aria-label="รายละเอียดบุคลากร">
            <button class="active" role="tab" aria-selected="true">ข้อมูลส่วนตัว</button>
            <button role="tab" aria-selected="false" :disabled="!selected" @click="showHistory()">
              ประวัติการเข้าเวร
            </button>
          </div>

          <template v-if="selected">
            <div class="profile-content">
              <div class="photo-card">
                <img v-if="selected.photo" :src="selected.photo" :alt="`รูปถ่าย ${selected.firstname}`" />
                <UserRound v-else class="photo-placeholder" :size="58" :stroke-width="1.2" />
                <small>รูปถ่าย 1.5 นิ้ว</small>
                <button class="photo-button" :disabled="photoSaving" @click="photoInput?.click()">
                  {{ photoSaving ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป' }}
                </button>
                <input
                  ref="photoInput"
                  class="visually-hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="อัปโหลดรูปบุคลากร"
                  @change="uploadPhoto"
                />
              </div>
              <div class="profile-details">
                <h3>{{ formatFullName(selected) }}</h3>
                <p class="profile-position">{{ selected.position }}</p>
                <dl>
                  <template v-for="[label, value] in personalFields" :key="label">
                    <dt>{{ label }} :</dt>
                    <dd>{{ value }}</dd>
                  </template>
                </dl>
              </div>
            </div>

            <div class="emergency-section">
              <h3>บุคคลติดต่อยามฉุกเฉิน</h3>
              <dl>
                <dt>ชื่อ – สกุล :</dt>
                <dd>{{ selected.emergency_name || '—' }}</dd>
                <dt>ความสัมพันธ์ :</dt>
                <dd>{{ selected.emergency_relationship || '—' }}</dd>
                <dt>เบอร์ติดต่อ :</dt>
                <dd>{{ selected.emergency_phone || '—' }}</dd>
              </dl>
            </div>
          </template>

          <div v-else class="detail-placeholder">
            <UserRound :size="32" />
            เลือกรายชื่อเพื่อดูรายละเอียด
          </div>
        </section>
      </div>
    </template>

    <!-- หน้าประวัติการเข้าเวร -->
    <template v-else>
      <button class="back-link" @click="view = 'personal'">
        <ArrowLeft :size="16" />กลับหน้าบุคลากร
      </button>

      <div class="page-heading history-heading">
        <div>
          <div class="heading-line">
            <h1>ประวัติการเข้าเวร</h1>
            <span class="status-badge-verified"><span></span>บันทึกหน้าที่</span>
          </div>
          <p>{{ formatFullName(selected) }}<span class="subtitle-divider">|</span>{{ selected?.position }}</p>
        </div>
      </div>

      <div class="history-toolbar">
        <div class="tabs" role="tablist" aria-label="ข้อมูลบุคลากร">
          <button role="tab" aria-selected="false" @click="view = 'personal'">ข้อมูลส่วนตัว</button>
          <button role="tab" aria-selected="true" class="active">ประวัติการเข้าเวร</button>
        </div>
        <div class="date-filters">
          <select v-model="range" aria-label="ช่วงประวัติการเข้าเวร" @change="applyRange">
            <option value="30">ย้อนหลัง 30 วัน</option>
            <option value="90">ย้อนหลัง 90 วัน</option>
            <option value="180">ย้อนหลัง 180 วัน</option>
            <option value="all">ทั้งหมด</option>
            <option value="custom" disabled>กำหนดวันที่เอง</option>
          </select>
          <div class="date-picker-container">
            <button
              class="date-range"
              :aria-expanded="datePickerOpen"
              aria-label="เลือกช่วงวันที่"
              @click="datePickerOpen = !datePickerOpen"
            >
              <CalendarDays :size="17" />
              {{ startDate ? thaiDate(startDate) : 'ทั้งหมด' }}<span>–</span>{{ thaiDate(endDate) }}
            </button>
            <div v-if="datePickerOpen" class="date-popover">
              <label>วันที่เริ่มต้น<input v-model="startDate" type="date" aria-label="วันที่เริ่มต้น" /></label>
              <label>วันที่สิ้นสุด<input v-model="endDate" type="date" aria-label="วันที่สิ้นสุด" /></label>
              <button class="primary-button" @click="changeDates">ใช้ช่วงวันที่</button>
            </div>
          </div>
        </div>
      </div>

      <section class="history-card" aria-label="รายการประวัติการเข้าเวร">
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-icon blue"><CalendarDays :size="26" /></span>
            <div>
              <span>เข้าเวรทั้งหมด</span>
              <strong>{{ summary.total }} <small>ครั้ง</small></strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon green"><CheckCircle2 :size="28" /></span>
            <div>
              <span>เสร็จสิ้น</span>
              <strong>{{ summary.completed }} <small>ครั้ง</small></strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon blue round"><Clock3 :size="27" /></span>
            <div>
              <span>เข้าเวรล่าสุด</span>
              <strong class="latest-date">{{ thaiDate(summary.latest) }}</strong>
            </div>
          </div>
        </div>

        <div class="table-scroll">
          <table class="history-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>หน้าที่เวร</th>
                <th>สถานะ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="historyLoading">
                <td colspan="5" class="empty-cell">
                  <LoaderCircle class="spin" :size="21" />กำลังโหลดประวัติ...
                </td>
              </tr>
              <tr v-else-if="!history.length">
                <td colspan="5" class="empty-cell">
                  <CalendarDays :size="26" />ไม่มีประวัติการเข้าเวรในช่วงวันที่นี้
                </td>
              </tr>
              <tr v-for="duty in history" :key="duty.id">
                <td>{{ thaiDate(duty.date) }}</td>
                <td>{{ duty.start_time }} – {{ duty.end_time }}{{ duty.ends_next_day ? ' (วันถัดไป)' : '' }}</td>
                <td><span class="duty-code">{{ duty.duty }}</span></td>
                <td>
                  <span :class="duty.status === 'completed' ? 'completed-badge' : 'pending-badge'">
                    <CheckCircle2 :size="13" />
                    {{ duty.status === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ' }}
                  </span>
                </td>
                <td>{{ duty.note || '–' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="history-footer">
          <span>
            {{ historyTotal ? `แสดง ${(historyPage - 1) * 4 + 1} – ${Math.min(historyPage * 4, historyTotal)} จาก ${historyTotal} รายการ` : '0 รายการ' }}
          </span>
          <div class="pagination">
            <button aria-label="ประวัติหน้าก่อนหน้า" :disabled="historyPage === 1" @click="changeHistoryPage(historyPage - 1)">
              <ChevronLeft :size="16" />
            </button>
            <button
              v-for="number in historyPages"
              :key="number"
              :class="{ current: historyPage === number }"
              :aria-label="`ประวัติหน้าที่ ${number}`"
              @click="changeHistoryPage(number)"
            >
              {{ number }}
            </button>
            <button aria-label="ประวัติหน้าถัดไป" :disabled="historyPage === historyPages" @click="changeHistoryPage(historyPage + 1)">
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </section>
    </template>

    <footer class="page-footer">
      <span>SATOPS · Personnel &amp; Duty Management System</span>
      <span>หน่วยปฏิบัติการดาวเทียม</span>
    </footer>

    <!-- Toast Notification -->
    <div v-if="toast" class="toast" :class="toast.type" role="status">
      <CheckCircle2 v-if="toast.type === 'success'" :size="20" />
      <X v-else :size="20" />
      {{ toast.message }}
      <button class="icon-button" aria-label="ปิดแจ้งเตือน" @click="toast = null">
        <X :size="16" />
      </button>
    </div>

    <!-- Modals -->
    <div v-if="modal || deleteTarget" class="modal-backdrop" @click.self="!saving && (modal = null, deleteTarget = null)">
      <!-- Form Modal: Add/Edit Personnel -->
      <section v-if="modal" class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div class="modal-heading">
          <div>
            <span class="eyebrow">PERSONNEL RECORD</span>
            <h2 id="form-title">{{ editingId ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากร' }}</h2>
          </div>
          <button class="icon-button" aria-label="ปิดหน้าต่าง" :disabled="saving" @click="modal = null">
            <X :size="20" />
          </button>
        </div>

        <form id="personnel-form" @submit.prevent="savePerson">
          <p v-if="formError" class="inline-error" role="alert">{{ formError }}</p>
          <h3 class="form-section-title">ข้อมูลส่วนตัว</h3>
          <div class="form-grid">
            <label>
              ยศ <span>*</span>
              <select v-model="form.rank" required>
                <option v-for="rank in ['น.อ.', 'น.ท.', 'น.ต.', 'ร.อ.', 'ร.ท.', 'ร.ต.', 'พ.อ.อ.', 'พ.อ.ท.', 'พ.อ.ต.', 'จ.อ.', 'จ.ท.', 'จ.ต.']" :key="rank">
                  {{ rank }}
                </option>
              </select>
            </label>
            <label>
              อายุ <span>*</span>
              <input v-model.number="form.age" type="number" min="18" max="100" required />
            </label>
            <label>
              ชื่อ <span>*</span>
              <input v-model="form.firstname" maxlength="150" required />
            </label>
            <label>
              นามสกุล <span>*</span>
              <input v-model="form.lastname" maxlength="150" required />
            </label>
            <label class="full-width">
              ตำแหน่ง <span>*</span>
              <input v-model="form.position" list="position-options" maxlength="150" required />
              <datalist id="position-options">
                <option v-for="item in positions" :key="item">{{ item }}</option>
              </datalist>
            </label>
            <label class="full-width">
              หน่วยงาน
              <input v-model="form.unit" maxlength="150" />
            </label>
            <label>
              กรุ๊ปเลือด
              <select v-model="form.blood_type">
                <option v-for="blood in ['A', 'B', 'AB', 'O', 'ไม่ระบุ']" :key="blood">{{ blood }}</option>
              </select>
            </label>
            <label>
              เบอร์ติดต่อ
              <input v-model="form.phone" type="tel" maxlength="30" />
            </label>
          </div>

          <h3 class="form-section-title">บุคคลติดต่อยามฉุกเฉิน</h3>
          <div class="form-grid">
            <label class="full-width">
              ชื่อ – สกุล
              <input v-model="form.emergency_name" maxlength="150" />
            </label>
            <label>
              ความสัมพันธ์
              <input v-model="form.emergency_relationship" maxlength="150" />
            </label>
            <label>
              เบอร์ติดต่อ
              <input v-model="form.emergency_phone" type="tel" maxlength="30" />
            </label>
          </div>
        </form>

        <div class="modal-footer">
          <button class="secondary-button" :disabled="saving" @click="modal = null">ยกเลิก</button>
          <button class="primary-button" form="personnel-form" type="submit" :disabled="saving">
            <LoaderCircle v-if="saving" class="spin" :size="17" />
            <Check v-else :size="17" />
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
          </button>
        </div>
      </section>

      <!-- Delete Confirmation Modal -->
      <section v-else class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div class="modal-heading">
          <h2 id="delete-title">ยืนยันการลบบุคลากร</h2>
          <button class="icon-button" :disabled="saving" aria-label="ปิดหน้าต่าง" @click="deleteTarget = null">
            <X :size="20" />
          </button>
        </div>
        <p>คุณต้องการลบข้อมูลของ {{ formatFullName(deleteTarget) }} ออกจากระบบใช่หรือไม่?</p>
        <p v-if="formError" class="inline-error" role="alert">{{ formError }}</p>
        <div class="modal-footer">
          <button class="secondary-button" :disabled="saving" @click="deleteTarget = null">ยกเลิก</button>
          <button class="danger-button" :disabled="saving" @click="removePerson">
            {{ saving ? 'กำลังลบ...' : 'ลบบุคลากร' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.personnel-view-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.heading-line {
  display: flex;
  align-items: center;
  gap: 14px;
}

h1 {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: #0c2046;
  margin: 0;
  line-height: 1.3;
}

.page-heading p {
  font-size: 13px;
  color: #54729b;
  margin: 4px 0 0;
}

.status-badge-verified {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid #c2e2d0;
  border-radius: 4px;
  background: #f0fbf5;
  color: #0d8350;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge-verified span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10a364;
}

.record-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7b92b1;
  font-weight: 500;
}

.personnel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(380px, 1fr);
  gap: 18px;
  align-items: start;
}

.list-card,
.detail-card,
.history-card {
  background: #fff;
  border: 1px solid #dce7f4;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(38, 73, 101, 0.04);
}

.list-toolbar {
  padding: 13px 14px;
  display: flex;
  gap: 9px;
  border-bottom: 1px solid #edf3fa;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 120px;
  height: 38px;
  border: 1px solid #d6e2f2;
  border-radius: 6px;
  padding: 0 10px;
  color: #6784ad;
  background: #fcfdff;
}

.search-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-field input {
  background: transparent;
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  font-size: 12px;
  color: #18365f;
  font-family: inherit;
}

.clear-search {
  padding: 0;
  border: 0;
  background: transparent;
  color: #6583a6;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.list-toolbar select,
.date-filters select {
  height: 38px;
  border: 1px solid #d6e2f2;
  background: #fff;
  border-radius: 6px;
  padding: 0 10px;
  color: #294a75;
  font-size: 12px;
  min-width: 120px;
  font-family: inherit;
}

.primary-button {
  background: linear-gradient(135deg, #0284c7, #0274b0);
  color: #fff;
  border: 1px solid #0284c7;
  border-radius: 6px;
  padding: 8px 14px;
  min-height: 38px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.15);
  font-family: inherit;
}

.primary-button:hover {
  background: #0274b0;
}

.outline-button {
  color: #0284c7;
  border: 1px solid #bae6fd;
  background: #f0f9ff;
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: inherit;
}

.outline-button:hover {
  background: #e0f2fe;
}

.secondary-button {
  background: white;
  border: 1px solid #d5e1ef;
  color: #5a7699;
  padding: 8px 16px;
  border-radius: 6px;
  min-height: 38px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.secondary-button:hover {
  background: #f8fafc;
}

.danger-button {
  background: #dc2626;
  border: 1px solid #b91c1c;
  color: white;
  border-radius: 6px;
  padding: 8px 16px;
  min-height: 38px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.danger-button:hover {
  background: #b91c1c;
}

.table-scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
  text-align: left;
}

th {
  font-weight: 600;
  color: #4b6b94;
  background: #f8fafc;
  border-top: 1px solid #e2eaf5;
  border-bottom: 1px solid #dce6f3;
  height: 38px;
  padding: 8px 14px;
  white-space: nowrap;
}

th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.personnel-table {
  min-width: 480px;
}

.personnel-table td {
  height: 46px;
  padding: 9px 14px;
  border-bottom: 1px solid #edf3fa;
  color: #1e3a61;
}

.personnel-table td:first-child {
  width: 68px;
  white-space: nowrap;
  font-weight: 500;
}

.personnel-table td:nth-child(2) {
  white-space: nowrap;
}

.personnel-table td:nth-child(3) {
  font-size: 12px;
  color: #4a6385;
}

.personnel-table tr {
  cursor: pointer;
  transition: background 0.15s ease;
}

.personnel-table tr:hover td {
  background: #f4f8fe;
}

.personnel-table tr.selected td {
  background: #e9f2fe;
}

.personnel-table tr.selected td:first-child {
  box-shadow: inset 3px 0 #0284c7;
}

.person-name {
  background: none;
  border: 0;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #11284d;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.person-name:hover {
  color: #0284c7;
}

.actions-heading {
  font-size: 11px;
  text-align: center;
  width: 54px;
}

.icon-button {
  color: #6480a5;
  border: 0;
  border-radius: 5px;
  background: transparent;
  padding: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-button:hover {
  background: #e7f1ff;
  color: #0284c7;
}

.row-actions {
  position: relative;
  text-align: center;
  width: 54px;
}

.row-menu {
  position: absolute;
  z-index: 20;
  right: 18px;
  top: 36px;
  min-width: 170px;
  padding: 6px;
  border: 1px solid #dbe7f5;
  border-radius: 8px;
  background: white;
  box-shadow: 0 10px 25px rgba(18, 47, 85, 0.15);
}

.personnel-table tr:nth-last-child(-n + 2) .row-menu {
  top: auto;
  bottom: 30px;
}

.row-menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #345376;
  font-size: 12px;
  border: 0;
  background: none;
  padding: 8px 10px;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.row-menu button:hover {
  background: #f0f6ff;
  color: #0284c7;
}

.row-menu .danger-text {
  color: #dc2626;
}

.row-menu .danger-text:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.list-footer,
.history-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px;
  color: #7790b1;
  font-size: 11px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-summary {
  margin-right: 8px;
  font-size: 11px;
}

.pagination button {
  width: 28px;
  height: 28px;
  border: 1px solid #dce6f3;
  padding: 0;
  border-radius: 5px;
  background: white;
  color: #5a7ba9;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: inherit;
}

.pagination button:hover:not(:disabled) {
  background: #f0f6ff;
  border-color: #93c5fd;
  color: #0284c7;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination button.current {
  background: #0284c7;
  border-color: #0284c7;
  color: #fff;
  font-weight: 600;
}

/* Detail Card */
.detail-card {
  padding: 18px 20px;
  min-height: 440px;
}

.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

h2 {
  font-size: 18px;
  line-height: 1.4;
  color: #102449;
  font-weight: 600;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #e0e9f5;
  margin-top: 12px;
}

.tabs button {
  background: transparent;
  color: #607ea8;
  padding: 8px 6px 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.tabs button.active {
  color: #0284c7;
  border-bottom-color: #0284c7;
  font-weight: 600;
}

.profile-content {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 20px;
  padding: 18px 0 16px;
}

.photo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #b7cce7;
  border-radius: 6px;
  background: #f8fafc;
  padding: 14px 8px;
  align-self: start;
  min-height: 175px;
}

.photo-placeholder {
  color: #94a3b8;
  margin: 4px 0;
}

.photo-card img {
  width: 90px;
  height: 110px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.photo-card small {
  color: #7894ba;
  font-size: 10px;
}

.photo-button {
  background: #e0f2fe;
  color: #0284c7;
  border: 0;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 6px 10px;
  width: 100%;
  cursor: pointer;
  font-family: inherit;
}

.photo-button:hover {
  background: #bae6fd;
}

.profile-details h3 {
  font-size: 16px;
  line-height: 1.4;
  font-weight: 600;
  color: #102449;
  margin: 0;
}

.profile-position {
  color: #476993;
  font-size: 12px;
  margin: 2px 0 12px;
}

dl {
  display: grid;
  grid-template-columns: 85px minmax(0, 1fr);
  gap: 5px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

dt {
  color: #7591b6;
}

dd {
  color: #1e3a61;
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 500;
}

.emergency-section {
  padding-top: 14px;
  border-top: 1px solid #dce7f4;
}

.emergency-section h3 {
  color: #1e3a61;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 10px;
}

.emergency-section dl {
  margin-left: 120px;
  grid-template-columns: 95px minmax(0, 1fr);
}

.detail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: #7b93b2;
  font-size: 13px;
  padding: 60px 0;
  min-height: 250px;
}

.empty-cell {
  text-align: center;
  color: #8298b4 !important;
  padding: 40px 16px !important;
  height: 200px !important;
  cursor: default;
}

.empty-cell svg {
  display: block;
  margin: 0 auto 10px;
}

/* History View */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: 0;
  color: #476993;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 6px;
  font-family: inherit;
}

.back-link:hover {
  color: #0284c7;
}

.history-heading {
  margin-bottom: 12px;
}

.subtitle-divider {
  margin: 0 10px;
  color: #94acca;
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 12px;
}

.history-toolbar .tabs {
  margin-top: 0;
  min-width: 250px;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-picker-container {
  position: relative;
}

button.date-range {
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #dbe6f4;
  border-radius: 6px;
  padding: 0 12px;
  color: #294975;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.date-popover {
  position: absolute;
  right: 0;
  top: 45px;
  z-index: 25;
  width: 280px;
  padding: 16px;
  display: grid;
  gap: 12px;
  background: white;
  border: 1px solid #d4e3f5;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(24, 55, 86, 0.15);
}

.date-popover label {
  color: #6786ab;
  font-size: 12px;
}

.date-popover input {
  display: block;
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border: 1px solid #d7e5f4;
  border-radius: 4px;
  color: #294b75;
  font-size: 12px;
  background: #fff;
  font-family: inherit;
  box-sizing: border-box;
}

.date-popover .primary-button {
  justify-self: end;
  font-size: 12px;
}

.history-card {
  padding: 16px 16px 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  border: 1px solid #e0e9f6;
  border-radius: 6px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fbfdff;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
}

.stat-icon.blue {
  color: #0284c7;
  background: #e0f2fe;
}

.stat-icon.green {
  color: #10a364;
  background: #e6f9f0;
  border-radius: 50%;
}

.stat-icon.round {
  border-radius: 50%;
}

.stat-card div > span {
  color: #6d88ae;
  font-size: 11px;
  display: block;
  margin-bottom: 2px;
}

.stat-card strong {
  font-size: 22px;
  color: #0c2147;
  line-height: 1.2;
  font-weight: 600;
  display: block;
}

.stat-card strong small {
  font-size: 16px;
  font-weight: 400;
}

.stat-card strong.latest-date {
  font-size: 17px;
}

.history-table {
  min-width: 650px;
}

.history-table th {
  font-size: 12px;
}

.history-table td {
  padding: 10px 14px;
  height: 40px;
  border-bottom: 1px solid #e6edf7;
  color: #264164;
  font-size: 12px;
}

.duty-code {
  font-size: 12px;
  font-weight: 600;
  color: #0284c7;
}

.completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e6f9f0;
  color: #0d8350;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fef3c7;
  color: #b45309;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.page-footer {
  color: #93a7c1;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 10px;
}

/* Modals & Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 39, 66, 0.45);
  backdrop-filter: blur(2px);
  padding: 20px;
}

.profile-modal,
.confirm-modal {
  background: #fff;
  border: 1px solid #dce6f1;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(16, 40, 67, 0.25);
  width: 580px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

.confirm-modal {
  width: 440px;
}

.confirm-modal > p {
  padding: 20px 24px;
  font-size: 13px;
  line-height: 1.7;
  color: #476387;
  margin: 0;
}

.modal-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #e1eaf5;
  gap: 15px;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: #7397c3;
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
}

#personnel-form {
  padding: 10px 24px 20px;
  overflow-y: auto;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #33537a;
  margin: 14px 0 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-grid label {
  display: block;
  font-size: 12px;
  color: #557198;
}

.form-grid label > span {
  color: #e11d48;
}

.form-grid input,
.form-grid select {
  display: block;
  height: 38px;
  border: 1px solid #d3e1f1;
  border-radius: 6px;
  background: #fcfdff;
  color: #1e3a61;
  width: 100%;
  padding: 7px 10px;
  margin-top: 4px;
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-grid input:focus,
.form-grid select:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
}

.full-width {
  grid-column: 1 / -1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid #e1eaf5;
  background: #fbfdff;
  border-radius: 0 0 10px 10px;
}

.inline-error {
  color: #dc2626;
  font-size: 12px;
  margin: 10px 0;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  padding: 8px 12px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  background: white;
  box-shadow: 0 8px 30px rgba(20, 59, 94, 0.18);
  color: #15803d;
  font-size: 13px;
  font-weight: 500;
}

.toast.error {
  color: #b91c1c;
  border-color: #fecaca;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1050px) {
  .personnel-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .emergency-section dl {
    margin-left: 0;
  }
}

@media (max-width: 760px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .profile-content {
    grid-template-columns: 1fr;
  }
  .photo-card {
    width: 100%;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
