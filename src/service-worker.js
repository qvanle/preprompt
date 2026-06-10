import { appendHistory, getHistory, getSettings, saveSettings } from './shared/storage.js';
import { getConnectionStatus, refinePromptForPlatform } from './shared/api.js';

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
      .catch((error) =>
        sendResponse({
          refined: message.prompt,
          source: 'error',
          warning: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === 'LOG_HISTORY') {
    appendHistory(message.entry)
      .then((history) => sendResponse({ ok: true, history }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'GET_STATE') {
    Promise.all([getSettings(), getHistory()])
      .then(([settings, history]) =>
        sendResponse({
          settings,
          history,
          connection: getConnectionStatus(settings)
        })
      )
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    saveSettings(message.patch)
      .then((settings) => sendResponse({ settings, connection: getConnectionStatus(settings) }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS' || message.type === 'OPEN_DASHBOARD') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
