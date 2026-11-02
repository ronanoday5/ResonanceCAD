import type {
  ArrayCurvaturePreset,
  AudiencePointResult,
  LineArrayConfig,
  LineArrayModuleConfig,
  LineArraySimulationResult,
  LineArrayVenueConfig,
} from '../types/lineArray.ts';

/**
 * Default starter configuration for an 8-element touring line array system
 */
export const DEFAULT_LINE_ARRAY_CONFIG: LineArrayConfig = {
  enabled: true,
  moduleCount: 8,
  curvaturePreset: 'j_curve',
  riggingType: 'flown',

  boxName: 'Resonance Dual-10" WST Line Array',
  boxHeightMm: 280,
  boxWidthMm: 740,
  boxDepthMm: 520,
  boxWeightKg: 31.5,
  driverCenterSpacingMm: 265,
  driverCountPerBox: 2,
  driverDiameterInch: 10,
  nominalSensitivity1w1mDb: 102.5,
  powerHandlingRmsW: 650,
  horizontalDispersionDeg: 110,
  verticalModuleDispersionDeg: 10,
  maxSplayAngleDeg: 10,

  bumperWeightKg: 42,
  bumperLengthMm: 780,
  maxRiggingLoadWllKg: 1500,

  modules: generateModuleCurvature(8, 'j_curve', 10),

  venue: {
    trimHeightM: 7.5,
    bumperTiltDeg: -3.5,
    audienceDistanceStartM: 4.0,
    audienceDistanceEndM: 42.0,
    audienceElevationStartM: 1.2,
    audienceElevationEndM: 3.5,
    temperatureC: 20,
    relativeHumidityPercent: 50,
  },

  analysisFrequencyHz: 2000,
  showAcousticRays: true,
  showCoverageHeatmap: true,
  showWavefrontIsobars: true,
  showRiggingPins: true,
  audienceResolutionPoints: 40,
};

/**
 * Generate module splay angles based on standard acoustic curvature profiles
 */
export function generateModuleCurvature(
  count: number,
  preset: ArrayCurvaturePreset,
  maxSplayDeg: number = 10
): LineArrayModuleConfig[] {
  const modules: LineArrayModuleConfig[] = [];

  for (let i = 0; i < count; i++) {
    let splay = 0;

    if (i < count - 1) {
      // Last box has 0 splay to box below (no box below)
      switch (preset) {
        case 'straight':
          splay = 0;
          break;

        case 'constant_curvature':
          splay = Math.min(maxSplayDeg, 3.5);
          break;

        case 'j_curve': {
          // Top section (long throw): 0° to 1°
          // Mid section (midfield): 2° to 4°
          // Bottom section (downfill): 6° to 10°
          const progress = i / Math.max(1, count - 2);
          if (progress < 0.4) {
            splay = 0.5;
          } else if (progress < 0.7) {
            splay = 2.5;
          } else {
            splay = Math.min(maxSplayDeg, 4 + (progress - 0.7) * 20);
          }
          break;
        }

        case 'spiral_progressive': {
          // Smooth progressive arithmetic curve
          const norm = (i + 1) / Math.max(1, count - 1);
          splay = Math.min(maxSplayDeg, Math.pow(norm, 1.8) * maxSplayDeg);
          break;
        }

        case 'custom':
        default:
          splay = Math.min(maxSplayDeg, i * 1.0);
          break;
      }
    }

    // Round splay to standard 0.5° hardware rigging pin increments
    const roundedSplay = Math.round(splay * 2) / 2;

    // Gain shading: downfill boxes at bottom of J curve are closer to audience,
    // so they are attenuated by -1 dB to -4 dB to equalize near-field SPL
    const isDownfill = i >= Math.floor(count * 0.75);
    const gainTrimDb = isDownfill ? -Math.round((i - count * 0.75 + 1) * 1.5 * 10) / 10 : 0;

    modules.push({
      id: `array_mod_${i}`,
      boxIndex: i,
      splayAngleDeg: roundedSplay,
      gainTrimDb,
      delayMs: 0,
      hfShadingDb: i === 0 ? 2.0 : isDownfill ? -1.5 : 0, // Top box gets HF boost for long throw
      isMuted: false,
    });
  }

  return modules;
}

/**
 * Calculates ISO 9613-1 Atmospheric Sound Absorption Coefficient (dB per meter)
 */
