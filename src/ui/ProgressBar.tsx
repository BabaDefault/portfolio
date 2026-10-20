import type { CSSProperties } from 'react';

type ProgressBarProps = {
  value: number; // 0–100
  color?: string;
  height?: number;
  label?: string;
  className?: string;
};

export function ProgressBar({ value, color, height, label, className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const style = { ...(color ? { '--bar-color': color } : {}), ...(height ? { '--bar-h': `${height}px` } : {}) } as CSSProperties;
  return (
    <div
      className={`mc-progress ${className}`}
      style={style}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="mc-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
