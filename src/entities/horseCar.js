import * as THREE from 'three';
import { CONFIG, COLORS } from '../config.js';
import { createHorseCarMesh } from '../render/meshes.js';
import { Projectile } from './projectiles.js';
import { nearestUfo } from './horse.js';

export class HorseCar {
  constructor(scene, position, startHungry = false) {
    this.scene = scene;
    this.root = createHorseCarMesh();
    this.root.position.copy(position);
    scene.add(this.root);
    this.energy = startHungry ? 18 : 40 + Math.random() * 50;
    this.radius = 3.2;
    this.speed = 9;
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
    this.energy = Math.min(100, this.energy + 62);
    return true;
  }

  update(dt, ufos, arena, projectiles) {
    this.energy = Math.max(0, this.energy - dt * 2.4);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hungrySign.visible = this.hungry;
    const speed = this.hungry ? 3.5 : this.speed;

    const target = !this.hungry ? nearestUfo(this.root.position, ufos) : null;
    if (target) {
      const to = target.position.clone().sub(this.root.position);
      to.y = 0;
      if (to.lengthSq() > 1) {
        to.normalize();
        this.yaw = Math.atan2(to.x, to.z);
        this.root.rotation.y = this.yaw;
        this.root.position.addScaledVector(to, speed * dt);
      }
      if (this.cooldown <= 0 && this.root.position.distanceTo(target.position) < 70) {
        const origin = this.root.position.clone().add(new THREE.Vector3(0, 2.1, 0));
        const dir = target.position.clone().sub(origin).normalize();
        projectiles.push(
          new Projectile(this.scene, origin, dir, {
            kind: 'horse',
            speed: 62,
            damage: 1,
            color: COLORS.lime,
            life: 1.8,
          }),
        );
        this.cooldown = 0.55;
        if (this.barrel) this.barrel.lookAt(target.position);
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.wander.set((Math.random() - 0.5) * 280, 0, (Math.random() - 0.5) * 280);
        this.timer = 3 + Math.random() * 3;
      }
      const to = this.wander.clone().sub(this.root.position);
      to.y = 0;
      if (to.lengthSq() > 4) {
        to.normalize();
        this.yaw = Math.atan2(to.x, to.z);
        this.root.rotation.y = this.yaw;
        this.root.position.addScaledVector(to, speed * dt);
      }
    }
    arena.clamp(this.root.position);
    this.root.position.y = 0;
  }
}
