import { useState, type ReactNode } from 'react';

type TooltipProps = {
  title: ReactNode;
  body?: ReactNode;
  placement?: 'above' | 'below';
  children: ReactNode;
};

/** Minecraft item tooltip, shown on hover and keyboard focus. */
export function Tooltip({ title, body, placement = 'above', children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && <TooltipBox title={title} body={body} placement={placement} />}
    </span>
  );
}

export function TooltipBox({ title, body, placement = 'above' }: Omit<TooltipProps, 'children'>) {
  return (
    <span role="tooltip" className={`mc-tooltip ${placement === 'below' ? 'mc-tooltip--below' : ''}`}>
      <span className="mc-tooltip__title">{title}</span>
      {body && <span>{body}</span>}
    </span>
  );
}
