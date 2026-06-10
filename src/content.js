import { detectPlatform } from './shared/platforms.js';
import { getSettings } from './shared/storage.js';

const COMPOSER_SELECTOR = [
  '#prompt-textarea',
  '[data-testid="composer-text-input"]',
  '[contenteditable="true"][data-virtualkeyboard]',
  'textarea',
  'input[type="text"]',
  '[contenteditable="true"]',
  '[role="textbox"]'
].join(',');

const SEND_BUTTON_SELECTOR = [
  '[data-testid="send-button"]',
  '[data-testid="composer-submit-button"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Submit" i]',
  'button[type="submit"]'
].join(',');

let settings = null;
let platform = detectPlatform(window.location.hostname);

const composeBindings = new WeakSet();
const boundForms = new WeakSet();
const pendingByForm = new WeakSet();
const pendingByCompose = new WeakSet();
const bypassButtons = new WeakSet();

function markLoaded() {
  if (!platform) {
    return;
  }

  document.documentElement.dataset.repromptLoaded = 'true';
  document.documentElement.dataset.repromptPlatform = platform.id;
}

function shouldRun() {
  return Boolean(
    platform &&
      settings?.enabled &&
      settings?.autoRefine &&
      settings.activePlatformIds.includes(platform.id)
  );
}

function findComposeElement(root = document) {
  if (!root) {
    return null;
  }

  if (root.matches?.(COMPOSER_SELECTOR)) {
    return root;
  }

  return root.querySelector?.(COMPOSER_SELECTOR) ?? null;
}

function readPromptValue(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }

  return el?.textContent ?? '';
}

function findActiveComposeElement(trigger) {
  const form = trigger?.closest?.('form');
  const scoped = findComposeElement(form ?? trigger);
  if (scoped && readPromptValue(scoped).trim()) {
    return scoped;
  }

  const active = findComposeElement(document.activeElement);
  if (active && readPromptValue(active).trim()) {
    return active;
  }

  return Array.from(document.querySelectorAll(COMPOSER_SELECTOR)).find((candidate) =>
    readPromptValue(candidate).trim()
  );
}

function isLikelySendButton(button) {
  const label = [
    button.getAttribute('aria-label'),
    button.getAttribute('data-testid'),
    button.getAttribute('title'),
    button.textContent
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /\b(send|submit|arrow-up|composer-submit-button|send-button)\b/.test(label);
}

function writePromptValue(el, value) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
    return;
  }

  el.focus();
  el.textContent = value;
  el.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: value,
      inputType: 'insertText'
    })
  );
  el.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: value,
      inputType: 'insertText'
    })
  );
}

function submitForm(form) {
  if (form.requestSubmit) {
    form.dataset.repromptBypass = '1';
    form.requestSubmit();
    return;
  }

  form.submit();
}

function submitButton(button) {
  bypassButtons.add(button);
  button.click();
}

function createDialogText(label, value) {
  const section = document.createElement('section');
  section.className = 'reprompt-review__prompt';

  const heading = document.createElement('span');
  heading.className = 'section-label';
  heading.textContent = label;

  const body = document.createElement('p');
  body.textContent = value;

  section.append(heading, body);
  return section;
}

