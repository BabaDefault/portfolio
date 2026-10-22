import { useMemo, useState, type CSSProperties } from 'react';
import { Panel } from '../ui/Panel';
import { McButton } from '../ui/McButton';
import { PixelIcon } from '../ui/PixelIcon';
import { ItemIcon, type IconName } from '../ui/ItemIcon';
import { advancements, type Advancement } from '../data/content';
import { frameArt, netherrackTab, endStoneTab } from '../icons/advancements';
import { sfx } from '../audio/sfx';
import { useNav } from '../nav';
import './advancements.css';

/** PNG item icon for each advancement icon key. */
const advIcons: Record<Advancement['icon'], IconName> = {
  grass: 'hero',
  sword: 'adv-inventory',
  diamond: 'adv-hot',
  book: 'craft-books',
  eye: 'adv-world',
  star: 'item-star',
  trophy: 'adv-dragon',
};

// Tree geometry (px)
const NODE = 44;
const COL = 82;
const ROW = 62;
const PAD = 24;
const TIP_W = 208;
const TIP_BAR = 24; // tooltip title bar height (matches .adv-tip__bar min-height)

type Placed = Advancement & { depth: number; row: number; x: number; y: number; cx: number; cy: number };
type Seg = { key: string; left: number; top: number; width: number; height: number; lit: boolean };

/** Depth → column, siblings → rows (leaves get consecutive rows, parents sit between their children). */
function layout(items: Advancement[]) {
  const ids = new Set(items.map((a) => a.id));
  const children = new Map<string, Advancement[]>();
  const roots: Advancement[] = [];
  for (const a of items) {
    if (a.parent && ids.has(a.parent)) {
      const list = children.get(a.parent) ?? [];
      list.push(a);
      children.set(a.parent, list);
    } else roots.push(a);
  }

  const placed = new Map<string, Placed>();
  let nextRow = 0;
  const visit = (a: Advancement, depth: number, trail: Set<string>): number => {
    const kids = (children.get(a.id) ?? []).filter((k) => !trail.has(k.id));
    let row: number;
    if (kids.length === 0) row = nextRow++;
    else {
      const next = new Set(trail).add(a.id);
      const rows = kids.map((k) => visit(k, depth + 1, next));
      row = (rows[0] + rows[rows.length - 1]) / 2;
    }
    const x = PAD + depth * COL;
    const y = PAD + row * ROW;
    placed.set(a.id, { ...a, depth, row, x, y, cx: x + NODE / 2, cy: y + NODE / 2 });
    return row;
  };
  roots.forEach((r) => visit(r, 0, new Set()));

  const nodes = items.map((a) => placed.get(a.id)).filter((n): n is Placed => !!n);
  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
  const maxRow = Math.max(0, ...nodes.map((n) => n.row));
  const width = PAD * 2 + maxDepth * COL + NODE;
  const height = PAD * 2 + maxRow * ROW + NODE;

  // Right-angle connectors: parent → elbow → each child.
  const segs: Seg[] = [];
  for (const [pid, kids] of children) {
    const p = placed.get(pid);
    if (!p) continue;
    const ks = kids.map((k) => placed.get(k.id)).filter((k): k is Placed => !!k);
    if (!ks.length) continue;
    const mid = p.cx + COL / 2;
    const ys = [p.cy, ...ks.map((k) => k.cy)];
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    segs.push({ key: `${pid}-h`, left: p.cx, top: p.cy - 1, width: mid - p.cx, height: 2, lit: p.unlocked });
    if (bottom > top) segs.push({ key: `${pid}-v`, left: mid - 1, top, width: 2, height: bottom - top, lit: p.unlocked });
    for (const k of ks)
      segs.push({ key: `${pid}-${k.id}`, left: mid - 1, top: k.cy - 1, width: k.cx - mid + 1, height: 2, lit: k.unlocked });
  }

  return { nodes, segs, width, height };
}

