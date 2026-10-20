# Scene background images (optional)

Drop an image in this folder named after a screen id and it replaces that
screen's code-drawn background automatically, with animated particles kept on top.

    title.webp   profile.webp   skills.webp   projects.webp   journey.webp
    advancements.webp   quests.webp   contact.webp   end.webp

- Formats: .webp (preferred), .jpg, .jpeg, .png, .avif
- Size: ~1920×1080, ideally 200–400 KB
- Keep the side where the panel sits calm/dark (see `placement` in src/screens/registry.ts)
- Optional mobile crop: add `<id>.mobile.webp` (portrait, ~1080×1920)

## Video backgrounds
Add `<id>.mp4` or `<id>.webm` (5–10s seamless loop, muted, ideally < 5 MB).
Also add a still `<id>.webp` from the first frame: it shows while the video loads
and for visitors with reduced motion enabled.

## Lining things up with your image
In src/screens/registry.ts, a screen's optional `layout` nudges the panel and the
3D player on desktop, e.g. `layout: { panelInset: '21vw', playerInset: '17vw', playerBottom: '20vh' }`.

## Animating a still image (recommended over video)
Each image gets its own effects (fire glow, smoke, god rays, particles, water
shimmer, fog) listed in src/scenes/sceneEffects.ts, positioned in % of the image.
To find coordinates, open the site with `?fx` (e.g. http://localhost:5173/?fx#title)
and click a spot: its x/y is shown and copied.
