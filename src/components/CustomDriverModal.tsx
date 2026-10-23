import React, { useState } from 'react';
import { DriverPreset } from '../types/loudspeaker.ts';
import { DRIVER_PRESETS } from '../services/acousticEngine.ts';
import { Disc3, Save, X, Download } from 'lucide-react';

interface CustomDriverModalProps {
  currentDriver: DriverPreset;
  onSave: (driver: DriverPreset) => void;
  onClose: () => void;
}

export const CustomDriverModal: React.FC<CustomDriverModalProps> = ({
  currentDriver,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<DriverPreset>({
    ...currentDriver,
    id: 'custom_user_driver',
    brand: currentDriver.brand === 'Dayton Audio' ? 'Custom' : currentDriver.brand,
    model: currentDriver.model.includes('Custom') ? currentDriver.model : `Custom ${currentDriver.nominalDiameterInch}" Driver`,
  });

  const handleLoadPreset = (presetId: string) => {
    const found = DRIVER_PRESETS.find((d) => d.id === presetId);
    if (found) {
      setFormData({
        ...found,
        id: 'custom_' + found.id,
        model: `${found.model} (Customized)`,
      });
    }
  };

  const handleChange = (field: keyof DriverPreset, val: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: typeof currentDriver[field] === 'number' ? parseFloat(val as string) || 0 : val,
    }));
  };

  const handleSdAutoCalculate = () => {
    // Approximate effective piston diameter is ~ 80% of nominal frame diameter
    const effectiveDiaCm = (formData.nominalDiameterInch * 2.54) * 0.8;
    const computedSd = Math.PI * Math.pow(effectiveDiaCm / 2, 2);
    setFormData((prev) => ({ ...prev, sd: Math.round(computedSd) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100 font-mono">
              Custom Driver Thiele-Small Parameters
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Preset Importer */}
          <div className="bg-slate-950/80 border border-cyan-800/60 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Download className="w-3.5 h-3.5" />
                Quick-Load Preset Baseline from Catalogue
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {DRIVER_PRESETS.length} Transducers Available
              </span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) handleLoadPreset(e.target.value);
              }}
              defaultValue=""
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="" disabled>
                -- Select a driver from JBL Pro, Dayton, Scan-Speak, SEAS, Peerless --
              </option>
              {DRIVER_PRESETS.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.brand}] {d.model} — {d.nominalDiameterInch}" (Fs {d.fs}Hz, Qts {d.qts}, Vas {d.vas}L, {d.pe}W)
                </option>
              ))}
            </select>
          </div>
          {/* Driver identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Manufacturer / Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Core T/S Parameters */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-2 font-semibold">
              Primary Acoustic & Electro-Mechanical Parameters
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Fs (Hz)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.fs}
                  onChange={(e) => handleChange('fs', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Qts (Total Q)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.qts}
                  onChange={(e) => handleChange('qts', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Vas (Liters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.vas}
                  onChange={(e) => handleChange('vas', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Qes (Electrical)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.qes}
                  onChange={(e) => handleChange('qes', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Qms (Mechanical)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.qms}
                  onChange={(e) => handleChange('qms', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Xmax (mm peak)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.xmax}
                  onChange={(e) => handleChange('xmax', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400">Sd (cm²)</label>
                  <button
                    type="button"
                    onClick={handleSdAutoCalculate}
                    className="text-[9px] text-cyan-400 hover:underline"
                  >
                    Auto Calc
                  </button>
                </div>
                <input
                  type="number"
                  step="1"
                  value={formData.sd}
                  onChange={(e) => handleChange('sd', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Power Pe (Watts)</label>
                <input
                  type="number"
                  step="10"
                  value={formData.pe}
                  onChange={(e) => handleChange('pe', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Displacement (L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.displacementLiters}
                  onChange={(e) => handleChange('displacementLiters', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Physical CAD Dimensions */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-2 font-semibold">
              Physical CAD & Baffle Rebate Geometry
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Outer Rim Ø (mm)</label>
                <input
                  type="number"
                  value={formData.frameOuterDiameterMm}
                  onChange={(e) => handleChange('frameOuterDiameterMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Cutout Hole Ø (mm)</label>
                <input
                  type="number"
                  value={formData.cutoutDiameterMm}
                  onChange={(e) => handleChange('cutoutDiameterMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Mounting Depth (mm)</label>
                <input
                  type="number"
                  value={formData.mountingDepthMm}
                  onChange={(e) => handleChange('mountingDepthMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Magnet Ø (mm)</label>
                <input
                  type="number"
                  value={formData.magnetDiameterMm}
                  onChange={(e) => handleChange('magnetDiameterMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Magnet Depth (mm)</label>
                <input
                  type="number"
                  value={formData.magnetDepthMm}
                  onChange={(e) => handleChange('magnetDepthMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Voice Coil Ø (mm)</label>
                <input
                  type="number"
                  value={formData.voiceCoilDiameterMm}
                  onChange={(e) => handleChange('voiceCoilDiameterMm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Driver Parameters</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
