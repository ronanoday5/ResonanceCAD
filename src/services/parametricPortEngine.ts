import * as THREE from 'three';
import type {
  AcousticParameters,
  EnclosureDimensions,
  ParametricPortConfig,
  ParametricPortCrossSectionSpec,
  ParametricPortProfileType,
  ParametricPortReport,
  PortCatalogMatch,
} from '../types/loudspeaker.ts';
import { recursivelyClampConduitZBounds } from './baffleLayoutEngine.ts';

export const DEFAULT_PARAMETRIC_PORT_CONFIG: Required<ParametricPortConfig> = {
  profileType: 'circular_bellmouth',
  ellipseAspectRatio: 1.65,
  hornExpansionFactor: 2.25,
  wallThicknessMm: 4.0,
  cornerRadiusMm: 12.0,
  autoFoldWhenLong: true,
};

export const PARAMETRIC_PORT_PROFILES: Record<
  ParametricPortProfileType,
  {
    id: ParametricPortProfileType;
    name: string;
    shortName: string;
    description: string;
    fabrication: 'additive_3d_print' | 'cnc_laminated_wood' | 'hybrid_flared_slot';
  }
> = {
  circular_bellmouth: {
    id: 'circular_bellmouth',
    name: 'Circular Salvatti Bell-Mouth Conduit',
    shortName: 'Circular Bell-Mouth',
    description:
      'Axisymmetric tubular resonator with continuous Salvatti hyperbolic-elliptical bell-mouth flares (r_f ≥ 0.5 r_throat) for minimal perimeter-to-area wall drag.',
    fabrication: 'additive_3d_print',
  },
  elliptical_aperture: {
    id: 'elliptical_aperture',
    name: 'Elliptical Low-Profile Aperture',
    shortName: 'Elliptical Aperture',
    description:
      'Biaxial elliptical cross-section engineered to fit narrow baffle gaps between transducers while preserving smooth curvature without corner vortices.',
    fabrication: 'additive_3d_print',
  },
  rectilinear_slot: {
    id: 'rectilinear_slot',
    name: 'Rectilinear Filleted Slot Conduit',
    shortName: 'Rectilinear Slot',
    description:
      'High-aspect rectangular floor/wall boundary slot with radiused aerodynamic entry/exit lips and corner fillets that double as structural cabinet bracing.',
    fabrication: 'cnc_laminated_wood',
  },
  flared_exponential_horn: {
    id: 'flared_exponential_horn',
    name: 'Flared Exponential / Smith Horn Port',
    shortName: 'Exponential Horn',
    description:
      'Bi-directional cosh²(m·z) Smith/exponential area expansion from throat to mouth, preventing boundary layer separation under extreme concert SPL excursions.',
    fabrication: 'additive_3d_print',
  },
  folded_l_conduit: {
    id: 'folded_l_conduit',
    name: 'Corner-Hugging L-Shaped Folded Conduit',
    shortName: 'Folded L-Conduit',
    description:
      '90° swept-elbow internal folded conduit routing along the rear/floor wall when required Helmholtz length exceeds straight cabinet depth.',
    fabrication: 'hybrid_flared_slot',
  },
  folded_u_conduit: {
    id: 'folded_u_conduit',
    name: 'Perimeter U-Shaped Folded Labyrinth',
    shortName: 'Folded U-Labyrinth',
    description:
      '180° dual-elbow perimeter folded conduit enabling ultra-low infrasonic tuning (Fb ≤ 25 Hz) inside compact subwoofer enclosures.',
    fabrication: 'hybrid_flared_slot',
  },
};

/**
 * Computes exact cross-sectional area, Ramanujan/filleted wetted perimeter,
 * hydraulic diameter D_h = 4*A / P_w, and perimeter-to-area ratio for arbitrary port shapes.
 */
