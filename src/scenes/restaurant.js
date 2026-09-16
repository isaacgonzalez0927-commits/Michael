import * as THREE from 'three';
import { dinerFloorTexture, wallTexture, labelTexture } from '../render/textures.js';
import { createFoodMeal } from '../render/meshes.js';
import { COLORS } from '../config.js';

/**
 * First-person diner booth. Slightly too empty, slightly too bright.
 */
export class RestaurantScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1714);
    this.scene.fog = new THREE.Fog(0x1a1714, 12, 38);

    this.morphables = [];
    this.lights = [];
    this.eatStep = 0;
    this.look = { yaw: 0, pitch: -0.12 };

    this._buildRoom();
    this._buildBooth();
    this._buildFood();
    this._buildLights();

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 80);
    this.camera.position.set(0, 1.28, 0.15);
    this.baseCamPos = this.camera.position.clone();
  }

  _track(mesh, extra = {}) {
    mesh.userData.originPos = mesh.position.clone();
    mesh.userData.originScale = mesh.scale.clone();
    mesh.userData.originRot = mesh.rotation.clone();
    Object.assign(mesh.userData, extra);
    this.morphables.push(mesh);
    return mesh;
  }

  _buildRoom() {
    const floorMap = dinerFloorTexture(THREE);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 36),
      new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.7 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(this._track(floor, { stretchY: false }));

    const wallMap = wallTexture(THREE);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.85 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(28, 6, 0.3), wallMat);
    back.position.set(0, 3, -16);
    this.scene.add(this._track(back, { stretch: 2.5 }));

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 36), wallMat);
    left.position.set(-14, 3, 2);
    this.scene.add(this._track(left, { stretch: 3 }));

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 36), wallMat);
    right.position.set(14, 3, 2);
    this.scene.add(this._track(right, { stretch: 3 }));

    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.2, 36),
      new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.9 }),
    );
    ceiling.position.y = 5.6;
    this.scene.add(this._track(ceiling, { rise: -8 }));

    // Windows looking onto a night lot that shouldn't be this empty.
    for (const z of [-6, 2, 10]) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.4, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x3a2a22 }),
      );
      frame.position.set(-13.8, 2.4, z);
      this.scene.add(this._track(frame));
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 2.1),
        new THREE.MeshStandardMaterial({
          color: 0x0b1020,
          emissive: 0x142038,
          emissiveIntensity: 0.4,
          roughness: 0.05,
        }),
      );
      glass.position.set(-13.62, 2.4, z);
      glass.rotation.y = Math.PI / 2;
      this.scene.add(this._track(glass, { glowShift: true }));
    }

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.1, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x7a3a28 }),
    );
    counter.position.set(6, 0.55, -12);
    this.scene.add(this._track(counter, { sink: true }));

    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 2.2),
      new THREE.MeshStandardMaterial({
        map: labelTexture(THREE, "TODAY: DON'T", '#ffe56a', '#1a120c'),
      }),
    );
    board.position.set(6, 3.4, -13.6);
    this.scene.add(this._track(board));

    const plantPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a4030 }),
    );
    plantPot.position.set(-1.6, 0.9, -1.1);
    const plant = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x245c32 }),
    );
    plant.position.set(-1.6, 1.4, -1.1);
    this.scene.add(this._track(plantPot), this._track(plant, { stretch: 6 }));
  }

  _buildBooth() {
    const vinyl = new THREE.MeshStandardMaterial({ color: COLORS.vinyl, roughness: 0.7 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.6 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.2), vinyl);
    seat.position.set(0, 0.35, -0.35);
    this.scene.add(this._track(seat));

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.18), vinyl);
    back.position.set(0, 1.0, -0.9);
    this.scene.add(this._track(back, { stretch: 12 }));

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.0), wood);
    table.position.set(0, 0.78, 0.85);
    this.scene.add(this._track(table, { sink: true }));
    this.table = table;

    const oppSeat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.1), vinyl);
    oppSeat.position.set(0, 0.35, 1.9);
    this.scene.add(this._track(oppSeat, { stretch: 4 }));
    const oppBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 0.18), vinyl);
    oppBack.position.set(0, 1.0, 2.4);
    this.scene.add(this._track(oppBack, { stretch: 10 }));

    // Neighbor booths, all empty.
    for (const x of [-3.4, 3.4]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.1), vinyl);
      s.position.set(x, 0.35, 0.8);
      this.scene.add(this._track(s, { sink: true }));
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.16), vinyl);
      b.position.set(x, 0.95, 0.2);
      this.scene.add(this._track(b, { stretch: 8 }));
    }
  }

  _buildFood() {
    const meal = createFoodMeal();
    meal.group.position.set(0, 0.84, 0.82);
    this.scene.add(meal.group);
    this.food = meal;
    this.clickables = [meal.burger, meal.fries, meal.shake];
    for (const item of this.clickables) {
      item.userData.originPos = item.position.clone();
    }
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xfff1d6, 0x2a1810, 0.55);
    this.scene.add(hemi);

    for (const z of [-10, -2, 6]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.06, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0xf5f0d8,
          emissive: 0xfff3c8,
          emissiveIntensity: 1.4,
        }),
      );
      panel.position.set(0, 5.45, z);
      this.scene.add(panel);
      const light = new THREE.PointLight(0xfff1c2, 4.5, 16, 1.6);
      light.position.set(0, 5.1, z);
      this.scene.add(light);
      this.lights.push({ panel, light, base: 4.5 });
    }

    const windowLight = new THREE.PointLight(0x4a6aa8, 1.5, 12);
    windowLight.position.set(-10, 2.5, 0);
    this.scene.add(windowLight);
    this.lights.push({ panel: null, light: windowLight, base: 1.5 });
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  applyLook(dx, dy) {
    this.look.yaw -= dx * 0.0022;
    this.look.pitch -= dy * 0.002;
    this.look.pitch = THREE.MathUtils.clamp(this.look.pitch, -0.7, 0.55);
    this.look.yaw = THREE.MathUtils.clamp(this.look.yaw, -1.15, 1.15);
  }

  updateCamera(time) {
    const breathe = Math.sin(time * 1.3) * 0.012;
    this.camera.position.set(
      this.baseCamPos.x,
      this.baseCamPos.y + breathe,
      this.baseCamPos.z,
    );
    this.camera.rotation.set(this.look.pitch, this.look.yaw, Math.sin(time * 0.4) * 0.01);
  }

  pickFood(raycaster) {
    const hits = raycaster.intersectObjects(this.clickables, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !this.clickables.includes(obj)) obj = obj.parent;
    return obj;
  }

  eat(item) {
    const order = ['burger', 'fries', 'shake'];
    const expected = order[this.eatStep];
    if (!item || item.name !== expected) return false;
    item.visible = false;
    this.eatStep += 1;
    return true;
  }

  nextPrompt() {
    if (this.eatStep === 0) return 'The burger is sitting there like it knows something. Click it.';
    if (this.eatStep === 1) return 'Fries. They taste like a parking lot. Click them anyway.';
    if (this.eatStep === 2) return 'The milkshake is sweating. Drink it.';
    return '';
  }

  morph(t) {
    const k = THREE.MathUtils.smoothstep(t, 0, 1);
    for (const mesh of this.morphables) {
      const o = mesh.userData.originPos;
      const s = mesh.userData.originScale;
      if (mesh.userData.stretch) {
        mesh.scale.set(s.x, s.y * (1 + k * mesh.userData.stretch), s.z * (1 + k * 0.4));
        mesh.position.y = o.y + k * 0.4 * mesh.userData.stretch;
      }
      if (mesh.userData.sink) {
        mesh.position.y = o.y - k * 1.6;
        mesh.rotation.z = k * 0.4;
      }
      if (mesh.userData.rise) {
        mesh.position.y = o.y + k * mesh.userData.rise;
      }
      if (mesh.userData.glowShift && mesh.material) {
        mesh.material.emissive = new THREE.Color().setHSL((0.8 + k * 0.4) % 1, 0.7, 0.25);
      }
      mesh.position.x = o.x + Math.sin(k * 8 + o.z) * k * 0.4;
    }

    this.scene.fog.near = 12 - k * 10;
    this.scene.fog.far = 38 - k * 18;
    this.scene.background.setHSL(0.85, 0.4, 0.08 + k * 0.05);
    this.camera.fov = 62 + k * 28;
    this.camera.updateProjectionMatrix();
    this.camera.position.y = this.baseCamPos.y + k * 0.8;
    this.camera.position.z = this.baseCamPos.z - k * 1.4;

    for (const entry of this.lights) {
      const flicker = 0.4 + Math.abs(Math.sin(k * 40 + entry.base)) * (0.2 + k * 1.8);
      entry.light.intensity = entry.base * flicker;
      const hue = k > 0.2 ? (Math.sin(k * 12 + entry.base) * 0.5 + 0.5) : 0.12;
      entry.light.color.setHSL(hue, 0.7, 0.6);
      if (entry.panel) {
        entry.panel.material.emissive.setHSL(hue, 0.8, 0.6);
        entry.panel.material.emissiveIntensity = 0.6 + k * 3;
      }
    }

    if (this.food.group.visible) {
      this.food.group.scale.setScalar(1 + k * 0.8);
      this.food.group.rotation.y = k * 2;
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
}
