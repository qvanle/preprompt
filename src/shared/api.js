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

const COMPACT_PROMPT_INSTRUCTION = [
  'Rewrite the source as the exact prompt the user should send next.',
  'Preserve the user intent, position, key arguments, and required constraints.',
  'Improve clarity, specificity, structure, tone, grammar, and vocabulary.',
  'For IELTS/academic writing requests, aim for Band 9 quality: fully developed ideas, formal academic tone, natural cohesion, precise vocabulary, varied sentence structure, and near-perfect grammar.',
  'Do not answer the source, add new arguments, introduce yourself, mention rewriting, or include commentary.',
  'Return JSON only: {"refinedPrompt":"..."}'
].join(' ');

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
  return `
# IELTS Band 9 Rewriting Instructions

## Objective

Rewrite the provided text to achieve a writing quality equivalent to IELTS Band 9 while preserving the original meaning, position, and key arguments.

The rewritten version must demonstrate:

* Fully developed ideas
* Sophisticated and precise vocabulary
* Natural academic style
* Excellent coherence and cohesion
* Wide grammatical range
* Near-perfect grammatical accuracy
* Logical progression of ideas
* Appropriate formality

Do not introduce new arguments that substantially alter the author's original position.

---

## Core IELTS Band 9 Requirements

### 1. Task Response

Ensure that:

* Every main idea is clearly explained.
* Claims are supported with reasoning.
* Conclusions logically follow from preceding arguments.
* The writer's position is explicit and consistent throughout.
* No important ideas are left underdeveloped.

When encountering short or simplistic statements:

Instead of:

"Smartphones are bad for children."

Expand to:

"Excessive smartphone use can have detrimental effects on children's academic performance, social development, and overall well-being."

---

### 2. Coherence and Cohesion

Create a logical flow between ideas.

Use transitions naturally:

* Furthermore
* Moreover
* In addition
* Consequently
* As a result
* Therefore
* Nevertheless
* While
* Although
* On the one hand
* On the other hand
* In contrast

Avoid excessive repetition of the same connector.

Paragraphs should follow:

1. Topic sentence
2. Explanation
3. Supporting detail
4. Consequence or implication
5. Link to next idea

---

### 3. Lexical Resource

Replace simple vocabulary with more precise and sophisticated alternatives when appropriate.

Examples:

| Basic | Band 9 Alternative |
| --- | --- |
| bad | detrimental |
| good | beneficial |
| big | significant |
| many | numerous |
| help | facilitate |
| cause | contribute to |
| problem | issue/challenge |
| important | essential/crucial |
| use | utilise/employ |
| get worse | deteriorate |

Requirements:

* Use topic-specific vocabulary.
* Use collocations naturally.
* Avoid unnecessary jargon.
* Avoid obscure vocabulary that sounds unnatural.
* Vary word choice to prevent repetition.

---

### 4. Grammatical Range

Use a mixture of:

#### Complex Sentences

Example:

"Although smartphones offer educational benefits, excessive use may negatively affect children's development."

#### Relative Clauses

Example:

"Children who spend prolonged periods on smartphones may experience reduced social interaction."

#### Conditional Structures

Example:

"If parents establish clear boundaries, children are more likely to develop healthier habits."

#### Passive Structures (where appropriate)

Example:

"Reasonable limits should be imposed on daily screen time."

#### Nominalisation

Instead of:

"Children interact less."

Use:

"A reduction in social interaction is frequently observed among children who spend excessive time on digital devices."

---

### 5. Grammatical Accuracy

Eliminate:

* Subject-verb agreement errors
* Incorrect tense usage
* Article mistakes
* Preposition errors
* Run-on sentences
* Sentence fragments
* Informal grammar

The final text should read naturally and fluently.

---

## Development Rules

Whenever an idea is stated, ask:

1. Why?
2. How?
3. What consequence does this have?

Example:

Original:

"Children use smartphones too much."

Band 9 Development:

"Many children spend a considerable amount of time using smartphones for entertainment purposes, which often reduces the time available for academic study, physical activity, and face-to-face social interaction."

---

## Style Requirements

Maintain:

* Formal academic tone
* Objective language
* Clear reasoning
* Concise expression

Avoid:

* Slang
* Colloquialisms
* Contractions (don't, can't, won't)
* Emotional exaggeration
* Overly dramatic language

---

## Repetition Control

If a key noun appears repeatedly:

Example:

children -> young people, youngsters, minors, adolescents

smartphones -> mobile devices, digital devices, handheld technology

However:

Do not replace important keywords so often that clarity suffers.

---

## Conclusion Requirements

The conclusion must:

* Restate the main position.
* Summarise the strongest arguments.
* Avoid introducing new ideas.
* End with a clear and confident statement.

Example:

"In conclusion, although smartphones offer certain advantages, children should use them in moderation because excessive screen time can adversely affect their education, health, and social development."

---

## Final Quality Checklist

Before producing the final version, verify:

Meaning preserved
Position unchanged
Ideas fully developed
Logical paragraph structure
Sophisticated vocabulary
Varied sentence structures
Accurate grammar
Formal academic tone
Natural cohesion
IELTS Band 9 quality throughout

If any criterion is not satisfied, revise again before returning the final text.
`.trim();
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
      { role: 'system', content: COMPACT_PROMPT_INSTRUCTION },
      { role: 'user', content: getRewriteTask(prompt) }
    ],
    response_format: { type: 'json_object' },
    stream: true,
    stream_options: { include_usage: true }
  };
}

