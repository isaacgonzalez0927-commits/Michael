import * as THREE from 'three';
import { createUfoMesh } from '../render/meshes.js';
import { LaserBeam, Projectile } from './projectiles.js';

export class UFO {
  constructor(scene, type, position) {
    this.scene = scene;
    this.type = type;
    this.root = createUfoMesh(type);
    this.root.position.copy(position);
    scene.add(this.root);
    this.hp = type === 'laser' ? 4 : 5;
    this.maxHp = this.hp;
    this.alive = true;
    this.radius = 2.6;
    this.yaw = Math.random() * Math.PI * 2;
    this.height = position.y;
    this.speed = 7 + Math.random() * 5;
    this.orbit = 18 + Math.random() * 70;
    this.phase = Math.random() * Math.PI * 2;
    this.cooldown = 1 + Math.random() * 2;
    this.laser = type === 'laser' ? new LaserBeam(scene) : null;
    this.laserTimer = 0;
    this.wander = new THREE.Vector3(position.x, 0, position.z);
  }

  get position() {
    return this.root.position;
  }

  hit(dmg) {
    this.hp -= dmg;
    this.root.scale.setScalar(0.85 + 0.15 * (this.hp / this.maxHp));
    if (this.hp <= 0) {
      this.kill();
      return true;
    }
    return false;
  }

  kill() {
    this.alive = false;
    this.laser?.hide();
    this.scene.remove(this.root);
  }

  update(dt, time, player, projectiles) {
    if (!this.alive) return;
    this.phase += dt * 0.25;
    const wobble = Math.sin(time * 1.3 + this.phase) * 1.4;
    const tx = this.wander.x + Math.cos(this.phase) * this.orbit * 0.15;
    const tz = this.wander.z + Math.sin(this.phase * 0.8) * this.orbit * 0.15;
    const target = new THREE.Vector3(tx, this.height + wobble, tz);

    // Occasionally hunt the player.
    if (Math.sin(time * 0.2 + this.phase) > 0.4) {
      target.x = THREE.MathUtils.lerp(target.x, player.x, 0.35);
      target.z = THREE.MathUtils.lerp(target.z, player.z, 0.35);
    }

    const to = target.sub(this.root.position);
    to.y = target.y - this.root.position.y;
    this.root.position.addScaledVector(to.normalize(), this.speed * dt);
    this.root.rotation.y += dt * 0.8;
    this.root.position.y = THREE.MathUtils.clamp(this.root.position.y, 10, 34);

    this.cooldown -= dt;
    if (this.laser) {
      if (this.laserTimer > 0) {
        this.laserTimer -= dt;
        const aim = player.clone();
        aim.y += 1.1;
        this.laser.fire(this.root.position.clone().add(new THREE.Vector3(0, -0.8, 0)), aim);
        if (this.laserTimer <= 0) this.laser.hide();
      } else if (this.cooldown <= 0) {
        this.laserTimer = 0.55;
        this.cooldown = 2.4 + Math.random() * 1.6;
      }
    } else if (this.cooldown <= 0) {
      const origin = this.root.position.clone().add(new THREE.Vector3(0, -0.8, 0));
      const dir = player.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin).normalize();
      dir.x += (Math.random() - 0.5) * 0.08;
      dir.z += (Math.random() - 0.5) * 0.08;
      projectiles.push(
        new Projectile(this.scene, origin, dir, {
          kind: 'water',
          water: true,
          speed: 28,
          gravity: 0.35,
          life: 3.2,
          damage: 6,
          color: 0x4ef0ff,
          radius: 1.1,
        }),
      );
      this.cooldown = 1.6 + Math.random();
    }
  }
}

export function spawnUfo(scene, existing = []) {
  const half = 170;
  let x = (Math.random() * 2 - 1) * half;
  let z = (Math.random() * 2 - 1) * half;
  if (existing.length) {
    // Prefer edges so they swoop in.
    if (Math.random() > 0.5) x = Math.sign(Math.random() - 0.5) * half;
    else z = Math.sign(Math.random() - 0.5) * half;
  }
  const type = Math.random() > 0.45 ? 'laser' : 'water';
  const y = 16 + Math.random() * 12;
  return new UFO(scene, type, new THREE.Vector3(x, y, z));
}
