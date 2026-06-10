import { appendHistory, getHistory, getSettings, saveSettings } from './shared/storage.js';
import {
  getConnectionStatus,
  refinePromptForPlatform,
  refinePromptForPlatformStream
} from './shared/api.js';

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) return false;

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
      .then(([settings, history]) => {
        sendResponse({
          settings,
          history,
          connection: getConnectionStatus(settings)
        });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    saveSettings(message.patch)
      .then((settings) => {
        sendResponse({ settings, connection: getConnectionStatus(settings) });
      })
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

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'REFINE_PROMPT_STREAM') return;

  let active = true;
  port.onDisconnect.addListener(() => {
    active = false;
  });

  port.onMessage.addListener(async (message) => {
    if (message?.type !== 'REFINE_PROMPT_STREAM') return;

    try {
      const settings = await getSettings();
      const result = await refinePromptForPlatformStream(
        settings,
        message.prompt,
        message.platformId,
        (refined) => {
          if (!active) return;
          port.postMessage({ type: 'progress', refined });
        }
      );

      if (!active) return;
      port.postMessage({ type: 'result', result });
    } catch (error) {
      if (!active) return;
      port.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
});
