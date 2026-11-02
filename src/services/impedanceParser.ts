import type {
  AcousticParameters,
  AlignmentType,
  DriverImpedanceDataset,
  DriverPreset,
  ImpedanceCurvePoint,
  SystemImpedanceReport,
} from '../types/loudspeaker.ts';

/**
 * Parses raw text from .zma, .txt, .csv, or .tsv loudspeaker impedance measurement files.
 * Supports Dayton Audio DATS, Clio, REW, Loudspeaker LAB, and generic CAD measurement exports.
 */
export function parseImpedanceFile(fileContent: string, filename = 'custom_driver_impedance.zma'): DriverImpedanceDataset {
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('Impedance measurement file content is empty.');
  }

  const lines = fileContent.split(/\r?\n/);
  const rawPoints: { freq: number; mag: number; phase: number }[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;

    // Skip comment lines in standard formats (*, ;, #, //, !)
    const firstChar = rawLine.charAt(0);
    if (firstChar === '*' || firstChar === ';' || firstChar === '#' || firstChar === '!' || rawLine.startsWith('//')) {
      continue;
    }

    // Split on commas, tabs, semicolons, or contiguous whitespace
    const tokens = rawLine
      .split(/[,;\t\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length < 2) continue;

    const freq = parseFloat(tokens[0]);
    const mag = parseFloat(tokens[1]);
    const phase = tokens.length >= 3 ? parseFloat(tokens[2]) : 0;

    // Sanity checks: realistic frequency (5 Hz to 50 kHz) and positive impedance magnitude (0.1 to 5000 Ohms)
    if (
      !isNaN(freq) &&
      !isNaN(mag) &&
      freq >= 5 &&
      freq <= 50000 &&
      mag >= 0.1 &&
      mag <= 5000
    ) {
      const validPhase = isNaN(phase) ? 0 : Math.max(-180, Math.min(180, phase));
      rawPoints.push({ freq, mag, phase: validPhase });
    }
  }

  if (rawPoints.length < 5) {
    throw new Error(
      `File "${filename}" contains only ${rawPoints.length} valid data points. Expected at least 5 frequency/impedance rows.`
    );
  }

  // Sort ascending by frequency
  rawPoints.sort((a, b) => a.freq - b.freq);

  // Eliminate duplicate or zero-spaced frequencies
  const points: ImpedanceCurvePoint[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    if (i === 0 || curr.freq > rawPoints[i - 1].freq + 0.01) {
      const rad = (curr.phase * Math.PI) / 180;
      const reOhm = Math.round(curr.mag * Math.cos(rad) * 100) / 100;
      const imOhm = Math.round(curr.mag * Math.sin(rad) * 100) / 100;
      points.push({
        freq: Math.round(curr.freq * 10) / 10,
        magnitudeOhm: Math.round(curr.mag * 100) / 100,
        phaseDeg: Math.round(curr.phase * 10) / 10,
        reOhm,
        imOhm,
      });
    }
  }

  // Find resonance peak Fs (highest magnitude below 250 Hz)
  let peakMag = 0;
  let peakFreq = points[0].freq;
  for (const pt of points) {
    if (pt.freq <= 250 && pt.magnitudeOhm > peakMag) {
      peakMag = pt.magnitudeOhm;
      peakFreq = pt.freq;
    }
  }

  // Estimate DC resistance Re (minimum impedance below 350 Hz or in passband)
  let minMag = Infinity;
  for (const pt of points) {
    if (pt.freq >= 5 && pt.freq <= 400 && pt.magnitudeOhm < minMag) {
      minMag = pt.magnitudeOhm;
    }
  }
  if (!isFinite(minMag) || minMag <= 0) minMag = 5.6;

  // Approximate voice coil inductance Le at 10 kHz (Le = Im(Z) / (2 * pi * f))
  let estimatedLeMh = 0.35;
  const pt10k = points.find((p) => p.freq >= 8000 && p.freq <= 12000) || points[points.length - 1];
  if (pt10k && pt10k.freq > 1000) {
    const omega = 2 * Math.PI * pt10k.freq;
    const react = Math.sqrt(Math.max(0, Math.pow(pt10k.magnitudeOhm, 2) - Math.pow(minMag, 2)));
    estimatedLeMh = Math.round(((react / omega) * 1000) * 100) / 100;
  }

  return {
    source: filename.toLowerCase().endsWith('.zma') ? 'dats_measurement' : 'uploaded_file',
    filename,
    measuredReOhm: Math.round(minMag * 100) / 100,
    measuredLeMh: Math.max(0.01, estimatedLeMh),
    measuredFsHz: Math.round(peakFreq * 10) / 10,
    peakImpedanceOhm: Math.round(peakMag * 100) / 100,
    minImpedanceOhm: Math.round(minMag * 100) / 100,
    points,
  };
}

