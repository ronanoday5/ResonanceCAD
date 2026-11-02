import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Volume2,
  Box,
  Zap,
  Sparkles,
  Layers,
  Activity,
  Download,
  FolderKanban,
  Eye,
  Sliders,
  FileText,
  Wrench,
  Check,
  ChevronRight,
  Disc3,
  Flame,
  Cpu,
  ShieldAlert,
  Settings,
  Waves,
} from 'lucide-react';
import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type DriverPreset,
  type MaterialType,
  type SpeakerCategory,
  type SpeakerSubcategory,
} from '../types/loudspeaker.ts';
import { DRIVER_PRESETS, MATERIAL_SPECS } from '../services/acousticEngine.ts';
import type { ComplexityMode } from '../services/contextActionEngine.ts';

export type SearchResultType = 'subcategory' | 'transducer' | 'overlay' | 'tool' | 'command';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: string;
  action: () => void;
  icon: React.ReactNode;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubcategory: (subKey: SpeakerSubcategory) => void;
  onSelectTransducer: (driver: DriverPreset) => void;
  onToggleExploded: () => void;
  onToggleXRay: () => void;
  onToggleCutaway: () => void;
  onToggleWireframe: () => void;
  onToggleAirflowStress: () => void;
  onToggleVibrationFEA: () => void;
  onOpenCutList: () => void;
  onOpenResponseChart: () => void;
  onOpenCrossover: () => void;
  onOpenWizard: () => void;
  onOpenCadExport: () => void;
  onOpenProjects: () => void;
  onOpenCustomDriver: () => void;
  onAutoAlign: () => void;
  onSelectMaterial?: (mat: MaterialType) => void;
  onSelectAlignment?: (alignment: 'ported' | 'sealed') => void;
  onToggleTpmsMatrix?: () => void;
  onToggleComplexityMode?: (mode: ComplexityMode) => void;
  complexityMode?: ComplexityMode;
  isXRayMode?: boolean;
  isCutawayMode?: boolean;
  isWireframeMode?: boolean;
  isAirflowStressVisible?: boolean;
  isVibrationAnalysisVisible?: boolean;
  explodedPercent?: number;
  onOpenFeatureModal?: (tab: 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics') => void;
  onOpenTransducerSizing?: () => void;
  onOpenLineArray?: () => void;
  onOpenPcbWorkspace?: () => void;
  onOpenSettings?: () => void;
  isPaSpeaker?: boolean;
  onOpenStructuralRigging?: () => void;
  onSelectWorkspace?: (workspace: 'cad_3d' | 'simulate' | 'cut_list' | 'crossover_pcb' | 'transducer_sizing' | 'line_array' | 'structural_rigging') => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSubcategory,
  onSelectTransducer,
  onToggleExploded,
  onToggleXRay,
  onToggleCutaway,
  onToggleWireframe,
  onToggleAirflowStress,
  onToggleVibrationFEA,
  onOpenCutList,
  onOpenResponseChart,
  onOpenCrossover,
  onOpenWizard,
  onOpenCadExport,
  onOpenProjects,
  onOpenCustomDriver,
  onAutoAlign,
  onSelectMaterial,
  onSelectAlignment,
  onToggleTpmsMatrix,
  onToggleComplexityMode,
  complexityMode = 'essentials',
  isXRayMode = false,
  isCutawayMode = false,
  isWireframeMode = false,
  isAirflowStressVisible = true,
  isVibrationAnalysisVisible = false,
  explodedPercent = 0,
  onOpenFeatureModal,
  onOpenTransducerSizing,
  onOpenLineArray,
  onOpenPcbWorkspace,
  onOpenSettings,
  isPaSpeaker = false,
  onOpenStructuralRigging,
  onSelectWorkspace,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build All Searchable Items
  const allSearchItems: SearchResultItem[] = useMemo(() => {
    const items: SearchResultItem[] = [];

    // 1. Subcategories (Speaker Architectures)
    Object.values(SUBCATEGORY_CONFIGS).forEach((sub) => {
      const parentCatSpec = CATEGORY_SPECS[sub.parentCategory];

      items.push({
        id: `sub_${sub.id}`,
        type: 'subcategory',
        title: sub.name,
        subtitle: `${sub.tagline} • ${sub.targetVbLiters}L ${sub.defaultAlignment.toUpperCase()} @ ${sub.targetFbHz}Hz`,
        badge: sub.shortName,
        badgeColor: parentCatSpec?.accentColor || '#38bdf8',
        icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onSelectSubcategory(sub.id);
          onClose();
        },
      });
    });

    // 2. Transducers / Driver Presets
    DRIVER_PRESETS.forEach((driver: DriverPreset) => {
      items.push({
        id: `drv_${driver.id}`,
        type: 'transducer',
        title: `${driver.brand} ${driver.model}`,
        subtitle: `${driver.nominalDiameterInch}" Transducer • Fs: ${driver.fs}Hz, Qts: ${driver.qts}, Vas: ${driver.vas}L, Xmax: ${driver.xmax}mm, ${driver.pe}W RMS`,
        badge: `${driver.nominalDiameterInch}" ${driver.brand}`,
        badgeColor: '#a855f7',
        icon: <Disc3 className="w-4 h-4 text-purple-400" />,
        action: () => {
          onSelectTransducer(driver);
          onClose();
        },
      });
    });

    // 3. CAD Overlays, Views & Interactive Tools
    items.push({
      id: 'tool_wizard',
      type: 'tool',
      title: 'Interactive Speaker Setup Wizard',
      subtitle: 'Step-by-step setup guiding archetype, target SPL, drivers & enclosure volume',
      badge: '+ Setup Wizard',
      badgeColor: '#06b6d4',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onOpenWizard();
        onClose();
      },
    });

    items.push({
      id: 'tool_auto_optimize',
      type: 'tool',
      title: 'Auto-Optimize Enclosure (Volume, Port Velocity & 3D Clashes)',
      subtitle: '1-click multi-stage optimizer: aligns Vb/Fb, sizes laminar ports, and clears 2D/3D clashes',
      badge: 'Auto-Optimize',
      badgeColor: '#10b981',
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onAutoAlign();
        onClose();
      },
    });

    items.push({
      id: 'overlay_vibration',
      type: 'overlay',
      title: `Vibration Stress FEA Overlay [${isVibrationAnalysisVisible ? 'Active' : 'Inactive'}]`,
      subtitle: 'Render 3D heat-map showing flexural plate deflection under internal acoustic pressure',
      badge: isVibrationAnalysisVisible ? 'FEA Active' : 'Toggle FEA',
      badgeColor: '#8b5cf6',
      icon: <Activity className="w-4 h-4 text-violet-400" />,
      action: () => {
        onToggleVibrationFEA();
        onClose();
      },
    });

    items.push({
      id: 'overlay_airflow',
      type: 'overlay',
      title: `Airflow Turbulence Stress Map [${isAirflowStressVisible ? 'Active' : 'Inactive'}]`,
      subtitle: 'Render 3D volumetric aeroport velocity suction cone & obstacle stress rays',
      badge: isAirflowStressVisible ? 'Airflow Active' : 'Toggle Airflow',
      badgeColor: '#f59e0b',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      action: () => {
        onToggleAirflowStress();
        onClose();
      },
    });

    items.push({
      id: 'overlay_exploded',
      type: 'overlay',
      title: `Exploded 3D Assembly View [${explodedPercent > 0 ? `${explodedPercent}%` : 'Assembled'}]`,
      subtitle: 'Expand enclosure panels along normal vectors to inspect internal bracing & crossover',
      badge: explodedPercent > 0 ? `${explodedPercent}% Exploded` : 'Toggle Exploded',
      badgeColor: '#3b82f6',
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      action: () => {
        onToggleExploded();
        onClose();
      },
    });

    items.push({
      id: 'overlay_xray',
      type: 'overlay',
      title: `X-Ray Glass Transparency Mode [${isXRayMode ? 'Active' : 'Inactive'}]`,
      subtitle: 'Render translucent glass panels to view internal acoustic chambers & magnet motors',
      badge: isXRayMode ? 'X-Ray Active' : 'Toggle X-Ray',
      badgeColor: '#0ea5e9',
      icon: <Eye className="w-4 h-4 text-sky-400" />,
      action: () => {
        onToggleXRay();
        onClose();
      },
    });

    items.push({
      id: 'overlay_cutaway',
      type: 'overlay',
      title: `Section Cutaway Clipping Mode [${isCutawayMode ? 'Active' : 'Inactive'}]`,
      subtitle: 'Clip enclosure along center X plane to inspect wall joints & port tube profiles',
      badge: isCutawayMode ? 'Cutaway Active' : 'Toggle Cutaway',
      badgeColor: '#f97316',
      icon: <Zap className="w-4 h-4 text-orange-400" />,
      action: () => {
        onToggleCutaway();
        onClose();
      },
    });

    items.push({
      id: 'tool_cutlist',
      type: 'tool',
      title: 'Cut List & Material Sheet',
      subtitle: 'Generate exact CNC/saw panel dimensions, machining notes & material pricing',
      badge: 'Cut List',
      badgeColor: '#eab308',
      icon: <FileText className="w-4 h-4 text-yellow-400" />,
      action: () => {
        onOpenCutList();
        onClose();
      },
    });

    items.push({
      id: 'tool_response',
      type: 'tool',
      title: 'Frequency Response & Acoustic Plot Chart',
      subtitle: 'Detailed SPL, excursion limits, group delay & port velocity curve analysis',
      badge: 'Response Chart',
      badgeColor: '#10b981',
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onOpenResponseChart();
        onClose();
      },
    });

    items.push({
      id: 'tool_crossover',
      type: 'tool',
      title: 'Passive Crossover Filter Designer',
      subtitle: 'Interactive Butterworth & Linkwitz-Riley filter synthesis with L-Pad & Zobel networks',
      badge: 'Crossover',
      badgeColor: '#a855f7',
      icon: <Sliders className="w-4 h-4 text-purple-400" />,
      action: () => {
        onOpenCrossover();
        onClose();
      },
    });

    items.push({
      id: 'tool_export',
      type: 'tool',
      title: 'Export 3D CAD Enclosure File',
      subtitle: 'Download production 3D CAD mesh in STL, STEP, or OBJ formats for CNC / 3D printing',
      badge: 'Export CAD',
      badgeColor: '#06b6d4',
      icon: <Download className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onOpenCadExport();
        onClose();
      },
    });

    items.push({
      id: 'tool_projects',
      type: 'tool',
      title: 'Project Manager Drawer',
      subtitle: 'Save, load, duplicate and back up local browser-stored enclosure projects',
      badge: 'Project Manager',
      badgeColor: '#38bdf8',
      icon: <FolderKanban className="w-4 h-4 text-sky-400" />,
      action: () => {
        onOpenProjects();
        onClose();
      },
    });

    items.push({
      id: 'tool_custom_driver',
      type: 'tool',
      title: 'Custom T/S Driver Creator',
      subtitle: 'Enter custom woofer Thiele-Small electroacoustic parameters for specialized designs',
      badge: 'Custom Driver',
      badgeColor: '#f43f5e',
      icon: <Wrench className="w-4 h-4 text-rose-400" />,
      action: () => {
        onOpenCustomDriver();
        onClose();
      },
    });

    if (onOpenFeatureModal) {
      items.push({
        id: 'tool_acoustics_popup',
        type: 'tool',
        title: 'Acoustics & Port Tuning Pop-up',
        subtitle: 'Tuning frequency (Fb), port diameter, alignment, and resonance warnings',
        badge: 'Acoustics Pop-up',
        badgeColor: '#0ea5e9',
        icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onOpenFeatureModal('acoustics');
          onClose();
        },
      });

      items.push({
        id: 'tool_geometry_popup',
        type: 'tool',
        title: 'Cabinet Geometry & Material Pop-up',
        subtitle: 'External dimensions W×H×D, wood/composite material, and joinery',
        badge: 'Geometry Pop-up',
        badgeColor: '#10b981',
        icon: <Box className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onOpenFeatureModal('dimensions');
          onClose();
        },
      });

      items.push({
        id: 'tool_views_popup',
        type: 'tool',
        title: '3D Views & Camera Pop-up',
        subtitle: 'Exploded view slider, wireframe, cutaway, X-ray, and camera presets',
        badge: '3D Views Pop-up',
        badgeColor: '#a855f7',
        icon: <Sliders className="w-4 h-4 text-purple-400" />,
        action: () => {
          onOpenFeatureModal('view3d');
          onClose();
        },
      });
    }

    if (onOpenTransducerSizing) {
      items.push({
        id: 'tool_transducer_sizing',
        type: 'tool',
        title: 'Transducer-First Enclosure Sizing Engine',
        subtitle: 'Select drivers or custom T/S params to auto-calculate box volume Vb, tuning Fb & Golden Ratio dimensions',
        badge: '1. Size Box by Drivers',
        badgeColor: '#a855f7',
        icon: <Disc3 className="w-4 h-4 text-purple-400" />,
        action: () => {
          onOpenTransducerSizing();
          onClose();
        },
      });
    }

    if (onOpenPcbWorkspace) {
      items.push({
        id: 'tool_pcb_workspace',
        type: 'tool',
        title: 'Multi-Board Crossover PCB & Gerber Export Workspace',
        subtitle: 'Automated 2-tier/3-tier board stack synthesis, trace routing, BOM & RS-274X Gerber fabrication ZIP',
        badge: '3. PCB & Gerber Export',
        badgeColor: '#10b981',
        icon: <Cpu className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onOpenPcbWorkspace();
          onClose();
        },
      });
    }

    if (onOpenLineArray) {
      items.push({
        id: 'tool_line_array',
        type: 'tool',
        title: 'Line Array Speaker Design Mode',
        subtitle: 'Configure multi-element array splay angles, J-curve/spiral hangs, vertical polar lobes & SPL throw',
        badge: '4. Line Array Design',
        badgeColor: '#f59e0b',
        icon: <Waves className="w-4 h-4 text-amber-400" />,
        action: () => {
          onOpenLineArray();
          onClose();
        },
      });
    }

    if (isPaSpeaker && onOpenStructuralRigging) {
      items.push({
        id: 'tool_structural_rigging',
        type: 'tool',
        title: 'Structural Rigging Tensile & Shear Analysis',
        subtitle: 'Calculate flying hardware pin shear, rear link tension, CG tilt & ANSI E1.8 / BGV-C1 safety factors',
        badge: '6. Rigging Analysis',
        badgeColor: '#f43f5e',
        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        action: () => {
          onOpenStructuralRigging();
          onClose();
        },
      });
    }

    if (onOpenSettings) {
      items.push({
        id: 'tool_settings_units',
        type: 'tool',
        title: 'Global Unit Switcher & Application Settings',
        subtitle: 'Switch between Metric (mm/cm/L/kg) and Imperial (in/ft/cu.ft/lbs) across all calculations & 3D CAD',
        badge: 'Units & Settings',
        badgeColor: '#06b6d4',
        icon: <Settings className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onOpenSettings();
          onClose();
        },
      });
    }

    // 4. Executable Action Commands (Materials, Alignments, TPMS Gyroid Matrix, Progressive Disclosure Modes)
    if (onSelectMaterial) {
      (Object.keys(MATERIAL_SPECS) as MaterialType[]).forEach((matKey) => {
        const spec = MATERIAL_SPECS[matKey];
        items.push({
          id: `cmd_mat_${matKey}`,
          type: 'command',
          title: `Switch Cabinet Material to ${spec.name}`,
          subtitle: `${spec.category === 'filaments' ? '3D Printing Filament' : 'CNC Sheet Good'} • ${spec.nominalThicknessMm}mm • ${spec.densityKgM3} kg/m³ • E = ${spec.flexuralModulusGpa ?? 7.5} GPa`,
          badge: `Material: ${spec.badge || spec.name}`,
          badgeColor: spec.category === 'filaments' ? '#06b6d4' : '#f59e0b',
          icon: <Box className="w-4 h-4 text-amber-400" />,
          action: () => {
            onSelectMaterial(matKey);
            onClose();
          },
        });
      });
    }

    if (onSelectAlignment) {
      items.push({
        id: 'cmd_align_ported',
        type: 'command',
        title: 'Switch Enclosure Alignment to Bass Reflex (Ported)',
        subtitle: 'Enable Helmholtz resonator port tuning (Fb) for extended low-frequency output',
        badge: 'Action: Ported Box',
        badgeColor: '#06b6d4',
        icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onSelectAlignment('ported');
          onClose();
        },
      });

      items.push({
        id: 'cmd_align_sealed',
        type: 'command',
        title: 'Switch Enclosure Alignment to Acoustic Suspension (Sealed)',
        subtitle: 'Seal enclosure chamber for optimal transient impulse response (Qtc alignment)',
        badge: 'Action: Sealed Box',
        badgeColor: '#10b981',
        icon: <Volume2 className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onSelectAlignment('sealed');
          onClose();
        },
      });
    }

    if (onToggleTpmsMatrix) {
      items.push({
        id: 'cmd_toggle_tpms',
        type: 'command',
        title: 'Toggle 3D-Printed TPMS Gyroid Acoustic Dampening Matrix',
        subtitle: 'Enable or disable internal zero-mean-curvature Gyroid lattice & rear labyrinth acoustic trap',
        badge: 'Action: TPMS Matrix',
        badgeColor: '#06b6d4',
        icon: <Layers className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onToggleTpmsMatrix();
          onClose();
        },
      });
    }

    if (onToggleComplexityMode) {
      items.push({
        id: 'cmd_mode_essentials',
        type: 'command',
        title: `Switch to Essentials Mode ${complexityMode === 'essentials' ? '[Active]' : ''}`,
        subtitle: 'Streamlined UI showing core Cabinet Dimensions, Tuning (Fb), Driver Choice & Cut List',
        badge: 'Mode: Essentials',
        badgeColor: '#06b6d4',
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onToggleComplexityMode('essentials');
          onClose();
        },
      });

      items.push({
        id: 'cmd_mode_master',
        type: 'command',
        title: `Switch to Master Engineer Mode ${complexityMode === 'master' ? '[Active]' : ''}`,
        subtitle: 'Unlock full engineering suite: TPMS Gyroid math, JCA porous model, Klippel thermal & FEA stress',
        badge: 'Mode: Master Engineer',
        badgeColor: '#f59e0b',
        icon: <Sliders className="w-4 h-4 text-amber-400" />,
        action: () => {
          onToggleComplexityMode('master');
          onClose();
        },
      });
    }

    if (onSelectWorkspace) {
      items.push({
        id: 'cmd_stage_design',
        type: 'command',
        title: 'Switch to Stage 1: Design (3D CAD Viewport)',
        subtitle: 'Fullscreen 3D modeling, cabinet dimensions, driver layout & port synthesis',
        badge: 'Stage: 1. Design',
        badgeColor: '#06b6d4',
        icon: <Box className="w-4 h-4 text-cyan-400" />,
        action: () => {
          onSelectWorkspace('cad_3d');
          onClose();
        },
      });

      items.push({
        id: 'cmd_stage_simulate',
        type: 'command',
        title: 'Switch to Stage 2: Simulate (SPL & Response Curves)',
        subtitle: 'Live acoustic simulation: SPL vs frequency, impedance curve, air velocity & excursion',
        badge: 'Stage: 2. Simulate',
        badgeColor: '#10b981',
        icon: <Activity className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onSelectWorkspace('simulate');
          onClose();
        },
      });

      items.push({
        id: 'cmd_stage_fabricate',
        type: 'command',
        title: 'Switch to Stage 3: Fabricate (2D Cut List & BOM Sheet)',
        subtitle: 'Woodworking cut list, panel schedule, sheet optimizer & 1-click CAD exports',
        badge: 'Stage: 3. Fabricate',
        badgeColor: '#a855f7',
        icon: <FileText className="w-4 h-4 text-purple-400" />,
        action: () => {
          onSelectWorkspace('cut_list');
          onClose();
        },
      });
    }

    return items;
  }, [
    onOpenFeatureModal,
    onOpenTransducerSizing,
    onOpenPcbWorkspace,
    onOpenLineArray,
    isPaSpeaker,
    onOpenStructuralRigging,
    onOpenSettings,
    onSelectSubcategory,
    onSelectTransducer,
    onToggleExploded,
    onToggleXRay,
    onToggleCutaway,
    onToggleWireframe,
    onToggleAirflowStress,
    onToggleVibrationFEA,
    onOpenCutList,
    onOpenResponseChart,
    onOpenCrossover,
    onOpenWizard,
    onOpenCadExport,
    onOpenProjects,
    onOpenCustomDriver,
    onAutoAlign,
    onSelectMaterial,
    onSelectAlignment,
    onToggleTpmsMatrix,
    onToggleComplexityMode,
    complexityMode,
    isXRayMode,
    isCutawayMode,
    isWireframeMode,
    isAirflowStressVisible,
    isVibrationAnalysisVisible,
    explodedPercent,
    onClose,
  ]);

  // Filter Items by Query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSearchItems.slice(0, 16);

    return allSearchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [query, allSearchItems]);

  // Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0e1117] border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans cursor-default"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 bg-slate-950 border-b border-slate-800 gap-2">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search speaker subcategories, driver models, or CAD overlays..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-slate-500 hover:text-slate-200 transition cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close Search (ESC)"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700 transition cursor-pointer ml-1"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <Search className="w-7 h-7 text-slate-600 mx-auto" />
              <p>No matching subcategories, drivers or CAD tools found.</p>
              <p className="text-[11px] text-slate-600">Try searching "Purifi", "Dual 18", "FEA", "Cut List", "JBL"</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isFocused = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                    isFocused
                      ? 'bg-slate-900 border border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 border border-transparent hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        isFocused
                          ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 border"
                          style={{
                            color: item.badgeColor || '#38bdf8',
                            borderColor: `${item.badgeColor || '#38bdf8'}60`,
                            backgroundColor: `${item.badgeColor || '#38bdf8'}15`,
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-500">
                    {isFocused && <span className="text-cyan-400 font-bold hidden sm:inline">Select ⏎</span>}
                    <ChevronRight className={`w-4 h-4 ${isFocused ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">⏎</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">ESC</kbd> Close
            </span>
          </div>

          <span className="text-slate-400">
            {filteredItems.length} options
          </span>
        </div>
      </div>
    </div>
  );
};
