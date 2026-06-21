# 🌱 StudySprint

> **Stop procrastinating. Start finishing.**

StudySprint is an AI-powered student productivity planner that builds personalised learning roadmaps, breaks down assignments into actionable steps, and grows your virtual study garden every time you level up.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth** | Email/password signup & login via Supabase Auth. Session persisted in `localStorage` with token refresh. |
| 🗺️ **AI Roadmap Generator** | Enter any learning goal → smart roadmap generator produces phased plans with real curated resources, hands-on projects, and XP per stage. Covers Web Dev, Python/ML, SQL, Mobile, UI/UX, DSA, DevOps, Game Dev, and more. |
| 📝 **Task Manager** | Add assignments with priority, subject, and due date. Mark done, delete, or set as focus session. Smart AI fallback breaks any task into 5 concrete steps. |
| ⏱️ **Pomodoro Timer** | 25-minute focus timer tied to a selected task. Earns +5 XP on completion. |
| 📊 **Analytics** | Weekly task completion bar chart, XP history bars, 28-day streak calendar (from real DB data), completion rate, and 12 unlockable achievements. |
| 🌱 **Study Garden** | Every completed task grows a plant: Seed → Sprout → Cherry Blossom → Ancient Tree. 32-slot garden visible in sidebar and full garden tab. |
| ⭐ **XP + Levelling** | Earn XP by completing tasks (+10), finishing focus sessions (+5), completing roadmap stages (+25), finishing a phase (+50 bonus), and claiming project XP. Level up every 500 XP. |
| 🔥 **Streaks** | Daily study streak tracked in the `streak_log` DB table. Displayed in garden and analytics. |
| ⚙️ **Profile Settings** | Change display name and school from the settings modal. |
| 🎯 **Overload Detection** | Warning banner appears when you have ≥4 active tasks with ≥2 urgent — AI suggests which to tackle first. |
| 🤝 **Share Roadmap** | Generate a shareable link for any roadmap (UI demo — full backend sharing is extensible). |

---

## 🏗️ Project Structure

```
StudySprint/
├── index.html          ← Landing page (features, hero, CTA)
├── login.html          ← Login + Signup (tabbed, single page)
├── dashboard.html      ← Main app: Tasks, Roadmap, Analytics, Garden
│
├── css/
│   └── style.css       ← Complete design system (pixel-art aesthetic)
│
├── js/
│   ├── config.js       ← Supabase config, global state (window.SS), DB helpers
│   ├── app.js          ← Navigation, toast, XP popup, session save/load, profile modal
│   ├── auth.js         ← Login, signup, demo mode, logout, session restore
│   ├── tasks.js        ← Task CRUD, AI breakdown fallback, Pomodoro timer
│   ├── roadmap.js      ← Roadmap generation (topic-aware fallback), stage tracking
│   ├── analytics.js    ← Charts, XP history, streak calendar, achievements
│   └── garden.js       ← Plant rendering (mini + full), streak dots
│
├── supabase/
│   └── schema.sql      ← Full DB schema with RLS policies and triggers
│
└── README.md
```

---

