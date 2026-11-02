import React, { useState, useRef, useEffect } from 'react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  PartMetadata,
} from '../types/loudspeaker.ts';
import type { CadExportScope } from '../services/cadExportEngine.ts';
import {
  type ComplexityMode,
  type WorkflowStage,
} from '../services/contextActionEngine.ts';
import {
  Activity,
  Box,
  Disc3,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Menu,
  MoreHorizontal,
  PanelRight,
  Ruler,
  Search,
  Settings,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { useUnits } from '../context/UnitContext.tsx';

export type WorkflowMode = 'acoustic_design' | 'cabinet_cad' | 'inspection_fea';
export type PrimaryWorkspaceTab =
  | 'cad_3d'
  | 'transducer_sizing'
  | 'crossover_pcb'
  | 'line_array'
  | 'structural_rigging'
  | 'cut_list'
  | 'simulate';

interface TopHeaderProps {
  results: AcousticCalculationResult;
  acoustics: AcousticParameters;
  activeWorkflowMode: WorkflowMode;
  onSelectWorkflowMode: (mode: WorkflowMode) => void;
  activeWorkspace: PrimaryWorkspaceTab;
  onSelectWorkspace: (workspace: PrimaryWorkspaceTab) => void;
  isLiveSimOpen?: boolean;
  onToggleLiveSim?: () => void;
  onOpenCadExport?: (scope?: CadExportScope) => void;
  onOpenProjectsDrawer?: () => void;
  onOpenSetupWizard?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenPcbWorkspace?: () => void;
  onOpenLineArray?: () => void;
  onOpenTransducerSizing?: () => void;
  isPaSpeaker?: boolean;
  onOpenStructuralRigging?: () => void;
  savedProjectsCount?: number;
  isLeftMenuOpen?: boolean;
  onToggleLeftMenu?: () => void;
  isRightInspectorOpen?: boolean;
  onToggleRightInspector?: () => void;
  activeDockTab?: 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics' | null;
  onToggleDockTab?: (tab: 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics') => void;
  complexityMode?: ComplexityMode;
  onToggleComplexityMode?: (mode?: ComplexityMode) => void;
  selectedPartId?: string | null;
  selectedPart?: PartMetadata | null;
  onClearSelectedPart?: () => void;
  onFocusInspectorSection?: (
    tab: 'telemetry' | 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics',
    sectionId: string
  ) => void;
  onToggleTpmsMatrix?: () => void;
  onCyclePortProfile?: () => void;
  onToggleAirflowStress?: () => void;
  isAirflowStressVisible?: boolean;
  onToggleVibrationAnalysis?: () => void;
  isVibrationAnalysisVisible?: boolean;
  onToggleCutaway?: () => void;
  isCutawayMode?: boolean;
  onOpenResponseChart?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onOpenCadExport,
  onOpenProjectsDrawer,
  onOpenSetupWizard,
  onOpenSearch,
  onOpenSettings,
  savedProjectsCount = 3,
  isLeftMenuOpen = false,
  onToggleLeftMenu,
  isRightInspectorOpen = true,
  onToggleRightInspector,
  complexityMode = 'essentials',
  onToggleComplexityMode,
  onFocusInspectorSection,
}) => {
  const { unitSystem, toggleUnitSystem } = useUnits();
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOverflowOpen]);

  // Derive active 3-stage workflow stage from workspace
  const activeStage: WorkflowStage =
    activeWorkspace === 'cut_list'
      ? 'fabricate'
      : activeWorkspace === 'simulate' || activeWorkspace === 'line_array' || activeWorkspace === 'structural_rigging'
      ? 'simulate'
      : 'design';

  const handleSelectStage = (stage: WorkflowStage) => {
    if (stage === 'design') {
      onSelectWorkspace('cad_3d');
      onFocusInspectorSection?.('acoustics', 'section-driver-alignment');
    } else if (stage === 'simulate') {
      onSelectWorkspace('simulate');
    } else if (stage === 'fabricate') {
      onSelectWorkspace('cut_list');
    }
  };

  return (
    <header className="w-full bg-[#07090e] border-b border-slate-800/90 select-none text-slate-200 z-30 shrink-0">
      <div className="w-full h-12 flex items-center justify-between gap-3 px-3">
        {/* Zone 1 (Left): Brand Identity & Action Command Palette (⌘K) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onToggleLeftMenu && (
            <button
              type="button"
              onClick={onToggleLeftMenu}
              title={isLeftMenuOpen ? 'Collapse Tools Drawer' : 'Expand Tools Drawer'}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {isLeftMenuOpen ? (
                <X className="w-4 h-4 text-cyan-400" />
              ) : (
                <Menu className="w-4 h-4 text-cyan-400" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-600 text-white shadow-sm">
              <Disc3 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-wider uppercase font-mono text-slate-100 whitespace-nowrap">
              Resonance<span className="text-cyan-400">CAD</span>
            </span>
          </div>

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              title="Command Palette: Search drivers, materials, alignments (⌘K / Ctrl+K)"
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer font-mono text-xs whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden md:inline text-slate-400 text-[11px]">
                Search or command...
              </span>
              <kbd className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-cyan-300 font-bold border border-slate-800">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Zone 2 (Center): Unified 3-Stage Workflow Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <nav
            aria-label="Workflow Stages"
            className="flex items-center gap-1 bg-[#0b0f17] p-1 rounded-xl border border-slate-800/90 text-xs font-mono shrink-0"
          >
            <button
              type="button"
              onClick={() => handleSelectStage('design')}
              title="Stage 1 — Design: 3D CAD modeling, cabinet sizing & driver placement"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-bold whitespace-nowrap ${
                activeStage === 'design' && activeWorkspace === 'cad_3d'
                  ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-100 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Design</span>
            </button>

            <span className="text-slate-700 text-[10px] select-none">→</span>

            <button
              type="button"
              onClick={() => handleSelectStage('simulate')}
              title="Stage 2 — Simulate: Live SPL, impedance curves, airflow velocity & FEA"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-bold whitespace-nowrap ${
                activeStage === 'simulate'
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Simulate</span>
            </button>

            <span className="text-slate-700 text-[10px] select-none">→</span>

            <button
              type="button"
              onClick={() => handleSelectStage('fabricate')}
              title="Stage 3 — Fabricate: 2D Cut List, BOM pricing & CAD exports"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer font-bold whitespace-nowrap ${
                activeStage === 'fabricate'
                  ? 'bg-purple-950/90 border-purple-500/80 text-purple-100 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
              <span>3. Fabricate</span>
            </button>
          </nav>
        </div>

        {/* Zone 3 (Right): Essentials ↔ Master Toggle & Overflow Menu */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          {/* Progressive Disclosure Toggle */}
          {onToggleComplexityMode && (
            <div
              className="flex items-center bg-[#0b0f17] p-0.5 rounded-lg border border-slate-800"
              title="Switch between simplified Essentials Mode and full Master Engineer controls"
            >
              <button
                type="button"
                onClick={() => onToggleComplexityMode('essentials')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                  complexityMode === 'essentials'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Essentials
              </button>
              <button
                type="button"
                onClick={() => onToggleComplexityMode('master')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  complexityMode === 'master'
                    ? 'bg-amber-600 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>Master</span>
              </button>
            </div>
          )}

          {/* Quick Inspector Toggle */}
          {onToggleRightInspector && (
            <button
              type="button"
              onClick={onToggleRightInspector}
              title={isRightInspectorOpen ? 'Collapse Inspector' : 'Expand Inspector'}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isRightInspectorOpen
                  ? 'bg-cyan-950/80 border-cyan-600/80 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* Overflow Menu (···) for Secondary Utilities */}
          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              title="Secondary utilities & settings"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOverflowOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#090d16] border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-1 animate-in fade-in slide-in-from-top-1">
                <button
                  type="button"
                  onClick={() => {
                    toggleUnitSystem();
                    setIsOverflowOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Unit System:</span>
                  </span>
                  <span className="font-bold text-cyan-300">
                    {unitSystem === 'metric' ? 'MM (Metric)' : 'IN (Imperial)'}
                  </span>
                </button>

                {onOpenSetupWizard && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSetupWizard();
                      setIsOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Guided Wizard</span>
                  </button>
                )}

                {onOpenProjectsDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProjectsDrawer();
                      setIsOverflowOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Project Files</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 text-cyan-300 text-[10px] font-bold border border-slate-800">
                      {savedProjectsCount}
                    </span>
                  </button>
                )}

                {onOpenCadExport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCadExport();
                      setIsOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export CAD (STL/STEP)</span>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      setIsOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-slate-100 transition cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preferences</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
