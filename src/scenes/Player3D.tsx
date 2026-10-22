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
export type Pose = 'idle' | 'wave' | 'walk' | 'laptop' | 'crossed' | 'think' | 'point' | 'cheer' | 'sit' | 'peek' | 'lantern' | 'read';

type Player3DProps = {
  pose?: Pose;
  /** awayLeft / awayRight: back to the camera, gazing into the scene (toward that side). */
  facing?: 'left' | 'right' | 'front' | 'awayLeft' | 'awayRight';
  /** Scene-matched key/rim/fill lighting; eased over ~0.6s when it changes. */
  lighting?: PlayerLighting;
  height?: number; // px
  lookAtCursor?: boolean;
  /** false: ignore the cursor and look straight at the viewer (can change without remounting). */
  trackCursor?: boolean;
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
  // neutral base (skinview3d: +z swings the left arm outward, -z the right)
  s.rightArm.rotation.set(Math.sin(t * 0.9) * 0.04, 0, -0.07 - breathe * 0.03);
  s.leftArm.rotation.set(-Math.sin(t * 0.9) * 0.04, 0, 0.07 + breathe * 0.03);
  s.rightLeg.rotation.set(0, 0, 0);
  s.leftLeg.rotation.set(0, 0, 0);
  s.body.rotation.set(0, 0, 0);
  p.position.y = 0;

  switch (pose) {
    case 'wave': {
      // hand raised beside the head, waving side to side for ~2.6s of every 4s; the other arm hangs relaxed
      s.rightArm.rotation.set(-0.12 + breathe * 0.02, 0, -0.14);
      const cycle = t % 4;
      if (cycle < 2.6) {
        const lift = Math.min(1, cycle / 0.3, (2.6 - cycle) / 0.3);
        s.leftArm.rotation.x = lift * -0.25;
        s.leftArm.rotation.z = 0.07 + lift * (2.45 + Math.sin(t * 9) * 0.35);
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
    case 'laptop': {
      // sitting on a log with the laptop on the lap, typing; legs angled down off the front
      const tap = (k: number) => Math.max(0, Math.sin(t * 11 + k)) * 0.05;
      s.rightLeg.rotation.set(-1.2, 0, 0.08);
      s.leftLeg.rotation.set(-1.25, 0, -0.08);
      s.rightArm.rotation.set(-1.0 + tap(0), 0, 0.22);
      s.leftArm.rotation.set(-1.0 + tap(2.1), 0, -0.22);
      p.position.y = -10.5;
      break;
    }
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
      // jumping jacks: arms up in a V and legs kicked out at the top of each hop
      s.rightArm.rotation.set(0, 0, -2.05 - b * 0.3);
      s.leftArm.rotation.set(0, 0, 2.05 + b * 0.3);
      s.rightLeg.rotation.z = -b * 0.28;
      s.leftLeg.rotation.z = b * 0.28;
      p.position.y = b * 3;
      break;
    }
    case 'sit':
      // sitting on a flat block: legs stretched out in front, hands resting either side
      s.rightLeg.rotation.set(-1.52, 0, 0.05);
      s.leftLeg.rotation.set(-1.48, 0, -0.05);
      s.rightArm.rotation.set(-0.25 + breathe * 0.02, 0, -0.18);
      s.leftArm.rotation.set(-0.25 + breathe * 0.02, 0, 0.18);
      p.position.y = -10.5;
      break;
    case 'peek':
      // leaning over an open chest: hands on the rim, rummaging a little
      s.rightArm.rotation.set(-0.6 + Math.sin(t * 1.3) * 0.05, 0, 0.12);
      s.leftArm.rotation.set(-0.75 + Math.sin(t * 1.3 + 1.2) * 0.05, 0, -0.12);
      break;
    case 'lantern':
      // lantern raised out in front to light the way, arm a little out from the body
      s.rightArm.rotation.set(-1.9 + Math.sin(t * 1.1) * 0.03, 0, -0.22);
      break;
    case 'read': {
      // holding an open recipe book at chest height, flipping a page now and then
      const flip = Math.max(0, Math.sin(t * 0.8)) ** 8 * 0.35;
      s.rightArm.rotation.set(-1.05 + breathe * 0.02 - flip, 0, 0.32);
      s.leftArm.rotation.set(-1.05 + breathe * 0.02, 0, -0.32);
      break;
    }
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
  trackCursor = true,
  className = '',
}: Player3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const laptopRef = useRef<THREE.Group | null>(null);
  const poseRef = useRef(pose);
  const facingRef = useRef(facing);
  const lightingRef = useRef(lighting);
  const trackRef = useRef(trackCursor);
  const [failed, setFailed] = useState(() => !webglAvailable());
  const width = Math.round(height * 0.8);

  poseRef.current = pose;
  facingRef.current = facing;
  lightingRef.current = lighting;
  trackRef.current = trackCursor;

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

    // Laptop prop: a black ThinkPad open on the lap (body space; the lap sits at y≈-4 when seated)
    const tpBlack = new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.6 });
    const tpKeys = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.9 });
    const tpRed = new THREE.MeshStandardMaterial({ color: '#e3262b', emissive: '#7a0d10', roughness: 0.5 });
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      return m;
    };
    const laptop = new THREE.Group();
    laptop.add(
      box(10, 0.6, 7, tpBlack, 0, 0, 0), // base
      box(9, 0.1, 3.4, tpKeys, 0, 0.33, 0.9), // keyboard
      box(0.35, 0.2, 0.35, tpRed, 0, 0.4, 0.9), // TrackPoint
      box(3.4, 0.1, 1.7, tpKeys, 0, 0.33, -2), // touchpad
    );
    // lid hinged at the far edge, tipped slightly back
    const lid = new THREE.Group();
    lid.position.set(0, 0.3, 3.5);
    lid.rotation.x = 0.28;
    lid.add(
      box(10, 7, 0.4, tpBlack, 0, 3.5, 0.2),
      box(9, 6, 0.05, new THREE.MeshStandardMaterial({ color: '#1d2b44', emissive: '#4f7fc4', emissiveIntensity: 0.6 }), 0, 3.6, -0.03), // display
      box(2.6, 0.45, 0.05, new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.4 }), 2.9, 1.2, 0.43), // "ThinkPad" badge
      box(0.5, 0.5, 0.06, tpRed, 4.55, 1.55, 0.43), // the red dot over the i
    );
    laptop.add(lid);
    laptop.position.set(0, -3.6, 6.5);
    laptop.visible = false;
    viewer.playerObject.skin.body.add(laptop);
    laptopRef.current = laptop;

    // Recipe book prop: open, held in both hands at chest height
    const cover = new THREE.MeshStandardMaterial({ color: '#5a2f1a', roughness: 0.8 });
    const paper = new THREE.MeshStandardMaterial({ color: '#efe3c2', roughness: 0.9 });
    const ink = new THREE.MeshStandardMaterial({ color: '#7a3b2a', roughness: 0.9 });
    const book = new THREE.Group();
    const half = (side: 1 | -1) => {
      const g = new THREE.Group();
      g.add(box(4.2, 0.4, 5.6, cover, side * 2.1, 0, 0), box(3.8, 0.35, 5.1, paper, side * 2.0, 0.35, 0));
      for (const z of [-1.6, -0.6, 0.4, 1.4]) g.add(box(2.4, 0.05, 0.35, ink, side * 2.0, 0.55, z)); // recipe lines
      g.rotation.z = side * -0.18; // pages open in a shallow V
      return g;
    };
    book.add(half(1), half(-1));
    book.position.set(0, -0.6, 8.2);
    book.rotation.x = 1.05; // tilted up toward the reader
    book.visible = false;
    viewer.playerObject.skin.body.add(book);

    // Lantern prop: hangs from the right hand (arm space: the hand ends at y≈-10), lit from inside
    const iron = new THREE.MeshStandardMaterial({ color: '#2a2b30', roughness: 0.55, metalness: 0.6 });
    const lantern = new THREE.Group();
    const lanternBody = new THREE.Group();
    lanternBody.add(
      box(4.4, 0.9, 4.4, iron, 0, 0, 0), // cap
      box(2.6, 0.6, 2.6, iron, 0, 0.7, 0), // cap knob
      box(1.6, 1.6, 0.4, iron, 0, 1.8, 0), // handle loop
      box(3.6, 3.4, 3.6, new THREE.MeshStandardMaterial({ color: '#c46a1c', emissive: '#ff8a1e', emissiveIntensity: 1.25 }), 0, -2.15, 0), // flame glass
      box(4.4, 0.9, 4.4, iron, 0, -4.3, 0), // base
    );
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) lanternBody.add(box(0.6, 3.4, 0.6, iron, x, -2.15, z)); // corner bars
    lanternBody.position.y = -2.4; // hang below the grip
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 190, 90, 1)');
    grad.addColorStop(0.3, 'rgba(255, 150, 50, 0.55)');
    grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 64, 64);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    halo.scale.set(18, 18, 1);
    halo.position.y = -4.5;
    const lanternLight = new THREE.PointLight('#ffb35c', 90, 60, 2);
    lanternLight.position.y = -4.5;
    lantern.add(lanternBody, halo, lanternLight);
    lantern.position.set(0, -10.2, 0);
    lantern.visible = false;
    viewer.playerObject.skin.rightArm.add(lantern);

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
      lantern.visible = currentPose === 'lantern';
      book.visible = currentPose === 'read';
      if (lantern.visible) {
        // keep it hanging straight down whatever the arm does, with a lazy swing and flicker
        const arm = player.skin.rightArm.rotation;
        lantern.rotation.set(-arm.x + Math.sin(t * 1.4) * 0.07, 0, -arm.z + Math.sin(t * 1.1 + 0.6) * 0.05);
        lanternLight.intensity = 90 * (0.9 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.7) * 0.05);
      }
      // ease body turn + head look
      // peeking: turn a bit further toward what's in front of you
      // laptop: sit nearly square to the camera, just angled toward the fire
      const fy = FACING_Y[facingRef.current] * (currentPose === 'peek' ? 1.7 : currentPose === 'laptop' ? 0.35 : 1);
      player.rotation.y += (fy - player.rotation.y) * 0.08;
      const track = trackRef.current;
      look.x += ((track ? target.x : 0) - look.x) * 0.1;
      look.y += ((track ? target.y : 0) - look.y) * 0.1;
      const down = currentPose === 'laptop' ? 0.45 : 0;
      if (currentPose === 'laptop') {
        // eyes on the screen, no cursor tracking
        player.skin.head.rotation.y = Math.sin(t * 0.5) * 0.05;
        player.skin.head.rotation.x = 0.42 + Math.sin(t * 0.7) * 0.03;
      } else if (currentPose === 'peek') {
        // eyes down into the chest, no cursor tracking
        player.skin.head.rotation.y = Math.sin(t * 0.6) * 0.12;
        player.skin.head.rotation.x = 0.7 + Math.sin(t * 0.4) * 0.04;
      } else if (currentPose === 'read') {
        // eyes on the recipe, reading across the page
        player.skin.head.rotation.y = Math.sin(t * 0.9) * 0.1;
        player.skin.head.rotation.x = 0.5 + Math.sin(t * 0.45) * 0.03;
      } else if (currentPose === 'lantern') {
        // chin up toward something far away, scanning slowly
        player.skin.head.rotation.y = Math.sin(t * 0.3) * 0.12;
        player.skin.head.rotation.x = -0.12;
      } else if (facingRef.current.startsWith('away')) {
        // gazing out over the scene: no cursor tracking, head tilted slightly down
        player.skin.head.rotation.y = Math.sin(t * 0.25) * 0.15;
        player.skin.head.rotation.x = 0.15;
      } else {
        // not tracking: body stays angled, head turns to meet the viewer
        player.skin.head.rotation.y = trackRef.current ? look.x * 0.7 - fy * 0.4 : -fy * 0.85;
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
