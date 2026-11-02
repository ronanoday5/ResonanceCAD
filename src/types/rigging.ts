import type { ArrayCurvaturePreset } from './lineArray.ts';

export type RiggingRegulatoryStandard = 'ansi_e1_8' | 'dguv_17' | 'din_18800';

export type RiggingPinMaterial = '17_4_ph_stainless' | 'grade_8_alloy_steel' | 'titanium_grade_5';

export interface RiggingPinSpec {
  diameterMm: number; // 8, 10, 12, 16 mm
  material: RiggingPinMaterial;
  materialName: string;
  doubleShearBreakingLoadKn: number; // Minimum breaking load in double shear (kN)
  singleTensileBreakingLoadKn: number; // Minimum breaking load in single/double tension (kN)
  yieldStrengthMpa: number;
  weightGrams: number;
}

export type PickPointConfig = 'single_center' | 'single_front' | 'single_rear' | 'dual_motor_bridle';

export interface RiggingJointLoad {
  jointIndex: number; // 0 = Flybar-to-Box 1, 1 = Box 1-to-Box 2, etc.
  parentLabel: string; // e.g. "Flybar" or "Box #1"
  childLabel: string; // e.g. "Box #1" or "Box #2"
  splayAngleDeg: number; // Inter-cabinet splay angle at this joint
  cumulativeTiltDeg: number; // Absolute inclination angle of this joint
  suspendedMassBelowKg: number; // Total mass suspended beneath this specific joint
  tensileLoadN: number; // Rear splay link tensile force in Newtons
  shearLoadN: number; // Front hinge pin shear force in Newtons
  combinedVonMisesN: number; // Resultant von Mises equivalent stress load in Newtons
  tensileSafetyFactor: number; // MBL / TensileLoad
  shearSafetyFactor: number; // MBL / ShearLoad
  governingSafetyFactor: number; // min(tensileSF, shearSF)
  status: 'safe' | 'caution' | 'critical_exceeded';
  compressionWarning: boolean; // Flagged if rear arm enters compression (buckling hazard)
}

export interface PickPointLoads {
  configuration: PickPointConfig;
  frontMotorLoadN: number;
  frontMotorLoadKg: number;
  rearMotorLoadN: number;
  rearMotorLoadKg: number;
  bridleAngleDeg: number;
  bridleLegTensionN: number;
  centerOfGravityOffsetMm: number; // X distance from front bumper edge
  centerOfGravityHeightMm: number; // Y distance below bumper
  naturalHangAngleDeg: number; // Equilibrium tilt if single pick point is used
}

export interface StructuralRiggingReport {
  regulatoryStandard: RiggingRegulatoryStandard;
  requiredMinimumSafetyFactor: number; // 5.0 for ANSI, 10.0 for DGUV
  totalSuspendedMassKg: number;
  boxCount: number;
  individualBoxMassKg: number;
  bumperMassKg: number;
  cablesMassKg: number;
  hangingAngleDeg: number; // Overall flybar tilt angle (-15° to +15°)
  curvaturePreset: ArrayCurvaturePreset;
  pinSpec: RiggingPinSpec;
  dynamicShockFactor: number; // 1.0 (static) to 1.5 (outdoor wind gusts)
  joints: RiggingJointLoad[];
  pickPoints: PickPointLoads;
  minimumSafetyFactor: number; // Lowest SF across all joints and pins
  criticalJointIndex: number; // Joint with lowest safety factor
  isCompliant: boolean; // True if minimumSafetyFactor >= requiredMinimumSafetyFactor
  hasCompressionHazard: boolean;
  warnings: string[];
  remediationAdvice: string[];
  calculatedTimestamp: string;
}
