// On-screen flight controls for phones and tablets: a joystick to steer (left/right turns,
// up/down climbs and dives) and buttons to boost and throw TNT.
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { flight } from '../flight';

const REACH = 42; // how far the knob travels, in px

export function TouchControls() {
  const knob = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ id: number; cx: number; cy: number } | null>(null);

  const setAxis = (x: number, y: number) => {
    flight.axis.x = x;
    flight.axis.y = y;
    if (knob.current) knob.current.style.transform = `translate(${(x * REACH).toFixed(1)}px, ${(y * REACH).toFixed(1)}px)`;
  };

  // let go of everything if the controls disappear mid-press (landing, map opening)
  useEffect(
    () => () => {
      flight.axis.x = flight.axis.y = 0;
      flight.input.boost = false;
    },
    [],
  );

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    onMove(e);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let x = (e.clientX - d.cx) / REACH;
    let y = (e.clientY - d.cy) / REACH;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    setAxis(x, y);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setAxis(0, 0);
  };

  const boost = (on: boolean) => () => {
    flight.input.boost = on;
  };

  return (
    <div className="fly-touch">
      <div className="fly-stick" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="presentation">
        <span className="fly-stick__knob" ref={knob} />
      </div>
      <div className="fly-touch__buttons">
        <button type="button" className="fly-touch__btn fly-touch__btn--tnt" onPointerDown={() => flight.fire++} aria-label="Throw TNT">
          TNT
        </button>
        <button
          type="button"
          className="fly-touch__btn fly-touch__btn--boost"
          onPointerDown={boost(true)}
          onPointerUp={boost(false)}
          onPointerCancel={boost(false)}
          onPointerLeave={boost(false)}
          aria-label="Boost (hold)"
        >
          Boost
        </button>
      </div>
    </div>
  );
}
