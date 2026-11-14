// Drifting particles around the camera (petals, embers, fireflies… per island), and firework sparks.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { flight, forward } from '../flight';
import type { World } from '../generate';
import { atmo } from './Environment';

const BOX = new THREE.Vector3(90, 50, 90);

export function Petals({ reduced, world }: { reduced: boolean; world: World }) {
  const count = reduced ? 220 : 650;
  const points = useRef<THREE.Points>(null);
  const { geometry, vel, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const v = new Float32Array(count * 4); // vy, sway phase, sway amp, drift
    const shades = ['#ffffff', '#e4e4e4', '#fff6f0', '#d2d2d2'].map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX.x;
      pos[i * 3 + 1] = (Math.random() - 0.5) * BOX.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
      const c = shades[i % shades.length];
      col.set([c.r, c.g, c.b], i * 3);
      v.set([0.9 + Math.random() * 1.3, Math.random() * Math.PI * 2, 0.4 + Math.random() * 0.9, 0.6 + Math.random() * 1.4], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
    return { geometry: g, vel: v, material: m };
  }, [count]);
  const kinds = useMemo(() => world.islands.map((i) => ({ ...i.def.particles, c: new THREE.Color(i.def.particles.color) })), [world]);
  const state = useMemo(() => ({ fall: 1, color: new THREE.Color('#f7a8c8') }), []);

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // what drifts here: a blend of the nearby islands' particles
    let density = 0;
    let fall = 0;
    let r = 0;
    let gr = 0;
    let b = 0;
    for (let i = 0; i < kinds.length; i++) {
      const wi = atmo.weights[i] ?? 0;
      if (wi <= 0) continue;
      density += kinds[i].density * wi;
      fall += kinds[i].fall * wi;
      r += kinds[i].c.r * wi;
      gr += kinds[i].c.g * wi;
      b += kinds[i].c.b * wi;
    }
    const sum = Math.max(1e-4, 1 - atmo.base);
    const ease = Math.min(1, dt * 1.5);
    state.fall += (fall / sum - state.fall) * ease;
    if (density > 0.01) material.color.lerp(state.color.setRGB(r / sum, gr / sum, b / sum), ease);
    const pos = geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    const c = camera.position;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const vy = vel[i * 4];
      const ph = vel[i * 4 + 1];
      const amp = vel[i * 4 + 2];
      const drift = vel[i * 4 + 3];
      pos[o] += (drift + Math.sin(t * 1.3 + ph) * amp) * dt;
      pos[o + 1] -= vy * state.fall * dt;
      pos[o + 2] += Math.cos(t * 0.9 + ph) * amp * 0.6 * dt;
      // keep every petal inside a box that travels with the camera
      for (let a = 0; a < 3; a++) {
        const half = a === 0 ? BOX.x / 2 : a === 1 ? BOX.y / 2 : BOX.z / 2;
        const cc = a === 0 ? c.x : a === 1 ? c.y : c.z;
        let d = pos[o + a] - cc;
        if (d > half) d -= half * 2;
        else if (d < -half) d += half * 2;
        pos[o + a] = cc + d;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    material.opacity += (Math.min(1, density) - material.opacity) * ease;
    if (points.current) points.current.visible = material.opacity > 0.02;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

const SPARKS = 180;

/** Firework sparks streaming from the player's feet while boosting. */
export function Sparks() {
  const { geometry, material, state } = useMemo(() => {
    const pos = new Float32Array(SPARKS * 3);
    const col = new Float32Array(SPARKS * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = { vel: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS), next: 0, acc: 0 };
    return { geometry: g, material: m, state: s };
  }, []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const hot = useMemo(() => new THREE.Color('#fff2c4'), []);
  const warm = useMemo(() => new THREE.Color('#ff8a3a'), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    if (flight.boosting && (flight.mode === 'fly' || flight.mode === 'takeoff')) {
      state.acc += dt * 110;
      const f = forward(flight.yaw, flight.pitch, tmp);
      while (state.acc >= 1) {
        state.acc -= 1;
        const i = state.next;
        state.next = (state.next + 1) % SPARKS;
        pos[i * 3] = flight.pos.x - f.x * 1.3 + (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 1] = flight.pos.y - f.y * 1.3 + (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 2] = flight.pos.z - f.z * 1.3 + (Math.random() - 0.5) * 0.3;
        state.vel[i * 3] = f.x * flight.speed * 0.55 + (Math.random() - 0.5) * 3;
        state.vel[i * 3 + 1] = f.y * flight.speed * 0.55 + (Math.random() - 0.5) * 3;
        state.vel[i * 3 + 2] = f.z * flight.speed * 0.55 + (Math.random() - 0.5) * 3;
        state.life[i] = 0.7;
      }
    }
    for (let i = 0; i < SPARKS; i++) {
      if (state.life[i] <= 0) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        continue;
      }
      state.life[i] -= dt;
      pos[i * 3] += state.vel[i * 3] * dt;
      pos[i * 3 + 1] += (state.vel[i * 3 + 1] - 2) * dt;
      pos[i * 3 + 2] += state.vel[i * 3 + 2] * dt;
      const k = Math.max(0, state.life[i] / 0.7);
      const c = tmp.set(warm.r + (hot.r - warm.r) * k, warm.g + (hot.g - warm.g) * k, warm.b + (hot.b - warm.b) * k).multiplyScalar(k);
      col[i * 3] = c.x;
      col[i * 3 + 1] = c.y;
      col[i * 3 + 2] = c.z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

const FW = 420;
const BLAST_COLORS = ['#fff2c4', '#ffb347', '#ff7a2a', '#8a8a8a', '#5a5a5a'].map((h) => new THREE.Color(h));

/** The burst of fire, smoke and debris when TNT goes off. */
export function Blasts() {
  const { geometry, material, s } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FW * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FW * 3), 3));
    const m = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const st = {
      vel: new Float32Array(FW * 3),
      life: new Float32Array(FW),
      max: new Float32Array(FW),
      tint: new Float32Array(FW * 3),
      next: 0,
    };
    return { geometry: g, material: m, s: st };
  }, []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const emit = (p: THREE.Vector3, vx: number, vy: number, vz: number, life: number, c: THREE.Color) => {
      const i = s.next;
      s.next = (s.next + 1) % FW;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      s.vel[i * 3] = vx;
      s.vel[i * 3 + 1] = vy;
      s.vel[i * 3 + 2] = vz;
      s.life[i] = s.max[i] = life;
      s.tint[i * 3] = c.r;
      s.tint[i * 3 + 1] = c.g;
      s.tint[i * 3 + 2] = c.b;
    };
    // an explosion: a hot flash, flame, then smoke and debris
    while (flight.blasts.length) {
      const blast = flight.blasts.shift()!;
      tmp.set(blast.x, blast.y, blast.z);
      for (let n = 0; n < 150; n++) {
        const y = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(1 - y * y);
        const sp = 4 + Math.random() * 13;
        const c = BLAST_COLORS[n % BLAST_COLORS.length];
        emit(tmp, Math.cos(a) * rr * sp, Math.abs(y) * sp + 2, Math.sin(a) * rr * sp, 0.5 + Math.random() * 0.9, c);
      }
    }
    for (let i = 0; i < FW; i++) {
      if (s.life[i] <= 0) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        continue;
      }
      s.life[i] -= dt;
      const drag = 1 - dt * 1.6;
      s.vel[i * 3] *= drag;
      s.vel[i * 3 + 1] = s.vel[i * 3 + 1] * drag - 5 * dt;
      s.vel[i * 3 + 2] *= drag;
      pos[i * 3] += s.vel[i * 3] * dt;
      pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      const b = Math.max(0, s.life[i] / s.max[i]);
      col[i * 3] = s.tint[i * 3] * b;
      col[i * 3 + 1] = s.tint[i * 3 + 1] * b;
      col[i * 3 + 2] = s.tint[i * 3 + 2] * b;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
