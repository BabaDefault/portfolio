import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { site, splashes } from '../data/content';
import { useNav } from '../nav';
import { McButton } from '../ui/McButton';
import { isMuted, onMuteChange, setMuted, sfx } from '../audio/sfx';
import './title.css';

export default function TitleScreen() {
  const { go } = useNav();
  const [splash] = useState(() => splashes[Math.floor(Math.random() * splashes.length)] ?? '');
  const [muted, setMutedState] = useState(isMuted);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const splashRef = useRef<HTMLParagraphElement>(null);

  // Anchor the splash to the top-left of the 'J' (wherever the logo wraps), nudged right/up if it would leave the screen
  useLayoutEffect(() => {
    const logo = logoRef.current;
    const first = textRef.current?.firstChild;
    if (!logo || !first || !splashRef.current) return;
    const place = () => {
      const splashEl = splashRef.current;
      if (!splashEl) return;
      const range = document.createRange();
      range.setStart(first, 0);
      range.setEnd(first, 1);
      const j = range.getBoundingClientRect();
      const base = logo.getBoundingClientRect();
      const x = j.left - base.left;
      // .title-splash is centred on the anchor; keep 12px clear of the viewport edge
      const minX = splashEl.offsetWidth * 0.5 + 12 - base.left;
      const shift = Math.max(0, minX - x);
      logo.style.setProperty('--splash-x', `${x + shift}px`);
      // pushed over the letters: lift by the tilt so it still clears them
      logo.style.setProperty('--splash-y', `${j.top - base.top - shift * 0.27}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(logo);
    window.addEventListener('resize', place);
    void document.fonts?.ready.then(place);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [splash]);

  useEffect(() => {
    const off = onMuteChange(setMutedState);
    return () => {
      off();
    };
  }, []);

  const toggleSound = () => {
    if (muted) {
      setMuted(false);
      sfx.click();
    } else {
      sfx.click();
      setMuted(true);
    }
  };

  return (
    <div className="title-root">
      <div className="title-logo" ref={logoRef}>
        <h1 ref={textRef} className="title-logo__text" data-text={site.title}>
          {site.title}
        </h1>
        {splash && (
          <p ref={splashRef} className="title-splash" aria-label={`Splash: ${splash}`}>
            <span className="title-splash__inner">{splash}</span>
          </p>
        )}
      </div>
      <p className="title-subtitle">{site.subtitle}</p>

      <nav className="title-menu" aria-label="Main menu">
        <McButton block onClick={() => go('profile')}>
          Enter World
        </McButton>
        <McButton block onClick={() => go('projects')}>
          Singleplayer <span className="title-menu__hint">Projects</span>
        </McButton>
        <McButton block onClick={() => go('quests')}>
          Quest Board <span className="title-menu__hint">Side Quests</span>
        </McButton>
        <div className="title-menu__row">
          <McButton block sound={null} onClick={toggleSound}>
            <span className="title-menu__opt">Options:</span> Sound {muted ? 'OFF' : 'ON'}
          </McButton>
          <McButton block onClick={() => go('end')}>
            Quit Game
          </McButton>
        </div>
      </nav>

      <p className="title-footer">
        <span className="title-footer__version">{site.version}</span> {site.footer}
      </p>
    </div>
  );
}
