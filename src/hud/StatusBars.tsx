import { screens } from '../screens/registry';
import { ItemIcon } from '../ui/ItemIcon';

/** Hearts, hunger and the XP bar. XP fills as you progress through the screens; the level is the screen number. */
export function StatusBars({ index }: { index: number }) {
  const progress = screens.length > 1 ? index / (screens.length - 1) : 1;
  return (
    <div className="status" aria-hidden="true">
      <div className="status__row">
        <div className="status__icons">
          {Array.from({ length: 10 }, (_, i) => (
            <ItemIcon key={i} name="heart" size={14} />
          ))}
        </div>
        <div className="status__icons status__icons--right">
          {Array.from({ length: 10 }, (_, i) => (
            <ItemIcon key={i} name="hunger" size={14} />
          ))}
        </div>
      </div>
      <div className="xp">
        <div className="xp__fill" style={{ width: `${Math.max(3, progress * 100)}%` }} />
        <span className="xp__level">{index + 1}</span>
      </div>
    </div>
  );
}
