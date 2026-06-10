import { refinePrompt } from './promptRefiner.js';

const OPENAI_PRICES_PER_1M_TOKENS = {
  'gpt-5.5': { input: 5, output: 30 },
  'gpt-5.5-pro': { input: 30, output: 180 },
  'gpt-5.4': { input: 2.5, output: 15 },
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  'gpt-5.4-pro': { input: 30, output: 180 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 }
};

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
    'You are Reprompt, a rewrite-only prompt refinement engine.',
    'Your job is to transform SOURCE_TEXT into a polished prompt that the user can send.',
    'Never answer SOURCE_TEXT.',
    'Never behave like an assistant responding to SOURCE_TEXT.',
    'Never add greetings such as "How can I assist you today?"',
    'Preserve the user intent exactly and return only JSON with this shape: {"refinedPrompt":"..."}'
  ].join('\n');
}

function getRewriteTask(prompt) {
  return [
    'Rewrite SOURCE_TEXT as the exact user-authored prompt to send next.',
    'Do not answer SOURCE_TEXT.',
    'Do not introduce yourself.',
    'Do not mention that you are rewriting.',
    '',
    'SOURCE_TEXT:',
    `"""${prompt}"""`
  ].join('\n');
}

export function buildOpenAIChatBody(model, prompt, platformId) {
  return {
    model,
    messages: [
      { role: 'system', content: getPromptInstruction(platformId) },
      { role: 'user', content: getRewriteTask(prompt) }
    ],
    response_format: { type: 'json_object' },
    temperature: 0
  };
}

function maybeParseJsonText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractRemoteText(payload) {
  const messageContent = payload?.choices?.[0]?.message?.content;
  const parsedMessage = maybeParseJsonText(messageContent);
  const parsedText = maybeParseJsonText(payload?.text);

  return (
    payload?.refinedPrompt ??
    payload?.refined ??
    payload?.output_text ??
    parsedMessage?.refinedPrompt ??
    parsedMessage?.refined ??
    parsedText?.refinedPrompt ??
    parsedText?.refined ??
    payload?.text ??
    messageContent ??
    payload?.choices?.[0]?.text ??
    ''
  ).trim();
}

function normalizeUsage(payload) {
  const usage = payload?.usage;
  if (!usage || typeof usage !== 'object') {
    return undefined;
  }

  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? usage.inputTokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? usage.outputTokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? inputTokens + outputTokens);

  if (!inputTokens && !outputTokens && !totalTokens) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens
  };
}

function normalizeModel(model) {
  return String(model ?? '').trim().toLowerCase();
}

function looksLikeAssistantAnswer(original, refined) {
  const source = original.trim().toLowerCase();
  const result = refined.trim().toLowerCase();

  if (!result) {
    return true;
  }

  if (/how can i (assist|help)|how may i (assist|help)|what can i help you with/.test(result)) {
    return true;
  }

  if (/\bas an ai\b|\bi can help\b|\bi'd be happy to\b/.test(result)) {
    return true;
  }

  return /^(hi|hello|hey)[!. ]*$/.test(source) && /\bassist\b|\bhelp\b|\btoday\b/.test(result);
}

export function calculateCostUsd(model, usage) {
  if (!usage) {
    return undefined;
  }

  const prices = OPENAI_PRICES_PER_1M_TOKENS[normalizeModel(model)];
  if (!prices) {
    return undefined;
  }

  return ((usage.inputTokens * prices.input) + (usage.outputTokens * prices.output)) / 1_000_000;
}

export function getConnectionStatus(settings) {
  if (!hasEndpoint(settings)) {
    return { tone: 'local', label: 'Local refinement', connected: false };
  }

  if (!settings.api.apiKey) {
    return { tone: 'warning', label: 'Endpoint configured, API key missing', connected: false };
  }

  return { tone: 'ok', label: 'API configured', connected: true };
}

async function tryRemoteRefine(settings, prompt, platformId) {
  const endpoint = getEndpoint(settings);
  if (!endpoint) {
    return null;
  }

  const model = getModel(settings);
  const headers = { 'Content-Type': 'application/json' };
  if (settings.api.apiKey) {
    headers.Authorization = `Bearer ${settings.api.apiKey}`;
  }

  const body = isOpenAIChatCompletionsEndpoint(endpoint)
    ? buildOpenAIChatBody(model, prompt, platformId)
    : {
        prompt,
        platformId,
        mode: 'ielts-band-9',
        model
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const message = details
      ? `Refinement API returned ${response.status}: ${details}`
      : `Refinement API returned ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  const refined = extractRemoteText(payload);
  if (!refined) {
    return null;
  }

  if (looksLikeAssistantAnswer(prompt, refined)) {
    throw new Error('Remote refinement answered the prompt instead of rewriting it.');
  }

  const resultModel = payload?.model ?? model;
  const usage = normalizeUsage(payload);
  const costUsd = calculateCostUsd(resultModel, usage);

  return {
    refined,
    source: 'remote',
    model: resultModel,
    usage,
    costUsd
  };
}

export async function refinePromptForPlatform(settings, prompt, platformId) {
  const localRefined = refinePrompt(prompt, platformId);

  try {
    const remote = await tryRemoteRefine(settings, prompt, platformId);
    if (remote) {
      return remote;
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
