// ═══════════════════════════════════════════════
//  TRIG AAF JS — แปลง AmfCounterDetail → คำสั่ง curl Trig AAF
// ═══════════════════════════════════════════════

const TA_TEMPLATE = 'curl -X POST http://10.198.99.82:8001/api/v1/aaf/pushNotificationInfo.json -d \'{"commandId": "{commandId}","eventType":"reactive","subscriptionId":"3|{msisdn}","publicId":"","packageNo":"{packageNo}","packageName":"{packageName}","packageStartTime":"{start}","packageExpiryTime":"{expiry}","listOfServiceId":[{"serviceId":""}],"listOfApp":[{"groupId": "1","serviceId":"67","counterType":"partnerstb","listOfAppId":[{"appId":"{appId}"}]}]}\'';

const TA_CHILD_MARKER   = 'Text:ChildCounterEntry=';
const TA_PKG_MARKER     = 'Text:AmfCounterDetail=';
const TA_COUNTER_OFFSET = 4;        // ช่องที่ 5 นับจากช่อง ChildCounterEntry
const TA_WETV           = '30207';
const TA_IQIYI          = '30091';

// บรรทัดที่ขึ้นต้นด้วย "<เบอร์>;Text:AmfCounterDetail=" คือจุดเริ่ม package ใหม่
const TA_PKG_START_RE = /^\s*\d+\s*;\s*Text:AmfCounterDetail=/;
// รายการ appId คั่นด้วยจุลภาค เช่น "3009100018,3020710036"
const TA_APPID_LIST_RE = /^\d{5,}(?:\s*,\s*\d{5,})*$/;

// 2026-08-21T21:28:50.0700000+07:00 → 20260821212850
function ta_fmtTime(v) {
  return String(v || '').slice(0, 19).replace(/\D/g, '');
}

function ta_pad6(n) {
  return String(n).padStart(6, '0');
}

// ตัดเครื่องหมายคำพูดที่ห่อค่าไว้ออก
function ta_unquote(v) {
  const s = String(v == null ? '' : v).trim();
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

// รวมบรรทัดเป็น record: บรรทัดที่ขึ้นต้นด้วย ";;;;" เป็นบรรทัดต่อของ package ก่อนหน้า
function ta_splitRecords(raw) {
  const records = [];
  let current = null;

  String(raw || '').split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    if (TA_PKG_START_RE.test(line)) {
      current = line.trim();
      records.push({ text: current });
      return;
    }
    if (!records.length) return;                 // ข้อมูลก่อน package แรก — ข้าม
    const prev = records[records.length - 1];
    // บรรทัดต่อขึ้นต้นด้วย ; อยู่แล้ว จึงต่อตรง ๆ ไม่ต้องเติมตัวคั่น
    prev.text += (line.startsWith(';') ? '' : ';') + line.replace(/\s+$/, '');
  });

  return records.map(r => r.text);
}

// ตัด ";OK." ท้าย record ออกก่อนประมวลผล
function ta_stripOk(record) {
  return record.replace(/;\s*OK\.\s*$/i, '').replace(/\s+$/, '');
}

// อ่าน child counter ทุกก้อนจากช่องที่ split แล้ว (หา "Text:ChildCounterEntry=" ไม่ hardcode ตำแหน่ง)
function ta_parseChildren(fields) {
  const starts = [];
  fields.forEach((f, i) => {
    if (String(f).trim().startsWith(TA_CHILD_MARKER)) starts.push(i);
  });

  return starts.map((start, n) => {
    const end = n + 1 < starts.length ? starts[n + 1] : fields.length;
    const chunk = fields.slice(start, end);
    const counterType = ta_unquote(chunk[TA_COUNTER_OFFSET] || '').toLowerCase();

    // ช่องสุดท้ายของ child คือรายการ appId — ไล่จากท้ายมาหาช่องที่เป็นรายการตัวเลข
    let appIds = [];
    for (let i = chunk.length - 1; i > TA_COUNTER_OFFSET; i--) {
      const v = ta_unquote(chunk[i]);
      if (!v) continue;
      if (TA_APPID_LIST_RE.test(v)) {
        appIds = v.split(',').map(s => s.trim()).filter(Boolean);
      }
      break;                                     // ช่องท้ายสุดที่มีค่าแล้วไม่ใช่รายการ appId ⇒ ไม่มี appId
    }

    return { counterType, appIds };
  });
}

function ta_parsePackage(record) {
  const fields = ta_stripOk(record).split(';');
  const pkgField = ta_unquote(fields[1] || '');
  return {
    msisdn:      ta_unquote(fields[0] || ''),
    packageNo:   pkgField.startsWith(TA_PKG_MARKER) ? pkgField.slice(TA_PKG_MARKER.length).trim() : '',
    packageName: ta_unquote(fields[2] || ''),
    start:       ta_fmtTime(ta_unquote(fields[7] || '')),
    expiry:      ta_fmtTime(ta_unquote(fields[9] || '')),
    children:    ta_parseChildren(fields)
  };
}

