import { refinePrompt } from './promptRefiner.js';

function hasEndpoint(settings) {
  return Boolean(settings?.api?.endpoint?.trim());
}

function getEndpoint(settings) {
  return settings?.api?.endpoint?.trim() ?? '';
}

function getModel(settings) {
  return settings?.api?.model?.trim() || 'gpt-4o-mini';
}

function isOpenAIChatCompletionsEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.hostname === 'api.openai.com' && url.pathname === '/v1/chat/completions';
  } catch {
    return false;
  }
}

function getPromptInstruction() {
  return [
    'You are Reprompt, an expert prompt editor for AI chat platforms.',
    '',
    'Your task is to rewrite the user prompt into clearer, more formal, academically polished English suitable for an IELTS Band 9 communication style.',
    '',
    'Rules:',
    "- Preserve the user's original intent, task, topic, constraints, facts, names, and requested output.",
    '- Always output in English, even when the original prompt is written in another language.',
    '- Translate non-English input into natural English before polishing it.',
    '- Improve clarity, specificity, grammar, vocabulary, structure, and tone.',
    '- Use formal, natural, high-level English without sounding inflated or verbose.',
    "- Always write from the user's perspective, as text the user can send to the AI chat application.",
    "- Never write from the assistant's perspective.",
    '- Never offer help, ask how you may assist, or produce an answer to the prompt.',
    '- For short greetings such as "hello", "hi", or "good morning", rewrite them as natural user greetings, such as "Hello, how are you today?", "Good morning.", or "Good evening."',
    '- Do not transform greetings into service-style assistant replies.',
    '- If the original prompt is very short, make it more complete but do not invent unnecessary context.',
    '- If the prompt asks for code, technical help, translation, summarization, or a practical task, preserve that task exactly while improving the wording.',
    '- Do not answer the prompt.',
    '- Do not explain your changes.',
    '- Do not include labels, markdown, quotes, alternatives, or commentary.',
    '- Return only the refined prompt text.'
  ].join('\n');
}

function extractRemoteText(payload) {
  return (
    payload.refinedPrompt ??
    payload.refined ??
    payload.output ??
    payload.text ??
    payload.choices?.[0]?.message?.content ??
    payload.choices?.[0]?.text ??
    payload.output_text ??
    null
  );
}

export function getConnectionStatus(settings) {
  if (!hasEndpoint(settings)) {
    return { tone: 'local', label: 'Local refinement', connected: false };
  }

  if (!settings.api.apiKey) {
    return {
      tone: 'warning',
      label: 'Endpoint configured, API key missing',
      connected: false
    };
  }

  return { tone: 'ok', label: 'API configured', connected: true };
}

async function tryRemoteRefine(settings, prompt, platformId) {
  const endpoint = getEndpoint(settings);
  if (!endpoint) {
    return null;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (settings.api.apiKey) {
    headers.Authorization = `Bearer ${settings.api.apiKey}`;
  }

  const body = isOpenAIChatCompletionsEndpoint(endpoint)
    ? {
        model: getModel(settings),
        messages: [
          { role: 'system', content: getPromptInstruction(platformId) },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      }
    : {
        prompt,
        platformId,
        mode: 'ielts-band-9',
        model: getModel(settings)
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const message = details ? `Refinement API returned ${response.status}: ${details}` : `Refinement API returned ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  return extractRemoteText(payload);
}

export async function refinePromptForPlatform(settings, prompt, platformId) {
  const localRefined = refinePrompt(prompt, platformId);

  try {
    const remote = await tryRemoteRefine(settings, prompt, platformId);
    if (remote) {
      return { refined: remote, source: 'remote' };
    }
  } catch (error) {
    return {
      refined: localRefined,
      source: 'local-fallback',
      warning: error instanceof Error ? error.message : String(error)
    };
  }

  return {
    refined: localRefined,
    source: hasEndpoint(settings) ? 'local-fallback' : 'local',
    warning: hasEndpoint(settings) ? 'Remote refinement unavailable, using local fallback.' : undefined
  };
}
