import * as THREE from 'three';
import { CONFIG, COLORS } from '../config.js';
import { tileFloorTexture, arenaWallTexture, exitSignTexture, labelTexture } from '../render/textures.js';
import { createWater } from '../render/water.js';

/**
 * Gigantic fluorescent liminal hangar with shallow water and the wrong scale.
 */
export class ArenaScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0714);
    this.scene.fog = new THREE.FogExp2(0x140c22, 0.0064);

    this.half = CONFIG.arenaSize / 2;
    this.flickerPanels = [];
    this.props = [];

    this._lights();
    this._shell();
    this._ceiling();
    this._water();
    this._setDressing();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0x7a5cff, 0x082028, 0.45));
    const key = new THREE.DirectionalLight(0xc8f4ff, 0.55);
    key.position.set(40, 80, 20);
    this.scene.add(key);
    this.playerLight = new THREE.PointLight(0xfff2c4, 8, 38, 1.6);
    this.scene.add(this.playerLight);
    this.accentA = new THREE.PointLight(COLORS.magenta, 6, 50, 1.4);
    this.accentA.position.set(-40, 18, 30);
    this.scene.add(this.accentA);
    this.accentB = new THREE.PointLight(COLORS.cyan, 6, 50, 1.4);
    this.accentB.position.set(50, 16, -40);
    this.scene.add(this.accentB);
  }

  _shell() {
    const floorMap = tileFloorTexture(THREE);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize),
      new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.25, metalness: 0.45 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const wallMap = arenaWallTexture(THREE);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallMap,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x14081c,
      emissiveIntensity: 0.4,
    });
    const h = CONFIG.wallHeight;
    const s = CONFIG.arenaSize;
    const walls = [
      [0, h / 2, -this.half, s, h, 2],
      [0, h / 2, this.half, s, h, 2],
      [-this.half, h / 2, 0, 2, h, s],
      [this.half, h / 2, 0, 2, h, s],
    ];
    for (const [x, y, z, w, hh, d] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), wallMat);
      m.position.set(x, y, z);
      this.scene.add(m);
    }
  }

  _ceiling() {
    const s = CONFIG.arenaSize;
    const y = CONFIG.wallHeight - 0.4;
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(s, 1.2, s),
      new THREE.MeshStandardMaterial({ color: 0x15101f, roughness: 0.9 }),
    );
    ceiling.position.y = y;
    this.scene.add(ceiling);

    const geo = new THREE.BoxGeometry(9, 0.18, 0.55);
    const colors = [
      new THREE.MeshStandardMaterial({
        color: 0xf4ffd2,
        emissive: 0xf0ff9a,
        emissiveIntensity: 1.6,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xffb0ea,
        emissive: COLORS.magenta,
        emissiveIntensity: 1.3,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xb8fff8,
        emissive: COLORS.cyan,
        emissiveIntensity: 1.3,
      }),
    ];

    const cols = 14;
    const rows = 14;
    const span = s - 30;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const mat = colors[(i + j) % 3];
        const tube = new THREE.Mesh(geo, mat);
        const x = -span / 2 + (i / (cols - 1)) * span;
        const z = -span / 2 + (j / (rows - 1)) * span;
        tube.position.set(x, y - 0.8, z);
        if ((i + j) % 5 === 0) tube.rotation.y = Math.PI / 2;
        this.scene.add(tube);
        if ((i * 3 + j) % 11 === 0) this.flickerPanels.push(tube);
      }
    }
  }

  _water() {
    this.water = createWater(CONFIG.arenaSize - 4);
    this.scene.add(this.water);
  }

  _setDressing() {
    // Half-sunken diner booth leftover from whatever just happened.
    const vinyl = new THREE.MeshStandardMaterial({ color: 0x6b1c24, roughness: 0.7 });
    const booth = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2.4), vinyl);
    const back = new THREE.Mesh(new THREE.BoxGeometry(4, 4.5, 0.4), vinyl);
    back.position.set(0, 2.2, -1.1);
    booth.add(seat, back);
    booth.position.set(-48, -0.2, 36);
    booth.rotation.y = 0.5;
    booth.rotation.z = 0.18;
    this.scene.add(booth);

    const chair = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.3 });
    const seat2 = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 8), metal);
    seat2.position.y = 10;
    const back2 = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 1.2), metal);
    back2.position.set(0, 16, -3.5);
    chair.add(seat2, back2);
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 10, 6), metal);
      leg.position.set(x, 5, z);
      chair.add(leg);
    }
    chair.position.set(70, 0, -80);
    chair.rotation.y = -0.6;
    this.scene.add(chair);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 18, 4),
      new THREE.MeshStandardMaterial({
        color: 0xff7a1a,
        emissive: 0x4a1800,
        emissiveIntensity: 0.4,
      }),
    );
    cone.position.set(-90, 9, -60);
    cone.rotation.z = 0.4;
    this.scene.add(cone);

    const shake = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4, 14, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffb6d9,
        transparent: true,
        opacity: 0.55,
        emissive: COLORS.magenta,
        emissiveIntensity: 0.25,
      }),
    );
    shake.position.set(90, 7, 70);
    this.scene.add(shake);
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 16, 8),
      new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.5 }),
    );
    straw.position.set(92, 16, 70);
    straw.rotation.z = -0.25;
    this.scene.add(straw);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 6),
      new THREE.MeshBasicMaterial({ map: exitSignTexture(THREE), transparent: true }),
    );
    sign.position.set(0, 22, -this.half + 2.2);
    this.scene.add(sign);

    const driveThru = new THREE.Mesh(
      new THREE.BoxGeometry(3, 8, 2),
      new THREE.MeshStandardMaterial({ color: 0x222028 }),
    );
    driveThru.position.set(-30, 4, -20);
    this.scene.add(driveThru);
    const speaker = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 2.2),
      new THREE.MeshBasicMaterial({ map: labelTexture(THREE, 'ORDER UP', '#4ef0ff', '#120814') }),
    );
    speaker.position.set(-28.3, 6, -20);
    speaker.rotation.y = Math.PI / 2;
    this.scene.add(speaker);

    // Distant columns to sell the scale.
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x2a2438,
      roughness: 0.7,
      emissive: 0x1a1030,
    });
    for (let i = 0; i < 10; i++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(3.2, CONFIG.wallHeight, 3.2), colMat);
      const a = (i / 10) * Math.PI * 2;
      col.position.set(Math.cos(a) * 140, CONFIG.wallHeight / 2, Math.sin(a) * 140);
      this.scene.add(col);
    }

    const floatingDoor = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 7, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x6d4c32 }),
    );
    floatingDoor.position.set(20, 14, 90);
    floatingDoor.rotation.y = 0.4;
    this.scene.add(floatingDoor);
    this.props.push(floatingDoor, shake, cone);
  }

  update(dt, time, playerPos) {
    this.water.material.uniforms.uTime.value = time;
    this.water.material.uniforms.uPlayer.value.copy(playerPos);
    this.playerLight.position.set(playerPos.x, 4.5, playerPos.z);
    this.accentA.intensity = 5 + Math.sin(time * 0.7) * 1.5;
    this.accentB.intensity = 5 + Math.cos(time * 0.9) * 1.5;
    for (const panel of this.flickerPanels) {
      const flicker = 0.4 + Math.abs(Math.sin(time * 17 + panel.position.x)) * 1.6;
      panel.material.emissiveIntensity = flicker;
    }
    for (const prop of this.props) {
      prop.rotation.y += dt * 0.05;
      prop.position.y += Math.sin(time + prop.position.x) * 0.01;
    }
  }

  clamp(pos) {
    const m = this.half - 6;
    pos.x = THREE.MathUtils.clamp(pos.x, -m, m);
    pos.z = THREE.MathUtils.clamp(pos.z, -m, m);
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
