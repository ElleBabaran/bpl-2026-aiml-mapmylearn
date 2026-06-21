/* ============================================================
   js/config.js — Supabase config, global state & fetch helper
   ============================================================ */

// ── Supabase credentials ──────────────────────────────────────
const SUPABASE_URL = 'https://gplxbxjyvtfcgcstzisx.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbHhieGp5dnRmY2djc3R6aXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjYzNTIsImV4cCI6MjA2NTA0MjM1Mn0.xFnmzH7tNjRpjFQO_4mEWajFxqMKqaDoIfT6Kz9rqyc';

// ── Global application state (shared across all modules) ──────
window.SS = {
  currentUser:   null,   // { access_token, id, email }
  userProfile:   null,   // { full_name, school, xp, level, streak, last_active }
  tasks:         [],     // Task[]
  roadmaps:      [],     // Roadmap[]
  rmStages:      {},     // { [rmId]: { stages, done } }
  timerOn:       false,
  timerSec:      1500,   // 25 min in seconds
  timerInt:      null,
  focusTaskId:   null,

  // Cosmetic constants
  progColors:  ['#b09af7','#6edbbe','#ff8fb8','#ffd84a','#6eb8ff','#ffb07a'],
  plantEmojis: ['🌱','🌿','🌸','🌲'],
  phaseColors: ['rm-phase-lav','rm-phase-pink','rm-phase-mint','rm-phase-peach','rm-phase-yellow'],
};

// ── Supabase REST helper ──────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const token = SS.currentUser?.access_token || ANON_KEY;
  const res = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'apikey':        ANON_KEY,
      'Authorization': 'Bearer ' + token,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || e.error_description || 'Request failed (' + res.status + ')');
  }
  return res.status === 204 ? null : res.json();
}

// ── Auth endpoints ────────────────────────────────────────────
async function authLogin(email, pw) {
  return sbFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password: pw }),
  });
}
async function authSignup(email, pw, meta) {
  return sbFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password: pw, data: meta }),
  });
}
async function authRefresh(refreshToken) {
  return sbFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// ── Profile ───────────────────────────────────────────────────
async function getProfile(uid) {
  const d = await sbFetch(`/rest/v1/profiles?id=eq.${uid}&select=*`);
  return d?.[0] || null;
}
async function upsertProfile(p) {
  return sbFetch('/rest/v1/profiles', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(p),
  });
}

// ── Tasks ─────────────────────────────────────────────────────
async function fetchTasks(uid) {
  return sbFetch(`/rest/v1/tasks?user_id=eq.${uid}&order=created_at.desc`);
}
async function insertTask(t) {
  const d = await sbFetch('/rest/v1/tasks', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(t),
  });
  return d?.[0];
}
async function updateTask(id, patch) {
  return sbFetch(`/rest/v1/tasks?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(patch),
  });
}
async function deleteTaskDB(id) {
  return sbFetch(`/rest/v1/tasks?id=eq.${id}`, { method: 'DELETE' });
}

// ── Roadmaps ──────────────────────────────────────────────────
async function fetchRoadmaps(uid) {
  return sbFetch(`/rest/v1/roadmaps?user_id=eq.${uid}&order=created_at.desc`);
}
async function insertRoadmap(r) {
  const d = await sbFetch('/rest/v1/roadmaps', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(r),
  });
  return d?.[0];
}
async function updateRoadmapStages(id, stageProgress) {
  return sbFetch(`/rest/v1/roadmaps?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stage_progress: stageProgress }),
  });
}

// ── XP History ────────────────────────────────────────────────
async function insertXpHistory(userId, amount, reason) {
  return sbFetch('/rest/v1/xp_history', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, amount, reason }),
  });
}
async function fetchXpHistory(uid, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return sbFetch(`/rest/v1/xp_history?user_id=eq.${uid}&created_at=gte.${since}&order=created_at.asc`);
}

// ── Streak Log ────────────────────────────────────────────────
async function logStreakDate(uid) {
  const today = new Date().toISOString().split('T')[0];
  return sbFetch('/rest/v1/streak_log', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: uid, date: today }),
  });
}
async function fetchStreakLog(uid, days = 28) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return sbFetch(`/rest/v1/streak_log?user_id=eq.${uid}&date=gte.${since}&order=date.asc`);
}
