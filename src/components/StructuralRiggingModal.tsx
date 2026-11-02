import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Box,
  Check,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Info,
  Layers,
  Maximize2,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Waves,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { EnclosureDimensions } from '../types/loudspeaker.ts';
import type { ArrayCurvaturePreset } from '../types/lineArray.ts';
import type {
  PickPointConfig,
  RiggingJointLoad,
  RiggingRegulatoryStandard,
  StructuralRiggingReport,
} from '../types/rigging.ts';
import {
  RIGGING_PIN_CATALOG,
  STANDARD_REQUIRED_SAFETY_FACTORS,
  calculateStructuralRigging,
  isPaStyleSpeaker,
} from '../services/structuralRiggingEngine.ts';
import { useUnits } from '../context/UnitContext.tsx';

interface StructuralRiggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: EnclosureDimensions;
  onSwitchToPaArchitecture?: () => void;
  onApplyRiggingSettings?: (tiltDeg: number, boxCount: number, totalMassKg: number) => void;
  embedded?: boolean;
}

export const StructuralRiggingModal: React.FC<StructuralRiggingModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  onSwitchToPaArchitecture,
  onApplyRiggingSettings,
  embedded = false,
}) => {
  const { formatWeight, formatLength, unitSystem } = useUnits();

  // Rigging parameters state
  const isPa = isPaStyleSpeaker(dimensions);

  const [boxCount, setBoxCount] = useState<number>(8);
  const [boxWeightKg, setBoxWeightKg] = useState<number>(32);
  const [bumperWeightKg, setBumperWeightKg] = useState<number>(45);
  const [cablesWeightKg, setCablesWeightKg] = useState<number>(18);
  const [hangingAngleDeg, setHangingAngleDeg] = useState<number>(-4.0); // e.g. -4° down-tilt
  const [curvaturePreset, setCurvaturePreset] = useState<ArrayCurvaturePreset>('j_curve');
  const [regulatoryStandard, setRegulatoryStandard] = useState<RiggingRegulatoryStandard>('dguv_17');
  const [pinSpecKey, setPinSpecKey] = useState<string>('pin_10mm_17_4ph');
  const [dynamicShockFactor, setDynamicShockFactor] = useState<number>(1.15); // 1.15x outdoor gust factor
  const [pickPointConfig, setPickPointConfig] = useState<PickPointConfig>('dual_motor_bridle');

  const [selectedJointIdx, setSelectedJointIdx] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'visual_elevation' | 'joint_table' | 'pick_points'>('visual_elevation');

  // Compute inter-box splay angles based on curvature preset
  const interBoxSplayAnglesDeg: number[] = useMemo(() => {
    const splays: number[] = [];
    for (let i = 0; i < boxCount - 1; i++) {
      switch (curvaturePreset) {
        case 'straight':
          splays.push(0);
          break;
        case 'constant_curvature':
          splays.push(3.0);
          break;
        case 'spiral_progressive': {
          const norm = (i + 1) / Math.max(1, boxCount - 1);
          splays.push(Math.round(Math.pow(norm, 1.8) * 10 * 10) / 10);
          break;
        }
        case 'j_curve':
        default: {
          const prog = i / Math.max(1, boxCount - 2);
          if (prog < 0.4) splays.push(0.5);
          else if (prog < 0.7) splays.push(2.5);
          else splays.push(Math.min(10, Math.round((4 + (prog - 0.7) * 20) * 10) / 10));
          break;
        }
      }
    }
    return splays;
  }, [boxCount, curvaturePreset]);

  // Run structural analysis
  const report: StructuralRiggingReport = useMemo(() => {
    return calculateStructuralRigging({
      boxCount,
      boxWeightKg,
      boxHeightMm: Math.min(350, Math.max(220, dimensions.externalHeightMm || 280)),
      boxDepthMm: Math.max(450, dimensions.externalDepthMm || 520),
      bumperWeightKg,
      bumperLengthMm: 800,
      cablesWeightKg,
      hangingAngleDeg,
      interBoxSplayAnglesDeg,
      curvaturePreset,
      regulatoryStandard,
      pinSpecKey,
      dynamicShockFactor,
      pickPointConfig,
    });
  }, [
    boxCount,
    boxWeightKg,
    dimensions.externalHeightMm,
    dimensions.externalDepthMm,
    bumperWeightKg,
    cablesWeightKg,
    hangingAngleDeg,
    interBoxSplayAnglesDeg,
    curvaturePreset,
    regulatoryStandard,
    pinSpecKey,
    dynamicShockFactor,
    pickPointConfig,
  ]);

  if (!isOpen && !embedded) return null;

  // Handle Export Structural Rigging Certificate
  const handleDownloadCertificate = () => {
    const reportData = {
      project: 'ResonanceCAD Structural Rigging Safety Audit',
      timestamp: report.calculatedTimestamp,
      standard: report.regulatoryStandard.toUpperCase(),
      requiredSafetyFactor: `${report.requiredMinimumSafetyFactor}:1`,
      minimumSafetyFactorAchieved: `${report.minimumSafetyFactor}:1`,
      isCompliant: report.isCompliant,
      totalSuspendedMassKg: report.totalSuspendedMassKg,
      cabinetCount: report.boxCount,
      individualCabinetMassKg: report.individualBoxMassKg,
      hangingAngleDeg: report.hangingAngleDeg,
      curvaturePreset: report.curvaturePreset,
      pinHardware: report.pinSpec.materialName,
      pinShearBreakingCapacityKn: report.pinSpec.doubleShearBreakingLoadKn,
      pinTensileBreakingCapacityKn: report.pinSpec.singleTensileBreakingLoadKn,
      pickPointLoads: report.pickPoints,
      criticalJointIndex: report.criticalJointIndex,
      activeWarnings: report.warnings,
      remediationAdvice: report.remediationAdvice,
      joints: report.joints,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rigging_Safety_Audit_${report.regulatoryStandard}_${boxCount}box.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Unified Rigging Safety Optimization
  const handleAutoOptimizeRigging = () => {
    setPinSpecKey('pin_12mm_17_4ph');
    setPickPointConfig('dual_motor_bridle');
    if (hangingAngleDeg < -4) {
      setHangingAngleDeg(-3.0);
    }
    if (boxCount > 12) {
      setBoxCount(12);
    }
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
            ? 'relative w-full h-full bg-[#0a0d14] flex flex-col text-slate-200 font-sans overflow-hidden'
            : 'relative w-full max-w-6xl bg-[#0a0d14] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans cursor-default max-h-[94vh]'
        }
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#07090e] border-b border-slate-800/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-rose-700 text-white shadow-md">
              <ShieldAlert className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Structural Rigging Analysis &amp; Hardware Safety Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-bold">
                  PA &amp; Touring Flown Rigging
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calculates real-time tensile and shear loads on quick-release pins and rigging tracks under dynamic wind &amp; tilt loads (ANSI E1.8 &amp; DGUV 17 standards).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onApplyRiggingSettings && (
              <button
                type="button"
                onClick={() =>
                  onApplyRiggingSettings(
                    hangingAngleDeg,
                    boxCount,
                    report.totalSuspendedMassKg
                  )
                }
                title="Sync Rigging Load & Tilt Configuration to Main Project"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80 font-mono text-xs font-semibold transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sync Rigging Spec</span>
              </button>
            )}
            <button
              onClick={handleDownloadCertificate}
              title="Download Structural Rigging Safety Audit Certificate (.json)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold transition cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Audit</span>
            </button>
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

        {/* PA Style Qualification Check Notice (if user is on studio monitor) */}
        {!isPa && (
          <div className="mx-5 mt-4 p-3.5 rounded-xl bg-blue-950/70 border border-blue-700/80 text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-sans">
                  Notice: Structural Rigging is designed for PA &amp; Live Sound Loudspeakers
                </strong>
                <span className="text-blue-300 text-[11px] leading-relaxed">
                  Your active enclosure is classified as a Studio Monitor. Flown structural rigging analysis applies to touring PA line arrays, flown subwoofers, and concert clusters.
                </span>
              </div>
            </div>
            {onSwitchToPaArchitecture && (
              <button
                type="button"
                onClick={onSwitchToPaArchitecture}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold whitespace-nowrap transition cursor-pointer shadow-md"
              >
                Switch to PA Touring Spec &rarr;
              </button>
            )}
          </div>
        )}

        {/* Global Safety Factor Status Banner */}
        <div className="px-5 pt-3">
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shadow-md ${
              !report.isCompliant
                ? 'bg-rose-950/80 border-rose-600/90 text-rose-100 animate-pulse'
                : report.minimumSafetyFactor < report.requiredMinimumSafetyFactor * 1.3
                ? 'bg-amber-950/70 border-amber-600/80 text-amber-100'
                : 'bg-emerald-950/70 border-emerald-600/80 text-emerald-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {!report.isCompliant ? (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : report.minimumSafetyFactor < report.requiredMinimumSafetyFactor * 1.3 ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                  <span>
                    {!report.isCompliant
                      ? 'STRUCTURAL SAFETY VIOLATION EXCEEDED'
                      : report.minimumSafetyFactor < report.requiredMinimumSafetyFactor * 1.3
                      ? 'STRUCTURAL LOAD CAUTION (NEAR REGULATORY LIMIT)'
                      : 'ALL RIGGING HARDWARE FULLY CERTIFIED & COMPLIANT'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-black/40 font-mono">
                    GOVERNING SF: {report.minimumSafetyFactor.toFixed(1)}:1 (REQUIRED &ge;{' '}
                    {report.requiredMinimumSafetyFactor}:1)
                  </span>
                </div>
                <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
                  {!report.isCompliant
                    ? `Joint #${report.criticalJointIndex + 1} (${report.joints[report.criticalJointIndex].parentLabel} -> ${report.joints[report.criticalJointIndex].childLabel}) exceeds allowable mechanical stress under ${report.regulatoryStandard.toUpperCase()} regulations!`
                    : `Total suspended mass of ${formatWeight(report.totalSuspendedMassKg)} is safely supported with double-shear margin of safety.`}
                </div>
              </div>
            </div>

            {/* Unified Remediation Action if violation */}
            {!report.isCompliant && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoOptimizeRigging}
                  className="py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-600 text-white border border-rose-400/50 font-bold text-[11px] transition cursor-pointer shadow"
                >
                  Auto-Optimize Rigging Safety
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between text-xs font-mono border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'visual_elevation', label: '1. Articulated Load Elevation (Vector CAD)' },
              { id: 'joint_table', label: '2. Joint-by-Joint Tensile & Shear Table' },
              { id: 'pick_points', label: '3. Hoist Pick Points & Center of Mass' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span>Hardware:</span>
            <span className="text-cyan-300 font-bold">{report.pinSpec.materialName}</span>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Rigging Parameters & Environmental Controls (4 Cols) */}
          <div className="lg:col-span-4 space-y-4 font-mono text-xs">
            {/* Rigging Setup Group */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Array Rigging Geometry
              </div>

              {/* Cabinet Count */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Array Cabinet Count:</span>
                  <span className="text-cyan-300 font-bold">{boxCount} Modules</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={boxCount}
                  onChange={(e) => setBoxCount(parseInt(e.target.value) || 2)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Hanging Angle / Tilt */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Flybar Hanging Down-Tilt:</span>
                  <span
                    className={`font-bold ${
                      hangingAngleDeg < -8
                        ? 'text-rose-400'
                        : hangingAngleDeg < 0
                        ? 'text-cyan-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {hangingAngleDeg.toFixed(1)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={hangingAngleDeg}
                  onChange={(e) => setHangingAngleDeg(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>-15° Steep Down</span>
                  <span>0° Horizontal</span>
                  <span>+15° Up-Tilt</span>
                </div>
              </div>

              {/* Box Mass */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Box Mass (kg):</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={boxWeightKg}
                    onChange={(e) => setBoxWeightKg(parseFloat(e.target.value) || 30)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Bumper Mass (kg):</label>
                  <input
                    type="number"
                    min="15"
                    max="200"
                    value={bumperWeightKg}
                    onChange={(e) => setBumperWeightKg(parseFloat(e.target.value) || 45)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                  />
                </div>
              </div>

              {/* Curvature Preset */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Curvature Profile:</label>
                <select
                  value={curvaturePreset}
                  onChange={(e) => setCurvaturePreset(e.target.value as ArrayCurvaturePreset)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="j_curve">Concert J-Curve (Standard Live)</option>
                  <option value="spiral_progressive">Spiral Progressive Expansion</option>
                  <option value="constant_curvature">Constant Curvature (3.0°)</option>
                  <option value="straight">Straight Line Array (0.0°)</option>
                </select>
              </div>
            </div>

            {/* Hardware & Regulatory Standards Group */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Hardware Specs &amp; Codes
              </div>

              {/* Regulatory Standard */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Regulatory Code:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegulatoryStandard('dguv_17')}
                    className={`p-2 rounded-lg border text-left transition ${
                      regulatoryStandard === 'dguv_17'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">DGUV 17 (10:1)</div>
                    <div className="text-[10px] text-slate-500">Overhead Public Audience</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegulatoryStandard('ansi_e1_8')}
                    className={`p-2 rounded-lg border text-left transition ${
                      regulatoryStandard === 'ansi_e1_8'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">ANSI E1.8 (5:1)</div>
                    <div className="text-[10px] text-slate-500">US Entertainment Rigging</div>
                  </button>
                </div>
              </div>

              {/* Flying Hardware Pin Spec */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Rigging Quick-Release Pin:</label>
                <select
                  value={pinSpecKey}
                  onChange={(e) => setPinSpecKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-[11px]"
                >
                  {Object.entries(RIGGING_PIN_CATALOG).map(([key, spec]) => (
                    <option key={key} value={key}>
                      {spec.materialName} (Shear: {spec.doubleShearBreakingLoadKn}kN, Tensile: {spec.singleTensileBreakingLoadKn}kN)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Wind & Gust Multiplier */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Dynamic Gust Factor:</span>
                  <span className="text-cyan-300 font-bold">{dynamicShockFactor.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.05"
                  value={dynamicShockFactor}
                  onChange={(e) => setDynamicShockFactor(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>1.0x Static Arena</span>
                  <span>1.25x Moderate Wind</span>
                  <span>1.5x Storm Gust</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization & Detailed Telemetry (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {/* Visual Elevation Vector CAD Canvas */}
            {activeTab === 'visual_elevation' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 font-mono text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    2D Articulated Hang Elevation &amp; Joint Stress Vector Map
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &ge; 10:1 Safe
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Caution
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt; 5:1 Exceeded
                    </span>
                  </div>
                </div>

                {/* SVG Vector Drawing */}
                <div className="relative w-full h-[360px] my-3 bg-[#06080d] rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 540 360">
                    <defs>
                      <linearGradient id="flybarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                      <linearGradient id="boxRigGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                    </defs>

                    {/* Grid reference */}
                    <line x1="40" y1="330" x2="500" y2="330" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="80" y1="20" x2="80" y2="340" stroke="#1e293b" strokeDasharray="3 3" />

                    {/* Hoist Suspension Cables */}
                    <line x1="120" y1="0" x2="120" y2="40" stroke="#94a3b8" strokeWidth="2.5" />
                    <line x1="200" y1="0" x2="200" y2="40" stroke="#94a3b8" strokeWidth="2.5" />
                    <text x="120" y="32" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      {(report.pickPoints.frontMotorLoadKg).toLocaleString()}kg
                    </text>
                    <text x="200" y="32" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      {(report.pickPoints.rearMotorLoadKg).toLocaleString()}kg
                    </text>

                    {/* Flybar / Bumper */}
                    <rect x="90" y="40" width="130" height="16" rx="3" fill="url(#flybarGrad)" stroke="#64748b" strokeWidth="1.5" />
                    <circle cx="120" cy="48" r="4" fill="#38bdf8" />
                    <circle cx="200" cy="48" r="4" fill="#38bdf8" />

                    {/* Array Cabinets and Joint Pins */}
                    {(() => {
                      let curX = 150;
                      let curY = 62;
                      let curAngleDeg = hangingAngleDeg;
                      const boxW = 65;
                      const boxH = Math.max(12, Math.min(28, 220 / boxCount));

                      return report.joints.map((joint, i) => {
                        curAngleDeg += joint.splayAngleDeg;
                        const rad = (curAngleDeg * Math.PI) / 180;
                        const xPos = curX;
                        const yPos = curY;

                        curX -= Math.sin(rad) * (boxH + 2);
                        curY += Math.cos(rad) * (boxH + 2);

                        const isSelected = selectedJointIdx === i;
                        const pinColor =
                          joint.status === 'critical_exceeded'
                            ? '#f43f5e'
                            : joint.status === 'caution'
                            ? '#f59e0b'
                            : '#10b981';

                        return (
                          <g
                            key={i}
                            transform={`translate(${xPos}, ${yPos}) rotate(${curAngleDeg})`}
                            onClick={() => setSelectedJointIdx(i)}
                            className="cursor-pointer group"
                          >
                            {/* Cabinet Body */}
                            <rect
                              x={-boxW / 2}
                              y={-boxH / 2}
                              width={boxW}
                              height={boxH}
                              rx="2"
                              fill="url(#boxRigGrad)"
                              stroke={isSelected ? '#38bdf8' : '#334155'}
                              strokeWidth={isSelected ? 2 : 1}
                            />

                            {/* Front Hinge Pin (Double Shear Carrier) */}
                            <circle
                              cx={-boxW / 2 + 5}
                              cy={-boxH / 2 + 3}
                              r={isSelected ? 4 : 3}
                              fill={pinColor}
                              stroke="#ffffff"
                              strokeWidth="0.5"
                            />

                            {/* Rear Splay Angle Pin (Tensile Carrier) */}
                            <circle
                              cx={boxW / 2 - 5}
                              cy={-boxH / 2 + 3}
                              r={isSelected ? 4 : 3}
                              fill={pinColor}
                              stroke="#ffffff"
                              strokeWidth="0.5"
                            />

                            {/* Joint Index Label */}
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

                            {/* Safety Factor Tag */}
                            <text
                              x={boxW / 2 + 10}
                              y="3"
                              fill={pinColor}
                              fontSize="7"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {joint.governingSafetyFactor.toFixed(1)}:1
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {/* Array Center of Gravity crosshair marker */}
                    <g transform={`translate(${report.pickPoints.centerOfGravityOffsetMm * 0.25 + 90}, 160)`}>
                      <circle cx="0" cy="0" r="7" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="-10" y1="0" x2="10" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="0" y1="-10" x2="0" y2="10" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="14" y="4" fill="#f59e0b" fontSize="8" fontFamily="monospace">
                        CG
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Selected Joint Telemetry Inspector */}
                {selectedJointIdx !== null && report.joints[selectedJointIdx] && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="font-bold text-amber-400">
                        INSPECTING JOINT #{selectedJointIdx + 1}: {report.joints[selectedJointIdx].parentLabel} &rarr; {report.joints[selectedJointIdx].childLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          report.joints[selectedJointIdx].status === 'critical_exceeded'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : report.joints[selectedJointIdx].status === 'caution'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        SF {report.joints[selectedJointIdx].governingSafetyFactor.toFixed(1)}:1 ({report.joints[selectedJointIdx].status.replace('_', ' ')})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">REAR LINK TENSION</div>
                        <div className="text-sm font-bold text-rose-400">
                          {(report.joints[selectedJointIdx].tensileLoadN / 1000).toFixed(2)} kN
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          SF: {report.joints[selectedJointIdx].tensileSafetyFactor.toFixed(1)}:1
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">FRONT PIN SHEAR</div>
                        <div className="text-sm font-bold text-cyan-400">
                          {(report.joints[selectedJointIdx].shearLoadN / 1000).toFixed(2)} kN
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          SF: {report.joints[selectedJointIdx].shearSafetyFactor.toFixed(1)}:1
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">VON MISES STRESS</div>
                        <div className="text-sm font-bold text-amber-300">
                          {(report.joints[selectedJointIdx].combinedVonMisesN / 1000).toFixed(2)} kN
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Eq. Resultant
                        </div>
                      </div>

                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400">SUSPENDED MASS</div>
                        <div className="text-sm font-bold text-slate-200">
                          {formatWeight(report.joints[selectedJointIdx].suspendedMassBelowKg)}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {boxCount - selectedJointIdx} Boxes Below
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Joint-by-Joint Detailed Table */}
            {activeTab === 'joint_table' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs flex-1 flex flex-col">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    COMPLETE PER-CABINET FLYING HARDWARE STRESS AUDIT
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    PIN MBL: {report.pinSpec.doubleShearBreakingLoadKn}kN Shear / {report.pinSpec.singleTensileBreakingLoadKn}kN Tension
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Joint</th>
                        <th className="py-2.5 px-3">Connection</th>
                        <th className="py-2.5 px-3">Splay</th>
                        <th className="py-2.5 px-3">Tilt</th>
                        <th className="py-2.5 px-3">Sub-Mass</th>
                        <th className="py-2.5 px-3">Tensile (Rear)</th>
                        <th className="py-2.5 px-3">Shear (Front)</th>
                        <th className="py-2.5 px-3">Safety Factor</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {report.joints.map((joint) => (
                        <tr
                          key={joint.jointIndex}
                          onClick={() => setSelectedJointIdx(joint.jointIndex)}
                          className={`hover:bg-slate-900/60 transition cursor-pointer ${
                            selectedJointIdx === joint.jointIndex ? 'bg-slate-900/90' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-amber-300">#{joint.jointIndex + 1}</td>
                          <td className="py-2 px-3 text-slate-300">
                            {joint.parentLabel} &rarr; {joint.childLabel}
                          </td>
                          <td className="py-2 px-3">{joint.splayAngleDeg.toFixed(1)}°</td>
                          <td className="py-2 px-3">{joint.cumulativeTiltDeg.toFixed(1)}°</td>
                          <td className="py-2 px-3">{formatWeight(joint.suspendedMassBelowKg)}</td>
                          <td className="py-2 px-3 font-semibold text-rose-400">
                            {(joint.tensileLoadN / 1000).toFixed(2)} kN
                          </td>
                          <td className="py-2 px-3 font-semibold text-cyan-400">
                            {(joint.shearLoadN / 1000).toFixed(2)} kN
                          </td>
                          <td className="py-2 px-3 font-bold text-white">
                            {joint.governingSafetyFactor.toFixed(1)}:1
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
            )}

            {/* Hoist Pick Points & Bridle Breakdown */}
            {activeTab === 'pick_points' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-4 flex-1">
                <div className="font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Hoist Motor Rigging &amp; Center of Mass Telemetry
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-slate-400 text-[11px]">FRONT HOIST MOTOR LOAD</div>
                    <div className="text-xl font-bold text-cyan-300">
                      {formatWeight(report.pickPoints.frontMotorLoadKg)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Force: {(report.pickPoints.frontMotorLoadN / 1000).toFixed(2)} kN
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-slate-400 text-[11px]">REAR HOIST MOTOR LOAD</div>
                    <div className="text-xl font-bold text-cyan-300">
                      {formatWeight(report.pickPoints.rearMotorLoadKg)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Force: {(report.pickPoints.rearMotorLoadN / 1000).toFixed(2)} kN
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Array Center of Mass (X):</span>
                    <span className="font-bold text-white">{report.pickPoints.centerOfGravityOffsetMm} mm from front bumper</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Array Center of Mass (Y):</span>
                    <span className="font-bold text-white">{report.pickPoints.centerOfGravityHeightMm} mm below flybar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Natural Single-Pick Equilibrium Tilt:</span>
                    <span className="font-bold text-amber-300">{report.pickPoints.naturalHangAngleDeg}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bridle Leg Angle:</span>
                    <span className="font-bold text-slate-200">{report.pickPoints.bridleAngleDeg}°</span>
                  </div>
                </div>

                {/* Warnings and Advice */}
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg space-y-1.5 text-[11px]">
                  <div className="font-bold text-amber-400">ENGINEERING RECOMMENDATIONS:</div>
                  {report.remediationAdvice.map((adv, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span className="text-cyan-400">&bull;</span>
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Synchronize Button */}
            {onApplyRiggingSettings && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400">
                  Total Array Mass:{' '}
                  <strong className="text-white">{formatWeight(report.totalSuspendedMassKg)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onApplyRiggingSettings?.(hangingAngleDeg, boxCount, report.totalSuspendedMassKg);
                    onClose();
                  }}
                  className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Hanging Tilt to Line Array CAD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
