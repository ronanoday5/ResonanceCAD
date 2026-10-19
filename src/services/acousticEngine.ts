import type {
  AcousticCalculationResult,
  AcousticParameters,
  AlignmentType,
  DriverPreset,
  EnclosureDimensions,
  MaterialSpec,
  MaterialType,
} from '../types/loudspeaker.ts';
import { calculateCrossoverNetwork } from './crossoverEngine.ts';

export const MATERIAL_SPECS: Record<MaterialType, MaterialSpec> = {
  baltic_birch_18: {
    id: 'baltic_birch_18',
    name: '18mm Baltic Birch Plywood (13-ply)',
    nominalThicknessMm: 18,
    densityKgM3: 680,
    dampingFactor: 0.022,
    textureColor: '#d6b88d',
    roughness: 0.65,
  },
  baltic_birch_15: {
    id: 'baltic_birch_15',
    name: '15mm Baltic Birch Plywood (11-ply)',
    nominalThicknessMm: 15,
    densityKgM3: 680,
    dampingFactor: 0.02,
    textureColor: '#dfc49c',
    roughness: 0.65,
  },
  mdf_19: {
    id: 'mdf_19',
    name: '19mm Premium MDF (Medium-Density Fibreboard)',
    nominalThicknessMm: 19,
    densityKgM3: 750,
    dampingFactor: 0.035,
    textureColor: '#967958',
    roughness: 0.8,
  },
  mdf_25: {
    id: 'mdf_25',
    name: '25mm Heavy Duty MDF (1-inch)',
    nominalThicknessMm: 25,
    densityKgM3: 770,
    dampingFactor: 0.038,
    textureColor: '#8a6e4d',
    roughness: 0.82,
  },
  marine_ply_18: {
    id: 'marine_ply_18',
    name: '18mm Marine Grade Okoume Plywood',
    nominalThicknessMm: 18,
    densityKgM3: 500,
    dampingFactor: 0.025,
    textureColor: '#c59567',
    roughness: 0.6,
  },
  solid_hardwood_20: {
    id: 'solid_hardwood_20',
    name: '20mm Solid Black Walnut / Hard Maple',
    nominalThicknessMm: 20,
    densityKgM3: 720,
    dampingFactor: 0.015,
    textureColor: '#5c3a21',
    roughness: 0.55,
  },
};

