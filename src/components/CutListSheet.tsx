import React, { useState } from 'react';
import { CutListItem, EnclosureDimensions } from '../types/loudspeaker.ts';
import { exportCutListToCSV } from '../services/cutlistGenerator.ts';
import { Download, FileText, Printer, Ruler } from 'lucide-react';

interface CutListSheetProps {
  cutList: CutListItem[];
  dimensions: EnclosureDimensions;
  onSelectPart: (partId: string) => void;
}

export const CutListSheet: React.FC<CutListSheetProps> = ({ cutList, dimensions, onSelectPart }) => {
  const [unit, setUnit] = useState<'mm' | 'inch'>('mm');

  const totalParts = cutList.reduce((acc, p) => acc + p.quantity, 0);
  const totalWeight = cutList.reduce((acc, p) => acc + p.weightKg, 0);

  // Total square meters of sheet material
  const totalAreaM2 = cutList.reduce((acc, p) => {
    return acc + (p.widthMm * p.lengthMm * p.quantity) * 1e-6;
  }, 0);
  const totalAreaSqFt = totalAreaM2 * 10.7639;

  // Percentage of standard 5x5 ft (1525 x 1525 mm = 2.325 m2) Baltic Birch sheet
  const standardSheetAreaM2 = 1.525 * 1.525;
  const sheetYieldFraction = (totalAreaM2 / standardSheetAreaM2) * 100;

  const handleExportCSV = () => {
    const csvContent = exportCutListToCSV(cutList, dimensions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ResonanceCAD_CutList_${dimensions.externalWidthMm}x${dimensions.externalHeightMm}x${dimensions.externalDepthMm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
      project: 'ResonanceCAD Custom Loudspeaker Enclosure',
      exportedAt: new Date().toISOString(),
      dimensions,
      cutList,
      summary: {
        totalParts,
        totalWeightKg: totalWeight,
        totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
        totalAreaSqFt: Math.round(totalAreaSqFt * 10) / 10,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ResonanceCAD_CAD_Spec_${dimensions.externalWidthMm}x${dimensions.externalHeightMm}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDim = (valMm: number) => {
    if (unit === 'mm') return `${valMm} mm`;
    return `${(valMm / 25.4).toFixed(3)}"`;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-sans text-slate-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Workshop Panel Cut List & Machining Sheet
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exact physical dimensions accounting for joints, kerf allowances, and router rebates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setUnit('mm')}
              className={`px-2.5 py-1 rounded transition ${unit === 'mm' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              METRIC (MM)
            </button>
            <button
              onClick={() => setUnit('inch')}
              className={`px-2.5 py-1 rounded transition ${unit === 'inch' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              IMPERIAL (IN)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Workshop Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Parts</span>
          <span className="text-lg font-bold font-mono text-slate-100">{totalParts} panels</span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{cutList.length} unique shapes</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Raw Board Area</span>
          <span className="text-lg font-bold font-mono text-cyan-300">{totalAreaM2.toFixed(2)} m²</span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{totalAreaSqFt.toFixed(1)} sq.ft</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sheet Yield (5x5 ft)</span>
          <span className="text-lg font-bold font-mono text-amber-300">{sheetYieldFraction.toFixed(0)}%</span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
            {sheetYieldFraction <= 100 ? 'Fits on 1 standard sheet' : 'Requires 2+ sheets'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Est. Panel Mass</span>
          <span className="text-lg font-bold font-mono text-emerald-300">{totalWeight.toFixed(1)} kg</span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{(totalWeight * 2.20462).toFixed(1)} lbs dry</span>
        </div>
      </div>

      {/* Detailed Cut Table */}
      <div className="overflow-x-auto border border-slate-800 rounded">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Component</th>
              <th className="py-2.5 px-2 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Width (X)</th>
              <th className="py-2.5 px-3 text-right">Length (Y)</th>
              <th className="py-2.5 px-3 text-right">Thick (Z)</th>
              <th className="py-2.5 px-3">Machining / Joinery Specification</th>
              <th className="py-2.5 px-2 text-right">Mass</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-300">
            {cutList.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectPart(item.id)}
                className="hover:bg-slate-800/40 cursor-pointer transition group"
              >
                <td className="py-2.5 px-3 font-sans">
                  <div className="font-medium text-slate-200 group-hover:text-cyan-300 transition flex items-center gap-1.5">
                    <span>{item.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{item.cutNotes}</div>
                </td>
                <td className="py-2.5 px-2 text-center font-bold text-slate-100">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">{formatDim(item.widthMm)}</td>
                <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">{formatDim(item.lengthMm)}</td>
                <td className="py-2.5 px-3 text-right text-slate-400">{formatDim(item.thicknessMm)}</td>
                <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs">{item.machiningNotes}</td>
                <td className="py-2.5 px-2 text-right text-slate-400">{item.weightKg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
