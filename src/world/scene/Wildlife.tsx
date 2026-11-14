// Life between the islands: sailboats drifting on slow loops, hot-air balloons, and flocks of
// blocky birds circling. Everything is built from boxes in a single instanced mesh.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SEA } from '../consts';
import type { World } from '../generate';
import { hash3 } from '../noise';

/** One box of a creature: offset, size and colour in the creature's own space. */
type Part = { o: [number, number, number]; s: [number, number, number]; c: string; flap?: 1 | -1 };
type Thing = { parts: Part[]; update(t: number, out: THREE.Object3D): void };

const BOAT = (sail: string): Part[] => [
  { o: [0, 0.4, 0], s: [2.2, 0.8, 5], c: '#7a5230' },
  { o: [0, 0.5, 3], s: [1.4, 0.7, 1.2], c: '#7a5230' },
  { o: [0, 0.9, -2.2], s: [2.2, 0.5, 0.6], c: '#5e3d22' },
  { o: [0, 3.4, 0.3], s: [0.3, 5.4, 0.3], c: '#4a3222' },
  { o: [0, 3.8, 0.9], s: [0.15, 3.6, 2.6], c: sail },
  { o: [0, 2.6, -1], s: [0.15, 1.8, 1.4], c: sail },
];

const BALLOON = (a: string, b: string): Part[] => [
  { o: [0, 7, 0], s: [5, 4, 5], c: a },
  { o: [0, 9.6, 0], s: [3.6, 1.4, 3.6], c: b },
  { o: [0, 4.4, 0], s: [3.4, 1.4, 3.4], c: b },
  { o: [0, 3.3, 0], s: [2, 0.9, 2], c: a },
  { o: [0, 0.6, 0], s: [1.4, 1.1, 1.4], c: '#7a5230' },
  { o: [0.6, 1.9, 0.6], s: [0.1, 1.8, 0.1], c: '#3a2a1a' },
  { o: [-0.6, 1.9, -0.6], s: [0.1, 1.8, 0.1], c: '#3a2a1a' },
];

const BIRD = (body: string, wing: string): Part[] => [
  { o: [0, 0, 0], s: [0.35, 0.3, 0.9], c: body },
  { o: [0, 0.05, 0.55], s: [0.25, 0.25, 0.3], c: '#f2c14a' },
  { o: [0.55, 0.05, 0], s: [0.8, 0.08, 0.5], c: wing, flap: 1 },
  { o: [-0.55, 0.05, 0], s: [0.8, 0.08, 0.5], c: wing, flap: -1 },
];

function build(world: World): Thing[] {
  const things: Thing[] = [];
  const ring = world.islands.filter((i) => i.def.floatY === undefined);

  // sailboats on wide circles through the channels between islands
  const sails = ['#f4efe0', '#e8c8d8', '#cfe4f2', '#f2dca0', '#f4efe0', '#d8f0d0'];
  sails.forEach((sail, i) => {
    const radius = i % 2 === 0 ? 250 : 96 + i * 4;
    const speed = (i % 2 === 0 ? 0.012 : -0.02) * (0.8 + hash3(i, 1, 2) * 0.5);
    const phase = (i / sails.length) * Math.PI * 2;
    things.push({
      parts: BOAT(sail),
      update(t, o) {
        const a = phase + t * speed;
        o.position.set(Math.cos(a) * radius, SEA + 0.75 + Math.sin(t * 1.1 + i) * 0.12, Math.sin(a) * radius);
        o.rotation.set(Math.sin(t * 0.9 + i) * 0.04, -a + (speed > 0 ? Math.PI : 0), Math.sin(t * 0.7 + i) * 0.05);
      },
    });
  });

  // hot-air balloons drifting high over the middle
  [
    ['#e8534a', '#f4efe0'],
    ['#4a8fe8', '#f2dca0'],
    ['#b46cff', '#f4efe0'],
  ].forEach(([a, b], i) => {
    const phase = i * 2.1;
    things.push({
      parts: BALLOON(a, b),
      update(t, o) {
        const ang = phase + t * 0.015;
        o.position.set(Math.cos(ang) * (125 + i * 14), 58 + i * 12 + Math.sin(t * 0.3 + i) * 2.5, Math.sin(ang * 1.3) * (125 + i * 14));
        o.rotation.set(0, t * 0.05 + i, Math.sin(t * 0.4 + i) * 0.03);
      },
    });
  });

  // a small flock circling over each island
  const feathers: [string, string][] = [
    ['#f4f4f4', '#d8d8d8'],
    ['#e8534a', '#3a6fe0'],
    ['#3a3a44', '#55555f'],
  ];
  ring.forEach((isl, n) => {
    const [body, wing] = feathers[n % feathers.length];
    for (let b = 0; b < 5; b++) {
      const lag = b * 0.22 + hash3(n, b, 3) * 0.2;
      const lift = hash3(n, b, 4) * 6;
      const wide = isl.def.r * (0.55 + hash3(n, b, 5) * 0.3);
      const dir = n % 2 === 0 ? 1 : -1;
      things.push({
        parts: BIRD(body, wing),
        update(t, o) {
          const a = dir * (t * 0.22 + n) - lag;
          o.position.set(isl.def.x + Math.cos(a) * wide, 46 + lift + Math.sin(t * 0.5 + b) * 3, isl.def.z + Math.sin(a) * wide * 0.8);
          o.rotation.set(0, -a + (dir > 0 ? 0 : Math.PI), Math.sin(a) * 0.25 * dir);
        },
      });
    }
  });
  return things;
}

export function Wildlife({ world }: { world: World }) {
  const things = useMemo(() => build(world), [world]);
  const count = useMemo(() => things.reduce((n, t) => n + t.parts.length, 0), [things]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ parent: new THREE.Object3D(), child: new THREE.Object3D(), m: new THREE.Matrix4(), c: new THREE.Color(), coloured: false }), []);

  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const t = clock.elapsedTime;
    let i = 0;
    for (const thing of things) {
      thing.update(t, tmp.parent);
      tmp.parent.updateMatrix();
      for (const p of thing.parts) {
        tmp.child.position.set(p.o[0], p.o[1], p.o[2]);
        tmp.child.scale.set(p.s[0], p.s[1], p.s[2]);
        tmp.child.rotation.set(0, 0, p.flap ? Math.sin(t * 9 + i) * 0.7 * p.flap : 0);
        tmp.child.updateMatrix();
        im.setMatrixAt(i, tmp.m.multiplyMatrices(tmp.parent.matrix, tmp.child.matrix));
        if (!tmp.coloured) im.setColorAt(i, tmp.c.set(p.c));
        i++;
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (!tmp.coloured && im.instanceColor) {
      im.instanceColor.needsUpdate = true;
      tmp.coloured = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}
