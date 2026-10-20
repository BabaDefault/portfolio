import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { ProgressBar } from '../ui/ProgressBar';
import { ItemIcon, type IconName } from '../ui/ItemIcon';
import { activeQuests, sideQuests, type QuestType } from '../data/content';
import { sfx } from '../audio/sfx';
import { useNav } from '../nav';
import './quests.css';

type TabId = 'active' | 'side';

const tabs: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'active', label: 'Active Quests', icon: 'item-star' },
  { id: 'side', label: 'Side Quests', icon: 'heart' },
];

const typeLabels: Record<QuestType, string> = {
  building: 'Building',
  learning: 'Learning',
  reading: 'Reading',
  hackathon: 'Hackathon',
  'open-source': 'Open Source',
};

/** Pinned notes are never quite straight. Deterministic per index so they don't jump on re-render. */
const TILTS = [-1.6, 1.2, -0.7, 1.8, -1.2, 0.8, -1.9, 1.4];
const tilt = (i: number) => ({ '--tilt': `${TILTS[i % TILTS.length]}deg` }) as CSSProperties;

/** Hovering across a row of notes shouldn't machine-gun the pop sound. */
let lastPop = 0;
function popThrottled() {
  const now = performance.now();
  if (now - lastPop < 140) return;
  lastPop = now;
  sfx.pop();
}

export default function QuestsScreen() {
  const { go } = useNav();
  const [tab, setTab] = useState<TabId>('active');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: TabId) => {
    if (id === tab) return;
    sfx.page();
    setTab(id);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === tab);
    const last = tabs.length - 1;
    let next = i;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    select(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <Panel
      title="Quest Board"
      aside={`${activeQuests.length} active quest${activeQuests.length === 1 ? '' : 's'}`}
      width={600}
      className="quests"
      labelledBy="quests-title"
    >
      <div className="quests-tabs" role="tablist" aria-label="Quest categories" data-arrow-nav onKeyDown={onTabKey}>
        {tabs.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`quests-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`quests-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              className={`quests-tab ${on ? 'quests-tab--active' : ''}`}
              onClick={() => select(t.id)}
            >
              <ItemIcon name={t.icon} size={20} />
              <span className="quests-tab__label">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="quests-board">
        {tab === 'active' ? (
          <div role="tabpanel" id="quests-panel-active" aria-labelledby="quests-tab-active">
            <h3 className="sr-only">Active Quests</h3>
            <ul className="quests-notes quests-notes--active">
              {activeQuests.map((q, i) => (
                <li key={q.title} className="quest-note" style={tilt(i)} onMouseEnter={popThrottled} onFocus={popThrottled}>
                  <span className={`quest-tag quest-tag--${q.type}`}>{typeLabels[q.type]}</span>
                  <h4 className="quest-note__title">{q.title}</h4>
                  <p className="quest-note__detail">{q.detail}</p>
                  <div className="quest-note__progress">
                    <span className="quest-note__meta" aria-hidden="true">
                      <span>Quest progress</span>
                      <span>{q.progress}%</span>
                    </span>
                    <ProgressBar value={q.progress} height={8} label={`${q.title}: quest progress ${q.progress}%`} />
                  </div>
                  {q.link && (
                    <McButton size="sm" href={q.link} className="quest-note__link" aria-label={`View ${q.title}`}>
                      View
                    </McButton>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div role="tabpanel" id="quests-panel-side" aria-labelledby="quests-tab-side">
            <h3 className="sr-only">Side Quests: hobbies and life</h3>
            <ul className="quests-notes quests-notes--side">
              {sideQuests.map((q, i) => (
                <li
                  key={q.title}
                  className="quest-note quest-note--side"
                  style={tilt(i + 3)}
                  tabIndex={0}
                  onMouseEnter={popThrottled}
                  onFocus={popThrottled}
                >
                  <span className="quest-note__icon" aria-hidden="true">
                    <ItemIcon name={q.icon} size={32} />
                  </span>
                  <h4 className="quest-note__title">{q.title}</h4>
                  <p className="quest-note__detail">{q.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="quests-footer">
        <p className="quests-hint mc-label">Got a quest for me?</p>
        <McButton onClick={() => go('contact')}>Talk to me</McButton>
      </div>
    </Panel>
  );
}
