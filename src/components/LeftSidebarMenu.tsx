import React, { useState } from 'react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  AlignmentType,
  CameraPreset,
  EnclosureDimensions,
  MaterialSubGroup,
  MaterialType,
  ParametricPortProfileType,
  SpeakonSelectionMode,
} from '../types/loudspeaker.ts';
import {
  Activity,
  AlertTriangle,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Disc3,
  Download,
  Eye,
  FileSpreadsheet,
  FolderKanban,
  Gauge,
  Layers,
  Menu,
  Minimize2,
  Maximize2,
  Radio,
  Ruler,
  Scissors,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Volume2,
  Waves,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { MATERIAL_SPECS } from '../services/acousticEngine.ts';
import { PARAMETRIC_PORT_PROFILES } from '../services/parametricPortEngine.ts';
import { useUnits } from '../context/UnitContext.tsx';

interface LeftSidebarMenuProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  dimensions: EnclosureDimensions;
  setDimensions: React.Dispatch<React.SetStateAction<EnclosureDimensions>>;
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  results: AcousticCalculationResult;
  // Overlays & View Modes
  isAirflowStressVisible: boolean;
  onToggleAirflowStress: () => void;
  isVibrationAnalysisVisible: boolean;
  onToggleVibrationAnalysis: () => void;
  isLiveSimOpen: boolean;
  onToggleLiveSim: () => void;
  isXRayMode: boolean;
  onToggleXRay: () => void;
  isCutawayMode: boolean;
  onToggleCutaway: () => void;
  isWireframeMode: boolean;
  onToggleWireframe: () => void;
  explodedPercent: number;
  setExplodedPercent: (val: number) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (p: CameraPreset) => void;
  // Modals & Tools
  onOpenCutList: () => void;
  onOpenResponseChart: () => void;
  onOpenCrossover: () => void;
  onOpenWizard: () => void;
  onOpenCadExport: () => void;
  onOpenProjects: () => void;
  onOpenCustomDriver: () => void;
  onOpenFeatureModal?: (tab: 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics') => void;
  onOpenSettings?: () => void;
  onOpenPcbWorkspace?: () => void;
  onOpenLineArray?: () => void;
  onOpenTransducerSizing?: () => void;
  isPaSpeaker?: boolean;
  onOpenStructuralRigging?: () => void;
}

export const LeftSidebarMenu: React.FC<LeftSidebarMenuProps> = ({
  isOpen,
  onToggleOpen,
  dimensions,
  setDimensions,
  acoustics,
  setAcoustics,
  results,
  isAirflowStressVisible,
  onToggleAirflowStress,
  isVibrationAnalysisVisible,
  onToggleVibrationAnalysis,
  isLiveSimOpen,
  onToggleLiveSim,
  isXRayMode,
  onToggleXRay,
  isCutawayMode,
  onToggleCutaway,
  isWireframeMode,
  onToggleWireframe,
  explodedPercent,
  setExplodedPercent,
  cameraPreset,
  setCameraPreset,
  onOpenCutList,
  onOpenResponseChart,
  onOpenCrossover,
  onOpenWizard,
  onOpenCadExport,
  onOpenProjects,
  onOpenCustomDriver,
  onOpenFeatureModal,
  onOpenSettings,
  onOpenPcbWorkspace,
  onOpenLineArray,
  onOpenTransducerSizing,
  isPaSpeaker = false,
  onOpenStructuralRigging,
}) => {
  const { unitSystem, toggleUnitSystem, formatLength, formatVolume, formatWeight, formatVelocity } = useUnits();
  const [activeAccordion, setActiveAccordion] = useState<string | null>('materials');
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState<'all' | MaterialSubGroup>('all');

  const toggleAccordion = (section: string) => {
    setActiveAccordion((prev) => (prev === section ? null : section));
  };

  const woofer = acoustics.driverAssignments.woofer.driver;
  const currentMaterial = MATERIAL_SPECS[dimensions.material] || MATERIAL_SPECS.baltic_birch_18;
  const activeDensity = acoustics.materialPricing?.customDensityKgM3 || currentMaterial.densityKgM3;
  const activeModulusGpa =
    acoustics.materialPricing?.customFlexuralModulusGpa ?? (currentMaterial.flexuralModulusGpa || 10.0);
  const activeDamping =
    acoustics.materialPricing?.customDampingFactor ?? (currentMaterial.dampingFactor || 0.022);

  const handleSelectMaterial = (matId: MaterialType) => {
    const spec = MATERIAL_SPECS[matId];
    if (!spec) return;
    setDimensions((prev) => ({
      ...prev,
      material: matId,
      materialCategory: spec.category,
      baffleThicknessMm: spec.nominalThicknessMm,
    }));
    setAcoustics((prev) => ({
      ...prev,
      materialPricing: {
        customDensityKgM3: spec.densityKgM3,
        costPerSquareMeter: spec.defaultCostPerM2,
        wastePercentage: prev.materialPricing?.wastePercentage ?? 15,
        customFlexuralModulusGpa: spec.flexuralModulusGpa,
        customDampingFactor: spec.dampingFactor,
        customPoissonRatio: spec.poissonRatio,
      },
    }));
  };

  const filteredMaterials = Object.values(MATERIAL_SPECS).filter((mat) => {
    const matchesSub = materialFilter === 'all' || mat.subGroup === materialFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      mat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mat.badge || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSub && matchesSearch;
  });

  return (
    <>
      {/* 1. Backdrop on mobile screens */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* 2. Main Left Sidebar Drawer */}
      <aside
        className={`fixed lg:relative top-12 lg:top-0 left-0 bottom-0 z-40 h-[calc(100vh-3rem)] lg:h-full shrink-0 flex flex-col bg-[#07090e] border-r border-slate-800/90 text-slate-200 transition-all duration-200 ease-in-out shadow-2xl lg:shadow-none select-none ${
          isOpen ? 'w-80 translate-x-0' : 'w-13 -translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header & Toggle */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/90 bg-[#090c13] shrink-0">
          {isOpen ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-sm">
                  <Menu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold tracking-wider text-slate-100 uppercase">
                    Tool Drawer
                  </span>
                  <div className="text-[10px] text-cyan-400 font-mono tabular-nums">
                    {formatVolume(results.netVolumeLiters)} • {results.tuningFrequencyFb}Hz
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleOpen}
                title="Collapse Left Tool Drawer"
                className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <button
                onClick={onToggleOpen}
                title="Expand Toolbar Command Hub"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 transition cursor-pointer shadow-sm"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapsed Micro-Rail (When isOpen is false, shows icon buttons for quick access) */}
        {!isOpen && (
          <div className="hidden lg:flex flex-col items-center py-3 gap-2 overflow-y-auto no-scrollbar flex-1">
            <button
              onClick={() => {
                onToggleOpen();
                setActiveAccordion('materials');
              }}
              title="Material Library Browser & FEA Coefficients"
              className="p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/50 transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={() => {
                if (onOpenFeatureModal) {
                  onOpenFeatureModal('acoustics');
                } else {
                  onToggleOpen();
                  setActiveAccordion('acoustics');
                }
              }}
              title="Acoustics & Port Pop-up (X)"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                if (onOpenFeatureModal) {
                  onOpenFeatureModal('dimensions');
                } else {
                  onToggleOpen();
                  setActiveAccordion('geometry');
                }
              }}
              title="Cabinet Geometry & Panels Pop-up (X)"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            >
              <Box className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={onToggleAirflowStress}
              title={`Airflow Stress Map (${isAirflowStressVisible ? 'ON' : 'OFF'})`}
              className={`p-2 rounded-lg transition relative ${
                isAirflowStressVisible
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Activity className="w-4 h-4" />
              {isAirflowStressVisible && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
            <button
              onClick={onToggleVibrationAnalysis}
              title={`Vibration FEA Map (${isVibrationAnalysisVisible ? 'ON' : 'OFF'})`}
              className={`p-2 rounded-lg transition relative ${
                isVibrationAnalysisVisible
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Radio className="w-4 h-4" />
              {isVibrationAnalysisVisible && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </button>
            <button
              onClick={onToggleLiveSim}
              title={`Live Simulation Panel (${isLiveSimOpen ? 'ON' : 'OFF'})`}
              className={`p-2 rounded-lg transition relative ${
                isLiveSimOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Gauge className="w-4 h-4" />
              {isLiveSimOpen && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <div className="w-6 h-px bg-slate-800 my-1" />

            <button
              onClick={onToggleXRay}
              title={`X-Ray Glass Mode (${isXRayMode ? 'ON' : 'OFF'})`}
              className={`p-2 rounded-lg transition ${
                isXRayMode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleCutaway}
              title={`Section Cutaway (${isCutawayMode ? 'ON' : 'OFF'})`}
              className={`p-2 rounded-lg transition ${
                isCutawayMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Scissors className="w-4 h-4" />
            </button>

            <div className="w-6 h-px bg-slate-800 my-1" />

            <button
              onClick={onOpenCrossover}
              title="FIR & Passive Crossover Studio"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={onOpenCutList}
              title="Cut List & BOM Sheet"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWizard();
              }}
              title="Speaker Setup Wizard"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={onOpenCadExport}
              title="Export 3D CAD / 2D DXF"
              className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
            >
              <Download className="w-4 h-4 text-purple-400" />
            </button>

            {onOpenPcbWorkspace && (
              <button
                onClick={onOpenPcbWorkspace}
                title="Automated Multi-Board PCB Stack Workspace"
                className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 transition cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
              </button>
            )}
            {onOpenLineArray && (
              <button
                onClick={onOpenLineArray}
                title="Line Array Speaker Design Mode"
                className="p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 transition cursor-pointer"
              >
                <Waves className="w-4 h-4 text-blue-400" />
              </button>
            )}
            {onOpenTransducerSizing && (
              <button
                onClick={onOpenTransducerSizing}
                title="Transducer-First Enclosure Sizing"
                className="p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </button>
            )}
            {isPaSpeaker && onOpenStructuralRigging && (
              <button
                onClick={onOpenStructuralRigging}
                title="Structural Rigging Analysis (PA Flying Hardware)"
                className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </button>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Application & Unit Settings"
                className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Expanded Full Drawer */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs font-sans">
            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter toolbar tools & materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
              />
            </div>

            {/* --- SECTION 0: MATERIAL LIBRARY BROWSER & FEA VIBRATION COEFFICIENTS --- */}
            <div className="rounded-xl border border-amber-800/80 bg-slate-900/60 overflow-hidden shadow-md">
              <button
                onClick={() => toggleAccordion('materials')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/95 hover:bg-slate-850 font-mono text-xs font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800/80 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 text-amber-400">
                  <Layers className="w-4 h-4" /> Material Library Browser
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60">
                    {currentMaterial.nominalThicknessMm}mm
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      activeAccordion === 'materials' ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {activeAccordion === 'materials' && (
                <div className="p-2.5 space-y-2.5 font-mono text-xs">
                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ['all', 'All (12)'],
                        ['baltic_birch', 'Baltic Birch'],
                        ['mdf_hdf', 'MDF & HDF'],
                        ['plywood_hardwood', 'Plywood/Wood'],
                        ['carbon_fiber', 'Carbon / 3D'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setMaterialFilter(key)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                          materialFilter === key
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable Material Swatch Browser */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {filteredMaterials.map((mat) => {
                      const isSelected = dimensions.material === mat.id;
                      return (
                        <button
                          key={mat.id}
                          onClick={() => handleSelectMaterial(mat.id)}
                          className={`w-full text-left p-2 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                              : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-sm border border-slate-600 shrink-0"
                                style={{ backgroundColor: mat.textureColor }}
                              />
                              <span className="font-bold text-[11px] truncate text-slate-100">
                                {mat.name}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 pt-0.5">
                            <div>
                              ρ: <span className="text-amber-300 font-bold">{mat.densityKgM3}</span> kg/m³
                            </div>
                            <div>
                              E: <span className="text-cyan-300 font-bold">{mat.flexuralModulusGpa}</span> GPa
                            </div>
                            <div>
                              η: <span className="text-purple-300 font-bold">{mat.dampingFactor}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Real-Time FEA Material Coefficient Overrides */}
                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="text-[10px] font-bold text-amber-300 uppercase">
                        Live FEA Material Coefficients
                      </span>
                      <button
                        onClick={onToggleVibrationAnalysis}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                          isVibrationAnalysisVisible
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        FEA Map: {isVibrationAnalysisVisible ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Density Slider */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Density (ρ):</span>
                        <span className="text-amber-300 font-bold">{activeDensity} kg/m³</span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="1650"
                        step="10"
                        value={activeDensity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAcoustics((p) => ({
                            ...p,
                            materialPricing: {
                              customDensityKgM3: val,
                              costPerSquareMeter:
                                p.materialPricing?.costPerSquareMeter ?? currentMaterial.defaultCostPerM2,
                              wastePercentage: p.materialPricing?.wastePercentage ?? 15,
                              customFlexuralModulusGpa: activeModulusGpa,
                              customDampingFactor: activeDamping,
                            },
                          }));
                        }}
                        className="w-full h-1 bg-slate-800 rounded accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Flexural Modulus Slider */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Flexural Modulus (E):</span>
                        <span className="text-cyan-300 font-bold">{activeModulusGpa} GPa</span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max="60.0"
                        step="0.5"
                        value={activeModulusGpa}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAcoustics((p) => ({
                            ...p,
                            materialPricing: {
                              customDensityKgM3: activeDensity,
                              costPerSquareMeter:
                                p.materialPricing?.costPerSquareMeter ?? currentMaterial.defaultCostPerM2,
                              wastePercentage: p.materialPricing?.wastePercentage ?? 15,
                              customFlexuralModulusGpa: val,
                              customDampingFactor: activeDamping,
                            },
                          }));
                        }}
                        className="w-full h-1 bg-slate-800 rounded accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    {/* Damping Loss Factor Slider */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Damping Loss (η):</span>
                        <span className="text-purple-300 font-bold">{activeDamping.toFixed(3)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.010"
                        max="0.065"
                        step="0.002"
                        value={activeDamping}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAcoustics((p) => ({
                            ...p,
                            materialPricing: {
                              customDensityKgM3: activeDensity,
                              costPerSquareMeter:
                                p.materialPricing?.costPerSquareMeter ?? currentMaterial.defaultCostPerM2,
                              wastePercentage: p.materialPricing?.wastePercentage ?? 15,
                              customFlexuralModulusGpa: activeModulusGpa,
                              customDampingFactor: val,
                            },
                          }));
                        }}
                        className="w-full h-1 bg-slate-800 rounded accent-purple-400 cursor-pointer"
                      />
                    </div>

                    {/* Live FEA & Mass Telemetry Readout */}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 text-[10px] text-center">
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block text-[9px]">MASS</span>
                        <span className="text-slate-100 font-bold">{formatWeight(results.totalWeightKg)}</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block text-[9px]">RIGIDITY D</span>
                        <span className="text-cyan-300 font-bold">{results.mechanics?.bendingStiffnessNm ?? 0} N·m</span>
                      </div>
                      <div className="bg-slate-900 p-1 rounded">
                        <span className="text-slate-500 block text-[9px]">MODE f₁,₁</span>
                        <span className="text-purple-300 font-bold">{results.mechanics?.fundamentalPanelModeHz ?? 0} Hz</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- SECTION 1: 3D CAD OVERLAYS & VIEW MODES TOOLBAR --- */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => toggleAccordion('overlays')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/90 hover:bg-slate-850 font-mono text-xs font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800/80 transition"
              >
                <span className="flex items-center gap-2 text-cyan-400">
                  <Activity className="w-4 h-4" /> 3D Overlays & Inspection
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    activeAccordion === 'overlays' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeAccordion === 'overlays' && (
                <div className="p-2.5 space-y-2 font-mono text-xs">
                  {/* Launch Pop-up Button */}
                  {onOpenFeatureModal && (
                    <button
                      onClick={() => onOpenFeatureModal('view3d')}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-bold flex items-center justify-between transition cursor-pointer text-[11px] font-mono shadow-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Open 3D Views & Camera Pop-up
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold">Pop-up ↗</span>
                    </button>
                  )}

                  {/* Airflow Stress & Turbulence */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" /> Airflow Stress Map
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {results.isChuffingRisk ? (
                          <span className="text-amber-400 font-bold">▲ Velocity Choke Risk</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">● Laminar {formatVelocity(results.portAirVelocityMs)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onToggleAirflowStress}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                        isAirflowStressVisible
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isAirflowStressVisible ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Vibration FEA Stress Map */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-purple-400" /> Vibration FEA Stress
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Rigidity: <span className="text-purple-300 font-bold">{results.mechanics?.bendingStiffnessNm ?? 0} N·m</span>
                      </div>
                    </div>
                    <button
                      onClick={onToggleVibrationAnalysis}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                        isVibrationAnalysisVisible
                          ? 'bg-purple-500 text-white shadow'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isVibrationAnalysisVisible ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Live Simulation Panel */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Live Simulation Panel
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Real-time curve &amp; port velocity
                      </div>
                    </div>
                    <button
                      onClick={onToggleLiveSim}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                        isLiveSimOpen
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isLiveSimOpen ? 'OPEN' : 'DOCKED'}
                    </button>
                  </div>

                  {/* CAD Visual Modes (X-Ray, Cutaway, Wireframe) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={onToggleXRay}
                      className={`py-1.5 px-2 rounded-lg text-center border transition cursor-pointer text-[10px] ${
                        isXRayMode
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 mx-auto mb-0.5" />
                      X-Ray
                    </button>
                    <button
                      onClick={onToggleCutaway}
                      className={`py-1.5 px-2 rounded-lg text-center border transition cursor-pointer text-[10px] ${
                        isCutawayMode
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5 mx-auto mb-0.5" />
                      Cutaway
                    </button>
                    <button
                      onClick={onToggleWireframe}
                      className={`py-1.5 px-2 rounded-lg text-center border transition cursor-pointer text-[10px] ${
                        isWireframeMode
                          ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 mx-auto mb-0.5" />
                      Wireframe
                    </button>
                  </div>

                  {/* Exploded View Slider */}
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Exploded View:</span>
                      <span className="text-cyan-300 font-bold">{explodedPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={explodedPercent}
                      onChange={(e) => setExplodedPercent(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    {explodedPercent > 0 && (
                      <button
                        onClick={() => setExplodedPercent(0)}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Reset Assembly (0%)
                      </button>
                    )}
                  </div>

                  {/* Camera Angles */}
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">CAMERA PERSPECTIVE</label>
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      {(['isometric', 'front', 'side', 'top'] as CameraPreset[]).map((cp) => (
                        <button
                          key={cp}
                          onClick={() => setCameraPreset(cp)}
                          className={`py-1 rounded border capitalize transition cursor-pointer ${
                            cameraPreset === cp
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- SECTION 2: ACOUSTICS, CUSTOM PORT & SPEAKON TOOLBAR --- */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => toggleAccordion('acoustics')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/90 hover:bg-slate-850 font-mono text-xs font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800/80 transition"
              >
                <span className="flex items-center gap-2 text-blue-400">
                  <Volume2 className="w-4 h-4" /> Acoustics, Port &amp; SpeakON
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    activeAccordion === 'acoustics' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeAccordion === 'acoustics' && (
                <div className="p-2.5 space-y-3 font-mono text-xs">
                  {/* Launch Pop-up Buttons */}
                  {onOpenFeatureModal && (
                    <div className="grid grid-cols-2 gap-1.5 pb-1">
                      <button
                        onClick={() => onOpenFeatureModal('acoustics')}
                        className="py-1.5 px-2 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-700/60 text-blue-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] font-mono shadow-sm"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Acoustics Pop-up ↗
                      </button>
                      <button
                        onClick={() => onOpenFeatureModal('topology')}
                        className="py-1.5 px-2 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] font-mono shadow-sm"
                      >
                        <Cpu className="w-3.5 h-3.5 text-purple-400" /> Topology Pop-up ↗
                      </button>
                    </div>
                  )}

                  {/* Alignment Switcher */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">ENCLOSURE ALIGNMENT</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['ported', 'sealed', 'bandpass4'] as AlignmentType[]).map((align) => (
                        <button
                          key={align}
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: align }))}
                          className={`py-1 rounded text-center border uppercase text-[10px] transition cursor-pointer ${
                            acoustics.alignment === align
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {align === 'bandpass4' ? '4th BP' : align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tuning Fb Slider & Custom Parametric Port Profile Selector */}
                  {acoustics.alignment !== 'sealed' && (
                    <div className="space-y-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-cyan-400" /> Tuning (Fb):
                        </span>
                        <span className="text-cyan-300 font-bold">{acoustics.targetFb} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={acoustics.targetFb}
                        onChange={(e) =>
                          setAcoustics((p) => ({ ...p, targetFb: parseInt(e.target.value) }))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          PARAMETRIC PORT PROFILE
                        </label>
                        <select
                          value={
                            acoustics.parametricPortConfig?.profileType ||
                            (acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth')
                          }
                          onChange={(e) => {
                            const prof = e.target.value as ParametricPortProfileType;
                            const isSlot =
                              prof === 'rectilinear_slot' ||
                              prof === 'folded_l_conduit' ||
                              prof === 'folded_u_conduit';
                            setAcoustics((p) => ({
                              ...p,
                              portType: isSlot ? 'slot' : 'round',
                              parametricPortConfig: {
                                ...(p.parametricPortConfig || { profileType: prof }),
                                profileType: prof,
                              },
                            }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px]"
                        >
                          {Object.values(PARAMETRIC_PORT_PROFILES).map((prof) => (
                            <option key={prof.id} value={prof.id}>
                              {prof.shortName}
                            </option>
                          ))}
                        </select>
                        {results.parametricPort && (
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>
                              D_h: <strong className="text-cyan-300">{results.parametricPort.crossSection.hydraulicDiameterMm}mm</strong>
                            </span>
                            <span>
                              L_p: <strong className="text-amber-300">{results.parametricPort.effectiveLengthMm}mm</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Neutrik speakON NL4 / NL8 Quick Selector */}
                  {results.speakonReport && (
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase">Neutrik speakON I/O</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                          {results.speakonReport.partNumber} ({results.speakonReport.poleCount}-Pole)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        {(['auto', 'nl4mp', 'nlt4mp', 'nl8mpr'] as SpeakonSelectionMode[]).map((mode) => {
                          const currentMode = dimensions.speakonConfig?.selectionMode || 'auto';
                          return (
                            <button
                              key={mode}
                              onClick={() =>
                                setDimensions((d) => ({
                                  ...d,
                                  speakonConfig: {
                                    ...(d.speakonConfig || {}),
                                    selectionMode: mode,
                                  },
                                }))
                              }
                              className={`py-1 rounded border uppercase transition cursor-pointer ${
                                currentMode === mode
                                  ? 'bg-cyan-600 text-white font-bold border-cyan-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {mode === 'auto' ? 'Auto' : mode.toUpperCase().replace('MPR', '').replace('MP', '')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Driver Info Card */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase">Active Transducer</span>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        {woofer.nominalDiameterInch}" Ø
                      </span>
                    </div>
                    <div className="font-bold text-slate-100 text-xs truncate">
                      {woofer.brand} {woofer.model}
                    </div>
                    <div className="text-[10px] text-slate-400 grid grid-cols-3 gap-1 pt-0.5">
                      <div>Fs: <span className="text-slate-200">{woofer.fs}Hz</span></div>
                      <div>Qts: <span className="text-slate-200">{woofer.qts}</span></div>
                      <div>Vas: <span className="text-slate-200">{woofer.vas}L</span></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={onOpenCustomDriver}
                        className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer"
                      >
                        Edit T/S Params
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- SECTION 3: GEOMETRY & PANELS TOOLBAR --- */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => toggleAccordion('geometry')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/90 hover:bg-slate-850 font-mono text-xs font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800/80 transition"
              >
                <span className="flex items-center gap-2 text-emerald-400">
                  <Box className="w-4 h-4" /> Cabinet Geometry &amp; Panels
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    activeAccordion === 'geometry' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeAccordion === 'geometry' && (
                <div className="p-2.5 space-y-3 font-mono text-xs">
                  {/* Launch Pop-up Buttons */}
                  {onOpenFeatureModal && (
                    <div className="grid grid-cols-2 gap-1.5 pb-1">
                      <button
                        onClick={() => onOpenFeatureModal('dimensions')}
                        className="py-1.5 px-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] font-mono shadow-sm"
                      >
                        <Box className="w-3.5 h-3.5 text-emerald-400" /> Geometry Pop-up ↗
                      </button>
                      <button
                        onClick={() => onOpenFeatureModal('physics')}
                        className="py-1.5 px-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-[11px] font-mono shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 text-rose-400" /> FEA Physics Pop-up ↗
                      </button>
                    </div>
                  )}

                  {/* Dimensions Steppers */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">WIDTH (W)</label>
                      <input
                        type="number"
                        value={dimensions.externalWidthMm}
                        onChange={(e) =>
                          setDimensions((d) => ({ ...d, externalWidthMm: parseInt(e.target.value) || 100 }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                      <span className="text-[9px] text-slate-500">mm</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">HEIGHT (H)</label>
                      <input
                        type="number"
                        value={dimensions.externalHeightMm}
                        onChange={(e) =>
                          setDimensions((d) => ({ ...d, externalHeightMm: parseInt(e.target.value) || 100 }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                      <span className="text-[9px] text-slate-500">mm</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">DEPTH (D)</label>
                      <input
                        type="number"
                        value={dimensions.externalDepthMm}
                        onChange={(e) =>
                          setDimensions((d) => ({ ...d, externalDepthMm: parseInt(e.target.value) || 100 }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      />
                      <span className="text-[9px] text-slate-500">mm</span>
                    </div>
                  </div>

                  {/* Material Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">CONSTRUCTION MATERIAL</label>
                    <select
                      value={dimensions.material}
                      onChange={(e) => handleSelectMaterial(e.target.value as MaterialType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                    >
                      {Object.values(MATERIAL_SPECS).map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.nominalThicknessMm}mm)
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-emerald-400 mt-1">
                      Density: {activeDensity} kg/m³ • Modulus: {activeModulusGpa} GPa
                    </div>
                  </div>

                  {/* Total Mass & Cost */}
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between text-slate-400 text-[11px] tabular-nums">
                    <span>Net Weight: <strong className="text-slate-100">{formatWeight(results.totalWeightKg)}</strong></span>
                    <span>BOM Cost: <strong className="text-emerald-400">${results.materialCost?.totalCostUsd?.toFixed(0) ?? 0}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* --- SECTION 4: ANALYSIS & MANUFACTURING TOOLS --- */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 overflow-hidden">
              <button
                onClick={() => toggleAccordion('tools')}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/90 hover:bg-slate-850 font-mono text-xs font-bold text-slate-200 tracking-wider uppercase border-b border-slate-800/80 transition"
              >
                <span className="flex items-center gap-2 text-purple-400">
                  <Cpu className="w-4 h-4" /> Engineering Tools &amp; DSP
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    activeAccordion === 'tools' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeAccordion === 'tools' && (
                <div className="p-2.5 space-y-2 font-mono text-xs">
                  {/* Audio FIR & Crossover */}
                  <button
                    onClick={onOpenCrossover}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-bold text-slate-200">Audio FIR &amp; Crossover Studio</div>
                        <div className="text-[10px] text-slate-400">Linear-phase, tap budget &amp; export</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* Cut List & BOM */}
                  <button
                    onClick={onOpenCutList}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-slate-200">Cut List &amp; Fabrication BOM</div>
                        <div className="text-[10px] text-slate-400">Panel dimensions &amp; layout</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* Frequency Response Chart */}
                  <button
                    onClick={onOpenResponseChart}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-bold text-slate-200">Response Curves &amp; Spinorama</div>
                        <div className="text-[10px] text-slate-400">F3, listening window &amp; group delay</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* Setup Wizard */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenWizard();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-bold text-slate-200">Speaker Setup Wizard</div>
                        <div className="text-[10px] text-slate-400">5-step guided configuration</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* CAD Export */}
                  <button
                    onClick={onOpenCadExport}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="font-bold text-slate-200">CAD Export (3D &amp; 2D)</div>
                        <div className="text-[10px] text-slate-400">STL, OBJ, GLTF, SVG, DXF</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* Project Manager */}
                  <button
                    onClick={onOpenProjects}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-bold text-slate-200">Project Manager</div>
                        <div className="text-[10px] text-slate-400">Save &amp; load local files</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* PCB Stack Workspace & Gerber Export */}
                  {onOpenPcbWorkspace && (
                    <button
                      onClick={onOpenPcbWorkspace}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-bold text-emerald-200">PCB Stack &amp; Gerber Export</div>
                          <div className="text-[10px] text-emerald-400/80">Automated multi-board crossover layout</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  )}

                  {/* Line Array Speaker Design Mode */}
                  {onOpenLineArray && (
                    <button
                      onClick={onOpenLineArray}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/60 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-bold text-blue-200">Line Array Design Mode</div>
                          <div className="text-[10px] text-blue-400/80">WST Heil physics &amp; curvature splay</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                  )}

                  {/* Transducer-First Enclosure Sizing */}
                  {onOpenTransducerSizing && (
                    <button
                      onClick={onOpenTransducerSizing}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-bold text-amber-200">Transducer Enclosure Sizing</div>
                          <div className="text-[10px] text-amber-400/80">Thiele-Small automated volume synth</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  )}

                  {/* Structural Rigging Analysis (Exclusive to PA Style Speakers) */}
                  {isPaSpeaker && onOpenStructuralRigging && (
                    <button
                      onClick={onOpenStructuralRigging}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="font-bold text-rose-200">Structural Rigging Analysis</div>
                          <div className="text-[10px] text-rose-400/80">Tensile &amp; shear load safety limits (PA)</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  )}

                  {/* Unit System Switcher Quick Toggle */}
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-bold text-slate-200 text-xs">Global Unit System</div>
                        <div className="text-[10px] text-slate-400">
                          {unitSystem === 'metric' ? 'Metric (mm / cm / kg)' : 'Imperial (in / ft / lb)'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleUnitSystem}
                      className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-mono font-bold text-xs transition cursor-pointer"
                    >
                      {unitSystem.toUpperCase()}
                    </button>
                  </div>

                  {/* Application & Unit Settings */}
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-bold text-slate-200">Application Settings</div>
                          <div className="text-[10px] text-slate-400">Precision, fractions, 3D overlays</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
