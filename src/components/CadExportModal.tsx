import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  CadExportFormat,
  CadExportOptions,
  CadExportScope,
  CadExportUnits,
  buildCadFilename,
  downloadBlob,
  generateObj,
  generateStep,
  generateStl,
  prepareExportScene,
} from '../services/cadExportEngine.ts';
import type { AcousticCalculationResult, AcousticParameters, EnclosureDimensions } from '../types/loudspeaker.ts';
import {
  Box,
  Check,
  CheckCircle,
  Cpu,
  Download,
  FileCode,
  HardDrive,
  Layers,
  Printer,
  Sparkles,
  Wind,
  Wrench,
  X,
} from 'lucide-react';

interface CadExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  results: AcousticCalculationResult;
  getModelRoot: () => THREE.Group | null;
  initialScope?: CadExportScope;
}

export const CadExportModal: React.FC<CadExportModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  acoustics,
  results,
  getModelRoot,
  initialScope = 'woodwork_only',
}) => {
  const [format, setFormat] = useState<CadExportFormat>('stl_binary');
  const [scope, setScope] = useState<CadExportScope>(initialScope);

  React.useEffect(() => {
    if (isOpen && initialScope) {
      setScope(initialScope);
    }
  }, [isOpen, initialScope]);
  const [units, setUnits] = useState<CadExportUnits>('mm');
  const [forceAssembled, setForceAssembled] = useState<boolean>(true);
  const [includeBracing, setIncludeBracing] = useState<boolean>(true);
  const [includePort, setIncludePort] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Inspect model geometry stats
  const previewStats = useMemo(() => {
    const root = getModelRoot();
    if (!root) {
      return {
        panelCount: 6,
        braceCount: acoustics.bracingLevel === 'heavy' ? 4 : acoustics.bracingLevel === 'standard' ? 2 : 1,
        portCount: acoustics.alignment === 'ported' ? 1 : 0,
        driverCount: acoustics.topology === 'three_way' ? 3 : acoustics.topology === 'mtm' ? 3 : 2,
        totalTriangles: 1420,
        totalVertices: 4260,
      };
    }
    const { stats } = prepareExportScene(root, {
      format,
      scope,
      units,
      forceAssembled,
      includeBracing,
      includePort,
    });
    return stats;
  }, [getModelRoot, format, scope, units, forceAssembled, includeBracing, includePort, dimensions, acoustics]);

  const targetFilename = useMemo(() => {
    return buildCadFilename(dimensions, acoustics, format, scope);
  }, [dimensions, acoustics, format, scope]);

  if (!isOpen) return null;

  const handleExport = () => {
    const root = getModelRoot();
    if (!root) return;

    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      try {
        const options: CadExportOptions = {
          format,
          scope,
          units,
          forceAssembled,
          includeBracing,
          includePort,
        };

        const { exportGroup } = prepareExportScene(root, options);
        let blob: Blob;

        if (format === 'stl_binary') {
          blob = generateStl(exportGroup, true);
        } else if (format === 'stl_ascii') {
          blob = generateStl(exportGroup, false);
        } else if (format === 'step') {
          blob = generateStep(exportGroup, `ResonanceCAD_${scope}`);
        } else {
          blob = generateObj(exportGroup);
        }

        downloadBlob(blob, targetFilename);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      } catch (err) {
        console.error('CAD Export Failed:', err);
      } finally {
        setIsExporting(false);
      }
    }, 60);
  };

  const widthIn = (dimensions.externalWidthMm / 25.4).toFixed(1);
  const heightIn = (dimensions.externalHeightMm / 25.4).toFixed(1);
  const depthIn = (dimensions.externalDepthMm / 25.4).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans text-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#07090e] border-b border-slate-800/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-100">
                  Export 3D CAD Enclosure Model
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 uppercase font-bold">
                  STL / STEP 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate 1:1 true-scale geometry for CNC router CAM, 3D printing slicers, and mechanical CAD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Envelope & Geometry Stats Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-slate-300">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enclosure Physical Envelope</span>
              </span>
              <span className="text-slate-200 font-bold">
                {dimensions.externalWidthMm} × {dimensions.externalHeightMm} × {dimensions.externalDepthMm} mm
                <span className="text-slate-500 font-normal ml-1">({widthIn}" × {heightIn}" × {depthIn}")</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-slate-900/80 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-500 text-[10px] block uppercase">Panels</span>
                <span className="text-slate-200 font-bold text-sm">{previewStats.panelCount} parts</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-500 text-[10px] block uppercase">Internal Braces</span>
                <span className="text-amber-300 font-bold text-sm">{previewStats.braceCount} braces</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-500 text-[10px] block uppercase">Triangles</span>
                <span className="text-cyan-300 font-bold text-sm">{previewStats.totalTriangles.toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-500 text-[10px] block uppercase">Target Scale</span>
                <span className="text-emerald-300 font-bold text-sm">
                  1:{units === 'mm' ? '1 mm' : units === 'inch' ? '1 in' : '1 m'}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Format Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              1. Select CAD File Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'stl_binary' as CadExportFormat,
                  title: 'Binary STL (.stl)',
                  badge: 'Recommended for 3D Printing & CAM',
                  desc: 'Universal compact binary format. Compatible with Fusion 360, VCarve, PrusaSlicer, Cura, Bambu Studio.',
                  icon: Printer,
                  color: 'border-cyan-500/80 bg-cyan-950/30',
                },
                {
                  id: 'step' as CadExportFormat,
                  title: 'ISO 10303 STEP (.step)',
                  badge: 'Solid CAD B-Rep Interoperability',
                  desc: 'Standard AP214 B-Rep solid model format for SolidWorks, Autodesk Inventor, Fusion 360, FreeCAD, and Onshape.',
                  icon: HardDrive,
                  color: 'border-purple-500/80 bg-purple-950/30',
                },
                {
                  id: 'stl_ascii' as CadExportFormat,
                  title: 'ASCII STL (.stl)',
                  badge: 'Text-Based Mesh',
                  desc: 'Human-readable facet normal and vertex text representation. Great for debugging or custom toolchains.',
                  icon: FileCode,
                  color: 'border-slate-700 bg-slate-900/40',
                },
                {
                  id: 'obj' as CadExportFormat,
                  title: 'Wavefront OBJ (.obj)',
                  badge: 'Multi-Part Grouping',
                  desc: 'Mesh format that preserves named separate component groups for Blender, Maya, and Rhino 3D.',
                  icon: Layers,
                  color: 'border-slate-700 bg-slate-900/40',
                },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = format === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setFormat(item.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${item.color} shadow-sm`
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-slate-100 flex items-center gap-1.5">
                          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span>{item.title}</span>
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 font-semibold block mb-1">
                        {item.badge}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Export Scope Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              2. Select Export Scope (What parts to include)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              {[
                {
                  id: 'woodwork_only' as CadExportScope,
                  name: 'Woodwork & Port Only',
                  badge: 'CNC Toolpaths',
                  desc: 'All panels with cutouts, joints, and port (No drivers)',
                  icon: Wrench,
                },
                {
                  id: 'full_assembly' as CadExportScope,
                  name: 'Full Complete Assembly',
                  badge: 'Full Speaker',
                  desc: 'Woodwork + Port + Bracing + Driver frames',
                  icon: Box,
                },
                {
                  id: 'baffle_only' as CadExportScope,
                  name: 'Front Baffle Only',
                  badge: 'Driver Cutouts',
                  desc: 'Front panel with driver & port through-holes',
                  icon: Layers,
                },
                {
                  id: 'port_only' as CadExportScope,
                  name: 'Port Resonator Only',
                  badge: '3D Printing',
                  desc: 'Aeroport tube, bellmouth flare, or slot shelf',
                  icon: Wind,
                },
                {
                  id: 'bracing_only' as CadExportScope,
                  name: 'Internal Bracing Only',
                  badge: 'Laser / CNC',
                  desc: 'Window braces and matrix structural elements',
                  icon: Cpu,
                },
              ].map((item) => {
                const IconComp = item.icon;
                const isSelected = scope === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setScope(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-white font-bold shadow-xs'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <IconComp className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.name}</span>
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] text-cyan-300 font-semibold block">{item.badge}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 font-sans">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D Printing Slicer Parameter Recommendations */}
          {(dimensions.materialCategory === 'filaments' || dimensions.material.startsWith('p') || scope === 'port_only') && (
            <div className="bg-cyan-950/40 border border-cyan-700/80 p-3 rounded-xl space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Recommended Slicer Parameters (PrusaSlicer / Bambu Studio / Cura)</span>
                </span>
                <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600 text-cyan-200 font-bold">
                  Airtight Acoustic Profile
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                To guarantee zero pressure leakage and flexural compliance damping under acoustic load:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-200 pt-1 font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block font-bold">Perimeter Shells:</span>
                  <span className="text-amber-400 font-bold">≥ {dimensions.perimeterShells ?? 6} Shells (~2.4 mm)</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block font-bold">Infill Density:</span>
                  <span className="text-cyan-300 font-bold">{dimensions.infillPercent ?? 40}% Gyroid Isotropic</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block font-bold">Top/Bottom Layers:</span>
                  <span className="text-emerald-400 font-bold">6 Solid Top/Bottom Layers</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Units & Scale Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                3. CAD Target Units
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                {(
                  [
                    ['mm', 'Millimeters (mm)', '1:1 CAD Standard'],
                    ['inch', 'Inches (in)', 'Imperial CNC'],
                    ['meter', 'Meters (m)', 'Raw Three.js'],
                  ] as const
                ).map(([uKey, label, sub]) => (
                  <button
                    key={uKey}
                    onClick={() => setUnits(uKey)}
                    className={`p-2 rounded-lg text-center transition border cursor-pointer ${
                      units === uKey
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>{uKey.toUpperCase()}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Modifiers */}
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2 font-mono text-[11px]">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Assembly & Feature Options
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={forceAssembled}
                  onChange={(e) => setForceAssembled(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
                <span>Zero-Offset Assembled Mode (Bypasses active exploded view)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeBracing}
                  onChange={(e) => setIncludeBracing(e.target.checked)}
                  className="accent-cyan-400 rounded"
                />
                <span>Include Window Braces</span>
              </label>

              {acoustics.alignment === 'ported' && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={includePort}
                    onChange={(e) => setIncludePort(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Include Flared Port Resonator Tube</span>
                </label>
              )}
            </div>
          </div>

          {/* 3D Printable Port Specification Card */}
          {results.portMatch && (scope === 'port_only' || results.portMatch.status === 'custom_3d_print') && (
            <div className="bg-slate-950/90 border border-cyan-800/80 rounded-xl p-3.5 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800/80">
                <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>3D Printable Port Resonator Specs</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    results.portMatch.status === 'cots_available'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}
                >
                  {results.portMatch.status === 'cots_available' ? 'COTS Catalog Match' : 'Custom 3D-Print Optimized'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">PRINT ENVELOPE (X×Y×Z)</span>
                  <span className="text-slate-200 font-bold">
                    {results.portMatch.printDimensionsMm.widthMm} × {results.portMatch.printDimensionsMm.heightMm} × {results.portMatch.printDimensionsMm.depthMm} mm
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">SALVATTI FLARE RADIUS</span>
                  <span className="text-emerald-400 font-bold">
                    r_f = {results.portMatch.salvattiFlareRadiusMm} mm
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">WALL THICKNESS</span>
                  <span className="text-amber-300 font-bold">
                    {results.portMatch.structuralWallThicknessMm} mm (Acoustic Rigid)
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">MODULAR SLICE JOINTS</span>
                  <span className="text-cyan-300 font-bold">
                    {results.portMatch.needsModularSplit
                      ? `${results.portMatch.splitSegmentCount} Slip-Fit Segs`
                      : '1 Piece (<220mm Z)'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                <span>
                  Collar Flange: <strong className="text-slate-200">Ø{results.portMatch.mountingCollarDiameterMm}mm</strong> countersunk mounting collar
                </span>
                <span className="text-emerald-400 font-bold">
                  v_air = {results.portMatch.peakVelocityMs} m/s ({results.portMatch.isLaminar ? 'Laminar' : 'Chuffing Risk'})
                </span>
              </div>
              <div className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-900 pt-1">
                Note: {results.portMatch.reason}
              </div>
            </div>
          )}

          {/* Target Output File Preview */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-sans">Generated File Name:</span>
              <span className="text-cyan-300 font-bold break-all">{targetFilename}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Units: <strong className="text-slate-200">{units.toUpperCase()}</strong> • Format:{' '}
              <strong className="text-slate-200">{format.toUpperCase().replace('_', ' ')}</strong>
            </div>
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#07090e] border-t border-slate-800/90 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {exportSuccess && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span>File Downloaded Successfully!</span>
              </span>
            )}

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating CAD Geometry...' : `Download ${format.split('_')[0].toUpperCase()} File`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
