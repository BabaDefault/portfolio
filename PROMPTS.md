# Background art: prompts and rules

How to make the 9 screen backgrounds (stills, plus optional video loops) so they
look like one consistent set. Adapted for this site from the Blockcraft template's guide.

**Key difference from the template:** your character is a live 3D model
(`public/skins/player.png`) drawn on top by the site. So **backgrounds contain NO
character.** Leave a clear spot where the player stands instead.

Drop finished files in `src/assets/scenes/` (see the README there): `title.webp`,
`title.mp4`, and so on.

---

## The rules

1. **Generate all 9 in one chat thread.** A new chat means a new interpretation of the style.
2. **Once you love one frame, attach it to every later prompt** with:
   `Match the attached image exactly for block style, lighting quality and colour grade. Only the scene changes.`
3. **No text** anywhere: no signs, books with writing or UI. The site draws all UI in code.
4. **Keep the bottom quarter plain** (ground, floor, grass), because the hotbar sits there.
5. **Respect the layout** for each screen (table below): one side stays calm for the panel,
   and an open spot is left for the 3D player.

---

## Blocky lock (put this at the START and the END of every prompt)

```
IMPORTANT: Everything must remain BLOCKY and CUBIC. Every object is built from
visible cube blocks with 16x16 pixel textures. Sharp edges, stepped terrain, flat
layered water. No smooth or organic shapes anywhere. This is Minecraft, not a
realistic render.
```

## Style lock (paste into every prompt)

```
STYLE: Minecraft. Blocky voxel world built entirely from cubic blocks. Every
surface is a 16x16 pixel texture, visibly pixelated, no rounded edges.

RENDER: High-quality Minecraft screenshot with shaders: soft volumetric god
rays, realistic sky gradient, dynamic shadows, subtle bloom on light sources,
water reflections. Crisp, colourful, cinematic.

CAMERA: Eye-level to slightly elevated, wide field of view, cinematic composition.

16:9, 1920x1080. Vibrant, saturated, high detail.

NO CHARACTER, NO PLAYER, NO PEOPLE, NO MOBS IN THE FOREGROUND.
```

## Negative

```
no text, no letters, no UI, no HUD, no hotbar, no watermark, no people, no player
character, no realistic humans, no smooth surfaces, no rounded shapes, no photorealism
```

---

## The nine scenes

| # | File | Panel side (keep calm) | 3D player stands |
|---|---|---|---|
| 1 | `title` | left-centre | right |
| 2 | `profile` (spruce forest campfire) | left | right |
| 3 | `skills` (close-up brewing stand, no player) | right | hidden |
| 4 | `projects` (close-up open chest, ravine + geode behind) | left | hidden |
| 5 | `journey` | centre (wide map) | right edge |
| 6 | `advancements` | right | left |
| 7 | `quests` (your house at night) | left | right |
| 8 | `contact` | left | right |
| 9 | `end` | centre | right |

Add this to each scene: `COMPOSITION: [panel side] third is calm, darker and low-detail.
Leave open, flat ground on the [player side] for a character to stand. BOTTOM QUARTER plain.`

**1. Title: plains valley at golden hour** (you already have this one)
```
A wide plains valley at sunset. Rolling grass hills with flowers in the foreground,
a small village of oak houses below, a winding river, distant blocky mountains.
The sun is a bright square disc low on the horizon with warm god rays and flat
slab clouds.
```

**2. Profile: spruce forest campfire**
```
A clearing in a tall old-growth spruce (taiga) forest at dusk. Huge spruce log
trunks and dark needle leaf blocks, a lit campfire right of centre with smoke
rising, spruce log benches around it, podzol and coarse dirt ground, ferns and
sweet berry bushes, warm firelight against cool blue evening mist between the trees.
```

**3. Skills: Nether fortress brewing room**
```
A Nether fortress interior. Nether brick walls and arches, a brewing stand with
glowing potion bottles on a ledge, lava falls pouring in the distance, glowstone
clusters on the ceiling, soul fire, rising ember particles. Deep red and orange light.
```

**4. Projects: mineshaft ravine with an amethyst geode**
```
An abandoned mineshaft tunnel that opens onto a deep ravine. Oak support beams and
rails lead onto a rickety oak-and-rail bridge across the chasm, with a minecart and
chest on it. An amethyst geode breaks through the ravine wall, glowing purple
crystals. Lanterns hang on chains, a thin waterfall falls into the darkness below,
ore blocks embedded in the stone, cobwebs. Warm lantern light vs cool purple glow.
```

**5. Journey: Badlands mesa**
```
A badlands (mesa) landscape. Tall striped terracotta mesas in orange, red, yellow
and brown bands, red sand, cacti and dead bushes, a winding dry riverbed, clear
sky with a square sun. Keep the centre open and low-detail; mesas at the edges.
```

