import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAcoustics,
  calculateOptimalAlignment,
  DRIVER_PRESETS,
} from './acousticEngine.ts';
import { calculateCrossoverNetwork } from './crossoverEngine.ts';
import { generateCutList } from './cutlistGenerator.ts';
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
