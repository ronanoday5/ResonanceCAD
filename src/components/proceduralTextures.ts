import * as THREE from 'three';

/**
 * Creates high-fidelity procedural textures using HTML5 canvas
 * completely avoiding any external file / 404 dependencies.
 */

export function createWoodTexture(baseColorHex: string, roughnessVal = 0.6): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wood fiber bands and grain rings
  const grainCount = 180;
  ctx.save();
  for (let i = 0; i < grainCount; i++) {
    const y = Math.random() * 512;
    const thickness = 0.5 + Math.random() * 2.5;
    const alpha = 0.05 + Math.random() * 0.12;

    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(40, 20, 10, ' + alpha + ')' : 'rgba(255, 230, 200, ' + (alpha * 0.6) + ')';
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      150, y + (Math.random() - 0.5) * 20,
      350, y + (Math.random() - 0.5) * 25,
      512, y + (Math.random() - 0.5) * 15
    );
    ctx.stroke();
  }

  // Micro-pores and wood fiber noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6));
  }
  ctx.putImageData(imgData, 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createConeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark charcoal satin cone with concentric ridges
  ctx.fillStyle = '#1c1e22';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;
  const maxR = 240;

  for (let r = 20; r < maxR; r += 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = (r % 12 === 0) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createAcousticFoamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 256, 256);

  // Egg-crate / convoluted foam shading grid
  const cell = 32;
  for (let x = 0; x < 256; x += cell) {
    for (let y = 0; y < 256; y += cell) {
      const grad = ctx.createRadialGradient(x + cell / 2, y + cell / 2, 2, x + cell / 2, y + cell / 2, cell / 1.5);
      grad.addColorStop(0, 'rgba(80, 85, 95, 0.4)');
      grad.addColorStop(0.5, 'rgba(40, 44, 50, 0.2)');
      grad.addColorStop(1, 'rgba(10, 12, 15, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function createPCBTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Audiophile blue/green FR4 board
  ctx.fillStyle = '#0f2b1d';
  ctx.fillRect(0, 0, 256, 256);

  // Copper traces
  ctx.strokeStyle = '#c4823f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 40);
  ctx.lineTo(120, 40);
  ctx.lineTo(160, 80);
  ctx.lineTo(220, 80);
  ctx.moveTo(40, 180);
  ctx.lineTo(110, 180);
  ctx.lineTo(170, 120);
  ctx.lineTo(220, 120);
  ctx.stroke();

  // Solder pads
  ctx.fillStyle = '#dcdfe4';
  const pads = [[40, 40], [120, 40], [220, 80], [40, 180], [110, 180], [220, 120], [130, 130]];
  for (const [px, py] of pads) {
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f2b1d';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dcdfe4';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPolyureaTexture(baseColorHex = '#1a1d20'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = Math.random();
    let noise = 0;
    if (grain > 0.85) {
      noise = 45 + Math.random() * 55;
    } else if (grain < 0.2) {
      noise = -30 - Math.random() * 35;
    } else {
      noise = (Math.random() - 0.5) * 15;
    }

    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export function createFilamentTexture(materialType: string, baseColorHex = '#1e2025'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  const isCF = materialType === 'petg_cf' || materialType === 'pla_cf';

  // FDM Layer Line micro-grooves
  const layerStep = isCF ? 3 : 4;
  ctx.fillStyle = isCF ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.2)';
  for (let y = 0; y < 512; y += layerStep) {
    ctx.fillRect(0, y, 512, 1);
  }

  // Carbon fiber micro-flake speckling or satin sheen noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = Math.random();
    let noise = 0;

    if (isCF) {
      if (grain > 0.93) {
        noise = 55 + Math.random() * 45; // Reflective carbon fiber flake
      } else if (grain < 0.1) {
        noise = -20 - Math.random() * 20;
      } else {
        noise = (Math.random() - 0.5) * 8;
      }
    } else {
      if (grain > 0.96) {
        noise = 30 + Math.random() * 20;
      } else {
        noise = (Math.random() - 0.5) * 6;
      }
    }

    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}
