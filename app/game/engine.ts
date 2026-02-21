import type { Ref } from "vue";
import { nasa } from "./rocket";
import { stars, buildGrid, buildRings } from "./environment";
import { lockheed, type TunnelState } from "./targets";
import {
  FORWARD_THRUST, DRAG, MAX_SPEED, TURN_RATE,
  TUNNEL_SOFT_EDGE, TUNNEL_RADIUS, TUNNEL_PUSH,
} from "./constants";
import { BTNS } from "../composables/useGameState";

interface GameState {
  engines: { left: boolean; top: boolean; right: boolean; bottom: boolean };
  score: Ref<number>;
  speed: Ref<number>;
  started: Ref<boolean>;
  tunnelWarning: Ref<number>;
  kill: () => void;
}

export async function init(canvas: HTMLCanvasElement, state: GameState) {
  const THREE = await import("three");
  const { default: Stats } = await import("three/addons/libs/stats.module.js");

  const stats = new Stats();
  stats.showPanel(0);
  Object.assign(stats.dom.style, {
    position: "fixed", bottom: "8px", right: "8px", left: "auto", zIndex: "100000",
  });
  document.body.appendChild(stats.dom);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 2, 0.1, 800);

  scene.add(new THREE.AmbientLight("#1a1a2e", 0.8));
  const dirLight = new THREE.DirectionalLight("#ffffff", 1.2);
  dirLight.position.set(5, 20, -5);
  scene.add(dirLight);

  // environment
  const { starGeo, starCount } = stars(THREE, scene);
  const grid = buildGrid(THREE, scene);
  const { tunnelRings, ringMat, tunnelNormalColor, tunnelWarnColor } = buildRings(THREE, scene);

  // rocket
  const { rocket, exhaustCone, exhaustOuter, coreMat, coreLight, eParts } = nasa(THREE);
  scene.add(rocket);

  // physics
  const vel = new THREE.Vector3();
  const pos = new THREE.Vector3();

  // tunnel
  const tunnel: TunnelState = {
    center: new THREE.Vector3(),
    dir: new THREE.Vector3(0, 0, -1),
  };

  // targets
  const { targets, spawnBox, collectFX, updateFX } = lockheed(THREE, scene, tunnel, pos);
  for (let i = 0; i < 8; i++) spawnBox();

  // game loop
  const clock = new THREE.Clock();
  let raf = 0;
  const camTarget = new THREE.Vector3();

  function animate() {
    raf = requestAnimationFrame(animate);
    gpad();
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!state.started.value) {
      const t = clock.getElapsedTime();
      camera.position.set(Math.sin(t * 0.2) * 8, 4 + Math.sin(t * 0.1) * 2, Math.cos(t * 0.2) * 8);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      const ef = 0.7 + Math.random() * 0.5;
      exhaustCone.scale.set(ef, 0.7 + Math.random() * 0.6, ef);
      for (const tgt of targets) {
        tgt.userData.phase += dt;
        tgt.rotation.y += dt * 0.8;
        tgt.position.y = tgt.userData.baseY + Math.sin(tgt.userData.phase) * 0.3;
      }
      renderer.render(scene, camera);
      stats.update();
      return;
    }

    if (state.engines.left) rocket.rotateY(-TURN_RATE * dt);
    if (state.engines.right) rocket.rotateY(TURN_RATE * dt);
    if (state.engines.top) rocket.rotateX(-TURN_RATE * dt);
    if (state.engines.bottom) rocket.rotateX(TURN_RATE * dt);

    for (const [name, ep] of Object.entries(eParts)) {
      const on = state.engines[name as keyof typeof state.engines];
      ep.flame.visible = on;
      if (on) {
        const f = 0.7 + Math.random() * 0.6;
        ep.cone.scale.set(f, 0.6 + Math.random() * 0.8, f);
        ep.outer.scale.set(f * 1.1, 0.5 + Math.random() * 1, f * 1.1);
      }
    }

    // physics
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rocket.quaternion);
    vel.addScaledVector(forward, FORWARD_THRUST * dt);
    vel.multiplyScalar(Math.max(0, 1 - DRAG * dt));
    if (vel.length() > MAX_SPEED) vel.setLength(MAX_SPEED);

    const tfs = vel.dot(tunnel.dir);
    if (tfs < 8) vel.addScaledVector(tunnel.dir, 8 - tfs);

    pos.addScaledVector(vel, dt);
    rocket.position.copy(pos);
    state.speed.value = vel.length();

    // tunnel constraints
    const shipOffset = new THREE.Vector3().subVectors(pos, tunnel.center);
    const axialDist = shipOffset.dot(tunnel.dir);
    const closestPoint = tunnel.center.clone().addScaledVector(tunnel.dir, axialDist);
    const lateralVec = new THREE.Vector3().subVectors(pos, closestPoint);
    const lateralDist = lateralVec.length();
    if (lateralDist > TUNNEL_SOFT_EDGE) {
      const edge = Math.min((lateralDist - TUNNEL_SOFT_EDGE) / (TUNNEL_RADIUS - TUNNEL_SOFT_EDGE), 2);
      vel.addScaledVector(lateralVec.normalize(), -TUNNEL_PUSH * edge * edge * dt);
    }
    const w = lateralDist > TUNNEL_SOFT_EDGE
      ? Math.min((lateralDist - TUNNEL_SOFT_EDGE) / (TUNNEL_RADIUS - TUNNEL_SOFT_EDGE), 1) : 0;
    state.tunnelWarning.value = w;
    ringMat.color.copy(tunnelNormalColor).lerp(tunnelWarnColor, w);
    ringMat.opacity = 0.04 + w * 0.18;

    // tunnel ring repositioning
    const playerAxialRing = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);
    const ringStep = 15;
    const ringBase = Math.ceil(playerAxialRing / ringStep) * ringStep;
    for (let i = 0; i < tunnelRings.length; i++) {
      const ringOffset = ringBase + i * ringStep;
      const rp = tunnel.center.clone().addScaledVector(tunnel.dir, ringOffset);
      tunnelRings[i].position.copy(rp);
      tunnelRings[i].lookAt(rp.clone().add(tunnel.dir));
    }

    // exhaust flicker
    const ef = 0.7 + Math.random() * 0.5;
    exhaustCone.scale.set(ef, 0.7 + Math.random() * 0.6, ef);
    exhaustOuter.scale.set(ef * 1.1, 0.6 + Math.random() * 0.8, ef * 1.1);

    // core glow
    const anyOn = state.engines.left || state.engines.top || state.engines.right || state.engines.bottom;
    coreMat.emissiveIntensity = anyOn ? 1.0 : 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    coreLight.intensity = anyOn ? 1.2 : 0.4;

    // targets & collection
    for (const t of targets) {
      t.userData.phase += dt * 1.2;
      t.rotation.y += dt * 0.7;
      t.position.y = t.userData.baseY + Math.sin(t.userData.phase) * 0.3;
      if (pos.distanceTo(t.position) < 2) {
        state.score.value++;
        collectFX(t.position, (t.material as THREE_NS.MeshStandardMaterial).color.getStyle());
        spawnBox(t);
      } else if (new THREE.Vector3().subVectors(t.position, pos).dot(forward) < -30) {
        spawnBox(t);
      }
    }

    updateFX(dt);

    // camera
    camTarget.copy(pos).add(new THREE.Vector3(0, 5, 16).applyQuaternion(rocket.quaternion));
    camera.position.lerp(camTarget, 3 * dt);
    camera.up.lerp(new THREE.Vector3(0, 1, 0).applyQuaternion(rocket.quaternion), 2 * dt).normalize();
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0, -10).applyQuaternion(rocket.quaternion)));

    // follow light
    dirLight.position.set(pos.x + 5, pos.y + 20, pos.z - 5);

    // star wrapping
    const sp = starGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < starCount; i++) {
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j, rel = sp[idx] - pos.getComponent(j);
        if (rel > 200) sp[idx] -= 400;
        else if (rel < -200) sp[idx] += 400;
      }
    }
    starGeo.attributes.position.needsUpdate = true;

    // grid follow
    grid.position.x = Math.round(pos.x / 2.5) * 2.5;
    grid.position.z = Math.round(pos.z / 2.5) * 2.5;

    renderer.render(scene, camera);
    stats.update();
  }

  // resize
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // input
  const keyMap = BTNS.reduce<Record<string, string>>((map, btn) => {
    const keys = Array.isArray(btn.key) ? btn.key : [btn.key];
    for (const key of keys) map[key.toLowerCase()] = btn.name;
    return map;
  }, {});

  function onKeyDown(e: KeyboardEvent) {
    if (!state.started.value) { state.started.value = true; return; }
    if (e.repeat) return;
    const pressed = e.key.toLowerCase();
    const eng = keyMap[pressed];
    if (eng) {
      e.preventDefault();
      state.engines[eng as keyof typeof state.engines] = !state.engines[eng as keyof typeof state.engines];
    }
    if (e.key === " ") { e.preventDefault(); state.kill(); }
    if (pressed === "r") {
      pos.set(0, 0, 0); vel.set(0, 0, 0);
      rocket.quaternion.identity(); state.kill();
      tunnel.center.set(0, 0, 0); tunnel.dir.set(0, 0, -1);
      state.tunnelWarning.value = 0;
    }
  }

  // gpad
  const gpButtonMap: Record<number, keyof typeof state.engines> = {
    0: "right",
    1: "bottom",
    2: "top",
    3: "left",
  };
  const pb = new Array(8).fill(false);

  window.addEventListener("gamepadconnected", (e) => {
    console.log(`gpad online at ${e.gamepad.id} (index ${e.gamepad.index}, ${e.gamepad.buttons.length} inputs, ${e.gamepad.axes.length} axes)`);
  });
  window.addEventListener("gamepaddisconnected", (e) => {
    console.log(`gpad offline at ${e.gamepad.id}`);
  });

  function gpad() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;
      for (let i = 0; i < gp.buttons.length; i++) {
        const pressed = gp.buttons[i].pressed;
        if (pressed !== pb[i]) {
          console.log(`gpad button B${i} ${pressed ? "on" : "off"} (value: ${gp.buttons[i].value})`);
          if (!state.started.value && pressed) {
            state.started.value = true;
          }
          const eng = gpButtonMap[i];
          if (eng && state.started.value) {
            state.engines[eng] = pressed;
          }
          if (i === 4 && pressed) state.kill();
          if (i === 5 && pressed) {
            pos.set(0, 0, 0); vel.set(0, 0, 0);
            rocket.quaternion.identity(); state.kill();
            tunnel.center.set(0, 0, 0); tunnel.dir.set(0, 0, -1);
            state.tunnelWarning.value = 0;
          }
          pb[i] = pressed;
        }
      }
      for (let i = 0; i < gp.axes.length; i++) {
        if (Math.abs(gp.axes[i]) > 0.15) {
          console.log(`gpad axis ${i}: ${gp.axes[i].toFixed(4)}`);
        }
      }
      break;
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  resize();
  animate();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("gamepadconnected", () => {});
    window.removeEventListener("gamepaddisconnected", () => {});
    stats.dom.remove();
    renderer.dispose();
  };
}
