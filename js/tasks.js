/* ============================================================
   js/tasks.js — Task CRUD, AI breakdown, Pomodoro timer,
                 subject progress bars
   ============================================================ */

// ── Add Task ──────────────────────────────────────────────────
async function addTask() {
  const name = document.getElementById('t-name').value.trim();
  const prio = document.getElementById('t-prio').value;
  const subj = document.getElementById('t-subj').value.trim() || 'General';
  const date = document.getElementById('t-date').value;

  if (!name) { toast('Enter a task name! 🌸'); return; }

  const task = {
    user_id:  SS.currentUser.id,
    name,
    priority: prio,
    subject:  subj,
    due_date: date || null,
    done:     false,
    steps:    [],
  };

  if (SS.currentUser.id !== 'demo') {
    try {
      const saved = await insertTask(task);
      if (saved) SS.tasks.unshift(saved);
    } catch (e) {
      toast('Save error: ' + e.message);
      return;
    }
  } else {
    task.id = 't' + Date.now();
    SS.tasks.unshift(task);
  }

  document.getElementById('t-name').value = '';
  document.getElementById('t-subj').value = '';
  renderTasks();
  renderMiniGarden();

  // AI breakdown
  await aiBreakdown(name, subj, prio);
}

// ── AI Breakdown ──────────────────────────────────────────────
async function aiBreakdown(name, subj, prio) {
  const box  = document.getElementById('ai-box');
  const res  = document.getElementById('ai-result');
  const dots = document.getElementById('ai-dots');
  if (!box) return;

  box.classList.add('show');
  res.innerHTML = '';
  dots.style.display = 'flex';

  let steps;
  if (SS.currentUser.id !== 'demo') {
    try {
      const token = SS.currentUser?.access_token || ANON_KEY;
      const response = await fetch(SUPABASE_URL + '/functions/v1/roadmap-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ action: 'breakdown', name, subj, prio })
      });
      if (response.ok) {
        steps = await response.json();
      }
    } catch (err) {
      console.warn('Real AI breakdown failed, falling back to smart rules:', err);
    }
  }

  if (!steps || !Array.isArray(steps)) {
    steps = getAIFallback(name, subj, prio);
  }

  dots.style.display = 'none';
  res.innerHTML =
    `<div class="ai-header-px">🤖 AI breakdown — ${escHtml(name)}</div>` +
    steps.map((s, i) =>
      `<div class="ai-step"><span class="step-badge">0${i + 1}</span><span>${escHtml(s)}</span></div>`
    ).join('');
}

// ── Smart AI Fallback ─────────────────────────────────────────
function getAIFallback(name, subj, prio) {
  const n = name.toLowerCase();
  const s = (subj || '').toLowerCase();

  if (n.includes('essay') || n.includes('report') || n.includes('paper')) {
    return [
      'Brainstorm your main argument and create a quick outline',
      'Research and gather 3–5 credible sources',
      'Write the introduction and thesis statement',
      'Draft body paragraphs with evidence and examples',
      'Write conclusion, add citations, then proofread carefully',
    ];
  }
  if (n.includes('quiz') || n.includes('test') || n.includes('exam') || n.includes('midterm') || n.includes('final')) {
    return [
      'Review lecture notes and highlight key concepts',
      'Summarise each topic on a single flashcard or sticky note',
      'Work through past papers or practice problems',
      'Identify weak areas and revisit them specifically',
      'Get a good night\'s sleep and eat before the exam',
    ];
  }
  if (n.includes('lab') || n.includes('experiment')) {
    return [
      'Read the procedure fully before starting',
      'Set up equipment and record baseline measurements',
      'Carry out the experiment and log observations',
      'Analyse data and identify any anomalies',
      'Write up results, discussion, and conclusion',
    ];
  }
  if (n.includes('project') || n.includes('assignment') || n.includes('homework')) {
    return [
      'Clarify all requirements and mark scheme criteria',
      'Break the project into smaller milestones with mini-deadlines',
      'Complete the most difficult section first (peak focus time)',
      'Review against rubric before submitting',
      'Submit early so you have buffer time for revisions',
    ];
  }
  if (n.includes('presentation') || n.includes('slides') || n.includes('speech')) {
    return [
      'Define your 3 core messages (audience takeaways)',
      'Create a clear slide structure: intro → points → conclusion',
      'Design slides with minimal text and strong visuals',
      'Practise out loud at least twice',
      'Prepare answers to likely audience questions',
    ];
  }
  if (s.includes('math') || s.includes('calculus') || s.includes('statistics') || s.includes('algebra')) {
    return [
      'Review relevant formulas and theorem statements',
      'Work through the textbook examples step-by-step',
      'Solve 5–10 practice problems without looking at solutions',
      'Check your work and identify mistakes',
      'Re-do any problems you got wrong once more',
    ];
  }
  if (s.includes('cs') || s.includes('code') || s.includes('programming') || n.includes('code') || n.includes('program')) {
    return [
      'Understand the problem fully before writing any code',
      'Write pseudocode or draw a diagram of your approach',
      'Implement a minimal working solution',
      'Test with edge cases (empty input, large values, etc.)',
      'Refactor for clarity and add comments',
    ];
  }
  if (s.includes('history') || s.includes('social')) {
    return [
      'Identify key dates, events, and people involved',
      'Organise a cause-and-effect timeline',
      'Write a brief summary of each major theme',
      'Practise writing short paragraph answers',
      'Review with someone else or self-quiz',
    ];
  }
  if (s.includes('language') || s.includes('spanish') || s.includes('french') || s.includes('english')) {
    return [
      'Study new vocabulary with spaced repetition (Anki or flashcards)',
      'Read a short passage and summarise it in your own words',
      'Write 5–10 sentences using the target grammar structure',
      'Listen to native audio and note unfamiliar expressions',
      'Do a timed writing or speaking drill',
    ];
  }
  // Generic fallback
  return [
    prio === 'urgent' ? 'Start immediately — this is high priority!' : 'Schedule a dedicated time slot in your calendar',
    'Break the task into smaller concrete actions',
    'Complete the hardest or most important part first',
    'Review your work against any given rubric or checklist',
    'Submit or deliver with time to spare',
  ];
}

