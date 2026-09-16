import * as THREE from 'three';
import { CONFIG, COLORS } from '../config.js';
import { createHorseMesh } from '../render/meshes.js';

export class Horse {
  constructor(scene, position, startHungry = false) {
    this.scene = scene;
    this.root = createHorseMesh(Math.random() > 0.5 ? COLORS.magenta : COLORS.cyan);
    this.root.position.copy(position);
    scene.add(this.root);
    this.energy = startHungry ? 16 + Math.random() * 10 : 55 + Math.random() * 40;
    this.radius = 1.4;
    this.speed = 11;
    this.yaw = Math.random() * Math.PI * 2;
    this.state = 'wander';
    this.timer = 0;
    this.attackCd = 0;
    this.leap = 0;
    this.leapVel = 0;
    this.targetUfo = null;
    this.wander = position.clone();
    this.hungrySign = this.root.getObjectByName('hungrySign');
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
    this.root.position.y = 0.6;
    this.leapVel = 6;
    return true;
  }

  update(dt, ufos, arena) {
    this.energy = Math.max(0, this.energy - dt * (this.state === 'attack' ? 5.5 : 2.2));
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.hungrySign.visible = this.hungry;

    const legs = this.root.userData.legs || [];
    const gait = this.hungry ? 6 : 14;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = Math.sin(performance.now() * 0.01 * gait + i) * (this.hungry ? 0.15 : 0.45);
    }

    if (this.hungry) {
      this.state = 'wander';
      this._wander(dt, arena, 4);
      this.root.position.y = THREE.MathUtils.damp(this.root.position.y, 0, 4, dt);
      this.root.rotation.x = 0.18;
      return 0;
    }

    this.root.rotation.x = 0;
    let damageDealt = 0;
    const nearest = nearestUfo(this.root.position, ufos);
    if (nearest && this.root.position.distanceTo(nearest.position) < 48 && this.attackCd <= 0) {
      this.state = 'attack';
      this.targetUfo = nearest;
    } else if (!this.targetUfo) {
      this.state = 'wander';
    }

    if (this.state === 'attack' && this.targetUfo?.alive) {
      const to = this.targetUfo.position.clone().sub(this.root.position);
      const dist = to.length();
      if (dist > 0.1) {
        to.normalize();
        this.yaw = Math.atan2(to.x, to.z);
        this.root.rotation.y = this.yaw;
        // Horses run on the air. Nobody comments on it.
        this.root.position.addScaledVector(to, this.speed * 1.7 * dt);
      }
      this.root.rotation.x = THREE.MathUtils.clamp(
        (this.targetUfo.position.y - this.root.position.y) * 0.04,
        -0.6,
        0.6,
      );
      if (this.root.position.distanceTo(this.targetUfo.position) < 4.8) {
        damageDealt = 1;
        this.attackCd = 2.2;
        this.targetUfo = null;
        this.state = 'wander';
      }
    } else {
      this._wander(dt, arena, this.speed);
      this.root.position.y = THREE.MathUtils.damp(this.root.position.y, 0, 3, dt);
      this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, 0, 4, dt);
    }

    arena.clamp(this.root.position);
    return damageDealt;
  }

  _wander(dt, arena, speed) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.wander.set((Math.random() - 0.5) * 300, 0, (Math.random() - 0.5) * 300);
      this.timer = 2 + Math.random() * 4;
    }
    const to = this.wander.clone().sub(this.root.position);
    to.y = 0;
    if (to.lengthSq() > 1) {
      to.normalize();
      this.yaw = Math.atan2(to.x, to.z);
      this.root.rotation.y = this.yaw;
      this.root.position.addScaledVector(to, speed * dt);
    }
    arena.clamp(this.root.position);
  }
}

export function nearestUfo(pos, ufos) {
  let best = null;
  let bestD = Infinity;
  for (const u of ufos) {
    if (!u.alive) continue;
    const d = pos.distanceToSquared(u.position);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}
