// ═══════════════════════════════════════════════
//  MODAL STATE & ACTIONS
// ═══════════════════════════════════════════════
let ST = {}; // modal state

function openAction(pid, m, d) {
  if (!canEdit(pid)) return; // should not happen (button is hidden), but guard anyway
  const bShift  = baseShift(pid, m, d);
  const effSh   = effectiveShift(pid, m, d); // accounts for inswap
  const D = doy(m, d);
  const holN = HOL_N[D] || '';
  const wkLabel = isWknd(m,d) ? (isHol(m,d) ? '🎌 หยุดราชการ' : '📅 เสาร์-อาทิตย์') : '';
  ST = { pid, m, d, bShift, lt:null, covBy:null, retDay:null };

  const dispShift = effSh || bShift;
  const shiftChip = dispShift === 'เช้า'
    ? `<span class="badge badge-vac" style="font-size:11px;padding:3px 10px">${dispShift} · ${SHIFT_HOURS[dispShift]}</span>`
    : `<span class="badge badge-per" style="font-size:11px;padding:3px 10px">${dispShift} · ${SHIFT_HOURS[dispShift]}</span>`;

  document.getElementById('mbox').innerHTML = `
    <h3>${staffById(pid).name}</h3>
    <div class="m-meta">
      📅 ${d} ${MS[m-1]} ${curY}
      ${holN ? ` &nbsp;·&nbsp; 🎌 ${holN}` : ''}
      ${wkLabel && !holN ? ` &nbsp;·&nbsp; ${wkLabel}` : ''}
      &nbsp;·&nbsp; กะ: ${shiftChip}
    </div>

    <div class="sect">
      <span class="slbl">ประเภท</span>
      <div class="opt-grid">
        <button class="opt" onclick="pickLT(this,'vacation')">🌴 ลาพักผ่อน</button>
        <button class="opt" onclick="pickLT(this,'personal')">📋 ลากิจ</button>
        <button class="opt" onclick="pickLT(this,'sick')">🤒 ลาป่วย</button>
        <button class="opt" onclick="pickLT(this,'swap')">🔄 สลับกะ</button>
        <button class="opt" onclick="pickLT(this,'inswap')">↔ สลับในวัน</button>
        ${(isHol(m,d) || (deferredHolidayMap(pid,m)[d]||[]).length>0) ? `<button class="opt" style="border-color:#FCA5A5;color:#B91C1C" onclick="pickLT(this,'holiday_use')">🎌 ใช้สิทธิ์หยุดประจำปี</button>` : ''}
      </div>
    </div>

    <div id="cs" style="display:none">
      <div class="sect">
        <span class="slbl" id="clbl">เลือกผู้ทำแทน</span>
        <div class="pgrid" id="cgrid"></div>
      </div>
    </div>

    <div id="rs" style="display:none">
      <div class="sect">
        <span class="slbl">วันที่ <span id="rlbl"></span> จะทำแทนกลับ (ในเดือนเดียวกัน)</span>
        <div class="dgrid" id="rgrid"></div>
      </div>
    </div>

    <div id="otprev" style="display:none"></div>

    <div class="mf">
      <button class="btn btn-cn" onclick="closeM()">ยกเลิก</button>
      <button class="btn btn-ok" id="cfbtn" disabled onclick="doConfirm()">✓ ยืนยัน</button>
    </div>`;

  document.getElementById('mbg').classList.add('on');
}

function pickLT(btn, lt) {
  ST.lt = lt; ST.covBy = null; ST.retDay = null;
  document.querySelectorAll('.opt').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const lblMap = { swap:'เลือกผู้ทำแทนในวันนี้', inswap:'เลือกคนที่จะสลับกะด้วย (ต้องทำกะตรงข้ามวันเดียวกัน)' };
  document.getElementById('clbl').textContent = lblMap[lt] || 'เลือกผู้ทำแทน';

  if (lt === 'holiday_use') {
    // holiday_use ยังต้องเลือกคนทำแทน เหมือนลาปกติ
    document.getElementById('cs').style.display = '';
    document.getElementById('rs').style.display = 'none';
    document.getElementById('otprev').style.display = 'none';
    document.getElementById('cfbtn').disabled = true;
    buildCovGrid();
    return;
  }
  document.getElementById('cs').style.display = '';
  document.getElementById('rs').style.display = 'none';
  document.getElementById('otprev').style.display = 'none';
  document.getElementById('cfbtn').disabled = true;
  buildCovGrid();
}

