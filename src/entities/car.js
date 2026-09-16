import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createCarMesh } from '../render/meshes.js';

const _forward = new THREE.Vector3();
const _look = new THREE.Vector3();
const _ideal = new THREE.Vector3();
const _target = new THREE.Vector3();
const _right = new THREE.Vector3();

export class PlayerCar {
  constructor(scene) {
    this.root = createCarMesh();
    this.root.position.set(0, 0, 0);
    scene.add(this.root);
    this.scene = scene;
    this.yaw = 0;
    this.speed = 0;
    this.steerSmoothed = 0;
    this.health = CONFIG.player.maxHealth;
    this.alive = true;
    this.respawnTimer = 0;
    this.wetTimer = 0;
    this.cooldown = 0;
    this.camYaw = 0;
    this.camPitch = 0.18;
    this.pull = 0;
    this.barrel = this.root.getObjectByName('barrel');
    this.wheels = [];
    this.root.traverse((obj) => {
      if (obj.userData.spin) this.wheels.push(obj);
    });

    this.headL = new THREE.SpotLight(0xfff1c8, 18, 42, 0.42, 0.35, 1.4);
    this.headR = this.headL.clone();
    this.headL.position.set(-0.7, 0.8, 2.2);
    this.headR.position.set(0.7, 0.8, 2.2);
    const tL = new THREE.Object3D();
    tL.position.set(-0.7, 0.5, 12);
    const tR = new THREE.Object3D();
    tR.position.set(0.7, 0.5, 12);
    this.root.add(this.headL, this.headR, tL, tR);
    this.headL.target = tL;
    this.headR.target = tR;
    this.cameraReady = false;
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
    this.wetTimer = 1.4;
  }

  respawn() {
    this.alive = true;
    this.health = CONFIG.player.maxHealth;
    this.root.position.set(0, 0, 0);
    this.yaw = 0;
    this.speed = 0;
    this.wetTimer = 0;
    this.cameraReady = false;
  }

  aimDirection(camera) {
    camera.getWorldDirection(_look);
    _look.y = THREE.MathUtils.clamp(_look.y, -0.22, 0.42);
    if (_look.lengthSq() < 0.001) return this.forward().clone().setY(0.06);
    return _look.normalize().clone();
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
    const steerIn = input.steer();
    this.steerSmoothed = THREE.MathUtils.damp(this.steerSmoothed, steerIn, 8, dt);
    const max = this.wetTimer > 0 ? cfg.maxSpeed * 0.68 : cfg.maxSpeed;
    if (throttle > 0) this.speed += cfg.accel * dt;
    else if (throttle < 0) this.speed -= cfg.brake * dt;
    else this.speed *= Math.pow(0.86, dt * 8);

    this.speed = THREE.MathUtils.clamp(this.speed, -cfg.reverseSpeed, max);
    const steerScale = THREE.MathUtils.clamp(Math.abs(this.speed) / 10, 0.15, 1);
    this.yaw += this.steerSmoothed * cfg.steer * steerScale * Math.sign(this.speed || 1) * dt;
    this.root.rotation.y = this.yaw;

    const f = this.forward();
    this.root.position.addScaledVector(f, this.speed * dt);
    arena.clamp(this.root.position);
    arena.avoidColumns?.(this.root.position, 2.4);

    const bob = Math.sin(this.timeOrNow() * 0.018 * (8 + Math.abs(this.speed))) * 0.03;
    this.root.position.y = bob;
    this.root.rotation.z = THREE.MathUtils.damp(
      this.root.rotation.z,
      -this.steerSmoothed * 0.14,
      7,
      dt,
    );
    this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, throttle * 0.04, 6, dt);

    const spin = this.speed * dt * 1.6;
    for (const wheel of this.wheels) wheel.rotation.x += spin;

    this.wetTimer = Math.max(0, this.wetTimer - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.health = Math.min(cfg.maxHealth, this.health + dt * 5.5);

    const delta = input.consumeDelta();
    this.camYaw -= delta.dx * 0.0026;
    this.camPitch -= delta.dy * 0.002;
    this.camYaw = THREE.MathUtils.clamp(this.camYaw, -1.05, 1.05);
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.08, 0.55);
    this.camYaw = THREE.MathUtils.damp(this.camYaw, 0, 1.15, dt);

    if (this.barrel) {
      this.barrel.rotation.x = -this.camPitch * 0.45;
      this.barrel.rotation.y = this.camYaw * 0.65;
    }
  }

  timeOrNow() {
    return performance.now();
  }

  updateCamera(camera, dt, mode) {
    const f = this.forward().clone();
    _right.set(f.z, 0, -f.x);
    if (mode === 'cockpit') {
      const pos = this.root.position.clone().add(
        new THREE.Vector3(0.18, 1.42, 0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw),
      );
      camera.position.copy(pos);
      _look.copy(this.root.position).add(f.multiplyScalar(14));
      _look.y += 1.4;
      camera.lookAt(_look);
      camera.fov = THREE.MathUtils.damp(camera.fov, 70, 4, dt);
      camera.updateProjectionMatrix();
      this.cameraReady = true;
      return;
    }

    if (mode === 'pullout') this.pull = Math.min(1, this.pull + dt * 0.55);
    else this.pull = 1;

    const back = 9.5 + this.pull * 4.5;
    const up = 3.6 + this.pull * 1.8;
    _ideal.copy(this.root.position)
      .addScaledVector(f, -back)
      .addScaledVector(_right, Math.sin(this.camYaw) * back * 0.55);
    _ideal.y += up + this.camPitch * 3.2;
    _ideal.y = Math.max(_ideal.y, 2.6);

    if (!this.cameraReady) {
      camera.position.copy(_ideal);
      this.cameraReady = true;
    } else {
      camera.position.lerp(_ideal, 1 - Math.pow(0.0008, dt));
    }
    camera.position.y = Math.max(camera.position.y, 2.4);

    _target.copy(this.root.position).addScaledVector(f, 12 + Math.abs(this.speed) * 0.12);
    _target.y += 1.15 - this.camPitch * 1.4;
    camera.lookAt(_target);
    camera.fov = THREE.MathUtils.damp(camera.fov, 60, 4, dt);
    camera.updateProjectionMatrix();
  }
}