function createReviewDialog(original) {
  let closed = false;
  let refined = '';
  let resolveChoice;
  const choice = new Promise((resolve) => {
    resolveChoice = resolve;
  });

  const host = document.createElement('div');
  host.id = 'reprompt-review-host';

  const style = document.createElement('style');
  style.textContent = `
    .reprompt-review {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(12, 18, 24, 0.38);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .reprompt-review__panel {
      width: min(640px, 100%);
      max-height: min(760px, calc(100vh - 40px));
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid #d8e2df;
      border-radius: 12px;
      background: #f8faf9;
      color: #17212b;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
    }
    .reprompt-review__header,
    .reprompt-review__footer {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #e4ebe9;
    }
    .reprompt-review__footer {
      border-top: 1px solid #e4ebe9;
      border-bottom: 0;
    }
    .reprompt-review__header h2 {
      margin: 0;
      font-size: 18px;
    }
    .reprompt-review__header p,
    .reprompt-review__prompt p,
    .reprompt-review__warning {
      margin: 0;
      color: #52606b;
      line-height: 1.45;
    }
    .reprompt-review__body {
      display: grid;
      gap: 12px;
      padding: 16px;
      overflow: auto;
    }
    .reprompt-review__prompt {
      display: grid;
      gap: 6px;
      padding: 12px;
      border: 1px solid #e4ebe9;
      border-radius: 8px;
      background: #ffffff;
    }
    .reprompt-review__prompt p {
      color: #24323d;
      white-space: pre-wrap;
    }
    .reprompt-review__warning {
      padding: 10px 12px;
      border: 1px solid rgba(202, 138, 4, 0.26);
      border-radius: 8px;
      background: rgba(202, 138, 4, 0.08);
      color: #805700;
    }
    .reprompt-review__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .reprompt-review__button,
    .reprompt-review__close {
      min-height: 36px;
      border: 1px solid #cbd8d5;
      border-radius: 8px;
      background: #ffffff;
      color: #17212b;
      cursor: pointer;
      font: inherit;
      padding: 0 12px;
    }
    .reprompt-review__button:disabled {
      cursor: default;
      opacity: 0.55;
    }
    .reprompt-review__button--primary {
      border-color: #0f766e;
      background: #0f766e;
      color: #ffffff;
    }
  `;

  const overlay = document.createElement('div');
  overlay.className = 'reprompt-review';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reprompt-review-title');

  const panel = document.createElement('div');
  panel.className = 'reprompt-review__panel';

  const header = document.createElement('header');
  header.className = 'reprompt-review__header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'reprompt-review-title';
  title.textContent = 'Use enhanced prompt?';
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Review the rewrite before sending.';
  titleBlock.append(title, subtitle);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'reprompt-review__close';
  closeButton.textContent = 'Close';
  header.append(titleBlock, closeButton);

  const body = document.createElement('div');
  body.className = 'reprompt-review__body';
  body.append(createDialogText('Original', original));

  const refinedSection = createDialogText('Enhanced', 'Enhancing prompt...');
  const refinedBody = refinedSection.querySelector('p');
  body.append(refinedSection);

  const warningText = document.createElement('p');
  warningText.className = 'reprompt-review__warning';
  warningText.hidden = true;
  body.append(warningText);

  const footer = document.createElement('footer');
  footer.className = 'reprompt-review__footer';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'reprompt-review__button';
  editButton.textContent = 'Keep editing';

  const originalButton = document.createElement('button');
  originalButton.type = 'button';
  originalButton.className = 'reprompt-review__button';
  originalButton.textContent = 'Send original';

  const acceptButton = document.createElement('button');
  acceptButton.type = 'button';
  acceptButton.className = 'reprompt-review__button reprompt-review__button--primary';
  acceptButton.textContent = 'Use enhanced prompt';
  acceptButton.disabled = true;

  const actions = document.createElement('div');
  actions.className = 'reprompt-review__actions';
  actions.append(editButton, originalButton, acceptButton);
  footer.append(actions);

  panel.append(header, body, footer);
  overlay.append(panel);
  host.append(style, overlay);
  document.documentElement.append(host);

  const showWarning = (message) => {
    if (!message || closed) {
      return;
    }
    warningText.textContent = message;
    warningText.hidden = false;
  };

  const cleanup = (action) => {
    if (closed) {
      return;
    }
    closed = true;
    document.removeEventListener('keydown', handleDialogKeydown);
    host.remove();
    resolveChoice({ action, refined });
  };

  function handleDialogKeydown(event) {
    if (event.key === 'Escape') {
      cleanup('edit');
    }
  }

  closeButton.addEventListener('click', () => cleanup('edit'));
  editButton.addEventListener('click', () => cleanup('edit'));
  originalButton.addEventListener('click', () => cleanup('original'));
  acceptButton.addEventListener('click', () => cleanup('enhanced'));
  document.addEventListener('keydown', handleDialogKeydown);

  return {
    choice,
    setResult(result) {
      if (closed) {
        return;
      }
      refined = result.refined || '';
      refinedBody.textContent = refined || 'Enhancement unavailable.';
      acceptButton.disabled = !refined;
      if (result.warning) {
        showWarning(result.warning);
      }
    },
    setWarning: showWarning,
    setError(message) {
      if (closed) {
        return;
      }
      refined = '';
      refinedBody.textContent = message;
      acceptButton.disabled = true;
      showWarning('You can send the original prompt or keep editing.');
    }
  };
}

async function logEnhancement(original, result) {
  await chrome.runtime.sendMessage({
    type: 'LOG_HISTORY',
    entry: {
      id: crypto.randomUUID(),
      platformId: platform?.id ?? 'unknown',
      original,
      refined: result.refined,
      source: result.source,
      warning: result.warning,
      model: result.model,
      usage: result.usage,
      costUsd: result.costUsd,
      createdAt: new Date().toISOString()
    }
  });
}

function refinePrompt(original) {
  return chrome.runtime.sendMessage({
    type: 'REFINE_PROMPT',
    prompt: original,
    platformId: platform?.id
  });
}

async function autoRefineAndSend(original, compose, submit) {
  const result = await refinePrompt(original);
  if (result?.refined) {
    writePromptValue(compose, result.refined);
    await logEnhancement(original, result);
  }
  submit();
}

