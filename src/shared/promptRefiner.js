const PHRASE_REPLACEMENTS = [
  [/\bcan you\b/gi, 'could you please'],
  [/\bcould you\b/gi, 'would you kindly'],
  [/\bhelp me\b/gi, 'assist me in'],
  [/\bshow me\b/gi, 'demonstrate'],
  [/\btell me\b/gi, 'explain'],
  [/\bmake\b/gi, 'compose'],
  [/\bfix\b/gi, 'resolve'],
  [/\buse\b/gi, 'utilize'],
  [/\bbig\b/gi, 'substantial'],
  [/\bgood\b/gi, 'effective'],
  [/\bbad\b/gi, 'unfavorable'],
  [/\bstuff\b/gi, 'material'],
  [/\bget\b/gi, 'obtain']
];

const QUESTION_STARTERS = /^(what|how|why|when|where|who|which|can|could|should|would|is|are|do|does|did)\b/i;
const COMMAND_STARTERS = /^(explain|summarize|analyze|compare|design|draft|write|review|improve|translate|outline|create|build|plan|convert)\b/i;
const VIETNAMESE_SAAS_BACKEND_PATTERN = /t[oô]i\s+mu[oố]n\s+x[aâ]y\s+d[uự]ng\s+m[oộ]t\s+ph[aầ]n\s+m[eề]m\s+saas\s+v[oớ]i\s+backend\s+l[aà]\s+(.+)/i;

function cleanWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function sentenceCase(text) {
  return text
    .split(/([.!?]\s+)/)
    .map((chunk) => (/[.!?]\s+/.test(chunk) ? chunk : capitalize(chunk.trim())))
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
    .replace(/^(please\s+)?(can you|could you|would you|please)\s+/i, '')
    .replace(/^(help me to|help me|tell me how to|show me how to)\s+/i, '')
    .trim();
}

function formalizeCommand(text) {
  const stripped = stripPromptLead(text);
  const [verb, ...rest] = stripped.split(' ');
  const remainder = rest.join(' ');
  const elevatedVerb = {
    explain: 'Provide a thorough explanation of',
    summarize: 'Deliver a concise yet comprehensive summary of',
    analyze: 'Offer a detailed analysis of',
    compare: 'Compare and contrast',
    design: 'Design',
    draft: 'Draft',
    write: 'Compose',
    review: 'Review',
    improve: 'Improve',
    translate: 'Translate',
    outline: 'Outline',
    create: 'Create',
    build: 'Build',
    plan: 'Plan',
    convert: 'Convert'
  }[verb.toLowerCase()];

  if (elevatedVerb) {
    return remainder ? `${elevatedVerb} ${remainder}` : `${elevatedVerb} this request`;
  }

  return stripped;
}

export function refinePrompt(input) {
  const source = cleanWhitespace(String(input ?? ''));
  if (!source) {
    return '';
  }

  const vietnameseSaasMatch = source.match(VIETNAMESE_SAAS_BACKEND_PATTERN);
  if (vietnameseSaasMatch) {
    return ensurePeriod(
      `I would like to develop a SaaS application with a backend built using ${vietnameseSaasMatch[1].trim()}`
    );
  }

  const normalized = replacePhrases(source.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));

  if (QUESTION_STARTERS.test(normalized)) {
    const body = stripPromptLead(normalized).replace(/\?$/, '');
    return ensurePeriod(
      sentenceCase(`Could you please provide a clear, comprehensive explanation of ${body}`)
    );
  }

  if (COMMAND_STARTERS.test(normalized)) {
    return ensurePeriod(sentenceCase(formalizeCommand(normalized)));
  }

  return ensurePeriod(
    sentenceCase(`Please provide a nuanced, well-structured response regarding ${normalized}`)
  );
}
