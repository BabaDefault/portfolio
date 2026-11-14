// Sky, lights, fog, sea, clouds, stars and aurora. Each island has its own mood (islands.ts);
// the atmosphere blends between them by distance as you fly.
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MIN_Y, N, SEA } from '../consts';
import type { World } from '../generate';
import { BASE_MOOD, type Mood } from '../islands';
import { fbm, hash3, simplex2, smoothstep } from '../noise';

/** Low sun in the west, a little north. */
export const SUN_DIR = new THREE.Vector3(-0.8, 0.3, -0.45).normalize();
/** Light for the blocks: higher than the painted sun so the tops of things read well. */
const LIGHT_POS = new THREE.Vector3(-0.7, 0.62, -0.35).normalize().multiplyScalar(200);
const WATER = '#3b6dbf';
const SHALLOW = '#6fc6d8';

/** How shallow the sea is at each column (0 = open ocean, 1 = at the shore), for the water shader. */
export function shoreTexture(world: World) {
  const data = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const h = world.height[i];
    data[i] = h <= MIN_Y ? 0 : Math.min(255, Math.round(((h - MIN_Y) / (SEA + 1 - MIN_Y)) * 255));
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RedFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Blocky sea: slow swells, sun sparkles, paler shallows and flecks of foam along the shores. */
function waterMaterial(shore: THREE.Texture) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uColor: { value: new THREE.Color(WATER) }, uShallow: { value: new THREE.Color(SHALLOW) }, uLight: { value: 1 }, uShore: { value: null } },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying float vDist;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        vDist = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLight;
      uniform vec3 uColor, uShallow;
      uniform sampler2D uShore;
      varying vec3 vWorld;
      varying float vDist;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 cell = floor(vWorld.xz);
        float near = 1.0 - smoothstep(70.0, 220.0, vDist); // patterns fade out with distance
        float shore = texture2D(uShore, vWorld.xz / ${N.toFixed(1)} + 0.5).r;
        float swell = sin(cell.x * 0.33 + uTime * 0.8) * sin(cell.y * 0.29 - uTime * 0.6);
        vec3 col = uColor * (1.0 + 0.07 * swell * near);
        float shallow = smoothstep(0.3, 0.95, shore);
        col = mix(col, uShallow * uLight, shallow * 0.55);
        float foam = step(0.9, shore) * step(0.45, hash(cell + floor(uTime * 1.5))) * near;
        col = mix(col, vec3(uLight), foam * 0.55);
        col += step(0.988, hash(cell + floor(uTime * 2.0) * 7.0)) * 0.45 * uLight * near;
        gl_FragColor = vec4(col, mix(0.88, 0.62, shallow));
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  m.uniforms.uShore.value = shore;
  return m;
}


const COLOR_KEYS = ['zenith', 'upper', 'horizon', 'glow', 'fog', 'sun', 'hemiSky', 'hemiGround', 'cloud'] as const;
const NUM_KEYS = ['sunI', 'hemiI', 'disc', 'stars', 'fogFar'] as const;
type MoodState = { c: Record<(typeof COLOR_KEYS)[number], THREE.Color>; n: Record<(typeof NUM_KEYS)[number], number> };

function toState(m: Mood): MoodState {
  const c = {} as MoodState['c'];
  const n = {} as MoodState['n'];
  for (const k of COLOR_KEYS) c[k] = new THREE.Color(m[k]);
  for (const k of NUM_KEYS) n[k] = m[k];
  return { c, n };
}

/** Per-island influence at the camera (0..1), shared with the particles. */
export const atmo = { weights: [] as number[], base: 1 };