function buildCovGrid() {
  const { pid, m, d, bShift, lt } = ST;
  let html = '';
  STAFF.forEach(s => {
    if (s.id === pid) return;
    if (getLeave(s.id, m, d)) return;
    if (getInSwap(s.id, m, d)) return;

    const sb = baseShift(s.id, m, d);

    if (lt === 'inswap') {
      const elig = (bShift==='เช้า' && sb==='บ่าย') || (bShift==='บ่าย' && sb==='เช้า');
      if (!elig) return;
      html += `<button class="pbtn ${sb==='เช้า'?'p-am':'p-pm'}" onclick="pickCov(this,${s.id})">
        <div class="pname">${s.name}</div>
        <div class="pdetail">${s.team} &nbsp;·&nbsp; ${sb} ↔ ${bShift}</div>
      </button>`;
      return;
    }

    const existing = getCovs(s.id, m, d).filter(c => c.lt !== 'inswap');
    if (existing.length > 0) {
      if (sb !== '') return;
      const coveredShifts = new Set(existing.map(c => c.origShift));
      if (coveredShifts.has(bShift)) return;
      if (!coveredShifts.has(bShift==='เช้า'?'บ่าย':'เช้า')) return;
    }

    const elig = (bShift==='เช้า' && (sb==='บ่าย'||sb==='')) || (bShift==='บ่าย' && (sb==='เช้า'||sb===''));
    if (!elig) return;

    const slbl = sb==='เช้า'?'เช้า':sb==='บ่าย'?'บ่าย':'หยุด';
    const bothNote = (sb==='' && existing.length > 0)
      ? `<div class="pdetail" style="color:#7C3AED;font-size:9px">⭐ เช้า+บ่าย OT 14ชม</div>` : '';
    html += `<button class="pbtn ${sb==='เช้า'?'p-am':sb==='บ่าย'?'p-pm':''}" onclick="pickCov(this,${s.id})">
      <div class="pname">${s.name}</div>
      <div class="pdetail">${s.team} &nbsp;·&nbsp; ${slbl}</div>
      ${bothNote}
    </button>`;
  });
  document.getElementById('cgrid').innerHTML = html || '<div class="ibox i-warn">⚠️ ไม่มีผู้ที่เหมาะสมในวันนี้</div>';
}

function pickCov(btn, covId) {
  ST.covBy = covId; ST.retDay = null;
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const { m, d, bShift, lt } = ST;
  const covName = staffById(covId).name;

  if (lt === 'inswap') {
    const otherShift = baseShift(covId, m, d);
    document.getElementById('otprev').innerHTML =
      `<div class="ibox i-green">↔ สลับกะในวันนี้<br>
      <span style="font-size:10px">${staffById(ST.pid).name} ทำ ${otherShift} &nbsp;|&nbsp; ${covName} ทำ ${bShift}</span><br>
      <small style="opacity:.7">ไม่มี OT · ไม่นับเป็นวันลา</small></div>`;
    document.getElementById('otprev').style.display = '';
    document.getElementById('rs').style.display = 'none';
    document.getElementById('cfbtn').disabled = false;
    return;
  }

  if (lt === 'swap') {
    document.getElementById('otprev').innerHTML =
      `<div class="ibox i-blue">🔄 <strong>${covName}</strong> จะทำแทนในวันนี้ (สลับกะ ไม่มี OT)</div>`;
    document.getElementById('otprev').style.display = '';
    buildRetGrid(covId);
    document.getElementById('rs').style.display = '';
    document.getElementById('rlbl').textContent = staffById(ST.pid).name;
    document.getElementById('cfbtn').disabled = true;
    return;
  }

  // Leave types: calculate OT (account for coverer's deferred holiday)
  const covBase = baseShift(covId, m, d);
  const hol = isHol(m, d);
  const covDeferMap = deferredHolidayMap(covId, m);
  const covHasDefer = (covDeferMap[d] || []).length > 0;
  const covForceHol = covHasDefer && !hol;
  const existCovs = getOTCovs(covId, m, d);
  const willBeBoth = covBase==='' && !hol && !covHasDefer && existCovs.some(c => c.origShift !== bShift && c.origShift !== '');

  // Build leave label for preview
  let leaveLabel = '';
  if (lt === 'holiday_use') {
    const def = (deferredHolidayMap(ST.pid, m)[d] || [])[0];
    leaveLabel = def
      ? `ใช้สิทธิ์หยุดชดเชย ${shortHolName(def.name)}`
      : `ใช้สิทธิ์หยุด ${shortHolName(HOL_N[doy(m,d)] || 'วันหยุด')}`;
  }
  let otMsg;
  if (willBeBoth) {
    otMsg = `<div class="ibox i-green">💰 <strong>${covName}</strong> รับ OT ทั้งวัน 07:00–23:00<br>
      <span style="font-size:10px">×1 7ชม + ×3 7ชม = <strong>14ชม รวม</strong></span></div>`;
  } else {
    const r = calcOT(covId, m, d, bShift, covForceHol);
    const parts = [];
    if (r.h1) parts.push(`${r.h1}ชม. ×1`);
    if (r.h15) parts.push(`${r.h15}ชม. ×1.5`);
    if (r.h3) parts.push(`${r.h3}ชม. ×3`);
    const leaveCtx = leaveLabel ? `<div style="font-size:10px;color:var(--ink2);margin-bottom:4px">🎌 ${leaveLabel}</div>` : '';
    otMsg = `<div class="ibox i-green">${leaveCtx}💰 <strong>${covName}</strong> จะได้รับ OT: ${parts.join(' + ')||'—'}<br>
      <small style="opacity:.7">${r.lbl}</small></div>`;
  }
  document.getElementById('otprev').innerHTML = otMsg;
  document.getElementById('otprev').style.display = '';
  document.getElementById('rs').style.display = 'none';
  document.getElementById('cfbtn').disabled = false;
}

