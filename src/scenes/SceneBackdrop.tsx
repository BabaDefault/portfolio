import { useEffect, useRef } from 'react';
import type { SceneMedia } from './sceneImages';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type SceneBackdropProps = {
  media: SceneMedia;
  /** Reports the media's natural size so effects can be aligned to it. */
  onSize?: (size: { w: number; h: number }) => void;
};

/** Image or looping video background. Reduced motion shows the still image (or the paused first frame). */
export function SceneBackdrop({ media, onSize }: SceneBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    // Pause when the tab is hidden to save battery.
    const onVis = () => (document.hidden ? v.pause() : void v.play().catch(() => {}));
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reduced]);

  if (media.video && !(reduced && media.image)) {
    return (
      <video
        ref={videoRef}
        className="scene-image"
        poster={media.image}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedMetadata={(e) => onSize?.({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
      >
        <source src={media.video} type={media.videoType} />
      </video>
    );
  }

  return (
    <picture>
      {media.mobile && <source media="(max-width: 700px) and (orientation: portrait)" srcSet={media.mobile} />}
      <img
        className="scene-image"
        src={media.image}
        alt=""
        onLoad={(e) => onSize?.({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
    </picture>
  );
}
