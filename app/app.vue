<template>
  <div class="relative w-full h-full select-none">
    <NuxtRouteAnnouncer />
    <canvas ref="canvasEl" class="block w-full h-full"></canvas>

    <div v-if="!started" class="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-50 cursor-pointer" @click="started = true">
      <h1 class="text-5xl font-bold text-white mb-2 tracking-tight">FLIPCORE</h1>
      <p class="text-lg text-white/50 mb-6">Your ship flies forward — toggle boosters to steer</p>
      <div class="text-white/60 font-mono text-sm space-y-1 text-center mb-8">
        <p>Keys <span class="text-red-400 font-bold">1</span> <span class="text-yellow-300 font-bold">2</span> <span class="text-blue-400 font-bold">3</span> <span class="text-green-400 font-bold">4</span> — tilt ship</p>
        <p>SPACE — kill all</p>
        <p>R — reset pos</p>
      </div>
      <p class="text-white/30 animate-pulse">Click or press any key to launch</p>
    </div>

    <div v-if="started" class="fixed top-4 left-4 font-mono pointer-events-none z-40">
      <p class="text-3xl font-bold text-white drop-shadow-lg">{{ score }}</p>
      <p class="text-[10px] text-white/40 tracking-widest">SCORE</p>
      <p class="text-sm text-white/40 mt-2 tabular-nums">{{ speed.toFixed(1) }} <span class="text-[10px]">m/s</span></p>
    </div>

    <div v-if="started" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div class="grid grid-cols-3 grid-rows-3 gap-1">
        <div v-for="b in btns" :key="b.name"
          class="pointer-events-auto cursor-pointer w-11 h-11 border-2 font-mono text-[11px] font-bold flex flex-col items-center justify-center transition-all duration-75"
          :class="engines[b.name] ? b.on : 'border-white/10 bg-white/5 text-white/20'"
          :style="{ gridRow: b.row, gridColumn: b.col }"
          @click="toggle(b.name)"
        >{{ b.key }}<span class="text-[8px] leading-none">{{ b.arrow }}</span></div>
        <div class="w-9 h-9 border border-white/10 bg-white/3 flex items-center justify-center text-white/15 text-xs self-center justify-self-center" style="grid-row:2;grid-column:2">◆</div>
      </div>
    </div>

    <div v-if="started" class="fixed bottom-3 right-4 font-mono text-[10px] text-white/20 pointer-events-none z-40 text-right">
      <p>SPACE kill boosters</p>
      <p>R reset</p>
    </div>

    <div v-if="started && tunnelWarning > 0" class="fixed inset-0 pointer-events-none z-30 rounded-3xl"
      :style="{ boxShadow: `inset 0 0 ${60 + tunnelWarning * 100}px rgba(255,40,40,${tunnelWarning * 0.45})` }" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";

const canvasEl = ref(null);
const score = ref(0);
const speed = ref(0);
const started = ref(false);
const tunnelWarning = ref(0);
const engines = reactive({ left: false, top: false, right: false, bottom: false });
const kill = () => engines.left = engines.top = engines.right = engines.bottom = false;

const btns = [
  { name: 'top', key: '2', arrow: '▼', row: 1, col: 2, on: 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.5)]' },
  { name: 'left', key: '1', arrow: '►', row: 2, col: 1, on: 'border-red-400 bg-red-400/20 text-red-300 shadow-[0_0_16px_rgba(248,113,113,0.5)]' },
  { name: 'right', key: '3', arrow: '◄', row: 2, col: 3, on: 'border-blue-400 bg-blue-400/20 text-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.5)]' },
  { name: 'bottom', key: '4', arrow: '▲', row: 3, col: 2, on: 'border-green-400 bg-green-400/20 text-green-300 shadow-[0_0_16px_rgba(132,225,255,0.5)]' },
];

function toggle(name) {
  if (!started.value) return;
  engines[name] = !engines[name];
}

let cleanup = () => {};