function buildRetGrid(covId) {
  const { pid, m } = ST;
  let html = '';
  for (let dd = 1; dd <= MD[m-1]; dd++) {
    const covShift = baseShift(covId, m, dd);
    if (!covShift) continue;
    if (getLeave(covId, m, dd)) continue;
    if (getLeave(pid, m, dd)) continue;
    if (getInSwap(pid, m, dd)) continue;
    // ── Removed getCovs(pid) check — was incorrectly blocking valid return days ──
    const pShift = baseShift(pid, m, dd);
    const ok = (covShift==='เช้า'&&(pShift==='บ่าย'||pShift==='')) || (covShift==='บ่าย'&&(pShift==='เช้า'||pShift===''));
    if (!ok) continue;
    const hol = isHol(m, dd);
    html += `<button class="dbtn ${covShift==='เช้า'?'d-am':'d-pm'}${hol?' d-hol':''}" onclick="pickRet(this,${dd})">
      ${DN[dow(m,dd)]} ${dd}<br><small>${covShift}</small>
    </button>`;
  }
  document.getElementById('rgrid').innerHTML = html || '<div class="ibox i-warn">⚠️ ไม่มีวันที่เหมาะสมในเดือนนี้</div>';
}

function pickRet(btn, dd) {
  ST.retDay = dd;
  document.querySelectorAll('.dbtn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const { pid, m, covBy } = ST;
  const covRetShift = baseShift(covBy, m, dd);
  const cur = document.getElementById('otprev');
  cur.innerHTML = cur.innerHTML.replace(/<div class="ibox i-blue"[\s\S]*?<\/div>/, '');
  cur.innerHTML += `<div class="ibox i-blue" style="margin-top:6px">🔄 <strong>${staffById(covBy).name}</strong> ทำกะ ${covRetShift} วันที่ ${dd}/${m} → <strong>${staffById(pid).name}</strong> ทำแทน (ไม่มี OT)</div>`;
  document.getElementById('cfbtn').disabled = false;
}

function doConfirm() {
  const { pid, m, d, bShift, lt, covBy, retDay } = ST;

  // Permission check
  if (!canEdit(pid)) { toast('คุณไม่มีสิทธิ์แก้ไขรายการนี้'); return; }

  const data = load();
  const id   = uid();

  if (lt === 'inswap') {
    // inswap — both sides recorded immediately (same-day, no need for confirm)
    const id2     = uid();
    const covShift = baseShift(covBy, m, d);
    data.leaves.push({ id, pid, m, d, lt:'inswap', origShift:bShift, covBy, linkedId:id2 });
    data.leaves.push({ id:id2, pid:covBy, m, d, lt:'inswap', origShift:covShift, covBy:pid, linkedId:id });
    persist(data); closeM(); renderAll();
    return;
  }

  if (lt === 'swap') {
    // วันที่ d: เฉพาะ pid ที่ "ลา" (absent) → covBy มาทำแทน
    // ไม่ต้องสร้าง record ให้ covBy เพราะ covBy จะแสดงผ่าน getCovs() อัตโนมัติ
    const retId = uid();
    data.leaves.push({ id, pid, m, d, lt:'swap', origShift:bShift, covBy, linkedId: retDay !== null && retDay !== undefined ? retId : null });

    // วันที่ retDay: เฉพาะ covBy ที่ "ลา" (absent) → pid มาทำแทนกลับ
    if (retDay !== null && retDay !== undefined) {
      const covRetShift = baseShift(covBy, m, retDay);
      data.leaves.push({ id:retId, pid:covBy, m, d:retDay, lt:'swap', origShift:covRetShift, covBy:pid, linkedId:id });
    }

    persist(data); closeM(); renderAll();
    showSyncBadge('✅ สลับกะแล้ว');
    return;
  }

  // holiday_use — self-holiday with cover (same as leave but different text)
  if (lt === 'holiday_use') {
    const rec = { id, pid, m, d, lt, origShift: bShift, covBy };
    data.leaves.push(rec);
    persist(data); closeM(); renderAll();
    showSyncBadge('🎌 บันทึกใช้สิทธิ์หยุดประจำปีแล้ว');
    return;
  }

  // Leave types (vacation/personal/sick)
  const rec = { id, pid, m, d, lt, origShift: bShift, covBy };
  data.leaves.push(rec);
  persist(data); closeM(); renderAll();
}

// covBy confirms a pending swap request
function confirmSwap(pendingId) {
  const data   = load();
  const leaf   = data.leaves.find(l => l.id === pendingId);
  if (!leaf) return;

  // Permission: only the covBy can confirm
  if (leaf.covBy !== myPid()) { toast('คุณไม่มีสิทธิ์ยืนยันรายการนี้'); return; }
  if (!confirm(`ยืนยันรับสลับกะ ${leaf.origShift} วันที่ ${leaf.d}/${leaf.m}?`)) return;

  const linked = data.leaves.find(l => l.id === leaf.linkedId);

  // Convert both pending records to proper swap records
  leaf.lt   = 'swap';
  if (linked) linked.lt = 'swap';

  // Now handle the return day if retDay was set
  const retDay = leaf.retDay;
  if (retDay !== null && retDay !== undefined) {
    const retId       = uid();
    const retId2      = uid();
    const covRetShift = baseShift(leaf.covBy,  leaf.m, retDay);
    const pidRetShift = baseShift(leaf.pid, leaf.m, retDay);

    // Remove old linkedId, set new ones for return swap
    if (linked) {
      linked.linkedId = retId;
      data.leaves.push({ id:retId, pid:leaf.pid, m:leaf.m, d:retDay, lt:'swap',
        origShift:covRetShift, covBy:leaf.covBy, linkedId:retId2 });
      data.leaves.push({ id:retId2, pid:leaf.covBy, m:leaf.m, d:retDay, lt:'swap',
        origShift:pidRetShift, covBy:leaf.pid, linkedId:retId });
    }
  }

  persist(data); renderAll();
  showSyncBadge('✅ ยืนยันสลับกะแล้ว');
}

function delLeave(lid) {
  const data = load();
  const leaf = data.leaves.find(l => l.id === lid);
  if (!leaf) return;

  // Permission check
  if (!canEditLeave(leaf)) { toast('คุณไม่มีสิทธิ์ยกเลิกรายการนี้'); return; }
  if (!confirm('ต้องการยกเลิกรายการนี้?')) return;

  const remove = new Set([lid]);
  if (leaf.linkedId) remove.add(leaf.linkedId);
  data.leaves = data.leaves.filter(l => !remove.has(l.id));
  persist(data);
  renderAll();
}

function editFestival(m, d) {
  const existing = getFestival(m, d) || '';
  const mbox = document.getElementById('mbox');
  mbox.innerHTML = `
    <h3>🎉 วันเทศกาล — ${d} ${MS[m-1]} ${curY}</h3>
    <div class="m-meta" style="font-size:11px;color:var(--ink2)">ใส่ชื่อเทศกาล/งานพิเศษ (จะแสดงแถวสีเหลืองอ่อนในตาราง แต่ไม่นับเป็นวันหยุดประจำปี)</div>
    <input id="festInput" type="text" value="${escapeHtml(existing)}"
      placeholder="เช่น ลอยกระทง, วันครอบครัว"
      style="width:100%;padding:9px 12px;border:1.5px solid var(--line2);border-radius:var(--r8);font-size:13px;font-family:inherit;background:var(--canvas);color:var(--ink);outline:none;margin-top:4px">
    <div class="mf">
      ${existing ? `<button class="btn" style="background:#FEE2E2;color:#DC2626" onclick="saveFestival(${m},${d},'')">🗑 ลบ</button>` : ''}
      <button class="btn btn-cn" onclick="closeM()">ยกเลิก</button>
      <button class="btn btn-ok" onclick="saveFestival(${m},${d},document.getElementById('festInput').value)">✓ บันทึก</button>
    </div>`;
  document.getElementById('mbg').classList.add('on');
  setTimeout(() => document.getElementById('festInput')?.focus(), 50);
}

function saveFestival(m, d, name) {
  setFestival(m, d, name);
  closeM();
  renderAll();
}

function closeM() { document.getElementById('mbg').classList.remove('on'); }
function bgClick(e) { if (e.target === e.currentTarget) closeM(); }
