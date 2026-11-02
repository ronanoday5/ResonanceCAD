import React, { useState } from 'react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  CameraPreset,
  EnclosureDimensions,
  MaterialType,
  PartMetadata,
} from '../types/loudspeaker.ts';
import type { CadExportScope } from '../services/cadExportEngine.ts';
import {
  resolvePartInspectionTarget,
  type ComplexityMode,
} from '../services/contextActionEngine.ts';
import type { WorkflowMode } from './TopHeader.tsx';
import { ControlDock, type TabType } from './ControlDock.tsx';
import { useUnits } from '../context/UnitContext.tsx';
import { calculateOptimalAlignment, DRIVER_PRESETS, MATERIAL_SPECS } from '../services/acousticEngine.ts';
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Disc3,
  Download,
  FileSpreadsheet,
  Layers,
  MousePointerClick,
  Sliders,
  Sparkles,
  Volume2,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

export type InspectorTab = 'telemetry' | TabType;

interface RightPropertyInspectorProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: InspectorTab;
  onSelectTab: (tab: InspectorTab) => void;
  dimensions: EnclosureDimensions;
  setDimensions: React.Dispatch<React.SetStateAction<EnclosureDimensions>>;
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  results: AcousticCalculationResult;
  activeWorkflowMode: WorkflowMode;
  onSelectWorkflowMode: (mode: WorkflowMode) => void;
  explodedPercent: number;
  setExplodedPercent: (val: number) => void;
  isXRayMode: boolean;
  setIsXRayMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCutawayMode: boolean;
  setIsCutawayMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isWireframeMode: boolean;
  setIsWireframeMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  onOpenCutList: () => void;
  onOpenResponseChart: () => void;
  onOpenCrossoverDesigner: () => void;
  onOpenCustomDriver: () => void;
  onAutoAlign: () => void;
  hasPendingOptimizations?: boolean;
  pendingOptimizationReasons?: string[];
  isAirflowStressVisible: boolean;
  onToggleAirflowStress: () => void;
  isVibrationAnalysisVisible: boolean;
  onToggleVibrationAnalysis: () => void;
  onOpenCadExport: (scope?: CadExportScope) => void;
  complexityMode?: ComplexityMode;
  onToggleComplexityMode?: (mode?: ComplexityMode) => void;
  selectedPartId?: string | null;
  selectedPart?: PartMetadata | null;
  onClearSelectedPart?: () => void;
  focusedSectionId?: string | null;
  onFocusInspectorSection?: (tab: InspectorTab, sectionId: string) => void;
  onToggleTpmsMatrix?: () => void;
  onCyclePortProfile?: () => void;
}

