import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAcoustics,
  calculateDampingAdvisor,
  DAMPING_MATERIAL_SPECS,
  calculateOptimalAlignment,
  DRIVER_PRESETS,
} from './acousticEngine.ts';
import { calculateCrossoverNetwork } from './crossoverEngine.ts';
import { generateCutList } from './cutlistGenerator.ts';
import { autoResolveBaffleClashes } from './baffleLayoutEngine.ts';
import type { AcousticParameters, EnclosureDimensions } from '../types/loudspeaker.ts';

test('calculateCrossoverNetwork computes valid inductors and capacitors for 2-Way Linkwitz-Riley', () => {
  const acoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 3 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 26,
    portType: 'round',
    portDiameterMm: 80,
    slotWidthMm: 290,
    slotHeightMm: 45,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const crossover = calculateCrossoverNetwork(acoustics);

  assert.ok(crossover.wooferLowPass.length >= 2, 'Woofer low-pass filter should have L and C components');
  assert.ok(crossover.tweeterHighPass.length >= 2, 'Tweeter high-pass filter should have L and C components');
  assert.ok(crossover.lpadTweeter, 'L-Pad attenuator resistors should be calculated for 3dB tweeter attenuation');
  assert.ok(crossover.lpadTweeter!.rSeriesOhm > 0, 'L-Pad series resistor should be > 0');
  assert.ok(crossover.lpadTweeter!.rParallelOhm > 0, 'L-Pad parallel resistor should be > 0');
});

