import React, { useState } from 'react';
import type { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import { Activity, AlertTriangle, CheckCircle, Volume2, Clock, Zap } from 'lucide-react';

interface FrequencyResponseChartProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  onAutoFixPort?: () => void;
}

type ModalCurveTab = 'spl' | 'spinorama' | 'group_delay';

export const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = ({
  results,
  acoustics,
  onAutoFixPort,
}) => {
  const [activeTab, setActiveTab] = useState<ModalCurveTab>('spl');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = results.frequencyResponse || [];
  const spinPoints = results.spinorama || [];
  const gdPoints = results.groupDelay || [];

  if (!points || points.length === 0) return null;

  const svgWidth = 660;
  const svgHeight = 270;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
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

  // Scales based on active tab
  let minY = -30;
  let maxY = 6;
  let gridYValues = [6, 3, 0, -3, -6, -12, -18, -24, -30];

  if (activeTab === 'group_delay') {
    minY = 0;
    maxY = 50;
    gridYValues = [50, 40, 30, 20, 10, 0];
  }

  const valToY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + ((maxY - clamped) / (maxY - minY)) * plotHeight;
  };

  // Build SVG paths for SPL mode
  let totalPathD = '';
  let wooferPathD = '';
  let tweeterPathD = '';
  let midPathD = '';

  points.forEach((p, idx) => {
    const x = freqToX(p.freq);
    totalPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbTotal).toFixed(1)} `;
    wooferPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbWoofer).toFixed(1)} `;
    tweeterPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbTweeter).toFixed(1)} `;
    if (p.dbMidrange !== undefined) {
      midPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.dbMidrange).toFixed(1)} `;
    }
  });

  const areaD = `${totalPathD} L ${padLeft + plotWidth} ${padTop + plotHeight} L ${padLeft} ${padTop + plotHeight} Z`;

  // Build SVG paths for Spinorama mode
  let onAxisD = '';
  let lwD = '';
  let erD = '';
  let spD = '';
  let erdiD = '';
  let spdiD = '';

  spinPoints.forEach((p, idx) => {
    const x = freqToX(p.freq);
    onAxisD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.onAxis).toFixed(1)} `;
    lwD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.listeningWindow).toFixed(1)} `;
    erD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.earlyReflections).toFixed(1)} `;
    spD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.soundPower).toFixed(1)} `;
    erdiD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.erdi - 20).toFixed(1)} `;
    spdiD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.spdi - 20).toFixed(1)} `;
  });

  // Build SVG paths for Group Delay mode
  let gdActualD = '';
  let gdMaxLimitD = '';

  gdPoints.forEach((p, idx) => {
    const x = freqToX(p.freq);
    gdActualD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.groupDelayMs).toFixed(1)} `;
    gdMaxLimitD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${valToY(p.cycleThresholdMs).toFixed(1)} `;
  });

  const gridFreqs = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const majorFreqs = [20, 100, 1000, 10000];

  const f3X = freqToX(results.f3CutoffHz);
  const f3Y = valToY(-3);
  const fbX = freqToX(results.tuningFrequencyFb);

  const hoveredSpl = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredSpin = hoverIndex !== null && spinPoints[hoverIndex] ? spinPoints[hoverIndex] : null;
  const hoveredGd = hoverIndex !== null && gdPoints[hoverIndex] ? gdPoints[hoverIndex] : null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-sans text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-800/80 gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => {
              setActiveTab('spl');
              setHoverIndex(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
              activeTab === 'spl'
                ? 'bg-cyan-950 border border-cyan-600 text-cyan-300 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>SPL Transfer Function</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('spinorama');
              setHoverIndex(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
              activeTab === 'spinorama'
                ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CTA-2034 Spinorama</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('group_delay');
              setHoverIndex(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
              activeTab === 'group_delay'
                ? 'bg-purple-950 border border-purple-600 text-purple-300 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Group Delay Compliance</span>
          </button>
        </div>

        {/* Legend */}
        {activeTab === 'spl' && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-400 text-[11px]">Total Sum</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400 text-[11px]">Woofer Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-400 text-[11px]">Tweeter Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">F3:</span>
              <span className="font-semibold text-cyan-300">{results.f3CutoffHz} Hz</span>
            </div>
          </div>
        )}

        {activeTab === 'spinorama' && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-cyan-400">● On-Axis</span>
            <span className="text-emerald-400">● Listening Window</span>
            <span className="text-amber-400">● Early Refl</span>
            <span className="text-purple-400">● Sound Power</span>
          </div>
        )}

        {activeTab === 'group_delay' && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-cyan-400 font-semibold">● Group Delay (ms)</span>
            <span className="text-rose-400 font-semibold">--- 1.5/f Audibility Ceiling</span>
          </div>
        )}
      </div>

      <div className="relative w-full aspect-[21/9] min-h-[230px]">
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
              const activeArr =
                activeTab === 'spinorama' ? spinPoints : activeTab === 'group_delay' ? gdPoints : points;
              activeArr.forEach((pt, idx) => {
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
            <linearGradient id="splGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <rect x={padLeft} y={padTop} width={plotWidth} height={plotHeight} fill="#090b0e" stroke="#1e2430" strokeWidth="1" />

          {gridYValues.map((yVal) => {
            const y = valToY(yVal);
            const isZero = yVal === 0;
            const isMinus3 = yVal === -3;
            return (
              <g key={`db-${yVal}`}>
                <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke={isZero ? '#38bdf8' : isMinus3 ? '#f59e0b' : '#1e2430'} strokeDasharray={isMinus3 ? '4,4' : undefined} strokeWidth={isZero || isMinus3 ? 1.2 : 0.8} opacity={0.6} />
                <text x={padLeft - 6} y={y + 3.5} textAnchor="end" fontSize="9" fontFamily="monospace" fill={isZero ? '#38bdf8' : isMinus3 ? '#f59e0b' : '#64748b'}>
                  {activeTab === 'group_delay' ? `${yVal}ms` : yVal > 0 ? `+${yVal}` : yVal}
                </text>
              </g>
            );
          })}

          {gridFreqs.map((freqVal) => {
            const x = freqToX(freqVal);
            const isMajor = majorFreqs.includes(freqVal);
            return (
              <g key={`freq-${freqVal}`}>
                <line x1={x} y1={padTop} x2={x} y2={padTop + plotHeight} stroke="#1e2430" strokeWidth={isMajor ? 1 : 0.6} />
                {isMajor && (
                  <text x={x} y={padTop + plotHeight + 14} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#64748b">
                    {freqVal >= 1000 ? `${freqVal / 1000}k` : `${freqVal}`}Hz
                  </text>
                )}
              </g>
            );
          })}

          {/* SPL Mode Traces */}
          {activeTab === 'spl' && (
            <>
              <path d={areaD} fill="url(#splGrad)" />
              <path d={wooferPathD} fill="none" stroke="#10b981" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />
              <path d={tweeterPathD} fill="none" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />
              {midPathD && <path d={midPathD} fill="none" stroke="#a855f7" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />}
              <path d={totalPathD} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <line x1={f3X} y1={padTop} x2={f3X} y2={padTop + plotHeight} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />
              <circle cx={f3X} cy={f3Y} r="3.5" fill="#f59e0b" />
              {acoustics.alignment !== 'sealed' && (
                <line x1={fbX} y1={padTop} x2={fbX} y2={padTop + plotHeight} stroke="#10b981" strokeWidth="1.2" strokeDasharray="2,2" />
              )}
            </>
          )}

          {/* Spinorama Mode Traces */}
          {activeTab === 'spinorama' && (
            <>
              <path d={spD} fill="none" stroke="#a855f7" strokeWidth="1.4" opacity="0.85" />
              <path d={erD} fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.9" />
              <path d={lwD} fill="none" stroke="#10b981" strokeWidth="1.8" opacity="0.95" />
              <path d={onAxisD} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}

          {/* Group Delay Mode Traces */}
          {activeTab === 'group_delay' && (
            <>
              <path d={gdMaxLimitD} fill="none" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="4,4" opacity="0.85" />
              <path d={gdActualD} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Tooltip Cursor */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={freqToX(
                  activeTab === 'spinorama'
                    ? hoveredSpin?.freq || 100
                    : activeTab === 'group_delay'
                    ? hoveredGd?.freq || 100
                    : hoveredSpl?.freq || 100
                )}
                y1={padTop}
                x2={freqToX(
                  activeTab === 'spinorama'
                    ? hoveredSpin?.freq || 100
                    : activeTab === 'group_delay'
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

        {hoverIndex !== null && (
          <div className="absolute top-2 right-4 bg-slate-900/95 border border-slate-700/80 rounded px-3 py-1.5 text-xs font-mono shadow-xl flex items-center gap-4">
            {activeTab === 'spl' && hoveredSpl && (
              <>
                <div>
                  <span className="text-slate-500">FREQ: </span>
                  <span className="text-slate-100 font-semibold">{hoveredSpl.freq} Hz</span>
                </div>
                <div>
                  <span className="text-slate-500">TOTAL SPL: </span>
                  <span className="text-cyan-400 font-semibold">{hoveredSpl.dbTotal} dB</span>
                </div>
              </>
            )}
            {activeTab === 'spinorama' && hoveredSpin && (
              <>
                <div>
                  <span className="text-slate-500">FREQ: </span>
                  <span className="text-slate-100 font-semibold">{hoveredSpin.freq} Hz</span>
                </div>
                <div>
                  <span className="text-slate-500">ON-AXIS: </span>
                  <span className="text-cyan-400 font-semibold">{hoveredSpin.onAxis.toFixed(1)} dB</span>
                </div>
                <div>
                  <span className="text-slate-500">LIST WINDOW: </span>
                  <span className="text-emerald-400 font-semibold">{hoveredSpin.listeningWindow.toFixed(1)} dB</span>
                </div>
                <div>
                  <span className="text-slate-500">ERDI: </span>
                  <span className="text-amber-400 font-semibold">{hoveredSpin.erdi.toFixed(1)} dB</span>
                </div>
              </>
            )}
            {activeTab === 'group_delay' && hoveredGd && (
              <>
                <div>
                  <span className="text-slate-500">FREQ: </span>
                  <span className="text-slate-100 font-semibold">{hoveredGd.freq} Hz</span>
                </div>
                <div>
                  <span className="text-slate-500">GROUP DELAY: </span>
                  <span className="text-cyan-400 font-semibold">{hoveredGd.groupDelayMs.toFixed(1)} ms</span>
                </div>
                <div>
                  <span className="text-slate-500">1.5/f LIMIT: </span>
                  <span className="text-rose-400 font-semibold">{hoveredGd.cycleThresholdMs.toFixed(1)} ms</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {acoustics.alignment === 'ported' && activeTab === 'spl' && (
        <div className={`mt-3 p-2.5 rounded border text-xs flex items-center justify-between gap-3 ${
          results.isChuffingRisk ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {results.isChuffingRisk ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            <div>
              <span className="font-semibold font-mono">Port Air Velocity: {results.portAirVelocityMs} m/s</span>
              <span className="text-[11px] opacity-80 ml-2">
                {results.isChuffingRisk ? `High risk of port chuffing turbulence. Recommended min port Ø${results.recommendedMinimumPortDiameterMm}mm.` : 'Laminar airflow (< 17 m/s).'}
              </span>
            </div>
          </div>

          {results.isChuffingRisk && onAutoFixPort && (
            <button onClick={onAutoFixPort} className="px-2.5 py-1 text-[11px] font-medium rounded bg-rose-800 hover:bg-rose-700 text-white shrink-0 font-mono transition">
              Auto-Upsize Port
            </button>
          )}
        </div>
      )}
    </div>
  );
};