// ── Toggle Task Done ──────────────────────────────────────────
async function toggleTask(id) {
  const t = SS.tasks.find(x => x.id === id);
  if (!t || t.done) return;

  t.done = true;
  if (SS.currentUser.id !== 'demo') {
    updateTask(id, { done: true }).catch(() => {});
    logStreakDate(SS.currentUser.id).catch(() => {});
  }

  // Update streak
  if (SS.userProfile) {
    const today = new Date().toISOString().split('T')[0];
    if (SS.userProfile.last_active !== today) {
      SS.userProfile.streak = (SS.userProfile.streak || 0) + 1;
      SS.userProfile.last_active = today;
      if (SS.currentUser.id !== 'demo') {
        upsertProfile({ id: SS.currentUser.id, streak: SS.userProfile.streak, last_active: today }).catch(() => {});
      }
    }
  }

  await awardXP(10, 'Task completed');
  renderTasks();
  renderMiniGarden();
  renderFullGarden();
  renderAnalytics();
  checkAchievements();
}

// ── Delete Task ───────────────────────────────────────────────
async function deleteTask(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  SS.tasks = SS.tasks.filter(x => x.id !== id);
  if (SS.currentUser.id !== 'demo') {
    deleteTaskDB(id).catch(() => {});
  }
  renderTasks();
  renderMiniGarden();
  renderFullGarden();
  renderAnalytics();
  toast('Task deleted 🗑️');
}

// ── Set Focus Session ─────────────────────────────────────────
function setFocus(id) {
  const t = SS.tasks.find(x => x.id === id);
  if (!t) return;
  SS.focusTaskId = id;
  const el = document.getElementById('f-task');
  if (el) el.textContent = t.name;
  resetTimer();
  toast('Focus session set ⏱️');
}

