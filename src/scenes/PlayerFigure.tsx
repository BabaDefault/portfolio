import './player.css';

type PlayerFigureProps = {
  facing?: 'left' | 'right';
  height?: number; // px
};

/** [x, y, w, h, color] on a 32×64 grid (2× the classic 16×32 skin proportions). */
type Px = [number, number, number, number, string];

// palette — light comes from the viewer's left, so the left half is lit and the right half shaded
const HAIR = '#2a1c15';
const HAIR_L = '#433022';
const SKIN = '#dba57e';
const SKIN_L = '#e8b892';
const SKIN_S = '#c08660';
const SKIN_D = '#a26c4b';
const EYE = '#2b2230';
const WHITE = '#f4f1ec';
const MOUTH = '#99583f';
const H = '#ecebe7'; // plain white long-sleeve shirt
const H_L = '#fbfaf7';
const H_S = '#d3d1cc';
const H_D = '#b4b2ad';
const J = '#1d1d22'; // black pants
const J_L = '#2b2b31';
const J_S = '#16161a';
const J_D = '#0e0e11';
const SHOE = '#f2f2f2';
const SHOE_S = '#cfcfd2';
const SOLE = '#9b9ba0';

const HEAD: Px[] = [
  [8, 0, 16, 16, SKIN],
  // hair: short, dark, with a ragged fringe
  [8, 0, 16, 4, HAIR],
  [8, 4, 4, 2, HAIR],
  [12, 4, 3, 1, HAIR],
  [15, 4, 4, 2, HAIR],
  [19, 4, 5, 1, HAIR],
  [8, 6, 1, 3, HAIR],
  [10, 1, 6, 1, HAIR_L],
  [9, 2, 3, 1, HAIR_L],
  [17, 1, 3, 1, HAIR_L],
  // side of the head (3/4 view): hair, shaded skin, ear
  [20, 4, 4, 5, HAIR],
  [20, 9, 4, 7, SKIN_S],
  [19, 5, 1, 11, SKIN_S],
  [21, 9, 2, 3, SKIN_D],
  [21, 10, 1, 1, '#8c5a3e'],
  [23, 9, 1, 3, HAIR],
  // face: lit cheek, brows, eyes looking left, nose, mouth
  [9, 10, 2, 3, SKIN_L],
  [10, 8, 2, 1, HAIR],
  [15, 8, 3, 1, HAIR],
  [10, 9, 1, 2, EYE],
  [11, 9, 1, 2, WHITE],
  [15, 9, 1, 2, EYE],
  [16, 9, 1, 2, WHITE],
  [13, 11, 1, 2, SKIN_S],
  [12, 11, 1, 1, SKIN_L],
  [12, 13, 3, 1, MOUTH],
  [9, 15, 11, 1, SKIN_S],
];

const BODY: Px[] = [
  [8, 16, 16, 24, H],
  [8, 18, 2, 20, H_L],
  [20, 16, 4, 24, H_S],
  [23, 16, 1, 24, H_D],
  // crew neckline
  [12, 16, 8, 1, SKIN_S],
  [11, 17, 10, 1, H_S],
  // soft fabric folds
  [12, 24, 1, 3, H_S],
  [17, 29, 1, 4, H_S],
  // hem
  [8, 38, 16, 2, H_S],
  [20, 38, 4, 2, H_D],
];

const ARM_FRONT: Px[] = [
  [0, 16, 8, 19, H],
  [0, 16, 8, 1, H_L],
  [0, 17, 2, 16, H_L],
  [7, 16, 1, 19, H_D],
  [0, 33, 8, 2, H_D],
  [0, 35, 8, 5, SKIN],
  [0, 35, 8, 1, SKIN_S],
  [0, 36, 2, 3, SKIN_L],
  [6, 35, 2, 5, SKIN_S],
];

const ARM_BACK: Px[] = [
  [24, 16, 8, 19, H_S],
  [24, 16, 8, 1, H],
  [24, 16, 1, 19, H_D],
  [30, 16, 2, 19, H_D],
  [24, 33, 8, 2, H_D],
  [24, 35, 8, 5, SKIN_S],
  [24, 35, 8, 1, SKIN_D],
  [30, 35, 2, 5, SKIN_D],
];

const LEGS: Px[] = [
  [8, 38, 8, 20, J],
  [8, 38, 2, 18, J_L],
  [16, 38, 8, 20, J_S],
  [22, 38, 2, 20, J_D],
  [15, 40, 1, 16, J_D],
  // sneakers
  [8, 58, 8, 6, SHOE],
  [16, 58, 8, 6, SHOE_S],
  [22, 58, 2, 5, '#b0b0b4'],
  [10, 59, 3, 1, '#c9c9cc'],
  [18, 59, 3, 1, '#a9a9ad'],
  [8, 63, 8, 1, SOLE],
  [16, 63, 8, 1, '#7d7d82'],
];

function Rects({ list }: { list: Px[] }) {
  return (
    <>
      {list.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </>
  );
}

export function PlayerFigure({ facing = 'left', height = 360 }: PlayerFigureProps) {
  return (
    <svg
      className="player-fig"
      viewBox="0 0 32 64"
      width={height / 2}
      height={height}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g transform={facing === 'right' ? 'translate(32 0) scale(-1 1)' : undefined}>
        <Rects list={LEGS} />
        <g className="player-fig__upper">
          <g className="player-fig__arm player-fig__arm--back">
            <Rects list={ARM_BACK} />
          </g>
          <Rects list={BODY} />
          <Rects list={HEAD} />
          <g className="player-fig__arm player-fig__arm--front">
            <Rects list={ARM_FRONT} />
          </g>
        </g>
      </g>
    </svg>
  );
}
