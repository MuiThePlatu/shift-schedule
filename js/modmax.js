// ═══════════════════════════════════════════════
//  MOD MAX JS
// ═══════════════════════════════════════════════

const BATCH_SIZE = 10;
// เก็บการจับคู่ id -> phone ไว้ในหน่วยความจำของหน้านี้ (คงอยู่จนกว่าจะรีเฟรชหน้า)
let mm_idToPhoneMap = {};
let mm_lastFailRows = []; // เก็บรายการ False ล่าสุดไว้สร้างอีเมล

function mm_parsePairs(raw) {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // รองรับทั้ง tab และช่องว่างหลายตัวเป็นตัวคั่น
      const parts = line.split(/\t+/);
      if (parts.length < 2) {
        const spaceParts = line.split(/\s+/);
        return { phone: spaceParts[0] || '', id: spaceParts.slice(1).join(' ') || '' };
      }
      return { phone: parts[0].trim(), id: parts.slice(1).join(' ').trim() };
    })
    .filter(p => p.id.length > 0);
}

function mm_convert() {
  const raw = document.getElementById('input').value;
  const pairs = mm_parsePairs(raw);

  const outputDiv = document.getElementById('output');
  const countInfo = document.getElementById('countInfo');
  outputDiv.innerHTML = '';

  if (pairs.length === 0) {
    outputDiv.innerHTML = '<p class="info">ไม่พบข้อมูล กรุณาวางข้อมูลในรูปแบบ "Acc[Tab]ID"</p>';
    countInfo.textContent = '';
    return;
  }

  // บันทึกการจับคู่ id -> phone ไว้ใช้ในขั้นตอนที่ 2
  pairs.forEach(p => { mm_idToPhoneMap[p.id] = p.phone; });

  const batches = [];
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    batches.push(pairs.slice(i, i + BATCH_SIZE));
  }

  countInfo.textContent = `ทั้งหมด ${pairs.length} รายการ → แบ่งเป็น ${batches.length} ชุด (ชุดละสูงสุด ${BATCH_SIZE})`;

  batches.forEach((batch, idx) => {
    const jsonObj = { partnerUserIDs: batch.map(p => ({ partnerUserID: p.id })) };
    const jsonStr = JSON.stringify(jsonObj, null, 4);

    const batchDiv = document.createElement('div');
    batchDiv.className = 'batch';

    const header = document.createElement('div');
    header.className = 'batch-header';
    header.innerHTML = `<span>ชุดที่ ${idx + 1} (${batch.length} รายการ)</span>`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'small';
    copyBtn.textContent = 'คัดลอก';
    copyBtn.onclick = () => mm_copyText(jsonStr, copyBtn);
    header.appendChild(copyBtn);

    const pre = document.createElement('pre');
    pre.textContent = jsonStr;

    batchDiv.appendChild(header);
    batchDiv.appendChild(pre);
    outputDiv.appendChild(batchDiv);
  });
}

