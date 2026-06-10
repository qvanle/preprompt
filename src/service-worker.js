import { appendHistory, getSettings, saveSettings } from './shared/storage.js';
import { refinePromptForPlatform, getConnectionStatus } from './shared/api.js';

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: 'No active tab found.' };
  }

  await chrome.tabs.sendMessage(tab.id, message);
  return { ok: true };
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) {
    return false;
  }

  if (message.type === 'REFINE_PROMPT') {
    getSettings()
      .then((settings) => refinePromptForPlatform(settings, message.prompt, message.platformId))
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({
          refined: message.prompt,
          source: 'error',
          warning: error instanceof Error ? error.message : String(error)
        });
      });
    return true;
  }

  if (message.type === 'LOG_HISTORY') {
    appendHistory(message.entry)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'GET_STATE') {
    Promise.all([getSettings(), chrome.storage.local.get('reprompt.history')])
      .then(([settings, history]) =>
        sendResponse({
          settings,
          history: history['reprompt.history'] ?? [],
          connection: getConnectionStatus(settings)
        })
      )
      .catch((error) => sendResponse({ error: String(error) }));
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    saveSettings(message.patch)
      .then((settings) => sendResponse({ settings, connection: getConnectionStatus(settings) }))
      .catch((error) => sendResponse({ error: String(error) }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'SHOW_SIDEBAR' || message.type === 'HIDE_SIDEBAR' || message.type === 'TOGGLE_SIDEBAR') {
    sendToActiveTab({ type: message.type })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
