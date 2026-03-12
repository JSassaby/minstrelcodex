import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SYSTEM_PROMPT = `You are an experienced book editor — not a grammar checker. You give writers the kind of focused, honest feedback a professional human editor would give in a manuscript review. You do not rewrite their work. Instead, when you make an observation, you show a brief example of how one specific sentence or phrase could be handled differently — not as a replacement, but as a demonstration of the principle. You speak directly but kindly. You never pad feedback to fill a structure.`;

function buildUserPrompt(body: RequestBody): string {
  const ctx = body.context ?? {};
  const contextLines: string[] = [];
  if (ctx.genre) contextLines.push(`Genre: ${ctx.genre}`);
  if (ctx.audience) contextLines.push(`Target audience: ${ctx.audience}`);
  if (ctx.premise) contextLines.push(`Premise: ${ctx.premise}`);
  if (ctx.povCharacter) contextLines.push(`POV character: ${ctx.povCharacter}`);
  if (ctx.scenePurpose) contextLines.push(`Scene purpose: ${ctx.scenePurpose}`);
  if (ctx.emotionalGoal) contextLines.push(`Emotional goal: ${ctx.emotionalGoal}`);
  if (ctx.specificConcerns) contextLines.push(`Specific concerns: ${ctx.specificConcerns}`);
  const contextBlock = contextLines.length > 0 ? contextLines.join('\n') + '\n\n' : '';
  const text = body.text.slice(0, 8000);

  if (body.scope === 'selection') {
    return `${contextBlock}Review this short passage and return a JSON object with exactly these keys:
{
  "observations": [
    { "point": "string", "example": "string" }
  ],
  "topSuggestions": ["string"]
}
Rules:
- observations: exactly 2 items. Each must include a specific point about the writing AND a brief inline example showing one sentence or phrase from the text written differently. Format the example like: "e.g. instead of 'original phrase', try 'alternative' — brief reason why."
- topSuggestions: exactly 2 actionable items.
- Use the context above to calibrate your feedback — a thriller and a literary novel need different observations on the same passage.
- Return only valid JSON, no markdown fences, no preamble.

Writing to review:
${text}`;
  }

  if (body.scope === 'scene') {
    return `${contextBlock}Review this scene and return a JSON object with exactly these keys:
{
  "strengths": ["string"],
  "observations": [
    { "dimension": "string", "point": "string", "example": "string" }
  ],
  "topSuggestions": ["string"]
}
Rules:
- strengths: 1–2 specific items (not generic praise).
- observations: 3–4 items. Each has a dimension label (e.g. "Pacing", "Dialogue", "Clarity", "Character voice", "Tension"), a specific point, and an inline example — format like: "e.g. instead of 'original phrase', try 'alternative' — brief reason why."
- topSuggestions: exactly 3 items ordered by impact.
- Use the context above to calibrate your feedback — genre, audience, and the scene's purpose should shape what you focus on.
- Return only valid JSON, no markdown fences, no preamble.

Writing to review:
${text}`;
  }

  // document scope
  return `${contextBlock}Review this document and return a JSON object with exactly these keys:
{
  "strengths": ["string"],
  "clarity": { "observation": "string", "example": "string", "suggestions": ["string"] },
  "pacing": { "observation": "string", "example": "string", "suggestions": ["string"] },
  "dialogue": { "observation": "string", "example": "string", "suggestions": ["string"] } or null,
  "character": { "observation": "string", "example": "string", "suggestions": ["string"] },
  "emotionalImpact": { "observation": "string", "example": "string", "suggestions": ["string"] },
  "narrativePurpose": { "observation": "string", "example": "string", "suggestions": ["string"] },
  "topSuggestions": ["string"]
}
Rules:
- strengths: 2–3 specific items.
- Each dimension: 1 observation, 1 inline example (format: "e.g. instead of 'original', try 'alternative' — brief reason why"), 1–2 suggestions.
- Set dialogue to null only if there is no dialogue in the text.
- topSuggestions: 3 items ordered by impact.
- Use the context above to calibrate your feedback — genre, audience, and premise should shape what matters for this specific work.
- Return only valid JSON, no markdown fences, no preamble.

Writing to review:
${text}`;
}

interface RequestBody {
  provider: 'claude' | 'openai' | 'gemini' | 'mistral' | 'ollama';
  model: string;
  apiKey?: string;
  ollamaBaseUrl?: string;
  text: string;
  context?: {
    genre?: string;
    audience?: string;
    premise?: string;
    scenePurpose?: string;
    povCharacter?: string;
    emotionalGoal?: string;
    specificConcerns?: string;
  };
  scope: 'selection' | 'scene' | 'document';
}

async function callClaude(body: RequestBody): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': body.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAI(body: RequestBody): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${body.apiKey ?? ''}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(body: RequestBody): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent?key=${body.apiKey ?? ''}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + buildUserPrompt(body) }],
        },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callMistral(body: RequestBody): Promise<string> {
  const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${body.apiKey ?? ''}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Mistral API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callOllama(body: RequestBody): Promise<string> {
  const base = (body.ollamaBaseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
  const resp = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(body) },
      ],
      stream: false,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Ollama API error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.message?.content ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let raw = '';
  try {
    switch (body.provider) {
      case 'claude':   raw = await callClaude(body); break;
      case 'openai':   raw = await callOpenAI(body); break;
      case 'gemini':   raw = await callGemini(body); break;
      case 'mistral':  raw = await callMistral(body); break;
      case 'ollama':   raw = await callOllama(body); break;
      default:
        return new Response(JSON.stringify({ error: `Unknown provider: ${body.provider}` }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Strip markdown fences if model wrapped the response
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse editorial response', raw: cleaned.slice(0, 500) }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