function ta_parse(raw) {
  return ta_splitRecords(raw).map(ta_parsePackage);
}

function ta_buildCommand(pkg, appId, commandId) {
  return TA_TEMPLATE
    .replace('{commandId}',   commandId)
    .replace('{msisdn}',      pkg.msisdn)
    .replace('{packageNo}',   pkg.packageNo)
    .replace('{packageName}', pkg.packageName)
    .replace('{start}',       pkg.start)
    .replace('{expiry}',      pkg.expiry)
    .replace('{appId}',       appId);
}

// สร้างคำสั่งทั้งหมด — เลขลำดับรันต่อเนื่องข้ามทั้ง 2 กล่อง
function ta_generate(raw, startSeq, dateStr) {
  const packages = ta_parse(raw);
  const wetv = [];
  const iqiyi = [];
  const skipped = [];
  let seq = Number(startSeq) || 1;

  packages.forEach(pkg => {
    pkg.children
      .filter(c => c.counterType === 'partnerstb')
      .forEach(child => {
        child.appIds.forEach(appId => {
          const wSubTtType = appId.slice(0, 5);
          if (wSubTtType !== TA_WETV && wSubTtType !== TA_IQIYI) {
            skipped.push({ appId, wSubTtType, packageNo: pkg.packageNo, msisdn: pkg.msisdn });
            return;
          }
          const commandId = 'AISPLAY_By_NOC_' + dateStr + '_' + ta_pad6(seq++);
          (wSubTtType === TA_WETV ? wetv : iqiyi).push(ta_buildCommand(pkg, appId, commandId));
        });
      });
  });

  return { packages, wetv, iqiyi, skipped, nextSeq: seq };
}

// ═══════════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════════

function ta_todayYmd() {
  const d = new Date();
  return String(d.getFullYear())
       + String(d.getMonth() + 1).padStart(2, '0')
       + String(d.getDate()).padStart(2, '0');
}

function ta_initDefaults() {
  const dateEl = document.getElementById('taDate');
  if (dateEl && !dateEl.value) dateEl.value = ta_todayYmd();
  const seqEl = document.getElementById('taStartSeq');
  if (seqEl && !seqEl.value) seqEl.value = '1';
}

function ta_generateUI() {
  const raw     = document.getElementById('taInput').value;
  const dateStr = (document.getElementById('taDate').value || '').replace(/\D/g, '') || ta_todayYmd();
  const startSeq = parseInt(document.getElementById('taStartSeq').value, 10);

  document.getElementById('taDate').value = dateStr;

  const res = ta_generate(raw, isNaN(startSeq) ? 1 : startSeq, dateStr);

  document.getElementById('taOutWetv').value  = res.wetv.length  ? res.wetv.join('\n')  : 'ไม่พบ';
  document.getElementById('taOutIqiyi').value = res.iqiyi.length ? res.iqiyi.join('\n') : 'ไม่พบ';

  const summary = document.getElementById('taSummary');
  let html = `<div>อ่าน package ได้ <b class="ok">${res.packages.length}</b> รายการ — `
           + `Trig AAF WETV <b class="ok">${res.wetv.length}</b> คำสั่ง, `
           + `Trig AAF iQIYI <b class="ok">${res.iqiyi.length}</b> คำสั่ง</div>`;

  if (res.skipped.length) {
    const rows = res.skipped.map(s =>
      `<tr><td>${ta_esc(s.packageNo)}</td><td>${ta_esc(s.appId)}</td><td>${ta_esc(s.wSubTtType)}</td></tr>`
    ).join('');
    html += `<div style="margin-top:10px">ข้ามไป <b class="no">${res.skipped.length}</b> appId เพราะ wSubTtType ไม่ใช่ 30207/30091</div>`
          + `<table style="margin-top:6px"><tr><th>packageNo</th><th>appId</th><th>wSubTtType</th></tr>${rows}</table>`;
  } else if (res.packages.length) {
    html += `<div style="margin-top:10px">ไม่มี appId ที่ถูกข้าม</div>`;
  } else {
    html = `<div class="info">ไม่พบ package ในข้อมูลที่วาง</div>`;
  }
  summary.innerHTML = html;
}

function ta_esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function ta_copy(id, btn) {
  const el = document.getElementById(id);
  if (!el.value || el.value === 'ไม่พบ') return;
  navigator.clipboard.writeText(el.value).then(() => {
    const original = btn.textContent;
    btn.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

function ta_clear() {
  document.getElementById('taInput').value = '';
  document.getElementById('taOutWetv').value = '';
  document.getElementById('taOutIqiyi').value = '';
  document.getElementById('taSummary').innerHTML = '<p class="info">ยังไม่มีข้อมูล — วางข้อมูลแล้วกดปุ่ม "Generate"</p>';
}

// export สำหรับสคริปต์ทดสอบใน Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ta_parse, ta_generate, ta_buildCommand, ta_fmtTime, ta_splitRecords, TA_TEMPLATE };
}
