import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle,
  ChevronDown,
  Download,
  Eye,
  Layers,
  Maximize2,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sliders,
  Sparkles,
  Waves,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type {
  ArrayCurvaturePreset,
  AudiencePointResult,
  LineArrayConfig,
  LineArrayModuleConfig,
  LineArraySimulationResult,
} from '../types/lineArray.ts';
import {
  DEFAULT_LINE_ARRAY_CONFIG,
  calculateLineArrayAcoustics,
  generateModuleCurvature,
} from '../services/lineArrayEngine.ts';
import { calculateStructuralRigging } from '../services/structuralRiggingEngine.ts';
import { useUnits } from '../context/UnitContext.tsx';
import type { EnclosureDimensions } from '../types/loudspeaker.ts';

interface LineArrayDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: EnclosureDimensions;
  onApplyArrayDimensions?: (boxHeightMm: number, boxWidthMm: number, boxDepthMm: number) => void;
  onOpenStructuralRigging?: () => void;
  embedded?: boolean;
}

export const LineArrayDesignerModal: React.FC<LineArrayDesignerModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  onApplyArrayDimensions,
  onOpenStructuralRigging,
  embedded = false,
}) => {
  const {
    formatLength,
    formatDistance,
    formatWeight,
    formatVelocity,
    unitSystem,
  } = useUnits();

  const [config, setConfig] = useState<LineArrayConfig>(() => ({
    ...DEFAULT_LINE_ARRAY_CONFIG,
    boxWidthMm: Math.max(550, dimensions.externalWidthMm),
    boxHeightMm: Math.min(320, dimensions.externalHeightMm),
    boxDepthMm: dimensions.externalDepthMm,
  }));

  const [analysisFrequencyHz, setAnalysisFrequencyHz] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<'rigging_curvature' | 'acoustic_polar' | 'audience_coverage' | 'rigging_safety'>('rigging_curvature');

  // Compute live acoustic simulation
  const simulation: LineArraySimulationResult = useMemo(() => {
    return calculateLineArrayAcoustics({ ...config, analysisFrequencyHz });
  }, [config, analysisFrequencyHz]);

  // Compute live structural rigging report
  const riggingReport = useMemo(() => {
    return calculateStructuralRigging({
      boxCount: config.moduleCount,
      boxWeightKg: config.boxWeightKg,
      boxHeightMm: config.boxHeightMm,
      boxDepthMm: config.boxDepthMm,
      bumperWeightKg: config.bumperWeightKg,
      bumperLengthMm: config.bumperLengthMm,
      cablesWeightKg: 18,
      hangingAngleDeg: config.venue.bumperTiltDeg,
      interBoxSplayAnglesDeg: config.modules.map((m) => m.splayAngleDeg),
      curvaturePreset: config.curvaturePreset,
      regulatoryStandard: 'dguv_17',
      pinSpecKey: 'pin_10mm_17_4ph',
      dynamicShockFactor: 1.15,
      pickPointConfig: 'dual_motor_bridle',
    });
  }, [config]);

  if (!isOpen && !embedded) return null;

  const handleCurvatureChange = (preset: ArrayCurvaturePreset) => {
    const updatedModules = generateModuleCurvature(config.moduleCount, preset, config.maxSplayAngleDeg);
    setConfig((prev) => ({
      ...prev,
      curvaturePreset: preset,
      modules: updatedModules,
    }));
  };

  const handleModuleCountChange = (count: number) => {
    const validCount = Math.min(24, Math.max(2, count));
    const updatedModules = generateModuleCurvature(validCount, config.curvaturePreset, config.maxSplayAngleDeg);
    setConfig((prev) => ({
      ...prev,
      moduleCount: validCount,
      modules: updatedModules,
    }));
  };

  const handleSingleSplayChange = (index: number, angle: number) => {
    const updated = [...config.modules];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        splayAngleDeg: Math.max(0, Math.min(config.maxSplayAngleDeg, angle)),
      };
    }
    setConfig((prev) => ({
      ...prev,
      curvaturePreset: 'custom',
      modules: updated,
    }));
  };

  const handleSyncToCad = () => {
    if (onApplyArrayDimensions) {
      onApplyArrayDimensions(
        config.boxHeightMm,
        config.boxWidthMm,
        config.boxDepthMm
      );
    }
    onClose();
  };

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
            ? 'relative w-full h-full bg-[#090d14] flex flex-col text-slate-200 font-sans overflow-hidden'
            : 'relative w-full max-w-6xl bg-[#090d14] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans cursor-default max-h-[92vh]'
        }
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#07090e] border-b border-slate-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
              <Waves className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Line Array Speaker Design &amp; Curvature Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase font-bold">
                  WST Heil Physics
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Multi-element line source simulation: Wavefront Sculpting Technology (WST), inter-box splay angles, polar directivity, and rigging load analysis.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1">
            {[
              { id: 'rigging_curvature', label: '1. Curvature & Splay Rigging' },
              { id: 'acoustic_polar', label: '2. WST Coupling & Polar Directivity' },
              { id: 'audience_coverage', label: '3. Audience Venue SPL Mapping' },
              { id: 'rigging_safety', label: '4. Structural Tensile & Shear Analysis' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
            {onOpenStructuralRigging && (
              <button
                type="button"
                onClick={onOpenStructuralRigging}
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 font-bold flex items-center gap-1.5 transition text-[11px] cursor-pointer"
                title="Open Dedicated Full Structural Rigging Safety Modal"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xl:inline">Structural Audit</span>
              </button>
            )}
            <span>
              Total Length:{' '}
              <strong className="text-cyan-300">
                {formatDistance(simulation.totalArrayLengthM)}
              </strong>
            </span>
            <span>
              Rigging Weight:{' '}
              <strong className="text-amber-300">
                {formatWeight(simulation.totalSuspendedWeightKg)}
              </strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                simulation.isRiggingSafe
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              Safety {simulation.riggingSafetyFactor.toFixed(1)}:1
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'rigging_curvature' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Curvature Controls & Presets (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Array Element Configuration
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <label className="text-slate-400 block mb-1">Cabinet Count (N):</label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={config.moduleCount}
                        onChange={(e) => handleModuleCountChange(parseInt(e.target.value) || 2)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Driver Spacing (d):</label>
                      <input
                        type="number"
                        min="50"
                        max="600"
                        value={config.driverCenterSpacingMm}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            driverCenterSpacingMm: parseFloat(e.target.value) || 200,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">
                      Curvature Profile Preset:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        { id: 'straight', label: 'Straight (0°)', desc: 'Narrow long-throw beam' },
                        { id: 'j_curve', label: 'Concert J-Curve', desc: 'Tight top / curved bottom' },
                        { id: 'spiral_progressive', label: 'Spiral / Progressive', desc: 'Continuous expansion' },
                        { id: 'constant_curvature', label: 'Constant Curvature', desc: 'Uniform vertical slice' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleCurvatureChange(preset.id as any)}
                          className={`p-2 rounded-lg text-left transition border ${
                            config.curvaturePreset === preset.id
                              ? 'bg-blue-950/80 border-blue-500 text-blue-200 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-[11px]">{preset.label}</div>
                          <div className="text-[10px] text-slate-500">{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Individual Splay Sliders */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-slate-300 font-bold">Inter-Box Splay Angles (Deg):</span>
                      <span className="text-slate-400 text-[10px]">Max {config.maxSplayAngleDeg}°</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                      {config.modules.map((mod, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded border border-slate-800">
                          <span className="w-16 text-[10px] text-slate-400">
                            Box {idx + 1} &rarr; {idx + 2}:
                          </span>
                          <input
                            type="range"
                            min="0"
                            max={config.maxSplayAngleDeg}
                            step="0.5"
                            value={mod.splayAngleDeg}
                            onChange={(e) => handleSingleSplayChange(idx, parseFloat(e.target.value))}
                            className="flex-1 accent-blue-500 cursor-pointer"
                          />
                          <span className="w-10 text-right font-bold text-cyan-300 text-[11px]">
                            {mod.splayAngleDeg.toFixed(1)}°
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cabinet Physical Dimensions for Array Module */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="text-slate-300 font-bold uppercase tracking-wider">
                    Enclosure Module Geometry
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Width</label>
                      <input
                        type="number"
                        value={config.boxWidthMm}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            boxWidthMm: parseFloat(e.target.value) || 600,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Height</label>
                      <input
                        type="number"
                        value={config.boxHeightMm}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            boxHeightMm: parseFloat(e.target.value) || 280,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Depth</label>
                      <input
                        type="number"
                        value={config.boxDepthMm}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            boxDepthMm: parseFloat(e.target.value) || 450,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 2D Articulated Hang Visualization (7 Cols) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Articulated Hang Profile (Side Elevation CAD)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Splay Sum: {simulation.effectiveVerticalDispersionDeg.toFixed(1)}°
                  </span>
                </div>

                {/* SVG Side Elevation of Array with Boxes and Sightlines */}
                <div className="relative w-full h-[360px] my-3 bg-[#070a0f] rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 500 360">
                    <defs>
                      <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="50" y1="20" x2="50" y2="340" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="150" y1="20" x2="150" y2="340" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="250" y1="20" x2="250" y2="340" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="350" y1="20" x2="350" y2="340" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="450" y1="20" x2="450" y2="340" stroke="#1e293b" strokeDasharray="3 3" />

                    {/* Top Rigging Grid / Bumper */}
                    <rect x="80" y="30" width="70" height="14" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                    <circle cx="95" cy="37" r="3" fill="#0ea5e9" />
                    <circle cx="135" cy="37" r="3" fill="#0ea5e9" />
                    <line x1="95" y1="34" x2="95" y2="10" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="135" y1="34" x2="135" y2="10" stroke="#94a3b8" strokeWidth="2" />

                    {/* Array Cabinets Hang Rendering */}
                    {(() => {
                      let curX = 115;
                      let curY = 48;
                      let curAngleDeg = 0;
                      const boxW = 55;
                      const boxH = Math.max(12, Math.min(30, 240 / config.moduleCount));

                      return config.modules.map((mod, i) => {
                        const splayBefore = i > 0 ? config.modules[i - 1].splayAngleDeg : 0;
                        curAngleDeg += splayBefore;
                        const rad = (curAngleDeg * Math.PI) / 180;

                        const xPos = curX;
                        const yPos = curY;

                        // Increment for next box
                        curX -= Math.sin(rad) * (boxH + 2);
                        curY += Math.cos(rad) * (boxH + 2);

                        return (
                          <g key={i} transform={`translate(${xPos}, ${yPos}) rotate(${curAngleDeg})`}>
                            {/* Acoustic Sightline Ray */}
                            <line
                              x1={boxW / 2}
                              y1={0}
                              x2={260}
                              y2={0}
                              stroke="rgba(56, 189, 248, 0.35)"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                            {/* Speaker Enclosure Trapezoid / Box */}
                            <rect
                              x={-boxW / 2}
                              y={-boxH / 2}
                              width={boxW}
                              height={boxH}
                              rx="2"
                              fill="url(#boxGrad)"
                              stroke="#0284c7"
                              strokeWidth="1.5"
                            />
                            {/* Waveguide Aperture (Front baffle edge) */}
                            <rect
                              x={boxW / 2 - 3}
                              y={-boxH / 2 + 2}
                              width={3}
                              height={boxH - 4}
                              fill="#38bdf8"
                            />
                            {/* Rigging Quick-Release Pin */}
                            <circle cx={-boxW / 2 + 5} cy={-boxH / 2 + 3} r="2" fill="#f59e0b" />
                            <circle cx={boxW / 2 - 5} cy={-boxH / 2 + 3} r="2" fill="#f59e0b" />
                            {/* Label */}
                            <text
                              x="0"
                              y="3"
                              fill="#94a3b8"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              #{i + 1}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Audience Ground Plane Target */}
                    <line x1="280" y1="330" x2="480" y2="330" stroke="#475569" strokeWidth="2" />
                    <text x="380" y="348" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                      Audience Plane (Ear Height 1.7m)
                    </text>
                  </svg>
                </div>

                {/* Footer Sync Button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="text-xs font-mono text-slate-400">
                    Throw Distance:{' '}
                    <span className="text-cyan-300 font-bold">
                      {formatDistance(config.venue.audienceDistanceEndM)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncToCad}
                    className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Apply Box Size to ResonanceCAD</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'acoustic_polar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Physics & Coupling Breakdown (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="text-cyan-400 font-bold uppercase tracking-wider">
                    WST Heil Coupling Criterion
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    According to the Christian Heil Wavefront Sculpting Technology (WST) criteria, coherent cylindrical wave propagation requires transducer spacing $d \le \lambda / 2$.
                  </p>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">WST Coupling Limit:</span>
                      <span className="font-bold text-cyan-300">
                        {simulation.couplingCutoffFrequencyHz} Hz
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Near-Field Distance:</span>
                      <span className="font-bold text-slate-200">
                        {formatDistance(simulation.nearFieldTransitionDistanceM)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Comb Filtering Status:</span>
                      <span
                        className={`font-bold uppercase ${
                          simulation.isAcousticallyCoupledAtFreq ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {simulation.isAcousticallyCoupledAtFreq ? 'Coherent Wavefront' : 'Grating Lobes / Aliasing'}
                      </span>
                    </div>
                  </div>

                  {/* Frequency Selector for Polar Response */}
                  <div className="pt-2">
                    <label className="text-slate-300 font-bold block mb-1">
                      Analysis Frequency: {analysisFrequencyHz} Hz
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[125, 250, 500, 1000, 2000, 4000, 8000].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setAnalysisFrequencyHz(f)}
                          className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                            analysisFrequencyHz === f
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {f >= 1000 ? `${f / 1000}k` : `${f}`}Hz
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Directivity Polar Graph (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Vertical Polar Response ({analysisFrequencyHz} Hz)
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Vertical Beamwidth: {simulation.effectiveVerticalDispersionDeg.toFixed(1)}°
                  </span>
                </div>

                {/* SVG Polar Grid & Beam Outline */}
                <div className="w-full h-[320px] my-3 bg-[#070a0f] rounded-lg border border-slate-800/80 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 400 320">
                    {/* Concentric rings (-6dB, -12dB, -18dB) */}
                    <circle cx="200" cy="160" r="120" fill="none" stroke="#1e293b" strokeWidth="1" />
                    <circle cx="200" cy="160" r="90" fill="none" stroke="#1e293b" strokeWidth="1" />
                    <circle cx="200" cy="160" r="60" fill="none" stroke="#1e293b" strokeWidth="1" />
                    <circle cx="200" cy="160" r="30" fill="none" stroke="#1e293b" strokeWidth="1" />

                    <text x="200" y="35" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
                      0 dB (On-Axis)
                    </text>
                    <text x="200" y="65" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
                      -6 dB
                    </text>
                    <text x="200" y="95" fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle">
                      -12 dB
                    </text>

                    {/* Radial angle spokes */}
                    {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const x2 = 200 + Math.sin(rad) * 135;
                      const y2 = 160 - Math.cos(rad) * 135;
                      return (
                        <g key={deg}>
                          <line x1="200" y1="160" x2={x2} y2={y2} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                          <text x={x2} y={y2} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                            {deg}°
                          </text>
                        </g>
                      );
                    })}

                    {/* Polar response lobe polygon */}
                    {(() => {
                      const points: string[] = [];
                      const span = simulation.effectiveVerticalDispersionDeg / 2;
                      for (let ang = -90; ang <= 90; ang += 5) {
                        const atten = Math.min(36, Math.pow(Math.abs(ang) / Math.max(1, span), 2) * 6);
                        const radius = Math.max(10, ((36 - atten) / 36) * 120);
                        const rad = (ang * Math.PI) / 180;
                        const px = 200 + Math.sin(rad) * radius;
                        const py = 160 - Math.cos(rad) * radius;
                        points.push(`${px},${py}`);
                      }
                      return (
                        <polygon
                          points={points.join(' ')}
                          fill="rgba(14, 165, 233, 0.25)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                      );
                    })()}
                  </svg>
                </div>

                <div className="text-center font-mono text-[11px] text-slate-400">
                  Consistency Rating:{' '}
                  <strong className="text-cyan-300 uppercase">
                    {simulation.splConsistencyRating}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audience_coverage' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-cyan-400 uppercase tracking-wider">
                    Audience Plane Sound Pressure Level (SPL) Distribution
                  </span>
                  <span className="text-slate-400">
                    Target Throw: {formatDistance(config.venue.audienceDistanceEndM)}
                  </span>
                </div>

                {/* Live Distance SPL Chart */}
                <div className="w-full h-48 bg-slate-950 rounded-lg p-3 border border-slate-800 relative">
                  <div className="absolute inset-x-3 top-3 bottom-8 flex items-end gap-1">
                    {simulation.audiencePoints.map((aud: AudiencePointResult, idx: number) => {
                      const splH = Math.max(10, Math.min(100, (aud.splTotalDb - 85) * 4));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <div
                            style={{ height: `${splH}%` }}
                            className={`w-full rounded-t transition-all ${
                              aud.splTotalDb >= 102
                                ? 'bg-cyan-500'
                                : aud.splTotalDb >= 96
                                ? 'bg-blue-600'
                                : 'bg-slate-700'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute inset-x-3 bottom-2 flex justify-between text-[10px] text-slate-500">
                    <span>Front Row ({formatDistance(config.venue.audienceDistanceStartM)})</span>
                    <span>Mix Position ({formatDistance(config.venue.audienceDistanceEndM * 0.6)})</span>
                    <span>Rear Row ({formatDistance(config.venue.audienceDistanceEndM)})</span>
                  </div>
                </div>

                {/* SPL Uniformity Metric */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">FRONT ROW SPL</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {simulation.frontRowSplDb.toFixed(1)} dB-SPL
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">REAR ROW SPL</div>
                    <div className="text-sm font-bold text-slate-300">
                      {simulation.backRowSplDb.toFixed(1)} dB-SPL
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">FRONT-TO-BACK DELTA</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {simulation.frontToBackSplDeltaDb.toFixed(1)} dB (Target &lt; 6dB)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rigging_safety' && (
            <div className="space-y-4 font-mono text-xs">
              {/* Compliance & Safety Warning Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  !riggingReport.isCompliant
                    ? 'bg-rose-950/80 border-rose-600/90 text-rose-100 animate-pulse'
                    : riggingReport.minimumSafetyFactor < 10.0
                    ? 'bg-amber-950/70 border-amber-600/80 text-amber-100'
                    : 'bg-emerald-950/70 border-emerald-600/80 text-emerald-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">
                      {!riggingReport.isCompliant
                        ? `CRITICAL RIGGING EXCEEDANCE (${riggingReport.regulatoryStandard.toUpperCase()})`
                        : riggingReport.minimumSafetyFactor < 10.0
                        ? `ANSI E1.8 COMPLIANT (5:1) — CAUTION FOR DGUV 17 OVERHEAD AUDIENCE`
                        : `CERTIFIED FLOWN ARRAY RIGGING — DGUV 17 & ANSI E1.8 COMPLIANT`}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      Governing Safety Factor: <strong>{riggingReport.minimumSafetyFactor.toFixed(1)}:1</strong> (Required &ge; {riggingReport.requiredMinimumSafetyFactor}:1) &bull; Critical Joint: #{riggingReport.criticalJointIndex + 1} ({riggingReport.joints[riggingReport.criticalJointIndex]?.parentLabel} &rarr; {riggingReport.joints[riggingReport.criticalJointIndex]?.childLabel})
                    </div>
                  </div>
                </div>

                {onOpenStructuralRigging && (
                  <button
                    type="button"
                    onClick={onOpenStructuralRigging}
                    className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-md"
                  >
                    <span>Full Vector Rigging Audit &rarr;</span>
                  </button>
                )}
              </div>

              {/* Hardware & Statics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOTAL SUSPENDED MASS</div>
                  <div className="text-base font-bold text-cyan-300">
                    {formatWeight(riggingReport.totalSuspendedMassKg)}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {config.moduleCount} Boxes + Bumper ({formatWeight(config.bumperWeightKg)})
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">FRONT HOIST LOAD</div>
                  <div className="text-base font-bold text-slate-200">
                    {formatWeight(riggingReport.pickPoints.frontMotorLoadKg)}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Force: {(riggingReport.pickPoints.frontMotorLoadN / 1000).toFixed(1)} kN
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">REAR HOIST LOAD</div>
                  <div className="text-base font-bold text-slate-200">
                    {formatWeight(riggingReport.pickPoints.rearMotorLoadKg)}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Force: {(riggingReport.pickPoints.rearMotorLoadN / 1000).toFixed(1)} kN
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">PIN SHEAR CAPACITY</div>
                  <div className="text-base font-bold text-amber-300">
                    {riggingReport.pinSpec.doubleShearBreakingLoadKn} kN
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {riggingReport.pinSpec.materialName}
                  </div>
                </div>
              </div>

              {/* Joint Stress Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-200">INTER-CABINET FLYING PIN TENSILE &amp; SHEAR LOADS</span>
                  <span className="text-cyan-400">Dynamic Gust Factor: {riggingReport.dynamicShockFactor}x</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Joint</th>
                        <th className="py-2 px-3">Parent &rarr; Child</th>
                        <th className="py-2 px-3">Splay</th>
                        <th className="py-2 px-3">Sub-Mass</th>
                        <th className="py-2 px-3">Rear Tensile</th>
                        <th className="py-2 px-3">Front Shear</th>
                        <th className="py-2 px-3">Safety Factor</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {riggingReport.joints.map((joint) => (
                        <tr key={joint.jointIndex} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-bold text-cyan-300">#{joint.jointIndex + 1}</td>
                          <td className="py-1.5 px-3">{joint.parentLabel} &rarr; {joint.childLabel}</td>
                          <td className="py-1.5 px-3">{joint.splayAngleDeg.toFixed(1)}°</td>
                          <td className="py-1.5 px-3">{formatWeight(joint.suspendedMassBelowKg)}</td>
                          <td className="py-1.5 px-3 font-semibold text-rose-400">
                            {(joint.tensileLoadN / 1000).toFixed(2)} kN
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-cyan-400">
                            {(joint.shearLoadN / 1000).toFixed(2)} kN
                          </td>
                          <td className="py-1.5 px-3 font-bold text-white">
                            {joint.governingSafetyFactor.toFixed(1)}:1
                          </td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                joint.status === 'critical_exceeded'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                  : joint.status === 'caution'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              }`}
                            >
                              {joint.status === 'critical_exceeded' ? 'EXCEEDED' : joint.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remediation Advice & Warnings List */}
              {riggingReport.warnings.length > 0 && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                    Structural Rigging Warnings &amp; Remediation:
                  </div>
                  {riggingReport.warnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-300 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                  {riggingReport.remediationAdvice.map((adv, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-emerald-300 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
