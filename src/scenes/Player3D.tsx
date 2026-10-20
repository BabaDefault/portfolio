import { useEffect, useRef, useState } from 'react';
import { FunctionAnimation, SkinViewer, type PlayerObject } from 'skinview3d';
import * as THREE from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PlayerFigure } from './PlayerFigure';
import { defaultLighting, type PlayerLighting } from './playerLighting';
import './player3d.css';

/**
 * 3D Minecraft player rendered from a standard 64×64 skin (public/skins/player.png).
 * Replace that PNG with any skin to change the look; pick a pose per screen in the registry.
 */
export type Pose = 'idle' | 'wave' | 'walk' | 'laptop' | 'crossed' | 'think' | 'point' | 'cheer' | 'sit';

type Player3DProps = {
  pose?: Pose;
  /** awayLeft / awayRight: back to the camera, gazing into the scene (toward that side). */
  facing?: 'left' | 'right' | 'front' | 'awayLeft' | 'awayRight';
  /** Scene-matched key/rim/fill lighting; eased over ~0.6s when it changes. */
  lighting?: PlayerLighting;
  height?: number; // px
  lookAtCursor?: boolean;
  className?: string;
};

const SKIN_URL = `${import.meta.env.BASE_URL}skins/player.png`;

const LIGHT_EASE_MS = 600;
const LIGHT_DISTANCE = 60;
const CAMERA_LIGHT = 0.1; // barely-there front fill so the face never goes pitch black

/** Live, interpolatable lighting state (colours in linear working space). */
type LightState = {
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sun: number;
  rimDir: THREE.Vector3;
  rimColor: THREE.Color;
  rim: number;
  sky: THREE.Color;
  ground: THREE.Color;
  hemi: number;
  ambient: number;
  exposure: number;
};

function toState(l: PlayerLighting): LightState {
  return {
    sunDir: new THREE.Vector3(...l.sun.dir).normalize(),
    sunColor: new THREE.Color(l.sun.color),
    sun: l.sun.intensity,
    rimDir: new THREE.Vector3(...l.rim.dir).normalize(),
    rimColor: new THREE.Color(l.rim.color),
    rim: l.rim.intensity,
    sky: new THREE.Color(l.hemi.sky),
    ground: new THREE.Color(l.hemi.ground),
    hemi: l.hemi.intensity,
    ambient: l.ambient,
    exposure: l.exposure,
  };
}

function cloneState(s: LightState): LightState {
  return {
    ...s,
    sunDir: s.sunDir.clone(),
    sunColor: s.sunColor.clone(),
    rimDir: s.rimDir.clone(),
    rimColor: s.rimColor.clone(),
    sky: s.sky.clone(),
    ground: s.ground.clone(),
  };
}

/** out = lerp(a, b, k) */
function mixState(out: LightState, a: LightState, b: LightState, k: number) {
  const n = (x: number, y: number) => x + (y - x) * k;
  out.sunDir.lerpVectors(a.sunDir, b.sunDir, k).normalize();
  out.rimDir.lerpVectors(a.rimDir, b.rimDir, k).normalize();
  out.sunColor.lerpColors(a.sunColor, b.sunColor, k);
  out.rimColor.lerpColors(a.rimColor, b.rimColor, k);
  out.sky.lerpColors(a.sky, b.sky, k);
  out.ground.lerpColors(a.ground, b.ground, k);
  out.sun = n(a.sun, b.sun);
  out.rim = n(a.rim, b.rim);
  out.hemi = n(a.hemi, b.hemi);
  out.ambient = n(a.ambient, b.ambient);
  out.exposure = n(a.exposure, b.exposure);
}

const gradeFilter = (g: PlayerLighting['grade']) =>
  `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturate})`;

