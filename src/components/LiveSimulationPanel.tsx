import React, { useState } from 'react';
import type { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Maximize2,
  Wind,
  Zap,
  Volume2,
  Clock,
} from 'lucide-react';

interface LiveSimulationPanelProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  isOpen: boolean;
  onToggle: () => void;
  onAutoFixPort: () => void;
  onOpenFullModal: () => void;
}

export type SimCurveMode = 'spl' | 'spinorama' | 'group_delay' | 'excursion' | 'velocity';

export const LiveSimulationPanel: React.FC<LiveSimulationPanelProps> = ({
  results,
  acoustics,
  isOpen,
  onToggle,
  onAutoFixPort,
  onOpenFullModal,
}) => {
  const [curveMode, setCurveMode] = useState<SimCurveMode>('spl');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const points = results.frequencyResponse || [];
  const spinPoints = results.spinorama || [];
  const gdPoints = results.groupDelay || [];

  const svgWidth = 440;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 15;
  const padTop = 18;
  const padBottom = 30;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const minFreq = 10;
  const maxFreq = 20000;

  const freqToX = (f: number) => {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logVal = Math.log10(Math.max(minFreq, Math.min(maxFreq, f)));
    return padLeft + ((logVal - logMin) / (logMax - logMin)) * plotWidth;
  };

  // Y-axis scales depending on mode
  let minY = -30;
  let maxY = 6;
  let yUnit = 'dB';
  let gridYValues = [6, 0, -6, -12, -18, -24, -30];

  if (curveMode === 'excursion') {
    const maxExcursion = Math.max(10, Math.ceil(acoustics.driverAssignments.woofer.driver.xmax * 1.5));
    minY = 0;
    maxY = maxExcursion;
    yUnit = 'mm';
    gridYValues = [maxY, Math.round(maxY * 0.75), Math.round(maxY * 0.5), Math.round(maxY * 0.25), 0];
  } else if (curveMode === 'velocity') {
    minY = 0;
    maxY = Math.max(25, Math.ceil(results.portAirVelocityMs * 1.25));
    yUnit = 'm/s';
    gridYValues = [maxY, 17, 10, 5, 0];
  } else if (curveMode === 'group_delay') {
    minY = 0;
    maxY = 50;
    yUnit = 'ms';
    gridYValues = [50, 40, 30, 20, 10, 0];
  } else if (curveMode === 'spinorama') {
    minY = -30;
    maxY = 6;
    yUnit = 'dB';
    gridYValues = [6, 0, -6, -12, -18, -24, -30];
  }

  const valToY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + ((maxY - clamped) / (maxY - minY)) * plotHeight;
  };

  // Build SVG Paths for standard modes
  let mainPathD = '';
  let subPath1D = '';
  let subPath2D = '';

  // Spinorama paths
  let onAxisD = '';
  let lwD = '';
  let erD = '';
  let spD = '';

  // Group Delay paths
  let gdActualD = '';
  let gdMaxLimitD = '';

  if (curveMode === 'spl' || curveMode === 'excursion' || curveMode === 'velocity') {
    points.forEach((p, idx) => {
      const x = freqToX(p.freq);
      if (curveMode === 'spl') {
        mainPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbTotal).toFixed(1)} `;
        subPath1D += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbWoofer).toFixed(1)} `;
        subPath2D += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbTweeter).toFixed(1)} `;
      } else if (curveMode === 'excursion') {
        mainPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.excursionMm).toFixed(1)} `;
      } else if (curveMode === 'velocity') {
        mainPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.airVelocityMs || 0).toFixed(1)} `;
      }
    });
  } else if (curveMode === 'spinorama') {
    spinPoints.forEach((p, idx) => {
      const x = freqToX(p.freq);
      onAxisD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.onAxis).toFixed(1)} `;
      lwD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.listeningWindow).toFixed(1)} `;
      erD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.earlyReflections).toFixed(1)} `;
      spD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.soundPower).toFixed(1)} `;
    });
  } else if (curveMode === 'group_delay') {
    gdPoints.forEach((p, idx) => {
      const x = freqToX(p.freq);
      gdActualD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.groupDelayMs).toFixed(1)} `;
      gdMaxLimitD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.cycleThresholdMs).toFixed(1)} `;
    });
  }

  const areaD = mainPathD
    ? `${mainPathD} L ${padLeft + plotWidth} ${padTop + plotHeight} L ${padLeft} ${padTop + plotHeight} Z`
    : '';

  const gridFreqs = [20, 50, 100, 200, 500, 1000, 5000, 10000, 20000];
  const majorFreqs = [20, 100, 1000, 10000];

  const activePointsLength =
    curveMode === 'spinorama'
      ? spinPoints.length
      : curveMode === 'group_delay'
      ? gdPoints.length
      : points.length;

  const hoveredSpl = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredSpin = hoverIndex !== null && spinPoints[hoverIndex] ? spinPoints[hoverIndex] : null;
  const hoveredGd = hoverIndex !== null && gdPoints[hoverIndex] ? gdPoints[hoverIndex] : null;

  const isGroupDelayCompliant = gdPoints
    .filter((p) => p.freq <= 100)
    .every((p) => !p.isAudible);

  return (
    <aside className="absolute top-14 right-4 z-30 w-[440px] max-w-[calc(100vw-2rem)] bg-[#0a0d13]/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden font-sans text-slate-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#07090e] border-b border-slate-800/90 text-xs select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold tracking-wider uppercase text-slate-100 text-[11px]">
            Live Acoustic Simulation
          </span>
          <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[10px] font-mono">
            CTA-2034 READY
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenFullModal}
            title="Expand Fullscreen Chart"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            title="Close Live Simulation Dock"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center px-2 py-1.5 bg-slate-950 border-b border-slate-800/80 gap-1 text-[10.5px] font-mono overflow-x-auto">
        <button
          onClick={() => setCurveMode('spl')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
            curveMode === 'spl'
              ? 'bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>SPL (dB)</span>
        </button>

        <button
          onClick={() => setCurveMode('spinorama')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
            curveMode === 'spinorama'
              ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Volume2 className="w-3 h-3 text-emerald-400" />
          <span>CTA-2034</span>
        </button>

        <button
          onClick={() => setCurveMode('group_delay')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
            curveMode === 'group_delay'
              ? 'bg-purple-950 border border-purple-700/60 text-purple-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3 h-3 text-purple-400" />
          <span>Group Delay</span>
        </button>

        <button
          onClick={() => setCurveMode('excursion')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
            curveMode === 'excursion'
              ? 'bg-amber-950 border border-amber-700/60 text-amber-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3 h-3 text-amber-400" />
          <span>Excursion</span>
        </button>

        {acoustics.alignment === 'ported' && (
          <button
            onClick={() => setCurveMode('velocity')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
              curveMode === 'velocity'
                ? 'bg-rose-950 border border-rose-700/60 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3 h-3 text-rose-400" />
            <span>Air Vel</span>
          </button>
        )}
      </div>

      {/* Interactive SVG Curve Canvas */}
      <div className="p-3 bg-slate-950">
        <div className="relative w-full aspect-[21/11]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full select-none cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              if (mouseX >= padLeft && mouseX <= padLeft + plotWidth) {
                const logMin = Math.log10(minFreq);
                const logMax = Math.log10(maxFreq);
                const fraction = (mouseX - padLeft) / plotWidth;
                const fAtMouse = Math.pow(10, logMin + fraction * (logMax - logMin));
                let closestIdx = 0;
                let minDiff = 99999;

                const targetArr =
                  curveMode === 'spinorama'
                    ? spinPoints
                    : curveMode === 'group_delay'
                    ? gdPoints
                    : points;

                targetArr.forEach((pt, idx) => {
                  const diff = Math.abs(pt.freq - fAtMouse);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = idx;
                  }
                });
                setHoverIndex(closestIdx);
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="liveSplGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Rect */}
            <rect
              x={padLeft}
              y={padTop}
              width={plotWidth}
              height={plotHeight}
              fill="#06080c"
              stroke="#19202c"
              strokeWidth="1"
            />

            {/* Horizontal Grid & Labels */}
            {gridYValues.map((yVal) => {
              const y = valToY(yVal);
              const isThreshold = curveMode === 'velocity' && yVal === 17;
              return (
                <g key={`y-${yVal}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotWidth}
                    y2={y}
                    stroke={isThreshold ? '#ef4444' : '#1e2633'}
                    strokeDasharray={isThreshold ? '3,3' : undefined}
                    strokeWidth={isThreshold ? 1.2 : 0.8}
                    opacity={0.65}
                  />
                  <text
                    x={padLeft - 5}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fill={isThreshold ? '#ef4444' : '#64748b'}
                  >
                    {yVal}
                  </text>
                </g>
              );
            })}

            {/* Vertical Frequency Grid */}
            {gridFreqs.map((freqVal) => {
              const x = freqToX(freqVal);
              const isMajor = majorFreqs.includes(freqVal);
              return (
                <g key={`f-${freqVal}`}>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotHeight}
                    stroke="#1e2633"
                    strokeWidth={isMajor ? 1 : 0.6}
                  />
                  {isMajor && (
                    <text
                      x={x}
                      y={padTop + plotHeight + 12}
                      textAnchor="middle"
                      fontSize="8"
                      fontFamily="monospace"
                      fill="#64748b"
                    >
                      {freqVal >= 1000 ? `${freqVal / 1000}k` : `${freqVal}`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* SPL Mode Traces */}
            {curveMode === 'spl' && (
              <>
                <path d={areaD} fill="url(#liveSplGrad)" />
                <path d={subPath1D} fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.75" />
                <path d={subPath2D} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.75" />
                <path d={mainPathD} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1={freqToX(results.f3CutoffHz)} y1={padTop} x2={freqToX(results.f3CutoffHz)} y2={padTop + plotHeight} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />
                <circle cx={freqToX(results.f3CutoffHz)} cy={valToY(-3)} r="3.5" fill="#f59e0b" />
              </>
            )}

            {/* Spinorama Mode Traces */}
            {curveMode === 'spinorama' && (
              <>
                <path d={spD} fill="none" stroke="#a855f7" strokeWidth="1.2" opacity="0.8" />
                <path d={erD} fill="none" stroke="#f59e0b" strokeWidth="1.3" opacity="0.85" />
                <path d={lwD} fill="none" stroke="#10b981" strokeWidth="1.6" opacity="0.9" />
                <path d={onAxisD} fill="none" stroke="#38bdf8" strokeWidth="2.0" strokeLinecap="round" />
              </>
            )}

            {/* Group Delay Mode Traces */}
            {curveMode === 'group_delay' && (
              <>
                <path d={gdMaxLimitD} fill="none" stroke="#ef4444" strokeWidth="1.4" strokeDasharray="4,4" opacity="0.85" />
                <path d={gdActualD} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {/* Excursion & Velocity Main Traces */}
            {(curveMode === 'excursion' || curveMode === 'velocity') && (
              <path
                d={mainPathD}
                fill="none"
                stroke={curveMode === 'excursion' ? '#f59e0b' : '#ec4899'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Fb Marker Line */}
            {acoustics.alignment !== 'sealed' && curveMode !== 'group_delay' && (
              <line
                x1={freqToX(results.tuningFrequencyFb)}
                y1={padTop}
                x2={freqToX(results.tuningFrequencyFb)}
                y2={padTop + plotHeight}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )}

            {/* Hover Tooltip Cursor */}
            {hoverIndex !== null && (
              <g>
                <line
                  x1={freqToX(
                    curveMode === 'spinorama'
                      ? hoveredSpin?.freq || 100
                      : curveMode === 'group_delay'
                      ? hoveredGd?.freq || 100
                      : hoveredSpl?.freq || 100
                  )}
                  y1={padTop}
                  x2={freqToX(
                    curveMode === 'spinorama'
                      ? hoveredSpin?.freq || 100
                      : curveMode === 'group_delay'
                      ? hoveredGd?.freq || 100
                      : hoveredSpl?.freq || 100
                  )}
                  y2={padTop + plotHeight}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              </g>
            )}
          </svg>

          {/* Real-time Hover Value Box */}
          {hoverIndex !== null && (
            <div className="absolute top-1.5 right-2 bg-slate-900/95 border border-slate-700/80 rounded px-2 py-1 text-[10px] font-mono shadow-lg flex items-center gap-3">
              {curveMode === 'spinorama' && hoveredSpin && (
                <>
                  <span className="text-slate-400">{hoveredSpin.freq}Hz</span>
                  <span className="text-cyan-400 font-bold">ON: {hoveredSpin.onAxis.toFixed(1)}dB</span>
                  <span className="text-emerald-400">LW: {hoveredSpin.listeningWindow.toFixed(1)}dB</span>
                  <span className="text-amber-400">ERDI: {hoveredSpin.erdi.toFixed(1)}dB</span>
                </>
              )}
              {curveMode === 'group_delay' && hoveredGd && (
                <>
                  <span className="text-slate-400">{hoveredGd.freq}Hz</span>
                  <span className="text-cyan-400 font-bold">Delay: {hoveredGd.groupDelayMs.toFixed(1)}ms</span>
                  <span className="text-rose-400">Limit: {hoveredGd.cycleThresholdMs.toFixed(1)}ms</span>
                </>
              )}
              {(curveMode === 'spl' || curveMode === 'excursion' || curveMode === 'velocity') && hoveredSpl && (
                <>
                  <span className="text-slate-400">{hoveredSpl.freq}Hz</span>
                  <span className="text-cyan-400 font-bold">
                    {curveMode === 'spl'
                      ? `${hoveredSpl.dbTotal} dB`
                      : curveMode === 'excursion'
                      ? `${hoveredSpl.excursionMm} mm`
                      : `${hoveredSpl.airVelocityMs} m/s`}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend / Diagnostic Ribbon */}
        {curveMode === 'spinorama' ? (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-4 gap-1.5 text-[9.5px] font-mono text-center">
            <div className="bg-slate-900/80 border border-slate-800 p-1 rounded text-cyan-300">
              ● On-Axis
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 rounded text-emerald-300">
              ● List Window
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 rounded text-amber-300">
              ● Early Refl
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1 rounded text-purple-300">
              ● Sound Power
            </div>
          </div>
        ) : curveMode === 'group_delay' ? (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              {isGroupDelayCompliant ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className={isGroupDelayCompliant ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                {isGroupDelayCompliant
                  ? 'Blauert-Laws Compliant (< 1.5 Cycles)'
                  : 'Notice: Low-end delay exceeds 1.5 cycles limit'}
              </span>
            </div>
            <span className="text-slate-400 text-[9.5px]">Threshold: 1.5 / f</span>
          </div>
        ) : (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">F3 CUTOFF</span>
              <span className="text-amber-400 font-bold">{results.f3CutoffHz} Hz</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">
                {acoustics.alignment === 'sealed' ? 'SYSTEM QTC' : 'TUNING FB'}
              </span>
              <span className="text-cyan-400 font-bold">
                {acoustics.alignment === 'sealed' ? results.boxQtc : `${results.tuningFrequencyFb} Hz`}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">INTERNAL RES</span>
              <span className="text-emerald-400 font-bold">{results.firstInternalResonanceHz} Hz</span>
            </div>
          </div>
        )}

        {/* Chuffing / Turbulence Advisory (Ported alignment) */}
        {acoustics.alignment === 'ported' && curveMode === 'velocity' && (
          <div
            className={`mt-2 p-2 rounded border text-[11px] flex items-center justify-between gap-2 ${
              results.isChuffingRisk
                ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {results.isChuffingRisk ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="font-semibold font-mono">
                  {results.portAirVelocityMs} m/s
                </span>
                <span className="opacity-75 text-[10px] ml-1.5">
                  {results.isChuffingRisk
                    ? `Chuffing risk (thresh 17 m/s). Min Ø${results.recommendedMinimumPortDiameterMm}mm.`
                    : 'Laminar flow (<17 m/s).'}
                </span>
              </div>
            </div>

            {results.isChuffingRisk && (
              <button
                onClick={onAutoFixPort}
                className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-mono text-[10px] font-semibold transition shrink-0"
              >
                Auto-Fix
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
