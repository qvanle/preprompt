import { useEffect, useMemo, useState } from 'react';
import { getConnectionStatus } from '../shared/api.js';
import { DEFAULT_SETTINGS, appendHistory, clearHistory, getHistory, getSettings, saveSettings } from '../shared/storage.js';

function hasStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.onChanged);
}

async function getCurrentState() {
  const settings = await getSettings();
  const history = await getHistory();
  return { settings, history, connection: getConnectionStatus(settings) };
}

export function useExtensionState() {
  const [state, setState] = useState({
    settings: DEFAULT_SETTINGS,
    history: [],
    connection: getConnectionStatus(DEFAULT_SETTINGS),
    ready: false
  });

  const refresh = async () => {
    const next = await getCurrentState();
    setState({ ...next, ready: true });
    return next;
  };

  useEffect(() => {
    refresh();

    if (!hasStorage()) {
      return undefined;
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
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const actions = useMemo(
    () => ({
      updateSettings: async (patch) => {
        const next = await saveSettings(patch);
        const history = await getHistory();
        const connection = getConnectionStatus(next);
        setState({ settings: next, history, connection, ready: true });
        return next;
      },
      appendHistory: async (entry) => {
        const history = await appendHistory(entry);
        setState((current) => ({ ...current, history }));
        return history;
      },
      clearHistory: async () => {
        await clearHistory();
        setState((current) => ({ ...current, history: [] }));
      },
      refresh
    }),
    []
  );

  return { ...state, ...actions };
}