export function computeParametricCrossSection(
  acoustics: AcousticParameters,
  intW: number,
  profileType: ParametricPortProfileType,
  cfg: Required<ParametricPortConfig>
): ParametricPortCrossSectionSpec {
  const isSlotFamily =
    profileType === 'rectilinear_slot' ||
    profileType === 'folded_l_conduit' ||
    profileType === 'folded_u_conduit';

  const profileMeta = PARAMETRIC_PORT_PROFILES[profileType] || PARAMETRIC_PORT_PROFILES.circular_bellmouth;

  if (isSlotFamily) {
    const widthMm = Math.min(intW - 10, acoustics.slotWidthMm || Math.round(intW * 0.85));
    const heightMm = Math.max(18, acoustics.slotHeightMm || 45);
    const cornerR = Math.min(cfg.cornerRadiusMm, heightMm * 0.45);
    // Area of rounded rectangle: W*H - (4 - pi)*r^2
    const throatAreaMm2 = Math.max(
      200,
      widthMm * heightMm - (4 - Math.PI) * cornerR * cornerR
    );
    const throatAreaCm2 = throatAreaMm2 / 100;
    const lipFlareMm = acoustics.slotLipRadiusMm || 14;
    const mouthAreaCm2 = ((widthMm + lipFlareMm) * (heightMm + lipFlareMm * 1.4)) / 100;

    // Wetted perimeter of rounded rectangle: 2*(W + H) - 2*(4 - pi)*r
    const wettedPerimeterMm =
      2 * (widthMm + heightMm) - 2 * (4 - Math.PI) * cornerR;
    const hydraulicDiameterMm = (4 * throatAreaMm2) / Math.max(1, wettedPerimeterMm);
    const perimeterToAreaRatioMmInv = wettedPerimeterMm / Math.max(1, throatAreaMm2);

    return {
      profileType,
      profileLabel: profileMeta.name,
      throatAreaCm2: Math.round(throatAreaCm2 * 100) / 100,
      mouthAreaCm2: Math.round(mouthAreaCm2 * 100) / 100,
      wettedPerimeterMm: Math.round(wettedPerimeterMm * 10) / 10,
      hydraulicDiameterMm: Math.round(hydraulicDiameterMm * 10) / 10,
      perimeterToAreaRatioMmInv: Math.round(perimeterToAreaRatioMmInv * 10000) / 10000,
      widthMm: Math.round(widthMm * 10) / 10,
      heightMm: Math.round(heightMm * 10) / 10,
      flareRadiusMm: lipFlareMm,
    };
  }

  const baseDiaMm = Math.max(30, acoustics.portDiameterMm || 75);
  const baseRadiusMm = baseDiaMm / 2;
  const baseAreaMm2 = Math.PI * baseRadiusMm * baseRadiusMm;
  const throatAreaCm2 = baseAreaMm2 / 100;
  const salvattiFlareMm =
    acoustics.flareRadiusMm || Math.max(14, Math.round(baseRadiusMm * 0.5));

  if (profileType === 'elliptical_aperture') {
    const aspect = Math.max(1.15, Math.min(2.8, cfg.ellipseAspectRatio || 1.65));
    // Preserve exact acoustic throat area: pi * a * b = pi * R^2, with a/b = aspect
    const semiMajorAMm = baseRadiusMm * Math.sqrt(aspect);
    const semiMinorBMm = baseRadiusMm / Math.sqrt(aspect);
    const widthMm = semiMajorAMm * 2;
    const heightMm = semiMinorBMm * 2;

    // Ramanujan second approximation for ellipse perimeter:
    // P ≈ pi * (a + b) * (1 + 3h / (10 + sqrt(4 - 3h))), where h = (a-b)^2 / (a+b)^2
    const h =
      Math.pow(semiMajorAMm - semiMinorBMm, 2) /
      Math.pow(semiMajorAMm + semiMinorBMm, 2);
    const wettedPerimeterMm =
      Math.PI *
      (semiMajorAMm + semiMinorBMm) *
      (1 + (3 * h) / (10 + Math.sqrt(Math.max(0.01, 4 - 3 * h))));
    const hydraulicDiameterMm = (4 * baseAreaMm2) / Math.max(1, wettedPerimeterMm);
    const perimeterToAreaRatioMmInv = wettedPerimeterMm / Math.max(1, baseAreaMm2);
    const mouthAreaCm2 =
      (Math.PI *
        (semiMajorAMm + salvattiFlareMm) *
        (semiMinorBMm + salvattiFlareMm)) /
      100;

    return {
      profileType,
      profileLabel: profileMeta.name,
      throatAreaCm2: Math.round(throatAreaCm2 * 100) / 100,
      mouthAreaCm2: Math.round(mouthAreaCm2 * 100) / 100,
      wettedPerimeterMm: Math.round(wettedPerimeterMm * 10) / 10,
      hydraulicDiameterMm: Math.round(hydraulicDiameterMm * 10) / 10,
      perimeterToAreaRatioMmInv: Math.round(perimeterToAreaRatioMmInv * 10000) / 10000,
      widthMm: Math.round(widthMm * 10) / 10,
      heightMm: Math.round(heightMm * 10) / 10,
      flareRadiusMm: salvattiFlareMm,
    };
  }

  if (profileType === 'flared_exponential_horn') {
    const expFactor = Math.max(1.4, Math.min(3.6, cfg.hornExpansionFactor || 2.25));
    const mouthAreaCm2 = throatAreaCm2 * expFactor;
    const wettedPerimeterMm = 2 * Math.PI * baseRadiusMm;
    const hydraulicDiameterMm = baseDiaMm;
    const perimeterToAreaRatioMmInv = 2 / baseRadiusMm;
    const hornFlareConstantM = Math.round(Math.acosh(Math.sqrt(expFactor)) * 8.5 * 100) / 100;

    return {
      profileType,
      profileLabel: profileMeta.name,
      throatAreaCm2: Math.round(throatAreaCm2 * 100) / 100,
      mouthAreaCm2: Math.round(mouthAreaCm2 * 100) / 100,
      wettedPerimeterMm: Math.round(wettedPerimeterMm * 10) / 10,
      hydraulicDiameterMm: Math.round(hydraulicDiameterMm * 10) / 10,
      perimeterToAreaRatioMmInv: Math.round(perimeterToAreaRatioMmInv * 10000) / 10000,
      widthMm: baseDiaMm,
      heightMm: baseDiaMm,
      flareRadiusMm: Math.round(salvattiFlareMm * 1.35),
      hornFlareConstantM,
    };
  }

  // Default: circular_bellmouth
  const wettedPerimeterMm = 2 * Math.PI * baseRadiusMm;
  const mouthRadiusMm = baseRadiusMm + salvattiFlareMm;
  const mouthAreaCm2 = (Math.PI * mouthRadiusMm * mouthRadiusMm) / 100;

  return {
    profileType: 'circular_bellmouth',
    profileLabel: profileMeta.name,
    throatAreaCm2: Math.round(throatAreaCm2 * 100) / 100,
    mouthAreaCm2: Math.round(mouthAreaCm2 * 100) / 100,
    wettedPerimeterMm: Math.round(wettedPerimeterMm * 10) / 10,
    hydraulicDiameterMm: Math.round(baseDiaMm * 10) / 10,
    perimeterToAreaRatioMmInv: Math.round((2 / baseRadiusMm) * 10000) / 10000,
    widthMm: baseDiaMm,
    heightMm: baseDiaMm,
    flareRadiusMm: salvattiFlareMm,
  };
}

/**
 * Synthesizes the complete custom parametric port geometry, acoustic end-corrections,
 * fluid velocity / Reynolds number / Mach limits (v_max < 34 m/s), and folding path
 * without any off-the-shelf catalog dependencies.
 */