const FACING_Y = { left: -0.5, right: 0.5, front: 0, awayLeft: Math.PI + 0.55, awayRight: Math.PI - 0.55 } as const;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Sets the limbs for a pose at time t (seconds). */
function applyPose(p: PlayerObject, pose: Pose, t: number) {
  const s = p.skin;
  const breathe = Math.sin(t * 1.6);
  // neutral base
  s.rightArm.rotation.set(Math.sin(t * 0.9) * 0.04, 0, 0.07 + breathe * 0.03);
  s.leftArm.rotation.set(-Math.sin(t * 0.9) * 0.04, 0, -0.07 - breathe * 0.03);
  s.rightLeg.rotation.set(0, 0, 0);
  s.leftLeg.rotation.set(0, 0, 0);
  s.body.rotation.set(0, 0, 0);
  p.position.y = 0;

  switch (pose) {
    case 'wave': {
      // wave for ~1.6s out of every 4.5s
      const cycle = t % 4.5;
      if (cycle < 1.6) {
        const lift = Math.min(1, cycle / 0.25, (1.6 - cycle) / 0.25);
        s.leftArm.rotation.z = -0.07 + lift * (-2.55 + Math.sin(t * 12) * 0.3);
      }
      break;
    }
    case 'walk': {
      const w = Math.sin(t * 5);
      s.rightLeg.rotation.x = w * 0.55;
      s.leftLeg.rotation.x = -w * 0.55;
      s.rightArm.rotation.x = -w * 0.5;
      s.leftArm.rotation.x = w * 0.5;
      p.position.y = Math.abs(Math.cos(t * 5)) * 0.4;
      break;
    }
    case 'laptop':
      s.rightArm.rotation.set(-0.85 + breathe * 0.02, 0, 0.5);
      s.leftArm.rotation.set(-0.85 + breathe * 0.02, 0, -0.5);
      break;
    case 'crossed':
      s.rightArm.rotation.set(-1.05 + breathe * 0.02, 0, 0.85);
      s.leftArm.rotation.set(-0.95 + breathe * 0.02, 0, -0.85);
      break;
    case 'think':
      s.rightArm.rotation.set(-2.05 + breathe * 0.03, 0, 0.55);
      s.leftArm.rotation.set(-0.95, 0, -0.8);
      break;
    case 'point':
      s.leftArm.rotation.set(-1.5 + Math.sin(t * 2) * 0.04, 0, -0.05);
      break;
    case 'cheer': {
      const b = Math.abs(Math.sin(t * 4));
      s.rightArm.rotation.set(0, 0, 2.6 + b * 0.25);
      s.leftArm.rotation.set(0, 0, -2.6 - b * 0.25);
      p.position.y = b * 1.2;
      break;
    }
    case 'sit':
      // sitting on a ledge: legs out over the edge, hands resting on the block either side
      s.rightLeg.rotation.set(-1.35, 0, 0.06);
      s.leftLeg.rotation.set(-1.3, 0, -0.06);
      s.rightArm.rotation.set(-0.25 + breathe * 0.02, 0, 0.18);
      s.leftArm.rotation.set(-0.25 + breathe * 0.02, 0, -0.18);
      p.position.y = -10.5;
      break;
    case 'idle':
    default:
      break;
  }
}

