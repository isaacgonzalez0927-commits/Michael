import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createCarMesh } from '../render/meshes.js';

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _look = new THREE.Vector3();

export class PlayerCar {
  constructor(scene) {
    this.root = createCarMesh();
    this.root.position.set(0, 0, 0);
    scene.add(this.root);
    this.yaw = 0;
    this.speed = 0;
    this.health = CONFIG.player.maxHealth;
    this.alive = true;
    this.respawnTimer = 0;
    this.wetTimer = 0;
    this.cooldown = 0;
    this.camYaw = 0;
    this.camPitch = 0.28;
    this.cockpit = true;
    this.pull = 0;
    this.barrel = this.root.getObjectByName('barrel');
  }

  get position() {
    return this.root.position;
  }

  forward() {
    return _forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  damage(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.respawnTimer = 2.2;
      this.speed = 0;
      return true;
    }
    return false;
  }

  wet() {
    this.wetTimer = 1.6;
  }

  respawn() {
    this.alive = true;
    this.health = CONFIG.player.maxHealth;
    this.root.position.set(0, 0, 0);
    this.yaw = 0;
    this.speed = 0;
    this.wetTimer = 0;
  }

  aimDirection(camera) {
    camera.getWorldDirection(_look);
    if (Math.abs(_look.y) > 0.95) {
      return this.forward().clone().setY(0.08);
    }
    return _look.clone().normalize();
  }

  muzzle() {
    const p = new THREE.Vector3();
    if (this.barrel) this.barrel.getWorldPosition(p);
    else this.root.getWorldPosition(p).add(new THREE.Vector3(0, 1.9, 1.2));
    return p;
  }

  update(dt, input, arena) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      this.root.visible = Math.sin(this.respawnTimer * 24) > 0;
      if (this.respawnTimer <= 0) {
        this.root.visible = true;
        this.respawn();
      }
      return;
    }

    const cfg = CONFIG.player;
    const throttle = input.throttle();
    const steer = input.steer();
    const max = this.wetTimer > 0 ? cfg.maxSpeed * 0.42 : cfg.maxSpeed;
    if (throttle > 0) this.speed += cfg.accel * dt;
    else if (throttle < 0) this.speed -= cfg.brake * dt;
    else this.speed *= Math.pow(cfg.friction, dt * 60 * 0.12);

    this.speed = THREE.MathUtils.clamp(this.speed, -cfg.reverseSpeed, max);
    const steerScale = THREE.MathUtils.clamp(this.speed / 12, -1, 1);
    this.yaw += steer * cfg.steer * steerScale * dt;
    this.root.rotation.y = this.yaw;

    const f = this.forward();
    this.root.position.addScaledVector(f, this.speed * dt);
    arena.clamp(this.root.position);
    this.root.position.y = 0;

    const bob = Math.sin(performance.now() * 0.01 * Math.abs(this.speed)) * 0.015;
    this.root.position.y = bob;
    this.root.rotation.z = THREE.MathUtils.damp(this.root.rotation.z, -steer * 0.12, 6, dt);
    this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, throttle * 0.03, 6, dt);

    this.wetTimer = Math.max(0, this.wetTimer - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.health = Math.min(cfg.maxHealth, this.health + dt * 1.5);

    const delta = input.consumeDelta();
    this.camYaw -= delta.dx * 0.0035;
    this.camPitch -= delta.dy * 0.0024;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.15, 0.7);

    if (this.barrel) {
      const aimY = this.camPitch * 0.6;
      this.barrel.rotation.x = -aimY;
      this.barrel.rotation.y = this.camYaw - this.yaw;
    }
  }

  updateCamera(camera, dt, mode) {
    const f = this.forward().clone();
    if (mode === 'cockpit') {
      const pos = this.root.position.clone().add(
        new THREE.Vector3(0.2, 1.45, 0.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw),
      );
      camera.position.copy(pos);
      _look.copy(this.root.position).add(f.multiplyScalar(12));
      _look.y += 1.2;
      camera.lookAt(_look);
      camera.fov = THREE.MathUtils.damp(camera.fov, 68, 4, dt);
      camera.updateProjectionMatrix();
      return;
    }

    if (mode === 'pullout') {
      this.pull = Math.min(1, this.pull + dt * 0.45);
    } else {
      this.pull = 1;
    }

    const back = 8 + this.pull * 6;
    const up = 3.2 + this.pull * 2.4;
    const orbit = this.yaw + this.camYaw;
    const offset = new THREE.Vector3(
      Math.sin(orbit) * -back,
      up + Math.sin(this.camPitch) * 4,
      Math.cos(orbit) * -back,
    );
    const ideal = this.root.position.clone().add(offset);
    camera.position.lerp(ideal, 1 - Math.pow(0.002, dt));
    const target = this.root.position.clone().add(f.multiplyScalar(10));
    target.y += 1.2 - this.camPitch * 2;
    camera.lookAt(target);
    camera.fov = THREE.MathUtils.damp(camera.fov, 62, 4, dt);
    camera.updateProjectionMatrix();
  }
}
