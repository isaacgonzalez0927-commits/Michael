import * as THREE from 'three';

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
      ? new THREE.SphereGeometry(0.38, 10, 10)
      : new THREE.CapsuleGeometry(0.07, 0.7, 4, 6);
    const mat = options.water
      ? new THREE.MeshStandardMaterial({
          color: 0x4ef0ff,
          transparent: true,
          opacity: 0.7,
          emissive: 0x4ef0ff,
          emissiveIntensity: 0.8,
        })
      : new THREE.MeshBasicMaterial({ color });
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
    if (this.mesh.position.y < 0.3 && this.kind !== 'player') {
      this.life = 0;
    }
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
      opacity: 0.85,
    });
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), mat);
    this.mesh.visible = false;
    this.core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 1, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9ad8, transparent: true, opacity: 0.28 }),
    );
    this.core.visible = false;
    scene.add(this.mesh, this.core);
    this.active = false;
    this.hit = false;
  }

  fire(from, to) {
    const delta = to.clone().sub(from);
    const len = delta.length();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    this.mesh.scale.set(1, len, 1);
    this.core.scale.set(1, len, 1);
    this.mesh.position.copy(mid);
    this.core.position.copy(mid);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    this.core.quaternion.copy(this.mesh.quaternion);
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

  hitsPoint(point, radius = 2.2) {
    if (!this.active) return false;
    const d = distanceToSegment(point, this.from, this.to);
    return d < radius;
  }
}

function distanceToSegment(p, a, b) {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return a.clone().add(ab.multiplyScalar(t)).distanceTo(p);
}
