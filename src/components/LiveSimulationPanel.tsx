import React, { useState } from 'react';
import type { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Maximize2,
  Wind,
  Zap,
  Volume2,
  Clock,
  X,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useUnits } from '../context/UnitContext.tsx';

interface LiveSimulationPanelProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  isOpen: boolean;
  onToggle: () => void;
  onOpenFullModal: () => void;
  embedded?: boolean;
}

export type SimCurveMode = 'spl' | 'spinorama' | 'group_delay' | 'excursion' | 'velocity' | 'impedance';

export const LiveSimulationPanel: React.FC<LiveSimulationPanelProps> = ({
  results,
  acoustics,
  isOpen,
  onToggle,
  onOpenFullModal,
  embedded = false,
}) => {
  const { formatLength, formatVelocity } = useUnits();
  const [curveMode, setCurveMode] = useState<SimCurveMode>('spl');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!isOpen && !embedded) return null;

  const points = results.frequencyResponse || [];
  const spinPoints = results.spinorama || [];
  const gdPoints = results.groupDelay || [];
  const impReport = results.systemImpedance;
  const impPoints = impReport?.points || [];
  const freeAirPoints = impReport?.freeAirPoints || [];

  const svgWidth = 440;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = curveMode === 'impedance' ? 35 : 15;
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
  let gridYValues = [6, 0, -6, -12, -18, -24, -30];

  const maxImpMag = Math.max(45, Math.ceil((impReport?.peakImpedanceOhm || 40) * 1.15 / 10) * 10);

  if (curveMode === 'excursion') {
    const maxExcursion = Math.max(10, Math.ceil(acoustics.driverAssignments.woofer.driver.xmax * 1.5));
    minY = 0;
    maxY = maxExcursion;
    gridYValues = [maxY, Math.round(maxY * 0.75), Math.round(maxY * 0.5), Math.round(maxY * 0.25), 0];
  } else if (curveMode === 'velocity') {
    minY = 0;
    maxY = Math.max(25, Math.ceil(results.portAirVelocityMs * 1.25));
    gridYValues = [maxY, 17, 10, 5, 0];
  } else if (curveMode === 'group_delay') {
    minY = 0;
    maxY = 50;
    gridYValues = [50, 40, 30, 20, 10, 0];
  } else if (curveMode === 'spinorama') {
    minY = -30;
    maxY = 6;
    gridYValues = [6, 0, -6, -12, -18, -24, -30];
  } else if (curveMode === 'impedance') {
    minY = 0;
    maxY = maxImpMag;
    gridYValues = [maxImpMag, Math.round(maxImpMag * 0.75), Math.round(maxImpMag * 0.5), Math.round(maxImpMag * 0.25), 0];
  }

  const valToY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + ((maxY - clamped) / (maxY - minY)) * plotHeight;
  };

  const phaseToY = (deg: number) => {
    const clamped = Math.max(-90, Math.min(90, deg));
    return padTop + ((90 - clamped) / 180) * plotHeight;
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

  // Impedance paths
  let sysImpD = '';
  let sysPhaseD = '';
  let freeAirImpD = '';

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
  } else if (curveMode === 'impedance') {
    impPoints.forEach((p, idx) => {
      const x = freqToX(p.freq);
      sysImpD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.magnitudeOhm).toFixed(1)} `;
      sysPhaseD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${phaseToY(p.phaseDeg).toFixed(1)} `;
    });
    freeAirPoints.forEach((p, idx) => {
      const x = freqToX(p.freq);
      freeAirImpD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.magnitudeOhm).toFixed(1)} `;
    });
  }

  const areaD = mainPathD
    ? `${mainPathD} L ${padLeft + plotWidth} ${padTop + plotHeight} L ${padLeft} ${padTop + plotHeight} Z`
    : '';

  const gridFreqs = [20, 50, 100, 200, 500, 1000, 5000, 10000, 20000];
  const majorFreqs = [20, 100, 1000, 10000];

  const hoveredSpl = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredSpin = hoverIndex !== null && spinPoints[hoverIndex] ? spinPoints[hoverIndex] : null;
  const hoveredGd = hoverIndex !== null && gdPoints[hoverIndex] ? gdPoints[hoverIndex] : null;

  const isGroupDelayCompliant = gdPoints
    .filter((p) => p.freq <= 100)
    .every((p) => !p.isAudible);

  const containerClass = embedded
    ? 'w-full bg-[#090c12] border border-slate-800/90 rounded-xl flex flex-col overflow-hidden font-sans text-slate-200 shadow-lg'
    : 'absolute top-14 right-4 z-30 w-[440px] max-w-[calc(100vw-2rem)] bg-[#0a0d13]/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden font-sans text-slate-200';

  return (
    <aside className={containerClass}>
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
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition text-[10px] font-mono cursor-pointer"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Expand</span>
          </button>
          {!embedded && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              title="Close Live Simulation (X)"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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

        <button
          onClick={() => setCurveMode('impedance')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition shrink-0 ${
            curveMode === 'impedance'
              ? 'bg-amber-950 border border-amber-600/80 text-amber-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3 h-3 text-amber-400" />
          <span>Impedance (|Z|)</span>
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

            {/* Impedance Mode Traces */}
            {curveMode === 'impedance' && (
              <>
                {/* Right Y-axis for Phase in Impedance Mode */}
                {[-90, 0, 90].map((phaseVal) => {
                  const py = phaseToY(phaseVal);
                  return (
                    <g key={`live-phase-${phaseVal}`}>
                      {phaseVal === 0 && (
                        <line x1={padLeft} y1={py} x2={padLeft + plotWidth} y2={py} stroke="#f59e0b" strokeDasharray="3,3" strokeWidth={1} opacity={0.4} />
                      )}
                      <text x={padLeft + plotWidth + 4} y={py + 3} textAnchor="start" fontSize="7.5" fontFamily="monospace" fill="#f59e0b">
                        {phaseVal > 0 ? `+${phaseVal}°` : `${phaseVal}°`}
                      </text>
                    </g>
                  );
                })}

                {/* Free-Air Driver Impedance (Dotted Violet) */}
                <path d={freeAirImpD} fill="none" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.75" />
                {/* System Phase (Dashed Amber) */}
                <path d={sysPhaseD} fill="none" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.85" />
                {/* System Impedance Magnitude (Solid Cyan) */}
                <path d={sysImpD} fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                {impReport?.portTuningFbHz && (
                  <circle
                    cx={freqToX(impReport.portTuningFbHz)}
                    cy={phaseToY(0)}
                    r="3.5"
                    fill="#10b981"
                  />
                )}
                {impReport?.boxResonanceFcHz && (
                  <circle
                    cx={freqToX(impReport.boxResonanceFcHz)}
                    cy={valToY(impReport.peakImpedanceOhm)}
                    r="3.5"
                    fill="#f59e0b"
                  />
                )}
              </>
            )}

            {/* Fb Marker Line */}
            {acoustics.alignment !== 'sealed' && curveMode !== 'group_delay' && curveMode !== 'impedance' && (
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
                      : curveMode === 'impedance'
                      ? impPoints[hoverIndex]?.freq || 100
                      : hoveredSpl?.freq || 100
                  )}
                  y1={padTop}
                  x2={freqToX(
                    curveMode === 'spinorama'
                      ? hoveredSpin?.freq || 100
                      : curveMode === 'group_delay'
                      ? hoveredGd?.freq || 100
                      : curveMode === 'impedance'
                      ? impPoints[hoverIndex]?.freq || 100
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
              {curveMode === 'impedance' && impPoints[hoverIndex] && (
                <>
                  <span className="text-slate-400">{impPoints[hoverIndex].freq}Hz</span>
                  <span className="text-cyan-400 font-bold">{impPoints[hoverIndex].magnitudeOhm.toFixed(1)}Ω</span>
                  <span className="text-amber-400">{impPoints[hoverIndex].phaseDeg > 0 ? `+${impPoints[hoverIndex].phaseDeg.toFixed(0)}` : impPoints[hoverIndex].phaseDeg.toFixed(0)}°</span>
                  {freeAirPoints[hoverIndex] && (
                    <span className="text-purple-400">Free: {freeAirPoints[hoverIndex].magnitudeOhm.toFixed(1)}Ω</span>
                  )}
                </>
              )}
              {(curveMode === 'spl' || curveMode === 'excursion' || curveMode === 'velocity') && hoveredSpl && (
                <>
                  <span className="text-slate-400">{hoveredSpl.freq}Hz</span>
                  <span className="text-cyan-400 font-bold">
                    {curveMode === 'spl'
                      ? `${hoveredSpl.dbTotal} dB`
                      : curveMode === 'excursion'
                      ? formatLength(hoveredSpl.excursionMm)
                      : formatVelocity(hoveredSpl.airVelocityMs ?? 0)}
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
        ) : curveMode === 'impedance' ? (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono text-center tabular-nums">
            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">MIN IMPEDANCE</span>
              <span className="text-rose-400 font-bold">
                {impReport?.minimumImpedanceOhm ?? 3.8} Ω (@ {impReport?.minImpedanceFreqHz ?? 120}Hz)
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">
                {acoustics.alignment === 'sealed' ? 'BOX PEAK (Fc)' : 'TUNING DIP (Fb)'}
              </span>
              <span className="text-cyan-400 font-bold">
                {acoustics.alignment === 'sealed'
                  ? `${impReport?.boxResonanceFcHz ?? results.f3CutoffHz} Hz`
                  : `${impReport?.portTuningFbHz ?? results.tuningFrequencyFb} Hz (0°)`}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded">
              <span className="text-slate-500 block">NOMINAL LOAD</span>
              <span className="text-emerald-400 font-bold">{impReport?.nominalImpedanceOhm ?? 8} Ω Amplifier</span>
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
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono text-center tabular-nums">
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
                <span className="font-semibold font-mono tabular-nums">
                  {formatVelocity(results.portAirVelocityMs)}
                </span>
                <span className="opacity-75 text-[10px] ml-1.5">
                  {results.isChuffingRisk
                    ? `Chuffing risk (thresh ${formatVelocity(17)}). Min Ø${formatLength(results.recommendedMinimumPortDiameterMm)}.`
                    : `Laminar flow (<${formatVelocity(17)}).`}
                </span>
              </div>
            </div>

            {results.isChuffingRisk && (
              <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-[10px] font-semibold shrink-0">
                Turbulent
              </span>
            )}
          </div>
        )}

        {/* INTEGRAL 3D-PRINTED ACOUSTIC DAMPENING & TPMS MATRIX HUD TELEMETRY */}
        {results.additiveAcousticReport && results.additiveAcousticReport.enabled && (
          <div className="mt-2.5 p-2 rounded-lg bg-slate-950/90 border border-cyan-800/60 text-[10px] font-mono space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>3D-Printed TPMS Matrix Dampening</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-700/60">
                100% Foam-Free
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">BACK-WAVE LOSS</span>
                <span className="text-emerald-400 font-bold">{results.additiveAcousticReport.backWaveAttenuationDb} dB</span>
              </div>
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">FLOW RESISTIVITY (σ)</span>
                <span className="text-cyan-400 font-bold">{results.additiveAcousticReport.jca.flowResistivityRaylsM} Rayls/m</span>
              </div>
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">RIGIDITY GAIN (EI)</span>
                <span className="text-amber-400 font-bold">+{Math.round((results.additiveAcousticReport.stiffnessGainFactor - 1) * 100)}% ({results.additiveAcousticReport.stiffnessGainFactor}x)</span>
              </div>
              <div className="bg-slate-900/80 p-1 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">OVERHANG ANGLE</span>
                <span className="text-emerald-400 font-bold">≤ {results.additiveAcousticReport.maxMeasuredOverhangDeg}° (Self-Sup)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
