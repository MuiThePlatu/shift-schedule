// ═══════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════
let curM = 5;
let curY = 2026;
const AVAILABLE_YEARS = [2024,2025,2026,2027,2028,2029,2030];
let otOpen = true;

function renderAll() { renderNav(); renderTable(); renderOTTable(); }

function renderNav() {
  document.getElementById('mnav').innerHTML =
    `<select id="ySel" onchange="setY(this.value)" style="margin-right:8px;padding:5px 10px;border:1.5px solid var(--line2);border-radius:var(--r20);font-size:11px;font-weight:600;font-family:inherit;color:var(--ink2);background:var(--card);cursor:pointer">` +
    AVAILABLE_YEARS.map(y => `<option value="${y}"${y===curY?' selected':''}>${y}</option>`).join('') +
    `</select>` +
    `<button class="mb" onclick="setM(curM-1)" title="เดือนก่อนหน้า" style="font-weight:700">‹</button>` +
    MS.map((s,i) => `<button class="mb${i+1===curM?' cur':''}" onclick="setM(${i+1})">${s}</button>`).join('') +
    `<button class="mb" onclick="setM(curM+1)" title="เดือนถัดไป" style="font-weight:700">›</button>` +
    `<button class="mb" onclick="goToday()" title="กลับไปเดือน-ปีปัจจุบัน" style="margin-left:6px">📍 วันนี้</button>`;
  document.getElementById('hdrM').textContent = MN[curM-1] + ' ' + curY;
}

function goToday() {
  const now = new Date();
  const y = now.getFullYear() >= AVAILABLE_YEARS[0] && now.getFullYear() <= AVAILABLE_YEARS[AVAILABLE_YEARS.length-1] ? now.getFullYear() : 2026;
  const m = now.getMonth() + 1;
  const yearChanged = y !== curY;
  curM = m;
  if (yearChanged) { document.getElementById('ySel') && (document.getElementById('ySel').value = y); setY(y); }
  else renderAll();
}