test('calculateAcoustics handles MTM dual woofer displacement and multi-driver cut lists', () => {
  const dimensions: EnclosureDimensions = {
    externalWidthMm: 330,
    externalHeightMm: 720,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const acoustics: AcousticParameters = {
    topology: 'mtm',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[1], quantity: 2, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 2 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 32,
    portType: 'round',
    portDiameterMm: 80,
    slotWidthMm: 290,
    slotHeightMm: 45,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2200,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const results = calculateAcoustics(dimensions, acoustics);

  assert.ok(results.driverDisplacementLiters >= 1.2, 'Dual woofer displacement should account for 2x drivers');
  assert.ok(results.frequencyResponse.length >= 80, 'Multi-passband frequency curve points generated');

  const { cutList, partMetadataMap } = generateCutList(dimensions, acoustics, results);
  assert.ok(cutList.some((c) => c.type === 'crossover_pcb'), 'Crossover PCB bill of materials included in cut list');
  assert.ok(partMetadataMap['crossover_pcb'], 'Crossover PCB metadata registered');
});

test('flared port end-correction shortens tube length vs straight tube to prevent sub-tuning', () => {
  const dimensions: EnclosureDimensions = {
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const baseAcoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 26,
    portType: 'round',
    portDiameterMm: 80,
    flareRadiusMm: 12,
    isDoubleFlared: false,
    slotWidthMm: 290,
    slotHeightMm: 45,
    slotLipRadiusMm: 12,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const singleFlared = calculateAcoustics(dimensions, baseAcoustics);
  const doubleFlared = calculateAcoustics(dimensions, {
    ...baseAcoustics,
    flareRadiusMm: 25,
    isDoubleFlared: true,
  });

  assert.ok(singleFlared.portLengthMm > 0, 'Port length should be positive');
  assert.ok(doubleFlared.portLengthMm > 0, 'Double flared port length should be positive');
  assert.ok(
    doubleFlared.portLengthMm <= singleFlared.portLengthMm,
    'Increased flare radius and dual termination increase end correction k, shortening physical tube'
  );
  assert.ok(singleFlared.optimalFlareRadiusMm >= 12, 'Optimal flare radius recommendation calculated');
});

test('slot port calculates air velocity, chuffing risk, and material cost with waste factor', () => {
  const dimensions: EnclosureDimensions = {
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const slotAcoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 26,
    portType: 'slot',
    portDiameterMm: 80,
    flareRadiusMm: 16,
    isDoubleFlared: false,
    slotWidthMm: 294,
    slotHeightMm: 45,
    slotLipRadiusMm: 12,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    materialPricing: {
      customDensityKgM3: 700,
      costPerSquareMeter: 80,
      wastePercentage: 20, // 20% waste factor
    },
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const results = calculateAcoustics(dimensions, slotAcoustics);

  assert.ok(results.portAirVelocityMs > 0, 'Port air velocity should be calculated');
  assert.ok(results.portAirVelocityMs < 17, 'Slot port of 294x45mm provides large area, keeping velocity < 17 m/s');
  assert.strictEqual(results.isChuffingRisk, false, 'No chuffing risk with sufficiently sized slot port');

  // Verify material cost with 20% waste
  assert.ok(results.materialCost.netSurfaceAreaM2 > 0, 'Net surface area should be positive');
  assert.ok(results.materialCost.grossSurfaceAreaM2 > results.materialCost.netSurfaceAreaM2, 'Gross surface area includes waste factor');
  const expectedGross = results.materialCost.netSurfaceAreaM2 * 1.20;
  assert.ok(Math.abs(results.materialCost.grossSurfaceAreaM2 - expectedGross) < 0.05, 'Gross area matches 20% waste allowance');
  assert.ok(results.materialCost.totalCostUsd > 50, 'Total material cost calculated properly');
  assert.ok(results.materialCost.totalDryWeightKg > 10, 'Cabinet mass calculated from custom density');
});

test('baffle layout engine detects driver-port collision and auto-resolves with rear placement or height adjustment', () => {
  const testDimensions: EnclosureDimensions = {
    externalWidthMm: 340,
    externalHeightMm: 500, // cramped for 10" woofer (266mm) + tweeter (104mm) + port (116mm flange)
    externalDepthMm: 420,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const testAcoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 34,
    portType: 'round',
    portPlacement: 'front_bottom', // explicitly forcing front_bottom in 500mm box
    portDiameterMm: 80,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const forcedResults = calculateAcoustics(testDimensions, testAcoustics);
  assert.strictEqual(forcedResults.layout.hasCollision, true, 'Detects collision when forced onto cramped front baffle');
  assert.ok(forcedResults.layout.collisions.length > 0, 'Collision report lists clashing pairs');

  // Now test Auto-Fit placement ('auto')
  const autoResults = calculateAcoustics(testDimensions, {
    ...testAcoustics,
    portPlacement: 'auto',
  });

  assert.strictEqual(
    autoResults.layout.resolvedPortPlacement,
    'rear',
    'Auto-Fit intelligently relocates port to rear panel when front baffle height cannot physically accommodate drivers + port'
  );
  assert.strictEqual(autoResults.layout.hasCollision, false, 'Rear port eliminates front baffle driver clash completely');
  assert.ok(autoResults.layout.minBaffleClearanceMm > 0, 'Front drivers now have positive clearance on the baffle');

  // Test autoResolveBaffleClashes on the forced layout
  const { dimensions: resolvedDims, acoustics: resolvedAcoustics } = autoResolveBaffleClashes(testDimensions, testAcoustics);
  const resolvedResults = calculateAcoustics(resolvedDims, resolvedAcoustics);
  assert.strictEqual(resolvedResults.layout.hasCollision, false, 'autoResolveBaffleClashes successfully eliminates all collisions');
});

test('airflow interference engine computes proximity stress and identifies driver magnet and bracing obstructions', () => {
  const dimensions: EnclosureDimensions = {
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const acoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 2 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 28,
    portType: 'round',
    portPlacement: 'front_bottom',
    portDiameterMm: 80,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  };

  const results = calculateAcoustics(dimensions, acoustics);
  const airflow = results.layout.airflowInterference;

  assert.ok(airflow, 'Airflow interference report generated');
  assert.ok(typeof airflow.maxStressLevel === 'number', 'Max stress level is numeric');
  assert.ok(airflow.maxStressLevel >= 0 && airflow.maxStressLevel <= 1.0, 'Stress level within [0, 1]');
  assert.ok(typeof airflow.turbulenceMultiplier === 'number', 'Turbulence multiplier is numeric');
  assert.ok(airflow.turbulenceMultiplier >= 1.0, 'Turbulence multiplier is >= 1.0x');
  assert.ok(airflow.minMagnetClearanceMm > 0, 'Driver magnet clearance is computed in mm');
  assert.ok(airflow.minBracingClearanceMm >= 0, 'Window brace clearance is computed in mm');
  assert.ok(airflow.minWallClearanceMm > 0, 'Opposing wall clearance is computed in mm');
  assert.ok(['safe', 'caution', 'choked'].includes(airflow.overallStatus), 'Overall status is valid enum');
});

test('JBL Professional driver catalogue includes genuine transducers with verified parameters', () => {
  const jblDrivers = DRIVER_PRESETS.filter((d) => d.brand === 'JBL Professional');
  assert.ok(jblDrivers.length >= 10, 'Driver catalogue includes at least 10 JBL Professional component models');

  // Verify flagship tour subwoofer JBL 2242H SVG
  const jbl2242 = jblDrivers.find((d) => d.id === 'jbl_2242h');
  assert.ok(jbl2242, 'JBL 2242H is present in presets');
  assert.strictEqual(jbl2242?.nominalDiameterInch, 18, 'JBL 2242H is an 18-inch transducer');
  assert.strictEqual(jbl2242?.fs, 35, 'JBL 2242H Fs is 35 Hz');
  assert.strictEqual(jbl2242?.qts, 0.28, 'JBL 2242H Qts is 0.28');
  assert.strictEqual(jbl2242?.vas, 282, 'JBL 2242H Vas is 282 L');
  assert.strictEqual(jbl2242?.splSensitivityDb, 99, 'JBL 2242H sensitivity is 99 dB');
  assert.strictEqual(jbl2242?.pe, 800, 'JBL 2242H AES power is 800 W');

  // Verify neodymium Differential Drive JBL 2268H
  const jbl2268 = jblDrivers.find((d) => d.id === 'jbl_2268h');
  assert.ok(jbl2268, 'JBL 2268H is present in presets');
  assert.strictEqual(jbl2268?.xmax, 23, 'JBL 2268H excursion is 23 mm');

  // Verify compression driver JBL 2450H
  const jbl2450 = jblDrivers.find((d) => d.id === 'jbl_2450h');
  assert.ok(jbl2450, 'JBL 2450H 2-inch exit compression driver is present');
  assert.strictEqual(jbl2450?.splSensitivityDb, 111, 'JBL 2450H sensitivity is 111 dB');
});

test('CTA-2034 Spinorama and Group Delay calculations produce valid acoustic datasets', () => {
  const dimensions: EnclosureDimensions = {
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  };

  const acoustics: AcousticParameters = {
    topology: 'two_way',
    driverAssignments: {
      woofer: { role: 'woofer', driver: DRIVER_PRESETS[0], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      tweeter: { role: 'tweeter', driver: DRIVER_PRESETS[4], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
      midrange: { role: 'midrange', driver: DRIVER_PRESETS[6], quantity: 1, impedanceOhm: 8, attenuationDb: 0 },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 32,
    portType: 'round',
    portDiameterMm: 80,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    crossoverLowHz: 2000,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
    thermalDriveLevel: 'nominal_aes',
    operatingTemperatureC: 25,
    subwooferArrayMode: 'cardioid_gradient',
    waveguideCoverageAngleDeg: 90,
    baffleEdgeRadiusMm: 22,
    hasConstrainedLayerDamping: true,
  };

  const results = calculateAcoustics(dimensions, acoustics);

  // 1. CTA-2034 Spinorama
  assert.ok(results.spinorama && results.spinorama.length > 50, 'Spinorama curves generated');
  const sampleSpin = results.spinorama[25];
  assert.ok(sampleSpin.listeningWindow <= sampleSpin.onAxis + 0.1, 'Listening window reflects off-axis attenuation');
  assert.ok(sampleSpin.soundPower <= sampleSpin.earlyReflections + 0.1, 'Sound power is lower than early reflections');
  assert.ok(sampleSpin.erdi >= 0, 'ERDI is non-negative');
  assert.ok(sampleSpin.spdi >= 0, 'SPDI is non-negative');

  // 2. Group Delay & Transient Compliance
  assert.ok(results.groupDelay && results.groupDelay.length > 50, 'Group delay points generated');
  const gdAt50Hz = results.groupDelay.find((p) => Math.abs(p.freq - 50) < 2);
  assert.ok(gdAt50Hz, '50 Hz group delay point found');
  assert.ok(gdAt50Hz!.cycleThresholdMs > 0, 'Max audible delay ceiling calculated as 1.5/f');
  assert.ok(typeof gdAt50Hz!.isAudible === 'boolean', 'Audibility flag is boolean');

  // 3. Klippel Thermal Large-Signal Shift
  assert.ok(results.klippelThermal, 'Klippel thermal report generated');
  assert.ok(results.klippelThermal!.tempRiseC > 0, 'Voice coil heating is positive under nominal AES drive');
  assert.ok(results.klippelThermal!.hotReOhm > results.klippelThermal!.coldReOhm, 'Re increases with voice coil temperature');
  assert.ok(results.klippelThermal!.powerCompressionDb > 0, 'Power compression is positive in dB');

  // 4. Earl Geddes OSWG Waveguide
  assert.ok(results.waveguide, 'OSWG waveguide calculated');
  assert.ok(results.waveguide!.profilePoints.length > 0, 'Waveguide profile contour generated');
  assert.strictEqual(results.waveguide!.isDiffractionSuppressed, true, 'Edge radius of 22mm satisfies lambda/8 for 2000Hz (approx 21.4mm)');

  // 5. Active Cardioid Delay Solver with Temperature Compensation
  assert.ok(results.cardioid, 'Cardioid subwoofer calculated');
  assert.ok(results.cardioid!.soundSpeedMs > 340, 'Speed of sound at 25°C is > 340 m/s');
  assert.ok(results.cardioid!.delayMs > 0, 'Electronic delay is calculated in ms');
  assert.ok(results.cardioid!.rearCancellationDb >= 15, 'Rear rejection exceeds 15 dB');

  // 6. Enclosure Mechanics & Rigging WLL
  assert.ok(results.mechanics, 'Enclosure mechanics report generated');
  assert.ok(results.mechanics!.bendingStiffnessNm > 0, 'Plate bending stiffness is positive N*m');
  assert.ok(results.mechanics!.cldLossFactor > 0.15, 'CLD viscoelastic core achieves eta_sys > 0.15');
  assert.ok(results.mechanics!.wllDguv10to1Kg > 0, 'DGUV 10:1 WLL calculated');
  assert.ok(results.mechanics!.wllAnsi7to1Kg > results.mechanics!.wllDguv10to1Kg, 'ANSI 7:1 WLL is higher than DGUV 10:1');
});

test('Acoustic Damping Advisor recommends optimal material, mass, and virtual volume expansion', () => {
  const testDimensions: EnclosureDimensions = {
    externalWidthMm: 380,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 25,
    jointType: 'rabbet',
  };

  const woofer = DRIVER_PRESETS[0]; // Dayton Titanic 10 (Fs=24.5, Qts=0.38, Vas=51.2L)

  // 1. Sealed Box Test: High Q configuration recommends chamber stuffing and natural wool/polyfill
  const sealedAdvisor = calculateDampingAdvisor(
    30, // 30 Liters
    testDimensions,
    0.707, // target Qtc
    woofer,
    'sealed',
    undefined,
    60
  );

  assert.ok(sealedAdvisor, 'Sealed damping advisor report created');
  assert.strictEqual(sealedAdvisor.alignment, 'sealed');
  assert.strictEqual(sealedAdvisor.applicationMethod, 'chamber_stuffing');
  assert.ok(sealedAdvisor.recommendedMassGrams > 0, 'Calculated fill mass is positive');
  assert.ok(sealedAdvisor.recommendedLiningAreaM2 > 0, 'Calculated lining area is positive');
  assert.ok(sealedAdvisor.virtualVolumeExpansionLiters > 0, 'Virtual volume expansion from isothermal heat conversion is positive');
  assert.ok(sealedAdvisor.effectiveVolumeLiters > 30, 'Effective volume is strictly greater than physical net volume');
  assert.ok(sealedAdvisor.predictedQtc < sealedAdvisor.rawQtc, 'Damping lowers Qtc towards target');
  assert.strictEqual(sealedAdvisor.alternatives.length, 5, 'All 5 damping materials evaluated');
  assert.ok(sealedAdvisor.placementGuidelines.length >= 2, 'Placement guidelines provided');

  // 2. Ported / Bass Reflex Test: Recommends perimeter wall lining with PU egg-crate foam
  const portedAdvisor = calculateDampingAdvisor(
    65, // 65 Liters
    testDimensions,
    0.707,
    woofer,
    'ported',
    undefined,
    35
  );

  assert.ok(portedAdvisor, 'Ported damping advisor report created');
  assert.strictEqual(portedAdvisor.alignment, 'ported');
  assert.strictEqual(portedAdvisor.applicationMethod, 'perimeter_lining');
  assert.strictEqual(portedAdvisor.recommendedMaterial, 'pu_foam');
  assert.strictEqual(portedAdvisor.recommendedMaterialSpec.id, 'pu_foam');
  assert.ok(portedAdvisor.placementGuidelines.some((g) => g.includes('port diameter')), 'Enforces port clearance exclusion zone');

  // 3. User Override of Material: Test Dacron Polyfill specific calculations
  const polyfillAdvisor = calculateDampingAdvisor(
    40,
    testDimensions,
    0.707,
    woofer,
    'sealed',
    'dacron_polyfill',
    50
  );

  assert.strictEqual(polyfillAdvisor.recommendedMassGrams, Math.round(40 * DAMPING_MATERIAL_SPECS.dacron_polyfill.typicalDensityGPerL * 0.5));
  assert.ok(polyfillAdvisor.virtualVolumeExpansionLiters > 0, 'Polyfill creates isothermal volume expansion');
});