function mm_checkResult() {
  const raw = document.getElementById('resultInput').value.trim();
  const resultOutput = document.getElementById('resultOutput');
  resultOutput.innerHTML = '';

  if (!raw) {
    resultOutput.innerHTML = '<p class="info">กรุณาวางผลลัพธ์ JSON ก่อน</p>';
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    resultOutput.innerHTML = '<p class="info" style="color:#dc2626;">รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่วาง</p>';
    return;
  }

  const resultData = parsed?.Result?.ResultData || parsed?.ResultData || [];
  if (!Array.isArray(resultData) || resultData.length === 0) {
    resultOutput.innerHTML = '<p class="info" style="color:#dc2626;">ไม่พบ ResultData ในข้อมูลที่วาง</p>';
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const rows = resultData.map(item => {
    const id = item.partnerUserID || '';
    const phone = mm_idToPhoneMap[id] || '(ไม่พบเบอร์ - ยังไม่เคยแปลงในขั้นตอนที่ 1)';
    const isSuccess = !!item.isSuccess;
    if (isSuccess) successCount++; else failCount++;
    return { phone, id, isSuccess, reason: item.reason || '' };
  });

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'summary';
  summaryDiv.innerHTML = `รวม ${rows.length} รายการ — <b class="ok">สำเร็จ ${successCount}</b> / <b class="no">ไม่สำเร็จ ${failCount}</b>`;
  resultOutput.appendChild(summaryDiv);

  const successRows = rows.filter(r => r.isSuccess);
  const failRows = rows.filter(r => !r.isSuccess);

  // ตาราง True
  const successTitle = document.createElement('h4');
  successTitle.style.margin = '14px 0 6px 0';
  successTitle.style.fontSize = '13px';
  successTitle.innerHTML = `<span class="badge success">True</span> สำเร็จ (${successRows.length} รายการ)`;
  resultOutput.appendChild(successTitle);

  const successTable = document.createElement('table');
  successTable.innerHTML = `
    <thead><tr><th>Acc</th><th>PID</th></tr></thead>
    <tbody>
      ${successRows.length === 0 ? `<tr><td colspan="2" class="info">- ไม่มีรายการ -</td></tr>` :
        successRows.map(r => `
          <tr class="success">
            <td>${mm_escapeHtml(r.phone)}</td>
            <td>${mm_escapeHtml(r.id)}</td>
          </tr>
        `).join('')}
    </tbody>
  `;
  resultOutput.appendChild(successTable);

  // ตาราง False
  const failTitle = document.createElement('h4');
  failTitle.style.margin = '18px 0 6px 0';
  failTitle.style.fontSize = '13px';
  failTitle.innerHTML = `<span class="badge fail">False</span> ไม่สำเร็จ (${failRows.length} รายการ)`;
  resultOutput.appendChild(failTitle);

  const failTable = document.createElement('table');
  failTable.innerHTML = `
    <thead><tr><th>Acc</th><th>PID</th><th>เหตุผล</th></tr></thead>
    <tbody>
      ${failRows.length === 0 ? `<tr><td colspan="3" class="info">- ไม่มีรายการ -</td></tr>` :
        failRows.map(r => `
          <tr class="fail">
            <td>${mm_escapeHtml(r.phone)}</td>
            <td>${mm_escapeHtml(r.id)}</td>
            <td>${mm_escapeHtml(r.reason)}</td>
          </tr>
        `).join('')}
    </tbody>
  `;
  resultOutput.appendChild(failTable);

  // ปุ่มคัดลอกเป็นข้อความ (tab-separated) แยกตามสถานะ
  const copyControls = document.createElement('div');
  copyControls.className = 'controls';

  const successText = successRows.map(r => `${r.phone}\t${r.id}`).join('\n');
  const failText = failRows.map(r => `${r.phone}\t${r.id}`).join('\n');
  const allText = rows.map(r => `${r.phone}\t${r.id}\t${r.isSuccess ? 'True' : 'False'}\t${r.reason}`).join('\n');

  const successHtml = mm_buildHtmlTable(
    ['Acc', 'PID'],
    successRows.map(r => [r.phone, r.id])
  );
  // สำหรับปุ่ม "คัดลอก False" เท่านั้น — เอาแค่ Acc, PID (ไม่รวมเหตุผล)
  const failCopyHtml = mm_buildHtmlTable(
    ['Acc', 'PID'],
    failRows.map(r => [r.phone, r.id])
  );
  const allHtml = mm_buildHtmlTable(
    ['Acc', 'PID', 'สถานะ', 'เหตุผล'],
    rows.map(r => [r.phone, r.id, r.isSuccess ? 'True' : 'False', r.reason])
  );

  const btnAll = document.createElement('button');
  btnAll.className = 'small';
  btnAll.textContent = 'คัดลอกทั้งหมด (ตาราง)';
  btnAll.onclick = () => mm_copyTable(allHtml, allText, btnAll);

  const btnSuccess = document.createElement('button');
  btnSuccess.className = 'small';
  btnSuccess.style.background = '#16a34a';
  btnSuccess.textContent = `คัดลอก True (${successCount}) (ตาราง)`;
  btnSuccess.onclick = () => mm_copyTable(successHtml, successText, btnSuccess);

  const btnFail = document.createElement('button');
  btnFail.className = 'small';
  btnFail.style.background = '#dc2626';
  btnFail.textContent = `คัดลอก False (${failCount}) (ตาราง)`;
  btnFail.onclick = () => mm_copyTable(failCopyHtml, failText, btnFail);

  copyControls.appendChild(btnAll);
  copyControls.appendChild(btnSuccess);
  copyControls.appendChild(btnFail);
  resultOutput.appendChild(copyControls);

  // ── ขั้นตอนที่ 3: Generate Mail / Send Mail สำหรับรายการ False ──────────
  mm_lastFailRows = failRows;

  if (failRows.length > 0) {
    const mailSection = document.createElement('div');
    mailSection.style.marginTop = '22px';
    mailSection.style.borderTop = '1px solid #d0d7de';
    mailSection.style.paddingTop = '16px';

    const mailTitle = document.createElement('h4');
    mailTitle.style.margin = '0 0 10px 0';
    mailTitle.style.fontSize = '13px';
    mailTitle.innerHTML = `ขั้นตอนที่ 3: แจ้ง VDO Support ตรวจสอบรายการ <span class="badge fail">False</span> (${failRows.length} รายการ)`;
    mailSection.appendChild(mailTitle);

    const mailControls = document.createElement('div');
    mailControls.className = 'controls';

    const genBtn = document.createElement('button');
    genBtn.textContent = '✉️ Generate Mail';
    genBtn.onclick = mm_generateMail;

    const sendBtn = document.createElement('button');
    sendBtn.id = 'mmSendMailBtn';
    sendBtn.className = 'secondary';
    sendBtn.style.background = '#9ca3af';
    sendBtn.textContent = '📤 Send Mail';
    sendBtn.disabled = true;
    sendBtn.onclick = mm_sendMail;

    mailControls.appendChild(genBtn);
    mailControls.appendChild(sendBtn);
    mailSection.appendChild(mailControls);

    const previewArea = document.createElement('textarea');
    previewArea.id = 'mmMailPreview';
    previewArea.readOnly = true;
    previewArea.style.marginTop = '10px';
    previewArea.style.height = '260px';
    previewArea.placeholder = 'กด "Generate Mail" เพื่อสร้างอีเมลจากรายการ False ด้านบน';
    mailSection.appendChild(previewArea);

    resultOutput.appendChild(mailSection);
  } else {
    mm_lastFailRows = [];
  }
}

// ── ขั้นตอนที่ 3: สร้าง/ส่งอีเมลแจ้ง VDO Support สำหรับรายการ False ──────────
function mm_buildMailData() {
  const rows = mm_lastFailRows;
  const tableText = ['Acc\tPID', ...rows.map(r => `${r.phone}\t${r.id}`)].join('\n');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const subject = `[ MAX ] - รบกวนตรวจสอบโปรไฟล์ลูกค้าเนื่องจากได้ดำเนินการ Modify ไม่สำเร็จ - ${timestamp}`;
  const body =
`เรียน VDO Support,
    รบกวนตรวจสอบโปรไฟล์ HBO Max ของลูกค้ารายด้านล่างเพิ่มเติม เนื่องจากได้ดำเนินการ Modify แล้ว แต่ไม่สำเร็จ
    รายละเอียดมีดังนี้
${tableText}
    จึงขอรบกวนทีม VDO Support ตรวจสอบสาเหตุและดำเนินการในส่วนที่เกี่ยวข้องเพิ่มเติมด้วยครับ
    ขอบคุณครับ`;
  return { subject, body };
}

function mm_generateMail() {
  if (!mm_lastFailRows || mm_lastFailRows.length === 0) {
    toast('ไม่มีรายการ False ให้สร้างอีเมล', 'warning');
    return;
  }
  const { subject, body } = mm_buildMailData();
  const preview = document.getElementById('mmMailPreview');
  if (preview) {
    preview.value =
`To: VDO Support <vdosupport@ais.co.th>
Cc: VAS_FBB Technical Complaint <vas_fbbtc@ais.co.th>; NOC Helpdesk 3BB <helpdesk3bb@ais.co.th>; Sup_FBB Technical Complaint <sup_fbbtc@ais.co.th>
Subject: ${subject}

${body}`;
  }
  const sendBtn = document.getElementById('mmSendMailBtn');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.style.background = '#16a34a'; }
}

