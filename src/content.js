import React from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPanel from './ui/DashboardPanel.jsx';
import { SIDEBAR_CSS } from './ui/sidebarCss.js';
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
].join(', ');

const SEND_BUTTON_SELECTOR = [
  '[data-testid="send-button"]',
  '[data-testid="composer-submit-button"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Submit" i]',
  'button[type="submit"]',
  '[role="button"][aria-label*="Send" i]',
  '[role="button"][aria-label*="Submit" i]'
].join(', ');

const platform = detectPlatform(location.hostname);

let settings = null;
let sidebarHost = null;
let sidebarRoot = null;

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
  return Boolean(platform && settings?.enabled && settings.activePlatformIds.includes(platform.id));
}

function ensureSidebar() {
  if (sidebarHost) {
    return sidebarHost;
  }

  sidebarHost = document.createElement('div');
  sidebarHost.id = 'reprompt-sidebar-host';
  sidebarHost.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483646;
  `;

  const shadow = sidebarHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = SIDEBAR_CSS;
  const mount = document.createElement('div');
  shadow.append(style, mount);

  sidebarRoot = createRoot(mount);
  sidebarRoot.render(
    <React.StrictMode>
      <DashboardPanel compact onClose={hideSidebar} />
    </React.StrictMode>
  );

  document.documentElement.append(sidebarHost);
  return sidebarHost;
}

function showSidebar() {
  ensureSidebar();
  sidebarHost.style.display = 'block';
}

function hideSidebar() {
  if (sidebarHost) {
    sidebarHost.style.display = 'none';
  }
}

function findComposeElement(node) {
  if (!node || node === document || node === window) {
    return null;
  }

  const candidate = node.closest?.(COMPOSER_SELECTOR);
  if (candidate) {
    return candidate;
  }

  return node.querySelector?.(COMPOSER_SELECTOR) ?? null;
}

function readPromptValue(el) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }

  return el.textContent ?? '';
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

  const composers = [...document.querySelectorAll(COMPOSER_SELECTOR)];
  return composers.reverse().find((compose) => readPromptValue(compose).trim()) ?? null;
}

function isLikelySendButton(button) {
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  if (button.matches?.(SEND_BUTTON_SELECTOR)) {
    return true;
  }

  const label = [
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.getAttribute('data-testid'),
    button.textContent
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /\b(send|submit|arrow-up|send-button|composer-submit-button)\b/.test(label);
}

function writePromptValue(el, value) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  el.focus();
  el.textContent = value;
  el.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: value,
    inputType: 'insertText'
  }));
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: value,
    inputType: 'insertText'
  }));
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

  const heading = document.createElement('h3');
  heading.textContent = label;

  const body = document.createElement('p');
  body.textContent = value;

  section.append(heading, body);
  return section;
}

function showEnhancementDialog({ original }) {
  const existing = document.getElementById('reprompt-review-host');
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('div');
  host.id = 'reprompt-review-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .reprompt-review {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(6px);
    }

    .reprompt-review__panel {
      width: min(640px, 100%);
      max-height: min(760px, calc(100vh - 40px));
      overflow: auto;
      border: 1px solid #d9e2e0;
      border-radius: 10px;
      background: #f8faf9;
      color: #17212b;
      box-shadow: 0 24px 90px rgba(15, 23, 42, 0.28);
    }

    .reprompt-review__header,
    .reprompt-review__footer {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      padding: 16px;
    }

    .reprompt-review__header {
      border-bottom: 1px solid #e4ebe9;
    }

    .reprompt-review__header h2 {
      margin: 0 0 4px;
      color: #13202a;
      font-size: 18px;
      font-weight: 760;
      letter-spacing: 0;
      line-height: 1.2;
    }

    .reprompt-review__header p,
    .reprompt-review__warning,
    .reprompt-review__prompt p {
      margin: 0;
      color: #60707b;
      font-size: 13px;
      line-height: 1.5;
    }

    .reprompt-review__close {
      display: inline-grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border: 1px solid #d9e2e0;
      border-radius: 8px;
      background: #ffffff;
      color: #40505b;
      cursor: pointer;
      font: inherit;
      font-size: 18px;
      line-height: 1;
    }

    .reprompt-review__body {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    .reprompt-review__prompt {
      padding: 13px;
      border: 1px solid #dfe6e5;
      border-radius: 8px;
      background: #ffffff;
    }

    .reprompt-review__prompt--refined {
      border-color: rgba(15, 118, 110, 0.24);
      background: #eef8f6;
    }

    .reprompt-review__prompt h3 {
      margin: 0 0 8px;
      color: #52606b;
      font-size: 11px;
      font-weight: 760;
      letter-spacing: 0.04em;
      line-height: 1.2;
      text-transform: uppercase;
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

    .reprompt-review__footer {
      align-items: center;
      justify-content: flex-end;
      border-top: 1px solid #e4ebe9;
      background: rgba(255, 255, 255, 0.7);
    }

    .reprompt-review__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .reprompt-review__button {
      min-height: 36px;
      padding: 0 13px;
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 760;
    }

    .reprompt-review__button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    .reprompt-review__button--primary {
      background: #0f766e;
      color: #ffffff;
      box-shadow: 0 10px 22px rgba(15, 118, 110, 0.18);
    }

    .reprompt-review__button--secondary,
    .reprompt-review__button--ghost {
      border-color: #d9e2e0;
      background: #ffffff;
      color: #40505b;
    }

    .reprompt-review__button:focus-visible,
    .reprompt-review__close:focus-visible {
      outline: 2px solid rgba(15, 118, 110, 0.28);
      outline-offset: 2px;
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
  subtitle.textContent = 'Review the enhanced prompt before Reprompt sends it.';
  titleBlock.append(title, subtitle);

  const closeButton = document.createElement('button');
  closeButton.className = 'reprompt-review__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Keep editing');
  closeButton.textContent = 'x';
  header.append(titleBlock, closeButton);

  const body = document.createElement('div');
  body.className = 'reprompt-review__body';
  body.append(createDialogText('Original prompt', original));

  const refinedSection = createDialogText('Enhanced prompt', 'Enhancing prompt...');
  refinedSection.classList.add('reprompt-review__prompt--refined');
  const refinedBody = refinedSection.querySelector('p');
  body.append(refinedSection);

  const warningText = document.createElement('p');
  warningText.className = 'reprompt-review__warning';
  warningText.hidden = true;
  body.append(warningText);

  const footer = document.createElement('footer');
  footer.className = 'reprompt-review__footer';
  const actions = document.createElement('div');
  actions.className = 'reprompt-review__actions';

  const editButton = document.createElement('button');
  editButton.className = 'reprompt-review__button reprompt-review__button--ghost';
  editButton.type = 'button';
  editButton.textContent = 'Keep editing';

  const originalButton = document.createElement('button');
  originalButton.className = 'reprompt-review__button reprompt-review__button--secondary';
  originalButton.type = 'button';
  originalButton.textContent = 'Send original';

  const acceptButton = document.createElement('button');
  acceptButton.className = 'reprompt-review__button reprompt-review__button--primary';
  acceptButton.type = 'button';
  acceptButton.textContent = 'Use enhanced prompt';
  acceptButton.disabled = true;

  actions.append(editButton, originalButton, acceptButton);
  footer.append(actions);
  panel.append(header, body, footer);
  overlay.append(panel);
  shadow.append(style, overlay);
  document.documentElement.append(host);

  let closed = false;
  let refined = '';
  let resolveChoice;
  const choice = new Promise((resolve) => {
    resolveChoice = resolve;
  });

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

  const handleDialogKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cleanup('edit');
    }
  };

  closeButton.addEventListener('click', () => cleanup('edit'));
  editButton.addEventListener('click', () => cleanup('edit'));
  originalButton.addEventListener('click', () => cleanup('original'));
  acceptButton.addEventListener('click', () => {
    if (refined) {
      cleanup('accept');
    }
  });
  document.addEventListener('keydown', handleDialogKeydown);
  originalButton.focus();

  return {
    choice,
    get closed() {
      return closed;
    },
    setLoading(message) {
      if (!closed) {
        refinedBody.textContent = message;
      }
    },
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
      if (!closed) {
        refined = '';
        refinedBody.textContent = message;
        acceptButton.disabled = true;
        showWarning('You can send the original prompt or keep editing.');
      }
    },
    close() {
      cleanup('edit');
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
      createdAt: new Date().toISOString()
    }
  });
}

async function refineForReview(original) {
  return chrome.runtime.sendMessage({
    type: 'REFINE_PROMPT',
    prompt: original,
    platformId: platform?.id
  });
}

function startBackgroundRefinement(dialog, original) {
  const slowTimer = setTimeout(() => {
    dialog.setWarning('Enhancement is taking longer than expected.');
  }, 8000);

  return refineForReview(original)
    .then((result) => {
      clearTimeout(slowTimer);
      dialog.setResult(result);
      return result;
    })
    .catch((error) => {
      clearTimeout(slowTimer);
      dialog.setError('Enhancement unavailable.');
      return {
        refined: '',
        source: 'error',
        warning: error instanceof Error ? error.message : String(error)
      };
    });
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
    const dialog = showEnhancementDialog({ original });
    const resultPromise = startBackgroundRefinement(dialog, original);
    const choice = await dialog.choice;

    if (choice.action === 'edit') {
      writePromptValue(compose, original);
      return;
    }

    if (choice.action === 'original') {
      writePromptValue(compose, original);
      submitForm(form);
      return;
    }

    const result = await resultPromise;
    const refined = choice.refined || result.refined;
    if (!refined) {
      writePromptValue(compose, original);
      return;
    }

    writePromptValue(compose, refined);
    await logEnhancement(original, { ...result, refined });
    submitForm(form);
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
    const dialog = showEnhancementDialog({ original });
    const resultPromise = startBackgroundRefinement(dialog, original);
    const choice = await dialog.choice;

    if (choice.action === 'edit') {
      writePromptValue(compose, original);
      return;
    }

    if (choice.action === 'original') {
      writePromptValue(compose, original);
      submitButton(button);
      return;
    }

    const result = await resultPromise;
    const refined = choice.refined || result.refined;
    if (!refined) {
      writePromptValue(compose, original);
      return;
    }

    writePromptValue(compose, refined);
    await logEnhancement(original, { ...result, refined });
    submitButton(button);
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

  if (pendingByCompose.has(compose)) {
    return;
  }

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

function handleMessages(message) {
  if (message?.type === 'SHOW_SIDEBAR') {
    showSidebar();
  }

  if (message?.type === 'HIDE_SIDEBAR') {
    hideSidebar();
  }
}

async function bootstrap() {
  markLoaded();

  if (!platform) {
    return;
  }

  settings = await getSettings();
  chrome.runtime.onMessage.addListener(handleMessages);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    if (changes['reprompt.settings']) {
      settings = changes['reprompt.settings'].newValue;
    }
  });

  if (settings.sidebarVisible) {
    showSidebar();
  } else {
    ensureSidebar();
    hideSidebar();
  }

  scanForComposers();
  document.addEventListener('pointerdown', handleSendIntent, true);
  document.addEventListener('mousedown', handleSendIntent, true);
  document.addEventListener('click', handleSendIntent, true);
  document.addEventListener('keydown', handleKeydown, true);
  observe();
}

bootstrap().catch((error) => {
  console.error('Reprompt content script failed to bootstrap', error);
});
