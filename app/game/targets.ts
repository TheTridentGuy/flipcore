import type * as THREE_NS from "three";
import { TUNNEL_RADIUS, BOX_COLORS } from "./constants";

type THREE = typeof THREE_NS;

export interface TunnelState {
  center: THREE_NS.Vector3;
  dir: THREE_NS.Vector3;
}

export function lockheed(
  THREE: THREE,
  scene: THREE_NS.Scene,
  tunnel: TunnelState,
  pos: THREE_NS.Vector3,
) {
  const targets: THREE_NS.Mesh[] = [];
  const fxList: { mesh: THREE_NS.Mesh; life: number }[] = [];

  function spawnBox(mesh?: THREE_NS.Mesh) {
    const d = 100 + Math.random() * 60;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);
    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, playerAxial + d);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    if (mesh) { mesh.position.copy(sp); mesh.userData.baseY = sp.y; return mesh; }

    const c = BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)];
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

  function collectFX(p: THREE_NS.Vector3, color: string) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, wireframe: true }),
    );
    s.position.copy(p);
    scene.add(s);
    fxList.push({ mesh: s, life: 0.4 });
  }

  function updateFX(dt: number) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.life -= dt;
      const p = 1 - f.life / 0.4, s = 1 + p * 5;
      f.mesh.scale.setScalar(s);
      (f.mesh.material as THREE_NS.MeshBasicMaterial).opacity = 0.8 * (1 - p);
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE_NS.Material).dispose();
        fxList.splice(i, 1);
      }
    }
  }

  const asteroids: THREE_NS.Mesh[] = [];

  function spawnAsteroid(mesh?: THREE_NS.Mesh) {
    const d = 100 + Math.random() * 60;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);
    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, playerAxial + d);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    if (mesh) { mesh.position.copy(sp); mesh.userData.baseY = sp.y; return mesh; }

    const size = 1.2 + Math.random() * 0.6;
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({ color: "#ff2222", emissive: "#ff2222", emissiveIntensity: 0.4, roughness: 0.6 }),
    );
    m.position.copy(sp);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.baseY = sp.y;
    const l = new THREE.PointLight("#ff2222", 0.5, 6);
    l.position.y = 0.5;
    m.add(l);
    scene.add(m);
    asteroids.push(m);
    return m;
  }

  return { targets, asteroids, fxList, spawnBox, spawnAsteroid, collectFX, updateFX };
}
