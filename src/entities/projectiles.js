import * as THREE from 'three';

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

export class Projectile {
  constructor(scene, origin, dir, options = {}) {
    this.kind = options.kind || 'player';
    this.speed = options.speed ?? 78;
    this.life = options.life ?? 1.6;
    this.damage = options.damage ?? 1;
    this.radius = options.radius ?? 0.7;
    this.alive = true;
    const color = options.color ?? 0xfff36a;
    const geo = options.water
      ? new THREE.SphereGeometry(0.42, 10, 10)
      : new THREE.CapsuleGeometry(0.08, 0.85, 4, 6);
    const mat = options.water
      ? new THREE.MeshStandardMaterial({
          color: 0x4ef0ff,
          transparent: true,
          opacity: 0.78,
          emissive: 0x4ef0ff,
          emissiveIntensity: 1.1,
        })
      : new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(origin);
    this.dir = dir.clone().normalize();
    this.mesh.lookAt(origin.clone().add(this.dir));
    this.gravity = options.gravity ?? 0;
    scene.add(this.mesh);
    this.scene = scene;
  }

  update(dt) {
    this.life -= dt;
    this.dir.y -= this.gravity * dt;
    this.mesh.position.addScaledVector(this.dir, this.speed * dt);
    if (this.mesh.position.y < 0.25) this.life = 0;
    if (this.life <= 0) this.kill();
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export class LaserBeam {
  constructor(scene) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3dc8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 1, 10), mat);
    this.mesh.visible = false;
    this.core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 1, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffc4ee,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.core.visible = false;
    scene.add(this.mesh, this.core);
    this.scene = scene;
    this.active = false;
  }

  fire(from, to) {
    _dir.copy(to).sub(from);
    const len = Math.max(_dir.length(), 0.2);
    _dir.multiplyScalar(1 / len);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    this.mesh.scale.set(1, len, 1);
    this.core.scale.set(1, len, 1);
    this.mesh.position.copy(mid);
    this.core.position.copy(mid);
    this.mesh.quaternion.setFromUnitVectors(_up, _dir);
    this.core.quaternion.copy(this.mesh.quaternion);
    const pulse = 0.75 + Math.sin(performance.now() * 0.04) * 0.25;
    this.mesh.material.opacity = 0.55 + pulse * 0.4;
    this.mesh.visible = true;
    this.core.visible = true;
    this.active = true;
    this.from = from;
    this.to = to;
  }

  hide() {
    this.active = false;
    this.mesh.visible = false;
    this.core.visible = false;
  }

  dispose() {
    this.hide();
    this.scene.remove(this.mesh, this.core);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.core.geometry.dispose();
    this.core.material.dispose();
  }

  hitsPoint(point, radius = 2.2) {
    if (!this.active || !this.from || !this.to) return false;
    return distanceToSegment(point, this.from, this.to) < radius;
  }
}

function distanceToSegment(p, a, b) {
  const ab = b.clone().sub(a);
  const denom = ab.lengthSq();
  if (denom < 1e-6) return p.distanceTo(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / denom, 0, 1);
  return a.clone().add(ab.multiplyScalar(t)).distanceTo(p);
}
