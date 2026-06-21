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
      const prompt = `You are StudySprint AI. Build a highly specific learning roadmap for:
Goal: "${goal}"
Current student level: "${level}"
Study time committed: ${hours} hours per week
Target deadline: "${deadline}"

Provide your response as a valid JSON array of phases. Do not wrap in markdown tags like \`\`\`json. Every phase must follow this structure:
[
  {
    "phase": 1,
    "title": "Phase Title (e.g. JavaScript Foundations)",
    "duration": "Duration (e.g. 2 weeks)",
    "xp": 150,
    "topics": ["Specific topic 1 to learn", "Specific topic 2 to learn"],
    "resources": [
      {
        "name": "Resource Name (e.g. MDN JS Guide)",
        "url": "https://example.com/real-resource-link",
        "type": "free|video|interactive|docs",
        "description": "Short summary of what this resource covers",
        "icon": "📖|🎬|💻|🎨"
      }
    ],
    "projects": [
      {
        "name": "Suggested Project (e.g. Build a Calculator)",
        "description": "Short description of what the student needs to build",
        "difficulty": "easy|medium|hard",
        "xp": 80,
        "icon": "🏗️|🎮|📱"
      }
    ]
  }
]
Respond ONLY with this JSON array.`

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
