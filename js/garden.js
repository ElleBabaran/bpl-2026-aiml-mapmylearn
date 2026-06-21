/* ============================================================
   js/garden.js — Plant garden rendering, streak tracker
   ============================================================ */

const PLANT_EMOJIS = ['🌱', '🌿', '🌸', '🌲'];

function getPlantEmoji(index) {
  if (index >= 15) return '🌲';
  if (index >= 8)  return '🌸';
  if (index >= 4)  return '🌿';
  return '🌱';
}

// ── Mini Garden (sidebar) ─────────────────────────────────────
function renderMiniGarden() {
  const g = document.getElementById('mini-g');
  if (!g) return;
  g.innerHTML = '';
  const done = SS.tasks.filter(t => t.done).length;
  for (let i = 0; i < 10; i++) {
    const c = document.createElement('div');
    c.className = 'gm-c' + (i < done ? ' has' : '');
    c.textContent = i < done ? getPlantEmoji(i) : '';
    c.title = i < done ? 'Plant ' + (i + 1) : 'Complete a task to grow a plant';
    g.appendChild(c);
  }
}

// ── Full Garden (garden tab) ──────────────────────────────────
function renderFullGarden() {
  const g = document.getElementById('full-g');
  if (!g) return;
  g.innerHTML = '';
  const done = SS.tasks.filter(t => t.done).length;

  for (let i = 0; i < 32; i++) {
    const c = document.createElement('div');
    if (i < done) {
      c.className = 'g-cell has';
      c.textContent = getPlantEmoji(i);
      c.title = 'Plant ' + (i + 1) + ' — ' + plantName(i);
      // Add gentle entrance animation delay
      c.style.animationDelay = (i * 30) + 'ms';
    } else {
      c.className = 'g-cell empty';
      c.textContent = '+';
      c.title = 'Complete ' + (i + 1 - done) + ' more task(s) to grow this plant';
    }
    g.appendChild(c);
  }

  // Update garden stats header
  const statEl = document.getElementById('garden-stat');
  if (statEl) statEl.textContent = done + ' plants growing · ' + Math.max(0, 32 - done) + ' plots remaining';
}

function plantName(i) {
  if (i >= 15) return 'Ancient Tree';
  if (i >= 8)  return 'Cherry Blossom';
  if (i >= 4)  return 'Sprout';
  return 'Seedling';
}

// ── Streak Row (garden tab) ───────────────────────────────────
function renderStreak() {
  const el = document.getElementById('streak-row');
  if (!el) return;
  el.innerHTML = '';
  const streak = SS.userProfile?.streak || 0;

  for (let i = 0; i < 7; i++) {
    const d = document.createElement('div');
    if (i < streak) {
      d.className = 'streak-dot done';
      d.title = 'Day ' + (i + 1) + ' — completed!';
    } else if (i === streak) {
      d.className = 'streak-dot today';
      d.title = 'Today — complete a task to continue your streak!';
    } else {
      d.className = 'streak-dot';
      d.title = 'Day ' + (i + 1);
    }
    el.appendChild(d);
  }

  // Update streak label
  const lblEl = document.getElementById('streak-lbl');
  if (lblEl) {
    lblEl.textContent = streak === 0
      ? 'Start your streak today!'
      : streak === 1
      ? '1 day streak — keep going! 🌱'
      : streak + ' day streak — you\'re on fire! 🔥';
  }
}
