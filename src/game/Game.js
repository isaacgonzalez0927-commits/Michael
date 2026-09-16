import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Input } from './Input.js';
import { AudioEngine } from './Audio.js';
import { Overlay } from '../ui/Overlay.js';
import { PostFX } from '../render/postfx.js';
import { RestaurantScene } from '../scenes/restaurant.js';
import { ArenaScene } from '../scenes/arena.js';
import { PlayerCar } from '../entities/car.js';
import { Projectile } from '../entities/projectiles.js';
import { spawnUfo } from '../entities/ufo.js';
import { Horse } from '../entities/horse.js';
import { HorseCar } from '../entities/horseCar.js';
import { FoodPickup } from '../entities/food.js';
import { ParticleSystem } from '../fx/particles.js';

/**
 * State machine + render loop for The Milkshake Incident.
 * Modes: menu → restaurant → transition → cockpit → pullout → drive
 */
export class Game {
  constructor(canvas, overlayRoot) {
    this.canvas = canvas;
    this.overlay = new Overlay(overlayRoot);
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.clock = new THREE.Clock();
    this.mode = 'menu';
    this.time = 0;
    this.modeTime = 0;
    this.dream = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 600);
    this.dummyScene = new THREE.Scene();
    this.dummyScene.background = new THREE.Color(0x07060e);
    this.fx = new PostFX(this.renderer, this.dummyScene, this.camera);
    this.fx.setBloom(0.2);

    this.restaurant = null;
    this.arena = null;
    this.car = null;
    this.particles = null;
    this.ufos = [];
    this.horses = [];
    this.horseCars = [];
    this.foodDrops = [];
    this.projectiles = [];
    this.raycaster = new THREE.Raycaster();

    this.kills = 0;
    this.food = 0;
    this.complete = false;
    this.laserHurtCd = 0;
    this.spawnCd = 0;

