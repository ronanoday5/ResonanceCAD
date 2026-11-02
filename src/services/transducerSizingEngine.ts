import {
  calculateOptimalAlignment,
  DRIVER_PRESETS,
  MATERIAL_SPECS,
} from './acousticEngine.ts';
import type {
  AcousticParameters,
  AlignmentType,
  DriverPreset,
  EnclosureDimensions,
  MaterialType,
  SpeakerCategory,
  SystemTopology,
} from '../types/loudspeaker.ts';

export type CabinetProportionRatio =
  | 'golden_ratio' // 1.0 : 1.62 : 2.62 (Classic high fidelity)
  | 'optimal_standing_wave' // 1.0 : 1.25 : 1.60 (IEC Low internal standing wave modes)
  | 'narrow_baffle' // 1.0 : 1.75 : 1.15 (Diffraction-reduced modern console monitor)
  | 'compact_cube'; // 1.0 : 1.15 : 1.15 (Subwoofers / compact stage rigs)

export interface TransducerSizingInput {
  topology: SystemTopology; // 'single' | 'two_way' | 'three_way'
  category: SpeakerCategory;
  alignment: AlignmentType; // 'sealed' | 'ported'
  proportionRatio: CabinetProportionRatio;
  material: MaterialType;

  // Driver selections or custom specs
  woofer: DriverPreset;
  wooferQuantity: 1 | 2;
  tweeter?: DriverPreset;
  midrange?: DriverPreset;

  targetQtc?: number; // for sealed (default 0.707)
  includeIsolatedMidChamber?: boolean;
  midChamberVolumeLiters?: number; // e.g. 3.5L
}

export interface TransducerSizingResult {
  recommendedAlignment: AlignmentType;
  ebp: number; // Efficiency Bandwidth Product = Fs / Qes
  ebpCategory: 'sealed_preferred' | 'flexible' | 'ported_preferred';
  ebpDescription: string;

  netVolumeLiters: number; // Vb
  grossVolumeLiters: number; // Vgross including displacements
  driverDisplacementLiters: number;
  bracingDisplacementLiters: number;
  portDisplacementLiters: number;
  midrangeChamberDisplacementLiters: number;

  tuningFrequencyFbHz: number;
  f3CutoffHz: number;
  f6CutoffHz: number;
  targetQtc: number;

  dimensions: EnclosureDimensions;
  internalDimensionsMm: { w: number; h: number; d: number };
  baffleMinimumWidthMm: number;
  cabinetMinimumHeightMm: number;
  cabinetMinimumDepthMm: number;

  acousticParameters: AcousticParameters;
  ratioDescription: string;
}

/**
 * Calculates optimal cabinet volume and dimensional proportions from transducers
 */
