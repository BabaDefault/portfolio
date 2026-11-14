import { useId, useState, type ReactNode } from 'react';
import { profile } from '../data/content';
import { useNav } from '../nav';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { TooltipBox } from '../ui/Tooltip';
import { Player3D } from '../scenes/LazyPlayer3D';
import { armor } from '../icons/profile';
import { sfx } from '../audio/sfx';
import './profile.css';

/** A slot-styled button that shows a Minecraft tooltip on hover and focus. */
function TipSlot({
  label,
  title,
  body,
  align = 'center',
  placement = 'above',
  onActivate,
  children,
}: {
  label: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'start' | 'center' | 'end';
  placement?: 'above' | 'below';
  onActivate?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={`profile-tip profile-tip--${align}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="slot profile-tip__slot"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        onClick={onActivate}
      >
        {children}
      </button>
      {open && (
        <span id={id} className="profile-tip__box">
          <TooltipBox title={title} body={body} placement={placement} />
        </span>
      )}
    </span>
  );
}

export default function ProfileScreen() {
  const { go } = useNav();

  return (
    <Panel variant="stone" width={520} title="Player Profile" aside="Inventory" className="profile-panel" labelledBy="profile-title">
      <div className="profile-top">
        <ul className="profile-armor" aria-label="Equipped armor">
          {profile.traits.map((t, i) => (
            <li key={t.slot}>
              <TipSlot
                label={`${t.slot}: ${t.label} ${t.value}`}
                title={`${t.label}: ${t.value}`}
                body={<span className="profile-tip__kind">Iron {t.slot[0].toUpperCase() + t.slot.slice(1)}</span>}
                align="start"
                placement={i === 0 ? 'below' : 'above'}
                onActivate={() => sfx.pop()}
              >
                <PixelIcon art={armor[t.slot]} size={30} />
              </TipSlot>
            </li>
          ))}
        </ul>

        <div className="profile-preview" aria-label={`Player preview: ${profile.avatarCaption}`} role="img">
          <div className="profile-preview__figure">
            <Player3D pose="idle" facing="front" height={150} />
          </div>
          <span className="profile-preview__name">{profile.avatarCaption}</span>
        </div>

        <dl className="profile-traits">
          {profile.traits.map((t) => (
            <div className="profile-traits__row" key={t.slot}>
              <dt>{t.label}</dt>
              <dd>{t.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h3 className="profile-heading">Bio</h3>
      <p className="profile-bio">{profile.bio}</p>

      <div className="profile-actions">
        <McButton onClick={() => go('journey')}>View Journey</McButton>
      </div>
    </Panel>
  );
}
