// Small effects that bring the islands to life: chimney/campfire smoke, waterfall mist, soft halos
// on lanterns and other lights, the light shaft down the cenote, and crystals orbiting The End's portal.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { T } from '../atlas';
import { unkey, type World } from '../generate';
import { hash3 } from '../noise';

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const HALO_COLORS: Partial<Record<number, string>> = {
  [T.lantern]: '#ffc66a',
  [T.campfire]: '#ff9a3a',
  [T.crystal]: '#e58cff',
  [T.beacon]: '#bff6ff',
  [T.sculkGlow]: '#5ff0ea',
};

/** A glow sprite on every lantern, campfire, crystal and beacon (one draw call). */
function Halos({ world, dot }: { world: World; dot: THREE.Texture }) {
  const { geometry, material } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    for (const [k, tile] of world.blocks) {
      const hex = HALO_COLORS[tile];
      if (!hex) continue;
      const [x, y, z] = unkey(k);
      if (tile === T.sculkGlow && hash3(x, y, z, 81) > 0.5) continue;
      pos.push(x + 0.5, y + 0.5, z + 0.5);
      c.set(hex);
      col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ map: dot, size: 7, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geometry: g, material: m };
  }, [world, dot]);
  useFrame(({ clock }) => {
    material.opacity = 0.5 + Math.sin(clock.elapsedTime * 2.3) * 0.06;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

const PER = 14; // puffs per emitter

/** Rising smoke from chimneys and campfires; drifting mist where waterfalls land. */
function Puffs({ world, dot }: { world: World; dot: THREE.Texture }) {
  const { geometry, material, seeds } = useMemo(() => {
    const n = world.fx.length * PER;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.PointsMaterial({ map: dot, size: 2.6, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = hash3(i, 5, 9, 91);
    return { geometry: g, material: m, seeds: s };
  }, [world, dot]);

  useFrame(({ clock }) => {
    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const t = clock.elapsedTime;
    world.fx.forEach((f, e) => {
      const smoke = f.kind === 'smoke';
      for (let p = 0; p < PER; p++) {
        const i = e * PER + p;
        const life = (t * (smoke ? 0.16 : 0.3) + seeds[i] + p / PER) % 1;
        const a = seeds[i] * 40 + p;
        if (smoke) {
          pos[i * 3] = f.x + Math.sin(a) * life * 1.2 + life * life * 3;
          pos[i * 3 + 1] = f.y + life * 9;
          pos[i * 3 + 2] = f.z + Math.cos(a) * life * 1.2;
        } else {
          pos[i * 3] = f.x + Math.sin(a) * (0.6 + life * 3.5);
          pos[i * 3 + 1] = f.y + Math.sin(life * Math.PI) * 1.6;
          pos[i * 3 + 2] = f.z + Math.cos(a) * (0.6 + life * 3.5);
        }
        const k = Math.sin(life * Math.PI) * (smoke ? 0.55 : 0.9);
        col[i * 3] = col[i * 3 + 1] = k;
        col[i * 3 + 2] = k * (smoke ? 1 : 1.05);
      }
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  if (!world.fx.length) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** Sunlight pouring into the cenote, like the lush-cave image. */
function LightShaft({ world }: { world: World }) {
  const isl = world.islands.find((i) => i.def.id === 'contact');
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float rays = 0.6 + 0.4 * sin(vUv.x * 60.0 + sin(vUv.x * 13.0 + uTime * 0.2) * 3.0);
            float a = rays * pow(vUv.y, 1.5) * smoothstep(0.0, 0.12, vUv.y) * 0.16;
            gl_FragColor = vec4(vec3(1.0, 0.96, 0.78) * a, a);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  if (!isl) return null;
  return (
    <mesh material={material} position={[isl.def.x - 4, 34, isl.def.z - 2]} rotation-z={0.12}>
      <cylinderGeometry args={[7, 13, 48, 24, 1, true]} />
    </mesh>
  );
}

/** Crystals circling above The End's portal. */
function EndCrystals({ world }: { world: World }) {
  const isl = world.islands.find((i) => i.def.id === 'end');
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.5;
    group.current.children.forEach((c, i) => {
      c.position.y = Math.sin(clock.elapsedTime * 1.4 + i * 2) * 1.2;
      c.rotation.set(clock.elapsedTime + i, clock.elapsedTime * 0.7, 0);
    });
  });
  if (!isl) return null;
  return (
    <group ref={group} position={[isl.def.x + 0.5, (isl.def.floatY ?? 80) + 12, isl.def.z - 4.5]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i / 4) * Math.PI * 2) * 6, 0, Math.sin((i / 4) * Math.PI * 2) * 6]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#f0b8ff" />
        </mesh>
      ))}
    </group>
  );
}

export function IslandFx({ world }: { world: World }) {
  const dot = useMemo(softDot, []);
  return (
    <>
      <Halos world={world} dot={dot} />
      <Puffs world={world} dot={dot} />
      <LightShaft world={world} />
      <EndCrystals world={world} />
    </>
  );
}
