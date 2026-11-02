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
export function calculateCrossoverNetwork(
  acoustics: AcousticParameters,
  baffleWidthMm: number = 330
): CrossoverNetworkResult {
  const {
    topology,
    driverAssignments,
    crossoverLowHz,
    crossoverHighHz,
    lowPassOrder,
    lowPassType,
    highPassOrder,
    highPassType,
    midPassOrder,
    midPassType,
    enableZobelNetwork = true,
    enableFsNotchTank = false,
    enableBaffleStepComp = false,
    enableCdHornBypass = false,
  } = acoustics;

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
  let lpadMidrange = undefined;
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

    if (midrange.attenuationDb > 0) {
      lpadMidrange = calculateLPad(rMid, midrange.attenuationDb);
      allComponents.push({
        id: 'lpad_mid_r1',
        name: 'Midrange L-Pad Series Resistor R1',
        type: 'resistor',
        valueFormatted: `${lpadMidrange.rSeriesOhm.toFixed(2)} Ω`,
        valueNumeric: lpadMidrange.rSeriesOhm,
        unit: 'Ω',
        voltagePowerRating: '15W Non-Inductive Ceramic',
        purpose: `Midrange series attenuation (-${midrange.attenuationDb}dB level match)`,
      });
      allComponents.push({
        id: 'lpad_mid_r2',
        name: 'Midrange L-Pad Parallel Resistor R2',
        type: 'resistor',
        valueFormatted: `${lpadMidrange.rParallelOhm.toFixed(2)} Ω`,
        valueNumeric: lpadMidrange.rParallelOhm,
        unit: 'Ω',
        voltagePowerRating: '15W Non-Inductive Ceramic',
        purpose: `Midrange parallel impedance compensation (-${midrange.attenuationDb}dB)`,
      });
    }
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
  if (enableZobelNetwork && woofer.driver.leMh && woofer.driver.leMh > 0) {
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

  // --- 6. MOTIONAL Fs RESONANCE CONJUGATE TANK ---
  const reVal = woofer.driver.reOhm || rWoofer * 0.75;
  const fsNotchWoofer = calculateMotionalConjugate(
    woofer.driver.fs,
    woofer.driver.qms,
    woofer.driver.qes,
    reVal
  );
  if (enableFsNotchTank) {
    allComponents.push({
      id: 'fs_notch_r',
      name: 'Motional Fs Tank Resistor Rc',
      type: 'resistor',
      valueFormatted: `${fsNotchWoofer.rcOhm.toFixed(2)} Ω`,
      valueNumeric: fsNotchWoofer.rcOhm,
      unit: 'Ω',
      voltagePowerRating: '25W Non-Inductive Wirewound',
      purpose: `Damps fundamental resonance impedance peak at Fs = ${woofer.driver.fs}Hz`,
    });
    allComponents.push({
      id: 'fs_notch_c',
      name: 'Motional Fs Tank Capacitor Cc',
      type: 'capacitor',
      valueFormatted: `${fsNotchWoofer.ccUf.toFixed(1)} µF`,
      valueNumeric: fsNotchWoofer.ccUf,
      unit: 'µF',
      voltagePowerRating: '100V Bipolar Electrolytic',
      purpose: `Resonates with Lc at ${woofer.driver.fs}Hz to linearize impedance`,
    });
    allComponents.push({
      id: 'fs_notch_l',
      name: 'Motional Fs Tank Inductor Lc',
      type: 'inductor',
      valueFormatted: `${fsNotchWoofer.lcMh.toFixed(2)} mH`,
      valueNumeric: fsNotchWoofer.lcMh,
      unit: 'mH',
      voltagePowerRating: '150W Laminated Steel Core',
      purpose: `Parallel RLC conjugate tank inductor tuned to ${woofer.driver.fs}Hz`,
    });
  }

  // --- 7. BAFFLE STEP COMPENSATION (BSC) CONTOUR SHELF ---
  const baffleStepWoofer = calculateBaffleStepCompensation(baffleWidthMm, rWoofer, 4.5);
  if (enableBaffleStepComp) {
    allComponents.push({
      id: 'bsc_l',
      name: 'Baffle Step Contour Inductor L_bsc',
      type: 'inductor',
      valueFormatted: `${baffleStepWoofer.lBscMh.toFixed(2)} mH`,
      valueNumeric: baffleStepWoofer.lBscMh,
      unit: 'mH',
      voltagePowerRating: '150W Air/Ferrite Core 14AWG',
      purpose: `4π→2π diffraction transition shelf at f_step = ${baffleStepWoofer.fStepHz}Hz (${baffleWidthMm}mm baffle)`,
    });
    allComponents.push({
      id: 'bsc_r',
      name: 'Baffle Step Contour Resistor R_bsc',
      type: 'resistor',
      valueFormatted: `${baffleStepWoofer.rBscOhm.toFixed(2)} Ω`,
      valueNumeric: baffleStepWoofer.rBscOhm,
      unit: 'Ω',
      voltagePowerRating: '20W Non-Inductive Ceramic',
      purpose: `Sets 4.5dB mid-high contour shelf above ${baffleStepWoofer.fStepHz}Hz`,
    });
  }

  // --- 8. CD HORN HF BYPASS CAPACITOR ---
  const rSeriesForHorn = lpadTweeter ? lpadTweeter.rSeriesOhm : 3.3;
  const cbUf = calculateCdHornBypassCapacitor(rSeriesForHorn, 3500);
  const cdHornBypassTweeter = { cbUf, fMassBreakpointHz: 3500 };
  if (enableCdHornBypass && cbUf > 0) {
    allComponents.push({
      id: 'cd_horn_cb',
      name: 'CD Horn HF Bypass Capacitor Cb',
      type: 'capacitor',
      valueFormatted: `${cbUf.toFixed(2)} µF`,
      valueNumeric: cbUf,
      unit: 'µF',
      voltagePowerRating: '400V Polypropylene Film & Foil',
      purpose: 'Bypasses L-Pad series resistor above 3.5kHz to restore +6dB/oct CD horn mass-breakpoint roll-off',
    });
  }

  const estimatedPcbAreaCm2 = Math.round(allComponents.length * 18 + 40);

  return {
    tweeterHighPass,
    midrangeBandPass: topology === 'three_way' ? midrangeBandPass : undefined,
    wooferLowPass,
    lpadTweeter,
    lpadMidrange,
    zobelWoofer,
    fsNotchWoofer,
    baffleStepWoofer,
    cdHornBypassTweeter,
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

/**
 * Calculates parallel R-L-C motional resonance conjugate to neutralize fundamental impedance peak at Fs
 * Formula per Engineering Blueprint:
 * Rmax = Re * (1 + Qms/Qes)
 * Rc = Re + Re^2 / (Rmax - Re)
 * Cc = Qms / [2π * Fs * (Rmax - Re)]
 * Lc = 1 / [(2π * Fs)^2 * Cc]
 */
export function calculateMotionalConjugate(fsHz: number, qms: number, qes: number, reOhm: number) {
  const safeFs = Math.max(10, fsHz);
  const safeQes = Math.max(0.05, qes);
  const rMax = reOhm * (1 + qms / safeQes);
  const deltaR = Math.max(0.1, rMax - reOhm);
  const rc = reOhm + (reOhm * reOhm) / deltaR;
  const ccFarads = qms / (2 * Math.PI * safeFs * deltaR);
  const ccUf = ccFarads * 1e6;
  const lcHenries = 1 / (Math.pow(2 * Math.PI * safeFs, 2) * ccFarads);
  const lcMh = lcHenries * 1000;
  return {
    rcOhm: Math.round(rc * 100) / 100,
    ccUf: Math.round(ccUf * 10) / 10,
    lcMh: Math.round(lcMh * 100) / 100,
    rMaxOhm: Math.round(rMax * 100) / 100,
  };
}

/**
 * Calculates Constant Directivity (CD) Horn High-Frequency Bypass Capacitor Cb
 * Formula per Engineering Blueprint:
 * Cb = 1 / (2π * R1 * f_mass_breakpoint)
 * Restores +6dB/octave top-octave air for compression drivers mounted on CD horns.
 */
export function calculateCdHornBypassCapacitor(rSeriesOhm: number, fMassBreakpointHz: number = 3500) {
  if (rSeriesOhm <= 0 || fMassBreakpointHz <= 0) return 0;
  const cbUf = (1 / (2 * Math.PI * rSeriesOhm * fMassBreakpointHz)) * 1e6;
  return Math.round(cbUf * 100) / 100;
}

/**
 * Calculates Baffle Step Compensation (BSC) Shelving Filter
 * Transition frequency: f_step = 115 / W_b (meters)
 * Series RL filter in woofer signal path.
 */
export function calculateBaffleStepCompensation(
  baffleWidthMm: number,
  wooferImpedanceOhm: number,
  compensationDb: number = 6
) {
  const baffleWidthMeters = Math.max(0.05, baffleWidthMm / 1000);
  const fStepHz = Math.round(115 / baffleWidthMeters);
  const safeCompDb = Math.min(6, Math.max(1, compensationDb));
  const rBsc = wooferImpedanceOhm * (Math.pow(10, safeCompDb / 20) - 1);
  const lBscMh = (wooferImpedanceOhm / (2 * Math.PI * fStepHz)) * 1000;
  return {
    fStepHz,
    rBscOhm: Math.round(rBsc * 100) / 100,
    lBscMh: Math.round(lBscMh * 100) / 100,
  };
}