function Sky({ material }: { material: THREE.ShaderMaterial }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[2400, 32, 16]} />
    </mesh>
  );
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color() },
      uUpper: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSun: { value: new THREE.Color('#fff3d6') },
      uFog: { value: new THREE.Color() },
      uDisc: { value: 1 },
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uUpper, uHorizon, uGlow, uSun, uFog, uSunDir;
      uniform float uDisc;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uUpper, smoothstep(0.0, 0.28, h));
        col = mix(col, uZenith, smoothstep(0.22, 0.85, h));
        float s = max(dot(d, uSunDir), 0.0);
        // warm wash along the horizon on the sun's side
        col = mix(col, uGlow, pow(s, 5.0) * (1.0 - smoothstep(-0.05, 0.45, h)) * 0.85);
        col += uGlow * pow(s, 28.0) * 0.35 * uDisc;
        // a square, blocky sun (or moon)
        vec3 u = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)));
        vec3 v = cross(u, uSunDir);
        vec2 p = vec2(dot(d, u), dot(d, v));
        float sq = max(abs(p.x), abs(p.y));
        if (s > 0.0 && sq < 0.045) col = mix(col, uSun, 0.92 * uDisc);
        // below the horizon fade into the haze so the sea's edge disappears
        col = mix(col, uFog, smoothstep(0.02, -0.08, h));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Two rings of far-off blocky mountains, tinted by the haze for aerial depth. */
function useFarMountains() {
  return useMemo(() => {
    const noise = simplex2(77);
    const make = (radius: number, base: number, amp: number, seed: number) => {
      const segs = 220;
      const pos: number[] = [];
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI * 2;
        const a1 = ((s + 1) / segs) * Math.PI * 2;
        const n = fbm(noise, Math.cos(a0) * 2.2 + seed, Math.sin(a0) * 2.2, 4) * 0.5 + 0.5;
        // lower toward the sunset so the glow shows through
        const west = Math.max(0, -Math.cos(a0)) * 0.55;
        const h = Math.round((base + n * n * amp * (1 - west)) / 6) * 6;
        const p = (a: number, y: number) => [Math.cos(a) * radius, y, Math.sin(a) * radius];
        const v = [p(a0, -40), p(a1, -40), p(a1, h), p(a0, h)];
        pos.push(...v[0], ...v[2], ...v[1], ...v[0], ...v[3], ...v[2]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return g;
    };
    const mat = () => new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide });
    return [
      { g: make(1700, 40, 260, 9.1), m: mat(), mix: 0.12 },
      { g: make(1150, 20, 170, 3.3), m: mat(), mix: 0.3 },
    ];
  }, []);
}

const CLOUD_CELL = 12;
const CLOUD_PERIOD = 48; // pattern repeats every 48 cells, so drifting can wrap seamlessly
const CLOUD_Y = 128;

function useCloudGeometry() {
  return useMemo(() => {
    // periodic value noise on a coarse lattice
    const lattice = (ci: number, cj: number, size: number, seed: number) => {
      const P = CLOUD_PERIOD / size;
      const fx = ci / size;
      const fz = cj / size;
      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const tx = fx - x0;
      const tz = fz - z0;
      const at = (x: number, z: number) => hash3(((x % P) + P) % P, seed, ((z % P) + P) % P, 11);
      const sx = tx * tx * (3 - 2 * tx);
      const sz = tz * tz * (3 - 2 * tz);
      const a = at(x0, z0) + (at(x0 + 1, z0) - at(x0, z0)) * sx;
      const b = at(x0, z0 + 1) + (at(x0 + 1, z0 + 1) - at(x0, z0 + 1)) * sx;
      return a + (b - a) * sz;
    };
    const filled = (ci: number, cj: number) =>
      lattice(ci, cj, 8, 1) * 0.65 + lattice(ci, cj, 4, 2) * 0.25 + hash3(((ci % 48) + 48) % 48, 0, ((cj % 48) + 48) % 48, 5) * 0.1 > 0.6;
    const pos: number[] = [];
    const nor: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[], n: number[]) => {
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let k = 0; k < 6; k++) nor.push(...n);
    };
    const H = 4;
    const R = CLOUD_PERIOD * 1.5;
    for (let cj = -R; cj < R; cj++)
      for (let ci = -R; ci < R; ci++) {
        if (!filled(ci, cj)) continue;
        const x0 = ci * CLOUD_CELL;
        const x1 = x0 + CLOUD_CELL;
        const z0 = cj * CLOUD_CELL;
        const z1 = z0 + CLOUD_CELL;
        quad([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], [0, 1, 0]);
        quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [0, -1, 0]);
        if (!filled(ci + 1, cj)) quad([x1, 0, z1], [x1, 0, z0], [x1, H, z0], [x1, H, z1], [1, 0, 0]);
        if (!filled(ci - 1, cj)) quad([x0, 0, z0], [x0, 0, z1], [x0, H, z1], [x0, H, z0], [-1, 0, 0]);
        if (!filled(ci, cj + 1)) quad([x0, 0, z1], [x1, 0, z1], [x1, H, z1], [x0, H, z1], [0, 0, 1]);
        if (!filled(ci, cj - 1)) quad([x1, 0, z0], [x0, 0, z0], [x0, H, z0], [x1, H, z0], [0, 0, -1]);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  }, []);
}