## ⚡ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES2020+) — no framework, no build step
- **Backend / DB:** [Supabase](https://supabase.com) (PostgreSQL + Auth + REST API)
- **Icons:** [Tabler Icons](https://tabler.io/icons) (CDN)
- **Fonts:** [Google Fonts](https://fonts.google.com) — Press Start 2P + Inter
- **AI:** Smart rule-based roadmap & task breakdown fallback (no API key required)

---


## 🤖 AI Features

### Task Breakdown

When you add a task, StudySprint analyses the task name and subject to generate a 5-step action plan using a **smart rule-based fallback**:

- Essays/reports → research → outline → draft → citations → proofread
- Quizzes/exams → review notes → flashcards → practice problems → self-test → rest
- Lab reports → read procedure → set up → run experiment → analyse → write up
- Code/CS tasks → understand → pseudocode → implement → test → refactor
- Math/Calculus → review formulas → examples → practice → check → redo mistakes
- + more subject-specific flows

> **To enable real AI (optional):** 
> 
> We have created a ready-to-deploy Supabase Edge Function under [supabase/functions/roadmap-ai/index.ts](file:///e:/Codes/StudySprint/supabase/functions/roadmap-ai/index.ts). It supports both Google Gemini (via `GEMINI_API_KEY`) and Anthropic Claude (via `ANTHROPIC_API_KEY`).
> 
> To deploy it to your Supabase project:
> 
> ```bash
> # 1. Install Supabase CLI (if you haven't already):
> npm install -g supabase
> 
> # 2. Login to your Supabase account:
> supabase login
> 
> # 3. Link your project (find your Project Ref in Settings -> General Settings):
> supabase link --project-ref your-project-ref
> 
> # 4. Deploy the function:
> supabase functions deploy roadmap-ai
> 
> # 5. Set your preferred AI API key in your Supabase project:
> # For Google Gemini:
> supabase secrets set GEMINI_API_KEY="your-gemini-api-key-here"
> # Or for Anthropic Claude:
> supabase secrets set ANTHROPIC_API_KEY="your-claude-api-key-here"
> ```
> 
> Once deployed, the frontend dashboard will automatically detect the function and fetch live, dynamic roadmaps and breakdowns generated by the AI model. If the function is not deployed or keys are missing, the app seamlessly falls back to the local smart rule-based builder.

### Roadmap Generator

The roadmap generator detects your topic and builds a curriculum-appropriate multi-phase plan:

| Topic Detected | Roadmap Path |
|---|---|
| React / Vue / Angular / HTML / CSS / JS | Web Development path |
| Python / Data Science / ML / AI / Pandas | Python + Data Science path |
| SQL / Database / PostgreSQL | Database fundamentals path |
| Android / iOS / Flutter / React Native | Mobile Development path |
| UX / UI / Figma / Design | UI/UX Design path |
| Algorithms / DSA / LeetCode | CS Fundamentals path |
| Docker / Kubernetes / AWS / DevOps | DevOps path |
| Unity / Godot / Game Dev | Game Development path |
| *(anything else)* | Generic 3-phase learning path |

Each phase includes **real URLs** to MDN, freeCodeCamp, The Odin Project, roadmap.sh, Harvard CS50, Kaggle, fast.ai, and other trusted free resources.

---

## 🎮 XP & Levelling System

| Action | XP Awarded |
|---|---|
| Complete a task | +10 XP |
| Finish a Pomodoro session | +5 XP |
| Generate a roadmap | +20 XP |
| Complete a roadmap stage | +25 XP |
| Complete all stages in a phase | +50 XP (bonus) |
| Claim a project XP reward | +30–120 XP (varies) |

**Level thresholds:** Every 500 XP = 1 level. Toast notification on level-up.

---

## 🏆 Achievements

| Achievement | Requirement |
|---|---|
| 🌱 First Step | Complete 1 task |
| 🔥 On Fire | 3-day streak |
| ⭐ Scholar | Earn 100 XP |
| 🌸 In Bloom | Complete 5 tasks |
| 🗺️ Explorer | Generate a roadmap |
| 🏆 Champion | Complete 10 tasks |
| ⚡ Speed Learner | 7-day streak |
| 💎 Diamond Student | Earn 500 XP |
| 🌲 Forest Guardian | Complete 15 tasks |
| 🦁 Study Lion | Complete 25 tasks |
| 🌟 Legend | Earn 1000 XP |
| 🤝 Team Player | Share a roadmap |

---

## 🌿 Study Garden

Plants grow as you complete tasks:

| Count | Plant | Type |
|---|---|---|
| 1–3 | 🌱 | Seedling |
| 4–7 | 🌿 | Sprout |
| 8–14 | 🌸 | Cherry Blossom |
| 15+ | 🌲 | Ancient Tree |

The garden holds **32 plots**. Your mini garden in the sidebar shows the first 10.

---

## 📁 Environment Configuration

All configuration lives in [`js/config.js`](js/config.js):

```js
// Supabase project credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const ANON_KEY     = 'your-anon-key';

// Global state namespace
window.SS = { ... };
```

No `.env` file is needed — this is a client-side app. The `ANON_KEY` is safe to expose (it's the public anonymous key, not the service role key). Row Level Security on all tables ensures users can only access their own data.

---

## 🔐 Security Notes

- All Supabase tables use **Row Level Security (RLS)** — users can only read and write their own rows
- Passwords are handled entirely by Supabase Auth (bcrypt hashed, never stored in the app)
- The `ANON_KEY` is a public key — it's safe to commit (Supabase docs confirm this)
- **Never commit your `service_role` key** — it bypasses RLS

---

## 🛠️ Local Development

```bash
# Option 1: VS Code Live Server extension (recommended)
# Right-click index.html → Open with Live Server

# Option 2: Node.js
npx serve .

# Option 3: Python
python -m http.server 8080

# Option 4: PHP
php -S localhost:8080
```

Then visit `http://localhost:8080` in your browser.

---

## 📝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Open a pull request with a clear description

### Code Style
- Vanilla JS — no transpilation needed
- Functions are named clearly (verb + noun: `renderTasks`, `addTask`, `generateRoadmap`)
- All DB calls live in `config.js`, all UI logic lives in the relevant module file
- Use `escHtml()` when interpolating user content into innerHTML

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Credits

- Design inspired by pixel-art aesthetics and modern glassmorphism
- Resources curated from: [MDN](https://developer.mozilla.org), [freeCodeCamp](https://freecodecamp.org), [The Odin Project](https://theodinproject.com), [roadmap.sh](https://roadmap.sh), [JavaScript.info](https://javascript.info), [Harvard CS50](https://cs50.harvard.edu), [Kaggle](https://kaggle.com), [fast.ai](https://fast.ai), and more
- Icons by [Tabler Icons](https://tabler.io/icons)
- Fonts by [Google Fonts](https://fonts.google.com)

---

*Built with 🌸 for students who want to actually finish what they start.*
#   b p l - 2 0 2 6 - a i m l - m a p m y l e a r n  
 