/**
 * Standard logarithmic frequency generator between minHz and maxHz.
 */
export function generateLogFrequencies(minHz = 10, maxHz = 20000, pointsCount = 120): number[] {
  const logMin = Math.log10(minHz);
  const logMax = Math.log10(maxHz);
  const freqs: number[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const f = Math.pow(10, logMin + (i / (pointsCount - 1)) * (logMax - logMin));
    freqs.push(Math.round(f * 10) / 10);
  }
  return freqs;
}

/**
 * Procedurally generates an analytical free-air loudspeaker driver impedance curve
 * based on Thiele-Small parameters (Re, Le, Fs, Qms, Qes).
 * Uses the classical Leach/Small equivalent motional circuit.
 */
export function generateAnalyticDriverImpedance(
  driver: DriverPreset,
  customFreqs?: number[]
): ImpedanceCurvePoint[] {
  const freqs = customFreqs || generateLogFrequencies(10, 20000, 120);

  const re = driver.reOhm || (driver.nominalDiameterInch >= 12 ? 5.6 : 3.6);
  const leH = (driver.leMh || 0.45) * 1e-3;
  const fs = Math.max(10, driver.fs);
  const qms = Math.max(0.5, driver.qms || 4.2);
  const qes = Math.max(0.1, driver.qes || 0.38);

  // Motional resistance at resonance: Res = Re * (Qms / Qes)
  const res = re * (qms / qes);

  return freqs.map((f) => {
    const omega = 2 * Math.PI * f;

    // 1. Voice coil blocked impedance: Ze(f) = Re + j * omega * Le * (semi-inductance eddy factor)
    // Wright/Leach semi-inductance empirical power ~0.85
    const eddyFactor = Math.pow(Math.max(1, f / 1000), 0.82);
    const zeReal = re;
    const zeImag = omega * leH * eddyFactor;

    // 2. Motional impedance: Zm(f) = Res / [1 + j * Qms * (f/Fs - Fs/f)]
    const norm = f / fs - fs / f;
    const denomReal = 1.0;
    const denomImag = qms * norm;
    const denomMagSq = denomReal * denomReal + denomImag * denomImag;

    const zmReal = (res * denomReal) / denomMagSq;
    const zmImag = (-res * denomImag) / denomMagSq;

    // Total impedance: Z_total = Ze + Zm
    const totalReal = zeReal + zmReal;
    const totalImag = zeImag + zmImag;
    const magnitude = Math.sqrt(totalReal * totalReal + totalImag * totalImag);
    const phaseDeg = (Math.atan2(totalImag, totalReal) * 180) / Math.PI;

    return {
      freq: f,
      magnitudeOhm: Math.round(magnitude * 100) / 100,
      phaseDeg: Math.round(phaseDeg * 10) / 10,
      reOhm: Math.round(totalReal * 100) / 100,
      imOhm: Math.round(totalImag * 100) / 100,
    };
  });
}

