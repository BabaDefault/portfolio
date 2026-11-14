// Things to fly through between the islands: trails of XP orbs along the natural routes,
// and firework rings that fling you forward and refill your boost.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { flight, getUi, setUi } from '../flight';
import { surfaceAt, type World } from '../generate';

type Ring = { pos: THREE.Vector3; yaw: number; cooldown: number; pulse: number };

function layout(world: World) {
  const ringIslands = world.islands.filter((i) => i.def.floatY === undefined).sort((a, b) => Math.atan2(a.def.z, a.def.x) - Math.atan2(b.def.z, b.def.x));
  const end = world.islands.find((i) => i.def.floatY !== undefined);
  const orbs: THREE.Vector3[] = [];
  const rings: Ring[] = [];

  const route = (ax: number, az: number, ar: number, ay: number, bx: number, bz: number, br: number, by: number, withRing: boolean) => {
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    const from = ar + 10;
    const to = len - br - 10;
    for (let d = from; d <= to; d += 8) {
      const t = (d - from) / (to - from);
      // a gentle S-curve, arcing up in the middle
      const side = Math.sin(t * Math.PI * 2) * 7;
      const x = ax + dx * d - dz * side;
      const z = az + dz * d + dx * side;
      let y = ay + (by - ay) * t + Math.sin(t * Math.PI) * 9;
      y = Math.max(y, surfaceAt(world, x, z) + 6);
      if (withRing && Math.abs(t - 0.5) < 4 / (to - from)) rings.push({ pos: new THREE.Vector3(x, y, z), yaw: Math.atan2(dx, dz), cooldown: 0, pulse: 0 });
      else orbs.push(new THREE.Vector3(x, y, z));
    }
  };

  ringIslands.forEach((a, i) => {
    const b = ringIslands[(i + 1) % ringIslands.length];
    route(a.def.x, a.def.z, a.def.r, 30, b.def.x, b.def.z, b.def.r, 30, true);
  });
  if (end) ringIslands.forEach((a) => route(a.def.x, a.def.z, a.def.r, 32, end.def.x, end.def.z, end.def.r, (end.def.floatY ?? 80) + 8, false));
  // a long loop through the channel between the ring of islands and the middle
  const loop = orbs.length;
  for (let k = 0; k < 96; k++) {
    const a = (k / 96) * Math.PI * 2;
    const x = Math.cos(a) * 106;
    const z = Math.sin(a) * 106;
    orbs.push(new THREE.Vector3(x, Math.max(36 + Math.sin(a * 4) * 8, surfaceAt(world, x, z) + 6), z));
  }
  if (import.meta.env.DEV) (window as unknown as { __orbs: unknown }).__orbs = { orbs, rings, loop };
  return { orbs, rings };
}

const ACTIVE = 170;

export function Pickups({ world }: { world: World }) {
  const { orbs, rings } = useMemo(() => layout(world), [world]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const taken = useMemo(() => new Uint8Array(orbs.length), [orbs]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(), p: new THREE.Vector3(), init: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd34a' }), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const im = mesh.current;
    if (im) {
      const flying = flight.mode === 'fly';
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const d = o.distanceTo(flight.pos);
        if (tmp.init && d > ACTIVE) continue; // far orbs keep their last matrix
        if (!taken[i] && flying && d < 4) {
          taken[i] = 1;
          sfx.xp();
          setUi({ xp: getUi().xp + 1 });
        }
        const s = taken[i] ? 0 : 0.95 + Math.sin(t * 3 + i) * 0.1;
        tmp.e.set(t * 1.3 + i, t * 1.7 + i * 0.7, 0);
        tmp.p.set(o.x, o.y + Math.sin(t * 1.6 + i * 0.9) * 0.35, o.z);
        im.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q.setFromEuler(tmp.e), tmp.s.setScalar(s)));
      }
      tmp.init = true;
      im.instanceMatrix.needsUpdate = true;
    }
    rings.forEach((r, i) => {
      r.cooldown = Math.max(0, r.cooldown - dt);
      r.pulse = Math.max(0, r.pulse - dt * 1.6);
      if (flight.mode === 'fly' && r.cooldown === 0 && r.pos.distanceTo(flight.pos) < 4.6) {
        r.cooldown = 4;
        r.pulse = 1;
        flight.launch = 2.4;
        flight.boost = 1;
        sfx.levelUp();
      }
      const m = ringRefs.current[i];
      if (m) {
        m.rotation.z = t * 0.5;
        m.scale.setScalar(1 + r.pulse * 0.5 + Math.sin(t * 2 + i) * 0.03);
        m.visible = r.cooldown < 3.2 || Math.floor(t * 10) % 2 === 0;
      }
    });
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, orbs.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#b9ff4a" />
      </instancedMesh>
      {rings.map((r, i) => (
        <group key={i} position={r.pos} rotation-y={r.yaw}>
          <mesh ref={(m) => (ringRefs.current[i] = m)} material={ringMat}>
            <torusGeometry args={[5, 0.42, 4, 12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
