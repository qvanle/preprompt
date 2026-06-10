import { PLATFORM_IDS } from './platforms.js';

export const STORAGE_KEYS = {
  settings: 'reprompt.settings',
  history: 'reprompt.history'
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  autoRefine: true,
  sidebarVisible: true,
  activePlatformIds: [...PLATFORM_IDS],
  api: {
    endpoint: '',
    apiKey: '',
    model: ''
  }
};

const memoryStore = new Map();

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
}

async function storageGet(keys) {
  if (hasChromeStorage()) {
    return chrome.storage.local.get(keys);
  }

  const result = {};
  const wanted = Array.isArray(keys) ? keys : [keys];
  for (const key of wanted) {
    if (memoryStore.has(key)) {
      result[key] = memoryStore.get(key);
    }
  }
  return result;
}

async function storageSet(items) {
  if (hasChromeStorage()) {
    return chrome.storage.local.set(items);
  }

  for (const [key, value] of Object.entries(items)) {
    memoryStore.set(key, value);
  }
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) {
    return patch ?? base;
  }

  if (base && patch && typeof base === 'object' && typeof patch === 'object') {
    const merged = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      merged[key] = key in base ? deepMerge(base[key], value) : value;
    }
    return merged;
  }

  return patch ?? base;
}

export async function getSettings() {
  const data = await storageGet(STORAGE_KEYS.settings);
  return deepMerge(DEFAULT_SETTINGS, data[STORAGE_KEYS.settings] ?? {});
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = deepMerge(current, patch);
  await storageSet({ [STORAGE_KEYS.settings]: next });
  return next;
}

export async function getHistory() {
  const data = await storageGet(STORAGE_KEYS.history);
  return Array.isArray(data[STORAGE_KEYS.history]) ? data[STORAGE_KEYS.history] : [];
}

export async function setHistory(history) {
  await storageSet({ [STORAGE_KEYS.history]: history });
  return history;
}

export async function appendHistory(entry) {
  const history = await getHistory();
  const next = [entry, ...history].slice(0, 50);
  await setHistory(next);
  return next;
}

export async function clearHistory() {
  await setHistory([]);
}
