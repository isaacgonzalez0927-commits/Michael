import * as THREE from 'three';
import { COLORS } from '../config.js';

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.12,
    ...extra,
  });
}

export function createCarMesh() {
  const root = new THREE.Group();
  root.name = 'car';

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x2ec4b6,
    metalness: 0.62,
    roughness: 0.18,
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
  });
  const rust = mat(0x6a3a2a);
  const dark = mat(0x16141c, { roughness: 0.4 });
  const glass = mat(0x87d6ff, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 4.6), paint);
  body.position.y = 0.7;
  body.castShadow = true;
  root.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.7, 2.2), paint);
  cabin.position.set(0, 1.25, -0.2);
  root.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.08), glass);
  windshield.position.set(0, 1.28, 0.92);
  windshield.rotation.x = -0.25;
  root.add(windshield);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 4.62), mat(COLORS.magenta, { emissive: COLORS.magenta, emissiveIntensity: 0.35 }));
  stripe.position.y = 0.95;
  root.add(stripe);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.4), rust);
  bumper.position.set(0, 0.45, 2.35);
  root.add(bumper);

  for (const z of [1.45, -1.45]) {
    for (const x of [-1.15, 1.15]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12),
        dark,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      wheel.userData.spin = true;
      root.add(wheel);
    }
  }

  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.25, 10), dark);
  turretBase.position.set(0, 1.72, -0.4);
  root.add(turretBase);

  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.6), mat(0x33313c, { metalness: 0.6 }));
  barrel.position.set(0, 1.86, 0.4);
  barrel.name = 'barrel';
  root.add(barrel);

  const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), mat(0xfff1c2, { emissive: 0xffe9a8, emissiveIntensity: 1.4 }));
  lampL.position.set(-0.7, 0.72, 2.32);
  const lampR = lampL.clone();
  lampR.position.x = 0.7;
  root.add(lampL, lampR);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), mat(0x3a2030));
  seat.position.set(0.28, 1.02, -0.15);
  root.add(seat);

  return root;
}

export function createHorseMesh(maneColor = COLORS.magenta) {
  const root = new THREE.Group();
  const hide = mat(0x6b3b1f);
  const dark = mat(0x2a1810);
  const mane = mat(maneColor, { emissive: maneColor, emissiveIntensity: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.35), hide);
  body.position.y = 1.05;
  root.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.32), hide);
  neck.position.set(0, 1.45, 0.62);
  neck.rotation.x = -0.4;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.55), hide);
  head.position.set(0, 1.78, 0.95);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), dark);
  snout.position.set(0, 1.7, 1.22);
  root.add(snout);

  for (const x of [-0.08, 0.08]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), hide);
    ear.position.set(x, 1.98, 0.78);
    root.add(ear);
  }

  const maneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.8), mane);
  maneMesh.position.set(0, 1.42, 0.15);
  root.add(maneMesh);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), mane);
  tail.position.set(0, 1.05, -0.8);
  tail.rotation.x = 0.3;
  root.add(tail);

  root.userData.legs = [];
  for (const [x, z] of [[-0.18, 0.42], [0.18, 0.42], [-0.18, -0.42], [0.18, -0.42]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), dark);
    leg.position.set(x, 0.45, z);
    root.add(leg);
    root.userData.legs.push(leg);
  }

  const hungry = labelBillboard('HUNGRY');
  hungry.position.set(0, 2.35, 0);
  hungry.visible = false;
  hungry.name = 'hungrySign';
  root.add(hungry);

  return root;
}

function labelBillboard(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#120814';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#ff3dc8';
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = '#ff3dc8';
  ctx.font = 'bold 36px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const matl = new THREE.SpriteMaterial({ map, transparent: true });
  const sprite = new THREE.Sprite(matl);
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

export function createHorseCarMesh() {
  const root = new THREE.Group();
  const paint = mat(0xf3d36a, { metalness: 0.2 });
  const dark = mat(0x1a1814);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 6.4), paint);
  body.position.y = 0.75;
  root.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.8), paint);
  cabin.position.set(0, 1.3, 1.4);
  root.add(cabin);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.12, 0.1, 6.42),
    mat(COLORS.cyan, { emissive: COLORS.cyan, emissiveIntensity: 0.4 }),
  );
  stripe.position.y = 1.05;
  root.add(stripe);

  for (const z of [2.2, 0.2, -2.2]) {
    for (const x of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.38, z);
      root.add(wheel);
    }
  }

  // Horses packed in like a terrible carpool.
  for (let i = 0; i < 3; i++) {
    const horse = createHorseMesh(i % 2 ? COLORS.cyan : COLORS.magenta);
    horse.scale.setScalar(0.72);
    horse.position.set((i - 1) * 0.55, 0.55, -0.6 - i * 0.15);
    horse.rotation.y = Math.PI;
    root.add(horse);
  }

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 8), dark);
  turret.position.set(0, 1.85, 0.2);
  root.add(turret);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.3), dark);
  barrel.position.set(0, 2.05, 0.8);
  barrel.name = 'barrel';
  root.add(barrel);

  const hungry = labelBillboard('HUNGRY');
  hungry.position.set(0, 3.1, 0);
  hungry.visible = false;
  hungry.name = 'hungrySign';
  root.add(hungry);

  return root;
}