/**
 * Generates a realistic measured DATS curve dataset for any driver preset.
 */
export function generateSampleDatsImpedance(driver: DriverPreset): DriverImpedanceDataset {
  const freqs = generateLogFrequencies(10, 20000, 140);
  const analytic = generateAnalyticDriverImpedance(driver, freqs);

  const points: ImpedanceCurvePoint[] = analytic.map((p) => {
    // Inject ultra-subtle measurement realism (micro-resonances from cone surround compliance at high frequencies)
    const wobble = p.freq > 800 ? Math.sin(Math.log(p.freq) * 14) * 0.15 : 0;
    const mag = Math.max(0.5, p.magnitudeOhm + wobble);
    const rad = (p.phaseDeg * Math.PI) / 180;
    return {
      freq: p.freq,
      magnitudeOhm: Math.round(mag * 100) / 100,
      phaseDeg: p.phaseDeg,
      reOhm: Math.round(mag * Math.cos(rad) * 100) / 100,
      imOhm: Math.round(mag * Math.sin(rad) * 100) / 100,
    };
  });

  const re = driver.reOhm || 5.6;
  let peakZ = 0;
  for (const pt of points) {
    if (pt.freq <= 200 && pt.magnitudeOhm > peakZ) {
      peakZ = pt.magnitudeOhm;
    }
  }

  return {
    source: 'dats_measurement',
    filename: `${driver.brand.replace(/\s+/g, '_')}_${driver.model.replace(/\s+/g, '_')}_DATS.zma`,
    measuredReOhm: re,
    measuredLeMh: driver.leMh || 0.45,
    measuredFsHz: driver.fs,
    peakImpedanceOhm: Math.round(peakZ * 100) / 100,
    minImpedanceOhm: re,
    points,
  };
}

/**
 * Calculates the complete system electrical impedance curve (magnitude |Z| in Ohms and
 * phase theta in degrees) for the loudspeaker mounted in its enclosure.
 *
 * Implements:
 * - Sealed Box: Single motional resonance shifted up from Fs to Fc = Fs * sqrt(1 + alpha),
 *   where alpha = Vas / Vb. Phase crosses zero at Fc.
 * - Ported Box (Bass Reflex): Dual impedance peaks (f_L and f_H) flanking the Helmholtz
 *   tuning notch at Fb. At Fb, acoustic backpressure suppresses cone excursion, collapsing
 *   motional back-EMF, causing |Z| to plummet to a sharp minimum near Re and phase to cross 0 deg.
 * - Multi-woofer parallel/series scaling.
 * - Voice coil inductance rise at high frequencies.
 */
