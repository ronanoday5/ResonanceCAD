import React from 'react';
import {
  X,
  Settings,
  Ruler,
  Scale,
  Box,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Info,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useUnits } from '../context/UnitContext.tsx';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  EnclosureDimensions,
} from '../types/loudspeaker.ts';
import { DEFAULT_UNIT_SETTINGS } from '../types/units.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  results: AcousticCalculationResult;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  acoustics,
  results,
}) => {
  const {
    settings,
    unitSystem,
    setUnitSystem,
    updateSettings,
    formatLength,
    formatVolume,
    formatWeight,
    formatDistance,
    formatVelocity,
  } = useUnits();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0d1017] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans cursor-default max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Application Settings & Measurement Units</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                  Global State
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure global engineering units, precision, and 3D viewport overlays
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: GLOBAL UNIT SYSTEM SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-cyan-400" />
                  Primary Measurement Standard
                </h3>
                <p className="text-xs text-slate-400">
                  Dynamically converts all input sliders, CAD diagrams, cut lists, and calculation telemetry.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                Active: {unitSystem.toUpperCase()}
              </span>
            </div>

            {/* Segmented Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Metric Card */}
              <div
                onClick={() => setUnitSystem('metric')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  unitSystem === 'metric'
                    ? 'bg-slate-900 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <span>Metric System</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                        SI / ISO
                      </span>
                    </span>
                    {unitSystem === 'metric' && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Standard acoustic engineering convention used in European & Asian transducer manufacturing.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-300">
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Length:</span>
                    <strong className="text-cyan-300">mm / cm</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Volume:</span>
                    <strong className="text-cyan-300">Liters (L)</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Weight:</span>
                    <strong className="text-cyan-300">kg / g</strong>
                  </div>
                </div>
              </div>

              {/* Imperial Card */}
              <div
                onClick={() => setUnitSystem('imperial')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  unitSystem === 'imperial'
                    ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <span>Imperial System</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                        US Customary
                      </span>
                    </span>
                    {unitSystem === 'imperial' && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Woodshop carpentry standard: inches, cubic feet ($ft^3$), and pounds for domestic lumber.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-300">
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Length:</span>
                    <strong className="text-amber-300">in / ft</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Volume:</span>
                    <strong className="text-amber-300">cu ft (ft³)</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded border border-slate-850">
                    <span className="text-slate-500 block">Weight:</span>
                    <strong className="text-amber-300">lb / oz</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: IMPERIAL FORMATTING PREFERENCES */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Dimension Display & Fraction Formatting
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fractional vs Decimal */}
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1.5">
                  Imperial Inch Representation:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => updateSettings({ fractionMode: 'decimal' })}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      settings.fractionMode === 'decimal'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>Decimal (13.50")</div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">High CAD precision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ fractionMode: 'fractional' })}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      settings.fractionMode === 'fractional'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>Fractions (13 1/2")</div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Woodshop tape measure</span>
                  </button>
                </div>
              </div>

              {/* Decimal Precision */}
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1.5">
                  Decimal Places Precision:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((dp) => (
                    <button
                      key={dp}
                      type="button"
                      onClick={() => updateSettings({ decimalPlaces: dp })}
                      className={`flex-1 py-2 rounded-lg border font-mono text-xs font-bold transition cursor-pointer ${
                        settings.decimalPlaces === dp
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {dp} {dp === 1 ? 'place (0.1)' : dp === 2 ? 'places (0.01)' : 'places (0.001)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: 3D VIEWPORT MEASUREMENTS & HUD TOGGLES */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-4 h-4 text-purple-400" />
              3D Viewport Dimension Overlays
            </h3>

            <div className="space-y-2.5 font-mono text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:bg-slate-900">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Show 3D CAD Bounding Dimension Lines</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Displays live Width, Height, Depth leader lines and dimension badges directly around the 3D loudspeaker model.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.show3DDimensionLines}
                  onChange={(e) => updateSettings({ show3DDimensionLines: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:bg-slate-900">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Viewport HUD Dual-Unit Telemetry</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Shows both primary and secondary units simultaneously in the top-right viewport telemetry strip (e.g. 48.2 L [1.7 ft³]).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHudDualUnits}
                  onChange={(e) => updateSettings({ showHudDualUnits: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 4: LIVE DYNAMIC CONVERSION PREVIEW */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Live Enclosure Dynamic Conversion Preview
              </span>
              <span className="text-[10px] text-cyan-400/80">
                Reflects active loudspeaker geometry
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">WIDTH (X):</span>
                <span className="font-bold text-cyan-300">{formatLength(dimensions.externalWidthMm)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">HEIGHT (Y):</span>
                <span className="font-bold text-cyan-300">{formatLength(dimensions.externalHeightMm)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">DEPTH (Z):</span>
                <span className="font-bold text-cyan-300">{formatLength(dimensions.externalDepthMm)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">NET VOLUME (Vb):</span>
                <span className="font-bold text-emerald-400">{formatVolume(results.netVolumeLiters)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">TOTAL MASS:</span>
                <span className="font-bold text-amber-300">{formatWeight(results.totalWeightKg)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">PORT LENGTH:</span>
                <span className="font-bold text-slate-200">{formatLength(results.portLengthMm)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">AIR VELOCITY:</span>
                <span className="font-bold text-teal-300">{formatVelocity(results.portAirVelocityMs)}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 block">CALC DISTANCE:</span>
                <span className="font-bold text-slate-200">{formatDistance(acoustics.splCalcDistanceM || 1.5)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => updateSettings(DEFAULT_UNIT_SETTINGS)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/50 transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