export const DRIVER_PRESETS: DriverPreset[] = [
  // --- WOOFERS & SUBWOOFERS ---
  {
    id: 'dayton_rss265hf4',
    brand: 'Dayton Audio',
    model: 'RSS265HF-4 10" Reference Subwoofer',
    nominalDiameterInch: 10,
    fs: 24.3,
    qts: 0.39,
    qes: 0.43,
    qms: 4.41,
    vas: 62.4,
    xmax: 14.3,
    pe: 350,
    sd: 353,
    voiceCoilDiameterMm: 65,
    frameOuterDiameterMm: 266,
    cutoutDiameterMm: 235,
    mountingDepthMm: 124,
    magnetDiameterMm: 156,
    magnetDepthMm: 45,
    displacementLiters: 2.2,
    splSensitivityDb: 87.2,
    reOhm: 3.3,
    leMh: 0.95,
    description: 'Ultra-low distortion 10" subwoofer driver with heavy cast aluminum basket and thick anodized black aluminum cone.',
  },
  {
    id: 'scanspeak_18w8531',
    brand: 'Scan-Speak',
    model: 'Revelator 18W/8531G00 7" Mid-Woofer',
    nominalDiameterInch: 7,
    fs: 28.0,
    qts: 0.36,
    qes: 0.39,
    qms: 5.2,
    vas: 58.0,
    xmax: 6.5,
    pe: 70,
    sd: 150,
    voiceCoilDiameterMm: 38,
    frameOuterDiameterMm: 182,
    cutoutDiameterMm: 158,
    mountingDepthMm: 82,
    magnetDiameterMm: 110,
    magnetDepthMm: 32,
    displacementLiters: 0.75,
    splSensitivityDb: 88.0,
    reOhm: 5.8,
    leMh: 0.35,
    description: 'Legendary audiophile sliced paper cone woofer with SD-1 patented magnetic motor and low-loss linear suspension.',
  },
  {
    id: 'sb_acoustics_17nbac',
    brand: 'SB Acoustics',
    model: 'SB17NBAC35-8 6.5" Anodized Aluminum',
    nominalDiameterInch: 6.5,
    fs: 31.5,
    qts: 0.34,
    qes: 0.37,
    qms: 4.3,
    vas: 37.0,
    xmax: 5.5,
    pe: 60,
    sd: 118,
    voiceCoilDiameterMm: 35.5,
    frameOuterDiameterMm: 171,
    cutoutDiameterMm: 145,
    mountingDepthMm: 78,
    magnetDiameterMm: 100,
    magnetDepthMm: 30,
    displacementLiters: 0.6,
    splSensitivityDb: 87.5,
    reOhm: 5.9,
    leMh: 0.18,
    description: 'Precision black anodized aluminum cone woofer with aerodynamically optimized cast aluminum chassis.',
  },
  {
    id: 'purifi_ptt65',
    brand: 'PURIFI',
    model: 'PTT6.5X04-NFA-01 6.5" Ultra-Low THD',
    nominalDiameterInch: 6.5,
    fs: 31.0,
    qts: 0.28,
    qes: 0.30,
    qms: 4.5,
    vas: 27.5,
    xmax: 9.8,
    pe: 250,
    sd: 133,
    voiceCoilDiameterMm: 39,
    frameOuterDiameterMm: 176,
    cutoutDiameterMm: 147,
    mountingDepthMm: 95,
    magnetDiameterMm: 115,
    magnetDepthMm: 38,
    displacementLiters: 0.9,
    splSensitivityDb: 89.0,
    reOhm: 3.7,
    leMh: 0.12,
    description: 'Revolutionary NeutralSurround geometry eliminating force modulation distortion with massive linear stroke.',
  },

  // --- TWEETERS ---
  {
    id: 'scanspeak_d3004',
    brand: 'Scan-Speak',
    model: 'Illuminator D3004/662000 1" Beryllium Dome',
    nominalDiameterInch: 1.2,
    fs: 500,
    qts: 0.45,
    qes: 0.48,
    qms: 3.5,
    vas: 0.02,
    xmax: 0.4,
    pe: 90,
    sd: 7.0,
    voiceCoilDiameterMm: 26,
    frameOuterDiameterMm: 104,
    cutoutDiameterMm: 76,
    mountingDepthMm: 42,
    magnetDiameterMm: 68,
    magnetDepthMm: 22,
    displacementLiters: 0.05,
    splSensitivityDb: 91.5,
    reOhm: 3.2,
    leMh: 0.01,
    description: 'State-of-the-art Beryllium dome tweeter with AirCirc 6-neodymium magnet matrix for maximum transparency.',
  },
  {
    id: 'peerless_xt25bg',
    brand: 'Peerless by Tymphany',
    model: 'XT25BG60-04 1" Dual Ring Radiator',
    nominalDiameterInch: 1,
    fs: 440,
    qts: 0.52,
    qes: 0.55,
    qms: 2.8,
    vas: 0.01,
    xmax: 0.5,
    pe: 100,
    sd: 8.0,
    voiceCoilDiameterMm: 25,
    frameOuterDiameterMm: 104,
    cutoutDiameterMm: 75,
    mountingDepthMm: 48,
    magnetDiameterMm: 72,
    magnetDepthMm: 25,
    displacementLiters: 0.06,
    splSensitivityDb: 91.0,
    reOhm: 3.0,
    leMh: 0.01,
    description: 'Patented Dual Ring Radiator diaphragm with rear acoustic damping chamber for extended frequency response above 40kHz.',
  },

  // --- MIDRANGE DRIVERS ---
  {
    id: 'scanspeak_12mu',
    brand: 'Scan-Speak',
    model: 'Illuminator 12MU/8731T00 4.5" Midrange',
    nominalDiameterInch: 4.5,
    fs: 62.0,
    qts: 0.33,
    qes: 0.35,
    qms: 5.8,
    vas: 6.5,
    xmax: 3.0,
    pe: 80,
    sd: 55,
    voiceCoilDiameterMm: 30,
    frameOuterDiameterMm: 125,
    cutoutDiameterMm: 106,
    mountingDepthMm: 52,
    magnetDiameterMm: 80,
    magnetDepthMm: 25,
    displacementLiters: 0.25,
    splSensitivityDb: 87.0,
    reOhm: 5.7,
    leMh: 0.10,
    description: 'Neodymium motor 4.5-inch midrange transducer with open aerodynamic chassis for zero reflection back-waves.',
  },
];

