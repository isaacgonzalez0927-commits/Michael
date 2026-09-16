/**
 * Canvas-generated textures so the game ships with zero image assets.
 */
export function makeCanvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = canvas;
  return tex;
}

function threeTexture(canvas, THREE, repeatX = 1, repeatY = 1) {
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

export function dinerFloorTexture(THREE) {
  const canvas = makeCanvasTexture((ctx, s) => {
    const tile = s / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#d9c7a2' : '#2a2118';
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
  }, 256);
  return threeTexture(canvas, THREE, 18, 18);
}

export function tileFloorTexture(THREE) {
  const canvas = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#12101c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#2a3350';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, s - 12, s - 12);
    ctx.strokeStyle = '#3cf0ff22';
    ctx.strokeRect(20, 20, s - 40, s - 40);
    ctx.fillStyle = '#ff3dc812';
    ctx.fillRect(40, 40, 40, 40);
  }, 256);
  return threeTexture(canvas, THREE, 40, 40);
}

export function wallTexture(THREE) {
  const canvas = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#c8c3b4';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#b7b1a2';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * s, Math.random() * s, 8, 18);
    }
    ctx.fillStyle = '#8aa08a33';
    ctx.fillRect(0, s * 0.7, s, s * 0.3);
  }, 256);
  return threeTexture(canvas, THREE, 8, 3);
}

export function arenaWallTexture(THREE) {
  const canvas = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#1b1528';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#2a1f3c';
    for (let y = 0; y < s; y += 32) {
      ctx.fillRect(0, y, s, 2);
    }
    ctx.fillStyle = '#4ef0ff18';
    ctx.fillRect(0, 40, s, 12);
    ctx.fillStyle = '#ff3dc818';
    ctx.fillRect(0, 180, s, 8);
  }, 256);
  return threeTexture(canvas, THREE, 12, 3);
}

export function labelTexture(THREE, text, fg = '#fff4c4', bg = '#8b1d1d') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#f2ead2';
  ctx.fillRect(8, 8, 240, 112);
  ctx.fillStyle = bg;
  ctx.fillRect(16, 16, 224, 96);
  ctx.fillStyle = fg;
  ctx.font = 'bold 28px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function exitSignTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07220f';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#3dff8a';
  ctx.font = 'bold 52px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT?', 128, 50);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
