import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { projects, type Project } from '../data/content';
import { worldThumb, playArrow } from '../icons/projects';
import { sfx } from '../audio/sfx';
import { useNav } from '../nav';
import './projects.css';

const modeClass: Record<Project['mode'], string> = {
  Creative: 'pj-mode--creative',
  Survival: 'pj-mode--survival',
  Hardcore: 'pj-mode--hardcore',
  Adventure: 'pj-mode--adventure',
};

const optionId = (id: string) => `pj-world-${id}`;

export default function ProjectsScreen() {
  const { go } = useNav();
  const [selected, setSelected] = useState(projects.length ? 0 : -1);
  const seen = useRef(new Set<string>(projects.length ? [projects[0].id] : []));
  const listRef = useRef<HTMLUListElement>(null);

  const select = (i: number) => {
    if (i < 0 || i >= projects.length) return;
    const p = projects[i];
    if (!seen.current.has(p.id)) {
      seen.current.add(p.id);
      sfx.chest();
    } else if (i !== selected) {
      sfx.click();
    }
    setSelected(i);
  };

  // Keep the selected row in view when moving with the keyboard.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (selected < 0) return;
    const el = document.getElementById(optionId(projects[selected].id));
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = projects.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = Math.min(last, selected + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, selected - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next !== null) {
      e.preventDefault();
      select(next);
    }
  };

  const current = selected >= 0 ? projects[selected] : undefined;
  const count = projects.length;

  return (
    <Panel
      title="Select World"
      aside={`${count} world${count === 1 ? '' : 's'}`}
      width={560}
      className="pj-panel"
      labelledBy="pj-title"
    >
      <p className="sr-only" id="pj-hint">
        Use the up and down arrow keys to choose a world.
      </p>
      <ul
        ref={listRef}
        className="pj-list"
        role="listbox"
        tabIndex={0}
        aria-labelledby="pj-title"
        aria-describedby="pj-hint"
        aria-activedescendant={current ? optionId(current.id) : undefined}
        onKeyDown={onKey}
      >
        {projects.map((p, i) => (
          <li
            key={p.id}
            id={optionId(p.id)}
            role="option"
            aria-selected={i === selected}
            className={`pj-row ${i === selected ? 'pj-row--selected' : ''}`}
            onClick={() => {
              select(i);
              listRef.current?.focus({ preventScroll: true });
            }}
          >
            <span className="pj-thumb">
              <PixelIcon art={worldThumb(p.id, p.thumb.sky, p.thumb.ground)} size={64} />
              <span className="pj-thumb__play" aria-hidden="true">
                <PixelIcon art={playArrow} size={64} />
              </span>
            </span>
            <span className="pj-row__text">
              <span className="pj-row__name">{p.name}</span>
              <span className="pj-row__line">{p.summary}</span>
              <span className="pj-row__line">
                {p.year} · <span className={`pj-mode ${modeClass[p.mode]}`}>{p.mode}</span>
                {p.tags.length > 0 && <> · {p.tags.join(', ')}</>}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="pj-detail" aria-live="polite">
        {current ? (
          <>
            <h3 className="pj-detail__title">
              {current.name} <span className={`pj-mode ${modeClass[current.mode]}`}>{current.mode} Mode</span>
            </h3>
            <p className="pj-detail__desc">{current.description}</p>
            {current.tags.length > 0 && (
              <ul className="pj-tags" aria-label="Tags">
                {current.tags.map((t) => (
                  <li key={t} className="pj-tag">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="pj-detail__desc mc-dim">Select a world to see its details.</p>
        )}
      </div>

      <div className="pj-actions">
        {current?.live ? (
          <McButton href={current.live} className="pj-actions__play" sound="levelUp">
            Play Selected World
          </McButton>
        ) : (
          <McButton disabled className="pj-actions__play" sound={null}>
            Play Selected World
          </McButton>
        )}
        {current?.repo ? (
          <McButton href={current.repo}>Edit</McButton>
        ) : (
          <McButton disabled sound={null}>
            Edit
          </McButton>
        )}
        <McButton onClick={() => go('title')}>Back</McButton>
      </div>
    </Panel>
  );
}
