import React from 'react';
import { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import { Box, Disc3, Gauge, Radio, Scale, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';

interface TopHeaderProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  onOptimizeAlignment: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ results, acoustics, onOptimizeAlignment }) => {
  const vbCuFt = (results.netVolumeLiters / 28.3168).toFixed(2);
  const totalLbs = (results.totalWeightKg * 2.20462).toFixed(1);

  return (
    <header className="w-full bg-[#090b0e] border-b border-slate-800/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none text-slate-200 z-30">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md">
          <Disc3 className="w-5 h-5 animate-none" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-wider uppercase font-mono text-slate-100">
              Resonance<span className="text-cyan-400">CAD</span>
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 uppercase">
              v2.4 Acoustic CAD
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
            {acoustics.topology.toUpperCase().replace('_', '-')} • {acoustics.driverAssignments.woofer.driver.brand} {acoustics.driverAssignments.woofer.driver.model}
          </p>
        </div>
      </div>

      {/* Live Acoustic Telemetry Ribbon */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs font-mono">
        {/* Net Volume Vb */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[10px] uppercase">Net Vb:</span>
          <span className="text-cyan-300 font-bold">{results.netVolumeLiters} L</span>
          <span className="text-slate-500 text-[10px]">({vbCuFt} ft³)</span>
        </div>

        {/* Tuning Fb or Resonance Fc */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[10px] uppercase">
            {acoustics.alignment === 'sealed' ? 'Fc:' : 'Fb:'}
          </span>
          <span className="text-amber-300 font-bold">{results.tuningFrequencyFb} Hz</span>
        </div>

        {/* -3dB Cutoff F3 */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 text-[10px] uppercase">F3:</span>
          <span className="text-emerald-300 font-bold">{results.f3CutoffHz} Hz</span>
        </div>

        {/* Sealed Qtc / Port Velocity */}
        {acoustics.alignment === 'sealed' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 text-[10px] uppercase">Qtc:</span>
            <span className={`font-bold ${results.boxQtc <= 0.75 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {results.boxQtc}
            </span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
              results.isChuffingRisk
                ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            {results.isChuffingRisk ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span className="text-[10px] uppercase text-slate-400">Air Vel:</span>
            <span className={`font-bold ${results.isChuffingRisk ? 'text-rose-300' : 'text-purple-300'}`}>
              {results.portAirVelocityMs} m/s
            </span>
          </div>
        )}

        {/* Cabinet Mass */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[10px] uppercase">Mass:</span>
          <span className="text-slate-200 font-bold">{results.totalWeightKg} kg</span>
          <span className="text-slate-500 text-[10px]">({totalLbs} lbs)</span>
        </div>

        {/* Optimize alignment helper button */}
        <button
          onClick={onOptimizeAlignment}
          title="Auto-calculate Keele / Small optimal volume and tuning for this driver"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/90 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900 transition text-[11px] font-sans"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-Align</span>
        </button>
      </div>
    </header>
  );
};
