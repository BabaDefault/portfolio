import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { skills } from '../data/content';
import { Panel } from '../ui/Panel';
import { PixelIcon } from '../ui/PixelIcon';
import { ProgressBar } from '../ui/ProgressBar';
import { potionArt } from '../icons/skills';
import { sfx } from '../audio/sfx';
import './skills.css';

const BUBBLES = 5;

export default function SkillsScreen() {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const skill = skills[selected];

  const select = (i: number) => {
    if (i !== selected) sfx.pop();
    setSelected(i);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const cols = window.matchMedia('(max-width: 520px)').matches ? 2 : 3;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next: number | undefined;
    if (e.key in moves) next = i + moves[e.key];
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = skills.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    next = Math.max(0, Math.min(skills.length - 1, next));
    refs.current[next]?.focus();
    select(next);
  };

  if (!skill) return null;
  const tint = { '--potion-color': skill.color } as CSSProperties;

  return (
    <Panel
      variant="dark"
      width={420}
      title="Brewing Stand"
      aside="Skills"
      labelledBy="skills-title"
      className="skills-panel"
      footer={<span className="skills-hint">Select a potion to inspect it</span>}
    >
      <div className="skills-stand" style={tint}>
        <div className="skills-stand__fuel">
          <span className="skills-stand__label">Level</span>
          <ProgressBar value={skill.level} color="var(--mc-gold)" height={14} label={`${skill.name} level`} className="skills-fuel" />
          <span className="skills-stand__value">{skill.level}%</span>
        </div>

        <div className="skills-stand__brew">
          <div className="skills-bubbles" aria-hidden="true" key={selected}>
            {Array.from({ length: BUBBLES }, (_, b) => (
              <span key={b} className="skills-bubbles__b" />
            ))}
          </div>
          <div className="skills-stand__slot" key={`p-${selected}`}>
            <PixelIcon art={potionArt(skill.level, skill.color)} size={60} title={`Potion of ${skill.name}`} />
          </div>
        </div>

        <div className="skills-stand__detail" aria-live="polite">
          <h3 className="skills-stand__name">
            Potion of {skill.name} {skill.tier}
          </h3>
          <p className="skills-effect">
            {skill.name} {skill.tier} <span className="skills-effect__dur">({skill.duration})</span>
          </p>
          <p className="skills-stand__text">{skill.detail}</p>
        </div>
      </div>

      <ul className="skills-grid" aria-label="Skill potions">
        {skills.map((s, i) => (
          <li key={s.name}>
            <button
              type="button"
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`skills-potion ${i === selected ? 'is-selected' : ''}`}
              aria-pressed={i === selected}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="slot slot--dark skills-potion__slot">
                <PixelIcon art={potionArt(s.level, s.color)} size={28} />
              </span>
              <span className="skills-potion__text">
                <span className="skills-potion__name">
                  Potion of {s.name} {s.tier}
                </span>
                <span className="skills-potion__dur">({s.duration})</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