export function calculateTransducerSizing(
  input: TransducerSizingInput
): TransducerSizingResult {
  const {
    topology,
    category,
    alignment,
    proportionRatio,
    material,
    woofer,
    wooferQuantity = 1,
    tweeter = DRIVER_PRESETS[4], // scan-speak d3004 default
    midrange = DRIVER_PRESETS[6], // scan-speak 12mu default
    targetQtc = 0.707,
    includeIsolatedMidChamber = topology === 'three_way',
    midChamberVolumeLiters = 4.0,
  } = input;

  const matSpec = MATERIAL_SPECS[material] || MATERIAL_SPECS.baltic_birch_18;
  const wallThicknessMm = matSpec.nominalThicknessMm || 18;
  const baffleThicknessMm = Math.max(wallThicknessMm, 18);

  // 1. Efficiency Bandwidth Product (EBP = Fs / Qes)
  const qes = woofer.qes || (woofer.qts * 1.15);
  const ebp = Math.round((woofer.fs / Math.max(0.05, qes)) * 10) / 10;

  let ebpCategory: 'sealed_preferred' | 'flexible' | 'ported_preferred' = 'flexible';
  let ebpDescription = '';
  let recommendedAlignment: AlignmentType = alignment;

  if (ebp < 50) {
    ebpCategory = 'sealed_preferred';
    ebpDescription = `EBP = ${ebp} (< 50): Strong mechanical damping makes this transducer ideal for Acoustic Suspension (Sealed). High transient fidelity, Qtc = ${targetQtc}.`;
    recommendedAlignment = 'sealed';
  } else if (ebp <= 90) {
    ebpCategory = 'flexible';
    ebpDescription = `EBP = ${ebp} (50–90): Versatile electroacoustic damping. Compatible with both precision sealed boxes and extended bass reflex enclosures.`;
    recommendedAlignment = alignment;
  } else {
    ebpCategory = 'ported_preferred';
    ebpDescription = `EBP = ${ebp} (> 90): High motor force (Bl²/Re) optimized for Vented Bass Reflex loading with high acoustic efficiency and low distortion at Fb.`;
    recommendedAlignment = 'ported';
  }

  // 2. Net Enclosure Volume (Vb) calculation
  const opt = calculateOptimalAlignment(woofer, alignment);
  const singleNetVb = opt.optimalVbLiters;
  // Multiple woofers scale net volume directly (Vas is summed)
  const netVolumeLiters = Math.round(singleNetVb * wooferQuantity * 10) / 10;
  const tuningFrequencyFbHz = opt.optimalFbHz;
  const f3CutoffHz = opt.f3Hz;
  const f6CutoffHz = Math.round(f3CutoffHz * (alignment === 'sealed' ? 0.72 : 0.85));

  // 3. Component & Structure Displacements
  const wooferDisplacementSingle = woofer.displacementLiters || Math.max(0.6, (woofer.nominalDiameterInch * 0.25));
  const driverDisplacementLiters = Math.round((wooferDisplacementSingle * wooferQuantity + 0.3) * 10) / 10;
  const midrangeChamberDisplacementLiters = includeIsolatedMidChamber && topology === 'three_way' ? midChamberVolumeLiters : 0;
  const portDisplacementLiters = alignment === 'ported' ? (wooferQuantity > 1 ? 3.5 : 2.0) : 0;
  const bracingDisplacementLiters = Math.round(netVolumeLiters * 0.08 * 10) / 10; // 8% for cross-bracing

  const grossVolumeLiters = Math.round(
    (netVolumeLiters +
      driverDisplacementLiters +
      bracingDisplacementLiters +
      portDisplacementLiters +
      midrangeChamberDisplacementLiters) *
      10
  ) / 10;

  // 4. Physical Driver Clearance Constraints
  const wooferDiameterMm = woofer.frameOuterDiameterMm || (woofer.nominalDiameterInch * 25.4 + 18);
  const midDiameterMm = topology === 'three_way' && midrange ? (midrange.frameOuterDiameterMm || 125) : 0;
  const tweeterDiameterMm = topology !== 'single' && tweeter ? (tweeter.frameOuterDiameterMm || 104) : 0;

  // Minimum Baffle Width constraint: largest driver + 20mm edge margins on each side + 2*wall thickness
  const maxDriverOuterMm = Math.max(wooferDiameterMm, midDiameterMm, tweeterDiameterMm);
  const baffleMinimumWidthMm = Math.round(maxDriverOuterMm + 40 + 2 * wallThicknessMm);

  // Minimum Height constraint: sum of driver diameters stacked vertically + clearance margins
  let stackedDriverHeightMm = wooferDiameterMm * wooferQuantity;
  if (topology === 'three_way') stackedDriverHeightMm += midDiameterMm + 25;
  if (topology !== 'single') stackedDriverHeightMm += tweeterDiameterMm + 25;
  if (alignment === 'ported') stackedDriverHeightMm += 80; // port tube clearance

  const cabinetMinimumHeightMm = Math.round(stackedDriverHeightMm + 50 + 2 * wallThicknessMm);

  // Minimum Depth constraint: woofer mounting depth + 45mm rear pole-vent cooling clearance + baffle/rear thickness
  const wooferDepthMm = woofer.mountingDepthMm || (woofer.nominalDiameterInch * 10);
  const cabinetMinimumDepthMm = Math.round(wooferDepthMm + 50 + baffleThicknessMm + wallThicknessMm);

  // 5. Dimensional Synthesis based on Selected Acoustic Proportion Ratio
  // We want internal volume V_int_liters = grossVolumeLiters
  const targetInternalMm3 = grossVolumeLiters * 1000000;

  // Dimensional ratios (W : H : D) normalized
  let rw = 1.0;
  let rh = 1.62;
  let rd = 1.25;
  let ratioDescription = '';

  switch (proportionRatio) {
    case 'golden_ratio':
      rw = 1.0;
      rh = 1.618;
      rd = 1.272; // Golden proportion acoustic volume
      ratioDescription = 'Golden Ratio (1.0 : 1.62 : 1.27) — Natural harmonic anti-resonance decay';
      break;

    case 'optimal_standing_wave':
      rw = 1.0;
      rh = 1.58;
      rd = 1.26; // IEC / Louden low standing wave distribution
      ratioDescription = 'IEC Standing Wave Standard (1.0 : 1.58 : 1.26) — Spreads internal modal peaks evenly';
      break;

    case 'narrow_baffle':
      rw = 1.0;
      rh = 2.15;
      rd = 1.45;
      ratioDescription = 'Narrow Baffle Monitor (1.0 : 2.15 : 1.45) — Suppresses lateral front-edge diffraction step';
      break;

    case 'compact_cube':
      rw = 1.0;
      rh = 1.20;
      rd = 1.25;
      ratioDescription = 'Compact Cubic (1.0 : 1.20 : 1.25) — Maximum internal displacement efficiency for subwoofers';
      break;
  }

  // Calculate base unit dimension from volume: V = (rw * s) * (rh * s) * (rd * s) = s^3 * (rw * rh * rd)
  const productRatio = rw * rh * rd;
  const baseScaleMm = Math.cbrt(targetInternalMm3 / productRatio);

  let intW = Math.round(baseScaleMm * rw);
  let intH = Math.round(baseScaleMm * rh);
  let intD = Math.round(baseScaleMm * rd);

  // Ensure external dimensions meet minimum physical driver frame boundaries
  let extW = Math.max(baffleMinimumWidthMm, intW + 2 * wallThicknessMm);
  let extH = Math.max(cabinetMinimumHeightMm, intH + 2 * wallThicknessMm);
  let extD = Math.max(cabinetMinimumDepthMm, intD + baffleThicknessMm + wallThicknessMm);

  // Recalculate internal dimensions from external dimensions
  intW = extW - 2 * wallThicknessMm;
  intH = extH - 2 * wallThicknessMm;
  intD = extD - baffleThicknessMm - wallThicknessMm;

  // If external constraints increased volume beyond target, adjust depth to match gross volume closely
  const currentActualInternalLiters = (intW * intH * intD) / 1000000;
  if (currentActualInternalLiters > grossVolumeLiters * 1.15) {
    const adjustedIntD = Math.max(
      cabinetMinimumDepthMm - baffleThicknessMm - wallThicknessMm,
      Math.round(targetInternalMm3 / (intW * intH))
    );
    intD = adjustedIntD;
    extD = intD + baffleThicknessMm + wallThicknessMm;
  }

  const dimensions: EnclosureDimensions = {
    externalWidthMm: extW,
    externalHeightMm: extH,
    externalDepthMm: extD,
    material,
    baffleThicknessMm,
    jointType: category.includes('live') ? 'rabbet' : 'miter',
    category,
    subcategory: category === 'studio_monitor' ? (topology === 'three_way' ? 'midfield_3way' : 'nearfield_2way') : 'sealed_precision',
    hardware: {
      showHandles: category.includes('live'),
      showPoleMount: category === 'live_top',
      showCornerProtectors: category.includes('live'),
      showIsolationFeet: true,
    },
  };

  const acousticParameters: AcousticParameters = {
    topology,
    alignment,
    targetFb: tuningFrequencyFbHz,
    targetQtc,
    driverAssignments: {
      woofer: {
        role: 'woofer',
        driver: woofer,
        quantity: wooferQuantity,
        impedanceOhm: wooferQuantity === 2 ? 4 : 8,
        attenuationDb: 0,
      },
      tweeter: {
        role: 'tweeter',
        driver: tweeter,
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: Math.max(0, Math.round(((tweeter.splSensitivityDb || 91) - (woofer.splSensitivityDb || 88)) * 10) / 10),
      },
      midrange: {
        role: 'midrange',
        driver: midrange,
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: Math.max(0, Math.round(((midrange.splSensitivityDb || 89) - (woofer.splSensitivityDb || 88)) * 10) / 10),
      },
    },
    portType: category.includes('live') ? 'slot' : 'round',
    portDiameterMm: woofer.nominalDiameterInch >= 15 ? 120 : woofer.nominalDiameterInch >= 10 ? 90 : 75,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    numberOfPorts: wooferQuantity === 2 ? 2 : 1,
    dampingFillPercent: alignment === 'sealed' ? 60 : 40,
    bracingLevel: category.includes('live') ? 'heavy' : 'standard',
    crossoverLowHz: topology === 'three_way' ? 450 : 2200,
    crossoverHighHz: topology === 'three_way' ? 3200 : 2500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
    midPassOrder: 2,
    midPassType: 'linkwitz_riley',
    waveguideCoverageAngleDeg: 90,
    splCalcDistanceM: 1.5,
    splCalcInputPowerW: woofer.pe || 250,
  };

  return {
    recommendedAlignment,
    ebp,
    ebpCategory,
    ebpDescription,
    netVolumeLiters,
    grossVolumeLiters,
    driverDisplacementLiters,
    bracingDisplacementLiters,
    portDisplacementLiters,
    midrangeChamberDisplacementLiters,
    tuningFrequencyFbHz,
    f3CutoffHz,
    f6CutoffHz,
    targetQtc,
    dimensions,
    internalDimensionsMm: { w: intW, h: intH, d: intD },
    baffleMinimumWidthMm,
    cabinetMinimumHeightMm,
    cabinetMinimumDepthMm,
    acousticParameters,
    ratioDescription,
  };
}
