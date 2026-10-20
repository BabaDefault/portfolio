import { memo } from 'react';

/**
 * A pixel-art icon defined as a string grid.
 * Each character maps to a color in `palette`; '.' (or any unmapped char) is transparent.
 *
 *   const sword: PixelArt = {
 *     palette: { a: '#fff', b: '#6b4a2b' },
 *     grid: ['...a', '..a.', '.b..', 'b...'],
 *   };
 */
export type PixelArt = {
  palette: Record<string, string>;
  grid: string[];
};

type PixelIconProps = {
  art: PixelArt;
  size?: number; // rendered px (square), default 32
  title?: string; // accessible name; omitted → decorative
  className?: string;
};

export const PixelIcon = memo(function PixelIcon({ art, size = 32, title, className = '' }: PixelIconProps) {
  const h = art.grid.length;
  const w = Math.max(...art.grid.map((r) => r.length));
  const rects: JSX.Element[] = [];
  art.grid.forEach((row, y) => {
    // merge horizontal runs of the same color to keep the DOM small
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const color = art.palette[ch];
      if (!color) {
        x++;
        continue;
      }
      let run = 1;
      while (row[x + run] === ch) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={color} />);
      x += run;
    }
  });
  return (
    <svg
      className={`pixel-icon ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
});
