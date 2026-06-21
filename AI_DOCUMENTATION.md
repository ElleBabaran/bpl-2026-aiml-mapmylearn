# 🤖 StudySprint AI Engine & Edge Function Documentation

StudySprint integrates AI into two main areas:
1. **Dynamic Roadmap Generation**: Generating a phased syllabus with resource links, projects, and XP rewards.
2. **Assignment Breakdown**: Dividing study tasks into 5 concrete steps.

To bypass CORS restrictions in client-side browsers and secure API keys, we use a **Supabase Edge Function** as a proxy.

---

## 🏗️ Architecture Diagram

```
[ Client Browser ]
        │
        ▼ (POST request with Auth Token)
[ Supabase Edge Function Proxy ] (supabase/functions/roadmap-ai)
        │
        ├──► Uses GEMINI_API_KEY  ──► [ Google Gemini API ] (gemini-1.5-flash)
        │            OR
        └──► Uses ANTHROPIC_API_KEY ──► [ Anthropic Claude API ] (claude-3-5-sonnet)
        │
        ▼ (JSON validation)
[ Client Dashboard (UI Render) ]
```

---

## ⚡ Edge Function Reference

The backend code is defined in [supabase/functions/roadmap-ai/index.ts](file:///e:/Codes/StudySprint/supabase/functions/roadmap-ai/index.ts).

### 🛠️ Key Settings
- **Runtime**: Deno Deploy
- **CORS Support**: Allowed origins (`*`), headers (`authorization`, `x-client-info`, `apikey`, `content-type`), and methods (`POST`, `OPTIONS`).
- **Autodetect API Keys**:
  - If `GEMINI_API_KEY` is present in the environment secrets, the function invokes the Google Gemini API.
  - If `ANTHROPIC_API_KEY` is present, it invokes the Anthropic Claude API.

---

## 🔌 API Request / Response Schema

### 1. Roadmap Generation
- **Endpoint**: `${SUPABASE_URL}/functions/v1/roadmap-ai`
- **Method**: `POST`
- **Headers**:
  - `Content-Type`: `application/json`
  - `apikey`: `your-supabase-anon-key`
  - `Authorization`: `Bearer your-access-token`
- **Request Body**:
```json
{
  "action": "roadmap",
  "goal": "Learn React",
  "level": "complete beginner",
  "hours": 10,
  "deadline": "3 months"
}
```

- **Expected Response (JSON Array)**:
```json
[
  {
    "phase": 1,
    "title": "Phase Title",
    "duration": "Duration (e.g. 2 weeks)",
    "xp": 150,
    "topics": ["Topic 1", "Topic 2"],
    "resources": [
      {
        "name": "Resource Name",
        "url": "https://...",
        "type": "free|video|interactive|docs",
        "description": "Short summary",
        "icon": "📖|🎬|💻|🎨"
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "description": "Short description",
        "difficulty": "easy|medium|hard",
        "xp": 80,
        "icon": "🏗️|🎮|📱"
      }
    ]
  }
]
```

### 2. Task Breakdown
- **Request Body**:
```json
{
  "action": "breakdown",
  "name": "Write WW2 Essay",
  "subj": "History",
  "prio": "urgent"
}
```
- **Expected Response (JSON Array of Strings)**:
```json
[
  "Step 1: Brainstorm thesis...",
  "Step 2: Collect 3 sources...",
  "Step 3: Write intro...",
  "Step 4: Draft body paragraphs...",
  "Step 5: Revise and cite sources..."
]
```

---

## 🛡️ Smart Rule-Based Offline Fallback

If the Edge Function is not deployed or credentials are not configured, StudySprint implements a local fallback logic in [js/roadmap.js](file:///e:/Codes/StudySprint/js/roadmap.js#L67-L92) and [js/tasks.js](file:///e:/Codes/StudySprint/js/tasks.js#L71-L165).

### 1. Offline Roadmap Categories
The client-side scanner parses the user's goal string using Regex and routes it to specific offline curricula:
- **Frontend / Web Dev**: React, CSS, HTML, Vue, JavaScript.
- **Python / Data Science**: NumPy, Pandas, Machine Learning, AI.
- **Databases**: SQL, Postgres, MySQL, NoSQL.
- **Mobile Dev**: Android, iOS, Flutter, React Native.
- **UI/UX Design**: Figma, design thinking, wireframes.
- **Computer Science**: Data structures, LeetCode, DSA.
- **DevOps**: Docker, Linux, CI/CD, AWS.
- **Game Dev**: Unity, Godot, game loops, sprite rendering.
- **Generic**: An adaptable 3-phase study roadmap using query-parameterized search URLs pointing to YouTube, Coursera, and Wikipedia.

### 2. Offline Task Breakdowns
Custom steps are assigned based on task keywords (e.g., "essay" triggers outline/research, "quiz" triggers notes/flashcards, "code" triggers pseudocode/unit-testing).