onMounted(async () => {
  if (!canvasEl.value) return;

  const THREE = await import("three");
  const { default: Stats } = await import("three/addons/libs/stats.module.js");

  const stats = new Stats();
  stats.showPanel(0);
  Object.assign(stats.dom.style, {
    position: "fixed", bottom: "8px", right: "8px", left: "auto", zIndex: "100000",
  });
  document.body.appendChild(stats.dom);

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#020206");

  const camera = new THREE.PerspectiveCamera(55, 2, 0.1, 800);

  scene.add(new THREE.AmbientLight("#1a1a2e", 0.8));
  const dirLight = new THREE.DirectionalLight("#ffffff", 1.2);
  dirLight.position.set(5, 20, -5);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(200, 80, "#0d0d18", "#080812");
  grid.position.y = -0.5;
  scene.add(grid);

  // stars
  const starCount = 800;
  const starGeo = new THREE.BufferGeometry();
  const starBuf = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starBuf[i * 3] = (Math.random() - 0.5) * 400;
    starBuf[i * 3 + 1] = (Math.random() - 0.5) * 400;
    starBuf[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starBuf, 3));
  scene.add(new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: "#ffffff", size: 0.15, sizeAttenuation: true, transparent: true, opacity: 0.5 }),
  ));

  // ── Rocket ──
  const rocket = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#b8b8c0", metalness: 0.55, roughness: 0.35, flatShading: true });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 2.6, 8), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  rocket.add(fuselage);

  const noseMat = new THREE.MeshStandardMaterial({ color: "#cc2222", metalness: 0.5, roughness: 0.3, flatShading: true });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.9;
  rocket.add(nose);

  const bellMat = new THREE.MeshStandardMaterial({ color: "#555", metalness: 0.7, roughness: 0.3, flatShading: true });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 0.5, 8, 1, true), bellMat);
  bell.rotation.x = Math.PI / 2;
  bell.position.z = 1.55;
  rocket.add(bell);

  const coreMat = new THREE.MeshStandardMaterial({
    color: "#4488ff", emissive: "#223388", emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25,
  });
  const coreStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), coreMat);
  coreStripe.rotation.x = Math.PI / 2;
  coreStripe.position.z = -0.5;
  rocket.add(coreStripe);

  const coreLight = new THREE.PointLight("#4488ff", 0.6, 8);
  coreLight.position.set(0, 0.5, -0.5);
  rocket.add(coreLight);

  const finMat = new THREE.MeshStandardMaterial({ color: "#999", metalness: 0.5, roughness: 0.4, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.55), finMat);
    fin.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 1.0);
    fin.rotation.z = a;
    rocket.add(fin);
  }

  // main exhaust
  const exhaustLen = 1.8;
  const exhaustCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, exhaustLen, 6),
    new THREE.MeshBasicMaterial({ color: "#4488ff", transparent: true, opacity: 0.7 }),
  );
  exhaustCone.rotation.x = Math.PI / 2;
  exhaustCone.position.z = 1.7 + exhaustLen / 2;

  const exhaustOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, exhaustLen * 1.3, 6),
    new THREE.MeshBasicMaterial({ color: "#2244aa", transparent: true, opacity: 0.2 }),
  );
  exhaustOuter.rotation.x = Math.PI / 2;
  exhaustOuter.position.z = 1.7 + exhaustLen * 0.65;

  const exh = new THREE.Group();
  exh.add(exhaustCone, exhaustOuter);
  const exhLight = new THREE.PointLight("#4488ff", 1.2, 8);
  exhLight.position.z = 2.0;
  exh.add(exhLight);
  rocket.add(exh);

  // direction thrusters
  const ENG = {
    left:   { pos: [-0.7, 0, 0.3],  fd: [-1, 0, 0], col: "#ff5b5b", em: "#ff2222" },
    top:    { pos: [0, 0, -0.85],    fd: [0, 0, -1], col: "#ffe28a", em: "#ffaa00" },
    right:  { pos: [0.7, 0, 0.3],   fd: [1, 0, 0],  col: "#87bbff", em: "#1b6dff" },
    bottom: { pos: [0, 0, 1.32],    fd: [0, 0, 1],  col: "#e8e8e8", em: "#cccccc" },
  };

  const eParts = {};

  for (const [name, e] of Object.entries(ENG)) {
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.22),
      new THREE.MeshStandardMaterial({ color: e.col, metalness: 0.4, roughness: 0.35 }),
    );
    pod.position.set(...e.pos);
    rocket.add(pod);

    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(e.fd[0] ? 0.25 : 0.05, 0.05, e.fd[2] ? 0.25 : 0.05),
      new THREE.MeshStandardMaterial({ color: "#777", metalness: 0.5, roughness: 0.4 }),
    );
    strut.position.set(e.pos[0] * 0.6, 0, e.pos[2] * 0.6);
    rocket.add(strut);

    const fg = new THREE.Group();
    fg.visible = false;
    fg.position.set(...e.pos);

    const fLen = 0.85;
    const fCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, fLen, 6),
      new THREE.MeshBasicMaterial({ color: e.em, transparent: true, opacity: 0.85 }),
    );
    if (e.fd[0] === -1) fCone.rotation.z = Math.PI / 2;
    else if (e.fd[0] === 1) fCone.rotation.z = -Math.PI / 2;
    else if (e.fd[2] === -1) fCone.rotation.x = -Math.PI / 2;
    else if (e.fd[2] === 1) fCone.rotation.x = Math.PI / 2;
    fCone.position.set(e.fd[0] * fLen / 2, 0, e.fd[2] * fLen / 2);
    fg.add(fCone);

    const oCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, fLen * 1.2, 6),
      new THREE.MeshBasicMaterial({ color: e.col, transparent: true, opacity: 0.25 }),
    );
    oCone.rotation.copy(fCone.rotation);
    oCone.position.copy(fCone.position);
    fg.add(oCone);

    const fLight = new THREE.PointLight(e.em, 1.0, 5);
    fLight.position.set(e.fd[0] * 0.6, 0, e.fd[2] * 0.6);
    fg.add(fLight);

    rocket.add(fg);
    eParts[name] = { flame: fg, cone: fCone, outer: oCone };
  }

  scene.add(rocket);

  // ── Physics ──
  const vel = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const FORWARD_THRUST = 10, DRAG = 0.4, MAX_SPEED = 35, TURN_RATE = 1.0;

  // ── Tunnel ──
  const TUNNEL_RADIUS = 12, TUNNEL_SOFT_EDGE = 7, TUNNEL_PUSH = 15;
  const tunnelCenter = new THREE.Vector3();
  const tunnelDir = new THREE.Vector3(0, 0, -1);
  const tunnelNormalColor = new THREE.Color("#1a3366");
  const tunnelWarnColor = new THREE.Color("#ff3344");

  const tunnelRings = [];
  const ringMat = new THREE.MeshBasicMaterial({ color: "#1a3366", transparent: true, opacity: 0.05, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS, 0.1, 6, 32), ringMat);
    ring.position.set(0, 0, -(i + 1) * 15);
    scene.add(ring);
    tunnelRings.push(ring);
  }

  // ── Targets ──
  const targets = [];
  const boxColors = ["#ff6b6b", "#ffd93d", "#6bcbff", "#c084fc", "#4ade80", "#fb923c"];

  function spawnBox(mesh) {
    const d = 25 + Math.random() * 40, a = Math.random() * Math.PI * 2, r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnelCenter).dot(tunnelDir);
    const sp = tunnelCenter.clone().addScaledVector(tunnelDir, playerAxial + d);
    let p1 = new THREE.Vector3().crossVectors(tunnelDir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnelDir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnelDir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    if (mesh) { mesh.position.copy(sp); mesh.userData.baseY = sp.y; return mesh; }

    const c = boxColors[Math.floor(Math.random() * boxColors.length)];
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.4 }),
    );
    m.position.copy(sp);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.baseY = sp.y;
    const l = new THREE.PointLight(c, 0.4, 5);
    l.position.y = 0.5;
    m.add(l);
    scene.add(m);
    targets.push(m);
    return m;
  }

  for (let i = 0; i < 8; i++) spawnBox();

  //BANG
  const fxList = [];
  function collectFX(p, color) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, wireframe: true }),
    );
    s.position.copy(p);
    scene.add(s);
    fxList.push({ mesh: s, life: 0.4 });
  }

  //L
  const clock = new THREE.Clock();
  let raf = 0;
  const camTarget = new THREE.Vector3();

  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!started.value) {
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

    if (engines.left) rocket.rotateY(-TURN_RATE * dt);
    if (engines.right) rocket.rotateY(TURN_RATE * dt);
    if (engines.top) rocket.rotateX(-TURN_RATE * dt);
    if (engines.bottom) rocket.rotateX(TURN_RATE * dt);

    for (const [name, ep] of Object.entries(eParts)) {
      const on = engines[name];
      ep.flame.visible = on;
      if (on) {
        const f = 0.7 + Math.random() * 0.6;
        ep.cone.scale.set(f, 0.6 + Math.random() * 0.8, f);
        ep.outer.scale.set(f * 1.1, 0.5 + Math.random() * 1, f * 1.1);
      }
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rocket.quaternion);
    vel.addScaledVector(forward, FORWARD_THRUST * dt);
    vel.multiplyScalar(Math.max(0, 1 - DRAG * dt));
    if (vel.length() > MAX_SPEED) vel.setLength(MAX_SPEED);

    const tfs = vel.dot(tunnelDir);
    if (tfs < 8) vel.addScaledVector(tunnelDir, 8 - tfs);

    pos.addScaledVector(vel, dt);
    rocket.position.copy(pos);
    speed.value = vel.length();

    const shipOffset = new THREE.Vector3().subVectors(pos, tunnelCenter);
    const axialDist = shipOffset.dot(tunnelDir);
    const closestPoint = tunnelCenter.clone().addScaledVector(tunnelDir, axialDist);
    const lateralVec = new THREE.Vector3().subVectors(pos, closestPoint);
    const lateralDist = lateralVec.length();
    if (lateralDist > TUNNEL_SOFT_EDGE) {
      const edge = Math.min((lateralDist - TUNNEL_SOFT_EDGE) / (TUNNEL_RADIUS - TUNNEL_SOFT_EDGE), 2);
      vel.addScaledVector(lateralVec.normalize(), -TUNNEL_PUSH * edge * edge * dt);
    }
    const w = lateralDist > TUNNEL_SOFT_EDGE
      ? Math.min((lateralDist - TUNNEL_SOFT_EDGE) / (TUNNEL_RADIUS - TUNNEL_SOFT_EDGE), 1) : 0;
    tunnelWarning.value = w;
    ringMat.color.copy(tunnelNormalColor).lerp(tunnelWarnColor, w);
    ringMat.opacity = 0.04 + w * 0.18;

    const playerAxialRing = new THREE.Vector3().subVectors(pos, tunnelCenter).dot(tunnelDir);
    const ringStep = 15;
    const ringBase = Math.ceil(playerAxialRing / ringStep) * ringStep;
    for (let i = 0; i < tunnelRings.length; i++) {
      const ringOffset = ringBase + i * ringStep;
      const rp = tunnelCenter.clone().addScaledVector(tunnelDir, ringOffset);
      tunnelRings[i].position.copy(rp);
      tunnelRings[i].lookAt(rp.clone().add(tunnelDir));
    }

    const ef = 0.7 + Math.random() * 0.5;
    exhaustCone.scale.set(ef, 0.7 + Math.random() * 0.6, ef);
    exhaustOuter.scale.set(ef * 1.1, 0.6 + Math.random() * 0.8, ef * 1.1);

    const anyOn = engines.left || engines.top || engines.right || engines.bottom;
    coreMat.emissiveIntensity = anyOn ? 1.0 : 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    coreLight.intensity = anyOn ? 1.2 : 0.4;

    for (const t of targets) {
      t.userData.phase += dt * 1.2;
      t.rotation.y += dt * 0.7;
      t.position.y = t.userData.baseY + Math.sin(t.userData.phase) * 0.3;
      if (pos.distanceTo(t.position) < 2) {
        score.value++;
        collectFX(t.position, t.material.color.getStyle());
        spawnBox(t);
      } else if (new THREE.Vector3().subVectors(t.position, pos).dot(forward) < -30) {
        spawnBox(t);
      }
    }

    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.life -= dt;
      const p = 1 - f.life / 0.4, s = 1 + p * 5;
      f.mesh.scale.setScalar(s);
      f.mesh.material.opacity = 0.8 * (1 - p);
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        fxList.splice(i, 1);
      }
    }

    camTarget.copy(pos).add(new THREE.Vector3(0, 5, 16).applyQuaternion(rocket.quaternion));
    camera.position.lerp(camTarget, 3 * dt);
    camera.up.lerp(new THREE.Vector3(0, 1, 0).applyQuaternion(rocket.quaternion), 2 * dt).normalize();
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0, -10).applyQuaternion(rocket.quaternion)));

    dirLight.position.set(pos.x + 5, pos.y + 20, pos.z - 5);

    const sp = starGeo.attributes.position.array;
    for (let i = 0; i < starCount; i++) {
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j, rel = sp[idx] - pos.getComponent(j);
        if (rel > 200) sp[idx] -= 400;
        else if (rel < -200) sp[idx] += 400;
      }
    }
    starGeo.attributes.position.needsUpdate = true;

    grid.position.x = Math.round(pos.x / 2.5) * 2.5;
    grid.position.z = Math.round(pos.z / 2.5) * 2.5;

    renderer.render(scene, camera);
    stats.update();
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const keyMap = { "1": "left", "2": "top", "3": "right", "4": "bottom" };

  const onKeyDown = (e) => {
    if (!started.value) { started.value = true; return; }
    if (e.repeat) return;
    const eng = keyMap[e.key];
    if (eng) engines[eng] = !engines[eng];
    if (e.key === " ") { e.preventDefault(); kill(); }
    if (e.key.toLowerCase() === "r") {
      pos.set(0, 0, 0); vel.set(0, 0, 0);
      rocket.quaternion.identity(); kill();
      tunnelCenter.set(0, 0, 0); tunnelDir.set(0, 0, -1);
      tunnelWarning.value = 0;
    }
  };

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  resize();
  animate();

  cleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    stats.dom.remove();
    renderer.dispose();
  };
});

onBeforeUnmount(() => cleanup());
</script>
