// ═══════════════════════════════════════════════
//  INTERNAL URLS
// ═══════════════════════════════════════════════
function getUrls() { return load().urls || []; }

function saveUrls(arr) {
  const data = load();
  data.urls = arr;
  persist(data);
}

function renderUrlCards() {
  const urls = getUrls();
  const container = document.getElementById('urlCards');
  if (!container) return;

  if (urls.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 20px;color:var(--ink3)">
      <span style="font-size:34px">🔗</span>
      <div style="font-size:13px;color:var(--ink2)">ยังไม่มีลิงก์ที่บันทึกไว้</div>
      <button onclick="openAddUrl()" class="btn btn-ok" style="font-size:12px">+ เพิ่มลิงก์แรก</button>
    </div>`;
    return;
  }

  container.innerHTML = urls.map((u, i) => `
    <div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r12);padding:16px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${u.icon || '🔗'}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--ink)">${u.name}</div>
            ${u.desc ? `<div style="font-size:11px;color:var(--ink2);margin-top:1px">${u.desc}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button onclick="openEditUrl(${i})" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--ink3);font-size:13px" title="แก้ไข">✎</button>
          <button onclick="deleteUrl(${i})" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--ink3);font-size:13px" title="ลบ">✕</button>
        </div>
      </div>
      <a href="${u.url}" target="_blank" rel="noopener"
         style="font-size:11px;color:var(--brand2);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px 10px;background:var(--brand-light);border-radius:var(--r4);display:block"
         title="${u.url}">
        🌐 ${u.url}
      </a>
    </div>`).join('');
}

let editUrlIndex = -1;

function openAddUrl()  { editUrlIndex = -1; openUrlModal({}); }
function openEditUrl(i){ editUrlIndex = i;  openUrlModal(getUrls()[i] || {}); }

function openUrlModal(u) {
  document.getElementById('mbox').innerHTML = `
    <h3>${editUrlIndex === -1 ? '🔗 เพิ่ม URL' : '✎ แก้ไข URL'}</h3>
    <div class="m-meta">ลิงก์เว็บที่ใช้งานภายในทีม</div>
    <div class="sect">
      <span class="slbl">ชื่อ</span>
      <input id="urlName" type="text" value="${u.name||''}" placeholder="เช่น Timework, ServiceNow"
        style="width:100%;padding:9px 12px;border:1.5px solid var(--line2);border-radius:var(--r8);font-size:13px;font-family:inherit;background:var(--canvas);color:var(--ink);outline:none">
    </div>
    <div class="sect">
      <span class="slbl">URL</span>
      <input id="urlUrl" type="text" value="${u.url||''}" placeholder="https://..."
        style="width:100%;padding:9px 12px;border:1.5px solid var(--line2);border-radius:var(--r8);font-size:13px;font-family:inherit;background:var(--canvas);color:var(--ink);outline:none">
    </div>
    <div class="sect">
      <span class="slbl">คำอธิบาย (ไม่บังคับ)</span>
      <input id="urlDesc" type="text" value="${u.desc||''}" placeholder="เช่น ระบบลงเวลา, ระบบ Ticket"
        style="width:100%;padding:9px 12px;border:1.5px solid var(--line2);border-radius:var(--r8);font-size:13px;font-family:inherit;background:var(--canvas);color:var(--ink);outline:none">
    </div>
    <div class="sect">
      <span class="slbl">Icon (Emoji)</span>
      <input id="urlIcon" type="text" value="${u.icon||'🔗'}" maxlength="2"
        style="width:80px;padding:9px 12px;border:1.5px solid var(--line2);border-radius:var(--r8);font-size:18px;font-family:inherit;background:var(--canvas);color:var(--ink);outline:none;text-align:center">
    </div>
    <div class="mf">
      <button class="btn btn-cn" onclick="closeM()">ยกเลิก</button>
      <button class="btn btn-ok" onclick="saveUrl()">✓ บันทึก</button>
    </div>`;
  document.getElementById('mbg').classList.add('on');
  setTimeout(() => document.getElementById('urlName')?.focus(), 50);
}

function saveUrl() {
  const name = document.getElementById('urlName').value.trim();
  const url  = document.getElementById('urlUrl').value.trim();
  const desc = document.getElementById('urlDesc').value.trim();
  const icon = document.getElementById('urlIcon').value.trim() || '🔗';
  if (!name || !url) { toast('กรุณากรอกชื่อและ URL', 'warning'); return; }
  const arr = getUrls();
  if (editUrlIndex === -1) arr.push({ name, url, desc, icon });
  else arr[editUrlIndex] = { name, url, desc, icon };
  saveUrls(arr);
  closeM();
  renderUrlCards();
}

function deleteUrl(i) {
  if (!confirm('ลบ URL นี้?')) return;
  const arr = getUrls();
  arr.splice(i, 1);
  saveUrls(arr);
  renderUrlCards();
}