export function calculateOptimalAlignment(driver: DriverPreset, alignment: AlignmentType) {
  const { fs, qts, vas } = driver;

  if (alignment === 'sealed') {
    const targetQtc = 0.707;
    const ratio = targetQtc / qts;
    const vRatio = Math.max(0.1, ratio * ratio - 1);
    const optimalVb = vas / vRatio;
    const fc = fs * ratio;
    const f3 = fc * Math.sqrt(Math.max(0, (1 / (targetQtc * targetQtc) - 2 + Math.sqrt(Math.pow(1 / (targetQtc * targetQtc) - 2, 2) + 4)) / 2));
    return {
      optimalVbLiters: Math.max(2, optimalVb),
      optimalFbHz: fc,
      f3Hz: f3,
      targetQtc,
    };
  } else if (alignment === 'ported') {
    const optimalVb = 15 * vas * Math.pow(qts, 2.87);
    const optimalFb = 0.42 * fs * Math.pow(qts, -0.9);
    const f3 = 0.26 * fs * Math.pow(qts, -1.4);
    return {
      optimalVbLiters: Math.max(4, optimalVb),
      optimalFbHz: Math.round(optimalFb * 10) / 10,
      f3Hz: Math.round(f3 * 10) / 10,
      targetQtc: 0.707,
    };
  } else {
    const s = 0.7;
    const vf = 2 * s * Math.pow(qts, 2) * vas;
    const vr = vas / (Math.pow(2 * s, 2) - 1);
    const fb = fs * (2 * s * qts) / (2 * s);
    const f3 = fb * 0.75;
    return {
      optimalVbLiters: Math.max(5, vf + vr),
      optimalFbHz: Math.round(fb * 10) / 10,
      f3Hz: Math.round(f3 * 10) / 10,
      targetQtc: 0.707,
    };
  }
}

