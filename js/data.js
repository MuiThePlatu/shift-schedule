// ═══════════════════════════════════════════════
//  FIREBASE CONFIG — แก้ไขค่าตรงนี้
// ═══════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDD8OviKwaI5cbAXkZ7ccYqEeJb70qRDVc",
  authDomain:        "shift-schedule-8b5a9.firebaseapp.com",
  databaseURL:       "https://shift-schedule-8b5a9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "shift-schedule-8b5a9",
  storageBucket:     "shift-schedule-8b5a9.firebasestorage.app",
  messagingSenderId: "1005257789735",
  appId:             "1:1005257789735:web:3b9b69768ec17dbb3f1902"
};

// ═══════════════════════════════════════════════
//  STORAGE — Firebase + in-memory cache
// ═══════════════════════════════════════════════
let dbData = { leaves: [] };  // in-memory cache (sync reads)
let firebaseDB   = null;
let firebaseAuth = null;
let currentUser  = null;
function getDbPath() { return 'shift' + curY; }

function load()    { return dbData; }
function persist(d) {
  dbData = d;
  _deferCache = {}; // invalidate deferred holiday cache
  if (firebaseDB) {
    firebaseDB.ref(getDbPath()).set(d).catch(() => showSyncBadge('❌ บันทึกไม่สำเร็จ', '#DC2626'));
  }
}
const uid = () => Math.random().toString(36).slice(2,10);

// Leave record: { id, pid, m, d, lt ('vacation'|'personal'|'sick'|'swap'|'inswap'), origShift, covBy, linkedId? }
// 'inswap' = same-day shift swap (no absence — just traded shifts)
function getLeave(pid, m, d) {
  // inswap and pending are NOT confirmed absences — exclude both
  return load().leaves.find(l => l.pid===pid && l.m===m && l.d===d && l.lt!=='inswap' && l.lt!=='pending') || null;
}
// All covers (for display — includes swap/inswap/pending)
function getCovs(pid, m, d)  { return load().leaves.filter(l => l.covBy===pid && l.m===m && l.d===d); }
// OT-eligible covers only — swap+inswap+pending excluded
function getOTCovs(pid, m, d){ return load().leaves.filter(l => l.covBy===pid && l.m===m && l.d===d && l.lt!=='swap' && l.lt!=='inswap' && l.lt!=='pending'); }
// Same-day swap record for this person
function getInSwap(pid, m, d){ return load().leaves.find(l => l.pid===pid && l.m===m && l.d===d && l.lt==='inswap') || null; }
// Pending swap record where this person is the requester
function getPending(pid, m, d){ return load().leaves.find(l => l.pid===pid && l.m===m && l.d===d && l.lt==='pending') || null; }

// Effective shift: considers same-day swap (inswap)
function effectiveShift(pid, m, d) {
  const ins = getInSwap(pid, m, d);
  if (ins) return baseShift(ins.covBy, m, d); // got the other person's shift
  return baseShift(pid, m, d);
}

// ── Festival (วันเทศกาล) helpers ──────────────────────
function getFestivals(m) { return load().festivals?.[m] || {}; }
function getFestival(m, d) { return getFestivals(m)[d] || null; }
function setFestival(m, d, name) {
  const data = load();
  if (!data.festivals) data.festivals = {};
  if (!data.festivals[m]) data.festivals[m] = {};
  if (name && name.trim()) data.festivals[m][d] = name.trim();
  else delete data.festivals[m][d];
  persist(data);
}