// ── Pomodoro Timer ────────────────────────────────────────────
function toggleTimer() {
  const btn = document.getElementById('f-btn');
  if (SS.timerOn) {
    clearInterval(SS.timerInt);
    SS.timerOn = false;
    if (btn) btn.textContent = 'resume';
  } else {
    SS.timerOn = true;
    if (btn) btn.textContent = 'pause';
    SS.timerInt = setInterval(() => {
      SS.timerSec--;
      if (SS.timerSec <= 0) {
        SS.timerSec = 0;
        clearInterval(SS.timerInt);
        SS.timerOn = false;
        if (btn) btn.textContent = 'done! ✓';
        toast('Focus session complete! Take a 5-min break 🌸', 4000);
        awardXP(5, 'Focus session completed');
      }
      updateTimerDisplay();
    }, 1000);
  }
}
function resetTimer() {
  clearInterval(SS.timerInt);
  SS.timerOn  = false;
  SS.timerSec = 1500;
  updateTimerDisplay();
  const btn = document.getElementById('f-btn');
  if (btn) btn.textContent = 'start';
}
function updateTimerDisplay() {
  const m = Math.floor(SS.timerSec / 60);
  const s = SS.timerSec % 60;
  const d = document.getElementById('f-timer');
  if (d) d.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// ── Render Task List ──────────────────────────────────────────
function renderTasks() {
  const active = SS.tasks.filter(t => !t.done);
  const done   = SS.tasks.filter(t =>  t.done);
  const urgent = active.filter(t => t.priority === 'urgent');

  // Stats
  setInner('s-urgent', urgent.length);
  setInner('s-active', active.length);
  setInner('s-done',   done.length);
  setInner('nb',       active.length);
  setInner('topbar-sub', active.length + ' active · ' + done.length + ' completed');

  // Overload warning
  const ob = document.getElementById('overload-box');
  if (ob) {
    if (urgent.length >= 2 && active.length >= 4) {
      ob.style.display = 'flex';
      const firstUrgent = urgent[0]?.name || 'urgent tasks';
      setInner('overload-msg',
        `You have <strong>${active.length} active</strong> tasks with <strong>${urgent.length} urgent</strong>. ` +
        `Start with <strong>${escHtml(firstUrgent)}</strong>. You got this! 🌸`
      );
    } else {
      ob.style.display = 'none';
    }
  }

  // Task list (sorted: not-done first, then by priority)
  const sorted = [...SS.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const p = { urgent: 0, medium: 1, low: 2 };
    return (p[a.priority] || 1) - (p[b.priority] || 1);
  });

  const el = document.getElementById('task-list');
  if (!el) return;
  el.innerHTML = '';

  sorted.slice(0, 10).forEach(t => {
    const bc = t.priority === 'urgent' ? 'b-red' : t.priority === 'medium' ? 'b-yellow' : 'b-green';
    const div = document.createElement('div');
    div.className = 'task-item ' + (t.done ? 'done-item low' : t.priority);
    div.innerHTML =
      `<div class="task-cb${t.done ? ' done' : ''}" onclick="toggleTask('${t.id}')" title="${t.done ? 'Already done' : 'Mark as done'}">${t.done ? '✓' : ''}</div>` +
      `<div style="flex:1;min-width:0;">` +
        `<div class="task-nm${t.done ? ' done' : ''}">${escHtml(t.name)}</div>` +
        `<div class="task-meta">` +
          (t.due_date ? `<span class="task-dt">📅 ${t.due_date}</span>` : '') +
          (t.subject  ? `<span style="font-size:11px;color:var(--text2);">📚 ${escHtml(t.subject)}</span>` : '') +
          `<span class="px-badge ${bc}">${t.priority}</span>` +
        `</div>` +
      `</div>` +
      `<div class="task-actions">` +
        (!t.done ? `<button class="px-btn xs" style="background:var(--lav-pale);" onclick="setFocus('${t.id}')">⏱ focus</button>` : '') +
        `<button class="delete-btn" onclick="deleteTask('${t.id}')" title="Delete task">🗑</button>` +
      `</div>`;
    el.appendChild(div);
  });

  // Subject progress bars
  renderSubjectProgress();
}

function renderSubjectProgress() {
  const subjects = {};
  SS.tasks.forEach(t => {
    if (!subjects[t.subject]) subjects[t.subject] = { total: 0, done: 0 };
    subjects[t.subject].total++;
    if (t.done) subjects[t.subject].done++;
  });

  const pl = document.getElementById('prog-list');
  if (!pl) return;
  pl.innerHTML = '';
  let i = 0;
  for (const s in subjects) {
    const pct = Math.round(subjects[s].done / subjects[s].total * 100);
    const div = document.createElement('div');
    div.className = 'prog-item';
    div.innerHTML =
      `<div class="prog-row"><span class="prog-nm">${escHtml(s)}</span><span class="prog-pct">${pct}%</span></div>` +
      `<div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:${SS.progColors[i % SS.progColors.length]};"></div></div>`;
    pl.appendChild(div);
    i++;
  }
}

// ── Check & Toast Achievements ────────────────────────────────
function checkAchievements() {
  const done = SS.tasks.filter(t => t.done).length;
  const milestones = { 1: 'First Step 🌱', 5: 'In Bloom 🌸', 10: 'Champion 🏆', 15: 'Forest Guardian 🌲', 25: 'Legend ⭐' };
  if (milestones[done]) toast('Achievement unlocked: ' + milestones[done], 3500);
}

// ── Utility: safe innerHTML helper ────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function setInner(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = String(val);
}
