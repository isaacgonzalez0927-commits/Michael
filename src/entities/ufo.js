import * as THREE from 'three';
import { createUfoMesh } from '../render/meshes.js';
import { LaserBeam, Projectile } from './projectiles.js';

const _to = new THREE.Vector3();

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
    this.radius = 2.8;
    this.height = THREE.MathUtils.clamp(position.y, 12, 28);
    this.speed = 8 + Math.random() * 4;
    this.phase = Math.random() * Math.PI * 2;
    this.cooldown = 1 + Math.random() * 2;
    this.laser = type === 'laser' ? new LaserBeam(scene) : null;
    this.laserTimer = 0;
    this.waypoint = new THREE.Vector3(position.x, 0, position.z);
    this.bank = 0;
  }

  get position() {
    return this.root.position;
  }

  hit(dmg) {
    this.hp -= dmg;
    const k = Math.max(0.72, this.hp / this.maxHp);
    this.root.scale.setScalar(k);
    if (this.hp <= 0) {
      this.kill();
      return true;
    }
    return false;
  }

  kill() {
    this.alive = false;
    this.laser?.dispose();
    this.laser = null;
    this.scene.remove(this.root);
  }

  _pickWaypoint(player, arena) {
    const hunt = Math.random() > 0.35;
    if (hunt && player) {
      const a = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 28;
      this.waypoint.set(player.x + Math.cos(a) * r, 0, player.z + Math.sin(a) * r);
    } else {
      const m = (arena?.half ?? 180) - 18;
      this.waypoint.set((Math.random() * 2 - 1) * m, 0, (Math.random() * 2 - 1) * m);
    }
    arena?.clamp(this.waypoint);
  }

  update(dt, time, player, projectiles, arena) {
    if (!this.alive) return;
    this.phase += dt * 0.7;
    _to.set(this.waypoint.x - this.root.position.x, 0, this.waypoint.z - this.root.position.z);
    if (_to.lengthSq() < 64) this._pickWaypoint(player, arena);
    if (_to.lengthSq() > 0.001) {
      _to.normalize();
      this.root.position.x += _to.x * this.speed * dt;
      this.root.position.z += _to.z * this.speed * dt;
    }
    this.root.position.y = this.height + Math.sin(time * 1.4 + this.phase) * 1.6;
    this.root.rotation.y += dt * 0.9;
    this.bank = THREE.MathUtils.damp(this.bank, _to.x * 0.25, 4, dt);
    this.root.rotation.z = this.bank;
    arena?.clamp(this.root.position);
    arena?.avoidColumns?.(this.root.position, 3.2);

    this.cooldown -= dt;
    if (this.laser) {
      if (this.laserTimer > 0) {
        this.laserTimer -= dt;
        const from = this.root.position.clone();
        from.y -= 0.9;
        const aim = player.clone();
        aim.y += 1.05;
        this.laser.fire(from, aim);
        if (this.laserTimer <= 0) this.laser.hide();
      } else if (this.cooldown <= 0 && this.root.position.distanceTo(player) < 90) {
        this.laserTimer = 0.48;
        this.cooldown = 2.6 + Math.random() * 1.8;
      }
    } else if (this.cooldown <= 0 && this.root.position.distanceTo(player) < 95) {
      const origin = this.root.position.clone();
      origin.y -= 0.85;
      const dir = player.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(origin).normalize();
      dir.x += (Math.random() - 0.5) * 0.06;
      dir.z += (Math.random() - 0.5) * 0.06;
      projectiles.push(
        new Projectile(this.scene, origin, dir, {
          kind: 'water',
          water: true,
          speed: 30,
          gravity: 0.28,
          life: 3.0,
          damage: 6,
          radius: 1.15,
        }),
      );
      this.cooldown = 1.7 + Math.random();
    }
  }
}

export function spawnUfo(scene, existing = [], options = {}) {
  const half = 160;
  let x;
  let z;
  if (options.near) {
    const a = Math.random() * Math.PI * 2;
    const r = 24 + Math.random() * 26;
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
  } else {
    x = (Math.random() * 2 - 1) * half;
    z = (Math.random() * 2 - 1) * half;
    if (existing.length) {
      if (Math.random() > 0.5) x = Math.sign(Math.random() - 0.5) * half;
      else z = Math.sign(Math.random() - 0.5) * half;
    }
  }
  const type = Math.random() > 0.45 ? 'laser' : 'water';
  const y = 14 + Math.random() * 8;
  return new UFO(scene, type, new THREE.Vector3(x, y, z));
}
