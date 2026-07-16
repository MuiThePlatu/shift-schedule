// ═══════════════════════════════════════════════
//  TOAST / SYNC BADGE
// ═══════════════════════════════════════════════
function toast(msg, type='error') {
  const host = document.getElementById('toastHost');
  if (!host) { alert(msg); return; }
  const el = document.createElement('div');
  el.className = 'toast-item toast-' + type;
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 3200);
}

function showSyncBadge(msg, color='#22C55E') {
  const b = document.getElementById('syncBadge');
  if (!b) return;
  b.textContent = msg;
  b.style.display = '';
  b.style.background = color + '33';
  b.style.color = color === '#22C55E' ? '#86EFAC' : '#FCA5A5';
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.style.display = 'none'; }, 3000);
}

// ── Login / Logout ────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginErr');
  const btn   = document.getElementById('loginBtn');
  if (!email || !pass) { err.textContent = 'กรุณากรอก email และรหัสผ่าน'; return; }
  err.textContent = '';
  btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...';
  try {
    await firebaseAuth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged will handle the rest
  } catch (e) {
    const msgs = {
      'auth/user-not-found':    'ไม่พบบัญชีนี้ในระบบ',
      'auth/wrong-password':    'รหัสผ่านไม่ถูกต้อง',
      'auth/invalid-email':     'รูปแบบ email ไม่ถูกต้อง',
      'auth/too-many-requests': 'ลองใหม่ภายหลัง (login ผิดหลายครั้ง)',
      'auth/invalid-credential':'Email หรือรหัสผ่านไม่ถูกต้อง',
    };
    err.textContent = msgs[e.code] || e.message;
    btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
  }
}

async function doForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  const err   = document.getElementById('loginErr');
  if (!email) { err.textContent = 'กรุณากรอก email ก่อน'; return; }
  try {
    await firebaseAuth.sendPasswordResetEmail(email);
    err.style.color = '#059669';
    err.textContent = '✅ ส่ง email reset รหัสผ่านแล้ว กรุณาตรวจสอบ inbox';
  } catch (e) {
    err.style.color = '#DC2626';
    err.textContent = 'ไม่พบ email นี้ในระบบ';
  }
}

function doLogout() {
  if (confirm('ต้องการออกจากระบบ?')) firebaseAuth.signOut();
}

// ── Firebase init ─────────────────────────────────────────
async function initFirebase() {
  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
  if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('loadingOverlay').style.display = 'none';
    renderAll();
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(cfg);
  firebaseDB   = firebase.database();
  firebaseAuth = firebase.auth();

  // Auth state listener — single source of truth
  firebaseAuth.onAuthStateChanged(async user => {
    if (user) {
      // ── Logged in ──
      currentUser = user;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('userBadge').textContent  = '👤 ' + (user.displayName || user.email);
      document.getElementById('userBadge').style.display = '';
      document.getElementById('logoutBtn').style.display = '';

      // Detach any existing listener before attaching new one
      firebaseDB.ref(getDbPath()).off();

      // Connect to database
      const overlay = document.getElementById('loadingOverlay');
      overlay.style.display = 'flex';
      document.getElementById('loadingMsg').textContent = 'กำลังโหลดข้อมูล...';

      let isFirst = true;
      firebaseDB.ref(getDbPath()).on('value', snap => {
        const remote = snap.val();
        if (remote) {
          if (!remote.leaves) remote.leaves = [];
          dbData = remote;
          _deferCache = {}; // invalidate cache on remote update
        }
        if (isFirst) {
          isFirst = false;
          overlay.style.display = 'none';
          showSyncBadge('✅ เชื่อมต่อสำเร็จ');
          renderAll();
        } else {
          renderAll();
          showSyncBadge('🔄 ซิงค์แล้ว');
        }
      }, err => {
        overlay.style.display = 'none';
        showSyncBadge('❌ โหลดข้อมูลไม่สำเร็จ', '#DC2626');
        console.error('DB error:', err);
        renderAll();
      });

    } else {
      // ── Not logged in — show login screen ──
      currentUser = null;
      document.getElementById('loadingOverlay').style.display = 'none';
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('userBadge').style.display  = 'none';
      document.getElementById('logoutBtn').style.display  = 'none';
      // Detach DB listener to avoid permission errors
      if (firebaseDB) firebaseDB.ref(getDbPath()).off();
      // Reset login form
      document.getElementById('loginBtn').disabled = false;
      document.getElementById('loginBtn').textContent = 'เข้าสู่ระบบ';
      document.getElementById('loginErr').textContent = '';
      document.getElementById('loginErr').style.color = '#DC2626';
    }
  });
}

