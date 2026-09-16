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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

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
    this.arenaFade = 0;

    this.overlay.setFade(0);

    this.overlay.onStart(() => this.startGame());
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('click', () => {
      if (this.mode === 'drive' || this.mode === 'pullout' || this.mode === 'cockpit') {
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
    this.fx.setBloom(0.1);
    this.fx.setDream(0.02, 0.02);
    this.mode = 'restaurant';
    this.modeTime = 0;
    this.eatCooldown = 0;
    this.overlay.showHud('cinematic');
    this.overlay.setPrompt(this.restaurant.nextPrompt());
    this.input.exitLock();
  }

  enterArena(skipCinematic = false) {
    if (this.restaurant) {
      this.restaurant.dispose();
      this.restaurant = null;
    }
    this.arena = new ArenaScene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 700);
    this.fx.setScene(this.arena.scene, this.camera);
    this.fx.setBloom(0.58, 0.48);
    this.fx.setDream(skipCinematic ? 0.08 : 0.36, skipCinematic ? 0.05 : 0.22);
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
    this.overlay.setFade(1);
    this.arenaFade = skipCinematic ? 0.45 : 1.35;
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
    this.eatCooldown = Math.max(0, (this.eatCooldown || 0) - dt);

    const eatPressed = this.input.consumeClick() || this.input.down('Space') || this.input.down('KeyE');
    if (eatPressed && this.eatCooldown <= 0) {
      const next = this._aimedMeal();
      if (this.restaurant.eat(next)) {
        this.eatCooldown = 0.45;
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
    this.fx.setDream(0.12 + t * 0.85, 0.16 + t * 1.15);
    this.fx.setBloom(0.28 + t * 1.15);
    if (t > 0.35 && t < 0.9) {
      this.overlay.setPrompt('Everything is the wrong size.');
    }
    if (t > 0.72) this.overlay.setFade((t - 0.72) / 0.28);
    if (t >= 1) this.enterArena(false);
  }

  updateDrive(dt) {
    if (!this.arena || !this.car) return;
    this._kickAudio();

    if (this.mode === 'cockpit' && this.modeTime > 1.6) {
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
    if (this.arenaFade > 0) {
      this.arenaFade = Math.max(0, this.arenaFade - dt);
      this.overlay.setFade(this.arenaFade / 1.35 * 0.82);
      const k = this.arenaFade / 1.35;
      this.fx.setDream(0.07 + k * 0.28, 0.05 + k * 0.2);
    }
    this.audio.setEngine(this.car.speed);

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
      ufo.update(dt, this.time, this.car.position, this.projectiles, this.arena);
      if (ufo.laser?.active && this.car.alive && ufo.laser.hitsPoint(this.car.position, 2.4)) {
        if (this.laserHurtCd <= 0) {
          this._hurt(7);
          this.laserHurtCd = 0.35;
          this.audio.laser();
          this.particles.burst(this.car.position.clone().setY(1.2), 0xff3dc8, 8, 6, 0.12, 0.28);
        }
      }
    }

    for (const horse of this.horses) {
      const dmg = horse.update(dt, this.ufos, this.arena, this.horses);
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
      drop.update(dt, this.time, this.car.position);
      const xz = Math.hypot(drop.position.x - this.car.position.x, drop.position.z - this.car.position.z);
      if (this.car.alive && xz < 5.8) {
        if (this.food < CONFIG.maxFood) {
          this.food += 1;
          this.audio.pickup();
          this.overlay.toast('YARDBIRD PAIL');
          this.particles.pickup(drop.position.clone());
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
      dt,
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
    const dropPos = ufo.position.clone().lerp(this.car.position, 0.62);
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
        this.particles.pickup(ally.position.clone().setY(1.4));
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
