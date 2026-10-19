import React, { useState } from 'react';
import type {
  AcousticParameters,
  CameraPreset,
  EnclosureDimensions,
  MaterialType,
  SystemTopology,
} from '../types/loudspeaker.ts';
import { DRIVER_PRESETS, MATERIAL_SPECS } from '../services/acousticEngine.ts';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  Eye,
  Sliders,
  Sparkles,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';

interface ControlDockProps {
  dimensions: EnclosureDimensions;
  setDimensions: React.Dispatch<React.SetStateAction<EnclosureDimensions>>;
  acoustics: AcousticParameters;
  setAcoustics: React.Dispatch<React.SetStateAction<AcousticParameters>>;
  explodedPercent: number;
  setExplodedPercent: (val: number) => void;
  isXRayMode: boolean;
  setIsXRayMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCutawayMode: boolean;
  setIsCutawayMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isWireframeMode: boolean;
  setIsWireframeMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  onOpenCutList: () => void;
  onOpenResponseChart: () => void;
  onOpenCrossoverDesigner: () => void;
  onOpenCustomDriver: () => void;
  onAutoAlign: () => void;
}

type TabType = 'acoustics' | 'topology' | 'dimensions' | 'view3d';

export const ControlDock: React.FC<ControlDockProps> = ({
  dimensions,
  setDimensions,
  acoustics,
  setAcoustics,
  explodedPercent,
  setExplodedPercent,
  isXRayMode,
  setIsXRayMode,
  isCutawayMode,
  setIsCutawayMode,
  isWireframeMode,
  setIsWireframeMode,
  cameraPreset,
  setCameraPreset,
  onOpenCutList,
  onOpenResponseChart,
  onOpenCrossoverDesigner,
  onOpenCustomDriver,
  onAutoAlign,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('acoustics');

  const currentMaterial = MATERIAL_SPECS[dimensions.material];

  const handleTopologyChange = (top: SystemTopology) => {
    setAcoustics((prev) => {
      // Intelligently assign default drivers if needed
      const tweeter = DRIVER_PRESETS.find((d) => d.id === 'scanspeak_d3004') || DRIVER_PRESETS[4];
      const midrange = DRIVER_PRESETS.find((d) => d.id === 'scanspeak_12mu') || DRIVER_PRESETS[6];
      const woofer = DRIVER_PRESETS[0];

      return {
        ...prev,
        topology: top,
        driverAssignments: {
          ...prev.driverAssignments,
          tweeter: { ...prev.driverAssignments.tweeter, driver: tweeter },
          midrange: { ...prev.driverAssignments.midrange, driver: midrange },
          woofer: { ...prev.driverAssignments.woofer, driver: woofer, quantity: top === 'mtm' ? 2 : 1 },
        },
      };
    });
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ease-in-out left-1/2 -translate-x-1/2 w-[95%] max-w-[940px] ${
        isCollapsed ? 'bottom-2' : 'bottom-4'
      }`}
    >
      <div className="relative bg-[#0d1016]/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-none text-slate-200 overflow-hidden font-sans">
        {/* Header Navigation Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#080a0e] border-b border-slate-800/90 text-xs select-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('acoustics');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'acoustics' && !isCollapsed
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acoustics & Alignment</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('topology');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'topology' && !isCollapsed
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Driver Topology</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dimensions');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'dimensions' && !isCollapsed
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>Cabinet & Wood</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('view3d');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                activeTab === 'view3d' && !isCollapsed
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D CAD Views</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCrossoverDesigner}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition flex items-center gap-1"
            >
              <Cpu className="w-3 h-3 text-purple-400" />
              <span>Crossover PCB</span>
            </button>

            <button
              onClick={onOpenResponseChart}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>SPL Curve</span>
            </button>

            <button
              onClick={onOpenCutList}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition flex items-center gap-1"
            >
              <Wrench className="w-3 h-3 text-amber-400" />
              <span>Cut List</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs transition"
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 max-h-[38vh] overflow-y-auto">
            {/* TAB 1: ACOUSTICS & ALIGNMENT */}
            {activeTab === 'acoustics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        Primary Woofer / Transducer Model
                      </label>
                      <button onClick={onOpenCustomDriver} className="text-[11px] font-mono text-cyan-400 hover:underline">
                        + Edit T/S Parameters
                      </button>
                    </div>
                    <select
                      value={acoustics.driverAssignments.woofer.driver.id}
                      onChange={(e) => {
                        const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                        if (found) {
                          setAcoustics((p) => ({
                            ...p,
                            driverAssignments: {
                              ...p.driverAssignments,
                              woofer: { ...p.driverAssignments.woofer, driver: found },
                            },
                          }));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-sans focus:outline-none"
                    >
                      {DRIVER_PRESETS.filter((d) => d.nominalDiameterInch >= 6).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.brand} {d.model} ({d.nominalDiameterInch}" - Fs {d.fs}Hz, Vas {d.vas}L)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                      Box Alignment
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setAcoustics((p) => ({ ...p, alignment: 'ported' }))}
                        className={`py-1.5 px-2 rounded text-xs font-mono transition ${
                          acoustics.alignment === 'ported' ? 'bg-cyan-600 text-white font-semibold' : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        Bass Reflex
                      </button>
                      <button
                        onClick={() => setAcoustics((p) => ({ ...p, alignment: 'sealed' }))}
                        className={`py-1.5 px-2 rounded text-xs font-mono transition ${
                          acoustics.alignment === 'sealed' ? 'bg-cyan-600 text-white font-semibold' : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        Sealed Box
                      </button>
                    </div>
                  </div>
                </div>

                {acoustics.alignment === 'ported' && (
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-400">Tuning Fb:</span>
                        <span className="text-amber-400 font-bold">{acoustics.targetFb} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="18"
                        max="65"
                        step="0.5"
                        value={acoustics.targetFb}
                        onChange={(e) => setAcoustics((p) => ({ ...p, targetFb: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-400">Port Inner Ø:</span>
                        <span className="text-cyan-400 font-bold">{acoustics.portDiameterMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="45"
                        max="150"
                        step="1"
                        value={acoustics.portDiameterMm}
                        onChange={(e) => setAcoustics((p) => ({ ...p, portDiameterMm: parseInt(e.target.value) }))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-400">Damping Fill:</span>
                        <span className="text-emerald-400 font-bold">{acoustics.dampingFillPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={acoustics.dampingFillPercent}
                        onChange={(e) => setAcoustics((p) => ({ ...p, dampingFillPercent: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MULTI-DRIVER TOPOLOGY */}
            {activeTab === 'topology' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                    Loudspeaker System Configuration & Driver Topology
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {(
                      [
                        ['single', 'Single Driver', 'Subwoofer / Full Range'],
                        ['two_way', '2-Way Stack', 'Tweeter + Woofer'],
                        ['mtm', 'MTM / D\'Appolito', 'Dual Woofer + Tweeter'],
                        ['three_way', '3-Way System', 'Tweeter + Mid + Woofer'],
                      ] as const
                    ).map(([topKey, title, desc]) => (
                      <button
                        key={topKey}
                        onClick={() => handleTopologyChange(topKey as SystemTopology)}
                        className={`p-2.5 rounded text-left transition border ${
                          acoustics.topology === topKey
                            ? 'bg-purple-950/80 border-purple-600 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-cyan-300 font-semibold">{title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Driver Passband Assignments */}
                {acoustics.topology !== 'single' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tweeter Selection */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                      <label className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
                        High Frequency Transducer (Tweeter)
                      </label>
                      <select
                        value={acoustics.driverAssignments.tweeter.driver.id}
                        onChange={(e) => {
                          const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                          if (found) {
                            setAcoustics((p) => ({
                              ...p,
                              driverAssignments: {
                                ...p.driverAssignments,
                                tweeter: { ...p.driverAssignments.tweeter, driver: found },
                              },
                            }));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-sans"
                      >
                        {DRIVER_PRESETS.filter((d) => d.nominalDiameterInch <= 2).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.brand} {d.model} ({d.splSensitivityDb}dB sensitivity)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Midrange Selection (if 3-Way) */}
                    {acoustics.topology === 'three_way' && (
                      <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                        <label className="text-[11px] font-mono text-purple-400 uppercase tracking-wider block mb-1">
                          Midrange Transducer
                        </label>
                        <select
                          value={acoustics.driverAssignments.midrange.driver.id}
                          onChange={(e) => {
                            const found = DRIVER_PRESETS.find((d) => d.id === e.target.value);
                            if (found) {
                              setAcoustics((p) => ({
                                ...p,
                                driverAssignments: {
                                  ...p.driverAssignments,
                                  midrange: { ...p.driverAssignments.midrange, driver: found },
                                },
                              }));
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-sans"
                        >
                          {DRIVER_PRESETS.filter((d) => d.nominalDiameterInch >= 4 && d.nominalDiameterInch <= 5.5).map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.brand} {d.model} ({d.splSensitivityDb}dB sensitivity)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DIMENSIONS & MATERIALS */}
            {activeTab === 'dimensions' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-400">WIDTH (X):</span>
                    <span className="text-cyan-400 font-bold text-sm">{dimensions.externalWidthMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="700"
                    step="5"
                    value={dimensions.externalWidthMm}
                    onChange={(e) => setDimensions((p) => ({ ...p, externalWidthMm: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-400">HEIGHT (Y):</span>
                    <span className="text-cyan-400 font-bold text-sm">{dimensions.externalHeightMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="250"
                    max="1200"
                    step="5"
                    value={dimensions.externalHeightMm}
                    onChange={(e) => setDimensions((p) => ({ ...p, externalHeightMm: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-400">DEPTH (Z):</span>
                    <span className="text-cyan-400 font-bold text-sm">{dimensions.externalDepthMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="800"
                    step="5"
                    value={dimensions.externalDepthMm}
                    onChange={(e) => setDimensions((p) => ({ ...p, externalDepthMm: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: 3D CAD VIEWS */}
            {activeTab === 'view3d' && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Linear Exploded View Disassembly:</span>
                    </span>
                    <span className="text-cyan-300 font-bold text-sm">{explodedPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={explodedPercent}
                    onChange={(e) => setExplodedPercent(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Camera Presets</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                      {(
                        [
                          ['isometric', 'Iso 3D'],
                          ['front', 'Front'],
                          ['side', 'Side'],
                          ['top', 'Top'],
                          ['cutaway', 'Cutaway'],
                          ['crossover', 'Rear PCB'],
                        ] as const
                      ).map(([presetKey, label]) => (
                        <button
                          key={presetKey}
                          onClick={() => setCameraPreset(presetKey)}
                          className={`py-1.5 px-2 rounded text-center transition ${
                            cameraPreset === presetKey
                              ? 'bg-cyan-600 text-white font-semibold'
                              : 'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Inspection Shaders</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                      <button
                        onClick={() => setIsXRayMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${isXRayMode ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                      >
                        X-Ray Glass
                      </button>
                      <button
                        onClick={() => setIsCutawayMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${isCutawayMode ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                      >
                        Half-Section
                      </button>
                      <button
                        onClick={() => setIsWireframeMode((p) => !p)}
                        className={`py-1.5 px-2 rounded text-center transition ${isWireframeMode ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                      >
                        Wireframe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
