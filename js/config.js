// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
// โหลดจาก Firebase (node "staff") หลัง login — ดู loadStaff() ท้ายไฟล์นี้
// ห้าม hardcode PII (ชื่อจริง/รหัสพนักงาน/อีเมล) ตรงนี้อีก เพราะไฟล์นี้ถูก serve เป็น static asset สาธารณะ
let STAFF = [];

// วันหยุดประจำปี พ.ศ. 2569 — ประกาศกลุ่มบริษัทเอไอเอส (19 วัน)
const HOL = new Set([
  1,   // 1 ม.ค.  วันขึ้นปีใหม่
  2,   // 2 ม.ค.  วันหยุดทำการเพิ่มเป็นกรณีพิเศษ
  62,  // 3 มี.ค. วันมาฆบูชา
  96,  // 6 เม.ย. วันจักรี
  103, // 13 เม.ย. วันสงกรานต์
  104, // 14 เม.ย. วันสงกรานต์
  105, // 15 เม.ย. วันสงกรานต์
  121, // 1 พ.ค.  วันแรงงานแห่งชาติ
  124, // 4 พ.ค.  วันฉัตรมงคล
  152, // 1 มิ.ย. ชดเชยวันวิสาขบูชา
  154, // 3 มิ.ย. วันพระราชินี
  209, // 28 ก.ค. วันในหลวง ร.10
  210, // 29 ก.ค. วันอาสาฬหบูชา
  224, // 12 ส.ค. วันแม่แห่งชาติ
  286, // 13 ต.ค. วันนวมินทรมหาราช
  296, // 23 ต.ค. วันปิยมหาราช
  341, // 7 ธ.ค.  ชดเชยวันพ่อแห่งชาติ
  344, // 10 ธ.ค. วันรัฐธรรมนูญ
  365, // 31 ธ.ค. วันสิ้นปี
]);
const HOL_N = {
  1:  'วันขึ้นปีใหม่',
  2:  'วันหยุดพิเศษ (ครม.)',
  62: 'วันมาฆบูชา',
  96: 'วันจักรี',
  103:'วันสงกรานต์',
  104:'วันสงกรานต์',
  105:'วันสงกรานต์',
  121:'วันแรงงานแห่งชาติ',
  124:'วันฉัตรมงคล',
  152:'ชดเชยวันวิสาขบูชา',
  154:'วันพระราชินี',
  209:'วันในหลวง ร.10',
  210:'วันอาสาฬหบูชา',
  224:'วันแม่แห่งชาติ',
  286:'วันนวมินทรมหาราช',
  296:'วันปิยมหาราช',
  341:'ชดเชยวันพ่อแห่งชาติ',
  344:'วันรัฐธรรมนูญ',
  365:'วันสิ้นปี',
};
const MN = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MD = [31,28,31,30,31,30,31,31,30,31,30,31];
const CUM = [0,31,59,90,120,151,181,212,243,273,304,334];
const DN = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const SK = 'shift2026';
const DN_EN   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MN_EN   = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const LT_TH = { vacation:'ลาพักผ่อน', personal:'ลากิจ', sick:'ลาป่วย', swap:'สลับกะ', inswap:'สลับในวัน', pending:'รอยืนยัน', holiday_use:'ใช้สิทธิ์หยุด' };

// ─── Safe lookup by id (not array index) ───────
const staffById = id => STAFF.find(s => s.id === id);

// First name only (for OT cells in Excel)
const firstName = s => s.thName.split(' ')[0];

// Shift working hours
const SHIFT_HOURS = { 'เช้า':'08:00–16:00', 'บ่าย':'14:00–22:00', 'เช้า+บ่าย':'07:00–23:00' };

// ═══════════════════════════════════════════════
//  PERMISSIONS — email → pid mapping (สร้างจาก STAFF[].email หลังโหลดจาก Firebase)
// ═══════════════════════════════════════════════
let EMAIL_TO_PID = {};

// โหลด STAFF + EMAIL_TO_PID จาก Firebase — เรียกครั้งเดียวหลัง login สำเร็จ ก่อน renderAll() ครั้งแรก
// (node "staff" ถูก gate ด้วย Firebase Rules auth != null เหมือนกับข้อมูลตารางกะ)
async function loadStaff() {
  const snap = await firebaseDB.ref('staff').once('value');
  const raw = snap.val() || {};
  STAFF = Object.keys(raw)
    .map(k => ({ id: Number(k), ...raw[k] }))
    .sort((a, b) => a.id - b.id);
  EMAIL_TO_PID = {};
  STAFF.forEach(s => { if (s.email) EMAIL_TO_PID[s.email] = s.id; });
}

// คืน pid ของ user ที่ login อยู่ (null = ไม่พบ)
function myPid() {
  if (!currentUser) return null;
  const pid = EMAIL_TO_PID[currentUser.email];
  return pid !== undefined ? pid : null;
}

// ตรวจว่า user ปัจจุบันมีสิทธิ์แก้ไข pid นี้หรือไม่
function canEdit(pid) {
  return myPid() === pid;
}

// ตรวจว่าเป็นเจ้าของรายการ (ลา) หรือเป็นฝ่ายรับ (covBy)
function canEditLeave(leaf) {
  const mp = myPid();
  if (mp === null) return false;
  return leaf.pid === mp || leaf.covBy === mp;
}

// ═══════════════════════════════════════════════
//  SCHEDULE LOGIC
// ═══════════════════════════════════════════════
const doy = (m, d) => CUM[m-1] + d;
// Zeller's congruence: weekday of Jan 1 of curY, then offset by day-of-year (0=Sun)
function jan1Dow(y) {
  const mm = 13, yy = y - 1; // treat Jan as month 13 of previous year
  const K = yy % 100, J = Math.floor(yy / 100);
  const h = (1 + Math.floor(13*(mm+1)/5) + K + Math.floor(K/4) + Math.floor(J/4) + 5*J) % 7;
  return (h + 6) % 7; // convert Zeller (0=Sat) -> 0=Sun
}
const dow = (m, d) => ((jan1Dow(curY) + doy(m,d) - 1) % 7);
const isWknd = (m, d) => { const w = dow(m,d); return w===0||w===6; };
const isHol = (m, d) => HOL.has(doy(m,d));

// Continuous day offset from 2026-01-01 (handles real leap years via JS Date, so the
// 6-work/2-off/6-work/2-off/6-work/2-off 24-day cycle keeps rotating across year boundaries).
function absDayOffset(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
}
function baseShift(pid, m, d) {
  const pos = (((absDayOffset(curY, m, d) + staffById(pid).off) % 24) + 24) % 24;
  if (pos <= 5)  return 'เช้า';
  if (pos <= 7)  return '';
  if (pos <= 13) return 'บ่าย';
  if (pos <= 15) return '';
  if (pos <= 21) return 'บ่าย';
  return '';
}
