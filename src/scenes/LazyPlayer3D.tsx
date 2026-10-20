import { lazy, Suspense, type ComponentProps } from 'react';

// three.js + skinview3d are ~600 KB, so load them after the page has painted.
const Player3DImpl = lazy(() => import('./Player3D').then((m) => ({ default: m.Player3D })));

export function Player3D(props: ComponentProps<typeof Player3DImpl>) {
  return (
    <Suspense fallback={<div style={{ width: Math.round((props.height ?? 360) * 0.8), height: props.height ?? 360 }} />}>
      <Player3DImpl {...props} />
    </Suspense>
  );
}