export function calculateAcoustics(
  dimensions: EnclosureDimensions,
  acousticParams: AcousticParameters
): AcousticCalculationResult {
  const { topology, driverAssignments, alignment, targetQtc, targetFb, portType, portDiameterMm, slotWidthMm, slotHeightMm, numberOfPorts, dampingFillPercent, bracingLevel } = acousticParams;
  const material = MATERIAL_SPECS[dimensions.material];

  const wallT = material.nominalThicknessMm;
  const baffleT = dimensions.baffleThicknessMm || wallT;

  // Internal dimensions (mm)
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - (baffleT + wallT));

  const grossVolumeLiters = (intW * intH * intD) / 1000000;

  // Total woofer volume displacement (handling MTM dual woofers)
  const wooferAssign = driverAssignments.woofer;
  const wooferQuantity = topology === 'mtm' ? 2 : (wooferAssign.quantity || 1);
  const wooferSingle = wooferAssign.driver;
  const driverDisplacementLiters = (wooferSingle.displacementLiters || 1.5) * wooferQuantity;

  // Midrange isolated sealed rear sub-chamber volume
  let midrangeChamberVolumeLiters = 0;
  if (topology === 'three_way') {
    const midDrv = driverAssignments.midrange.driver;
    midrangeChamberVolumeLiters = Math.max(1.2, (midDrv.vas || 6.5) * 0.25);
  }

  // Bracing displacement
  let bracingMultiplier = 0.04;
  if (bracingLevel === 'standard') bracingMultiplier = 0.08;
  if (bracingLevel === 'heavy') bracingMultiplier = 0.14;
  const bracingDisplacementLiters = grossVolumeLiters * bracingMultiplier;

  // Damping virtual volume bonus
  const dampingVirtualFactor = 1 + (dampingFillPercent / 100) * 0.12;

  // Port calculations
  let portAreaCm2 = 0;
  if (portType === 'round') {
    const radiusCm = (portDiameterMm / 10) / 2;
    portAreaCm2 = Math.PI * radiusCm * radiusCm * numberOfPorts;
  } else {
    portAreaCm2 = ((slotWidthMm / 10) * (slotHeightMm / 10)) * numberOfPorts;
  }

  let activeFb = targetFb;
  if (alignment === 'sealed') {
    activeFb = wooferSingle.fs * (targetQtc / wooferSingle.qts);
  }

  let estNetVb = grossVolumeLiters - driverDisplacementLiters - bracingDisplacementLiters - midrangeChamberVolumeLiters;
  if (estNetVb <= 1) estNetVb = 1;

  let portLengthMm = 0;
  let portDisplacementLiters = 0;

  if (alignment !== 'sealed' && portAreaCm2 > 0 && activeFb > 10) {
    const effectiveDvCm = Math.sqrt((portAreaCm2 / numberOfPorts) * 4 / Math.PI);
    const kEndCorrection = 0.732;
    const effectiveApPerPort = portAreaCm2 / numberOfPorts;

    let currentVb = estNetVb;
    for (let iter = 0; iter < 3; iter++) {
      const lvCm = (23562.5 * effectiveApPerPort / (activeFb * activeFb * currentVb)) - (kEndCorrection * effectiveDvCm);
      const computedLengthCm = Math.max(4, lvCm);
      const outerRadiusCm = (effectiveDvCm / 2) + (portType === 'round' ? 0.3 : 1.8);
      const outerApCm2 = Math.PI * outerRadiusCm * outerRadiusCm;
      portDisplacementLiters = ((outerApCm2 * computedLengthCm * numberOfPorts) / 1000);
      currentVb = Math.max(1, estNetVb - portDisplacementLiters);
      portLengthMm = Math.round(computedLengthCm * 10);
    }
  }

  const netVolumeLiters = Math.max(1, estNetVb - portDisplacementLiters);
  const effectiveAcousticVolumeLiters = netVolumeLiters * dampingVirtualFactor;

  // Cutoff frequencies
  let calculatedQtc = wooferSingle.qts;
  let f3CutoffHz = 40;
  let f6CutoffHz = 32;
  let f10CutoffHz = 24;

  if (alignment === 'sealed') {
    const alpha = (wooferSingle.vas * wooferQuantity) / effectiveAcousticVolumeLiters;
    calculatedQtc = wooferSingle.qts * Math.sqrt(1 + alpha);
    const fc = wooferSingle.fs * Math.sqrt(1 + alpha);
    const qTerm = 1 / (calculatedQtc * calculatedQtc) - 2;
    f3CutoffHz = fc * Math.sqrt(Math.max(0, (qTerm + Math.sqrt(qTerm * qTerm + 4)) / 2));
    f6CutoffHz = f3CutoffHz * 0.78;
    f10CutoffHz = f3CutoffHz * 0.58;
  } else if (alignment === 'ported') {
    const vRatio = effectiveAcousticVolumeLiters / (wooferSingle.vas * wooferQuantity);
    f3CutoffHz = Math.max(15, activeFb * Math.pow(vRatio, -0.32));
    f6CutoffHz = f3CutoffHz * 0.82;
    f10CutoffHz = f3CutoffHz * 0.65;
  } else {
    f3CutoffHz = activeFb * 0.72;
    f6CutoffHz = f3CutoffHz * 0.85;
    f10CutoffHz = f3CutoffHz * 0.68;
  }

  // Richard Small air velocity formula (factoring dual woofers if MTM)
  const totalSdM2 = (wooferSingle.sd * wooferQuantity) * 1e-4;
  const xmaxM = wooferSingle.xmax * 1e-3;
  const vdM3 = totalSdM2 * xmaxM;
  const portAreaM2 = portAreaCm2 * 1e-4;

  let portAirVelocityMs = 0;
  if (portAreaM2 > 0 && activeFb > 0) {
    portAirVelocityMs = (2 * Math.PI * activeFb * vdM3) / portAreaM2;
  }

  const vdLiters = (totalSdM2 * 1e4 * wooferSingle.xmax) / 10000;
  const recommendedMinimumPortDiameterMm = Math.round(0.83 * Math.sqrt(vdLiters * activeFb) * 25.4 * 10) / 10;
  const isChuffingRisk = portAirVelocityMs > 17;

  const maxInternalDimM = Math.max(intW, intH, intD) / 1000;
  const firstInternalResonanceHz = Math.round(343 / (2 * maxInternalDimM));

  // Crossover Network Calculation
  const crossover = calculateCrossoverNetwork(acousticParams);

  // Total weight estimate
  const extVolumeM3 = (dimensions.externalWidthMm * dimensions.externalHeightMm * dimensions.externalDepthMm) * 1e-9;
  const intVolumeM3 = (intW * intH * intD) * 1e-9;
  const solidWoodVolumeM3 = Math.max(0, extVolumeM3 - intVolumeM3);
  const woodWeightKg = solidWoodVolumeM3 * material.densityKgM3;
  const driverWeightKg = (wooferSingle.magnetDiameterMm * wooferSingle.magnetDepthMm * 0.0000078) * wooferQuantity + 1.2;
  const bracingWeightKg = bracingDisplacementLiters * 1e-3 * material.densityKgM3;
  const totalWeightKg = Math.round((woodWeightKg + driverWeightKg + bracingWeightKg + 1.8) * 10) / 10;

  // Multi-band frequency response curves
  const freqResponse = generateMultiBandFrequencyCurve(alignment, acousticParams, effectiveAcousticVolumeLiters, activeFb, calculatedQtc);

  return {
    netVolumeLiters: Math.round(netVolumeLiters * 10) / 10,
    grossInternalVolumeLiters: Math.round(grossVolumeLiters * 10) / 10,
    driverDisplacementLiters: Math.round(driverDisplacementLiters * 10) / 10,
    bracingDisplacementLiters: Math.round(bracingDisplacementLiters * 10) / 10,
    portDisplacementLiters: Math.round(portDisplacementLiters * 10) / 10,
    midrangeChamberVolumeLiters: Math.round(midrangeChamberVolumeLiters * 10) / 10,
    effectiveAcousticVolumeLiters: Math.round(effectiveAcousticVolumeLiters * 10) / 10,
    boxQtc: Math.round(calculatedQtc * 1000) / 1000,
    tuningFrequencyFb: Math.round(activeFb * 10) / 10,
    f3CutoffHz: Math.round(f3CutoffHz * 10) / 10,
    f6CutoffHz: Math.round(f6CutoffHz * 10) / 10,
    f10CutoffHz: Math.round(f10CutoffHz * 10) / 10,
    portLengthMm: Math.round(portLengthMm),
    portAirVelocityMs: Math.round(portAirVelocityMs * 10) / 10,
    isChuffingRisk,
    recommendedMinimumPortDiameterMm: Math.max(35, recommendedMinimumPortDiameterMm),
    totalWeightKg,
    firstInternalResonanceHz,
    crossover,
    frequencyResponse: freqResponse,
  };
}

