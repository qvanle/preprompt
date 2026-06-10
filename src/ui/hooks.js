import { useEffect, useMemo, useState } from 'react';
import { getConnectionStatus } from '../shared/api.js';
import {
  DEFAULT_SETTINGS,
  appendHistory,
  clearHistory,
  getHistory,
  getSettings,
  saveSettings
} from '../shared/storage.js';

function hasStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.onChanged);
}

async function getCurrentState() {
  const settings = await getSettings();
  const history = await getHistory();
  return {
    settings,
    history,
    connection: getConnectionStatus(settings),
    ready: true
  };
}

export function useExtensionState() {
  const [state, setState] = useState({
    settings: DEFAULT_SETTINGS,
    history: [],
    connection: getConnectionStatus(DEFAULT_SETTINGS),
    ready: false
  });

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const next = await getCurrentState();
      if (active) {
        setState(next);
      }
    };

    refresh();

    if (!hasStorage()) {
      return () => {
        active = false;
      };
    }

    const listener = (changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      if (changes['reprompt.settings'] || changes['reprompt.history']) {
        refresh();
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const actions = useMemo(
    () => ({
      updateSettings: async (patch) => {
        const settings = await saveSettings(patch);
        const history = await getHistory();
        const connection = getConnectionStatus(settings);
        setState({ settings, history, connection, ready: true });
        return settings;
      },
      appendHistory: async (entry) => {
        const history = await appendHistory(entry);
        setState((current) => ({ ...current, history }));
        return history;
      },
      clearHistory: async () => {
        await clearHistory();
        setState((current) => ({ ...current, history: [] }));
      }
    }),
    []
  );

  return { ...state, ...actions };
}