async function readOpenAIChatStream(response, onDelta) {
  const reader = response.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let buffer = '';
  let refined = '';
  let usage = null;

  const emit = () => {
    if (onDelta) onDelta(extractStreamPreview(refined));
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of event.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        const payload = JSON.parse(data);
        usage = payload.usage ?? usage;

        const delta = payload?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          refined += delta;
          emit();
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  return { refined: extractStreamPreview(refined), usage };
}

function extractStreamPreview(value) {
  const parsed = maybeParseJsonText(value);
  if (typeof parsed === 'string') return parsed.trim();
  if (parsed && typeof parsed === 'object') {
    const candidate = parsed.refinedPrompt ?? parsed.refined ?? parsed.output_text;
    if (typeof candidate === 'string') return candidate.trim();
  }

  const match = String(value).match(/"refinedPrompt"\s*:\s*"([\s\S]*)$/);
  if (match) {
    return match[1]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .trim();
  }

  return String(value).trim();
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

async function tryRemoteRefineStream(settings, prompt, platformId, onProgress) {
  const endpoint = getEndpoint(settings);
  if (!endpoint) return null;

  const model = getModel(settings);
  const headers = {
    'Content-Type': 'application/json'
  };

  if (settings.api.apiKey) {
    headers.Authorization = `Bearer ${settings.api.apiKey}`;
  }

  if (!isOpenAIChatCompletionsEndpoint(endpoint)) {
    return tryRemoteRefine(settings, prompt, platformId);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildOpenAIChatBody(model, prompt, platformId))
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const message = details
      ? `Refinement API returned ${response.status}: ${details}`
      : `Refinement API returned ${response.status}`;
    throw new Error(message);
  }

  const streamed = await readOpenAIChatStream(response, onProgress);
  if (!streamed) return null;

  const refined = streamed.refined;
  if (!refined) return null;

  if (looksLikeAssistantAnswer(prompt, refined)) {
    throw new Error('Remote refinement answered the prompt instead of rewriting it.');
  }

  const usage = normalizeUsage({ usage: streamed.usage });
  const costUsd = calculateCostUsd(model, usage);
  return {
    refined,
    source: 'remote',
    model,
    usage,
    costUsd
  };
}

export async function refinePromptForPlatformStream(settings, prompt, platformId, onProgress) {
  const localRefined = refinePrompt(prompt, platformId);

  // Provide an immediate local refinement preview while remote streaming runs.
  try {
    if (typeof onProgress === 'function') {
      try {
        onProgress(localRefined);
      } catch (err) {
        // Swallow callback errors but surface a debug message for diagnostics.
        console.debug('refinePromptForPlatformStream: onProgress(local) callback error', err);
      }
    }

    const remote = await tryRemoteRefineStream(settings, prompt, platformId, (refined) => {
      if (typeof onProgress === 'function') {
        try {
          onProgress(refined);
        } catch (err) {
          console.debug('refinePromptForPlatformStream: onProgress(remote) callback error', err);
        }
      }
    });

    if (remote) return remote;
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
    warning: hasEndpoint(settings)
      ? 'Remote refinement unavailable, using local fallback.'
      : undefined
  };
}
