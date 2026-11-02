import React, { useState } from 'react';
import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticCalculationResult,
  type AcousticParameters,
  type CameraPreset,
  type CategoryHardwareConfig,
  type DampingMaterialType,
  type DriverCompatibilityReport,
  type EnclosureDimensions,
  type MaterialType,
  type ParametricPortProfileType,
  type SpeakerCategory,
  type SpeakerCategorySpec,
  type SpeakerSubcategory,
  type SpeakonSelectionMode,
  type SpeakonWiringArchitecture,
  type SubcategoryConfig,
  type SurfaceFinishType,
  type SystemTopology,
} from '../types/loudspeaker.ts';
import {
  DAMPING_MATERIAL_SPECS,
  DRIVER_PRESETS,
  MATERIAL_SPECS,
  SURFACE_FINISH_SPECS,
  getDriversForCategory,
  getDriversForSubcategory,
  validateDriverCompatibility,
} from '../services/acousticEngine.ts';
import { flushIncompatibleTerminalConfig } from '../services/speakonEngine.ts';
import { PARAMETRIC_PORT_PROFILES } from '../services/parametricPortEngine.ts';
import {
  DEFAULT_INTEGRAL_MATRIX_CONFIG,
  TPMS_LATTICE_LABELS,
  ACOUSTIC_TRAP_LABELS,
  AM_FABRICATION_LABELS,
} from '../services/additiveAcousticEngine.ts';
import type {
  TpmsLatticeType,
  AcousticTrapGeometry,
  AmFabricationMethod,
  IntegralMatrixConfig,
} from '../types/loudspeaker.ts';
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
  Flame,
  Info,
  Layers,
  LineChart,
  Printer,
  Scale,
  ShieldAlert,
  Sliders,
  Sparkles,
  Volume2,
  Waves,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

import type { WorkflowMode } from './TopHeader.tsx';

export type TabType = 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics';

