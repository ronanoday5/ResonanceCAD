export type UnitSystem = 'metric' | 'imperial';

export type ImperialFractionMode = 'decimal' | 'fractional';

export interface UnitSettings {
  unitSystem: UnitSystem;
  fractionMode: ImperialFractionMode;
  decimalPlaces: number;
  show3DDimensionLines: boolean;
  showHudDualUnits: boolean;
}

export const DEFAULT_UNIT_SETTINGS: UnitSettings = {
  unitSystem: 'metric',
  fractionMode: 'decimal',
  decimalPlaces: 2,
  show3DDimensionLines: true,
  showHudDualUnits: true,
};

export interface UnitLabels {
  length: string; // 'mm' or 'in'
  distance: string; // 'm' or 'ft'
  volume: string; // 'L' or 'ft³'
  weight: string; // 'kg' or 'lb'
  smallWeight: string; // 'g' or 'oz'
  velocity: string; // 'm/s' or 'ft/s'
  area: string; // 'm²' or 'ft²'
  density: string; // 'kg/m³' or 'lb/ft³'
}
