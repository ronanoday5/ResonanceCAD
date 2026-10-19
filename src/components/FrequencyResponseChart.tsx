import React, { useState } from 'react';
import type { AcousticCalculationResult, AcousticParameters } from '../types/loudspeaker.ts';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface FrequencyResponseChartProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  onAutoFixPort?: () => void;
}

export const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = ({
  results,
  acoustics,
  onAutoFixPort,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = results.frequencyResponse;
  if (!points || points.length === 0) return null;

  const svgWidth = 640;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const minFreq = 10;
  const maxFreq = 20000;
  const minDb = -30;
  const maxDb = 6;

  const freqToX = (f: number) => {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logVal = Math.log10(Math.max(minFreq, Math.min(maxFreq, f)));
    return padLeft + ((logVal - logMin) / (logMax - logMin)) * plotWidth;
  };

  const dbToY = (db: number) => {
    const clampedDb = Math.max(minDb, Math.min(maxDb, db));
    return padTop + ((maxDb - clampedDb) / (maxDb - minDb)) * plotHeight;
  };

  // Build SVG paths for total, woofer, tweeter, midrange
  let totalPathD = '';
  let wooferPathD = '';
  let tweeterPathD = '';
  let midPathD = '';

  points.forEach((p, idx) => {
    const x = freqToX(p.freq);
    totalPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${dbToY(p.dbTotal).toFixed(1)} `;
    wooferPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${dbToY(p.dbWoofer).toFixed(1)} `;
    tweeterPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${dbToY(p.dbTweeter).toFixed(1)} `;
    if (p.dbMidrange !== undefined) {
      midPathD += `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${dbToY(p.dbMidrange).toFixed(1)} `;
    }
  });

  const areaD = `${totalPathD} L ${padLeft + plotWidth} ${padTop + plotHeight} L ${padLeft} ${padTop + plotHeight} Z`;

  const gridFreqs = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const majorFreqs = [20, 100, 1000, 10000];
  const gridDbs = [6, 3, 0, -3, -6, -12, -18, -24, -30];

  const f3X = freqToX(results.f3CutoffHz);
  const f3Y = dbToY(-3);
  const fbX = freqToX(results.tuningFrequencyFb);

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-sans text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
            Acoustic SPL Transfer Function ({acoustics.topology.toUpperCase()})
          </h4>
        </div>

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
      </div>

      <div className="relative w-full aspect-[21/9] min-h-[220px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
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
              points.forEach((pt, idx) => {
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

          {gridDbs.map((dbVal) => {
            const y = dbToY(dbVal);
            const isZero = dbVal === 0;
            const isMinus3 = dbVal === -3;
            return (
              <g key={`db-${dbVal}`}>
                <line x1={padLeft} y1={y} x2={padLeft + plotWidth} y2={y} stroke={isZero ? '#38bdf8' : isMinus3 ? '#f59e0b' : '#1e2430'} strokeDasharray={isMinus3 ? '4,4' : undefined} strokeWidth={isZero || isMinus3 ? 1.2 : 0.8} opacity={0.6} />
                <text x={padLeft - 6} y={y + 3.5} textAnchor="end" fontSize="9" fontFamily="monospace" fill={isZero ? '#38bdf8' : isMinus3 ? '#f59e0b' : '#64748b'}>
                  {dbVal > 0 ? `+${dbVal}` : dbVal}
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

          <path d={areaD} fill="url(#splGrad)" />

          {/* Passband Traces */}
          <path d={wooferPathD} fill="none" stroke="#10b981" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />
          <path d={tweeterPathD} fill="none" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />
          {midPathD && <path d={midPathD} fill="none" stroke="#a855f7" strokeWidth="1.4" strokeDasharray="3,3" opacity="0.8" />}

          {/* Total Sum SPL Curve */}
          <path d={totalPathD} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

          {/* F3 Marker */}
          <line x1={f3X} y1={padTop} x2={f3X} y2={padTop + plotHeight} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />
          <circle cx={f3X} cy={f3Y} r="3.5" fill="#f59e0b" />

          {/* Fb Marker */}
          {acoustics.alignment !== 'sealed' && (
            <line x1={fbX} y1={padTop} x2={fbX} y2={padTop + plotHeight} stroke="#10b981" strokeWidth="1.2" strokeDasharray="2,2" />
          )}

          {/* Tooltip Cursor */}
          {hoveredPoint && (
            <g>
              <line x1={freqToX(hoveredPoint.freq)} y1={padTop} x2={freqToX(hoveredPoint.freq)} y2={padTop + plotHeight} stroke="#ffffff" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx={freqToX(hoveredPoint.freq)} cy={dbToY(hoveredPoint.dbTotal)} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-slate-900/95 border border-slate-700/80 rounded px-3 py-1.5 text-xs font-mono shadow-xl flex items-center gap-4">
            <div>
              <span className="text-slate-500">FREQ: </span>
              <span className="text-slate-100 font-semibold">{hoveredPoint.freq} Hz</span>
            </div>
            <div>
              <span className="text-slate-500">TOTAL SPL: </span>
              <span className="text-cyan-400 font-semibold">{hoveredPoint.dbTotal} dB</span>
            </div>
          </div>
        )}
      </div>

      {acoustics.alignment === 'ported' && (
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