function renderTable() {
  const m = curM;

  // ── Header: row1 (team + group labels) + row2 (names) ──
  document.getElementById('thead').innerHTML = `
    <tr id="hdr1">
      <th class="fc1" rowspan="2" style="text-align:center">วัน</th>
      <th class="fc2" rowspan="2" style="text-align:left;padding-left:10px">วันที่</th>
      <th colspan="4" class="th-app" style="background:var(--app-light);color:var(--app-dark)">ทีม App</th>
      <th colspan="4" class="th-vas sep-left" style="background:var(--vas-light);color:var(--vas-dark)">ทีม VAS</th>
    </tr>
    <tr id="hdr2">${STAFF.map((s,i) => {
      const sep = i===4 ? ';border-left:2px solid var(--line2)' : '';
      return `<th style="min-width:115px;font-size:9px;font-weight:500${sep}">
        <div style="font-size:12px;font-weight:700;letter-spacing:.5px;color:${s.team==='App'?'var(--app-dark)':'var(--vas-dark)'}">${s.grp}</div>
        <div style="font-weight:400;color:var(--ink2);font-size:9px;margin-top:1px">${s.sh}</div>
      </th>`;
    }).join('')}</tr>`;

  // Fix sticky values for header rows within scroll container
  requestAnimationFrame(() => {
    const h1 = document.getElementById('hdr1');
    if (!h1) return;
    const r1h = h1.offsetHeight;

    // Row 2: sticky top at row1 height
    document.getElementById('hdr2').querySelectorAll('th').forEach(th => {
      th.style.top = r1h + 'px';
    });

    // Row 1: all cells sticky top at 0
    h1.querySelectorAll('th').forEach(th => {
      th.style.top = '0px';
    });

    // Fix team headers background explicitly (prevents transparent on scroll)
    h1.querySelectorAll('.th-app').forEach(th => { th.style.background = 'var(--app-light)'; });
    h1.querySelectorAll('.th-vas').forEach(th => { th.style.background = 'var(--vas-light)'; });

    // ── Corner cells: sticky BOTH top and left — set individual properties for browser compatibility ──
    const fc1 = h1.querySelector('.fc1');
    const fc2 = h1.querySelector('.fc2');
    if (fc1) {
      fc1.style.position = 'sticky';
      fc1.style.top      = '0px';
      fc1.style.left     = '0px';
      fc1.style.zIndex   = '40';
      fc1.style.background = 'var(--card, #fff)';
    }
    if (fc2) {
      const fc1w = fc1 ? (fc1.offsetWidth || 34) : 34;
      fc2.style.position = 'sticky';
      fc2.style.top      = '0px';
      fc2.style.left     = fc1w + 'px';
      fc2.style.zIndex   = '40';
      fc2.style.background = 'var(--card, #fff)';
      // Sync data row fc2 left if fc1 actual width differs from CSS 34px
      if (fc1w !== 34) {
        document.querySelectorAll('#tbody .fc2').forEach(td => { td.style.left = fc1w + 'px'; });
      }
    }
  });

  let rows = '';
  // Pre-compute deferred maps for all staff once (not per-cell) to avoid 248x localStorage reads
  const allDeferMaps = {};
  STAFF.forEach(s => { allDeferMaps[s.id] = deferredHolidayMap(s.id, m); });

  for (let d = 1; d <= MD[m-1]; d++) {
    const D    = doy(m,d);
    const wk   = isWknd(m,d);
    const hol  = isHol(m,d);
    const fest = !hol ? getFestival(m,d) : null; // festival only shown if not already a holiday
    const holN = HOL_N[D] || '';
    const now2 = new Date();
    const isToday = now2.getFullYear()===curY && now2.getMonth()+1===m && now2.getDate()===d;
    const cls  = isToday ? 'row-today' : hol ? 'row-hol' : wk ? 'row-wknd' : fest ? 'row-fest' : '';
    const dayN = DN[dow(m,d)];
    const dc   = wk ? 'var(--ink3)' : 'var(--ink2)';

    // Date cell content
    let dateLabel = `${d} ${MS[m-1]}`;
    if (holN)  dateLabel += `<br><span style="font-size:9px;color:var(--hol-text)">🎌 ${holN}</span>`;
    if (fest)  dateLabel += `<br><span style="font-size:9px;color:var(--fest-text)">🎉 ${escapeHtml(fest)}</span>`;
    const cells = STAFF.map((s,i) => renderCell(s.id, m, d, i===4, allDeferMaps[s.id])).join('');
    rows += `<tr class="${cls}">
      <td class="fc1" style="text-align:center;font-weight:600;font-size:11px;color:${dc}">${dayN}</td>
      <td class="fc2" style="text-align:left;padding-left:8px">${dateLabel}</td>
      ${cells}
    </tr>`;
  }
  document.getElementById('tbody').innerHTML = rows;
}

