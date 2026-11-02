import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle,
  Cpu,
  Disc3,
  Layers,
  Maximize2,
  RefreshCw,
  Scale,
  Sliders,
  Sparkles,
  Volume2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type {
  AcousticParameters,
  AlignmentType,
  DriverPreset,
  EnclosureDimensions,
  MaterialType,
  SpeakerCategory,
  SystemTopology,
} from '../types/loudspeaker.ts';
import { DRIVER_PRESETS } from '../services/acousticEngine.ts';
import {
  calculateTransducerSizing,
  type CabinetProportionRatio,
  type TransducerSizingResult,
} from '../services/transducerSizingEngine.ts';
import { useUnits } from '../context/UnitContext.tsx';

interface TransducerSizingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDimensions: EnclosureDimensions;
  currentAcoustics: AcousticParameters;
  onApplySizing: (
    newDims: EnclosureDimensions,
    newAcoustics: AcousticParameters,
    notificationMsg: string
  ) => void;
  embedded?: boolean;
}

export const TransducerSizingModal: React.FC<TransducerSizingModalProps> = ({
  isOpen,
  onClose,
  currentDimensions,
  currentAcoustics,
  onApplySizing,
  embedded = false,
}) => {
  const { formatLength, formatVolume, formatWeight, unitSystem } = useUnits();

  // Topology selection
  const [topology, setTopology] = useState<SystemTopology>(
    currentAcoustics.topology === 'three_way'
      ? 'three_way'
      : currentAcoustics.topology === 'two_way'
      ? 'two_way'
      : 'single'
  );
  const [alignment, setAlignment] = useState<AlignmentType>(
    currentAcoustics.alignment === 'sealed' ? 'sealed' : 'ported'
  );
  const [proportionRatio, setProportionRatio] = useState<CabinetProportionRatio>('golden_ratio');
  const [wooferQuantity, setWooferQuantity] = useState<1 | 2>(
    currentAcoustics.driverAssignments.woofer.quantity === 2 ? 2 : 1
  );

  // Selected Driver Presets or Custom
  const [selectedWooferId, setSelectedWooferId] = useState<string>(
    currentAcoustics.driverAssignments.woofer.driver.id
  );
  const [selectedMidrangeId, setSelectedMidrangeId] = useState<string>(
    currentAcoustics.driverAssignments.midrange?.driver.id || DRIVER_PRESETS[6]?.id || DRIVER_PRESETS[0].id
  );
  const [selectedTweeterId, setSelectedTweeterId] = useState<string>(
    currentAcoustics.driverAssignments.tweeter?.driver.id || DRIVER_PRESETS[4]?.id || DRIVER_PRESETS[0].id
  );

  // Custom TS Parameters Override Mode
  const [isCustomWoofer, setIsCustomWoofer] = useState<boolean>(false);
  const [customFs, setCustomFs] = useState<number>(34);
  const [customQts, setCustomQts] = useState<number>(0.38);
  const [customVas, setCustomVas] = useState<number>(68);
  const [customXmax, setCustomXmax] = useState<number>(7.5);
  const [customNominalDiameter, setCustomNominalDiameter] = useState<number>(10);
  const [customPe, setCustomPe] = useState<number>(300);

  // Resolve active drivers
  const activeWoofer: DriverPreset = useMemo(() => {
    if (isCustomWoofer) {
      const outerD = Math.round(customNominalDiameter * 25.4 * 1.08);
      const cutoutD = Math.round(customNominalDiameter * 25.4 * 0.91);
      const mountD = Math.round(customNominalDiameter * 25.4 * 0.44);
      return {
        id: 'custom_woofer_ts',
        brand: 'Custom Lab',
        model: `TS-${customNominalDiameter}" (${customFs}Hz / Qts ${customQts})`,
        nominalDiameterInch: customNominalDiameter,
        fs: customFs,
        qts: customQts,
        qes: customQts * 1.08,
        qms: 4.8,
        vas: customVas,
        xmax: customXmax,
        pe: customPe,
        sd: Math.round(Math.PI * Math.pow(customNominalDiameter * 2.54 * 0.45, 2)),
        frameOuterDiameterMm: outerD,
        cutoutDiameterMm: cutoutD,
        mountingDepthMm: mountD,
        magnetDiameterMm: Math.round(customNominalDiameter * 25.4 * 0.55),
        magnetDepthMm: 42,
        voiceCoilDiameterMm: 50,
        displacementLiters: Math.round((Math.PI * Math.pow(outerD / 20, 2) * (mountD / 10) * 0.35) / 1000 * 10) / 10,
        splSensitivityDb: 91,
        description: 'User-specified Thiele-Small transducer profile',
      };
    }
    return DRIVER_PRESETS.find((d) => d.id === selectedWooferId) || DRIVER_PRESETS[0];
  }, [isCustomWoofer, selectedWooferId, customNominalDiameter, customFs, customQts, customVas, customXmax, customPe]);

  const activeMidrange: DriverPreset | undefined = useMemo(() => {
    if (topology !== 'three_way') return undefined;
    return DRIVER_PRESETS.find((d) => d.id === selectedMidrangeId) || DRIVER_PRESETS[6];
  }, [topology, selectedMidrangeId]);

  const activeTweeter: DriverPreset = useMemo(() => {
    return DRIVER_PRESETS.find((d) => d.id === selectedTweeterId) || DRIVER_PRESETS[4];
  }, [selectedTweeterId]);

  // Run acoustic optimization sizing engine
  const sizingResult: TransducerSizingResult = useMemo(() => {
    return calculateTransducerSizing({
      topology,
      category: currentDimensions.category || 'studio_monitor',
      alignment,
      proportionRatio,
      material: currentDimensions.material || 'baltic_birch_18',
      woofer: activeWoofer,
      wooferQuantity,
      tweeter: activeTweeter,
      midrange: activeMidrange,
    });
  }, [
    topology,
    currentDimensions.category,
    alignment,
    proportionRatio,
    currentDimensions.material,
    activeWoofer,
    wooferQuantity,
    activeTweeter,
    activeMidrange,
  ]);

  if (!isOpen && !embedded) return null;

  const handleApply = () => {
    onApplySizing(
      sizingResult.dimensions,
      sizingResult.acousticParameters,
      `Sized enclosure around ${activeWoofer.brand} ${activeWoofer.model} (${formatVolume(sizingResult.netVolumeLiters)}, ${formatLength(sizingResult.dimensions.externalWidthMm)} × ${formatLength(sizingResult.dimensions.externalHeightMm)} × ${formatLength(sizingResult.dimensions.externalDepthMm)})`
    );
    onClose();
  };

  const wooferOptions = DRIVER_PRESETS.filter((d) => d.nominalDiameterInch >= 6);
  const midOptions = DRIVER_PRESETS.filter((d) => d.nominalDiameterInch <= 6.5);
  const tweetOptions = DRIVER_PRESETS.filter((d) => d.nominalDiameterInch <= 2);

  const baffleClearanceOk = sizingResult.dimensions.externalHeightMm >= sizingResult.cabinetMinimumHeightMm;

  return (
    <div
      onClick={embedded ? undefined : onClose}
      className={
        embedded
          ? 'w-full h-full flex flex-col overflow-hidden bg-[#07090e]'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer'
      }
    >
      <div
        onClick={embedded ? undefined : (e) => e.stopPropagation()}
        className={
          embedded
            ? 'relative w-full h-full bg-[#090c13] flex flex-col text-slate-200 font-sans overflow-hidden'
            : 'relative w-full max-w-5xl bg-[#0c0f17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans cursor-default max-h-[92vh]'
        }
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#07090e] border-b border-slate-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md">
              <Sparkles className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Transducer-First Enclosure Sizing Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-bold">
                  Thiele-Small Synth
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Select or configure drivers; the synthesis engine automatically sizes optimal enclosure volume, port tuning, and cabinet aspect ratio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-semibold transition cursor-pointer whitespace-nowrap"
          >
            {embedded ? (
              <>
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>Return to 3D CAD</span>
              </>
            ) : (
              <X className="w-5 h-5 text-rose-400" />
            )}
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Driver Selection & TS Parameters (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* System Architecture Controls */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" />
                1. System Architecture &amp; Topology
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Topology</label>
                  <select
                    value={topology}
                    onChange={(e) => setTopology(e.target.value as SystemTopology)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="single">Single Driver Sub</option>
                    <option value="two_way">2-Way (Woofer + Tweeter)</option>
                    <option value="three_way">3-Way (Woofer + Mid + Tweeter)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Acoustic Alignment</label>
                  <select
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value as AlignmentType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ported">Vented / Bass Reflex</option>
                    <option value="sealed">Sealed (Acoustic Suspension)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-mono">Woofer Count</label>
                  <select
                    value={wooferQuantity}
                    onChange={(e) => setWooferQuantity(parseInt(e.target.value) as 1 | 2)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={1}>1x Woofer Module</option>
                    <option value={2}>2x Dual Woofers (Isobaric / MTM)</option>
                  </select>
                </div>
              </div>

              {/* Dimensional Proportions / Aspect Ratio */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">Acoustic Aspect Ratio</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {[
                    { id: 'golden_ratio', label: 'Golden Ratio', desc: '1.0 : 1.62 : 2.62' },
                    { id: 'optimal_standing_wave', label: 'IEC Standing Wave', desc: '1.0 : 1.25 : 1.60' },
                    { id: 'narrow_baffle', label: 'Narrow Baffle', desc: '1.0 : 1.75 : 1.15' },
                    { id: 'compact_cube', label: 'Compact Cube', desc: '1.0 : 1.15 : 1.15' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setProportionRatio(ratio.id as any)}
                      className={`p-2 rounded-lg text-left transition border ${
                        proportionRatio === ratio.id
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{ratio.label}</div>
                      <div className="text-[10px] text-slate-500">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Woofer Selection & TS Override */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Disc3 className="w-4 h-4" />
                  2. Low-Frequency Transducer (Woofer)
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={isCustomWoofer}
                    onChange={(e) => setIsCustomWoofer(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Custom Thiele-Small Mode</span>
                </label>
              </div>

              {!isCustomWoofer ? (
                <div>
                  <select
                    value={selectedWooferId}
                    onChange={(e) => setSelectedWooferId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {wooferOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.brand} {w.model} ({w.nominalDiameterInch}&quot; · Fs={w.fs}Hz · Qts={w.qts} · Vas={w.vas}L · Xmax={w.xmax}mm)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Diameter (&quot;)</label>
                    <input
                      type="number"
                      min="4"
                      max="21"
                      step="0.5"
                      value={customNominalDiameter}
                      onChange={(e) => setCustomNominalDiameter(parseFloat(e.target.value) || 10)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Resonance Fs (Hz)</label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      step="1"
                      value={customFs}
                      onChange={(e) => setCustomFs(parseFloat(e.target.value) || 35)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Total Q (Qts)</label>
                    <input
                      type="number"
                      min="0.15"
                      max="1.2"
                      step="0.01"
                      value={customQts}
                      onChange={(e) => setCustomQts(parseFloat(e.target.value) || 0.38)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Equiv Vol Vas (L)</label>
                    <input
                      type="number"
                      min="2"
                      max="400"
                      step="1"
                      value={customVas}
                      onChange={(e) => setCustomVas(parseFloat(e.target.value) || 60)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Excursion Xmax (mm)</label>
                    <input
                      type="number"
                      min="1"
                      max="35"
                      step="0.5"
                      value={customXmax}
                      onChange={(e) => setCustomXmax(parseFloat(e.target.value) || 7.5)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Power Pe (Watts)</label>
                    <input
                      type="number"
                      min="20"
                      max="3000"
                      step="25"
                      value={customPe}
                      onChange={(e) => setCustomPe(parseFloat(e.target.value) || 300)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Driver Acoustic Health / EBP Badge */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400">Efficiency Bandwidth Product (EBP):</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-300">{sizingResult.ebp}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sizingResult.ebpCategory === 'ported_preferred'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : sizingResult.ebpCategory === 'sealed_preferred'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-blue-950 text-blue-300 border border-blue-700'
                    }`}
                  >
                    {sizingResult.ebpCategory.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Midrange & Tweeter Selection if 2-way or 3-way */}
            {topology !== 'single' && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  3. Complementary Transducers (HF / MF)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-mono">Tweeter Module</label>
                    <select
                      value={selectedTweeterId}
                      onChange={(e) => setSelectedTweeterId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      {tweetOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.brand} {t.model} ({t.splSensitivityDb}dB)
                        </option>
                      ))}
                    </select>
                  </div>
                  {topology === 'three_way' && (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1 font-mono">Dedicated Midrange</label>
                      <select
                        value={selectedMidrangeId}
                        onChange={(e) => setSelectedMidrangeId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                      >
                        {midOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.brand} {m.model} ({m.nominalDiameterInch}&quot;)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Calculated Enclosure Dimensions & Volume Synthesis (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-cyan-400" />
                  Synthesized Enclosure Spec
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {unitSystem.toUpperCase()} UNITS
                </span>
              </div>

              {/* Volume Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Acoustic Vol (Vb)</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {formatVolume(sizingResult.netVolumeLiters)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tuning: {sizingResult.tuningFrequencyFbHz} Hz (F3: {sizingResult.f3CutoffHz} Hz)
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Gross Internal Vol</div>
                  <div className="text-lg font-bold text-slate-200">
                    {formatVolume(sizingResult.grossVolumeLiters)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Displacements: {formatVolume(sizingResult.grossVolumeLiters - sizingResult.netVolumeLiters)}
                  </div>
                </div>
              </div>

              {/* External Dimensions */}
              <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-mono font-semibold text-slate-300">
                  Calculated External Dimensions:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">WIDTH</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {formatLength(sizingResult.dimensions.externalWidthMm)}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">HEIGHT</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {formatLength(sizingResult.dimensions.externalHeightMm)}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">DEPTH</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {formatLength(sizingResult.dimensions.externalDepthMm)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Displacements Detail */}
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Driver Basket &amp; Magnets:</span>
                  <span className="text-slate-200">
                    {formatVolume(sizingResult.driverDisplacementLiters)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Port Duct Volume:</span>
                  <span className="text-slate-200">
                    {formatVolume(sizingResult.portDisplacementLiters)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Internal Bracing Volume:</span>
                  <span className="text-slate-200">
                    {formatVolume(sizingResult.bracingDisplacementLiters)}
                  </span>
                </div>
              </div>

              {/* Baffle Clearance & Feasibility */}
              <div
                className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                  baffleClearanceOk
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                {baffleClearanceOk ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {baffleClearanceOk
                      ? 'Transducers Fit Baffle Comfortably'
                      : 'Baffle Height Alert'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {baffleClearanceOk
                      ? `Required baffle height ${formatLength(sizingResult.cabinetMinimumHeightMm)} vs allocated ${formatLength(sizingResult.dimensions.externalHeightMm)}.`
                      : 'Total driver cutout diameters exceed panel height. Consider increasing height or staggering drivers.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Dimensions &amp; Drivers to CAD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
