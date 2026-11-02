import React, { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticParameters,
  type CameraPreset,
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
import { Activity, Box, CheckCircle, Cpu, FileSpreadsheet, Layers, X } from 'lucide-react';

export default function App() {
  const [dimensions, setDimensions] = useState<EnclosureDimensions>({
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
    category: 'studio_monitor',
    subcategory: 'nearfield_2way',
    hardware: { ...CATEGORY_SPECS.studio_monitor.defaultHardware },
  });

  const [acoustics, setAcoustics] = useState<AcousticParameters>({
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
    targetFb: 45,
    portType: 'round',
    portPlacement: 'auto',
    portDiameterMm: 80,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    slotWidthMm: 290,
    slotHeightMm: 45,
    slotLipRadiusMm: 12,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
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
  const [isCutListModalOpen, setIsCutListModalOpen] = useState<boolean>(false);
  const [isResponseChartOpen, setIsResponseChartOpen] = useState<boolean>(false);
  const [isCrossoverModalOpen, setIsCrossoverModalOpen] = useState<boolean>(false);
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
    const woofer = acoustics.driverAssignments.woofer.driver;
    const optimal = calculateOptimalAlignment(woofer, acoustics.alignment);
    const material = MATERIAL_SPECS[dimensions.material] || MATERIAL_SPECS.baltic_birch_18;
    const t = material.nominalThicknessMm;

    const wooferQty =
      dimensions.subcategory === 'dual_18_reflex'
        ? 2
        : acoustics.topology === 'mtm'
        ? 2
        : acoustics.driverAssignments.woofer.quantity || 1;

    const activeCatSpec =
      CATEGORY_SPECS[dimensions.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
    const categoryMaxVelMs = activeCatSpec.maxRecommendedPortVelocityMs || 14.0;

    const targetNetLiters = optimal.optimalVbLiters * wooferQty;
    const hasVolumeMismatch =
      Math.abs(acousticResults.netVolumeLiters - targetNetLiters) >
      Math.max(4, targetNetLiters * 0.14);
    const hasTuningMismatch =
      acoustics.alignment === 'ported'
        ? Math.abs((acoustics.targetFb || acousticResults.tuningFrequencyFb) - optimal.optimalFbHz) > 2
        : Math.abs((acoustics.targetQtc || acousticResults.boxQtc) - optimal.targetQtc) > 0.05;
    const hasPortTurbulence =
      acoustics.alignment === 'ported' &&
      (acousticResults.isChuffingRisk || acousticResults.portAirVelocityMs > categoryMaxVelMs);
    const hasClash = Boolean(
      acousticResults.layout?.hasCollision ||
        acousticResults.layout?.airflowInterference?.hasInterference
    );
    const hasDampingMismatch = Boolean(
      acousticResults.dampingAdvisor &&
        (Math.abs(
          (acoustics.dampingFillPercent ?? 50) -
            acousticResults.dampingAdvisor.recommendedFillPercent
        ) > 5 ||
          acoustics.absorptionMaterialType !==
            acousticResults.dampingAdvisor.recommendedMaterial)
    );

    let candidateDims: EnclosureDimensions = { ...dimensions };
    let candidateAcoustics: AcousticParameters = { ...acoustics };
    const actionsTaken: string[] = [];

    // Helper: size port cross-sectional area so both base velocity and rated-power velocity stay laminar
    const applyLaminarPortSizing = (
      dims: EnclosureDimensions,
      ac: AcousticParameters,
      refResults: ReturnType<typeof calculateAcoustics>,
      turbulenceFactor = 1.0
    ): AcousticParameters => {
      const catSpec =
        CATEGORY_SPECS[dims.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
      const maxVelMs = catSpec.maxRecommendedPortVelocityMs || 14.0;
      const totalSdM2 = (woofer.sd || 500) * wooferQty * 1e-4;
      const xmaxM = (woofer.xmax || 5) * 1e-3;
      const vdM3 = totalSdM2 * xmaxM;
      const fb = Math.max(18, ac.targetFb || 35);

      // Account for rated-power sonic Mach limit (34 m/s) in parametricPortEngine
      const powerScaleFactor = Math.sqrt(Math.max(100, woofer.pe || 250) / 100);
      const sonicSafeVelocityMs = 31.0 / Math.max(1.0, powerScaleFactor * 1.12);
      const effectiveTargetVelMs =
        Math.max(5.5, Math.min(maxVelMs * 0.82, sonicSafeVelocityMs)) /
        Math.max(1.0, turbulenceFactor);

      const intW = Math.max(80, dims.externalWidthMm - 2 * t);
      const intH = Math.max(80, dims.externalHeightMm - 2 * t);
      const reqTotalAreaM2 = (2 * Math.PI * fb * vdM3) / effectiveTargetVelMs;

      if (ac.portType === 'slot') {
        const currentWidthMm = Math.min(
          intW - 12,
          Math.max(ac.slotWidthMm || 160, Math.round(intW * 0.88))
        );
        const maxSafeSlotHeightMm = Math.max(36, Math.min(160, Math.floor(intH * 0.36)));
        let numPorts = Math.max(1, ac.numberOfPorts || 1);
        let reqPerPortAreaMm2 = (reqTotalAreaM2 / numPorts) * 1e6;
        let neededHeightMm = Math.ceil(reqPerPortAreaMm2 / currentWidthMm);

        while (neededHeightMm > maxSafeSlotHeightMm && numPorts < 4) {
          numPorts += 1;
          reqPerPortAreaMm2 = (reqTotalAreaM2 / numPorts) * 1e6;
          neededHeightMm = Math.ceil(reqPerPortAreaMm2 / currentWidthMm);
        }

        const nextHeightMm = Math.min(
          maxSafeSlotHeightMm,
          Math.max(ac.slotHeightMm || 45, Math.max(28, neededHeightMm))
        );
        const nextLipMm = Math.max(ac.slotLipRadiusMm || 14, 18);

        return {
          ...ac,
          numberOfPorts: numPorts,
          slotWidthMm: currentWidthMm,
          slotHeightMm: nextHeightMm,
          slotLipRadiusMm: nextLipMm,
        };
      }

      const maxFitDia = Math.max(55, Math.min(165, Math.floor((intW - 32) / 1.35)));
      let numPorts = Math.max(1, ac.numberOfPorts || 1);
      let reqPerPortAreaMm2 = (reqTotalAreaM2 / numPorts) * 1e6;
      let reqDiameterMm = Math.ceil(2 * Math.sqrt(reqPerPortAreaMm2 / Math.PI));
      const minEmpiricalDia = Math.ceil(
        (refResults.recommendedMinimumPortDiameterMm || 76) / Math.sqrt(numPorts)
      );
      let targetDia = Math.max(reqDiameterMm, minEmpiricalDia);

      while (targetDia > maxFitDia && numPorts < 4) {
        numPorts += 1;
        reqPerPortAreaMm2 = (reqTotalAreaM2 / numPorts) * 1e6;
        reqDiameterMm = Math.ceil(2 * Math.sqrt(reqPerPortAreaMm2 / Math.PI));
        targetDia = Math.max(
          reqDiameterMm,
          Math.ceil((refResults.recommendedMinimumPortDiameterMm || 76) / Math.sqrt(numPorts))
        );
      }

      const nextDia = Math.min(maxFitDia, Math.max(ac.portDiameterMm, targetDia));
      const nextFlare = Math.min(
        Math.floor((intW - nextDia - 20) / 2),
        Math.max(ac.flareRadiusMm || 16, Math.round(nextDia * 0.22))
      );
      const safeFlare = Math.max(12, nextFlare);

      return {
        ...ac,
        numberOfPorts: numPorts,
        portDiameterMm: nextDia,
        flareRadiusMm: safeFlare,
        isDoubleFlared: true,
      };
    };

    // Stage 1: Volume & Tuning Alignment
    if (hasVolumeMismatch) {
      const targetGrossLiters = targetNetLiters * 1.15;
      const aspectH =
        acoustics.topology === 'three_way' || acoustics.topology === 'mtm' ? 1.85 : 1.55;
      const aspectD = 1.15;
      const baseIntW = Math.round(Math.cbrt((targetGrossLiters * 1000000) / (aspectH * aspectD)));
      const newW = Math.min(
        750,
        Math.max(240, Math.max(woofer.frameOuterDiameterMm + 40, baseIntW + 2 * t))
      );
      const newH = Math.min(1300, Math.max(280, Math.round((newW - 2 * t) * aspectH + 2 * t)));
      const intAreaMm2 = Math.max(10000, (newW - 2 * t) * (newH - 2 * t));
      const reqIntDepthMm = Math.round((targetGrossLiters * 1000000) / intAreaMm2);
      const minDriverDepthMm = Math.round(
        (woofer.mountingDepthMm || 120) + (woofer.magnetDepthMm || 40) + 55 + 2 * t
      );
      const newD = Math.min(800, Math.max(220, Math.max(minDriverDepthMm, reqIntDepthMm + 2 * t)));

      candidateDims = {
        ...candidateDims,
        externalWidthMm: newW,
        externalHeightMm: newH,
        externalDepthMm: newD,
      };
    }

    if (hasVolumeMismatch || hasTuningMismatch) {
      candidateAcoustics = {
        ...candidateAcoustics,
        targetFb: optimal.optimalFbHz,
        targetQtc: optimal.targetQtc,
      };
      actionsTaken.push('Vb/Fb Aligned');
    }

    // Check intermediate acoustics after Stage 1 to see if damping or port velocity needs adjustment
    const midResults = calculateAcoustics(candidateDims, candidateAcoustics);
    if (midResults.dampingAdvisor) {
      candidateAcoustics = {
        ...candidateAcoustics,
        dampingFillPercent: midResults.dampingAdvisor.recommendedFillPercent,
        absorptionMaterialType: midResults.dampingAdvisor.recommendedMaterial,
      };
    }

    const needsPortSizing =
      candidateAcoustics.alignment !== 'sealed' &&
      (hasPortTurbulence ||
        midResults.isChuffingRisk ||
        midResults.portAirVelocityMs > categoryMaxVelMs);

    // Stage 2: Laminar Port Velocity Sizing (strictly below category-specific & Mach chuffing limit)
    if (needsPortSizing) {
      const midTurb = midResults.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
      candidateAcoustics = applyLaminarPortSizing(
        candidateDims,
        candidateAcoustics,
        midResults,
        midTurb
      );
      actionsTaken.push('Laminar Port Sized');
    }

    // Stage 3: 2D/3D Baffle Clash & Recursive Z-Depth Clamping
    const prelimResults = calculateAcoustics(candidateDims, candidateAcoustics);
    const resolved = autoResolveBaffleClashes(candidateDims, candidateAcoustics, prelimResults);
    if (hasClash || prelimResults.layout?.hasCollision) {
      actionsTaken.push('3D Clashes Cleared');
    }

    const finalDims = resolved.dimensions;
    let finalAcoustics = resolved.acoustics;
    let finalRes = calculateAcoustics(finalDims, finalAcoustics);

    // Post-clash verification: if autoResolveBaffleClashes switched port topology (e.g. round -> slot) and left chuffing active, resize port
    if (
      finalAcoustics.alignment !== 'sealed' &&
      (finalRes.isChuffingRisk || finalRes.portAirVelocityMs > categoryMaxVelMs)
    ) {
      const postTurb = finalRes.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
      finalAcoustics = applyLaminarPortSizing(finalDims, finalAcoustics, finalRes, postTurb);
      finalRes = calculateAcoustics(finalDims, finalAcoustics);
      if (!actionsTaken.includes('Laminar Port Sized')) {
        actionsTaken.push('Laminar Port Sized');
      }
    }

    const dimsChanged =
      Math.abs(finalDims.externalWidthMm - dimensions.externalWidthMm) > 1 ||
      Math.abs(finalDims.externalHeightMm - dimensions.externalHeightMm) > 1 ||
      Math.abs(finalDims.externalDepthMm - dimensions.externalDepthMm) > 1;

    const acousticsChanged =
      Math.abs((finalAcoustics.targetFb || 0) - (acoustics.targetFb || 0)) > 0.5 ||
      Math.abs((finalAcoustics.targetQtc || 0) - (acoustics.targetQtc || 0)) > 0.02 ||
      finalAcoustics.portType !== acoustics.portType ||
      finalAcoustics.numberOfPorts !== acoustics.numberOfPorts ||
      Math.abs((finalAcoustics.portDiameterMm || 0) - (acoustics.portDiameterMm || 0)) > 1 ||
      Math.abs((finalAcoustics.slotWidthMm || 0) - (acoustics.slotWidthMm || 0)) > 1 ||
      Math.abs((finalAcoustics.slotHeightMm || 0) - (acoustics.slotHeightMm || 0)) > 1 ||
      Math.abs((finalAcoustics.dampingFillPercent ?? 50) - (acoustics.dampingFillPercent ?? 50)) >
        1 ||
      finalAcoustics.absorptionMaterialType !== acoustics.absorptionMaterialType;

    const pendingReasons: string[] = [];
    if (hasClash) pendingReasons.push('3D Clash');
    if (hasPortTurbulence) pendingReasons.push('Port Velocity');
    if ((hasVolumeMismatch && dimsChanged) || hasTuningMismatch) {
      pendingReasons.push('Vb/Fb Alignment');
    }
    if (hasDampingMismatch && acousticsChanged && pendingReasons.length === 0) {
      pendingReasons.push('Damping Fill');
    }

    const hasPendingOptimizations =
      pendingReasons.length > 0 && (dimsChanged || acousticsChanged || hasClash || hasPortTurbulence);

    return {
      finalDims,
      finalAcoustics,
      finalRes,
      actionsTaken,
      pendingReasons,
      hasPendingOptimizations,
    };
  }, [acoustics, dimensions, acousticResults]);

  const handleAutoOptimizeSystem = useCallback(() => {
    const { finalDims, finalAcoustics, finalRes, actionsTaken } = autoOptimizePlan;
    setDimensions(finalDims);
    setAcoustics(finalAcoustics);

    const summaryBadges = actionsTaken.length > 0 ? actionsTaken.join(' • ') : 'System Verified';
    showToast(
      `Auto-Optimized (${finalRes.netVolumeLiters}L @ ${finalRes.tuningFrequencyFb}Hz) • ${summaryBadges} • Port ${finalRes.portAirVelocityMs} m/s`,
      6000
    );
  }, [autoOptimizePlan, showToast]);

  const handleSaveCustomDriver = (driver: DriverPreset) => {
    setAcoustics((prev) => ({
      ...prev,
      driverAssignments: {
        ...prev.driverAssignments,
        woofer: { ...prev.driverAssignments.woofer, driver },
      },
    }));
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
        setIsCutListModalOpen(false);
        setIsResponseChartOpen(false);
        setIsCrossoverModalOpen(false);
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
                  onApplyRiggingSettings={(totalMassKg, splayAngleDeg) => {
                    showToast(`Rigging verified: ${totalMassKg.toFixed(1)}kg array load, avg splay ${splayAngleDeg.toFixed(1)}°`, 5000);
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

          {isCutListModalOpen && (
            <div
              onClick={() => setIsCutListModalOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-none animate-in fade-in cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl cursor-default"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCutListModalOpen(false);
                  }}
                  title="Close Cut List (X)"
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950 border border-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-rose-400" />
                </button>
                <CutListSheet
                  cutList={cutList}
                  dimensions={dimensions}
                  selectedPartId={selectedPartId}
                  onSelectPart={(partId) => {
                    setSelectedPartId(partId);
                    setIsCutListModalOpen(false);
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

          {isCrossoverModalOpen && (
            <div
              onClick={() => setIsCrossoverModalOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-none animate-in fade-in cursor-pointer"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 cursor-default"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCrossoverModalOpen(false);
                  }}
                  title="Close Audio FIR & Crossover (X)"
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-rose-950 border border-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-rose-400" />
                </button>
                <CrossoverDesigner
                  acoustics={acoustics}
                  setAcoustics={setAcoustics}
                  crossoverResults={acousticResults.crossover}
                  firReport={acousticResults.firReport}
                  onOpenPcbWorkspace={() => {
                    setIsCrossoverModalOpen(false);
                    setCrossoverSubView('pcb_stack');
                    setActiveWorkspace('crossover_pcb');
                  }}
                />
              </div>
            </div>
          )}

          {isCustomDriverOpen && (
            <CustomDriverModal
              currentDriver={acoustics.driverAssignments.woofer.driver}
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
