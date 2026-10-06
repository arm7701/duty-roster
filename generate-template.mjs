import * as XLSX from 'xlsx';
import * as path from 'path';

// รายชื่อบุคลากรตัวอย่างตามสายงาน
const mdList = [
  'พ.อ. วิชัย ศุภกิจ',
  'พ.อ. ณรงค์ฤทธิ์ วัฒนชัย',
  'น.อ. ธนกฤต มณีรัตน์'
];

const fmoList = [
  'ร.ต. ธีรภัทร อุดมศรี',
  'ร.ต.หญิง ปาริชาติ สุขเกษม',
  'ร.ต.หญิง กมลชนก พูลเพิ่ม',
  'พ.ต. ชูเกียรติ พงษ์ศิริ'
];

const gsoList = [
  'จ.ส.อ. วีรพล อินทร์แก้ว',
  'จ.ส.อ. กิตติพงษ์ แสงทอง',
  'จ.ส.อ. ชาญณรงค์ พรหมมา',
  'ร.ท. ศุภณัฐ ธนะรัชต์'
];

// ข้อมูลจำลองตารางเวร 4 คอลัมน์ตายตัว: วันที่, MD, FMO, GSO (ครอบคลุมทั้งเดือน 31 วัน)
const sampleData = [];

for (let day = 1; day <= 31; day++) {
  const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
  sampleData.push({
    "วันที่": dateStr,
    "MD": mdList[(day - 1) % mdList.length],
    "FMO": fmoList[(day - 1) % fmoList.length],
    "GSO": gsoList[(day - 1) % gsoList.length]
  });
}

const worksheet = XLSX.utils.json_to_sheet(sampleData, {
  header: ["วันที่", "MD", "FMO", "GSO"]
});

// กำหนดความกว้างคอลัมน์ให้สวยงาม อ่านง่าย
worksheet['!cols'] = [
  { wch: 18 }, // วันที่
  { wch: 30 }, // MD
  { wch: 30 }, // FMO
  { wch: 30 }  // GSO
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "ตารางเวร");

// เขียนไฟล์ไปยัง root directory และ public directory
const rootPath = path.resolve(process.cwd(), 'duty_roster_template.xlsx');
const publicPath = path.resolve(process.cwd(), 'public', 'duty_roster_template.xlsx');

XLSX.writeFile(workbook, rootPath);
console.log(`Generated: ${rootPath}`);

XLSX.writeFile(workbook, publicPath);
console.log(`Generated: ${publicPath}`);
