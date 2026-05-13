// scripts/copy-gif-worker.mjs
// Copies node_modules/gif.js/dist/gif.worker.js into static/gifjs/ so
// SvelteKit serves it same-origin (Web Worker constraint).
// Idempotent. Soft-fails if gif.js isn't installed yet (so postinstall
// during a partial npm install doesn't block).

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'node_modules/gif.js/dist/gif.worker.js');
const destDir = resolve(root, 'static/gifjs');
const dest = resolve(destDir, 'gif.worker.js');

if (!existsSync(src)) {
  console.warn(`! gif.js worker not found at ${src} — run npm install first.`);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`✓ copied gif.worker.js → ${dest}`);