// ═══════════════════════════════════════════════
//  OT CALCULATION — ตาม PPT คู่มือ 6หยุด2
// ═══════════════════════════════════════════════
/*
  Slide 2:  มีกะเช้า + OT ควบบ่าย (ไม่ใช่วันหยุดบ.)     → ×1.5 7ชม
  Slide 3:  มีกะบ่าย + OT ควบเช้า (ไม่ใช่วันหยุดบ.)     → ×1.5 7ชม
  Slide 4:  หยุด (off) + OT ทั้งวัน (เช้า+บ่าย)          → ×1 7ชม + ×3 7ชม
  Slide 5:  มีกะตัวเอง วันหยุดบ. + OT ควบ               → own×1 7ชม + OT×3 7ชม
  Slide 6:  หยุด + OT เช้า, prev=เช้า                    → ×1 7ชม
  Slide 7:  หยุด + OT เช้า, prev=บ่าย                    → ×1 2ชม + ×3 5ชม
  Slide 8:  หยุด + OT บ่าย, prev=เช้า                    → ×1 2ชม + ×3 5ชม
  Slide 9:  หยุด + OT บ่าย, prev=บ่าย                    → ×1 7ชม
  Slide 10: ทำงานปกติวันหยุดบ. กะเช้า                    → ×1 7ชม (own shift)
  Slide 11: ทำงานปกติวันหยุดบ. กะบ่าย                    → ×1 7ชม (own shift)

  DEFERRED: หยุดในวันหยุดบ. → เลื่อนสิทธิ์ ×1 7ชม + cross-OT ×3
             ไปวันทำงานวันแรก (ไม่ใช่วันหยุด) ในเดือนเดียวกัน
*/

// ── หา deferred holidays สำหรับวัน targetD โดยไม่สนใจ leave บน targetD ──────
// ใช้สำหรับ holiday_use Excel text (เพราะ leave วัน targetD คือ holiday_use นั้นเอง)
function deferredHolidayForDay(pid, m, targetD) {
  const result = [];
  for (let d = 1; d <= MD[m-1]; d++) {
    if (!isHol(m, d)) continue;
    const sh = baseShift(pid, m, d);
    if (sh) continue;
    if (getLeave(pid, m, d)) continue;
    for (let dd = d + 1; dd <= MD[m-1]; dd++) {
      const ddSh = baseShift(pid, m, dd);
      if (!ddSh) continue;
      if (isHol(m, dd)) continue;
      if (dd === targetD) {
        // ไม่ check leave บน targetD (เพราะนั่นคือ holiday_use ที่เรากำลัง render)
        result.push({ d, name: HOL_N[doy(m, d)] || 'วันหยุดประจำปี' });
        break;
      }
      if (getLeave(pid, m, dd)) break; // มีการลาก่อนถึง targetD → สิทธิ์ตัด
      break;
    }
  }
  return result;
}

// ── Deferred holiday cache — cleared on every persist() ──────────────────
let _deferCache = {};
function deferredHolidayMap(pid, m) {
  const key = pid + '_' + m;
  if (_deferCache[key]) return _deferCache[key];
  const map = {};
  for (let d = 1; d <= MD[m-1]; d++) {
    if (!isHol(m, d)) continue;
    const sh = baseShift(pid, m, d);
    if (sh) continue;
    if (getLeave(pid, m, d)) continue;
    for (let dd = d + 1; dd <= MD[m-1]; dd++) {
      const ddSh = baseShift(pid, m, dd);
      if (!ddSh) continue;           // off-day → ข้ามไป
      if (isHol(m, dd)) continue;    // เป็นวันหยุดประจำปีอีก → ข้ามไป
      if (getLeave(pid, m, dd)) break; // ← วันแรกที่ทำงานแต่ลาอยู่ → สิทธิ์หมด ไม่เลื่อนต่อ
      if (!map[dd]) map[dd] = [];
      map[dd].push({ d, name: HOL_N[doy(m, d)] || 'วันหยุดประจำปี' });
      break;
    }
  }
  _deferCache[key] = map;
  return map;
}

function prevDayShift(pid, m, d) {
  for (let back = 1; back <= 3; back++) {
    let pm = m, pd = d - back;
    if (pd <= 0) {
      pm = m - 1;
      if (pm < 1) return '';
      pd = MD[pm - 1] + pd;
    }
    const s = baseShift(pid, pm, pd);
    if (s !== '') return s;
  }
  return '';
}