function useStars() {
  return useMemo(() => {
    const pos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const a = hash3(i, 1, 0) * Math.PI * 2;
      const y = 0.04 + hash3(i, 2, 0) * 0.96;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 1900, y * 1900, Math.sin(a) * r * 1900], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    return { g, m };
  }, []);
}

function auroraMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity;
      varying vec2 vUv;
      void main() {
        float wave = sin(vUv.x * 9.0 + uTime * 0.25) * 2.0;
        float streak = pow(0.5 + 0.5 * sin(vUv.x * 46.0 + wave), 2.0) * 0.75 + 0.25;
        float band = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.4);
        float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        vec3 col = mix(vec3(0.2, 1.0, 0.68), vec3(1.0, 0.5, 0.85), smoothstep(0.25, 0.85, vUv.y + 0.18 * sin(vUv.x * 7.0)));
        float a = streak * band * ends * uOpacity;
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }`,
  });
}

export function Atmosphere({ world, shore, blocks }: { world: World; shore: THREE.Texture; blocks: THREE.Material }) {
  const { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const cloudGroup = useRef<THREE.Group>(null);
  const starPoints = useRef<THREE.Points>(null);
  const sky = useMemo(skyMaterial, []);
  const rings = useFarMountains();
  const cloudGeo = useCloudGeometry();
  const cloudMat = useMemo(() => new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.8 }), []);
  const stars = useStars();
  const aurora = useMemo(auroraMaterial, []);
  const water = useMemo(() => waterMaterial(shore), [shore]);
  const waterBase = useMemo(() => new THREE.Color(WATER), []);
  const moods = useMemo(() => world.islands.map((i) => toState(i.def.mood)), [world]);
  const base = useMemo(() => toState(BASE_MOOD), []);
  const cur = useMemo(() => toState(BASE_MOOD), []);
  const auroraIsland = useMemo(() => world.islands.find((i) => i.def.id === 'advancements'), [world]);
  const fog = useMemo(() => new THREE.Fog(BASE_MOOD.fog, 90, BASE_MOOD.fogFar), []);
  const background = useMemo(() => new THREE.Color(BASE_MOOD.fog), []);

  useFrame(({ camera, clock }) => {
    // how much each island's mood applies here
    const w = atmo.weights;
    let total = 0;
    world.islands.forEach((isl, i) => {
      const d = isl.def;
      const dy = d.floatY !== undefined ? (camera.position.y - d.floatY) * 0.8 : 0;
      const dist = Math.hypot(camera.position.x - d.x, camera.position.z - d.z, dy);
      w[i] = 1 - smoothstep(d.r * 0.75, d.r + 60, dist);
      total += w[i];
    });
    const norm = total > 1 ? 1 / total : 1;
    atmo.base = Math.max(0, 1 - total);
    for (let i = 0; i < w.length; i++) w[i] *= norm;

    for (const k of COLOR_KEYS) {
      const c = cur.c[k].copy(base.c[k]).multiplyScalar(atmo.base);
      for (let i = 0; i < w.length; i++) {
        if (w[i] <= 0) continue;
        const m = moods[i].c[k];
        c.r += m.r * w[i];
        c.g += m.g * w[i];
        c.b += m.b * w[i];
      }
    }
    for (const k of NUM_KEYS) {
      let v = base.n[k] * atmo.base;
      for (let i = 0; i < w.length; i++) v += moods[i].n[k] * w[i];
      cur.n[k] = v;
    }

    sky.uniforms.uZenith.value.copy(cur.c.zenith);
    sky.uniforms.uUpper.value.copy(cur.c.upper);
    sky.uniforms.uHorizon.value.copy(cur.c.horizon);
    sky.uniforms.uGlow.value.copy(cur.c.glow);
    sky.uniforms.uFog.value.copy(cur.c.fog);
    sky.uniforms.uDisc.value = cur.n.disc;
    fog.color.copy(cur.c.fog);
    fog.far = cur.n.fogFar;
    background.copy(cur.c.fog);
    if (scene.fog !== fog) scene.fog = fog;
    if (scene.background !== background) scene.background = background;
    if (sun.current) {
      sun.current.color.copy(cur.c.sun);
      sun.current.intensity = cur.n.sunI;
    }
    if (hemi.current) {
      hemi.current.color.copy(cur.c.hemiSky);
      hemi.current.groundColor.copy(cur.c.hemiGround);
      hemi.current.intensity = cur.n.hemiI;
    }
    cloudMat.color.copy(cur.c.cloud);
    cloudMat.emissive.copy(cur.c.cloud).multiplyScalar(0.4);
    for (const r of rings) r.m.color.copy(cur.c.fog).lerp(cur.c.upper, r.mix);
    stars.m.opacity = cur.n.stars;
    if (starPoints.current) {
      starPoints.current.visible = cur.n.stars > 0.01;
      starPoints.current.position.copy(camera.position);
    }
    if (cloudGroup.current) {
      const span = CLOUD_PERIOD * CLOUD_CELL;
      cloudGroup.current.position.x = ((clock.elapsedTime * 1.6) % span) - span / 2;
    }
    // the sea darkens and picks up the sky's tint with the mood
    const light = Math.min(1.15, Math.max(0.22, cur.n.sunI * 0.22 + cur.n.hemiI * 0.26));
    water.uniforms.uTime.value = clock.elapsedTime;
    water.uniforms.uLight.value = light;
    water.uniforms.uColor.value.copy(waterBase).lerp(cur.c.upper, 0.25).multiplyScalar(light);
    (blocks.userData.uTime as { value: number }).value = clock.elapsedTime;
    aurora.uniforms.uTime.value = clock.elapsedTime;
    aurora.uniforms.uOpacity.value = auroraIsland ? 0.3 + 0.7 * (w[auroraIsland.index] ?? 0) : 0;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[BASE_MOOD.hemiSky, BASE_MOOD.hemiGround, BASE_MOOD.hemiI]} />
      <directionalLight ref={sun} position={LIGHT_POS} color={BASE_MOOD.sun} intensity={BASE_MOOD.sunI} />
      <Sky material={sky} />
      <points ref={starPoints} geometry={stars.g} material={stars.m} renderOrder={-9} frustumCulled={false} />
      {rings.map((r, i) => (
        <mesh key={i} geometry={r.g} material={r.m} renderOrder={-5} />
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, SEA + 0.85, 0]} material={water}>
        <planeGeometry args={[6000, 6000]} />
      </mesh>
      <group ref={cloudGroup} position={[0, CLOUD_Y, 0]}>
        <mesh geometry={cloudGeo} material={cloudMat} />
      </group>
      {auroraIsland && (
        <group position={[auroraIsland.def.x, 118, auroraIsland.def.z]}>
          <mesh material={aurora} rotation-y={0.4} frustumCulled={false}>
            <cylinderGeometry args={[92, 92, 70, 48, 1, true, 0, 3.4]} />
          </mesh>
          <mesh material={aurora} rotation-y={3.3} position-y={14} frustumCulled={false}>
            <cylinderGeometry args={[60, 60, 54, 40, 1, true, 0, 2.8]} />
          </mesh>
        </group>
      )}
    </>
  );
}
