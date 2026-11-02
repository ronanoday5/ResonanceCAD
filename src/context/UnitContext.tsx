import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ImperialFractionMode,
  UnitLabels,
  UnitSettings,
  UnitSystem,
} from '../types/units.ts';
import { DEFAULT_UNIT_SETTINGS } from '../types/units.ts';
import {
  formatArea,
  formatDistance,
  formatDualLength,
  formatDualVolume,
  formatDualWeight,
  formatLength,
  formatVelocity,
  formatVolume,
  formatWeight,
  getUnitLabels,
  inchesToMm,
  litersToCuFt,
  cuFtToLiters,
  mmToInches,
  kgToLbs,
  lbsToKg,
  metersToFeet,
  feetToMeters,
} from '../services/unitConverter.ts';

const STORAGE_KEY = 'resonance_cad_unit_settings_v1';

interface UnitContextValue {
  settings: UnitSettings;
  unitSystem: UnitSystem;
  fractionMode: ImperialFractionMode;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;
  updateSettings: (partial: Partial<UnitSettings>) => void;
  unitLabels: UnitLabels;

  // Formatters bound to active settings
  formatLength: (
    mm: number,
    options?: { fractionMode?: ImperialFractionMode; decimals?: number; withUnit?: boolean; useInchSymbol?: boolean }
  ) => string;
  formatVolume: (liters: number, decimals?: number) => string;
  formatWeight: (kg: number, decimals?: number) => string;
  formatDistance: (meters: number, decimals?: number) => string;
  formatVelocity: (mps: number, decimals?: number) => string;
  formatArea: (m2: number, decimals?: number) => string;
  formatDualLength: (mm: number) => string;
  formatDualVolume: (liters: number) => string;
  formatDualWeight: (kg: number) => string;

  // Value converters for inputs
  toDisplayLength: (mm: number) => number;
  fromDisplayLength: (val: number) => number;
  toDisplayVolume: (liters: number) => number;
  fromDisplayVolume: (val: number) => number;
  toDisplayWeight: (kg: number) => number;
  fromDisplayWeight: (val: number) => number;
  toDisplayDistance: (m: number) => number;
  fromDisplayDistance: (val: number) => number;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export const UnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UnitSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_UNIT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not read unit settings from localStorage:', e);
    }
    return DEFAULT_UNIT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save unit settings to localStorage:', e);
    }
  }, [settings]);

  const setUnitSystem = (system: UnitSystem) => {
    setSettings((prev) => ({ ...prev, unitSystem: system }));
  };

  const toggleUnitSystem = () => {
    setSettings((prev) => ({
      ...prev,
      unitSystem: prev.unitSystem === 'metric' ? 'imperial' : 'metric',
    }));
  };

  const updateSettings = (partial: Partial<UnitSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const unitLabels = useMemo(() => getUnitLabels(settings.unitSystem), [settings.unitSystem]);

  const value: UnitContextValue = useMemo(() => {
    const sys = settings.unitSystem;

    return {
      settings,
      unitSystem: sys,
      fractionMode: settings.fractionMode,
      setUnitSystem,
      toggleUnitSystem,
      updateSettings,
      unitLabels,

      formatLength: (mm, opts) =>
        formatLength(mm, sys, {
          fractionMode: opts?.fractionMode ?? settings.fractionMode,
          decimals: opts?.decimals ?? settings.decimalPlaces,
          withUnit: opts?.withUnit ?? true,
          useInchSymbol: opts?.useInchSymbol ?? false,
        }),
      formatVolume: (liters, dec) => formatVolume(liters, sys, dec),
      formatWeight: (kg, dec) => formatWeight(kg, sys, dec),
      formatDistance: (meters, dec) => formatDistance(meters, sys, dec),
      formatVelocity: (mps, dec) => formatVelocity(mps, sys, dec),
      formatArea: (m2, dec) => formatArea(m2, sys, dec),
      formatDualLength: (mm) => formatDualLength(mm, sys),
      formatDualVolume: (liters) => formatDualVolume(liters, sys),
      formatDualWeight: (kg) => formatDualWeight(kg, sys),

      toDisplayLength: (mm) =>
        sys === 'metric' ? Math.round(mm) : parseFloat(mmToInches(mm).toFixed(settings.decimalPlaces)),
      fromDisplayLength: (val) =>
        sys === 'metric' ? val : Math.round(inchesToMm(val)),

      toDisplayVolume: (liters) =>
        sys === 'metric' ? parseFloat(liters.toFixed(1)) : parseFloat(litersToCuFt(liters).toFixed(2)),
      fromDisplayVolume: (val) =>
        sys === 'metric' ? val : parseFloat(cuFtToLiters(val).toFixed(1)),

      toDisplayWeight: (kg) =>
        sys === 'metric' ? parseFloat(kg.toFixed(1)) : parseFloat(kgToLbs(kg).toFixed(1)),
      fromDisplayWeight: (val) =>
        sys === 'metric' ? val : parseFloat(lbsToKg(val).toFixed(1)),

      toDisplayDistance: (m) =>
        sys === 'metric' ? parseFloat(m.toFixed(1)) : parseFloat(metersToFeet(m).toFixed(1)),
      fromDisplayDistance: (val) =>
        sys === 'metric' ? val : parseFloat(feetToMeters(val).toFixed(1)),
    };
  }, [settings, unitLabels]);

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};

export function useUnits(): UnitContextValue {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return context;
}
