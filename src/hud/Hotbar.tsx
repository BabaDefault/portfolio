import { useState, type WheelEvent } from 'react';
import { screens, type ScreenId } from '../screens/registry';
import { PixelIcon } from '../ui/PixelIcon';
import { ItemIcon } from '../ui/ItemIcon';
import { StatusBars } from './StatusBars';

type HotbarProps = {
  index: number;
  onSelect: (id: ScreenId) => void;
};

/** Bottom hotbar: 9 slots, one per screen. Wheel over it to cycle. */
export function Hotbar({ index, onSelect }: HotbarProps) {
  const [hover, setHover] = useState<number | null>(null);

  const onWheel = (e: WheelEvent) => {
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = (index + dir + screens.length) % screens.length;
    onSelect(screens[next].id);
  };

  const shown = hover ?? index;

  return (
    <div className="hotbar-wrap">
      <div className="hotbar-label" aria-hidden="true" key={shown}>
        {screens[shown].label}
      </div>
      <StatusBars index={index} />
      <nav className="hotbar" aria-label="Sections" onWheel={onWheel}>
        {screens.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`hotbar__slot ${i === index ? 'is-active' : ''}`}
            aria-current={i === index ? 'page' : undefined}
            aria-label={`${i + 1}: ${s.label}`}
            onClick={() => onSelect(s.id)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            {'art' in s.icon ? <PixelIcon art={s.icon.art} size={28} /> : <ItemIcon name={s.icon.name} size={28} />}
            <span className="hotbar__key">{i + 1}</span>
          </button>
        ))}
      </nav>
      <div className="hotbar-hint" aria-hidden="true">
        Press 1–9 or ← → · scroll the hotbar · F3 debug
      </div>
    </div>
  );
}