function renderCell(pid, m, d, addSep, deferMap) {
  const leave   = getLeave(pid, m, d);
  const inswap  = getInSwap(pid, m, d);
  const covs    = getCovs(pid, m, d).filter(c => c.lt !== 'inswap');
  const base    = baseShift(pid, m, d);
  const effBase = effectiveShift(pid, m, d);
  const sepStyle = addSep ? 'border-left:2px solid var(--line2)' : '';

  // ── OT badge (no swap/inswap) ── use pre-computed deferMap
  const otCovs = covs.filter(c => c.lt !== 'swap');
  let otHtml = '';
  if (otCovs.length > 0) {
    const hasDefer   = deferMap ? (deferMap[d] || []).length > 0 : false;
    const forceHol   = hasDefer && !isHol(m, d);
    const otShiftSet = new Set(otCovs.map(c => c.origShift));
    const isBothShift = base === '' && !isHol(m,d) && !hasDefer && otShiftSet.has('เช้า') && otShiftSet.has('บ่าย');
    let totalOT, badgeTip;
    if (isBothShift) {
      totalOT  = 14;
      badgeTip = 'OT ทั้งวัน: ×1(7h)+×3(7h)=14h';
    } else {
      totalOT  = otCovs.reduce((acc, c) => { const r = calcOT(pid,m,d,c.origShift,forceHol); return acc + r.h1 + r.h15 + r.h3; }, 0);
      badgeTip = otCovs.map(c => {
        const r = calcOT(pid,m,d,c.origShift,forceHol);
        const rStr = (r.h1&&r.h3)?`×1(${r.h1}h)+×3(${r.h3}h)`:r.h15?`×1.5(${r.h15}h)`:r.h3?`×3(${r.h3}h)`:`×1(${r.h1}h)`;
        return `${staffById(c.pid).sh}: ${rStr}`;
      }).join('\n');
    }
    if (totalOT > 0)
      otHtml = `<span class="badge badge-ot" title="${badgeTip}" style="cursor:help;margin-left:3px">OT ${totalOT}h</span>`;
  }

  // ── Same-day inswap: show swapped shift + cancel button ──
  if (inswap) {
    const other   = staffById(inswap.covBy);
    const effS    = effectiveShift(pid, m, d);
    const chipCls = effS==='เช้า'?'chip-am':effS==='บ่าย'?'chip-pm':'chip-off';
    const canDel  = canEditLeave(inswap);
    return `<td class="cell-td" style="${sepStyle}">
      <span class="chip ${chipCls}" style="cursor:default" title="สลับในวัน กับ ${other.name}">${effS}</span>
      <span class="badge badge-ins" style="font-size:8px;margin-left:2px">↔${other.sh}</span>
      ${canDel ? `<button class="del-btn" onclick="delLeave('${inswap.id}')" title="ยกเลิก">✕</button>` : ''}
      ${otHtml}
    </td>`;
  }

  // ── Pending swap request (waiting for covBy to confirm) ──
  const pending = getPending(pid, m, d);
  if (pending) {
    const cov    = staffById(pending.covBy);
    const canDel = canEditLeave(pending);
    return `<td class="cell-td" style="${sepStyle}">
      <span class="badge badge-pending">⏳รอ</span>
      <span style="font-size:9px;color:var(--ink3);margin-left:3px">→${cov.sh}</span>
      ${canDel ? `<button class="del-btn" onclick="delLeave('${pending.id}')" title="ยกเลิก">✕</button>` : ''}
      ${otHtml}
    </td>`;
  }

  // ── Person is on leave ──
  if (leave) {
    const tmap = { vacation:['ลาพ','badge-vac'], personal:['ลาก','badge-per'], sick:['ลาป','badge-sick'], swap:['สลับ','badge-sw'], pending:['⏳รอ','badge-pending'], holiday_use:['🎌หยุด','badge-holuse'] };
    const [lbl, cls] = tmap[leave.lt] || ['ลา','badge-vac'];
    const cov = staffById(leave.covBy);
    const canDel = canEditLeave(leave);
    // If this is a pending swap and the covBy is the current user → show confirm button
    const isPendingForMe = leave.lt === 'pending' && leave.covBy === myPid();
    return `<td class="cell-td" style="${sepStyle}">
      <span class="badge ${cls}">${lbl}</span>
      <span style="font-size:9px;color:var(--ink3);margin-left:3px">→${cov.sh}</span>
      ${isPendingForMe ? `<button onclick="confirmSwap('${leave.id}')" style="background:#22C55E;color:#fff;border:none;border-radius:4px;font-size:9px;padding:1px 6px;cursor:pointer;margin-left:3px">✓</button>` : ''}
      ${canDel ? `<button class="del-btn" onclick="delLeave('${leave.id}')" title="ยกเลิก">✕</button>` : ''}
      ${otHtml}
    </td>`;
  }

  // ── Compute effective shift (base + any coverage) ──
  const covShifts = covs.map(c => c.origShift);
  const allShifts = new Set([effBase, ...covShifts].filter(Boolean));
  let effShift = effBase;
  if (allShifts.has('เช้า') && allShifts.has('บ่าย')) effShift = 'เช้า+บ่าย';
  else if (allShifts.size > 0) effShift = [...allShifts][0];
  else effShift = '';

  if (!effShift) {
    return `<td class="cell-td" style="${sepStyle}"><span class="chip-off">—</span>${otHtml}</td>`;
  }

  const chipCls   = effShift==='เช้า'?'chip-am':effShift==='บ่าย'?'chip-pm':'chip-both';
  const timeHint  = SHIFT_HOURS[effShift]||'';
  const editable  = base && canEdit(pid);
  const clickable = editable ? `onclick="openAction(${pid},${m},${d})"` : 'style="cursor:default"';
  return `<td class="cell-td" style="${sepStyle}">
    <span class="chip ${chipCls}" ${clickable} title="${editable ? 'คลิกเพื่อลา/สลับ · ' : ''}${timeHint}">${effShift}</span>${otHtml}
  </td>`;
}