    this.overlay.onStart(() => this.startGame());
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('click', () => {
      if (this.mode === 'restaurant' || this.mode === 'drive' || this.mode === 'pullout' || this.mode === 'cockpit') {
        this.input.requestLock();
        this._kickAudio();
      }
    });
    this.resize();
    this.skipIntro = new URLSearchParams(window.location.search).get('drive') === '1';
  }

  start() {
    this.clock.start();
    if (this.skipIntro) {
      this.overlay.hideMenu();
      this.enterArena(true);
    }
    this.renderer.setAnimationLoop(() => this.frame());
  }

  async startGame() {
    await this.audio.resume();
    this.audio.startDiner();
    this.overlay.hideMenu();
    this.restaurant = new RestaurantScene();
    this.restaurant.setAspect(window.innerWidth / window.innerHeight);
    this.camera = this.restaurant.camera;
    this.fx.setScene(this.restaurant.scene, this.camera);
    this.fx.setBloom(0.22);
    this.fx.setDream(0.05, 0.05);
    this.mode = 'restaurant';
    this.modeTime = 0;
    this.overlay.showHud('cinematic');
    this.overlay.setPrompt(this.restaurant.nextPrompt());
    this.input.requestLock();
  }

  enterArena(skipCinematic = false) {
    if (this.restaurant) {
      this.restaurant.dispose();
      this.restaurant = null;
    }
    this.arena = new ArenaScene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 700);
    this.fx.setScene(this.arena.scene, this.camera);
    this.fx.setBloom(0.42);
    this.fx.setDream(0.08, 0.05);
    this.particles = new ParticleSystem(this.arena.scene);
    this.car = new PlayerCar(this.arena.scene);
    this.ufos = [];
    this.horses = [];
    this.horseCars = [];
    this.foodDrops = [];
    this.projectiles = [];
    this.kills = 0;
    this.food = 0;
    this.complete = false;

    for (let i = 0; i < CONFIG.ufoCount; i++) {
      this.ufos.push(spawnUfo(this.arena.scene, this.ufos, { near: i < 4 }));
    }
    for (let i = 0; i < CONFIG.horseCount; i++) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 36, 0, 8 + Math.random() * 22);
      const horse = new Horse(this.arena.scene, p, i < 3);
      this.horses.push(horse);
    }
    for (let i = 0; i < CONFIG.horseCarCount; i++) {
      const p = new THREE.Vector3(14 + i * 10, 0, -12 - i * 8);
      this.horseCars.push(new HorseCar(this.arena.scene, p, i === 0));
    }

    this.audio.startArena();
    this.overlay.showHud('drive');
    if (skipCinematic) {
      this.mode = 'drive';
      this.car.pull = 1;
      this.car.updateCamera(this.camera, 10, 'drive');
      this.overlay.setPrompt('');
    } else {
      this.mode = 'cockpit';
      this.overlay.setPrompt('You are in the car. The car is not where cars go.');
    }
    this.modeTime = 0;
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    this.modeTime += dt;

    if (this.mode === 'menu') {
      this.fx.render(dt);
      return;
    }
    if (this.mode === 'restaurant') this.updateRestaurant(dt);
    else if (this.mode === 'transition') this.updateTransition(dt);
    else this.updateDrive(dt);

    this.fx.render(dt);
  }

  updateRestaurant(dt) {
    const delta = this.input.consumeDelta();
    this.restaurant.applyLook(delta.dx, delta.dy);
    this.restaurant.updateCamera(this.time);
    this.overlay.setPrompt(this.restaurant.nextPrompt());

    if (this.input.consumeClick()) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.restaurant.camera);
      const looked = this.restaurant.pickFood(this.raycaster);
      const fallback = this.restaurant.look.pitch < 0.05 ? this._aimedMeal() : null;
      if (this.restaurant.eat(looked || fallback)) {
        if (this.restaurant.eatStep < 3) this.audio.eat();
        else this.audio.gulp();
        this.overlay.toast(['chew', 'salt', 'oh no'][this.restaurant.eatStep - 1]);
      }
    }

    if (this.restaurant.eatStep >= 3) {
      this.mode = 'transition';
      this.modeTime = 0;
      this.overlay.setPrompt('The room is making a decision.');
    }
  }

  _aimedMeal() {
    // If the click misses the mesh slightly, still eat the next item in sequence.
    const order = [this.restaurant.food.burger, this.restaurant.food.fries, this.restaurant.food.shake];
    return order[this.restaurant.eatStep];
  }

  updateTransition(dt) {
    const duration = 6.2;
    const t = Math.min(1, this.modeTime / duration);
    this.dream = t;
    this.restaurant.morph(t);
    this.restaurant.updateCamera(this.time);
    this.audio.setDistortion(t);
    this.fx.setDream(0.15 + t * 0.9, 0.2 + t * 1.4);
    this.fx.setBloom(0.3 + t * 1.4);
    if (t > 0.35 && t < 0.9) {
      this.overlay.setPrompt('Everything is the wrong size.');
    }
    if (t >= 1) this.enterArena(false);
  }

  updateDrive(dt) {
    if (!this.arena || !this.car) return;
    this._kickAudio();

    if (this.mode === 'cockpit' && this.modeTime > 2.4) {
      this.mode = 'pullout';
      this.modeTime = 0;
      this.overlay.setPrompt('WASD to drive. Click to shoot. The horses look hungry.');
    }
    if (this.mode === 'pullout' && this.car.pull >= 1) {
      this.mode = 'drive';
      this.overlay.setPrompt('');
    }

    const driving = this.mode === 'drive' || this.mode === 'pullout';
    if (driving) {
      this.car.update(dt, this.input, this.arena);
    } else {
      this.input.consumeDelta();
    }
    const camMode = this.mode === 'drive' ? 'drive' : this.mode;
    this.car.updateCamera(this.camera, dt, camMode);

    this.arena.update(dt, this.time, this.car.position);
    this.particles.update(dt);
    this.laserHurtCd = Math.max(0, this.laserHurtCd - dt);
    this.spawnCd = Math.max(0, this.spawnCd - dt);

    if (this.mode === 'drive' && this.car.alive && this.input.firing() && this.car.cooldown <= 0) {
      const origin = this.car.muzzle();
      const dir = this.car.aimDirection(this.camera);
      this.projectiles.push(
        new Projectile(this.arena.scene, origin, dir, {
          kind: 'player',
          speed: 92,
          damage: 1,
          color: 0xfff36a,
          life: 1.4,
        }),
      );
      this.car.cooldown = CONFIG.player.turretCooldown;
      this.audio.shoot();
      this.particles.muzzle(origin, dir);
    }
    this.input.consumeClick();

    for (const ufo of this.ufos) {
      if (!ufo.alive) continue;
      ufo.update(dt, this.time, this.car.position, this.projectiles);
      if (ufo.laser?.active && this.car.alive && ufo.laser.hitsPoint(this.car.position, 2.4)) {
        if (this.laserHurtCd <= 0) {
          this._hurt(12);
          this.laserHurtCd = 0.28;
          this.audio.laser();
        }
      }
    }

    for (const horse of this.horses) {
      const dmg = horse.update(dt, this.ufos, this.arena);
      if (dmg) this._damageNearestUfo(horse.position, 5.2, dmg);
    }
    for (const hc of this.horseCars) hc.update(dt, this.ufos, this.arena, this.projectiles);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (!p.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.kind === 'player' || p.kind === 'horse') {
        for (const ufo of this.ufos) {
          if (!ufo.alive) continue;
          if (p.mesh.position.distanceTo(ufo.position) < ufo.radius + p.radius) {
            const dead = ufo.hit(p.damage);
            p.kill();
            this.projectiles.splice(i, 1);
            if (dead) this._destroyUfo(ufo);
            break;
          }
        }
      } else if (p.kind === 'water' && this.car.alive) {
        if (p.mesh.position.distanceTo(this.car.position) < 2.4) {
          this._hurt(p.damage);
          this.car.wet();
          this.particles.splash(p.mesh.position.clone());
          this.audio.splash();
          p.kill();
          this.projectiles.splice(i, 1);
        } else if (p.mesh.position.y <= 0.45) {
          this.particles.splash(p.mesh.position.clone());
          p.kill();
          this.projectiles.splice(i, 1);
        }
      }
    }

    for (let i = this.foodDrops.length - 1; i >= 0; i--) {
      const drop = this.foodDrops[i];
      drop.update(dt, this.time);
      if (this.car.alive && drop.position.distanceTo(this.car.position) < 3.2) {
        if (this.food < CONFIG.maxFood) {
          this.food += 1;
          this.audio.pickup();
          this.overlay.toast('YARDBIRD PAIL');
        }
        drop.collect();
        this.foodDrops.splice(i, 1);
      }
    }

    this._tryFeed();

    const aliveUfos = this.ufos.filter((u) => u.alive);
    this.ufos = aliveUfos;
    if (aliveUfos.length < CONFIG.maxUfos && this.spawnCd <= 0) {
      this.ufos.push(spawnUfo(this.arena.scene, this.ufos));
      this.spawnCd = 1.6;
    }

    const hungry = [...this.horses, ...this.horseCars].filter((h) => h.hungry).length;
    this.overlay.updateDrive({
      goal: CONFIG.ufoGoal,
      kills: this.kills,
      complete: this.complete,
      hungry,
      food: this.food,
      speed: Math.abs(this.car.speed),
      health: this.car.health,
    });
  }

  _kickAudio() {
    const inArena = this.mode === 'drive' || this.mode === 'pullout' || this.mode === 'cockpit';
    if (this.audio.ctx && this.audio.ctx.state === 'running') {
      if (inArena && this.audio.mode !== 'arena') this.audio.startArena();
      return;
    }
    const engaged = this.input.throttle() || this.input.firing() || this.input.keys.size > 0;
    if (!engaged) return;
    this.audio.resume().then(() => {
      if (inArena) this.audio.startArena();
    });
  }

  _damageNearestUfo(pos, range, dmg) {
    let best = null;
    let bestD = range;
    for (const ufo of this.ufos) {
      if (!ufo.alive) continue;
      const d = pos.distanceTo(ufo.position);
      if (d < bestD) {
        bestD = d;
        best = ufo;
      }
    }
    if (best) {
      this.audio.neigh();
      this.particles.burst(best.position.clone(), 0xd6ff3c, 10, 8, 0.16, 0.4);
      if (best.hit(dmg)) this._destroyUfo(best);
    }
  }

  _destroyUfo(ufo) {
    this.kills += 1;
    this.audio.explosion();
    this.particles.explosion(ufo.position.clone(), ufo.type === 'laser' ? 0xff3dc8 : 0x4ef0ff);
    const dropPos = ufo.position.clone();
    dropPos.y = 0.9;
    this.foodDrops.push(new FoodPickup(this.arena.scene, dropPos));
    if (!this.complete && this.kills >= CONFIG.ufoGoal) {
      this.complete = true;
      this.overlay.showComplete();
      this.audio.complete();
      this.overlay.toast('nobody is coming to pick you up');
    }
  }

  _tryFeed() {
    if (this.food <= 0 || !this.car.alive) return;
    const allies = [...this.horses, ...this.horseCars];
    allies.sort(
      (a, b) => a.position.distanceToSquared(this.car.position) - b.position.distanceToSquared(this.car.position),
    );
    for (const ally of allies) {
      if (this.food <= 0) break;
      if (!ally.hungry) continue;
      if (ally.position.distanceTo(this.car.position) < 7.5 && ally.feed()) {
        this.food -= 1;
        this.audio.feed();
        this.overlay.toast('THE HORSE ACCEPTS THE PAIL');
        this.particles.burst(ally.position.clone().setY(1.4), 0xffc14a, 12, 5, 0.12, 0.5);
        break;
      }
    }
  }

  _hurt(amount) {
    const killed = this.car.damage(amount);
    this.overlay.hurt();
    this.audio.hit();
    if (killed) this.overlay.toast('the car decided to be a car again');
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.fx.resize(w, h);
    const cam = this.restaurant?.camera || this.camera;
    if (cam) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    this.restaurant?.setAspect(w / h);
  }
}