export function createUfoMesh(type) {
  const root = new THREE.Group();
  const isLaser = type === 'laser';
  const hull = mat(isLaser ? 0xcfd6de : 0x7ad7c7, { metalness: 0.78, roughness: 0.18 });
  const glowCol = isLaser ? COLORS.magenta : COLORS.cyan;
  const glow = mat(glowCol, { emissive: glowCol, emissiveIntensity: 1.8 });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.28, 24), hull);
  root.add(disc);
  const disc2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 0.4, 24), hull);
  disc2.position.y = -0.2;
  root.add(disc2);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(isLaser ? 0xff9ad8 : 0xaef7ff, { transparent: true, opacity: 0.55, emissive: glowCol, emissiveIntensity: 0.4 }),
  );
  dome.position.y = 0.15;
  root.add(dome);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glow);
    light.position.set(Math.cos(a) * 1.9, -0.05, Math.sin(a) * 1.9);
    root.add(light);
  }

  if (isLaser) {
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 12), glow);
    dish.position.y = -0.55;
    dish.rotation.x = Math.PI;
    root.add(dish);
  } else {
    const tank = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      mat(0x4ec4ff, { transparent: true, opacity: 0.45, emissive: COLORS.cyan, emissiveIntensity: 0.5 }),
    );
    tank.position.y = -0.55;
    root.add(tank);
  }

  return root;
}

export function createBucketMesh(labelMap) {
  const root = new THREE.Group();
  const red = mat(0x9c1c1c);
  const cream = mat(0xf2e4c9);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.7, 12, 1, true), red);
  bucket.position.y = 0.35;
  root.add(bucket);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.68, 12), cream);
  inner.position.y = 0.34;
  root.add(inner);

  const stripes = mat(0xf2e4c9);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36 - i * 0.02, 0.025, 6, 16), stripes);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18 + i * 0.18;
    root.add(ring);
  }

  if (labelMap) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.28),
      new THREE.MeshBasicMaterial({ map: labelMap }),
    );
    label.position.set(0, 0.38, 0.37);
    root.add(label);
  }

  for (let i = 0; i < 4; i++) {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), mat(0xe8c07a));
    bit.position.set((i - 1.5) * 0.1, 0.72, 0.02);
    bit.rotation.y = i * 0.4;
    root.add(bit);
  }

  return root;
}

export function createFoodMeal() {
  const group = new THREE.Group();

  const burger = new THREE.Group();
  burger.name = 'burger';
  const bun = mat(COLORS.bun);
  const patty = mat(0x4a2a12);
  burger.add(meshAt(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), bun, 0, 0.04, 0));
  burger.add(meshAt(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 16), patty, 0, 0.1, 0));
  burger.add(meshAt(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), mat(COLORS.lettuce), 0, 0.14, 0));
  burger.add(meshAt(new THREE.CylinderGeometry(0.21, 0.21, 0.1, 16), bun, 0, 0.2, 0));
  burger.position.set(-0.28, 0, 0);
  group.add(burger);

  const fries = new THREE.Group();
  fries.name = 'fries';
  const carton = mat(0xd13a2e);
  fries.add(meshAt(new THREE.BoxGeometry(0.22, 0.2, 0.14), carton, 0, 0.1, 0));
  for (let i = 0; i < 7; i++) {
    const fry = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), mat(0xffd15a));
    fry.position.set(-0.08 + i * 0.025, 0.26, (i % 3) * 0.02);
    fry.rotation.z = (i - 3) * 0.05;
    fries.add(fry);
  }
  fries.position.set(0.18, 0, 0.05);
  group.add(fries);

  const shake = new THREE.Group();
  shake.name = 'shake';
  const glass = mat(0xd7f4ff, { transparent: true, opacity: 0.35, roughness: 0.05 });
  shake.add(meshAt(new THREE.CylinderGeometry(0.09, 0.08, 0.32, 12), glass, 0, 0.16, 0));
  shake.add(meshAt(new THREE.CylinderGeometry(0.08, 0.075, 0.26, 12), mat(COLORS.shake, { emissive: COLORS.shake, emissiveIntensity: 0.15 }), 0, 0.14, 0));
  shake.add(meshAt(new THREE.SphereGeometry(0.09, 10, 10), mat(0xfff7f0), 0, 0.36, 0));
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), mat(COLORS.magenta));
  straw.position.set(0.03, 0.4, 0);
  straw.rotation.z = -0.2;
  shake.add(straw);
  shake.position.set(0.02, 0, -0.22);
  group.add(shake);

  return { group, burger, fries, shake };
}

function meshAt(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