/**
 * Generates multi-passband SPL curves (Woofer, Midrange, Tweeter, and Total acoustic sum)
 */
function generateMultiBandFrequencyCurve(
  alignment: AlignmentType,
  acoustics: AcousticParameters,
  vbLiters: number,
  fb: number,
  qtc: number
) {
  const points: {
    freq: number;
    dbTotal: number;
    dbWoofer: number;
    dbMidrange?: number;
    dbTweeter: number;
    excursionMm: number;
  }[] = [];

  const { topology, driverAssignments, crossoverLowHz, crossoverHighHz, lowPassOrder, highPassOrder } = acoustics;
  const woofer = driverAssignments.woofer.driver;
  const tweeter = driverAssignments.tweeter.driver;

  const startF = 10;
  const endF = 20000;
  const count = 100;

  const fcLow = crossoverLowHz || 2500;
  const fcHigh = topology === 'three_way' ? (crossoverHighHz || 3500) : fcLow;

  for (let i = 0; i < count; i++) {
    const f = startF * Math.pow(endF / startF, i / (count - 1));

    // 1. Raw Woofer Acoustic Box Transfer Function
    let dbAcousticWoofer = 0;
    if (alignment === 'sealed') {
      const fc = woofer.fs * Math.sqrt(1 + woofer.vas / vbLiters);
      const w = 2 * Math.PI * f;
      const wc = 2 * Math.PI * fc;
      const denomReal = wc * wc - w * w;
      const denomImag = (wc / qtc) * w;
      const mag2 = (w * w * w * w) / (denomReal * denomReal + denomImag * denomImag);
      dbAcousticWoofer = 10 * Math.log10(Math.max(1e-6, mag2));
    } else {
      const fn = f / fb;
      const h = fb / woofer.fs;
      const alpha = woofer.vas / vbLiters;
      const num = Math.pow(fn, 4);
      const den = Math.sqrt(Math.pow(Math.pow(fn, 4) - fn * fn * (1 + h * h + alpha) + h * h, 2) + Math.pow(fn * (h * h - fn * fn) / woofer.qts, 2) + 0.001);
      dbAcousticWoofer = 20 * Math.log10(Math.max(1e-4, num / den));
    }

    // 2. Woofer Low-Pass Electrical Crossover Filter Response
    const fNLow = f / fcLow;
    const dbFilterWoofer = -10 * Math.log10(1 + Math.pow(fNLow, 2 * lowPassOrder));
    const dbWoofer = dbAcousticWoofer + dbFilterWoofer;

    // 3. Tweeter High-Pass Filter Response
    const fNHigh = f / fcHigh;
    const dbFilterTweeter = -10 * Math.log10(1 + Math.pow(1 / fNHigh, 2 * highPassOrder));
    const dbTweeter = (tweeter.splSensitivityDb - woofer.splSensitivityDb) + dbFilterTweeter - driverAssignments.tweeter.attenuationDb;

    // 4. Midrange Band-Pass Filter (if 3-Way)
    let dbMidrange = undefined;
    if (topology === 'three_way') {
      const dbMidHP = -10 * Math.log10(1 + Math.pow(fcLow / f, 4));
      const dbMidLP = -10 * Math.log10(1 + Math.pow(f / fcHigh, 4));
      dbMidrange = dbMidHP + dbMidLP - driverAssignments.midrange.attenuationDb;
    }

    // 5. Total Acoustic Summation (Power Sum)
    const pWoofer = Math.pow(10, dbWoofer / 10);
    const pTweeter = Math.pow(10, dbTweeter / 10);
    const pMid = dbMidrange !== undefined ? Math.pow(10, dbMidrange / 10) : 0;
    const dbTotal = 10 * Math.log10(pWoofer + pTweeter + pMid);

    // Cone excursion calculation
    const fDriverN = f / woofer.fs;
    const dipFactor = Math.abs((f / fb) - 1) / (Math.abs((f / fb) - 1) + 0.35);
    const excursion = woofer.xmax * (0.2 + 0.8 * dipFactor) * Math.min(2.0, 1 / (0.1 + fDriverN * fDriverN));

    points.push({
      freq: Math.round(f * 10) / 10,
      dbTotal: Math.round(dbTotal * 10) / 10,
      dbWoofer: Math.round(dbWoofer * 10) / 10,
      dbMidrange: dbMidrange !== undefined ? Math.round(dbMidrange * 10) / 10 : undefined,
      dbTweeter: Math.round(dbTweeter * 10) / 10,
      excursionMm: Math.round(Math.min(woofer.xmax * 2.2, excursion) * 10) / 10,
    });
  }

  return points;
}