export function calculateAirAbsorptionDbPerM(
  freqHz: number,
  temperatureC: number = 20,
  relativeHumidityPercent: number = 50
): number {
  const T_kelvin = temperatureC + 273.15;
  const T_ref = 293.15;
  const P_ref = 101.325; // kPa
  const P_atm = 101.325;

  // Water vapor saturation pressure
  const C = -6.8346 * Math.pow(T_ref / T_kelvin, 1.261) + 4.6151;
  const P_sat = P_ref * Math.pow(10, C);
  const h = (relativeHumidityPercent * P_sat) / P_atm;

  // Relaxation frequencies of Nitrogen and Oxygen
  const f_r_O = (P_atm / P_ref) * (24 + 4.04e4 * h * ((0.02 + h) / (0.391 + h)));
  const f_r_N =
    (P_atm / P_ref) *
    Math.pow(T_ref / T_kelvin, 0.5) *
    (9 + 280 * h * Math.exp(-4.17 * (Math.pow(T_ref / T_kelvin, 1 / 3) - 1)));

  const term1 = 1.84e-11 * (P_ref / P_atm) * Math.pow(T_kelvin / T_ref, 0.5);
  const term2 =
    Math.pow(T_kelvin / T_ref, -2.5) *
    (0.01275 * (Math.exp(-2239.1 / T_kelvin) / (f_r_O + (freqHz * freqHz) / f_r_O)) +
      0.1068 * (Math.exp(-3352.0 / T_kelvin) / (f_r_N + (freqHz * freqHz) / f_r_N)));

  const alpha = 8.686 * freqHz * freqHz * (term1 + term2);
  return Math.max(0.0001, alpha);
}

/**
 * Core Acoustic Simulation & Rigging Physics Engine for Line Arrays
 */
