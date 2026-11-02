import React, { useState, useRef } from 'react';
import type { DriverAssignment, DriverPreset } from '../types/loudspeaker.ts';
import { DRIVER_PRESETS } from '../services/acousticEngine.ts';
import {
  parseImpedanceFile,
  generateSampleDatsImpedance,
} from '../services/impedanceParser.ts';
import {
  Disc3,
  Save,
  X,
  Download,
  UploadCloud,
  Activity,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react';

const CUSTOM_DRIVER_STORAGE_KEY = 'resonancecad_custom_drivers_v1';

function loadSavedCustomDrivers(): DriverPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_DRIVER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read saved custom drivers:', err);
    return [];
  }
}

function persistCustomDriver(driver: DriverPreset): DriverPreset[] {
  try {
    const existing = loadSavedCustomDrivers().filter((d) => d.id !== driver.id);
    const updated = [driver, ...existing].slice(0, 20);
    localStorage.setItem(CUSTOM_DRIVER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to persist custom driver:', err);
    return [];
  }
}

interface CustomDriverModalProps {
  currentDriver: DriverPreset;
  driverAssignments?: Record<'tweeter' | 'midrange' | 'woofer', DriverAssignment>;
  onSave: (driver: DriverPreset, role?: 'woofer' | 'midrange' | 'tweeter') => void;
  onClose: () => void;
}

export const CustomDriverModal: React.FC<CustomDriverModalProps> = ({
  currentDriver,
  driverAssignments,
  onSave,
  onClose,
}) => {
  const [targetRole, setTargetRole] = useState<'woofer' | 'midrange' | 'tweeter'>('woofer');
  const [savedCustomDrivers, setSavedCustomDrivers] = useState<DriverPreset[]>(() =>
    loadSavedCustomDrivers()
  );

  const [formData, setFormData] = useState<DriverPreset>({
    ...currentDriver,
    id: `custom_user_${Date.now().toString(36)}`,
    brand: currentDriver.brand === 'Dayton Audio' ? 'Custom' : currentDriver.brand,
    model: currentDriver.model.includes('Custom')
      ? currentDriver.model
      : `Custom ${currentDriver.nominalDiameterInch}" Driver`,
    reOhm: currentDriver.reOhm ?? (currentDriver.nominalDiameterInch >= 12 ? 5.6 : 3.6),
    leMh: currentDriver.leMh ?? 0.45,
  });

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectTargetRole = (role: 'woofer' | 'midrange' | 'tweeter') => {
    setTargetRole(role);
    const baseDriver = driverAssignments?.[role]?.driver || currentDriver;
    setFormData({
      ...baseDriver,
      id: `custom_${role}_${Date.now().toString(36)}`,
      model: baseDriver.model.includes('Custom')
        ? baseDriver.model
        : `${baseDriver.model} (Custom)`,
      reOhm: baseDriver.reOhm ?? (baseDriver.nominalDiameterInch >= 12 ? 5.6 : 3.6),
      leMh: baseDriver.leMh ?? 0.45,
    });
    setUploadError(null);
    setUploadSuccess(null);
  };

  const allAvailablePresets = [...savedCustomDrivers, ...DRIVER_PRESETS];

  const handleLoadPreset = (presetId: string) => {
    const found = allAvailablePresets.find((d) => d.id === presetId);
    if (found) {
      setFormData({
        ...found,
        id: found.id.startsWith('custom_') ? found.id : 'custom_' + found.id,
        model: found.model.includes('Custom') ? found.model : `${found.model} (Customized)`,
        reOhm: found.reOhm ?? (found.nominalDiameterInch >= 12 ? 5.6 : 3.6),
        leMh: found.leMh ?? 0.45,
      });
      setUploadSuccess(null);
      setUploadError(null);
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
    const effectiveDiaCm = formData.nominalDiameterInch * 2.54 * 0.8;
    const computedSd = Math.PI * Math.pow(effectiveDiaCm / 2, 2);
    setFormData((prev) => ({ ...prev, sd: Math.round(computedSd) }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const dataset = parseImpedanceFile(text, file.name);
        setFormData((prev) => ({
          ...prev,
          measuredImpedance: dataset,
          reOhm: dataset.measuredReOhm ?? prev.reOhm,
          leMh: dataset.measuredLeMh ?? prev.leMh,
          fs: dataset.measuredFsHz ?? prev.fs,
        }));
        setUploadSuccess(
          `Imported ${dataset.points.length} points from ${file.name} (Re: ${dataset.measuredReOhm}Ω, Fs: ${dataset.measuredFsHz}Hz)`
        );
      } catch (err: unknown) {
        console.error('Failed to parse impedance file:', err);
        setUploadError(
          err instanceof Error
            ? err.message
            : 'Invalid impedance measurement file. Ensure columns: freq, mag, [phase].'
        );
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleLoadSampleDats = () => {
    try {
      const sample = generateSampleDatsImpedance(formData);
      setFormData((prev) => ({
        ...prev,
        measuredImpedance: sample,
        reOhm: sample.measuredReOhm ?? prev.reOhm,
      }));
      setUploadError(null);
      setUploadSuccess(
        `Generated Dayton DATS baseline (${sample.points.length} frequency points, Peak: ${sample.peakImpedanceOhm}Ω)`
      );
    } catch (err) {
      console.error('Failed to generate sample curve:', err);
    }
  };

  const handleClearImpedance = () => {
    setFormData((prev) => ({
      ...prev,
      measuredImpedance: undefined,
    }));
    setUploadSuccess(null);
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedList = persistCustomDriver(formData);
    setSavedCustomDrivers(updatedList);
    onSave(formData, targetRole);
    onClose();
  };

  // Mini SVG preview calculation
  const impPoints = formData.measuredImpedance?.points || [];
  const maxMag = Math.max(35, formData.measuredImpedance?.peakImpedanceOhm || 40);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100 font-mono">
              Custom Driver Thiele-Small &amp; Impedance Engine
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Target Transducer Slot Selector */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                Target Transducer Band Slot
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                Persists to Local Library ({savedCustomDrivers.length} saved)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {(
                [
                  { id: 'woofer', label: 'Woofer / Subwoofer (LF)' },
                  { id: 'midrange', label: 'Midrange Driver (MF)' },
                  { id: 'tweeter', label: 'Tweeter / Horn (HF)' },
                ] as const
              ).map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSelectTargetRole(slot.id)}
                  className={`py-1.5 px-2.5 rounded-lg border font-bold transition cursor-pointer ${
                    targetRole === slot.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Importer */}
          <div className="bg-slate-950/80 border border-cyan-800/60 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Download className="w-3.5 h-3.5" />
                Quick-Load Preset or Saved Custom Transducer
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {allAvailablePresets.length} Transducers Available
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
                -- Select a saved custom driver or factory preset (JBL Pro, Dayton, Scan-Speak, SEAS) --
              </option>
              {allAvailablePresets.map((d) => (
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
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
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
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          {/* LOUDSPEAKER DRIVER IMPEDANCE DATA (UPLOAD / SELECT PRESET) */}
          <div className="bg-slate-950/80 border border-amber-800/80 p-3.5 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Driver Measured Impedance Data (.ZMA / .CSV / .TXT)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                {formData.measuredImpedance
                  ? `✓ Measured Data Loaded (${formData.measuredImpedance.points.length} pts)`
                  : 'Analytic T/S Model Active'}
              </span>
            </div>

            {/* Notification messages */}
            {uploadError && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="p-2 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Actions & Dropzone Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".zma,.txt,.csv,.tsv,.frd"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-950/70 hover:bg-amber-900/90 border border-amber-700/80 text-amber-200 text-xs font-mono font-bold transition cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-4 h-4 text-amber-400" />
                <span>Upload .ZMA / .CSV File</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSampleDats}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono transition cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Load Sample DATS Curve</span>
              </button>
            </div>

            {/* Mini SVG Preview of Loaded Curve */}
            {formData.measuredImpedance && impPoints.length > 0 && (
              <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">
                    File: <strong className="text-slate-200">{formData.measuredImpedance.filename || 'Measured Dataset'}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">Re: {formData.measuredImpedance.measuredReOhm}Ω</span>
                    <span className="text-amber-400">Fs: {formData.measuredImpedance.measuredFsHz}Hz</span>
                    <span className="text-cyan-400">Peak: {formData.measuredImpedance.peakImpedanceOhm}Ω</span>
                    <button
                      type="button"
                      onClick={handleClearImpedance}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 cursor-pointer ml-1"
                      title="Clear measurement data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-24 bg-[#080b11] border border-slate-800 rounded overflow-hidden">
                  <svg viewBox="0 0 320 80" className="w-full h-full">
                    {/* Horizontal 0 and 20 Ohm guidelines */}
                    <line x1="0" y1="70" x2="320" y2="70" stroke="#1e2430" strokeWidth="0.8" />
                    <line x1="0" y1="40" x2="320" y2="40" stroke="#1e2430" strokeWidth="0.8" strokeDasharray="2,2" />
                    {/* SVG polyline for curve */}
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={impPoints
                        .map((p, idx) => {
                          const x = (idx / (impPoints.length - 1)) * 320;
                          const y = 75 - (Math.min(maxMag, p.magnitudeOhm) / maxMag) * 65;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Core T/S Parameters */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-2 font-semibold">
              Primary Electroacoustic &amp; Mechanical Parameters
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

              {/* Re and Le Electrical Voice Coil parameters */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Re (DC Res, Ω)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.reOhm ?? 5.6}
                  onChange={(e) => handleChange('reOhm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Le (Inductance, mH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.leMh ?? 0.45}
                  onChange={(e) => handleChange('leMh', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono font-bold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400">Sd (cm²)</label>
                  <button
                    type="button"
                    onClick={handleSdAutoCalculate}
                    className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
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

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Sensitivity (dB 1W/1m)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.splSensitivityDb}
                  onChange={(e) => handleChange('splSensitivityDb', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Physical CAD Dimensions */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-2 font-semibold">
              Physical CAD &amp; Baffle Rebate Geometry
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
              className="px-4 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition cursor-pointer font-bold"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Driver &amp; Impedance Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