// forceHol=true: treat day like a holiday for OT rate calculation
// (used for deferred holiday benefit days)
function calcOT(covPid, m, d, otShift, forceHol = false) {
  const bShift = baseShift(covPid, m, d);
  const hol    = isHol(m, d) || forceHol;

  // ── Slide 5 + Deferred: วันหยุด (หรือ deferred) + มีกะ + OT ต่างกะ → ×3 7ชม ──
  if (hol && bShift !== '' && bShift !== otShift)
    return { h1:0, h15:0, h3:7, lbl: forceHol ? 'วันชดเชยวันหยุด + ต่างกะ (×3 · 7ชม)' : 'วันหยุดประจำปี + ต่างกะ (×3 · 7ชม)' };

  // ── Slide 10/11: วันหยุด (or deferred) — off day หรือ same shift → ×1 7ชม ──
  if (hol)
    return { h1:7, h15:0, h3:0, lbl: forceHol ? 'วันชดเชยวันหยุด (×1 · 7ชม)' : 'วันหยุดประจำปี (×1 · 7ชม)' };

  // ── Slide 2/3: มีกะ + OT ต่างกะ (ไม่ใช่วันหยุด) → ×1.5 7ชม ──
  if (bShift !== '' && bShift !== otShift)
    return { h1:0, h15:7, h3:0, lbl:'ต่างกะวันเดียวกัน (×1.5 · 7ชม)' };

  // ── Slide 6-9: หยุดส่วนตัว (off) + OT เดี่ยว ──
  if (bShift === '') {
    const prev = prevDayShift(covPid, m, d);
    if (prev === otShift && prev !== '')
      return { h1:7, h15:0, h3:0, lbl:`กะก่อน OT เป็น "${prev}" เหมือนกัน (×1 · 7ชม)` };
    return { h1:2, h15:0, h3:5, lbl:`กะก่อน OT "${prev||'—'}" ≠ "${otShift}" (×1 2ชม + ×3 5ชม)` };
  }

  // fallback: กะเดียวกัน
  return { h1:7, h15:0, h3:0, lbl:'กะเดียวกัน (×1 · 7ชม)' };
}

function monthOT(pid, m) {
  let h1_hol=0, h1_leave=0, h15=0, h3=0;
  const notes = [];
  const deferMap = deferredHolidayMap(pid, m);

  for (let d = 1; d <= MD[m-1]; d++) {
    const bShift   = baseShift(pid, m, d);
    const hol      = isHol(m, d);
    const onLeave  = !!getLeave(pid, m, d);
    const dayCovs  = getOTCovs(pid, m, d);
    const deferred = deferMap[d] || [];       // holidays whose benefit is deferred to today
    const hasDefer = deferred.length > 0;
    const actHol   = hol || hasDefer;         // treat deferred day like a holiday for OT rates

    // ── Slide 10/11: ทำงานกะตัวเองในวันหยุดบ. → ×1 7ชม ──
    if (hol && bShift && !onLeave) {
      h1_hol += 7;
      notes.push(`${d}/${m} ทำงานวันหยุดประจำปี [${bShift}] (×1 · 7ชม)`);
      if (dayCovs.length === 0 && !hasDefer) continue;
    }

    // ── DEFERRED: สิทธิ์ ×1 7ชม ชดเชยจากวันหยุดที่ตรงกับวันหยุดส่วนตัว ──
    if (hasDefer) {
      h1_hol += 7 * deferred.length;
      const dNames = deferred.map(h => `${h.name}(${h.d}/${m})`).join(', ');
      notes.push(`${d}/${m} ชดเชยวันหยุด [${dNames}] → ×1 ${7*deferred.length}ชม`);
    }

    if (dayCovs.length === 0) continue;

    // ── Slide 4: หยุดส่วนตัว + OT ทั้ง 2 กะ (เช้า+บ่าย) ─── (not applicable on deferred/holiday days since has shift)
    const shifts = new Set(dayCovs.map(c => c.origShift));
    if (bShift === '' && !actHol && shifts.has('เช้า') && shifts.has('บ่าย')) {
      h1_leave += 7; h3 += 7;
      const names = dayCovs.map(c => staffById(c.pid).name).join(', ');
      notes.push(`${d}/${m} OT ทั้งวัน 07:00–23:00 แทน ${names} (×1 7ชม + ×3 7ชม = 14ชม)`);
      continue;
    }

    // ── กรณีปกติ (pass forceHol for deferred days) ──
    for (const c of dayCovs) {
      const r = calcOT(pid, m, d, c.origShift, hasDefer && !hol);
      if (actHol) h1_hol += r.h1; else h1_leave += r.h1;
      h15 += r.h15; h3 += r.h3;
      const tot = r.h1 + r.h15 + r.h3;
      if (tot > 0) {
        const owner = staffById(c.pid);
        let label;
        if (c.lt === 'holiday_use') {
          const ownerDeferMap = deferredHolidayMap(owner.id, m);
          const origD = (ownerDeferMap[d]||[])[0];
          label = origD && !isHol(m,d)
            ? `หยุดชดเชย${shortHolName(origD.name)} ${origD.d}/${m}`
            : `หยุด${shortHolName(HOL_N[doy(m,d)]||'วันหยุด')}`;
        } else {
          label = c.origShift;
        }
        notes.push(`${d}/${m} แทน ${owner.name} [${label}] (${tot}ชม. · ${r.lbl})`);
      }
    }
  }
  return { h1_hol, h1_leave, h1: h1_hol+h1_leave, h15, h3, notes };
}

