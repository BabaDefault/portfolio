import type { CSSProperties, ReactNode } from 'react';

type PanelProps = {
  title?: ReactNode;
  aside?: ReactNode; // small text on the right of the header
  footer?: ReactNode;
  variant?: 'dark' | 'stone' | 'parchment';
  width?: number; // max width in px
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: 'section' | 'div' | 'article';
  labelledBy?: string;
};

export function Panel({
  title,
  aside,
  footer,
  variant = 'dark',
  width,
  className = '',
  style,
  children,
  as: Tag = 'section',
  labelledBy,
}: PanelProps) {
  const css = { ...(width ? { '--panel-w': `${width}px` } : {}), ...style } as CSSProperties;
  return (
    <Tag className={`panel panel--${variant} ${className}`} style={css} aria-labelledby={labelledBy}>
      {(title || aside) && (
        <header className="panel__header">
          {title && (
            <h2 className="panel__title" id={labelledBy}>
              {title}
            </h2>
          )}
          {aside && <span className="panel__aside">{aside}</span>}
        </header>
      )}
      {children}
      {footer && <footer className="panel__footer">{footer}</footer>}
    </Tag>
  );
}
