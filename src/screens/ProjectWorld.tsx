import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { ProgressBar } from '../ui/ProgressBar';
import type { Project, ProjectImage } from '../data/content';
import { worldThumb } from '../icons/projects';
import { sfx } from '../audio/sfx';
import { projectImages } from './projectImages';

// "Loading terrain" stages shown before the world opens (skipped with reduced motion)
const stages = ['Initializing server', 'Preparing spawn area', 'Building terrain'];
const LOAD_MS = 900;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Props = {
  project: Project;
  modeClass: string;
  onBack: () => void;
};

/** The expanded view of one project: a short MC loading screen, then details + screenshots. */
export function ProjectWorld({ project: p, modeClass, onBack }: Props) {
  const images = useMemo(() => projectImages(p), [p]);
  const [progress, setProgress] = useState(() => (reducedMotion() ? 100 : 0));
  const ready = progress >= 100;
  const [shot, setShot] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fake loading bar, like joining a singleplayer world
  useEffect(() => {
    if (ready) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / LOAD_MS);
      setProgress(Math.round(t * 100));
      if (t >= 1) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    sfx.levelUp();
    titleRef.current?.focus({ preventScroll: true });
  }, [ready]);

  const step = (d: number) => {
    if (images.length < 2) return;
    sfx.page();
    setShot((s) => (s + d + images.length) % images.length);
  };

  // Esc closes the enlarged screenshot, then the world. ←/→ flip screenshots.
  // Capture phase + preventDefault so App's global keys (Esc → title, ←/→ → next screen) skip it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (zoomed) setZoomed(false);
        else onBack();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && ready && images.length > 1) {
        e.preventDefault();
        step(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Move focus into the enlarged view and back out again
  const wasZoomed = useRef(false);
  useEffect(() => {
    if (zoomed) closeRef.current?.focus();
    else if (wasZoomed.current) mainRef.current?.focus({ preventScroll: true });
    wasZoomed.current = zoomed;
  }, [zoomed]);

  // Keep Tab inside the enlarged view
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const items = e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!ready) {
    const stage = stages[Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))];
    return (
      <Panel className="pj-panel pj-world pj-world--loading" width={780} as="div">
        <div className="pj-loading" role="status">
          <p className="pj-loading__title">Loading “{p.name}”</p>
          <p className="pj-loading__stage">{stage}…</p>
          <ProgressBar value={progress} height={12} label="Loading world" className="pj-loading__bar" />
        </div>
      </Panel>
    );
  }

  const current: ProjectImage | undefined = images[shot];

  return (
    <Panel
      title={
        <span ref={titleRef} tabIndex={-1} className="pj-world__title">
          {p.name}
        </span>
      }
      aside={p.year}
      width={780}
      className="pj-panel pj-world"
      labelledBy="pj-world-title"
    >
      <div className="pj-world__body">
        <div className="pj-gallery" data-arrow-nav>
          {current ? (
            <>
              <figure className="pj-gallery__figure">
                <button
                  ref={mainRef}
                  type="button"
                  className="pj-gallery__main"
                  onClick={() => {
                    sfx.pop();
                    setZoomed(true);
                  }}
                  aria-label={`Enlarge screenshot: ${current.alt}`}
                >
                  <img key={current.src} src={current.src} alt={current.alt} decoding="async" />
                </button>
                <figcaption className="pj-gallery__caption" aria-live="polite">
                  {current.caption ?? current.alt}
                  {images.length > 1 && (
                    <span className="pj-gallery__count">
                      {shot + 1} / {images.length}
                    </span>
                  )}
                </figcaption>
              </figure>
              {images.length > 1 && (
                <div className="pj-gallery__strip">
                  <McButton size="sm" sound={null} onClick={() => step(-1)} aria-label="Previous screenshot">
                    ◀
                  </McButton>
                  <ul className="pj-gallery__thumbs" aria-label="Screenshots">
                    {images.map((img, i) => (
                      <li key={img.src}>
                        <button
                          type="button"
                          className={`pj-gallery__thumb ${i === shot ? 'pj-gallery__thumb--on' : ''}`}
                          aria-label={`Screenshot ${i + 1}: ${img.alt}`}
                          aria-current={i === shot || undefined}
                          onClick={() => {
                            if (i !== shot) sfx.click();
                            setShot(i);
                          }}
                        >
                          <img src={img.src} alt="" loading="lazy" decoding="async" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <McButton size="sm" sound={null} onClick={() => step(1)} aria-label="Next screenshot">
                    ▶
                  </McButton>
                </div>
              )}
            </>
          ) : (
            <div className="pj-gallery__empty">
              <span className="pj-painting" aria-hidden="true">
                <PixelIcon art={worldThumb(p.id, p.thumb.sky, p.thumb.ground)} size={96} />
              </span>
              <p className="pj-gallery__empty-title">No screenshots yet</p>
              <p className="pj-gallery__empty-text">This world hasn’t been mapped. Check back soon!</p>
            </div>
          )}
        </div>

        <div className="pj-world__info">
          <p className="pj-world__meta">
            <span className={`pj-mode ${modeClass}`}>{p.mode} Mode</span>
            {images.length > 0 && (
              <>
                {' '}
                · {images.length} screenshot{images.length === 1 ? '' : 's'}
              </>
            )}
          </p>
          <p className="pj-world__summary">{p.summary}</p>
          <p className="pj-world__desc">{p.description}</p>
          {p.highlights && p.highlights.length > 0 && (
            <>
              <h3 className="pj-world__heading">Highlights</h3>
              <ul className="pj-world__highlights">
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
          {p.tags.length > 0 && (
            <ul className="pj-tags" aria-label="Tags">
              {p.tags.map((t) => (
                <li key={t} className="pj-tag">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="pj-actions pj-world__actions">
        {p.live && (
          <McButton href={p.live} sound="levelUp">
            Visit Live Site
          </McButton>
        )}
        {p.repo && <McButton href={p.repo}>View Source</McButton>}
        <McButton onClick={onBack} className="pj-world__back">
          Back to Worlds
        </McButton>
      </div>

      {/* Portal: the panel's backdrop-filter would otherwise trap a fixed overlay inside it */}
      {zoomed &&
        current &&
        createPortal(
        <div
          className="pj-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onKeyDown={trapTab}
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomed(false);
          }}
        >
          <figure className="pj-zoom__figure">
            <img src={current.src} alt={current.alt} decoding="async" />
            <figcaption className="pj-gallery__caption">
              {current.caption ?? current.alt}
              {images.length > 1 && (
                <span className="pj-gallery__count">
                  {shot + 1} / {images.length}
                </span>
              )}
            </figcaption>
          </figure>
          <div className="pj-zoom__actions">
            {images.length > 1 && (
              <McButton size="sm" sound={null} onClick={() => step(-1)} aria-label="Previous screenshot">
                ◀
              </McButton>
            )}
            {/* plain button: McButton doesn't forward refs */}
            <button
              ref={closeRef}
              type="button"
              className="mc-btn mc-btn--sm"
              onClick={() => {
                sfx.click();
                setZoomed(false);
              }}
            >
              Done
            </button>
            {images.length > 1 && (
              <McButton size="sm" sound={null} onClick={() => step(1)} aria-label="Next screenshot">
                ▶
              </McButton>
            )}
          </div>
        </div>,
          document.body,
        )}
    </Panel>
  );
}
