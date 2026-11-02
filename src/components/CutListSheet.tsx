import React, { useState, useMemo } from 'react';
import { CutListItem, EnclosureDimensions } from '../types/loudspeaker.ts';
import { exportCutListToCSV } from '../services/cutlistGenerator.ts';
import { Download, FileText, Printer, Ruler, Eye, Compass, Layers, CheckCircle2, Info, Grid } from 'lucide-react';
import { useUnits } from '../context/UnitContext.tsx';

interface CutListSheetProps {
  cutList: CutListItem[];
  dimensions: EnclosureDimensions;
  selectedPartId?: string | null;
  onSelectPart: (partId: string) => void;
  onHoverPart?: (partId: string | null) => void;
  onInspectPartSpecs?: (partId: string) => void;
}

type SpatialFilterCategory = 'all' | 'baffle' | 'exterior_walls' | 'braces' | 'ports_internal';
type SheetStockPreset = '1525x1525' | '2440x1220';

interface NestedPanelRect {
  instanceKey: string;
  item: CutListItem;
  sheetIndex: number;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  hasDogboneRelief: boolean;
}

export const CutListSheet: React.FC<CutListSheetProps> = ({
  cutList,
  dimensions,
  selectedPartId,
  onSelectPart,
  onHoverPart,
  onInspectPartSpecs,
}) => {
  const { unitSystem, setUnitSystem, formatLength } = useUnits();
  const [activeFilter, setActiveFilter] = useState<SpatialFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sheetPreset, setSheetPreset] = useState<SheetStockPreset>('1525x1525');
  const [showDogboneFillets, setShowDogboneFillets] = useState<boolean>(true);
  const [showNestingDiagram, setShowNestingDiagram] = useState<boolean>(true);

  const sheetDims = sheetPreset === '1525x1525'
    ? { widthMm: 1525, heightMm: 1525, label: '5×5 ft Baltic Birch (1525×1525 mm)' }
    : { widthMm: 2440, heightMm: 1220, label: '8×4 ft Standard Sheet (2440×1220 mm)' };

  const totalParts = cutList.reduce((acc, p) => acc + p.quantity, 0);
  const totalWeight = cutList.reduce((acc, p) => acc + p.weightKg, 0);

  // Total square meters of sheet material
  const totalAreaM2 = cutList.reduce((acc, p) => {
    return acc + (p.widthMm * p.lengthMm * p.quantity) * 1e-6;
  }, 0);
  const totalAreaSqFt = totalAreaM2 * 10.7639;

  // Percentage of selected standard sheet stock
  const standardSheetAreaM2 = (sheetDims.widthMm * sheetDims.heightMm) * 1e-6;
  const sheetYieldFraction = (totalAreaM2 / standardSheetAreaM2) * 100;

  // 2D Guillotine / Shelf Nesting Algorithm with 6.35mm CNC router bit kerf + 12mm perimeter margin
  const nestingLayout = useMemo(() => {
    const kerfMm = 6.35; // 1/4" compression spiral bit kerf
    const marginMm = 12;
    const expandedPanels: Array<{ item: CutListItem; copyIndex: number; wMm: number; hMm: number }> = [];

    cutList.forEach((item) => {
      for (let q = 0; q < item.quantity; q++) {
        const w = Math.max(item.widthMm, item.lengthMm);
        const h = Math.min(item.widthMm, item.lengthMm);
        expandedPanels.push({ item, copyIndex: q + 1, wMm: w, hMm: h });
      }
    });

    // Sort descending by height then width for optimal shelf packing
    expandedPanels.sort((a, b) => b.hMm - a.hMm || b.wMm - a.wMm);

    const packedRects: NestedPanelRect[] = [];
    let currentSheet = 0;
    let cursorX = marginMm;
    let cursorY = marginMm;
    let shelfHeight = 0;

    expandedPanels.forEach((panel, idx) => {
      const fitW = Math.min(panel.wMm, sheetDims.widthMm - marginMm * 2);
      const fitH = Math.min(panel.hMm, sheetDims.heightMm - marginMm * 2);

      if (cursorX + fitW > sheetDims.widthMm - marginMm) {
        // Advance to next row shelf
        cursorX = marginMm;
        cursorY += shelfHeight + kerfMm;
        shelfHeight = 0;
      }

      if (cursorY + fitH > sheetDims.heightMm - marginMm) {
        // Advance to new sheet
        currentSheet += 1;
        cursorX = marginMm;
        cursorY = marginMm;
        shelfHeight = 0;
      }

      const hasDogbone =
        dimensions.jointType === 'rabbet' ||
        panel.item.type === 'window_brace' ||
        panel.item.type === 'shelf_brace' ||
        panel.item.type === 'baffle';

      packedRects.push({
        instanceKey: `${panel.item.id}-${panel.copyIndex}-${idx}`,
        item: panel.item,
        sheetIndex: currentSheet,
        xMm: cursorX,
        yMm: cursorY,
        wMm: fitW,
        hMm: fitH,
        hasDogboneRelief: hasDogbone,
      });

      cursorX += fitW + kerfMm;
      shelfHeight = Math.max(shelfHeight, fitH);
    });

    return {
      rects: packedRects,
      sheetCount: Math.max(1, currentSheet + 1),
      kerfMm,
    };
  }, [cutList, sheetDims.widthMm, sheetDims.heightMm, dimensions.jointType]);

  // Category classifier for quick filtering
  const getFilterCategory = (item: CutListItem): SpatialFilterCategory => {
    if (item.type === 'baffle') return 'baffle';
    if (item.type === 'top' || item.type === 'bottom' || item.type === 'left_side' || item.type === 'right_side' || item.type === 'rear') {
      return 'exterior_walls';
    }
    if (item.type === 'window_brace' || item.type === 'shelf_brace' || item.type === 'cleat') {
      return 'braces';
    }
    return 'ports_internal';
  };

  const getSpatialBadgeColor = (item: CutListItem) => {
    if (item.type === 'baffle') {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-cyan-950/40';
    }
    if (item.type === 'top' || item.type === 'bottom') {
      return 'bg-sky-950/80 text-sky-300 border-sky-500/60 shadow-sky-950/40';
    }
    if (item.type === 'left_side' || item.type === 'right_side') {
      return 'bg-blue-950/80 text-blue-300 border-blue-500/60 shadow-blue-950/40';
    }
    if (item.type === 'rear') {
      return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/60 shadow-indigo-950/40';
    }
    if (item.type === 'window_brace' || item.type === 'shelf_brace') {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-emerald-950/40';
    }
    if (item.type === 'port_board' || item.type === 'midrange_chamber') {
      return 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-purple-950/40';
    }
    return 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-amber-950/40';
  };

  const filteredCutList = cutList.filter((item) => {
    if (activeFilter !== 'all' && getFilterCategory(item) !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = item.spatialLabel.toLowerCase().includes(q);
      const matchLoc = item.spatialLocation.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchNotes = item.cutNotes.toLowerCase().includes(q);
      return matchLabel || matchLoc || matchName || matchNotes;
    }
    return true;
  });

  const handleExportCSV = () => {
    const csvContent = exportCutListToCSV(cutList, dimensions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `ResonanceCAD_CutList_${dimensions.externalWidthMm}x${dimensions.externalHeightMm}x${dimensions.externalDepthMm}.csv`
    );
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
    link.setAttribute(
      'download',
      `ResonanceCAD_CAD_Spec_${dimensions.externalWidthMm}x${dimensions.externalHeightMm}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-sans text-slate-200 shadow-2xl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Workshop Cut List &amp; Spatial Panel Schedule
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/80">
              Auto-Labeled 3D
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated spatial numbering (e.g., <code className="text-cyan-300 font-mono">Baffle-01</code>, <code className="text-sky-300 font-mono">Side-Left-01</code>, <code className="text-emerald-300 font-mono">Brace-Inner-02</code>) dynamically synced with 3D CAD mesh highlights.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unit Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setUnitSystem('metric')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                unitSystem === 'metric'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              METRIC (MM)
            </button>
            <button
              onClick={() => setUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                unitSystem === 'imperial'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              IMPERIAL (IN)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer"
            title="Export CSV with Spatial Labels"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Schedule</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Export Full JSON CAD Specification"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Print Cut List"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Workshop Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Panels &amp; Parts</span>
          <span className="text-lg font-bold font-mono text-slate-100">{totalParts} panels</span>
          <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
            {cutList.length} distinct spatial parts
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Raw Board Area</span>
          <span className="text-lg font-bold font-mono text-cyan-300">{totalAreaM2.toFixed(2)} m²</span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{totalAreaSqFt.toFixed(1)} sq.ft</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sheet Yield ({sheetPreset === '1525x1525' ? '5×5 ft' : '8×4 ft'})</span>
          <span className="text-lg font-bold font-mono text-amber-300">{sheetYieldFraction.toFixed(0)}%</span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            {nestingLayout.sheetCount === 1 ? 'Fits on 1 standard sheet' : `Nested across ${nestingLayout.sheetCount} sheets`}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Est. Raw Panel Mass</span>
          <span className="text-lg font-bold font-mono text-emerald-300">{totalWeight.toFixed(1)} kg</span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
            {(totalWeight * 2.20462).toFixed(1)} lbs dry
          </span>
        </div>
      </div>

      {/* 2D CNC Sheet-Stock Nesting & Dogbone Relief Layout */}
      <div className="mb-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              2D CNC Sheet-Stock Nesting &amp; Dogbone Corner Relief Map
            </h4>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[10px] font-mono text-emerald-300">
              6.35mm (1/4&quot;) Kerf • Ø3.175mm Dogbone Fillets
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setSheetPreset('1525x1525')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  sheetPreset === '1525x1525'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1525×1525 (5×5&apos; Birch)
              </button>
              <button
                type="button"
                onClick={() => setSheetPreset('2440x1220')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  sheetPreset === '2440x1220'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2440×1220 (8×4&apos; MDF)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDogboneFillets((v) => !v)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                showDogboneFillets
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {showDogboneFillets ? 'Dogbone Relief: ON' : 'Dogbone Relief: OFF'}
            </button>

            <button
              type="button"
              onClick={() => setShowNestingDiagram((v) => !v)}
              className="px-2.5 py-1 rounded text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              {showNestingDiagram ? 'Hide Diagram' : 'Show Diagram'}
            </button>
          </div>
        </div>

        {showNestingDiagram && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: nestingLayout.sheetCount }).map((_, sheetIdx) => {
              const sheetRects = nestingLayout.rects.filter((r) => r.sheetIndex === sheetIdx);
              return (
                <div
                  key={`sheet-${sheetIdx}`}
                  className="bg-slate-950 border border-slate-800/90 rounded-lg p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      SHEET #{sheetIdx + 1} — <strong className="text-slate-200">{sheetDims.label}</strong>
                    </span>
                    <span className="text-cyan-400">{sheetRects.length} nested panels</span>
                  </div>

                  <div className="w-full overflow-hidden rounded border border-slate-800 bg-[#070b14]">
                    <svg
                      viewBox={`0 0 ${sheetDims.widthMm} ${sheetDims.heightMm}`}
                      className="w-full h-auto max-h-64 block"
                    >
                      {/* Raw Sheet Stock Boundary */}
                      <rect
                        x={0}
                        y={0}
                        width={sheetDims.widthMm}
                        height={sheetDims.heightMm}
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth={8}
                      />

                      {/* Wood Grain Direction Reference Lines */}
                      {Array.from({ length: 7 }).map((__, gIdx) => {
                        const yLine = ((gIdx + 1) * sheetDims.heightMm) / 8;
                        return (
                          <line
                            key={`grain-${gIdx}`}
                            x1={20}
                            y1={yLine}
                            x2={sheetDims.widthMm - 20}
                            y2={yLine}
                            stroke="#1e293b"
                            strokeWidth={2}
                            strokeDasharray="18 12"
                          />
                        );
                      })}

                      {/* Nested Panel Cutouts */}
                      {sheetRects.map((rect) => {
                        const isSelected = selectedPartId === rect.item.id;
                        const fillMap: Record<string, string> = {
                          baffle: isSelected ? '#06b6d4' : '#083344',
                          top: isSelected ? '#0284c7' : '#0c4a6e',
                          bottom: isSelected ? '#0284c7' : '#0c4a6e',
                          left_side: isSelected ? '#2563eb' : '#1e3a8a',
                          right_side: isSelected ? '#2563eb' : '#1e3a8a',
                          rear: isSelected ? '#4f46e5' : '#312e81',
                          window_brace: isSelected ? '#10b981' : '#064e3b',
                          shelf_brace: isSelected ? '#10b981' : '#064e3b',
                          port_board: isSelected ? '#a855f7' : '#4c1d95',
                          midrange_chamber: isSelected ? '#a855f7' : '#4c1d95',
                        };
                        const fill = fillMap[rect.item.type] || (isSelected ? '#f59e0b' : '#451a03');
                        const stroke = isSelected ? '#22d3ee' : '#38bdf8';
                        const dogboneRadius = 14;

                        return (
                          <g
                            key={rect.instanceKey}
                            onClick={() => onSelectPart(rect.item.id)}
                            onMouseEnter={() => onHoverPart?.(rect.item.id)}
                            onMouseLeave={() => onHoverPart?.(null)}
                            className="cursor-pointer transition-opacity hover:opacity-90"
                          >
                            <rect
                              x={rect.xMm}
                              y={rect.yMm}
                              width={rect.wMm}
                              height={rect.hMm}
                              fill={fill}
                              fillOpacity={isSelected ? 0.85 : 0.65}
                              stroke={stroke}
                              strokeWidth={isSelected ? 8 : 4}
                            />

                            {/* CNC Dogbone / T-Bone Corner Relief Fillets */}
                            {showDogboneFillets && rect.hasDogboneRelief && (
                              <>
                                <circle
                                  cx={rect.xMm + dogboneRadius}
                                  cy={rect.yMm + dogboneRadius}
                                  r={dogboneRadius}
                                  fill="#090d16"
                                  stroke="#f59e0b"
                                  strokeWidth={3}
                                />
                                <circle
                                  cx={rect.xMm + rect.wMm - dogboneRadius}
                                  cy={rect.yMm + dogboneRadius}
                                  r={dogboneRadius}
                                  fill="#090d16"
                                  stroke="#f59e0b"
                                  strokeWidth={3}
                                />
                                <circle
                                  cx={rect.xMm + dogboneRadius}
                                  cy={rect.yMm + rect.hMm - dogboneRadius}
                                  r={dogboneRadius}
                                  fill="#090d16"
                                  stroke="#f59e0b"
                                  strokeWidth={3}
                                />
                                <circle
                                  cx={rect.xMm + rect.wMm - dogboneRadius}
                                  cy={rect.yMm + rect.hMm - dogboneRadius}
                                  r={dogboneRadius}
                                  fill="#090d16"
                                  stroke="#f59e0b"
                                  strokeWidth={3}
                                />
                              </>
                            )}

                            {/* Spatial Label & Dimensions inside Nested Rect */}
                            {rect.wMm > 110 && rect.hMm > 75 && (
                              <>
                                <text
                                  x={rect.xMm + rect.wMm / 2}
                                  y={rect.yMm + rect.hMm / 2 - 8}
                                  textAnchor="middle"
                                  fill="#f8fafc"
                                  fontSize={Math.min(34, Math.max(18, rect.wMm * 0.08))}
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {rect.item.spatialLabel}
                                </text>
                                <text
                                  x={rect.xMm + rect.wMm / 2}
                                  y={rect.yMm + rect.hMm / 2 + 24}
                                  textAnchor="middle"
                                  fill="#bae6fd"
                                  fontSize={Math.min(26, Math.max(14, rect.wMm * 0.06))}
                                  fontFamily="monospace"
                                >
                                  {Math.round(rect.wMm)}×{Math.round(rect.hMm)}
                                </text>
                              </>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spatial Category Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter:</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-500/70 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            All Parts ({cutList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('baffle')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              activeFilter === 'baffle'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/70'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            Baffle ({cutList.filter((i) => getFilterCategory(i) === 'baffle').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('exterior_walls')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              activeFilter === 'exterior_walls'
                ? 'bg-sky-950 text-sky-300 border border-sky-500/70'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            Exterior Walls ({cutList.filter((i) => getFilterCategory(i) === 'exterior_walls').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('braces')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              activeFilter === 'braces'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/70'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            Bracing ({cutList.filter((i) => getFilterCategory(i) === 'braces').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ports_internal')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
              activeFilter === 'ports_internal'
                ? 'bg-purple-950 text-purple-300 border border-purple-500/70'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            Ports &amp; Interior ({cutList.filter((i) => getFilterCategory(i) === 'ports_internal').length})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spatial ID or part..."
            className="w-full sm:w-56 px-3 py-1 bg-slate-950 border border-slate-700/80 rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Detailed Cut Table with Spatial Identifier & 3D Sync */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Spatial ID</th>
              <th className="py-2.5 px-3">Component &amp; Role</th>
              <th className="py-2.5 px-2 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Width (X)</th>
              <th className="py-2.5 px-3 text-right">Length (Y)</th>
              <th className="py-2.5 px-3 text-right">Thick (Z)</th>
              <th className="py-2.5 px-3">Machining / Joinery Specification</th>
              <th className="py-2.5 px-2 text-right">Mass</th>
              <th className="py-2.5 px-3 text-center">3D CAD Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-300">
            {filteredCutList.map((item) => {
              const isSelected = selectedPartId === item.id;
              const badgeClass = getSpatialBadgeColor(item);

              return (
                <tr
                  key={item.id}
                  onMouseEnter={() => onHoverPart?.(item.id)}
                  onMouseLeave={() => onHoverPart?.(null)}
                  onClick={() => onSelectPart(item.id)}
                  className={`transition group cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Spatial Identifier Badge */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wide border shadow-sm ${badgeClass}`}
                      >
                        {item.spatialLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                        {item.spatialLocation}
                      </span>
                    </div>
                  </td>

                  {/* Component Name & Cut Notes */}
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-medium text-slate-200 group-hover:text-cyan-300 transition flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono leading-relaxed mt-0.5">
                      {item.cutNotes}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 px-2 text-center font-bold text-slate-100">
                    {item.quantity}
                  </td>

                  {/* Dimensions */}
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold font-mono">
                    {formatLength(item.widthMm)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold font-mono">
                    {formatLength(item.lengthMm)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                    {formatLength(item.thicknessMm)}
                  </td>

                  {/* Machining / Joinery */}
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs font-sans leading-relaxed">
                    {item.machiningNotes}
                  </td>

                  {/* Mass */}
                  <td className="py-2.5 px-2 text-right text-slate-300 font-mono whitespace-nowrap">
                    {item.weightKg} kg
                  </td>

                  {/* 3D CAD Action Buttons */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPart(item.id);
                        }}
                        className={`p-1.5 rounded transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-600'
                        }`}
                        title={`Highlight [${item.spatialLabel}] in 3D CAD Viewport`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>3D Highlight</span>
                      </button>

                      {onInspectPartSpecs && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectPartSpecs(item.id);
                          }}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
                          title="Inspect Detailed Engineering & Machining Specs"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCutList.length === 0 && (
        <div className="text-center py-8 text-slate-500 font-mono text-xs">
          No panels match the selected filter or search query.
        </div>
      )}

      {/* Footer Info Notice */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Clicking any panel highlights its physical 3D mesh and renders its dynamic spatial CAD label in the viewport.</span>
        </div>
        <div className="text-slate-500">
          Showing {filteredCutList.length} of {cutList.length} total parts
        </div>
      </div>
    </div>
  );
};
