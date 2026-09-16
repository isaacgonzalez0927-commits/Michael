import * as THREE from 'three';

/**
 * Pooled additive bursts for muzzle, explosions, splashes, and pickups.
 */
export class ParticleSystem {
  constructor(scene, poolSize = 140) {
    this.scene = scene;
    this.geo = new THREE.SphereGeometry(1, 6, 6);
    this.ringGeo = new THREE.RingGeometry(0.4, 0.7, 20);
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        max: 1,
        gravity: 0,
        grow: 0,
        active: false,
      });
    }
    this.lights = [];
  }

  _spawn(position, color, speed, size, life, gravity, grow = 0) {
    const p = this.pool.find((item) => !item.active);
    if (!p) return null;
    p.active = true;
    p.life = life;
    p.max = life;
    p.gravity = gravity;
    p.grow = grow;
    p.vel.set(Math.random() * 2 - 1, Math.random() * 1.2, Math.random() * 2 - 1)
      .normalize()
      .multiplyScalar(speed * (0.45 + Math.random() * 0.7));
    p.mesh.visible = true;
    p.mesh.position.copy(position);
    p.mesh.scale.setScalar(size);
    p.mesh.material.color.set(color);
    p.mesh.material.opacity = 1;
    return p;
  }

  burst(position, color, count = 18, speed = 10, size = 0.18, life = 0.7) {
    for (let i = 0; i < count; i++) this._spawn(position, color, speed, size, life, 9, 0);
  }

  splash(position) {
    for (let i = 0; i < 16; i++) {
      const p = this._spawn(position, 0xaef8ff, 8, 0.11, 0.55, 6, 0);
      if (p) p.vel.y = Math.abs(p.vel.y) + 3;
    }
  }

  explosion(position, color = 0xff7a3c) {
    this.burst(position, color, 22, 18, 0.32, 0.9);
    this.burst(position, 0xfff4c2, 12, 10, 0.16, 0.45);
    const ring = this._spawn(position, color, 0, 0.8, 0.55, 0, 18);
    if (ring) {
      ring.vel.set(0, 0.4, 0);
      ring.mesh.rotation.x = -Math.PI / 2;
    }
    this.flash(position, color, 16);
  }

  muzzle(position, dir) {
    this._spawn(position, 0xfff4a8, 2, 0.22, 0.07, 0, 8);
    const streak = this._spawn(position, 0xffe27a, 14, 0.12, 0.09, 0, 0);
    if (streak) streak.vel.copy(dir).multiplyScalar(18);
    this.flash(position, 0xfff1c2, 10);
  }

  pickup(position) {
    for (let i = 0; i < 14; i++) {
      const p = this._spawn(position, 0xffc14a, 7, 0.1, 0.55, 2, 0);
      if (p) p.vel.y += 4;
    }
  }

  flash(position, color, intensity = 12) {
    const light = new THREE.PointLight(color, intensity, 18, 2);
    light.position.copy(position);
    this.scene.add(light);
    this.lights.push({ light, life: 0.12, max: 0.12, intensity });
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const k = Math.max(0, p.life / p.max);
      p.mesh.material.opacity = k;
      p.mesh.scale.multiplyScalar(1 + p.grow * dt);
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const f = this.lights[i];
      f.life -= dt;
      f.light.intensity = f.intensity * Math.max(0, f.life / f.max);
      if (f.life <= 0) {
        this.scene.remove(f.light);
        this.lights.splice(i, 1);
      }
    }
  }
}
