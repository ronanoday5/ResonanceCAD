import React from 'react';
import type { AcousticParameters, CrossoverNetworkResult, FilterOrder, FilterType } from '../types/loudspeaker.ts';
import { Cpu, Sliders, ShieldCheck, Zap } from 'lucide-react';

interface CrossoverDesignerProps {
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  crossoverResults: CrossoverNetworkResult;
}

export const CrossoverDesigner: React.FC<CrossoverDesignerProps> = ({
  acoustics,
  setAcoustics,
  crossoverResults,
}) => {
  const { topology, driverAssignments, crossoverLowHz, crossoverHighHz, lowPassOrder, lowPassType, highPassOrder, highPassType } = acoustics;

  const handleDriverAttenuation = (role: 'tweeter' | 'midrange', db: number) => {
    setAcoustics((prev) => ({
      ...prev,
      driverAssignments: {
        ...prev.driverAssignments,
        [role]: {
          ...prev.driverAssignments[role],
          attenuationDb: db,
        },
      },
    }));
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-sans text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Passive Crossover Network Designer & Filter Math
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates exact air-core inductors, film capacitors, L-Pad attenuators, and Zobel impedance networks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
            {topology.toUpperCase()} ALIGNMENT
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300">
            PCB AREA ~{crossoverResults.estimatedPcbAreaCm2} cm²
          </span>
        </div>
      </div>

      {/* Filter Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Low-Pass / Woofer Crossover Settings */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              Woofer Low-Pass Filter ({acoustics.driverAssignments.woofer.driver.brand} {acoustics.driverAssignments.woofer.driver.model})
            </span>
            <span className="text-xs font-mono text-slate-400">{crossoverLowHz} Hz</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Crossover Frequency (fc):</span>
              <span className="text-cyan-300 font-bold">{crossoverLowHz} Hz</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="50"
              value={crossoverLowHz}
              onChange={(e) =>
                setAcoustics((p) => ({ ...p, crossoverLowHz: parseInt(e.target.value) }))
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Slope</label>
              <select
                value={lowPassOrder}
                onChange={(e) =>
                  setAcoustics((p) => ({ ...p, lowPassOrder: parseInt(e.target.value) as FilterOrder }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value={1}>1st Order (6 dB/oct)</option>
                <option value={2}>2nd Order (12 dB/oct)</option>
                <option value={3}>3rd Order (18 dB/oct)</option>
                <option value={4}>4th Order (24 dB/oct)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Alignment</label>
              <select
                value={lowPassType}
                onChange={(e) =>
                  setAcoustics((p) => ({ ...p, lowPassType: e.target.value as FilterType }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="linkwitz_riley">Linkwitz-Riley (Q=0.5)</option>
                <option value="butterworth">Butterworth (Q=0.707)</option>
              </select>
            </div>
          </div>
        </div>

        {/* High-Pass / Tweeter Crossover Settings */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Tweeter High-Pass Filter ({acoustics.driverAssignments.tweeter.driver.brand} {acoustics.driverAssignments.tweeter.driver.model})
            </span>
            <span className="text-xs font-mono text-slate-400">
              {topology === 'three_way' ? crossoverHighHz : crossoverLowHz} Hz
            </span>
          </div>

          {topology === 'three_way' && (
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">High Crossover (fc2):</span>
                <span className="text-amber-300 font-bold">{crossoverHighHz} Hz</span>
              </div>
              <input
                type="range"
                min="2000"
                max="8000"
                step="100"
                value={crossoverHighHz}
                onChange={(e) =>
                  setAcoustics((p) => ({ ...p, crossoverHighHz: parseInt(e.target.value) }))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Slope</label>
              <select
                value={highPassOrder}
                onChange={(e) =>
                  setAcoustics((p) => ({ ...p, highPassOrder: parseInt(e.target.value) as FilterOrder }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value={1}>1st Order (6 dB/oct)</option>
                <option value={2}>2nd Order (12 dB/oct)</option>
                <option value={3}>3rd Order (18 dB/oct)</option>
                <option value={4}>4th Order (24 dB/oct)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Filter Alignment</label>
              <select
                value={highPassType}
                onChange={(e) =>
                  setAcoustics((p) => ({ ...p, highPassType: e.target.value as FilterType }))
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="linkwitz_riley">Linkwitz-Riley (Q=0.5)</option>
                <option value="butterworth">Butterworth (Q=0.707)</option>
              </select>
            </div>
          </div>

          {/* Tweeter L-Pad Attenuation Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Tweeter Attenuation (L-Pad):</span>
              <span className="text-amber-300 font-bold">-{driverAssignments.tweeter.attenuationDb} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={driverAssignments.tweeter.attenuationDb}
              onChange={(e) => handleDriverAttenuation('tweeter', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Crossover Component Bill of Materials Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Calculated Component Bill of Materials</span>
          </span>
          <span className="text-slate-400">{crossoverResults.allComponents.length} passive components</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2 px-3">Designator & Component Name</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-3 text-right">Value</th>
              <th className="py-2 px-3">Rating / Construction</th>
              <th className="py-2 px-3">Circuit Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-300">
            {crossoverResults.allComponents.map((comp) => (
              <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                <td className="py-2 px-3 font-semibold text-slate-200">{comp.name}</td>
                <td className="py-2 px-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      comp.type === 'inductor'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : comp.type === 'capacitor'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {comp.type}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-bold text-cyan-300 text-sm">
                  {comp.valueFormatted}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">{comp.voltagePowerRating}</td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">{comp.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