// Short holiday name for Excel cells (max ~10 chars)
function shortHolName(name) {
  const map = {
    'วันขึ้นปีใหม่':          'ปีใหม่',
    'วันหยุดพิเศษ (ครม.)':   'หยุดพิเศษ',
    'วันมาฆบูชา':             'มาฆบูชา',
    'วันจักรี':               'วันจักรี',
    'วันสงกรานต์':            'สงกรานต์',
    'วันแรงงานแห่งชาติ':     'แรงงาน',
    'วันฉัตรมงคล':            'ฉัตรมงคล',
    'ชดเชยวันวิสาขบูชา':     'ชดเชยวิสาขบูชา',
    'วันพระราชินี':           'วันพระราชินี',
    'วันในหลวง ร.10':         'วันในหลวง ร.10',
    'วันอาสาฬหบูชา':          'อาสาฬหบูชา',
    'วันแม่แห่งชาติ':         'วันแม่',
    'วันนวมินทรมหาราช':       'นวมินทรมหาราช',
    'วันปิยมหาราช':           'ปิยมหาราช',
    'ชดเชยวันพ่อแห่งชาติ':   'ชดเชยวันพ่อ',
    'วันรัฐธรรมนูญ':          'รัฐธรรมนูญ',
    'วันสิ้นปี':              'สิ้นปี',
  };
  return map[name] || name;
}

// ── ค่ากะบ่าย: 270 บาท/กะบ่าย (100 ค่ากะ + 170 ค่าเดินทาง) ──
function monthKa(pid, m) {
  let count = 0;
  const details = []; // เก็บ log สำหรับ debug

  for (let d = 1; d <= MD[m-1]; d++) {
    const base    = baseShift(pid, m, d);
    const eff     = effectiveShift(pid, m, d); // บ่ายหรือเช้า หลัง inswap
    const leave   = getLeave(pid, m, d);       // null ถ้าไม่ลา (inswap ไม่ถือเป็น leave)
    const onLeave = !!leave;

    // ── กรณี 1: กะบ่ายตัวเอง (รวม inswap ที่ได้บ่าย) ไม่ลา ──
    if (eff === 'บ่าย' && !onLeave) {
      count++;
      details.push(`${d}/${m} กะบ่าย (ตัวเอง${eff !== base ? '/inswap' : ''})`);
      continue; // ไม่ต้องนับ OT cover เพิ่มในวันเดียวกัน (ป้องกัน double-count)
    }

    // ── กรณี 2: รับ OT กะบ่าย (leave cover) — ไม่ได้ลาวันนั้น ──
    for (const c of getOTCovs(pid, m, d)) {
      if (c.origShift === 'บ่าย') {
        count++;
        details.push(`${d}/${m} OT กะบ่าย (แทน ${staffById(c.pid).name})`);
      }
    }

    // ── กรณี 3: รับสลับกะบ่าย (swap cover) — ทำงานบ่ายจริง ──
    for (const c of getCovs(pid, m, d).filter(cv => cv.lt === 'swap')) {
      if (c.origShift === 'บ่าย') {
        count++;
        details.push(`${d}/${m} สลับกะบ่าย (แทน ${staffById(c.pid).name})`);
      }
    }
  }

  return { count, total: count * 270, ka: count * 100, travel: count * 170, details };
}
