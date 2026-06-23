# 🌱 StudySprint

> **Stop procrastinating. Start finishing.**

StudySprint is an AI-powered productivity platform that helps students build personalized study roadmaps, manage tasks, stay focused, and visualize their progress through a growing virtual study garden.

---

## ✨ Features

### 🔐 Authentication

* Email/password signup and login with Supabase Auth
* Secure session persistence
* Row Level Security (RLS)

### 🗺️ AI Roadmap Generator

Generate personalized learning paths with:

* Structured phases
* Curated resources
* Hands-on projects
* XP rewards

Supports:

* Web Development
* Python & Machine Learning
* Data Science
* Databases
* Mobile Development
* UI/UX Design
* Data Structures & Algorithms
* DevOps
* Game Development

### 📝 Smart Task Manager

Organize assignments with:

* Priority levels
* Subjects
* Due dates
* Focus sessions

Automatically breaks tasks into actionable steps.

### ⏱️ Pomodoro Timer

25-minute focus sessions connected to tasks.

Reward: **+5 XP**

### 📊 Analytics Dashboard

Track:

* Weekly completion rates
* XP history
* Study streaks
* Achievement progress

### 🌱 Study Garden

Every completed task grows your garden.

Progression:

```text
🌱 Seed → 🌿 Sprout → 🌸 Cherry Blossom → 🌲 Ancient Tree
```

### ⭐ XP & Leveling

| Action           | XP  |
| ---------------- | --- |
| Complete a task  | +10 |
| Finish Pomodoro  | +5  |
| Generate roadmap | +20 |
| Complete stage   | +25 |
| Complete phase   | +50 |

Every **500 XP = 1 level**.

### 🚨 Overload Detection

Detects when multiple urgent tasks pile up and suggests what to prioritize.

### 🤝 Share Roadmaps

Generate shareable roadmap links.

---

## 🏗️ Project Structure

```text
StudySprint/
├── index.html
├── login.html
├── dashboard.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── config.js
│   ├── app.js
│   ├── auth.js
│   ├── tasks.js
│   ├── roadmap.js
│   ├── analytics.js
│   └── garden.js
│
├── supabase/
│   └── schema.sql
│
└── README.md
```

---

## ⚡ Tech Stack

**Frontend**

* HTML5
* CSS3
* JavaScript (ES2020+)

**Backend**

* Supabase
* PostgreSQL

**Tools**

* Tabler Icons
* Google Fonts

**AI**

* Rule-based engine
* Optional Gemini/Claude integration

---

## 🔐 Security

* Row Level Security enabled
* Passwords handled by Supabase Auth
* Anonymous keys are safe to expose
* Service role keys are never exposed

---

## 🚀 Run Locally

```bash
npx serve .
```

or

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

---

## 📄 License

MIT License

---

## 🙏 Credits

* MDN
* freeCodeCamp
* The Odin Project
* roadmap.sh
* Harvard CS50
* Kaggle
* fast.ai

---

**Built with 🌸 for students who want to stop procrastinating and start finishing.**
