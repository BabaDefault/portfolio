import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { projects, type Project } from '../data/content';
import { worldThumb, playArrow } from '../icons/projects';
import { sfx } from '../audio/sfx';
import { useNav } from '../nav';
import { ProjectWorld } from './ProjectWorld';
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

  // "Play Selected World" opens the expanded view; Back returns with the same world selected.
  const [playing, setPlaying] = useState(false);
  const play = () => {
    if (selected < 0) return;
    sfx.portal();
    setPlaying(true);
  };
  const leave = () => {
    sfx.click();
    setPlaying(false);
  };

  // Coming back from a world: refocus the list on the selected row.
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (!playing && wasPlaying.current) {
      listRef.current?.focus({ preventScroll: true });
      if (selected >= 0) document.getElementById(optionId(projects[selected].id))?.scrollIntoView({ block: 'nearest' });
    }
    wasPlaying.current = playing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      play();
      return;
    }
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

  if (playing && current) {
    return <ProjectWorld project={current} modeClass={modeClass[current.mode]} onBack={leave} />;
  }

  return (
    <Panel
      title="Select World"
      aside={`${count} world${count === 1 ? '' : 's'}`}
      width={560}
      className="pj-panel"
      labelledBy="pj-title"
    >
      <p className="sr-only" id="pj-hint">
        Use the up and down arrow keys to choose a world, and Enter to open it.
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
            onDoubleClick={play}
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

      <div className="pj-actions">
        <McButton className="pj-actions__play" sound={null} disabled={!current} onClick={play}>
          Play Selected World
        </McButton>
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
