import type {
  PickPointConfig,
  PickPointLoads,
  RiggingJointLoad,
  RiggingPinMaterial,
  RiggingPinSpec,
  RiggingRegulatoryStandard,
  StructuralRiggingReport,
} from '../types/rigging.ts';
import type { ArrayCurvaturePreset, LineArrayConfig } from '../types/lineArray.ts';
import type { EnclosureDimensions } from '../types/loudspeaker.ts';

export const RIGGING_PIN_CATALOG: Record<string, RiggingPinSpec> = {
  pin_8mm_17_4ph: {
    diameterMm: 8,
    material: '17_4_ph_stainless',
    materialName: '8mm Aircraft 17-4PH H1025 Stainless',
    doubleShearBreakingLoadKn: 48.0,
    singleTensileBreakingLoadKn: 36.0,
    yieldStrengthMpa: 1000,
    weightGrams: 42,
  },
  pin_10mm_17_4ph: {
    diameterMm: 10,
    material: '17_4_ph_stainless',
    materialName: '10mm Tour-Grade 17-4PH H1025 Stainless (Standard)',
    doubleShearBreakingLoadKn: 76.0,
    singleTensileBreakingLoadKn: 58.0,
    yieldStrengthMpa: 1000,
    weightGrams: 68,
  },
  pin_12mm_17_4ph: {
    diameterMm: 12,
    material: '17_4_ph_stainless',
    materialName: '12mm Heavy-Rigging 17-4PH H1025 Stainless',
    doubleShearBreakingLoadKn: 110.0,
    singleTensileBreakingLoadKn: 84.0,
    yieldStrengthMpa: 1000,
    weightGrams: 98,
  },
  pin_10mm_grade8: {
    diameterMm: 10,
    material: 'grade_8_alloy_steel',
    materialName: '10mm High-Tensile Grade 8 Alloy Steel',
    doubleShearBreakingLoadKn: 64.0,
    singleTensileBreakingLoadKn: 48.0,
    yieldStrengthMpa: 890,
    weightGrams: 70,
  },
  pin_10mm_titanium: {
    diameterMm: 10,
    material: 'titanium_grade_5',
    materialName: '10mm Ti-6Al-4V Grade 5 Titanium',
    doubleShearBreakingLoadKn: 68.0,
    singleTensileBreakingLoadKn: 52.0,
    yieldStrengthMpa: 950,
    weightGrams: 40,
  },
};

export const STANDARD_REQUIRED_SAFETY_FACTORS: Record<RiggingRegulatoryStandard, number> = {
  ansi_e1_8: 5.0, // Entertainment Technology Rigging Standard (Minimum 5:1 against ultimate breaking load)
  dguv_17: 10.0, // German Event Production Standard (BGV-C1) (Minimum 10:1 above audience/persons)
  din_18800: 7.0, // General structural steelwork safety factor
};

export interface RiggingCalculationParams {
  boxCount: number;
  boxWeightKg: number;
  boxHeightMm: number;
  boxDepthMm: number;
  bumperWeightKg: number;
  bumperLengthMm: number;
  cablesWeightKg: number;
  hangingAngleDeg: number; // Overall flybar tilt (-15° to +15°)
  interBoxSplayAnglesDeg: number[]; // splay angles between adjacent boxes
  curvaturePreset: ArrayCurvaturePreset;
  regulatoryStandard: RiggingRegulatoryStandard;
  pinSpecKey: string;
  dynamicShockFactor: number; // 1.0 (static) to 1.5 (wind/dynamic)
  pickPointConfig: PickPointConfig;
}

/**
 * Checks if an enclosure configuration belongs to a PA / Live Sound style loudspeaker.
 */
export function isPaStyleSpeaker(dimensions?: EnclosureDimensions | null): boolean {
  if (!dimensions) return false;
  if (dimensions.category === 'live_top' || dimensions.category === 'live_sub') return true;
  const sub = dimensions.subcategory;
  return (
    sub === 'horn_loaded_array' ||
    sub === 'active_powered_biamp' ||
    sub === 'passive_point_source' ||
    sub === 'single_18_reflex' ||
    sub === 'dual_18_reflex' ||
    sub === 'bandpass_horn_hybrid'
  );
}

/**
 * Core Structural Statics Engine for Flying Line Array Loudspeaker Rigs
 */
