/* ============================================================
   js/roadmap.js — AI roadmap generation (with smart fallback),
   stage completion, XP claiming, share modal
   ============================================================ */

// ── Generate Roadmap ──────────────────────────────────────────
async function generateRoadmap() {
  const goal     = document.getElementById('rm-goal').value.trim();
  const level    = document.getElementById('rm-level').value;
  const hours    = document.getElementById('rm-hours').value || '8';
  const deadline = document.getElementById('rm-deadline').value.trim() || '3 months';

  if (!goal) { toast('Enter a learning goal! 🗺️'); return; }

  const btn = document.getElementById('rm-btn');
  btn.disabled = true;
  document.getElementById('rm-loading').style.display = 'block';
  document.getElementById('rm-empty').style.display   = 'none';
  document.getElementById('rm-list').innerHTML        = '';

  try {
    let phases;
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
          body: JSON.stringify({ action: 'roadmap', goal, level, hours, deadline })
        });
        if (response.ok) {
          phases = await response.json();
        } else {
          console.warn('Supabase Edge Function returned non-OK status. Code:', response.status);
        }
      } catch (err) {
        console.warn('Real AI generation failed, falling back to smart rules:', err);
      }
    }

    if (!phases || !Array.isArray(phases)) {
      phases = buildFallbackRoadmap(goal, level, hours, deadline);
    }

    const rmRecord = {
      user_id:       SS.currentUser.id,
      goal,
      level,
      hours_per_week: parseInt(hours),
      deadline,
      phases,
      stage_progress: {},
      created_at: new Date().toISOString(),
    };

    if (SS.currentUser.id !== 'demo') {
      try {
        const saved = await insertRoadmap(rmRecord);
        if (saved) SS.roadmaps.unshift(saved);
      } catch (_) {
        rmRecord.id = 'rm' + Date.now();
        SS.roadmaps.unshift(rmRecord);
      }
    } else {
      rmRecord.id = 'rm' + Date.now();
      SS.roadmaps.unshift(rmRecord);
    }

    // Init stage state for new roadmap
    phases.forEach((_, pi) => {
      const key = 'rm-' + pi;
      if (!SS.rmStages[key]) SS.rmStages[key] = { stages: 4, done: 0 };
    });

    renderRoadmapPhases(goal, phases);
    toast('Roadmap generated! 🗺️✨');
    await awardXP(20, 'Roadmap created');
  } catch (e) {
    document.getElementById('rm-empty').style.display = 'block';
    document.getElementById('rm-empty').querySelector('.empty-d').textContent =
      'Error generating roadmap: ' + (e.message || 'Please try again.');
  } finally {
    btn.disabled = false;
    document.getElementById('rm-loading').style.display = 'none';
  }
}

// ── Smart Fallback Roadmap Builder ────────────────────────────
function buildFallbackRoadmap(goal, level, hours, deadline) {
  const g = goal.toLowerCase();
  const isBeginnerLevel = level === 'complete beginner';

  // Detect topic category
  const isWeb     = /react|vue|angular|html|css|javascript|js|frontend|web dev|next\.js|typescript/.test(g);
  const isPython  = /python|data science|machine learning|ml|ai|pandas|numpy|django|flask/.test(g);
  const isDB      = /sql|database|postgres|mysql|mongodb|nosql|database/.test(g);
  const isMobile  = /android|ios|flutter|react native|mobile/.test(g);
  const isDesign  = /ux|ui|figma|design|user experience|user interface/.test(g);
  const isCS      = /algorithm|data structure|dsa|competitive programming|system design/.test(g);
  const isDevOps  = /docker|kubernetes|aws|cloud|devops|ci\/cd|linux/.test(g);
  const isJava    = /java\b|spring|backend/.test(g);
  const isGame    = /game dev|unity|unreal|godot|game/.test(g);

  if (isWeb) return webDevRoadmap(goal, level, hours, deadline);
  if (isPython) return pythonRoadmap(goal, level, hours, deadline);
  if (isDB) return dbRoadmap(goal, level);
  if (isMobile) return mobileRoadmap(goal, level);
  if (isDesign) return designRoadmap(goal, level);
  if (isCS) return csRoadmap(goal, level);
  if (isDevOps) return devopsRoadmap(goal, level);
  if (isGame) return gameDevRoadmap(goal, level);
  return genericRoadmap(goal, level, hours, deadline);
}

