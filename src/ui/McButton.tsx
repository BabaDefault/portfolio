import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { sfx } from '../audio/sfx';

type Common = {
  children: ReactNode;
  block?: boolean;
  size?: 'md' | 'sm';
  sound?: keyof typeof sfx | null; // defaults to 'click'
};

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** Classic Minecraft menu button. Renders <a> when `href` is given. */
export function McButton(props: AsButton | AsLink) {
  const { children, block, size = 'md', sound = 'click', className = '', ...rest } = props;
  const cls = `mc-btn ${block ? 'mc-btn--block' : ''} ${size === 'sm' ? 'mc-btn--sm' : ''} ${className}`;
  const play = () => {
    if (sound) sfx[sound]();
  };

  if (typeof rest.href === 'string') {
    const { onClick, ...a } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    const external = /^https?:/.test(a.href ?? '');
    return (
      <a
        className={cls}
        {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        {...a}
        onClick={(e) => {
          play();
          onClick?.(e);
        }}
      >
        {children}
      </a>
    );
  }

  const { onClick, type = 'button', ...b } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={cls}
      type={type}
      {...b}
      onClick={(e) => {
        play();
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
