# Jason Codes: a Minecraft-themed portfolio

A personal portfolio that plays like a Minecraft game UI. Each section is its own
"world": a cinematic background with animated effects, a 3D player built from my
own skin, and a game-style panel. You navigate with the hotbar.

## Screens
| Key | Screen | Interface |
|---|---|---|
| 1 | Title | Title screen with splash text |
| 2 | Profile | Survival inventory |
| 3 | Skills | Brewing stand (skills as potions) |
| 4 | Projects | "Select World" list |
| 5 | Journey | Treasure map timeline |
| 6 | Advancements | Advancement tree |
| 7 | Quest Board | Active quests + side quests (hobbies) |
| 8 | Contact | Chat console with commands |
| 9 | The End | Credits roll |

**Controls:** `1`–`9` or the hotbar · `←` `→` · scroll over the hotbar · `Esc` home · `F3` debug overlay.

## Stack
Vite · React 18 · TypeScript · three.js via skinview3d (3D player) · Web Audio API (synthesized sounds, no audio files).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Editing
| What | Where |
|---|---|
| All text content (bio, projects, skills, journey, quests, contact) | `src/data/content.ts` |
| Background images | `src/assets/scenes/<screen>.webp` (see the README there) |
| Animated effects per background | `src/scenes/fx/<screen>.ts` (open the site with `?fx` to pick coordinates) |
| Player skin | `public/skins/player.png` (128×128 HD; regenerate with `node scripts/make-skin-hd.mjs`) |
| Screen layout, poses, player position | `src/screens/registry.ts` |
| Background prompts (Midjourney) | `PROMPTS.md` |

New background art: drop full-size PNGs into `src/assets/scenes/` and run
`node scripts/optimize-scenes.mjs`. It writes web-sized `.webp` files and moves the
originals to `art-originals/`, which is git-ignored.

---
Inspired by sandbox game interfaces. Not affiliated with Mojang or Microsoft.
