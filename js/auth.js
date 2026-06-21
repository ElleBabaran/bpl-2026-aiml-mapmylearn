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
  SS.tasks = [];
  SS.roadmaps = [];
  SS.rmStages = {};

  // If renderDash exists we are already on dashboard.html — render directly.
  // Checking for renderDash avoids the infinite redirect that happens when
  // looking for #s-dash (a studysprint.html-only element).
  if (typeof renderDash === 'function') {
    renderDash();
    toast('Demo mode! ✨ Try all features freely.');
  } else {
    // We are on the login/landing page — redirect to dashboard
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

// ── Handle Supabase Auth Hash Redirection ──────────────────────
async function handleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash) return false;

  // Clear hash from URL immediately so it doesn't linger
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

  const params = new URLSearchParams(hash.substring(1));
  const errCode = params.get('error_code');
  const errDesc = params.get('error_description');

  if (errCode) {
    let friendlyMsg = errDesc || 'Authentication failed.';
    if (errCode === 'otp_expired') {
      friendlyMsg = 'The email confirmation link has expired or has already been used. Please try logging in or signing up again.';
    }
    
    // Try to find an error container on the current page
    const errEl = document.getElementById('li-err') || document.getElementById('su-err');
    if (errEl) {
      showErr(errEl, friendlyMsg);
    } else {
      toast(friendlyMsg, 5000);
    }
    return false;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken) {
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        let payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (payloadStr.length % 4) payloadStr += '=';
        const payload = JSON.parse(atob(payloadStr));

        SS.currentUser = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          id: payload.sub,
          email: payload.email || ''
        };
        
        saveSession(SS.currentUser);
        await loadUserData();

        // If we are NOT on dashboard.html, redirect there
        if (!window.location.pathname.includes('dashboard.html')) {
          window.location.href = 'dashboard.html';
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to parse auth redirect hash:', e);
    }
  }
  return false;
}

// ── Session Restore (called on dashboard.html load) ──────────
async function initDashboard() {
  // Capture pending share from URL
  const urlParams = new URLSearchParams(window.location.search);
  const shareParam = urlParams.get('share');
  if (shareParam) {
    sessionStorage.setItem('ss_pending_share', shareParam);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Check for demo flag first
  if (sessionStorage.getItem('ss_demo') === '1') {
    sessionStorage.removeItem('ss_demo');
    demoLogin(); // demoLogin() calls renderDash() internally — do NOT call it again
    return;
  }

  // Check for auth hash redirection first (e.g. email confirmation redirect)
  const handled = await handleAuthRedirect();
  if (handled) {
    renderDash();
    toast('Email confirmed! Welcome to StudySprint! 🌸');
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

  // Process imported roadmap if any
  const pendingShare = sessionStorage.getItem('ss_pending_share');
  if (pendingShare) {
    sessionStorage.removeItem('ss_pending_share');
    try {
      const imported = JSON.parse(decodeURIComponent(escape(atob(pendingShare))));
      if (imported && imported.goal && imported.phases) {
        await importRoadmap(imported);
      }
    } catch (e) {
      console.error('Failed to import shared roadmap:', e);
      toast('Invalid shared roadmap link 🗺️');
    }
  }

  renderDash();
}

// ── Guard for index/login pages (redirect if already logged in)
async function initPublicPage() {
  // Check for auth hash redirection (e.g. email confirmation redirect)
  const handled = await handleAuthRedirect();
  if (handled) return;

  const saved = loadSession();
  if (saved?.access_token) {
    window.location.href = 'dashboard.html';
  }
}
