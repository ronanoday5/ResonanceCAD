import React, { useMemo, useState } from 'react';
import type {
  AcousticParameters,
  CrossoverNetworkResult,
  FilterOrder,
  FilterType,
  FirDspPlatform,
  FirPhaseMode,
  FirSimulationReport,
  FirTapCount,
  FirWindowType,
} from '../types/loudspeaker.ts';
import {
  calculateFirSimulation,
  formatFirStereoPresetJson,
  formatFirTapsForExport,
} from '../services/firFilterEngine.ts';
import {
  calculateBaffleStepCompensation,
  calculateCdHornBypassCapacitor,
  calculateMotionalConjugate,
} from '../services/crossoverEngine.ts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Download,
  FileCode,
  Gauge,
  Layers,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';

interface CrossoverDesignerProps {
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  crossoverResults: CrossoverNetworkResult;
  firReport?: FirSimulationReport;
  onOpenPcbWorkspace?: () => void;
}

export const CrossoverDesigner: React.FC<CrossoverDesignerProps> = ({
  acoustics,
  setAcoustics,
  crossoverResults,
  firReport: initialFirReport,
  onOpenPcbWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'fir_dsp' | 'passive_iir'>('fir_dsp');
  const [visualizationMode, setVisualizationMode] = useState<'impulse' | 'phase' | 'group_delay'>('phase');
  const [selectedPlatform, setSelectedPlatform] = useState<FirDspPlatform>('minidsp');

  const {
    topology,
    driverAssignments,
    crossoverLowHz,
    crossoverHighHz,
    lowPassOrder,
    lowPassType,
    highPassOrder,
    highPassType,
    firConfig,
  } = acoustics;

  // Active FIR configuration with fallback defaults
  const currentFirConfig = useMemo(() => {
    return {
      enabled: firConfig?.enabled ?? true,
      phaseMode: firConfig?.phaseMode ?? ('linear_phase' as FirPhaseMode),
      tapCount: firConfig?.tapCount ?? (2048 as FirTapCount),
      sampleRate: firConfig?.sampleRate ?? 48000,
      windowType: firConfig?.windowType ?? ('blackman_harris' as FirWindowType),
      platformPreset: firConfig?.platformPreset ?? selectedPlatform,
      unrollExcessPhase: firConfig?.unrollExcessPhase ?? true,
      lowPassShape: firConfig?.lowPassShape ?? 'linear_phase_lr4',
    };
  }, [firConfig, selectedPlatform]);

  // Real-time calculated FIR report based on current acoustics
  const firReport = useMemo(() => {
    return calculateFirSimulation(acoustics, currentFirConfig);
  }, [acoustics, currentFirConfig]);

  // Passive Loudspeaker Electronics Blueprint Conjugate Synthesis Diagnostics
  const blueprintDiagnostics = useMemo(() => {
    const tw = driverAssignments.tweeter.driver;
    const wf = driverAssignments.woofer.driver;
    const twRe = tw.reOhm || (driverAssignments.tweeter.impedanceOhm || 8) * 0.78;
    const motionalTank = calculateMotionalConjugate(
      tw.fs || 900,
      tw.qms || 3.8,
      tw.qes || Math.max(0.25, tw.qts * 1.15),
      twRe
    );
    const lpadR1 = crossoverResults.lpadTweeter?.rSeriesOhm || 2.5;
    const cdBypassCapUf = calculateCdHornBypassCapacitor(lpadR1, 3500);
    const bsc = calculateBaffleStepCompensation(330, driverAssignments.woofer.impedanceOhm || 8, 6);
    const zobelRe = wf.reOhm || (driverAssignments.woofer.impedanceOhm || 8) * 0.75;
    const zobelRz = Math.round(1.25 * zobelRe * 100) / 100;
    const zobelCz = Math.round((((wf.leMh || 0.8) * 1e-3) / (zobelRz * zobelRz)) * 1e6 * 10) / 10;

    return {
      motionalTank,
      cdBypassCapUf,
      bsc,
      zobelRz,
      zobelCz,
    };
  }, [driverAssignments, crossoverResults]);

  const updateFirConfig = (updates: Partial<typeof currentFirConfig>) => {
    setAcoustics((prev) => ({
      ...prev,
      firConfig: {
        ...(prev.firConfig || currentFirConfig),
        ...updates,
      },
    }));
  };

  const handleDriverAttenuation = (role: 'tweeter' | 'midrange', db: number) => {
    setAcoustics((prev) => ({
      ...prev,
      driverAssignments: {
        ...prev.driverAssignments,
        [role]: {
          ...prev.driverAssignments[role],
          attenuationDb: db,
        },
      },
    }));
  };

  const handleDownloadTaps = (role: 'woofer' | 'tweeter') => {
    const taps = role === 'woofer' ? firReport.wooferTaps : firReport.tweeterTaps;
    const text = formatFirTapsForExport(taps, selectedPlatform, role);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${role}_fir_${currentFirConfig.tapCount}taps_${currentFirConfig.sampleRate}hz_${currentFirConfig.phaseMode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPresetJson = () => {
    const json = formatFirStereoPresetJson(firReport, acoustics);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resonancecad_fir_preset_${currentFirConfig.tapCount}taps_${currentFirConfig.phaseMode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-sans text-slate-200 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-slate-100 uppercase tracking-wider font-mono">
                Crossover & Audio FIR DSP Studio
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                Eclipse Audio FIR Guide Certified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate finite impulse response (FIR) filtering, linear-phase crossovers, and passive RLC filter networks.
            </p>
          </div>
        </div>

        {/* Studio Tab Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('fir_dsp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeTab === 'fir_dsp'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Active DSP & FIR Engine
          </button>
          <button
            onClick={() => setActiveTab('passive_iir')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeTab === 'passive_iir'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Passive Analog (IIR Network)
          </button>
        </div>
      </div>

      {activeTab === 'fir_dsp' ? (
        <div className="space-y-5">
          {/* Section 1: FIR Phase Topology & Tap Budget Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase Mode */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> Phase Alignment Topology
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {currentFirConfig.phaseMode.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Determines impulse response symmetry and excess phase unwrapping across crossover passbands.
              </p>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                <button
                  onClick={() => updateFirConfig({ phaseMode: 'linear_phase' })}
                  className={`px-2 py-2 rounded-lg text-center border transition cursor-pointer ${
                    currentFirConfig.phaseMode === 'linear_phase'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Linear-Phase</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">0° Phase Rot.</div>
                </button>
                <button
                  onClick={() => updateFirConfig({ phaseMode: 'mixed_phase' })}
                  className={`px-2 py-2 rounded-lg text-center border transition cursor-pointer ${
                    currentFirConfig.phaseMode === 'mixed_phase'
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Mixed-Phase</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Low Delay + Unwrap</div>
                </button>
                <button
                  onClick={() => updateFirConfig({ phaseMode: 'minimum_phase' })}
                  className={`px-2 py-2 rounded-lg text-center border transition cursor-pointer ${
                    currentFirConfig.phaseMode === 'minimum_phase'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Minimum-Phase</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">~0ms Latency</div>
                </button>
              </div>
            </div>

            {/* Tap Budget & Sample Rate */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" /> DSP Tap Budget (N)
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {currentFirConfig.sampleRate / 1000} kHz / {currentFirConfig.tapCount} Taps
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Sample Rate:</span>
                <div className="flex gap-1 font-mono text-[10px]">
                  {[48000, 96000].map((sr) => (
                    <button
                      key={sr}
                      onClick={() => updateFirConfig({ sampleRate: sr as any })}
                      className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                        currentFirConfig.sampleRate === sr
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {sr / 1000} kHz
                    </button>
                  ))}
                </div>
              </div>

              {/* Taps Selector */}
              <div className="grid grid-cols-5 gap-1 font-mono text-[10px]">
                {[256, 512, 1024, 2048, 4096].map((taps) => (
                  <button
                    key={taps}
                    onClick={() => updateFirConfig({ tapCount: taps as FirTapCount })}
                    className={`py-1.5 rounded border text-center transition cursor-pointer ${
                      currentFirConfig.tapCount === taps
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>{taps}</div>
                    <div className="text-[8px] text-slate-500">
                      {taps === 2048 ? 'Ref' : taps === 4096 ? 'Studio' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Window Function & DSP Platform */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Window & Target DSP
                </span>
                <span className="text-[10px] font-mono text-purple-300 uppercase">
                  {selectedPlatform}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Windowing</label>
                  <select
                    value={currentFirConfig.windowType}
                    onChange={(e) => updateFirConfig({ windowType: e.target.value as FirWindowType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                  >
                    <option value="blackman_harris">Blackman-Harris (-92dB)</option>
                    <option value="hann">Hann (Smooth Roll)</option>
                    <option value="kaiser">Kaiser (Beta 7.8)</option>
                    <option value="rectangular">Rectangular (Brickwall)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">DSP Platform</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as FirDspPlatform)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                  >
                    <option value="minidsp">miniDSP (Flex / 4x10)</option>
                    <option value="hypex_fusion">Hypex FusionAmp</option>
                    <option value="powersoft">Powersoft Armonía</option>
                    <option value="camilladsp">CamillaDSP</option>
                    <option value="generic_csv">Generic CSV</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Telemetry Metrics Cards (From Eclipse Audio Guide) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Frequency Resolution */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1">
                <span>Frequency Resolution (Δf)</span>
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-bold font-mono text-cyan-300">
                {firReport.frequencyResolutionHz} Hz
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Min Phase Control: <span className="text-slate-200 font-bold">{firReport.minControllableFreqHz} Hz</span>
              </div>
            </div>

            {/* Bulk Delay & Latency */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1">
                <span>Bulk Delay (Latency)</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {firReport.latencyMs} ms
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Peak: <span className="text-slate-200">{firReport.bulkDelaySamples} samples</span>
              </div>
            </div>

            {/* Live Performance Safety */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1">
                <span>Live Audio Safety</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-sm font-bold font-mono">
                {firReport.latencyMs <= 8 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Live Safe (&lt;8ms)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Studio Mastering
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {firReport.latencyMs <= 8 ? 'Wedge / PA Stage Compliant' : 'Bulk Delay for Mix / Post'}
              </div>
            </div>

            {/* DSP Multiplications Load */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1">
                <span>DSP Multiply Load</span>
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">
                {(firReport.multiplicationsPerSecond / 1000000).toFixed(2)} M/s
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-purple-400 font-bold">{firReport.ratioVsIirBiquad}×</span> vs 24 IIR Biquads
              </div>
            </div>
          </div>

          {/* Section 3: Advisory Banner */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-3 text-xs font-mono ${
              firReport.status === 'optimal'
                ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                : firReport.status === 'live_latency_warning'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-purple-950/40 border-purple-800/80 text-purple-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{firReport.advisoryTitle}</div>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {firReport.advisoryDescription}
              </p>
            </div>
          </div>

          {/* Section 4: Visualizer (Waveform h[n] / Phase Response / Group Delay) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200 uppercase tracking-wider">
                  Real-Time Electroacoustic Simulation
                </span>
              </div>
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-[11px]">
                <button
                  onClick={() => setVisualizationMode('phase')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    visualizationMode === 'phase'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Phase Response θ(f)
                </button>
                <button
                  onClick={() => setVisualizationMode('group_delay')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    visualizationMode === 'group_delay'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Group Delay τ_g(f)
                </button>
                <button
                  onClick={() => setVisualizationMode('impulse')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    visualizationMode === 'impulse'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Impulse Response h[n]
                </button>
              </div>
            </div>

            {/* SVG Visualizations */}
            {visualizationMode === 'phase' && (
              <div className="space-y-2">
                <div className="h-44 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 relative overflow-hidden flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="80" x2="600" y2="80" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#1e293b" strokeWidth="1" />
                    <line x1="0" y1="140" x2="600" y2="140" stroke="#1e293b" strokeWidth="1" />
                    
                    {/* IIR Phase Curve (Rolls from 0 to -360 degrees) - Red/Amber dashed */}
                    <path
                      d={firReport.phaseResponsePoints
                        .map((pt, i) => {
                          const x = (i / (firReport.phaseResponsePoints.length - 1)) * 600;
                          // pt.iirPhaseDeg is 0 to -360, map to y (80 = 0 deg, 150 = -360 deg)
                          const y = 80 - (pt.iirPhaseDeg / 360) * 70;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${Math.min(155, Math.max(5, y))}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />

                    {/* FIR Phase Curve (Linear Phase is ruler flat at 0 degrees, Mixed phase unwrapped) - Cyan */}
                    <path
                      d={firReport.phaseResponsePoints
                        .map((pt, i) => {
                          const x = (i / (firReport.phaseResponsePoints.length - 1)) * 600;
                          const y = 80 - (pt.firPhaseDeg / 360) * 70;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${Math.min(155, Math.max(5, y))}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />
                  </svg>
                  {/* Legend */}
                  <div className="absolute top-2 right-3 flex items-center gap-4 text-[10px] font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> FIR Linear-Phase (0° Phase Distortion)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed inline-block" /> Conventional IIR (-360° Rotation)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                  <span>20 Hz</span>
                  <span>100 Hz</span>
                  <span>fc = {crossoverLowHz} Hz (Crossover Region)</span>
                  <span>10 kHz</span>
                  <span>20 kHz</span>
                </div>
              </div>
            )}

            {visualizationMode === 'group_delay' && (
              <div className="space-y-2">
                <div className="h-44 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 relative overflow-hidden flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <line x1="0" y1="140" x2="600" y2="140" stroke="#334155" strokeWidth="1" />
                    
                    {/* IIR Group Delay (Spikes at crossover fc) */}
                    <path
                      d={firReport.groupDelayPoints
                        .map((pt, i) => {
                          const x = (i / (firReport.groupDelayPoints.length - 1)) * 600;
                          const y = 140 - Math.min(130, pt.iirGroupDelayMs * 15);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />

                    {/* FIR Constant Group Delay */}
                    <path
                      d={firReport.groupDelayPoints
                        .map((pt, i) => {
                          const x = (i / (firReport.groupDelayPoints.length - 1)) * 600;
                          const y = 140 - Math.min(130, pt.firGroupDelayMs * 15);
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="absolute top-2 right-3 flex items-center gap-4 text-[10px] font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> FIR Constant Delay (Zero Smearing)
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-3 h-0.5 bg-rose-400 border-b border-dashed inline-block" /> IIR Resonance Spike (~{firReport.groupDelayPoints[15]?.iirGroupDelayMs}ms)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                  <span>20 Hz</span>
                  <span>100 Hz</span>
                  <span>fc = {crossoverLowHz} Hz</span>
                  <span>10 kHz</span>
                  <span>20 kHz</span>
                </div>
              </div>
            )}

            {visualizationMode === 'impulse' && (
              <div className="space-y-2">
                <div className="h-44 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 relative overflow-hidden flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <line x1="0" y1="80" x2="600" y2="80" stroke="#334155" strokeWidth="1" />
                    
                    {/* Woofer Sinc Waveform */}
                    <path
                      d={firReport.impulseResponsePoints
                        .map((pt, i) => {
                          const x = (i / (firReport.impulseResponsePoints.length - 1)) * 600;
                          const y = 80 - pt.woofer * 120;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${Math.min(155, Math.max(5, y))}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />

                    {/* Tweeter High-Pass Sinc Waveform */}
                    <path
                      d={firReport.impulseResponsePoints
                        .map((pt, i) => {
                          const x = (i / (firReport.impulseResponsePoints.length - 1)) * 600;
                          const y = 80 - pt.tweeter * 120;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${Math.min(155, Math.max(5, y))}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div className="absolute top-2 right-3 flex items-center gap-4 text-[10px] font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Woofer Low-Pass Sinc h_lp[n]
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-3 h-0.5 bg-purple-400 inline-block" /> Tweeter High-Pass h_hp[n]
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                  <span>n = 0</span>
                  <span>Peak Center: n = {firReport.bulkDelaySamples}</span>
                  <span>n = {firReport.tapCount - 1}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: DSP Export & Download Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs font-mono text-slate-400">
              Export coefficients for <span className="text-cyan-300 font-bold uppercase">{selectedPlatform}</span> (Target: {firReport.tapCount} taps @ {firReport.sampleRate / 1000}kHz)
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => handleDownloadTaps('woofer')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Woofer Taps (.txt)
              </button>
              <button
                onClick={() => handleDownloadTaps('tweeter')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition cursor-pointer shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Tweeter Taps (.txt)
              </button>
              <button
                onClick={handleDownloadPresetJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                Stereo DSP Preset (.json)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PASSIVE ANALOG IIR CROSSOVER TAB */
        <div>
          {/* Filter Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Low-Pass / Woofer Crossover Settings */}
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Woofer Low-Pass Filter ({acoustics.driverAssignments.woofer.driver.brand} {acoustics.driverAssignments.woofer.driver.model})
                </span>
                <span className="text-xs font-mono text-slate-400">{crossoverLowHz} Hz</span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Crossover Frequency (fc):</span>
                  <span className="text-cyan-300 font-bold">{crossoverLowHz} Hz</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="50"
                  value={crossoverLowHz}
                  onChange={(e) =>
                    setAcoustics((p) => ({ ...p, crossoverLowHz: parseInt(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Slope</label>
                  <select
                    value={lowPassOrder}
                    onChange={(e) =>
                      setAcoustics((p) => ({ ...p, lowPassOrder: parseInt(e.target.value) as FilterOrder }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  >
                    <option value={1}>1st Order (6 dB/oct)</option>
                    <option value={2}>2nd Order (12 dB/oct)</option>
                    <option value={3}>3rd Order (18 dB/oct)</option>
                    <option value={4}>4th Order (24 dB/oct)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Alignment Type</label>
                  <select
                    value={lowPassType}
                    onChange={(e) =>
                      setAcoustics((p) => ({ ...p, lowPassType: e.target.value as FilterType }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  >
                    <option value="linkwitz_riley">Linkwitz-Riley (Flat Sum)</option>
                    <option value="butterworth">Butterworth (-3dB Q=0.707)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* High-Pass / Tweeter Crossover Settings */}
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Tweeter High-Pass Filter ({acoustics.driverAssignments.tweeter.driver.brand} {acoustics.driverAssignments.tweeter.driver.model})
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {topology === 'three_way' ? crossoverHighHz : crossoverLowHz} Hz
                </span>
              </div>

              {topology === 'three_way' && (
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">High Crossover Frequency (fc2):</span>
                    <span className="text-cyan-300 font-bold">{crossoverHighHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="8000"
                    step="100"
                    value={crossoverHighHz}
                    onChange={(e) =>
                      setAcoustics((p) => ({ ...p, crossoverHighHz: parseInt(e.target.value) }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Slope</label>
                  <select
                    value={highPassOrder}
                    onChange={(e) =>
                      setAcoustics((p) => ({ ...p, highPassOrder: parseInt(e.target.value) as FilterOrder }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  >
                    <option value={1}>1st Order (6 dB/oct)</option>
                    <option value={2}>2nd Order (12 dB/oct)</option>
                    <option value={3}>3rd Order (18 dB/oct)</option>
                    <option value={4}>4th Order (24 dB/oct)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Alignment Type</label>
                  <select
                    value={highPassType}
                    onChange={(e) =>
                      setAcoustics((p) => ({ ...p, highPassType: e.target.value as FilterType }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  >
                    <option value="linkwitz_riley">Linkwitz-Riley (Flat Sum)</option>
                    <option value="butterworth">Butterworth (-3dB Q=0.707)</option>
                  </select>
                </div>
              </div>

              {/* L-Pad Attenuation */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Tweeter L-Pad Attenuation:</span>
                  <span className="text-cyan-300 font-bold">{driverAssignments.tweeter.attenuationDb} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={driverAssignments.tweeter.attenuationDb}
                  onChange={(e) => handleDriverAttenuation('tweeter', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Passive Loudspeaker Electronics Blueprint: Reactive Conjugate & Impedance Flattening Network */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5 font-mono text-xs">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-cyan-400 uppercase font-bold mb-1">
                1. Zobel Inductive Cell (Rz / Cz)
              </div>
              <div className="text-slate-200 font-bold">
                Rz = {blueprintDiagnostics.zobelRz} Ω • Cz = {blueprintDiagnostics.zobelCz} µF
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Flattens voice-coil inductive rise (Rz = 1.25·Re, Cz = Le/Rz²)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">
                2. Motional Fs Conjugate Tank
              </div>
              <div className="text-slate-200 font-bold">
                Rc={blueprintDiagnostics.motionalTank.rcOhm}Ω • Cc={blueprintDiagnostics.motionalTank.ccUf}µF • Lc={blueprintDiagnostics.motionalTank.lcMh}mH
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Damps fundamental resonance peak (Rmax = {blueprintDiagnostics.motionalTank.rMaxOhm} Ω)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-amber-400 uppercase font-bold mb-1">
                3. CD Horn HF Bypass Cap (Cb)
              </div>
              <div className="text-slate-200 font-bold">
                Cb = {blueprintDiagnostics.cdBypassCapUf} µF (400V MKP)
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Bridges L-Pad R1 to restore +6 dB/oct top-octave air (&gt;3.5 kHz)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">
                4. Baffle Step Shelf (2π → 4π)
              </div>
              <div className="text-slate-200 font-bold">
                Lbsc = {blueprintDiagnostics.bsc.lBscMh} mH • Rbsc = {blueprintDiagnostics.bsc.rBscOhm} Ω
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                6 dB diffraction compensation centered at f_step = {blueprintDiagnostics.bsc.fStepHz} Hz
              </div>
            </div>
          </div>

          {/* Component Bill of Materials Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div>
                <span className="font-semibold text-slate-200">PHYSICAL RLC COMPONENT BILL OF MATERIALS (BOM)</span>
                <span className="text-cyan-400 ml-2">({crossoverResults.allComponents.length} Components)</span>
              </div>
              {onOpenPcbWorkspace && (
                <button
                  type="button"
                  onClick={onOpenPcbWorkspace}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  title="Open Automated Multi-Board PCB Stack & Gerber Fabrication Workspace"
                >
                  <Cpu className="w-4 h-4 text-emerald-200" />
                  <span>Auto-Generate Stacked PCBs &amp; Gerbers &rarr;</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Designator</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Exact Value</th>
                    <th className="py-2 px-3">Spec & Tolerance</th>
                    <th className="py-2 px-3">Acoustic Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {crossoverResults.allComponents.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-bold text-cyan-300">{comp.name}</td>
                      <td className="py-2 px-3 capitalize text-slate-400">{comp.type}</td>
                      <td className="py-2 px-3 font-bold text-white">{comp.valueFormatted}</td>
                      <td className="py-2 px-3 text-slate-400">{comp.voltagePowerRating}</td>
                      <td className="py-2 px-3 text-slate-300">{comp.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
