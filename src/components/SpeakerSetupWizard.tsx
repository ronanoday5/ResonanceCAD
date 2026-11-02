import React, { Fragment, useMemo, useState } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Monitor,
  Volume2,
  Disc3,
  Radio,
  Sparkles,
  Zap,
  CheckCircle2,
  Box,
  Layers,
  Sliders,
} from 'lucide-react';
import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticParameters,
  type AlignmentType,
  type EnclosureDimensions,
  type MaterialType,
  type SpeakerCategory,
  type SpeakerSubcategory,
  type SpeakerWizardState,
  type WizardStep,
} from '../types/loudspeaker.ts';
import {
  calculateOptimalAlignment,
  DRIVER_PRESETS,
  getDriversForSubcategory,
  MATERIAL_SPECS,
  validateDriverCompatibility,
} from '../services/acousticEngine.ts';
import { autoResolveBaffleClashes } from '../services/baffleLayoutEngine.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

interface SpeakerSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onInitializeSpeaker: (
    dimensions: EnclosureDimensions,
    acoustics: AcousticParameters,
    notificationMessage?: string
  ) => void;
}

const WIZARD_STEPS: { id: WizardStep; label: string; subtitle: string; number: number }[] = [
  {
    id: 'category',
    label: 'What Are You Building?',
    subtitle: 'Use Case & Blueprint',
    number: 1,
  },
  {
    id: 'transducers',
    label: 'Drivers & Sound Character',
    subtitle: 'Transducers & Alignment',
    number: 2,
  },
  {
    id: 'enclosure_waveguide',
    label: 'Cabinet & Material',
    subtitle: 'Size, Port Style & Wood',
    number: 3,
  },
];

type SizePresetMode = 'compact' | 'optimal' | 'extended' | 'custom';
type PortType = AcousticParameters['portType'];

const MATERIAL_PLAIN_GUIDANCE: Partial<Record<MaterialType, { badge: string; useCase: string }>> = {
  baltic_birch_18: {
    badge: 'Best All-Around / Touring',
    useCase: '13-ply void-free birch. High strength-to-weight ratio for PA & subwoofers.',
  },
  mdf_19: {
    badge: 'Best for Studio Monitors',
    useCase: 'Isotropic acoustic damping & ultra-smooth edges for painted studio cabinets.',
  },
  mdf_25: {
    badge: 'Heavy Reference Subwoofers',
    useCase: 'Extra-thick 25mm high-mass wall for zero-flex home theater & mastering subs.',
  },
  marine_ply_18: {
    badge: 'Festival & Stadium Rigs',
    useCase: 'Weather-resistant structural marine plywood for high-SPL touring enclosures.',
  },
  valchromat_hdf_19: {
    badge: 'Boutique Architectural',
    useCase: 'High-density through-colored wood fiberboard (+30% stiffer than standard MDF).',
  },
  solid_hardwood_20: {
    badge: 'Heirloom Hi-Fi Craft',
    useCase: '20mm solid walnut/oak stock for furniture-grade audiophile cabinets.',
  },
  carbon_fiber_12: {
    badge: 'Ultra-Light Composite',
    useCase: 'Pre-preg carbon/Rohacell sandwich shell for maximum stiffness at minimal weight.',
  },
};

export const SpeakerSetupWizard: React.FC<SpeakerSetupWizardProps> = ({
  isOpen,
  onClose,
  onInitializeSpeaker,
}) => {
  const [state, setState] = useState<SpeakerWizardState>({
    step: 'category',
    category: 'studio_monitor',
    subcategory: 'nearfield_2way',
    targetPeakSplDb: 105,
    listeningDistanceM: 1.5,
    boundarySpace: 'half',
    wooferCount: 1,
    selectedWooferId: 'purifi_ptt65',
    selectedTweeterId: 'scanspeak_d3004',
    hasTweeterOrHorn: true,
    hornType: 'constant_directivity',
    coverageAngleDeg: 90,
    cabinetMaterial: 'mdf_19',
    alignment: 'ported',
    targetVolumeL: 14,
  });

  const [portStyle, setPortStyle] = useState<PortType>('round');
  const [sizePreset, setSizePreset] = useState<SizePresetMode>('optimal');

  if (!isOpen) return null;

  return (
    <ErrorBoundary
      fallbackTitle="Speaker Setup Wizard Error"
      onReset={() => {
        setState({
          step: 'category',
          category: 'studio_monitor',
          subcategory: 'nearfield_2way',
          targetPeakSplDb: 105,
          listeningDistanceM: 1.5,
          boundarySpace: 'half',
          wooferCount: 1,
          selectedWooferId: 'purifi_ptt65',
          selectedTweeterId: 'scanspeak_d3004',
          hasTweeterOrHorn: true,
          hornType: 'constant_directivity',
          coverageAngleDeg: 90,
          cabinetMaterial: 'mdf_19',
          alignment: 'ported',
          targetVolumeL: 14,
        });
        setPortStyle('round');
        setSizePreset('optimal');
        onClose();
      }}
    >
      <SpeakerSetupWizardContent
        state={state}
        setState={setState}
        portStyle={portStyle}
        setPortStyle={setPortStyle}
        sizePreset={sizePreset}
        setSizePreset={setSizePreset}
        onClose={onClose}
        onInitializeSpeaker={onInitializeSpeaker}
      />
    </ErrorBoundary>
  );
};

