import type { Holiday } from '../types/holiday'

// รายการวันหยุดราชการไทย (ครอบคลุมทั้งปี 2568, 2569, 2570 และปีต่อๆ ไป)
export const RAW_HOLIDAYS: Holiday[] = [
  // ================= ปี 2569 (2026) =================
  {
    id: 'h-2026-01-01',
    date: '2026-01-01',
    name: 'วันขึ้นปีใหม่',
    nameEn: "New Year's Day",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันเริ่มต้นปีใหม่สากล ตามประกาศสำนักนายกรัฐมนตรี',
    dutyNote: 'กำลังพลเวรปฏิบัติงาน 24 ชม. รับ-ส่งหน้าที่ตามระเบียบเวรเทศกาลปีใหม่',
    icon: '🎉'
  },
  {
    id: 'h-2026-01-02',
    date: '2026-01-02',
    name: 'วันหยุดราชการกรณีพิเศษ (ช่วงปีใหม่)',
    nameEn: 'Special Public Holiday (New Year)',
    category: 'special',
    isGovernmentHoliday: true,
    description: 'วันหยุดราชการพิเศษต่อเนื่องช่วงเทศกาลปีใหม่ตามมติคณะรัฐมนตรี (ครม.)',
    dutyNote: 'เวรประจำสถานีเตรียมพร้อมระดับ 2 ติดตามสถานะวงโคจรตามปกติ',
    icon: '✨'
  },
  {
    id: 'h-2026-03-03',
    date: '2026-03-03',
    name: 'วันมาฆบูชา',
    nameEn: 'Makha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันสำคัญทางพระพุทธศาสนา วันที่พระสงฆ์ 1,250 รูปมาชุมนุมกันโดยมิได้นัดหมาย (โอวาทปาติโมกข์)',
    dutyNote: 'เวรปฏิบัติการดาวเทียมเข้าเวรตามตารางผลัดปกติ',
    icon: '🪷'
  },
  {
    id: 'h-2026-04-06',
    date: '2026-04-06',
    name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)',
    nameEn: 'Chakri Memorial Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันที่ระลึกถึงพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และการสถาปนาราชวงศ์จักรี',
    dutyNote: 'จัดเวร MD, FMO, GSO เต็มอัตรา',
    icon: '👑'
  },
  {
    id: 'h-2026-04-13',
    date: '2026-04-13',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันขึ้นปีใหม่ไทย วันผู้สูงอายุแห่งชาติ',
    dutyNote: 'เวรช่วงเทศกาลสงกรานต์ ควบคุมการปฏิบัติงานตลอด 24 ชั่วโมง',
    icon: '💦'
  },
  {
    id: 'h-2026-04-14',
    date: '2026-04-14',
    name: 'วันสงกรานต์ (วันครอบครัว)',
    nameEn: 'Songkran Festival (Family Day)',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์และวันครอบครัว',
    dutyNote: 'ตรวจสอบการติดต่อสื่อสารสถานีภาคพื้นดินและดาวเทียมสำรวจ',
    icon: '💦'
  },
  {
    id: 'h-2026-04-15',
    date: '2026-04-15',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสุดท้ายของเทศกาลสงกรานต์',
    dutyNote: 'รายงานความพร้อมและสรุปผลการปฏิบัติการประจำวัน',
    icon: '💦'
  },
  {
    id: 'h-2026-05-01',
    date: '2026-05-01',
    name: 'วันแรงงานแห่งชาติ',
    nameEn: 'National Labour Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันยกย่องผู้ใช้แรงงาน (วันหยุดราชการและภาคเอกชน)',
    dutyNote: 'ปฏิบัติหน้าที่ตามคำสั่งผลัดเวรปกติ',
    icon: '🛠️'
  },
  {
    id: 'h-2026-05-04',
    date: '2026-05-04',
    name: 'วันฉัตรมงคล',
    nameEn: 'Coronation Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันรำลึกการประกอบพระราชพิธีบรมราชาภิเษกเป็นพระมหากษัตริย์',
    dutyNote: 'จัดเวรประจำการตามระเบียบวันหยุดราชการ',
    icon: '👑'
  },
  {
    id: 'h-2026-05-11',
    date: '2026-05-11',
    name: 'วันพระราชพิธีพืชมงคลจรดพระนังคัลแรกนาขวัญ',
    nameEn: 'Royal Ploughing Ceremony Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'พระราชพิธีโบราณเพื่อความเป็นสิริมงคลแก่พืชพันธุ์ธัญญาหาร (วันหยุดราชการ)',
    dutyNote: 'เวรประจำศูนย์ควบคุมปฏิบัติการตามปกติ',
    icon: '🌾'
  },
  {
    id: 'h-2026-05-31',
    date: '2026-05-31',
    name: 'วันวิสาขบูชา',
    nameEn: 'Visakha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันประสูติ ตรัสรู้ และปรินิพพานของพระสัมมาสัมพุทธเจ้า',
    dutyNote: 'ตรงกับวันอาทิตย์ มีวันหยุดชดเชยในวันจันทร์ที่ 1 มิ.ย.',
    icon: '🪷'
  },
  {
    id: 'h-2026-06-01',
    date: '2026-06-01',
    name: 'วันหยุดชดเชยวันวิสาขบูชา',
    nameEn: 'Substitution for Visakha Bucha Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'วันหยุดชดเชยวันวิสาขบูชา (ชดเชยวันอาทิตย์ที่ 31 พ.ค. 2569)',
    dutyNote: 'จัดเวรทดแทนสำหรับวันหยุดชดเชย',
    icon: '🔄'
  },
  {
    id: 'h-2026-06-03',
    date: '2026-06-03',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
    nameEn: "Her Majesty Queen Suthida's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา พัชรสุธาพิมลลักษณ พระบรมราชินี',
    dutyNote: 'เวรปฏิบัติการแต่งกายตามระเบียบวันเฉลิมพระชนมพรรษา',
    icon: '👑'
  },
  {
    id: 'h-2026-07-28',
    date: '2026-07-28',
    name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    nameEn: "His Majesty King Rama X's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระปรเมนทรรามาธิบดีศรีสินทรมหาวชิราลงกรณ พระวชิรเกล้าเจ้าอยู่หัว',
    dutyNote: 'เวร MD, FMO, GSO ปฏิบัติหน้าที่ตรวจติดตามวงโคจรดาวเทียมต่อเนื่อง',
    icon: '👑'
  },
  {
    id: 'h-2026-07-29',
    date: '2026-07-29',
    name: 'วันอาสาฬหบูชา',
    nameEn: 'Asarnha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันที่พระสัมมาสัมพุทธเจ้าทรงแสดงปฐมเทศนา ธัมมจักกัปปวัตตนสูตร',
    dutyNote: 'เวรประจำศูนย์ควบคุมปฏิบัติการ 24 ชั่วโมง',
    icon: '🪷'
  },
  {
    id: 'h-2026-07-30',
    date: '2026-07-30',
    name: 'วันเข้าพรรษา',
    nameEn: 'Buddhist Lent Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันเริ่มต้นการจำพรรษาของพระภิกษุสงฆ์ตลอด 3 เดือน (วันหยุดราชการประจำปี)',
    dutyNote: 'วันหยุดราชการต่อเนื่อง จัดกำลังพลเวรพร้อมสลับเปลี่ยนผลัด',
    icon: '🕯️'
  },
  {
    id: 'h-2026-08-12',
    date: '2026-08-12',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    nameEn: "Her Majesty Queen Sirikit The Queen Mother's Birthday / Mother's Day",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ พระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    dutyNote: 'ปฏิบัติหน้าที่ตามคำสั่งเวรวันหยุดราชการ',
    icon: '💙'
  },
  {
    id: 'h-2026-10-13',
    date: '2026-10-13',
    name: 'วันนวมินทรมหาราช',
    nameEn: 'Navamindra Maharaj Day (King Rama IX Memorial Day)',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร เพื่อน้อมรำลึกในพระมหากรุณาธิคุณ',
    dutyNote: 'จัดเวรประจำการเฝ้าระวังระบบเครือข่ายและระบบดาวเทียมเต็มเวลา 24 ชม.',
    icon: '🎗️'
  },
  {
    id: 'h-2026-10-23',
    date: '2026-10-23',
    name: 'วันปิยมหาราช',
    nameEn: 'Chulalongkorn Memorial Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันสวรรคตพระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว (รัชกาลที่ 5)',
    dutyNote: 'เวรประจำสถานีภาคพื้นดินติดตามภารกิจรับสัญญาณดาวเทียมตามกำหนดการ',
    icon: '🏛️'
  },
  {
    id: 'h-2026-12-05',
    date: '2026-12-05',
    name: 'วันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
    nameEn: "King Bhumibol Adulyadej's Birthday / National Day / Father's Day",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันพระบรมราชสมภพพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร วันชาติ และวันพ่อแห่งชาติ',
    dutyNote: 'ตรงกับวันเสาร์ มีวันหยุดชดเชยในวันจันทร์ที่ 7 ธันวาคม 2569',
    icon: '💛'
  },
  {
    id: 'h-2026-12-07',
    date: '2026-12-07',
    name: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ',
    nameEn: "Substitution for King Rama IX's Birthday",
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 (ชดเชยวันเสาร์ที่ 5 ธันวาคม 2569)',
    dutyNote: 'เวรประจำศูนย์ปฏิบัติการตามคำสั่งเวรวันหยุดชดเชย',
    icon: '🔄'
  },
  {
    id: 'h-2026-12-10',
    date: '2026-12-10',
    name: 'วันรัฐธรรมนูญ',
    nameEn: 'Constitution Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันที่ระลึกพระบาทสมเด็จพระปกเกล้าเจ้าอยู่หัวพระราชทานรัฐธรรมนูญแห่งราชอาณาจักรสยาม',
    dutyNote: 'เวรปฏิบัติการตรวจความพร้อมอุปกรณ์ดาวเทียมรอบ 12 ชั่วโมง',
    icon: '📜'
  },
  {
    id: 'h-2026-12-31',
    date: '2026-12-31',
    name: 'วันสิ้นปี',
    nameEn: "New Year's Eve",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสิ้นปีตามปฏิทินสุริยคติสากล',
    dutyNote: 'จัดเวรส่งท้ายปีเก่าต้อนรับปีใหม่ เตรียมผลัดเวรช่วงเวลา 00:00 น.',
    icon: '🎆'
  },

  // ================= ปี 2568 (2025) =================
  {
    id: 'h-2025-01-01',
    date: '2025-01-01',
    name: 'วันขึ้นปีใหม่',
    nameEn: "New Year's Day",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันขึ้นปีใหม่สากล',
    icon: '🎉'
  },
  {
    id: 'h-2025-02-12',
    date: '2025-02-12',
    name: 'วันมาฆบูชา',
    nameEn: 'Makha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันสำคัญทางพระพุทธศาสนา',
    icon: '🪷'
  },
  {
    id: 'h-2025-04-06',
    date: '2025-04-06',
    name: 'วันจักรี',
    nameEn: 'Chakri Memorial Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันที่ระลึกมหาจักรีบรมราชวงศ์',
    icon: '👑'
  },
  {
    id: 'h-2025-04-07',
    date: '2025-04-07',
    name: 'วันหยุดชดเชยวันจักรี',
    nameEn: 'Substitution for Chakri Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันจักรี (ตรงกับวันอาทิตย์ที่ 6 เม.ย.)',
    icon: '🔄'
  },
  {
    id: 'h-2025-04-13',
    date: '2025-04-13',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์ วันผู้สูงอายุแห่งชาติ',
    icon: '💦'
  },
  {
    id: 'h-2025-04-14',
    date: '2025-04-14',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์ วันครอบครัว',
    icon: '💦'
  },
  {
    id: 'h-2025-04-15',
    date: '2025-04-15',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์',
    icon: '💦'
  },
  {
    id: 'h-2025-04-16',
    date: '2025-04-16',
    name: 'วันหยุดชดเชยวันสงกรานต์',
    nameEn: 'Substitution for Songkran Festival',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'วันหยุดชดเชยวันสงกรานต์',
    icon: '🔄'
  },
  {
    id: 'h-2025-05-01',
    date: '2025-05-01',
    name: 'วันแรงงานแห่งชาติ',
    nameEn: 'National Labour Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันแรงงานแห่งชาติ',
    icon: '🛠️'
  },
  {
    id: 'h-2025-05-05',
    date: '2025-05-05',
    name: 'วันหยุดชดเชยวันฉัตรมงคล',
    nameEn: 'Substitution for Coronation Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันฉัตรมงคล (4 พ.ค. ตรงกับวันอาทิตย์)',
    icon: '🔄'
  },
  {
    id: 'h-2025-05-11',
    date: '2025-05-11',
    name: 'วันวิสาขบูชา',
    nameEn: 'Visakha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันวิสาขบูชา',
    icon: '🪷'
  },
  {
    id: 'h-2025-05-12',
    date: '2025-05-12',
    name: 'วันหยุดชดเชยวันวิสาขบูชา',
    nameEn: 'Substitution for Visakha Bucha Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'วันหยุดชดเชยวันวิสาขบูชา',
    icon: '🔄'
  },
  {
    id: 'h-2025-06-03',
    date: '2025-06-03',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
    nameEn: "Her Majesty Queen Suthida's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชินี',
    icon: '👑'
  },
  {
    id: 'h-2025-07-10',
    date: '2025-07-10',
    name: 'วันอาสาฬหบูชา',
    nameEn: 'Asarnha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันสำคัญทางพระพุทธศาสนา',
    icon: '🪷'
  },
  {
    id: 'h-2025-07-11',
    date: '2025-07-11',
    name: 'วันเข้าพรรษา',
    nameEn: 'Buddhist Lent Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันเข้าพรรษา (วันหยุดราชการ)',
    icon: '🕯️'
  },
  {
    id: 'h-2025-07-28',
    date: '2025-07-28',
    name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    nameEn: "His Majesty King Rama X's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    icon: '👑'
  },
  {
    id: 'h-2025-08-12',
    date: '2025-08-12',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    nameEn: "Her Majesty Queen Sirikit's Birthday / Mother's Day",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันแม่แห่งชาติ',
    icon: '💙'
  },
  {
    id: 'h-2025-10-13',
    date: '2025-10-13',
    name: 'วันนวมินทรมหาราช',
    nameEn: 'Navamindra Maharaj Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร',
    icon: '🎗️'
  },
  {
    id: 'h-2025-10-23',
    date: '2025-10-23',
    name: 'วันปิยมหาราช',
    nameEn: 'Chulalongkorn Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันคล้ายวันสวรรคต ร.5',
    icon: '🏛️'
  },
  {
    id: 'h-2025-12-05',
    date: '2025-12-05',
    name: 'วันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
    nameEn: 'King Rama IX Birthday / Father Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันพ่อแห่งชาติ',
    icon: '💛'
  },
  {
    id: 'h-2025-12-10',
    date: '2025-12-10',
    name: 'วันรัฐธรรมนูญ',
    nameEn: 'Constitution Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันรัฐธรรมนูญ',
    icon: '📜'
  },
  {
    id: 'h-2025-12-31',
    date: '2025-12-31',
    name: 'วันสิ้นปี',
    nameEn: "New Year's Eve",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสิ้นปี',
    icon: '🎆'
  },

  // ================= ปี 2570 (2027) =================
  {
    id: 'h-2027-01-01',
    date: '2027-01-01',
    name: 'วันขึ้นปีใหม่',
    nameEn: "New Year's Day",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันขึ้นปีใหม่สากล',
    icon: '🎉'
  },
  {
    id: 'h-2027-02-21',
    date: '2027-02-21',
    name: 'วันมาฆบูชา',
    nameEn: 'Makha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันมาฆบูชา',
    icon: '🪷'
  },
  {
    id: 'h-2027-02-22',
    date: '2027-02-22',
    name: 'วันหยุดชดเชยวันมาฆบูชา',
    nameEn: 'Substitution for Makha Bucha Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันมาฆบูชา (ตรงกับวันอาทิตย์)',
    icon: '🔄'
  },
  {
    id: 'h-2027-04-06',
    date: '2027-04-06',
    name: 'วันจักรี',
    nameEn: 'Chakri Memorial Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันจักรี',
    icon: '👑'
  },
  {
    id: 'h-2027-04-13',
    date: '2027-04-13',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์',
    icon: '💦'
  },
  {
    id: 'h-2027-04-14',
    date: '2027-04-14',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์ วันครอบครัว',
    icon: '💦'
  },
  {
    id: 'h-2027-04-15',
    date: '2027-04-15',
    name: 'วันสงกรานต์',
    nameEn: 'Songkran Festival',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสงกรานต์',
    icon: '💦'
  },
  {
    id: 'h-2027-05-01',
    date: '2027-05-01',
    name: 'วันแรงงานแห่งชาติ',
    nameEn: 'National Labour Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันแรงงานแห่งชาติ',
    icon: '🛠️'
  },
  {
    id: 'h-2027-05-03',
    date: '2027-05-03',
    name: 'วันหยุดชดเชยวันแรงงานแห่งชาติ',
    nameEn: 'Substitution for Labour Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันแรงงานแห่งชาติ',
    icon: '🔄'
  },
  {
    id: 'h-2027-05-04',
    date: '2027-05-04',
    name: 'วันฉัตรมงคล',
    nameEn: 'Coronation Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันฉัตรมงคล',
    icon: '👑'
  },
  {
    id: 'h-2027-05-20',
    date: '2027-05-20',
    name: 'วันวิสาขบูชา',
    nameEn: 'Visakha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันวิสาขบูชา',
    icon: '🪷'
  },
  {
    id: 'h-2027-06-03',
    date: '2027-06-03',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
    nameEn: "Her Majesty Queen Suthida's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชินี',
    icon: '👑'
  },
  {
    id: 'h-2027-07-18',
    date: '2027-07-18',
    name: 'วันอาสาฬหบูชา',
    nameEn: 'Asarnha Bucha Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันอาสาฬหบูชา',
    icon: '🪷'
  },
  {
    id: 'h-2027-07-19',
    date: '2027-07-19',
    name: 'วันเข้าพรรษา / ชดเชยวันอาสาฬหบูชา',
    nameEn: 'Buddhist Lent Day',
    category: 'religious',
    isGovernmentHoliday: true,
    description: 'วันเข้าพรรษา (วันหยุดราชการ)',
    icon: '🕯️'
  },
  {
    id: 'h-2027-07-28',
    date: '2027-07-28',
    name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    nameEn: "His Majesty King Rama X's Birthday",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    icon: '👑'
  },
  {
    id: 'h-2027-08-12',
    date: '2027-08-12',
    name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    nameEn: "Her Majesty Queen Sirikit's Birthday / Mother's Day",
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันแม่แห่งชาติ',
    icon: '💙'
  },
  {
    id: 'h-2027-10-13',
    date: '2027-10-13',
    name: 'วันนวมินทรมหาราช',
    nameEn: 'Navamindra Maharaj Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันนวมินทรมหาราช',
    icon: '🎗️'
  },
  {
    id: 'h-2027-10-23',
    date: '2027-10-23',
    name: 'วันปิยมหาราช',
    nameEn: 'Chulalongkorn Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันปิยมหาราช',
    icon: '🏛️'
  },
  {
    id: 'h-2027-10-25',
    date: '2027-10-25',
    name: 'วันหยุดชดเชยวันปิยมหาราช',
    nameEn: 'Substitution for Chulalongkorn Day',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันปิยมหาราช (ตรงกับวันเสาร์ที่ 23 ต.ค.)',
    icon: '🔄'
  },
  {
    id: 'h-2027-12-05',
    date: '2027-12-05',
    name: 'วันคล้ายวันพระบรมราชสมภพ ร.9, วันชาติ และวันพ่อแห่งชาติ',
    nameEn: 'King Rama IX Birthday / Father Day',
    category: 'royal',
    isGovernmentHoliday: true,
    description: 'วันพ่อแห่งชาติ',
    icon: '💛'
  },
  {
    id: 'h-2027-12-06',
    date: '2027-12-06',
    name: 'วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9',
    nameEn: 'Substitution for King Rama IX Birthday',
    category: 'compensatory',
    isGovernmentHoliday: true,
    description: 'ชดเชยวันพ่อแห่งชาติ (ตรงกับวันอาทิตย์ที่ 5 ธ.ค.)',
    icon: '🔄'
  },
  {
    id: 'h-2027-12-10',
    date: '2027-12-10',
    name: 'วันรัฐธรรมนูญ',
    nameEn: 'Constitution Day',
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันรัฐธรรมนูญ',
    icon: '📜'
  },
  {
    id: 'h-2027-12-31',
    date: '2027-12-31',
    name: 'วันสิ้นปี',
    nameEn: "New Year's Eve",
    category: 'government',
    isGovernmentHoliday: true,
    description: 'วันสิ้นปี',
    icon: '🎆'
  }
]

