/* ============================================================
   js/analytics.js — Charts, XP history, streak calendar,
   achievements panel
   ============================================================ */

// ── Main Render Entry Point ───────────────────────────────────
async function renderAnalytics() {
  renderBarChart();
  await renderXpHistory();
  await renderStreakCalendar();
  renderCompletionRate();
  renderAchievements();
}

// ── Bar Chart: Tasks Completed Last 7 Days ────────────────────
function renderBarChart() {
  const bc = document.getElementById('bar-chart');
  if (!bc) return;
  bc.innerHTML = '';

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  // Build real counts from SS.tasks (done_at or created_at proxy)
  const counts = new Array(7).fill(0);
  const today = new Date();

  SS.tasks.filter(t => t.done).forEach(t => {
    const doneDate = new Date(t.done_at || t.created_at || 0);
    const diffDays = Math.floor((today - doneDate) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      const dow = (today.getDay() + 6 - ((today.getDay() + 6 - (7 - diffDays)) % 7)) % 7;
      // Simpler: just bucket by day offset from today
      const idx = 6 - diffDays;
      if (idx >= 0) counts[idx]++;
    }
  });

  // If demo, use nice-looking sample values. For real users, show actual 0s.
  const isDemo = SS.currentUser?.id === 'demo';
  const vals = (counts.some(c => c > 0) || !isDemo) ? counts : [1, 0, 3, 1, 2, 0, 1];
  const maxV = Math.max(...vals, 1);
  const todayDow = (new Date().getDay() + 6) % 7; // Mon=0

  days.forEach((d, i) => {
    const h = Math.round((vals[i] / maxV) * 80);
    const isToday = i === todayDow;
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.innerHTML =
      `<span class="bar-val">${vals[i]}</span>` +
      `<div class="bar-fill" style="height:${Math.max(h, 4)}px;background:${isToday ? 'var(--pink)' : 'var(--lav)'}"></div>` +
      `<span class="bar-lbl">${d}</span>`;
    bc.appendChild(col);
  });
}

// ── XP History Bars ───────────────────────────────────────────
async function renderXpHistory() {
  const xh = document.getElementById('xp-history');
  if (!xh) return;
  xh.innerHTML = '';

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  let xpByDay = new Array(7).fill(0);

  if (SS.currentUser?.id !== 'demo') {
    try {
      const history = await fetchXpHistory(SS.currentUser.id, 7);
      if (history && history.length > 0) {
        const today = new Date();
        history.forEach(h => {
          const date = new Date(h.created_at);
          const diffDays = Math.floor((today - date) / 86400000);
          const idx = 6 - diffDays;
          if (idx >= 0 && idx < 7) xpByDay[idx] += (h.amount || 0);
        });
      }
    } catch (_) {
      // Fallback to sample
    }
  }

  // Demo fallback (only for demo user)
  if (!xpByDay.some(v => v > 0) && SS.currentUser?.id === 'demo') {
    xpByDay = [10, 0, 30, 10, 20, 0, 10];
  }

  const maxXP = Math.max(...xpByDay, 1);
  const todayDow = (new Date().getDay() + 6) % 7;

  days.forEach((d, i) => {
    const w = Math.round((xpByDay[i] / maxXP) * 100);
    const div = document.createElement('div');
    div.className = 'xp-hist-row';
    div.innerHTML =
      `<span class="xp-hist-day">${d}</span>` +
      `<div class="xp-hist-bar" style="width:${Math.max(w, 2)}%;background:${i === todayDow ? 'var(--pink)' : 'var(--lav)'}"></div>` +
      `<span class="xp-hist-val">+${xpByDay[i]}</span>`;
    xh.appendChild(div);
  });
}

