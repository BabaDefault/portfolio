// Optimizes background art dropped into src/assets/scenes/ for the web.
//   node scripts/optimize-scenes.mjs
// For each .png/.jpg/.jpeg there: writes a 2560px-wide .webp next to it and moves
// the original into art-originals/ (kept out of the site). Needs ffmpeg on PATH.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';

const SRC = 'src/assets/scenes';
const ORIG = 'art-originals';
mkdirSync(ORIG, { recursive: true });

const files = readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (!files.length) console.log('No .png/.jpg files to optimize in', SRC);

for (const f of files) {
  const { name } = parse(f);
  const input = join(SRC, f);
  const output = join(SRC, `${name}.webp`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', "scale='min(2560,iw)':-2:flags=lanczos", '-quality', '86', '-compression_level', '6', output]);
  renameSync(input, join(ORIG, f));
  const kb = (n) => `${Math.round(statSync(n).size / 1024)} KB`;
  console.log(`${f} → ${name}.webp (${kb(output)}), original moved to ${ORIG}/`);
}