export function calculateLineArrayAcoustics(
  config: LineArrayConfig
): LineArraySimulationResult {
  const { moduleCount, modules, venue, analysisFrequencyHz } = config;
  const { trimHeightM, bumperTiltDeg, audienceDistanceStartM, audienceDistanceEndM, audienceElevationStartM, audienceElevationEndM } = venue;

  // Speed of sound in air (m/s)
  const speedOfSoundMs = Math.round((331.3 * Math.sqrt(1 + venue.temperatureC / 273.15)) * 10) / 10;
  const wavelengthM = speedOfSoundMs / Math.max(20, analysisFrequencyHz);
  const k = (2 * Math.PI) / wavelengthM; // Wavenumber

  const boxHeightM = config.boxHeightMm / 1000;
  const boxDepthM = config.boxDepthMm / 1000;
  const totalArrayLengthM = moduleCount * boxHeightM;

  // 1. Acoustic Coupling Limit Frequency (WST Criterion 1: d <= lambda / 2)
  const driverSpacingM = Math.max(0.05, config.driverCenterSpacingMm / 1000);
  const couplingCutoffFrequencyHz = Math.round(speedOfSoundMs / (2 * driverSpacingM));
  const isAcousticallyCoupledAtFreq = analysisFrequencyHz <= couplingCutoffFrequencyHz;

  // 2. Near-Field to Far-Field Transition Distance (Fresnel Zone)
  // r_trans = L^2 / (2 * lambda) = (L^2 * f) / (2 * c)
  const nearFieldTransitionDistanceM = Math.round(((totalArrayLengthM * totalArrayLengthM) / (2 * wavelengthM)) * 10) / 10;

  // 3. Calculate Cumulative Box Aiming Angles & Coordinates in 2D Vertical Plane
  // Coordinate system: X = distance towards audience (meters), Y = vertical elevation (meters)
  const cumulativeBoxAnglesDeg: number[] = [];
  const boxPositions: { x: number; y: number; angleDeg: number; normalAngleDeg: number }[] = [];

  let currentCumulativeAngle = bumperTiltDeg; // starts at flybar tilt
  let currentY = trimHeightM;
  let currentX = 0;

  for (let i = 0; i < moduleCount; i++) {
    cumulativeBoxAnglesDeg.push(currentCumulativeAngle);

    // Box acoustic center position
    boxPositions.push({
      x: currentX,
      y: currentY - boxHeightM / 2,
      angleDeg: currentCumulativeAngle,
      normalAngleDeg: currentCumulativeAngle - 90, // normal vector pointing horizontally towards audience
    });

    const splayToNext = modules[i]?.splayAngleDeg || 0;
    currentCumulativeAngle += splayToNext; // Curving downward

    // Vector step down along the angled joint
    const rad = (currentCumulativeAngle * Math.PI) / 180;
    currentY -= boxHeightM * Math.cos(rad);
    currentX += boxHeightM * Math.sin(rad);
  }

  const topBoxAimAngleDeg = Math.round(cumulativeBoxAnglesDeg[0] * 10) / 10;
  const bottomBoxAimAngleDeg = Math.round(cumulativeBoxAnglesDeg[cumulativeBoxAnglesDeg.length - 1] * 10) / 10;
  const effectiveVerticalDispersionDeg = Math.round(Math.abs(bottomBoxAimAngleDeg - topBoxAimAngleDeg) + config.verticalModuleDispersionDeg);

  // 4. Atmospheric Absorption in dB/m
  const airLossPerM = calculateAirAbsorptionDbPerM(analysisFrequencyHz, venue.temperatureC, venue.relativeHumidityPercent);

  // 5. Discretize Audience Listening Plane and Compute Complex Waveform Summation
  const numPoints = Math.max(10, Math.min(100, config.audienceResolutionPoints || 40));
  const audiencePoints: AudiencePointResult[] = [];

  let sumSpl = 0;
  let frontRowSplDb = 0;
  let backRowSplDb = 0;

  for (let p = 0; p < numPoints; p++) {
    const fraction = p / (numPoints - 1);
    const audX = audienceDistanceStartM + fraction * (audienceDistanceEndM - audienceDistanceStartM);
    const audY = audienceElevationStartM + fraction * (audienceElevationEndM - audienceElevationStartM);

    // Sum acoustic pressure from all active non-muted boxes (Huygens-Fresnel summation)
    let realPressure = 0;
    let imagPressure = 0;
    let closestAimError = 999;
    let primaryBoxIdx = 0;
    let maxBoxDirectSpl = -999;

    for (let b = 0; b < moduleCount; b++) {
      const mod = modules[b];
      if (mod?.isMuted) continue;

      const box = boxPositions[b];
      const dx = audX - box.x;
      const dy = audY - box.y;
      const dist = Math.max(0.5, Math.hypot(dx, dy));

      // Angle from box normal vector to this audience point
      const angleToAudDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const offAxisAngleDeg = Math.abs(angleToAudDeg - box.normalAngleDeg);

      // Single cabinet vertical dispersion roll-off (sinc / Bessel directivity)
      const vertHalfBeam = config.verticalModuleDispersionDeg / 2;
      const directivityFactor = Math.max(0.01, Math.cos(Math.min(Math.PI / 2, (offAxisAngleDeg / vertHalfBeam) * (Math.PI / 4))));

      // Free-field 1/r cylindrical/spherical hybrid pressure amplitude
      // In near-field: 1/sqrt(r); in far-field: 1/r
      const distFactor = dist <= nearFieldTransitionDistanceM
        ? 1 / Math.sqrt(dist)
        : Math.sqrt(nearFieldTransitionDistanceM) / dist;

      // Air absorption loss
      const airAttenLinear = Math.pow(10, (-airLossPerM * dist) / 20);

      // Gain shading & box trim
      const gainLinear = Math.pow(10, ((mod?.gainTrimDb || 0) + (mod?.hfShadingDb || 0)) / 20);

      const amp = distFactor * directivityFactor * airAttenLinear * gainLinear;
      const phase = k * dist + (mod?.delayMs ? (2 * Math.PI * analysisFrequencyHz * mod.delayMs) / 1000 : 0);

      realPressure += amp * Math.cos(phase);
      imagPressure += amp * Math.sin(phase);

      if (directivityFactor > maxBoxDirectSpl) {
        maxBoxDirectSpl = directivityFactor;
        closestAimError = offAxisAngleDeg;
        primaryBoxIdx = b;
      }
    }

    const totalMag = Math.hypot(realPressure, imagPressure);
    // Base SPL scaled to calibrated 102dB 1W/1m box reference
    const splTotalDb = Math.round((config.nominalSensitivity1w1mDb + 20 * Math.log10(Math.max(1e-4, totalMag))) * 10) / 10;
    const isCovered = closestAimError <= config.verticalModuleDispersionDeg * 1.5;

    const pointResult: AudiencePointResult = {
      distanceM: Math.round(audX * 10) / 10,
      elevationM: Math.round(audY * 10) / 10,
      splTotalDb,
      splDirectDb: splTotalDb,
      airLossDb: Math.round(airLossPerM * audX * 10) / 10,
      primaryContributingBoxIndex: primaryBoxIdx,
      aimAngleErrorDeg: Math.round(closestAimError * 10) / 10,
      isCovered,
    };

    audiencePoints.push(pointResult);
    sumSpl += splTotalDb;

    if (p === 0) frontRowSplDb = splTotalDb;
    if (p === numPoints - 1) backRowSplDb = splTotalDb;
  }

  const averageAudienceSplDb = Math.round((sumSpl / numPoints) * 10) / 10;
  const frontToBackSplDeltaDb = Math.round(Math.abs(frontRowSplDb - backRowSplDb) * 10) / 10;

  let splConsistencyRating: 'excellent' | 'good' | 'moderate' | 'uneven' = 'excellent';
  if (frontToBackSplDeltaDb <= 3.0) {
    splConsistencyRating = 'excellent';
  } else if (frontToBackSplDeltaDb <= 6.0) {
    splConsistencyRating = 'good';
  } else if (frontToBackSplDeltaDb <= 9.0) {
    splConsistencyRating = 'moderate';
  } else {
    splConsistencyRating = 'uneven';
  }

  // 6. Mechanical Rigging, Weight & Safety Factor
  const totalBoxWeightKg = moduleCount * config.boxWeightKg;
  const totalSuspendedWeightKg = Math.round(totalBoxWeightKg + config.bumperWeightKg);

  // Center of Gravity: progressive splay shifts CG backward
  let cumulativeMomentMm = 0;
  for (let i = 0; i < moduleCount; i++) {
    const angleRad = (cumulativeBoxAnglesDeg[i] * Math.PI) / 180;
    const boxOffset = (boxDepthM / 2) * 1000 * Math.sin(angleRad);
    cumulativeMomentMm += boxOffset * config.boxWeightKg;
  }
  const centerOfGravityOffsetMm = Math.round(cumulativeMomentMm / Math.max(1, totalBoxWeightKg));

  // Front and rear pin reaction forces
  const bumperSpanMm = config.bumperLengthMm || 800;
  const frontPinLoadKg = Math.round(totalSuspendedWeightKg * (0.5 - centerOfGravityOffsetMm / bumperSpanMm));
  const rearPinLoadKg = Math.round(totalSuspendedWeightKg * (0.5 + centerOfGravityOffsetMm / bumperSpanMm));

  const maxPinLoad = Math.max(frontPinLoadKg, rearPinLoadKg);
  const riggingSafetyFactor = Math.round((config.maxRiggingLoadWllKg / Math.max(1, maxPinLoad)) * 10) / 10;
  const isRiggingSafe = riggingSafetyFactor >= 7.0 && totalSuspendedWeightKg <= config.maxRiggingLoadWllKg;

  let recommendedPickPoint: 'front' | 'rear' | 'center' | 'two_point_bridle' = 'two_point_bridle';
  if (bumperTiltDeg < -6) {
    recommendedPickPoint = 'rear';
  } else if (bumperTiltDeg > 3) {
    recommendedPickPoint = 'front';
  } else {
    recommendedPickPoint = 'two_point_bridle';
  }

  return {
    speedOfSoundMs,
    wavelengthM: Math.round(wavelengthM * 1000) / 1000,
    totalArrayLengthM: Math.round(totalArrayLengthM * 100) / 100,
    nearFieldTransitionDistanceM,
    couplingCutoffFrequencyHz,
    isAcousticallyCoupledAtFreq,
    effectiveVerticalDispersionDeg,

    frontRowSplDb,
    backRowSplDb,
    frontToBackSplDeltaDb,
    averageAudienceSplDb,
    splConsistencyRating,
    audiencePoints,

    totalSuspendedWeightKg,
    centerOfGravityOffsetMm,
    frontPinLoadKg,
    rearPinLoadKg,
    riggingSafetyFactor,
    isRiggingSafe,
    recommendedPickPoint,

    cumulativeBoxAnglesDeg,
    bottomBoxAimAngleDeg,
    topBoxAimAngleDeg,
  };
}
