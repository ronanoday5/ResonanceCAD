import * as THREE from 'three';

/**
 * In-memory procedural texture cache to prevent re-generating 512x512 HTML5 Canvases
 * on every parametric slider update and prevent WebGL texture memory leaks.
 */
const TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>();
const MAX_CACHE_ENTRIES = 64;

function getCachedTexture(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  const existing = TEXTURE_CACHE.get(key);
  if (existing) return existing;

  if (TEXTURE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = TEXTURE_CACHE.keys().next().value;
    if (oldestKey) {
      const oldTex = TEXTURE_CACHE.get(oldestKey);
      oldTex?.dispose();
      TEXTURE_CACHE.delete(oldestKey);
    }
  }

  const created = generator();
  TEXTURE_CACHE.set(key, created);
  return created;
}

/**
 * Creates high-fidelity procedural textures using HTML5 canvas
 * completely avoiding any external file / 404 dependencies.
 */

export function createWoodTexture(baseColorHex: string, roughnessVal = 0.6): THREE.CanvasTexture {
  return getCachedTexture(`wood:${baseColorHex}:${roughnessVal}`, () => {
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
  });
}

export function createConeTexture(): THREE.CanvasTexture {
  return getCachedTexture('cone:default', () => {
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
  });
}

export function createAcousticFoamTexture(): THREE.CanvasTexture {
  return getCachedTexture('foam:default', () => {
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
  });
}

export function createPCBTexture(): THREE.CanvasTexture {
  return getCachedTexture('pcb:default', () => {
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
  });
}

export function createPolyureaTexture(baseColorHex = '#1a1d20'): THREE.CanvasTexture {
  return getCachedTexture(`polyurea:${baseColorHex}`, () => {
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
  });
}

export function createFilamentTexture(materialType: string, baseColorHex = '#1e2025'): THREE.CanvasTexture {
  return getCachedTexture(`filament:${materialType}:${baseColorHex}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  const isCF =
    materialType === 'petg_cf' ||
    materialType === 'pla_cf' ||
    materialType === 'carbon_fiber_12' ||
    materialType === 'carbon_fiber_18';

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
  });
}

export interface VibrationCutoutDef {
  centerX: number; // in normalized coords [0, 1]
  centerY: number; // in normalized coords [0, 1]
  radius: number;  // in normalized coords [0, 1]
}

/**
 * Procedural FEA Vibration Stress Heat-Map Texture
 * Generates an engineering color gradient (Jet/Turbo thermal scale) with isostress
 * contour lines and cutout rim stress concentrations modulated by material bending stiffness D.
 */
export function createVibrationStressTexture(
  stiffnessD: number,
  type: 'baffle' | 'panel' = 'panel',
  cutouts: VibrationCutoutDef[] = []
): THREE.CanvasTexture {
  const cutoutSig = cutouts
    .map((c) => `${c.centerX.toFixed(2)},${c.centerY.toFixed(2)},${c.radius.toFixed(2)}`)
    .join(';');
  const cacheKey = `vib:${Math.round(stiffnessD)}:${type}:${cutoutSig}`;

  return getCachedTexture(cacheKey, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

  // Modulate stress intensity inversely with bending stiffness D
  // Reference D: 4500 N*m (nominal baseline).
  // Low D (<2500 N*m) -> high deflection/strain -> peaks into red/orange spectrum
  // High D (>6000 N*m) -> rigid boundary -> stays within cool blue/cyan/emerald range
  const refD = 4500;
  const stiffnessScale = Math.min(2.4, Math.max(0.45, Math.pow(refD / Math.max(200, stiffnessD), 0.55)));

  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // FEA Jet/Turbo thermal scale color interpolation
  const getColor = (t: number): [number, number, number] => {
    let r = 0, g = 0, b = 0;
    if (t < 0.25) {
      const f = t / 0.25;
      r = Math.round(10 + f * (0 - 10));
      g = Math.round(30 + f * (180 - 30));
      b = Math.round(130 + f * (220 - 130));
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      r = Math.round(0 + f * 16);
      g = Math.round(180 + f * (210 - 180));
      b = Math.round(220 + f * (50 - 220));
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      r = Math.round(16 + f * (255 - 16));
      g = Math.round(210 + f * (175 - 210));
      b = Math.round(50 + f * (0 - 50));
    } else {
      const f = (t - 0.75) / 0.25;
      r = Math.round(255 + f * (225 - 255));
      g = Math.round(175 + f * (20 - 175));
      b = Math.round(0 + f * (30 - 0));
    }
    return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
  };

  for (let py = 0; py < 512; py++) {
    const v = py / 512;
    for (let px = 0; px < 512; px++) {
      const u = px / 512;

      // Clamped boundary condition: restrained edges at panel perimeter joints
      const edgeU = Math.sin(u * Math.PI);
      const edgeV = Math.sin(v * Math.PI);
      const fundamentalMode = edgeU * edgeV;

      // Secondary flexural plate harmonics
      const harmonic = 0.2 * Math.sin(3 * u * Math.PI) * edgeV + 0.15 * edgeU * Math.sin(3 * v * Math.PI);
      let rawStress = (fundamentalMode + harmonic) * 0.75;

      // Check cutout proximity for localized stress concentrations
      if (cutouts.length > 0) {
        for (const c of cutouts) {
          const dx = u - c.centerX;
          const dy = v - c.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < c.radius) {
            // Cutout through-hole: zero stress void
            rawStress = 0.0;
          } else {
            // Cutout rim stress concentration (stress risers around boundary)
            const rimDist = dist - c.radius;
            if (rimDist < 0.12) {
              const concentration = Math.exp(-rimDist / 0.032) * 0.7;
              rawStress = Math.max(rawStress, concentration + 0.35);
            }
          }
        }
      }

      // Scale by material bending stiffness D
      const scaledStress = Math.min(1.0, Math.max(0.0, rawStress * stiffnessScale));

      // FEA isostress contour lines (every 0.1 normalized stress)
      const contourMod = Math.abs((scaledStress * 10) % 1.0 - 0.5);
      const isContour = contourMod < 0.045 && scaledStress > 0.08 && scaledStress < 0.95;

      const idx = (py * 512 + px) * 4;
      const [cr, cg, cb] = getColor(scaledStress);

      if (isContour) {
        // High-contrast FEA isostress line
        data[idx] = Math.round(cr * 0.35);
        data[idx + 1] = Math.round(cg * 0.35);
        data[idx + 2] = Math.round(cb * 0.35);
        data[idx + 3] = 255;
      } else {
        data[idx] = cr;
        data[idx + 1] = cg;
        data[idx + 2] = cb;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Overlay fine FEA quadrilateral mesh wireframe lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridStep = 32;
  for (let x = 0; x <= 512; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}
