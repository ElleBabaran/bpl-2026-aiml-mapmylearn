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
1. DESCRIPTIVE AND SPECIFIC CONTENT: Do not generalize. Write highly detailed descriptions for the phase, topics, resources, and projects. Specify exactly what concepts to learn, what tasks to perform, and what deliverables to produce.
2. REAL, WORKING RESOURCE LINKS: Every resource MUST have a real, functioning, high-quality URL. Never use fake domains like "example.com" or placeholders. Use real URLs of official documentation (e.g., react.dev, developer.mozilla.org, python.org, docs.python.org, docs.oracle.com), reputable tutorials (e.g., javascript.info, w3schools.com, geeksforgeeks.org), freeCodeCamp courses/videos (e.g., freecodecamp.org), Harvard CS50/MIT OpenCourseWare materials, or exact YouTube video/playlist search links (e.g., https://www.youtube.com/results?search_query=learn+react+for+beginners).
3. DETAILED PROJECTS: Every project must have a detailed description explaining the exact deliverables, requirements, or features the student needs to build (e.g., "Build a multi-page e-commerce mockup using HTML, CSS grid/flexbox, with working local storage cart functionality, and responsive styles for mobile, tablet, and desktop").

Provide your response as a valid JSON array of phases. Do not wrap in markdown code blocks or tags like \`\`\`json. Every phase must follow this structure:
[
  {
    "phase": 1,
    "title": "Phase Title (be specific, e.g. 'Advanced React, Hooks, & State Management')",
    "duration": "Duration (e.g. '3 weeks')",
    "xp": 150,
    "topics": [
      "Extremely specific topic 1 (e.g., 'React hooks lifecycle: useEffect dependency arrays, cleaning up event listeners, and custom hooks')",
      "Extremely specific topic 2 (e.g., 'Context API vs Redux Toolkit: slice creation, reducers, and store configuration')"
    ],
    "resources": [
      {
        "name": "Exact, real resource name (e.g., 'React.dev Hooks Documentation')",
        "url": "https://react.dev/reference/react",
        "type": "docs",
        "description": "A highly detailed summary of what this specific resource covers and why it is crucial for this phase (e.g., 'The official React reference detailing built-in hooks, state management APIs, and lifecycle methods with interactive code sandboxes.')",
        "icon": "📖"
      }
    ],
    "projects": [
      {
        "name": "Detailed project name",
        "description": "Highly descriptive explanation of what the student needs to build, including the list of required features and technologies to apply.",
        "difficulty": "easy|medium|hard",
        "xp": 80,
        "icon": "🏗️"
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