export function Player3D({
  pose = 'idle',
  facing = 'left',
  lighting = defaultLighting,
  height = 360,
  lookAtCursor = true,
  className = '',
}: Player3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const laptopRef = useRef<THREE.Group | null>(null);
  const poseRef = useRef(pose);
  const facingRef = useRef(facing);
  const lightingRef = useRef(lighting);
  const [failed, setFailed] = useState(() => !webglAvailable());
  const width = Math.round(height * 0.8);

  poseRef.current = pose;
  facingRef.current = facing;
  lightingRef.current = lighting;

  // Create the viewer once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    let viewer: SkinViewer;
    try {
      viewer = new SkinViewer({ canvas, width, height, pixelRatio: 'match-device' });
    } catch {
      setFailed(true);
      return;
    }
    viewerRef.current = viewer;
    viewer
      .loadSkin(SKIN_URL, { model: 'default' })
      .then(() => {
        // skinview3d leaves the skin texture untagged (treated as linear); tag it sRGB so the
        // colour-managed OutputPass below shows the skin's true colours.
        const map = viewer.playerObject.skin.map;
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          map.needsUpdate = true;
        }
      })
      .catch(() => setFailed(true));

    // --- Render path: tone mapping ---
    // skinview3d renders RenderPass -> render target -> FXAA ShaderPass -> screen. three only applies
    // renderer.toneMapping when drawing straight to the canvas with a built-in material, so neither
    // pass would tone map (or sRGB-encode). Insert an OutputPass (tone mapping + sRGB) before FXAA,
    // and make the intermediate targets half-float so highlights survive until ACES rolls them off.
    viewer.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    viewer.renderer.toneMappingExposure = lightingRef.current.exposure;
    for (const rt of [viewer.composer.renderTarget1, viewer.composer.renderTarget2]) {
      rt.texture.type = THREE.HalfFloatType;
      rt.dispose(); // reallocated with the new type on next use
    }
    const outputPass = new OutputPass();
    viewer.composer.insertPass(outputPass, 1);

    // --- Scene-matched lights ---
    const sunLight = new THREE.DirectionalLight();
    const rimLight = new THREE.DirectionalLight();
    const hemiLight = new THREE.HemisphereLight();
    const aim = new THREE.Object3D(); // the player's chest, roughly
    aim.position.set(0, 4, 0);
    sunLight.target = aim;
    rimLight.target = aim;
    viewer.scene.add(sunLight, rimLight, hemiLight, aim);
    viewer.cameraLight.intensity = CAMERA_LIGHT;

    let lightTarget = lightingRef.current;
    const cur = toState(lightTarget);
    let from = cloneState(cur);
    let to = cloneState(cur);
    let fadeStart = -Infinity;
    const applyLights = () => {
      sunLight.color.copy(cur.sunColor);
      sunLight.intensity = cur.sun;
      sunLight.position.copy(cur.sunDir).multiplyScalar(LIGHT_DISTANCE).add(aim.position);
      rimLight.color.copy(cur.rimColor);
      rimLight.intensity = cur.rim;
      rimLight.position.copy(cur.rimDir).multiplyScalar(LIGHT_DISTANCE).add(aim.position);
      hemiLight.color.copy(cur.sky);
      hemiLight.groundColor.copy(cur.ground);
      hemiLight.intensity = cur.hemi;
      viewer.globalLight.intensity = cur.ambient;
      viewer.globalLight.color.set('#ffffff');
      viewer.renderer.toneMappingExposure = cur.exposure;
    };
    const updateLights = () => {
      const now = performance.now();
      if (lightingRef.current !== lightTarget) {
        lightTarget = lightingRef.current;
        from = cloneState(cur);
        to = toState(lightTarget);
        fadeStart = now;
      }
      const p = Math.min(1, (now - fadeStart) / LIGHT_EASE_MS);
      if (p >= 1 && fadeStart !== -Infinity) {
        mixState(cur, to, to, 0);
        fadeStart = -Infinity;
      } else if (p < 1) {
        mixState(cur, from, to, p * p * (3 - 2 * p)); // smoothstep
      }
      applyLights();
    };
    applyLights();
    viewer.fov = 32;
    viewer.zoom = 0.86;
    viewer.controls.enabled = false;
    viewer.playerWrapper.position.y = 0.5;

    // Laptop prop, held against the chest
    const laptop = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 0.9), new THREE.MeshStandardMaterial({ color: '#4a4e57', roughness: 0.6 }));
    const edge = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.6, 1), new THREE.MeshStandardMaterial({ color: '#7a7f8a', roughness: 0.5 }));
    edge.position.y = 4.5;
    const logo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: '#2fc477', emissive: '#1a7a48' }));
    logo.position.set(0, 0.5, 0.5);
    laptop.add(shell, edge, logo);
    laptop.position.set(0, -1.2, 3.4);
    laptop.rotation.x = -0.12;
    laptop.visible = false;
    viewer.playerObject.skin.body.add(laptop);
    laptopRef.current = laptop;

    // Head follows the cursor
    const target = { x: 0, y: 0 };
    const look = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.15;
      target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)));
    };
    if (lookAtCursor) window.addEventListener('pointermove', onMove);

    const reduced = prefersReducedMotion();
    const anim = new FunctionAnimation((player, progress) => {
      const t = reduced ? 0 : progress;
      updateLights();
      const currentPose = poseRef.current;
      applyPose(player, currentPose, t);
      laptop.visible = currentPose === 'laptop';
      // ease body turn + head look
      const fy = FACING_Y[facingRef.current];
      player.rotation.y += (fy - player.rotation.y) * 0.08;
      look.x += (target.x - look.x) * 0.1;
      look.y += (target.y - look.y) * 0.1;
      const down = currentPose === 'laptop' ? 0.25 : 0;
      if (facingRef.current.startsWith('away')) {
        // gazing out over the scene: no cursor tracking, head tilted slightly down
        player.skin.head.rotation.y = Math.sin(t * 0.25) * 0.15;
        player.skin.head.rotation.x = 0.15;
      } else {
        player.skin.head.rotation.y = look.x * 0.7 - fy * 0.4;
        player.skin.head.rotation.x = look.y * 0.35 + down;
      }
    });
    viewer.animation = anim;

    const onVis = () => {
      viewer.renderPaused = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      viewer.scene.remove(sunLight, rimLight, hemiLight, aim);
      sunLight.dispose();
      rimLight.dispose();
      hemiLight.dispose();
      outputPass.dispose();
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, lookAtCursor]);

  // Resize
  useEffect(() => {
    viewerRef.current?.setSize(width, height);
  }, [width, height]);

  if (failed) {
    return <PlayerFigure facing={facing === 'right' || facing === 'awayRight' ? 'right' : 'left'} height={height} />;
  }

  return (
    <div className={`player3d ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        className="player3d__canvas"
        aria-hidden="true"
        style={{ filter: gradeFilter(lighting.grade), transition: `filter ${LIGHT_EASE_MS}ms ease` }}
      />
      <div className="player3d__shadow" aria-hidden="true" />
    </div>
  );
}