export function calculateSystemImpedance(
  acoustics: AcousticParameters,
  effectiveVolumeLiters: number,
  activeFb: number,
  boxQtc: number,
  driverOverride?: DriverPreset
): SystemImpedanceReport {
  const woofer = driverOverride || acoustics.driverAssignments.woofer.driver;
  const wooferQty =
    acoustics.topology === 'mtm' ? 2 : acoustics.driverAssignments.woofer.quantity || 1;
  const alignment: AlignmentType = acoustics.alignment || 'ported';

  // Base driver electrical parameters
  const re = woofer.reOhm || (woofer.nominalDiameterInch >= 12 ? 5.6 : 3.6);
  const leH = (woofer.leMh || 0.45) * 1e-3;
  const fs = Math.max(10, woofer.fs);
  const qms = Math.max(0.5, woofer.qms || 4.2);
  const qes = Math.max(0.1, woofer.qes || 0.38);
  const vas = Math.max(1.0, woofer.vas);
  const vb = Math.max(1.0, effectiveVolumeLiters);

  // Free-air curve points for baseline comparison
  const freqs = generateLogFrequencies(10, 20000, 130);
  const freeAirPoints = generateAnalyticDriverImpedance(woofer, freqs);

  const res = re * (qms / qes);
  const alpha = (vas * wooferQty) / vb;

  const points: ImpedanceCurvePoint[] = [];
  let peakImpedanceOhm = 0;
  let minimumImpedanceOhm = Infinity;
  let minImpedanceFreqHz = 100;
  let lowerPeakFlHz: number | undefined;
  let upperPeakFhHz: number | undefined;
  let boxResonanceFcHz: number | undefined;
  let zeroPhaseCrossingHz: number | undefined;

  if (alignment === 'sealed') {
    // Sealed Enclosure: Resonant frequency shifts to Fc
    const fc = fs * Math.sqrt(1 + alpha);
    boxResonanceFcHz = Math.round(fc * 10) / 10;
    const qmc = qms * Math.sqrt(1 + alpha);
    const resBox = res; // Res is identical because Qmc/Qec = Qms/Qes

    freqs.forEach((f) => {
      const omega = 2 * Math.PI * f;
      const eddyFactor = Math.pow(Math.max(1, f / 1000), 0.82);
      const zeReal = re;
      const zeImag = omega * leH * eddyFactor;

      const norm = f / fc - fc / f;
      const denomReal = 1.0;
      const denomImag = qmc * norm;
      const denomMagSq = denomReal * denomReal + denomImag * denomImag;

      const zmReal = (resBox * denomReal) / denomMagSq;
      const zmImag = (-resBox * denomImag) / denomMagSq;

      // Parallel woofers divider
      const scaleDivider = wooferQty === 2 ? 2.0 : 1.0;
      const totalReal = (zeReal + zmReal) / scaleDivider;
      const totalImag = (zeImag + zmImag) / scaleDivider;

      const magnitude = Math.sqrt(totalReal * totalReal + totalImag * totalImag);
      const phaseDeg = (Math.atan2(totalImag, totalReal) * 180) / Math.PI;

      if (magnitude > peakImpedanceOhm) peakImpedanceOhm = magnitude;
      if (f >= 50 && f <= 600 && magnitude < minimumImpedanceOhm) {
        minimumImpedanceOhm = magnitude;
        minImpedanceFreqHz = f;
      }

      points.push({
        freq: f,
        magnitudeOhm: Math.round(magnitude * 100) / 100,
        phaseDeg: Math.round(phaseDeg * 10) / 10,
        reOhm: Math.round(totalReal * 100) / 100,
        imOhm: Math.round(totalImag * 100) / 100,
      });
    });

    zeroPhaseCrossingHz = boxResonanceFcHz;
  } else {
    // Ported Enclosure (Bass Reflex): 4th-order dual-resonance bandpass transfer function
    const fb = Math.max(12, activeFb);
    const qp = 20.0; // Port resonator Q (losses)

    // Estimate the two resonant peaks f_L and f_H analytically
    // (f/Fs)^4 - [1 + (Fb/Fs)^2 * (1 + alpha)] * (f/Fs)^2 + (Fb/Fs)^2 = 0
    const h = fb / fs;
    const bTerm = 1 + h * h * (1 + alpha);
    const disc = bTerm * bTerm - 4 * h * h;
    if (disc > 0) {
      const flNorm = Math.sqrt((bTerm - Math.sqrt(disc)) / 2);
      const fhNorm = Math.sqrt((bTerm + Math.sqrt(disc)) / 2);
      lowerPeakFlHz = Math.round(fs * flNorm * 10) / 10;
      upperPeakFhHz = Math.round(fs * fhNorm * 10) / 10;
    }

    let minNearFbMag = Infinity;
    let minNearFbFreq = fb;

    freqs.forEach((f) => {
      const omega = 2 * Math.PI * f;
      const eddyFactor = Math.pow(Math.max(1, f / 1000), 0.82);
      const zeReal = re;
      const zeImag = omega * leH * eddyFactor;

      // Small-Margolis dual-mesh electroacoustic motional impedance:
      // Zm(s) = Res * Y_p(s) / [Y_s(s) * Y_p(s) + alpha * (s/ws)^2 * ...]
      // In the frequency domain:
      const sNormDriver = f / fs;
      const sNormPort = f / fb;

      // Port admittance term: 1 - sNormPort^2 + j * sNormPort / Qp
      const pReal = 1 - sNormPort * sNormPort;
      const pImag = sNormPort / qp;
      const pMagSq = pReal * pReal + pImag * pImag;

      // Mechanical suspension term: 1 - sNormDriver^2 + j * sNormDriver / Qms
      const sReal = 1 - sNormDriver * sNormDriver;
      const sImag = sNormDriver / qms;

      // Combined denominator: (S * P) + alpha * (-sNormDriver^2) * (P - 1)
      const spReal = sReal * pReal - sImag * pImag;
      const spImag = sReal * pImag + sImag * pReal;

      // Coupling term through enclosure acoustic compliance (alpha)
      const couplingReal = -alpha * sNormDriver * sNormDriver * (pReal - 1);
      const couplingImag = -alpha * sNormDriver * sNormDriver * pImag;

      const dReal = spReal + couplingReal;
      const dImag = spImag + couplingImag;
      const dMagSq = Math.max(1e-6, dReal * dReal + dImag * dImag);

      // Zm = Res * (P / D)
      const numReal = res * (pReal * dReal + pImag * dImag);
      const numImag = res * (pImag * dReal - pReal * dImag);

      const zmReal = numReal / dMagSq;
      const zmImag = numImag / dMagSq;

      const scaleDivider = wooferQty === 2 ? 2.0 : 1.0;
      const totalReal = (zeReal + zmReal) / scaleDivider;
      const totalImag = (zeImag + zmImag) / scaleDivider;

      const magnitude = Math.sqrt(totalReal * totalReal + totalImag * totalImag);
      const phaseDeg = (Math.atan2(totalImag, totalReal) * 180) / Math.PI;

      if (magnitude > peakImpedanceOhm) peakImpedanceOhm = magnitude;
      if (Math.abs(f - fb) < Math.abs(minNearFbFreq - fb) || (f >= fb * 0.7 && f <= fb * 1.3 && magnitude < minNearFbMag)) {
        minNearFbMag = magnitude;
        minNearFbFreq = f;
      }
      if (f >= 50 && f <= 800 && magnitude < minimumImpedanceOhm) {
        minimumImpedanceOhm = magnitude;
        minImpedanceFreqHz = f;
      }

      points.push({
        freq: f,
        magnitudeOhm: Math.round(magnitude * 100) / 100,
        phaseDeg: Math.round(phaseDeg * 10) / 10,
        reOhm: Math.round(totalReal * 100) / 100,
        imOhm: Math.round(totalImag * 100) / 100,
      });
    });

    zeroPhaseCrossingHz = fb;
  }

  // Calculate standard nominal impedance (4, 8, or 16 Ohms)
  const safeMin = isFinite(minimumImpedanceOhm) ? minimumImpedanceOhm : re / (wooferQty === 2 ? 2 : 1);
  const nominalImpedanceOhm = safeMin < 3.2 ? 2 : safeMin < 6.2 ? 4 : safeMin < 12.0 ? 8 : 16;

  return {
    alignment,
    minimumImpedanceOhm: Math.round(safeMin * 100) / 100,
    minImpedanceFreqHz: Math.round(minImpedanceFreqHz),
    nominalImpedanceOhm,
    freeAirResonanceFsHz: Math.round(fs * 10) / 10,
    boxResonanceFcHz,
    portTuningFbHz: alignment === 'ported' ? Math.round(activeFb * 10) / 10 : undefined,
    lowerPeakFlHz,
    upperPeakFhHz,
    peakImpedanceOhm: Math.round(peakImpedanceOhm * 100) / 100,
    zeroPhaseCrossingHz,
    points,
    freeAirPoints,
  };
}