// รายการเดือนภาษาไทย
export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

export const THAI_DAY_NAMES = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
]

export const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

// ฟังก์ชันดึงวันหยุดของปีนั้นๆ
export function getHolidaysForYear(year: number): Holiday[] {
  const yearStr = String(year)
  const holidays = RAW_HOLIDAYS.filter(h => h.date.startsWith(yearStr))
  // เรียงตามวันที่
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

// ฟังก์ชันดึงวันหยุดของเดือนและปีนั้นๆ
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const holidays = RAW_HOLIDAYS.filter(h => h.date.startsWith(prefix))
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

// ฟังก์ชันตรวจสอบว่าวันที่กำหนดเป็นวันหยุดราชการหรือไม่
export function getHolidayByDate(dateStr: string): Holiday | undefined {
  return RAW_HOLIDAYS.find(h => h.date === dateStr)
}

// ฟังก์ชันแปลงวันที่ ISO เป็นภาษาไทยแบบเต็ม
export function formatFullThaiDate(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = Number(yearStr) + 543
  const month = Number(monthStr) - 1
  const day = Number(dayStr)
  
  const d = new Date(`${dateStr}T00:00:00`)
  const dayOfWeek = THAI_DAY_NAMES[d.getDay()]
  
  return `วัน${dayOfWeek}ที่ ${day} ${THAI_MONTH_NAMES[month]} พ.ศ. ${year}`
}

// ฟังก์ชันแปลงวันที่สั้น
export function formatShortThaiDate(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = Number(yearStr) + 543
  const month = Number(monthStr) - 1
  const day = Number(dayStr)
  return `${day} ${THAI_MONTH_SHORT[month]} ${year}`
}

// คำนวณวันหยุดถัดไปจากวันที่อ้างอิง
export function getUpcomingHolidays(referenceDate: string, limit = 5): { holiday: Holiday; daysLeft: number }[] {
  const today = new Date(`${referenceDate}T00:00:00`).getTime()
  
  const upcoming = RAW_HOLIDAYS
    .filter(h => h.date >= referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
    .map(h => {
      const hDate = new Date(`${h.date}T00:00:00`).getTime()
      const diffDays = Math.round((hDate - today) / (1000 * 60 * 60 * 24))
      return {
        holiday: h,
        daysLeft: diffDays
      }
    })

  return upcoming
}
