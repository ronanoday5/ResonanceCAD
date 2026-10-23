import React, { useState } from 'react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  CameraPreset,
  DampingMaterialType,
  EnclosureDimensions,
  MaterialType,
  SurfaceFinishType,
  SystemTopology,
} from '../types/loudspeaker.ts';
import { DAMPING_MATERIAL_SPECS, DRIVER_PRESETS, MATERIAL_SPECS, SURFACE_FINISH_SPECS } from '../services/acousticEngine.ts';
import {
  Activity,
  AlertTriangle,
  Box,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  Feather,
  Info,
  Layers,
  LineChart,
  Printer,
  Scale,
  ShieldAlert,
  Sliders,
  Sparkles,
  Volume2,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

interface ControlDockProps {
  dimensions: EnclosureDimensions;
  setDimensions: React.Dispatch<React.SetStateAction<EnclosureDimensions>>;
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  results: AcousticCalculationResult;
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
  onAutoFixPort?: () => void;
  onAutoResolveClashes?: () => void;
  onToggleLiveSim?: () => void;
  isLiveSimOpen?: boolean;
  isAirflowStressVisible?: boolean;
  onToggleAirflowStress?: () => void;
  onOpenCadExport?: (scope?: 'woodwork_only' | 'port_only' | 'baffle_only' | 'full_assembly' | 'bracing_only') => void;
}

type TabType = 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics';

export const ControlDock: React.FC<ControlDockProps> = ({
  dimensions,
  setDimensions,
  acoustics,
  setAcoustics,
  results,
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
  onAutoFixPort,
  onAutoResolveClashes,
  onToggleLiveSim,
  isLiveSimOpen,
  isAirflowStressVisible = true,
  onToggleAirflowStress,
  onOpenCadExport,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('acoustics');
  const [showDampingComparison, setShowDampingComparison] = useState(false);

  const currentMaterial = MATERIAL_SPECS[dimensions.material];

  // Active pricing config
  const activeDensity = acoustics.materialPricing?.customDensityKgM3 || currentMaterial.densityKgM3;
  const activeCostPerM2 =
    acoustics.materialPricing?.costPerSquareMeter !== undefined
      ? acoustics.materialPricing.costPerSquareMeter
      : currentMaterial.defaultCostPerM2;
  const activeWastePercent =
    acoustics.materialPricing?.wastePercentage !== undefined
      ? acoustics.materialPricing.wastePercentage
      : 15;

  const costPerSqFt = (activeCostPerM2 / 10.7639).toFixed(2);

  const handleTopologyChange = (top: SystemTopology) => {
    setAcoustics((prev) => {
      const tweeter = DRIVER_PRESETS.find((d) => d.id === 'scanspeak_d3004') || DRIVER_PRESETS[4];
      const midrange = DRIVER_PRESETS.find((d) => d.id === 'scanspeak_12mu') || DRIVER_PRESETS[6];
      const woofer = DRIVER_PRESETS[0];

      return {
        ...prev,
        topology: top,
        driverAssignments: {
          ...prev.driverAssignments,
          tweeter: { ...prev.driverAssignments.tweeter, driver: tweeter },
          midrange: { ...prev.driverAssignments.midrange, driver: midrange },
          woofer: { ...prev.driverAssignments.woofer, driver: woofer, quantity: top === 'mtm' ? 2 : 1 },
        },
      };
    });
  };

  const handleMaterialChange = (newMatKey: MaterialType) => {
    const spec = MATERIAL_SPECS[newMatKey];
    setDimensions((prev) => ({
      ...prev,
      material: newMatKey,
      materialCategory: spec.category,
      baffleThicknessMm: spec.nominalThicknessMm,
    }));
    setAcoustics((prev) => ({
      ...prev,
      materialPricing: {
        customDensityKgM3: spec.densityKgM3,
        costPerSquareMeter: spec.defaultCostPerM2,
        wastePercentage: prev.materialPricing?.wastePercentage ?? 15,
      },
    }));
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 w-[95%] max-w-[960px] ${
        isCollapsed ? 'bottom-2' : 'bottom-3'
      }`}
    >
      <div className="relative bg-[#0d1016]/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-slate-200 overflow-hidden font-sans">
        {/* Header Navigation Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#080a0f] border-b border-slate-800 text-xs select-none">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('acoustics');
                setIsCollapsed(false);
              }}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                activeTab === 'acoustics' && !isCollapsed
                  ? 'bg-slate-900 border border-cyan-500/60 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acoustics & Port</span>
              {(results.layout?.hasCollision || results.isChuffingRisk) && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('topology');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                activeTab === 'topology' && !isCollapsed
                  ? 'bg-slate-900 border border-purple-500/60 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Topology</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dimensions');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                activeTab === 'dimensions' && !isCollapsed
                  ? 'bg-slate-900 border border-amber-500/60 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>Cabinet & Cost</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('view3d');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                activeTab === 'view3d' && !isCollapsed
                  ? 'bg-slate-900 border border-emerald-500/60 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D Views</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('physics');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ${
                activeTab === 'physics' && !isCollapsed
                  ? 'bg-slate-900 border border-rose-500/60 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Physics & CTA</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenResponseChart}
              title="Open Frequency Response & Excursion Simulation Modal"
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              <LineChart className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Curves</span>
            </button>

            <button
              onClick={onOpenCrossoverDesigner}
              title="Open Passive Crossover Filter Network Designer"
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Crossover</span>
            </button>

            <button
              onClick={onOpenCutList}
              title="Open Woodworking Cut List & Sheet Optimizer"
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Cut List</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand Control Dock' : 'Collapse Control Dock'}
              className="flex items-center gap-1 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs transition cursor-pointer"
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 max-h-[44vh] overflow-y-auto space-y-4">
            {/* TAB 1: ACOUSTICS & PORT AERODYNAMICS */}
            {activeTab === 'acoustics' && (
              <div className="space-y-3.5">
                {/* CARD 1: PRIMARY TRANSDUCER & ENCLOSURE ALIGNMENT */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                          Primary Transducer & Alignment
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Thiele-Small low-frequency electroacoustic driver pairing
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onOpenCustomDriver}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Edit T/S Parameters
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Woofer Driver Model
                      </label>
                      <select
                        value={acoustics.driverAssignments.woofer.driver.id}
                        onChange={(e) => {
                          const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                          if (found) {
                            setAcoustics((p) => ({
                              ...p,
                              driverAssignments: {
                                ...p.driverAssignments,
                                woofer: { ...p.driverAssignments.woofer, driver: found },
                              },
                            }));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-sans focus:outline-none focus:border-cyan-500"
                      >
                        {DRIVER_PRESETS.filter((d) => d.nominalDiameterInch >= 6.5 && !d.id.startsWith('jbl_24')).map((d) => (
                          <option key={d.id} value={d.id}>
                            [{d.brand}] {d.model} ({d.nominalDiameterInch}" • Fs {d.fs}Hz • Vas {d.vas}L • Qts {d.qts})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Box Alignment
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: 'ported' }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                            acoustics.alignment === 'ported'
                              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Bass Reflex
                        </button>
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: 'sealed' }))}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                            acoustics.alignment === 'sealed'
                              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Sealed Box
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: PORT GEOMETRY & AERODYNAMIC TUNING (when Ported) */}
                {acoustics.alignment === 'ported' && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3.5">
                    {/* Header with Type & Placement selectors */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
                          <Wind className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                            Port Resonator Geometry & Aerodynamics
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Helmholtz resonance tuning & boundary end-correction
                          </p>
                        </div>
                      </div>

                      {/* Port Type Toggle */}
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, portType: 'round' }))}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            acoustics.portType === 'round'
                              ? 'bg-cyan-950 border border-cyan-600 text-cyan-200 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Flared Aeroport
                        </button>
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, portType: 'slot' }))}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            acoustics.portType === 'slot'
                              ? 'bg-cyan-950 border border-cyan-600 text-cyan-200 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Slot Port (Floor)
                        </button>
                      </div>
                    </div>

                    {/* Port Placement Selector Ribbon */}
                    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                        <span>Baffle Location:</span>
                        <span className="text-cyan-300 font-bold">
                          {results.layout?.resolvedPortPlacement === 'rear'
                            ? 'Rear Panel'
                            : results.layout?.resolvedPortPlacement === 'front_top'
                            ? 'Front (Top)'
                            : 'Front (Bottom)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        {(['auto', 'front_bottom', 'front_top', 'rear'] as const).map((placement) => (
                          <button
                            key={placement}
                            onClick={() => setAcoustics((p) => ({ ...p, portPlacement: placement }))}
                            className={`px-2 py-0.5 rounded transition cursor-pointer ${
                              (acoustics.portPlacement || 'auto') === placement
                                ? 'bg-cyan-900/80 border border-cyan-500 text-cyan-200 font-bold'
                                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-transparent'
                            }`}
                          >
                            {placement === 'auto'
                              ? 'Auto-Fit'
                              : placement === 'front_bottom'
                              ? 'Front Bottom'
                              : placement === 'front_top'
                              ? 'Front Top'
                              : 'Rear'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Parametric Inputs with High Visual Contrast */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Tuning Fb Slider */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Tuning Fb:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold">
                            {acoustics.targetFb} Hz
                          </span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="65"
                          step="0.5"
                          value={acoustics.targetFb}
                          onChange={(e) => setAcoustics((p) => ({ ...p, targetFb: parseFloat(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                        />
                      </div>

                      {/* Round Port Diameter or Slot Width */}
                      {acoustics.portType === 'round' ? (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Tube Inner Ø:</span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                                {acoustics.portDiameterMm} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min="45"
                              max="160"
                              step="1"
                              value={acoustics.portDiameterMm}
                              onChange={(e) => setAcoustics((p) => ({ ...p, portDiameterMm: parseInt(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
                            />
                            <div className="text-[10px] text-slate-500 font-mono">
                              Calc Length: <strong className="text-slate-300">{results.portLengthMm} mm</strong>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Flare Radius (rf):</span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                                {acoustics.flareRadiusMm || results.optimalFlareRadiusMm || 16} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="35"
                              step="1"
                              value={acoustics.flareRadiusMm || results.optimalFlareRadiusMm || 16}
                              onChange={(e) => setAcoustics((p) => ({ ...p, flareRadiusMm: parseInt(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Opt: {results.optimalFlareRadiusMm}mm</span>
                              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={!!acoustics.isDoubleFlared}
                                  onChange={(e) => setAcoustics((p) => ({ ...p, isDoubleFlared: e.target.checked }))}
                                  className="accent-cyan-400 rounded"
                                />
                                <span>Dual Flared</span>
                              </label>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Slot Width:</span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                                {acoustics.slotWidthMm || 290} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min="120"
                              max={Math.max(200, dimensions.externalWidthMm - 40)}
                              step="5"
                              value={acoustics.slotWidthMm || 290}
                              onChange={(e) => setAcoustics((p) => ({ ...p, slotWidthMm: parseInt(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
                            />
                            <div className="text-[10px] text-slate-500 font-mono">
                              Calc Length: <strong className="text-slate-300">{results.portLengthMm} mm</strong>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Slot Height:</span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                                {acoustics.slotHeightMm || 45} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              step="2"
                              value={acoustics.slotHeightMm || 45}
                              onChange={(e) => setAcoustics((p) => ({ ...p, slotHeightMm: parseInt(e.target.value) }))}
                              className="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                            />
                            <div className="text-[10px] text-slate-500 font-mono">
                              Lip Roundover: <strong className="text-slate-300">{acoustics.slotLipRadiusMm || 12} mm</strong>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ACOUSTIC PORT OPTIMIZATION & 3D PRINT CARD */}
                    {results.portMatch && (
                      <div className="bg-slate-950/80 border border-cyan-800/80 rounded-xl p-3 space-y-2 font-mono">
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                          <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Wind className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Acoustic Port Optimization</span>
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              results.portMatch.status === 'cots_available'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {results.portMatch.status === 'cots_available'
                              ? `COTS Standard: ${results.portMatch.cotsPartName}`
                              : 'Custom 3D Print Ready'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">AIR VELOCITY</span>
                            <span
                              className={`font-bold ${
                                results.portMatch.isLaminar ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {results.portMatch.peakVelocityMs} m/s
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              ({results.portMatch.isLaminar ? '≤17 m/s Laminar' : '>17 m/s Turbulent'})
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">SALVATTI FLARE</span>
                            <span className="text-cyan-300 font-bold">
                              r_f = {results.portMatch.salvattiFlareRadiusMm} mm
                            </span>
                            <span className="text-slate-500 text-[9px] block">(Bellmouth)</span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">PHYSICAL LENGTH</span>
                            <span className="text-amber-300 font-bold">{results.portLengthMm} mm</span>
                            <span className="text-slate-500 text-[9px] block">(Calculated)</span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">PRINT ENVELOPE</span>
                            <span className="text-slate-200 font-bold">
                              {results.portMatch.printDimensionsMm.widthMm}×{results.portMatch.printDimensionsMm.depthMm}mm
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              ({results.portMatch.needsModularSplit ? `${results.portMatch.splitSegmentCount} Segs` : '1-Piece'})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <p className="text-[10px] text-slate-400 italic flex-1">{results.portMatch.reason}</p>
                          {onOpenCadExport && (
                            <button
                              onClick={() => onOpenCadExport('port_only')}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-100" />
                              <span>Export Port STL (3D Print Ready)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CARD 3: UNIFIED ACOUSTIC & CLEARANCE DIAGNOSTICS SUITE */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono pb-1.5 border-b border-slate-800/80">
                        <span className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Resonator Diagnostics & Boundary Clearances</span>
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            results.layout?.hasCollision || results.isChuffingRisk
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {results.layout?.hasCollision
                            ? 'Collision Alert'
                            : results.isChuffingRisk
                            ? 'Chuffing Warning'
                            : 'All Clearances Verified'}
                        </span>
                      </div>

                      {/* 3-Panel Diagnostics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
                        {/* Panel A: Air Velocity */}
                        <div
                          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            results.isChuffingRisk
                              ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                              : results.portAirVelocityMs > 13
                              ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Port Air Velocity</span>
                            <div className="text-sm font-bold mt-0.5">
                              {results.portAirVelocityMs} m/s
                              <span className="text-[10px] font-normal opacity-75 ml-1">(&lt;17 m/s limit)</span>
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">
                              {results.isChuffingRisk
                                ? 'Turbulence chuffing risk.'
                                : results.portAirVelocityMs > 13
                                ? 'Moderate air velocity.'
                                : 'Silent laminar flow.'}
                            </div>
                          </div>
                          {results.isChuffingRisk && onAutoFixPort && (
                            <button
                              onClick={onAutoFixPort}
                              className="mt-2 w-full py-1 text-xs font-bold rounded bg-rose-700 hover:bg-rose-600 text-white transition cursor-pointer"
                            >
                              Auto-Fix Port Ø
                            </button>
                          )}
                        </div>

                        {/* Panel B: Baffle Clearance & Driver Clash */}
                        <div
                          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            results.layout?.hasCollision
                              ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Baffle Clash Check</span>
                            <div className="text-sm font-bold mt-0.5">
                              {results.layout?.hasCollision ? (
                                <span className="text-rose-400">⚠️ Clash Detected</span>
                              ) : (
                                <span className="text-emerald-400">✅ {results.layout?.minBaffleClearanceMm}mm Clearance</span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-80 mt-1 line-clamp-2">
                              {results.layout?.hasCollision
                                ? results.layout.collisions[0]?.description
                                : `Back wall: ${results.layout?.rearWallClearanceMm}mm • Magnet: ${results.layout?.minDepthClearanceMm}mm`}
                            </div>
                          </div>
                          {results.layout?.hasCollision && (
                            <div className="flex gap-1.5 mt-2">
                              {onAutoResolveClashes && (
                                <button
                                  onClick={onAutoResolveClashes}
                                  className="flex-1 py-1 text-xs font-bold rounded bg-rose-700 hover:bg-rose-600 text-white transition cursor-pointer"
                                >
                                  Auto-Resolve
                                </button>
                              )}
                              <button
                                onClick={() => setAcoustics((p) => ({ ...p, portPlacement: 'rear' }))}
                                className="py-1 px-2 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                              >
                                Rear
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Panel C: Internal Obstruction Stress */}
                        <div className="p-2.5 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-300 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 uppercase">Airflow Stress</span>
                              <span className="text-cyan-400 font-bold">
                                {results.layout?.airflowInterference?.turbulenceMultiplier || 1.0}x
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] mt-1 text-slate-400">
                              <div>Magnet: <strong className="text-slate-200">{results.layout?.airflowInterference?.minMagnetClearanceMm || 0}mm</strong></div>
                              <div>Bracing: <strong className="text-slate-200">{results.layout?.airflowInterference?.minBracingClearanceMm || 0}mm</strong></div>
                            </div>
                          </div>
                          {onToggleAirflowStress && (
                            <button
                              onClick={onToggleAirflowStress}
                              className={`mt-2 w-full py-1 text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                isAirflowStressVisible
                                  ? 'bg-amber-950/80 border border-amber-600 text-amber-300 font-bold'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              {isAirflowStressVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>3D Stress Overlay: {isAirflowStressVisible ? 'ON' : 'OFF'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACOUSTIC DAMPING ADVISOR & INTERNAL ABSORPTION */}
                {results.dampingAdvisor && (
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-3">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                          <Feather className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                              Acoustic Damping Advisor
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                                results.dampingAdvisor.applicationMethod === 'chamber_stuffing'
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {results.dampingAdvisor.applicationMethod === 'chamber_stuffing'
                                ? 'Chamber Stuffing'
                                : 'Perimeter Wall Lining'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Recommended:{' '}
                            <strong className="text-indigo-300">
                              {results.dampingAdvisor.recommendedMaterialSpec.name}
                            </strong>{' '}
                            @ <span className="text-slate-200 font-bold">{results.dampingAdvisor.recommendedFillPercent}% fill</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setAcoustics((p) => ({
                              ...p,
                              dampingFillPercent: results.dampingAdvisor.recommendedFillPercent,
                              absorptionMaterialType: results.dampingAdvisor.recommendedMaterial,
                            }));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition shadow cursor-pointer"
                          title="Apply recommended damping material and fill % to cabinet"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Advisor Recommendation</span>
                        </button>
                      </div>
                    </div>

                    {/* Damping Material Selection & Fill Density Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="text-slate-400">Damping Material:</span>
                          {acoustics.absorptionMaterialType === results.dampingAdvisor.recommendedMaterial && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Optimal Match
                            </span>
                          )}
                        </div>
                        <select
                          value={acoustics.absorptionMaterialType || results.dampingAdvisor.recommendedMaterial}
                          onChange={(e) =>
                            setAcoustics((p) => ({
                              ...p,
                              absorptionMaterialType: e.target.value as DampingMaterialType,
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-sans focus:outline-none"
                        >
                          {Object.values(DAMPING_MATERIAL_SPECS).map((spec) => (
                            <option key={spec.id} value={spec.id}>
                              {spec.name}{' '}
                              {spec.id === results.dampingAdvisor.recommendedMaterial ? '★ (Advisor Recommended)' : ''}
                            </option>
                          ))}
                        </select>
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {(DAMPING_MATERIAL_SPECS[acoustics.absorptionMaterialType || results.dampingAdvisor.recommendedMaterial] || results.dampingAdvisor.recommendedMaterialSpec).bestSuitedFor}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="text-slate-400">Fill Level:</span>
                          <span className="text-indigo-400 font-bold">
                            {acoustics.dampingFillPercent ?? 50}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={acoustics.dampingFillPercent ?? 50}
                          onChange={(e) =>
                            setAcoustics((p) => ({ ...p, dampingFillPercent: parseInt(e.target.value) }))
                          }
                          className="w-full accent-indigo-400 cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[10px] font-mono mt-0.5">
                          <button
                            onClick={() => setAcoustics((p) => ({ ...p, dampingFillPercent: 0 }))}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            0% (Bare)
                          </button>
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({
                                ...p,
                                dampingFillPercent: results.dampingAdvisor.recommendedFillPercent,
                              }))
                            }
                            className="text-indigo-400 hover:underline font-bold"
                          >
                            Rec ({results.dampingAdvisor.recommendedFillPercent}%)
                          </button>
                          <button
                            onClick={() => setAcoustics((p) => ({ ...p, dampingFillPercent: 50 }))}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            50%
                          </button>
                          <button
                            onClick={() => setAcoustics((p) => ({ ...p, dampingFillPercent: 80 }))}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            80% (Dense)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Calculated Metrics Telemetry Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                      <div className="bg-slate-950/60 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Calculated Mass:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-indigo-300 font-bold text-sm">
                            {results.dampingAdvisor.recommendedMassGrams}
                          </span>
                          <span className="text-slate-400 text-[10px]">g</span>
                          <span className="text-slate-500 text-[10px]">
                            ({(results.dampingAdvisor.recommendedMassGrams / 1000).toFixed(2)} kg)
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Virtual Vol Expansion:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-emerald-400 font-bold text-sm">
                            +{results.dampingAdvisor.virtualVolumeExpansionLiters}L
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            (Eff: {results.dampingAdvisor.effectiveVolumeLiters}L)
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Qtc Damping Shift:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-slate-400 text-[10px]">
                            {results.dampingAdvisor.rawQtc} →
                          </span>
                          <span
                            className={`font-bold text-sm ${
                              Math.abs(results.dampingAdvisor.predictedQtc - results.dampingAdvisor.targetQtc) <= 0.05
                                ? 'text-emerald-400'
                                : 'text-cyan-300'
                            }`}
                          >
                            {results.dampingAdvisor.predictedQtc}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            (tgt {results.dampingAdvisor.targetQtc})
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Lining Coverage Area:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-amber-300 font-bold text-sm">
                            {results.dampingAdvisor.recommendedLiningAreaM2}
                          </span>
                          <span className="text-slate-400 text-[10px]">m²</span>
                          <span className="text-slate-500 text-[10px]">
                            (~{(results.dampingAdvisor.recommendedLiningAreaM2 * 10.764).toFixed(1)} sq ft)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Placement Guidelines */}
                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-md p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono font-semibold mb-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Acoustic Placement & Installation Guidelines:</span>
                      </div>
                      <ul className="space-y-1 text-slate-400 pl-4 list-disc text-[11px]">
                        {results.dampingAdvisor.placementGuidelines.map((guide, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {guide}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Comparison Drawer Toggle */}
                    <div>
                      <button
                        onClick={() => setShowDampingComparison(!showDampingComparison)}
                        className="flex items-center justify-between w-full py-1.5 px-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Damping Materials Physical & Thermal Properties Comparison (5 Materials)</span>
                        </span>
                        {showDampingComparison ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {showDampingComparison && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {results.dampingAdvisor.alternatives.map((alt) => {
                            const isSelected =
                              alt.material === (acoustics.absorptionMaterialType || results.dampingAdvisor.recommendedMaterial);
                            const isRecommended = alt.material === results.dampingAdvisor.recommendedMaterial;
                            return (
                              <div
                                key={alt.material}
                                className={`p-2.5 rounded border transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-950/40 border-indigo-600 text-slate-100 shadow-sm'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                                onClick={() =>
                                  setAcoustics((p) => ({
                                    ...p,
                                    absorptionMaterialType: alt.material,
                                  }))
                                }
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                                    <span>{alt.spec.name}</span>
                                    {isRecommended && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                                        Advisor Choice
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ${alt.spec.costPerKgUsd}/kg
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-slate-400 py-1 border-y border-slate-800/60 my-1">
                                  <div>
                                    <span className="text-slate-500 block">Density:</span>
                                    <span className="text-slate-200">{alt.spec.typicalDensityGPerL} g/L</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block">Flow Resistivity:</span>
                                    <span className="text-cyan-300">{alt.spec.airflowResistivityRaylsM.toLocaleString()} Rayls/m</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block">Max Vb Boost:</span>
                                    <span className="text-emerald-400">+{alt.spec.maxIsothermalExpansionPercent}%</span>
                                  </div>
                                </div>
                                <div className="text-[11px] space-y-0.5 mt-1">
                                  <div className="text-emerald-400/90 font-sans">
                                    <strong>+</strong> {alt.advantage}
                                  </div>
                                  <div className="text-slate-400 font-sans">
                                    <strong>–</strong> {alt.tradeoff}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CARD: INTERNAL STANDING WAVE ANALYSIS & REFLECTOR ADVISOR */}
                {results.standingWaves && (
                  <div className="bg-slate-950/70 border border-indigo-900/80 p-3 rounded-lg space-y-2.5 font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                              Internal Standing Waves & Reflector Advisor
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                results.standingWaves.standingWaveRiskLevel === 'high'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : results.standingWaves.standingWaveRiskLevel === 'moderate'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {results.standingWaves.aspectRatioQuality === 'optimal_golden_ratio'
                                ? 'Golden Ratio Proportions'
                                : results.standingWaves.aspectRatioQuality === 'problematic_cube'
                                ? 'Cubic Resonant Risk'
                                : results.standingWaves.aspectRatioQuality === 'problematic_square'
                                ? 'Dual-Mode Match Risk'
                                : 'Favorable Proportions'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Eigenmode Frequencies */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">LONGITUDINAL (HEIGHT)</span>
                        <span className="text-cyan-300 font-bold text-sm">f_z = {results.standingWaves.longitudinalHz} Hz</span>
                        <span className="text-slate-500 text-[9px] block">λ = {Math.round(343000 / results.standingWaves.longitudinalHz)} mm</span>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">TRANSVERSE (WIDTH)</span>
                        <span className="text-purple-300 font-bold text-sm">f_x = {results.standingWaves.transverseHz} Hz</span>
                        <span className="text-slate-500 text-[9px] block">λ = {Math.round(343000 / results.standingWaves.transverseHz)} mm</span>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">AXIAL DEPTH (DEPTH)</span>
                        <span className="text-amber-300 font-bold text-sm">f_y = {results.standingWaves.axialDepthHz} Hz</span>
                        <span className="text-slate-500 text-[9px] block">λ = {Math.round(343000 / results.standingWaves.axialDepthHz)} mm</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 italic bg-slate-900/50 p-2 rounded border border-slate-800/60 font-sans">
                      {results.standingWaves.aspectRatioText}
                    </p>

                    {/* Internal Reflector Board Spec */}
                    {results.standingWaves.reflectorAdvisor && (
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200 font-bold flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                            Internal 45° Deflector Board Placement
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            -6dB to -8dB Peak Mitigation
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">Angle:</span>
                            <span className="text-amber-300 font-bold">{results.standingWaves.reflectorAdvisor.angleDeg}° Deflector</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">Board Size:</span>
                            <span className="text-slate-200 font-bold">
                              {results.standingWaves.reflectorAdvisor.widthMm} × {results.standingWaves.reflectorAdvisor.lengthMm} mm
                            </span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">Height Offset Y:</span>
                            <span className="text-cyan-300 font-bold">{results.standingWaves.reflectorAdvisor.placementYMm} mm</span>
                          </div>
                          <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">Depth Offset Z:</span>
                            <span className="text-cyan-300 font-bold">{results.standingWaves.reflectorAdvisor.placementZMm} mm</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                          <div className="font-bold text-slate-300">Acoustic Benefits:</div>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-sans">
                            {results.standingWaves.reflectorAdvisor.benefits.map((benefit, i) => (
                              <li key={i}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MULTI-DRIVER TOPOLOGY */}
            {activeTab === 'topology' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                    Loudspeaker System Configuration & Driver Topology
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {(
                      [
                        ['single', 'Single Driver', 'Subwoofer / Full Range'],
                        ['two_way', '2-Way Stack', 'Tweeter + Woofer'],
                        ['mtm', 'MTM / D\'Appolito', 'Dual Woofer + Tweeter'],
                        ['three_way', '3-Way System', 'Tweeter + Mid + Woofer'],
                      ] as const
                    ).map(([topKey, title, desc]) => (
                      <button
                        key={topKey}
                        onClick={() => handleTopologyChange(topKey as SystemTopology)}
                        className={`p-2.5 rounded text-left transition border ${
                          acoustics.topology === topKey
                            ? 'bg-purple-950/80 border-purple-600 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-cyan-300 font-semibold">{title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Driver Passband Assignments */}
                {acoustics.topology !== 'single' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tweeter Selection */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                      <label className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
                        High Frequency Transducer (Tweeter)
                      </label>
                      <select
                        value={acoustics.driverAssignments.tweeter.driver.id}
                        onChange={(e) => {
                          const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                          if (found) {
                            setAcoustics((p) => ({
                              ...p,
                              driverAssignments: {
                                ...p.driverAssignments,
                                tweeter: { ...p.driverAssignments.tweeter, driver: found },
                              },
                            }));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-sans"
                      >
                        {DRIVER_PRESETS.filter(
                          (d) => d.nominalDiameterInch <= 2 || d.fs >= 450 || d.id.startsWith('jbl_24')
                        ).map((d) => (
                          <option key={d.id} value={d.id}>
                            [{d.brand}] {d.model} ({d.nominalDiameterInch}" • {d.splSensitivityDb}dB • Fs {d.fs}Hz)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Midrange Selection (if 3-Way) */}
                    {acoustics.topology === 'three_way' && (
                      <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                        <label className="text-[11px] font-mono text-purple-400 uppercase tracking-wider block mb-1">
                          Midrange Transducer
                        </label>
                        <select
                          value={acoustics.driverAssignments.midrange.driver.id}
                          onChange={(e) => {
                            const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                            if (found) {
                              setAcoustics((p) => ({
                                ...p,
                                driverAssignments: {
                                  ...p.driverAssignments,
                                  midrange: { ...p.driverAssignments.midrange, driver: found },
                                },
                              }));
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-sans"
                        >
                          {DRIVER_PRESETS.filter(
                            (d) =>
                              (d.nominalDiameterInch >= 4 && d.nominalDiameterInch <= 8.5) ||
                              d.id.includes('mid') ||
                              d.id === 'jbl_2169h'
                          ).map((d) => (
                            <option key={d.id} value={d.id}>
                              [{d.brand}] {d.model} ({d.nominalDiameterInch}" • {d.splSensitivityDb}dB • Fs {d.fs}Hz)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CABINET DIMENSIONS, MATERIAL DENSITY & COST CALCULATOR */}
            {activeTab === 'dimensions' && (
              <div className="space-y-3.5">
                {/* External Bounding Dimensions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-slate-400">WIDTH (X):</span>
                      <span className="text-cyan-400 font-bold text-sm">{dimensions.externalWidthMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="700"
                      step="5"
                      value={dimensions.externalWidthMm}
                      onChange={(e) => setDimensions((p) => ({ ...p, externalWidthMm: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {(dimensions.externalWidthMm / 25.4).toFixed(1)} inches
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-slate-400">HEIGHT (Y):</span>
                      <span className="text-cyan-400 font-bold text-sm">{dimensions.externalHeightMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="250"
                      max="1200"
                      step="5"
                      value={dimensions.externalHeightMm}
                      onChange={(e) => setDimensions((p) => ({ ...p, externalHeightMm: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {(dimensions.externalHeightMm / 25.4).toFixed(1)} inches
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-slate-400">DEPTH (Z):</span>
                      <span className="text-cyan-400 font-bold text-sm">{dimensions.externalDepthMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      step="5"
                      value={dimensions.externalDepthMm}
                      onChange={(e) => setDimensions((p) => ({ ...p, externalDepthMm: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {(dimensions.externalDepthMm / 25.4).toFixed(1)} inches
                    </div>
                  </div>
                </div>

                {/* Material Selection, Category Toggle, Density & Cost Configurator */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-3 font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Material Specification & Fabrication Engine
                      </span>
                    </div>

                    {/* Segmented Category Toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-sans">
                      <button
                        onClick={() => {
                          const currentSpec = MATERIAL_SPECS[dimensions.material];
                          if (currentSpec.category !== 'sheet_goods') {
                            handleMaterialChange('baltic_birch_18');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                          (MATERIAL_SPECS[dimensions.material]?.category || 'sheet_goods') === 'sheet_goods'
                            ? 'bg-amber-950 border border-amber-600 text-amber-200 font-bold shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Wrench className="w-3 h-3 text-amber-400" />
                        <span>Sheet Goods (CNC)</span>
                      </button>

                      <button
                        onClick={() => {
                          const currentSpec = MATERIAL_SPECS[dimensions.material];
                          if (currentSpec.category !== 'filaments') {
                            handleMaterialChange('petg_cf');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                          MATERIAL_SPECS[dimensions.material]?.category === 'filaments'
                            ? 'bg-cyan-950 border border-cyan-600 text-cyan-200 font-bold shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Printer className="w-3 h-3 text-cyan-400" />
                        <span>3D Filaments</span>
                      </button>
                    </div>
                  </div>

                  {/* SHEET GOODS CONTROLS */}
                  {(MATERIAL_SPECS[dimensions.material]?.category || 'sheet_goods') === 'sheet_goods' ? (
                    <div className="space-y-3 font-sans">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Material Preset */}
                        <div>
                          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                            Sheet Material
                          </label>
                          <select
                            value={dimensions.material}
                            onChange={(e) => handleMaterialChange(e.target.value as MaterialType)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-sans"
                          >
                            {Object.values(MATERIAL_SPECS)
                              .filter((m) => m.category === 'sheet_goods')
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Material Density kg/m3 */}
                        <div>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-slate-400">Density:</span>
                            <span className="text-amber-300 font-bold">{activeDensity} kg/m³</span>
                          </div>
                          <input
                            type="number"
                            min="300"
                            max="1200"
                            step="10"
                            value={activeDensity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 680;
                              setAcoustics((p) => ({
                                ...p,
                                materialPricing: {
                                  ...p.materialPricing,
                                  customDensityKgM3: val,
                                  costPerSquareMeter: activeCostPerM2,
                                  wastePercentage: activeWastePercent,
                                },
                              }));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        {/* Unit Cost $/m2 */}
                        <div>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-slate-400">Cost/m²:</span>
                            <span className="text-emerald-300 font-bold">${activeCostPerM2}</span>
                          </div>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            step="1"
                            value={activeCostPerM2}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setAcoustics((p) => ({
                                ...p,
                                materialPricing: {
                                  ...p.materialPricing,
                                  customDensityKgM3: activeDensity,
                                  costPerSquareMeter: val,
                                  wastePercentage: activeWastePercent,
                                },
                              }));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                          />
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ≈ ${costPerSqFt}/sq.ft
                          </div>
                        </div>

                        {/* Cutting Waste Factor % */}
                        <div>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-slate-400">Waste Factor:</span>
                            <span className="text-cyan-300 font-bold">{activeWastePercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={activeWastePercent}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setAcoustics((p) => ({
                                ...p,
                                materialPricing: {
                                  ...p.materialPricing,
                                  customDensityKgM3: activeDensity,
                                  costPerSquareMeter: activeCostPerM2,
                                  wastePercentage: val,
                                },
                              }));
                            }}
                            className="w-full accent-cyan-400 cursor-pointer"
                          />
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Kerf & trim allowance
                          </div>
                        </div>
                      </div>

                      {/* Material & Mass Breakdown Ribbon */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 font-mono text-center text-xs">
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">NET BOARD AREA</span>
                          <span className="text-slate-200 font-bold">
                            {results.materialCost?.netSurfaceAreaM2 || 0} m²
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">GROSS YIELD (+WASTE)</span>
                          <span className="text-amber-300 font-bold">
                            {results.materialCost?.grossSurfaceAreaM2 || 0} m²
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">DRY ENCLOSURE MASS</span>
                          <span className="text-cyan-300 font-bold">{results.totalWeightKg} kg</span>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">RAW MATERIAL COST</span>
                          <span className="text-emerald-300 font-bold text-sm">
                            ${results.materialCost?.totalCostUsd?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 3D FILAMENT CONTROLS */
                    <div className="space-y-3 font-mono">
                      {/* Filament Picker Chips */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          3D Printing Filament Formulation
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {Object.values(MATERIAL_SPECS)
                            .filter((m) => m.category === 'filaments')
                            .map((m) => {
                              const isSelected = dimensions.material === m.id;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => handleMaterialChange(m.id)}
                                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-cyan-950/80 border-cyan-500 text-white font-bold shadow-sm'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs mb-0.5">
                                    <span className="text-cyan-300 font-bold">{m.name}</span>
                                    <span className="text-emerald-400 font-mono text-[11px]">${m.costPerKgUsd}/kg</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {m.badge}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {/* Infill & Shell Count Configurator */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        {/* Infill % Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Infill Density (Gyroid):</span>
                            <span className="text-cyan-300 font-bold">{dimensions.infillPercent ?? 40}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            step="5"
                            value={dimensions.infillPercent ?? 40}
                            onChange={(e) =>
                              setDimensions((prev) => ({
                                ...prev,
                                infillPercent: parseInt(e.target.value),
                              }))
                            }
                            className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
                          />
                          <div className="text-[10px] text-slate-500 font-mono">
                            Effective Density: <strong className="text-slate-300">{results.mechanics?.effectiveDensityKgM3} kg/m³</strong>
                          </div>
                        </div>

                        {/* Perimeter Shell Count */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Perimeter Shells:</span>
                            <span className="text-amber-400 font-bold">{dimensions.perimeterShells ?? 6} Shells</span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="12"
                            step="1"
                            value={dimensions.perimeterShells ?? 6}
                            onChange={(e) =>
                              setDimensions((prev) => ({
                                ...prev,
                                perimeterShells: parseInt(e.target.value),
                              }))
                            }
                            className="w-full h-1.5 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                          />
                          <div className="text-[10px] text-slate-500 font-mono">
                            Solid Wall Boundary: <strong className="text-slate-300">~{((dimensions.perimeterShells ?? 6) * 0.4).toFixed(1)} mm</strong>
                          </div>
                        </div>
                      </div>

                      {/* Wall Compliance Warning Banner */}
                      {results.mechanics?.wallComplianceWarning && (
                        <div className="bg-amber-950/80 border border-amber-700/80 p-2.5 rounded-lg text-amber-200 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{results.mechanics.wallComplianceWarning}</span>
                        </div>
                      )}

                      {/* Filament Telemetry Badges */}
                      {results.mechanics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block">PLATE STIFFNESS (D)</span>
                            <span className="text-cyan-300 font-bold text-xs">
                              {results.mechanics.bendingStiffnessNm.toLocaleString()} N·m
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              E = {results.mechanics.flexuralModulusGpa} GPa
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block">PANEL MODE (f_panel)</span>
                            <span className="text-purple-300 font-bold text-xs">
                              {results.mechanics.fundamentalPanelModeHz} Hz
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              Birch Ref: {results.mechanics.balticBirchReferenceModeHz} Hz
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block">FILAMENT MASS</span>
                            <span className="text-emerald-300 font-bold text-xs">
                              {results.totalWeightKg} kg
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              {results.mechanics.spoolCount} x 1kg Spools
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block">SPOOL COST ESTIMATE</span>
                            <span className="text-amber-300 font-bold text-xs text-sm">
                              ${results.mechanics.spoolCostUsd?.toFixed(2)}
                            </span>
                            <span className="text-emerald-500 text-[9px] block">USD Filament</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Surface Finish & Exterior Aesthetics Engine */}
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-lg space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Surface Finish & Exterior Aesthetics
                      </span>
                    </div>
                    {results.mechanics?.panelRingingAttenuationDb !== undefined && (
                      <span className="text-[11px] font-mono text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                        -{results.mechanics.panelRingingAttenuationDb} dB Wall Ringing
                      </span>
                    )}
                  </div>

                  {/* Finish Formulation Swatches */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Finish Formulation Preset
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {Object.values(SURFACE_FINISH_SPECS).map((spec) => {
                        const isSelected = (dimensions.surfaceFinish || 'natural_hardwood_veneer') === spec.id;
                        return (
                          <button
                            key={spec.id}
                            onClick={() =>
                              setDimensions((prev) => ({
                                ...prev,
                                surfaceFinish: spec.id as SurfaceFinishType,
                              }))
                            }
                            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-purple-950/80 border-purple-500 text-white font-bold shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-purple-300 text-[11px] font-bold truncate">{spec.name}</div>
                            <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                              {spec.nominalThicknessMm}mm • +${spec.costPerM2}/m²
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Tint Presets & Custom Color */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Color Tint & Sheen Preset
                    </label>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {[
                        ['Piano Black', '#111111'],
                        ['Arctic White', '#f4f4f6'],
                        ['Studio Grey', '#3a3f47'],
                        ['Raw Walnut', '#5c3a21'],
                      ].map(([name, hex]) => (
                        <button
                          key={hex}
                          onClick={() => setDimensions((prev) => ({ ...prev, finishColorHex: hex }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                            (dimensions.finishColorHex || '').toLowerCase() === hex.toLowerCase()
                              ? 'bg-slate-800 border-purple-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{name}</span>
                        </button>
                      ))}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-slate-400">Custom Tint:</span>
                        <input
                          type="color"
                          value={dimensions.finishColorHex || '#5c3a21'}
                          onChange={(e) => setDimensions((prev) => ({ ...prev, finishColorHex: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-slate-900 p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finish Telemetry Badges */}
                  {results.mechanics && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">PANEL MODE SHIFT</span>
                        <span className="text-purple-300 font-bold text-xs">
                          {results.mechanics.rawPanelModeHz} Hz → {results.mechanics.finishPanelModeHz} Hz
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">RINGING DAMPING</span>
                        <span className="text-emerald-400 font-bold text-xs">
                          -{results.mechanics.panelRingingAttenuationDb} dB
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          η = {results.mechanics.compositeLossFactor}
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">ADDED FINISH MASS</span>
                        <span className="text-cyan-300 font-bold text-xs">
                          +{results.mechanics.addedFinishMassKg} kg
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">ADDED FINISH COST</span>
                        <span className="text-amber-300 font-bold text-xs">
                          +${results.mechanics.addedFinishCostUsd?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: 3D CAD VIEWS */}
            {activeTab === 'view3d' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Linear Exploded View Disassembly:</span>
                    </span>
                    <span className="text-cyan-300 font-bold text-sm">{explodedPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={explodedPercent}
                    onChange={(e) => setExplodedPercent(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Camera Presets</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                      {(
                        [
                          ['isometric', 'Iso 3D'],
                          ['front', 'Front'],
                          ['side', 'Side'],
                          ['top', 'Top'],
                          ['cutaway', 'Cutaway'],
                          ['crossover', 'Rear PCB'],
                        ] as const
                      ).map(([presetKey, label]) => (
                        <button
                          key={presetKey}
                          onClick={() => setCameraPreset(presetKey)}
                          className={`py-1.5 px-2 rounded text-center transition ${
                            cameraPreset === presetKey
                              ? 'bg-cyan-600 text-white font-semibold'
                              : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Render Shader Modes</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                      <button
                        onClick={() => setIsXRayMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${
                          isXRayMode
                            ? 'bg-cyan-600 text-white font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        X-Ray Glass
                      </button>

                      <button
                        onClick={() => setIsCutawayMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${
                          isCutawayMode
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        Cutaway
                      </button>

                      <button
                        onClick={() => setIsWireframeMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${
                          isWireframeMode
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        Wireframe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ELECTROACOUSTIC PHYSICS, CTA-2034, KLIPPEL & TOUR RIGGING */}
            {activeTab === 'physics' && (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Klippel Large-Signal Dynamic Voice Coil Thermal Model */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Klippel Large-Signal Dynamic Voice Coil Thermal Model
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                        results.klippelThermal?.voiceCoilTempC && results.klippelThermal.voiceCoilTempC > 150
                          ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                          : results.klippelThermal?.powerCompressionDb && results.klippelThermal.powerCompressionDb > 2.0
                          ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                          : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      }`}
                    >
                      {results.klippelThermal?.voiceCoilTempC && results.klippelThermal.voiceCoilTempC > 150
                        ? 'Thermal Overload Risk'
                        : `Power Comp: -${results.klippelThermal?.powerCompressionDb?.toFixed(1) || '0.0'} dB`}
                    </span>
                  </div>

                  {/* Drive Level & Ambient Temp Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">
                        Transducer Thermal Drive Level
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                        {[
                          ['small_signal', '1W (2.83V)'],
                          ['nominal_aes', 'Nominal AES (50%)'],
                          ['max_continuous', 'Max Cont (100%)'],
                        ].map(([lvlKey, label]) => (
                          <button
                            key={lvlKey}
                            onClick={() =>
                              setAcoustics((p) => ({
                                ...p,
                                thermalDriveLevel: lvlKey as any,
                              }))
                            }
                            className={`py-1.5 px-2 rounded text-center transition ${
                              (acoustics.thermalDriveLevel || 'nominal_aes') === lvlKey
                                ? 'bg-rose-950 border border-rose-600 text-rose-300 font-bold'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="text-slate-400">Ambient/Operating Temp:</span>
                        <span className="text-cyan-400 font-bold">
                          {acoustics.operatingTemperatureC ?? 20}°C / {((acoustics.operatingTemperatureC ?? 20) * 1.8 + 32).toFixed(0)}°F
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={acoustics.operatingTemperatureC ?? 20}
                        onChange={(e) =>
                          setAcoustics((p) => ({
                            ...p,
                            operatingTemperatureC: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Speed of Sound: <span className="text-slate-300 font-bold">{results.cardioid?.soundSpeedMs?.toFixed(1) || '343.4'} m/s</span>
                      </div>
                    </div>
                  </div>

                  {/* Thermal Telemetry Cards */}
                  {results.klippelThermal && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Voice Coil Temp Tv:</span>
                        <span
                          className={`font-bold text-sm ${
                            results.klippelThermal.voiceCoilTempC > 150
                              ? 'text-rose-400'
                              : results.klippelThermal.voiceCoilTempC > 80
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {results.klippelThermal.voiceCoilTempC.toFixed(0)}°C
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            (+{results.klippelThermal.tempRiseC.toFixed(0)}°C rise)
                          </span>
                        </span>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Re Resistance Shift:</span>
                        <span className="text-cyan-300 font-bold text-sm">
                          {results.klippelThermal.hotReOhm.toFixed(2)} Ω
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            (cold: {results.klippelThermal.coldReOhm.toFixed(1)}Ω)
                          </span>
                        </span>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Power Compression:</span>
                        <span className="text-rose-400 font-bold text-sm">
                          -{results.klippelThermal.powerCompressionDb.toFixed(2)} dB
                        </span>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Large-Signal Qts / Fs:</span>
                        <span className="text-purple-300 font-bold text-sm">
                          Qts {results.klippelThermal.largeSignalQts.toFixed(3)}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            • {results.klippelThermal.largeSignalFs.toFixed(1)}Hz
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. ANSI/CTA-2034-A Waveguide & Baffle Edge Diffraction */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Earl Geddes OSWG Waveguide & Edge Diffraction Suppression
                      </span>
                    </div>
                    {results.waveguide?.isDiffractionSuppressed ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border bg-emerald-950/80 border-emerald-700 text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        λ/8 Diffraction Suppressed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border bg-amber-950/80 border-amber-700 text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Edge Ripple Alert (Need r ≥ {results.waveguide?.minBaffleEdgeRadiusMm || 17}mm)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="text-slate-400">Waveguide Coverage Angle:</span>
                        <span className="text-cyan-400 font-bold">{acoustics.waveguideCoverageAngleDeg || 90}° Conical</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="120"
                        step="5"
                        value={acoustics.waveguideCoverageAngleDeg || 90}
                        onChange={(e) =>
                          setAcoustics((p) => ({
                            ...p,
                            waveguideCoverageAngleDeg: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Wall Half-Angle θwall: <span className="text-slate-300 font-bold">{results.waveguide?.coverageHalfAngleDeg || 45}°</span> • Throat Ø: <span className="text-slate-300 font-bold">{((results.waveguide?.throatRadiusMm || 12.7) * 2).toFixed(1)} mm</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="text-slate-400">Baffle Roundover Radius:</span>
                        <span className="text-emerald-400 font-bold">{acoustics.baffleEdgeRadiusMm ?? 16} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="2"
                        value={acoustics.baffleEdgeRadiusMm ?? 16}
                        onChange={(e) =>
                          setAcoustics((p) => ({
                            ...p,
                            baffleEdgeRadiusMm: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Target λ/8 @ XO ({acoustics.crossoverLowHz || 2500}Hz): <span className="text-slate-300 font-bold">{results.waveguide?.minBaffleEdgeRadiusMm || 17} mm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Tour-Grade Active Cardioid Subwoofer Delay Calculator */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Tour-Grade Active Cardioid Subwoofer Array Alignment
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border bg-purple-950/80 border-purple-700 text-purple-300">
                      Rear Cancellation: -{results.cardioid?.rearCancellationDb || 18} dB
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">
                        Subwoofer Array Configuration
                      </label>
                      <select
                        value={acoustics.subwooferArrayMode || 'omni'}
                        onChange={(e) =>
                          setAcoustics((p) => ({
                            ...p,
                            subwooferArrayMode: e.target.value as any,
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-sans"
                      >
                        <option value="omni">Standard Omnidirectional</option>
                        <option value="cardioid_gradient">Active Cardioid Gradient (Inverted Rear Box)</option>
                        <option value="end_fire">4-Element End-Fire Array</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Acoustic Separation Δd:</span>
                        <span className="text-cyan-300 font-bold text-sm">
                          {results.cardioid?.spacingMm || 950} mm
                        </span>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">DSP Alignment Delay:</span>
                        <span className="text-amber-400 font-bold text-sm">
                          {results.cardioid?.delayMs?.toFixed(2) || '2.77'} ms
                        </span>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                        <span className="text-slate-400 block text-[10px]">Speed of Sound c(T):</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          {results.cardioid?.soundSpeedMs?.toFixed(1) || '343.4'} m/s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Enclosure Plate Bending Stiffness & Tour Rigging Safety */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Enclosure Structural Mechanics & Rigging Certification
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-mono cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={acoustics.hasConstrainedLayerDamping ?? true}
                        onChange={(e) =>
                          setAcoustics((p) => ({
                            ...p,
                            hasConstrainedLayerDamping: e.target.checked,
                          }))
                        }
                        className="accent-emerald-400 rounded"
                      />
                      <span>CLD Viscoelastic Core</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Plate Bending Stiffness D:</span>
                      <span className="text-cyan-300 font-bold text-sm">
                        {results.mechanics?.bendingStiffnessNm?.toFixed(0) || '2450'} N·m
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Panel Mode f1,1:</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {results.mechanics?.fundamentalPanelModeHz?.toFixed(0) || '3850'} Hz
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (Braced: {results.mechanics?.bracedPanelModeHz?.toFixed(0) || '4200'}Hz)
                        </span>
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Damping Loss Factor ηsys:</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {results.mechanics?.cldLossFactor?.toFixed(2) || '0.24'}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (Target &gt;0.15)
                        </span>
                      </span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                      <span className="text-slate-400 block text-[10px]">Certified Rigging WLL:</span>
                      <span className="text-purple-300 font-bold text-sm">
                        {results.mechanics?.wllDguv10to1Kg || 35} kg
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (DGUV 10:1) / {results.mechanics?.wllAnsi7to1Kg || 50}kg (ANSI 7:1)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
