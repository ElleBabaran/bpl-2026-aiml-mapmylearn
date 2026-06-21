/* ============================================================
   js/app.js — Core utilities: navigation, toast, XP popup,
   session init, tab switching, sidebar rendering
   ============================================================ */

// ── Navigation ────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── Tab Switching (dashboard only) ────────────────────────────
function switchTab(tab) {
  ['tasks', 'roadmap', 'analytics', 'garden'].forEach(t => {
    document.getElementById('tv-' + t)?.classList.toggle('active', t === tab);
    document.getElementById('dtab-' + t)?.classList.toggle('active', t === tab);
  });
  // Sync sidebar nav items
  document.querySelectorAll('.nav-item[data-tab]').forEach(n => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });
  if (tab === 'analytics') renderAnalytics();
  if (tab === 'garden')   { renderFullGarden(); renderStreak(); }
}

// ── Toast Notification ────────────────────────────────────────
function toast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── XP Popup ──────────────────────────────────────────────────
function showXpPop(msg) {
  const p = document.getElementById('xp-pop');
  if (!p) return;
  p.textContent = msg;
  p.classList.add('show');
  clearTimeout(window._xpTimer);
  window._xpTimer = setTimeout(() => p.classList.remove('show'), 2000);
}

// ── Error / Info helpers ──────────────────────────────────────
function showErr(elOrId, msg) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._errTimer);
  el._errTimer = setTimeout(() => el.classList.remove('show'), 5000);
}
function hideErr(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (el) el.classList.remove('show');
}

// ── XP Bar & Sidebar update ───────────────────────────────────
function updateSidebar() {
  const { userProfile, currentUser } = SS;
  const name = userProfile?.full_name || currentUser?.email || 'Student';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const xp    = userProfile?.xp    || 0;
  const level = userProfile?.level  || 1;

  const ava  = document.getElementById('sb-ava');
  const nm   = document.getElementById('sb-name');
  const lvl  = document.getElementById('sb-lvl');
  const bar  = document.getElementById('xp-bar');
  const cur  = document.getElementById('xp-cur');
  if (ava) ava.textContent = initials;
  if (nm)  nm.textContent  = name;
  if (lvl) lvl.textContent = '⭐ Lvl ' + level + ' Scholar';
  if (bar) bar.style.width = Math.min(100, (xp % 500) / 500 * 100) + '%';
  if (cur) cur.textContent = xp % 500;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const tg = document.getElementById('topbar-greet');
  if (tg) tg.textContent = greeting + ', ' + name.split(' ')[0] + '! ☀️';
}

// ── Award XP (central) ────────────────────────────────────────
async function awardXP(amount, reason) {
  if (!SS.userProfile) return;
  SS.userProfile.xp = (SS.userProfile.xp || 0) + amount;

  // Level up check (every 500 XP)
  const newLevel = Math.floor(SS.userProfile.xp / 500) + 1;
  if (newLevel > (SS.userProfile.level || 1)) {
    SS.userProfile.level = newLevel;
    toast('LEVEL UP! 🎉 You are now Level ' + newLevel + ' Scholar!', 4000);
  }

  updateSidebar();
  showXpPop('+' + amount + ' XP!\n' + (reason || '') + ' 🌸');

  if (SS.currentUser?.id !== 'demo') {
    upsertProfile({ id: SS.currentUser.id, xp: SS.userProfile.xp, level: SS.userProfile.level }).catch(() => {});
    insertXpHistory(SS.currentUser.id, amount, reason).catch(() => {});
  }
}

// ── Session persistence ───────────────────────────────────────
const SESSION_KEY = 'ss_session';

function saveSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}

// ── Profile Settings Modal ────────────────────────────────────
function openProfileModal() {
  const m = document.getElementById('profile-modal');
  if (!m) return;
  document.getElementById('pm-name').value   = SS.userProfile?.full_name || '';
  document.getElementById('pm-school').value = SS.userProfile?.school    || '';
  const name = SS.userProfile?.full_name || 'ST';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('pm-ava').textContent = initials;
  m.classList.add('show');
}
function closeProfileModal() {
  document.getElementById('profile-modal')?.classList.remove('show');
}
async function saveProfile() {
  const name   = document.getElementById('pm-name').value.trim();
  const school = document.getElementById('pm-school').value.trim();
  if (!name) { toast('Name cannot be empty 🌸'); return; }
  const btn = document.getElementById('pm-save');
  btn.disabled = true; btn.textContent = 'saving...';
  try {
    SS.userProfile = { ...SS.userProfile, full_name: name, school };
    if (SS.currentUser?.id !== 'demo') {
      await upsertProfile({ id: SS.currentUser.id, full_name: name, school });
    }
    updateSidebar();
    closeProfileModal();
    toast('Profile updated! 🌸');
  } catch (e) {
    toast('Error: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'save changes';
  }
}

// ── Render full dashboard after login ────────────────────────
function renderDash() {
  updateSidebar();
  renderTasks();
  renderMiniGarden();
  renderFullGarden();
  renderStreak();
  renderAnalytics();
  renderRoadmaps();
}
