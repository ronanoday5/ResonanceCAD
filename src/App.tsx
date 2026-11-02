import React, { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticParameters,
  type CaliberDeltaEvent,
  type CameraPreset,
  type CoOptimizationConfig,
  type DriverPreset,
  type EnclosureDimensions,
  type MaterialType,
  type ParametricPortProfileType,
  type SpeakerCategory,
  type SpeakerSubcategory,
} from './types/loudspeaker.ts';
import {
  calculateAcoustics,
  calculateOptimalAlignment,
  DEFAULT_PROCEDURAL_DIFFUSER_CONFIG,
  DRIVER_PRESETS,
  getDriversForSubcategory,
  MATERIAL_SPECS,
} from './services/acousticEngine.ts';
import { generateCutList } from './services/cutlistGenerator.ts';
import { autoResolveBaffleClashes } from './services/baffleLayoutEngine.ts';
import { flushIncompatibleTerminalConfig } from './services/speakonEngine.ts';
import {
  getActiveProjectId,
  getProjects,
  setActiveProjectId,
  type ProjectRecord,
} from './services/projectStore.ts';
import { AcousticCADViewer } from './components/AcousticCADViewer.tsx';
import { TopHeader, type PrimaryWorkspaceTab } from './components/TopHeader.tsx';
import { RightPropertyInspector, type InspectorTab } from './components/RightPropertyInspector.tsx';
import { PartInspectorModal } from './components/PartInspectorModal.tsx';
import { CutListSheet } from './components/CutListSheet.tsx';
import { FrequencyResponseChart } from './components/FrequencyResponseChart.tsx';
import { CustomDriverModal } from './components/CustomDriverModal.tsx';
import { CrossoverDesigner } from './components/CrossoverDesigner.tsx';
import { CadExportModal } from './components/CadExportModal.tsx';
import { ProjectManagerSidebar } from './components/ProjectManagerSidebar.tsx';
import { SpeakerSetupWizard } from './components/SpeakerSetupWizard.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { LeftSidebarMenu } from './components/LeftSidebarMenu.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { UnitProvider } from './context/UnitContext.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CrossoverPcbWorkspace } from './components/CrossoverPcbWorkspace.tsx';
import { LineArrayDesignerModal } from './components/LineArrayDesignerModal.tsx';
import { TransducerSizingModal } from './components/TransducerSizingModal.tsx';
import { StructuralRiggingModal } from './components/StructuralRiggingModal.tsx';
import { LiveSimulationPanel } from './components/LiveSimulationPanel.tsx';
import { isPaStyleSpeaker } from './services/structuralRiggingEngine.ts';
import type { CadExportScope } from './services/cadExportEngine.ts';
import {
  resolvePartInspectionTarget,
  type ComplexityMode,
} from './services/contextActionEngine.ts';
import { DEFAULT_INTEGRAL_MATRIX_CONFIG } from './services/additiveAcousticEngine.ts';
import {
  computeFullMasterOptimizationPlan,
  DEFAULT_CO_OPTIMIZATION_CONFIG,
  runClosedLoopCoOptimization,
} from './services/coOptimizationEngine.ts';
import { Activity, Box, CheckCircle, Cpu, FileSpreadsheet, Layers, X } from 'lucide-react';

