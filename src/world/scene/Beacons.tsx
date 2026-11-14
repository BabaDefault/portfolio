// Beacon beams over each destination, plus projection of the HTML name tags that float above them.
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { ScreenId } from '../../screens/registry';
import { flight, getUi } from '../flight';
import type { Dest } from '../destinations';
import type { Beam } from '../generate';

/** DOM name tags (rendered outside the canvas) register here so the 3D loop can position them. */
export const tagEls = new Map<ScreenId, HTMLElement>();

const BEAM_H = 260;

function beamMaterial(color: string, strength: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uStrength: { value: strength },
      uBoost: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vY = position.y / ${BEAM_H.toFixed(1)} + 0.5;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime, uStrength, uBoost;
      varying float vY;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float fade = pow(1.0 - vY, 1.6) * smoothstep(0.0, 0.01, vY);
        float bands = 0.75 + 0.25 * sin(vY * 140.0 - uTime * 4.0);
        float edge = 0.55 + 0.45 * abs(dot(vN, vView));
        float a = fade * bands * edge * uStrength * (1.0 + uBoost * 0.8);
        gl_FragColor = vec4(uColor * a, a);
        #include <colorspace_fragment>
      }`,
  });
}

export function Beacons({ dests }: { dests: Dest[] }) {
  const beams = useMemo(
    () =>
      dests.map((d) => ({
        d,
        inner: beamMaterial(d.color, 0.95),
        outer: beamMaterial(d.color, 0.35),
        pos: new THREE.Vector3(d.x + 0.5, d.y + 2 + BEAM_H / 2, d.z + 0.5),
      })),
    [dests],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const frame = useMemo(() => ({ n: 0 }), []);

  useFrame(({ clock, camera, size }) => {
    const ui = getUi();
    frame.n++;
    for (const b of beams) {
      const focused = ui.target === b.d.id ? 1 : 0;
      b.inner.uniforms.uTime.value = clock.elapsedTime;
      b.outer.uniforms.uTime.value = clock.elapsedTime;
      b.inner.uniforms.uBoost.value += (focused - b.inner.uniforms.uBoost.value) * 0.05;
      b.outer.uniforms.uBoost.value = b.inner.uniforms.uBoost.value;

      // name tag above the beacon
      const el = tagEls.get(b.d.id);
      if (!el) continue;
      tmp.set(b.pos.x, b.d.y + 5.2, b.pos.z);
      const dist = tmp.distanceTo(camera.position);
      tmp.project(camera);
      const hidden = ui.mode !== 'fly' || tmp.z > 1 || dist > 520;
      if (hidden) {
        el.style.opacity = '0';
        continue;
      }
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      const s = Math.max(0.6, Math.min(1.15, 70 / dist));
      el.style.opacity = String(Math.min(1, (520 - dist) / 80));
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      if (frame.n % 8 === 0) {
        const dEl = el.querySelector<HTMLElement>('[data-dist]');
        if (dEl) dEl.textContent = `${Math.round(Math.hypot(flight.pos.x - b.pos.x, flight.pos.z - b.pos.z))}m`;
      }
    }
  });

  return (
    <>
      {beams.map((b) => (
        <group key={b.d.id} position={b.pos}>
          <mesh material={b.inner} frustumCulled={false}>
            <boxGeometry args={[0.5, BEAM_H, 0.5]} />
          </mesh>
          <mesh material={b.outer} frustumCulled={false}>
            <boxGeometry args={[1.25, BEAM_H, 1.25]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Thin beams rising from glowing blocks (the End's crystals). */
export function CrystalBeams({ beams }: { beams: Beam[] }) {
  const mats = useMemo(() => beams.map((b) => beamMaterial(b.color, 0.6)), [beams]);
  useFrame(({ clock }) => {
    for (const m of mats) m.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      {beams.map((b, i) => (
        <mesh key={i} material={mats[i]} position={[b.x + 0.5, b.y + BEAM_H / 2, b.z + 0.5]} frustumCulled={false}>
          <boxGeometry args={[0.3, BEAM_H, 0.3]} />
        </mesh>
      ))}
    </>
  );
}
