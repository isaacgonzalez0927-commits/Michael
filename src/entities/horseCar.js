import * as THREE from 'three';
import { CONFIG, COLORS } from '../config.js';
import { createHorseCarMesh } from '../render/meshes.js';
import { Projectile } from './projectiles.js';
import { nearestUfo } from './horse.js';

const _to = new THREE.Vector3();

export class HorseCar {
  constructor(scene, position, startHungry = false) {
    this.scene = scene;
    this.root = createHorseCarMesh();
    this.root.position.copy(position);
    scene.add(this.root);
    this.energy = startHungry ? 20 : 55 + Math.random() * 35;
    this.radius = 3.2;
    this.speed = 10;
    this.yaw = Math.random() * Math.PI * 2;
    this.cooldown = 1;
    this.timer = 0;
    this.wander = position.clone();
    this.hungrySign = this.root.getObjectByName('hungrySign');
    this.barrel = this.root.getObjectByName('barrel');
  }

  get position() {
    return this.root.position;
  }

  get hungry() {
    return this.energy < CONFIG.horseHungryThreshold;
  }

  feed() {
    if (this.energy >= 95) return false;
    this.energy = Math.min(100, this.energy + 70);
    return true;
  }

  update(dt, ufos, arena, projectiles) {
    this.energy = Math.max(0, this.energy - dt * 0.55);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hungrySign.visible = this.hungry;
    const speed = this.hungry ? 3.2 : this.speed;

    const target = !this.hungry ? nearestUfo(this.root.position, ufos) : null;
    if (target) {
      _to.set(target.position.x - this.root.position.x, 0, target.position.z - this.root.position.z);
      const dist = _to.length();
      if (dist > 18) {
        _to.multiplyScalar(1 / dist);
        const desired = Math.atan2(_to.x, _to.z);
        this.yaw = dampAngle(this.yaw, desired, 4, dt);
        this.root.rotation.y = this.yaw;
        this.root.position.addScaledVector(_to, speed * dt);
      } else if (dist > 0.2) {
        this.yaw = dampAngle(this.yaw, Math.atan2(_to.x, _to.z), 4, dt);
        this.root.rotation.y = this.yaw;
      }
      if (this.cooldown <= 0 && this.root.position.distanceTo(target.position) < 72) {
        const origin = this.root.position.clone().add(new THREE.Vector3(0, 2.15, 0));
        const dir = target.position.clone().sub(origin).normalize();
        projectiles.push(
          new Projectile(this.scene, origin, dir, {
            kind: 'horse',
            speed: 64,
            damage: 1,
            color: COLORS.lime,
            life: 1.7,
          }),
        );
        this.cooldown = 0.62;
        if (this.barrel) this.barrel.lookAt(target.position);
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        const m = arena.half - 22;
        this.wander.set((Math.random() * 2 - 1) * m, 0, (Math.random() * 2 - 1) * m);
        this.timer = 3 + Math.random() * 3;
      }
      _to.set(this.wander.x - this.root.position.x, 0, this.wander.z - this.root.position.z);
      if (_to.lengthSq() > 4) {
        _to.normalize();
        this.yaw = dampAngle(this.yaw, Math.atan2(_to.x, _to.z), 3.5, dt);
        this.root.rotation.y = this.yaw;
        this.root.position.addScaledVector(_to, speed * dt);
      }
    }
    arena.clamp(this.root.position);
    arena.avoidColumns?.(this.root.position, 3.4);
    this.root.position.y = 0;
  }
}

function dampAngle(current, target, lambda, dt) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}
