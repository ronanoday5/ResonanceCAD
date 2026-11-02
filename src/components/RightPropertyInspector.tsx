import React, { useState } from 'react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  CaliberDeltaEvent,
  CameraPreset,
  CoOptimizationConfig,
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
  Flame,
  Layers,
  Lock,
  MousePointerClick,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
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
  coOptConfig?: CoOptimizationConfig;
  onChangeCoOptConfig?: React.Dispatch<React.SetStateAction<CoOptimizationConfig>>;
  lastCaliberDelta?: CaliberDeltaEvent | null;
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
  coOptConfig,
  onChangeCoOptConfig,
  lastCaliberDelta,
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

                  {(partTarget.category === 'transducer' ||
                    partTarget.category === 'terminal' ||
                    partTarget.category === 'enclosure_panel' ||
                    partTarget.category === 'hardware') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDimensions((prev) => {
                          const currentlyOn = Boolean(
                            prev.thermalVentConfig?.enabled !== undefined
                              ? prev.thermalVentConfig.enabled
                              : prev.hardware?.showThermalVentSlots
                          );
                          const nextState = !currentlyOn;
                          return {
                            ...prev,
                            hardware: {
                              ...(prev.hardware || {
                                showHandles: false,
                                showPoleMount: false,
                                showCornerProtectors: false,
                                showIsolationFeet: true,
                              }),
                              showThermalVentSlots: nextState,
                            },
                            thermalVentConfig: {
                              ...(prev.thermalVentConfig || {}),
                              enabled: nextState,
                            },
                          };
                        });
                      }}
                      className={`px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        results.thermalVentReport?.enabled
                          ? 'bg-orange-950 border-orange-500 text-orange-200'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>
                        Rear Thermal Vents:{' '}
                        {results.thermalVentReport?.enabled
                          ? `ON (${results.thermalVentReport.slotCount}x)`
                          : 'OFF'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PURE CLICK-TO-INSPECT CONTENT */}
            {selectedPartId === null && !showAllTabsOverride ? (
              /* GLOBAL ENCLOSURE OVERVIEW (When no part is selected) */
              <div className="p-3.5 space-y-4 font-mono text-xs">
                {/* 0. REAL-TIME REFERENCE CALIBER SCORE (0-100) & CLOSED-LOOP CO-OPTIMIZATION ENGINE */}
                {results.caliberReport && (
                  <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-3 space-y-2.5 tabular-nums">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShieldCheck
                          className={`w-4 h-4 shrink-0 ${
                            results.caliberReport.overallScore >= 92
                              ? 'text-emerald-400'
                              : results.caliberReport.overallScore >= 82
                              ? 'text-cyan-400'
                              : 'text-amber-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-100 text-[11px] block truncate">
                            Reference Caliber Index
                          </span>
                          <span className="text-[9.5px] text-slate-400 block truncate">
                            {results.caliberReport.gradeLabel} · 6-Axis Multiphysics
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-base font-bold ${
                            results.caliberReport.overallScore >= 92
                              ? 'text-emerald-300'
                              : results.caliberReport.overallScore >= 82
                              ? 'text-cyan-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {results.caliberReport.overallScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500"> / 100</span>
                      </div>
                    </div>

                    {/* Before / After Delta Telemetry on Every Change */}
                    {lastCaliberDelta && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 truncate max-w-[190px]">
                            {lastCaliberDelta.triggerDescription}
                          </span>
                          <span
                            className={`font-bold shrink-0 ${
                              lastCaliberDelta.deltaScore >= 0 ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {lastCaliberDelta.previousScore.toFixed(1)} → {lastCaliberDelta.currentScore.toFixed(1)} (
                            {lastCaliberDelta.deltaScore >= 0
                              ? `+${lastCaliberDelta.deltaScore.toFixed(1)}`
                              : lastCaliberDelta.deltaScore.toFixed(1)}
                            )
                          </span>
                        </div>
                        {lastCaliberDelta.coOptimizedActions.length > 0 && (
                          <div className="text-[9.5px] text-cyan-300 leading-snug">
                            {lastCaliberDelta.coOptimizedActions.join(' · ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6-Axis Multiphysics Sub-Scores */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                      {[
                        {
                          label: 'T/S Vb·Fb',
                          val: results.caliberReport.subScores.alignmentScore,
                        },
                        {
                          label: 'Aero Port',
                          val: results.caliberReport.subScores.aeroPortScore,
                        },
                        {
                          label: 'Thermal',
                          val: results.caliberReport.subScores.thermalHeadroomScore,
                        },
                        {
                          label: 'Modal f11',
                          val: results.caliberReport.subScores.structuralModalScore,
                        },
                        {
                          label: 'Diffraction',
                          val: results.caliberReport.subScores.diffractionDampingScore,
                        },
                        {
                          label: 'Crossover',
                          val: results.caliberReport.subScores.electroAcousticScore,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5"
                        >
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400">{item.label}</span>
                            <span
                              className={`font-bold ${
                                item.val >= 92
                                  ? 'text-emerald-300'
                                  : item.val >= 80
                                  ? 'text-cyan-300'
                                  : 'text-amber-300'
                              }`}
                            >
                              {item.val.toFixed(0)}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full transition-all duration-150 ${
                                item.val >= 92
                                  ? 'bg-emerald-400'
                                  : item.val >= 80
                                  ? 'bg-cyan-400'
                                  : 'bg-amber-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(10, item.val))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Live Closed-Loop Co-Optimization & Lockable Manual Overrides */}
                    {coOptConfig && onChangeCoOptConfig && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-300 font-bold">
                            Closed-Loop Co-Optimization
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeCoOptConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                            }
                            className={`px-2 py-0.5 rounded border text-[9.5px] font-bold transition cursor-pointer ${
                              coOptConfig.enabled
                                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            {coOptConfig.enabled ? 'Active (Auto Co-Adjust)' : 'Paused (Manual)'}
                          </button>
                        </div>

                        {coOptConfig.enabled && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 block">
                              Subsystem Override Locks (Click to lock manual value):
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {(
                                [
                                  { key: 'lockCabinetDimensions', label: 'Depth/Vb' },
                                  { key: 'lockPortGeometry', label: 'Port' },
                                  { key: 'lockThermalVents', label: 'Thermal' },
                                  { key: 'lockStructuralBracing', label: 'Bracing' },
                                  { key: 'lockCrossoverNetwork', label: 'Crossover' },
                                ] as const
                              ).map((lk) => {
                                const isLocked = coOptConfig[lk.key];
                                return (
                                  <button
                                    key={lk.key}
                                    type="button"
                                    onClick={() =>
                                      onChangeCoOptConfig((prev) => ({
                                        ...prev,
                                        [lk.key]: !prev[lk.key],
                                      }))
                                    }
                                    title={
                                      isLocked
                                        ? `${lk.label} is locked to manual override (click to re-enable auto co-optimization)`
                                        : `${lk.label} auto-co-optimizes on changes (click to lock)`
                                    }
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold transition cursor-pointer ${
                                      isLocked
                                        ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-600/60'
                                    }`}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                                    ) : (
                                      <Unlock className="w-2.5 h-2.5 text-cyan-400" />
                                    )}
                                    <span>{lk.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                    <div className="flex items-center gap-2">
                      {coOptConfig && onChangeCoOptConfig && (
                        <button
                          type="button"
                          onClick={() =>
                            onChangeCoOptConfig((prev) => ({
                              ...prev,
                              lockCabinetDimensions: !prev.lockCabinetDimensions,
                            }))
                          }
                          title={
                            coOptConfig.lockCabinetDimensions
                              ? 'Cabinet dimensions locked — unlock to auto-compensate depth when internal displacements change'
                              : 'Iso-Volume depth compensation active — click to lock external dimensions'
                          }
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer ${
                            coOptConfig.lockCabinetDimensions
                              ? 'bg-amber-950 border-amber-500/80 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-cyan-300'
                          }`}
                        >
                          {coOptConfig.lockCabinetDimensions ? (
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                          ) : (
                            <Unlock className="w-2.5 h-2.5 text-cyan-400" />
                          )}
                          <span>{coOptConfig.lockCabinetDimensions ? 'Locked' : 'Iso-Vb'}</span>
                        </button>
                      )}
                      <span className="text-[10px] text-cyan-300 font-bold">
                        Net: {formatVolume(results.netVolumeLiters)}
                      </span>
                    </div>
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

                  <div className="grid grid-cols-5 gap-1 text-[10px] pt-1 border-t border-slate-800/80">
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
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block text-[9px]">Pe Rating</span>
                      <span className="text-orange-300 font-bold">
                        {results.thermalVentReport?.driverContinuousPowerW ?? acoustics.driverAssignments.woofer.driver.pe} W
                      </span>
                    </div>
                  </div>

                  {/* Parametric Rear-Panel Thermal Ventilation Slots (Scaled by Driver Power Rating) */}
                  {results.thermalVentReport && (
                    <div className="pt-2 border-t border-slate-800/90 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10.5px] font-bold text-slate-100 block truncate">
                              Rear Thermal Ventilation Slots
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">
                              {results.thermalVentReport.powerTierLabel}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setDimensions((prev) => {
                              const nextState = !results.thermalVentReport?.enabled;
                              return {
                                ...prev,
                                hardware: {
                                  ...(prev.hardware || {
                                    showHandles: false,
                                    showPoleMount: false,
                                    showCornerProtectors: false,
                                    showIsolationFeet: true,
                                  }),
                                  showThermalVentSlots: nextState,
                                },
                                thermalVentConfig: {
                                  ...(prev.thermalVentConfig || {}),
                                  enabled: nextState,
                                },
                              };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                            results.thermalVentReport.enabled
                              ? 'bg-orange-950/90 border-orange-500 text-orange-200 shadow-xs'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {results.thermalVentReport.enabled
                            ? `ON (${results.thermalVentReport.slotCount} Slots)`
                            : 'Enable Vents'}
                        </button>
                      </div>

                      {results.thermalVentReport.enabled && (
                        <div className="p-2 rounded-lg bg-slate-900/70 border border-orange-900/50 space-y-2">
                          <div className="flex items-center justify-between gap-1.5 text-[9.5px]">
                            <span className="text-slate-400">Slot Sizing Mode:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setDimensions((prev) => ({
                                    ...prev,
                                    thermalVentConfig: {
                                      ...(prev.thermalVentConfig || {}),
                                      enabled: true,
                                      sizingMode: 'auto_driver_pe',
                                    },
                                  }))
                                }
                                className={`px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer ${
                                  results.thermalVentReport.sizingMode === 'auto_driver_pe'
                                    ? 'bg-orange-950 border-orange-500 text-orange-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                              >
                                Auto ({results.thermalVentReport.driverContinuousPowerW}W Pe)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDimensions((prev) => ({
                                    ...prev,
                                    thermalVentConfig: {
                                      ...(prev.thermalVentConfig || {}),
                                      enabled: true,
                                      sizingMode: 'manual',
                                      manualSlotCount: results.thermalVentReport?.slotCount ?? 6,
                                      manualSlotWidthMm: results.thermalVentReport?.slotWidthMm ?? 62,
                                    },
                                  }))
                                }
                                className={`px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer ${
                                  results.thermalVentReport.sizingMode === 'manual'
                                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                              >
                                Manual Override
                              </button>
                            </div>
                          </div>

                          {results.thermalVentReport.sizingMode === 'manual' && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <div className="flex justify-between text-[9.5px] mb-0.5">
                                  <span className="text-slate-400">Slots:</span>
                                  <span className="text-orange-300 font-bold">
                                    {results.thermalVentReport.slotCount}x
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="2"
                                  max="16"
                                  step="2"
                                  value={results.thermalVentReport.slotCount}
                                  onChange={(e) =>
                                    setDimensions((prev) => ({
                                      ...prev,
                                      thermalVentConfig: {
                                        ...(prev.thermalVentConfig || {}),
                                        enabled: true,
                                        sizingMode: 'manual',
                                        manualSlotCount: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-orange-400 cursor-pointer"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-[9.5px] mb-0.5">
                                  <span className="text-slate-400">Slot Width:</span>
                                  <span className="text-cyan-300 font-bold">
                                    {results.thermalVentReport.slotWidthMm}mm
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="30"
                                  max="120"
                                  step="2"
                                  value={results.thermalVentReport.slotWidthMm}
                                  onChange={(e) =>
                                    setDimensions((prev) => ({
                                      ...prev,
                                      thermalVentConfig: {
                                        ...(prev.thermalVentConfig || {}),
                                        enabled: true,
                                        sizingMode: 'manual',
                                        manualSlotWidthMm: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-1 text-[9.5px] pt-1 border-t border-slate-800/80">
                            <div className="bg-slate-950/80 p-1 rounded border border-slate-800/80">
                              <span className="text-[8.5px] text-slate-400 block">CNC Louvers</span>
                              <span className="text-orange-300 font-bold">
                                {results.thermalVentReport.slotCount}× {results.thermalVentReport.slotWidthMm}×{results.thermalVentReport.slotHeightMm}mm
                              </span>
                            </div>
                            <div className="bg-slate-950/80 p-1 rounded border border-slate-800/80">
                              <span className="text-[8.5px] text-slate-400 block">Free Vent Area</span>
                              <span className="text-cyan-300 font-bold">
                                {results.thermalVentReport.totalNetFreeAreaCm2} cm² ({results.thermalVentReport.convectiveVolumeFlowLs} L/s)
                              </span>
                            </div>
                            <div className="bg-slate-950/80 p-1 rounded border border-slate-800/80">
                              <span className="text-[8.5px] text-slate-400 block">Coil Cooling</span>
                              <span className="text-emerald-300 font-bold">
                                -{results.thermalVentReport.voiceCoilTempDropC}°C (+{results.thermalVentReport.powerCompressionSavedDb}dB)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAcoustics((prev) => ({ ...prev, alignment: 'ported' }))}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-center cursor-pointer transition text-[10.5px] ${
                        acoustics.alignment === 'ported'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Ported Reflex
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcoustics((prev) => ({ ...prev, alignment: 'sealed' }))}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-center cursor-pointer transition text-[10.5px] ${
                        acoustics.alignment === 'sealed'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sealed Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcoustics((prev) => ({ ...prev, alignment: 'bandpass4' }))}
                      className={`py-1.5 px-2 rounded-lg border font-bold text-center cursor-pointer transition text-[10.5px] ${
                        acoustics.alignment === 'bandpass4'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      4th-Order BP
                    </button>
                  </div>

                  {acoustics.alignment === 'ported' || acoustics.alignment === 'bandpass4' ? (
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

                      {acoustics.alignment === 'bandpass4' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Front V_f:</span>
                              <span className="font-bold text-cyan-300">
                                {results.subcategoryTelemetry?.bandpassFrontVbLiters ?? 45} L
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="200"
                              value={
                                acoustics.bandpassFrontVbLiters ??
                                results.subcategoryTelemetry?.bandpassFrontVbLiters ??
                                45
                              }
                              onChange={(e) =>
                                setAcoustics((prev) => ({
                                  ...prev,
                                  bandpassFrontVbLiters: Number(e.target.value),
                                }))
                              }
                              className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Rear V_r:</span>
                              <span className="font-bold text-emerald-300">
                                {results.subcategoryTelemetry?.bandpassRearVbLiters ?? 85} L
                              </span>
                            </div>
                            <input
                              type="range"
                              min="15"
                              max="300"
                              value={
                                acoustics.bandpassRearVbLiters ??
                                results.subcategoryTelemetry?.bandpassRearVbLiters ??
                                85
                              }
                              onChange={(e) =>
                                setAcoustics((prev) => ({
                                  ...prev,
                                  bandpassRearVbLiters: Number(e.target.value),
                                }))
                              }
                              className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-emerald-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

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
                      <option value="pa12_cf">PA12-CF Carbon Polyamide (3.5 kN Boss Rated)</option>
                      <option value="aluminum_6061">6061-T6 Billet Aluminum (Ultra-Rigid)</option>
                    </select>
                  </div>
                </div>

                {/* 5. 7-Subsystem Multiphysics Synthesis Blueprint Telemetry */}
                {results.multiphysicsBlueprint && (
                  <div className="bg-[#0b0f17] border border-cyan-900/60 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="font-bold text-cyan-200 flex items-center gap-1.5 uppercase text-[10.5px]">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        <span>5. Multiphysics Blueprint</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-[9px] text-cyan-300 font-bold">
                        7-Stage Solver
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">1. Karal–Fok Brace Mass</span>
                        <span className="text-amber-300 font-bold">
                          {results.multiphysicsBlueprint.karalBraceMass.tuningFrequencyShiftPercent}% Fb Shift
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          Ψ(φ)={results.multiphysicsBlueprint.karalBraceMass.jaouenChevillotteInteractionFactorPsi} • -{results.multiphysicsBlueprint.karalBraceMass.portPreShorteningCompensationMm}mm Lp
                        </span>
                      </div>

                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">2. Port Midpoint HR Trap</span>
                        <span className="text-cyan-300 font-bold">
                          {results.multiphysicsBlueprint.portAeroAndTrap.organPipeFundamentalFreqHz} Hz (-{results.multiphysicsBlueprint.portAeroAndTrap.trapTransmissionLossDb} dB)
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          K_L={results.multiphysicsBlueprint.portAeroAndTrap.effectiveLengthFactorKl} • De={results.multiphysicsBlueprint.portAeroAndTrap.deanNumber}
                        </span>
                      </div>

                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">3. JCA Phase Velocity</span>
                        <span className="text-emerald-300 font-bold">
                          {results.multiphysicsBlueprint.porousAbsorption.effectivePhaseSpeed250HzMs} m/s @ 250Hz
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          λ/4 Core={results.multiphysicsBlueprint.porousAbsorption.quarterWaveAntinodeOffsetMm}mm • Keepout Ø{results.multiphysicsBlueprint.porousAbsorption.portIntakeKeepOutRadiusMm}mm
                        </span>
                      </div>

                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">4. SDF Boss & PD Damping</span>
                        <span className="text-violet-300 font-bold">
                          {results.multiphysicsBlueprint.implicitSdfMonocoque.predictedAxialPullOutForceKn} kN Pull-Out
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          {results.multiphysicsBlueprint.implicitSdfMonocoque.volumetricPackingRatioPercent}% PD Fill (+564% η)
                        </span>
                      </div>

                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">5. CNC √2 Dogbone CAM</span>
                        <span className="text-sky-300 font-bold">
                          {results.multiphysicsBlueprint.subtractiveCncJoinery.dogboneBisectorOffsetMm} mm Offset
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          Dado {results.multiphysicsBlueprint.subtractiveCncJoinery.routedDadoWidthMm}×{results.multiphysicsBlueprint.subtractiveCncJoinery.routedDadoDepthMm}mm
                        </span>
                      </div>

                      <div className="bg-slate-900/70 border border-slate-800/80 rounded p-1.5">
                        <span className="text-[8.5px] text-slate-400 block uppercase">6–7. Wright Eddy & Thermal</span>
                        <span className="text-rose-300 font-bold">
                          Le(10k)={results.multiphysicsBlueprint.driverEddyAndNonlinear.effectiveInductance10kHzMh} mH
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          Nu={results.multiphysicsBlueprint.subChambersAndThermal.oscillatingNusseltMultiplier}x • FIR {results.multiphysicsBlueprint.driverEddyAndNonlinear.totalSystemLatencyMs}ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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
