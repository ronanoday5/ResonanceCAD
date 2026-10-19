import React from 'react';
import { PartMetadata } from '../types/loudspeaker.ts';
import { X, Layers, Wrench, Volume2, ShieldCheck, Copy, Check } from 'lucide-react';

interface PartInspectorModalProps {
  part: PartMetadata | null;
  onClose: () => void;
}

export const PartInspectorModal: React.FC<PartInspectorModalProps> = ({ part, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!part) return null;

  const handleCopy = () => {
    const text = `Part: ${part.name}
Dimensions: ${part.dimensionsMm.w}mm x ${part.dimensionsMm.h}mm x ${part.dimensionsMm.d}mm (${(part.dimensionsMm.w/25.4).toFixed(2)}" x ${(part.dimensionsMm.h/25.4).toFixed(2)}" x ${(part.dimensionsMm.d/25.4).toFixed(2)}")
Material: ${part.material}
Acoustic Role: ${part.acousticRole}
Assembly Notes: ${part.assemblyNotes}
Machining:
${part.machiningOperations.map(m => ` - ${m}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat: PartMetadata['category']) => {
    switch (cat) {
      case 'panel':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Enclosure Panel</span>;
      case 'brace':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Internal Brace</span>;
      case 'driver':
        return <span className="bg-sky-950/80 text-sky-300 border border-sky-700/50 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Transducer Motor</span>;
      case 'port':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Helmholtz Port</span>;
      case 'acoustic':
        return <span className="bg-teal-950/80 text-teal-300 border border-teal-700/50 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Acoustic Treatment</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">Hardware</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-100">{part.name}</h3>
                {getCategoryBadge(part.category)}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {part.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Exact Dimensions Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Finished Machining Dimensions
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono block">WIDTH (X)</span>
                <span className="font-mono text-cyan-300 font-semibold text-sm">
                  {part.dimensionsMm.w} mm
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ({(part.dimensionsMm.w / 25.4).toFixed(2)}")
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono block">HEIGHT (Y)</span>
                <span className="font-mono text-cyan-300 font-semibold text-sm">
                  {part.dimensionsMm.h} mm
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ({(part.dimensionsMm.h / 25.4).toFixed(2)}")
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-mono block">DEPTH / THICK (Z)</span>
                <span className="font-mono text-cyan-300 font-semibold text-sm">
                  {part.dimensionsMm.d} mm
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ({(part.dimensionsMm.d / 25.4).toFixed(2)}")
                </span>
              </div>
            </div>
            {part.weightKg !== undefined && (
              <div className="mt-2 text-right text-[11px] font-mono text-slate-400">
                Estimated Component Mass: <span className="text-slate-200 font-semibold">{part.weightKg} kg</span> ({(part.weightKg * 2.20462).toFixed(2)} lbs)
              </div>
            )}
          </div>

          {/* Material */}
          <div className="bg-slate-950/60 border border-slate-800 rounded p-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Material Specification
            </span>
            <div className="font-medium text-xs text-amber-200">
              {part.material}
            </div>
          </div>

          {/* Acoustic Role */}
          <div className="bg-slate-950/60 border border-slate-800 rounded p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Acoustic Function</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {part.acousticRole}
            </p>
          </div>

          {/* Assembly & Woodworking Notes */}
          <div className="bg-slate-950/60 border border-slate-800 rounded p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Joinery & Assembly Notes</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {part.assemblyNotes}
            </p>
          </div>

          {/* Machining Operations */}
          {part.machiningOperations && part.machiningOperations.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800 rounded p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2">
                <Wrench className="w-3.5 h-3.5" />
                <span>Router & CNC Machining Operations</span>
              </div>
              <ul className="space-y-1.5">
                {part.machiningOperations.map((op, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 font-mono text-[10px] mt-0.5">•</span>
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Specs' : 'Copy Specifications'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