// ═══════════════════════════════════════════════
//  VIEW SWITCHING
// ═══════════════════════════════════════════════
let activeView = 'schedule';

function showView(v) {
  activeView = v;
  const schedule = document.getElementById('scheduleView');
  const email    = document.getElementById('emailToolPage');
  const urlsPage = document.getElementById('urlsPage');
  const modmaxPage = document.getElementById('modmaxPage');
  const backdrop = document.getElementById('panelBackdrop');

  // Reset all overlay panels (schedule dashboard stays visible underneath)
  if (schedule) schedule.style.display = '';
  email.classList.remove('et-active');
  if (urlsPage) urlsPage.style.transform = 'translateX(100%)';
  if (modmaxPage) modmaxPage.classList.remove('mm-active');
  if (backdrop) backdrop.classList.remove('on');

  if (v === 'emailtool') {
    email.classList.add('et-active');
    if (backdrop) backdrop.classList.add('on');
  } else if (v === 'modmax') {
    if (modmaxPage) modmaxPage.classList.add('mm-active');
    if (backdrop) backdrop.classList.add('on');
  } else if (v === 'urls') {
    if (urlsPage) { urlsPage.style.transform = 'translateX(0)'; renderUrlCards(); }
    if (backdrop) backdrop.classList.add('on');
  } else {
    // schedule (default)
    requestAnimationFrame(() => renderAll()); // ensure table re-renders after display change
  }
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const mbg = document.getElementById('mbg');
  if (mbg && mbg.classList.contains('on')) { closeM(); return; }
  const openModal = document.querySelector('.modal-overlay.open');
  if (openModal) { openModal.classList.remove('open'); return; }
  if (activeView !== 'schedule') showView('schedule');
});

function setM(m) {
  if (m === 0) {
    if (curY <= AVAILABLE_YEARS[0]) { m = 1; } else { m = 12; curY -= 1; document.getElementById('ySel').value = curY; setY(curY, true); }
  } else if (m === 13) {
    if (curY >= AVAILABLE_YEARS[AVAILABLE_YEARS.length-1]) { m = 12; } else { m = 1; curY += 1; document.getElementById('ySel').value = curY; setY(curY, true); }
  }
  curM = m;
  renderAll();
}

function setY(y, skipRender) {
  curY = Number(y);
  if (curY !== 2026) {
    showSyncBadge('⚠️ ปฏิทินวันหยุดยังอ้างอิงปี 2026 — ข้อมูลวันหยุดปีนี้อาจไม่ถูกต้อง', '#7A5610');
  }
  if (firebaseDB) {
    const overlay = document.getElementById('loadingOverlay');
    if (currentUser) {
      overlay.style.display = 'flex';
      document.getElementById('loadingMsg').textContent = 'กำลังโหลดข้อมูล...';
      let isFirst = true;
      firebaseDB.ref(getDbPath()).off();
      firebaseDB.ref(getDbPath()).on('value', snap => {
        const remote = snap.val();
        if (remote) { if (!remote.leaves) remote.leaves = []; dbData = remote; _deferCache = {}; }
        else { dbData = { leaves: [] }; _deferCache = {}; }
        if (isFirst) { isFirst = false; overlay.style.display = 'none'; if (!skipRender) renderAll(); }
        else if (!skipRender) renderAll();
      }, () => { overlay.style.display = 'none'; if (!skipRender) renderAll(); });
    }
  } else if (!skipRender) {
    renderAll();
  }
}

// ═══════════════════════════════════════════════
//  SIDE MENU
// ═══════════════════════════════════════════════
function openSideMenu() {
  document.getElementById('sideMenu').classList.add('on');
  document.getElementById('sideOverlay').classList.add('on');
  renderSideMonths();
  // Update user info
  const user = currentUser;
  if (user) {
    document.getElementById('smUser').textContent = '👤 ' + (user.displayName || user.email);
    document.getElementById('smEmail').textContent = user.email;
  }
}

function closeSideMenu() {
  document.getElementById('sideMenu').classList.remove('on');
  document.getElementById('sideOverlay').classList.remove('on');
}

function renderSideMonths() {
  const el = document.getElementById('smMonths');
  if (!el) return;
  const MS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  el.innerHTML = MS_TH.map((s,i) =>
    `<button class="sm-mb${i+1===curM?' cur':''}" onclick="setM(${i+1});closeSideMenu()">${s}</button>`
  ).join('');
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
const now = new Date();
curY = now.getFullYear() >= 2024 && now.getFullYear() <= 2030 ? now.getFullYear() : 2026;
curM = now.getFullYear() === curY ? Math.min(12, Math.max(1, now.getMonth() + 1)) : (now.getFullYear() < curY ? 1 : 12);

initFirebase();