**6. Advancements: Ancient City (Deep Dark)**
```
A vast Ancient City in the Deep Dark. Deepslate and polished dark blocks, an enormous
central frame structure, sculk patches with glowing cyan sensors and shriekers,
soul lanterns casting pale blue light, corridors receding into darkness.
```

**7. Services: village at night**
```
A village at night. Oak and cobblestone houses with warm glowing windows, lanterns
on fences, a bell and a well, a winding gravel path, fireflies, a starry sky with a
square moon.
```

**8. Contact: Lush Caves**
```
A lush cave interior. A clear turquoise pool surrounded by moss and azalea bushes,
glow berry vines hanging from the ceiling with warm golden light, big dripleaf over
the water, spore blossoms, a shaft of daylight from a hole in the ceiling.
```

**9. The End**
```
The main End island. Pale yellow end stone, tall black obsidian pillars topped with
end crystals shooting purple beams, floating end islands and a distant End city,
a glowing End portal, chorus plants, a deep black-purple void sky.
```

---

## Fix-it lines (same thread, don't restart)

| Problem | Say |
|---|---|
| Too smooth or realistic | `Too smooth. Make everything strictly cubic, visible cube blocks with 16x16 textures, sharp edges.` |
| A person appeared | `Remove every character and person. The scene must be empty of people.` |
| Text appeared | `Remove all text, letters and signs. Leave those surfaces blank.` |
| Bottom too busy | `Simplify the bottom quarter: plain ground only, no objects.` |
| Panel side too busy | `Make the [left/right] third darker and calmer, with less detail, for UI overlay.` |
| Style drifted | `Match the attached image exactly for block style, lighting and colour grade.` |

---

## Video loops (optional; animate 3–4 screens at most)

Best candidates: title, cherry grove, deep dark, the end.

Start from your finished still (image-to-video), and open the prompt with both locks:
```
CRITICAL GEOMETRY: Preserve the blocky voxel geometry exactly. Every object stays
strictly cubic with sharp edges and visible 16x16 pixel textures for the whole clip.
Do NOT smooth, round, blur or add realistic detail.

CRITICAL EXPOSURE: Overall brightness stays CONSTANT across the clip. The final
frame must match the first frame's brightness.
```
Then: **slow camera drift plus ONE moving element** (clouds, petals, sculk pulse, crystal
beams). Go slower than feels right. Avoid walking characters, camera shake and scene changes.

**Specs:** 5–6 s, 1280×720 or 1920×1080, no audio, under about 1.5–5 MB, `.mp4` (`.webm` too if
you can). Also save the first frame as the still (`title.webp`), which is used while
loading and for reduced-motion visitors.

Optional compression (if you have ffmpeg):
```
ffmpeg -i in.mp4 -t 6 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 26 -preset slow -movflags +faststart title.mp4
ffmpeg -i in.mp4 -t 6 -an -vf "scale=1280:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 title.webm
ffmpeg -i in.mp4 -frames:v 1 -vf "scale=1920:-2" title.webp
```

---

## Midjourney: ready-to-paste one-liners

Shared ending (already included below):
`--ar 16:9 --style raw --no text, letters, people, character, player, mobs, smooth, rounded, photorealistic`

