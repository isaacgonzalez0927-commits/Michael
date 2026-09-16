import * as THREE from 'three';
import { CONFIG, COLORS } from '../config.js';
import { createHorseMesh } from '../render/meshes.js';

const _to = new THREE.Vector3();

export class Horse {
  constructor(scene, position, startHungry = false) {
    this.scene = scene;
    this.root = createHorseMesh(Math.random() > 0.5 ? COLORS.magenta : COLORS.cyan);
    this.root.position.copy(position);
    scene.add(this.root);
    this.energy = startHungry ? 18 + Math.random() * 8 : 62 + Math.random() * 30;
    this.radius = 1.4;
    this.speed = 12;
    this.yaw = Math.random() * Math.PI * 2;
    this.state = 'wander';
    this.timer = 0;
    this.attackCd = 0;
    this.leapVel = 0;
    this.leaping = false;
    this.attackTime = 0;
    this.targetUfo = null;
    this.wander = position.clone();
    this.hungrySign = this.root.getObjectByName('hungrySign');
    this.body = this.root.children[0];
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
    this.leapVel = 7;
    this.leaping = true;
    return true;
  }

  update(dt, ufos, arena, others = []) {
    this.energy = Math.max(0, this.energy - dt * (this.state === 'attack' ? 1.15 : 0.48));
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.hungrySign.visible = this.hungry;
    this._animate(dt);

    let damageDealt = 0;
    if (this.hungry) {
      this.state = 'wander';
      this.leaping = false;
      this._wander(dt, arena, 3.8);
      this.root.position.y = THREE.MathUtils.damp(this.root.position.y, 0, 5, dt);
      this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, 0.16, 6, dt);
    } else {
      this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, 0, 5, dt);
      const nearest = nearestUfo(this.root.position, ufos);
      if (nearest && xzDist(this.root.position, nearest.position) < 42 && this.attackCd <= 0) {
        this.state = 'attack';
        this.targetUfo = nearest;
        this.attackTime = 0;
      } else if (!this.targetUfo) {
        this.state = 'wander';
      }

      if (this.state === 'attack' && this.targetUfo?.alive) {
        damageDealt = this._attack(dt);
      } else {
        this.targetUfo = null;
        this._wander(dt, arena, this.speed);
        this._land(dt);
      }
    }

    this._separate(others, dt);
    arena.clamp(this.root.position);
    arena.avoidColumns?.(this.root.position, 1.8);
    return damageDealt;
  }

  _attack(dt) {
    this.attackTime += dt;
    const ufo = this.targetUfo;
    _to.set(ufo.position.x - this.root.position.x, 0, ufo.position.z - this.root.position.z);
    const flat = _to.length();
    if (flat > 0.2) {
      _to.multiplyScalar(1 / flat);
      const desired = Math.atan2(_to.x, _to.z);
      this.yaw = dampAngle(this.yaw, desired, 7, dt);
      this.root.rotation.y = this.yaw;
      this.root.position.addScaledVector(_to, this.speed * 1.55 * dt);
    }

    if (flat < 13 && !this.leaping) {
      this.leaping = true;
      this.leapVel = 16;
    }
    if (this.leaping) {
      this.leapVel -= 26 * dt;
      this.root.position.y += this.leapVel * dt;
      this.root.rotation.x = -0.25;
    }

    let dmg = 0;
    if (this.root.position.distanceTo(ufo.position) < 5.4) {
      dmg = 1;
      this.attackCd = 2.3;
      this.targetUfo = null;
      this.state = 'wander';
      this.leapVel = -2;
    }
    if (this.attackTime > 3.8 || this.root.position.y > 18) {
      this.targetUfo = null;
      this.state = 'wander';
      this.leapVel = -6;
    }
    if (this.root.position.y <= 0) {
      this.root.position.y = 0;
      this.leaping = false;
      this.leapVel = 0;
    }
    return dmg;
  }

  _land(dt) {
    if (this.root.position.y > 0) {
      this.leapVel -= 28 * dt;
      this.root.position.y += this.leapVel * dt;
    }
    if (this.root.position.y <= 0) {
      this.root.position.y = 0;
      this.leaping = false;
      this.leapVel = 0;
    }
  }

  _wander(dt, arena, speed) {
    this.timer -= dt;
    if (this.timer <= 0) {
      const m = arena.half - 20;
      this.wander.set((Math.random() * 2 - 1) * m, 0, (Math.random() * 2 - 1) * m);
      this.timer = 2.4 + Math.random() * 3.2;
    }
    _to.set(this.wander.x - this.root.position.x, 0, this.wander.z - this.root.position.z);
    if (_to.lengthSq() > 1) {
      _to.normalize();
      const desired = Math.atan2(_to.x, _to.z);
      this.yaw = dampAngle(this.yaw, desired, 5, dt);
      this.root.rotation.y = this.yaw;
      this.root.position.addScaledVector(_to, speed * dt);
    }
  }

  _separate(others, dt) {
    for (const other of others) {
      if (other === this) continue;
      _to.copy(this.root.position).sub(other.position);
      _to.y = 0;
      const d = _to.length();
      if (d > 0.01 && d < 4.2) {
        _to.multiplyScalar((4.2 - d) * dt * 3.2 / d);
        this.root.position.add(_to);
      }
    }
  }

  _animate() {
    const legs = this.root.userData.legs || [];
    const moving = this.state === 'attack' || !this.hungry;
    const gait = this.hungry ? 5 : 13;
    const amp = this.hungry ? 0.12 : 0.42;
    const t = performance.now() * 0.01 * gait;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = Math.sin(t + i * 1.7) * amp;
    }
    if (this.body && moving) {
      this.body.position.y = 1.05 + Math.abs(Math.sin(t)) * 0.06;
    }
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

function xzDist(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function dampAngle(current, target, lambda, dt) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}