function webDevRoadmap(goal, level, hours, deadline) {
  const phases = [];
  if (level === 'complete beginner') {
    phases.push({
      phase: 1, title: 'HTML & CSS Foundations', duration: '2 weeks', xp: 150,
      topics: ['HTML structure & semantics','CSS selectors & box model','Flexbox & Grid','Responsive design','Forms & accessibility'],
      resources: [
        { name: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', type: 'docs', description: 'The gold standard reference for HTML — free and always up to date', icon: '📖' },
        { name: 'CSS-Tricks Flexbox Guide', url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/', type: 'docs', description: 'The most popular visual Flexbox reference on the web', icon: '🎨' },
        { name: 'freeCodeCamp — Responsive Web Design', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', type: 'interactive', description: 'Complete certification course: HTML + CSS from scratch', icon: '💻' },
        { name: 'The Odin Project — Foundations', url: 'https://www.theodinproject.com/paths/foundations', type: 'free', description: 'Structured curriculum with projects — highly respected in the community', icon: '⚔️' },
      ],
      projects: [
        { name: 'Personal Portfolio Page', description: 'Build a responsive portfolio with your name, bio, and skills section', difficulty: 'easy', xp: 40, icon: '🗂️' },
        { name: 'Product Landing Page', description: 'Recreate a real product page (Apple, Notion, etc.) from scratch', difficulty: 'medium', xp: 60, icon: '🛍️' },
      ],
    });
  }
  phases.push({
    phase: phases.length + 1, title: 'JavaScript Essentials', duration: '3 weeks', xp: 200,
    topics: ['Variables, types & functions','DOM manipulation','Events & callbacks','Fetch API & Promises','ES6+ syntax'],
    resources: [
      { name: 'JavaScript.info', url: 'https://javascript.info/', type: 'free', description: 'The best modern JavaScript tutorial — comprehensive and free', icon: '📘' },
      { name: 'Eloquent JavaScript (free book)', url: 'https://eloquentjavascript.net/', type: 'free', description: 'Deep-dive book available free online — excellent for understanding JS', icon: '📕' },
      { name: 'freeCodeCamp — JavaScript Algorithms', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', type: 'interactive', description: 'Certification with 300+ coding challenges', icon: '💻' },
    ],
    projects: [
      { name: 'Interactive To-Do App', description: 'Build a task manager with add/delete/local storage persistence', difficulty: 'easy', xp: 50, icon: '✅' },
      { name: 'Weather App', description: 'Fetch real weather data from an API and display it beautifully', difficulty: 'medium', xp: 70, icon: '🌤️' },
    ],
  });
  phases.push({
    phase: phases.length + 1, title: goal.toLowerCase().includes('react') ? 'React & Modern Tooling' : 'Frontend Framework', duration: '4 weeks', xp: 250,
    topics: ['Components & props','State management (useState, useEffect)','React Router','API integration','Build tools (Vite)'],
    resources: [
      { name: 'React Official Docs (new)', url: 'https://react.dev/learn', type: 'docs', description: 'The new official React docs with interactive examples', icon: '⚛️' },
      { name: 'Scrimba — Learn React', url: 'https://scrimba.com/learn/learnreact', type: 'video', description: 'Interactive coding screencasts — type in the video itself', icon: '🎬' },
      { name: 'roadmap.sh — React', url: 'https://roadmap.sh/react', type: 'docs', description: 'Visual skill tree showing what to learn and in what order', icon: '🗺️' },
    ],
    projects: [
      { name: 'Recipe Finder App', description: 'Search recipes via API, display results, add to favourites', difficulty: 'medium', xp: 80, icon: '🍳' },
      { name: 'Full-Stack Blog', description: 'Build a blog with Supabase backend, auth, and CRUD posts', difficulty: 'hard', xp: 120, icon: '📝' },
    ],
  });
  phases.push({
    phase: phases.length + 1, title: 'Deployment & Career Prep', duration: '1 week', xp: 100,
    topics: ['Git & GitHub','Vercel / Netlify deployment','Portfolio optimisation','LinkedIn & resume tips','Open source contributions'],
    resources: [
      { name: 'GitHub Skills', url: 'https://skills.github.com/', type: 'interactive', description: 'Official GitHub interactive courses for Git mastery', icon: '🐙' },
      { name: 'Vercel Deployment Guide', url: 'https://vercel.com/docs/deployments/overview', type: 'docs', description: 'Deploy your projects live in minutes for free', icon: '🚀' },
    ],
    projects: [
      { name: 'Polished Portfolio Site', description: 'Deploy your portfolio with all projects linked and live', difficulty: 'medium', xp: 60, icon: '✨' },
    ],
  });
  return phases;
}

function pythonRoadmap(goal, level, hours, deadline) {
  const isML = /machine learning|ml|ai|deep learning|neural|tensorflow|pytorch/.test(goal.toLowerCase());
  const phases = [];

  if (level === 'complete beginner') {
    phases.push({
      phase: 1, title: 'Python Fundamentals', duration: '2 weeks', xp: 150,
      topics: ['Variables, data types, operators','Control flow (if/for/while)','Functions & scope','Lists, dicts, sets, tuples','File I/O & modules'],
      resources: [
        { name: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'docs', description: 'Start here — the official step-by-step Python tutorial', icon: '🐍' },
        { name: 'CS50P — Python (Harvard, free)', url: 'https://cs50.harvard.edu/python/', type: 'video', description: 'Harvard\'s free Python course — world-class quality', icon: '🎓' },
        { name: 'Automate the Boring Stuff', url: 'https://automatetheboringstuff.com/', type: 'free', description: 'Free online book focused on practical Python automation', icon: '📗' },
      ],
      projects: [
        { name: 'Number Guessing Game', description: 'Simple CLI game using random numbers, loops, and input validation', difficulty: 'easy', xp: 30, icon: '🎮' },
        { name: 'CSV Data Analyser', description: 'Read a CSV file and output statistics (average, min, max, etc.)', difficulty: 'medium', xp: 50, icon: '📊' },
      ],
    });
  }

  phases.push({
    phase: phases.length + 1, title: 'Data Analysis with Pandas & NumPy', duration: '3 weeks', xp: 200,
    topics: ['NumPy arrays & vectorised operations','Pandas DataFrames','Data cleaning & transformation','Matplotlib & Seaborn visualisation','Exploratory Data Analysis (EDA)'],
    resources: [
      { name: 'Pandas Official Docs', url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/', type: 'docs', description: 'The definitive Pandas tutorial for beginners', icon: '🐼' },
      { name: 'Kaggle — Pandas Course (free)', url: 'https://www.kaggle.com/learn/pandas', type: 'interactive', description: 'Hands-on micro-course with real datasets — free certificate', icon: '🏆' },
      { name: 'Seaborn Gallery', url: 'https://seaborn.pydata.org/examples/', type: 'docs', description: 'Copy-paste chart code with live examples', icon: '📈' },
    ],
    projects: [
      { name: 'COVID-19 Data Dashboard', description: 'Analyse public COVID data and visualise trends with Matplotlib', difficulty: 'medium', xp: 70, icon: '📉' },
      { name: 'Sales Insights Report', description: 'Clean and analyse a real retail dataset, present findings', difficulty: 'hard', xp: 90, icon: '🛒' },
    ],
  });

  if (isML) {
    phases.push({
      phase: phases.length + 1, title: 'Machine Learning Foundations', duration: '4 weeks', xp: 300,
      topics: ['Supervised vs unsupervised learning','Linear & logistic regression','Decision trees & random forests','Model evaluation & cross-validation','scikit-learn pipeline'],
      resources: [
        { name: 'fast.ai — Practical ML (free)', url: 'https://course.fast.ai/', type: 'video', description: 'Top-down approach to ML — used by practitioners worldwide', icon: '⚡' },
        { name: 'Kaggle — Intro to ML', url: 'https://www.kaggle.com/learn/intro-to-machine-learning', type: 'interactive', description: 'Kaggle\'s hands-on ML micro-course with free datasets', icon: '🤖' },
        { name: 'Scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'docs', description: 'Comprehensive guide to the industry-standard ML library', icon: '🔬' },
      ],
      projects: [
        { name: 'Titanic Survival Predictor', description: 'Classic Kaggle competition — predict survival using passenger data', difficulty: 'medium', xp: 80, icon: '🚢' },
        { name: 'House Price Predictor', description: 'Regression model to predict housing prices from features', difficulty: 'hard', xp: 100, icon: '🏠' },
      ],
    });
  }

  phases.push({
    phase: phases.length + 1, title: 'Projects & Portfolio', duration: '2 weeks', xp: 150,
    topics: ['Jupyter notebooks best practices','GitHub for data science','Writing technical READMEs','Deploying models with Streamlit','Building a portfolio on Kaggle'],
    resources: [
      { name: 'Streamlit Docs', url: 'https://docs.streamlit.io/', type: 'docs', description: 'Turn Python scripts into interactive web apps in minutes', icon: '🌊' },
      { name: 'Towards Data Science', url: 'https://towardsdatascience.com/', type: 'free', description: 'Community articles on real-world data science projects', icon: '📰' },
    ],
    projects: [
      { name: 'Streamlit ML Demo App', description: 'Deploy your ML model as an interactive web app on Streamlit Cloud', difficulty: 'hard', xp: 100, icon: '🚀' },
    ],
  });

  return phases;
}

function dbRoadmap(goal, level) {
  return [
    {
      phase: 1, title: 'SQL Fundamentals', duration: '2 weeks', xp: 150,
      topics: ['SELECT, WHERE, ORDER BY','JOINs (INNER, LEFT, RIGHT)','GROUP BY & aggregates','Subqueries','DDL: CREATE, ALTER, DROP'],
      resources: [
        { name: 'SQLZoo (interactive)', url: 'https://sqlzoo.net/', type: 'interactive', description: 'Run real SQL queries in your browser — great for beginners', icon: '🐘' },
        { name: 'Mode SQL Tutorial', url: 'https://mode.com/sql-tutorial/', type: 'free', description: 'Business-focused SQL guide with real datasets', icon: '📊' },
        { name: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', type: 'docs', description: 'Comprehensive Postgres-specific guide', icon: '📘' },
      ],
      projects: [
        { name: 'Library Database Schema', description: 'Design and query a relational database for a library system', difficulty: 'easy', xp: 40, icon: '📚' },
        { name: 'E-Commerce Queries', description: 'Write complex queries on a provided e-commerce database', difficulty: 'medium', xp: 60, icon: '🛒' },
      ],
    },
    {
      phase: 2, title: 'Database Design & Optimisation', duration: '2 weeks', xp: 200,
      topics: ['Normalisation (1NF–3NF)','Indexes & query planning','Transactions & ACID','Views & stored procedures','Connection pooling'],
      resources: [
        { name: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/', type: 'free', description: 'The definitive free guide to SQL indexing and performance', icon: '⚡' },
        { name: 'CS186 — Databases (Berkeley, free)', url: 'https://cs186berkeley.net/', type: 'video', description: 'Berkeley\'s full database course — free lecture videos', icon: '🎓' },
      ],
      projects: [
        { name: 'Optimise a Slow Query', description: 'Take a slow query, add indexes, measure EXPLAIN ANALYSE improvement', difficulty: 'hard', xp: 80, icon: '🔍' },
      ],
    },
  ];
}

function mobileRoadmap(goal, level) {
  const isFlutter = /flutter/.test(goal.toLowerCase());
  const title = isFlutter ? 'Flutter & Dart' : 'React Native';
  return [
    {
      phase: 1, title: 'Mobile Dev Fundamentals', duration: '2 weeks', xp: 150,
      topics: ['Mobile vs web paradigm','Platform differences (iOS/Android)','Emulators & dev tools','Project structure','Component/Widget basics'],
      resources: [
        { name: isFlutter ? 'Flutter Official Codelabs' : 'React Native Docs', url: isFlutter ? 'https://docs.flutter.dev/codelabs' : 'https://reactnative.dev/docs/getting-started', type: 'docs', description: 'Official getting started guide', icon: '📱' },
        { name: isFlutter ? 'Flutter YouTube Channel' : 'Expo Docs', url: isFlutter ? 'https://www.youtube.com/@flutterdev' : 'https://docs.expo.dev/', type: 'video', description: 'Official video tutorials and demos', icon: '🎬' },
      ],
      projects: [
        { name: 'Hello World App', description: 'Build and run your first mobile app on emulator', difficulty: 'easy', xp: 30, icon: '👋' },
        { name: 'Counter App', description: 'Classic counter with state management and styled components', difficulty: 'easy', xp: 40, icon: '🔢' },
      ],
    },
    {
      phase: 2, title: 'Core UI & Navigation', duration: '3 weeks', xp: 200,
      topics: ['Navigation stacks & tabs','Lists & scroll views','Forms & validation','Async data fetching','Local storage'],
      resources: [
        { name: isFlutter ? 'Flutter Cookbook' : 'React Navigation Docs', url: isFlutter ? 'https://docs.flutter.dev/cookbook' : 'https://reactnavigation.org/docs/getting-started', type: 'docs', description: 'Recipes for common mobile UI patterns', icon: '🍳' },
      ],
      projects: [
        { name: 'Notes App', description: 'Multi-screen app with navigation, local storage, and CRUD', difficulty: 'medium', xp: 70, icon: '📝' },
        { name: 'Weather App', description: 'Fetch weather by GPS location and display with animations', difficulty: 'hard', xp: 100, icon: '🌤️' },
      ],
    },
  ];
}

function designRoadmap(goal, level) {
  return [
    {
      phase: 1, title: 'UX Foundations', duration: '2 weeks', xp: 150,
      topics: ['Design thinking process','User research methods','Information architecture','Wireframing','Heuristic evaluation'],
      resources: [
        { name: 'Google UX Design Certificate (Coursera)', url: 'https://www.coursera.org/professional-certificates/google-ux-design', type: 'video', description: 'Industry-recognised certificate — audit for free', icon: '🎓' },
        { name: 'NN/g UX Articles', url: 'https://www.nngroup.com/articles/', type: 'free', description: 'Nielsen Norman Group — the leading UX research publication', icon: '📰' },
        { name: 'Laws of UX', url: 'https://lawsofux.com/', type: 'free', description: 'Visual guide to the key principles of UX design', icon: '⚖️' },
      ],
      projects: [
        { name: 'User Interview Report', description: 'Interview 3 people about a product and document insights', difficulty: 'easy', xp: 40, icon: '🎤' },
        { name: 'Wireframe Redesign', description: 'Pick a bad app and wireframe a redesigned version', difficulty: 'medium', xp: 60, icon: '✏️' },
      ],
    },
    {
      phase: 2, title: 'Figma & Visual Design', duration: '3 weeks', xp: 200,
      topics: ['Figma components & variants','Typography & colour theory','Design systems','Prototyping & interactions','Handoff to developers'],
      resources: [
        { name: 'Figma Academy (free)', url: 'https://www.figma.com/resources/learn-design/', type: 'interactive', description: 'Official Figma tutorials — free and comprehensive', icon: '🎨' },
        { name: 'Refactoring UI (book)', url: 'https://www.refactoringui.com/', type: 'free', description: 'Practical design advice from the Tailwind CSS creators', icon: '📕' },
      ],
      projects: [
        { name: 'Mobile App Design System', description: 'Create a full design system with components for a mobile app', difficulty: 'hard', xp: 100, icon: '🎨' },
        { name: 'End-to-End Case Study', description: 'Design a full product from research to prototype', difficulty: 'hard', xp: 120, icon: '📱' },
      ],
    },
  ];
}

function csRoadmap(goal, level) {
  return [
    {
      phase: 1, title: 'Core Data Structures', duration: '3 weeks', xp: 200,
      topics: ['Arrays, strings, hash maps','Linked lists','Stacks & queues','Trees & binary search trees','Heaps'],
      resources: [
        { name: 'NeetCode.io (free)', url: 'https://neetcode.io/', type: 'free', description: 'Structured DSA roadmap with video explanations for every problem', icon: '🧠' },
        { name: 'LeetCode (Explore)', url: 'https://leetcode.com/explore/', type: 'interactive', description: 'Practice problems categorised by topic — industry standard', icon: '💻' },
        { name: 'CS50 — Introduction to CS (Harvard)', url: 'https://cs50.harvard.edu/x/', type: 'video', description: 'Harvard\'s world-famous intro CS course — completely free', icon: '🎓' },
      ],
      projects: [
        { name: 'Implement a Linked List', description: 'Build a doubly linked list from scratch with all operations', difficulty: 'medium', xp: 60, icon: '🔗' },
        { name: 'Solve 10 Easy LeetCode Problems', description: 'Array and string problems — aim for optimal time complexity', difficulty: 'easy', xp: 50, icon: '✅' },
      ],
    },
    {
      phase: 2, title: 'Algorithms & Complexity', duration: '3 weeks', xp: 250,
      topics: ['Big-O analysis','Sorting algorithms','Binary search','Graph traversal (BFS/DFS)','Dynamic programming basics'],
      resources: [
        { name: 'Algorithms Part I (Princeton, free)', url: 'https://www.coursera.org/learn/algorithms-part1', type: 'video', description: 'World-class algorithms course — audit free on Coursera', icon: '🎓' },
        { name: 'VisuAlgo', url: 'https://visualgo.net/', type: 'interactive', description: 'Visualise algorithms and data structures step by step', icon: '🎬' },
      ],
      projects: [
        { name: 'Pathfinding Visualiser', description: 'Build a web app that visualises BFS and DFS on a grid', difficulty: 'hard', xp: 100, icon: '🗺️' },
      ],
    },
  ];
}

function devopsRoadmap(goal, level) {
  return [
    {
      phase: 1, title: 'Linux & Shell Scripting', duration: '2 weeks', xp: 150,
      topics: ['Linux file system & permissions','Bash scripting basics','SSH & networking commands','Cron jobs & automation','Package management'],
      resources: [
        { name: 'Linux Journey (free)', url: 'https://linuxjourney.com/', type: 'interactive', description: 'Gamified Linux command-line learning — free and beginner-friendly', icon: '🐧' },
        { name: 'The Missing Semester (MIT)', url: 'https://missing.csail.mit.edu/', type: 'video', description: 'MIT\'s free course on shell tools, scripting, Git, and more', icon: '🎓' },
      ],
      projects: [
        { name: 'Backup Automation Script', description: 'Write a Bash script that backs up a folder and emails you on success', difficulty: 'medium', xp: 50, icon: '💾' },
      ],
    },
    {
      phase: 2, title: 'Docker & Containers', duration: '2 weeks', xp: 200,
      topics: ['Docker concepts & architecture','Writing Dockerfiles','Docker Compose','Container networking','Image optimisation'],
      resources: [
        { name: 'Docker Official Docs', url: 'https://docs.docker.com/get-started/', type: 'docs', description: 'Official getting started guide — hands-on from day 1', icon: '🐳' },
        { name: 'Play with Docker', url: 'https://www.docker.com/play-with-docker/', type: 'interactive', description: 'Run Docker in the browser for free — no install needed', icon: '💻' },
      ],
      projects: [
        { name: 'Containerise a Web App', description: 'Take an existing project and package it with Docker + Compose', difficulty: 'medium', xp: 70, icon: '📦' },
      ],
    },
  ];
}

function gameDevRoadmap(goal, level) {
  const isUnity = /unity/.test(goal.toLowerCase());
  return [
    {
      phase: 1, title: 'Game Dev Fundamentals', duration: '2 weeks', xp: 150,
      topics: ['Game loop & architecture','Sprites & 2D rendering','Physics & collision','Input handling','Scene management'],
      resources: [
        { name: isUnity ? 'Unity Learn (free)' : 'Godot Official Docs', url: isUnity ? 'https://learn.unity.com/' : 'https://docs.godotengine.org/', type: 'docs', description: 'Official learning platform with structured paths', icon: '🎮' },
        { name: 'GDC (Game Developers Conference)', url: 'https://www.gdcvault.com/free', type: 'video', description: 'Free GDC talks from professional game developers', icon: '🎬' },
      ],
      projects: [
        { name: 'Pong Clone', description: 'Classic Pong with 2-player support — master the game loop', difficulty: 'easy', xp: 40, icon: '🏓' },
        { name: '2D Platformer', description: 'Character movement, platforms, collectables, and score system', difficulty: 'medium', xp: 80, icon: '🏃' },
      ],
    },
    {
      phase: 2, title: 'Game Systems & Polish', duration: '3 weeks', xp: 200,
      topics: ['Sound design & music integration','Save/load systems','UI & menus','Particle effects','Performance profiling'],
      resources: [
        { name: 'OpenGameArt.org (free assets)', url: 'https://opengameart.org/', type: 'free', description: 'Free game assets: sprites, sounds, and music', icon: '🎨' },
      ],
      projects: [
        { name: 'Complete Publishable Game', description: 'Polish your platformer with sounds, menus, saving, and publish on itch.io', difficulty: 'hard', xp: 120, icon: '🚀' },
      ],
    },
  ];
}

function genericRoadmap(goal, level, hours, deadline) {
  return [
    {
      phase: 1, title: 'Foundations & Core Concepts of ' + goal, duration: '2 weeks', xp: 150,
      topics: ['Core theory and terminology of ' + goal,'Key frameworks and mental models','Primary resources identification','Setting up your study environment'],
      resources: [
        { name: 'Wikipedia — ' + goal, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(goal), type: 'free', description: 'Start with the big picture before diving into specifics', icon: '📖' },
        { name: 'YouTube — ' + goal + ' Fundamentals', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(goal + ' fundamentals tutorial'), type: 'video', description: 'Find highly-rated video tutorials for visual learners', icon: '🎬' },
        { name: 'Coursera — ' + goal, url: 'https://www.coursera.org/search?query=' + encodeURIComponent(goal), type: 'video', description: 'University-quality courses — many free to audit', icon: '🎓' },
      ],
      projects: [
        { name: 'Research Summary', description: 'Write a comprehensive 1-page summary detailing the core concepts of ' + goal + ' and your key questions to explore further.', difficulty: 'easy', xp: 30, icon: '📝' },
      ],
    },
    {
      phase: 2, title: 'Deep Dive & Practical Application', duration: '3 weeks', xp: 200,
      topics: ['Applied exercises related to ' + goal,'Complex problem solving','Case studies and historical context','Peer discussion & community engagement'],
      resources: [
        { name: 'Reddit Community', url: 'https://www.reddit.com/search/?q=' + encodeURIComponent(goal), type: 'free', description: 'Active community for questions, resources, and motivation regarding ' + goal, icon: '💬' },
        { name: 'Khan Academy or Dedicated Platform', url: 'https://www.google.com/search?q=' + encodeURIComponent(goal + ' interactive practice exercises'), type: 'interactive', description: 'Find interactive lessons and practice problems specifically for this topic.', icon: '🧠' },
      ],
      projects: [
        { name: 'Applied Case Study / Mini Project', description: 'Apply your knowledge to analyze a real-world scenario or solve a problem directly related to ' + goal + '.', difficulty: 'medium', xp: 70, icon: '🏗️' },
        { name: 'Teach Someone Else', description: 'Explain your key learnings about ' + goal + ' to a friend or write an insightful blog post summarizing your insights.', difficulty: 'medium', xp: 50, icon: '👩‍🏫' },
      ],
    },
    {
      phase: 3, title: 'Mastery & Advanced Exploration', duration: '2 weeks', xp: 250,
      topics: ['Advanced sub-topics within ' + goal,'Portfolio or essay building','Contributing to the field or community','Continuing education plan'],
      resources: [
        { name: 'Advanced Community Portals', url: 'https://www.google.com/search?q=' + encodeURIComponent(goal + ' community forum advanced'), type: 'free', description: 'Share your work and connect with advanced practitioners or enthusiasts of ' + goal + '.', icon: '🌐' },
      ],
      projects: [
        { name: goal + ' Capstone Project', description: 'Build a substantial project or write a detailed comprehensive paper demonstrating your mastery of ' + goal + ' — and share it publicly!', difficulty: 'hard', xp: 120, icon: '🏆' },
      ],
    },
  ];
}

// ── Render Roadmaps (on tab switch) ──────────────────────────
function renderRoadmaps() {
  const emptyEl = document.getElementById('rm-empty');
  const listEl  = document.getElementById('rm-list');
  if (!emptyEl || !listEl) return;

  if (SS.roadmaps.length === 0) {
    emptyEl.style.display = 'block';
    listEl.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';
  renderRoadmapPhases(SS.roadmaps[0].goal, SS.roadmaps[0].phases);
}

// ── Render Roadmap Phases ─────────────────────────────────────
function renderRoadmapPhases(goal, phases) {
  const el = document.getElementById('rm-list');
  if (!el) return;

  const typeTag = { free: 'tag-free', video: 'tag-video', interactive: 'tag-interactive', docs: 'tag-docs' };

  el.innerHTML =
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">` +
    `<div style="font-family:var(--px);font-size:7px;color:var(--lav2);line-height:1.8;">🗺️ ${escHtml(goal)}</div>` +
    `<button class="px-btn sm peach" onclick="openShareModal()">🤝 share roadmap</button></div>`;

  (phases || []).forEach((p, pi) => {
    const rmId  = 'rm-' + pi;
    if (!SS.rmStages[rmId]) SS.rmStages[rmId] = { stages: 4, done: 0 };
    const st = SS.rmStages[rmId];
    const stagePct = Math.round(st.done / st.stages * 100);

    const totalXP = (p.xp || 150) + (p.projects || []).reduce((a, pr) => a + (pr.xp || 30), 0);

    const stageDots = Array.from({ length: st.stages }, (_, si) =>
      `<div class="rm-stage-dot${si < st.done ? ' done' : si === st.done ? ' active-s' : ''}" ` +
      `onclick="completeStage('${rmId}',${si})" title="Stage ${si + 1}">` +
      `${si < st.done ? '✓' : si + 1}</div>`
    ).join('');

    const resources = (p.resources || []).map(r =>
      `<a class="rm-resource" href="${r.url}" target="_blank" rel="noopener noreferrer">` +
      `<span class="rm-res-icon">${r.icon || '📖'}</span>` +
      `<div class="rm-res-body"><div class="rm-res-name">${escHtml(r.name)}</div>` +
      `<div class="rm-res-desc">${escHtml(r.description || '')}</div></div>` +
      `<span class="rm-res-tag ${typeTag[r.type] || 'tag-free'}">${r.type || 'free'}</span></a>`
    ).join('');

    const projects = (p.projects || []).map(pr =>
      `<div class="rm-project"><span class="rm-proj-icon">${pr.icon || '🏗️'}</span>` +
      `<div class="rm-proj-body"><div class="rm-proj-name">${escHtml(pr.name)}</div>` +
      `<div class="rm-proj-desc">${escHtml(pr.description || '')}</div>` +
      `<div class="rm-proj-meta">` +
      `<span class="rm-proj-xp">+${pr.xp || 30} XP</span>` +
      `<span class="rm-proj-diff diff-${pr.difficulty || 'medium'}">${pr.difficulty || 'medium'}</span>` +
      `<button class="px-btn xs mint" onclick="claimProjectXP(${pr.xp || 30},'${escHtml(pr.name).replace(/'/g,"\\'")}')">claim XP →</button>` +
      `</div></div></div>`
    ).join('');

    const topics = (p.topics || []).map(t => `<div class="rm-topic">${escHtml(t)}</div>`).join('');
    const hdrClass = SS.phaseColors[pi % SS.phaseColors.length];

    el.innerHTML +=
      `<div class="rm-card">` +
      `<div class="rm-card-hdr ${hdrClass}">` +
      `<span class="rm-phase-num">Phase ${p.phase || pi + 1}</span>` +
      `<span class="rm-phase-title">${escHtml(p.title)}</span>` +
      `<span class="rm-duration">⏱ ${p.duration || ''}</span>` +
      `<span class="rm-xp-badge">⭐ +${totalXP} XP</span>` +
      `</div>` +
      `<div class="rm-stage-bar">` +
      `<div class="rm-stage-row"><span class="rm-stage-lbl">STAGE PROGRESS</span>` +
      `<div class="rm-stage-track"><div class="rm-stage-fill" style="width:${stagePct}%;"></div></div>` +
      `<span class="rm-stage-pct">${stagePct}%</span></div>` +
      `<div class="rm-stages">${stageDots}` +
      (st.done === st.stages
        ? `<span class="px-badge b-green" style="margin-left:6px;">✓ PHASE COMPLETE</span>`
        : `<span style="font-size:11px;color:var(--text3);margin-left:6px;">tap stages to complete</span>`) +
      `</div></div>` +
      `<div class="rm-card-body">` +
      `<div class="rm-section"><div class="rm-sec-title">TOPICS TO COVER</div><div class="rm-topics">${topics}</div></div>` +
      `<div class="rm-section"><div class="rm-sec-title">CURATED RESOURCES</div><div class="rm-resources">${resources}</div></div>` +
      `<div class="rm-section"><div class="rm-sec-title">🏗️ SUGGESTED PROJECTS</div><div class="rm-projects">${projects}</div></div>` +
      `</div></div>`;
  });
}

// ── Complete Stage ────────────────────────────────────────────
async function completeStage(rmId, stageIdx) {
  const st = SS.rmStages[rmId];
  if (!st) return;

  if (stageIdx === st.done) {
    st.done++;
    const bonus = st.done === st.stages ? 50 : 0;
    await awardXP(25 + bonus, 'Stage ' + (stageIdx + 1) + ' complete');
    if (bonus) toast('Phase complete! 🎉 Bonus +50 XP awarded!', 4000);

    // Persist stage progress to DB
    if (SS.currentUser.id !== 'demo' && SS.roadmaps.length > 0) {
      const rm = SS.roadmaps[0];
      const sp = rm.stage_progress || {};
      sp[rmId] = st;
      updateRoadmapStages(rm.id, sp).catch(() => {});
    }

    renderRoadmapPhases(SS.roadmaps[0]?.goal || '', SS.roadmaps[0]?.phases || []);
  } else if (stageIdx < st.done) {
    toast('Already completed! ✓');
  } else {
    toast('Complete previous stages first! 👇');
  }
}

// ── Claim Project XP ──────────────────────────────────────────
async function claimProjectXP(xp, name) {
  await awardXP(xp, 'Project: ' + name);
  toast('Project XP claimed! +' + xp + ' 🎉');
}

// ── Share Modal ───────────────────────────────────────────────
function openShareModal() {
  const activeRM = SS.roadmaps[0];
  if (!activeRM) {
    toast('No roadmap to share! 🗺️');
    return;
  }
  const rmData = {
    goal: activeRM.goal,
    level: activeRM.level,
    hours_per_week: activeRM.hours_per_week,
    deadline: activeRM.deadline,
    phases: activeRM.phases
  };
  const rmStr = JSON.stringify(rmData);
  const base64 = btoa(unescape(encodeURIComponent(rmStr)));
  const link = window.location.origin + window.location.pathname + '?share=' + base64;
  
  const linkEl = document.getElementById('share-link-text');
  if (linkEl) linkEl.textContent = link;

  const isDemo = SS.currentUser?.id === 'demo';
  const collabEl = document.getElementById('share-collab-section');
  if (collabEl) collabEl.style.display = isDemo ? 'block' : 'none';
  const tipEl = document.getElementById('share-tip-section');
  if (tipEl) tipEl.style.display = isDemo ? 'none' : 'block';

  document.getElementById('share-modal')?.classList.add('show');
}
function closeModal() {
  document.getElementById('share-modal')?.classList.remove('show');
}
function copyLink() {
  const t = document.getElementById('share-link-text')?.textContent || '';
  navigator.clipboard.writeText(t).catch(() => {
    prompt('Copy this link:', t);
  });
  toast('Link copied! 📋');
  if (localStorage.getItem('ss_shared_roadmap') !== '1') {
    localStorage.setItem('ss_shared_roadmap', '1');
    awardXP(15, 'Roadmap shared');
  }
}

async function importRoadmap(imported) {
  if (SS.roadmaps.some(r => r.goal === imported.goal)) {
    toast('You already have this roadmap! 🗺️');
    return;
  }

  const rmRecord = {
    user_id: SS.currentUser.id,
    goal: imported.goal,
    level: imported.level || 'Intermediate',
    hours_per_week: parseInt(imported.hours_per_week || 8),
    deadline: imported.deadline || '3 months',
    phases: imported.phases,
    stage_progress: {},
    created_at: new Date().toISOString(),
  };

  if (SS.currentUser.id !== 'demo') {
    try {
      const saved = await insertRoadmap(rmRecord);
      if (saved) SS.roadmaps.unshift(saved);
    } catch (_) {
      rmRecord.id = 'rm' + Date.now();
      SS.roadmaps.unshift(rmRecord);
    }
  } else {
    rmRecord.id = 'rm' + Date.now();
    SS.roadmaps.unshift(rmRecord);
  }

  imported.phases.forEach((_, pi) => {
    const key = 'rm-' + pi;
    SS.rmStages[key] = { stages: 4, done: 0 };
  });

  switchTab('roadmap');
  renderRoadmaps();
  toast('Shared roadmap imported! 🗺️✨');
  await awardXP(15, 'Imported shared roadmap');
}
