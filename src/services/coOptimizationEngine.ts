import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticCalculationResult,
  type AcousticParameters,
  type CaliberDeltaEvent,
  type CoOptimizationConfig,
  type EnclosureDimensions,
  type SpeakerCategory,
  type SpeakerSubcategory,
} from '../types/loudspeaker.ts';
import {
  calculateAcoustics,
  calculateOptimalAlignment,
  DEFAULT_PROCEDURAL_DIFFUSER_CONFIG,
  getDriversForSubcategory,
  MATERIAL_SPECS,
} from './acousticEngine.ts';
import { autoResolveBaffleClashes } from './baffleLayoutEngine.ts';

export const DEFAULT_CO_OPTIMIZATION_CONFIG: CoOptimizationConfig = {
  enabled: true,
  lockCabinetDimensions: false,
  lockPortGeometry: false,
  lockThermalVents: false,
  lockStructuralBracing: false,
  lockCrossoverNetwork: false,
};

/**
 * Sizes the bass-reflex port cross-sectional area, flare radius, and port count
 * so both small-signal and rated-power air velocity remain strictly laminar below
 * the archetype limit and the 34 m/s Mach chuffing boundary.
 */
export function sizeLaminarPortForAlignment(
  dims: EnclosureDimensions,
  ac: AcousticParameters,
  refResults: AcousticCalculationResult,
  turbulenceFactor = 1.0
): AcousticParameters {
  const woofer = ac.driverAssignments.woofer.driver;
  const wooferQty =
    dims.subcategory === 'dual_18_reflex'
      ? 2
      : ac.topology === 'mtm'
      ? 2
      : ac.driverAssignments.woofer.quantity || 1;

  const material = MATERIAL_SPECS[dims.material] || MATERIAL_SPECS.baltic_birch_18;
  const t = dims.baffleThicknessMm || material.nominalThicknessMm || 18;

  const catSpec =
    CATEGORY_SPECS[dims.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
  const maxVelMs = catSpec.maxRecommendedPortVelocityMs || 14.0;
  const totalSdM2 = (woofer.sd || 500) * wooferQty * 1e-4;
  const xmaxM = (woofer.xmax || 5) * 1e-3;
  const vdM3 = totalSdM2 * xmaxM;
  const fb = Math.max(18, ac.targetFb || 35);

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
}

/**
 * Computes the depth adjustment required to maintain a target net internal volume (Vb)
 * while preserving the front baffle width and height.
 */
function compensateDepthForTargetVb(
  dims: EnclosureDimensions,
  ac: AcousticParameters,
  targetNetVbLiters: number
): { updatedDims: EnclosureDimensions; depthDeltaMm: number } {
  const currentRes = calculateAcoustics(dims, ac);
  const vbErrorLiters = targetNetVbLiters - currentRes.netVolumeLiters;
  if (Math.abs(vbErrorLiters) < 0.25) {
    return { updatedDims: dims, depthDeltaMm: 0 };
  }

  const material = MATERIAL_SPECS[dims.material] || MATERIAL_SPECS.baltic_birch_18;
  const wallT = dims.baffleThicknessMm || material.nominalThicknessMm || 18;
  const intW = Math.max(80, dims.externalWidthMm - 2 * wallT);
  const intH = Math.max(80, dims.externalHeightMm - 2 * wallT);
  const intCrossSectionAreaMm2 = intW * intH;

  // Account for bracing multiplier (~8% to 14% of added gross volume)
  const bracingFactor =
    ac.bracingLevel === 'heavy' ? 0.86 : ac.bracingLevel === 'standard' ? 0.92 : 0.96;
  const requiredGrossDeltaMm3 = (vbErrorLiters * 1e6) / bracingFactor;
  const rawDepthDeltaMm = Math.round(requiredGrossDeltaMm3 / Math.max(10000, intCrossSectionAreaMm2));

  const woofer = ac.driverAssignments.woofer.driver;
  const minSafeDepthMm = Math.round(
    (woofer.mountingDepthMm || 110) + (woofer.magnetDepthMm || 40) + 55 + 2 * wallT
  );
  const maxSafeDepthMm = Math.min(820, Math.round(dims.externalWidthMm * 1.95));

  const nextDepthMm = Math.max(
    minSafeDepthMm,
    Math.min(maxSafeDepthMm, dims.externalDepthMm + rawDepthDeltaMm)
  );
  const actualDeltaMm = nextDepthMm - dims.externalDepthMm;

  if (actualDeltaMm === 0) {
    return { updatedDims: dims, depthDeltaMm: 0 };
  }

  return {
    updatedDims: {
      ...dims,
      externalDepthMm: nextDepthMm,
    },
    depthDeltaMm: actualDeltaMm,
  };
}

/**
 * Synchronous Closed-Loop Multiphysics Co-Optimization Solver.
 * Intercepts feature toggles and parameter changes to ensure every manipulation
 * enhances overall loudspeaker quality across all coupled subsystems while respecting
 * user-specified subsystem locks and never fighting the user's direct edit axis.
 */
export function runClosedLoopCoOptimization(
  prevDims: EnclosureDimensions,
  prevAcoustics: AcousticParameters,
  nextDims: EnclosureDimensions,
  nextAcoustics: AcousticParameters,
  config: CoOptimizationConfig = DEFAULT_CO_OPTIMIZATION_CONFIG,
  triggerLabel?: string
): {
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  results: AcousticCalculationResult;
  deltaEvent: CaliberDeltaEvent;
} {
  const prevResults = calculateAcoustics(prevDims, prevAcoustics);
  const rawNextResults = calculateAcoustics(nextDims, nextAcoustics);

  if (!config.enabled) {
    const prevScore = prevResults.caliberReport?.overallScore ?? 90;
    const currScore = rawNextResults.caliberReport?.overallScore ?? 90;
    return {
      dimensions: nextDims,
      acoustics: nextAcoustics,
      results: rawNextResults,
      deltaEvent: {
        timestamp: Date.now(),
        previousScore: prevScore,
        currentScore: currScore,
        deltaScore: Math.round((currScore - prevScore) * 10) / 10,
        triggerDescription: triggerLabel || 'Manual Adjustment (Co-Optimizer Paused)',
        coOptimizedActions: [],
        vbDriftLiters:
          Math.round((rawNextResults.netVolumeLiters - prevResults.netVolumeLiters) * 10) / 10,
        compressionDeltaDb:
          Math.round(
            (rawNextResults.klippelThermal.powerCompressionDb -
              prevResults.klippelThermal.powerCompressionDb) *
              100
          ) / 100,
      },
    };
  }

  let workingDims: EnclosureDimensions = { ...nextDims };
  let workingAcoustics: AcousticParameters = { ...nextAcoustics };
  const coOptimizedActions: string[] = [];

  // Detect primary user edit intent so we never fight the exact control the user manipulated
  const userEditedExtDims =
    prevDims.externalWidthMm !== nextDims.externalWidthMm ||
    prevDims.externalHeightMm !== nextDims.externalHeightMm ||
    prevDims.externalDepthMm !== nextDims.externalDepthMm;

  const userEditedPort =
    prevAcoustics.portDiameterMm !== nextAcoustics.portDiameterMm ||
    prevAcoustics.slotWidthMm !== nextAcoustics.slotWidthMm ||
    prevAcoustics.slotHeightMm !== nextAcoustics.slotHeightMm ||
    prevAcoustics.flareRadiusMm !== nextAcoustics.flareRadiusMm ||
    prevAcoustics.numberOfPorts !== nextAcoustics.numberOfPorts ||
    prevAcoustics.portType !== nextAcoustics.portType;

  const prevThermalEnabled = Boolean(
    prevDims.thermalVentConfig?.enabled ?? prevDims.hardware?.showThermalVentSlots
  );
  const nextThermalEnabled = Boolean(
    nextDims.thermalVentConfig?.enabled ?? nextDims.hardware?.showThermalVentSlots
  );
  const userEditedThermal =
    prevThermalEnabled !== nextThermalEnabled ||
    prevDims.thermalVentConfig?.sizingMode !== nextDims.thermalVentConfig?.sizingMode ||
    prevDims.thermalVentConfig?.manualSlotCount !== nextDims.thermalVentConfig?.manualSlotCount ||
    prevDims.thermalVentConfig?.manualSlotWidthMm !== nextDims.thermalVentConfig?.manualSlotWidthMm;

  const userEditedBracing = prevAcoustics.bracingLevel !== nextAcoustics.bracingLevel;

  const userEditedCrossover =
    prevAcoustics.crossoverLowHz !== nextAcoustics.crossoverLowHz ||
    prevAcoustics.crossoverHighHz !== nextAcoustics.crossoverHighHz ||
    prevAcoustics.driverAssignments.tweeter.attenuationDb !==
      nextAcoustics.driverAssignments.tweeter.attenuationDb ||
    prevAcoustics.driverAssignments.midrange.attenuationDb !==
      nextAcoustics.driverAssignments.midrange.attenuationDb;

  const userEditedTuningTarget =
    prevAcoustics.targetFb !== nextAcoustics.targetFb ||
    prevAcoustics.targetQtc !== nextAcoustics.targetQtc;

  const userChangedDriverOrTopology =
    prevAcoustics.driverAssignments.woofer.driver.id !==
      nextAcoustics.driverAssignments.woofer.driver.id ||
    prevAcoustics.driverAssignments.woofer.quantity !==
      nextAcoustics.driverAssignments.woofer.quantity ||
    prevAcoustics.topology !== nextAcoustics.topology ||
    prevAcoustics.alignment !== nextAcoustics.alignment ||
    prevDims.category !== nextDims.category ||
    prevDims.subcategory !== nextDims.subcategory;

  const woofer = workingAcoustics.driverAssignments.woofer.driver;
  const wooferQty =
    workingDims.subcategory === 'dual_18_reflex'
      ? 2
      : workingAcoustics.topology === 'mtm'
      ? 2
      : workingAcoustics.driverAssignments.woofer.quantity || 1;
  const optimal = calculateOptimalAlignment(woofer, workingAcoustics.alignment);
  const targetOptimalVbLiters = optimal.optimalVbLiters * wooferQty;

  // --- SUBSYSTEM 2: Thermal Compression & Rear Thermal Vents Auto-Scaling ---
  if (!config.lockThermalVents && !userEditedThermal) {
    const prelimThermal = rawNextResults.thermalVentReport;
    const totalContinuousPeW = prelimThermal?.driverContinuousPowerW || woofer.pe * wooferQty;
    const currentThermalEnabled = Boolean(
      workingDims.thermalVentConfig?.enabled ?? workingDims.hardware?.showThermalVentSlots
    );

    // Enable and auto-scale Rear Thermal Vents when driver continuous power >= 250W or thermal compression > 1.0 dB
    if (
      !currentThermalEnabled &&
      (totalContinuousPeW >= 250 || rawNextResults.klippelThermal.powerCompressionDb > 1.0)
    ) {
      workingDims = {
        ...workingDims,
        hardware: {
          ...(workingDims.hardware ||
            CATEGORY_SPECS[workingDims.category || 'studio_monitor'].defaultHardware),
          showThermalVentSlots: true,
        },
        thermalVentConfig: {
          ...(workingDims.thermalVentConfig || {}),
          enabled: true,
          sizingMode: 'auto_driver_pe',
          hasInternalHermeticHeatExchanger: true,
        },
      };
      const updatedVentRep = calculateAcoustics(workingDims, workingAcoustics).thermalVentReport;
      coOptimizedActions.push(
        `Rear Vents Auto-Scaled (${updatedVentRep?.slotCount || 6} slots for ${totalContinuousPeW}W Pe)`
      );
    }
  }

  // --- SUBSYSTEM 3: Structural Eigenmode & Wall Compliance Auto-Upgrade ---
  if (!config.lockStructuralBracing && !userEditedBracing) {
    const checkRes = calculateAcoustics(workingDims, workingAcoustics);
    const panelRatio = checkRes.caliberReport?.panelEigenfrequencyRatio ?? 2.0;

    if (panelRatio < 1.45 && workingAcoustics.bracingLevel !== 'heavy') {
      const nextBrace = workingAcoustics.bracingLevel === 'minimal' ? 'standard' : 'heavy';
      workingAcoustics = {
        ...workingAcoustics,
        bracingLevel: nextBrace,
        braceApertureChamferDeg: Math.max(45, workingAcoustics.braceApertureChamferDeg ?? 45),
      };
      coOptimizedActions.push(`Bracing → ${nextBrace.toUpperCase()} (f11 Modal Guard)`);
    }

    if (checkRes.mechanics?.wallComplianceWarning) {
      workingDims = {
        ...workingDims,
        baffleThicknessMm: Math.max(18, workingDims.baffleThicknessMm || 18),
        perimeterShells: Math.max(6, workingDims.perimeterShells ?? 6),
        infillPercent: Math.max(40, workingDims.infillPercent ?? 40),
      };
      coOptimizedActions.push('3D Wall Stiffened (6 Shells / 40% Gyroid)');
    }
  }

  // --- SUBSYSTEM 1: Iso-Volume & Thiele-Small Alignment Compensation ---
  if (!config.lockCabinetDimensions && !userEditedExtDims) {
    const material = MATERIAL_SPECS[workingDims.material] || MATERIAL_SPECS.baltic_birch_18;
    const t = workingDims.baffleThicknessMm || material.nominalThicknessMm || 18;

    if (userChangedDriverOrTopology) {
      // Align target Fb / Qtc and Golden Ratio enclosure volume to the newly selected driver/topology
      if (!userEditedTuningTarget) {
        workingAcoustics = {
          ...workingAcoustics,
          targetFb: optimal.optimalFbHz,
          targetQtc: optimal.targetQtc,
        };
      }

      const targetGrossLiters = targetOptimalVbLiters * 1.15;
      const aspectH =
        workingAcoustics.topology === 'three_way' || workingAcoustics.topology === 'mtm'
          ? 1.85
          : 1.618;
      const aspectD = 1.25;
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

      workingDims = {
        ...workingDims,
        externalWidthMm: newW,
        externalHeightMm: newH,
        externalDepthMm: newD,
      };

      // Fine-tune depth so net Vb matches targetOptimalVbLiters after internal displacements
      const fineTuned = compensateDepthForTargetVb(workingDims, workingAcoustics, targetOptimalVbLiters);
      workingDims = fineTuned.updatedDims;
      coOptimizedActions.push(
        `Cabinet Aligned (${ Math.round(targetOptimalVbLiters * 10) / 10 }L @ ${optimal.optimalFbHz}Hz)`
      );
    } else {
      // An internal feature toggle (Thermal Vents, Bracing, TPMS Matrix, Diffuser, Material Thickness)
      // changed internal volume displacement. Compensate depth to hold net Vb constant!
      const referenceVbLiters =
        Math.abs(prevResults.netVolumeLiters - targetOptimalVbLiters) <=
        Math.max(3.5, targetOptimalVbLiters * 0.12)
          ? prevResults.netVolumeLiters
          : targetOptimalVbLiters;

      const { updatedDims, depthDeltaMm } = compensateDepthForTargetVb(
        workingDims,
        workingAcoustics,
        referenceVbLiters
      );
      if (depthDeltaMm !== 0) {
        workingDims = updatedDims;
        coOptimizedActions.push(
          `Depth ${depthDeltaMm > 0 ? `+${depthDeltaMm}` : depthDeltaMm}mm (Iso-Vb ${referenceVbLiters}L)`
        );
      }
    }
  } else if (userEditedExtDims && !userEditedTuningTarget && !config.lockPortGeometry) {
    // When the user intentionally resizes the cabinet, adapt damping fill to optimize Qtc/standing waves
    const resizedRes = calculateAcoustics(workingDims, workingAcoustics);
    if (resizedRes.dampingAdvisor) {
      workingAcoustics = {
        ...workingAcoustics,
        dampingFillPercent: resizedRes.dampingAdvisor.recommendedFillPercent,
        absorptionMaterialType: resizedRes.dampingAdvisor.recommendedMaterial,
      };
    }
  }

  // --- SUBSYSTEM 4: Electro-Acoustic Crossover, Zobel & Baffle-Step Synchronization ---
  if (!config.lockCrossoverNetwork && !userEditedCrossover) {
    const tweeter = workingAcoustics.driverAssignments.tweeter.driver;
    const midrange = workingAcoustics.driverAssignments.midrange.driver;

    if (
      userChangedDriverOrTopology ||
      prevDims.externalWidthMm !== workingDims.externalWidthMm
    ) {
      // Synchronize tweeter & midrange L-pad attenuation to match woofer sensitivity
      const optimalTweeterPadDb = Math.max(
        0,
        Math.min(12, Math.round((tweeter.splSensitivityDb - woofer.splSensitivityDb) * 2) / 2)
      );
      const optimalMidPadDb = Math.max(
        0,
        Math.min(12, Math.round((midrange.splSensitivityDb - woofer.splSensitivityDb) * 2) / 2)
      );

      // Compute optimal crossover frequency from woofer beaming & tweeter Fs safety (2.2 * Fs)
      const pistonDiaM = Math.sqrt(((woofer.sd || 220) * 1e-4 * 4) / Math.PI);
      const wooferBeamingHz = Math.round(343 / (Math.PI * Math.max(0.08, pistonDiaM)));
      const minTweeterSafeHz = Math.round((tweeter.fs || 850) * 2.2);
      const optimalXoLowHz =
        workingAcoustics.topology === 'three_way'
          ? Math.max(350, Math.min(850, Math.round(wooferBeamingHz * 0.55)))
          : Math.max(1400, Math.min(3200, Math.max(minTweeterSafeHz, wooferBeamingHz)));

      const padChanged =
        Math.abs(
          (workingAcoustics.driverAssignments.tweeter.attenuationDb ?? 0) - optimalTweeterPadDb
        ) > 0.5;

      workingAcoustics = {
        ...workingAcoustics,
        crossoverLowHz: optimalXoLowHz,
        driverAssignments: {
          ...workingAcoustics.driverAssignments,
          tweeter: {
            ...workingAcoustics.driverAssignments.tweeter,
            attenuationDb: optimalTweeterPadDb,
          },
          midrange: {
            ...workingAcoustics.driverAssignments.midrange,
            attenuationDb: optimalMidPadDb,
          },
        },
      };

      if (padChanged) {
        coOptimizedActions.push(`HF Pad ${optimalTweeterPadDb}dB & Xover ${optimalXoLowHz}Hz Synced`);
      }
    }

    // Ensure front baffle edge radius suppresses diffraction (r_edge >= lambda / 8)
    const waveCheck = calculateAcoustics(workingDims, workingAcoustics);
    if (waveCheck.waveguide && !waveCheck.waveguide.isDiffractionSuppressed) {
      const targetEdgeMm = Math.max(
        workingAcoustics.baffleEdgeRadiusMm || (workingDims.baffleThicknessMm || 18),
        Math.ceil(waveCheck.waveguide.minBaffleEdgeRadiusMm)
      );
      workingAcoustics = {
        ...workingAcoustics,
        baffleEdgeRadiusMm: targetEdgeMm,
      };
      coOptimizedActions.push(`Baffle Edge R${targetEdgeMm}mm (λ/8 Diffraction)`);
    }
  }

  // --- SUBSYSTEM 5: Laminar Port Velocity Sizing & 3D Clash Resolution ---
  const midResults = calculateAcoustics(workingDims, workingAcoustics);
  const catSpec =
    CATEGORY_SPECS[workingDims.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
  const categoryMaxVelMs = catSpec.maxRecommendedPortVelocityMs || 14.0;

  if (
    !config.lockPortGeometry &&
    !userEditedPort &&
    workingAcoustics.alignment !== 'sealed' &&
    (midResults.isChuffingRisk || midResults.portAirVelocityMs > categoryMaxVelMs)
  ) {
    const midTurb = midResults.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
    workingAcoustics = sizeLaminarPortForAlignment(
      workingDims,
      workingAcoustics,
      midResults,
      midTurb
    );
    coOptimizedActions.push('Laminar Port Sized');
  }

  // Resolve any 2D/3D Baffle or Internal Depth Clashes
  if (!config.lockCabinetDimensions || !config.lockPortGeometry) {
    const preClashRes = calculateAcoustics(workingDims, workingAcoustics);
    if (
      preClashRes.layout?.hasCollision ||
      preClashRes.layout?.airflowInterference?.hasInterference
    ) {
      const resolved = autoResolveBaffleClashes(workingDims, workingAcoustics, preClashRes);
      if (!config.lockCabinetDimensions && !userEditedExtDims) {
        workingDims = resolved.dimensions;
      }
      if (!config.lockPortGeometry && !userEditedPort) {
        workingAcoustics = resolved.acoustics;
      }
      coOptimizedActions.push('3D Clash Auto-Cleared');
    }
  }

  // Resolve any SpeakON / Rear Terminal Capacity or Depth Clash
  const preTermRes = calculateAcoustics(workingDims, workingAcoustics);
  if (
    preTermRes.speakonReport &&
    (preTermRes.speakonReport.hasChannelCapacityWarning ||
      preTermRes.speakonReport.isProhibitedConfiguration ||
      preTermRes.speakonReport.overallClashStatus !== 'clear')
  ) {
    const nextMode = preTermRes.speakonReport.recommendedResolutionModel || 'auto';
    const nextDishDepth =
      preTermRes.speakonReport.overallClashStatus !== 'clear'
        ? 10
        : workingDims.speakonConfig?.recessedDishDepthMm ?? 18;
    workingDims = {
      ...workingDims,
      speakonConfig: {
        ...(workingDims.speakonConfig || {}),
        selectionMode: nextMode,
        wiringArchitecture: 'auto',
        recessedDishDepthMm: nextDishDepth,
      },
    };
    coOptimizedActions.push('Rear Terminal Verified');
  }

  const finalResults = calculateAcoustics(workingDims, workingAcoustics);
  const prevScore = prevResults.caliberReport?.overallScore ?? 90;
  const currScore = finalResults.caliberReport?.overallScore ?? 95;
  const deltaScore = Math.round((currScore - prevScore) * 10) / 10;

  return {
    dimensions: workingDims,
    acoustics: workingAcoustics,
    results: finalResults,
    deltaEvent: {
      timestamp: Date.now(),
      previousScore: prevScore,
      currentScore: currScore,
      deltaScore,
      triggerDescription: triggerLabel || 'Closed-Loop Co-Optimization',
      coOptimizedActions,
      vbDriftLiters:
        Math.round((finalResults.netVolumeLiters - prevResults.netVolumeLiters) * 10) / 10,
      compressionDeltaDb:
        Math.round(
          (finalResults.klippelThermal.powerCompressionDb -
            prevResults.klippelThermal.powerCompressionDb) *
            100
        ) / 100,
    },
  };
}

/**
 * Full 8-Stage Master Reference Optimizer (used by one-click Auto-Optimize and initial setup)
 * Unconditionally brings all subsystems to Master Reference caliber.
 */
export function computeFullMasterOptimizationPlan(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  acousticResults: AcousticCalculationResult
) {
  let candidateDims: EnclosureDimensions = { ...dimensions };
  let candidateAcoustics: AcousticParameters = { ...acoustics };
  const actionsTaken: string[] = [];

  // Stage 0A: Transducer Compatibility Mismatch Resolution
  const hasDriverMismatch = Boolean(
    acousticResults.driverCompatibility &&
      acousticResults.driverCompatibility.status !== 'optimal'
  );
  if (hasDriverMismatch) {
    const activeCat: SpeakerCategory = candidateDims.category || 'studio_monitor';
    const activeSub: SpeakerSubcategory =
      candidateDims.subcategory || CATEGORY_SPECS[activeCat].defaultSubcategory;
    const compatiblePool = getDriversForSubcategory(activeSub, activeCat, false);
    const bestDriver = compatiblePool[0];
    if (
      bestDriver &&
      bestDriver.id !== candidateAcoustics.driverAssignments.woofer.driver.id
    ) {
      candidateAcoustics = {
        ...candidateAcoustics,
        driverAssignments: {
          ...candidateAcoustics.driverAssignments,
          woofer: {
            ...candidateAcoustics.driverAssignments.woofer,
            driver: bestDriver,
          },
        },
      };
      actionsTaken.push('Driver Matched');
    }
  }

  // Stage 0B: 3D Filament Wall Compliance Resolution
  const hasWallComplianceWarning = Boolean(acousticResults.mechanics?.wallComplianceWarning);
  if (hasWallComplianceWarning) {
    candidateDims = {
      ...candidateDims,
      baffleThicknessMm: Math.max(18, candidateDims.baffleThicknessMm || 18),
      perimeterShells: Math.max(6, candidateDims.perimeterShells ?? 6),
      infillPercent: Math.max(40, candidateDims.infillPercent ?? 40),
    };
    actionsTaken.push('Wall Stiffened');
  }

  // Stage 0C: SpeakON Terminal Channel Capacity & Depth Clash Resolution
  const hasTerminalWarning = Boolean(
    acousticResults.speakonReport &&
      (acousticResults.speakonReport.hasChannelCapacityWarning ||
        acousticResults.speakonReport.isProhibitedConfiguration ||
        acousticResults.speakonReport.overallClashStatus !== 'clear')
  );
  if (hasTerminalWarning && acousticResults.speakonReport) {
    const nextMode =
      acousticResults.speakonReport.recommendedResolutionModel || 'auto';
    const nextDishDepth =
      acousticResults.speakonReport.overallClashStatus !== 'clear'
        ? 10
        : candidateDims.speakonConfig?.recessedDishDepthMm ?? 18;
    candidateDims = {
      ...candidateDims,
      speakonConfig: {
        ...(candidateDims.speakonConfig || {}),
        selectionMode: nextMode,
        wiringArchitecture: 'auto',
        recessedDishDepthMm: nextDishDepth,
      },
    };
    actionsTaken.push('Terminal Resolved');
  }

  // Stage 0D: Baffle Edge Diffraction Suppression (r_edge >= lambda / 8)
  const material = MATERIAL_SPECS[candidateDims.material] || MATERIAL_SPECS.baltic_birch_18;
  const t = candidateDims.baffleThicknessMm || material.nominalThicknessMm;
  const hasDiffractionWarning = Boolean(
    acousticResults.waveguide && !acousticResults.waveguide.isDiffractionSuppressed
  );
  if (hasDiffractionWarning && acousticResults.waveguide) {
    const targetEdgeMm = Math.max(
      candidateAcoustics.baffleEdgeRadiusMm || t,
      Math.ceil(acousticResults.waveguide.minBaffleEdgeRadiusMm)
    );
    candidateAcoustics = {
      ...candidateAcoustics,
      baffleEdgeRadiusMm: targetEdgeMm,
    };
    actionsTaken.push('Edge Diffraction Suppressed');
  }

  // Stage 0E: Standing Wave High-Risk Mitigation (Enable Schroeder QRD Diffuser)
  const hasStandingWaveRisk = Boolean(
    acousticResults.standingWaves.standingWaveRiskLevel === 'high' &&
      !candidateAcoustics.diffuserConfig?.enabled &&
      !candidateAcoustics.integralMatrixConfig?.enabled
  );
  if (hasStandingWaveRisk) {
    const nextDiffuser = {
      ...DEFAULT_PROCEDURAL_DIFFUSER_CONFIG,
      ...(candidateAcoustics.diffuserConfig || {}),
      enabled: true,
      designFreqHz: acousticResults.standingWaves.axialDepthHz || 1200,
    };
    candidateAcoustics = {
      ...candidateAcoustics,
      diffuserConfig: nextDiffuser,
    };
    candidateDims = {
      ...candidateDims,
      diffuserConfig: nextDiffuser,
    };
    actionsTaken.push('QRD Diffuser Enabled');
  }

  // Stage 0F: Rear Thermal Ventilation Slots Activation for High Thermal Load / Power Compression
  const woofer = candidateAcoustics.driverAssignments.woofer.driver;
  const wooferQty =
    candidateDims.subcategory === 'dual_18_reflex'
      ? 2
      : candidateAcoustics.topology === 'mtm'
      ? 2
      : candidateAcoustics.driverAssignments.woofer.quantity || 1;
  const totalContinuousPeW =
    acousticResults.thermalVentReport?.driverContinuousPowerW || woofer.pe * wooferQty;
  const isThermalVentsActive = Boolean(
    candidateDims.thermalVentConfig?.enabled ?? candidateDims.hardware?.showThermalVentSlots
  );
  const needsThermalVents =
    !isThermalVentsActive &&
    (totalContinuousPeW >= 250 || acousticResults.klippelThermal.powerCompressionDb > 1.0);
  if (needsThermalVents) {
    candidateDims = {
      ...candidateDims,
      hardware: {
        ...(candidateDims.hardware ||
          CATEGORY_SPECS[candidateDims.category || 'studio_monitor'].defaultHardware),
        showThermalVentSlots: true,
      },
      thermalVentConfig: {
        ...(candidateDims.thermalVentConfig || {}),
        enabled: true,
        sizingMode: 'auto_driver_pe',
        hasInternalHermeticHeatExchanger: true,
      },
    };
    actionsTaken.push('Rear Thermal Vents Enabled');
  }

  // Stage 0G: Rayleigh-Ritz Structural Eigenmode & Karal-Fok Brace Chamfer Upgrade
  const panelEigenRatio = acousticResults.caliberReport?.panelEigenfrequencyRatio ?? 2.0;
  const needsBracingUpgrade =
    panelEigenRatio < 1.45 && candidateAcoustics.bracingLevel !== 'heavy';
  if (needsBracingUpgrade) {
    candidateAcoustics = {
      ...candidateAcoustics,
      bracingLevel: candidateAcoustics.bracingLevel === 'minimal' ? 'standard' : 'heavy',
      braceApertureChamferDeg: Math.max(45, candidateAcoustics.braceApertureChamferDeg ?? 45),
    };
    actionsTaken.push('Bracing Upgraded');
  }

  // Stage 0H: Electro-Acoustic Tweeter L-Pad & Crossover Synchronization
  const tweeter = candidateAcoustics.driverAssignments.tweeter.driver;
  const idealTweeterPadDb = Math.max(
    0,
    Math.min(12, Math.round((tweeter.splSensitivityDb - woofer.splSensitivityDb) * 2) / 2)
  );
  const hasCrossoverPadMismatch =
    candidateAcoustics.topology !== 'single' &&
    Math.abs(
      (candidateAcoustics.driverAssignments.tweeter.attenuationDb ?? 0) - idealTweeterPadDb
    ) > 2.5;
  if (hasCrossoverPadMismatch) {
    candidateAcoustics = {
      ...candidateAcoustics,
      driverAssignments: {
        ...candidateAcoustics.driverAssignments,
        tweeter: {
          ...candidateAcoustics.driverAssignments.tweeter,
          attenuationDb: idealTweeterPadDb,
        },
      },
    };
    actionsTaken.push('Crossover Pad Synced');
  }

  const optimal = calculateOptimalAlignment(woofer, candidateAcoustics.alignment);
  const activeCatSpec =
    CATEGORY_SPECS[candidateDims.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
  const categoryMaxVelMs = activeCatSpec.maxRecommendedPortVelocityMs || 14.0;

  const targetNetLiters = optimal.optimalVbLiters * wooferQty;
  const hasVolumeMismatch =
    Math.abs(acousticResults.netVolumeLiters - targetNetLiters) >
    Math.max(3.5, targetNetLiters * 0.12);
  const hasTuningMismatch =
    candidateAcoustics.alignment === 'ported'
      ? Math.abs(
          (candidateAcoustics.targetFb || acousticResults.tuningFrequencyFb) - optimal.optimalFbHz
        ) > 1.5
      : Math.abs((candidateAcoustics.targetQtc || acousticResults.boxQtc) - optimal.targetQtc) >
        0.04;
  const hasPortTurbulence =
    candidateAcoustics.alignment === 'ported' &&
    (acousticResults.isChuffingRisk || acousticResults.portAirVelocityMs > categoryMaxVelMs);
  const hasClash = Boolean(
    acousticResults.layout?.hasCollision ||
      acousticResults.layout?.airflowInterference?.hasInterference
  );

  // Stage 1: Volume & Tuning Alignment (Golden Ratio proportions + exact Iso-Vb depth trim)
  if (hasVolumeMismatch || hasStandingWaveRisk || needsThermalVents || needsBracingUpgrade) {
    const targetGrossLiters = targetNetLiters * 1.15;
    const aspectH =
      candidateAcoustics.topology === 'three_way' || candidateAcoustics.topology === 'mtm'
        ? 1.85
        : 1.618;
    const aspectD = 1.25;
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

    const trimmed = compensateDepthForTargetVb(candidateDims, candidateAcoustics, targetNetLiters);
    candidateDims = trimmed.updatedDims;
  }

  if (hasVolumeMismatch || hasTuningMismatch) {
    candidateAcoustics = {
      ...candidateAcoustics,
      targetFb: optimal.optimalFbHz,
      targetQtc: optimal.targetQtc,
    };
    actionsTaken.push('Vb/Fb Aligned');
  }

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

  // Stage 2: Laminar Port Velocity Sizing
  if (needsPortSizing) {
    const midTurb = midResults.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
    candidateAcoustics = sizeLaminarPortForAlignment(
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

  if (
    finalAcoustics.alignment !== 'sealed' &&
    (finalRes.isChuffingRisk || finalRes.portAirVelocityMs > categoryMaxVelMs)
  ) {
    const postTurb = finalRes.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
    finalAcoustics = sizeLaminarPortForAlignment(finalDims, finalAcoustics, finalRes, postTurb);
    finalRes = calculateAcoustics(finalDims, finalAcoustics);
    if (!actionsTaken.includes('Laminar Port Sized')) {
      actionsTaken.push('Laminar Port Sized');
    }
  }

  const pendingReasons: string[] = [];
  if (hasClash) pendingReasons.push('3D Clash');
  if (hasPortTurbulence) pendingReasons.push('Port Velocity');
  if (hasVolumeMismatch || hasTuningMismatch) pendingReasons.push('Vb/Fb Alignment');
  if (hasDriverMismatch) pendingReasons.push('Driver Match');
  if (hasDiffractionWarning) pendingReasons.push('Edge Diffraction');
  if (hasWallComplianceWarning) pendingReasons.push('3D Wall Compliance');
  if (hasTerminalWarning) pendingReasons.push('SpeakON Terminal');
  if (hasStandingWaveRisk) pendingReasons.push('Standing Waves');
  if (needsThermalVents) pendingReasons.push('Thermal Relief');
  if (needsBracingUpgrade) pendingReasons.push('Modal Bracing');
  if (hasCrossoverPadMismatch) pendingReasons.push('Crossover Sync');

  const hasPendingOptimizations = pendingReasons.length > 0;

  return {
    finalDims,
    finalAcoustics,
    finalRes,
    actionsTaken,
    pendingReasons,
    hasPendingOptimizations,
  };
}
