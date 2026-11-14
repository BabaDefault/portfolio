// The player in elytra flight: input + autopilot -> physics -> pose -> chase camera.
// Also runs the intro, landing and take-off sequences around each island's beacon.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { PlayerObject } from 'skinview3d';
import * as THREE from 'three';
import { applyPose, type Pose } from '../../scenes/Player3D';
import { markVisited } from '../../progress';
import { screens, type ScreenId } from '../../screens/registry';
import { sfx } from '../../audio/sfx';
import { cancelAutopilot, emitFlightFrame, flight, forward, getUi, land, setUi, wrapAngle } from '../flight';
import { roofAt, surfaceAt, type World } from '../generate';
import { clamp, smoothstep } from '../noise';

const SKIN_URL = `${import.meta.env.BASE_URL}skins/player.png`;
const PX = 1 / 16; // skinview3d units are skin pixels; a block is 16 of them

const CRUISE = 19;
const BOOST = 36;
const TURN_RATE = 1.35;
const LANDING_TIME = 2.1;
const TAKEOFF_TIME = 1.7;
/** The first part of a take-off is the crouch before the jump. */
const CROUCH = 0.22;
const AUTOLAND_RADIUS = 30;
const NEAR_RADIUS = 42;
const BOUNDS = 300;

/** Poses that read well standing on a beacon pad (props like the laptop only exist on the 2D site). */
const LANDED_POSE: Partial<Record<Pose, Pose>> = { laptop: 'wave', read: 'crossed', lantern: 'point', peek: 'think' };

