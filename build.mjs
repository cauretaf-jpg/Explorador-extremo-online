import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const name of ['index.html']) fs.copyFileSync(path.join(root, name), path.join(dist, name));
fs.copyFileSync(path.join(root, 'node_modules/three/build/three.min.js'), path.join(dist, 'three.min.js'));
await build({ entryPoints: [path.join(root, 'src/supabase-client.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'supabase-client.js') });
const config = {
  url: process.env.SUPABASE_URL || '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
};
fs.writeFileSync(path.join(dist, 'config.js'), `window.EXPLORADOR_CONFIG = ${JSON.stringify(config)};\n`);
