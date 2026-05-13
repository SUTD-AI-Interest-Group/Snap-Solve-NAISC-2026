// scripts/fetch-mediapipe-assets.mjs
//
// Downloads MediaPipe Tasks Vision WASM assets and the hand_landmarker model
// into static/mediapipe/. Idempotent — re-running checks file presence.
// Pinned to the exact @mediapipe/tasks-vision version in package.json.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'static/mediapipe');
const wasmDir = resolve(outDir, 'wasm');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.dependencies['@mediapipe/tasks-vision'].replace(/^[\^~]/, '');
const cdn = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm`;

const wasmFiles = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm'
];

const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const modelPath = resolve(outDir, 'hand_landmarker.task');

mkdirSync(wasmDir, { recursive: true });

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log(`✓ skip (exists): ${dest}`);
    return;
  }
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  → ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
}

for (const f of wasmFiles) {
  await download(`${cdn}/${f}`, resolve(wasmDir, f));
}
await download(modelUrl, modelPath);

console.log('✓ MediaPipe assets ready under static/mediapipe/');
