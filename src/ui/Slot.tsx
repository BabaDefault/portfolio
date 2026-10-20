import type { CSSProperties, ReactNode } from 'react';

type SlotProps = {
  children?: ReactNode;
  size?: number; // px, default 44
  dark?: boolean;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  label?: string; // accessible label when interactive
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

/** An inventory slot. Becomes a <button> when onClick is given. */
export function Slot({ children, size, dark, active, count, onClick, label, className = '', ...events }: SlotProps) {
  const cls = `slot ${dark ? 'slot--dark' : ''} ${active ? 'slot--active' : ''} ${className}`;
  const style = size ? ({ '--slot-size': `${size}px` } as CSSProperties) : undefined;
  const inner = (
    <>
      {children}
      {count !== undefined && count > 1 && <span className="slot__count">{count}</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick} aria-label={label} aria-pressed={active} {...events}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} style={style} aria-label={label} {...events}>
      {inner}
    </div>
  );
}
