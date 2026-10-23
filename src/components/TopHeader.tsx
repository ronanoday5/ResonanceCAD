import React from 'react';
import type { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import { Box, Disc3, Download, Gauge, Radio, Scale, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';

interface TopHeaderProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  onOptimizeAlignment: () => void;
  isLiveSimOpen?: boolean;
  onToggleLiveSim?: () => void;
  onOpenCadExport?: () => void;
  onAutoResolveClashes?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  results,
  acoustics,
  onOptimizeAlignment,
  isLiveSimOpen,
  onToggleLiveSim,
  onOpenCadExport,
  onAutoResolveClashes,
}) => {
  const vbCuFt = (results.netVolumeLiters / 28.3168).toFixed(2);
  const totalLbs = (results.totalWeightKg * 2.20462).toFixed(1);
  const costUsd = results.materialCost?.totalCostUsd?.toFixed(2) || '0.00';

  return (
    <header className="w-full bg-[#080a0f] border-b border-slate-800/90 px-4 py-2 flex flex-wrap items-center justify-between gap-3 select-none text-slate-200 z-30 shadow-md">
      {/* Brand Identity & Model Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-950/40">
          <Disc3 className="w-4 h-4 animate-none" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-wider uppercase font-mono text-slate-100">
              Resonance<span className="text-cyan-400">CAD</span>
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase font-semibold">
              Pro Studio
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
            {acoustics.topology.toUpperCase().replace('_', '-')} • {acoustics.driverAssignments.woofer.driver.brand} {acoustics.driverAssignments.woofer.driver.model}
          </p>
        </div>
      </div>

      {/* Central Primary Anchor: Key Telemetry & Global Health Status */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {/* Consolidated Health Pill */}
        {results.layout?.hasCollision ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-700/80 text-rose-200 font-bold shadow-sm animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Driver / Port Clash</span>
          </div>
        ) : results.layout?.airflowInterference?.overallStatus === 'choked' || (results.layout?.airflowInterference?.minMagnetClearanceMm !== undefined && results.layout.airflowInterference.minMagnetClearanceMm <= 18) ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-700/80 text-rose-200 font-bold shadow-sm animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>BOUNDARY CHOKED ({results.layout.airflowInterference.minMagnetClearanceMm}mm)</span>
          </div>
        ) : results.isChuffingRisk ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-700/80 text-amber-200 font-bold shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Chuffing Risk ({results.portAirVelocityMs} m/s)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Laminar & Clash-Free</span>
          </div>
        )}

        {/* Primary Metrics Cluster */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800/80">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 text-[10px] uppercase">Net Vb:</span>
          <span className="text-cyan-300 font-bold">{results.netVolumeLiters} L</span>
          <span className="text-slate-500 text-[10px] hidden md:inline">({vbCuFt} ft³)</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800/80">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[10px] uppercase">
            {acoustics.alignment === 'sealed' ? 'Fc:' : 'Fb:'}
          </span>
          <span className="text-amber-300 font-bold">{results.tuningFrequencyFb} Hz</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800/80">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 text-[10px] uppercase">F3:</span>
          <span className="text-emerald-300 font-bold">{results.f3CutoffHz} Hz</span>
        </div>
      </div>

      {/* Right Action & Secondary Utility Cluster */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {/* Cabinet Mass & Cost (Clean subtle styling) */}
        <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <Scale className="w-3 h-3 text-slate-400" />
            <strong className="text-slate-200">{results.totalWeightKg} kg</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">${costUsd}</span>
        </div>

        {/* Live Simulation Panel Toggle */}
        {onToggleLiveSim && (
          <button
            onClick={onToggleLiveSim}
            title="Toggle dockable Live Acoustic Simulation curve panel"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition text-xs font-medium cursor-pointer ${
              isLiveSimOpen
                ? 'bg-cyan-950 border-cyan-600 text-cyan-200 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Live Sim</span>
          </button>
        )}

        {/* Optimize alignment helper button */}
        <button
          onClick={onOptimizeAlignment}
          title="Auto-calculate Keele / Small optimal volume and tuning for this driver"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-medium shadow-sm transition text-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-Align</span>
        </button>

        {/* CAD Export Button */}
        {onOpenCadExport && (
          <button
            onClick={onOpenCadExport}
            title="Export 3D Enclosure as CAD file (STL, STEP, OBJ)"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-100" />
            <span>Export CAD</span>
          </button>
        )}
      </div>
    </header>
  );
};
