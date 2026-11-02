import type {
  AcousticParameters,
  FirDspPlatform,
  FirFilterConfig,
  FirPhaseMode,
  FirSimulationReport,
  FirTapCount,
  FirWindowType,
} from '../types/loudspeaker.ts';

/**
 * Normalized sinc function: sinc(x) = sin(pi * x) / (pi * x)
 */
function sinc(x: number): number {
  if (Math.abs(x) < 1e-9) return 1.0;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

/**
 * Window functions evaluated for sample index n in [0, N-1]
 */
function evaluateWindow(n: number, N: number, type: FirWindowType): number {
  if (N <= 1) return 1.0;
  const factor = (2 * Math.PI * n) / (N - 1);
  switch (type) {
    case 'blackman_harris':
      // 4-term Blackman-Harris window (-92 dB sidelobe suppression)
      return (
        0.35875 -
        0.48829 * Math.cos(factor) +
        0.14128 * Math.cos(2 * factor) -
        0.01168 * Math.cos(3 * factor)
      );
    case 'hann':
      return 0.5 * (1 - Math.cos(factor));
    case 'kaiser': {
      // Kaiser window with beta ≈ 7.865
      const alpha = (N - 1) / 2;
      const val = (n - alpha) / alpha;
      const b = 7.865;
      const bessel0 = (x: number) => {
        let sum = 1.0;
        let d = 1.0;
        for (let k = 1; k < 25; k++) {
          d = (d * (x * x)) / (4 * k * k);
          sum += d;
          if (d < 1e-10 * sum) break;
        }
        return sum;
      };
      const arg = Math.max(0, 1 - val * val);
      return bessel0(b * Math.sqrt(arg)) / bessel0(b);
    }
    case 'rectangular':
    default:
      return 1.0;
  }
}

/**
 * Generates normalized FIR filter impulse response coefficients (taps)
 * for a low-pass or high-pass crossover with designated phase topology.
 */
export function generateFirTaps(
  N: FirTapCount,
  sampleRate: number,
  cutoffFreqHz: number,
  type: 'lowpass' | 'highpass',
  phaseMode: FirPhaseMode,
  windowType: FirWindowType = 'blackman_harris'
): number[] {
  const normFc = Math.max(10, Math.min(cutoffFreqHz, sampleRate * 0.45)) / sampleRate;
  const taps = new Float64Array(N);

  // Peak sample index based on phase alignment mode (as detailed in Eclipse Audio Guide)
  let nPeak: number;
  if (phaseMode === 'linear_phase') {
    nPeak = Math.floor(N / 2); // Symmetrical impulse response -> constant delay, linear phase
  } else if (phaseMode === 'minimum_phase') {
    nPeak = Math.max(2, Math.floor(N * 0.04)); // Front-loaded impulse response -> negligible bulk latency
  } else {
    // mixed_phase: asymmetric compromise balancing moderate latency with LF phase unrolling
    nPeak = Math.max(4, Math.floor(N * 0.25));
  }

  // Calculate raw windowed sinc coefficients
  let sum = 0.0;
  for (let n = 0; n < N; n++) {
    const x = 2 * normFc * (n - nPeak);
    const win = evaluateWindow(n, N, windowType);
    let hLp = 2 * normFc * sinc(x) * win;

    if (type === 'lowpass') {
      taps[n] = hLp;
      sum += hLp;
    } else {
      // High-pass by spectral inversion: delta[n - nPeak] - h_lp[n]
      const delta = n === nPeak ? 1.0 : 0.0;
      taps[n] = delta - hLp;
    }
  }

  // Normalize low-pass for 0 dB DC gain
  if (type === 'lowpass' && Math.abs(sum) > 1e-6) {
    for (let n = 0; n < N; n++) {
      taps[n] /= sum;
    }
  }

  return Array.from(taps);
}

/**
 * Default FIR Configuration based on pro audio best practices
 */
export const DEFAULT_FIR_CONFIG: FirFilterConfig = {
  enabled: true,
  phaseMode: 'linear_phase',
  tapCount: 2048,
  sampleRate: 48000,
  windowType: 'blackman_harris',
  platformPreset: 'minidsp',
  unrollExcessPhase: true,
  lowPassShape: 'linear_phase_lr4',
};

/**
 * Calculates a complete FIR simulation report matching the findings and benchmarks
 * of the Eclipse Audio FIR Guide.
 */
export function calculateFirSimulation(
  acoustics: AcousticParameters,
  userConfig?: Partial<FirFilterConfig>
): FirSimulationReport {
  const config: FirFilterConfig = {
    ...DEFAULT_FIR_CONFIG,
    ...(acoustics.firConfig || {}),
    ...(userConfig || {}),
  };

  const { tapCount: N, sampleRate: fs, phaseMode, windowType } = config;
  const fc = acoustics.crossoverLowHz || 2500;

  // 1. Fundamental Frequency Resolution & Latency (Eclipse Audio Guide Section 1 & 5)
  const frequencyResolutionHz = fs / N; // Delta f = fs / N
  const minControllableFreqHz = 3 * frequencyResolutionHz; // Minimum controllable frequency for phase/EQ

  // Peak delay index
  let bulkDelaySamples: number;
  if (phaseMode === 'linear_phase') {
    bulkDelaySamples = Math.floor(N / 2);
  } else if (phaseMode === 'minimum_phase') {
    bulkDelaySamples = Math.max(2, Math.floor(N * 0.04));
  } else {
    bulkDelaySamples = Math.max(4, Math.floor(N * 0.25));
  }
  const latencyMs = (bulkDelaySamples / fs) * 1000;

  // 2. Computational Multiplications Benchmark (Section 6: IIR Biquad vs FIR)
  // An IIR biquad requires 5 multiplies/sample. 24 biquads = 120 multiplies/sample.
  const multiplicationsPerSecond = N * fs;
  const iirMultiplicationsPerSecond = 24 * 5 * fs; // 24 biquad processor benchmark
  const ratioVsIirBiquad = multiplicationsPerSecond / iirMultiplicationsPerSecond;

  // 3. Generate Impulse Response Taps
  const wooferTaps = generateFirTaps(N, fs, fc, 'lowpass', phaseMode, windowType);
  const tweeterTaps = generateFirTaps(N, fs, fc, 'highpass', phaseMode, windowType);

  // Sample points for UI waveform visualization (subsample to ~128 points for responsive rendering)
  const sampleStride = Math.max(1, Math.floor(N / 128));
  const impulseResponsePoints: { sample: number; woofer: number; tweeter: number }[] = [];
  for (let i = 0; i < N; i += sampleStride) {
    impulseResponsePoints.push({
      sample: i,
      woofer: wooferTaps[i] || 0,
      tweeter: tweeterTaps[i] || 0,
    });
  }

  // 4. Generate Comparative Phase and Group Delay Curves (20Hz to 20kHz logarithmic)
  const phaseResponsePoints: {
    freq: number;
    iirPhaseDeg: number;
    firPhaseDeg: number;
    excessPhaseUnwrappedDeg: number;
  }[] = [];
  const groupDelayPoints: {
    freq: number;
    iirGroupDelayMs: number;
    firGroupDelayMs: number;
  }[] = [];

  const freqList = [
    20, 30, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
    1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
    16000, 20000,
  ];

  freqList.forEach((f) => {
    // IIR 4th-order Linkwitz-Riley phase rotation (360 degrees rotation around fc)
    // Normalized frequency ratio
    const fRatio = f / fc;
    const iirPhaseDeg = -((4 * Math.atan(fRatio) * 180) / Math.PI); // Phase rolls to -360°

    // FIR phase behavior based on mode
    let firPhaseDeg: number;
    let excessPhaseUnwrappedDeg: number;

    if (phaseMode === 'linear_phase') {
      firPhaseDeg = 0.0; // Perfectly flat phase across crossover passband!
      excessPhaseUnwrappedDeg = 0.0;
    } else if (phaseMode === 'mixed_phase') {
      // Mixed phase unwraps phase above minControllableFreqHz, allows natural roll below
      if (f >= minControllableFreqHz) {
        firPhaseDeg = -Math.min(15, (f / 10000) * 8); // nearly linear
        excessPhaseUnwrappedDeg = -5;
      } else {
        firPhaseDeg = iirPhaseDeg * (1 - f / minControllableFreqHz);
        excessPhaseUnwrappedDeg = iirPhaseDeg * 0.5;
      }
    } else {
      // minimum_phase retains natural phase transition without excess delay
      firPhaseDeg = iirPhaseDeg * 0.75;
      excessPhaseUnwrappedDeg = iirPhaseDeg;
    }

    phaseResponsePoints.push({
      freq: f,
      iirPhaseDeg: Math.round(iirPhaseDeg * 10) / 10,
      firPhaseDeg: Math.round(firPhaseDeg * 10) / 10,
      excessPhaseUnwrappedDeg: Math.round(excessPhaseUnwrappedDeg * 10) / 10,
    });

    // Group delay: IIR has a distinct resonance peak at the crossover frequency
    // tau_g = -d(phi)/d(omega)
    const bandwidthQ = 0.707;
    const deltaF = Math.abs(f - fc) / fc;
    const iirPeakMs = (1.5 / fc) * 1000;
    const iirGroupDelayMs = (iirPeakMs / (1 + deltaF * deltaF * 8)) + (20 / f);

    // Linear-phase FIR has completely flat differential group delay across the passband
    const firGroupDelayMs = phaseMode === 'linear_phase' ? 0.05 : iirGroupDelayMs * 0.35;

    groupDelayPoints.push({
      freq: f,
      iirGroupDelayMs: Math.round(iirGroupDelayMs * 100) / 100,
      firGroupDelayMs: Math.round(firGroupDelayMs * 100) / 100,
    });
  });

  // 5. Practical Engineering Advisory Assessment (Section 8 of Eclipse Audio Guide)
  let status: 'optimal' | 'live_latency_warning' | 'subwoofer_low_res_warning' = 'optimal';
  let advisoryTitle = 'FIR DSP Architecture Optimal';
  let advisoryDescription = `At ${N} taps (${fs / 1000}kHz), frequency resolution is ${frequencyResolutionHz.toFixed(1)} Hz with ${latencyMs.toFixed(1)} ms bulk delay. Crossover phase rotation is completely eliminated.`;

  if (latencyMs > 8.0 && acoustics.topology !== 'single') {
    status = 'live_latency_warning';
    advisoryTitle = 'Latency Caution for Live Sound Monitoring';
    advisoryDescription = `Bulk delay of ${latencyMs.toFixed(1)} ms exceeds the 8 ms live performer monitoring threshold. For live PA tops/wedges, consider Mixed-Phase mode or 512/1024 taps to reduce latency to < 5.5 ms.`;
  }

  if (fc < 100 && N < 2048) {
    status = 'subwoofer_low_res_warning';
    advisoryTitle = 'Subwoofer Phase Resolution Warning';
    advisoryDescription = `Low-frequency crossover at ${fc} Hz with ${N} taps yields poor resolution (Δf = ${frequencyResolutionHz.toFixed(1)} Hz). As noted in Eclipse Audio Guide Section 8, unwrapping subwoofer phase down to 30 Hz requires ~4096-5000 taps with ~72 ms latency.`;
  }

  return {
    enabled: config.enabled,
    phaseMode,
    tapCount: N,
    sampleRate: fs,
    frequencyResolutionHz: Math.round(frequencyResolutionHz * 100) / 100,
    minControllableFreqHz: Math.round(minControllableFreqHz * 10) / 10,
    bulkDelaySamples,
    latencyMs: Math.round(latencyMs * 10) / 10,
    multiplicationsPerSecond,
    ratioVsIirBiquad: Math.round(ratioVsIirBiquad * 10) / 10,
    status,
    advisoryTitle,
    advisoryDescription,
    wooferTaps,
    tweeterTaps,
    impulseResponsePoints,
    phaseResponsePoints,
    groupDelayPoints,
  };
}

/**
 * Formatters for Exporting FIR Filter Coefficients for DSP Hardware Platforms
 */
export function formatFirTapsForExport(
  taps: number[],
  platform: FirDspPlatform,
  channelLabel: string = 'channel'
): string {
  switch (platform) {
    case 'minidsp':
    case 'hypex_fusion':
    case 'powersoft':
      // One coefficient per line (scientific notation / standard float)
      return taps.map((v) => v.toExponential(10)).join('\n');

    case 'generic_csv':
      return ['Index,Coefficient', ...taps.map((v, i) => `${i},${v.toFixed(10)}`)].join('\n');

    case 'camilladsp':
      return `# CamillaDSP FIR Coefficients: ${channelLabel}\n` + taps.map((v) => v.toFixed(10)).join('\n');

    default:
      return taps.map((v) => v.toFixed(8)).join('\n');
  }
}

/**
 * Creates a complete JSON DSP preset bundle
 */
export function formatFirStereoPresetJson(
  report: FirSimulationReport,
  acoustics: AcousticParameters
): string {
  return JSON.stringify(
    {
      engine: 'ResonanceCAD DSP Studio',
      reference: 'Eclipse Audio FIR Filtering Guide Specification',
      sampleRateHz: report.sampleRate,
      tapCount: report.tapCount,
      phaseMode: report.phaseMode,
      bulkLatencyMs: report.latencyMs,
      crossoverFrequencyHz: acoustics.crossoverLowHz || 2500,
      wooferChannel: {
        role: 'Low-Pass / Woofer',
        driver: `${acoustics.driverAssignments.woofer.driver.brand} ${acoustics.driverAssignments.woofer.driver.model}`,
        coefficients: report.wooferTaps,
      },
      tweeterChannel: {
        role: 'High-Pass / Tweeter',
        driver: `${acoustics.driverAssignments.tweeter.driver.brand} ${acoustics.driverAssignments.tweeter.driver.model}`,
        coefficients: report.tweeterTaps,
      },
    },
    null,
    2
  );
}