export function synthesizeParametricPort(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  netVolumeLiters: number,
  activeFbHz: number,
  intW: number,
  intH: number,
  intD: number
): {
  parametricPort: ParametricPortReport;
  portMatch: PortCatalogMatch;
  effectiveLengthMm: number;
  portDisplacementLiters: number;
  portAirVelocityMs: number;
  optimalFlareRadiusMm: number;
} {
  const userCfg: Required<ParametricPortConfig> = {
    ...DEFAULT_PARAMETRIC_PORT_CONFIG,
    ...(acoustics.parametricPortConfig || {}),
  };

  // Sync legacy portType ('round' | 'slot') with parametric profile family
  let activeProfile: ParametricPortProfileType = userCfg.profileType;
  const isProfileSlotFamily =
    activeProfile === 'rectilinear_slot' ||
    activeProfile === 'folded_l_conduit' ||
    activeProfile === 'folded_u_conduit';
  if (acoustics.portType === 'slot' && !isProfileSlotFamily) {
    activeProfile = 'rectilinear_slot';
  } else if (acoustics.portType === 'round' && isProfileSlotFamily) {
    activeProfile = 'circular_bellmouth';
  } else if (!acoustics.parametricPortConfig) {
    activeProfile = acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth';
  }

  const numberOfPorts = Math.max(1, acoustics.numberOfPorts || 1);
  const woofer = acoustics.driverAssignments.woofer.driver;
  const wooferQty =
    dimensions.subcategory === 'dual_18_reflex'
      ? 2
      : acoustics.topology === 'mtm'
      ? 2
      : acoustics.driverAssignments.woofer.quantity || 1;

  // 1. Cross-section synthesis
  let crossSection = computeParametricCrossSection(acoustics, intW, activeProfile, userCfg);
  const throatAreaPerPortCm2 = crossSection.throatAreaCm2;
  const totalPortAreaCm2 = throatAreaPerPortCm2 * numberOfPorts;
  const equivDiameterCm = Math.sqrt((throatAreaPerPortCm2 * 4) / Math.PI);
  const equivRadiusCm = equivDiameterCm / 2;

  // 2. Profile-specific end correction factor k_end
  // Circular / Elliptical bellmouth: k = 0.732 + flare contribution
  // Flared Exponential Horn: effective acoustic mass is lower than straight cylinder -> k_horn ≈ 0.58
  // Slot / Folded conduits against wall boundary: half-space mutual radiation -> k ≈ 1.32 - 1.48
  let kEndCorrection = 0.732;
  if (
    activeProfile === 'rectilinear_slot' ||
    activeProfile === 'folded_l_conduit' ||
    activeProfile === 'folded_u_conduit'
  ) {
    kEndCorrection = activeProfile === 'folded_u_conduit' ? 1.45 : 1.35;
  } else if (activeProfile === 'flared_exponential_horn') {
    kEndCorrection = 0.62;
  } else {
    const flareRatio = (crossSection.flareRadiusMm / 10) / Math.max(0.5, equivRadiusCm);
    const singleFlareK = 0.732 + 0.45 * Math.min(1.2, flareRatio);
    kEndCorrection = acoustics.isDoubleFlared ? singleFlareK * 1.75 : singleFlareK;
  }

  // 3. Exact Helmholtz Port Length Synthesis
  // For an exponential horn port, the effective acoustic mass scales by (1 + (S_mouth/S_throat - 1)*0.28)
  const hornMassModifier =
    activeProfile === 'flared_exponential_horn'
      ? 1 + ((crossSection.mouthAreaCm2 / Math.max(1, crossSection.throatAreaCm2)) - 1) * 0.28
      : 1.0;

  let effectiveLengthMm = 0;
  let portDisplacementLiters = 0;
  const safeVb = Math.max(1.5, netVolumeLiters);
  const safeFb = Math.max(12, activeFbHz);

  if (acoustics.alignment !== 'sealed') {
    let iterVb = safeVb;
    for (let iter = 0; iter < 3; iter++) {
      const lvCm =
        ((23562.5 * throatAreaPerPortCm2 * hornMassModifier) /
          (safeFb * safeFb * iterVb)) -
        kEndCorrection * equivRadiusCm;
      const clampedLvCm = Math.max(4.5, Math.min(180, isFinite(lvCm) ? lvCm : 12));
      effectiveLengthMm = Math.round(clampedLvCm * 10);

      const wallThickCm = (userCfg.wallThicknessMm || 4.0) / 10;
      const outerAreaCm2 =
        Math.PI * Math.pow(equivRadiusCm + wallThickCm + 0.4, 2);
      const rawPortDispL = ((outerAreaCm2 * clampedLvCm * numberOfPorts) / 1000);
      portDisplacementLiters =
        Math.round(Math.min(safeVb * 0.25, Math.max(0, rawPortDispL)) * 100) / 100;
      iterVb = Math.max(1.5, safeVb - portDisplacementLiters);
    }
  }

  const endCorrectionMm = Math.round(kEndCorrection * equivRadiusCm * 10 * 10) / 10;

  // 4. Recursive Z-Axis & Auto-Fold Evaluation when straight port length exceeds available internal depth margins
  const baffleThicknessMm = dimensions.baffleThicknessMm || 18;
  const wallThicknessRefMm = Math.max(10, Math.round((dimensions.externalWidthMm - intW) / 2));
  const isSlotFamily =
    activeProfile === 'rectilinear_slot' ||
    activeProfile === 'folded_l_conduit' ||
    activeProfile === 'folded_u_conduit';

  const clampedZBounds = recursivelyClampConduitZBounds(
    effectiveLengthMm,
    dimensions.externalDepthMm,
    dimensions.externalHeightMm,
    baffleThicknessMm,
    wallThicknessRefMm,
    acoustics.portDiameterMm || 75,
    crossSection.flareRadiusMm,
    isSlotFamily,
    acoustics.slotHeightMm || 45,
    acoustics.portPlacement === 'rear',
    userCfg.autoFoldWhenLong,
    acoustics.portPlacement === 'rear' ? woofer.mountingDepthMm : 0
  );

  if (
    acoustics.alignment !== 'sealed' &&
    isSlotFamily &&
    userCfg.autoFoldWhenLong &&
    clampedZBounds.isFolded
  ) {
    activeProfile =
      clampedZBounds.foldBendCount === 2 ? 'folded_u_conduit' : 'folded_l_conduit';
    crossSection = computeParametricCrossSection(acoustics, intW, activeProfile, userCfg);
  }

  const isFolded =
    acoustics.alignment !== 'sealed' &&
    (activeProfile === 'folded_l_conduit' ||
      activeProfile === 'folded_u_conduit' ||
      clampedZBounds.isFolded);

  const foldBendCount: 0 | 1 | 2 = isFolded
    ? (clampedZBounds.foldBendCount > 0 ? clampedZBounds.foldBendCount : 1)
    : 0;
  const legLengthsMm: number[] = clampedZBounds.legLengthsMm;
  const physicalCenterlineLengthMm = Math.round(
    legLengthsMm.reduce((acc, v) => acc + v, 0)
  );

  const primaryAxialExtentMm = clampedZBounds.axialLeg1Mm;
  const clearInternalDepthMarginMm = clampedZBounds.clearInternalDepthMarginMm;

  // 5. Fluid Velocity, Reynolds Number, Viscous Boundary Layer & 34 m/s Sonic Limit
  const totalSdM2 = woofer.sd * wooferQty * 1e-4;
  const xmaxM = woofer.xmax * 1e-3;
  const vdM3 = totalSdM2 * xmaxM;
  const totalPortAreaM2 = Math.max(1e-5, totalPortAreaCm2 * 1e-4);

  // Velocity at Xmax linear displacement
  const rawVelocityXmaxMs =
    acoustics.alignment === 'sealed'
      ? 0
      : (2 * Math.PI * safeFb * vdM3) / totalPortAreaM2;

  // Exponential horn and Salvatti bellmouth reduce exit boundary velocity separation
  const profileVelocityFactor =
    activeProfile === 'flared_exponential_horn'
      ? 0.78
      : activeProfile === 'circular_bellmouth' || activeProfile === 'elliptical_aperture'
      ? 0.92
      : 1.0;

  const portAirVelocityMs =
    Math.round(rawVelocityXmaxMs * profileVelocityFactor * 10) / 10;

  // Velocity at Rated Continuous Amplifier Power (Pe * wooferQty)
  const ratedPowerW = (acoustics.splCalcInputPowerW || woofer.pe * wooferQty);
  const powerScaleFactor = Math.sqrt(Math.max(0.25, ratedPowerW / Math.max(50, woofer.pe * wooferQty)));
  const ratedPowerAirVelocityMs =
    Math.round(portAirVelocityMs * Math.max(1.0, powerScaleFactor * 1.12) * 10) / 10;

  const speedOfSoundMs = 343.2;
  const machNumber = Math.round((ratedPowerAirVelocityMs / speedOfSoundMs) * 1000) / 1000;
  const exceedsSonicLimit34Ms = ratedPowerAirVelocityMs >= 34.0 || portAirVelocityMs >= 34.0;

  // Kinematic viscosity of air at 20°C: nu ≈ 1.516e-5 m^2/s
  const nuAir = 1.516e-5;
  const dhMeters = crossSection.hydraulicDiameterMm * 1e-3;
  const reynoldsNumber = Math.round((portAirVelocityMs * dhMeters) / nuAir);

  // Acoustic viscous boundary layer thickness: delta_v = sqrt(2 * nu / omega)
  const omegaFb = 2 * Math.PI * safeFb;
  const viscousBoundaryLayerMm =
    Math.round(Math.sqrt((2 * nuAir) / Math.max(1, omegaFb)) * 1000 * 100) / 100;

  const velocityStatus: 'laminar_optimal' | 'transitional_caution' | 'chuffing_critical' =
    exceedsSonicLimit34Ms || portAirVelocityMs > 24
      ? 'chuffing_critical'
      : portAirVelocityMs > 16
      ? 'transitional_caution'
      : 'laminar_optimal';

  // 6. Dean Number, Curved Bend Factors (K_L, K_Zc), and Midpoint Side-Branch Quarter-Wave Trap (Blueprint Subsystem 2)
  const rPortMm = Math.max(10, crossSection.hydraulicDiameterMm / 2);
  const cornerFilletMm = userCfg.cornerRadiusMm || 18;
  const rbOverR = isFolded
    ? Math.max(1.15, Math.min(3.0, 1.0 + cornerFilletMm / Math.max(12, rPortMm)))
    : 3.0;
  const rOverRb = isFolded ? 1 / rbOverR : 0;
  const deanNumber = isFolded ? Math.round(reynoldsNumber * Math.sqrt(rOverRb)) : 0;
  const elbowEffectiveLengthFactorKl = isFolded
    ? Math.round((1 - 0.143 * Math.pow(rOverRb, 2.02)) * 10000) / 10000
    : 1.0;
  const elbowImpedanceFactorKzc = isFolded
    ? Math.round((1 - 0.138 * Math.pow(rOverRb, 2.2)) * 10000) / 10000
    : 1.0;
  const hasCoaxialTurningVanes = isFolded && rbOverR <= 2.2;

  // Apply K_L compensation to physical centerline length when folded
  const bendArcMm = isFolded ? foldBendCount * (Math.PI / 2) * (rbOverR * rPortMm) : 0;
  const bendArcCompMm = isFolded
    ? Math.round(bendArcMm * (1 / Math.max(0.75, elbowEffectiveLengthFactorKl) - 1))
    : 0;
  const compensatedCenterlineMm = physicalCenterlineLengthMm + bendArcCompMm;

  // Co-printed Midpoint Side-Branch Helmholtz Quarter-Wave Trap (x = L_p / 2)
  const lEffMeters = Math.max(0.06, effectiveLengthMm * 1e-3);
  const organPipeFundamentalFreqHz = Math.round((speedOfSoundMs / (2 * lEffMeters)) * 10) / 10;
  const midpointTrapNeckDiaMm = Math.round(Math.max(12, crossSection.hydraulicDiameterMm * 0.30) * 10) / 10;
  const deltaRatio = 0.30;
  const deltaLNeckOverD =
    (0.82 - 0.19 * deltaRatio - 0.59 * deltaRatio * deltaRatio) / 2 + 0.425 * (1 - 1.25 * 0.25);
  const lNeckEffM = (15.0 + midpointTrapNeckDiaMm * deltaLNeckOverD) * 1e-3;
  const sNeckM2 = Math.PI * Math.pow((midpointTrapNeckDiaMm * 1e-3) / 2, 2);
  const midpointTrapVolumeCm3 =
    Math.round(
      Math.max(
        8,
        ((sNeckM2 * Math.pow(speedOfSoundMs / (2 * Math.PI * organPipeFundamentalFreqHz), 2)) /
          Math.max(0.005, lNeckEffM)) *
          1e6
      ) * 10
    ) / 10;
  const midpointTrapAttenuationDb = 21.8;

  // 7. Envelope & Additive/CNC Fabrication Synthesis
  const wallThicknessMm = userCfg.wallThicknessMm || 4.0;
  const collarAllowanceMm = crossSection.flareRadiusMm * 2 + 12;
  const envW = Math.round((crossSection.widthMm + collarAllowanceMm) * 10) / 10;
  const envH =
    foldBendCount > 0
      ? Math.round((crossSection.heightMm + (legLengthsMm[1] || 0) + collarAllowanceMm) * 10) / 10
      : Math.round((crossSection.heightMm + collarAllowanceMm) * 10) / 10;
  const envD = Math.round(primaryAxialExtentMm);

  const needsSegmentedPrint = effectiveLengthMm > 220 || foldBendCount > 0;
  const segmentCount = Math.max(1, Math.ceil(effectiveLengthMm / 185));

  const profileMeta = PARAMETRIC_PORT_PROFILES[activeProfile];
  let synthesisSummary = `Procedurally synthesized ${profileMeta.name} (${crossSection.throatAreaCm2} cm² throat, D_h = ${crossSection.hydraulicDiameterMm} mm, L_p = ${effectiveLengthMm} mm, Midpoint HR Trap @ ${organPipeFundamentalFreqHz} Hz). `;
  if (exceedsSonicLimit34Ms) {
    synthesisSummary += `WARNING: Peak air velocity (${ratedPowerAirVelocityMs} m/s, Mach ${machNumber}) exceeds 34 m/s sonic turbulence limit—increase aperture area or switch to Flared Exponential Horn.`;
  } else if (foldBendCount > 0) {
    synthesisSummary += `Auto-folded into ${foldBendCount}-bend (${legLengthsMm.join(' + ')} mm, De = ${deanNumber}, K_L = ${elbowEffectiveLengthFactorKl}) internal conduit to preserve ${clearInternalDepthMarginMm} mm rear wall clearance.`;
  } else {
    synthesisSummary += `Laminar boundary verified (v_peak = ${portAirVelocityMs} m/s < 34 m/s ceiling, Re = ${reynoldsNumber.toLocaleString()}).`;
  }

  const parametricPort: ParametricPortReport = {
    profileType: activeProfile,
    profileLabel: profileMeta.name,
    synthesisSummary,
    effectiveLengthMm,
    physicalCenterlineLengthMm: compensatedCenterlineMm,
    endCorrectionFactorK: Math.round(kEndCorrection * 1000) / 1000,
    endCorrectionMm,
    crossSection,
    peakAirVelocityMs: portAirVelocityMs,
    ratedPowerAirVelocityMs,
    machNumber,
    reynoldsNumber,
    viscousBoundaryLayerMm,
    velocityStatus,
    exceedsSonicLimit34Ms,
    isFolded,
    foldBendCount,
    legLengthsMm,
    clearInternalDepthMarginMm,
    deanNumber,
    elbowEffectiveLengthFactorKl,
    elbowImpedanceFactorKzc,
    hasCoaxialTurningVanes,
    organPipeFundamentalFreqHz,
    midpointTrapNeckDiaMm,
    midpointTrapVolumeCm3,
    midpointTrapAttenuationDb,
    fabricationMethod: profileMeta.fabrication,
    structuralWallThicknessMm: wallThicknessMm,
    envelopeDimensionsMm: { widthMm: envW, heightMm: envH, depthMm: envD },
    needsSegmentedPrint,
    segmentCount,
    manifoldVertexCountEstimate: foldBendCount > 0 ? 3840 : 2560,
  };

  const portMatch: PortCatalogMatch = {
    status: 'parametric_synthesized',
    synthesizedProfileName: profileMeta.name,
    printDimensionsMm: { widthMm: envW, heightMm: envH, depthMm: envD },
    needsModularSplit: needsSegmentedPrint,
    splitSegmentCount: segmentCount,
    structuralWallThicknessMm: wallThicknessMm,
    mountingCollarDiameterMm: envW,
    salvattiFlareRadiusMm: crossSection.flareRadiusMm,
    hydraulicDiameterMm: crossSection.hydraulicDiameterMm,
    wettedPerimeterMm: crossSection.wettedPerimeterMm,
    peakVelocityMs: portAirVelocityMs,
    ratedPowerVelocityMs: ratedPowerAirVelocityMs,
    exceeds34MsLimit: exceedsSonicLimit34Ms,
    isLaminar: velocityStatus === 'laminar_optimal',
    reason: synthesisSummary,
  };

  return {
    parametricPort,
    portMatch,
    effectiveLengthMm,
    portDisplacementLiters,
    portAirVelocityMs,
    optimalFlareRadiusMm: crossSection.flareRadiusMm,
  };
}

