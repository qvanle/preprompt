const PHRASE_REPLACEMENTS = [
  [/\bcan you\b/gi, 'could you please'],
  [/\bcould you\b/gi, 'would you kindly'],
  [/\bhelp me\b/gi, 'help me'],
  [/\bshow me\b/gi, 'demonstrate'],
  [/\btell me\b/gi, 'explain'],
  [/\bmake\b/gi, 'create'],
  [/\bfix\b/gi, 'resolve'],
  [/\buse\b/gi, 'utilize'],
  [/\bbig\b/gi, 'substantial'],
  [/\bgood\b/gi, 'effective'],
  [/\bbad\b/gi, 'unfavorable'],
  [/\bstuff\b/gi, 'material'],
  [/\bget\b/gi, 'obtain']
];

const QUESTION_STARTERS = /^(what|how|why|when|where|who|which|can|could|should|would|is|are|do|does|did)\b/i;
const COMMAND_STARTERS =
  /^(explain|summarize|analyze|compare|design|draft|write|review|improve|translate|outline|create|build|plan|convert)\b/i;
const GREETING_ONLY = /^(hi|hello|hey|greetings)\b[!.?\s]*$/i;
const VIETNAMESE_SAAS_BACKEND_PATTERN =
  /t[oô]i\s+mu[oố]n\s+x[aâ]y\s+d[uự]ng\s+m[oộ]t\s+ph[aầ]n\s+m[eề]m\s+saas\s+v[oớ]i\s+backend\s+l[aà]\s+(.+)/i;
const SAAS_IDEA_PATTERN = /^(?:i\s+want\s+to|i'?d\s+like\s+to|i\s+would\s+like\s+to|i\s+need\s+to)\s+build\s+a\s+saas\b/i;
const HELP_BUILD_SAAS_PATTERN = /^(?:can|could)\s+you\s+help\s+me\s+build\s+a\s+saas\b/i;
const SHORT_PROMPT_MAX_WORDS = 6;

function cleanWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeQuotes(text) {
  return text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function sentenceCase(text) {
  return text
    .split(/([.!?]\s+)/)
    .map((chunk) => (chunk.match(/[.!?]\s+/) ? chunk : capitalize(chunk.trim())))
    .join('')
    .trim();
}

function ensurePeriod(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function replacePhrases(text) {
  return PHRASE_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function stripPromptLead(text) {
  return text
    .replace(/^(help|assist)\s+me\s+(to\s+)?/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^(can|could)\s+you\s+(please\s+)?/i, '')
    .replace(/^would you kindly\s+/i, '')
    .replace(/^kindly\s+/i, '');
}

function formalizeCommand(text) {
  const stripped = stripPromptLead(text);
  const [verb, ...rest] = stripped.split(' ');
  const remainder = rest.join(' ').trim();

  const elevatedVerb =
    {
      build: 'outline how to build',
      create: 'create',
      design: 'design',
      draft: 'draft',
      explain: 'explain',
      improve: 'improve',
      summarize: 'summarize',
      analyze: 'analyze',
      compare: 'compare',
      review: 'review',
      plan: 'plan'
    }[verb?.toLowerCase()] ?? verb;

  if (!remainder) {
    return `Please ${elevatedVerb}`;
  }

  return `Please ${elevatedVerb} ${remainder}`;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function expandGreeting() {
  return 'Please respond with a warm, friendly greeting and offer assistance.';
}

function expandSaasIdea(text) {
  const match = text.match(SAAS_IDEA_PATTERN);
  const topic = match ? text.replace(match[0], '').trim() : text;
  const suffix = topic ? ` around ${topic}` : '';

  return ensurePeriod(
    sentenceCase(
      `I want to build a SaaS application${suffix}. Please help me define the product scope, core features, backend architecture, and launch plan`
    )
  );
}

function expandHelpBuildSaas(text) {
  const topic = text.replace(HELP_BUILD_SAAS_PATTERN, '').trim();
  const suffix = topic ? ` for ${topic}` : '';

  return ensurePeriod(
    sentenceCase(
      `Please help me plan and build a SaaS application${suffix}, including the product scope, core features, backend architecture, and first implementation steps`
    )
  );
}

function expandShortPrompt(text) {
  if (wordCount(text) <= SHORT_PROMPT_MAX_WORDS) {
    return ensurePeriod(
      sentenceCase(
        `Please rewrite this into a clearer, more specific prompt that preserves the original intent: ${text}`
      )
    );
  }

  return null;
}

function rewritePrompt(text) {
  const normalized = cleanWhitespace(normalizeQuotes(text));
  if (!normalized) {
    return '';
  }

  if (GREETING_ONLY.test(normalized)) {
    return expandGreeting();
  }

  const vietnameseSaasMatch = normalized.match(VIETNAMESE_SAAS_BACKEND_PATTERN);
  if (vietnameseSaasMatch) {
    return ensurePeriod(
      sentenceCase(
        `I want to build a SaaS application with a backend built using ${vietnameseSaasMatch[1].trim()}. Please help me define the product scope, core features, backend architecture, and launch plan`
      )
    );
  }

  if (SAAS_IDEA_PATTERN.test(normalized)) {
    return expandSaasIdea(normalized);
  }

  if (HELP_BUILD_SAAS_PATTERN.test(normalized)) {
    return expandHelpBuildSaas(normalized);
  }

  if (QUESTION_STARTERS.test(normalized)) {
    const body = stripPromptLead(normalized).replace(/\?$/, '');
    return ensurePeriod(
      sentenceCase(`Could you please provide a clear, comprehensive answer about ${body}`)
    );
  }

  if (COMMAND_STARTERS.test(normalized)) {
    return ensurePeriod(sentenceCase(formalizeCommand(normalized)));
  }

  const shortRewrite = expandShortPrompt(normalized);
  if (shortRewrite) {
    return shortRewrite;
  }

  const generic = replacePhrases(normalized);
  return ensurePeriod(
    sentenceCase(`Please provide a nuanced, well-structured response regarding ${generic}`)
  );
}

export function refinePrompt(input) {
  return rewritePrompt(String(input ?? ''));
}

export default refinePrompt;
