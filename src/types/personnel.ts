export interface Personnel {
  id: number
  rank: string
  firstname: string
  lastname: string
  position: string
  unit: string
  age: number
  blood_type: string
  phone: string
  emergency_name: string
  emergency_relationship: string
  emergency_phone: string
  photo: string | null
}

export interface DutyRecord {
  id: string
  personnel_id: number
  date: string
  start_time: string
  end_time: string
  ends_next_day: boolean
  duty: string
  status: 'completed' | 'pending'
  note: string
}

export interface DutySummary {
  total: number
  completed: number
  latest: string | null
}
