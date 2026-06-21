// supabase/functions/roadmap-ai/index.ts
// Supabase Edge Function to generate AI Roadmaps & Task Breakdowns securely.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, goal, level, hours, deadline, name, subj, prio } = await req.json()

    // Retrieve API keys from Deno environment
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!geminiKey && !anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'No API key configured. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in your Supabase project settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'roadmap') {
      const prompt = `You are StudySprint AI, an expert educational planner. Build a highly descriptive, comprehensive, and highly specific learning roadmap for:
Goal: "${goal}"
Current student level: "${level}"
Study time committed: ${hours} hours per week
Target deadline: "${deadline}"

CRITICAL INSTRUCTIONS:
1. DESCRIPTIVE AND SPECIFIC CONTENT (FOR BOTH CODING AND NON-CODING GOALS): Do not generalize. Regardless of the subject (whether it's Computer Science, History, Languages, Sciences, Arts, or Business), write highly detailed descriptions for the phase, topics, resources, and projects. Specify exactly what concepts to master, what milestones to reach, and what deliverables to produce.
2. REAL, WORKING RESOURCE LINKS: Every resource MUST have a real, functioning, high-quality URL. Never use fake domains like "example.com" or placeholders.
   - For Coding: Use official documentation (react.dev, docs.python.org), freeCodeCamp, roadmap.sh, etc.
   - For Science/Math: Use Khan Academy (khanacademy.org), MIT OpenCourseWare, specialized platforms, or direct YouTube search links.
   - For History/Arts: Use reputable historical archives, Wikipedia articles (en.wikipedia.org/wiki/...), museum sites, or specific documentary video/search links.
   - For Languages: Use official learning portals (e.g., duolingo.com, bbc.co.uk/languages), reference grammars, or direct YouTube lessons.
   - For general search: You can use exact YouTube search results links (e.g., https://www.youtube.com/results?search_query=learn+french+conjugation).
3. DETAILED PROJECTS / ASSIGNMENTS: Every project/exercise must have a detailed description explaining the exact requirements and what the student needs to complete (e.g., for coding: 'Build a fully responsive e-commerce mockup'; for history: 'Write a 1500-word argumentative essay analyzing the main catalyst events of WW2 with at least 3 historical citations'; for languages: 'Conduct a 5-minute conversation recording discussing your daily routine in French').

Provide your response as a valid JSON array of phases. Do not wrap in markdown code blocks or tags like \`\`\`json. Every phase must follow this structure:
[
  {
    "phase": 1,
    "title": "Phase Title (be specific, e.g. 'Advanced React, Hooks, & State Management' OR 'European Theater & Catalyst Events of WWII')",
    "duration": "Duration (e.g. '3 weeks')",
    "xp": 150,
    "topics": [
      "Extremely specific topic 1 (e.g., 'React hooks lifecycle: useEffect cleanup functions' OR 'The Munich Agreement of 1938 and the policy of appeasement')",
      "Extremely specific topic 2 (e.g., 'Context API store slice configuration' OR 'The invasion of Poland and the formal declarations of war')"
    ],
    "resources": [
      {
        "name": "Exact, real resource name (e.g., 'React.dev Hooks Documentation' OR 'History Channel: Causes of World War II')",
        "url": "https://react.dev/reference/react",
        "type": "docs|free|video|interactive",
        "description": "A highly detailed summary of what this specific resource covers and why it is crucial for this phase (e.g., 'The official React reference detailing built-in hooks' OR 'A comprehensive video overview of the geopolitical tensions leading up to the Blitzkrieg.')",
        "icon": "📖|🎬|💻|🎨"
      }
    ],
    "projects": [
      {
        "name": "Detailed project or assignment name",
        "description": "Highly descriptive explanation of what the student needs to build or complete, detailing the list of required deliverables and criteria.",
        "difficulty": "easy|medium|hard",
        "xp": 80,
        "icon": "🏗️|📝|🏁"
      }
    ]
  }
]
Respond ONLY with this JSON array. No conversational text.`
      const result = await callAI(prompt, geminiKey, anthropicKey)
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } else if (action === 'breakdown') {
      const prompt = `You are StudySprint AI. Break down the following study assignment into exactly 5 concrete, actionable chronological steps:
Task Name: "${name}"
Subject: "${subj}"
Priority: "${prio}"

Provide your response as a valid JSON array of exactly 5 strings. Example format:
["Step 1 text...", "Step 2 text...", "Step 3 text...", "Step 4 text...", "Step 5 text..."]
Respond ONLY with this JSON array. Do not wrap in markdown formatting.`

      const result = await callAI(prompt, geminiKey, anthropicKey)
      return new Response(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Centralized helper to call either Gemini or Anthropic based on keys configured
async function callAI(prompt: string, geminiKey?: string, anthropicKey?: string): Promise<string> {
  if (geminiKey) {
    // Call Google Gemini 1.5 Flash API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API error: ${errText}`)
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('No content returned from Gemini API')
    return content.trim()

  } else if (anthropicKey) {
    // Call Anthropic Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error: ${errText}`)
    }

    const data = await response.json()
    const content = data?.content?.[0]?.text
    if (!content) throw new Error('No content returned from Anthropic API')
    return content.trim()
  }

  throw new Error('No AI provider key is configured.')
}