function mm_sendMail() {
  if (!mm_lastFailRows || mm_lastFailRows.length === 0) return;
  const { subject, body } = mm_buildMailData();
  const crlfBody = body.replace(/\n/g, '\r\n');
  const a = document.createElement('a');
  a.href = `mailto:vdosupport@ais.co.th?cc=vas_fbbtc@ais.co.th;helpdesk3bb@ais.co.th;sup_fbbtc@ais.co.th&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function mm_escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mm_buildHtmlTable(headers, dataRows) {
  const thead = `<tr>${headers.map(h => `<th style="border:1px solid #999;padding:4px 8px;background:#eee;">${mm_escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = dataRows.length === 0
    ? `<tr>${headers.map(() => `<td style="border:1px solid #999;padding:4px 8px;">-</td>`).join('')}</tr>`
    : dataRows.map(cols => `<tr>${cols.map(c => `<td style="border:1px solid #999;padding:4px 8px;">${mm_escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return `<table style="border-collapse:collapse;">${thead}${tbody}</table>`;
}

async function mm_copyTable(html, plainText, btn) {
  const original = btn.textContent;
  try {
    if (window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(plainText);
    }
    btn.textContent = 'คัดลอกแล้ว ✓ (วางเป็นตารางได้เลย)';
  } catch (e) {
    // เบราว์เซอร์บางตัวไม่รองรับการคัดลอก HTML ให้ fallback เป็นข้อความ tab-separated แทน
    await navigator.clipboard.writeText(plainText);
    btn.textContent = 'คัดลอกแล้ว ✓ (ข้อความ)';
  }
  setTimeout(() => { btn.textContent = original; }, 2000);
}

function mm_copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => { btn.textContent = original; }, 1500);
  });
}

function mm_clearInput() {
  document.getElementById('input').value = '';
  document.getElementById('output').innerHTML = '<p class="info">ยังไม่มีข้อมูล — วางข้อมูลแล้วกดปุ่ม "แปลงเป็น JSON"</p>';
  document.getElementById('countInfo').textContent = '';
}

function mm_clearResult() {
  document.getElementById('resultInput').value = '';
  document.getElementById('resultOutput').innerHTML = '<p class="info">ยังไม่มีข้อมูล — ทำขั้นตอนที่ 1 ก่อน แล้ววางผลลัพธ์ JSON ที่นี่</p>';
  mm_lastFailRows = [];
}
