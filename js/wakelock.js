// ═══════════════════════════════════════════════
//  SCREEN WAKE LOCK (กันหน้าจอดับ) — per-device, persisted in localStorage
// ═══════════════════════════════════════════════
let wakeLock = null;
const WAKE_LOCK_KEY = 'keepAwakeOn';

function wakeLockSupported() {
  return 'wakeLock' in navigator;
}

function updateWakeLockBtn(active) {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  btn.classList.toggle('on', active);
  btn.title = active ? 'กันหน้าจอดับ: เปิดอยู่ — คลิกเพื่อปิด' : 'กันหน้าจอดับ: ปิดอยู่ — คลิกเพื่อเปิด';
}

async function acquireWakeLock(showErrors) {
  if (!wakeLockSupported()) {
    if (showErrors) toast('เบราว์เซอร์นี้ไม่รองรับฟีเจอร์กันหน้าจอดับ', 'warning');
    return false;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
    return true;
  } catch (e) {
    if (showErrors) toast('ไม่สามารถเปิดกันหน้าจอดับได้ (' + (e && e.message ? e.message : 'unknown error') + ')', 'error');
    return false;
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }
}

async function toggleWakeLock() {
  const btn = document.getElementById('wakeLockBtn');
  const isOn = btn && btn.classList.contains('on');
  if (isOn) {
    await releaseWakeLock();
    localStorage.setItem(WAKE_LOCK_KEY, 'false');
    updateWakeLockBtn(false);
  } else {
    const ok = await acquireWakeLock(true);
    if (ok) {
      localStorage.setItem(WAKE_LOCK_KEY, 'true');
      updateWakeLockBtn(true);
    }
  }
}

function initWakeLock() {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  if (!wakeLockSupported()) { btn.style.display = 'none'; return; }
  btn.style.display = '';

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && localStorage.getItem(WAKE_LOCK_KEY) === 'true' && !wakeLock) {
      const ok = await acquireWakeLock(false);
      updateWakeLockBtn(ok);
    }
  });

  if (localStorage.getItem(WAKE_LOCK_KEY) === 'true') {
    acquireWakeLock(false).then(ok => updateWakeLockBtn(ok));
  }
}

initWakeLock();