export function calculateStructuralRigging(
  params: RiggingCalculationParams
): StructuralRiggingReport {
  const {
    boxCount,
    boxWeightKg,
    boxHeightMm,
    boxDepthMm,
    bumperWeightKg,
    bumperLengthMm,
    cablesWeightKg,
    hangingAngleDeg,
    interBoxSplayAnglesDeg,
    curvaturePreset,
    regulatoryStandard,
    pinSpecKey,
    dynamicShockFactor,
    pickPointConfig,
  } = params;

  const g = 9.80665; // m/s^2
  const requiredSafetyFactor = STANDARD_REQUIRED_SAFETY_FACTORS[regulatoryStandard] || 5.0;
  const pinSpec = RIGGING_PIN_CATALOG[pinSpecKey] || RIGGING_PIN_CATALOG.pin_10mm_17_4ph;
  const effectiveDynamicFactor = Math.max(1.0, Math.min(2.0, dynamicShockFactor));

  const totalSuspendedMassKg = Math.round(
    (bumperWeightKg + boxCount * boxWeightKg + cablesWeightKg) * 10
  ) / 10;

  // Geometry Setup:
  // Coordinate origin (0,0) is at the top front corner of the flybar bumper.
  // X axis = horizontal distance rearward (+X = towards rear of cabinet)
  // Y axis = vertical distance downward (+Y = downwards towards ground)
  const boxHeightM = boxHeightMm / 1000;
  const boxDepthM = boxDepthMm / 1000;
  const frontPinOffsetXM = 0.04; // 40mm inset from front baffle
  const rearPinOffsetXM = boxDepthM * 0.78; // 78% depth rear splay pin position
  const riggingArmM = rearPinOffsetXM - frontPinOffsetXM; // Structural lever arm between front & rear pins

  // Step 1: Compute 2D position and rotation angle of each cabinet in the articulated array
  const cumulativeAnglesDeg: number[] = [];
  const cabinetPositions: {
    index: number;
    rotationDeg: number;
    frontPinX: number;
    frontPinY: number;
    rearPinX: number;
    rearPinY: number;
    centerOfMassX: number;
    centerOfMassY: number;
    massKg: number;
  }[] = [];

  let currentAngleDeg = hangingAngleDeg;
  let curFrontX = frontPinOffsetXM;
  let curFrontY = 0.12; // 120mm below flybar top

  for (let i = 0; i < boxCount; i++) {
    const splayBefore = i > 0 ? (interBoxSplayAnglesDeg[i - 1] ?? 0) : 0;
    currentAngleDeg += splayBefore;
    cumulativeAnglesDeg.push(currentAngleDeg);

    const rad = (currentAngleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Front hinge pin of cabinet i
    const frontPinX = curFrontX;
    const frontPinY = curFrontY;

    // Rear pin of cabinet i in global coordinates
    // Local vector from front pin to rear pin is (riggingArmM, 0)
    const rearPinX = frontPinX + riggingArmM * cosA;
    const rearPinY = frontPinY - riggingArmM * sinA;

    // Center of mass of cabinet i (local center of box: x = boxDepthM/2 - frontPinOffsetXM, y = boxHeightM/2)
    const localCgX = boxDepthM * 0.45 - frontPinOffsetXM;
    const localCgY = boxHeightM * 0.5;
    const centerOfMassX = frontPinX + localCgX * cosA + localCgY * sinA;
    const centerOfMassY = frontPinY - localCgX * sinA + localCgY * cosA;

    cabinetPositions.push({
      index: i,
      rotationDeg: currentAngleDeg,
      frontPinX,
      frontPinY,
      rearPinX,
      rearPinY,
      centerOfMassX,
      centerOfMassY,
      massKg: boxWeightKg,
    });

    // Advance front hinge coordinates to the bottom of this box (hinge point for next box)
    curFrontX += boxHeightM * sinA;
    curFrontY += boxHeightM * cosA;
  }

  // Step 2: Calculate Overall Center of Gravity of the Entire Array Hang (including flybar & cables)
  const flybarCgX = (bumperLengthMm / 1000) * 0.5;
  const flybarCgY = 0.04;
  let totalMomentX = flybarCgX * bumperWeightKg;
  let totalMomentY = flybarCgY * bumperWeightKg;

  cabinetPositions.forEach((box, idx) => {
    // Add proportional cable weight distributed along array
    const cableSegment = cablesWeightKg / boxCount;
    const boxEffectiveMass = box.massKg + cableSegment;
    totalMomentX += box.centerOfMassX * boxEffectiveMass;
    totalMomentY += box.centerOfMassY * boxEffectiveMass;
  });

  const arrayCgX = totalMomentX / Math.max(1, totalSuspendedMassKg);
  const arrayCgY = totalMomentY / Math.max(1, totalSuspendedMassKg);

  // Step 3: Pick Point Reactions (Front & Rear motor hoists or single pick)
  const bumperSpanM = (bumperLengthMm || 800) / 1000;
  const frontPickXM = 0.08; // 80mm from front
  const rearPickXM = bumperSpanM - 0.08; // 80mm from rear
  const pickSpanM = Math.max(0.2, rearPickXM - frontPickXM);

  const totalEffectiveWeightN = totalSuspendedMassKg * g * effectiveDynamicFactor;
  let frontMotorLoadN = 0;
  let rearMotorLoadN = 0;

  switch (pickPointConfig) {
    case 'single_front':
      frontMotorLoadN = totalEffectiveWeightN;
      rearMotorLoadN = 0;
      break;
    case 'single_rear':
      frontMotorLoadN = 0;
      rearMotorLoadN = totalEffectiveWeightN;
      break;
    case 'single_center':
      frontMotorLoadN = totalEffectiveWeightN * 0.5;
      rearMotorLoadN = totalEffectiveWeightN * 0.5;
      break;
    case 'dual_motor_bridle':
    default: {
      // 2-point hoist moment balance:
      // FrontLoad * pickSpan = TotalWeight * (rearPickXM - arrayCgX)
      const frontRatio = Math.max(0, Math.min(1.2, (rearPickXM - arrayCgX) / pickSpanM));
      frontMotorLoadN = Math.max(0, totalEffectiveWeightN * frontRatio);
      rearMotorLoadN = Math.max(0, totalEffectiveWeightN * (1 - frontRatio));
      break;
    }
  }

  // Bridle angle geometry (assuming standard 1.2m bridle legs)
  const bridleLegLengthM = 1.2;
  const halfSpan = pickSpanM / 2;
  const bridleAngleRad = Math.asin(Math.min(0.95, halfSpan / bridleLegLengthM)) * 2;
  const bridleAngleDeg = Math.round(((bridleAngleRad * 180) / Math.PI) * 10) / 10;
  const bridleLegTensionN = Math.round(
    (totalEffectiveWeightN / (2 * Math.cos(bridleAngleRad / 2))) * 10
  ) / 10;

  // Natural equilibrium hang angle if hung from center pick point
  const naturalHangAngleDeg = Math.round(
    (Math.atan2(arrayCgX - bumperSpanM * 0.5, arrayCgY) * 180) / Math.PI * 10
  ) / 10;

  const pickPoints: PickPointLoads = {
    configuration: pickPointConfig,
    frontMotorLoadN: Math.round(frontMotorLoadN),
    frontMotorLoadKg: Math.round(frontMotorLoadN / g),
    rearMotorLoadN: Math.round(rearMotorLoadN),
    rearMotorLoadKg: Math.round(rearMotorLoadN / g),
    bridleAngleDeg,
    bridleLegTensionN,
    centerOfGravityOffsetMm: Math.round(arrayCgX * 1000),
    centerOfGravityHeightMm: Math.round(arrayCgY * 1000),
    naturalHangAngleDeg,
  };

  // Step 4: Joint-by-Joint Tensile and Shear Loads
  // Joint 0 = Flybar to Box #1
  // Joint 1 = Box #1 to Box #2
  // ...
  // Joint N-1 = Box #(N-1) to Box #N
  const joints: RiggingJointLoad[] = [];
  const warnings: string[] = [];
  const remediationAdvice: string[] = [];
  let minimumSafetyFactor = 999.0;
  let criticalJointIndex = 0;
  let hasCompressionHazard = false;

  const pinDoubleShearLimitN = pinSpec.doubleShearBreakingLoadKn * 1000;
  const pinTensileLimitN = pinSpec.singleTensileBreakingLoadKn * 1000;

  for (let j = 0; j < boxCount; j++) {
    // All boxes below this joint: from index j to boxCount - 1
    const boxesBelow = cabinetPositions.slice(j);
    const countBelow = boxesBelow.length;
    const cableShareKg = (cablesWeightKg * countBelow) / boxCount;
    const massBelowKg = countBelow * boxWeightKg + cableShareKg;
    const weightBelowN = massBelowKg * g * effectiveDynamicFactor;

    // Center of mass of the sub-hang below joint j
    let subMomentX = 0;
    let subMomentY = 0;
    boxesBelow.forEach((b) => {
      subMomentX += b.centerOfMassX * b.massKg;
      subMomentY += b.centerOfMassY * b.massKg;
    });
    const subCgX = subMomentX / Math.max(1, countBelow * boxWeightKg);
    const subCgY = subMomentY / Math.max(1, countBelow * boxWeightKg);

    // Front hinge pin location at joint j
    const hingeX = cabinetPositions[j].frontPinX;
    const hingeY = cabinetPositions[j].frontPinY;
    const jointAngleDeg = cabinetPositions[j].rotationDeg;
    const jointSplayDeg = j > 0 ? (interBoxSplayAnglesDeg[j - 1] ?? 0) : 0;

    // Statics Moment about front hinge:
    // Torque = Force * lever arm in horizontal plane
    // Gravity pulls vertically downward (+Y direction in screen frame)
    // Clockwise moment about front hinge = Weight * (subCgX - hingeX)
    const momentArmX = subCgX - hingeX;
    const momentArmY = subCgY - hingeY;
    const gravityTorqueNm = weightBelowN * momentArmX;

    // Rear splay link counter-acts this torque:
    // Effective lever arm perpendicular to the rear link
    const radTilt = (jointAngleDeg * Math.PI) / 180;
    const radSplay = (jointSplayDeg * Math.PI) / 180;
    const effectiveArmM = Math.max(0.15, riggingArmM * Math.cos(radSplay));

    // Tensile force on rear pin / splay bar (Newtons)
    let tensileLoadN = gravityTorqueNm / effectiveArmM;
    let compressionWarning = false;

    if (tensileLoadN < 0) {
      // Rear link is in compression! Line array pins are designed for tension.
      // Under dynamic sway, compression can cause splay angle collapse.
      compressionWarning = true;
      hasCompressionHazard = true;
      tensileLoadN = Math.abs(tensileLoadN); // evaluate magnitude for pin stress
    }

    // Front Pin Shear Reaction:
    // Sum of forces in X and Y must equal 0
    // Rear link force pulls along cabinet splay angle direction
    const rearForceX = tensileLoadN * Math.sin(radTilt);
    const rearForceY = -tensileLoadN * Math.cos(radTilt);

    // Front pin reaction force balancing gravity and rear link:
    const frontReactionX = -rearForceX;
    const frontReactionY = weightBelowN - rearForceY;
    const shearLoadN = Math.sqrt(frontReactionX * frontReactionX + frontReactionY * frontReactionY);

    // Combined von Mises equivalent stress load
    const combinedVonMisesN = Math.sqrt(
      tensileLoadN * tensileLoadN + 3 * shearLoadN * shearLoadN
    );

    // Safety factors calculated against minimum breaking load (MBL)
    const tensileSafetyFactor = Math.round(
      (pinTensileLimitN / Math.max(10, tensileLoadN)) * 10
    ) / 10;
    const shearSafetyFactor = Math.round(
      (pinDoubleShearLimitN / Math.max(10, shearLoadN)) * 10
    ) / 10;
    const governingSafetyFactor = Math.min(tensileSafetyFactor, shearSafetyFactor);

    if (governingSafetyFactor < minimumSafetyFactor) {
      minimumSafetyFactor = governingSafetyFactor;
      criticalJointIndex = j;
    }

    let status: 'safe' | 'caution' | 'critical_exceeded' = 'safe';
    if (governingSafetyFactor < requiredSafetyFactor) {
      status = 'critical_exceeded';
    } else if (governingSafetyFactor < requiredSafetyFactor * 1.25) {
      status = 'caution';
    }

    const parentLabel = j === 0 ? 'Flybar / Bumper' : `Box #${j}`;
    const childLabel = `Box #${j + 1}`;

    joints.push({
      jointIndex: j,
      parentLabel,
      childLabel,
      splayAngleDeg: jointSplayDeg,
      cumulativeTiltDeg: Math.round(jointAngleDeg * 10) / 10,
      suspendedMassBelowKg: Math.round(massBelowKg * 10) / 10,
      tensileLoadN: Math.round(tensileLoadN),
      shearLoadN: Math.round(shearLoadN),
      combinedVonMisesN: Math.round(combinedVonMisesN),
      tensileSafetyFactor,
      shearSafetyFactor,
      governingSafetyFactor,
      status,
      compressionWarning,
    });
  }

  // Step 5: Build Comprehensive Warnings & Expert Remediation Advice
  const isCompliant = minimumSafetyFactor >= requiredSafetyFactor;

  if (!isCompliant) {
    const critJoint = joints[criticalJointIndex];
    warnings.push(
      `REGULATORY VIOLATION (${regulatoryStandard.toUpperCase()}): Joint #${criticalJointIndex + 1} (${critJoint.parentLabel} -> ${critJoint.childLabel}) safety factor is ${critJoint.governingSafetyFactor.toFixed(1)}:1, which is below the mandatory ${requiredSafetyFactor}:1 threshold.`
    );
    warnings.push(
      `Peak tensile force on rear splay pin reaches ${(critJoint.tensileLoadN / 1000).toFixed(1)} kN; front pin shear reaches ${(critJoint.shearLoadN / 1000).toFixed(1)} kN under ${effectiveDynamicFactor}x dynamic gust factor.`
    );
  }

  if (hasCompressionHazard) {
    warnings.push(
      `COMPRESSION HAZARD: Up-tilt hanging angle or reverse splay has caused negative tensile load (compression) on rear splay pins. Array is vulnerable to joint buckling.`
    );
    remediationAdvice.push(
      `Adjust overall flybar hanging down-tilt to positive angle (e.g. 0° to -4°) to restore positive tension on rear splay links.`
    );
  }

  if (totalSuspendedMassKg > 1200) {
    warnings.push(
      `HIGH SUSPENDED MASS: Total array mass is ${totalSuspendedMassKg.toFixed(1)} kg (${Math.round(totalSuspendedMassKg * 2.20462)} lbs). Verify roof rigging point capacity and 1-ton chain hoist WLL.`
    );
  }

  if (bridleAngleDeg > 90) {
    warnings.push(
      `WIDE BRIDLE ANGLE: Bridle angle is ${bridleAngleDeg}°. Bridle angles > 90° amplify leg tension exponentially.`
    );
    remediationAdvice.push(
      `Lengthen bridle legs or transition to two independent vertical hoists to reduce bridle amplification.`
    );
  }

  // Construct concrete engineering remediation advice if needed
  if (!isCompliant) {
    if (pinSpec.diameterMm < 12) {
      remediationAdvice.push(
        `Upgrade flying hardware pins from ${pinSpec.diameterMm}mm to 12mm 17-4PH aircraft stainless pins (+45% shear load capacity).`
      );
    }
    if (hangingAngleDeg < -5) {
      remediationAdvice.push(
        `Reduce down-tilt from ${hangingAngleDeg}° to ${Math.max(-4, hangingAngleDeg + 4)}° to move center of gravity closer to front hinge axis.`
      );
    }
    if (boxCount > 10) {
      remediationAdvice.push(
        `Split array into main flown hang of ${Math.max(6, boxCount - 4)} cabinets and ground-stack or balcony-fly remaining boxes.`
      );
    }
    if (pickPointConfig !== 'dual_motor_bridle') {
      remediationAdvice.push(
        `Switch pick-point configuration to Two-Point Motor Bridle to distribute moment loads across dual hoists.`
      );
    }
  } else {
    remediationAdvice.push(
      `Array meets all structural safety requirements under ${regulatoryStandard.toUpperCase()} regulations with minimum safety factor of ${minimumSafetyFactor.toFixed(1)}:1.`
    );
  }

  return {
    regulatoryStandard,
    requiredMinimumSafetyFactor: requiredSafetyFactor,
    totalSuspendedMassKg,
    boxCount,
    individualBoxMassKg: boxWeightKg,
    bumperMassKg: bumperWeightKg,
    cablesMassKg: cablesWeightKg,
    hangingAngleDeg,
    curvaturePreset,
    pinSpec,
    dynamicShockFactor: effectiveDynamicFactor,
    joints,
    pickPoints,
    minimumSafetyFactor: Math.round(minimumSafetyFactor * 10) / 10,
    criticalJointIndex,
    isCompliant,
    hasCompressionHazard,
    warnings,
    remediationAdvice,
    calculatedTimestamp: new Date().toISOString(),
  };
}
