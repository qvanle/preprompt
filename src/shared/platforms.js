export const PLATFORMS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    hosts: ['chatgpt.com', 'chat.openai.com']
  },
  {
    id: 'gemini',
    name: 'Gemini',
    hosts: ['gemini.google.com']
  },
  {
    id: 'claude',
    name: 'Claude',
    hosts: ['claude.ai']
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    hosts: ['chat.deepseek.com', 'deepseek.com']
  }
];

export const PLATFORM_IDS = PLATFORMS.map((platform) => platform.id);

export function detectPlatform(hostname = '') {
  const value = hostname.toLowerCase();
  return (
    PLATFORMS.find((platform) =>
      platform.hosts.some((host) => value === host || value.endsWith(`.${host}`))
    ) ?? null
  );
}

export function platformName(id) {
  return PLATFORMS.find((platform) => platform.id === id)?.name ?? id;
}
