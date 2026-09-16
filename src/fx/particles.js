import * as THREE from 'three';

/**
 * Lightweight particle bursts for explosions, splashes, and muzzle flashes.
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  burst(position, color, count = 18, speed = 10, size = 0.18, life = 0.7) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      mesh.position.copy(position);
      const vel = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.4,
        Math.random() * 2 - 1,
      ).multiplyScalar(speed);
      this.scene.add(mesh);
      this.items.push({ mesh, vel, life, max: life, gravity: 8 });
    }
  }

  splash(position) {
    this.burst(position, 0x8ef6ff, 14, 7, 0.12, 0.55);
  }

  explosion(position, color = 0xff7a3c) {
    this.burst(position, color, 26, 16, 0.28, 0.85);
    this.burst(position, 0xfff1a8, 10, 8, 0.14, 0.4);
  }

  muzzle(position, dir) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xfff4a2 }),
    );
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(dir));
    this.scene.add(mesh);
    this.items.push({
      mesh,
      vel: dir.clone().multiplyScalar(2),
      life: 0.08,
      max: 0.08,
      gravity: 0,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life / p.max);
      p.mesh.scale.setScalar(0.4 + p.life / p.max);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
