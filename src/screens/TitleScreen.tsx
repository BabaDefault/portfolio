import { useEffect, useState } from 'react';
import { site, splashes } from '../data/content';
import { useNav } from '../nav';
import { McButton } from '../ui/McButton';
import { isMuted, onMuteChange, setMuted, sfx } from '../audio/sfx';
import './title.css';

export default function TitleScreen() {
  const { go } = useNav();
  const [splash] = useState(() => splashes[Math.floor(Math.random() * splashes.length)] ?? '');
  const [muted, setMutedState] = useState(isMuted);

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
      <div className="title-logo">
        <h1 className="title-logo__text" data-text={site.title}>
          {site.title}
        </h1>
        {splash && (
          <p className="title-splash" aria-label={`Splash: ${splash}`}>
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