// ── Streak Calendar ───────────────────────────────────────────
async function renderStreakCalendar() {
  const sc = document.getElementById('streak-cal');
  if (!sc) return;
  sc.innerHTML = '';

  let streakDates = new Set();
  const streak = SS.userProfile?.streak || 0;

  if (SS.currentUser?.id !== 'demo') {
    try {
      const logs = await fetchStreakLog(SS.currentUser.id, 28);
      if (logs && logs.length > 0) {
        logs.forEach(l => streakDates.add(l.date));
      }
    } catch (_) {}
  }

  // Build 28-day grid (4 weeks)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // If demo or no streak logs, synthesise last N days from streak count
  if (streakDates.size === 0 && streak > 0) {
    for (let i = 0; i < streak; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      streakDates.add(d.toISOString().split('T')[0]);
    }
  }

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const isToday = dStr === todayStr;
    const isDone  = streakDates.has(dStr);

    const cell = document.createElement('div');
    cell.className = 's-cell' + (isToday ? ' today' : isDone ? ' done' : '');
    cell.textContent = isToday ? '📍' : isDone ? '✓' : '';
    cell.title = dStr;
    sc.appendChild(cell);
  }

  const statEl = document.getElementById('streak-stat');
  if (statEl) statEl.textContent = 'Current streak: ' + streak + ' days 🔥';
}

// ── Completion Rate ───────────────────────────────────────────
function renderCompletionRate() {
  const done  = SS.tasks.filter(t => t.done).length;
  const total = SS.tasks.length;
  const pct   = total ? Math.round(done / total * 100) : 0;

  const cpct = document.getElementById('completion-pct');
  const clbl = document.getElementById('completion-lbl');
  const cbar = document.getElementById('completion-bar');
  if (cpct) cpct.textContent = pct + '%';
  if (clbl) clbl.textContent = done + ' of ' + total + ' tasks completed';
  if (cbar) cbar.style.width = pct + '%';
}

// ── Achievements ──────────────────────────────────────────────
function renderAchievements() {
  const al = document.getElementById('achievement-list');
  if (!al) return;

  const done    = SS.tasks.filter(t => t.done).length;
  const streak  = SS.userProfile?.streak || 0;
  const xp      = SS.userProfile?.xp     || 0;
  const hasRM   = SS.roadmaps.length > 0;

  const achievements = [
    { icon: '🌱', name: 'FIRST STEP',       desc: 'Complete your first task',         unlocked: done  >= 1     },
    { icon: '🔥', name: 'ON FIRE',          desc: '3-day study streak',               unlocked: streak >= 3    },
    { icon: '⭐', name: 'SCHOLAR',          desc: 'Earn 100 XP',                      unlocked: xp    >= 100   },
    { icon: '🌸', name: 'IN BLOOM',         desc: 'Complete 5 tasks',                 unlocked: done  >= 5     },
    { icon: '🗺️', name: 'EXPLORER',         desc: 'Generate your first roadmap',      unlocked: hasRM          },
    { icon: '🏆', name: 'CHAMPION',         desc: 'Complete 10 tasks',                unlocked: done  >= 10    },
    { icon: '⚡', name: 'SPEED LEARNER',    desc: '7-day streak',                     unlocked: streak >= 7    },
    { icon: '💎', name: 'DIAMOND STUDENT',  desc: 'Earn 500 XP',                      unlocked: xp    >= 500   },
    { icon: '🌲', name: 'FOREST GUARDIAN',  desc: 'Complete 15 tasks',                unlocked: done  >= 15    },
    { icon: '🤝', name: 'TEAM PLAYER',      desc: 'Share a roadmap with a classmate', unlocked: localStorage.getItem('ss_shared_roadmap') === '1' },
    { icon: '🦁', name: 'STUDY LION',       desc: 'Complete 25 tasks',                unlocked: done  >= 25    },
    { icon: '🌟', name: 'LEGEND',           desc: 'Earn 1000 XP',                     unlocked: xp    >= 1000  },
  ];

  al.innerHTML = '';
  achievements.forEach(a => {
    const div = document.createElement('div');
    div.className = 'achievement' + (a.unlocked ? ' unlocked' : '');
    div.innerHTML =
      `<span class="ach-icon${a.unlocked ? '' : ' ach-locked'}">${a.icon}</span>` +
      `<div class="ach-body"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>` +
      (a.unlocked
        ? `<span class="px-badge b-green">unlocked</span>`
        : `<span class="px-badge" style="background:var(--cream2);border-color:var(--border2);color:var(--text3);">locked</span>`);
    al.appendChild(div);
  });
}