interface ContentProps {
  state: SpeakerWizardState;
  setState: React.Dispatch<React.SetStateAction<SpeakerWizardState>>;
  portStyle: PortType;
  setPortStyle: React.Dispatch<React.SetStateAction<PortType>>;
  sizePreset: SizePresetMode;
  setSizePreset: React.Dispatch<React.SetStateAction<SizePresetMode>>;
  onClose: () => void;
  onInitializeSpeaker: (
    dimensions: EnclosureDimensions,
    acoustics: AcousticParameters,
    notificationMessage?: string
  ) => void;
}

const SpeakerSetupWizardContent: React.FC<ContentProps> = ({
  state,
  setState,
  portStyle,
  setPortStyle,
  sizePreset,
  setSizePreset,
  onClose,
  onInitializeSpeaker,
}) => {
  const catSpec = CATEGORY_SPECS[state.category] || CATEGORY_SPECS.studio_monitor;
  const subcatConfig = SUBCATEGORY_CONFIGS[state.subcategory] || SUBCATEGORY_CONFIGS.nearfield_2way;
  const isSub = state.category === 'studio_sub' || state.category === 'live_sub';

  const subcatDrivers = useMemo(() => {
    try {
      const drivers = getDriversForSubcategory(state.subcategory, state.category);
      if (Array.isArray(drivers) && drivers.length > 0) return drivers;
    } catch (e) {
      console.warn('Could not load drivers for subcategory:', e);
    }
    return DRIVER_PRESETS;
  }, [state.subcategory, state.category]);

  const selectedWoofer = useMemo(() => {
    const found = DRIVER_PRESETS.find((d) => d.id === state.selectedWooferId);
    if (found) return found;
    if (subcatDrivers.length > 0 && subcatDrivers[0]) return subcatDrivers[0];
    return DRIVER_PRESETS[0];
  }, [state.selectedWooferId, subcatDrivers]);

  const selectedTweeter = useMemo(() => {
    if (!state.selectedTweeterId) return undefined;
    return DRIVER_PRESETS.find((d) => d.id === state.selectedTweeterId);
  }, [state.selectedTweeterId]);

  const optimalAlignment = useMemo(() => {
    return calculateOptimalAlignment(selectedWoofer, state.alignment || 'ported');
  }, [selectedWoofer, state.alignment]);

  const baseOptimalVolumeL = useMemo(() => {
    return Math.max(
      5,
      Math.round((optimalAlignment?.optimalVbLiters || subcatConfig?.targetVbLiters || 20) * (state.wooferCount || 1))
    );
  }, [optimalAlignment, subcatConfig, state.wooferCount]);

  // Calculate live box dimensions preview from targetVolumeL
  const previewBox = useMemo(() => {
    const matSpec = MATERIAL_SPECS[state.cabinetMaterial] || MATERIAL_SPECS.mdf_19;
    const t = matSpec?.nominalThicknessMm || 19;
    const targetGrossLiters = (state.targetVolumeL || 20) * 1.22;
    const grossMm3 = targetGrossLiters * 1000000;
    const baseW = Math.round(Math.cbrt(grossMm3 / (1.6 * 1.25)));
    const minW = Math.max((selectedWoofer?.frameOuterDiameterMm || 200) + 40, baseW + 2 * t);
    const w = Math.min(800, Math.max(220, minW));
    const h = Math.min(1400, Math.max(280, Math.round(minW * (isSub ? 1.35 : 1.7))));
    const d = Math.min(900, Math.max(220, Math.round(minW * 1.15)));
    return { w, h, d, t };
  }, [state.cabinetMaterial, state.targetVolumeL, selectedWoofer, isSub]);

  // Live Peak SPL projection
  const estPeakSplDb = useMemo(() => {
    const sens = selectedWoofer?.splSensitivityDb || 88;
    const pe = (selectedWoofer?.pe || 250) * Math.max(1, state.wooferCount || 1);
    const boundaryGain = state.boundarySpace === 'corner' ? 12 : state.boundarySpace === 'half' ? 6 : 0;
    const distLoss = 20 * Math.log10(Math.max(0.5, state.listeningDistanceM || 1));
    const powerGainDb = 10 * Math.log10(Math.max(1, pe));
    const parallelGainDb = (state.wooferCount || 1) > 1 ? 3 : 0;
    const continuous = Math.round(sens + powerGainDb + parallelGainDb + boundaryGain - distLoss - 2.5);
    return continuous + 6;
  }, [selectedWoofer, state.wooferCount, state.boundarySpace, state.listeningDistanceM]);

  // Handle Archetype Change
  const handleSelectCategory = (cat: SpeakerCategory) => {
    try {
      const spec = CATEGORY_SPECS[cat] || CATEGORY_SPECS.studio_monitor;
      const defaultSub = spec.defaultSubcategory || 'nearfield_2way';
      const defaultSubConfig = SUBCATEGORY_CONFIGS[defaultSub] || SUBCATEGORY_CONFIGS.nearfield_2way;
      const drivers = getDriversForSubcategory(defaultSub, cat);
      const firstWoofer = drivers[0] || DRIVER_PRESETS[0];
      const nextAlign = defaultSubConfig.defaultAlignment || spec.defaultAlignment || 'ported';
      const opt = calculateOptimalAlignment(firstWoofer, nextAlign);
      const qty = defaultSubConfig.wooferQuantity || 1;

      const isSubCat = cat === 'studio_sub' || cat === 'live_sub';
      const isLiveCat = cat === 'live_top' || cat === 'live_sub';

      setPortStyle(isLiveCat ? 'slot' : 'round');
      setSizePreset('optimal');

      setState((prev) => ({
        ...prev,
        category: cat,
        subcategory: defaultSub,
        alignment: nextAlign,
        targetVolumeL: Math.round((opt?.optimalVbLiters || defaultSubConfig.targetVbLiters || 20) * qty),
        wooferCount: qty,
        selectedWooferId: firstWoofer.id,
        hasTweeterOrHorn: !isSubCat,
        cabinetMaterial: spec.recommendedMaterial || 'mdf_19',
        targetPeakSplDb: isLiveCat ? 128 : isSubCat ? 115 : 105,
        listeningDistanceM: isLiveCat ? 8 : isSubCat ? 2.5 : 1.5,
      }));
    } catch (err) {
      console.error('Error selecting category in wizard:', err);
    }
  };

  // Handle Subcategory Blueprint Change
  const handleSelectSubcategory = (sub: SpeakerSubcategory) => {
    try {
      const subConfig = SUBCATEGORY_CONFIGS[sub] || SUBCATEGORY_CONFIGS.nearfield_2way;
      const drivers = getDriversForSubcategory(sub, state.category);
      const firstWoofer = drivers[0] || selectedWoofer || DRIVER_PRESETS[0];
      const nextAlign = subConfig.defaultAlignment || 'ported';
      const opt = calculateOptimalAlignment(firstWoofer, nextAlign);
      const qty = subConfig.wooferQuantity || 1;

      setSizePreset('optimal');
      setState((prev) => ({
        ...prev,
        subcategory: sub,
        alignment: nextAlign,
        targetVolumeL: Math.round((opt?.optimalVbLiters || subConfig.targetVbLiters || 20) * qty),
        wooferCount: qty,
        selectedWooferId: firstWoofer.id,
        hasTweeterOrHorn: !subConfig.parentCategory.includes('sub'),
      }));
    } catch (err) {
      console.error('Error selecting subcategory in wizard:', err);
    }
  };

  // Handle Sound Goal Quick-Select in Step 2
  const handleSelectSoundGoal = (goal: 'tight_sealed' | 'deep_ported' | 'max_output') => {
    const nextAlign: AlignmentType = goal === 'tight_sealed' ? 'sealed' : 'ported';
    const nextQty = goal === 'max_output' ? 2 : 1;

    // Pick driver with best EBP for this goal if available
    const bestDriver =
      subcatDrivers.find((d) => {
        const ebp = d.fs / Math.max(0.1, d.qes || d.qts);
        return goal === 'tight_sealed' ? ebp < 65 : ebp >= 60;
      }) || selectedWoofer;

    const opt = calculateOptimalAlignment(bestDriver, nextAlign);
    setSizePreset('optimal');
    setState((prev) => ({
      ...prev,
      alignment: nextAlign,
      wooferCount: nextQty,
      selectedWooferId: bestDriver.id,
      targetVolumeL: Math.max(5, Math.round((opt?.optimalVbLiters || 20) * nextQty)),
    }));
  };

  // Handle Woofer Selection
  const handleSelectWoofer = (driverId: string) => {
    try {
      const drv = DRIVER_PRESETS.find((d) => d.id === driverId) || DRIVER_PRESETS[0];
      const opt = calculateOptimalAlignment(drv, state.alignment || 'ported');
      const baseVb = Math.round((opt?.optimalVbLiters || 20) * (state.wooferCount || 1));
      const mult = sizePreset === 'compact' ? 0.8 : sizePreset === 'extended' ? 1.2 : 1.0;

      setState((prev) => ({
        ...prev,
        selectedWooferId: driverId,
        targetVolumeL: Math.max(5, Math.round(baseVb * mult)),
      }));
    } catch (err) {
      console.error('Error selecting woofer in wizard:', err);
    }
  };

  // Handle Size Preset Selection in Step 3
  const handleSelectSizePreset = (preset: SizePresetMode) => {
    setSizePreset(preset);
    if (preset === 'compact') {
      setState((p) => ({ ...p, targetVolumeL: Math.max(5, Math.round(baseOptimalVolumeL * 0.8)) }));
    } else if (preset === 'optimal') {
      setState((p) => ({ ...p, targetVolumeL: baseOptimalVolumeL }));
    } else if (preset === 'extended') {
      setState((p) => ({ ...p, targetVolumeL: Math.min(350, Math.round(baseOptimalVolumeL * 1.2)) }));
    }
  };

  // Build & Auto-Resolve Final Speaker Action
  const handleBuildSpeaker = () => {
    try {
      const is3Way = state.category === 'studio_monitor' && state.subcategory === 'midfield_3way';
      const resolvedTopology = isSub
        ? 'single'
        : is3Way
        ? 'three_way'
        : (state.wooferCount || 1) === 2
        ? 'mtm'
        : 'two_way';

      const initialDims: EnclosureDimensions = {
        externalWidthMm: previewBox.w,
        externalHeightMm: previewBox.h,
        externalDepthMm: previewBox.d,
        material: state.cabinetMaterial || 'mdf_19',
        baffleThicknessMm: previewBox.t >= 18 ? previewBox.t : 18,
        jointType: state.category.includes('live') ? 'rabbet' : 'butt',
        category: state.category,
        subcategory: state.subcategory,
        hardware: { ...(catSpec?.defaultHardware || {}) },
        speakonConfig: {
          selectionMode: 'auto',
          wiringArchitecture: 'auto',
          dualLinkThru: true,
          recessedDishDepthMm: 18,
        },
      };

      const defaultTweeter =
        state.hasTweeterOrHorn && !isSub
          ? selectedTweeter || DRIVER_PRESETS.find((d) => d.nominalDiameterInch <= 1.2) || DRIVER_PRESETS[4]
          : DRIVER_PRESETS[4];

      const defaultMidrange =
        DRIVER_PRESETS.find((d) => d.id === 'scanspeak_12mu' || d.id === 'jbl_2169h') ||
        DRIVER_PRESETS[6] ||
        DRIVER_PRESETS[0];

      const initialAcoustics: AcousticParameters = {
        topology: resolvedTopology,
        driverAssignments: {
          woofer: {
            role: 'woofer',
            driver: selectedWoofer,
            quantity: state.wooferCount || 1,
            impedanceOhm: 8,
            attenuationDb: 0,
          },
          tweeter: {
            role: 'tweeter',
            driver: defaultTweeter,
            quantity: 1,
            impedanceOhm: 8,
            attenuationDb: state.category.includes('live') ? 4.5 : 2.0,
          },
          midrange: {
            role: 'midrange',
            driver: defaultMidrange,
            quantity: 1,
            impedanceOhm: 8,
            attenuationDb: 0,
          },
        },
        alignment: state.alignment,
        targetQtc: optimalAlignment?.targetQtc || 0.707,
        targetFb: optimalAlignment?.optimalFbHz || 40,
        portType: portStyle,
        portDiameterMm:
          (selectedWoofer?.nominalDiameterInch || 10) >= 15
            ? 110
            : (selectedWoofer?.nominalDiameterInch || 10) >= 10
            ? 85
            : 70,
        flareRadiusMm: 16,
        isDoubleFlared: true,
        numberOfPorts: 1,
        dampingFillPercent: catSpec?.defaultDampingFillPercent || 40,
        bracingLevel: catSpec?.defaultBracing || 'standard',
        crossoverLowHz: is3Way ? 450 : 2200,
        crossoverHighHz: is3Way ? 3200 : 2500,
        lowPassOrder: 2,
        lowPassType: 'linkwitz_riley',
        highPassOrder: 2,
        highPassType: 'linkwitz_riley',
        waveguideCoverageAngleDeg: state.coverageAngleDeg || 90,
        splCalcDistanceM: state.listeningDistanceM || 1.5,
        splCalcInputPowerW: selectedWoofer?.pe || 250,
      };

      // Guarantee 100% contained, clash-free 3D layout on build
      const resolved = autoResolveBaffleClashes(initialDims, initialAcoustics);

      onInitializeSpeaker(
        resolved.dimensions,
        resolved.acoustics,
        `Built ${subcatConfig?.shortName || state.subcategory} • ${state.targetVolumeL}L ${state.alignment.toUpperCase()} • ${
          selectedWoofer?.brand || 'Driver'
        } ${selectedWoofer?.model || ''} (Zero Clashes)`
      );
      onClose();
    } catch (err) {
      console.error('Error during handleBuildSpeaker:', err);
    }
  };

  const currentStepIdx = Math.max(
    0,
    WIZARD_STEPS.findIndex((s) => s.id === state.step)
  );

  const handleNext = () => {
    if (currentStepIdx < WIZARD_STEPS.length - 1) {
      setState((p) => ({ ...p, step: WIZARD_STEPS[currentStepIdx + 1].id }));
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setState((p) => ({ ...p, step: WIZARD_STEPS[currentStepIdx - 1].id }));
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0b0e14] border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 font-sans overflow-hidden cursor-default"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Guided Speaker Setup Wizard</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                  3-Step Fast Flow
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pick a blueprint for 1-click build, or customize your drivers and cabinet in 3 steps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="Close Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Interactive Progress Header */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/70 flex items-center justify-between gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((s, idx) => {
            const isActive = s.id === state.step;
            const isCompleted = idx < currentStepIdx;

            return (
              <Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setState((p) => ({ ...p, step: s.id }))}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl font-mono text-left cursor-pointer transition shrink-0 ${
                    isActive
                      ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-300'
                      : isCompleted
                      ? 'text-emerald-400 hover:bg-slate-900/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0 ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{s.label}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{s.subtitle}</div>
                  </div>
                </button>

                {idx < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 rounded min-w-[16px] ${
                      idx < currentStepIdx ? 'bg-emerald-500/70' : 'bg-slate-800'
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Main Step Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* ================================================================= */}
          {/* STEP 1: WHAT ARE YOU BUILDING? (USE CASE + BLUEPRINT PRESETS)     */}
          {/* ================================================================= */}
          {state.step === 'category' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase font-mono tracking-wider mb-1">
                  1. Choose Your Speaker Use Case
                </h3>
                <p className="text-xs text-slate-400">
                  Select an environment below. We automatically pre-load the ideal drivers, volume, and wood thickness—so you can build immediately in 1 click or customize further.
                </p>
              </div>

              {/* 4 Primary Use-Case Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(['studio_monitor', 'studio_sub', 'live_top', 'live_sub'] as SpeakerCategory[]).map((catKey) => {
                  const spec = CATEGORY_SPECS[catKey] || CATEGORY_SPECS.studio_monitor;
                  const isSelected = state.category === catKey;

                  return (
                    <div
                      key={catKey}
                      onClick={() => handleSelectCategory(catKey)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900/95 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {catKey === 'studio_monitor' && <Monitor className="w-5 h-5 text-sky-400" />}
                            {catKey === 'studio_sub' && <Disc3 className="w-5 h-5 text-purple-400" />}
                            {catKey === 'live_top' && <Volume2 className="w-5 h-5 text-amber-400" />}
                            {catKey === 'live_sub' && <Radio className="w-5 h-5 text-rose-400" />}
                            <span className="font-bold text-sm text-slate-100">{spec.name}</span>
                          </div>
                          {isSelected ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">{spec.badge}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-300 mb-1">{spec.tagline}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {spec.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tailored Blueprint Presets for Selected Use Case */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    Select Starting Blueprint for {catSpec?.name}:
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Pre-configures drivers, tuning &amp; volume
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(catSpec?.subcategories || []).map((subKey) => {
                    const subConfig = SUBCATEGORY_CONFIGS[subKey];
                    if (!subConfig) return null;
                    const isSubSelected = state.subcategory === subKey;

                    return (
                      <div
                        key={subKey}
                        onClick={() => handleSelectSubcategory(subKey)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                          isSubSelected
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-100 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between font-bold text-xs mb-1">
                            <span>{subConfig.shortName}</span>
                            {isSubSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {subConfig.tagline}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                          <span>
                            {subConfig.targetVbLiters}L {subConfig.defaultAlignment.toUpperCase()}
                          </span>
                          <span>{subConfig.targetFbHz} Hz</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: DRIVERS & SOUND CHARACTER (TRANSDUCERS + ALIGNMENT)       */}
          {/* ================================================================= */}
          {state.step === 'transducers' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase font-mono tracking-wider mb-1">
                  2. Sound Character &amp; Driver Selection
                </h3>
                <p className="text-xs text-slate-400">
                  Choose how you want your bass to behave, or pick your exact driver below. Each driver is tagged with its ideal enclosure alignment.
                </p>
              </div>

              {/* Guided Sound Character Pills (Sets Alignment & Quantity in 1 Click) */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Quick Sound Character Goal:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'tight_sealed' as const,
                      title: 'Tight & Accurate (Sealed)',
                      desc: 'Fastest transient response, compact box, smooth 12 dB/oct rolloff.',
                      active: state.alignment === 'sealed' && state.wooferCount === 1,
                    },
                    {
                      id: 'deep_ported' as const,
                      title: 'Deep & Punchy (Ported)',
                      desc: 'Extended low-end sub-bass (+3 to +5 dB deeper F3 cutoff via tuned port).',
                      active: state.alignment === 'ported' && state.wooferCount === 1,
                    },
                    {
                      id: 'max_output' as const,
                      title: 'Max Output (Dual Woofer)',
                      desc: '2x parallel woofers (+6 dB output headroom) in a bass-reflex cabinet.',
                      active: state.wooferCount === 2,
                    },
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleSelectSoundGoal(goal.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        goal.active
                          ? 'bg-cyan-950/70 border-cyan-400 text-slate-100 shadow-md ring-1 ring-cyan-400/40'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs mb-1">
                        <span>{goal.title}</span>
                        {goal.active && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{goal.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment & Quantity Fine Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 border border-slate-800/90 p-3.5 rounded-xl">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
                    Enclosure Alignment:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ported', 'sealed'] as AlignmentType[]).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => {
                          const opt = calculateOptimalAlignment(selectedWoofer, align);
                          setState((p) => ({
                            ...p,
                            alignment: align,
                            targetVolumeL: Math.max(
                              5,
                              Math.round((opt?.optimalVbLiters || 20) * (p.wooferCount || 1))
                            ),
                          }));
                        }}
                        className={`py-1.5 px-3 rounded-lg font-mono text-xs font-bold border transition cursor-pointer ${
                          state.alignment === align
                            ? 'bg-cyan-600 border-cyan-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {align === 'ported' ? 'Ported (Bass Reflex)' : 'Sealed (Acoustic Susp.)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
                    Woofer Quantity:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          const opt = calculateOptimalAlignment(selectedWoofer, state.alignment);
                          setState((p) => ({
                            ...p,
                            wooferCount: qty,
                            targetVolumeL: Math.max(5, Math.round((opt?.optimalVbLiters || 20) * qty)),
                          }));
                        }}
                        className={`py-1.5 px-3 rounded-lg font-mono text-xs font-bold border transition cursor-pointer ${
                          state.wooferCount === qty
                            ? 'bg-cyan-600 border-cyan-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {qty === 1 ? '1× Single Woofer' : '2× Dual Woofers'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Woofer Cards with EBP Suitability Badges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Select Low-Frequency Driver ({subcatDrivers.length} Qualified):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    EBP = Fs / Qes guides ideal box type
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                  {subcatDrivers.map((drv) => {
                    if (!drv) return null;
                    const isSelected = drv.id === state.selectedWooferId;
                    const ebp = Math.round(drv.fs / Math.max(0.1, drv.qes || drv.qts));
                    const ebpBadge =
                      ebp < 55
                        ? 'Best for Sealed'
                        : ebp <= 90
                        ? 'Versatile: Sealed / Ported'
                        : 'Best for Ported';
                    const isRecommended = subcatConfig?.recommendedDriverIds?.includes(drv.id);
                    const compat = validateDriverCompatibility(drv, state.category, state.subcategory);

                    return (
                      <div
                        key={drv.id}
                        onClick={() => handleSelectWoofer(drv.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-xs text-slate-100 truncate">
                              {drv.brand} {drv.model} ({drv.nominalDiameterInch}")
                            </span>
                            {isRecommended ? (
                              <span className="text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded shrink-0">
                                ★ Top Pick
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                  compat?.status === 'optimal'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                    : 'bg-slate-900 text-slate-400 border-slate-700'
                                }`}
                              >
                                {ebpBadge}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-400 mt-2 bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                            <div>
                              Fs: <span className="text-cyan-300">{drv.fs}Hz</span>
                            </div>
                            <div>
                              Qts: <span className="text-cyan-300">{drv.qts}</span>
                            </div>
                            <div>
                              Vas: <span className="text-cyan-300">{drv.vas}L</span>
                            </div>
                            <div>
                              Xmax: <span className="text-amber-300">{drv.xmax}mm</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center font-mono">
                          <span>
                            {drv.pe}W RMS • {drv.splSensitivityDb} dB • {ebpBadge}
                          </span>
                          {isSelected && <span className="text-cyan-400 font-bold">Selected ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* High-Frequency Tweeter / Compression Driver (Automatically Hidden for Subwoofers) */}
              {!isSub && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                      High-Frequency Tweeter / Horn Driver:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Auto-matched to {selectedWoofer?.model}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DRIVER_PRESETS.filter((d) => d.nominalDiameterInch <= 2 && d.fs >= 400).map((hf) => {
                      const isHfSelected = hf.id === state.selectedTweeterId;
                      return (
                        <div
                          key={hf.id}
                          onClick={() => setState((p) => ({ ...p, selectedTweeterId: hf.id, hasTweeterOrHorn: true }))}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isHfSelected
                              ? 'bg-cyan-950/60 border-cyan-400 text-slate-100 shadow'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-100">
                              {hf.brand} {hf.model}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {hf.splSensitivityDb} dB • {hf.pe}W • {hf.voiceCoilDiameterMm}mm Voice Coil
                            </div>
                          </div>
                          {isHfSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: CABINET SIZE, PORT STYLE & WOOD MATERIAL                  */}
          {/* ================================================================= */}
          {state.step === 'enclosure_waveguide' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase font-mono tracking-wider mb-1">
                  3. Cabinet Size, Port Style &amp; Wood Material
                </h3>
                <p className="text-xs text-slate-400">
                  Pick a physical size profile based on your available room/desk space, choose your port construction, and select your sheet material.
                </p>
              </div>

              {/* 3 Physical Size Presets + Fine Slider */}
              <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span>Cabinet Size Profile ($V_b$):</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {state.targetVolumeL} Liters Net ({previewBox.w} × {previewBox.h} × {previewBox.d} mm)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'compact' as const,
                      label: 'Compact Footprint (-20%)',
                      vol: Math.max(5, Math.round(baseOptimalVolumeL * 0.8)),
                      desc: 'Saves desk/floor space with tight punchy upper-bass.',
                    },
                    {
                      id: 'optimal' as const,
                      label: 'Optimal Alignment (Recommended)',
                      vol: baseOptimalVolumeL,
                      desc: 'Ideal maximally-flat Butterworth / Thiele-Small response.',
                    },
                    {
                      id: 'extended' as const,
                      label: 'Deep Extended (+20%)',
                      vol: Math.min(350, Math.round(baseOptimalVolumeL * 1.2)),
                      desc: 'Larger cabinet for deeper sub-bass extension & lower F3.',
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectSizePreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        sizePreset === p.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-slate-100 shadow ring-1 ring-cyan-400/40'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs mb-0.5">
                        <span>{p.label}</span>
                        <span className="font-mono text-cyan-300">{p.vol}L</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{p.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Fine-Tune Net Volume ($V_b$):</span>
                    <span className="text-cyan-300 font-bold">{state.targetVolumeL} L</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={350}
                    step={1}
                    value={state.targetVolumeL}
                    onChange={(e) => {
                      setSizePreset('custom');
                      setState((p) => ({ ...p, targetVolumeL: parseFloat(e.target.value) || 20 }));
                    }}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Port Construction Style (Only shown when Ported is selected) */}
              {state.alignment === 'ported' && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Resonance Port Construction Style:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'round' as PortType,
                        title: 'Flared Round Aeroport Tube',
                        desc: 'Uses a flared PVC / 3D-printed cylindrical port tube. Automatically folds into an internal 90° elbow if cabinet depth is shallow.',
                      },
                      {
                        id: 'slot' as PortType,
                        title: 'Integral Wood Slot Port',
                        desc: 'Built directly from your cabinet sheet wood along the bottom floor—no external plastic port tube required.',
                      },
                    ].map((pt) => (
                      <div
                        key={pt.id}
                        onClick={() => setPortStyle(pt.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          portStyle === pt.id
                            ? 'bg-cyan-950/60 border-cyan-400 text-slate-100 shadow ring-1 ring-cyan-400/40'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-xs text-slate-100 mb-1">
                          <span>{pt.title}</span>
                          {portStyle === pt.id && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{pt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cabinet Wood / Material Selector with Plain-English Guidance */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cabinet Sheet Material &amp; Thickness:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.values(MATERIAL_SPECS).map((mat) => {
                    if (!mat) return null;
                    const isMatSelected = state.cabinetMaterial === mat.id;
                    const guide = MATERIAL_PLAIN_GUIDANCE[mat.id] || {
                      badge: 'Structural Grade',
                      useCase: 'High-rigidity acoustic enclosure panel.',
                    };

                    return (
                      <div
                        key={mat.id}
                        onClick={() => setState((p) => ({ ...p, cabinetMaterial: mat.id }))}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          isMatSelected
                            ? 'bg-slate-900 border-cyan-500 text-slate-100 shadow ring-1 ring-cyan-500/50'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-slate-100">{mat.name}</span>
                            {isMatSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 mb-1.5">
                            {guide.badge}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-snug">{guide.useCase}</p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex justify-between">
                          <span>{mat.nominalThicknessMm}mm Thick</span>
                          <span>{mat.densityKgM3} kg/m³</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Live Blueprint Summary Bar (Replaces Separate Step 5 Review Screen) */}
        <div className="px-6 py-2.5 bg-slate-950/95 border-t border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
          <div>
            <span className="text-[9px] uppercase text-slate-500 block">Blueprint</span>
            <span className="text-slate-200 font-bold truncate block">
              {subcatConfig?.shortName || state.subcategory}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-500 block">Transducers</span>
            <span className="text-cyan-300 font-bold truncate block">
              {state.wooferCount}× {selectedWoofer?.brand} {selectedWoofer?.model}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-500 block">Box &amp; Tuning</span>
            <span className="text-emerald-300 font-bold truncate block">
              {state.targetVolumeL}L {state.alignment === 'ported' ? `(${portStyle}) @ ${optimalAlignment?.optimalFbHz || 40}Hz` : 'Sealed'}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-slate-500 block">Dimensions &amp; Output</span>
            <span className="text-amber-300 font-bold truncate block">
              {previewBox.w}×{previewBox.h}×{previewBox.d}mm • ~{estPeakSplDb}dB
            </span>
          </div>
        </div>

        {/* Footer Navigation & 1-Click Express Build */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              currentStepIdx === 0
                ? 'opacity-40 cursor-not-allowed text-slate-600 bg-slate-900 border border-slate-800'
                : 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            {currentStepIdx < WIZARD_STEPS.length - 1 && (
              <button
                type="button"
                onClick={handleBuildSpeaker}
                title="Build immediately using smart defaults for this blueprint"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Build Preset Now</span>
              </button>
            )}

            {currentStepIdx < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Next: {WIZARD_STEPS[currentStepIdx + 1]?.label}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBuildSpeaker}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-xl flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Build &amp; Initialize 3D Speaker</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
