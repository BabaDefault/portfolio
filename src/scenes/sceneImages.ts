// Picks up optional backgrounds from src/assets/scenes/<screenId>.<ext>.
// Missing media falls back to the code-drawn biome. See src/assets/scenes/README.md.
//   <id>.webp|jpg|png|avif   still image (also used as the video poster / fallback)
//   <id>.mobile.<img ext>    optional portrait crop for phones
//   <id>.mp4|webm            optional looping video background

const files = import.meta.glob('../assets/scenes/*.{webp,jpg,jpeg,png,avif,mp4,webm}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type SceneMedia = { image?: string; mobile?: string; video?: string; videoType?: string };

const media: Record<string, SceneMedia> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop()!;
  const ext = name.split('.').pop()!.toLowerCase();
  const [id, variant] = name.slice(0, -(ext.length + 1)).split('.');
  const m = (media[id] ??= {});
  if (ext === 'mp4' || ext === 'webm') {
    // prefer webm when both exist
    if (!m.video || ext === 'webm') {
      m.video = url;
      m.videoType = `video/${ext}`;
    }
  } else if (variant === 'mobile') m.mobile = url;
  else m.image = url;
}

export function sceneMedia(screenId: string): SceneMedia | undefined {
  const m = media[screenId];
  return m && (m.image || m.video) ? m : undefined;
}