function renderOTTable() {
  document.getElementById('otrows').innerHTML = STAFF.map(s => {
    const ot = monthOT(s.id, curM);
    const ka = monthKa(s.id, curM);
    const total = ot.h1 + ot.h15 + ot.h3;
    const noteHtml = ot.notes.length
      ? ot.notes.map(n => `<div>${n}</div>`).join('')
      : '<span style="color:var(--ink3)">—</span>';
    const n = v => `<td class="ot-num">${v || '—'}</td>`;
    return `<tr>
      <td><strong>${s.name}</strong><br><span style="font-size:9px;color:var(--ink3)">${s.thName}</span></td>
      <td><span class="team-tag t-${s.team.toLowerCase()}">${s.team}</span></td>
      ${n(ot.h1_hol)}
      ${n(ot.h1_leave)}
      <td class="ot-num" style="font-weight:700">${ot.h1||'—'}</td>
      ${n(ot.h15)}
      ${n(ot.h3)}
      <td class="ot-num" style="font-weight:700">${total||'—'}</td>
      <td class="ot-num">${ka.count ? `<span onclick="showKaDetail(${s.id},${curM})" style="cursor:pointer;border-bottom:1px dashed var(--brand2);color:var(--brand2);font-weight:600">${ka.count}</span>` : '—'}</td>
      <td class="ot-num">${ka.total ? ka.total.toLocaleString() : '—'}</td>
      <td class="ot-note">${noteHtml}</td>
    </tr>`;
  }).join('');
}

function toggleOT() {
  otOpen = !otOpen;
  document.getElementById('otbody').style.display = otOpen ? '' : 'none';
  document.getElementById('ottog').textContent = otOpen ? '▼' : '▶';
}

function showKaDetail(pid, m) {
  const s = staffById(pid);
  const ka = monthKa(pid, m);
  document.getElementById('mbox').innerHTML = `
    <h3>🚌 ค่ากะบ่าย — ${s.name}</h3>
    <div class="m-meta">${MN[m-1]} ${curY} &nbsp;·&nbsp; ${ka.count} กะ &nbsp;·&nbsp; รวม ${ka.total.toLocaleString()} บาท</div>
    <div style="max-height:50vh;overflow-y:auto;font-size:12px;line-height:1.9;color:var(--ink)">
      ${ka.details.length ? ka.details.map(d => `<div style="padding:4px 0;border-bottom:1px solid var(--line)">${d}</div>`).join('') : '<span style="color:var(--ink3)">ไม่มีรายละเอียด</span>'}
    </div>
    <div class="mf" style="margin-top:16px">
      <button class="btn btn-ok" onclick="closeM()">ปิด</button>
    </div>`;
  document.getElementById('mbg').classList.add('on');
}

// ═══════════════════════════════════════════════
//  EXCEL EXPORT — ExcelJS (full template formatting)
// ═══════════════════════════════════════════════