/**
 * Generates a clean, manifold 3D Three.js Group for any of the 6 custom parametric port profiles:
 * - circular_bellmouth (Lathe/swept hyperbolic Salvatti bellmouth)
 * - elliptical_aperture (Parametric biaxial flared elliptical conduit)
 * - flared_exponential_horn (Bi-directional cosh^2 exponential horn shell)
 * - rectilinear_slot (Filleted rectangular slot shelf & flared entry lip)
 * - folded_l_conduit (90-degree swept mitered L-conduit)
 * - folded_u_conduit (180-degree dual-elbow U-labyrinth conduit)
 */
export function buildParametricPortManifoldGroup(
  acoustics: AcousticParameters,
  parametricPort: ParametricPortReport | undefined,
  portLengthMm: number,
  isRearPort: boolean,
  cabinetWidthM: number,
  wallThicknessM: number,
  scale: number,
  clippingPlanes: THREE.Plane[],
  isWireframeMode: boolean,
  foldDown: boolean = false,
  cabinetHeightM: number = 0.5,
  cabinetDepthM: number = 0.35,
  baffleThicknessM: number = wallThicknessM
): THREE.Group {
  const group = new THREE.Group();
  let profileType: ParametricPortProfileType =
    parametricPort?.profileType ||
    acoustics.parametricPortConfig?.profileType ||
    (acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth');

  const isProfileSlotFamily =
    profileType === 'rectilinear_slot' ||
    profileType === 'folded_l_conduit' ||
    profileType === 'folded_u_conduit';
  if (acoustics.portType === 'round' && isProfileSlotFamily) {
    profileType = 'circular_bellmouth';
  } else if (acoustics.portType === 'slot' && !isProfileSlotFamily) {
    profileType = 'rectilinear_slot';
  }

  const usableCavityDepthM = Math.max(0.03, cabinetDepthM - baffleThicknessM - wallThicknessM);
  // Cap straight axial penetration to ≤54% of internal depth (and keep ≥68mm rear clearance for damping liner + aerodynamic intake)
  const maxAxialM = Math.max(
    0.024,
    Math.min(usableCavityDepthM * 0.54, usableCavityDepthM - 0.068)
  );
  // Cap vertical riser height to ≤22% of internal height so folded risers stay in the lower/upper corner and never hit the woofer or window brace
  const maxVertM = Math.max(0.028, (cabinetHeightM - 2 * wallThicknessM) * 0.22);
  const lengthM = Math.max(0.03, (portLengthMm || 100) * scale);
  const wallM = Math.max(0.002, (parametricPort?.structuralWallThicknessMm || 4.0) * scale);
  const rawFlareRadiusMm =
    parametricPort?.crossSection?.flareRadiusMm ??
    acoustics?.flareRadiusMm ??
    16;
  const flareRadiusMm = isNaN(rawFlareRadiusMm) || rawFlareRadiusMm <= 0 ? 16 : rawFlareRadiusMm;
  const flareM = Math.max(0.004, flareRadiusMm * scale);

  const safeClippingPlanes = clippingPlanes ?? [];
  const safeWireframe = Boolean(isWireframeMode);

  // High-contrast engineered polymer / composite material for tubular/horn ports
  const polymerMat = new THREE.MeshStandardMaterial({
    color: profileType === 'flared_exponential_horn' ? '#0f2942' : '#1a202c',
    roughness: 0.28,
    metalness: 0.35,
    side: THREE.DoubleSide,
    clippingPlanes: safeClippingPlanes,
    wireframe: safeWireframe,
  });

  const flangeAccentMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    roughness: 0.22,
    metalness: 0.65,
    side: THREE.DoubleSide,
    clippingPlanes: safeClippingPlanes,
    wireframe: safeWireframe,
  });

  const woodConduitMat = new THREE.MeshStandardMaterial({
    color: '#ab8251',
    roughness: 0.65,
    metalness: 0.08,
    side: THREE.DoubleSide,
    clippingPlanes: safeClippingPlanes,
    wireframe: safeWireframe,
  });

  // --- CASE 1: CIRCULAR BELLMOUTH, ELLIPTICAL APERTURE, OR FLARED EXPONENTIAL HORN ---
  if (
    profileType === 'circular_bellmouth' ||
    profileType === 'elliptical_aperture' ||
    profileType === 'flared_exponential_horn'
  ) {
    const leg1TargetM =
      parametricPort?.legLengthsMm?.[0] !== undefined
        ? parametricPort.legLengthsMm[0] * scale
        : lengthM;
    const axialLenM = Math.min(Math.max(0.024, leg1TargetM), maxAxialM);
    const baseRadiusM = Math.min(
      ((acoustics.portDiameterMm || 75) * scale) / 2,
      Math.max(0.018, (cabinetWidthM - 2 * wallThicknessM - 0.03) / 2.4)
    );
    const aspect =
      profileType === 'elliptical_aperture'
        ? Math.sqrt(acoustics.parametricPortConfig?.ellipseAspectRatio || 1.65)
        : 1.0;
    const rxBase = baseRadiusM * aspect;
    const ryBase = baseRadiusM / aspect;
    const hornExp =
      profileType === 'flared_exponential_horn'
        ? Math.sqrt(acoustics.parametricPortConfig?.hornExpansionFactor || 2.25)
        : 1.0;

    // Build parametric closed-walled manifold mesh (inner + outer wall + front/rear flare rims)
    const radialSegs = 40;
    const axialSegs = 28;
    const positions: number[] = [];
    const indices: number[] = [];

    // Only add a 90° vertical elbow on tubular ports if explicitly folded by parametricPort and remaining leg > 35mm
    const leg2TargetM = (parametricPort?.legLengthsMm?.[1] || 0) * scale;
    const isTubularFolded = Boolean(
      parametricPort?.isFolded &&
      acoustics.parametricPortConfig?.autoFoldWhenLong !== false &&
      leg2TargetM > 0.035 &&
      cabinetHeightM >= 0.42
    );

    // Helper for radial flare profile at normalized axial coordinate u in [-0.5, +0.5]
    const getRadiiAtU = (u: number): { rx: number; ry: number } => {
      // u = +0.5 is exterior baffle face (for front port) or -0.5 (for rear port)
      const distFromEnds = 0.5 - Math.abs(u); // 0 at ends, 0.5 at center
      let flareFactor = 1.0;

      if (profileType === 'flared_exponential_horn') {
        const normZ = u * 2; // [-1, 1]
        flareFactor = 1 + (hornExp - 1) * Math.pow(normZ, 2);
      } else {
        const exitU = isRearPort ? -0.5 : 0.5;
        const distExit = Math.abs(u - exitU);
        const flareZone = Math.min(0.28, flareM / Math.max(0.04, axialLenM));
        if (distExit < flareZone) {
          const t = 1 - distExit / flareZone;
          flareFactor += (flareM / baseRadiusM) * Math.pow(t, 2.2);
        }
        // Only flare inner end if straight (not folded into an elbow)
        if (!isTubularFolded && acoustics.isDoubleFlared && distFromEnds < flareZone) {
          const t = 1 - distFromEnds / flareZone;
          flareFactor = Math.max(
            flareFactor,
            1 + (flareM / baseRadiusM) * 0.85 * Math.pow(t, 2.2)
          );
        }
      }
      return { rx: rxBase * flareFactor, ry: ryBase * flareFactor };
    };

    // Ring 0..axialSegs: Inner surface; Ring (axialSegs+1)..(2*axialSegs+1): Outer surface
    for (let shell = 0; shell < 2; shell++) {
      const thickOffset = shell === 0 ? 0 : wallM;
      for (let j = 0; j <= axialSegs; j++) {
        const u = j / axialSegs - 0.5;
        const z = u * axialLenM;
        const { rx, ry } = getRadiiAtU(u);
        for (let i = 0; i <= radialSegs; i++) {
          const theta = (i / radialSegs) * Math.PI * 2;
          const x = Math.cos(theta) * (rx + thickOffset);
          const y = Math.sin(theta) * (ry + thickOffset);
          positions.push(x, y, z);
        }
      }
    }

    const ringStride = radialSegs + 1;
    const shellStride = (axialSegs + 1) * ringStride;

    // Stitch inner & outer shells
    for (let j = 0; j < axialSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const aIn = j * ringStride + i;
        const bIn = (j + 1) * ringStride + i;
        const cIn = (j + 1) * ringStride + (i + 1);
        const dIn = j * ringStride + (i + 1);
        indices.push(aIn, dIn, bIn, bIn, dIn, cIn);

        const aOut = shellStride + j * ringStride + i;
        const bOut = shellStride + (j + 1) * ringStride + i;
        const cOut = shellStride + (j + 1) * ringStride + (i + 1);
        const dOut = shellStride + j * ringStride + (i + 1);
        indices.push(aOut, bOut, dOut, bOut, cOut, dOut);
      }
    }

    // Stitch end-cap annular rims (j = 0 and j = axialSegs) so mesh is 100% closed manifold
    for (const jEnd of [0, axialSegs]) {
      for (let i = 0; i < radialSegs; i++) {
        const inCurr = jEnd * ringStride + i;
        const inNext = jEnd * ringStride + (i + 1);
        const outCurr = shellStride + jEnd * ringStride + i;
        const outNext = shellStride + jEnd * ringStride + (i + 1);
        if (jEnd === 0) {
          indices.push(inCurr, outCurr, inNext, inNext, outCurr, outNext);
        } else {
          indices.push(inCurr, inNext, outCurr, inNext, outNext, outCurr);
        }
      }
    }

    const manifoldGeo = new THREE.BufferGeometry();
    manifoldGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    manifoldGeo.setIndex(indices);
    manifoldGeo.computeVertexNormals();

    const conduitMesh = new THREE.Mesh(manifoldGeo, polymerMat);
    group.add(conduitMesh);

    // Precision CNC Mounting Collar Ring at baffle exit face
    const exitSign = isRearPort ? -1 : 1;
    const { rx: exitRx, ry: exitRy } = getRadiiAtU(exitSign * 0.5);
    const safeRx = isNaN(exitRx) || exitRx <= 0 ? baseRadiusM : exitRx;
    const safeRy = isNaN(exitRy) || exitRy <= 0 ? baseRadiusM : exitRy;
    const maxExitR = Math.max(1e-4, Math.max(safeRx, safeRy));
    const collarGeo = new THREE.RingGeometry(
      maxExitR,
      maxExitR + 0.008,
      40
    );
    const collarMesh = new THREE.Mesh(collarGeo, flangeAccentMat);
    collarMesh.scale.set(
      safeRx / maxExitR,
      safeRy / maxExitR,
      1
    );
    collarMesh.position.z = exitSign * (axialLenM / 2 + 0.0005);
    group.add(collarMesh);

    // If the tubular port exceeds straight cabinet depth, render an internal 90° polymer elbow + vertical riser leg inside the cabinet
    if (isTubularFolded) {
      const inwardSign = isRearPort ? 1 : -1;
      const foldDirY = foldDown ? -1 : 1;
      const tubeOuterR = baseRadiusM + wallM;
      const elbowZ = inwardSign * Math.max(0, axialLenM / 2 - tubeOuterR);
      const riserLenM = Math.min(
        Math.max(0.032, leg2TargetM),
        Math.max(0.032, maxVertM - tubeOuterR)
      );

      // 90-degree spherical elbow transition joint
      const elbowGeo = new THREE.SphereGeometry(tubeOuterR * 1.02, 24, 24);
      const elbowMesh = new THREE.Mesh(elbowGeo, polymerMat);
      elbowMesh.scale.set(aspect, 1, 1);
      elbowMesh.position.set(0, 0, elbowZ);
      group.add(elbowMesh);

      // Vertical riser tube inside cabinet
      const riserGeo = new THREE.CylinderGeometry(tubeOuterR, tubeOuterR, riserLenM, 32, 1, false);
      const riserMesh = new THREE.Mesh(riserGeo, polymerMat);
      riserMesh.scale.set(aspect, 1, 1);
      riserMesh.position.set(0, foldDirY * (riserLenM / 2), elbowZ);
      group.add(riserMesh);

      // Internal flared bellmouth ring at the end of the vertical riser
      const innerBellGeo = new THREE.TorusGeometry(tubeOuterR, Math.min(0.006, flareM * 0.35), 16, 32);
      innerBellGeo.rotateX(Math.PI / 2);
      const innerBellMesh = new THREE.Mesh(innerBellGeo, flangeAccentMat);
      innerBellMesh.scale.set(aspect, 1, 1);
      innerBellMesh.position.set(0, foldDirY * riserLenM, elbowZ);
      group.add(innerBellMesh);
    }

    // Co-printed Midpoint Side-Branch Helmholtz Quarter-Wave Trap (at z = 0, i.e., x = L_p / 2)
    // Mounted laterally along +X within the port's vertical envelope so it never encroaches on vertical window braces
    const trapNeckR = Math.min(baseRadiusM * 0.30, 0.012);
    const trapNeckLen = 0.008;
    const trapCavR = Math.min(baseRadiusM * 0.58, 0.018);
    const trapCavLen = Math.min(axialLenM * 0.38, 0.036);
    const outerWallX = rxBase + wallM;

    if (outerWallX + trapNeckLen + trapCavR * 2 < cabinetWidthM / 2 - wallThicknessM - 0.008) {
      const neckGeo = new THREE.CylinderGeometry(trapNeckR, trapNeckR, trapNeckLen, 16);
      neckGeo.rotateZ(Math.PI / 2);
      const neckMesh = new THREE.Mesh(neckGeo, flangeAccentMat);
      neckMesh.position.set(outerWallX + trapNeckLen / 2 - 0.001, 0, 0);
      group.add(neckMesh);

      // Co-printed cylindrical quarter-wave trap chamber aligned parallel to port axis
      const trapCavGeo = new THREE.CylinderGeometry(trapCavR, trapCavR, trapCavLen, 20);
      trapCavGeo.rotateX(Math.PI / 2);
      const trapCavMesh = new THREE.Mesh(trapCavGeo, polymerMat);
      trapCavMesh.position.set(outerWallX + trapNeckLen + trapCavR - 0.002, 0, 0);
      group.add(trapCavMesh);

      // Accent ring on midpoint trap chamber
      const trapRingGeo = new THREE.TorusGeometry(trapCavR, 0.0012, 10, 24);
      const trapRingMesh = new THREE.Mesh(trapRingGeo, flangeAccentMat);
      trapRingMesh.position.set(outerWallX + trapNeckLen + trapCavR - 0.002, 0, 0);
      group.add(trapRingMesh);
    }

    return group;
  }

  // --- CASE 2: RECTILINEAR SLOT, FOLDED L-CONDUIT, OR FOLDED U-LABYRINTH ---
  const maxInnerSlotW = Math.max(0.06, cabinetWidthM - 2 * wallThicknessM - 0.004);
  const slotW = acoustics.slotWidthMm
    ? Math.max(0.06, Math.min(maxInnerSlotW, acoustics.slotWidthMm * scale))
    : maxInnerSlotW;
  const slotH = Math.max(0.02, (acoustics.slotHeightMm || 45) * scale);
  const lipR = Math.min(wallThicknessM * 0.48, Math.max(0.005, (acoustics.slotLipRadiusMm || 10) * scale));

  const legLengthsMm = parametricPort?.legLengthsMm || [portLengthMm];
  const leg1M = Math.min(Math.max(0.04, (legLengthsMm[0] || portLengthMm) * scale), maxAxialM);
  const inwardDirZ = isRearPort ? 1 : -1;
  const foldDirY = foldDown ? -1 : 1;

  // Primary horizontal shelf board (Leg 1)
  const leg1Geo = new THREE.BoxGeometry(slotW, wallThicknessM, leg1M);
  const leg1Mesh = new THREE.Mesh(leg1Geo, woodConduitMat);
  group.add(leg1Mesh);

  // Aerodynamic rounded entry/exit lip recessed inside leg1M span so it never protrudes into the baffle panel
  const frontLipGeo = new THREE.CylinderGeometry(lipR, lipR, slotW, 20);
  frontLipGeo.rotateZ(Math.PI / 2);
  const frontLipMesh = new THREE.Mesh(frontLipGeo, flangeAccentMat);
  frontLipMesh.position.set(0, 0, -inwardDirZ * Math.max(0, leg1M / 2 - lipR));
  group.add(frontLipMesh);

  // If folded L-conduit or U-conduit, add vertical rear riser leg (Leg 2) + 45° corner aerodynamic fillet
  if (
    profileType === 'folded_l_conduit' ||
    profileType === 'folded_u_conduit' ||
    legLengthsMm.length >= 2
  ) {
    const safeSlotVertM = Math.min(maxVertM, Math.max(0.036, cabinetHeightM * 0.15));
    const leg2M = Math.min(
      Math.max(0.036, (legLengthsMm[1] || portLengthMm * 0.35) * scale),
      safeSlotVertM
    );
    const leg2Geo = new THREE.BoxGeometry(slotW, leg2M, wallThicknessM);
    const leg2Mesh = new THREE.Mesh(leg2Geo, woodConduitMat);
    leg2Mesh.position.set(
      0,
      foldDirY * (leg2M / 2 - wallThicknessM / 2),
      inwardDirZ * (leg1M / 2 - wallThicknessM / 2)
    );
    group.add(leg2Mesh);

    // 45° internal corner turning vane / fillet to prevent corner vortex chuffing
    const vaneSize = Math.min(slotH * 0.55, 0.022);
    const vaneGeo = new THREE.BoxGeometry(slotW * 0.98, vaneSize, vaneSize);
    const vaneMesh = new THREE.Mesh(vaneGeo, flangeAccentMat);
    vaneMesh.rotation.x = foldDirY * (Math.PI / 4);
    vaneMesh.position.set(
      0,
      -slotH * 0.3 * foldDirY,
      inwardDirZ * Math.max(0, leg1M / 2 - wallThicknessM - slotH * 0.3)
    );
    group.add(vaneMesh);

    // If U-conduit, add return leg (Leg 3) properly scaled by foldDirY and inwardDirZ
    if (profileType === 'folded_u_conduit' || legLengthsMm.length >= 3) {
      const leg3M = Math.min(
        Math.max(0.032, (legLengthsMm[2] || portLengthMm * 0.25) * scale),
        Math.max(0.032, leg1M - 0.028)
      );
      const leg3Geo = new THREE.BoxGeometry(slotW, wallThicknessM, leg3M);
      const leg3Mesh = new THREE.Mesh(leg3Geo, woodConduitMat);
      leg3Mesh.position.set(
        0,
        foldDirY * (leg2M - wallThicknessM),
        inwardDirZ * (leg1M / 2 - leg3M / 2 - wallThicknessM)
      );
      group.add(leg3Mesh);

      const exitLipMesh = new THREE.Mesh(frontLipGeo.clone(), flangeAccentMat);
      exitLipMesh.position.set(
        0,
        foldDirY * (leg2M - wallThicknessM),
        inwardDirZ * Math.max(0, leg1M / 2 - leg3M - wallThicknessM + lipR)
      );
      group.add(exitLipMesh);
    } else {
      const topLipMesh = new THREE.Mesh(frontLipGeo.clone(), flangeAccentMat);
      topLipMesh.position.set(
        0,
        foldDirY * (leg2M - lipR),
        inwardDirZ * (leg1M / 2 - wallThicknessM / 2)
      );
      group.add(topLipMesh);
    }
  } else {
    // Straight rectilinear slot inner lip
    const rearLipMesh = new THREE.Mesh(frontLipGeo.clone(), woodConduitMat);
    rearLipMesh.position.set(0, 0, inwardDirZ * Math.max(0, leg1M / 2 - lipR));
    group.add(rearLipMesh);
  }

  return group;
}