export const RightPropertyInspector: React.FC<RightPropertyInspectorProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onSelectTab,
  dimensions,
  setDimensions,
  acoustics,
  setAcoustics,
  results,
  activeWorkflowMode,
  onSelectWorkflowMode,
  explodedPercent,
  setExplodedPercent,
  isXRayMode,
  setIsXRayMode,
  isCutawayMode,
  setIsCutawayMode,
  isWireframeMode,
  setIsWireframeMode,
  cameraPreset,
  setCameraPreset,
  onOpenCutList,
  onOpenResponseChart,
  onOpenCrossoverDesigner,
  onOpenCustomDriver,
  onAutoAlign,
  hasPendingOptimizations = false,
  pendingOptimizationReasons = [],
  isAirflowStressVisible,
  onToggleAirflowStress,
  isVibrationAnalysisVisible,
  onToggleVibrationAnalysis,
  onOpenCadExport,
  complexityMode = 'essentials',
  onToggleComplexityMode,
  selectedPartId = null,
  selectedPart = null,
  onClearSelectedPart,
  focusedSectionId = null,
  onFocusInspectorSection,
  onToggleTpmsMatrix,
  onCyclePortProfile,
}) => {
  const { formatLength, formatVolume } = useUnits();
  const [showAllTabsOverride, setShowAllTabsOverride] = useState<boolean>(false);

  const partTarget = resolvePartInspectionTarget(selectedPartId);
  const tpmsEnabled = Boolean(results.additiveAcousticReport?.enabled);

  // When a component is selected, auto-route to its target tab
  const activeContextTab: TabType = (partTarget?.tab as TabType) || 'dimensions';

  const optimalAlignment = calculateOptimalAlignment(
    acoustics.driverAssignments.woofer.driver,
    acoustics.alignment
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed md:relative top-12 md:top-0 right-0 bottom-0 z-40 h-[calc(100vh-3rem)] md:h-full flex flex-col bg-[#080b11] border-l border-slate-800/90 text-slate-200 select-none shrink-0 transition-all duration-200 ${
          isOpen
            ? 'w-[92vw] sm:w-[400px] lg:w-[440px] xl:w-[480px] translate-x-0 shadow-2xl md:shadow-none'
            : 'w-12 translate-x-full md:translate-x-0'
        }`}
      >
        {/* Inspector Header Bar */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#0a0e16] border-b border-slate-800/90 shrink-0">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onToggleOpen}
                  title="Collapse Property Inspector"
                  className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100 whitespace-nowrap">
                      {selectedPartId ? 'Component Inspector' : 'Enclosure Overview'}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${
                        complexityMode === 'master'
                          ? 'bg-amber-950/80 border-amber-600/80 text-amber-300'
                          : 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300'
                      }`}
                    >
                      {complexityMode === 'master' ? 'Master Engineer' : 'Essentials'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedPartId && onClearSelectedPart && (
                  <button
                    type="button"
                    onClick={onClearSelectedPart}
                    title="Return to global enclosure overview"
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono text-[10px] font-bold transition cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3 h-3 text-cyan-400" />
                    <span>Global Box</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onAutoAlign}
                  title={
                    hasPendingOptimizations
                      ? `Pending improvements (${pendingOptimizationReasons.join(', ')}): Click to auto-optimize volume, tuning, port velocity, and 3D layout`
                      : 'Smart 1-click optimization: Align volume/tuning, size port for laminar flow, and clear 3D clashes'
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                    hasPendingOptimizations
                      ? 'bg-amber-950/90 hover:bg-amber-900 text-amber-200 border-amber-500/80 shadow-sm'
                      : 'bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border-cyan-700/70'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Auto-Optimize</span>
                  {hasPendingOptimizations && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                type="button"
                onClick={onToggleOpen}
                title="Expand Property Inspector"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapsed Rail (Desktop) */}
        {!isOpen && (
          <div className="hidden md:flex flex-col items-center py-4 gap-3 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-2 rounded-lg bg-slate-900 text-cyan-400 border border-slate-800"
              title="Expand Property Inspector"
            >
              <MousePointerClick className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Expanded Inspector Content */}
        {isOpen && (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-slate-800">
            {/* CONTEXT-AWARE ACTION STRIP (Docked cleanly at top of RightPropertyInspector when a 3D component is active) */}
            {selectedPartId && partTarget && (
              <div className="px-3 py-2 bg-[#0b1322] border-b border-cyan-800/80 space-y-1.5 font-mono text-xs shrink-0 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MousePointerClick className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-bold text-[11px] text-cyan-200 truncate">
                      {selectedPart?.name || partTarget.partTitle}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-700/80 text-[9px] text-cyan-300 uppercase shrink-0">
                      {partTarget.categoryBadge}
                    </span>
                  </div>
                  {onClearSelectedPart && (
                    <button
                      type="button"
                      onClick={onClearSelectedPart}
                      title="Deselect 3D component"
                      className="p-0.5 rounded text-slate-400 hover:text-rose-300 transition cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Contextual Quick-Action Buttons for Selected Component */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {partTarget.category === 'transducer' && (
                    <button
                      type="button"
                      onClick={onOpenCustomDriver}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] transition cursor-pointer"
                    >
                      Edit T/S Specs
                    </button>
                  )}

                  {partTarget.category === 'port' && (
                    <>
                      {onCyclePortProfile && (
                        <button
                          type="button"
                          onClick={onCyclePortProfile}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold transition cursor-pointer"
                        >
                          Cycle Profile
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenCadExport('port_only')}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] transition cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Port STL</span>
                      </button>
                    </>
                  )}

                  {(partTarget.category === 'enclosure_panel' ||
                    partTarget.category === 'tpms_matrix' ||
                    partTarget.category === 'bracing') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleTpmsMatrix?.();
                          onFocusInspectorSection?.('acoustics', 'section-tpms-matrix');
                        }}
                        className={`px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                          tpmsEnabled
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>TPMS Gyroid: {tpmsEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenCutList}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-purple-400" />
                        <span>Cut List</span>
                      </button>
                    </>
                  )}

                  {partTarget.category === 'crossover' && (
                    <button
                      type="button"
                      onClick={onOpenCrossoverDesigner}
                      className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 border border-purple-600/80 text-purple-200 text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Cpu className="w-3 h-3 text-purple-400" />
                      <span>Crossover &amp; PCB</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PURE CLICK-TO-INSPECT CONTENT */}
            {selectedPartId === null && !showAllTabsOverride ? (
              /* GLOBAL ENCLOSURE OVERVIEW (When no part is selected) */
              <div className="p-3.5 space-y-4 font-mono text-xs">
                {/* Visual Spatial Guidance Tip */}
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-200/90 flex items-start gap-2">
                  <MousePointerClick className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Click any component in the 3D model (Woofer, Port, Walls, Bracing) to instantly inspect and configure its specific engineering controls.
                  </p>
                </div>

                {/* 1. Cabinet External Dimensions Card */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase text-[11px]">
                      <Box className="w-3.5 h-3.5 text-amber-400" />
                      <span>1. Cabinet Dimensions</span>
                    </span>
                    <span className="text-[10px] text-cyan-300 font-bold">
                      Net: {formatVolume(results.netVolumeLiters)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">WIDTH</label>
                      <input
                        type="number"
                        value={dimensions.externalWidthMm}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            externalWidthMm: Math.max(100, Number(e.target.value)),
                          }))
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold focus:border-cyan-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">HEIGHT</label>
                      <input
                        type="number"
                        value={dimensions.externalHeightMm}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            externalHeightMm: Math.max(100, Number(e.target.value)),
                          }))
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold focus:border-cyan-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">DEPTH</label>
                      <input
                        type="number"
                        value={dimensions.externalDepthMm}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            externalDepthMm: Math.max(100, Number(e.target.value)),
                          }))
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold focus:border-cyan-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Quiet Diagnostic Status: Volume Mismatch */}
                  {Math.abs(results.netVolumeLiters - optimalAlignment.optimalVbLiters) > 4 && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-700/50 text-[10.5px] text-amber-200/90">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Target alignment volume: {optimalAlignment.optimalVbLiters.toFixed(1)}L</span>
                      </span>
                      <span className="text-[9.5px] text-amber-300/80 uppercase font-bold">Suboptimal</span>
                    </div>
                  )}
                </div>

                {/* 2. Transducer (Loudspeaker Driver) */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase text-[11px]">
                      <Disc3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>2. Transducer (Woofer)</span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCustomDriver}
                      className="text-[10px] text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      Edit T/S →
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">DRIVER MODEL</label>
                    <select
                      value={acoustics.driverAssignments.woofer.driver.id}
                      onChange={(e) => {
                        const selected = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                        if (selected) {
                          setAcoustics((prev) => ({
                            ...prev,
                            driverAssignments: {
                              ...prev.driverAssignments,
                              woofer: { ...prev.driverAssignments.woofer, driver: selected },
                            },
                          }));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-cyan-500 focus:outline-hidden"
                    >
                      {DRIVER_PRESETS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brand} {d.model} ({d.nominalDiameterInch}")
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] pt-1 border-t border-slate-800/80">
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">Fs</span>
                      <span className="text-cyan-300 font-bold">{acoustics.driverAssignments.woofer.driver.fs} Hz</span>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">Qts</span>
                      <span className="text-emerald-300 font-bold">{acoustics.driverAssignments.woofer.driver.qts}</span>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">Vas</span>
                      <span className="text-purple-300 font-bold">{acoustics.driverAssignments.woofer.driver.vas} L</span>
                    </div>
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">Xmax</span>
                      <span className="text-amber-300 font-bold">{acoustics.driverAssignments.woofer.driver.xmax} mm</span>
                    </div>
                  </div>
                </div>

                {/* 3. Enclosure Alignment & Tuning Target */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase text-[11px]">
                      <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>3. Alignment &amp; Tuning</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      F3: <strong className="text-cyan-300">{results.f3CutoffHz} Hz</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAcoustics((prev) => ({ ...prev, alignment: 'ported' }))}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-center cursor-pointer transition ${
                        acoustics.alignment === 'ported'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Bass Reflex (Ported)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcoustics((prev) => ({ ...prev, alignment: 'sealed' }))}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-center cursor-pointer transition ${
                        acoustics.alignment === 'sealed'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Acoustic Suspension (Sealed)
                    </button>
                  </div>

                  {acoustics.alignment === 'ported' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Target Tuning (Fb):</span>
                        <span className="font-bold text-cyan-300">{acoustics.targetFb} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        value={acoustics.targetFb}
                        onChange={(e) =>
                          setAcoustics((prev) => ({ ...prev, targetFb: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
                      />

                      {/* Quiet Diagnostic Status: Port Turbulence Risk */}
                      {(results.isChuffingRisk || results.portAirVelocityMs > 17) && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-700/60 text-[10.5px] text-rose-200/90 mt-1">
                          <span className="flex items-center gap-1.5">
                            <Wind className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Port velocity: {results.portAirVelocityMs.toFixed(1)} m/s (&gt;17 m/s limit)</span>
                          </span>
                          <span className="text-[9.5px] text-rose-300 uppercase font-bold">Chuffing Risk</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Target Qtc:</span>
                        <span className="font-bold text-cyan-300">{acoustics.targetQtc}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.2"
                        step="0.05"
                        value={acoustics.targetQtc}
                        onChange={(e) =>
                          setAcoustics((prev) => ({ ...prev, targetQtc: Number(e.target.value) }))
                        }
                        className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Primary Material & Thickness Card */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>4. Construction Material</span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCutList}
                      className="text-[10px] text-purple-300 hover:text-purple-200 cursor-pointer"
                    >
                      View Cut List →
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">MATERIAL TYPE</label>
                    <select
                      value={dimensions.material}
                      onChange={(e) =>
                        setDimensions((prev) => ({ ...prev, material: e.target.value as MaterialType }))
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-cyan-500 focus:outline-hidden"
                    >
                      <option value="baltic_birch_18">18mm Baltic Birch Plywood (High Stiffness)</option>
                      <option value="mdf_19">19mm High-Density MDF (High Damping)</option>
                      <option value="petg_cf">PETG-CF Carbon-Fiber Infused 3D Print</option>
                      <option value="aluminum_6061">6061-T6 Billet Aluminum (Ultra-Rigid)</option>
                    </select>
                  </div>
                </div>

                {/* Master Mode Expandable Browser */}
                {complexityMode === 'master' && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllTabsOverride(true)}
                      className="text-[11px] text-slate-400 hover:text-cyan-300 underline font-mono transition cursor-pointer"
                    >
                      Browse All Engineering Sub-Tabs (FEA, Drivers, Acoustics) →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* FOCUSED CONTROL DOCK FOR ACTIVE 3D PART (OR FULL BROWSER) */
              <div className="flex-1 flex flex-col min-h-0">
                {showAllTabsOverride && selectedPartId === null && (
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">All System Browser</span>
                    <button
                      type="button"
                      onClick={() => setShowAllTabsOverride(false)}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] underline cursor-pointer"
                    >
                      ← Back to Simplified
                    </button>
                  </div>
                )}

                <ControlDock
                  isOpen={true}
                  dockedRight={true}
                  activeTab={selectedPartId ? activeContextTab : (activeTab as TabType)}
                  setActiveTab={(t) => onSelectTab(t)}
                  dimensions={dimensions}
                  setDimensions={setDimensions}
                  acoustics={acoustics}
                  setAcoustics={setAcoustics}
                  results={results}
                  activeWorkflowMode={activeWorkflowMode}
                  onSelectWorkflowMode={onSelectWorkflowMode}
                  explodedPercent={explodedPercent}
                  setExplodedPercent={setExplodedPercent}
                  isXRayMode={isXRayMode}
                  setIsXRayMode={setIsXRayMode}
                  isCutawayMode={isCutawayMode}
                  setIsCutawayMode={setIsCutawayMode}
                  isWireframeMode={isWireframeMode}
                  setIsWireframeMode={setIsWireframeMode}
                  cameraPreset={cameraPreset}
                  setCameraPreset={setCameraPreset}
                  onOpenCutList={onOpenCutList}
                  onOpenResponseChart={onOpenResponseChart}
                  onOpenCrossoverDesigner={onOpenCrossoverDesigner}
                  onOpenCustomDriver={onOpenCustomDriver}
                  isAirflowStressVisible={isAirflowStressVisible}
                  onToggleAirflowStress={onToggleAirflowStress}
                  isVibrationAnalysisVisible={isVibrationAnalysisVisible}
                  onToggleVibrationAnalysis={onToggleVibrationAnalysis}
                  onOpenCadExport={onOpenCadExport}
                  complexityMode={complexityMode}
                  onToggleComplexityMode={onToggleComplexityMode}
                  focusedSectionId={focusedSectionId}
                />
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