// ── Style constants (exact from template) ──────────────────
const XL = {
  colW:   [{ width:5.7 }, { width:17.7 }, { width:33.7 }, { width:33.7 },
           { width:8.7 }, { width:9.3 }, { width:8.7 }],
  rowHdr:  17.25,
  rowData: 28.5,
  rowFtr:  17.25,
  pageSetup: {
    paperSize:   9,
    orientation: 'portrait',
    scale:       65,
    fitToPage:   true,
    fitToWidth:  1,
    fitToHeight: 0,
    margins: { top:0.75, bottom:0.75, left:0.70, right:0.70, header:0.30, footer:0.30 }
  },
  dateNum: '[$-F800]dddd\\, mmmm dd\\, yyyy',
  // fills
  fHdr:   { type:'pattern', pattern:'solid', fgColor:{ argb:'FFBDD7EE' } }, // header row 4
  fWknd:  { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFC000' } }, // Sat/Sun
  fHol:   { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFCCCC' } }, // public holiday
  // borders
  bMed:   { style:'medium' },
  bThin:  { style:'thin' },
  // fonts
  // Header row 4 fonts (keep original sizes)
  fTh10B: { name:'Tahoma',  size:10, bold:true  },
  fTh9B:  { name:'Tahoma',  size:9,  bold:true  },
  // Data rows A5:H36 fonts — size 11
  fTh11:  { name:'Tahoma',  size:11, bold:false },
  fCal11: { name:'Calibri', size:11, bold:false },
  // alignment
  aC:  { horizontal:'center', vertical:'center' },
  aL:  { horizontal:'left',   vertical:'center' },
  aCW: { horizontal:'center', vertical:'center', wrapText:true },
};

function xlBorder(l,r,t,b) {
  const o = {};
  if(l) o.left   = { style:l };
  if(r) o.right  = { style:r };
  if(t) o.top    = { style:t };
  if(b) o.bottom = { style:b };
  return o;
}

async function exportExcel() {
  const btn = document.querySelector('[onclick="exportExcel()"]');
  if(btn){ btn.textContent='⏳ กำลัง Export...'; btn.disabled=true; }

  try {
    // Load ExcelJS if not cached
    if (!window.ExcelJS) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const m  = curM;
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Shift Schedule ' + curY;
    wb.created  = new Date();

    // ── Person sheets: VAS first, then App ─────────────
    const ordered = [
      ...STAFF.filter(s=>s.team==='VAS'),
      ...STAFF.filter(s=>s.team==='App'),
    ];
    ordered.forEach(s => buildPersonWS(wb, s, m));

    // ── Download ─────────────────────────────────────────
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Timework_OT_FBVO-FBBTC_${MN_EN[m-1]}_${curY}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(err) {
    toast('Export ล้มเหลว: ' + err.message);
    console.error(err);
  } finally {
    if(btn){ btn.textContent='⬇ Export Excel'; btn.disabled=false; }
  }
}

// ── ตารางเวร sheet ─────────────────────────────────────────
function buildScheduleWS(wb, m) {
  const GRP_OFF = { A:7, B:19, C:13, D:1 };
  const ws = wb.addWorksheet('ตารางเวร');
  ws.columns = [{ width:0.8 }, { width:5.7 }, { width:17.7 }, { width:10 }, { width:10 }, { width:10 }];
  ws.pageSetup = { ...XL.pageSetup };

  // Rows 1-3: title (merged B:F)
  const titles = [
    'ADVANCED INFO SERVICE',
    '\u00A0BROADBAND SERVICE MANAGEMENT CUSTOMER MONTHLY WORK SCHEDULE',
    `FOR ${MN_EN[m-1]} ${curY}`,
  ];
  titles.forEach((t,i) => {
    const r = ws.addRow([null, t]);
    ws.mergeCells(i+1, 2, i+1, 6);
    r.height = XL.rowHdr;
    const c = r.getCell(2);
    c.font = { name:'Tahoma', size:9 };
    c.alignment = XL.aC;
    if(i===2) c.border = xlBorder(null,null,null,'medium');
  });

  // Row 4: header
  const hRow = ws.addRow([null,'DAY ','DATE','08:00-16:00','16:00-22:00','16:00-22:00']);
  hRow.height = 20;
  hRow.eachCell((c,n) => {
    if(n<2) return;
    c.fill = XL.fHdr; c.alignment = XL.aC;
    c.font = n<=3 ? XL.fTh10B : XL.fTh9B;
    const bL = n===2||n===5 ? 'medium':'thin';
    const bR = n===6 ? 'medium' : n===3 ? 'medium':'thin';
    c.border = xlBorder(bL,bR,'medium',null);
  });

  // Data rows
  for(let d=1; d<=MD[m-1]; d++){
    let am='',pm1='',pm2='';
    ['A','B','C','D'].forEach(g => {
      const pos=(doy(m,d)-1+GRP_OFF[g])%24;
      const sh=pos<=5?'เช้า':pos<=7?'':pos<=13?'บ่าย':pos<=15?'':pos<=21?'บ่าย':'';
      if(sh==='เช้า') am=g; else if(sh==='บ่าย'){ if(!pm1)pm1=g; else pm2=g; }
    });
    const dt = new Date(curY,m-1,d);
    const row = ws.addRow([null, DN_EN[dow(m,d)], dt, am, pm1, pm2]);
    row.height = XL.rowData;
    const wk = isWknd(m,d), hl = isHol(m,d);
    const fill = hl ? XL.fHol : wk ? XL.fWknd : null;

    // B (day)
    const b = row.getCell(2);
    b.font=XL.fCal11; b.alignment=XL.aCW;
    b.border=xlBorder('medium','thin', d===1?'medium':null,'thin');
    if(fill) b.fill=fill;

    // C (date)
    const c = row.getCell(3);
    c.font=XL.fCal11; c.alignment=XL.aCW;
    c.numFmt='DD/MMM/YYYY';
    c.border=xlBorder('thin',null, d===1?'medium':null,'thin');
    if(fill) c.fill=fill;

    // D E F (groups)
    [4,5,6].forEach((n,i) => {
      const cl = row.getCell(n);
      cl.font=XL.fCal11; cl.alignment=XL.aC;
      const bL=n===4?'medium':'thin'; const bR=n===6?'medium':'thin';
      cl.border=xlBorder(bL,bR,d===1?'medium':null,'thin');
    });
  }
}

// ── Person sheet ────────────────────────────────────────────
function buildPersonWS(wb, s, m) {
  const ws = wb.addWorksheet(`${s.grp} ${s.thName}`);
  // Col A-H: A=DAY, B=DATE, C=เช้า, D=บ่าย, E=OT×1, F=OT×1.5, G=OT×3, H=Shift Day
  ws.columns = [
    { width:5.7 }, { width:17.7 }, { width:33.7 }, { width:33.7 },
    { width:8.7 }, { width:9.3 },  { width:8.7 },  { width:8.0 },
  ];
  ws.pageSetup = { ...XL.pageSetup };

  const GREY = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF9F9F9F' } };

  // Row 1-3: headers (merged A:H)
  const hdrs = [
    'ADVANCED INFO SERVICE',
    `แบบฟอร์มเบิกค่าล่วงเวลา,ค่ากะ,ค่ารถ และแลกเวลาการทำงานประจำเดือน : ${MN[m-1]} 2026`,
    `การทำงานของ : ${s.thName}   รหัส :  ${s.empId}   แผนก : FBVO-FBBTC   ฝ่าย : NSOC`,
  ];
  hdrs.forEach((t,i) => {
    const r = ws.addRow([t]);
    ws.mergeCells(i+1,1,i+1,8);
    r.height = XL.rowHdr;
    const c = r.getCell(1);
    c.font = { name:'Tahoma', size:9 };
    c.alignment = XL.aC;
    if(i===2) c.border = xlBorder(null,null,null,'medium');
  });

  // Row 4: column headers (A-H)
  const hRow = ws.addRow(['DAY ','DATE','08:00-16:00','14:00-22:00',' O.T.(X1)','O.T.(X1.5)','O.T.(X3)','Shift Day']);
  hRow.height = 20.1;
  const hBorders = [
    ['medium','thin','medium',null],
    ['thin','medium','medium',null],
    [null,'thin','medium',null],
    ['thin','thin','medium',null],
    ['medium','thin','medium',null],
    ['thin','thin','medium',null],
    ['thin','medium','medium',null],
    ['thin','medium','medium',null],
  ];
  hRow.eachCell((c,n) => {
    if(n>8) return;
    c.fill = XL.fHdr; c.alignment = XL.aC;
    c.font = n<=4 ? XL.fTh10B : XL.fTh9B;
    const [l,r,t,b] = hBorders[n-1];
    c.border = xlBorder(l,r,t,b);
  });

  // Data rows
  const deferMap = deferredHolidayMap(s.id, m);
  for(let d=1; d<=MD[m-1]; d++){
    const bShift  = baseShift(s.id,m,d);
    const leave   = getLeave(s.id,m,d);
    const otCovs  = getOTCovs(s.id,m,d);
    const hl      = isHol(m,d);
    const holName = HOL_N[doy(m,d)]||'วันหยุดประจำปี';
    const wk      = isWknd(m,d);
    const deferred = deferMap[d] || [];
    const hasDefer = deferred.length > 0;
    const forceHol = hasDefer && !hl;

    let cC=null,cD=null,cE=null,cF=null,cG=null,cH=null;
    const effShift = (() => {
      const ins = leave ? null : getInSwap(s.id,m,d);
      if (ins) return baseShift(ins.covBy,m,d);
      return bShift;
    })();

    if(leave && leave.lt !== 'swap' && leave.lt !== 'inswap'){
      if(leave.lt === 'holiday_use') {
        let txt;
        if(hl) {
          // กรณีทำงานวันหยุด: "ใช้สิทธิ์หยุด วันพระราชินี"
          txt = `ใช้สิทธิ์หยุด ${shortHolName(holName)}`;
        } else {
          // กรณีเลื่อนสิทธิ์: ค้นหาวันหยุดที่เลื่อนมาที่วัน d โดยไม่สนใจ leave วัน d
          const deferred4this = deferredHolidayForDay(s.id, m, d);
          if(deferred4this.length > 0) {
            const orig = deferred4this[0];
            txt = `ใช้สิทธิ์หยุดชดเชย ${shortHolName(orig.name)} ${orig.d}/${m}/${curY}`;
          } else {
            txt = `ใช้สิทธิ์หยุด ${shortHolName(holName||'วันหยุดประจำปี')}`;
          }
        }
        if(leave.origShift==='เช้า') cC=txt; else cD=txt;
      } else {
        const ltLbl = LT_TH[leave.lt] || leave.lt;
        const covP  = staffById(leave.covBy);
        const txt   = `${ltLbl} ${firstName(covP)} แทน`;
        if(leave.origShift==='เช้า') cC=txt; else cD=txt;
      }
      // swap/inswap: grey fill only, no text (verbal agreement)
    } else if(bShift && hl){
      // กรณีทำงานวันหยุด: (OT) วันพระราชินี
      const txt=`(OT) ${holName}`;
      if(bShift==='เช้า') cC=txt; else cD=txt;
      cE=7;
      if(bShift==='บ่าย') cH=1;
    } else if(bShift && hasDefer) {
      // กรณีเลื่อนสิทธิ์: (OT) ชดเชยวันวิสาขบูชา 1/6/2026 (วันต้นทาง/เดือน/ปี)
      const dNames = deferred.map(h => `${h.name} ${h.d}/${m}/${curY}`).join('/');
      const txt=`(OT) ${dNames}`;
      if(bShift==='เช้า') cC=txt; else cD=txt;
      cE = 7 * deferred.length;
      if(bShift==='บ่าย') cH=1;
    } else if(bShift) {
      // Normal working: grey only (no text), Shift Day if บ่าย
      const ins = getInSwap(s.id,m,d);
      if(!ins && bShift==='บ่าย') cH=1;
      if(ins && effShift==='บ่าย') cH=1;
    }

    // OT covers (no swap, no inswap text) — use forceHol for calcOT on deferred days
    for(const c of otCovs){
      const own=staffById(c.pid);
      let covTxt;
      if(c.lt === 'holiday_use') {
        // ค้นหาวันหยุดที่ owner เลื่อนสิทธิ์มาวันนี้
        const ownerDeferred = deferredHolidayForDay(own.id, m, d);
        if(ownerDeferred.length > 0) {
          const orig = ownerDeferred[0];
          covTxt = `(OT) แทน ${firstName(own)} หยุดชดเชย${shortHolName(orig.name)} ${orig.d}/${m}/${curY}`;
        } else if(isHol(m, d)) {
          covTxt = `(OT) แทน ${firstName(own)} หยุด${shortHolName(HOL_N[doy(m,d)]||'วันหยุดประจำปี')}`;
        } else {
          // fallback: ค้นจาก ownerDeferMap (แบบเดิม)
          const ownerDeferMap = deferredHolidayMap(own.id, m);
          const origD = (ownerDeferMap[d]||[])[0];
          covTxt = origD
            ? `(OT) แทน ${firstName(own)} หยุดชดเชย${shortHolName(origD.name)} ${origD.d}/${m}/${curY}`
            : `(OT) แทน ${firstName(own)} หยุด${shortHolName(HOL_N[doy(m,d)]||'วันหยุดประจำปี')}`;
        }
      } else {
        const ltLbl=LT_TH[c.lt]||c.lt;
        covTxt=`(OT) แทน ${firstName(own)} ${ltLbl}`;
      }
      if(c.origShift==='เช้า') cC=cC?cC+' / '+covTxt:covTxt; else cD=cD?cD+' / '+covTxt:covTxt;
      const r=calcOT(s.id,m,d,c.origShift,forceHol);
      if(r.h1) cE=(cE||0)+r.h1; if(r.h15) cF=(cF||0)+r.h15; if(r.h3) cG=(cG||0)+r.h3;
      if(c.origShift==='บ่าย' && !leave) cH=1;
    }
    // Swap covers: no text (verbal agreement)

    // Date in Thai: "d เดือน 2026"
    const thDate = `${d} ${MN[m-1]} ${curY}`;
    const row = ws.addRow([DN_EN[dow(m,d)], thDate, cC||null, cD||null, cE||null, cF||null, cG||null, cH||null]);
    row.height = XL.rowData;

    const bgFill = hl ? XL.fHol : wk ? XL.fWknd : null;
    const tTop = d===1 ? 'medium' : null;
    // Grey fill: applied when person works/worked that shift (including leave days)
    const greyOnC = bShift==='เช้า' && !getInSwap(s.id,m,d);  // original เช้า shift
    const greyOnD = bShift==='บ่าย' && !getInSwap(s.id,m,d);  // original บ่าย shift
    const insRec  = getInSwap(s.id,m,d);
    const greyInswapC = insRec && effShift==='เช้า'; // after inswap, working เช้า
    const greyInswapD = insRec && effShift==='บ่าย'; // after inswap, working บ่าย

    // Col A: day name
    const ca=row.getCell(1);
    ca.font=XL.fCal11; ca.alignment=XL.aCW;
    ca.border=xlBorder('medium','thin',tTop,'thin');
    if(bgFill) ca.fill=bgFill;

    // Col B: date (Thai text)
    const cb=row.getCell(2);
    cb.font=XL.fCal11; cb.alignment=XL.aCW;
    cb.border=xlBorder('thin',null,tTop,'thin');
    if(bgFill) cb.fill=bgFill;

    // Col C: เช้า content + grey fill if person works เช้า (including leave days)
    const cc=row.getCell(3);
    cc.font=XL.fTh11; cc.alignment=XL.aCW;
    cc.border=xlBorder('medium','thin',tTop,'thin');
    if(greyOnC || greyInswapC) cc.fill=GREY;

    // Col D: บ่าย content + grey fill if person works บ่าย (including leave days)
    const cd=row.getCell(4);
    cd.font=XL.fTh11; cd.alignment=XL.aCW;
    cd.border=xlBorder('thin',null,tTop,'thin');
    if(greyOnD || greyInswapD) cd.fill=GREY;

    // Col E: OT×1
    const ce=row.getCell(5);
    ce.font=XL.fTh11; ce.alignment=XL.aC;
    ce.border=xlBorder('medium','thin',tTop,'thin');

    // Col F: OT×1.5
    const cf=row.getCell(6);
    cf.font=XL.fTh11; cf.alignment=XL.aC;
    cf.border=xlBorder('thin','thin',tTop,'thin');

    // Col G: OT×3
    const cg=row.getCell(7);
    cg.font=XL.fTh11; cg.alignment=XL.aC;
    cg.border=xlBorder('thin','medium',tTop,'thin');

    // Col H: Shift Day
    const ch=row.getCell(8);
    ch.font=XL.fTh11; ch.alignment=XL.aC;
    ch.border=xlBorder('thin','medium',tTop,'thin');
  }

  // SUM row (E-H)
  const lastData = 4 + MD[m-1];
  const sumRow = ws.addRow([null,null,null,null,
    { formula:`SUM(E5:E${lastData})` },
    { formula:`SUM(F5:F${lastData})` },
    { formula:`SUM(G5:G${lastData})` },
    { formula:`SUM(H5:H${lastData})` },
  ]);
  sumRow.height = XL.rowFtr;
  [5,6,7,8].forEach(n => {
    const c=sumRow.getCell(n);
    c.font=XL.fTh11; c.alignment=XL.aC;
    c.border=xlBorder('medium','medium',null,'medium');
  });

  // Signature rows
  const sig = [
    ['   ลงชื่อ …………………………………….. ผู้ขออนุมัติ ', null, null, 'ลงชื่อ …………………………………… ผู้อนุมัติ (DM UP) '],
    [null, `    ( ${s.thName} )`, null, '            ( xxxxxxxxxx )'],
    ['   ลงชื่อ …………………………………หัวหน้างานรับรอง', null, null, 'ลงชื่อ …………………………………... แผนกบุคคล ( ผู้ตรวจสอบ )'],
    [null, '      ( xxxxxxxxxx )', null, '      ( .…………………………………. )'],
  ];
  sig.forEach(r => {
    const row = ws.addRow(r);
    row.height = XL.rowFtr;
    row.eachCell(c => { c.font = { name:'Tahoma', size:9 }; });
  });
}