async function reviewAndSend(original, compose, submit) {
  const dialog = createReviewDialog(original);
  const slowTimer = setTimeout(() => {
    dialog.setWarning('Enhancement is taking longer than expected.');
  }, 8000);

  const resultPromise = refinePrompt(original)
    .then((result) => {
      clearTimeout(slowTimer);
      dialog.setResult(result);
      return result;
    })
    .catch((error) => {
      clearTimeout(slowTimer);
      dialog.setError('Enhancement unavailable.');
      return {
        refined: original,
        source: 'error',
        warning: error instanceof Error ? error.message : String(error)
      };
    });

  const choice = await dialog.choice;
  if (choice.action === 'edit') {
    writePromptValue(compose, original);
    return;
  }

  if (choice.action === 'original') {
    writePromptValue(compose, original);
    submit();
    return;
  }

  const result = await resultPromise;
  const refined = choice.refined || result.refined;
  if (refined) {
    const historyResult = { ...result, refined };
    writePromptValue(compose, refined);
    await logEnhancement(original, historyResult);
  }
  submit();
}

async function refineAndSubmit(form, compose) {
  if (pendingByForm.has(form) || pendingByCompose.has(compose)) {
    return;
  }

  const original = readPromptValue(compose).trim();
  if (!original) {
    return;
  }

  pendingByForm.add(form);
  pendingByCompose.add(compose);

  try {
    const submit = () => submitForm(form);
    if (settings.autoChooseEnhanced) {
      await autoRefineAndSend(original, compose, submit);
    } else {
      await reviewAndSend(original, compose, submit);
    }
  } finally {
    pendingByForm.delete(form);
    pendingByCompose.delete(compose);
  }
}

async function refineAndClick(button, compose) {
  if (pendingByCompose.has(compose)) {
    return;
  }

  const original = readPromptValue(compose).trim();
  if (!original) {
    return;
  }

  pendingByCompose.add(compose);

  try {
    const submit = () => submitButton(button);
    if (settings.autoChooseEnhanced) {
      await autoRefineAndSend(original, compose, submit);
    } else {
      await reviewAndSend(original, compose, submit);
    }
  } finally {
    pendingByCompose.delete(compose);
  }
}

function stopSendEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleSubmit(event) {
  const form = event.currentTarget;
  if (form.dataset.repromptBypass === '1') {
    delete form.dataset.repromptBypass;
    return;
  }

  if (!shouldRun()) {
    return;
  }

  const compose = findComposeElement(form);
  if (!compose) {
    return;
  }

  stopSendEvent(event);
  refineAndSubmit(form, compose);
}

function handleKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (!shouldRun()) {
    return;
  }

  const compose = findComposeElement(event.target);
  if (!compose || !readPromptValue(compose).trim()) {
    return;
  }

  const form = compose.closest('form');
  stopSendEvent(event);
  if (form) {
    refineAndSubmit(form, compose);
    return;
  }

  const button = document.querySelector(SEND_BUTTON_SELECTOR);
  if (button) {
    refineAndClick(button, compose);
  }
}

function handleSendIntent(event) {
  const button = event.target?.closest?.(`${SEND_BUTTON_SELECTOR}, button, [role="button"]`);
  if (!button) {
    return;
  }

  if (bypassButtons.has(button)) {
    if (event.type === 'click') {
      bypassButtons.delete(button);
    }
    return;
  }

  if (!shouldRun() || !isLikelySendButton(button)) {
    return;
  }

  const compose = findActiveComposeElement(button);
  if (!compose) {
    return;
  }

  stopSendEvent(event);
  refineAndClick(button, compose);
}

function bindCompose(compose) {
  if (composeBindings.has(compose)) {
    return;
  }

  composeBindings.add(compose);
  compose.addEventListener('keydown', handleKeydown, true);

  const form = compose.closest('form');
  if (form && !boundForms.has(form)) {
    boundForms.add(form);
    form.addEventListener('submit', handleSubmit, true);
  }
}

function scanForComposers(root = document) {
  root.querySelectorAll?.(COMPOSER_SELECTOR).forEach(bindCompose);
}

function observe() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanForComposers(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function bootstrap() {
  if (!platform) {
    return;
  }

  markLoaded();
  settings = await getSettings();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    if (changes['reprompt.settings']) {
      settings = changes['reprompt.settings'].newValue;
    }
  });

  scanForComposers();
  document.addEventListener('pointerdown', handleSendIntent, true);
  document.addEventListener('mousedown', handleSendIntent, true);
  document.addEventListener('click', handleSendIntent, true);
  document.addEventListener('keydown', handleKeydown, true);
  observe();
}

bootstrap().catch((error) => console.error('Reprompt content script failed to bootstrap', error));