1. **title**: `Minecraft screenshot with shaders, blocky voxel world, cubic blocks with 16x16 pixel textures, plains valley at golden hour, rolling grass hills with flowers, small oak village, winding river, blocky mountains, square sun low on horizon, volumetric god rays, empty calm area on the left, open grass on the right, cinematic, vibrant --ar 16:9 --style raw --no text, letters, people, character, player, mobs, smooth, rounded, photorealistic`
2. **profile**: `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, giant spruce taiga clearing at dusk, 2x2 square spruce log trunks made of stacked log blocks, cone shaped spruce trees made of stepped cube leaf blocks, stepped podzol and coarse dirt block ground, lit Minecraft campfire block right of centre with pixel smoke rising, spruce log benches, fern and sweet berry bush sprites, warm firelight, cool blue mist between the trees, calm darker left side, open ground beside the campfire on the right, cinematic --ar 16:9 --style raw --sw 300 --no text, letters, people, character, player, mobs, realistic trees, real pine needles, organic foliage, real forest, smooth, rounded, photorealistic`
3. **skills**: `Minecraft screenshot with shaders, blocky voxel world, cubic blocks with 16x16 pixel textures, close-up eye-level shot of a brewing stand on a nether brick counter inside a nether fortress, brewing stand large in frame left of centre, three glowing potion bottles red purple and blue, blaze powder and nether wart on the counter, cauldron beside it, glowstone and shroomlight above casting warm light, blurred lava falls in the background bokeh, shallow depth of field, rising embers, deep red and orange light, dark calm right side, cinematic --ar 16:9 --style raw --no text, letters, people, character, player, mobs, smooth, rounded, photorealistic`
4. **projects**: `Minecraft screenshot with shaders, blocky voxel world, cubic blocks with 16x16 pixel textures, medium close-up eye-level shot of an open wooden Minecraft chest right of centre on a mineshaft rail ledge, the chest and ledge surrounded by Minecraft ore blocks, full cube diamond ore, emerald ore, gold ore and redstone ore blocks with pixel textured specks in stone, minecart beside the chest, lantern hanging on a chain above, behind it a sharp detailed deep ravine with oak support beams, a rickety rail bridge, a glowing purple amethyst geode in the wall and a thin waterfall, deep focus, everything in sharp focus, warm lantern light and cool purple glow, dark calm left side, cinematic --ar 16:9 --style raw --no text, letters, people, character, player, mobs, smooth, rounded, photorealistic, realistic gemstones, faceted crystals, bokeh, blur, depth of field`
5. **journey**: `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, high vantage point from the flat top of a tall terracotta mesa in the right foreground, overlooking a vast badlands biome stretching to the horizon, endless stepped terracotta mesas with horizontal orange, red, yellow, white and brown block stripes, deep canyons, red sand blocks, a dry riverbed winding through the valley, Minecraft cactus blocks and dead bushes, an abandoned mineshaft entrance in a distant mesa wall, late afternoon square sun, long shadows, flat slab clouds, epic sense of scale, open flat mesa top on the right for standing, cinematic, vibrant --ar 16:9 --style raw --sw 100 --no text, letters, people, character, player, mobs, realistic rocks, real desert, grand canyon photo, smooth, rounded, photorealistic`
6. **advancements**: `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, the deep dark, standing on a high deepslate cliff ledge in the left foreground overlooking a vast ancient city far below, enormous cavern stretching into darkness, deepslate brick and polished deepslate ruins, the giant warden portal frame of reinforced deepslate in the distance, sculk blocks spreading over everything, glowing cyan sculk sensors and veins pulsing in the dark, soul lanterns with pale blue light, cold blue-black palette, faint cyan mist far below, eerie and silent, dark empty void on the right, cinematic, high vantage point --ar 16:9 --style raw --no text, letters, people, character, player, mobs, warden, warm light, orange, fire, torches, sandstone, gold, sunlight, smooth, rounded, photorealistic`
7. **quests** (your house at night): `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, the outside of a cozy personal Minecraft house at night, a two storey spruce and cobblestone cabin with a dark oak roof, warm glowing windows and an open front porch, a wooden notice board of oak planks beside the front door with blank parchment papers pinned to it, lanterns on the porch posts, a jukebox and barrels on the porch, a small fenced garden with wheat and carrots, a small pond with a wooden fishing dock, flower pots, a gravel path to the door, fireflies, starry night sky with a square moon, warm lantern light vs cool blue night, house and porch right of centre, calm darker left side, open path in front of the porch on the right, cinematic --ar 16:9 --style raw --sw 100 --no text, letters, writing, people, character, player, villagers, mobs, village, smooth, rounded, photorealistic`
8. **contact**: `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, lush caves biome, a big cave chamber with a shaft of daylight falling through a hole in the ceiling, an azalea tree with flowering azalea leaf blocks growing at the hole, hanging cave vines with glowing glow berries, moss blocks and moss carpet covering the floor and walls, big dripleaf and small dripleaf, spore blossoms on the ceiling, a clear turquoise pool of flat layered water right of centre, clay and dripstone at the edges, warm golden glow berry light vs cool turquoise water, calm darker cave wall on the left, open moss floor beside the pool on the right, cinematic --ar 16:9 --style raw --sw 100 --no text, letters, people, character, player, mobs, axolotl, realistic plants, real cave, smooth, rounded, photorealistic`
9. **end**: `Minecraft Java Edition screenshot with BSL shaders, voxel game world, everything built from cube blocks with pixelated 16x16 textures, the End dimension, the main end island of pale yellow end stone blocks, tall black obsidian pillars with end crystals on top and iron bar cages, purple and pink crystal beams, the exit end portal of bedrock with a dragon egg on top, chorus plants and chorus flowers, small floating end stone islands and a distant purpur end city with an end ship in the void, end rod particles, a deep black purple starry void sky, calm low-detail open centre, open end stone ground on the right, cinematic, epic, mysterious --ar 16:9 --style raw --sw 100 --no text, letters, people, character, player, mobs, ender dragon, enderman, realistic rocks, planets, sci-fi, smooth, rounded, photorealistic`

**Consistency:** when one image looks right, copy its URL and add `--sref <that-url>` to
every other prompt (style reference). Optional: `--sw 200` makes the style match stronger.
**Sharpness:** use Midjourney's **Upscale (Subtle)** on the final pick, then download.
**Too smooth?** Add `voxel, cubic, pixelated textures` earlier in the prompt, or raise `--sw`.
