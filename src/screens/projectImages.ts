// Picks up project screenshots from src/assets/projects/<project-id>/<file>.
// Just drop files in a folder named after the project's `id` (see src/data/content.ts):
//   src/assets/projects/signal/01-attack-graph.webp
//   src/assets/projects/signal/02-compliance-report.png
// Files show in filename order (prefix 01-, 02-… to choose it); the first is the cover.
// Alt text comes from the name ("01-attack-graph" → "Attack graph"). For a caption or
// better alt text, list the file in that project's `images` in content.ts:
//   images: [{ src: '01-attack-graph.webp', alt: '3D attack-chain graph', caption: 'Linked findings' }]
// Listed files come first in the order given; unlisted ones follow. A full URL also works as `src`.
import type { Project, ProjectImage } from '../data/content';

const files = import.meta.glob('../assets/projects/*/*.{webp,jpg,jpeg,png,avif,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

type Found = { file: string; url: string };

const byProject: Record<string, Found[]> = {};
for (const [path, url] of Object.entries(files)) {
  const parts = path.split('/');
  const file = parts.pop()!;
  const id = parts.pop()!;
  (byProject[id] ??= []).push({ file, url });
}
for (const list of Object.values(byProject)) {
  list.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
}

/** "02-compliance_report.png" → "Compliance report" */
function altFromFile(file: string): string {
  const base = file
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : 'Screenshot';
}

export function projectImages(p: Project): ProjectImage[] {
  const found = byProject[p.id] ?? [];
  const used = new Set<string>();
  const out: ProjectImage[] = [];
  for (const img of p.images ?? []) {
    const match = found.find((f) => f.file === img.src);
    if (match) used.add(match.file);
    else if (!/^(https?:)?\/|^data:/.test(img.src)) continue; // file not in the folder (yet)
    out.push({ ...img, src: match ? match.url : img.src });
  }
  for (const f of found) {
    if (!used.has(f.file)) out.push({ src: f.url, alt: `${p.name}: ${altFromFile(f.file)}` });
  }
  return out;
}
