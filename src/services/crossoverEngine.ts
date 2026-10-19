import type {
  AcousticParameters,
  CrossoverComponent,
  CrossoverNetworkResult,
  DriverAssignment,
  FilterOrder,
  FilterType,
} from '../types/loudspeaker.ts';

/**
 * Calculates exact passive crossover network components (Inductors in mH, Capacitors in µF, Resistors in Ohms)
 * for Butterworth and Linkwitz-Riley alignments (1st through 4th order).
 */
export function calculateCrossoverNetwork(acoustics: AcousticParameters): CrossoverNetworkResult {
  const { topology, driverAssignments, crossoverLowHz, crossoverHighHz, lowPassOrder, lowPassType, highPassOrder, highPassType, midPassOrder, midPassType } = acoustics;

  const woofer = driverAssignments.woofer;
  const tweeter = driverAssignments.tweeter;
  const midrange = driverAssignments.midrange;

  const allComponents: CrossoverComponent[] = [];
  const wooferLowPass: CrossoverComponent[] = [];
  const tweeterHighPass: CrossoverComponent[] = [];
  const midrangeBandPass: CrossoverComponent[] = [];

  // --- 1. WOOFER LOW-PASS FILTER CALCULATIONS ---
  const rWoofer = woofer.impedanceOhm || 8;
  const fcLow = crossoverLowHz || 2500;

  const lpCoeffs = getFilterCoefficients(lowPassOrder, lowPassType);
  lpCoeffs.inductors.forEach((coeff, idx) => {
    const lValueMh = ((coeff * rWoofer) / fcLow) * 1000;
    const comp: CrossoverComponent = {
      id: `lp_l${idx + 1}`,
      name: `Woofer Low-Pass Inductor L${idx + 1}`,
      type: 'inductor',
      valueFormatted: `${lValueMh.toFixed(2)} mH`,
      valueNumeric: lValueMh,
      unit: 'mH',
      voltagePowerRating: '150W Air-Core 14AWG Copper',
      purpose: `Blocks frequencies above ${fcLow}Hz (${lowPassOrder * 6}dB/octave slope)`,
    };
    wooferLowPass.push(comp);
    allComponents.push(comp);
  });

  lpCoeffs.capacitors.forEach((coeff, idx) => {
    const cValueUf = (coeff / (fcLow * rWoofer)) * 1000000;
    const comp: CrossoverComponent = {
      id: `lp_c${idx + 1}`,
      name: `Woofer Low-Pass Capacitor C${idx + 1}`,
      type: 'capacitor',
      valueFormatted: `${cValueUf.toFixed(1)} µF`,
      valueNumeric: cValueUf,
      unit: 'µF',
      voltagePowerRating: '250V Metallized Polypropylene',
      purpose: `Shunts high frequencies above ${fcLow}Hz to ground`,
    };
    wooferLowPass.push(comp);
    allComponents.push(comp);
  });

  // --- 2. TWEETER HIGH-PASS FILTER CALCULATIONS ---
  const rTweeter = tweeter.impedanceOhm || 8;
  const fcHigh = topology === 'three_way' ? (crossoverHighHz || 3500) : fcLow;

  const hpCoeffs = getFilterCoefficients(highPassOrder, highPassType);
  hpCoeffs.capacitors.forEach((coeff, idx) => {
    const cValueUf = (coeff / (fcHigh * rTweeter)) * 1000000;
    const comp: CrossoverComponent = {
      id: `hp_c${idx + 1}`,
      name: `Tweeter High-Pass Capacitor C${idx + 1}`,
      type: 'capacitor',
      valueFormatted: `${cValueUf.toFixed(1)} µF`,
      valueNumeric: cValueUf,
      unit: 'µF',
      voltagePowerRating: '400V Audiophile Film & Foil',
      purpose: `Passes high frequencies above ${fcHigh}Hz to protect tweeter voice coil`,
    };
    tweeterHighPass.push(comp);
    allComponents.push(comp);
  });

  hpCoeffs.inductors.forEach((coeff, idx) => {
    const lValueMh = ((coeff * rTweeter) / fcHigh) * 1000;
    const comp: CrossoverComponent = {
      id: `hp_l${idx + 1}`,
      name: `Tweeter High-Pass Inductor L${idx + 1}`,
      type: 'inductor',
      valueFormatted: `${lValueMh.toFixed(2)} mH`,
      valueNumeric: lValueMh,
      unit: 'mH',
      voltagePowerRating: '100W Perfect-Layer Air Core',
      purpose: `Shunts frequencies below ${fcHigh}Hz to ground`,
    };
    tweeterHighPass.push(comp);
    allComponents.push(comp);
  });

  // --- 3. MIDRANGE BAND-PASS FILTER (For 3-Way Systems) ---
  if (topology === 'three_way') {
    const rMid = midrange.impedanceOhm || 8;
    const mOrder = midPassOrder || 2;
    const mType = midPassType || 'linkwitz_riley';

    // High pass section (fcLow)
    const midHpCoeffs = getFilterCoefficients(mOrder, mType);
    midHpCoeffs.capacitors.forEach((coeff, idx) => {
      const cValueUf = (coeff / (fcLow * rMid)) * 1000000;
      const comp: CrossoverComponent = {
        id: `mid_hp_c${idx + 1}`,
        name: `Midrange High-Pass Capacitor C${idx + 1}`,
        type: 'capacitor',
        valueFormatted: `${cValueUf.toFixed(1)} µF`,
        valueNumeric: cValueUf,
        unit: 'µF',
        voltagePowerRating: '250V Polypropylene Film',
        purpose: `Passes frequencies above ${fcLow}Hz to midrange driver`,
      };
      midrangeBandPass.push(comp);
      allComponents.push(comp);
    });

    // Low pass section (fcHigh)
    const midLpCoeffs = getFilterCoefficients(mOrder, mType);
    midLpCoeffs.inductors.forEach((coeff, idx) => {
      const lValueMh = ((coeff * rMid) / fcHigh) * 1000;
      const comp: CrossoverComponent = {
        id: `mid_lp_l${idx + 1}`,
        name: `Midrange Low-Pass Inductor L${idx + 1}`,
        type: 'inductor',
        valueFormatted: `${lValueMh.toFixed(2)} mH`,
        valueNumeric: lValueMh,
        unit: 'mH',
        voltagePowerRating: '150W Air Core',
        purpose: `Attenuates frequencies above ${fcHigh}Hz`,
      };
      midrangeBandPass.push(comp);
      allComponents.push(comp);
    });
  }

  // --- 4. L-PAD ATTENUATOR RESISTOR CALCULATIONS ---
  let lpadTweeter = undefined;
  if (tweeter.attenuationDb > 0) {
    lpadTweeter = calculateLPad(tweeter.impedanceOhm || 8, tweeter.attenuationDb);
    allComponents.push({
      id: 'lpad_tw_r1',
      name: 'Tweeter L-Pad Series Resistor R1',
      type: 'resistor',
      valueFormatted: `${lpadTweeter.rSeriesOhm.toFixed(2)} Ω`,
      valueNumeric: lpadTweeter.rSeriesOhm,
      unit: 'Ω',
      voltagePowerRating: '10W Non-Inductive Ceramic',
      purpose: `Series attenuation (${tweeter.attenuationDb}dB level match)`,
    });
    allComponents.push({
      id: 'lpad_tw_r2',
      name: 'Tweeter L-Pad Parallel Resistor R2',
      type: 'resistor',
      valueFormatted: `${lpadTweeter.rParallelOhm.toFixed(2)} Ω`,
      valueNumeric: lpadTweeter.rParallelOhm,
      unit: 'Ω',
      voltagePowerRating: '10W Non-Inductive Ceramic',
      purpose: `Parallel impedance compensation for ${tweeter.attenuationDb}dB attenuation`,
    });
  }

  // --- 5. ZOBEL IMPEDANCE EQUALIZATION ---
  let zobelWoofer = undefined;
  if (woofer.driver.leMh && woofer.driver.leMh > 0) {
    const re = woofer.driver.reOhm || woofer.impedanceOhm * 0.75;
    const rZobel = 1.25 * re;
    const cZobelUf = ((woofer.driver.leMh * 1e-3) / (rZobel * rZobel)) * 1e6;
    zobelWoofer = {
      rZobelOhm: Math.round(rZobel * 100) / 100,
      cZobelUf: Math.round(cZobelUf * 10) / 10,
    };
    allComponents.push({
      id: 'zobel_r',
      name: 'Woofer Zobel Resistor Rz',
      type: 'resistor',
      valueFormatted: `${zobelWoofer.rZobelOhm.toFixed(2)} Ω`,
      valueNumeric: zobelWoofer.rZobelOhm,
      unit: 'Ω',
      voltagePowerRating: '20W Non-Inductive Wirewound',
      purpose: 'Flattens woofer voice coil inductive impedance rise at high frequencies',
    });
    allComponents.push({
      id: 'zobel_c',
      name: 'Woofer Zobel Capacitor Cz',
      type: 'capacitor',
      valueFormatted: `${zobelWoofer.cZobelUf.toFixed(1)} µF`,
      valueNumeric: zobelWoofer.cZobelUf,
      unit: 'µF',
      voltagePowerRating: '100V Non-Polarized Electrolytic/Mylar',
      purpose: 'Works with Rz to equalize driver Z(f)',
    });
  }

  const estimatedPcbAreaCm2 = Math.round(allComponents.length * 18 + 40);

  return {
    tweeterHighPass,
    midrangeBandPass: topology === 'three_way' ? midrangeBandPass : undefined,
    wooferLowPass,
    lpadTweeter,
    zobelWoofer,
    allComponents,
    estimatedPcbAreaCm2,
  };
}

