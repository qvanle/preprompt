import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const entries = [
  { entry: resolve(root, 'src/popup.jsx'), outfile: resolve(dist, 'popup.js') },
  { entry: resolve(root, 'src/options.jsx'), outfile: resolve(dist, 'options.js') },
  { entry: resolve(root, 'src/content.js'), outfile: resolve(dist, 'content.js') },
  { entry: resolve(root, 'src/service-worker.js'), outfile: resolve(dist, 'service-worker.js') }
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const { entry, outfile } of entries) {
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile,
    format: 'iife',
    platform: 'browser',
    target: ['chrome114'],
    jsx: 'automatic',
    loader: { '.css': 'css', '.js': 'jsx', '.jsx': 'jsx' },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
}

for (const file of ['manifest.json', 'popup.html', 'options.html']) {
  await copyFile(resolve(root, file), resolve(dist, file));
}