interface ControlDockProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
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
  onToggleLiveSim?: () => void;
  isLiveSimOpen?: boolean;
  isAirflowStressVisible?: boolean;
  onToggleAirflowStress?: () => void;
  isVibrationAnalysisVisible?: boolean;
  onToggleVibrationAnalysis?: () => void;
  onOpenCadExport?: (scope?: 'woodwork_only' | 'port_only' | 'baffle_only' | 'full_assembly' | 'bracing_only') => void;
  activeWorkflowMode?: WorkflowMode;
  onSelectWorkflowMode?: (mode: WorkflowMode) => void;
  dockedRight?: boolean;
  complexityMode?: 'essentials' | 'master';
  onToggleComplexityMode?: (mode?: 'essentials' | 'master') => void;
  focusedSectionId?: string | null;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  isOpen = true,
  onClose,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
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
  onToggleLiveSim,
  isLiveSimOpen,
  isAirflowStressVisible = true,
  onToggleAirflowStress,
  isVibrationAnalysisVisible = false,
  onToggleVibrationAnalysis,
  onOpenCadExport,
  activeWorkflowMode,
  onSelectWorkflowMode,
  dockedRight = false,
  complexityMode = 'essentials',
  onToggleComplexityMode,
  focusedSectionId = null,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localTab, setLocalTab] = useState<TabType>('acoustics');
  const activeTab = activeTabProp !== undefined ? activeTabProp : localTab;
  const setActiveTab = setActiveTabProp || setLocalTab;

  const [showDampingComparison, setShowDampingComparison] = useState(false);
  const [subAccordionOpen, setSubAccordionOpen] = useState<{
    group1: boolean;
    group2: boolean;
    group3: boolean;
  }>({
    group1: true,
    group2: true,
    group3: true,
  });

  // Automatically expand relevant sub-accordion and scroll to section when focusedSectionId changes
  React.useEffect(() => {
    if (!focusedSectionId) return;
    if (focusedSectionId === 'section-driver-alignment') {
      setSubAccordionOpen((p) => ({ ...p, group1: true }));
    } else if (focusedSectionId === 'section-port-aerodynamics') {
      setSubAccordionOpen((p) => ({ ...p, group2: true }));
    } else if (focusedSectionId === 'section-tpms-matrix') {
      setSubAccordionOpen((p) => ({ ...p, group3: true }));
    }

    const timer = setTimeout(() => {
      const el = document.getElementById(focusedSectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 90);
    return () => clearTimeout(timer);
  }, [focusedSectionId, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsCollapsed(false);
    if (onSelectWorkflowMode) {
      if (tab === 'acoustics' || tab === 'topology') {
        onSelectWorkflowMode('acoustic_design');
      } else if (tab === 'dimensions') {
        onSelectWorkflowMode('cabinet_cad');
      } else if (tab === 'view3d' || tab === 'physics') {
        onSelectWorkflowMode('inspection_fea');
      }
    }
  };

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

  const activeCategory: SpeakerCategory = dimensions.category || 'studio_monitor';
  const activeCategorySpec = CATEGORY_SPECS[activeCategory] || CATEGORY_SPECS.studio_monitor;
  const activeHardware: CategoryHardwareConfig = {
    showHandles: dimensions.hardware?.showHandles ?? activeCategorySpec.defaultHardware.showHandles,
    showPoleMount: dimensions.hardware?.showPoleMount ?? activeCategorySpec.defaultHardware.showPoleMount,
    showCornerProtectors: dimensions.hardware?.showCornerProtectors ?? activeCategorySpec.defaultHardware.showCornerProtectors,
    showIsolationFeet: dimensions.hardware?.showIsolationFeet ?? activeCategorySpec.defaultHardware.showIsolationFeet,
  };

  const activeSubcat: SpeakerSubcategory =
    dimensions.subcategory || activeCategorySpec.defaultSubcategory;
  const activeSubcatConfig: SubcategoryConfig =
    SUBCATEGORY_CONFIGS[activeSubcat] || SUBCATEGORY_CONFIGS[activeCategorySpec.defaultSubcategory];

  const [filterByQualifiedOnly, setFilterByQualifiedOnly] = useState<boolean>(true);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  React.useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const handleCategorySelect = (newCat: SpeakerCategory) => {
    const catSpec = CATEGORY_SPECS[newCat];
    const defaultSubcat = catSpec.defaultSubcategory;
    const subcatConfig = SUBCATEGORY_CONFIGS[defaultSubcat];

    let currentWoofer = acoustics.driverAssignments.woofer.driver;
    const currentValidation = validateDriverCompatibility(currentWoofer, newCat, defaultSubcat);

    let nextWoofer = currentWoofer;
    if (currentValidation.status === 'incompatible') {
      const recDriver =
        DRIVER_PRESETS.find((d) => subcatConfig.recommendedDriverIds.includes(d.id)) ||
        DRIVER_PRESETS.find((d) => catSpec.recommendedDriverIds.includes(d.id)) ||
        DRIVER_PRESETS[0];
      if (recDriver) {
        nextWoofer = recDriver;
        setToastNotification(
          `Mounted ${recDriver.brand} ${recDriver.model} to match ${catSpec.name} electroacoustic requirements.`
        );
      }
    }

    // Update dimensions with new category, default subcategory, baseline footprint, and hardware
    setDimensions((prev) => {
      const cleansedSpeakon = flushIncompatibleTerminalConfig(newCat, prev.speakonConfig);
      return {
        ...prev,
        category: newCat,
        subcategory: defaultSubcat,
        externalWidthMm: subcatConfig.defaultDimensionsMm.w,
        externalHeightMm: subcatConfig.defaultDimensionsMm.h,
        externalDepthMm: subcatConfig.defaultDimensionsMm.d,
        hardware: { ...catSpec.defaultHardware },
        speakonConfig: cleansedSpeakon,
        surfaceFinish: prev.surfaceFinish || catSpec.recommendedSurfaceFinish,
      };
    });

    // Update acoustic parameters to subcategory & archetype defaults
    setAcoustics((prev) => ({
      ...prev,
      alignment: subcatConfig.defaultAlignment,
      targetFb: subcatConfig.targetFbHz,
      targetQtc: subcatConfig.targetQtc,
      bracingLevel: catSpec.defaultBracing,
      dampingFillPercent: catSpec.defaultDampingFillPercent,
      absorptionMaterialType: catSpec.defaultAbsorptionMaterial,
      driverAssignments: {
        ...prev.driverAssignments,
        woofer: {
          ...prev.driverAssignments.woofer,
          driver: nextWoofer,
          quantity: subcatConfig.wooferQuantity,
        },
      },
    }));
  };

  const handleSubcategorySelect = (newSubcat: SpeakerSubcategory) => {
    const subcatConfig = SUBCATEGORY_CONFIGS[newSubcat];
    if (!subcatConfig) return;

    let currentWoofer = acoustics.driverAssignments.woofer.driver;
    const currentValidation = validateDriverCompatibility(currentWoofer, subcatConfig.parentCategory, newSubcat);

    let nextWoofer = currentWoofer;
    if (currentValidation.status === 'incompatible') {
      const recDriver =
        DRIVER_PRESETS.find((d) => subcatConfig.recommendedDriverIds.includes(d.id)) ||
        DRIVER_PRESETS.find((d) => CATEGORY_SPECS[subcatConfig.parentCategory].recommendedDriverIds.includes(d.id)) ||
        DRIVER_PRESETS[0];
      if (recDriver) {
        nextWoofer = recDriver;
        setToastNotification(
          `Mounted ${recDriver.brand} ${recDriver.model} to match ${subcatConfig.name} electroacoustic requirements.`
        );
      }
    }

    // Apply subcategory baseline volume and dimensions automatically
    setDimensions((prev) => {
      const cleansedSpeakon = flushIncompatibleTerminalConfig(subcatConfig.parentCategory, prev.speakonConfig);
      return {
        ...prev,
        category: subcatConfig.parentCategory,
        subcategory: newSubcat,
        externalWidthMm: subcatConfig.defaultDimensionsMm.w,
        externalHeightMm: subcatConfig.defaultDimensionsMm.h,
        externalDepthMm: subcatConfig.defaultDimensionsMm.d,
        speakonConfig: cleansedSpeakon,
      };
    });

    // Apply subcategory alignment, tuning, target Qtc, and twin-woofer complement automatically
    setAcoustics((prev) => ({
      ...prev,
      alignment: subcatConfig.defaultAlignment,
      targetFb: subcatConfig.targetFbHz,
      targetQtc: subcatConfig.targetQtc,
      driverAssignments: {
        ...prev.driverAssignments,
        woofer: {
          ...prev.driverAssignments.woofer,
          driver: nextWoofer,
          quantity: subcatConfig.wooferQuantity,
        },
      },
    }));
  };

  if (isOpen === false) return null;

  return (
    <div
      className={
        dockedRight
          ? 'relative w-full h-full flex flex-col overflow-hidden'
          : `fixed z-40 transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 w-[95%] max-w-[960px] ${
              isCollapsed ? 'bottom-2' : 'bottom-3'
            }`
      }
    >
      {/* Non-blocking Auto-Resolution Toast Notification Banner */}
      {toastNotification && (
        <div
          className={
            dockedRight
              ? 'mx-3 mt-2 bg-slate-900/95 border border-cyan-500/90 text-cyan-200 px-3 py-1.5 rounded-lg shadow-lg text-xs font-mono flex items-center justify-between gap-2 z-50 shrink-0'
              : 'absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/90 text-cyan-200 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono flex items-center gap-2 z-50 animate-bounce max-w-full truncate'
          }
        >
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{toastNotification}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="ml-1 hover:text-white text-slate-400 cursor-pointer text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={
          dockedRight
            ? 'relative w-full h-full flex flex-col text-slate-200 overflow-hidden font-sans'
            : 'relative bg-[#0d1016]/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-slate-200 overflow-hidden font-sans'
        }
      >
        {/* Header Navigation Bar (Only shown when floating, hidden when docked inside RightPropertyInspector) */}
        {!dockedRight && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#080a0f] border-b border-slate-800 text-xs select-none">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => handleTabChange('acoustics')}
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
                onClick={() => handleTabChange('topology')}
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
                onClick={() => handleTabChange('dimensions')}
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
                onClick={() => handleTabChange('view3d')}
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
                onClick={() => handleTabChange('physics')}
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

              {onClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  title="Close Pop-up (X)"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-600 hover:border-rose-400 text-xs font-mono font-bold transition cursor-pointer shadow-md ml-1"
                >
                  <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Close (X)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {(!isCollapsed || dockedRight) && (
          <div
            className={
              dockedRight
                ? 'flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950'
                : 'p-4 max-h-[44vh] overflow-y-auto space-y-4'
            }
          >
            {/* TAB 1: ACOUSTICS & PORT AERODYNAMICS */}
            {activeTab === 'acoustics' && (
              <div className="space-y-3.5">
                {/* SUB-ACCORDION GROUP 1: ARCHETYPE & TRANSDUCER PAIRING */}
                <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setSubAccordionOpen((p) => ({ ...p, group1: !p.group1 }))}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0a0d14] hover:bg-[#0f131d] border-b border-slate-800/80 transition cursor-pointer text-left select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                          <span>1. Archetype & Transducer Pairing</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Loudspeaker design archetype, subcategory architecture & driver match
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700/80 text-cyan-300">
                        {activeCategorySpec.name} • {acoustics.driverAssignments.woofer.driver.brand} {acoustics.driverAssignments.woofer.driver.model}
                      </span>
                      {subAccordionOpen.group1 ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {subAccordionOpen.group1 && (
                    <div className="p-3.5 space-y-3.5 bg-slate-950/50">
                      {/* 4-WAY SYSTEM DESIGN ARCHETYPE BAR */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-md space-y-2.5 font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-900 border border-slate-700 text-cyan-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                          Loudspeaker Design Archetype
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Target curve alignment, port airflow limits, and hardware defaults
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm"
                      style={{
                        backgroundColor: `${activeCategorySpec.accentColor}18`,
                        borderColor: `${activeCategorySpec.accentColor}60`,
                        color: activeCategorySpec.accentColor,
                      }}
                    >
                      {activeCategorySpec.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['studio_monitor', 'studio_sub', 'live_top', 'live_sub'] as SpeakerCategory[]).map((catKey) => {
                      const spec = CATEGORY_SPECS[catKey];
                      const isSelected = activeCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          onClick={() => handleCategorySelect(catKey)}
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-slate-900/90 shadow-md font-semibold'
                              : 'bg-slate-950/60 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                          }`}
                          style={isSelected ? { borderColor: spec.accentColor } : {}}
                        >
                          {isSelected && (
                            <div
                              className="absolute top-0 left-0 right-0 h-0.5"
                              style={{ backgroundColor: spec.accentColor }}
                            />
                          )}
                          <div className="flex items-center justify-between w-full">
                            <span
                              className="text-xs font-bold font-mono"
                              style={{ color: isSelected ? spec.accentColor : '#94a3b8' }}
                            >
                              {spec.name}
                            </span>
                            {isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: spec.accentColor }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{spec.tagline}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Archetype Telemetry Ribbon */}
                  {results.categoryTelemetry && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1.5 border-t border-slate-800/80 font-mono text-xs">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">MAX CONTINUOUS SPL</span>
                        <span className="text-amber-300 font-bold text-sm">
                          {results.categoryTelemetry.maxSplDbAt1m} dB @ 1m
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          -{results.categoryTelemetry.powerCompressionDb}dB thermal comp
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">PORT CHUFFING HEADROOM</span>
                        <span
                          className={`font-bold text-xs ${
                            results.categoryTelemetry.portNoiseStatus === 'nominal'
                              ? 'text-emerald-400'
                              : results.categoryTelemetry.portNoiseStatus === 'caution'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {results.categoryTelemetry.portNoiseMargin}
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          Limit: {activeCategorySpec.maxRecommendedPortVelocityMs} m/s
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">THERMAL POWER LIMIT</span>
                        <span className="text-cyan-300 font-bold text-sm">
                          {results.categoryTelemetry.maxContinuousPowerW} W RMS
                        </span>
                        <span className="text-slate-500 text-[9px] block">AES Continuous</span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">TARGET ALIGNMENT</span>
                        <span className="text-purple-300 font-bold text-xs uppercase">
                          {activeCategorySpec.defaultAlignment} • Fb {activeCategorySpec.targetFbDefaultHz}Hz
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          Target Qtc {activeCategorySpec.targetQtc}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recommendation Advice Strip */}
                  <div className="p-2 rounded bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong className="text-slate-200">{activeCategorySpec.name}:</strong>{' '}
                      {results.categoryTelemetry?.categoryRecommendation || activeCategorySpec.description}
                    </span>
                  </div>
                </div>

                {/* SPECIALIZED ARCHETYPE SUBCATEGORY ARCHITECTURE SELECTOR */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-md space-y-2.5 font-sans">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-900 border border-slate-700 text-purple-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                            Specialized Subcategory Architecture
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm"
                            style={{
                              backgroundColor: `${activeCategorySpec.accentColor}18`,
                              borderColor: `${activeCategorySpec.accentColor}60`,
                              color: activeCategorySpec.accentColor,
                            }}
                          >
                            {results.subcategoryTelemetry?.engineeringBadge || activeSubcatConfig.engineeringBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Chamber acoustic geometry, transducer quantity, and chassis footprint
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Subcategory Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeCategorySpec.subcategories.map((subcatKey) => {
                      const subConfig = SUBCATEGORY_CONFIGS[subcatKey];
                      if (!subConfig) return null;
                      const isSelected = activeSubcat === subcatKey;

                      return (
                        <button
                          key={subcatKey}
                          onClick={() => handleSubcategorySelect(subcatKey)}
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-slate-900 shadow-md font-semibold'
                              : 'bg-slate-950/60 border-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                          }`}
                          style={isSelected ? { borderColor: activeCategorySpec.accentColor } : {}}
                        >
                          {isSelected && (
                            <div
                              className="absolute top-0 left-0 right-0 h-0.5"
                              style={{ backgroundColor: activeCategorySpec.accentColor }}
                            />
                          )}
                          <div className="flex items-center justify-between w-full">
                            <span
                              className="text-xs font-bold font-mono"
                              style={{ color: isSelected ? activeCategorySpec.accentColor : '#cbd5e1' }}
                            >
                              {subConfig.shortName}
                            </span>
                            {isSelected && (
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: activeCategorySpec.accentColor }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{subConfig.tagline}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Subcategory Telemetry & Engineering Specs */}
                  {results.subcategoryTelemetry && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-slate-800/80 font-mono text-xs">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">TRANSDUCER ARRAY</span>
                        <span className="text-amber-300 font-bold text-xs">
                          {results.subcategoryTelemetry.isDualWoofer ? 'Twin Woofers (Parallel 4Ω)' : 'Single 1× Woofer'}
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          Total Sd: {results.subcategoryTelemetry.combinedSdCm2} cm²
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">STROKE VOLUME (Vd)</span>
                        <span className="text-cyan-300 font-bold text-xs">
                          {results.subcategoryTelemetry.combinedVdCm3} cm³
                        </span>
                        <span className="text-slate-500 text-[9px] block">Diaphragm Displacement</span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">ACOUSTIC CHAMBER</span>
                        <span className="text-purple-300 font-bold text-xs truncate block">
                          {results.subcategoryTelemetry.isBandpass
                            ? `Bandpass 4th (80L / 150L)`
                            : results.subcategoryTelemetry.isCoaxial
                            ? `Concentric Coaxial 90°`
                            : `Net Vb: ${results.netVolumeLiters} L`}
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          {activeSubcatConfig.hasMidrangeChamber ? 'Isolated Mid Chamber' : `Fb: ${results.tuningFrequencyFb} Hz`}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">MODULE ARCHITECTURE</span>
                        <span className="text-emerald-300 font-bold text-xs truncate block">
                          {results.subcategoryTelemetry.hasPlateAmplifier
                            ? `Pascal Pro 1000W RMS`
                            : `Passive Enclosure`}
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          {results.subcategoryTelemetry.hasPlateAmplifier
                            ? `-${results.subcategoryTelemetry.plateAmpDisplacementLiters}L Heatsink Chass.`
                            : `External Amp Driven`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Subcategory Technical Description */}
                  <div className="p-2 rounded bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong className="text-slate-200">{activeSubcatConfig.name}:</strong>{' '}
                      {activeSubcatConfig.description}
                    </span>
                  </div>
                </div>

                {/* CARD 1: PRIMARY TRANSDUCER & ENCLOSURE ALIGNMENT */}
                <div
                  id="section-driver-alignment"
                  className={`bg-slate-950/80 border rounded-xl p-3.5 shadow-sm space-y-3 transition-all ${
                    focusedSectionId === 'section-driver-alignment'
                      ? 'border-cyan-400 ring-1 ring-cyan-500/50'
                      : 'border-slate-800'
                  }`}
                >
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
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                          Woofer Driver Model
                        </label>
                        <button
                          onClick={() => setFilterByQualifiedOnly(!filterByQualifiedOnly)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                            filterByQualifiedOnly
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-bold'
                              : 'bg-amber-950 text-amber-300 border border-amber-700/80 font-bold'
                          }`}
                          title="Toggle between qualified compatible transducers and experimental mode"
                        >
                          {filterByQualifiedOnly ? '✓ Qualified Drivers Only' : 'Show All Transducers (Experimental)'}
                        </button>
                      </div>
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
                        {DRIVER_PRESETS.filter((d) => {
                          // Filter out HF compression drivers
                          if (d.id.startsWith('jbl_24') || d.nominalDiameterInch < 4) return false;
                          if (!filterByQualifiedOnly) return true;
                          const validation = validateDriverCompatibility(d, activeCategory, activeSubcat);
                          return validation.status !== 'incompatible';
                        })
                          .sort((a, b) => {
                            const aSubRec = activeSubcatConfig.recommendedDriverIds.includes(a.id) ? 2 : 0;
                            const bSubRec = activeSubcatConfig.recommendedDriverIds.includes(b.id) ? 2 : 0;
                            const aCompat = validateDriverCompatibility(a, activeCategory, activeSubcat).status === 'optimal' ? 1 : 0;
                            const bCompat = validateDriverCompatibility(b, activeCategory, activeSubcat).status === 'optimal' ? 1 : 0;
                            return (bSubRec + bCompat) - (aSubRec + aCompat);
                          })
                          .map((d) => {
                            const validation = validateDriverCompatibility(d, activeCategory, activeSubcat);
                            const isSubRec = activeSubcatConfig.recommendedDriverIds.includes(d.id);
                            const badge = isSubRec
                              ? ' [★ Recommended]'
                              : validation.status === 'optimal'
                              ? ' [✓ Qualified]'
                              : validation.status === 'suboptimal'
                              ? ' [⚡ Suboptimal]'
                              : ' [⚠️ Incompatible]';

                            return (
                              <option key={d.id} value={d.id}>
                                [{d.brand}] {d.model} ({d.nominalDiameterInch}" • Fs {d.fs}Hz • Vas {d.vas}L • Qts {d.qts})
                                {badge}
                              </option>
                            );
                          })}
                      </select>

                      {/* Acoustic Mismatch Warning Card */}
                      {results.driverCompatibility && results.driverCompatibility.status !== 'optimal' && (
                        <div
                          className={`mt-2 p-2.5 rounded-lg border text-xs font-sans space-y-1.5 ${
                            results.driverCompatibility.status === 'incompatible'
                              ? 'bg-rose-950/90 border-rose-700 text-rose-200 shadow-md'
                              : 'bg-amber-950/90 border-amber-700 text-amber-200 shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle
                                className={`w-4 h-4 ${
                                  results.driverCompatibility.status === 'incompatible'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              />
                              <span>
                                {results.driverCompatibility.status === 'incompatible'
                                  ? 'Acoustic Mismatch Conflict'
                                  : 'Suboptimal Transducer Pairing'}
                              </span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/80 text-[10px] font-mono">
                              Select qualified driver below
                            </span>
                          </div>

                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90 leading-relaxed font-sans">
                            {results.driverCompatibility.reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>

                          {results.driverCompatibility.recommendedAlternatives.length > 0 && (
                            <div className="text-[10px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                              <span className="text-slate-400">Recommended Qualified Alternatives:</span>{' '}
                              <span className="text-emerald-300">
                                {results.driverCompatibility.recommendedAlternatives.slice(0, 2).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Box Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: 'ported' }))}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                            acoustics.alignment === 'ported'
                              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Bass Reflex
                        </button>
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: 'sealed' }))}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                            acoustics.alignment === 'sealed'
                              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Sealed Box
                        </button>
                        <button
                          onClick={() => setAcoustics((p) => ({ ...p, alignment: 'bandpass4' }))}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                            acoustics.alignment === 'bandpass4'
                              ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          4th-Order BP
                        </button>
                      </div>
                      {acoustics.alignment === 'bandpass4' && (
                        <div className="grid grid-cols-2 gap-2 pt-2 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 font-mono text-[10px]">
                          <div>
                            <div className="flex justify-between text-slate-400 mb-0.5">
                              <span>Front V_f:</span>
                              <span className="text-cyan-300 font-bold">
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
                                setAcoustics((p) => ({
                                  ...p,
                                  bandpassFrontVbLiters: Number(e.target.value),
                                }))
                              }
                              className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-slate-400 mb-0.5">
                              <span>Rear V_r:</span>
                              <span className="text-emerald-300 font-bold">
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
                                setAcoustics((p) => ({
                                  ...p,
                                  bandpassRearVbLiters: Number(e.target.value),
                                }))
                              }
                              className="w-full h-1.5 rounded-lg appearance-none bg-slate-800 accent-emerald-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Driver Electrical Impedance Profile Telemetry Card */}
                    <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          <span>Driver &amp; System Impedance</span>
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            acoustics.driverAssignments.woofer.driver.measuredImpedance
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {acoustics.driverAssignments.woofer.driver.measuredImpedance
                            ? 'DATS Measured (.ZMA)'
                            : 'Electroacoustic Model'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] pt-1 border-t border-slate-800/80">
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 block">Re (DC)</span>
                          <span className="text-cyan-300 font-bold">
                            {acoustics.driverAssignments.woofer.driver.reOhm ?? 5.6} Ω
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 block">Le (10k)</span>
                          <span className="text-slate-200 font-bold">
                            {acoustics.driverAssignments.woofer.driver.leMh ?? 0.45} mH
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 block">Nominal</span>
                          <span className="text-emerald-400 font-bold">
                            {results.systemImpedance?.nominalImpedanceOhm ?? 8} Ω
                          </span>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/60">
                          <span className="text-[9px] text-slate-500 block">Min Load</span>
                          <span className="text-amber-300 font-bold">
                            {results.systemImpedance?.minimumImpedanceOhm ?? 3.6} Ω
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[9.5px]">
                        <span className="text-slate-400">
                          {acoustics.alignment === 'sealed'
                            ? `Box Fc Peak: ${results.systemImpedance?.boxResonanceFcHz ?? results.f3CutoffHz} Hz`
                            : `Tuning Fb Notch: ${results.systemImpedance?.portTuningFbHz ?? results.tuningFrequencyFb} Hz (0°)`}
                        </span>
                        {onOpenCustomDriver && (
                          <button
                            onClick={onOpenCustomDriver}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <span>Upload / Edit .ZMA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SUB-ACCORDION GROUP 2: RESONATOR & PORT AERODYNAMICS */}
            <div
              id="section-port-aerodynamics"
              className={`border rounded-xl bg-slate-950/80 overflow-hidden shadow-sm transition-all ${
                focusedSectionId === 'section-port-aerodynamics'
                  ? 'border-amber-400 ring-1 ring-amber-500/50'
                  : 'border-slate-800'
              }`}
            >
              <button
                onClick={() => setSubAccordionOpen((p) => ({ ...p, group2: !p.group2 }))}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0a0d14] hover:bg-[#0f131d] border-b border-slate-800/80 transition cursor-pointer text-left select-none"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                      <span>2. Resonator & Port Aerodynamics</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Max SPL output, Helmholtz port tuning & boundary clearance diagnostics
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700/80 text-amber-300">
                    {acoustics.alignment === 'ported'
                      ? `Ported • Fb ${acoustics.targetFb}Hz • ${results.portAirVelocityMs}m/s`
                      : 'Sealed Box'}
                  </span>
                  {subAccordionOpen.group2 ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {subAccordionOpen.group2 && (
                <div className="p-3.5 space-y-3.5 bg-slate-950/50">
                  {/* REAL-TIME MAX SPL & ELECTROACOUSTIC BOTTLENECK CALCULATOR CARD */}
                {results.maxSplReport && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-3 font-sans">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-rose-950/80 border border-rose-700/60 text-rose-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                              Real-Time Max SPL & Headroom Calculator
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm ${
                                results.maxSplReport.archetypeStatus === 'optimal_headroom'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : results.maxSplReport.archetypeStatus === 'adequate'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                  : 'bg-rose-950 text-rose-300 border-rose-800'
                              }`}
                            >
                              {results.maxSplReport.archetypeStatus === 'optimal_headroom'
                                ? `Optimal Headroom (+${results.maxSplReport.archetypeHeadroomDb}dB)`
                                : results.maxSplReport.archetypeStatus === 'adequate'
                                ? `Target Met (+${results.maxSplReport.archetypeHeadroomDb}dB)`
                                : `Underpowered (${results.maxSplReport.archetypeHeadroomDb}dB)`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Acoustic output capability based on driver Xmax stroke, voice coil thermal limit, distance loss, and boundary loading
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">Continuous:</span>
                          <span className="text-amber-300 font-bold text-sm">
                            {results.maxSplReport.effectiveContinuousSplDb} dB SPL
                          </span>
                        </div>
                        <div className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">Peak (+6dB):</span>
                          <span className="text-emerald-400 font-bold text-sm">
                            {results.maxSplReport.effectivePeakSplDb} dB SPL
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Sliders & Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Power Drive Input Slider */}
                      <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Amplifier Drive Power:</span>
                          <span className="text-cyan-300 font-bold">
                            {acoustics.splCalcInputPowerW ?? results.maxSplReport.maxContinuousPowerW} W RMS
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max={Math.max(100, results.maxSplReport.maxContinuousPowerW * 1.5)}
                          step="5"
                          value={acoustics.splCalcInputPowerW ?? results.maxSplReport.maxContinuousPowerW}
                          onChange={(e) =>
                            setAcoustics((p) => ({ ...p, splCalcInputPowerW: parseInt(e.target.value) }))
                          }
                          className="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <button
                            onClick={() => setAcoustics((p) => ({ ...p, splCalcInputPowerW: 1 }))}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            1W (Ref)
                          </button>
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({
                                ...p,
                                splCalcInputPowerW: Math.round(results.maxSplReport!.maxContinuousPowerW / 2),
                              }))
                            }
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            50% RMS
                          </button>
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({
                                ...p,
                                splCalcInputPowerW: results.maxSplReport!.maxContinuousPowerW,
                              }))
                            }
                            className="text-cyan-400 hover:underline font-bold cursor-pointer"
                          >
                            100% RMS ({results.maxSplReport.maxContinuousPowerW}W)
                          </button>
                        </div>
                      </div>

                      {/* Target Distance Slider */}
                      <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Listening Distance:</span>
                          <span className="text-purple-300 font-bold">
                            {acoustics.splCalcDistanceM ?? 1.0} meters
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="10.0"
                          step="0.1"
                          value={acoustics.splCalcDistanceM ?? 1.0}
                          onChange={(e) =>
                            setAcoustics((p) => ({ ...p, splCalcDistanceM: parseFloat(e.target.value) }))
                          }
                          className="w-full h-1.5 bg-slate-800 rounded-lg accent-purple-400 cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          {([0.5, 1.0, 2.0, 4.0, 8.0] as const).map((dist) => (
                            <button
                              key={dist}
                              onClick={() => setAcoustics((p) => ({ ...p, splCalcDistanceM: dist }))}
                              className={`cursor-pointer hover:text-purple-300 ${
                                (acoustics.splCalcDistanceM ?? 1.0) === dist
                                  ? 'text-purple-400 font-bold underline'
                                  : 'text-slate-500'
                              }`}
                            >
                              {dist}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Boundary Loading Space Radio Buttons */}
                      <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Acoustic Boundary Space:</span>
                          <span className="text-amber-300 font-bold">
                            +{results.maxSplReport.boundaryGainDb} dB
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({ ...p, splCalcBoundarySpace: 'free_space_4pi' }))
                            }
                            className={`py-1 px-1.5 rounded transition cursor-pointer text-center ${
                              results.maxSplReport.boundarySpace === 'free_space_4pi'
                                ? 'bg-amber-950 border border-amber-600 text-amber-200 font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            4π Free Space (0dB)
                          </button>
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({ ...p, splCalcBoundarySpace: 'half_space_2pi' }))
                            }
                            className={`py-1 px-1.5 rounded transition cursor-pointer text-center ${
                              results.maxSplReport.boundarySpace === 'half_space_2pi'
                                ? 'bg-amber-950 border border-amber-600 text-amber-200 font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            2π Ground (+6dB)
                          </button>
                          <button
                            onClick={() =>
                              setAcoustics((p) => ({ ...p, splCalcBoundarySpace: 'corner_bound_1pi' }))
                            }
                            className={`py-1 px-1.5 rounded transition cursor-pointer text-center ${
                              results.maxSplReport.boundarySpace === 'corner_bound_1pi'
                                ? 'bg-amber-950 border border-amber-600 text-amber-200 font-bold'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            1π Corner (+12dB)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Physics Limiting Factor & Headroom Benchmark Telemetry */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono text-xs">
                      {/* Bottleneck Diagnostic */}
                      <div
                        className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                          results.maxSplReport.limitingFactor === 'excursion_displacement'
                            ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">SPL LIMITING BOTTLENECK</span>
                          <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5">
                            {results.maxSplReport.limitingFactor === 'excursion_displacement' ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Excursion Limited (Xmax Stroke)</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>Thermal Power Limited (Voice Coil)</span>
                              </>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 font-sans leading-relaxed">
                            {results.maxSplReport.limitingFactorDescription}
                          </p>
                        </div>
                      </div>

                      {/* Acoustic Loss & Gain Budget */}
                      <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase block">ACOUSTIC GAIN & LOSS BUDGET</span>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-1">
                          <div>
                            <span className="text-slate-500 block text-[9px]">Sensitivity:</span>
                            <span className="text-cyan-300 font-bold">{results.maxSplReport.systemSensitivity1w1mMm} dB @ 1W/1m</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Thermal Comp:</span>
                            <span className="text-rose-400 font-bold">-{results.maxSplReport.powerCompressionLossDb} dB</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Distance Loss ({results.maxSplReport.targetDistanceM}m):</span>
                            <span className="text-amber-400 font-bold">-{results.maxSplReport.distanceLossDb} dB</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Boundary Gain:</span>
                            <span className="text-emerald-400 font-bold">+{results.maxSplReport.boundaryGainDb} dB</span>
                          </div>
                        </div>
                      </div>

                      {/* Archetype Benchmark Comparison Progress */}
                      <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 uppercase">ARCHETYPE TARGET BENCHMARK</span>
                            <span className="text-slate-300 font-bold">{results.maxSplReport.archetypeTargetSplDb} dB Peak</span>
                          </div>
                          <div className="mt-1.5 w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                results.maxSplReport.archetypeStatus === 'optimal_headroom'
                                  ? 'bg-emerald-400'
                                  : results.maxSplReport.archetypeStatus === 'adequate'
                                  ? 'bg-cyan-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (results.maxSplReport.effectivePeakSplDb / (results.maxSplReport.archetypeTargetSplDb + 10)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-sans leading-relaxed">
                            {results.maxSplReport.archetypeRecommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD 2: PORT GEOMETRY & AERODYNAMIC TUNING (when Ported) */}
                {acoustics.alignment === 'sealed' ? (
                  <div className="bg-slate-950/80 border border-amber-800/60 rounded-xl p-4 text-center space-y-3 font-mono">
                    <div className="inline-flex p-2.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-400">
                      <Wind className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                        Enclosure Alignment is Currently Sealed Box
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
                        Sealed enclosures operate with zero Helmholtz resonator ports (0.0 m/s laminar air velocity). Switch to Bass Reflex (Ported) to configure aerodynamic flares, 3D parametric conduit topologies, and Helmholtz tuning frequency (Fb).
                      </p>
                    </div>
                    <div className="pt-1 flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => setAcoustics((p) => ({ ...p, alignment: 'ported' }))}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 font-mono"
                      >
                        <Wind className="w-4 h-4 text-slate-950" />
                        <span>Switch Enclosure to Bass Reflex (Ported)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3.5">
                    {/* Header with Custom Parametric Port Synthesis Engine */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
                          <Wind className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                            Custom Parametric Port Synthesis Engine
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Zero COTS catalog tubes • Synthesized cross-sections, hydraulic D_h &amp; v_max &lt; 34 m/s limit
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 text-[10px] font-mono font-bold uppercase">
                        {results.parametricPort?.fabricationMethod === 'additive_3d_print'
                          ? 'Manifold 3D Print Ready'
                          : results.parametricPort?.fabricationMethod === 'cnc_laminated_wood'
                          ? 'CNC Laminated Slot'
                          : 'Hybrid Folded Conduit'}
                      </span>
                    </div>

                    {/* 6-Profile Parametric Shape Synthesis Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Parametric Cross-Section &amp; Conduit Topology (6 Synthesized Profiles)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-xs">
                        {Object.values(PARAMETRIC_PORT_PROFILES).map((prof) => {
                          const currentProf =
                            acoustics.parametricPortConfig?.profileType ||
                            (acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth');
                          const isSelected = currentProf === prof.id;
                          return (
                            <button
                              key={prof.id}
                              onClick={() => {
                                const isSlot =
                                  prof.id === 'rectilinear_slot' ||
                                  prof.id === 'folded_l_conduit' ||
                                  prof.id === 'folded_u_conduit';
                                setAcoustics((p) => ({
                                  ...p,
                                  portType: isSlot ? 'slot' : 'round',
                                  parametricPortConfig: {
                                    ...(p.parametricPortConfig || { profileType: prof.id }),
                                    profileType: prof.id,
                                  },
                                }));
                              }}
                              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-950/85 border-cyan-500 text-white font-bold shadow-xs'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-[11px] text-cyan-300 font-bold truncate">{prof.shortName}</div>
                              <div className="text-[9px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                                {prof.description}
                              </div>
                            </button>
                          );
                        })}
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
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>k_end: {results.parametricPort?.endCorrectionFactorK ?? 0.732}</span>
                          <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              checked={acoustics.parametricPortConfig?.autoFoldWhenLong ?? true}
                              onChange={(e) =>
                                setAcoustics((p) => ({
                                  ...p,
                                  parametricPortConfig: {
                                    ...(p.parametricPortConfig || { profileType: 'circular_bellmouth' }),
                                    autoFoldWhenLong: e.target.checked,
                                  },
                                }))
                              }
                              className="accent-cyan-400 rounded"
                            />
                            <span>Auto-Fold L/U</span>
                          </label>
                        </div>
                      </div>

                      {/* Round / Elliptical / Horn Throat vs Slot Width */}
                      {!(
                        acoustics.parametricPortConfig?.profileType === 'rectilinear_slot' ||
                        acoustics.parametricPortConfig?.profileType === 'folded_l_conduit' ||
                        acoustics.parametricPortConfig?.profileType === 'folded_u_conduit' ||
                        acoustics.portType === 'slot'
                      ) ? (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Eqv Throat Ø:</span>
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
                            <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                              <span>
                                L_p: <strong className="text-slate-300">{results.portLengthMm} mm</strong>
                              </span>
                              <span>
                                Area: <strong className="text-cyan-300">{results.parametricPort?.crossSection.throatAreaCm2} cm²</strong>
                              </span>
                            </div>
                          </div>

                          {(acoustics.parametricPortConfig?.profileType === 'elliptical_aperture') ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Ellipse Ratio (a/b):</span>
                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                                  {(acoustics.parametricPortConfig?.ellipseAspectRatio || 1.65).toFixed(2)}:1
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1.20"
                                max="2.60"
                                step="0.05"
                                value={acoustics.parametricPortConfig?.ellipseAspectRatio || 1.65}
                                onChange={(e) =>
                                  setAcoustics((p) => ({
                                    ...p,
                                    parametricPortConfig: {
                                      ...(p.parametricPortConfig || { profileType: 'elliptical_aperture' }),
                                      ellipseAspectRatio: parseFloat(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                              />
                              <div className="text-[10px] font-mono text-slate-500">
                                Axes: {results.parametricPort?.crossSection.widthMm} × {results.parametricPort?.crossSection.heightMm} mm
                              </div>
                            </div>
                          ) : (acoustics.parametricPortConfig?.profileType === 'flared_exponential_horn') ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Horn Expansion (S_m/S_t):</span>
                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                                  {(acoustics.parametricPortConfig?.hornExpansionFactor || 2.25).toFixed(2)}×
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1.40"
                                max="3.50"
                                step="0.05"
                                value={acoustics.parametricPortConfig?.hornExpansionFactor || 2.25}
                                onChange={(e) =>
                                  setAcoustics((p) => ({
                                    ...p,
                                    parametricPortConfig: {
                                      ...(p.parametricPortConfig || { profileType: 'flared_exponential_horn' }),
                                      hornExpansionFactor: parseFloat(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer"
                              />
                              <div className="text-[10px] font-mono text-slate-500">
                                Mouth: {results.parametricPort?.crossSection.mouthAreaCm2} cm² (cosh² m={results.parametricPort?.crossSection.hornFlareConstantM})
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Bell-Mouth Flare (r_f):</span>
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
                          )}
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

                    {/* CUSTOM PARAMETRIC PORT SYNTHESIS & FLUID TELEMETRY CARD */}
                    {results.portMatch && (
                      <div className="bg-slate-950/80 border border-cyan-800/80 rounded-xl p-3 space-y-2.5 font-mono">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1.5 border-b border-slate-800/80">
                          <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Wind className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Synthesized Port: {results.portMatch.synthesizedProfileName}</span>
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              results.portMatch.exceeds34MsLimit
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : results.portMatch.isLaminar
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {results.portMatch.exceeds34MsLimit
                              ? '⚠️ Exceeds 34 m/s Sonic Limit'
                              : results.portMatch.isLaminar
                              ? 'Manifold Laminar Verified'
                              : 'Transitional Flow (< 34 m/s)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">RATED VELOCITY (v_max)</span>
                            <span
                              className={`font-bold ${
                                results.portMatch.exceeds34MsLimit
                                  ? 'text-rose-400'
                                  : results.portMatch.isLaminar
                                  ? 'text-emerald-400'
                                  : 'text-amber-300'
                              }`}
                            >
                              {results.portMatch.ratedPowerVelocityMs} m/s
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              (Mach {results.parametricPort?.machNumber ?? 0.03} • Limit 34 m/s)
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">HYDRAULIC Ø (D_h)</span>
                            <span className="text-cyan-300 font-bold">
                              D_h = {results.portMatch.hydraulicDiameterMm} mm
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              (P_w = {results.portMatch.wettedPerimeterMm} mm)
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">EFFECTIVE LENGTH (L_p)</span>
                            <span className="text-amber-300 font-bold">{results.portLengthMm} mm</span>
                            <span className="text-slate-500 text-[9px] block">
                              {results.parametricPort?.isFolded
                                ? `(${results.parametricPort.foldBendCount}-Bend: ${results.parametricPort.legLengthsMm.join('+')}mm)`
                                : `(ΔL_end = ${results.parametricPort?.endCorrectionMm ?? 0}mm)`}
                            </span>
                          </div>

                          <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 text-[10px] block">MANIFOLD ENVELOPE</span>
                            <span className="text-slate-200 font-bold">
                              {results.portMatch.printDimensionsMm.widthMm}×{results.portMatch.printDimensionsMm.depthMm}mm
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              ({results.portMatch.needsModularSplit ? `${results.portMatch.splitSegmentCount} Interlocking Segs` : 'Monolithic 1-Piece'})
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
                              <span>Export Synthesized Port STL/STEP</span>
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
                                ? `Turbulence chuffing risk (min Ø${results.recommendedMinimumPortDiameterMm}mm).`
                                : results.portAirVelocityMs > 13
                                ? 'Moderate air velocity.'
                                : 'Silent laminar flow.'}
                            </div>
                          </div>
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
              </div>
            )}
          </div>

          {/* SUB-ACCORDION GROUP 3: ELECTROACOUSTIC PHYSICS & DAMPING */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden shadow-sm">
              <button
                onClick={() => setSubAccordionOpen((p) => ({ ...p, group3: !p.group3 }))}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0a0d14] hover:bg-[#0f131d] border-b border-slate-800/80 transition cursor-pointer text-left select-none"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                      <span>3. Electroacoustic Physics & Damping</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Chamber absorption material, standing wave eigenmodes & deflector advisor
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-700/80 text-indigo-300">
                    {acoustics.absorptionMaterialType
                      ? DAMPING_MATERIAL_SPECS[acoustics.absorptionMaterialType]?.name || acoustics.absorptionMaterialType
                      : 'Damping Advisor'}{' '}
                    ({acoustics.dampingFillPercent ?? 50}% fill)
                  </span>
                  {subAccordionOpen.group3 ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {subAccordionOpen.group3 && (
                <div className="p-3.5 space-y-3.5 bg-slate-950/50">
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
                        <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold rounded bg-indigo-950/80 border border-indigo-700/70 text-indigo-300">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>
                            {acoustics.dampingFillPercent === results.dampingAdvisor.recommendedFillPercent &&
                            acoustics.absorptionMaterialType === results.dampingAdvisor.recommendedMaterial
                              ? 'Advisor Optimal'
                              : `Target: ${results.dampingAdvisor.recommendedFillPercent}% Fill`}
                          </span>
                        </span>
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

                {/* CARD: INTERNAL STANDING WAVE ANALYSIS & REFLECTOR ADVISOR (Master Engineer Mode) */}
                {complexityMode === 'master' && results.standingWaves && (
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

                {/* CARD: PROCEDURAL SCHROEDER QRD 1D & SKYLINE 2D DIFFUSER ENGINE */}
                {results.diffuserReport && (
                  <div
                    id="section-procedural-diffuser"
                    className={`bg-slate-950/70 border p-3 rounded-lg space-y-3 font-mono transition-all ${
                      focusedSectionId === 'section-procedural-diffuser'
                        ? 'border-indigo-400 ring-1 ring-indigo-500/50'
                        : 'border-indigo-800/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
                          <Waves className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                              Schroeder QRD / Skyline Diffuser
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                results.diffuserReport.enabled
                                  ? 'bg-indigo-950 text-indigo-300 border-indigo-600/80'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {results.diffuserReport.enabled ? 'ACTIVE' : 'BYPASSED'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            ISO 17497 Number-Theoretic Back-Wave Scattering ({results.diffuserReport.typeLabel})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextEnabled = !results.diffuserReport?.enabled;
                          const nextCfg = {
                            enabled: nextEnabled,
                            type: acoustics.diffuserConfig?.type || 'qrd_1d',
                            targetWall: acoustics.diffuserConfig?.targetWall || 'rear',
                            primeN: acoustics.diffuserConfig?.primeN || 13,
                            designFreqHz:
                              acoustics.diffuserConfig?.designFreqHz ||
                              results.standingWaves.axialDepthHz ||
                              1200,
                            wellWidthMm: acoustics.diffuserConfig?.wellWidthMm || 22,
                            finThicknessMm: acoustics.diffuserConfig?.finThicknessMm || 2.5,
                            materialType: acoustics.diffuserConfig?.materialType || 'petg_cf',
                          };
                          setAcoustics((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                          setDimensions((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                          results.diffuserReport.enabled
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-indigo-700/70'
                        }`}
                      >
                        {results.diffuserReport.enabled ? 'Disable Diffuser' : 'Enable QRD Array'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-400 block mb-1">Topology</label>
                        <select
                          value={results.diffuserReport.type}
                          onChange={(e) => {
                            const nextType = e.target.value as 'qrd_1d' | 'skyline_2d';
                            const nextCfg = {
                              enabled: results.diffuserReport?.enabled ?? true,
                              type: nextType,
                              targetWall: results.diffuserReport?.targetWall || 'rear',
                              primeN: results.diffuserReport?.primeN || 13,
                              designFreqHz: results.diffuserReport?.designFreqHz || 1200,
                              wellWidthMm: results.diffuserReport?.wellWidthMm || 22,
                              finThicknessMm: results.diffuserReport?.finThicknessMm || 2.5,
                              materialType: acoustics.diffuserConfig?.materialType || 'petg_cf',
                            };
                            setAcoustics((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                            setDimensions((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="qrd_1d">1D Schroeder QRD</option>
                          <option value="skyline_2d">2D Skyline Primitive</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Schroeder Prime (N)</label>
                        <select
                          value={results.diffuserReport.primeN}
                          onChange={(e) => {
                            const nextPrime = Number(e.target.value) as 7 | 11 | 13 | 17 | 19 | 23;
                            const nextCfg = {
                              enabled: results.diffuserReport?.enabled ?? true,
                              type: results.diffuserReport?.type || 'qrd_1d',
                              targetWall: results.diffuserReport?.targetWall || 'rear',
                              primeN: nextPrime,
                              designFreqHz: results.diffuserReport?.designFreqHz || 1200,
                              wellWidthMm: results.diffuserReport?.wellWidthMm || 22,
                              finThicknessMm: results.diffuserReport?.finThicknessMm || 2.5,
                              materialType: acoustics.diffuserConfig?.materialType || 'petg_cf',
                            };
                            setAcoustics((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                            setDimensions((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          {[7, 11, 13, 17, 19, 23].map((p) => (
                            <option key={p} value={p}>
                              Prime N = {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Target Wall</label>
                        <select
                          value={results.diffuserReport.targetWall}
                          onChange={(e) => {
                            const nextWall = e.target.value as 'rear' | 'sides' | 'top_bottom' | 'all';
                            const nextCfg = {
                              enabled: results.diffuserReport?.enabled ?? true,
                              type: results.diffuserReport?.type || 'qrd_1d',
                              targetWall: nextWall,
                              primeN: results.diffuserReport?.primeN || 13,
                              designFreqHz: results.diffuserReport?.designFreqHz || 1200,
                              wellWidthMm: results.diffuserReport?.wellWidthMm || 22,
                              finThicknessMm: results.diffuserReport?.finThicknessMm || 2.5,
                              materialType: acoustics.diffuserConfig?.materialType || 'petg_cf',
                            };
                            setAcoustics((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                            setDimensions((prev) => ({ ...prev, diffuserConfig: nextCfg }));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="rear">Rear Wall Only</option>
                          <option value="sides">Side Walls (2x)</option>
                          <option value="top_bottom">Top &amp; Bottom (2x)</option>
                          <option value="all">Full 5-Wall Array</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block">Bandwidth</span>
                        <span className="text-indigo-300 font-bold">
                          {results.diffuserReport.lowCutoffFreqHz}–{results.diffuserReport.highCutoffFreqHz} Hz
                        </span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block">Max Well d</span>
                        <span className="text-cyan-300 font-bold">
                          {results.diffuserReport.maxWellDepthMm} mm
                        </span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block">Scattering s</span>
                        <span className="text-emerald-300 font-bold">
                          {results.diffuserReport.scatteringCoefficientMid.toFixed(2)} (
                          {results.diffuserReport.primaryAttenuationDb} dB)
                        </span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block">Displaced Vb</span>
                        <span className="text-amber-300 font-bold">
                          {results.diffuserReport.displacedVolumeLiters} L
                        </span>
                      </div>
                    </div>

                    {/* Visual Schroeder Well-Depth Sequence Preview */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Schroeder Sequence s_n = n² mod {results.diffuserReport.primeN}</span>
                        <span>Clearance to Magnet: {results.diffuserReport.clearanceToDriverMagnetMm} mm</span>
                      </div>
                      <div className="flex items-end gap-1 h-10 pt-1">
                        {results.diffuserReport.wellDepthsMm.map((dMm, idx) => {
                          const pct = Math.max(
                            12,
                            Math.round((dMm / Math.max(1, results.diffuserReport!.maxWellDepthMm)) * 100)
                          );
                          return (
                            <div
                              key={idx}
                              className="flex-1 bg-indigo-500/70 hover:bg-indigo-400 rounded-t transition-all"
                              style={{ height: `${pct}%` }}
                              title={`Well #${idx}: ${dMm} mm depth`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD: INTEGRAL 3D-PRINTED ACOUSTIC DAMPENING & TPMS MATRIX ENGINE */}
                {results.additiveAcousticReport && (
                  <div
                    id="section-tpms-matrix"
                    className={`bg-slate-950/70 border p-3 rounded-lg space-y-3 font-mono transition-all ${
                      focusedSectionId === 'section-tpms-matrix'
                        ? 'border-cyan-400 ring-1 ring-cyan-500/50'
                        : 'border-cyan-800/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                              Integral 3D-Printed Acoustic Matrix
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                results.additiveAcousticReport.enabled
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-600/80'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {results.additiveAcousticReport.enabled ? 'Active • Foam-Free AM' : 'Disabled'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans block">
                            TPMS Minimal Surface Lattice & Tortuous Labyrinth Back-Wave Trap
                          </span>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                          const nextEnabled = !currentCfg.enabled;
                          const updated = { ...currentCfg, enabled: nextEnabled };
                          setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                          setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                          results.additiveAcousticReport.enabled
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                        }`}
                      >
                        {results.additiveAcousticReport.enabled ? 'Matrix Enabled' : 'Enable Matrix'}
                      </button>
                    </div>

                    {results.additiveAcousticReport.enabled && (
                      <div className="space-y-3 pt-1">
                        {/* Selector 1: TPMS Minimal Surface Architecture */}
                        <div>
                          <label className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
                            TPMS Infill Architecture (Zero-Mean Curvature)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {(['gyroid_minimal', 'schwarz_diamond', 'schwarz_primitive', 'neovius'] as TpmsLatticeType[]).map((latKey) => {
                              const latSpec = TPMS_LATTICE_LABELS[latKey];
                              const isSelected = (acoustics.integralMatrixConfig?.latticeType || DEFAULT_INTEGRAL_MATRIX_CONFIG.latticeType) === latKey;
                              return (
                                <button
                                  key={latKey}
                                  type="button"
                                  onClick={() => {
                                    const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                                    const updated = { ...currentCfg, latticeType: latKey };
                                    setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                    setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                  }}
                                  className={`p-2 rounded text-left border transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-sm'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="font-bold flex items-center justify-between">
                                    <span>{latSpec.name}</span>
                                    {isSelected && <span className="text-[9px] text-cyan-400">● ACTIVE</span>}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono mt-0.5 opacity-90 truncate">
                                    {latSpec.formula}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selector 2: Acoustic Trap Geometry */}
                        <div>
                          <label className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1.5">
                            Rear Diaphragm Acoustic Trap Topology
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            {(['tortuous_labyrinth', 'quarter_wave_baffles', 'micro_perforated_wedge'] as AcousticTrapGeometry[]).map((trapKey) => {
                              const trapSpec = ACOUSTIC_TRAP_LABELS[trapKey];
                              const isSelected = (acoustics.integralMatrixConfig?.trapGeometry || DEFAULT_INTEGRAL_MATRIX_CONFIG.trapGeometry) === trapKey;
                              return (
                                <button
                                  key={trapKey}
                                  type="button"
                                  onClick={() => {
                                    const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                                    const updated = { ...currentCfg, trapGeometry: trapKey };
                                    setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                    setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                  }}
                                  className={`p-2 rounded text-left border transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-sm'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="font-bold flex items-center justify-between">
                                    <span className="truncate">{trapSpec.name}</span>
                                    {isSelected && <span className="text-[9px] text-indigo-400 shrink-0">●</span>}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-sans mt-0.5 line-clamp-2">
                                    {trapSpec.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sliders: Cell Size, Infill Density, Trap Depth */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                              <span>Cell Pitch (λ):</span>
                              <span className="text-cyan-400 font-bold">
                                {acoustics.integralMatrixConfig?.unitCellSizeMm || DEFAULT_INTEGRAL_MATRIX_CONFIG.unitCellSizeMm} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min={6}
                              max={18}
                              step={1}
                              value={acoustics.integralMatrixConfig?.unitCellSizeMm || DEFAULT_INTEGRAL_MATRIX_CONFIG.unitCellSizeMm}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                                const updated = { ...currentCfg, unitCellSizeMm: val };
                                setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                              }}
                              className="w-full accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 block mt-0.5">Viscous pore sizing</span>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                              <span>Relative Density:</span>
                              <span className="text-cyan-400 font-bold">
                                {acoustics.integralMatrixConfig?.relativeDensityPercent || DEFAULT_INTEGRAL_MATRIX_CONFIG.relativeDensityPercent}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={55}
                              step={2}
                              value={acoustics.integralMatrixConfig?.relativeDensityPercent || DEFAULT_INTEGRAL_MATRIX_CONFIG.relativeDensityPercent}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                                const updated = { ...currentCfg, relativeDensityPercent: val };
                                setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                              }}
                              className="w-full accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 block mt-0.5">Shear core volume fraction</span>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                              <span>Trap Depth:</span>
                              <span className="text-cyan-400 font-bold">
                                {acoustics.integralMatrixConfig?.rearTrapDepthMm || DEFAULT_INTEGRAL_MATRIX_CONFIG.rearTrapDepthMm} mm
                              </span>
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={65}
                              step={5}
                              value={acoustics.integralMatrixConfig?.rearTrapDepthMm || DEFAULT_INTEGRAL_MATRIX_CONFIG.rearTrapDepthMm}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const currentCfg = acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
                                const updated = { ...currentCfg, rearTrapDepthMm: val };
                                setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
                                setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
                              }}
                              className="w-full accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 block mt-0.5">Labyrinth acoustic depth</span>
                          </div>
                        </div>

                        {/* Real-Time Additive Acoustic & Structural Telemetry Matrix */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">FLOW RESISTIVITY (σ)</span>
                            <span className="text-cyan-300 font-bold text-xs">{results.additiveAcousticReport.jca.flowResistivityRaylsM} Rayls/m</span>
                            <span className="text-slate-500 text-[9px] block">JCA Porous Model</span>
                          </div>

                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">BACK-WAVE LOSS</span>
                            <span className="text-emerald-300 font-bold text-xs">{results.additiveAcousticReport.backWaveAttenuationDb} dB</span>
                            <span className="text-slate-500 text-[9px] block">Cone Smear Cut</span>
                          </div>

                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">FLEXURAL STIFFNESS (EI)</span>
                            <span className="text-amber-300 font-bold text-xs">+{Math.round((results.additiveAcousticReport.stiffnessGainFactor - 1) * 100)}% ({results.additiveAcousticReport.stiffnessGainFactor}x)</span>
                            <span className="text-slate-500 text-[9px] block">Sandwich Shear Core</span>
                          </div>

                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">OVERHANG COMPLIANCE</span>
                            <span className="text-cyan-300 font-bold text-xs">≤ {results.additiveAcousticReport.maxMeasuredOverhangDeg}°</span>
                            <span className="text-emerald-400 text-[9px] block">Self-Supporting (0 Support)</span>
                          </div>
                        </div>

                        {/* Engineering Advisories List (Master Engineer Mode) */}
                        {complexityMode === 'master' && (
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                            <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Additive Manufacturing & Acoustic Validation</span>
                            </div>
                            <ul className="space-y-0.5 text-[10px] text-slate-300 font-sans pl-4 list-disc">
                              {results.additiveAcousticReport.engineeringAdvisories.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* TAB 2: MULTI-DRIVER TOPOLOGY */}
            {activeTab === 'topology' && (
              <div className="space-y-4">
                <div
                  id="section-topology-drivers"
                  className={`bg-slate-950/70 border p-3 rounded-lg transition-all ${
                    focusedSectionId === 'section-topology-drivers'
                      ? 'border-purple-400 ring-1 ring-purple-500/50'
                      : 'border-slate-800'
                  }`}
                >
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

                {/* SUBCATEGORY ARCHITECTURAL TUNING & CHAMBER INTEGRATION */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3 font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-950/80 border border-purple-700/60 text-purple-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                          {activeSubcatConfig.name} Architecture
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Chamber layout, transducer wiring, and module specifications
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800">
                      {activeSubcatConfig.shortName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    {/* Panel 1: Transducer Loading */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-amber-400 font-bold uppercase text-[11px] flex items-center justify-between">
                        <span>Acoustic Loading</span>
                        <span className="text-slate-400 text-[10px]">
                          {activeSubcatConfig.defaultAlignment.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Vb:</span>
                          <span className="font-bold text-slate-200">~{activeSubcatConfig.targetVbLiters} Liters</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tuning Fb:</span>
                          <span className="font-bold text-cyan-300">{activeSubcatConfig.targetFbHz} Hz</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Qtc:</span>
                          <span className="font-bold text-slate-200">{activeSubcatConfig.targetQtc}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Woofer Complement:</span>
                          <span className="font-bold text-amber-300">
                            {activeSubcatConfig.wooferQuantity === 2
                              ? 'Twin 2× Woofers (Parallel 4Ω)'
                              : 'Single 1× Woofer'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Panel 2: Specialized Hardware & Enclosure Features */}
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-cyan-400 font-bold uppercase text-[11px] flex items-center justify-between">
                        <span>Hardware & Integration</span>
                        <span className="text-slate-400 text-[10px]">Specification</span>
                      </div>
                      <div className="space-y-1 text-slate-300">
                        {activeSubcatConfig.hasPlateAmplifier && activeSubcatConfig.commercialPlateAmp ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Plate Amplifier:</span>
                              <span className="font-bold text-emerald-300">
                                {activeSubcatConfig.commercialPlateAmp.manufacturer} {activeSubcatConfig.commercialPlateAmp.modelName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Continuous Power:</span>
                              <span className="font-bold text-slate-200">
                                {activeSubcatConfig.commercialPlateAmp.powerRmsW} W RMS
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Chassis Displacement:</span>
                              <span className="font-bold text-amber-300">
                                -{activeSubcatConfig.commercialPlateAmp.displacementLiters} L
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Connectors:</span>
                              <span className="font-bold text-slate-200">
                                {activeSubcatConfig.commercialPlateAmp.ioTypes.join(', ')}
                              </span>
                            </div>
                          </>
                        ) : activeSubcatConfig.isBandpass ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Enclosure Type:</span>
                              <span className="font-bold text-purple-300">4th-Order Bandpass Hybrid</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Front Chamber:</span>
                              <span className="font-bold text-cyan-300">{activeSubcatConfig.bandpassFrontVbLiters || 80} L (Vented)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Rear Chamber:</span>
                              <span className="font-bold text-amber-300">{activeSubcatConfig.bandpassRearVbLiters || 150} L (Sealed)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Chamber Split Ratio:</span>
                              <span className="font-bold text-slate-200">
                                {(((activeSubcatConfig.bandpassFrontVbLiters || 80) / ((activeSubcatConfig.bandpassFrontVbLiters || 80) + (activeSubcatConfig.bandpassRearVbLiters || 150))) * 100).toFixed(0)}% / {(((activeSubcatConfig.bandpassRearVbLiters || 150) / ((activeSubcatConfig.bandpassFrontVbLiters || 80) + (activeSubcatConfig.bandpassRearVbLiters || 150))) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </>
                        ) : activeSubcatConfig.isCoaxial ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Transducer Geometry:</span>
                              <span className="font-bold text-cyan-300">Concentric Coaxial</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">HF Waveguide:</span>
                              <span className="font-bold text-slate-200">In-Dustcap Throat</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Polar Dispersion:</span>
                              <span className="font-bold text-emerald-300">90° × 90° Symmetrical</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Acoustic Delay:</span>
                              <span className="font-bold text-slate-200">0.0 ms (Time Coincident)</span>
                            </div>
                          </>
                        ) : activeSubcatConfig.hasMidrangeChamber ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Midrange Chamber:</span>
                              <span className="font-bold text-purple-300">Isolated Sealed Box</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sub-Chamber Vol:</span>
                              <span className="font-bold text-cyan-300">~{results.midrangeChamberVolumeLiters} L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Back-Wave Coupling:</span>
                              <span className="font-bold text-emerald-300">Zero (Full Isolation)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Mid Crossover HP:</span>
                              <span className="font-bold text-slate-200">{acoustics.crossoverLowHz || 450} Hz</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Enclosure Style:</span>
                              <span className="font-bold text-slate-200">Precision Passive</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Default Material:</span>
                              <span className="font-bold text-cyan-300">{activeCategorySpec.recommendedMaterial.replace(/_/g, ' ').toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Finish Preset:</span>
                              <span className="font-bold text-slate-200">{activeCategorySpec.recommendedSurfaceFinish.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Rigging & Feet:</span>
                              <span className="font-bold text-amber-300">CAD Hardware Configured</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* REAR-PANEL TERMINAL & WIRING ENGINE (STRICT STUDIO VS LIVE PA ENFORCEMENT) */}
                {results.speakonReport && (
                  <div
                    id="section-rear-terminals"
                    className={`bg-slate-950/85 border rounded-xl p-3.5 shadow-sm space-y-3 font-mono transition-all ${
                      focusedSectionId === 'section-rear-terminals'
                        ? 'border-cyan-400 ring-1 ring-cyan-500/50'
                        : 'border-cyan-800/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded border ${
                            results.speakonReport.terminalCategory === 'touring_pa_speakon'
                              ? 'bg-cyan-950/90 border-cyan-700/70 text-cyan-400'
                              : results.speakonReport.terminalCategory === 'studio_active_plate'
                              ? 'bg-purple-950/90 border-purple-700/70 text-purple-400'
                              : 'bg-amber-950/90 border-amber-700/70 text-amber-400'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                            <span>
                              {results.speakonReport.terminalCategory === 'touring_pa_speakon'
                                ? 'Neutrik speakON (NL4 / NL8) Touring I/O Engine'
                                : results.speakonReport.terminalCategory === 'studio_active_plate'
                                ? 'Studio Active Reference I/O Engine (XLR / TRS Plate)'
                                : 'Studio Passive Monitor I/O Engine (Gold Binding Posts)'}
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 font-sans">
                            {results.speakonReport.wiringArchitectureLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            results.speakonReport.terminalCategory === 'touring_pa_speakon'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                              : results.speakonReport.terminalCategory === 'studio_active_plate'
                              ? 'bg-purple-950 text-purple-300 border-purple-700'
                              : 'bg-amber-950 text-amber-300 border-amber-700'
                          }`}
                        >
                          {results.speakonReport.partNumber} ({results.speakonReport.poleCount}-Pole)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            results.speakonReport.overallClashStatus === 'clash'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : results.speakonReport.overallClashStatus === 'caution'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {results.speakonReport.overallClashStatus === 'clear'
                            ? `Clearance OK (${results.speakonReport.minInternalClearanceMm}mm)`
                            : `Clash Alert (${results.speakonReport.minInternalClearanceMm}mm)`}
                        </span>
                      </div>
                    </div>

                    {/* PROHIBITED HARDWARE ADVISORY BANNER (If invalid terminal detected) */}
                    {results.speakonReport.isProhibitedConfiguration && (
                      <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-200 text-xs space-y-2">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-bold uppercase tracking-wider text-rose-300 text-[11px]">
                              Prohibited Terminal Configuration Detected
                            </div>
                            <p className="text-[11px] text-rose-100 font-sans leading-relaxed">
                              {results.speakonReport.prohibitionWarningText}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1 border-t border-rose-800/60">
                          <span className="px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-200 font-mono text-[10px]">
                            Recommended standard:{' '}
                            {results.speakonReport.recommendedResolutionModel === 'binding_posts_gold'
                              ? 'Gold 5-Way Binding Posts'
                              : results.speakonReport.recommendedResolutionModel === 'active_plate_xlr'
                              ? 'Active XLR/TRS Plate'
                              : 'Neutrik speakON NL4'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Connector Selection & Architecture Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-400 uppercase">
                            Connector Hardware Model
                          </label>
                          <span className="text-[9px] text-slate-500">
                            {activeCategory.startsWith('studio') ? 'Studio Enforced' : 'PA Enforced'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(activeCategory === 'studio_monitor' || activeCategory === 'studio_sub'
                            ? [
                                ['auto', 'Auto-Detect'],
                                ['binding_posts_gold', 'Gold 5-Way'],
                                ['active_plate_xlr', 'XLR / TRS Plate'],
                              ]
                            : [
                                ['auto', 'Auto'],
                                ['nl4mp', 'NL4MP'],
                                ['nlt4mp', 'NLT4MP'],
                                ['nl8mpr', 'NL8MPR'],
                              ]
                          ).map(([modeKey, label]) => {
                            const currentMode = dimensions.speakonConfig?.selectionMode || 'auto';
                            const isSelected = currentMode === modeKey;
                            return (
                              <button
                                key={modeKey}
                                onClick={() =>
                                  setDimensions((prev) => ({
                                    ...prev,
                                    speakonConfig: {
                                      ...(prev.speakonConfig || {}),
                                      selectionMode: modeKey as SpeakonSelectionMode,
                                    },
                                  }))
                                }
                                className={`py-1 px-1.5 rounded border text-[10px] transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-600 text-white font-bold border-cyan-400 shadow-xs'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">
                          Signal Routing Architecture
                        </label>
                        <select
                          value={dimensions.speakonConfig?.wiringArchitecture || 'auto'}
                          onChange={(e) =>
                            setDimensions((prev) => ({
                              ...prev,
                              speakonConfig: {
                                ...(prev.speakonConfig || {}),
                                wiringArchitecture: e.target.value as SpeakonWiringArchitecture,
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                        >
                          <option value="auto">Auto-Detect from System Topology</option>
                          {activeCategory.startsWith('studio') ? (
                            <>
                              <option value="passive_fullrange">1-Ch Passive Studio Reference (Bi-Wire Cup)</option>
                              <option value="bi_amp_2way">2-Ch Active Bi-Amplified Studio (XLR / TRS)</option>
                            </>
                          ) : (
                            <>
                              <option value="passive_fullrange">1-Ch Passive Full-Range (NL4 1+/1-)</option>
                              <option value="bi_amp_2way">2-Ch Active Bi-Amp Split (NL4 1+/1- LF, 2+/2- HF)</option>
                              <option value="sub_top_pass">2-Ch Subwoofer + Top Pass-Thru (NL4)</option>
                              <option value="tri_amp_3way">3-Ch Active Tri-Amp (NL8 Mandatory)</option>
                              <option value="quad_amp_array">4-Ch Touring Line Array / Hybrid (NL8 Mandatory)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="flex flex-col justify-between bg-slate-900/70 p-2 rounded border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {activeCategory.startsWith('studio') ? 'Bi-Wire Jumpers / Thru:' : 'Parallel Link/Thru:'}
                          </span>
                          <input
                            type="checkbox"
                            checked={dimensions.speakonConfig?.dualLinkThru ?? true}
                            onChange={(e) =>
                              setDimensions((prev) => ({
                                ...prev,
                                speakonConfig: {
                                  ...(prev.speakonConfig || {}),
                                  dualLinkThru: e.target.checked,
                                },
                              }))
                            }
                            className="accent-cyan-400 rounded cursor-pointer"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Cutout: <strong className="text-cyan-300">Ø{results.speakonReport.cutoutBoreDiameterMm}mm</strong> • {results.speakonReport.flangeType}
                        </div>
                      </div>
                    </div>

                    {/* Warning Banner if 4-pole forced on >4 conductor architecture */}
                    {results.speakonReport.hasChannelCapacityWarning && (
                      <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-[11px] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{results.speakonReport.channelCapacityWarningText}</span>
                      </div>
                    )}

                    {/* Standard Pinout / Terminal Polarity Mapping Table (Master Engineer Mode) */}
                    {complexityMode === 'master' ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                            <tr>
                              <th className="py-1.5 px-2.5">Terminal / Pin</th>
                              <th className="py-1.5 px-2.5">Signal Role &amp; Passband</th>
                              <th className="py-1.5 px-2.5">Harness AWG &amp; Polarity</th>
                              <th className="py-1.5 px-2.5">Load</th>
                              <th className="py-1.5 px-2.5">IPC-D-356 Net</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70 bg-slate-950/60">
                            {results.speakonReport.pinAssignments.map((pin) => (
                              <tr key={pin.pinPair} className={pin.isActivePath ? 'text-slate-200' : 'text-slate-500'}>
                                <td className="py-1.5 px-2.5 font-bold text-cyan-300">{pin.pinPair}</td>
                                <td className="py-1.5 px-2.5">
                                  <div className="font-semibold">{pin.signalRole}</div>
                                  <div className="text-[10px] text-slate-400">{pin.targetBand}</div>
                                </td>
                                <td className="py-1.5 px-2.5 text-[10px]">
                                  <span className="text-amber-300 font-bold">{pin.wireGaugeAwg}</span> • {pin.wireColorPositive} / {pin.wireColorNegative}
                                </td>
                                <td className="py-1.5 px-2.5 font-bold">{pin.nominalImpedanceOhm}</td>
                                <td className="py-1.5 px-2.5 text-[10px] text-emerald-400 font-mono">
                                  {pin.ipcNetNamePositive}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      onToggleComplexityMode && (
                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-sans">
                            IPC-D-356 pinout netlist &amp; wire gauge schedule hidden in Essentials Mode.
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleComplexityMode('master')}
                            className="px-2 py-0.5 rounded bg-slate-950 border border-amber-600/60 text-amber-300 font-bold cursor-pointer"
                          >
                            Show Pinout Table →
                          </button>
                        </div>
                      )
                    )}

                    {/* Rear Panel CAD Clearance & BOM Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                      <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                          Rear Panel Spatial Clash Checks
                        </div>
                        {results.speakonReport.clashChecks.map((chk, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-300 truncate">{chk.targetComponent}:</span>
                            <span
                              className={`font-bold ${
                                chk.status === 'clash'
                                  ? 'text-rose-400'
                                  : chk.status === 'caution'
                                  ? 'text-amber-300'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {chk.clearanceMm} mm ({chk.status.toUpperCase()})
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                          <span>
                            {results.speakonReport.terminalCategory === 'touring_pa_speakon'
                              ? 'SpeakON Hardware & Crimp BOM'
                              : results.speakonReport.terminalCategory === 'studio_active_plate'
                              ? 'Active Plate & Audio Harness BOM'
                              : 'Gold Binding Post Cup BOM'}
                          </span>
                          <span className="text-emerald-400">${results.speakonReport.totalHardwareCostUsd.toFixed(2)} Total</span>
                        </div>
                        {results.speakonReport.bomItems.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-300 truncate">
                              {item.quantity}× {item.partNumber}
                            </span>
                            <span className="text-slate-400">${item.totalCostUsd.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CABINET DIMENSIONS, MATERIAL DENSITY & COST CALCULATOR */}
            {activeTab === 'dimensions' && (
              <div className="space-y-3.5">
                {/* External Bounding Dimensions */}
                <div
                  id="section-cabinet-dimensions"
                  className={`grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl transition-all ${
                    focusedSectionId === 'section-cabinet-dimensions'
                      ? 'ring-2 ring-cyan-500/60 p-1'
                      : ''
                  }`}
                >
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
                <div
                  id="section-material-library"
                  className={`bg-slate-950/70 border p-3.5 rounded-lg space-y-3 font-mono transition-all ${
                    focusedSectionId === 'section-material-library'
                      ? 'border-amber-400 ring-1 ring-amber-500/50'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                        Material Specification & Fabrication Engine
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
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

                      {onToggleVibrationAnalysis && (
                        <button
                          onClick={onToggleVibrationAnalysis}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${
                            isVibrationAnalysisVisible
                              ? 'bg-violet-950 border border-violet-600 text-violet-300 font-bold shadow-xs'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Toggle Enclosure Panel Vibration Stress (FEA) Overlay in 3D"
                        >
                          <Activity className="w-3.5 h-3.5 text-violet-400" />
                          <span className="hidden sm:inline">FEA:</span>
                          <span>{isVibrationAnalysisVisible ? 'ON' : 'OFF'}</span>
                        </button>
                      )}
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

                {/* ARCHETYPE 3D HARDWARE & RIGGING CUSTOMIZATION */}
                <div
                  id="section-hardware-rigging"
                  className={`bg-slate-950/80 border rounded-xl p-3.5 shadow-sm space-y-3 font-sans transition-all ${
                    focusedSectionId === 'section-hardware-rigging'
                      ? 'border-amber-400 ring-1 ring-amber-500/50'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-900 border border-slate-700 text-amber-400">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                          Archetype Hardware & Rigging
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Handles, pole cups, corner guards, and acoustic isolation feet for 3D CAD
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Preset: {activeCategorySpec.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                    {/* Handles */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span>Recessed Side Handles</span>
                          {activeCategorySpec.defaultHardware.showHandles && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                          Ergonomic tour-grade carry dish & solid steel grab rod
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeHardware.showHandles}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            hardware: { ...activeHardware, showHandles: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    {/* 35mm Pole Mount */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span>35mm Stand / Pole Socket</span>
                          {activeCategorySpec.defaultHardware.showPoleMount && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                          Bottom zinc-alloy cup with locking clamp thumb screw
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeHardware.showPoleMount}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            hardware: { ...activeHardware, showPoleMount: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    {/* Corner Protectors */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span>Steel Ball Corner Guards</span>
                          {activeCategorySpec.defaultHardware.showCornerProtectors && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                          8x heavy-duty 3-way protective steel ball brackets
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeHardware.showCornerProtectors}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            hardware: { ...activeHardware, showCornerProtectors: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    {/* Isolation Feet */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span>Decoupling Isolation Feet</span>
                          {activeCategorySpec.defaultHardware.showIsolationFeet && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                          4x Sorbothane rubber pads with aluminum collar
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeHardware.showIsolationFeet}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            hardware: { ...activeHardware, showIsolationFeet: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    {/* Parametric Rear Thermal Ventilation Slots (Driver Pe Scaled) */}
                    <label className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-orange-900/60 hover:border-orange-600/70 transition cursor-pointer">
                      <div className="flex flex-col pr-2">
                        <span className="text-slate-100 font-semibold flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>Parametric Rear Thermal Ventilation Slots (Driver Pe Scaled)</span>
                          {results.thermalVentReport && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-950 text-orange-300 border border-orange-800 font-bold">
                              {results.thermalVentReport.slotCount}× Slots • {results.thermalVentReport.driverContinuousPowerW}W RMS
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {results.thermalVentReport
                            ? `${results.thermalVentReport.powerTierLabel} — CNC stadium louvers (${results.thermalVentReport.slotWidthMm}×${results.thermalVentReport.slotHeightMm}mm, ${results.thermalVentReport.totalNetFreeAreaCm2} cm² free area, -${results.thermalVentReport.voiceCoilTempDropC}°C voice-coil cooling)`
                            : 'CNC rear-panel convective intake/exhaust slots scaled to driver RMS power rating'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(
                          dimensions.thermalVentConfig?.enabled !== undefined
                            ? dimensions.thermalVentConfig.enabled
                            : activeHardware.showThermalVentSlots
                        )}
                        onChange={(e) =>
                          setDimensions((prev) => ({
                            ...prev,
                            hardware: { ...activeHardware, showThermalVentSlots: e.target.checked },
                            thermalVentConfig: {
                              ...(prev.thermalVentConfig || {}),
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-orange-400 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  </div>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
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

                      {onToggleVibrationAnalysis && (
                        <button
                          onClick={onToggleVibrationAnalysis}
                          className={`py-1.5 px-2 rounded text-center transition ${
                            isVibrationAnalysisVisible
                              ? 'bg-violet-600 text-white font-semibold shadow-xs'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Vibration FEA
                        </button>
                      )}
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