/**
 * Filter coefficient lookup table for Butterworth & Linkwitz-Riley alignments
 */
function getFilterCoefficients(order: FilterOrder, type: FilterType) {
  if (order === 1) {
    // 6 dB/octave Butterworth / Linkwitz-Riley
    return {
      inductors: [0.1592],
      capacitors: [0.1592],
    };
  } else if (order === 2) {
    if (type === 'linkwitz_riley') {
      // 12 dB/octave Linkwitz-Riley (Q = 0.5)
      return {
        inductors: [0.3183],
        capacitors: [0.0796],
      };
    } else {
      // 12 dB/octave Butterworth (Q = 0.707)
      return {
        inductors: [0.2251],
        capacitors: [0.1125],
      };
    }
  } else if (order === 3) {
    // 18 dB/octave Butterworth
    return {
      inductors: [0.2387, 0.0796],
      capacitors: [0.1061, 0.3183],
    };
  } else {
    // 24 dB/octave Linkwitz-Riley (Cascaded Q = 0.707 Butterworths)
    return {
      inductors: [0.3001, 0.1501],
      capacitors: [0.0844, 0.1688],
    };
  }
}

/**
 * Calculates constant-impedance L-Pad resistor values
 */
export function calculateLPad(zOhm: number, attenuationDb: number) {
  const attenuation = Math.pow(10, -Math.abs(attenuationDb) / 20);
  const rSeries = zOhm * (1 - attenuation);
  const rParallel = (zOhm * attenuation) / (1 - attenuation);
  return {
    rSeriesOhm: Math.round(rSeries * 100) / 100,
    rParallelOhm: Math.round(rParallel * 100) / 100,
  };
}
