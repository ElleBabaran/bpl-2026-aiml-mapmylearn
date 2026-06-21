/* ============================================================
   js/auth.js — Login, Signup, Demo, Logout, Session restore
   ============================================================ */

// ── Login ─────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('li-email').value.trim();
  const pw    = document.getElementById('li-pw').value;
  hideErr('li-err');
  if (!email || !pw) { showErr('li-err', 'Please fill in all fields.'); return; }

  const btn = document.getElementById('li-btn');
  btn.disabled = true; btn.textContent = 'logging in...';

  try {
    const d = await authLogin(email, pw);
    SS.currentUser = { access_token: d.access_token, refresh_token: d.refresh_token, id: d.user.id, email };
    saveSession(SS.currentUser);
    await loadUserData();
    window.location.href = 'dashboard.html';
  } catch (e) {
    showErr('li-err', e.message || 'Login failed. Check credentials.');
  } finally {
    btn.disabled = false; btn.textContent = 'log in →';
  }
}

// ── Signup ────────────────────────────────────────────────────
async function doSignup() {
  const fn     = document.getElementById('su-fn').value.trim();
  const ln     = document.getElementById('su-ln').value.trim();
  const email  = document.getElementById('su-email').value.trim();
  const pw     = document.getElementById('su-pw').value;
  const school = document.getElementById('su-school').value.trim();
  hideErr('su-err');

  if (!fn || !email || !pw) { showErr('su-err', 'Please fill in all required fields.'); return; }
  if (pw.length < 8)        { showErr('su-err', 'Password must be at least 8 characters.'); return; }

  const btn = document.getElementById('su-btn');
  btn.disabled = true; btn.textContent = 'creating...';

  try {
    const d = await authSignup(email, pw, { full_name: fn + ' ' + ln, school });
    if (d.user) {
      SS.currentUser = { access_token: d.access_token, refresh_token: d.refresh_token, id: d.user.id, email };
      // Profile may have been auto-created by DB trigger; ensure it's upserted
      await upsertProfile({ id: d.user.id, full_name: fn + ' ' + ln, school, xp: 0, level: 1, streak: 0 });
      saveSession(SS.currentUser);
      await loadUserData();
      window.location.href = 'dashboard.html';
    } else {
      // Email confirmation required
      const infoEl = document.getElementById('su-info');
      if (infoEl) { infoEl.textContent = '✉️ Check your email to confirm your account, then log in.'; infoEl.classList.add('show'); }
    }
  } catch (e) {
    showErr('su-err', e.message || 'Signup failed. Try a different email.');
  } finally {
    btn.disabled = false; btn.textContent = 'create account — free 🌸';
  }
}

// ── Demo Login ────────────────────────────────────────────────
function demoLogin() {
  SS.currentUser  = { access_token: ANON_KEY, id: 'demo', email: 'demo@studysprint.app' };
  SS.userProfile  = { full_name: 'Demo Student', school: 'StudySprint U', xp: 340, level: 4, streak: 3 };
  SS.tasks = [
    { id:'t1', user_id:'demo', name:'History Essay — WW2 causes',   priority:'urgent', due_date:'2026-06-22', subject:'History',   done:false, steps:[] },
    { id:'t2', user_id:'demo', name:'Calculus Problem Set 4',        priority:'urgent', due_date:'2026-06-23', subject:'Math',      done:false, steps:[] },
    { id:'t3', user_id:'demo', name:'Physics Lab Report',            priority:'medium', due_date:'2026-06-25', subject:'Physics',   done:false, steps:[] },
    { id:'t4', user_id:'demo', name:'Spanish Vocabulary Quiz',       priority:'medium', due_date:'2026-06-24', subject:'Spanish',   done:false, steps:[] },
    { id:'t5', user_id:'demo', name:'CS: Linked Lists',              priority:'low',    due_date:'2026-06-27', subject:'CS',        done:false, steps:[] },
    { id:'t6', user_id:'demo', name:'Book Report',                   priority:'low',    due_date:'2026-06-20', subject:'English',   done:true,  steps:[] },
    { id:'t7', user_id:'demo', name:'Biology Quiz Prep',             priority:'medium', due_date:'2026-06-22', subject:'Biology',   done:true,  steps:[] },
    { id:'t8', user_id:'demo', name:'Chemistry Worksheet',           priority:'low',    due_date:'2026-06-19', subject:'Chemistry', done:true,  steps:[] },
  ];
  SS.roadmaps = [];
  SS.rmStages = {};
  // If we're already on dashboard, just render; otherwise navigate there
  if (document.getElementById('s-dash')) {
    show('s-dash');
    renderDash();
    toast('Demo mode! ✨ Try all features freely.');
  } else {
    // Store flag and redirect
    sessionStorage.setItem('ss_demo', '1');
    window.location.href = 'dashboard.html';
  }
}

// ── Logout ────────────────────────────────────────────────────
function doLogout() {
  SS.currentUser = null;
  SS.userProfile = null;
  SS.tasks       = [];
  SS.roadmaps    = [];
  SS.rmStages    = {};
  resetTimer();
  clearSession();
  sessionStorage.removeItem('ss_demo');
  window.location.href = 'index.html';
}

// ── Load User Data from Supabase ──────────────────────────────
async function loadUserData() {
  if (!SS.currentUser || SS.currentUser.id === 'demo') return;
  try {
    const [profile, tasks, roadmaps] = await Promise.all([
      getProfile(SS.currentUser.id),
      fetchTasks(SS.currentUser.id),
      fetchRoadmaps(SS.currentUser.id),
    ]);
    SS.userProfile = profile || { full_name: SS.currentUser.email, school: '', xp: 0, level: 1, streak: 0 };
    SS.tasks       = tasks    || [];
    SS.roadmaps    = roadmaps || [];

    // Rebuild rmStages from saved stage_progress
    SS.rmStages = {};
    SS.roadmaps.forEach(rm => {
      const sp = rm.stage_progress || {};
      (rm.phases || []).forEach((_, pi) => {
        const key = 'rm-' + pi;
        SS.rmStages[key] = sp[key] || { stages: 4, done: 0 };
      });
    });
  } catch (e) {
    console.error('loadUserData error:', e);
    toast('Could not load your data. Please refresh.', 4000);
  }
}

// ── Session Restore (called on dashboard.html load) ──────────
async function initDashboard() {
  // Check for demo flag first
  if (sessionStorage.getItem('ss_demo') === '1') {
    sessionStorage.removeItem('ss_demo');
    demoLogin();
    renderDash();
    return;
  }

  // Restore session from localStorage
  const saved = loadSession();
  if (!saved?.access_token) {
    window.location.href = 'login.html';
    return;
  }

  SS.currentUser = saved;

  // Try to refresh token if we have one
  if (saved.refresh_token) {
    try {
      const refreshed = await authRefresh(saved.refresh_token);
      SS.currentUser = {
        access_token:  refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        id:   saved.id,
        email: saved.email,
      };
      saveSession(SS.currentUser);
    } catch (_) {
      // Token expired — redirect to login
      clearSession();
      window.location.href = 'login.html';
      return;
    }
  }

  await loadUserData();
  renderDash();
}

// ── Guard for index/login pages (redirect if already logged in)
function initPublicPage() {
  const saved = loadSession();
  if (saved?.access_token) {
    window.location.href = 'dashboard.html';
  }
}
