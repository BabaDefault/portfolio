import { useState } from 'react';
import { McButton } from '../ui/McButton';
import { useNav } from '../nav';
import { credits } from '../data/content';
import { sfx } from '../audio/sfx';
import './end.css';

export default function EndScreen() {
  const { go } = useNav();
  const [skipped, setSkipped] = useState(false);

  const respawn = () => {
    sfx.portal();
    go('title');
  };

  return (
    <section className={`end ${skipped ? 'end--static' : ''}`} aria-labelledby="end-title">
      <p className="end__kicker">{credits.heading}</p>
      <h2 id="end-title" className="end__title">
        The End
      </h2>

      <div className="end__viewport">
        <div className="end__roll">
          <div className="end__poem">
            {credits.lines.map((line) => (
              <p key={line} className="end__line">
                {line}
              </p>
            ))}
          </div>
          <dl className="end__roles">
            {credits.roles.map((r) => (
              <div key={r.role} className="end__role">
                <dt>{r.role}</dt>
                <dd>{r.name}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="end__actions">
        <McButton onClick={respawn} sound={null}>
          Respawn
        </McButton>
        <button
          type="button"
          className="end__skip"
          onClick={() => {
            sfx.click();
            setSkipped((s) => !s);
          }}
        >
          {skipped ? 'Roll credits' : 'Skip credits'}
        </button>
      </div>
    </section>
  );
}
