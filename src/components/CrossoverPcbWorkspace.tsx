import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle,
  Copy,
  Cpu,
  Download,
  Eye,
  FileCode,
  FolderArchive,
  Layers,
  Maximize2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type {
  AcousticParameters,
  CrossoverNetworkResult,
  EnclosureDimensions,
} from '../types/loudspeaker.ts';
import type {
  BoardModule,
  BoardStackArchitecture,
  CircuitBoardStack,
  GerberPackageResult,
} from '../types/pcb.ts';
import { generateCircuitBoardStack } from '../services/boardStackEngine.ts';
import {
  createGerberZipBlob,
  generateGerberManufacturingPackage,
} from '../services/pcbGerberExportEngine.ts';
import { useUnits } from '../context/UnitContext.tsx';

interface CrossoverPcbWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  acoustics: AcousticParameters;
  crossoverResults: CrossoverNetworkResult;
  dimensions: EnclosureDimensions;
  embedded?: boolean;
}

export const CrossoverPcbWorkspace: React.FC<CrossoverPcbWorkspaceProps> = ({
  isOpen,
  onClose,
  acoustics,
  crossoverResults,
  dimensions,
  embedded = false,
}) => {
  const { formatLength, formatWeight, unitSystem } = useUnits();

  // Architecture selection: default to split_two_way for 2-way and split_three_way for 3-way
  const defaultArch: BoardStackArchitecture =
    acoustics.topology === 'three_way' ? 'split_three_way' : 'split_two_way';

  const [architecture, setArchitecture] = useState<BoardStackArchitecture>(defaultArch);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'stack_assembly' | 'board_inspector' | 'bom_netlist'>('board_inspector');
  const [showTopCopper, setShowTopCopper] = useState(true);
  const [showBottomCopper, setShowBottomCopper] = useState(true);
  const [showSilkscreen, setShowSilkscreen] = useState(true);
  const [showMagneticAxes, setShowMagneticAxes] = useState(true);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Auto-generate board stack
  const boardStack = useMemo(() => {
    return generateCircuitBoardStack(acoustics, crossoverResults, architecture);
  }, [acoustics, crossoverResults, architecture]);

  // Active selected board
  const activeBoard = useMemo(() => {
    if (!selectedBoardId && boardStack.boards.length > 0) {
      return boardStack.boards[0];
    }
    return (
      boardStack.boards.find((b) => b.boardId === selectedBoardId) ||
      boardStack.boards[0]
    );
  }, [boardStack, selectedBoardId]);

  // Manufacturing Gerber & Drill Package
  const manufacturingPkg = useMemo<GerberPackageResult>(() => {
    return generateGerberManufacturingPackage(
      boardStack,
      `ResonanceCAD_${acoustics.topology.toUpperCase()}_Crossover`
    );
  }, [boardStack, acoustics.topology]);

  if (!isOpen && !embedded) return null;

  // Single-Click ZIP Export Handler
  const handleDownloadZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await createGerberZipBlob(manufacturingPkg);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResonanceCAD_Crossover_Gerber_BOM_${architecture}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportNotification(
        `Exported complete manufacturing package (${manufacturingPkg.files.length} Gerber/Drill/BOM files in ZIP)`
      );
      setTimeout(() => setExportNotification(null), 5000);
    } catch (err) {
      console.error('Failed to export Gerber ZIP package:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Download individual file
  const handleDownloadSingleFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportNotification(`Downloaded ${filename}`);
    setTimeout(() => setExportNotification(null), 3500);
  };

  return (
    <div
      onClick={embedded ? undefined : onClose}
      className={
        embedded
          ? 'w-full h-full flex flex-col overflow-hidden bg-[#07090e]'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer'
      }
    >
      <div
        onClick={embedded ? undefined : (e) => e.stopPropagation()}
        className={
          embedded
            ? 'relative w-full h-full bg-[#0c0f16] flex flex-col text-slate-100 font-sans overflow-hidden'
            : 'relative w-full max-w-6xl h-[92vh] bg-[#0c0f16] border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 font-sans overflow-hidden cursor-default'
        }
      >
        {/* Workspace Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#07090e] border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-slate-100">
                  Automated Crossover Circuit Board Stack &amp; PCB Fabrication Export
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider font-bold">
                  2-Layer • 2oz Heavy Copper
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auto-partitioned filter schema, automated trace routing, 90° inductor anti-crosstalk orientation, and Gerber RS-274X export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              title="Download Complete Gerber RS-274X, NC Drill, and BOM Manufacturing Package (.ZIP)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/60 transition cursor-pointer disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isExportingZip ? 'Compiling ZIP...' : 'Export Gerbers & BOM (.ZIP)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title="Close Workspace"
            >
              {embedded ? (
                <>
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Return to 3D CAD</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {exportNotification && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 shadow-xl font-mono text-xs animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotification}</span>
          </div>
        )}

        {/* Sub-Header Toolbar: Architecture Picker & Workspace Views */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-950/50 border-b border-slate-800/80 text-xs font-mono shrink-0">
          {/* Stacking Architecture Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[11px]">Stack Architecture:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setArchitecture('unified_single')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  architecture === 'unified_single'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unified Single Board
              </button>
              <button
                type="button"
                onClick={() => setArchitecture('split_two_way')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  architecture === 'split_two_way'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2-Board Stack (Bi-Amp/Bi-Wire)
              </button>
              {acoustics.topology === 'three_way' && (
                <button
                  type="button"
                  onClick={() => setArchitecture('split_three_way')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    architecture === 'split_three_way'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3-Board Tiered Stack (Tri-Amp)
                </button>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('board_inspector')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'board_inspector'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>2D Board CAD Inspector</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('stack_assembly')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'stack_assembly'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-purple-400" />
              <span>Stack Assembly & Jumpers</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bom_netlist')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'bom_netlist'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>BOM & Gerber Files</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* Left Panel: Board Module Tabs & Stack Telemetry */}
          <div className="w-full md:w-80 bg-slate-950/70 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0 font-mono text-xs">
            {/* Stack Telemetry Overview */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Stack Engineering Overview
              </span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Board Count:</span>
                  <span className="text-slate-100 font-bold">{boardStack.boards.length} Boards</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Footprint:</span>
                  <span className="text-cyan-300 font-bold">
                    {formatLength(boardStack.cabinetFootprintMm.widthMm)} ×{' '}
                    {formatLength(boardStack.cabinetFootprintMm.depthMm)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stack Height:</span>
                  <span className="text-cyan-300 font-bold">
                    {formatLength(boardStack.cabinetFootprintMm.maxStackHeightMm)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated BOM:</span>
                  <span className="text-emerald-400 font-bold">${boardStack.totalBOMCostUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Mass:</span>
                  <span className="text-amber-300 font-bold">{boardStack.totalMassGrams} g</span>
                </div>
              </div>
            </div>

            {/* Board Selector Cards */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Stack Circuit Boards ({boardStack.boards.length}):
              </span>
              <div className="space-y-2">
                {boardStack.boards.map((board) => {
                  const isSelected = activeBoard.boardId === board.boardId;

                  return (
                    <div
                      key={board.boardId}
                      onClick={() => {
                        setSelectedBoardId(board.boardId);
                        setViewMode('board_inspector');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-200 text-xs">{board.code}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                            board.role === 'woofer_lowpass'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                              : board.role === 'tweeter_highpass'
                              ? 'bg-sky-950/60 text-sky-300 border-sky-700/60'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                          }`}
                        >
                          Tier {board.tierIndex} • {board.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium mb-1.5 line-clamp-1">{board.name}</p>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>
                          {formatLength(board.dimensions.widthMm)} × {formatLength(board.dimensions.heightMm)}
                        </span>
                        <span className="text-emerald-400 font-bold">${board.estimatedBOMCostUsd.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Anti-Crosstalk Rule Badge */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>90° Inductor Decoupling</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Adjacent filter inductors are automatically oriented orthogonally (90° magnetic axis rotation) to eliminate mutual inductive crosstalk (&lt; -70 dB).
              </p>
            </div>
          </div>

          {/* Right Area: Interactive Viewport Display */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0d14] p-4 min-w-0">
            {/* VIEW 1: 2D BOARD CAD INSPECTOR */}
            {viewMode === 'board_inspector' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                {/* 2D Canvas Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{activeBoard.name}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-cyan-300">
                      {formatLength(activeBoard.dimensions.widthMm)} × {formatLength(activeBoard.dimensions.heightMm)} (1.6mm FR4)
                    </span>
                  </div>

                  {/* Layer Toggles */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTopCopper}
                        onChange={(e) => setShowTopCopper(e.target.checked)}
                        className="accent-cyan-500"
                      />
                      <span className="text-cyan-400 font-bold">Top Copper</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBottomCopper}
                        onChange={(e) => setShowBottomCopper(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span className="text-amber-400 font-bold">GND Bus</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSilkscreen}
                        onChange={(e) => setShowSilkscreen(e.target.checked)}
                        className="accent-slate-300"
                      />
                      <span className="text-slate-300">Silk Screen</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showMagneticAxes}
                        onChange={(e) => setShowMagneticAxes(e.target.checked)}
                        className="accent-purple-400"
                      />
                      <span className="text-purple-300 font-bold">90° Flux Axis</span>
                    </label>
                  </div>
                </div>

                {/* Interactive Scalable Vector 2D PCB Canvas */}
                <div className="flex-1 bg-[#090b10] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4 relative shadow-inner">
                  <svg
                    viewBox={`-5 -5 ${activeBoard.dimensions.widthMm + 10} ${activeBoard.dimensions.heightMm + 10}`}
                    className="w-full h-full max-h-[520px] drop-shadow-2xl select-none"
                    style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
                  >
                    {/* Definitions */}
                    <defs>
                      <pattern id="pcb_grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#131722" strokeWidth="0.5" />
                      </pattern>
                      <linearGradient id="gold_pad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ca8a04" />
                      </linearGradient>
                    </defs>

                    {/* Background Grid */}
                    <rect x="-5" y="-5" width={activeBoard.dimensions.widthMm + 10} height={activeBoard.dimensions.heightMm + 10} fill="url(#pcb_grid)" />

                    {/* Solder Mask Substrate Base (Matte Black / Blue FR4) */}
                    <rect
                      x="0"
                      y="0"
                      width={activeBoard.dimensions.widthMm}
                      height={activeBoard.dimensions.heightMm}
                      rx={activeBoard.cornerFilletRadiusMm}
                      fill={activeBoard.solderMaskColor === 'blue' ? '#0f172a' : activeBoard.solderMaskColor === 'green' ? '#064e3b' : '#141822'}
                      stroke="#334155"
                      strokeWidth="0.8"
                    />

                    {/* Bottom Layer Ground Bus (Gold / Amber Traces) */}
                    {showBottomCopper &&
                      activeBoard.traces
                        .filter((t) => t.layer === 'bottom')
                        .map((t) => (
                          <line
                            key={t.id}
                            x1={t.startX}
                            y1={t.startY}
                            x2={t.endX}
                            y2={t.endY}
                            stroke="#b45309"
                            strokeWidth={t.widthMm}
                            strokeLinecap="round"
                            opacity="0.85"
                          />
                        ))}

                    {/* Top Layer Signal Traces (Bright Gold/Copper) */}
                    {showTopCopper &&
                      activeBoard.traces
                        .filter((t) => t.layer === 'top')
                        .map((t) => (
                          <line
                            key={t.id}
                            x1={t.startX}
                            y1={t.startY}
                            x2={t.endX}
                            y2={t.endY}
                            stroke="#eab308"
                            strokeWidth={t.widthMm}
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                        ))}

                    {/* Through-Hole Copper Pads */}
                    {activeBoard.pads.map((pad) => (
                      <g key={pad.id}>
                        <circle
                          cx={pad.xMm}
                          cy={pad.yMm}
                          r={pad.widthMm / 2}
                          fill="url(#gold_pad)"
                          stroke="#713f12"
                          strokeWidth="0.3"
                        />
                        <circle cx={pad.xMm} cy={pad.yMm} r={(pad.holeDiameterMm || 1.2) / 2} fill="#090b10" />
                      </g>
                    ))}

                    {/* M4 Corner Mounting Standoff Holes */}
                    {activeBoard.holes
                      .filter((h) => h.type === 'mounting')
                      .map((hole) => (
                        <g key={hole.id}>
                          <circle cx={hole.xMm} cy={hole.yMm} r={hole.diameterMm / 2 + 1.5} fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
                          <circle cx={hole.xMm} cy={hole.yMm} r={hole.diameterMm / 2} fill="#05070a" />
                          <circle cx={hole.xMm} cy={hole.yMm} r={hole.diameterMm / 2 + 0.5} fill="none" stroke="#e2e8f0" strokeWidth="0.3" strokeDasharray="1,1" />
                        </g>
                      ))}

                    {/* Silkscreen Component Outlines & Text */}
                    {showSilkscreen &&
                      activeBoard.silkElements.map((s) => {
                        if (s.type === 'text' && s.text) {
                          return (
                            <text
                              key={s.id}
                              x={s.x}
                              y={s.y}
                              fontSize={s.fontSizeMm || 1.5}
                              fill="#f8fafc"
                              fontFamily="monospace"
                              fontWeight="bold"
                              opacity="0.9"
                            >
                              {s.text}
                            </text>
                          );
                        }
                        if (s.type === 'rect' && s.widthMm && s.heightMm) {
                          return (
                            <rect
                              key={s.id}
                              x={s.x - s.widthMm / 2}
                              y={s.y - s.heightMm / 2}
                              width={s.widthMm}
                              height={s.heightMm}
                              fill="#0f172a"
                              fillOpacity="0.4"
                              stroke="#ffffff"
                              strokeWidth="0.35"
                              strokeDasharray="2,1"
                            />
                          );
                        }
                        if (s.type === 'circle' && s.radiusMm) {
                          return (
                            <circle
                              key={s.id}
                              cx={s.x}
                              cy={s.y}
                              r={s.radiusMm}
                              fill="#0f172a"
                              fillOpacity="0.4"
                              stroke="#ffffff"
                              strokeWidth="0.35"
                            />
                          );
                        }
                        return null;
                      })}

                    {/* Inductor Magnetic Axis Vector Decoupling Overlay */}
                    {showMagneticAxes &&
                      activeBoard.components
                        .filter((c) => c.type === 'inductor')
                        .map((c) => {
                          const isOrthogonal = c.rotationDeg === 90;
                          return (
                            <g key={`${c.id}_mag_axis`}>
                              <line
                                x1={isOrthogonal ? c.midXMm : c.midXMm - 20}
                                y1={isOrthogonal ? c.midYMm - 20 : c.midYMm}
                                x2={isOrthogonal ? c.midXMm : c.midXMm + 20}
                                y2={isOrthogonal ? c.midYMm + 20 : c.midYMm}
                                stroke="#c084fc"
                                strokeWidth="0.8"
                                strokeDasharray="1.5,1.5"
                              />
                              <circle cx={c.midXMm} cy={c.midYMm} r="2" fill="#c084fc" />
                            </g>
                          );
                        })}
                  </svg>
                </div>
              </div>
            )}

            {/* VIEW 2: MULTI-BOARD STACK ASSEMBLY & JUMPERS */}
            {viewMode === 'stack_assembly' && (
              <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs">
                {/* 3D Tier Representation Banner */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      Physical Board Stacking & Brass Standoff Assembly
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {boardStack.stackingHardware.tierCount} Tiers • {boardStack.stackingHardware.standoffHeightMm}mm M4 Brass Standoffs
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Mounting tiers in a vertical stack isolates high-current magnetic low-pass fields from sensitive high-frequency audio paths while keeping the enclosure footprint compact.
                  </p>

                  {/* Tier Graphic representation */}
                  <div className="space-y-3 pt-2">
                    {boardStack.boards.map((b, idx) => (
                      <div
                        key={b.boardId}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                          activeBoard.boardId === b.boardId
                            ? 'bg-slate-900 border-cyan-500 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-300 flex items-center justify-center font-bold">
                            T{b.tierIndex}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 text-xs">{b.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {b.components.length} components • {formatLength(b.dimensions.widthMm)} × {formatLength(b.dimensions.heightMm)} (1.6mm FR4, 2oz Copper)
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-emerald-400 font-bold block">${b.estimatedBOMCostUsd.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-500">{b.estimatedMassGrams} g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inter-Board Jumpers Table */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-200 block uppercase tracking-wider text-xs">
                    Inter-Board Silicone Wire Jumper Harness ({boardStack.jumpers.length} Jumpers):
                  </span>
                  {boardStack.jumpers.length === 0 ? (
                    <div className="text-slate-400 italic">Unified single board configuration: No inter-board jumpers required.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-2">Signal</th>
                            <th className="p-2">From Board (Pin)</th>
                            <th className="p-2">To Board (Pin)</th>
                            <th className="p-2">Wire Gauge</th>
                            <th className="p-2">Color</th>
                            <th className="p-2">Length</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-slate-300">
                          {boardStack.jumpers.map((j) => (
                            <tr key={j.id} className="hover:bg-slate-900/50">
                              <td className="p-2 font-bold text-cyan-300">{j.signalName}</td>
                              <td className="p-2">{j.fromPadLabel}</td>
                              <td className="p-2">{j.toPadLabel}</td>
                              <td className="p-2">{j.recommendedWireAwg} AWG</td>
                              <td className="p-2 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: j.wireColorHex }} />
                                <span>{j.wireColorHex === '#ef4444' ? 'Red (+)' : j.wireColorHex === '#0f172a' ? 'Black (-)' : 'Yellow'}</span>
                              </td>
                              <td className="p-2">{formatLength(j.lengthMm)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: FULL BILL OF MATERIALS & GERBER FILE DIRECTORY */}
            {viewMode === 'bom_netlist' && (
              <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs">
                {/* Export Files Table */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      Generated RS-274X Gerber & Fabrication Files ({manufacturingPkg.files.length} Files):
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All as ZIP</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {manufacturingPkg.files.map((file) => (
                      <div
                        key={file.filename}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="font-bold text-cyan-300 text-xs">{file.filename}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{file.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleFile(file.filename, file.content, file.mimeType)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>Save</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Procurement BOM */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      Full Stack Component Procurement BOM:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleFile('Consolidated_BOM.csv', manufacturingPkg.bomCsv, 'text/csv')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Export BOM CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
                      <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2">Ref</th>
                          <th className="p-2">Value</th>
                          <th className="p-2">Rating</th>
                          <th className="p-2">Recommended Part</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2 text-right">Est Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {boardStack.boards.flatMap((b) => b.components).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-900/50">
                            <td className="p-2 font-bold text-cyan-300">{c.designator}</td>
                            <td className="p-2">{c.valueFormatted}</td>
                            <td className="p-2 text-slate-400">{c.ratingStr}</td>
                            <td className="p-2">{c.recommendedPartNumber}</td>
                            <td className="p-2 font-mono text-[11px] text-slate-400">{c.distributorSku}</td>
                            <td className="p-2 text-right text-emerald-400 font-bold">${c.estimatedCostUsd.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