export default function App() {
  const [dimensions, setDimensionsState] = useState<EnclosureDimensions>({
    externalWidthMm: 274,
    externalHeightMm: 422,
    externalDepthMm: 332,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
    category: 'studio_monitor',
    subcategory: 'nearfield_2way',
    hardware: {
      ...CATEGORY_SPECS.studio_monitor.defaultHardware,
      showThermalVentSlots: true,
    },
    thermalVentConfig: {
      enabled: true,
      sizingMode: 'auto_driver_pe',
      pattern: 'convective_dual_bank',
      hasInternalHermeticHeatExchanger: true,
    },
  });

  const [acoustics, setAcousticsState] = useState<AcousticParameters>({
    topology: 'two_way',
    driverAssignments: {
      woofer: {
        role: 'woofer',
        driver: DRIVER_PRESETS[0],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 0,
      },
      tweeter: {
        role: 'tweeter',
        driver: DRIVER_PRESETS[4],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 2.5,
      },
      midrange: {
        role: 'midrange',
        driver: DRIVER_PRESETS[6],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 0,
      },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 41.3,
    portType: 'round',
    portPlacement: 'auto',
    portDiameterMm: 80,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    slotWidthMm: 230,
    slotHeightMm: 45,
    slotLipRadiusMm: 14,
    numberOfPorts: 1,
    dampingFillPercent: 35,
    absorptionMaterialType: 'pu_foam',
    bracingLevel: 'standard',
    braceApertureChamferDeg: 45,
    baffleEdgeRadiusMm: 22,
    materialPricing: {
      customDensityKgM3: 680,
      costPerSquareMeter: 68,
      wastePercentage: 15,
    },
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  });

  const [coOptConfig, setCoOptConfig] = useState<CoOptimizationConfig>(
    DEFAULT_CO_OPTIMIZATION_CONFIG
  );
  const [lastCaliberDelta, setLastCaliberDelta] = useState<CaliberDeltaEvent | null>(null);

  const latestDimsRef = React.useRef<EnclosureDimensions>(dimensions);
  latestDimsRef.current = dimensions;
  const latestAcousticsRef = React.useRef<AcousticParameters>(acoustics);
  latestAcousticsRef.current = acoustics;
  const coOptConfigRef = React.useRef<CoOptimizationConfig>(coOptConfig);
  coOptConfigRef.current = coOptConfig;

  // Synchronous batch refs so sequential setDimensions() + setAcoustics() in the same event tick compose cleanly
  const baselineSnapshotRef = React.useRef<{
    dims: EnclosureDimensions;
    acoustics: AcousticParameters;
  } | null>(null);
  const rawUserDimsRef = React.useRef<EnclosureDimensions>(dimensions);
  const rawUserAcousticsRef = React.useRef<AcousticParameters>(acoustics);

  const [explodedPercent, setExplodedPercent] = useState<number>(0);
  const [isXRayMode, setIsXRayMode] = useState<boolean>(false);
  const [isCutawayMode, setIsCutawayMode] = useState<boolean>(false);
  const [isWireframeMode, setIsWireframeMode] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isPartInspectorOpen, setIsPartInspectorOpen] = useState<boolean>(false);

  // Workstation Layout & Progressive Disclosure State
  const [activeWorkspace, setActiveWorkspace] = useState<PrimaryWorkspaceTab>('cad_3d');
  const [crossoverSubView, setCrossoverSubView] = useState<'pcb_stack' | 'schematic_dsp'>('pcb_stack');
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState<boolean>(false);
  const [isRightInspectorOpen, setIsRightInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('telemetry');
  const [activeWorkflowMode, setActiveWorkflowMode] = useState<'acoustic_design' | 'cabinet_cad' | 'inspection_fea'>('acoustic_design');
  const [complexityMode, setComplexityMode] = useState<ComplexityMode>('essentials');
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);

  // Modals State
  const [isResponseChartOpen, setIsResponseChartOpen] = useState<boolean>(false);
  const [isCustomDriverOpen, setIsCustomDriverOpen] = useState<boolean>(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeProjectId, setLocalActiveProjectId] = useState<string | null>(getActiveProjectId());

  const [isAirflowStressVisible, setIsAirflowStressVisible] = useState<boolean>(true);
  const [isVibrationAnalysisVisible, setIsVibrationAnalysisVisible] = useState<boolean>(false);

  const [isCadExportOpen, setIsCadExportOpen] = useState<boolean>(false);
  const [cadExportScope, setCadExportScope] = useState<CadExportScope>('woodwork_only');
  const [clashNotification, setClashNotification] = useState<string | null>(null);
  const [savedProjectsCount, setSavedProjectsCount] = useState<number>(() => getProjects().length);
  const notificationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelRootGetterRef = React.useRef<(() => THREE.Group | null) | null>(null);

  const showToast = useCallback((msg: string, durationMs = 5000) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setClashNotification(msg);
    notificationTimerRef.current = setTimeout(() => {
      setClashNotification(null);
      notificationTimerRef.current = null;
    }, durationMs);
  }, []);

  const commitCoOptimizedMutation = useCallback(
    (nextRawDims: EnclosureDimensions, nextRawAcoustics: AcousticParameters, label?: string) => {
      if (!baselineSnapshotRef.current) {
        baselineSnapshotRef.current = {
          dims: latestDimsRef.current,
          acoustics: latestAcousticsRef.current,
        };
        queueMicrotask(() => {
          baselineSnapshotRef.current = null;
        });
      }

      rawUserDimsRef.current = nextRawDims;
      rawUserAcousticsRef.current = nextRawAcoustics;

      const coOpt = runClosedLoopCoOptimization(
        baselineSnapshotRef.current.dims,
        baselineSnapshotRef.current.acoustics,
        rawUserDimsRef.current,
        rawUserAcousticsRef.current,
        coOptConfigRef.current,
        label
      );

      latestDimsRef.current = coOpt.dimensions;
      latestAcousticsRef.current = coOpt.acoustics;
      setDimensionsState(coOpt.dimensions);
      setAcousticsState(coOpt.acoustics);
      setLastCaliberDelta(coOpt.deltaEvent);

      if (coOpt.deltaEvent.coOptimizedActions.length > 0) {
        const sign = coOpt.deltaEvent.deltaScore >= 0 ? '+' : '';
        showToast(
          `Caliber ${coOpt.deltaEvent.currentScore.toFixed(1)}/100 (${sign}${coOpt.deltaEvent.deltaScore.toFixed(1)}) · ${coOpt.deltaEvent.coOptimizedActions.join(' • ')}`,
          4500
        );
      }
    },
    [showToast]
  );

  const setDimensions: React.Dispatch<React.SetStateAction<EnclosureDimensions>> = useCallback(
    (updater) => {
      const baseDims = baselineSnapshotRef.current ? rawUserDimsRef.current : latestDimsRef.current;
      const baseAcoustics = baselineSnapshotRef.current
        ? rawUserAcousticsRef.current
        : latestAcousticsRef.current;
      const resolvedNextDims = typeof updater === 'function' ? updater(baseDims) : updater;
      commitCoOptimizedMutation(resolvedNextDims, baseAcoustics, 'Enclosure Update');
    },
    [commitCoOptimizedMutation]
  );

  const setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>> = useCallback(
    (updater) => {
      const baseDims = baselineSnapshotRef.current ? rawUserDimsRef.current : latestDimsRef.current;
      const baseAcoustics = baselineSnapshotRef.current
        ? rawUserAcousticsRef.current
        : latestAcousticsRef.current;
      const resolvedNextAcoustics =
        typeof updater === 'function' ? updater(baseAcoustics) : updater;
      commitCoOptimizedMutation(baseDims, resolvedNextAcoustics, 'Acoustic Parameter Update');
    },
    [commitCoOptimizedMutation]
  );

  const handleToggleCoOpt = useCallback(() => {
    setCoOptConfig((prev) => {
      const nextEnabled = !prev.enabled;
      showToast(
        nextEnabled
          ? 'Live Closed-Loop Multiphysics Co-Optimization enabled'
          : 'Closed-Loop Co-Optimization paused (Manual Override Mode)',
        4000
      );
      return { ...prev, enabled: nextEnabled };
    });
  }, [showToast]);

  const handleOpenCadExport = useCallback((scope?: CadExportScope) => {
    if (scope) setCadExportScope(scope);
    setIsCadExportOpen(true);
  }, []);

  const handleApplyTransducerSizing = useCallback(
    (newDims: EnclosureDimensions, newAcoustics: AcousticParameters, msg: string) => {
      setDimensions(newDims);
      setAcoustics(newAcoustics);
      setSelectedPartId(null);
      setActiveWorkspace('cad_3d');
      showToast(msg, 6000);
    },
    [showToast]
  );

  const handleApplyLineArrayDimensions = useCallback(
    (boxHeightMm: number, boxWidthMm: number, boxDepthMm: number) => {
      setDimensions((prev) => ({
        ...prev,
        externalHeightMm: boxHeightMm,
        externalWidthMm: boxWidthMm,
        externalDepthMm: boxDepthMm,
      }));
      setActiveWorkspace('cad_3d');
      showToast(`Updated cabinet CAD dimensions to line array element: ${boxWidthMm} × ${boxHeightMm} × ${boxDepthMm} mm`, 5000);
    },
    [showToast]
  );

  const handleSelectSubcategoryFromSearch = useCallback(
    (subKey: SpeakerSubcategory) => {
      const subConfig = SUBCATEGORY_CONFIGS[subKey];
      if (!subConfig) return;
      const parentCat = subConfig.parentCategory as SpeakerCategory;
      const catSpec = CATEGORY_SPECS[parentCat];
      const recommendedDrivers = getDriversForSubcategory(subKey, parentCat);
      const bestDriver = recommendedDrivers[0] || DRIVER_PRESETS[0];

      const updatedDims: EnclosureDimensions = {
        ...dimensions,
        category: parentCat,
        subcategory: subKey,
        hardware: { ...catSpec.defaultHardware },
        speakonConfig: flushIncompatibleTerminalConfig(parentCat, dimensions.speakonConfig),
      };

      const updatedAcoustics: AcousticParameters = {
        ...acoustics,
        alignment: subConfig.defaultAlignment,
        targetFb: subConfig.targetFbHz,
        targetQtc: subConfig.targetQtc,
        driverAssignments: {
          ...acoustics.driverAssignments,
          woofer: {
            ...acoustics.driverAssignments.woofer,
            driver: bestDriver,
            quantity: subConfig.wooferQuantity,
          },
        },
      };

      const prelimResults = calculateAcoustics(updatedDims, updatedAcoustics);
      const resolved = autoResolveBaffleClashes(updatedDims, updatedAcoustics, prelimResults);
      setDimensions(resolved.dimensions);
      setAcoustics(resolved.acoustics);
      setSelectedPartId(null);
      showToast(`Switched architecture to "${subConfig.name}" (${bestDriver.brand} ${bestDriver.model})`, 5000);
    },
    [acoustics, dimensions, showToast]
  );

  const handleSelectTransducerFromSearch = useCallback(
    (driver: DriverPreset) => {
      const opt = calculateOptimalAlignment(driver, acoustics.alignment);
      const updatedAcoustics: AcousticParameters = {
        ...acoustics,
        targetFb: opt.optimalFbHz,
        targetQtc: opt.targetQtc,
        driverAssignments: {
          ...acoustics.driverAssignments,
          woofer: {
            ...acoustics.driverAssignments.woofer,
            driver,
          },
        },
      };
      const prelimResults = calculateAcoustics(dimensions, updatedAcoustics);
      const resolved = autoResolveBaffleClashes(dimensions, updatedAcoustics, prelimResults);
      setDimensions(resolved.dimensions);
      setAcoustics(resolved.acoustics);
      showToast(`Mounted woofer transducer: ${driver.brand} ${driver.model}`, 5000);
    },
    [acoustics, dimensions, showToast]
  );

  const handleInitializeFromWizard = useCallback(
    (newDims: EnclosureDimensions, newAcoustics: AcousticParameters, msg?: string) => {
      try {
        let finalDims = newDims;
        let finalAcoustics = newAcoustics;
        try {
          const prelimResults = calculateAcoustics(newDims, newAcoustics);
          const resolved = autoResolveBaffleClashes(newDims, newAcoustics, prelimResults);
          finalDims = resolved.dimensions;
          finalAcoustics = resolved.acoustics;
        } catch (clashErr) {
          console.warn('Could not auto-resolve clashes during wizard initialization:', clashErr);
        }
        setDimensions(finalDims);
        setAcoustics(finalAcoustics);
        setSelectedPartId(null);
        setActiveWorkspace('cad_3d');
        if (msg) {
          showToast(msg, 5000);
        }
      } catch (err) {
        console.error('Failed to initialize speaker from wizard:', err);
      }
    },
    [showToast]
  );

  const handleLoadProject = useCallback((project: ProjectRecord) => {
    setDimensions(project.dimensions);
    setAcoustics(project.acoustics);
    setLocalActiveProjectId(project.id);
    setActiveProjectId(project.id);
    setSavedProjectsCount(getProjects().length);
    setActiveWorkspace('cad_3d');
    showToast(`Loaded project: "${project.name}"`, 5000);
  }, [showToast]);

  const handleProjectNotification = useCallback((msg: string) => {
    setSavedProjectsCount(getProjects().length);
    showToast(msg, 5000);
  }, [showToast]);

  const acousticResults = useMemo(() => {
    return calculateAcoustics(dimensions, acoustics);
  }, [dimensions, acoustics]);

  const isPaSpeaker = useMemo(() => isPaStyleSpeaker(dimensions), [dimensions]);

  // Ensure structural_rigging workspace falls back to cad_3d if speaker is not PA
  React.useEffect(() => {
    if (!isPaSpeaker && activeWorkspace === 'structural_rigging') {
      setActiveWorkspace('cad_3d');
    }
  }, [isPaSpeaker, activeWorkspace]);

  const { cutList, partMetadataMap } = useMemo(() => {
    return generateCutList(dimensions, acoustics, acousticResults);
  }, [dimensions, acoustics, acousticResults]);

  const selectedPart = selectedPartId ? partMetadataMap[selectedPartId] || null : null;

  const autoOptimizePlan = useMemo(() => {
    return computeFullMasterOptimizationPlan(dimensions, acoustics, acousticResults);
  }, [acoustics, dimensions, acousticResults]);

  const handleAutoOptimizeSystem = useCallback(() => {
    const prevScore = acousticResults.caliberReport?.overallScore ?? 90;
    const { finalDims, finalAcoustics, finalRes, actionsTaken } = autoOptimizePlan;
    latestDimsRef.current = finalDims;
    latestAcousticsRef.current = finalAcoustics;
    setDimensionsState(finalDims);
    setAcousticsState(finalAcoustics);

    const newScore = finalRes.caliberReport?.overallScore ?? 98;
    setLastCaliberDelta({
      timestamp: Date.now(),
      previousScore: prevScore,
      currentScore: newScore,
      deltaScore: Math.round((newScore - prevScore) * 10) / 10,
      triggerDescription: '8-Stage Master Reference Auto-Optimize',
      coOptimizedActions: actionsTaken,
      vbDriftLiters: Math.round((finalRes.netVolumeLiters - acousticResults.netVolumeLiters) * 10) / 10,
      compressionDeltaDb:
        Math.round(
          (finalRes.klippelThermal.powerCompressionDb -
            acousticResults.klippelThermal.powerCompressionDb) *
            100
        ) / 100,
    });

    const summaryBadges = actionsTaken.length > 0 ? actionsTaken.join(' • ') : 'Master Reference Verified';
    showToast(
      `Caliber ${newScore.toFixed(1)}/100 (${finalRes.netVolumeLiters}L @ ${finalRes.tuningFrequencyFb}Hz) • ${summaryBadges} • Port ${finalRes.portAirVelocityMs} m/s`,
      6000
    );
  }, [acousticResults, autoOptimizePlan, showToast]);

  const handleSaveCustomDriver = (
    driver: DriverPreset,
    role: 'woofer' | 'midrange' | 'tweeter' = 'woofer'
  ) => {
    setAcoustics((prev) => ({
      ...prev,
      driverAssignments: {
        ...prev.driverAssignments,
        [role]: { ...prev.driverAssignments[role], driver },
      },
    }));
    showToast(`Saved custom ${role} transducer: [${driver.brand}] ${driver.model}`, 4500);
  };

  const openInspectorTab = useCallback((tab: InspectorTab) => {
    setInspectorTab(tab);
    setIsRightInspectorOpen(true);
  }, []);

  const handleFocusInspectorSection = useCallback((tab: InspectorTab, sectionId: string) => {
    setIsRightInspectorOpen(true);
    setInspectorTab(tab);
    setFocusedSectionId(null);
    setTimeout(() => setFocusedSectionId(sectionId), 20);
  }, []);

  // Direct 3D Manipulation (Click-to-Configure in Viewport)
  const handleSelectPartFrom3D = useCallback((partId: string | null) => {
    setSelectedPartId(partId);
    if (!partId) {
      setFocusedSectionId(null);
      return;
    }
    const target = resolvePartInspectionTarget(partId);
    if (target) {
      setIsRightInspectorOpen(true);
      setInspectorTab(target.tab);
      setFocusedSectionId(null);
      setTimeout(() => setFocusedSectionId(target.sectionId), 20);
    }
  }, []);

  const handleToggleComplexityMode = useCallback(
    (mode?: ComplexityMode) => {
      setComplexityMode((prev) => {
        const next = mode ?? (prev === 'essentials' ? 'master' : 'essentials');
        showToast(
          next === 'master'
            ? 'Master Engineer Mode unlocked: Full TPMS Gyroid math, JCA porous telemetry, FEA & IPC netlists active.'
            : 'Essentials Mode active: Streamlined controls for Cabinet, Driver, Tuning (Fb) & Cut List.',
          4000
        );
        return next;
      });
    },
    [showToast]
  );

  const handleToggleTpmsMatrix = useCallback(() => {
    const currentCfg =
      acoustics.integralMatrixConfig || dimensions.integralMatrixConfig || DEFAULT_INTEGRAL_MATRIX_CONFIG;
    const nextEnabled = !currentCfg.enabled;
    const updated = { ...currentCfg, enabled: nextEnabled };
    setAcoustics((prev) => ({ ...prev, integralMatrixConfig: updated }));
    setDimensions((prev) => ({ ...prev, integralMatrixConfig: updated }));
    showToast(
      nextEnabled
        ? 'Enabled Integral 3D-Printed TPMS Gyroid Acoustic Matrix & Labyrinth Back-Wave Trap'
        : 'Disabled Integral 3D-Printed TPMS Acoustic Matrix',
      4500
    );
  }, [acoustics.integralMatrixConfig, dimensions.integralMatrixConfig, showToast]);

  const handleCyclePortProfile = useCallback(() => {
    const profiles: ParametricPortProfileType[] = [
      'circular_bellmouth',
      'elliptical_aperture',
      'rectilinear_slot',
      'flared_exponential_horn',
      'folded_l_conduit',
      'folded_u_conduit',
    ];
    const current = acoustics.parametricPortConfig?.profileType || 'circular_bellmouth';
    const nextIdx = (profiles.indexOf(current) + 1) % profiles.length;
    const nextProfile = profiles[nextIdx];
    const isSlot =
      nextProfile === 'rectilinear_slot' ||
      nextProfile === 'folded_l_conduit' ||
      nextProfile === 'folded_u_conduit';

    setAcoustics((prev) => ({
      ...prev,
      alignment: 'ported',
      portType: isSlot ? 'slot' : 'round',
      parametricPortConfig: {
        profileType: nextProfile,
        ellipseAspectRatio: prev.parametricPortConfig?.ellipseAspectRatio ?? 1.65,
        hornExpansionFactor: prev.parametricPortConfig?.hornExpansionFactor ?? 2.25,
        wallThicknessMm: prev.parametricPortConfig?.wallThicknessMm ?? 4.0,
        cornerRadiusMm: prev.parametricPortConfig?.cornerRadiusMm ?? 12.0,
        autoFoldWhenLong: prev.parametricPortConfig?.autoFoldWhenLong ?? true,
      },
    }));
    showToast(`Switched 3D Parametric Port Profile to: ${nextProfile.replace(/_/g, ' ').toUpperCase()}`, 4000);
  }, [acoustics.parametricPortConfig, showToast]);

  const handleSelectMaterialFromSearch = useCallback(
    (matKey: MaterialType) => {
      const spec = MATERIAL_SPECS[matKey];
      if (!spec) return;
      setDimensions((prev) => ({
        ...prev,
        material: matKey,
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
      handleFocusInspectorSection('dimensions', 'section-material-library');
      showToast(`Switched enclosure material to ${spec.name} (${spec.nominalThicknessMm}mm)`, 4500);
    },
    [handleFocusInspectorSection, showToast]
  );

  const handleSelectAlignmentFromSearch = useCallback(
    (alignment: 'ported' | 'sealed') => {
      setAcoustics((prev) => ({ ...prev, alignment }));
      handleFocusInspectorSection('acoustics', 'section-driver-alignment');
      showToast(
        `Switched enclosure alignment to ${alignment === 'ported' ? 'Bass Reflex (Ported)' : 'Acoustic Suspension (Sealed)'}`,
        4500
      );
    },
    [handleFocusInspectorSection, showToast]
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setSelectedPartId(null);
        setIsPartInspectorOpen(false);
        setIsResponseChartOpen(false);
        setIsCustomDriverOpen(false);
        setIsProjectManagerOpen(false);
        setIsSearchOpen(false);
        setIsSettingsOpen(false);
        setIsSetupWizardOpen(false);
        setIsCadExportOpen(false);
        if (activeWorkspace !== 'cad_3d') {
          setActiveWorkspace('cad_3d');
        }
      } else if (e.key === 'x' || e.key === 'X') {
        setIsXRayMode((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        setIsCutawayMode((prev) => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        setIsWireframeMode((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        setExplodedPercent((prev) => (prev > 0 ? 0 : 50));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspace]);

  return (
    <ErrorBoundary fallbackTitle="ResonanceCAD Workspace Error">
      <UnitProvider>
        <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#07090e] select-none text-slate-100 font-sans">
          {/* Top Workstation Command Bar */}
          <TopHeader
            results={acousticResults}
            acoustics={acoustics}
            activeWorkflowMode={activeWorkflowMode}
            onSelectWorkflowMode={setActiveWorkflowMode}
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={setActiveWorkspace}
            onOpenCadExport={handleOpenCadExport}
            onOpenProjectsDrawer={() => setIsProjectManagerOpen(true)}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenPcbWorkspace={() => {
              setCrossoverSubView('pcb_stack');
              setActiveWorkspace('crossover_pcb');
            }}
            onOpenLineArray={() => setActiveWorkspace('line_array')}
            onOpenTransducerSizing={() => setActiveWorkspace('transducer_sizing')}
            isPaSpeaker={isPaSpeaker}
            onOpenStructuralRigging={() => setActiveWorkspace('structural_rigging')}
            savedProjectsCount={savedProjectsCount}
            isLeftMenuOpen={isLeftMenuOpen}
            onToggleLeftMenu={() => setIsLeftMenuOpen((p) => !p)}
            isRightInspectorOpen={isRightInspectorOpen}
            onToggleRightInspector={() => setIsRightInspectorOpen((p) => !p)}
            complexityMode={complexityMode}
            onToggleComplexityMode={handleToggleComplexityMode}
            selectedPartId={selectedPartId}
            selectedPart={selectedPart}
            onClearSelectedPart={() => handleSelectPartFrom3D(null)}
            onFocusInspectorSection={handleFocusInspectorSection}
            onToggleTpmsMatrix={handleToggleTpmsMatrix}
            onCyclePortProfile={handleCyclePortProfile}
            onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
            isAirflowStressVisible={isAirflowStressVisible}
            onToggleVibrationAnalysis={() => setIsVibrationAnalysisVisible((p) => !p)}
            isVibrationAnalysisVisible={isVibrationAnalysisVisible}
            onToggleCutaway={() => setIsCutawayMode((p) => !p)}
            isCutawayMode={isCutawayMode}
            onOpenResponseChart={() => setIsResponseChartOpen(true)}
          />

          {/* Non-intrusive Toast Notification Banner */}
          {clashNotification && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-500/80 text-emerald-100 shadow-2xl backdrop-blur-md font-mono text-xs animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{clashNotification}</span>
            </div>
          )}

          {/* 3-Pane CAD Workstation Body (Left Tool Drawer | Central Workspace Stage | Right Property Inspector) */}
          <div className="relative flex-1 flex w-full min-h-0 overflow-hidden">
            {/* Zone B: Collapsible Left Tool & Preset Drawer */}
            <LeftSidebarMenu
              isOpen={isLeftMenuOpen}
              onToggleOpen={() => setIsLeftMenuOpen((p) => !p)}
              dimensions={dimensions}
              setDimensions={setDimensions}
              acoustics={acoustics}
              setAcoustics={setAcoustics}
              results={acousticResults}
              isAirflowStressVisible={isAirflowStressVisible}
              onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
              isVibrationAnalysisVisible={isVibrationAnalysisVisible}
              onToggleVibrationAnalysis={() => setIsVibrationAnalysisVisible((p) => !p)}
              isLiveSimOpen={inspectorTab === 'telemetry' && isRightInspectorOpen}
              onToggleLiveSim={() => openInspectorTab('telemetry')}
              isXRayMode={isXRayMode}
              onToggleXRay={() => setIsXRayMode((p) => !p)}
              isCutawayMode={isCutawayMode}
              onToggleCutaway={() => setIsCutawayMode((p) => !p)}
              isWireframeMode={isWireframeMode}
              onToggleWireframe={() => setIsWireframeMode((p) => !p)}
              explodedPercent={explodedPercent}
              setExplodedPercent={setExplodedPercent}
              cameraPreset={cameraPreset}
              setCameraPreset={setCameraPreset}
              onOpenCutList={() => setActiveWorkspace('cut_list')}
              onOpenResponseChart={() => setIsResponseChartOpen(true)}
              onOpenCrossover={() => {
                setCrossoverSubView('schematic_dsp');
                setActiveWorkspace('crossover_pcb');
              }}
              onOpenWizard={() => setIsSetupWizardOpen(true)}
              onOpenCadExport={() => handleOpenCadExport()}
              onOpenProjects={() => setIsProjectManagerOpen(true)}
              onOpenCustomDriver={() => setIsCustomDriverOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenPcbWorkspace={() => {
                setCrossoverSubView('pcb_stack');
                setActiveWorkspace('crossover_pcb');
              }}
              onOpenLineArray={() => setActiveWorkspace('line_array')}
              onOpenTransducerSizing={() => setActiveWorkspace('transducer_sizing')}
              isPaSpeaker={isPaSpeaker}
              onOpenStructuralRigging={() => setActiveWorkspace('structural_rigging')}
              onOpenFeatureModal={(tab) => {
                openInspectorTab(tab);
                if (window.innerWidth < 1024) {
                  setIsLeftMenuOpen(false);
                }
              }}
            />

            {/* Zone C: Central High-Performance Workspace Stage */}
            <main className="relative flex-1 h-full min-w-0 overflow-hidden bg-[#07090e] flex flex-col">
              {activeWorkspace === 'cad_3d' && (
                <div className="relative w-full h-full">
                  <AcousticCADViewer
                    dimensions={dimensions}
                    setDimensions={setDimensions}
                    acoustics={acoustics}
                    results={acousticResults}
                    partMetadataMap={partMetadataMap}
                    cutList={cutList}
                    selectedPartId={selectedPartId}
                    onSelectPart={handleSelectPartFrom3D}
                    onInspectPartSpecs={(partId) => {
                      handleSelectPartFrom3D(partId);
                      setIsPartInspectorOpen(true);
                    }}
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
                    isAirflowStressVisible={isAirflowStressVisible}
                    onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
                    isVibrationAnalysisVisible={isVibrationAnalysisVisible}
                    onToggleVibrationAnalysis={() => setIsVibrationAnalysisVisible((p) => !p)}
                    onModelRootReady={(getter) => {
                      modelRootGetterRef.current = getter;
                    }}
                    onOpenCadExport={handleOpenCadExport}
                    hasPendingOptimizations={autoOptimizePlan.hasPendingOptimizations}
                    pendingOptimizationReasons={autoOptimizePlan.pendingReasons}
                    onAutoOptimize={handleAutoOptimizeSystem}
                    coOptConfig={coOptConfig}
                    onToggleCoOpt={handleToggleCoOpt}
                    lastCaliberDelta={lastCaliberDelta}
                  />

                  {/* Active 3D Viewport Mode Badges */}
                  <div className="absolute right-4 bottom-6 z-20 flex flex-col items-end gap-2 pointer-events-auto">
                    {explodedPercent > 0 && (
                      <div className="bg-slate-900/90 border border-cyan-800/80 px-2.5 py-1 rounded text-xs font-mono text-cyan-300 shadow-lg flex items-center gap-1.5">
                        <span>EXPLODED VIEW: {explodedPercent}%</span>
                        <button
                          onClick={() => setExplodedPercent(0)}
                          className="text-[10px] text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                        >
                          Assemble
                        </button>
                      </div>
                    )}
                    {isXRayMode && (
                      <div className="bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono text-slate-300 shadow-lg flex items-center gap-1.5">
                        <span>X-RAY GLASS ACTIVE</span>
                        <button
                          onClick={() => setIsXRayMode(false)}
                          className="text-[10px] text-slate-400 hover:text-white ml-1 cursor-pointer"
                          title="Disable X-Ray"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {isCutawayMode && (
                      <div className="bg-slate-900/90 border border-amber-800 px-2.5 py-1 rounded text-xs font-mono text-amber-300 shadow-lg flex items-center gap-1.5">
                        <span>SECTION CUTAWAY ACTIVE</span>
                        <button
                          onClick={() => setIsCutawayMode(false)}
                          className="text-[10px] text-amber-400 hover:text-white ml-1 cursor-pointer"
                          title="Disable Cutaway"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {isVibrationAnalysisVisible && (
                      <div className="bg-slate-900/90 border border-violet-700/80 px-2.5 py-1 rounded text-xs font-mono text-violet-300 shadow-lg flex items-center gap-1.5">
                        <span>● VIBRATION FEA ({acousticResults.mechanics?.bendingStiffnessNm?.toLocaleString() ?? 0} N·m)</span>
                        <button
                          onClick={() => setIsVibrationAnalysisVisible(false)}
                          className="text-[10px] text-violet-400 hover:text-white ml-1 cursor-pointer"
                          title="Disable Vibration FEA"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage 2 Workspace: Split Screen 3D CAD + Live Acoustic Simulation Curves */}
              {activeWorkspace === 'simulate' && (
                <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-[#07090e]">
                  {/* Left Pane: Interactive 3D CAD Preview */}
                  <div className="flex-1 h-1/2 lg:h-full relative min-w-0 border-b lg:border-b-0 lg:border-r border-slate-800/90">
                    <AcousticCADViewer
                      dimensions={dimensions}
                      setDimensions={setDimensions}
                      acoustics={acoustics}
                      results={acousticResults}
                      partMetadataMap={partMetadataMap}
                      cutList={cutList}
                      selectedPartId={selectedPartId}
                      onSelectPart={handleSelectPartFrom3D}
                      onInspectPartSpecs={(partId) => {
                        handleSelectPartFrom3D(partId);
                        setIsPartInspectorOpen(true);
                      }}
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
                      isAirflowStressVisible={isAirflowStressVisible}
                      onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
                      isVibrationAnalysisVisible={isVibrationAnalysisVisible}
                      onToggleVibrationAnalysis={() => setIsVibrationAnalysisVisible((p) => !p)}
                      onModelRootReady={(getter) => {
                        modelRootGetterRef.current = getter;
                      }}
                      onOpenCadExport={handleOpenCadExport}
                    />
                  </div>

                  {/* Right Pane: Live Simulation Panel and Curves */}
                  <div className="w-full lg:w-[480px] xl:w-[540px] h-1/2 lg:h-full overflow-y-auto bg-[#090c13] flex flex-col p-4 gap-3 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-sm text-slate-100">Live Acoustic &amp; Impedance Engine</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspace('cad_3d')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white font-mono transition cursor-pointer"
                      >
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Return to 3D</span>
                      </button>
                    </div>

                    <LiveSimulationPanel
                      results={acousticResults}
                      acoustics={acoustics}
                      isOpen={true}
                      onToggle={() => {}}
                      onOpenFullModal={() => setIsResponseChartOpen(true)}
                      embedded={true}
                    />

                    <div className="p-3 bg-[#0a0d16] border border-slate-800/80 rounded-xl">
                      <FrequencyResponseChart
                        results={acousticResults}
                        acoustics={acoustics}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeWorkspace === 'transducer_sizing' && (
                <TransducerSizingModal
                  isOpen={true}
                  embedded={true}
                  onClose={() => setActiveWorkspace('cad_3d')}
                  currentDimensions={dimensions}
                  currentAcoustics={acoustics}
                  onApplySizing={handleApplyTransducerSizing}
                />
              )}

              {activeWorkspace === 'crossover_pcb' && (
                <div className="w-full h-full flex flex-col overflow-hidden bg-[#07090e]">
                  {/* Sub-Workspace Switcher Bar: PCB Stack & Gerber Export vs Passive Crossover & FIR Studio */}
                  <div className="flex items-center justify-between px-5 py-2 bg-[#0a0e17] border-b border-slate-800/90 text-xs font-mono shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCrossoverSubView('pcb_stack')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-bold whitespace-nowrap ${
                          crossoverSubView === 'pcb_stack'
                            ? 'bg-emerald-950 border-emerald-500/80 text-emerald-200'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1. Multi-Board PCB Stack &amp; Gerber Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrossoverSubView('schematic_dsp')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-bold whitespace-nowrap ${
                          crossoverSubView === 'schematic_dsp'
                            ? 'bg-purple-950 border-purple-500/80 text-purple-200'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span>2. Passive Network, Conjugate Tanks &amp; FIR DSP</span>
                      </button>
                    </div>

                    {crossoverSubView === 'schematic_dsp' && (
                      <button
                        type="button"
                        onClick={() => setActiveWorkspace('cad_3d')}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Return to 3D CAD</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {crossoverSubView === 'pcb_stack' ? (
                      <CrossoverPcbWorkspace
                        isOpen={true}
                        embedded={true}
                        onClose={() => setActiveWorkspace('cad_3d')}
                        acoustics={acoustics}
                        crossoverResults={acousticResults.crossover}
                        dimensions={dimensions}
                      />
                    ) : (
                      <div className="p-4 max-w-6xl mx-auto">
                        <CrossoverDesigner
                          acoustics={acoustics}
                          setAcoustics={setAcoustics}
                          crossoverResults={acousticResults.crossover}
                          firReport={acousticResults.firReport}
                          baffleWidthMm={dimensions.externalWidthMm}
                          onOpenPcbWorkspace={() => setCrossoverSubView('pcb_stack')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeWorkspace === 'line_array' && (
                <LineArrayDesignerModal
                  isOpen={true}
                  embedded={true}
                  onClose={() => setActiveWorkspace('cad_3d')}
                  dimensions={dimensions}
                  onApplyArrayDimensions={handleApplyLineArrayDimensions}
                  onOpenStructuralRigging={() => {
                    if (isPaSpeaker) {
                      setActiveWorkspace('structural_rigging');
                    } else {
                      handleSelectSubcategoryFromSearch('horn_loaded_array');
                      setActiveWorkspace('structural_rigging');
                    }
                  }}
                />
              )}

              {activeWorkspace === 'structural_rigging' && (
                <StructuralRiggingModal
                  isOpen={true}
                  embedded={true}
                  onClose={() => setActiveWorkspace('cad_3d')}
                  dimensions={dimensions}
                  onSwitchToPaArchitecture={() => {
                    handleSelectSubcategoryFromSearch('horn_loaded_array');
                  }}
                  onApplyRiggingSettings={(tiltDeg, boxCount, totalMassKg) => {
                    showToast(
                      `Rigging verified & synced: ${boxCount}-box array @ ${tiltDeg.toFixed(1)}° tilt (${totalMassKg.toFixed(1)} kg total load)`,
                      5000
                    );
                  }}
                />
              )}

              {activeWorkspace === 'cut_list' && (
                <div className="w-full h-full flex flex-col overflow-hidden bg-[#090c13]">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-[#07090e] border-b border-slate-800/90 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-sm sm:text-base text-slate-100">
                          Woodworking Cut List, Panel Schedule &amp; CNC Fabrication Sheet
                        </h2>
                        <p className="text-xs text-slate-400">
                          Click any structural panel row to inspect its 3D geometry in the CAD viewport
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkspace('cad_3d')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                    >
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Return to 3D CAD</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 max-w-6xl w-full mx-auto">
                    <CutListSheet
                      cutList={cutList}
                      dimensions={dimensions}
                      selectedPartId={selectedPartId}
                      onSelectPart={(partId) => {
                        setSelectedPartId(partId);
                        setActiveWorkspace('cad_3d');
                      }}
                      onInspectPartSpecs={(partId) => {
                        setSelectedPartId(partId);
                        setIsPartInspectorOpen(true);
                      }}
                    />
                  </div>
                </div>
              )}
            </main>

            {/* Zone D: Dockable Right-Hand Property Inspector & Telemetry HUD */}
            <RightPropertyInspector
              isOpen={isRightInspectorOpen}
              onToggleOpen={() => setIsRightInspectorOpen((p) => !p)}
              activeTab={inspectorTab}
              onSelectTab={setInspectorTab}
              dimensions={dimensions}
              setDimensions={setDimensions}
              acoustics={acoustics}
              setAcoustics={setAcoustics}
              results={acousticResults}
              activeWorkflowMode={activeWorkflowMode}
              onSelectWorkflowMode={setActiveWorkflowMode}
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
              onOpenCutList={() => setActiveWorkspace('cut_list')}
              onOpenResponseChart={() => setIsResponseChartOpen(true)}
              onOpenCrossoverDesigner={() => {
                setCrossoverSubView('schematic_dsp');
                setActiveWorkspace('crossover_pcb');
              }}
              onOpenCustomDriver={() => setIsCustomDriverOpen(true)}
              onAutoAlign={handleAutoOptimizeSystem}
              hasPendingOptimizations={autoOptimizePlan.hasPendingOptimizations}
              pendingOptimizationReasons={autoOptimizePlan.pendingReasons}
              isAirflowStressVisible={isAirflowStressVisible}
              onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
              isVibrationAnalysisVisible={isVibrationAnalysisVisible}
              onToggleVibrationAnalysis={() => setIsVibrationAnalysisVisible((p) => !p)}
              onOpenCadExport={handleOpenCadExport}
              complexityMode={complexityMode}
              onToggleComplexityMode={handleToggleComplexityMode}
              selectedPartId={selectedPartId}
              selectedPart={selectedPart}
              onClearSelectedPart={() => handleSelectPartFrom3D(null)}
              focusedSectionId={focusedSectionId}
              onFocusInspectorSection={handleFocusInspectorSection}
              onToggleTpmsMatrix={handleToggleTpmsMatrix}
              onCyclePortProfile={handleCyclePortProfile}
              coOptConfig={coOptConfig}
              onChangeCoOptConfig={setCoOptConfig}
              lastCaliberDelta={lastCaliberDelta}
            />
          </div>

          {/* Secondary Modals & Dialogs */}
          <CadExportModal
            isOpen={isCadExportOpen}
            onClose={() => setIsCadExportOpen(false)}
            dimensions={dimensions}
            acoustics={acoustics}
            results={acousticResults}
            getModelRoot={() => (modelRootGetterRef.current ? modelRootGetterRef.current() : null)}
            initialScope={cadExportScope}
          />

          <ProjectManagerSidebar
            isOpen={isProjectManagerOpen}
            onClose={() => setIsProjectManagerOpen(false)}
            currentDimensions={dimensions}
            currentAcoustics={acoustics}
            activeProjectId={activeProjectId}
            onLoadProject={handleLoadProject}
            onSaveSuccess={handleProjectNotification}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
          />

          <SpeakerSetupWizard
            isOpen={isSetupWizardOpen}
            onClose={() => setIsSetupWizardOpen(false)}
            onInitializeSpeaker={handleInitializeFromWizard}
          />

          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectWorkspace={setActiveWorkspace}
            onSelectSubcategory={handleSelectSubcategoryFromSearch}
            onSelectTransducer={handleSelectTransducerFromSearch}
            onToggleExploded={() => setExplodedPercent((prev) => (prev > 0 ? 0 : 50))}
            onToggleXRay={() => setIsXRayMode((prev) => !prev)}
            onToggleCutaway={() => setIsCutawayMode((prev) => !prev)}
            onToggleWireframe={() => setIsWireframeMode((prev) => !prev)}
            onToggleAirflowStress={() => setIsAirflowStressVisible((prev) => !prev)}
            onToggleVibrationFEA={() => setIsVibrationAnalysisVisible((prev) => !prev)}
            onOpenCutList={() => setActiveWorkspace('cut_list')}
            onOpenResponseChart={() => setIsResponseChartOpen(true)}
            onOpenCrossover={() => {
              setCrossoverSubView('schematic_dsp');
              setActiveWorkspace('crossover_pcb');
            }}
            onOpenWizard={() => setIsSetupWizardOpen(true)}
            onOpenCadExport={() => handleOpenCadExport()}
            onOpenProjects={() => setIsProjectManagerOpen(true)}
            onOpenCustomDriver={() => setIsCustomDriverOpen(true)}
            onAutoAlign={handleAutoOptimizeSystem}
            onSelectMaterial={handleSelectMaterialFromSearch}
            onSelectAlignment={handleSelectAlignmentFromSearch}
            onToggleTpmsMatrix={handleToggleTpmsMatrix}
            onToggleComplexityMode={handleToggleComplexityMode}
            complexityMode={complexityMode}
            isXRayMode={isXRayMode}
            isCutawayMode={isCutawayMode}
            isWireframeMode={isWireframeMode}
            isAirflowStressVisible={isAirflowStressVisible}
            isVibrationAnalysisVisible={isVibrationAnalysisVisible}
            explodedPercent={explodedPercent}
            onOpenFeatureModal={(tab) => openInspectorTab(tab)}
            onOpenTransducerSizing={() => setActiveWorkspace('transducer_sizing')}
            onOpenLineArray={() => setActiveWorkspace('line_array')}
            onOpenPcbWorkspace={() => {
              setCrossoverSubView('pcb_stack');
              setActiveWorkspace('crossover_pcb');
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isPaSpeaker={isPaSpeaker}
            onOpenStructuralRigging={() => setActiveWorkspace('structural_rigging')}
          />

          {isPartInspectorOpen && selectedPart && (
            <PartInspectorModal
              part={selectedPart}
              onClose={() => setIsPartInspectorOpen(false)}
            />
          )}

          {isResponseChartOpen && (
            <div
              onClick={() => setIsResponseChartOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-none animate-in fade-in cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 cursor-default"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsResponseChartOpen(false);
                  }}
                  title="Close Frequency Response (X)"
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950 border border-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-rose-400" />
                </button>
                <FrequencyResponseChart
                  results={acousticResults}
                  acoustics={acoustics}
                />
              </div>
            </div>
          )}

          {isCustomDriverOpen && (
            <CustomDriverModal
              currentDriver={acoustics.driverAssignments.woofer.driver}
              driverAssignments={acoustics.driverAssignments}
              onSave={handleSaveCustomDriver}
              onClose={() => setIsCustomDriverOpen(false)}
            />
          )}

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            dimensions={dimensions}
            acoustics={acoustics}
            results={acousticResults}
          />
        </div>
      </UnitProvider>
    </ErrorBoundary>
  );
}