export default function AdvancementsScreen() {
  const { go } = useNav();
  const { nodes, segs, width, height } = useMemo(() => layout(advancements), []);
  const [active, setActive] = useState<string | null>(null);

  const unlocked = advancements.filter((a) => a.unlocked).length;
  const activeNode = nodes.find((n) => n.id === active);

  const onNodeClick = (n: Placed) => {
    if (n.unlocked) sfx.xp();
    else sfx.deny();
    setActive(n.id);
  };

  const canvasStyle = { width: `${width}px`, height: `${height}px` } as CSSProperties;

  return (
    <Panel
      title="Advancements"
      aside={`${unlocked}/${advancements.length} unlocked`}
      width={480}
      className="adv-panel"
      labelledBy="adv-title"
    >
      <div className="adv-window">
        <div className="adv-tabs" role="tablist" aria-label="Advancement categories">
          <button type="button" role="tab" aria-selected="true" className="adv-tab adv-tab--active" title="Story">
            <ItemIcon name={advIcons.grass} size={16} />
            <span className="adv-tab__label">Story</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            className="adv-tab"
            title="Nether (coming soon)"
            onClick={() => sfx.deny()}
          >
            <PixelIcon art={netherrackTab} size={16} title="Nether (coming soon)" />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            className="adv-tab"
            title="The End (coming soon)"
            onClick={() => sfx.deny()}
          >
            <PixelIcon art={endStoneTab} size={16} title="The End (coming soon)" />
          </button>
        </div>

        <div className="adv-frame" role="tabpanel" aria-label="Story">
          <div className="adv-scroll" onMouseLeave={() => setActive(null)}>
            <div className="adv-canvas" style={canvasStyle}>
              {/* Connector outlines first, then fills, so junctions stay clean like MC */}
              {segs.map((s) => (
                <span
                  key={`o-${s.key}`}
                  className="adv-line adv-line--outline"
                  style={{ left: s.left - 2, top: s.top - 2, width: s.width + 4, height: s.height + 4 }}
                />
              ))}
              {segs.map((s) => (
                <span
                  key={`f-${s.key}`}
                  className={`adv-line ${s.lit ? 'adv-line--lit' : ''}`}
                  style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
                />
              ))}

              <ul className="adv-nodes">
                {nodes.map((n) => {
                  const frame = n.frame ?? 'task';
                  return (
                    <li key={n.id} className={`adv-node-item ${active === n.id ? 'adv-node-item--active' : ''}`} style={{ left: n.x, top: n.y }}>
                      <button
                        type="button"
                        className={`adv-node adv-node--${frame} ${n.unlocked ? 'adv-node--unlocked' : 'adv-node--locked'} ${
                          active === n.id ? 'adv-node--active' : ''
                        }`}
                        aria-label={`${n.title}: ${n.description} (${n.unlocked ? 'unlocked' : 'locked'}${
                          frame === 'challenge' ? ', challenge' : frame === 'goal' ? ', goal' : ''
                        })`}
                        onMouseEnter={() => setActive(n.id)}
                        onFocus={() => setActive(n.id)}
                        onBlur={() => setActive((a) => (a === n.id ? null : a))}
                        onClick={() => onNodeClick(n)}
                      >
                        <PixelIcon art={frameArt(frame, n.unlocked)} size={NODE} className="adv-node__frame" />
                        <ItemIcon name={advIcons[n.icon]} size={24} className="adv-node__icon" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {activeNode && <AdvTooltip node={activeNode} canvasW={width} canvasH={height} />}
            </div>
          </div>
        </div>
      </div>

      <div className="adv-footer">
        <p className="adv-hint mc-label">Hover, focus or tap a node</p>
        <McButton onClick={() => go('contact')}>Send a Message</McButton>
      </div>
    </Panel>
  );
}

function AdvTooltip({ node, canvasW, canvasH }: { node: Placed; canvasW: number; canvasH: number }) {
  const flip = node.x + TIP_W > canvasW; // extend leftwards when near the right edge
  const above = node.cy > canvasH / 2; // description above the bar on lower nodes
  const frame = node.frame ?? 'task';
  const tone = !node.unlocked ? 'locked' : frame === 'challenge' ? 'challenge' : 'unlocked';
  const style: CSSProperties = {
    width: TIP_W,
    top: node.y + (NODE - TIP_BAR) / 2,
    ...(flip ? { left: node.x + NODE - TIP_W } : { left: node.x }),
  };
  return (
    <div
      className={`adv-tip adv-tip--${tone} ${flip ? 'adv-tip--flip' : ''} ${above ? 'adv-tip--above' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <div className="adv-tip__bar">{node.title}</div>
      <div className="adv-tip__desc">
        {node.description}
        {!node.unlocked && <span className="adv-tip__state">Locked</span>}
      </div>
    </div>
  );
}
