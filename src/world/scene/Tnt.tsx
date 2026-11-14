// Press F to throw TNT. It arcs out ahead of the player, flashes, and blows a crater in whatever sea
// stack or sky islet it hits (the section islands are indestructible).
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { flight, forward } from '../flight';
import { key, surfaceAt, type World } from '../generate';
import { edits, explode } from '../tnt';

const MAX = 6;
const BLAST_RADIUS = 4.6;
/** Minimum time between throws. */
const COOLDOWN_MS = 1000;
/** How much faster than the player the charge leaves the hand (blocks/second). */
const THROW_SPEED = 24;

/** An original pixel-art charge: red sticks, a pale band, dark lettering. */
function tntTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const band = y >= 5 && y <= 10;
      const seam = !band && x % 4 === 3;
      ctx.fillStyle = band ? '#efe6d2' : seam ? '#8f1f18' : y < 2 || y > 13 ? '#b92a20' : '#d8352a';
      ctx.fillRect(x, y, 1, 1);
    }
  ctx.fillStyle = '#2a2420';
  // T N T in a 3×4 pixel font
  const glyphs = ['111010010010', '101111111101', '111010010010'];
  glyphs.forEach((g, n) => {
    for (let i = 0; i < 12; i++) if (g[i] === '1') ctx.fillRect(2 + n * 4 + (i % 3), 6 + Math.floor(i / 3), 1, 1);
  });
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Tnt({ world }: { world: World }) {
  const charges = useMemo(() => {
    const map = tntTexture();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    return Array.from({ length: MAX }, () => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map }));
      mesh.visible = false;
      return { mesh, vel: new THREE.Vector3(), fuse: 0, spin: new THREE.Vector3() };
    });
  }, []);
  const s = useMemo(() => ({ fired: flight.fire, last: -Infinity, tmp: new THREE.Vector3() }), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // throw one (at most once per cooldown)
    if (flight.fire !== s.fired) {
      s.fired = flight.fire;
      const free = charges.find((c) => !c.mesh.visible);
      const now = performance.now();
      if (free && flight.mode === 'fly' && now - s.last >= COOLDOWN_MS) {
        s.last = now;
        // thrown ahead in an arc, so it lands in view in front of you
        const f = forward(flight.yaw, flight.pitch, s.tmp);
        free.mesh.position.copy(flight.pos).addScaledVector(f, 1.6);
        free.mesh.position.y -= 0.4;
        free.vel.copy(f).multiplyScalar(flight.speed + THROW_SPEED);
        free.vel.y += 7;
        free.fuse = 4;
        free.spin.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        free.mesh.visible = true;
        sfx.pop();
      }
    }
    for (const c of charges) {
      if (!c.mesh.visible) continue;
      const p = c.mesh.position;
      c.vel.y -= 26 * dt;
      p.addScaledVector(c.vel, dt);
      c.fuse -= dt;
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
      c.mesh.rotation.z += c.spin.z * dt;
      // primed: flash white and swell
      const flash = Math.floor(c.fuse * 8) % 2 === 0;
      (c.mesh.material as THREE.MeshLambertMaterial).emissive.setScalar(flash ? 0.55 : 0);
      c.mesh.scale.setScalar(flash ? 1.12 : 1);

      const ground = surfaceAt(world, p.x, p.z, p.y);
      const hit = p.y - 0.5 <= ground || world.blocks.has(key(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));
      if (!hit && c.fuse > 0) continue;
      c.mesh.visible = false;
      const changed = explode(world, p.x, p.y, p.z, BLAST_RADIUS);
      if (changed.length) edits.remesh(changed);
      flight.blasts.push({ x: p.x, y: p.y, z: p.z, hit: changed.length > 0 });
      sfx.boom();
    }
  });

  return (
    <>
      {charges.map((c, i) => (
        <primitive key={i} object={c.mesh} />
      ))}
    </>
  );
}
