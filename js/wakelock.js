// ═══════════════════════════════════════════════
//  SCREEN WAKE LOCK (กันหน้าจอดับ) — per-device, persisted in localStorage
//
//  ข้อควรรู้: เบราว์เซอร์จะ "ปล่อย" wake lock เองทุกครั้งที่หน้าเว็บถูกซ่อน
//  (สลับแท็บ / ย่อจอ / ล็อกเครื่อง) เราจึงต้องขอใหม่เมื่อกลับมาเสมอ
//  และปุ่มต้องแสดงสถานะ "ของจริง" ไม่ใช่แค่สิ่งที่ผู้ใช้กดไว้
// ═══════════════════════════════════════════════
let wakeLock = null;
let wakeLockDesired = false;   // ผู้ใช้ต้องการให้เปิดไว้หรือไม่
let wakeLockPending = false;   // กัน request ซ้อนกัน
const WAKE_LOCK_KEY = 'keepAwakeOn';

function wakeLockSupported() {
  return 'wakeLock' in navigator;
}

// ถือ lock อยู่จริงหรือไม่ — sentinel จะถูก mark released เมื่อระบบปล่อย
function wakeLockHeld() {
  return !!wakeLock && !wakeLock.released;
}

// ปุ่มสะท้อนสถานะจริง: on = ถือ lock อยู่, pending = อยากเปิดแต่ยังไม่ได้
function renderWakeLockBtn() {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  const held = wakeLockHeld();
  btn.classList.toggle('on', held);
  btn.classList.toggle('pending', wakeLockDesired && !held);
  btn.setAttribute('aria-pressed', String(wakeLockDesired));
  btn.title = held
    ? 'กันหน้าจอดับ: เปิดอยู่ — คลิกเพื่อปิด'
    : (wakeLockDesired
        ? 'กันหน้าจอดับ: เปิดไว้ แต่ยังไม่ทำงาน (จะขอใหม่เมื่อกลับมาที่หน้านี้)'
        : 'กันหน้าจอดับ: ปิดอยู่ — คลิกเพื่อเปิด');
}

async function acquireWakeLock(showErrors) {
  if (!wakeLockSupported()) {
    if (showErrors) toast('เบราว์เซอร์นี้ไม่รองรับฟีเจอร์กันหน้าจอดับ', 'warning');
    return false;
  }
  // request จะ throw ถ้าหน้าเว็บไม่ได้แสดงอยู่ — ไม่ต้องเสียเวลาลอง
  if (document.visibilityState !== 'visible') return false;
  if (wakeLockPending) return wakeLockHeld();

  wakeLockPending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    wakeLock = lock;
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null;
      renderWakeLockBtn();
      // ระบบปล่อยเอง — ถ้าผู้ใช้ยังอยากเปิดและหน้าเว็บยังแสดงอยู่ ให้ขอใหม่ทันที
      if (wakeLockDesired && document.visibilityState === 'visible') ensureWakeLock();
    });
    return true;
  } catch (e) {
    if (showErrors) toast('ไม่สามารถเปิดกันหน้าจอดับได้ (' + (e && e.message ? e.message : 'unknown error') + ')', 'error');
    return false;
  } finally {
    wakeLockPending = false;
  }
}

async function releaseWakeLock() {
  const lock = wakeLock;
  wakeLock = null;
  if (lock) { try { await lock.release(); } catch (e) {} }
}

// ทำให้สถานะจริงตรงกับสิ่งที่ผู้ใช้ต้องการ (idempotent — เรียกซ้ำได้)
async function ensureWakeLock() {
  if (wakeLockDesired && !wakeLockHeld() && document.visibilityState === 'visible') {
    await acquireWakeLock(false);
  }
  renderWakeLockBtn();
}

async function toggleWakeLock() {
  if (wakeLockDesired) {
    wakeLockDesired = false;
    localStorage.setItem(WAKE_LOCK_KEY, 'false');
    await releaseWakeLock();
    renderWakeLockBtn();
  } else {
    const ok = await acquireWakeLock(true);
    wakeLockDesired = ok;
    localStorage.setItem(WAKE_LOCK_KEY, ok ? 'true' : 'false');
    renderWakeLockBtn();
  }
}

function initWakeLock() {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  if (!wakeLockSupported()) { btn.style.display = 'none'; return; }
  btn.style.display = '';

  wakeLockDesired = localStorage.getItem(WAKE_LOCK_KEY) === 'true';

  document.addEventListener('visibilitychange', ensureWakeLock);
  window.addEventListener('pageshow', ensureWakeLock);   // กลับมาจาก bfcache
  window.addEventListener('focus', ensureWakeLock);

  // กันกรณีเบราว์เซอร์ปล่อย lock เงียบ ๆ โดยไม่ยิง event 'release'
  setInterval(ensureWakeLock, 15000);

  ensureWakeLock();
}

initWakeLock();
