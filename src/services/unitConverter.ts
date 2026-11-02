import type { ImperialFractionMode, UnitLabels, UnitSettings, UnitSystem } from '../types/units.ts';

// Exact Conversion Constants (NIST Standard)
export const MM_PER_INCH = 25.4;
export const INCHES_PER_MM = 1 / MM_PER_INCH; // 0.03937007874

export const LITERS_PER_CUFT = 28.316846592;
export const CUFT_PER_LITER = 1 / LITERS_PER_CUFT; // 0.0353146667

export const KG_PER_LB = 0.45359237;
export const LBS_PER_KG = 1 / KG_PER_LB; // 2.20462262

export const GRAMS_PER_OZ = 28.349523125;
export const OZ_PER_GRAM = 1 / GRAMS_PER_OZ; // 0.0352739619

export const METERS_PER_FOOT = 0.3048;
export const FEET_PER_METER = 1 / METERS_PER_FOOT; // 3.280839895

export const SQM_PER_SQFT = 0.09290304;
export const SQFT_PER_SQM = 1 / SQM_PER_SQFT; // 10.7639104

export const KG_M3_TO_LB_CUFT = 0.0624279606;

// --- DIRECT NUMERICAL CONVERTERS ---

export function mmToInches(mm: number): number {
  return mm * INCHES_PER_MM;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function litersToCuFt(liters: number): number {
  return liters * CUFT_PER_LITER;
}

export function cuFtToLiters(cuFt: number): number {
  return cuFt * LITERS_PER_CUFT;
}

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function feetToMeters(feet: number): number {
  return feet * METERS_PER_FOOT;
}

export function metersPerSecToFtPerSec(mps: number): number {
  return mps * FEET_PER_METER;
}

export function ftPerSecToMetersPerSec(fps: number): number {
  return fps * METERS_PER_FOOT;
}

export function gramsToOz(grams: number): number {
  return grams * OZ_PER_GRAM;
}

export function ozToGrams(oz: number): number {
  return oz * GRAMS_PER_OZ;
}

export function sqMToSqFt(sqm: number): number {
  return sqm * SQFT_PER_SQM;
}

export function sqFtToSqM(sqft: number): number {
  return sqft * SQM_PER_SQFT;
}

// --- FRACTIONAL INCH CONVERSION ---
/**
 * Converts decimal inches to a woodworking fractional string (e.g., 13.5 -> 13 1/2", 0.75 -> 3/4")
 * Precision up to 1/16th inch (standard carpentry & cabinetmaking).
 */
export function decimalInchesToFraction(
  inches: number,
  maxDenominator: number = 16
): string {
  if (isNaN(inches) || !isFinite(inches)) return '0"';

  const sign = inches < 0 ? '-' : '';
  const absInches = Math.abs(inches);
  const whole = Math.floor(absInches);
  const remainder = absInches - whole;

  if (remainder < 0.015) {
    return `${sign}${whole}"`;
  }

  // Find closest fraction with denominator up to maxDenominator (e.g. 16)
  const fractionNumerator = Math.round(remainder * maxDenominator);

  if (fractionNumerator === maxDenominator) {
    return `${sign}${whole + 1}"`;
  }

  if (fractionNumerator === 0) {
    return `${sign}${whole}"`;
  }

  // Simplify fraction by finding greatest common divisor
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(fractionNumerator, maxDenominator);
  const simpNum = fractionNumerator / divisor;
  const simpDen = maxDenominator / divisor;

  if (whole === 0) {
    return `${sign}${simpNum}/${simpDen}"`;
  }

  return `${sign}${whole} ${simpNum}/${simpDen}"`;
}

// --- DISPLAY FORMATTERS ---

export function getUnitLabels(system: UnitSystem): UnitLabels {
  if (system === 'imperial') {
    return {
      length: 'in',
      distance: 'ft',
      volume: 'ft³',
      weight: 'lb',
      smallWeight: 'oz',
      velocity: 'ft/s',
      area: 'ft²',
      density: 'lb/ft³',
    };
  }
  return {
    length: 'mm',
    distance: 'm',
    volume: 'L',
    weight: 'kg',
    smallWeight: 'g',
    velocity: 'm/s',
    area: 'm²',
    density: 'kg/m³',
  };
}

/**
 * Format linear dimension (length / width / height / thickness)
 */
export function formatLength(
  mm: number,
  system: UnitSystem,
  options?: {
    fractionMode?: ImperialFractionMode;
    decimals?: number;
    withUnit?: boolean;
    useInchSymbol?: boolean;
  }
): string {
  const {
    fractionMode = 'decimal',
    decimals = 2,
    withUnit = true,
    useInchSymbol = false,
  } = options || {};

  if (system === 'metric') {
    const val = Math.round(mm);
    return withUnit ? `${val} mm` : `${val}`;
  }

  // Imperial
  const inches = mmToInches(mm);
  if (fractionMode === 'fractional') {
    return decimalInchesToFraction(inches, 16);
  }

  const formatted = inches.toFixed(decimals);
  if (!withUnit) return formatted;
  return useInchSymbol ? `${formatted}"` : `${formatted} in`;
}

/**
 * Format internal or external volume
 */
export function formatVolume(
  liters: number,
  system: UnitSystem,
  decimals?: number
): string {
  if (system === 'metric') {
    const dec = decimals ?? (liters >= 100 ? 0 : 1);
    return `${liters.toFixed(dec)} L`;
  }

  const cuft = litersToCuFt(liters);
  const dec = decimals ?? (cuft >= 10 ? 1 : 2);
  return `${cuft.toFixed(dec)} ft³`;
}

/**
 * Format total mass or component weight
 */
export function formatWeight(
  kg: number,
  system: UnitSystem,
  decimals?: number
): string {
  if (system === 'metric') {
    const dec = decimals ?? (kg >= 20 ? 1 : 2);
    return `${kg.toFixed(dec)} kg`;
  }

  const lbs = kgToLbs(kg);
  const dec = decimals ?? (lbs >= 50 ? 1 : 2);
  return `${lbs.toFixed(dec)} lb`;
}

/**
 * Format listening distance
 */
export function formatDistance(
  meters: number,
  system: UnitSystem,
  decimals?: number
): string {
  if (system === 'metric') {
    const dec = decimals ?? 1;
    return `${meters.toFixed(dec)} m`;
  }

  const feet = metersToFeet(meters);
  const dec = decimals ?? 1;
  return `${feet.toFixed(dec)} ft`;
}

/**
 * Format port air velocity
 */
export function formatVelocity(
  mps: number,
  system: UnitSystem,
  decimals?: number
): string {
  if (system === 'metric') {
    const dec = decimals ?? 1;
    return `${mps.toFixed(dec)} m/s`;
  }

  const fps = metersPerSecToFtPerSec(mps);
  const dec = decimals ?? 1;
  return `${fps.toFixed(dec)} ft/s`;
}

/**
 * Format sheet surface area
 */
export function formatArea(
  m2: number,
  system: UnitSystem,
  decimals?: number
): string {
  if (system === 'metric') {
    const dec = decimals ?? 2;
    return `${m2.toFixed(dec)} m²`;
  }

  const sqft = sqMToSqFt(m2);
  const dec = decimals ?? 1;
  return `${sqft.toFixed(dec)} ft²`;
}

/**
 * Dual unit string format for HUD or rich tooltips: e.g. "330 mm (13.0 in)" or "13.00 in (330 mm)"
 */
export function formatDualLength(mm: number, primarySystem: UnitSystem): string {
  if (primarySystem === 'metric') {
    const inches = mmToInches(mm).toFixed(1);
    return `${Math.round(mm)} mm (${inches}")`;
  }
  const inches = mmToInches(mm).toFixed(2);
  return `${inches}" (${Math.round(mm)} mm)`;
}

export function formatDualVolume(liters: number, primarySystem: UnitSystem): string {
  const cuft = litersToCuFt(liters).toFixed(2);
  if (primarySystem === 'metric') {
    return `${liters.toFixed(1)} L (${cuft} ft³)`;
  }
  return `${cuft} ft³ (${liters.toFixed(1)} L)`;
}

export function formatDualWeight(kg: number, primarySystem: UnitSystem): string {
  const lbs = kgToLbs(kg).toFixed(1);
  if (primarySystem === 'metric') {
    return `${kg.toFixed(1)} kg (${lbs} lb)`;
  }
  return `${lbs} lb (${kg.toFixed(1)} kg)`;
}