function elytraTexture() {
  // Cape-layout texture (64×32); skinview3d's elytra samples the 22..46 × 0..22 region.
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++) {
      // pale lavender membrane, darker feather ribs, blush-pink trailing tips
      const k = y / 22;
      const base = [196 - k * 26, 190 - k * 34, 222 - k * 18];
      const feather = x % 3 === 0 ? 0.74 : 1;
      const tip = y > 14 ? [38, -6, 4] : [0, 0, 0];
      const edge = y === 0 || x === 22 || x === 33 || x === 34 || x === 45 ? 0.6 : 1;
      const n = 0.94 + ((x * 7 + y * 13) % 5) * 0.025;
      const m = feather * n * edge;
      ctx.fillStyle = `rgb(${(base[0] + tip[0]) * m}, ${(base[1] + tip[1]) * m}, ${(base[2] + tip[2]) * m})`;
      ctx.fillRect(x, y, 1, 1);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createPlayer() {
  const p = new PlayerObject();
  p.skin.modelType = 'default';
  const skin = new THREE.TextureLoader().load(SKIN_URL);
  skin.magFilter = THREE.NearestFilter;
  skin.minFilter = THREE.NearestFilter;
  skin.colorSpace = THREE.SRGBColorSpace;
  p.skin.map = skin;
  p.elytra.map = elytraTexture();
  p.backEquipment = 'elytra';
  const box = new THREE.Box3().setFromObject(p.skin);
  return { player: p, centerY: (box.min.y + box.max.y) / 2, halfHeight: ((box.max.y - box.min.y) / 2) * PX };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Transition = {
  t: number;
  dur: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  control: THREE.Vector3;
  fromYaw: number;
  toYaw: number;
  fromLie: number;
  toLie: number;
  leapt: boolean;
};

export function Flyer({ world, reduced }: { world: World; reduced: boolean }) {
  const { camera, gl } = useThree();
  const { player, centerY, halfHeight } = useMemo(createPlayer, []);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  const s = useMemo(
    () => ({
      lie: 1,
      wings: 1,
      crouch: 0,
      trans: null as Transition | null,
      lastCommand: 0,
      landedId: null as ScreenId | null,
      approach: new THREE.Vector2(0, 1),
      spot: new THREE.Vector3(),
      camPos: new THREE.Vector3(),
      camLook: new THREE.Vector3(),
      camInit: false,
      started: false,
      t: 0,
    }),
    [],
  );
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);

  // Drag (mouse or touch) to look around; eases back behind the player on release.
  useEffect(() => {
    const el = gl.domElement;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      flight.look.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!flight.look.dragging) return;
      flight.look.yaw -= (e.clientX - lastX) * 0.006;
      flight.look.pitch = clamp(flight.look.pitch + (e.clientY - lastY) * 0.004, -0.5, 0.9);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      flight.look.dragging = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.style.touchAction = 'none';
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  const destById = (id: ScreenId) => world.dests.find((d) => d.id === id)!;
  const beaconOf = (id: ScreenId) => {
    const d = destById(id);
    return { x: d.x + 0.5, z: d.z + 0.5, y: d.y, view: d.view };
  };

  /** Where the player stands at a beacon: just in front of it, on the side the camera views from. */
  function standAt(id: ScreenId) {
    const b = beaconOf(id);
    s.approach.set(b.view[0], b.view[1]);
    s.spot.set(b.x + b.view[0] * 3.2, b.y, b.z + b.view[1] * 3.2);
    s.landedId = id;
    return Math.atan2(b.view[0], b.view[1]); // facing the camera
  }

  function startLanding(id: ScreenId) {
    const faceYaw = standAt(id);
    const to = s.spot.clone().add(new THREE.Vector3(0, halfHeight, 0));
    const control = flight.pos.clone().lerp(to, 0.6);
    control.y = Math.max(flight.pos.y, to.y) + 4;
    s.trans = { t: 0, dur: LANDING_TIME, from: flight.pos.clone(), to, control, fromYaw: flight.yaw, toYaw: faceYaw, fromLie: s.lie, toLie: 0, leapt: true };
    flight.mode = 'landing';
    flight.boosting = false;
    flight.launch = 0;
    setUi({ mode: 'landing', near: null, target: null });
    sfx.portal();
  }

  function startTakeoff() {
    // crouch, jump, then swoop away from the camera over the beacon and into the island
    const heading = Math.atan2(-s.approach.x, -s.approach.y);
    const to = flight.pos.clone().add(new THREE.Vector3(-s.approach.x * 7, 10, -s.approach.y * 7));
    const control = flight.pos.clone().add(new THREE.Vector3(0, 7, 0));
    s.trans = { t: 0, dur: TAKEOFF_TIME, from: flight.pos.clone(), to, control, fromYaw: flight.yaw, toYaw: heading, fromLie: 0, toLie: 1, leapt: false };
    flight.mode = 'takeoff';
    setUi({ mode: 'takeoff', landed: null });
    sfx.pop();
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    s.t += dt;
    const ui = getUi();
    const inp = flight.input;

    // First frame: stand at spawn for the intro.
    if (!s.started) {
      s.started = true;
      if (flight.mode === 'intro') {
        flight.yaw = standAt('title');
        flight.pos.copy(s.spot).y += halfHeight;
        flight.pitch = flight.roll = flight.speed = 0;
        s.lie = 0;
        s.wings = 0;
      }
    }

    // ---- Commands from the HUD ----
    if (ui.command && ui.command.at !== s.lastCommand) {
      s.lastCommand = ui.command.at;
      if (ui.command.type === 'land' && ui.command.id && flight.mode === 'fly') startLanding(ui.command.id);
      else if (ui.command.type === 'takeoff' && (flight.mode === 'landed' || flight.mode === 'intro')) startTakeoff();
    }

    // ---- Flight ----
    if (flight.mode === 'fly') {
      let turn = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
      let climb = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
      const manual = turn !== 0 || climb !== 0;
      if (manual && ui.target) cancelAutopilot();

      const fwd = forward(flight.yaw, 0, v.a);
      // terrain look-ahead
      let ahead = surfaceAt(world, flight.pos.x, flight.pos.z, flight.pos.y);
      for (const d of [6, 14, 26, 40]) ahead = Math.max(ahead, surfaceAt(world, flight.pos.x + fwd.x * d, flight.pos.z + fwd.z * d, flight.pos.y));

      if (ui.target && !manual) {
        const b = beaconOf(ui.target);
        const dx = b.x - flight.pos.x;
        const dz = b.z - flight.pos.z;
        const dist = Math.hypot(dx, dz);
        let want = Math.atan2(dx, dz);
        // too far below a floating island to reach it head-on: circle up first
        const tooLow = b.y + 6 - flight.pos.y > dist * 0.4;
        if (tooLow) want += Math.PI / 2;
        turn = clamp(wrapAngle(want - flight.yaw) * 2.2, -1, 1);
        const desiredAlt = Math.max(b.y + clamp(dist * 0.22, 7, 26), ahead + 10);
        climb = clamp((desiredAlt - flight.pos.y) * 0.12, -1, 1);
        if (dist < AUTOLAND_RADIUS && !tooLow) land(ui.target);
      }

      // stay clear of the ground and below the ceiling
      if (flight.pos.y < ahead + 7) climb = Math.max(climb, clamp((ahead + 7 - flight.pos.y) * 0.3, 0, 1));
      if (flight.pos.y > 170) climb = Math.min(climb, -0.6);

      // the ocean goes on forever: turn back
      const r = Math.hypot(flight.pos.x, flight.pos.z);
      if (r > BOUNDS) flight.outOfBounds = true;
      else if (r < BOUNDS - 30) flight.outOfBounds = false;
      if (flight.outOfBounds) turn = clamp(wrapAngle(Math.atan2(-flight.pos.x, -flight.pos.z) - flight.yaw) * 2, -1, 1);

      flight.yawVel += (turn * TURN_RATE - flight.yawVel) * (1 - Math.exp(-dt * 4));
      flight.yaw = wrapAngle(flight.yaw + flight.yawVel * dt);
      flight.pitch += (climb * 0.5 - flight.pitch) * (1 - Math.exp(-dt * 3));
      flight.roll += (-flight.yawVel * 0.42 - flight.roll) * (1 - Math.exp(-dt * 5));

      const wantBoost = inp.boost && flight.boost > 0.02;
      flight.launch = Math.max(0, flight.launch - dt);
      flight.boosting = wantBoost || flight.launch > 0;
      flight.boost = clamp(flight.boost + (wantBoost ? -dt * 0.3 : dt * 0.1), 0, 1);
      const targetSpeed = clamp((flight.boosting ? BOOST : CRUISE) - flight.pitch * 16, 9, 44);
      flight.speed += (targetSpeed - flight.speed) * (1 - Math.exp(-dt * (flight.boosting ? 2.5 : 1.2)));

      flight.pos.addScaledVector(forward(flight.yaw, flight.pitch, v.b), flight.speed * dt);
      const floor = surfaceAt(world, flight.pos.x, flight.pos.z, flight.pos.y) + 2.2;
      if (flight.pos.y < floor) flight.pos.y += (floor - flight.pos.y) * Math.min(1, dt * 10);
      const roof = roofAt(world, flight.pos.x, flight.pos.z, flight.pos.y) - 2.5;
      if (flight.pos.y > roof) flight.pos.y = Math.max(floor, roof);

      // nearest destination you could land at
      let near: ScreenId | null = null;
      let best = NEAR_RADIUS;
      for (const d of world.dests) {
        const dd = Math.hypot(d.x + 0.5 - flight.pos.x, d.z + 0.5 - flight.pos.z);
        if (dd < best && flight.pos.y > d.y - 4 && flight.pos.y - d.y < 70) {
          best = dd;
          near = d.id;
        }
      }
      if (ui.near !== near) setUi({ near });
      s.wings = Math.max(0.15, 1 - Math.max(0, -flight.pitch) * 1.4);
      s.crouch = 0;
    } else if (s.trans) {
      // ---- Landing / take-off ----
      const tr = s.trans;
      const takeoff = flight.mode === 'takeoff';
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      // a take-off starts with a crouch, then the jump
      const kk = takeoff ? Math.max(0, (k - CROUCH) / (1 - CROUCH)) : k;
      s.crouch = takeoff && k < CROUCH ? Math.sin((k / CROUCH) * Math.PI * 0.5) : takeoff ? Math.max(0, 1 - kk * 6) : 0;
      if (takeoff && !tr.leapt && k >= CROUCH) {
        tr.leapt = true;
        flight.boosting = true; // firework!
        sfx.portal();
      }
      const e = takeoff ? 1 - Math.pow(1 - kk, 2.2) : ease(kk);
      // quadratic bezier from -> control -> to
      const a = v.a.copy(tr.from).lerp(tr.control, e);
      const b = v.b.copy(tr.control).lerp(tr.to, e);
      flight.pos.copy(a.lerp(b, e));
      flight.pos.y -= s.crouch * 0.28;
      flight.yaw = tr.fromYaw + wrapAngle(tr.toYaw - tr.fromYaw) * smoothstep(0, takeoff ? 0.55 : 1, kk);
      flight.pitch *= 1 - Math.min(1, dt * 4);
      flight.roll *= 1 - Math.min(1, dt * 4);
      flight.yawVel = 0;
      s.lie = tr.fromLie + (tr.toLie - tr.fromLie) * smoothstep(takeoff ? 0.25 : 0.45, takeoff ? 0.85 : 1, kk);
      s.wings = takeoff ? smoothstep(0.1, 0.8, kk) : 1 - smoothstep(0.5, 1, kk);
      if (k >= 1) {
        s.trans = null;
        if (!takeoff && s.landedId) {
          flight.mode = 'landed';
          flight.speed = 0;
          setUi({ mode: 'landed', landed: s.landedId });
          markVisited(s.landedId);
        } else {
          flight.mode = 'fly';
          flight.speed = CRUISE;
          flight.pitch = 0.32;
          flight.launch = 1.3;
          s.landedId = null;
          setUi({ mode: 'fly' });
        }
      }
    }

    // ---- Pose ----
    const p = player;
    const sk = p.skin;
    const standing = flight.mode === 'landed' || flight.mode === 'intro' || (flight.mode !== 'fly' && s.lie < 0.02);
    if (standing) {
      const def = screens.find((x) => x.id === s.landedId);
      const pose = flight.mode === 'takeoff' ? 'idle' : def ? (LANDED_POSE[def.pose] ?? def.pose) : 'idle';
      applyPose(p, pose, reduced ? 0 : s.t);
      sk.head.rotation.set(0.05 + Math.sin(s.t * 0.7) * 0.03 + s.crouch * 0.25, Math.sin(s.t * 0.4) * 0.15 * (1 - s.crouch), 0);
      if (s.crouch > 0) {
        // wind up: arms swing back, knees (well, legs) brace
        sk.leftArm.rotation.set(0.9 * s.crouch, 0, 0.12);
        sk.rightArm.rotation.set(0.9 * s.crouch, 0, -0.12);
        sk.leftLeg.rotation.set(-0.25 * s.crouch, 0, 0);
        sk.rightLeg.rotation.set(0.25 * s.crouch, 0, 0);
        sk.body.rotation.x = 0.2 * s.crouch;
      }
    } else {
      const flap = reduced ? 0 : Math.sin(s.t * 2.2);
      p.position.y = 0;
      sk.body.rotation.set(0, 0, 0);
      sk.head.rotation.set((-Math.PI / 4) * s.lie, 0, 0);
      const arm = 0.18 + (1 - s.wings) * 0.12 + flap * 0.02;
      // arms reach up on the jump, then sweep back along the body
      const reach = flight.mode === 'takeoff' ? (1 - s.lie) * -2.6 : 0;
      sk.leftArm.rotation.set(reach, 0, arm * s.lie + 0.07 * (1 - s.lie));
      sk.rightArm.rotation.set(reach, 0, -arm * s.lie - 0.07 * (1 - s.lie));
      sk.leftLeg.rotation.set(flap * 0.05, 0, 0.02);
      sk.rightLeg.rotation.set(-flap * 0.05, 0, -0.02);
    }
    const spread = s.wings;
    p.elytra.leftWing.rotation.x = 0.2617994 + (0.34906584 - 0.2617994) * spread;
    p.elytra.leftWing.rotation.z = 0.2617994 + (Math.PI / 2 - 0.2617994) * spread * 0.85;
    p.elytra.updateRightWing();

    if (root.current && body.current) {
      root.current.position.copy(flight.pos);
      root.current.rotation.set(-flight.pitch * s.lie, flight.yaw, flight.roll * s.lie, 'YXZ');
      body.current.rotation.x = (Math.PI / 2) * s.lie;
    }

    // ---- Camera ----
    const cam = camera as THREE.PerspectiveCamera;
    if (!flight.look.dragging) {
      flight.look.yaw *= 1 - Math.min(1, dt * 1.6);
      flight.look.pitch *= 1 - Math.min(1, dt * 1.6);
    }
    let fov: number;
    const desiredPos = v.a;
    const desiredLook = v.b;
    const chase = flight.mode === 'fly' || (flight.mode === 'takeoff' && s.lie > 0.35);
    if (chase) {
      const dist = 4.9 + flight.speed * 0.07;
      const off = v.c.set(-Math.sin(flight.yaw) * dist, 1.35 - flight.pitch * 1.6, -Math.cos(flight.yaw) * dist);
      off.applyAxisAngle(v.up, flight.look.yaw);
      off.y += Math.sin(flight.look.pitch) * dist;
      desiredPos.copy(flight.pos).add(off);
      desiredLook.copy(flight.pos).addScaledVector(forward(flight.yaw, flight.pitch * 0.6, v.c), 7);
      desiredLook.y += 0.6;
      fov = 62 + (flight.speed - CRUISE) * 0.45;
    } else {
      // cinematic framing: the player on one side, the panel on the other
      const def = screens.find((x) => x.id === s.landedId);
      const sway = reduced ? 0 : Math.sin(s.t * 0.15) * 0.1;
      const ax = s.approach.x * Math.cos(sway) - s.approach.y * Math.sin(sway);
      const az = s.approach.x * Math.sin(sway) + s.approach.y * Math.cos(sway);
      desiredPos.set(s.spot.x + ax * 8.4, s.spot.y + 3.1, s.spot.z + az * 8.4);
      desiredPos.x += Math.sin(flight.look.yaw) * 4;
      desiredPos.y += Math.sin(flight.look.pitch) * 4;
      const rx = az;
      const rz = -ax;
      // the panel takes the left unless the screen puts it on the right; the player stands opposite
      const side = def?.placement === 'right' ? 1 : -1;
      const lift = flight.mode === 'takeoff' ? flight.pos.y - halfHeight - s.spot.y : 0;
      desiredLook.set(s.spot.x + rx * 2.3 * side, s.spot.y + 1.4 + lift * 0.8, s.spot.z + rz * 2.3 * side);
      fov = 42;
    }
    const camFloor = surfaceAt(world, desiredPos.x, desiredPos.z, desiredPos.y) + 1.4;
    if (desiredPos.y < camFloor) desiredPos.y = camFloor;
    if (!s.camInit) {
      s.camPos.copy(desiredPos);
      s.camLook.copy(desiredLook);
      s.camInit = true;
    }
    const kc = 1 - Math.exp(-dt * (flight.mode === 'fly' ? 6 : flight.mode === 'takeoff' ? 3.2 : 2.6));
    s.camPos.lerp(desiredPos, kc);
    s.camLook.lerp(desiredLook, kc);
    cam.position.copy(s.camPos);
    cam.lookAt(s.camLook);
    if (flight.mode === 'fly') cam.rotateZ(flight.roll * (reduced ? 0.05 : 0.12));
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();

    emitFlightFrame(dt);
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <group scale={PX} position={[0, -centerY * PX, 0]}>
          <primitive object={player} />
        </group>
      </group>
    </group>
  );
}
