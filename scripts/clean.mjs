import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
await rm(dist, { recursive: true, force: true });
