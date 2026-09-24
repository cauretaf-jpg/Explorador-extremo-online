import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const name of ['index.html']) fs.copyFileSync(path.join(root, name), path.join(dist, name));
fs.copyFileSync(path.join(root, 'src/ui/mobile.css'), path.join(dist, 'mobile.css'));
fs.copyFileSync(path.join(root, 'src/ui/profile.css'), path.join(dist, 'profile.css'));
fs.copyFileSync(path.join(root, 'src/battle/battle.css'), path.join(dist, 'battle.css'));
fs.copyFileSync(path.join(root, 'node_modules/three/build/three.min.js'), path.join(dist, 'three.min.js'));
await build({ entryPoints: [path.join(root, 'src/supabase-client.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'supabase-client.js') });
await build({ entryPoints: [path.join(root, 'src/combat-config.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'combat-config.js') });
await build({ entryPoints: [path.join(root, 'src/multiplayer/session.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'network-session.js') });
await build({ entryPoints: [path.join(root, 'src/levels/config.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'levels-config.js') });
await build({ entryPoints: [path.join(root, 'src/progression/config.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'progression-config.js') });
await build({ entryPoints: [path.join(root, 'src/game/dispose.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'dispose-3d.js') });
await build({ entryPoints: [path.join(root, 'src/audio/engine.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'audio-engine.js') });
await build({ entryPoints: [path.join(root, 'src/ui/mobile-controls.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'mobile-controls.js') });
await build({ entryPoints: [path.join(root, 'src/ui/hud.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'ui-hud.js') });
await build({ entryPoints: [path.join(root, 'src/profile/client.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'profile-client.js') });
await build({ entryPoints: [path.join(root, 'src/ui/profile-panel.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'profile-panel.js') });
await build({ entryPoints: [path.join(root, 'src/battle/mode.js')], bundle: true, minify: true,
  format: 'iife', platform: 'browser', outfile: path.join(dist, 'battle-mode.js') });
const defaults = JSON.parse(fs.readFileSync(path.join(root, 'supabase.public.json'), 'utf8'));
const config = {
  url: process.env.SUPABASE_URL || defaults.url,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || defaults.publishableKey
};
fs.writeFileSync(path.join(dist, 'config.js'), `window.EXPLORADOR_CONFIG = ${JSON.stringify(config)};\n`);
