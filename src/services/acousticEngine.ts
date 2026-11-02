import {
  CATEGORY_SPECS,
  SUBCATEGORY_CONFIGS,
  type AcousticCalculationResult,
  type AcousticParameters,
  type AlignmentType,
  type CardioidSubwooferConfig,
  type CategoryHardwareConfig,
  type DampingAdvisorReport,
  type DampingMaterialSpec,
  type DampingMaterialType,
  type DriverCompatibilityReport,
  type DriverPreset,
  type EigenmodePoint,
  type EnclosureDimensions,
  type EnclosureMechanicsReport,
  type GroupDelayCurvePoint,
  type InternalReflectorConfig,
  type KlippelThermalReport,
  type MaterialCostResult,
  type MaterialPricingConfig,
  type MaxSplCalculationReport,
  type MaterialSpec,
  type MaterialType,
  type OblateSpheroidalWaveguideConfig,
  type PortCatalogMatch,
  type ProceduralDiffuserConfig,
  type ProceduralDiffuserReport,
  type SpeakerCategory,
  type SpeakerCategorySpec,
  type SpeakerSubcategory,
  type SubcategoryConfig,
  type SpinoramaCurvePoint,
  type StandingWaveReport,
  type SurfaceFinishSpec,
  type SurfaceFinishType,
  type ThermalVentilationReport,
  type ThermalVentSlotPlacement,
  type SpeakerCaliberReport,
  type SpeakerCaliberGrade,
} from '../types/loudspeaker.ts';
import { calculateCrossoverNetwork } from './crossoverEngine.ts';
import { computeBaffleLayout } from './baffleLayoutEngine.ts';
import { calculateFirSimulation } from './firFilterEngine.ts';
import { calculateSpeakonReport } from './speakonEngine.ts';
import { synthesizeParametricPort } from './parametricPortEngine.ts';
import { calculateAdditiveAcoustics } from './additiveAcousticEngine.ts';
import { calculateSystemImpedance } from './impedanceParser.ts';
import { calculateMultiphysicsBlueprint } from './multiphysicsBlueprintEngine.ts';

export const MATERIAL_SPECS: Record<MaterialType, MaterialSpec> = {
  baltic_birch_18: {
    id: 'baltic_birch_18',
    name: '18mm Baltic Birch Plywood (13-ply)',
    category: 'sheet_goods',
    subGroup: 'baltic_birch',
    nominalThicknessMm: 18,
    densityKgM3: 680,
    defaultCostPerM2: 68.0,
    flexuralModulusGpa: 12.5,
    poissonRatio: 0.30,
    tensileStrengthMpa: 88,
    dampingFactor: 0.022,
    textureColor: '#d6b88d',
    roughness: 0.65,
    badge: 'Birch 18mm: 12.5 GPa Reference',
    description: '13-ply void-free cross-banded Russian/Finnish birch veneer. Industry reference for concert touring & studio monitor rigidity.',
  },
  baltic_birch_15: {
    id: 'baltic_birch_15',
    name: '15mm Baltic Birch Plywood (11-ply)',
    category: 'sheet_goods',
    subGroup: 'baltic_birch',
    nominalThicknessMm: 15,
    densityKgM3: 680,
    defaultCostPerM2: 58.0,
    flexuralModulusGpa: 12.5,
    poissonRatio: 0.30,
    tensileStrengthMpa: 85,
    dampingFactor: 0.020,
    textureColor: '#dfc49c',
    roughness: 0.65,
    badge: 'Birch 15mm: Lightweight Rigging',
    description: '11-ply structural birch optimized for flown line array elements and portable PA tops where mass-to-stiffness ratio is critical.',
  },
  mdf_19: {
    id: 'mdf_19',
    name: '19mm Premium MDF (Medium-Density Fibreboard)',
    category: 'sheet_goods',
    subGroup: 'mdf_hdf',
    nominalThicknessMm: 19,
    densityKgM3: 750,
    defaultCostPerM2: 32.0,
    flexuralModulusGpa: 3.8,
    poissonRatio: 0.25,
    tensileStrengthMpa: 22,
    dampingFactor: 0.035,
    textureColor: '#967958',
    roughness: 0.80,
    badge: 'MDF 19mm: Isotropic Damping',
    description: 'Homogeneous isotropic wood-fiber matrix with high internal mechanical loss factor (η = 0.035) ideal for studio reference monitors.',
  },
  mdf_25: {
    id: 'mdf_25',
    name: '25mm Heavy Duty MDF (1-inch)',
    category: 'sheet_goods',
    subGroup: 'mdf_hdf',
    nominalThicknessMm: 25,
    densityKgM3: 770,
    defaultCostPerM2: 45.0,
    flexuralModulusGpa: 4.0,
    poissonRatio: 0.25,
    tensileStrengthMpa: 24,
    dampingFactor: 0.038,
    textureColor: '#8a6e4d',
    roughness: 0.82,
    badge: 'MDF 25mm: High Inertia Baffle',
    description: 'High-mass 25mm acoustic fibreboard offering 2.3x cubic plate bending stiffness (h³) over 19mm MDF for subwoofers.',
  },
  valchromat_hdf_19: {
    id: 'valchromat_hdf_19',
    name: '19mm Valchromat High-Density HDF',
    category: 'sheet_goods',
    subGroup: 'mdf_hdf',
    nominalThicknessMm: 19,
    densityKgM3: 920,
    defaultCostPerM2: 74.0,
    flexuralModulusGpa: 5.8,
    poissonRatio: 0.26,
    tensileStrengthMpa: 38,
    dampingFactor: 0.042,
    textureColor: '#2d3138',
    roughness: 0.58,
    badge: 'Valchromat 19mm: 920 kg/m³ HDF',
    description: 'Resin-impregnated high-density engineered wood panel combining high mass inertia (920 kg/m³) and superior internal loss.',
  },
  marine_ply_18: {
    id: 'marine_ply_18',
    name: '18mm Marine Grade Okoume Plywood',
    category: 'sheet_goods',
    subGroup: 'plywood_hardwood',
    nominalThicknessMm: 18,
    densityKgM3: 500,
    defaultCostPerM2: 85.0,
    flexuralModulusGpa: 10.5,
    poissonRatio: 0.30,
    tensileStrengthMpa: 72,
    dampingFactor: 0.025,
    textureColor: '#c59567',
    roughness: 0.60,
    badge: 'Marine Ply: Ultra-Light & Weatherproof',
    description: 'BS 1088 certified WBP bonded Okoume marine plywood for outdoor festival arrays and low-weight touring cabinets.',
  },
  solid_hardwood_20: {
    id: 'solid_hardwood_20',
    name: '20mm Solid Black Walnut / Hard Maple',
    category: 'sheet_goods',
    subGroup: 'plywood_hardwood',
    nominalThicknessMm: 20,
    densityKgM3: 720,
    defaultCostPerM2: 120.0,
    flexuralModulusGpa: 13.2,
    poissonRatio: 0.32,
    tensileStrengthMpa: 95,
    dampingFactor: 0.015,
    textureColor: '#5c3a21',
    roughness: 0.55,
    badge: 'Hardwood 20mm: 13.2 GPa Stiffness',
    description: 'Kiln-dried solid architectural hardwood with high longitudinal grain stiffness and heirloom acoustic aesthetics.',
  },
  carbon_fiber_12: {
    id: 'carbon_fiber_12',
    name: '12mm Autoclave Carbon Fiber (CFRP Sandwich)',
    category: 'sheet_goods',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 12,
    densityKgM3: 1480,
    defaultCostPerM2: 245.0,
    flexuralModulusGpa: 48.0,
    poissonRatio: 0.28,
    tensileStrengthMpa: 620,
    dampingFactor: 0.026,
    textureColor: '#16191e',
    roughness: 0.42,
    badge: 'CFRP 12mm: 48 GPa Aerospace Rigidity',
    description: 'Quasi-isotropic 3K twill carbon fiber epoxy skins laminated over structural core. Pushes panel eigenmodes above mid-band.',
  },
  carbon_fiber_18: {
    id: 'carbon_fiber_18',
    name: '18mm Structural Carbon Fiber / Rohacell Core',
    category: 'sheet_goods',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1120,
    defaultCostPerM2: 310.0,
    flexuralModulusGpa: 56.0,
    poissonRatio: 0.27,
    tensileStrengthMpa: 740,
    dampingFactor: 0.034,
    textureColor: '#121418',
    roughness: 0.38,
    badge: 'CFRP 18mm: 56 GPa Reference Monocoque',
    description: 'Ultra-rigid 18mm carbon fiber composite sandwich with viscoelastic Rohacell PMI structural foam core for zero cabinet coloration.',
  },
  aluminum_6061: {
    id: 'aluminum_6061',
    name: '6061-T6 Billet Aluminum (Ultra-Rigid)',
    category: 'sheet_goods',
    subGroup: 'aluminum_billet',
    nominalThicknessMm: 15,
    densityKgM3: 2700,
    defaultCostPerM2: 340.0,
    flexuralModulusGpa: 68.9,
    poissonRatio: 0.33,
    tensileStrengthMpa: 310,
    dampingFactor: 0.018,
    textureColor: '#94a3b8',
    roughness: 0.25,
    badge: '6061-T6 Billet: 68.9 GPa Monoblock',
    description: 'CNC-machined 6061-T6 billet aluminum monocoque with extreme 68.9 GPa Young\'s modulus for studio monitors and zero-flex subwoofers.',
  },
  pa12_cf: {
    id: 'pa12_cf',
    name: 'Nylon 12 Carbon Fiber (PA12-CF 35 wt% MEX)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1190,
    defaultCostPerM2: 0,
    costPerKgUsd: 95.0,
    flexuralModulusGpa: 11.1,
    poissonRatio: 0.32,
    tensileStrengthMpa: 83.5,
    dampingFactor: 0.025,
    textureColor: '#14171c',
    roughness: 0.68,
    badge: 'PA12-CF: 11.1 GPa • HDT 160°C • Low Moisture',
    description:
      'Industrial 35 wt% chopped carbon-fiber Nylon 12 (ISO/ASTM 52900 MEX). Matches/exceeds Baltic Birch stiffness (D = 5,928 N·m @ 18mm) with 0.25% equilibrium moisture and 160°C HDT for touring PA.',
  },
  pa6_cf: {
    id: 'pa6_cf',
    name: 'Nylon 6 Carbon Fiber (PA6-CF 25 wt% MEX)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1160,
    defaultCostPerM2: 0,
    costPerKgUsd: 68.0,
    flexuralModulusGpa: 7.8,
    poissonRatio: 0.33,
    tensileStrengthMpa: 102,
    dampingFactor: 0.030,
    textureColor: '#191c22',
    roughness: 0.70,
    badge: 'PA6-CF: 7.8 GPa • HDT 186°C • η = 0.030',
    description:
      'High-temperature PA6 carbon-fiber composite (HDT 186°C @ 0.45 MPa, η = 0.030) ideal for studio monitors and co-printed TPU 95A Constrained Layer Damping (CLD) shells.',
  },
  petg_cf: {
    id: 'petg_cf',
    name: 'Carbon Fiber PETG (PETG-CF 15 wt% MEX)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1250,
    defaultCostPerM2: 0,
    costPerKgUsd: 38.0,
    flexuralModulusGpa: 5.8,
    poissonRatio: 0.35,
    tensileStrengthMpa: 68,
    dampingFactor: 0.028,
    textureColor: '#22252a',
    roughness: 0.72,
    badge: 'PETG-CF: 5.8 GPa • Hydrophobic Studio Shell',
    description:
      '15 wt% chopped carbon-fiber PETG (D = 3,163 N·m @ 18mm—2.2× stiffer than MDF) with hydrophobic dimensional stability and Gyroid Re-entrant lattice damping.',
  },
  rigid_10k_sla: {
    id: 'rigid_10k_sla',
    name: 'Formlabs Rigid 10K Ceramic/Glass Resin (VPP/SLA)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 15,
    densityKgM3: 1630,
    defaultCostPerM2: 0,
    costPerKgUsd: 299.0,
    flexuralModulusGpa: 9.9,
    poissonRatio: 0.31,
    tensileStrengthMpa: 88,
    dampingFactor: 0.018,
    textureColor: '#cbd5e1',
    roughness: 0.22,
    badge: 'Rigid 10K SLA: 10.0 GPa Isotropic • HDT 218°C',
    description:
      'Highly glass/ceramic-filled Vat Photopolymerization (SLA) resin with 10.0 GPa isotropic modulus and 218°C HDT for WST waveguides, Geddes Fresnel phase plugs, and nearfield monitors.',
  },
  asa_weatherproof: {
    id: 'asa_weatherproof',
    name: 'Industrial ASA UV-Weatherproof (MEX + Vapor Smooth)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1080,
    defaultCostPerM2: 0,
    costPerKgUsd: 32.0,
    flexuralModulusGpa: 2.0,
    poissonRatio: 0.36,
    tensileStrengthMpa: 42,
    dampingFactor: 0.024,
    textureColor: '#262930',
    roughness: 0.30,
    badge: 'ASA UV-Stable: Acetone Vapor Polish (Ra 1.5µm)',
    description:
      'UV-stabilized Acrylonitrile Styrene Acrylate with low Z-axis anisotropy (-10% ZX drop) and acetone vapor smoothing capability for outdoor PA horns and shells.',
  },
  pla_standard: {
    id: 'pla_standard',
    name: 'Standard PLA Thermoplastic (3D Print)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1240,
    defaultCostPerM2: 0,
    costPerKgUsd: 20.0,
    flexuralModulusGpa: 3.8,
    poissonRatio: 0.36,
    tensileStrengthMpa: 52,
    dampingFactor: 0.018,
    textureColor: '#1e2025',
    roughness: 0.35,
    badge: 'Standard PLA: 3.8 GPa - Rapid Prototype',
    description: 'Rigid polylactic acid biopolymer filament for desktop acoustic waveguide and compact monitor prototyping.',
  },
  pla_cf: {
    id: 'pla_cf',
    name: 'Carbon Fiber PLA (PLA-CF 3D Print)',
    category: 'filaments',
    subGroup: 'carbon_fiber',
    nominalThicknessMm: 18,
    densityKgM3: 1250,
    defaultCostPerM2: 0,
    costPerKgUsd: 34.0,
    flexuralModulusGpa: 5.4,
    poissonRatio: 0.34,
    tensileStrengthMpa: 74,
    dampingFactor: 0.024,
    textureColor: '#181a1d',
    roughness: 0.72,
    badge: 'PLA-CF: 5.4 GPa - Rigid Additive Shell',
    description: 'High-modulus carbon-fiber filled PLA matrix providing low-warp dimensional stability and elevated flexural stiffness.',
  },
};

export const SURFACE_FINISH_SPECS: Record<SurfaceFinishType, SurfaceFinishSpec> = {
  natural_hardwood_veneer: {
    id: 'natural_hardwood_veneer',
    name: 'Natural Hardwood Veneer',
    nominalThicknessMm: 0.6,
    addedDensityKgM2: 0.45,
    costPerM2: 38.0,
    lossFactor: 0.015,
    roughness: 0.45,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.3,
    bumpType: 'woodgrain',
    description: '0.6mm American Walnut / White Oak veneer with organic woodgrain and subtle satin sheen.',
  },
  matte_studio_lacquer: {
    id: 'matte_studio_lacquer',
    name: 'Matte Studio Polyurethane',
    nominalThicknessMm: 0.2,
    addedDensityKgM2: 0.25,
    costPerM2: 18.0,
    lossFactor: 0.020,
    roughness: 0.75,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.5,
    bumpType: 'none',
    description: '0.2mm smooth non-reflective studio lacquer coating designed for glare-free mixing environments.',
  },
  high_gloss_automotive: {
    id: 'high_gloss_automotive',
    name: 'High-Gloss Automotive Finish',
    nominalThicknessMm: 0.8,
    addedDensityKgM2: 0.95,
    costPerM2: 65.0,
    lossFactor: 0.035,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    bumpType: 'none',
    description: '0.8mm multi-layer automotive piano clearcoat with mirror reflectivity and dampening.',
  },
  tour_grade_polyurea: {
    id: 'tour_grade_polyurea',
    name: 'Tour-Grade Textured Polyurea',
    nominalThicknessMm: 1.5,
    addedDensityKgM2: 1.60,
    costPerM2: 28.0,
    lossFactor: 0.060,
    roughness: 0.85,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.8,
    bumpType: 'polyurea_noise',
    description: '1.5mm heavy-duty sprayed elastomeric coating (Line-X/Warnex) with maximum panel damping and impact resistance.',
  },
};

export const DAMPING_MATERIAL_SPECS: Record<DampingMaterialType, DampingMaterialSpec> = {
  dacron_polyfill: {
    id: 'dacron_polyfill',
    name: 'Polyester Fiberfill (Dacron)',
    category: 'fiber',
    typicalDensityGPerL: 14.0, // 12-16 g/L
    airflowResistivityRaylsM: 4200,
    maxIsothermalExpansionPercent: 12.0, // up to +12% effective Vb
    absorptionCoefficientMid: 0.68,
    costPerKgUsd: 12.5,
    description: 'Clean synthetic polyester batting. Provides effective thermal dissipation to lower system Q while virtually expanding volume by ~10-12% via isothermal heat transfer.',
    bestSuitedFor: 'Compact sealed enclosures, multi-driver cabinets, and internal sub-chambers.',
  },
  pu_foam: {
    id: 'pu_foam',
    name: 'Convoluted Egg-Crate Foam (PU)',
    category: 'foam',
    typicalDensityGPerL: 26.0, // wall lining
    airflowResistivityRaylsM: 7500,
    maxIsothermalExpansionPercent: 2.5, // negligible volume change
    absorptionCoefficientMid: 0.78,
    costPerKgUsd: 22.0,
    description: 'High-surface-area sculpted open-cell polyurethane foam (25-35mm profile). Traps specular standing waves and internal reflections without impeding bulk air flow or choking bass reflex ports.',
    bestSuitedFor: 'Bass reflex (ported) enclosures, active cardioid arrays, and mid-bass cabinets.',
  },
  sheep_wool: {
    id: 'sheep_wool',
    name: 'Long-Fiber Natural Sheep Wool',
    category: 'wool',
    typicalDensityGPerL: 10.0, // 8-12 g/L
    airflowResistivityRaylsM: 3800,
    maxIsothermalExpansionPercent: 18.0, // highest heat capacity, up to +18% virtual volume
    absorptionCoefficientMid: 0.84,
    costPerKgUsd: 38.0,
    description: 'Audiophile reference natural long-strand washed wool. Highest specific heat capacity (1360 J/kg·K) of all acoustic fibers, maximizing isothermal gas conversion and dramatically improving transient decay.',
    bestSuitedFor: 'High-end audiophile sealed reference monitors requiring lowest coloration and maximum Qtc lowering.',
  },
  melamine_basotect: {
    id: 'melamine_basotect',
    name: 'Open-Cell Melamine Foam (Basotect®)',
    category: 'foam',
    typicalDensityGPerL: 9.5,
    airflowResistivityRaylsM: 10500,
    maxIsothermalExpansionPercent: 4.0,
    absorptionCoefficientMid: 0.88,
    costPerKgUsd: 45.0,
    description: 'Ultra-lightweight open-cell thermoset melamine resin. Exceptional sound absorption across 500 Hz - 4 kHz with class-A flame retardancy. Resists mold and thermal aging.',
    bestSuitedFor: 'Touring enclosures, studio monitors, and upper-midrange transmission lines.',
  },
  recycled_denim: {
    id: 'recycled_denim',
    name: 'Bonded Acoustic Cotton / Denim Batt',
    category: 'cotton',
    typicalDensityGPerL: 30.0,
    airflowResistivityRaylsM: 8800,
    maxIsothermalExpansionPercent: 8.0,
    absorptionCoefficientMid: 0.85,
    costPerKgUsd: 16.0,
    description: 'Dense post-consumer recycled cotton denim fibers with non-toxic borate fire treatment. Outstanding low-mid absorption and vibration dissipation without hazardous glass fibers.',
    bestSuitedFor: 'Cabinet wall lining, heavy matrix bracing cavities, and high-SPL pro audio cabinets.',
  },
};

export const DRIVER_PRESETS: DriverPreset[] = [
  {
    id: 'dayton_rss265hf4',
    brand: 'Dayton Audio',
    model: 'RSS265HF-4 10" Reference Subwoofer',
    nominalDiameterInch: 10,
    fs: 24.3,
    qts: 0.39,
    qes: 0.43,
    qms: 4.41,
    vas: 62.4,
    xmax: 14.3,
    pe: 350,
    sd: 353,
    voiceCoilDiameterMm: 65,
    frameOuterDiameterMm: 266,
    cutoutDiameterMm: 235,
    mountingDepthMm: 124,
    magnetDiameterMm: 156,
    magnetDepthMm: 45,
    displacementLiters: 2.2,
    splSensitivityDb: 87.2,
    reOhm: 3.3,
    leMh: 0.95,
    categoryTags: ['studio_sub', 'live_sub'],
    description: 'Ultra-low distortion 10" subwoofer driver with heavy cast aluminum basket and thick anodized black aluminum cone.',
  },
  {
    id: 'scanspeak_18w8531',
    brand: 'Scan-Speak',
    model: 'Revelator 18W/8531G00 7" Mid-Woofer',
    nominalDiameterInch: 7,
    fs: 28.0,
    qts: 0.36,
    qes: 0.39,
    qms: 5.2,
    vas: 58.0,
    xmax: 6.5,
    pe: 70,
    sd: 150,
    voiceCoilDiameterMm: 38,
    frameOuterDiameterMm: 182,
    cutoutDiameterMm: 158,
    mountingDepthMm: 82,
    magnetDiameterMm: 110,
    magnetDepthMm: 32,
    displacementLiters: 0.75,
    splSensitivityDb: 88.0,
    reOhm: 5.8,
    leMh: 0.35,
    categoryTags: ['studio_monitor'],
    description: 'Legendary audiophile sliced paper cone woofer with SD-1 patented magnetic motor and low-loss linear suspension.',
  },
  {
    id: 'sb_acoustics_17nbac',
    brand: 'SB Acoustics',
    model: 'SB17NBAC35-8 6.5" Anodized Aluminum',
    nominalDiameterInch: 6.5,
    fs: 31.5,
    qts: 0.34,
    qes: 0.37,
    qms: 4.3,
    vas: 37.0,
    xmax: 5.5,
    pe: 60,
    sd: 118,
    voiceCoilDiameterMm: 35.5,
    frameOuterDiameterMm: 171,
    cutoutDiameterMm: 145,
    mountingDepthMm: 78,
    magnetDiameterMm: 100,
    magnetDepthMm: 30,
    displacementLiters: 0.6,
    splSensitivityDb: 87.5,
    reOhm: 5.9,
    leMh: 0.18,
    categoryTags: ['studio_monitor'],
    description: 'Precision black anodized aluminum cone woofer with aerodynamically optimized cast aluminum chassis.',
  },
  {
    id: 'purifi_ptt65',
    brand: 'PURIFI',
    model: 'PTT6.5X04-NFA-01 6.5" Ultra-Low THD',
    nominalDiameterInch: 6.5,
    fs: 31.0,
    qts: 0.28,
    qes: 0.30,
    qms: 4.5,
    vas: 27.5,
    xmax: 9.8,
    pe: 250,
    sd: 133,
    voiceCoilDiameterMm: 39,
    frameOuterDiameterMm: 176,
    cutoutDiameterMm: 147,
    mountingDepthMm: 95,
    magnetDiameterMm: 115,
    magnetDepthMm: 38,
    displacementLiters: 0.9,
    splSensitivityDb: 89.0,
    reOhm: 3.7,
    leMh: 0.12,
    categoryTags: ['studio_monitor'],
    description: 'Revolutionary NeutralSurround geometry eliminating force modulation distortion with massive linear stroke.',
  },
  {
    id: 'scanspeak_d3004',
    brand: 'Scan-Speak',
    model: 'Illuminator D3004/662000 1" Beryllium Dome',
    nominalDiameterInch: 1.2,
    fs: 500,
    qts: 0.45,
    qes: 0.48,
    qms: 3.5,
    vas: 0.02,
    xmax: 0.4,
    pe: 90,
    sd: 7.0,
    voiceCoilDiameterMm: 26,
    frameOuterDiameterMm: 104,
    cutoutDiameterMm: 76,
    mountingDepthMm: 42,
    magnetDiameterMm: 68,
    magnetDepthMm: 22,
    displacementLiters: 0.05,
    splSensitivityDb: 91.5,
    reOhm: 3.2,
    leMh: 0.01,
    categoryTags: ['studio_monitor'],
    description: 'State-of-the-art Beryllium dome tweeter with AirCirc 6-neodymium magnet matrix for maximum transparency.',
  },
  {
    id: 'peerless_xt25bg',
    brand: 'Peerless by Tymphany',
    model: 'XT25BG60-04 1" Dual Ring Radiator',
    nominalDiameterInch: 1,
    fs: 440,
    qts: 0.52,
    qes: 0.55,
    qms: 2.8,
    vas: 0.01,
    xmax: 0.5,
    pe: 100,
    sd: 8.0,
    voiceCoilDiameterMm: 25,
    frameOuterDiameterMm: 104,
    cutoutDiameterMm: 75,
    mountingDepthMm: 48,
    magnetDiameterMm: 72,
    magnetDepthMm: 25,
    displacementLiters: 0.06,
    splSensitivityDb: 91.0,
    reOhm: 3.0,
    leMh: 0.01,
    categoryTags: ['studio_monitor'],
    description: 'Patented Dual Ring Radiator diaphragm with rear acoustic damping chamber for extended frequency response above 40kHz.',
  },
  {
    id: 'scanspeak_12mu',
    brand: 'Scan-Speak',
    model: 'Illuminator 12MU/8731T00 4.5" Midrange',
    nominalDiameterInch: 4.5,
    fs: 62.0,
    qts: 0.33,
    qes: 0.35,
    qms: 5.8,
    vas: 6.5,
    xmax: 3.0,
    pe: 80,
    sd: 55,
    voiceCoilDiameterMm: 30,
    frameOuterDiameterMm: 125,
    cutoutDiameterMm: 106,
    mountingDepthMm: 52,
    magnetDiameterMm: 80,
    magnetDepthMm: 25,
    displacementLiters: 0.25,
    splSensitivityDb: 87.0,
    reOhm: 5.7,
    leMh: 0.10,
    categoryTags: ['studio_monitor'],
    description: 'Neodymium motor 4.5-inch midrange transducer with open aerodynamic chassis for zero reflection back-waves.',
  },
  // --- JBL PROFESSIONAL COMPONENT TRANSDUCERS (jblpro.com/en-US/product_families/components) ---
  {
    id: 'jbl_2226h',
    brand: 'JBL Professional',
    model: '2226H 15" VGC™ Low Frequency Transducer',
    nominalDiameterInch: 15,
    fs: 40.0,
    qts: 0.31,
    qes: 0.33,
    qms: 5.0,
    vas: 175.0,
    xmax: 7.6,
    pe: 600,
    sd: 880,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 388,
    cutoutDiameterMm: 355,
    mountingDepthMm: 137,
    magnetDiameterMm: 220,
    magnetDepthMm: 55,
    displacementLiters: 6.0,
    splSensitivityDb: 97.0,
    reOhm: 5.0,
    leMh: 1.75,
    categoryTags: ['live_top', 'live_sub'],
    description: 'Industry-standard 15" sound reinforcement and studio monitor woofer featuring patented Vented Gap Cooling (VGC™) and Symmetrical Field Geometry (SFG™).',
  },
  {
    id: 'jbl_2206h',
    brand: 'JBL Professional',
    model: '2206H 12" VGC™ Mid-Bass / Woofer',
    nominalDiameterInch: 12,
    fs: 52.0,
    qts: 0.32,
    qes: 0.34,
    qms: 5.4,
    vas: 62.0,
    xmax: 7.5,
    pe: 600,
    sd: 550,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 311,
    cutoutDiameterMm: 283,
    mountingDepthMm: 127,
    magnetDiameterMm: 200,
    magnetDepthMm: 50,
    displacementLiters: 4.2,
    splSensitivityDb: 95.0,
    reOhm: 5.3,
    leMh: 1.50,
    categoryTags: ['live_top'],
    description: 'High-power 12" low-frequency transducer with 4" edgewound ribbon voice coil and VGC™ thermal management for compact high-output two-way systems.',
  },
  {
    id: 'jbl_2241h',
    brand: 'JBL Professional',
    model: '2241H 18" VGC™ Concert Subwoofer',
    nominalDiameterInch: 18,
    fs: 35.0,
    qts: 0.40,
    qes: 0.43,
    qms: 5.2,
    vas: 310.0,
    xmax: 7.6,
    pe: 600,
    sd: 1240,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 464,
    cutoutDiameterMm: 427,
    mountingDepthMm: 191,
    magnetDiameterMm: 220,
    magnetDepthMm: 60,
    displacementLiters: 9.5,
    splSensitivityDb: 98.0,
    reOhm: 5.0,
    leMh: 1.75,
    categoryTags: ['live_sub'],
    description: 'Tour-grade 18" low-frequency transducer designed for concert touring and high-impact sound reinforcement systems.',
  },
  {
    id: 'jbl_2242h',
    brand: 'JBL Professional',
    model: '2242H 18" Super Vented Gap (SVG™) Subwoofer',
    nominalDiameterInch: 18,
    fs: 35.0,
    qts: 0.28,
    qes: 0.29,
    qms: 5.0,
    vas: 282.0,
    xmax: 9.0,
    pe: 800,
    sd: 1240,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 464,
    cutoutDiameterMm: 427,
    mountingDepthMm: 191,
    magnetDiameterMm: 228,
    magnetDepthMm: 62,
    displacementLiters: 10.0,
    splSensitivityDb: 99.0,
    reOhm: 4.7,
    leMh: 1.60,
    categoryTags: ['live_sub', 'studio_sub'],
    description: 'Premier 18" cinema and touring subwoofer featuring Super Vented Gap (SVG™) topology for minimal power compression and massive bass impact.',
  },
  {
    id: 'jbl_2268h',
    brand: 'JBL Professional',
    model: '2268H 18" Differential Drive® Neodymium Subwoofer',
    nominalDiameterInch: 18,
    fs: 33.0,
    qts: 0.36,
    qes: 0.39,
    qms: 3.8,
    vas: 328.0,
    xmax: 23.0,
    pe: 800,
    sd: 1269,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 464,
    cutoutDiameterMm: 427,
    mountingDepthMm: 178,
    magnetDiameterMm: 140,
    magnetDepthMm: 52,
    displacementLiters: 7.5,
    splSensitivityDb: 96.0,
    reOhm: 5.3,
    leMh: 1.85,
    categoryTags: ['live_sub', 'studio_sub'],
    description: 'Modern Differential Drive® dual voice-coil neodymium 18" subwoofer transducer with integrated heat sinking and massive linear excursion.',
  },
  {
    id: 'jbl_2265h',
    brand: 'JBL Professional',
    model: '2265H 15" Differential Drive® Neodymium Woofer',
    nominalDiameterInch: 15,
    fs: 37.0,
    qts: 0.32,
    qes: 0.35,
    qms: 4.2,
    vas: 176.0,
    xmax: 8.0,
    pe: 800,
    sd: 880,
    voiceCoilDiameterMm: 76,
    frameOuterDiameterMm: 388,
    cutoutDiameterMm: 355,
    mountingDepthMm: 142,
    magnetDiameterMm: 130,
    magnetDepthMm: 48,
    displacementLiters: 4.8,
    splSensitivityDb: 97.5,
    reOhm: 5.1,
    leMh: 1.35,
    categoryTags: ['live_top'],
    description: 'Differential Drive® 15" neodymium transducer combining 800W continuous capacity, ultra-low distortion, and high acoustic sensitivity.',
  },
  {
    id: 'jbl_2169h',
    brand: 'JBL Professional',
    model: '2169H 8" Differential Drive® Cone Midrange',
    nominalDiameterInch: 8,
    fs: 70.0,
    qts: 0.30,
    qes: 0.32,
    qms: 4.8,
    vas: 18.5,
    xmax: 4.5,
    pe: 270,
    sd: 220,
    voiceCoilDiameterMm: 76,
    frameOuterDiameterMm: 216,
    cutoutDiameterMm: 184,
    mountingDepthMm: 88,
    magnetDiameterMm: 98,
    magnetDepthMm: 34,
    displacementLiters: 1.2,
    splSensitivityDb: 96.0,
    reOhm: 5.4,
    leMh: 0.32,
    categoryTags: ['live_top', 'studio_monitor'],
    description: 'High-sensitivity 8" Differential Drive® cone midrange driver for large-format 3-way line arrays and reference monitoring systems.',
  },
  {
    id: 'jbl_2450h',
    brand: 'JBL Professional',
    model: '2450H 2" Exit Neodymium Compression Driver',
    nominalDiameterInch: 2,
    fs: 500,
    qts: 0.40,
    qes: 0.42,
    qms: 3.5,
    vas: 0.05,
    xmax: 0.8,
    pe: 150,
    sd: 50,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 152,
    cutoutDiameterMm: 102,
    mountingDepthMm: 64,
    magnetDiameterMm: 135,
    magnetDepthMm: 38,
    displacementLiters: 0.45,
    splSensitivityDb: 111.0,
    reOhm: 4.3,
    leMh: 0.15,
    categoryTags: ['live_top'],
    description: 'Flagship 2" exit compression driver featuring 4" pure titanium diaphragm, Coherent Wave™ phasing plug, and neodymium magnetic motor.',
  },
  {
    id: 'jbl_2426h',
    brand: 'JBL Professional',
    model: '2426H 1" Exit Pure Titanium Compression Driver',
    nominalDiameterInch: 1,
    fs: 800,
    qts: 0.48,
    qes: 0.50,
    qms: 3.2,
    vas: 0.02,
    xmax: 0.5,
    pe: 100,
    sd: 15,
    voiceCoilDiameterMm: 44,
    frameOuterDiameterMm: 120,
    cutoutDiameterMm: 80,
    mountingDepthMm: 55,
    magnetDiameterMm: 114,
    magnetDepthMm: 36,
    displacementLiters: 0.35,
    splSensitivityDb: 110.0,
    reOhm: 3.2,
    leMh: 0.10,
    categoryTags: ['live_top'],
    description: 'Classic 1" exit compression driver with diamond-pattern suspension titanium diaphragm and high-energy ceramic magnetic structure.',
  },
  {
    id: 'jbl_2408h1',
    brand: 'JBL Professional',
    model: '2408H-1 1" Exit Annular Ring Compression Driver',
    nominalDiameterInch: 1,
    fs: 900,
    qts: 0.52,
    qes: 0.55,
    qms: 3.0,
    vas: 0.015,
    xmax: 0.4,
    pe: 80,
    sd: 12,
    voiceCoilDiameterMm: 38,
    frameOuterDiameterMm: 98,
    cutoutDiameterMm: 68,
    mountingDepthMm: 48,
    magnetDiameterMm: 85,
    magnetDepthMm: 28,
    displacementLiters: 0.20,
    splSensitivityDb: 108.0,
    reOhm: 4.8,
    leMh: 0.08,
    categoryTags: ['live_top'],
    description: 'Compact annular polymer ring diaphragm neodymium compression driver with low distortion and smooth top-end transient response.',
  },
  {
    id: 'bc_18tbx100',
    brand: 'B&C Speakers',
    model: '18TBX100 18" Concert Subwoofer',
    nominalDiameterInch: 18,
    fs: 34.0,
    qts: 0.33,
    qes: 0.35,
    qms: 7.2,
    vas: 212.0,
    xmax: 9.0,
    pe: 1200,
    sd: 1210,
    voiceCoilDiameterMm: 100,
    frameOuterDiameterMm: 460,
    cutoutDiameterMm: 422,
    mountingDepthMm: 209,
    magnetDiameterMm: 220,
    magnetDepthMm: 60,
    displacementLiters: 9.0,
    splSensitivityDb: 98.0,
    reOhm: 5.1,
    leMh: 2.4,
    categoryTags: ['live_sub'],
    description: 'Touring standard 18" subwoofer with 100mm (4") inside/outside copper voice coil and ventilated magnet assembly.',
  },
  {
    id: 'bc_18sw115',
    brand: 'B&C Speakers',
    model: '18SW115 18" Extreme Power Subwoofer',
    nominalDiameterInch: 18,
    fs: 32.0,
    qts: 0.32,
    qes: 0.34,
    qms: 5.8,
    vas: 187.0,
    xmax: 14.0,
    pe: 1700,
    sd: 1210,
    voiceCoilDiameterMm: 116,
    frameOuterDiameterMm: 460,
    cutoutDiameterMm: 422,
    mountingDepthMm: 242,
    magnetDiameterMm: 140,
    magnetDepthMm: 65,
    displacementLiters: 10.5,
    splSensitivityDb: 97.0,
    reOhm: 5.0,
    leMh: 1.9,
    categoryTags: ['live_sub'],
    description: 'Flagship 18" neodymium subwoofer driver with 116mm (4.5") voice coil delivering 3400W continuous power handling.',
  },
  {
    id: 'bc_12ndl76',
    brand: 'B&C Speakers',
    model: '12NDL76 12" Neodymium High-SPL Mid-Bass',
    nominalDiameterInch: 12,
    fs: 50.0,
    qts: 0.22,
    qes: 0.23,
    qms: 4.8,
    vas: 68.0,
    xmax: 6.5,
    pe: 400,
    sd: 522,
    voiceCoilDiameterMm: 76,
    frameOuterDiameterMm: 315,
    cutoutDiameterMm: 282,
    mountingDepthMm: 135,
    magnetDiameterMm: 120,
    magnetDepthMm: 42,
    displacementLiters: 3.5,
    splSensitivityDb: 99.0,
    reOhm: 5.3,
    leMh: 1.1,
    categoryTags: ['live_top'],
    description: 'High-efficiency 12" neodymium transducer delivering 99dB 1W/1m sensitivity for high-output two-way live tops.',
  },
];

export function getDriversForCategory(category: SpeakerCategory, showAll: boolean = false): DriverPreset[] {
  if (showAll) return DRIVER_PRESETS;
  const filtered = DRIVER_PRESETS.filter((d) => d.categoryTags?.includes(category));
  return filtered.length > 0 ? filtered : DRIVER_PRESETS;
}

export function getDriversForSubcategory(
  subcategory: SpeakerSubcategory,
  category?: SpeakerCategory,
  showAll: boolean = false
): DriverPreset[] {
  if (showAll) return DRIVER_PRESETS;
  const subConfig = SUBCATEGORY_CONFIGS[subcategory];
  const parentCat = subConfig ? subConfig.parentCategory : (category || 'studio_monitor');
  
  const recommended = subConfig
    ? DRIVER_PRESETS.filter((d) => subConfig.recommendedDriverIds.includes(d.id))
    : [];
  
  const categoryDrivers = DRIVER_PRESETS.filter((d) => d.categoryTags?.includes(parentCat));
  
  const combined = [...recommended];
  categoryDrivers.forEach((d) => {
    if (!combined.some((c) => c.id === d.id)) {
      combined.push(d);
    }
  });

  return combined.length > 0 ? combined : DRIVER_PRESETS;
}

export function calculateOptimalAlignment(driver: DriverPreset, alignment: AlignmentType) {
  const { fs, qts, vas } = driver;

  if (alignment === 'sealed') {
    const targetQtc = 0.707;
    const ratio = targetQtc / qts;
    const vRatio = Math.max(0.1, ratio * ratio - 1);
    const optimalVb = vas / vRatio;
    const fc = fs * ratio;
    const f3 = fc * Math.sqrt(Math.max(0, (1 / (targetQtc * targetQtc) - 2 + Math.sqrt(Math.pow(1 / (targetQtc * targetQtc) - 2, 2) + 4)) / 2));
    return {
      optimalVbLiters: Math.max(2, optimalVb),
      optimalFbHz: fc,
      f3Hz: f3,
      targetQtc,
    };
  } else if (alignment === 'ported') {
    const optimalVb = 15 * vas * Math.pow(qts, 2.87);
    const optimalFb = 0.42 * fs * Math.pow(qts, -0.9);
    const f3 = 0.26 * fs * Math.pow(qts, -1.4);
    return {
      optimalVbLiters: Math.max(4, optimalVb),
      optimalFbHz: Math.round(optimalFb * 10) / 10,
      f3Hz: Math.round(f3 * 10) / 10,
      targetQtc: 0.707,
    };
  } else {
    const s = 0.7;
    const vf = 2 * s * Math.pow(qts, 2) * vas;
    const vr = vas / (Math.pow(2 * s, 2) - 1);
    const fb = fs * (2 * s * qts) / (2 * s);
    const f3 = fb * 0.75;
    return {
      optimalVbLiters: Math.max(5, vf + vr),
      optimalFbHz: Math.round(fb * 10) / 10,
      f3Hz: Math.round(f3 * 10) / 10,
      targetQtc: 0.707,
    };
  }
}




export function calculateStandingWaves(
  dimensions: EnclosureDimensions,
  acousticParams: AcousticParameters
): StandingWaveReport {
  const defaultMat = MATERIAL_SPECS[dimensions.material];
  const wallT = defaultMat ? defaultMat.nominalThicknessMm : 18;
  const baffleT = dimensions.baffleThicknessMm || wallT;

  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - (baffleT + wallT));

  const c = 343000; // speed of sound in mm/s

  // Fundamental eigenmodes (1st harmonic: f = c / (2 * L))
  const longitudinalHz = Math.round(c / (2 * intH));
  const transverseHz = Math.round(c / (2 * intW));
  const axialDepthHz = Math.round(c / (2 * intD));

  const eigenmodes: EigenmodePoint[] = [];

  // Longitudinal modes
  [1, 2, 3].forEach((modeOrder) => {
    const f = longitudinalHz * modeOrder;
    eigenmodes.push({
      axis: 'Height (Longitudinal)',
      modeOrder,
      frequencyHz: f,
      wavelengthMm: Math.round(c / f),
      severity: f < 600 ? 'high' : f < 1200 ? 'moderate' : 'low',
      description: `${modeOrder}${modeOrder === 1 ? 'st' : modeOrder === 2 ? 'nd' : 'rd'} vertical standing wave mode along ${intH}mm height.`,
    });
  });

  // Transverse modes
  [1, 2, 3].forEach((modeOrder) => {
    const f = transverseHz * modeOrder;
    eigenmodes.push({
      axis: 'Width (Transverse)',
      modeOrder,
      frequencyHz: f,
      wavelengthMm: Math.round(c / f),
      severity: f < 600 ? 'high' : f < 1200 ? 'moderate' : 'low',
      description: `${modeOrder}${modeOrder === 1 ? 'st' : modeOrder === 2 ? 'nd' : 'rd'} horizontal standing wave mode along ${intW}mm width.`,
    });
  });

  // Axial depth modes
  [1, 2, 3].forEach((modeOrder) => {
    const f = axialDepthHz * modeOrder;
    eigenmodes.push({
      axis: 'Depth (Axial)',
      modeOrder,
      frequencyHz: f,
      wavelengthMm: Math.round(c / f),
      severity: f < 600 ? 'high' : f < 1200 ? 'moderate' : 'low',
      description: `${modeOrder}${modeOrder === 1 ? 'st' : modeOrder === 2 ? 'nd' : 'rd'} axial depth standing wave mode along ${intD}mm depth.`,
    });
  });

  // Aspect ratio quality assessment
  const hW = Math.abs(intH - intW) / Math.max(intH, intW);
  const hD = Math.abs(intH - intD) / Math.max(intH, intD);
  const wD = Math.abs(intW - intD) / Math.max(intW, intD);

  let aspectRatioQuality: 'optimal_golden_ratio' | 'favorable' | 'problematic_cube' | 'problematic_square' = 'favorable';
  let aspectRatioText = 'Non-coincident internal dimensions provide well-spaced eigenmodes across the mid-bass band.';
  let standingWaveRiskLevel: 'low' | 'moderate' | 'high' = 'moderate';

  if (hW < 0.08 && hD < 0.08) {
    aspectRatioQuality = 'problematic_cube';
    aspectRatioText = 'Cube-like geometry (1:1:1) causes resonant mode stacking at identical frequencies, producing high standing wave peaks.';
    standingWaveRiskLevel = 'high';
  } else if (hW < 0.05 || hD < 0.05 || wD < 0.05) {
    aspectRatioQuality = 'problematic_square';
    aspectRatioText = 'Two internal dimensions match within 5%, resulting in dual-mode frequency summation.';
    standingWaveRiskLevel = 'high';
  } else {
    // Check for Golden Ratio (approx 1 : 1.25 : 1.6)
    const sortedDims = [intW, intH, intD].sort((a, b) => a - b);
    const r1 = sortedDims[1] / sortedDims[0];
    const r2 = sortedDims[2] / sortedDims[0];
    if (Math.abs(r1 - 1.25) < 0.2 && Math.abs(r2 - 1.6) < 0.25) {
      aspectRatioQuality = 'optimal_golden_ratio';
      aspectRatioText = 'Acoustically optimal Golden Ratio proportions (1 : 1.25 : 1.6) smoothly disperse internal eigenmodes.';
      standingWaveRiskLevel = 'low';
    }
  }

  const primaryResonantPeakHz = longitudinalHz;

  // Internal 45-degree deflector board advisor
  const reflectorAdvisor: InternalReflectorConfig = {
    type: 'angled_baffle_deflector',
    angleDeg: 45,
    widthMm: Math.round(intW * 0.9),
    lengthMm: Math.round(Math.min(intD * 0.85, 200)),
    thicknessMm: wallT,
    placementYMm: Math.round(intH * 0.45),
    placementZMm: Math.round(intD * 0.35),
    materialName: `${wallT}mm Baltic Birch / MDF Board`,
    benefits: [
      'Scatters rear-wave specular reflections into damping material before forming standing wave nodes.',
      'Reduces fundamental longitudinal peak amplitude by 6 to 8 dB without sacrificing internal box volume Vb.',
      'Prevents mid-bass back-wave energy from reflecting directly back through the thin woofer cone diaphragm.',
    ],
    installationGuide: `Mount angled deflector panel at 45° directly behind the woofer frame. Fasten to side walls using wood cleats and silicone damper adhesives. Line top surface of reflector with egg-crate foam.`,
  };

  return {
    longitudinalHz,
    transverseHz,
    axialDepthHz,
    eigenmodes,
    aspectRatioQuality,
    aspectRatioText,
    standingWaveRiskLevel,
    primaryResonantPeakHz,
    reflectorAdvisor,
  };
}

export function calculateAcoustics(
  dimensions: EnclosureDimensions,
  acousticParams: AcousticParameters
): AcousticCalculationResult {
  const {
    topology,
    driverAssignments,
    alignment,
    targetQtc,
    targetFb,
    portType,
    portDiameterMm,
    flareRadiusMm,
    isDoubleFlared,
    slotWidthMm,
    slotHeightMm,
    numberOfPorts,
    dampingFillPercent,
    bracingLevel,
    materialPricing,
  } = acousticParams;

  const defaultMaterial = MATERIAL_SPECS[dimensions.material];
  const wallT = defaultMaterial.nominalThicknessMm;
  const baffleT = dimensions.baffleThicknessMm || wallT;

  // Active density and cost (custom user inputs or defaults)
  const activeDensity = materialPricing?.customDensityKgM3 || defaultMaterial.densityKgM3;
  const activeCostPerM2 = materialPricing?.costPerSquareMeter !== undefined
    ? materialPricing.costPerSquareMeter
    : defaultMaterial.defaultCostPerM2;
  const wastePercent = materialPricing?.wastePercentage !== undefined
    ? materialPricing.wastePercentage
    : 15;

  // Loudspeaker Archetype & Subcategory Specification Resolution
  const activeCategory: SpeakerCategory = dimensions.category || 'studio_monitor';
  const categorySpec = CATEGORY_SPECS[activeCategory] || CATEGORY_SPECS.studio_monitor;
  const activeSubcat: SpeakerSubcategory = dimensions.subcategory || categorySpec.defaultSubcategory;
  const subcatConfig = SUBCATEGORY_CONFIGS[activeSubcat] || SUBCATEGORY_CONFIGS[categorySpec.defaultSubcategory];

  // Internal dimensions (mm)
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - (baffleT + wallT));

  const grossVolumeLiters = (intW * intH * intD) / 1000000;

  // Woofer volume displacement & count (auto-enforced twin woofers for dual-driver subcategories)
  const wooferAssign = driverAssignments.woofer;
  const wooferQuantity = subcatConfig.wooferQuantity === 2 ? 2 : (topology === 'mtm' ? 2 : (wooferAssign.quantity || 1));
  const wooferSingle = wooferAssign.driver;
  const driverDisplacementLiters = (wooferSingle.displacementLiters || 1.5) * wooferQuantity;

  // Midrange isolated chamber
  let midrangeChamberVolumeLiters = 0;
  if (topology === 'three_way' || subcatConfig.hasMidrangeChamber) {
    const midDrv = driverAssignments.midrange.driver;
    midrangeChamberVolumeLiters = Math.max(1.2, (midDrv.vas || 6.5) * 0.25);
  }

  // Commercial plate amplifier chassis displacement
  const plateAmpDisplacementLiters = subcatConfig.hasPlateAmplifier && subcatConfig.commercialPlateAmp
    ? subcatConfig.commercialPlateAmp.displacementLiters
    : 0;

  // Bracing displacement
  let bracingMultiplier = 0.04;
  if (bracingLevel === 'standard') bracingMultiplier = 0.08;
  if (bracingLevel === 'heavy') bracingMultiplier = 0.14;
  const bracingDisplacementLiters = grossVolumeLiters * bracingMultiplier;

  // Damping virtual volume factor using material-specific isothermal conversion rate
  const activeDampingMatKey = acousticParams.absorptionMaterialType || 'dacron_polyfill';
  const activeDampingMatSpec = DAMPING_MATERIAL_SPECS[activeDampingMatKey] || DAMPING_MATERIAL_SPECS.dacron_polyfill;
  const dampingVirtualFactor = 1 + (dampingFillPercent / 100) * (activeDampingMatSpec.maxIsothermalExpansionPercent / 100);

  let activeFb = targetFb;
  if (alignment === 'sealed') {
    activeFb = wooferSingle.fs * (targetQtc / wooferSingle.qts);
  }

  // 3D-Printed Integral Acoustic Dampening & TPMS Matrix Report
  const additiveAcousticReport = calculateAdditiveAcoustics(dimensions, acousticParams);
  const matrixDisplacedL = additiveAcousticReport.enabled ? additiveAcousticReport.displacedSolidVolumeLiters : 0;

  const standingWavesPre = calculateStandingWaves(dimensions, acousticParams);
  const diffuserReport = calculateProceduralDiffuser(dimensions, acousticParams, standingWavesPre);
  const diffuserDisplacedL = diffuserReport.enabled ? diffuserReport.displacedVolumeLiters : 0;

  // Parametric Rear-Panel Thermal Ventilation Report & Internal Finned Collector Displacement
  const thermalVentReport = calculateThermalVentilationReport(dimensions, acousticParams);
  const thermalExchangerDisplacedL =
    thermalVentReport.enabled && thermalVentReport.hasInternalHermeticHeatExchanger
      ? Math.round((0.28 + thermalVentReport.slotCount * 0.045) * 100) / 100
      : 0;

  let estNetVb =
    grossVolumeLiters -
    driverDisplacementLiters -
    bracingDisplacementLiters -
    midrangeChamberVolumeLiters -
    plateAmpDisplacementLiters -
    matrixDisplacedL -
    diffuserDisplacedL -
    thermalExchangerDisplacedL;
  if (estNetVb <= 1) estNetVb = 1;

  // Synthesize Custom Parametric Port (100% procedural, zero COTS dependencies)
  const portSynthesis = synthesizeParametricPort(
    dimensions,
    acousticParams,
    estNetVb,
    activeFb,
    intW,
    intH,
    intD
  );

  const portLengthMm = portSynthesis.effectiveLengthMm;
  const portDisplacementLiters = portSynthesis.portDisplacementLiters;
  const portAirVelocityMs = portSynthesis.portAirVelocityMs;
  const optimalFlareRadiusMm = portSynthesis.optimalFlareRadiusMm;
  const activeFlareRadiusMm = flareRadiusMm || optimalFlareRadiusMm;
  const portMatch = portSynthesis.portMatch;
  const parametricPort = portSynthesis.parametricPort;

  const netVolumeLiters = Math.max(1, estNetVb - portDisplacementLiters);
  const effectiveAcousticVolumeLiters = netVolumeLiters * dampingVirtualFactor;

  // Cutoff points
  let calculatedQtc = wooferSingle.qts;
  let f3CutoffHz = 40;
  let f6CutoffHz = 32;
  let f10CutoffHz = 24;

  if (alignment === 'sealed') {
    const alpha = (wooferSingle.vas * wooferQuantity) / effectiveAcousticVolumeLiters;
    calculatedQtc = wooferSingle.qts * Math.sqrt(1 + alpha);
    const fc = wooferSingle.fs * Math.sqrt(1 + alpha);
    const qTerm = 1 / (calculatedQtc * calculatedQtc) - 2;
    f3CutoffHz = fc * Math.sqrt(Math.max(0, (qTerm + Math.sqrt(qTerm * qTerm + 4)) / 2));
    f6CutoffHz = f3CutoffHz * 0.78;
    f10CutoffHz = f3CutoffHz * 0.58;
  } else if (alignment === 'ported') {
    const vRatio = effectiveAcousticVolumeLiters / (wooferSingle.vas * wooferQuantity);
    f3CutoffHz = Math.max(15, activeFb * Math.pow(vRatio, -0.32));
    f6CutoffHz = f3CutoffHz * 0.82;
    f10CutoffHz = f3CutoffHz * 0.65;
  } else {
    f3CutoffHz = activeFb * 0.72;
    f6CutoffHz = f3CutoffHz * 0.85;
    f10CutoffHz = f3CutoffHz * 0.68;
  }

  const totalSdM2 = (wooferSingle.sd * wooferQuantity) * 1e-4;
  const vdLiters = (totalSdM2 * 1e4 * wooferSingle.xmax) / 10000;
  const recommendedMinimumPortDiameterMm = Math.round(0.83 * Math.sqrt(vdLiters * activeFb) * 25.4 * 10) / 10;

  // Archetype-specific aerodynamic chuffing threshold AND 34 m/s sonic limit:
  // Studio Monitor (≤ 12 m/s), Studio Sub (≤ 17 m/s), Live Top (≤ 22 m/s), Live Sub (≤ 25 m/s), Absolute Sonic Ceiling (< 34 m/s)
  const flareBonusMs = (portType === 'round' && activeFlareRadiusMm >= 12) ? 2.5 : 0;
  const maxVelocityLimit = Math.min(34.0, categorySpec.maxRecommendedPortVelocityMs + flareBonusMs);
  const isChuffingRisk =
    alignment !== 'sealed' &&
    (portAirVelocityMs > maxVelocityLimit || parametricPort.exceedsSonicLimit34Ms);

  const maxInternalDimM = Math.max(intW, intH, intD) / 1000;
  const firstInternalResonanceHz = Math.round(343 / (2 * maxInternalDimM));

  // --- MATERIAL SURFACE AREA, MASS & COST CALCULATIONS ---
  // Net surface area of exterior panels in m^2
  const topBottomD = dimensions.externalDepthMm - baffleT;
  const sideH = dimensions.externalHeightMm - 2 * wallT;
  const sideD = topBottomD;
  const rearW = dimensions.externalWidthMm - 2 * wallT;
  const rearH = sideH;

  const baffleArea = (dimensions.externalWidthMm * dimensions.externalHeightMm) * 1e-6;
  const topBottomArea = 2 * (dimensions.externalWidthMm * topBottomD) * 1e-6;
  const sideArea = 2 * (sideD * sideH) * 1e-6;
  const rearArea = (rearW * rearH) * 1e-6;
  const braceArea = (rearW * sideD) * 1e-6 * (bracingLevel === 'heavy' ? 2 : 1);

  const netSurfaceAreaM2 = baffleArea + topBottomArea + sideArea + rearArea + braceArea;
  const grossSurfaceAreaM2 = netSurfaceAreaM2 * (1 + wastePercent / 100);
  const mechanics = calculateEnclosureMechanics(
    dimensions,
    bracingLevel,
    dimensions.material,
    acousticParams.hasConstrainedLayerDamping,
    acousticParams.absorptionMaterialType,
    materialPricing
  );

  const effectiveDensity = mechanics.effectiveDensityKgM3 || activeDensity;
  const totalMaterialCostUsd = mechanics.isFilamentMaterial
    ? Math.round(((mechanics.spoolCostUsd || 0) + mechanics.addedFinishCostUsd) * 100) / 100
    : Math.round((grossSurfaceAreaM2 * activeCostPerM2 + mechanics.addedFinishCostUsd) * 100) / 100;

  // Solid material mass
  const extVolumeM3 = (dimensions.externalWidthMm * dimensions.externalHeightMm * dimensions.externalDepthMm) * 1e-9;
  const intVolumeM3 = (intW * intH * intD) * 1e-9;
  const solidWoodVolumeM3 = Math.max(0, extVolumeM3 - intVolumeM3);
  const woodWeightKg = solidWoodVolumeM3 * effectiveDensity;
  const driverWeightKg = (wooferSingle.magnetDiameterMm * wooferSingle.magnetDepthMm * 0.0000078) * wooferQuantity + 1.2;
  const bracingWeightKg = bracingDisplacementLiters * 1e-3 * effectiveDensity;
  const totalWeightKg = Math.round((woodWeightKg + driverWeightKg + bracingWeightKg + mechanics.addedFinishMassKg + 1.8) * 10) / 10;

  const materialCost: MaterialCostResult = {
    netSurfaceAreaM2: Math.round(netSurfaceAreaM2 * 100) / 100,
    grossSurfaceAreaM2: Math.round(grossSurfaceAreaM2 * 100) / 100,
    totalCostUsd: totalMaterialCostUsd,
    totalDryWeightKg: totalWeightKg,
  };

  // Crossover (passing live externalWidthMm for accurate Baffle Step Compensation)
  const crossover = calculateCrossoverNetwork(acousticParams, dimensions.externalWidthMm);

  // Multi-band frequency response curves
  const freqResponse = generateMultiBandFrequencyCurve(alignment, acousticParams, effectiveAcousticVolumeLiters, activeFb, calculatedQtc, portAirVelocityMs);

  const standingWaves = standingWavesPre;
  if (additiveAcousticReport.enabled) {
    standingWaves.standingWaveRiskLevel = 'low';
    standingWaves.diffuserActive = true;
    standingWaves.diffuserAttenuationDb = additiveAcousticReport.standingWaveMitigationDb;
  } else if (diffuserReport.enabled) {
    standingWaves.standingWaveRiskLevel = 'low';
    standingWaves.diffuserActive = true;
    standingWaves.diffuserAttenuatedPeakHz = diffuserReport.primaryAttenuatedModeHz;
    standingWaves.diffuserAttenuationDb = diffuserReport.primaryAttenuationDb;
  }

  // Thermal & Large Signal Metrics (coupled to rear-panel convective thermal ventilation)
  const klippelThermal = calculateKlippelThermalShift(
    wooferSingle,
    acousticParams.thermalDriveLevel,
    thermalVentReport
  );
  const maxContinuousPowerW = Math.round(wooferSingle.pe * wooferQuantity);
  const powerCompressionDb = klippelThermal.powerCompressionDb;
  const totalSensitivityDb = wooferSingle.splSensitivityDb + (wooferQuantity > 1 ? 3 : 0);
  const maxSplDbAt1m = Math.round(
    (totalSensitivityDb + 10 * Math.log10(Math.max(1, maxContinuousPowerW)) - powerCompressionDb) * 10
  ) / 10;

  const velDelta = Math.round((maxVelocityLimit - portAirVelocityMs) * 10) / 10;
  let portNoiseMargin = '';
  let portNoiseStatus: 'nominal' | 'caution' | 'critical' = 'nominal';
  if (alignment === 'sealed') {
    portNoiseMargin = 'Sealed (0.0 m/s • Chuff-Free)';
    portNoiseStatus = 'nominal';
  } else if (velDelta >= 2.0) {
    portNoiseMargin = `+${velDelta} m/s Headroom (Laminar)`;
    portNoiseStatus = 'nominal';
  } else if (velDelta >= 0) {
    portNoiseMargin = `+${velDelta} m/s (Near ${categorySpec.name} Limit)`;
    portNoiseStatus = 'caution';
  } else {
    portNoiseMargin = `${velDelta} m/s Excess (Turbulence Risk)`;
    portNoiseStatus = 'critical';
  }

  let categoryRecommendation = '';
  switch (activeCategory) {
    case 'studio_monitor':
      categoryRecommendation =
        'Optimized for ruler-flat Listening Window and low phase distortion. Chamfer baffle edges and maintain air velocity ≤ 12 m/s.';
      break;
    case 'studio_sub':
      categoryRecommendation =
        'Infra-bass tuned for deep F3 ≤ 25 Hz cutoff. Use decoupled isolation feet and dense internal damping to eliminate box ringing.';
      break;
    case 'live_top':
      categoryRecommendation =
        'High-efficiency sound reinforcement. Pair with waveguide/horn and apply an 80 Hz high-pass crossover boundary for subwoofer arrays.';
      break;
    case 'live_sub':
      categoryRecommendation =
        'Touring concert output. Flared bellmouth aeroports and rigid matrix bracing handle extreme continuous power without dynamic choking.';
      break;
  }

  const categoryTelemetry = {
    category: activeCategory,
    maxSplDbAt1m,
    maxContinuousPowerW,
    portNoiseMargin,
    portNoiseStatus,
    categoryRecommendation,
    powerCompressionDb,
  };

  const subcategoryTelemetry = {
    subcategory: activeSubcat,
    name: subcatConfig.name,
    engineeringBadge: subcatConfig.engineeringBadge,
    targetDescription: subcatConfig.tagline,
    wooferQuantity,
    wiring: (wooferQuantity === 2 ? 'parallel' : 'single') as 'single' | 'parallel',
    combinedSdCm2: Math.round(wooferSingle.sd * wooferQuantity),
    combinedVdCm3: Math.round(wooferSingle.sd * wooferQuantity * wooferSingle.xmax * 10) / 10,
    isDualWoofer: wooferQuantity === 2,
    isCoaxial: !!subcatConfig.isCoaxial,
    isBandpass: alignment === 'bandpass4' || !!subcatConfig.isBandpass,
    hasPlateAmplifier: !!subcatConfig.hasPlateAmplifier,
    plateAmpDisplacementLiters: subcatConfig.hasPlateAmplifier ? subcatConfig.commercialPlateAmp?.displacementLiters : undefined,
    plateAmpContinuousPowerW: subcatConfig.hasPlateAmplifier ? subcatConfig.commercialPlateAmp?.powerRmsW : undefined,
    bandpassFrontVbLiters:
      acousticParams.bandpassFrontVbLiters ??
      subcatConfig.bandpassFrontVbLiters ??
      Math.round(netVolumeLiters * 0.35 * 10) / 10,
    bandpassRearVbLiters:
      acousticParams.bandpassRearVbLiters ??
      subcatConfig.bandpassRearVbLiters ??
      Math.round(netVolumeLiters * 0.65 * 10) / 10,
  };

  const driverCompatibility = validateDriverCompatibility(wooferSingle, activeCategory, activeSubcat);

  const maxSplReport = calculateMaxSplReport(
    acousticParams,
    wooferSingle,
    wooferQuantity,
    activeCategory,
    f3CutoffHz,
    alignment,
    klippelThermal
  );

  const computedLayout = computeBaffleLayout(dimensions, acousticParams, {
    portLengthMm: Math.round(portLengthMm),
    optimalFlareRadiusMm,
  });

  const speakonReport = calculateSpeakonReport(
    dimensions,
    acousticParams,
    Math.round(portLengthMm),
    computedLayout.resolvedPortPlacement
  );

  const systemImpedance = calculateSystemImpedance(
    acousticParams,
    effectiveAcousticVolumeLiters,
    activeFb,
    calculatedQtc,
    wooferSingle
  );

  const multiphysicsBlueprint = calculateMultiphysicsBlueprint(
    dimensions,
    acousticParams,
    netVolumeLiters,
    activeFb,
    Math.round(portLengthMm),
    parametricPort
  );

    const baseResult: AcousticCalculationResult = {
    netVolumeLiters: Math.round(netVolumeLiters * 10) / 10,
    grossInternalVolumeLiters: Math.round(grossVolumeLiters * 10) / 10,
    driverDisplacementLiters: Math.round(driverDisplacementLiters * 10) / 10,
    bracingDisplacementLiters: Math.round(bracingDisplacementLiters * 10) / 10,
    portDisplacementLiters: Math.round(portDisplacementLiters * 10) / 10,
    midrangeChamberVolumeLiters: Math.round(midrangeChamberVolumeLiters * 10) / 10,
    effectiveAcousticVolumeLiters: Math.round(effectiveAcousticVolumeLiters * 10) / 10,
    boxQtc: Math.round(calculatedQtc * 1000) / 1000,
    tuningFrequencyFb: Math.round(activeFb * 10) / 10,
    f3CutoffHz: Math.round(f3CutoffHz * 10) / 10,
    f6CutoffHz: Math.round(f6CutoffHz * 10) / 10,
    f10CutoffHz: Math.round(f10CutoffHz * 10) / 10,
    portLengthMm: Math.round(portLengthMm),
    portAirVelocityMs: Math.round(portAirVelocityMs * 10) / 10,
    isChuffingRisk,
    recommendedMinimumPortDiameterMm: Math.max(35, recommendedMinimumPortDiameterMm),
    optimalFlareRadiusMm,
    portMatch,
    parametricPort,
    standingWaves,
    totalWeightKg,
    firstInternalResonanceHz,
    materialCost,
    crossover,
    frequencyResponse: freqResponse,
    layout: computedLayout,
    // Advanced Electroacoustic Metrics from Training Data
    spinorama: generateSpinoramaCurves(freqResponse, acousticParams, dimensions),
    groupDelay: calculateGroupDelay(
      alignment,
      wooferSingle.fs * Math.sqrt(1 + (wooferSingle.vas * wooferQuantity) / effectiveAcousticVolumeLiters),
      calculatedQtc,
      activeFb
    ),
    klippelThermal,
    waveguide: calculateOblateSpheroidalWaveguide(acousticParams, dimensions),
    cardioid: calculateCardioidSubwoofer(acousticParams, dimensions, activeFb),
    mechanics,
    dampingAdvisor: calculateDampingAdvisor(
      netVolumeLiters,
      dimensions,
      targetQtc,
      wooferSingle,
      alignment,
      acousticParams.absorptionMaterialType,
      dampingFillPercent
    ),
    categoryTelemetry,
    subcategoryTelemetry,
    maxSplReport,
    driverCompatibility,
    firReport: calculateFirSimulation(acousticParams),
    speakonReport,
    diffuserReport,
    additiveAcousticReport,
    systemImpedance,
    multiphysicsBlueprint,
    thermalVentReport,
  };

  baseResult.caliberReport = evaluateSpeakerCaliber(dimensions, acousticParams, baseResult);
  return baseResult;
}

/**
 * Electroacoustic Qualification & Compatibility Validation Engine
 * Validates driver parameters against industry-standard engineering criteria
 * for active loudspeaker archetype (studio_monitor, studio_sub, live_top, live_sub) and subcategory.
 */
export function validateDriverCompatibility(
  driver: DriverPreset,
  category: SpeakerCategory,
  subcategory?: SpeakerSubcategory
): DriverCompatibilityReport {
  const reasons: string[] = [];
  let status: 'optimal' | 'suboptimal' | 'incompatible' = 'optimal';

  const catSpec = CATEGORY_SPECS[category] || CATEGORY_SPECS.studio_monitor;
  const subConfig = subcategory ? SUBCATEGORY_CONFIGS[subcategory] : undefined;
  const size = driver.nominalDiameterInch;
  const fs = driver.fs;
  const xmax = driver.xmax;
  const pe = driver.pe;
  const sens = driver.splSensitivityDb;
  const qts = driver.qts;
  const vcMm = driver.voiceCoilDiameterMm || 38;

  // Recommended alternatives list
  const recIds = subConfig?.recommendedDriverIds || catSpec?.recommendedDriverIds || [];
  const recommendedAlternatives = DRIVER_PRESETS.filter((d) => recIds.includes(d.id)).map(
    (d) => `[${d.brand}] ${d.model}`
  );

  if (category === 'studio_monitor') {
    const isMidfield = subcategory === 'midfield_3way';
    const maxAllowedSize = isMidfield ? 10 : 8;

    if (size < 4) {
      status = 'incompatible';
      reasons.push(`Transducer size (${size}") is under-sized for studio woofer duty (< 4").`);
    } else if (size > maxAllowedSize) {
      status = 'incompatible';
      reasons.push(
        `Transducer diameter (${size}") exceeds recommended limit for ${
          isMidfield ? 'Midfield 3-Way' : 'Studio Monitor'
        } (${maxAllowedSize}").`
      );
    }

    if (sens > 94) {
      status = 'incompatible';
      reasons.push(
        `High-efficiency PA transducer (${sens} dB @ 1W/1m) causes severe frequency response & balance mismatch for studio reference monitoring.`
      );
    } else if (sens > 91.5) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Sensitivity (${sens} dB) is higher than standard hi-fi studio monitors (84–90 dB).`);
    } else if (sens < 82) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Sensitivity (${sens} dB) is exceptionally low, requiring excessive amplifier drive.`);
    }

    if (fs > 55) {
      status = 'incompatible';
      reasons.push(`Resonant frequency Fs (${fs} Hz) is too high for full-range studio bass monitoring.`);
    } else if (fs > 45 && !isMidfield) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Fs (${fs} Hz) limits low-frequency extension in nearfield reference monitoring.`);
    }

    if (pe >= 600 && vcMm >= 100) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Heavy 4" voice coil PA driver (${pe}W) has high moving mass (Mms) for studio nearfield precision.`);
    }

  } else if (category === 'studio_sub') {
    const isLfe = subcategory === 'lfe_channel';
    const minSize = 8;
    const maxSize = isLfe ? 18 : 15;

    if (size < minSize) {
      status = 'incompatible';
      reasons.push(`Subwoofer driver size (${size}") is under-sized for true studio sub-bass (< 8").`);
    } else if (size > maxSize) {
      status = 'incompatible';
      reasons.push(`Driver diameter (${size}") exceeds ${maxSize}" studio subwoofer boundary.`);
    }

    if (xmax < 7.0) {
      status = 'incompatible';
      reasons.push(`Linear excursion Xmax (${xmax}mm) is insufficient for sub-bass stroke (< 7mm short-throw risk).`);
    } else if (xmax < 10.0) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Xmax (${xmax}mm) is moderate; ≥ 10mm recommended for deep infrasonic headroom.`);
    }

    if (fs > 40) {
      status = 'incompatible';
      reasons.push(`Fs (${fs} Hz) is too high for dedicated studio subwoofer alignment (> 40 Hz).`);
    } else if (fs > 32) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Fs (${fs} Hz) is above optimal studio sub target (≤ 30 Hz).`);
    }

    if (sens >= 97 && xmax < 8.0) {
      status = 'incompatible';
      reasons.push(`High-efficiency PA mid-bass driver (${sens} dB, Xmax ${xmax}mm) lacks deep sub-bass displacement stroke.`);
    }

  } else if (category === 'live_top') {
    if (size < 8 || size > 15) {
      status = 'incompatible';
      reasons.push(`Transducer diameter (${size}") is outside standard live PA top boundary (8" to 15").`);
    }

    if (sens < 90) {
      status = 'incompatible';
      reasons.push(`Low sensitivity (${sens} dB @ 1W/1m) is inadequate for live reinforcement (< 90 dB hi-fi driver).`);
    } else if (sens < 94) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Sensitivity (${sens} dB) is below pro PA top benchmark (≥ 94 dB).`);
    }

    if (pe < 200) {
      status = 'incompatible';
      reasons.push(`Continuous thermal power handling (${pe}W RMS) is too low for live sound loads (< 200W).`);
    } else if (pe < 300) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Power capacity (${pe}W) is light for high-SPL concert stage duty.`);
    }

    if (qts > 0.50) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Qts (${qts}) is high for vented PA top enclosures; target 0.22 – 0.40 for controlled bass-mid transients.`);
    }

  } else if (category === 'live_sub') {
    if (size < 12 || size > 21) {
      status = 'incompatible';
      reasons.push(`Transducer size (${size}") is outside touring concert subwoofer range (12" to 21").`);
    }

    if (vcMm < 65) {
      status = 'incompatible';
      reasons.push(`Voice coil diameter (${vcMm}mm / ${(vcMm/25.4).toFixed(1)}") is too small for touring sub thermal loads (< 3").`);
    } else if (vcMm < 76) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Voice coil (${vcMm}mm) is smaller than heavy 100mm (4") tour subwoofer standard.`);
    }

    if (pe < 400) {
      status = 'incompatible';
      reasons.push(`Continuous power handling (${pe}W AES) is insufficient for concert sub-bass (< 400W).`);
    } else if (pe < 600) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Power handling (${pe}W) is moderate compared to 800W–1600W touring sub standards.`);
    }

    if (sens < 92) {
      status = 'incompatible';
      reasons.push(`Acoustic sensitivity (${sens} dB) is too low for high-impact concert subwoofer arrays.`);
    } else if (sens < 95) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Sensitivity (${sens} dB) is slightly lower than flagship 96+ dB tour subwoofers.`);
    }

    if (xmax < 6.5) {
      status = 'incompatible';
      reasons.push(`Linear excursion Xmax (${xmax}mm) is too short for high-SPL concert bass stroke.`);
    } else if (xmax < 8.5) {
      if (status !== 'incompatible') status = 'suboptimal';
      reasons.push(`Xmax (${xmax}mm) is moderate for extreme concert sub excursion.`);
    }
  }

  // Populate positive summary if optimal
  if (status === 'optimal') {
    if (recIds.length > 0 && recIds.includes(driver.id)) {
      reasons.push(`Flagship recommended driver match for ${subConfig?.name || catSpec.name}.`);
    } else {
      reasons.push(`Transducer fully satisfies all ${catSpec.name} electroacoustic qualification criteria.`);
    }
  }

  return {
    status,
    reasons,
    recommendedAlternatives,
  };
}

/**
 * Real-Time Physics Max SPL & Electroacoustic Bottleneck Engine
 * Computes thermal power limited Max SPL vs cone displacement Xmax limited Max SPL at bass cutoff (F3),
 * factoring driver count, sensitivity, distance, boundary space loading, and archetype target benchmarks.
 */
export function calculateMaxSplReport(
  acousticParams: AcousticParameters,
  wooferSingle: DriverPreset,
  wooferQuantity: number,
  activeCategory: SpeakerCategory,
  f3CutoffHz: number,
  alignment: AlignmentType,
  klippelThermal: KlippelThermalReport
): MaxSplCalculationReport {
  const targetDistanceM = acousticParams.splCalcDistanceM ?? 1.0;
  const maxContinuousPowerW = Math.round(wooferSingle.pe * wooferQuantity);
  const inputPowerWatts = acousticParams.splCalcInputPowerW ?? maxContinuousPowerW;
  const maxPeakPowerW = maxContinuousPowerW * 4;

  const boundarySpace = acousticParams.splCalcBoundarySpace ?? (
    activeCategory === 'live_sub' || activeCategory === 'studio_sub'
      ? 'half_space_2pi'
      : 'free_space_4pi'
  );

  let boundaryGainDb = 0;
  if (boundarySpace === 'half_space_2pi') {
    boundaryGainDb = 6.0;
  } else if (boundarySpace === 'corner_bound_1pi') {
    boundaryGainDb = 12.0;
  }

  // Voltage / Power Sensitivity in dB SPL @ 1W/1m
  const systemSensitivity1w1mMm = wooferSingle.splSensitivityDb + (wooferQuantity > 1 ? 3.0 : 0.0);

  // Power compression loss (dB) from thermal model
  const powerCompressionLossDb = klippelThermal.powerCompressionDb;

  // Thermal limited Max SPL at 1m
  const safeInputPowerW = Math.max(1, inputPowerWatts);
  const thermalMaxSplAt1m = Math.round(
    (systemSensitivity1w1mMm + 10 * Math.log10(safeInputPowerW) - powerCompressionLossDb) * 10
  ) / 10;

  // Cone displacement / excursion limited Max SPL at 1m at bass cutoff (F3)
  const totalSdM2 = wooferSingle.sd * wooferQuantity * 1e-4; // m^2
  const xmaxM = wooferSingle.xmax * 1e-3; // m
  const vdM3 = totalSdM2 * xmaxM; // m^3
  const displacementLimitedFreqHz = Math.round(Math.max(20, f3CutoffHz));

  // Closed-form Keele / Small displacement SPL formula at 1m:
  // SPL_disp_sealed(1m) = 112 + 20 * log10(f^2 * Vd)
  const sealedDispSplAt1m = 112 + 20 * Math.log10(Math.max(1e-6, Math.pow(displacementLimitedFreqHz, 2) * vdM3));
  // Bass reflex or bandpass port resonance provides port resonance excursion attenuation (+9.5dB boost at Fb)
  const portBoostDb = alignment !== 'sealed' ? 9.5 : 0.0;
  const displacementMaxSplAt1m = Math.round((sealedDispSplAt1m + portBoostDb) * 10) / 10;

  // Distance inverse-square loss
  const distanceLossDb = Math.round(20 * Math.log10(Math.max(0.1, targetDistanceM)) * 10) / 10;

  // Determine limiting factor
  let limitingFactor: 'thermal_power' | 'excursion_displacement' | 'port_chuffing' = 'thermal_power';
  let limitingFactorDescription = '';

  if (displacementMaxSplAt1m < thermalMaxSplAt1m - 1.0) {
    limitingFactor = 'excursion_displacement';
    limitingFactorDescription = `Cone displacement limit (Xmax = ${wooferSingle.xmax}mm) restricts peak bass output at ${displacementLimitedFreqHz}Hz before thermal power capacity is reached.`;
  } else if (thermalMaxSplAt1m < displacementMaxSplAt1m - 1.0) {
    limitingFactor = 'thermal_power';
    limitingFactorDescription = `Voice coil thermal power handling (${maxContinuousPowerW}W RMS) and ${powerCompressionLossDb}dB power compression limit maximum output.`;
  } else {
    limitingFactor = 'thermal_power';
    limitingFactorDescription = `Balanced electroacoustic state: Thermal power handling and mechanical cone stroke capability are closely matched.`;
  }

  // Effective output at distance & boundary
  const maxSplAt1m = Math.min(thermalMaxSplAt1m, displacementMaxSplAt1m);
  const effectiveContinuousSplDb = Math.round((maxSplAt1m + boundaryGainDb - distanceLossDb) * 10) / 10;
  const effectivePeakSplDb = Math.round((effectiveContinuousSplDb + 6.0) * 10) / 10; // +6dB dynamic peak crest factor

  // Archetype Target Benchmarks
  let archetypeTargetSplDb = 105.0; // studio_monitor: 105 dB Peak @ 2.0m
  if (activeCategory === 'studio_monitor') {
    archetypeTargetSplDb = 105.0;
  } else if (activeCategory === 'studio_sub') {
    archetypeTargetSplDb = 115.0;
  } else if (activeCategory === 'live_top') {
    archetypeTargetSplDb = 132.0;
  } else if (activeCategory === 'live_sub') {
    archetypeTargetSplDb = 140.0;
  }

  const archetypeHeadroomDb = Math.round((effectivePeakSplDb - archetypeTargetSplDb) * 10) / 10;

  let archetypeStatus: 'optimal_headroom' | 'adequate' | 'underpowered' = 'adequate';
  let archetypeRecommendation = '';

  if (archetypeHeadroomDb >= 3.0) {
    archetypeStatus = 'optimal_headroom';
    archetypeRecommendation = `Exceeds ${CATEGORY_SPECS[activeCategory].name} target benchmark by +${archetypeHeadroomDb}dB. Provides pristine dynamic headroom for uncompressed peak transients.`;
  } else if (archetypeHeadroomDb >= 0.0) {
    archetypeStatus = 'adequate';
    archetypeRecommendation = `Meets ${CATEGORY_SPECS[activeCategory].name} target SPL requirement (${archetypeTargetSplDb} dB Peak) with +${archetypeHeadroomDb}dB margin.`;
  } else {
    archetypeStatus = 'underpowered';
    archetypeRecommendation = `Output is ${Math.abs(archetypeHeadroomDb)}dB below recommended ${CATEGORY_SPECS[activeCategory].name} benchmark (${archetypeTargetSplDb} dB Peak). Consider higher sensitivity drivers or additional power.`;
  }

  return {
    systemSensitivity1w1mMm: Math.round(systemSensitivity1w1mMm * 10) / 10,
    inputPowerWatts,
    maxContinuousPowerW,
    maxPeakPowerW,
    thermalMaxSplAt1m,
    displacementMaxSplAt1m,
    displacementLimitedFreqHz,
    limitingFactor,
    limitingFactorDescription,
    boundarySpace,
    boundaryGainDb,
    targetDistanceM,
    distanceLossDb,
    effectiveContinuousSplDb,
    effectivePeakSplDb,
    powerCompressionLossDb,
    archetypeTargetSplDb,
    archetypeHeadroomDb,
    archetypeStatus,
    archetypeRecommendation,
  };
}

function generateMultiBandFrequencyCurve(
  alignment: AlignmentType,
  acoustics: AcousticParameters,
  vbLiters: number,
  fb: number,
  qtc: number,
  peakAirVelocityMs: number
) {
  const points: {
    freq: number;
    dbTotal: number;
    dbWoofer: number;
    dbMidrange?: number;
    dbTweeter: number;
    excursionMm: number;
    airVelocityMs?: number;
  }[] = [];

  const { topology, driverAssignments, crossoverLowHz, crossoverHighHz, lowPassOrder, highPassOrder } = acoustics;
  const woofer = driverAssignments.woofer.driver;
  const tweeter = driverAssignments.tweeter.driver;

  const startF = 10;
  const endF = 20000;
  const count = 100;

  const fcLow = crossoverLowHz || 2500;
  const fcHigh = topology === 'three_way' ? (crossoverHighHz || 3500) : fcLow;

  for (let i = 0; i < count; i++) {
    const f = startF * Math.pow(endF / startF, i / (count - 1));

    let dbAcousticWoofer = 0;
    if (alignment === 'sealed') {
      const fc = woofer.fs * Math.sqrt(1 + woofer.vas / vbLiters);
      const w = 2 * Math.PI * f;
      const wc = 2 * Math.PI * fc;
      const denomReal = wc * wc - w * w;
      const denomImag = (wc / qtc) * w;
      const mag2 = (w * w * w * w) / (denomReal * denomReal + denomImag * denomImag);
      dbAcousticWoofer = 10 * Math.log10(Math.max(1e-6, mag2));
    } else {
      const fn = f / fb;
      const h = fb / woofer.fs;
      const alpha = woofer.vas / vbLiters;
      const num = Math.pow(fn, 4);
      const den = Math.sqrt(Math.pow(Math.pow(fn, 4) - fn * fn * (1 + h * h + alpha) + h * h, 2) + Math.pow(fn * (h * h - fn * fn) / woofer.qts, 2) + 0.001);
      dbAcousticWoofer = 20 * Math.log10(Math.max(1e-4, num / den));
    }

    const fNLow = f / fcLow;
    const dbFilterWoofer = -10 * Math.log10(1 + Math.pow(fNLow, 2 * lowPassOrder));
    const dbWoofer = dbAcousticWoofer + dbFilterWoofer;

    const fNHigh = f / fcHigh;
    const dbFilterTweeter = -10 * Math.log10(1 + Math.pow(1 / fNHigh, 2 * highPassOrder));
    const dbTweeter = (tweeter.splSensitivityDb - woofer.splSensitivityDb) + dbFilterTweeter - driverAssignments.tweeter.attenuationDb;

    let dbMidrange = undefined;
    if (topology === 'three_way') {
      const dbMidHP = -10 * Math.log10(1 + Math.pow(fcLow / f, 4));
      const dbMidLP = -10 * Math.log10(1 + Math.pow(f / fcHigh, 4));
      dbMidrange = dbMidHP + dbMidLP - driverAssignments.midrange.attenuationDb;
    }

    const pWoofer = Math.pow(10, dbWoofer / 10);
    const pTweeter = Math.pow(10, dbTweeter / 10);
    const pMid = dbMidrange !== undefined ? Math.pow(10, dbMidrange / 10) : 0;
    const dbTotal = 10 * Math.log10(pWoofer + pTweeter + pMid);

    const fDriverN = f / woofer.fs;
    const dipFactor = Math.abs((f / fb) - 1) / (Math.abs((f / fb) - 1) + 0.35);
    const excursion = woofer.xmax * (0.2 + 0.8 * dipFactor) * Math.min(2.0, 1 / (0.1 + fDriverN * fDriverN));

    // Air velocity response curve: peak at Fb with Q=10 resonance bell curve
    const deltaF = Math.abs(f - fb) / fb;
    const airVelAtF = peakAirVelocityMs / (1 + 25 * deltaF * deltaF);

    points.push({
      freq: Math.round(f * 10) / 10,
      dbTotal: Math.round(dbTotal * 10) / 10,
      dbWoofer: Math.round(dbWoofer * 10) / 10,
      dbMidrange: dbMidrange !== undefined ? Math.round(dbMidrange * 10) / 10 : undefined,
      dbTweeter: Math.round(dbTweeter * 10) / 10,
      excursionMm: Math.round(Math.min(woofer.xmax * 2.2, excursion) * 10) / 10,
      airVelocityMs: Math.round(airVelAtF * 10) / 10,
    });
  }

  return points;
}

/**
 * ANSI/CTA-2034-A Spinorama Directivity Synthesis
 * Computes On-Axis, Listening Window, Early Reflections, Sound Power, ERDI, and SPDI
 */
function generateSpinoramaCurves(
  freqPoints: { freq: number; dbTotal: number }[],
  acoustics: AcousticParameters,
  dimensions: EnclosureDimensions
): SpinoramaCurvePoint[] {
  const woofer = acoustics.driverAssignments.woofer.driver;
  const pistonDiaM = Math.sqrt((woofer.sd * 1e-4 * 4) / Math.PI);
  const baffleWidthM = dimensions.externalWidthMm * 1e-3;

  return freqPoints.map((pt) => {
    const f = pt.freq;
    const onAxis = pt.dbTotal;

    const k = (2 * Math.PI * f) / 343;
    const ka = (k * pistonDiaM) / 2;

    // Listening window attenuation (smooth off-axis spatial average within ±30° H, ±10° V)
    const lwDrop = Math.min(3.5, 0.4 * Math.log10(Math.max(1, f / 400)) + 0.15 * Math.min(4, ka));
    const listeningWindow = Math.round((onAxis - Math.max(0, lwDrop)) * 10) / 10;

    // Early Reflections (energetic average of floor, ceiling, front, side, and rear wall single bounces)
    const erDrop = Math.min(8.5, 1.2 * Math.log10(Math.max(1, f / 200)) + 0.6 * Math.min(5, ka));
    const earlyReflections = Math.round((onAxis - Math.max(0.5, erDrop)) * 10) / 10;

    // Sound Power (area-weighted total acoustic power radiated into 4pi steradians)
    const spDrop = Math.min(14.0, 3.0 + 2.2 * Math.log10(Math.max(1, f / 150)) + 0.9 * Math.min(6, ka));
    const soundPower = Math.round((onAxis - Math.max(2.5, spDrop)) * 10) / 10;

    // Directivity Indices: ERDI = LW - ER, SPDI = LW - SP
    const erdi = Math.round((listeningWindow - earlyReflections) * 10) / 10;
    const spdi = Math.round((listeningWindow - soundPower) * 10) / 10;

    return {
      freq: pt.freq,
      onAxis,
      listeningWindow,
      earlyReflections,
      soundPower,
      erdi,
      spdi,
    };
  });
}

/**
 * Phase Coherence & Time-Domain Group Delay Calculator
 * Verifies compliance with the psychoacoustic threshold tau_g(f) < 1.5 / f below 100 Hz
 */
function calculateGroupDelay(
  alignment: AlignmentType,
  fc: number,
  qtc: number,
  fb: number
): GroupDelayCurvePoint[] {
  const points: GroupDelayCurvePoint[] = [];
  const startF = 10;
  const endF = 500;
  const count = 75;

  for (let i = 0; i < count; i++) {
    const f = startF * Math.pow(endF / startF, i / (count - 1));
    let gdMs = 0;

    if (alignment === 'sealed') {
      // 2nd-order high-pass group delay closed-form
      const fn = f / Math.max(10, fc);
      const q = Math.max(0.1, qtc);
      const num = (1 / q) * (1 + fn * fn);
      const den = Math.pow(1 - fn * fn, 2) + Math.pow(fn / q, 2);
      const gdSec = (1 / (2 * Math.PI * Math.max(10, fc))) * (num / Math.max(1e-4, den));
      gdMs = gdSec * 1000;
    } else {
      // 4th-order bass-reflex group delay (steep phase slope near Fb)
      const fn = f / Math.max(10, fb);
      const deltaF = Math.abs(fn - 1);
      const resonantPeak = 28.0 / (1 + 18 * deltaF * deltaF);
      const subRollOff = (1 / (Math.pow(fn, 2.5) + 0.1)) * 4.5;
      gdMs = Math.min(65, Math.max(1.5, resonantPeak + (fn < 1 ? subRollOff : 3.5 / fn)));
    }

    // Psychoacoustic audibility threshold ceiling: tau_g(f) < 1.5 / f (s) => 1500 / f (ms)
    const thresholdMs = Math.round((1500 / f) * 10) / 10;
    const roundedGd = Math.round(gdMs * 10) / 10;

    points.push({
      freq: Math.round(f * 10) / 10,
      groupDelayMs: roundedGd,
      cycleThresholdMs: thresholdMs,
      isAudible: roundedGd > thresholdMs,
    });
  }

  return points;
}

/**
 * Parametric Rear-Panel Thermal Ventilation Slot Synthesizer
 * Scales CNC rear-panel convective intake/exhaust slots, net free ventilation area,
 * buoyancy stack velocity, and voice-coil thermal compression relief directly from
 * the transducer's continuous RMS power rating (Pe * quantity).
 */
export function calculateThermalVentilationReport(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters
): ThermalVentilationReport {
  const wooferAssign = acoustics.driverAssignments.woofer;
  const woofer = wooferAssign.driver;
  const wooferQty = Math.max(1, wooferAssign.quantity || (acoustics.topology === 'mtm' ? 2 : 1));
  const tweeterPe = acoustics.topology !== 'single' ? (acoustics.driverAssignments.tweeter.driver.pe || 40) * 0.2 : 0;
  const midPe = acoustics.topology === 'three_way' ? (acoustics.driverAssignments.midrange.driver.pe || 80) * 0.3 : 0;

  const driverContinuousPowerW = Math.round(woofer.pe * wooferQty + tweeterPe + midPe);
  // ~96% of electrical input power in an electrodynamic transducer converts into voice-coil & motor Joule heat
  const thermalDissipationLoadW = Math.round(driverContinuousPowerW * 0.96);

  const cfg = dimensions.thermalVentConfig || {};
  const enabled = Boolean(
    cfg.enabled !== undefined
      ? cfg.enabled
      : dimensions.hardware?.showThermalVentSlots
  );
  const sizingMode = cfg.sizingMode || 'auto_driver_pe';
  const pattern = cfg.pattern || 'convective_dual_bank';
  const hasInternalHermeticHeatExchanger = cfg.hasInternalHermeticHeatExchanger ?? true;

  // Determine Power Tier & Auto-Scaled Slot Parameters from driverContinuousPowerW
  let powerTier: ThermalVentilationReport['powerTier'] = 'compact_low_power';
  let powerTierLabel = 'Tier 1: Compact Nearfield (≤ 180W RMS)';
  let autoSlotCount = 4;
  let autoSlotWidthMm = 48;
  let autoSlotHeightMm = 6;

  if (driverContinuousPowerW > 950) {
    powerTier = 'touring_extreme_power';
    powerTierLabel = 'Tier 4: Concert Touring Extreme (> 950W RMS)';
    autoSlotCount = 12;
    autoSlotWidthMm = 94;
    autoSlotHeightMm = 9;
  } else if (driverContinuousPowerW > 450) {
    powerTier = 'pro_high_power';
    powerTierLabel = 'Tier 3: High-Power Pro PA (451–950W RMS)';
    autoSlotCount = 8;
    autoSlotWidthMm = 78;
    autoSlotHeightMm = 8;
  } else if (driverContinuousPowerW > 180) {
    powerTier = 'studio_mid_power';
    powerTierLabel = 'Tier 2: Mid-Power Reference (181–450W RMS)';
    autoSlotCount = 6;
    autoSlotWidthMm = 62;
    autoSlotHeightMm = 7;
  }

  const wallTMm = MATERIAL_SPECS[dimensions.material]?.nominalThicknessMm || 18;
  const rearWMm = Math.max(80, dimensions.externalWidthMm - 2 * wallTMm);
  const rearHMm = Math.max(100, dimensions.externalHeightMm - 2 * wallTMm);

  const rawSlotCount = sizingMode === 'manual' && cfg.manualSlotCount ? cfg.manualSlotCount : autoSlotCount;
  // Ensure even slot count (split evenly between lower cool-air intake bank and upper hot-air exhaust bank)
  const slotCount = Math.max(2, Math.min(16, Math.round(rawSlotCount / 2) * 2));
  const intakeSlotCount = Math.floor(slotCount / 2);
  const exhaustSlotCount = slotCount - intakeSlotCount;

  const maxAllowedSlotWMm = Math.max(32, Math.round(rearWMm * 0.42));
  const rawSlotWMm = sizingMode === 'manual' && cfg.manualSlotWidthMm ? cfg.manualSlotWidthMm : autoSlotWidthMm;
  const slotWidthMm = Math.max(28, Math.min(maxAllowedSlotWMm, Math.round(rawSlotWMm)));

  const rawSlotHMm = sizingMode === 'manual' && cfg.manualSlotHeightMm ? cfg.manualSlotHeightMm : autoSlotHeightMm;
  const slotHeightMm = Math.max(4, Math.min(14, Math.round(rawSlotHMm)));
  const slotCornerRadiusMm = Math.round((slotHeightMm / 2) * 10) / 10;
  const slotPitchMm = Math.round((slotHeightMm + 5.5) * 10) / 10;

  // Single stadium slot area: W * H - (4 - pi) * r^2
  const singleSlotAreaMm2 =
    slotWidthMm * slotHeightMm - (4 - Math.PI) * slotCornerRadiusMm * slotCornerRadiusMm;
  const meshOpenFactor = 0.82; // 82% open perforated debris screen
  const totalNetFreeAreaCm2 =
    Math.round(((singleSlotAreaMm2 * slotCount * meshOpenFactor) / 100) * 100) / 100;

  // Natural stack buoyancy velocity: v_buoy = C_d * sqrt(2 * g * H_stack * (Delta_T / T_amb))
  const stackHeightM = Math.max(0.12, (rearHMm * 0.62) * 1e-3);
  const deltaTPlenumK = Math.min(48, 12 + driverContinuousPowerW * 0.025);
  const cdDischarge = 0.65;
  const rawBuoyancyVelMs =
    cdDischarge * Math.sqrt(2 * 9.81 * stackHeightM * (deltaTPlenumK / 293.15));
  // Coupled acoustic oscillating pump boost from woofer back-wave agitation across internal heat exchanger
  const buoyancyAirflowVelocityMs = Math.round((rawBuoyancyVelMs * 1.45) * 100) / 100;

  // Required minimum free vent area for target thermal dissipation
  const requiredMinFreeAreaCm2 =
    Math.round((thermalDissipationLoadW / Math.max(15, 18.5 * buoyancyAirflowVelocityMs)) * 10) / 10;

  // Convective volume flow rate (L/s) through intake -> exhaust chimney
  const intakeAreaM2 = ((totalNetFreeAreaCm2 / 2) * 1e-4);
  const convectiveVolumeFlowLs = enabled
    ? Math.round(intakeAreaM2 * buoyancyAirflowVelocityMs * 1000 * 100) / 100
    : 0;

  // Voice-coil steady-state temperature reduction (deg C) & power compression saved (dB)
  const areaCoverageRatio = Math.min(1.35, totalNetFreeAreaCm2 / Math.max(1.5, requiredMinFreeAreaCm2));
  const voiceCoilTempDropC = enabled
    ? Math.round((14 + Math.min(18, driverContinuousPowerW * 0.012)) * areaCoverageRatio * 10) / 10
    : 0;
  const alpha0 = 0.00393;
  const powerCompressionSavedDb = enabled
    ? Math.round(20 * Math.log10(1 + alpha0 * voiceCoilTempDropC) * 100) / 100
    : 0;

  const bankEnvelopeWidthMm = slotWidthMm + 16;
  const bankEnvelopeHeightMm = Math.round(intakeSlotCount * slotPitchMm + 12);

  // Build individual slot coordinate list relative to each bank center
  const slots: ThermalVentSlotPlacement[] = [];
  for (let i = 0; i < intakeSlotCount; i++) {
    const localY = (i - (intakeSlotCount - 1) / 2) * slotPitchMm;
    slots.push({
      slotIndex: i + 1,
      role: 'intake_lower',
      xMm: 0,
      yMm: Math.round((-rearHMm * 0.30 + localY) * 10) / 10,
      widthMm: slotWidthMm,
      heightMm: slotHeightMm,
      cornerRadiusMm: slotCornerRadiusMm,
    });
  }
  for (let i = 0; i < exhaustSlotCount; i++) {
    const localY = (i - (exhaustSlotCount - 1) / 2) * slotPitchMm;
    slots.push({
      slotIndex: intakeSlotCount + i + 1,
      role: 'exhaust_upper',
      xMm: 0,
      yMm: Math.round((rearHMm * 0.30 + localY) * 10) / 10,
      widthMm: slotWidthMm,
      heightMm: slotHeightMm,
      cornerRadiusMm: slotCornerRadiusMm,
    });
  }

  return {
    enabled,
    sizingMode,
    pattern,
    driverContinuousPowerW,
    thermalDissipationLoadW,
    powerTier,
    powerTierLabel,
    slotCount,
    intakeSlotCount,
    exhaustSlotCount,
    slotWidthMm,
    slotHeightMm,
    slotCornerRadiusMm,
    slotPitchMm,
    totalNetFreeAreaCm2,
    requiredMinFreeAreaCm2,
    buoyancyAirflowVelocityMs,
    convectiveVolumeFlowLs,
    voiceCoilTempDropC,
    powerCompressionSavedDb,
    hasInternalHermeticHeatExchanger,
    hermeticSealDescription: hasInternalHermeticHeatExchanger
      ? 'Internal Hermetic Finned Aluminum Convective Chimney (100% Acoustic Box Seal Preserved)'
      : 'Direct Acoustic Relief Louvers (Open Rear Convective Venting)',
    bankEnvelopeWidthMm,
    bankEnvelopeHeightMm,
    slots,
  };
}

/**
 * Klippel Large-Signal State-Space & Thermal Power Compression Engine
 * Models Re(Tv) resistance rise, power compression Delta L_pc, and dynamic Qes/Qts/Fs shifts
 */
function calculateKlippelThermalShift(
  driver: DriverPreset,
  driveLevel: 'small_signal' | 'nominal_aes' | 'max_continuous' = 'small_signal',
  thermalVentReport?: ThermalVentilationReport
): KlippelThermalReport {
  const ambientTempC = 20;
  const rawTempRiseC = driveLevel === 'max_continuous' ? 135 : driveLevel === 'nominal_aes' ? 75 : 0;
  const ventCoolingDropC =
    thermalVentReport?.enabled && rawTempRiseC > 0
      ? Math.min(rawTempRiseC * 0.32, thermalVentReport.voiceCoilTempDropC * (driveLevel === 'max_continuous' ? 1.0 : 0.65))
      : 0;
  const tempRiseC = Math.round(Math.max(0, rawTempRiseC - ventCoolingDropC) * 10) / 10;
  const voiceCoilTempC = Math.round((ambientTempC + tempRiseC) * 10) / 10;

  // Temperature coefficient of resistance for copper: alpha_0 = 0.00393 K^-1
  const alpha0 = 0.00393;
  const coldRe = driver.reOhm || 5.0;
  const hotRe = coldRe * (1 + alpha0 * tempRiseC);

  // Power compression: Delta L_pc = 20 * log10(1 + alpha_0 * Delta T_v) dB
  const powerCompressionDb = Math.round(20 * Math.log10(1 + alpha0 * tempRiseC) * 10) / 10;

  // Large-signal Qes & Qts shift (elevated Re and dynamic Bl reduction under high stroke)
  const thermalReFactor = 1 + alpha0 * tempRiseC;
  const blModFactor = driveLevel === 'max_continuous' ? 1.25 : driveLevel === 'nominal_aes' ? 1.12 : 1.0;
  const largeSignalQes = Math.round(driver.qes * thermalReFactor * blModFactor * 100) / 100;
  const largeSignalQts = Math.round(((driver.qms * largeSignalQes) / (driver.qms + largeSignalQes)) * 100) / 100;

  // Large-signal Fs: drops -8% warm initially, then rises +18% under progressive suspension stiffening
  const fsShiftFactor = driveLevel === 'max_continuous' ? 1.18 : driveLevel === 'nominal_aes' ? 1.08 : 1.0;
  const largeSignalFs = Math.round(driver.fs * fsShiftFactor * 10) / 10;

  const xmaxMm = driver.xmax;
  const xmechMm = Math.round(xmaxMm * 2.0 * 10) / 10;

  return {
    ambientTempC,
    voiceCoilTempC,
    tempRiseC,
    coldReOhm: Math.round(coldRe * 10) / 10,
    hotReOhm: Math.round(hotRe * 10) / 10,
    powerCompressionDb,
    largeSignalQes,
    largeSignalQts,
    largeSignalFs,
    linearExcursionXmaxMm: xmaxMm,
    damageExcursionXmechMm: xmechMm,
  };
}

/**
 * Earl Geddes Oblate Spheroidal Waveguide (OSWG) & Baffle Diffraction Calculator
 * Computes r(z) = sqrt(r_t^2 + tan^2(theta_wall) * z^2) and verifies r_edge >= lambda / 8
 */
function calculateOblateSpheroidalWaveguide(
  acoustics: AcousticParameters,
  dimensions: EnclosureDimensions
): OblateSpheroidalWaveguideConfig {
  const tweeter = acoustics.driverAssignments.tweeter.driver;
  const throatRadiusMm = (tweeter.voiceCoilDiameterMm || 25) / 2;
  const coverageHalfAngleDeg = (acoustics.waveguideCoverageAngleDeg || 90) / 2;
  const thetaRad = (coverageHalfAngleDeg * Math.PI) / 180;
  const lengthMm = 45;

  const profilePoints: { zMm: number; radiusMm: number }[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const z = (lengthMm / steps) * i;
    const r = Math.sqrt(throatRadiusMm * throatRadiusMm + Math.pow(Math.tan(thetaRad) * z, 2));
    profilePoints.push({
      zMm: Math.round(z * 10) / 10,
      radiusMm: Math.round(r * 10) / 10,
    });
  }

  // Minimum baffle edge radius for diffraction suppression: r_edge >= c / (8 * f_crossover)
  const fc = acoustics.crossoverLowHz || 2500;
  const minEdgeMm = Math.round((343200 / (8 * fc)) * 10) / 10;
  const actualEdgeMm = acoustics.baffleEdgeRadiusMm || (dimensions.baffleThicknessMm || 18);

  return {
    throatRadiusMm: Math.round(throatRadiusMm * 10) / 10,
    coverageHalfAngleDeg,
    lengthMm,
    profilePoints,
    minBaffleEdgeRadiusMm: minEdgeMm,
    actualBaffleEdgeRadiusMm: actualEdgeMm,
    isDiffractionSuppressed: actualEdgeMm >= minEdgeMm,
  };
}

/**
 * Active Cardioid & End-Fire Subwoofer Array Synthesizer
 * Computes temperature-compensated delay offsets t = Delta d / c(T_C) and rear null cancellation
 */
function calculateCardioidSubwoofer(
  acoustics: AcousticParameters,
  dimensions: EnclosureDimensions,
  fb: number
): CardioidSubwooferConfig {
  const mode = acoustics.subwooferArrayMode || 'omni';
  const temperatureC = acoustics.operatingTemperatureC ?? 20;

  // Temperature compensated speed of sound: c(T_C) = 331.3 * sqrt(1 + T_C / 273.15)
  const soundSpeedMs = Math.round((331.3 * Math.sqrt(1 + temperatureC / 273.15)) * 10) / 10;

  // Optimal spacing: Delta d = c / (4 * f_0)
  const optSpacingM = soundSpeedMs / (4 * Math.max(25, fb));
  const spacingMm = Math.round(Math.min(dimensions.externalDepthMm * 1.5, optSpacingM * 1000));
  const delayMs = Math.round(((spacingMm * 1e-3) / soundSpeedMs) * 1000 * 100) / 100;

  // 4-element end-fire progressive delay offsets: t_n = n * Delta d / c
  const endFireDelaysMs = [0, 1, 2, 3].map((n) => Math.round((n * delayMs) * 100) / 100);

  return {
    mode,
    spacingMm,
    delayMs,
    temperatureC,
    soundSpeedMs,
    rearCancellationDb: mode === 'omni' ? 0 : mode === 'cardioid_gradient' ? 21.5 : 24.0,
    endFireDelaysMs,
  };
}

/**
 * Cabinet Structural Mechanics, Joinery Rigidity & Rigging Certification
 * Computes D_bend plate rigidity, f_1,1 panel resonance, matrix brace shift, and DGUV 10:1 / ANSI 7:1 WLL
 */
function calculateEnclosureMechanics(
  dimensions: EnclosureDimensions,
  bracingLevel: 'minimal' | 'standard' | 'heavy',
  materialType: MaterialType,
  hasCLD = false,
  absorptionType = 'recycled_denim',
  materialPricing?: MaterialPricingConfig
): EnclosureMechanicsReport {
  const spec = MATERIAL_SPECS[materialType] || MATERIAL_SPECS.baltic_birch_18;
  const isFilament = spec.category === 'filaments';
  const infill = dimensions.infillPercent ?? 40;
  const rhoSolid = materialPricing?.customDensityKgM3 ?? spec.densityKgM3;
  const effectiveDensityKgM3 = isFilament
    ? Math.round(rhoSolid * (0.35 + 0.65 * (infill / 100)))
    : Math.round(rhoSolid);

  const isPlywood = materialType.includes('birch') || materialType.includes('marine');
  const isMDF = materialType.includes('mdf') || materialType.includes('valchromat');
  const flexuralModulusGpa =
    materialPricing?.customFlexuralModulusGpa ??
    spec.flexuralModulusGpa ??
    (isPlywood ? 8.5 : isMDF ? 3.8 : 12.5);
  const youngsModulusPa = flexuralModulusGpa * 1e9; // Pa
  const nu =
    materialPricing?.customPoissonRatio ??
    spec.poissonRatio ??
    (isFilament ? 0.35 : 0.30); // Poisson's ratio
  const hM = (dimensions.baffleThicknessMm || spec.nominalThicknessMm || 18) * 1e-3;

  // Longitudinal acoustic wave speed in panel material: c_L = sqrt(E / [rho * (1 - nu^2)])
  const longitudinalWaveSpeedMs = Math.round(
    Math.sqrt(youngsModulusPa / Math.max(100, effectiveDensityKgM3 * (1 - nu * nu)))
  );

  // Plate bending stiffness: D_bend = E * h^3 / [12 * (1 - nu^2)]
  const bendingStiffnessNm = Math.round((youngsModulusPa * Math.pow(hM, 3)) / (12 * (1 - nu * nu)));

  // Fundamental unbraced panel resonance f_1,1 = (pi * h / [4 * sqrt(3 * (1 - nu^2))]) * (1/a^2 + 1/b^2) * sqrt(E / rho_eff)
  const aM = dimensions.externalHeightMm * 1e-3;
  const bM = dimensions.externalWidthMm * 1e-3;
  const plateConst = (Math.PI * hM) / (4 * Math.sqrt(3 * (1 - nu * nu)));
  const f11Raw = plateConst * (1 / (aM * aM) + 1 / (bM * bM)) * Math.sqrt(youngsModulusPa / Math.max(100, effectiveDensityKgM3));
  const fundamentalPanelModeHz = Math.round(f11Raw);

  // Baltic Birch 18mm Reference fundamental mode (E = 12.5 GPa, rho = 680 kg/m³)
  const refPlateConst = (Math.PI * 0.018) / (4 * Math.sqrt(3 * (1 - 0.09)));
  const balticBirchReferenceModeHz = Math.round(refPlateConst * (1 / (aM * aM) + 1 / (bM * bM)) * Math.sqrt(12.5e9 / 680));

  // Matrix bracing grid shifts unbraced spans down to 100-150mm
  const targetSpanMm = bracingLevel === 'heavy' ? 110 : bracingLevel === 'standard' ? 135 : 180;
  const bracedSpanM = targetSpanMm * 1e-3;
  const bracedF11 = plateConst * (2 / (bracedSpanM * bracedSpanM)) * Math.sqrt(youngsModulusPa / Math.max(100, effectiveDensityKgM3));
  const bracedPanelModeHz = Math.round(bracedF11);

  // Diagnostic warning for thin 3D printed panel walls or low perimeter/infill compliance
  let wallComplianceWarning: string | undefined = undefined;
  const perimeters = dimensions.perimeterShells ?? 6;
  if (isFilament) {
    if ((dimensions.baffleThicknessMm || 18) < 15) {
      wallComplianceWarning = 'Warning: 3D printed panel wall thickness < 15mm will induce flexural compliance bass losses under peak SPL enclosure pressure.';
    } else if (perimeters < 4 || infill < 25) {
      wallComplianceWarning = `Warning: Low slicer shell density (${perimeters} perimeters, ${infill}% infill) compromises acoustic airtightness and flexural stiffness. Use ≥ 5 perimeters and ≥ 35% Gyroid infill.`;
    }
  }

  // Spool calculation
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * (dimensions.baffleThicknessMm || 18));
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * (dimensions.baffleThicknessMm || 18));
  const intD = Math.max(50, dimensions.externalDepthMm - 2 * (dimensions.baffleThicknessMm || 18));
  const extVolM3 = (dimensions.externalWidthMm * dimensions.externalHeightMm * dimensions.externalDepthMm) * 1e-9;
  const intVolM3 = (intW * intH * intD) * 1e-9;
  const solidVolM3 = Math.max(0, extVolM3 - intVolM3);
  const filamentMassKg = solidVolM3 * effectiveDensityKgM3;
  const spoolCount = isFilament ? Math.ceil(Math.max(1, filamentMassKg)) : undefined;
  const spoolCostUsd = isFilament ? Math.round(spoolCount! * (spec.costPerKgUsd || 30) * 100) / 100 : undefined;

  // Base material damping loss factor eta + CLD system loss factor
  const baseDampingLossFactor = materialPricing?.customDampingFactor ?? spec.dampingFactor ?? (isMDF ? 0.035 : 0.022);
  const cldLossFactor = hasCLD
    ? Math.round(Math.min(0.45, baseDampingLossFactor + 0.28) * 1000) / 1000
    : Math.round(baseDampingLossFactor * 1000) / 1000;

  // Rigging certified WLL (DGUV Vorschrift 17 / BGV C1 10:1 vs ANSI E1.8 7:1)
  const isCarbonComposite = materialType.includes('carbon_fiber');
  const ultimateBreakingLoadKg = isCarbonComposite ? 1250 : isFilament ? 500 : 850;
  const wllDguv10to1Kg = Math.round(ultimateBreakingLoadKg / 10);
  const wllAnsi7to1Kg = Math.round(ultimateBreakingLoadKg / 7);

  // ISO 9053 Porous sound absorption resistivity
  const flowResistivityMap: Record<string, number> = {
    recycled_denim: 18000,
    melamine_basotect: 11000,
    pu_foam: 6500,
    dacron_polyfill: 3500,
    sheep_wool: 5500,
  };
  const staticAirflowResistivityRaylsM = flowResistivityMap[absorptionType] || 18000;

  // Surface Finish Acoustic Telemetry
  const activeFinishKey = dimensions.surfaceFinish || 'natural_hardwood_veneer';
  const finishSpec = SURFACE_FINISH_SPECS[activeFinishKey] || SURFACE_FINISH_SPECS.natural_hardwood_veneer;
  const extSurfaceAreaM2 = 2 * (dimensions.externalWidthMm * dimensions.externalHeightMm + dimensions.externalHeightMm * dimensions.externalDepthMm + dimensions.externalWidthMm * dimensions.externalDepthMm) * 1e-6;
  const addedFinishMassKg = Math.round(extSurfaceAreaM2 * finishSpec.addedDensityKgM2 * 100) / 100;
  const addedFinishCostUsd = Math.round(extSurfaceAreaM2 * finishSpec.costPerM2 * 100) / 100;

  const substrateArealMass = effectiveDensityKgM3 * hM;
  const rawPanelModeHz = bracedPanelModeHz;
  const finishPanelModeHz = Math.round(rawPanelModeHz * Math.sqrt(substrateArealMass / (substrateArealMass + finishSpec.addedDensityKgM2)));
  const compositeLossFactor = Math.round((cldLossFactor + finishSpec.lossFactor) * 1000) / 1000;
  const panelRingingAttenuationDb = Math.round((20 * Math.log10(rawPanelModeHz / Math.max(1, finishPanelModeHz)) + 10 * Math.log10(1 + (cldLossFactor + finishSpec.lossFactor) / 0.016)) * 10) / 10;

  return {
    bendingStiffnessNm,
    fundamentalPanelModeHz,
    bracedPanelModeHz,
    matrixBraceSpanMm: targetSpanMm,
    cldLossFactor,
    wllDguv10to1Kg,
    wllAnsi7to1Kg,
    absorptionMaterial: absorptionType.replace('_', ' ').toUpperCase(),
    staticAirflowResistivityRaylsM,
    isothermalVolumeEnhancementFactor: 1.18,
    finishSpec,
    addedFinishMassKg,
    addedFinishCostUsd,
    rawPanelModeHz,
    finishPanelModeHz,
    panelRingingAttenuationDb,
    compositeLossFactor,
    isFilamentMaterial: isFilament,
    effectiveDensityKgM3,
    flexuralModulusGpa,
    poissonRatio: nu,
    dampingLossFactor: baseDampingLossFactor,
    longitudinalWaveSpeedMs,
    spoolCount,
    spoolCostUsd,
    wallComplianceWarning,
    balticBirchReferenceModeHz,
  };
}

/**
 * Acoustic Damping Advisor Engine
 * Calculates recommended damping material type, fill density, mass in grams,
 * virtual volume expansion factor, and target Qtc adjustment.
 */
export function calculateDampingAdvisor(
  enclosureVolumeLiters: number,
  dimensions: EnclosureDimensions,
  targetQtc: number,
  driver: DriverPreset,
  alignment: AlignmentType,
  selectedMaterial?: DampingMaterialType,
  currentFillPercent: number = 50
): DampingAdvisorReport {
  const vb = Math.max(1, enclosureVolumeLiters);
  // Raw sealed Qtc before internal damping
  const rawQtc = Math.round(driver.qts * Math.sqrt(1 + driver.vas / vb) * 1000) / 1000;

  let recommendedMaterial: DampingMaterialType = 'dacron_polyfill';
  let recommendedFillPercent = 50;
  let applicationMethod: 'chamber_stuffing' | 'perimeter_lining' | 'selective_rear_lining' = 'chamber_stuffing';
  const placementGuidelines: string[] = [];

  if (alignment === 'ported') {
    // Ported enclosures require perimeter wall lining to prevent choking port air velocity
    recommendedMaterial = 'pu_foam';
    recommendedFillPercent = 35;
    applicationMethod = 'perimeter_lining';
    placementGuidelines.push(
      'Line rear, top, and side panels with 25-35mm convoluted egg-crate foam to trap internal standing waves.',
      'Maintain an unobstructed exclusion zone of at least 1.5x port diameter (~100-150mm) around the internal port inlet to prevent air choking and chuffing.',
      'Leave the bottom panel and front baffle unlined around ports and woofer frames.'
    );
  } else {
    // Sealed box damping
    applicationMethod = 'chamber_stuffing';
    if (rawQtc > targetQtc + 0.12) {
      // Significant Q lowering and virtual volume expansion needed
      recommendedMaterial = 'sheep_wool';
      recommendedFillPercent = Math.min(85, Math.max(50, Math.round(((rawQtc - targetQtc) / 0.25) * 60 + 40)));
      placementGuidelines.push(
        'Tease and distribute natural long-fiber sheep wool evenly across the entire chamber volume.',
        'High specific heat capacity provides up to +18% isothermal volume expansion, critically lowering system Qtc toward target.',
        'Ensure a 25mm breathing pocket behind the driver pole piece vent for thermal airflow.'
      );
    } else {
      // Moderate damping needed
      recommendedMaterial = 'dacron_polyfill';
      recommendedFillPercent = Math.min(75, Math.max(30, Math.round(((rawQtc - targetQtc) / 0.15) * 40 + 35)));
      placementGuidelines.push(
        'Fluff polyester fiberfill lightly throughout the enclosure chamber; do not compress into dense bats.',
        'Provides smooth adiabatic-to-isothermal transition with up to +12% effective volume boost.',
        'Fasten a light open-weave scrim over woofer cutout to prevent stray fibers from contacting voice coil gap.'
      );
    }
  }

  const activeMaterialKey = selectedMaterial || recommendedMaterial;
  const activeSpec = DAMPING_MATERIAL_SPECS[activeMaterialKey] || DAMPING_MATERIAL_SPECS.dacron_polyfill;
  const activeFill = currentFillPercent !== undefined ? currentFillPercent : recommendedFillPercent;

  // Mass in grams: Vb (L) * density (g/L) * (fill / 100)
  const recommendedMassGrams = Math.round(vb * activeSpec.typicalDensityGPerL * (activeFill / 100));

  // Lining area
  const wallT = dimensions.baffleThicknessMm || 18;
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - 2 * wallT);
  const internalSurfaceAreaM2 = (2 * (intW * intH + intH * intD + intW * intD)) * 1e-6;
  const recommendedLiningAreaM2 =
    Math.round(internalSurfaceAreaM2 * Math.min(0.85, (activeFill / 100) * 1.1) * 100) / 100;

  // Virtual volume expansion
  const expansionRatio = (activeSpec.maxIsothermalExpansionPercent / 100) * (activeFill / 100);
  const virtualVolumeExpansionLiters = Math.round(vb * expansionRatio * 10) / 10;
  const effectiveVolumeLiters = Math.round((vb + virtualVolumeExpansionLiters) * 10) / 10;

  // Predicted Qtc: combines volume expansion factor and absorption resistance Qa
  const volumeEffectFactor = Math.sqrt(vb / effectiveVolumeLiters);
  const absorptionQa = Math.max(8, 30 - 20 * (activeFill / 100));
  const rawQFactor = rawQtc * volumeEffectFactor;
  const predictedQtc = Math.round(((rawQFactor * absorptionQa) / (rawQFactor + absorptionQa)) * 1000) / 1000;

  // Alternatives comparison
  const allKeys: DampingMaterialType[] = [
    'dacron_polyfill',
    'pu_foam',
    'sheep_wool',
    'melamine_basotect',
    'recycled_denim',
  ];

  const alternatives = allKeys.map((key) => {
    const spec = DAMPING_MATERIAL_SPECS[key];
    const mass = Math.round(vb * spec.typicalDensityGPerL * (activeFill / 100));
    let advantage = '';
    let tradeoff = '';

    if (key === 'dacron_polyfill') {
      advantage = 'Clean, synthetic, cost-effective, non-allergenic, stable over decades.';
      tradeoff = 'Slightly lower isothermal expansion than pure natural sheep wool.';
    } else if (key === 'pu_foam') {
      advantage = 'Sculpted egg-crate profile suppresses specular flutter echoes without restricting bulk air travel.';
      tradeoff = 'Negligible virtual volume expansion (+2.5%); wall lining only.';
    } else if (key === 'sheep_wool') {
      advantage = 'Highest thermal mass & heat capacity; delivers maximum isothermal volume expansion (+18%).';
      tradeoff = 'Higher cost per kg and requires clean handling.';
    } else if (key === 'melamine_basotect') {
      advantage = 'Class-A flame retardant studio standard with exceptional high-mid dissipation.';
      tradeoff = 'Fragile open-cell matrix requiring gentle handling during installation.';
    } else {
      advantage = 'Heavy recycled cotton fiber dissipates low-mid energy effectively; eco-friendly.';
      tradeoff = 'Heavier per unit area; denser packing can cause uneven distribution if not spaced.';
    }

    return {
      material: key,
      spec,
      massGrams: mass,
      advantage,
      tradeoff,
    };
  });

  return {
    recommendedMaterial,
    recommendedMaterialSpec: DAMPING_MATERIAL_SPECS[recommendedMaterial],
    recommendedFillPercent,
    recommendedMassGrams,
    recommendedLiningAreaM2,
    virtualVolumeExpansionLiters,
    effectiveVolumeLiters,
    rawQtc,
    predictedQtc,
    targetQtc,
    alignment,
    applicationMethod,
    placementGuidelines,
    alternatives,
  };
}

export const DEFAULT_PROCEDURAL_DIFFUSER_CONFIG: ProceduralDiffuserConfig = {
  enabled: false,
  type: 'qrd_1d',
  targetWall: 'rear',
  primeN: 13,
  designFreqHz: 1200,
  wellWidthMm: 22,
  finThicknessMm: 2.5,
  materialType: 'petg_cf',
};

/**
 * Synthesizes a Schroeder Quadratic Residue Diffuser (QRD 1D: s_n = n^2 mod N)
 * or 2D Primitive Root / Skyline Diffuser (s_{n,m} = (n^2 + m^2) mod N)
 * to scatter internal standing waves without sacrificing bass reflex airflow.
 */
export function calculateProceduralDiffuser(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  standingWaves: StandingWaveReport
): ProceduralDiffuserReport {
  const cfg: ProceduralDiffuserConfig = {
    ...DEFAULT_PROCEDURAL_DIFFUSER_CONFIG,
    ...(dimensions.diffuserConfig || {}),
    ...(acoustics.diffuserConfig || {}),
  };

  const wallT = dimensions.baffleThicknessMm || 18;
  const intW = Math.max(80, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(80, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(80, dimensions.externalDepthMm - 2 * wallT);

  const N = cfg.primeN || 13;
  const designF = Math.max(400, Math.min(4000, cfg.designFreqHz || standingWaves.axialDepthHz || 1200));
  const cMmS = 343000;
  const designLambdaMm = cMmS / designF;

  // Maximum theoretical Schroeder well depth d_max = ((N - 1) / N) * (lambda_0 / 2)
  // Clamped safely to <= 28% of internal cabinet depth so it never collides with the woofer magnet
  const rawMaxDepthMm = ((N - 1) / N) * (designLambdaMm / 2);
  const maxWellDepthMm = Math.round(Math.min(intD * 0.28, Math.max(18, rawMaxDepthMm)) * 10) / 10;

  const wellDepthsMm: number[] = [];
  for (let n = 0; n < N; n++) {
    const seq = (n * n) % N;
    const dMm = Math.round(((seq / N) * maxWellDepthMm) * 10) / 10;
    wellDepthsMm.push(dMm);
  }

  let skylineMatrixMm: number[][] | undefined = undefined;
  if (cfg.type === 'skyline_2d') {
    skylineMatrixMm = [];
    for (let r = 0; r < N; r++) {
      const row: number[] = [];
      for (let c = 0; c < N; c++) {
        const seq = (r * r + c * c) % N;
        row.push(Math.round(((seq / N) * maxWellDepthMm) * 10) / 10);
      }
      skylineMatrixMm.push(row);
    }
  }

  const lowCutoffFreqHz = Math.round(cMmS / (2 * Math.max(15, maxWellDepthMm)));
  const highCutoffFreqHz = Math.round(cMmS / (2 * Math.max(8, cfg.wellWidthMm)));
  const bandwidthOctaves = Math.round(Math.max(0.5, Math.log2(highCutoffFreqHz / Math.max(100, lowCutoffFreqHz))) * 10) / 10;

  const diffusionCoefficientMid = cfg.type === 'skyline_2d' ? 0.78 : 0.69;
  const scatteringCoefficientMid = cfg.type === 'skyline_2d' ? 0.86 : 0.76;
  const backWaveAbsorptionGainDb = cfg.type === 'skyline_2d' ? 8.4 : 6.8;

  const totalCoveredWalls =
    cfg.targetWall === 'rear' ? 1 : cfg.targetWall === 'sides' || cfg.targetWall === 'top_bottom' ? 2 : 5;

  const panelWidthMm = Math.round(intW * 0.82);
  const panelHeightMm = Math.round(intH * 0.76);
  const avgDepthMm = maxWellDepthMm * 0.48;

  const singleWallVolLiters = (panelWidthMm * panelHeightMm * avgDepthMm) * 1e-6;
  const displacedVolumeLiters = cfg.enabled
    ? Math.round(singleWallVolLiters * totalCoveredWalls * 0.42 * 100) / 100
    : 0;

  const matMap: Record<ProceduralDiffuserConfig['materialType'], { name: string; density: number }> = {
    petg_cf: { name: 'Carbon-Fiber PETG (PETG-CF)', density: 1250 },
    pla_cf: { name: 'Carbon-Fiber PLA (PLA-CF)', density: 1240 },
    mdf_wood: { name: 'CNC Milled HDF/Birch', density: 750 },
    rigid_pu_resin: { name: 'Cast Rigid Polyurethane Resin', density: 1180 },
  };
  const matInfo = matMap[cfg.materialType] || matMap.petg_cf;
  const totalMassKg = Math.round(displacedVolumeLiters * 1e-3 * matInfo.density * 100) / 100;

  const wooferDepthMm = acoustics.driverAssignments.woofer.driver.mountingDepthMm || 110;
  const clearanceToDriverMagnetMm = Math.round(intD - wooferDepthMm - maxWellDepthMm);
  const hasMagnetClash = clearanceToDriverMagnetMm < 15;

  const targetedModes = standingWaves.eigenmodes.slice(0, 3).map((m) => ({
    axis: m.axis,
    harmonicModeHz: m.frequencyHz,
    rawQ: m.severity === 'high' ? 14.5 : 9.2,
    dampedQ: m.severity === 'high' ? 4.2 : 3.1,
    attenuationDb: cfg.type === 'skyline_2d' ? -8.4 : -6.8,
    mitigationStatus: (m.frequencyHz >= lowCutoffFreqHz * 0.7 ? 'suppressed' : 'diffused') as
      | 'suppressed'
      | 'diffused'
      | 'unaffected',
  }));

  const recommendations: string[] = [
    `Schroeder Prime N=${N} ${cfg.type === 'skyline_2d' ? '2D Hemispherical Skyline' : '1D Quadratic Residue'} array scatters specular rear-wall reflections across ${lowCutoffFreqHz} Hz – ${highCutoffFreqHz} Hz (${bandwidthOctaves} octaves).`,
    `Attenuates primary axial standing wave (${standingWaves.axialDepthHz} Hz) by ${backWaveAbsorptionGainDb} dB without restricting bass-reflex port air velocity.`,
  ];
  if (hasMagnetClash) {
    recommendations.push(
      `Caution: Only ${clearanceToDriverMagnetMm}mm clearance between diffuser wells and woofer magnet. Increase cabinet depth or raise design frequency.`
    );
  }

  return {
    enabled: cfg.enabled,
    type: cfg.type,
    typeLabel: cfg.type === 'skyline_2d' ? `2D Skyline Primitive Root (N=${N}×${N})` : `1D Schroeder QRD Array (N=${N})`,
    targetWall: cfg.targetWall,
    targetWallLabel:
      cfg.targetWall === 'rear'
        ? 'Rear Wall Behind Woofer'
        : cfg.targetWall === 'sides'
        ? 'Left & Right Side Walls'
        : cfg.targetWall === 'top_bottom'
        ? 'Top & Bottom Panels'
        : 'Full 5-Wall Anechoic Array',
    primeN: N,
    designFreqHz: designF,
    lowCutoffFreqHz,
    highCutoffFreqHz,
    bandwidthOctaves,
    diffusionCoefficientMid,
    scatteringCoefficientMid,
    backWaveAbsorptionGainDb,
    primaryAttenuatedModeHz: standingWaves.axialDepthHz,
    primaryAttenuationDb: -backWaveAbsorptionGainDb,
    targetedModes,
    maxWellDepthMm,
    wellDepthsMm,
    skylineMatrixMm,
    totalCoveredWalls,
    panelWidthMm,
    panelHeightMm,
    wellWidthMm: cfg.wellWidthMm,
    finThicknessMm: cfg.finThicknessMm,
    displacedVolumeLiters,
    totalMassKg,
    materialName: matInfo.name,
    materialDensityKgM3: matInfo.density,
    clearanceToDriverMagnetMm,
    hasMagnetClash,
    recommendations,
  };
}

/**
 * Physics-Weighted Reference Caliber Evaluator (0–100 Master Reference Index)
 * Synthesizes 6 coupled electro-acoustic, aero-acoustic, thermal, structural,
 * wavefront diffraction, and crossover linearity sub-scores into a single deterministic metric.
 */
export function evaluateSpeakerCaliber(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  results: AcousticCalculationResult
): SpeakerCaliberReport {
  const woofer = acoustics.driverAssignments.woofer.driver;
  const wooferQty =
    dimensions.subcategory === 'dual_18_reflex'
      ? 2
      : acoustics.topology === 'mtm'
      ? 2
      : acoustics.driverAssignments.woofer.quantity || 1;

  const optimal = calculateOptimalAlignment(woofer, acoustics.alignment);
  const vbTargetLiters = Math.round(optimal.optimalVbLiters * wooferQty * 10) / 10;
  const vbDiffL = Math.abs(results.netVolumeLiters - vbTargetLiters);
  const vbDeviationPercent = Math.round((vbDiffL / Math.max(1, vbTargetLiters)) * 1000) / 10;

  const fbTargetHz = optimal.optimalFbHz;
  const fbDeviationHz =
    acoustics.alignment === 'ported'
      ? Math.round(Math.abs(results.tuningFrequencyFb - fbTargetHz) * 10) / 10
      : Math.round(Math.abs(results.boxQtc - optimal.targetQtc) * 100);

  const activeImprovements: string[] = [];
  const limitingFactors: string[] = [];

  // 1. Thiele-Small Alignment Fidelity (0-100)
  let alignmentScore = 100;
  if (vbDeviationPercent > 5) {
    alignmentScore -= Math.min(35, (vbDeviationPercent - 5) * 0.85);
  }
  if (acoustics.alignment === 'ported') {
    if (fbDeviationHz > 1.5) {
      alignmentScore -= Math.min(25, (fbDeviationHz - 1.5) * 3.0);
    }
  } else {
    const qtcDiff = Math.abs(results.boxQtc - optimal.targetQtc);
    if (qtcDiff > 0.04) {
      alignmentScore -= Math.min(25, (qtcDiff - 0.04) * 110);
    }
  }
  if (results.driverCompatibility?.status === 'incompatible') {
    alignmentScore -= 28;
    limitingFactors.push('Transducer / archetype mismatch');
  } else if (results.driverCompatibility?.status === 'suboptimal') {
    alignmentScore -= 10;
  } else {
    activeImprovements.push(`Matched ${woofer.brand} ${woofer.model} (${results.netVolumeLiters}L)`);
  }
  alignmentScore = Math.max(25, Math.min(100, Math.round(alignmentScore * 10) / 10));

  // 2. Aero-Acoustic Laminar Port & Karal-Fok Relief (0-100)
  const catSpec = CATEGORY_SPECS[dimensions.category || 'studio_monitor'] || CATEGORY_SPECS.studio_monitor;
  const maxVel = catSpec.maxRecommendedPortVelocityMs || 14;
  let aeroPortScore = 100;
  if (acoustics.alignment !== 'sealed') {
    const velRatio = results.portAirVelocityMs / Math.max(1, maxVel);
    if (results.isChuffingRisk || velRatio > 1.0) {
      aeroPortScore -= Math.min(48, 18 + (velRatio - 1.0) * 55);
      limitingFactors.push(`Port turbulence risk (${results.portAirVelocityMs} m/s > ${maxVel} m/s)`);
    } else if (velRatio > 0.85) {
      aeroPortScore -= (velRatio - 0.85) * 40;
    } else {
      activeImprovements.push(`Laminar port flow (${results.portAirVelocityMs} m/s, Mach ${(results.portAirVelocityMs / 343).toFixed(3)})`);
    }
    if ((acoustics.flareRadiusMm || 0) >= 15 || (acoustics.slotLipRadiusMm || 0) >= 14) {
      aeroPortScore = Math.min(100, aeroPortScore + 3);
    }
    if (results.layout?.airflowInterference?.hasInterference) {
      aeroPortScore -= 15;
      limitingFactors.push('Internal port intake clearance restriction');
    }
  } else {
    activeImprovements.push('Sealed acoustic suspension (zero port turbulence)');
  }
  if ((acoustics.braceApertureChamferDeg ?? 45) >= 30) {
    aeroPortScore = Math.min(100, aeroPortScore + 2);
  }
  aeroPortScore = Math.max(25, Math.min(100, Math.round(aeroPortScore * 10) / 10));

  // 3. Klippel Thermal Headroom & Rear Convective Venting (0-100)
  let thermalHeadroomScore = 100;
  const thermalReport = results.thermalVentReport;
  const continuousPeW = thermalReport?.driverContinuousPowerW || woofer.pe * wooferQty;
  // Evaluate continuous AES thermal compression
  const continuousThermal = calculateKlippelThermalShift(
    woofer,
    'nominal_aes',
    thermalReport
  );
  if (continuousThermal.powerCompressionDb > 1.25) {
    thermalHeadroomScore -= Math.min(35, (continuousThermal.powerCompressionDb - 1.0) * 26);
    if (!thermalReport?.enabled) {
      limitingFactors.push(`Unvented voice-coil thermal compression (${continuousThermal.powerCompressionDb} dB)`);
    }
  }
  if (thermalReport?.enabled) {
    thermalHeadroomScore = Math.min(100, thermalHeadroomScore + 8);
    activeImprovements.push(
      `Rear Thermal Vents active (${thermalReport.slotCount} slots, -${thermalReport.powerCompressionSavedDb} dB compression)`
    );
  } else if (continuousPeW > 280) {
    thermalHeadroomScore -= 12;
    limitingFactors.push(`High continuous power (${continuousPeW}W RMS) without Rear Thermal Vents`);
  }
  thermalHeadroomScore = Math.max(30, Math.min(100, Math.round(thermalHeadroomScore * 10) / 10));

  // 4. Vibro-Acoustic Structural Inertness (Rayleigh-Ritz f11 vs f_xo) (0-100)
  let structuralModalScore = 100;
  const bracedF11 = results.mechanics.bracedPanelModeHz || 500;
  const xoLow = acoustics.crossoverLowHz || 2200;
  const effectivePassbandTopHz =
    dimensions.category === 'studio_sub' || dimensions.category === 'live_sub'
      ? 160
      : Math.min(450, xoLow * 0.35);
  const panelEigenfrequencyRatio =
    Math.round((bracedF11 / Math.max(80, effectivePassbandTopHz)) * 100) / 100;

  if (panelEigenfrequencyRatio < 1.35) {
    structuralModalScore -= Math.min(35, (1.35 - panelEigenfrequencyRatio) * 55);
    limitingFactors.push(`Panel eigenmode f11 (${bracedF11} Hz) near woofer passband`);
  } else {
    activeImprovements.push(`Inert braced cabinet (f11 = ${bracedF11} Hz, ${acoustics.bracingLevel} bracing)`);
  }
  if (results.mechanics.wallComplianceWarning) {
    structuralModalScore -= 22;
    limitingFactors.push('Thin 3D-printed wall compliance warning');
  }
  if (acoustics.integralMatrixConfig?.enabled) {
    structuralModalScore = Math.min(100, structuralModalScore + 6);
    activeImprovements.push('TPMS Gyroid structural core active');
  }
  structuralModalScore = Math.max(30, Math.min(100, Math.round(structuralModalScore * 10) / 10));

  // 5. Wavefront Diffraction & Internal Modal Damping (0-100)
  let diffractionDampingScore = 100;
  if (results.waveguide && !results.waveguide.isDiffractionSuppressed) {
    diffractionDampingScore -= 14;
    limitingFactors.push(
      `Baffle edge radius (${results.waveguide.actualBaffleEdgeRadiusMm}mm < ${results.waveguide.minBaffleEdgeRadiusMm}mm λ/8)`
    );
  } else if (results.waveguide) {
    activeImprovements.push(`Diffraction-suppressed baffle (R${results.waveguide.actualBaffleEdgeRadiusMm}mm)`);
  }
  if (results.standingWaves.standingWaveRiskLevel === 'high') {
    diffractionDampingScore -= 18;
    limitingFactors.push('High internal standing-wave risk');
  } else if (results.standingWaves.standingWaveRiskLevel === 'moderate') {
    diffractionDampingScore -= 6;
  }
  if (results.dampingAdvisor) {
    const fillDiff = Math.abs(
      (acoustics.dampingFillPercent ?? 50) - results.dampingAdvisor.recommendedFillPercent
    );
    if (fillDiff > 15) {
      diffractionDampingScore -= 8;
    }
  }
  diffractionDampingScore = Math.max(30, Math.min(100, Math.round(diffractionDampingScore * 10) / 10));

  // 6. Electro-Acoustic Crossover, Baffle-Step & Terminal Linearity (0-100)
  let electroAcousticScore = 100;
  const baffleStepKneeHz = Math.round(115000 / Math.max(120, dimensions.externalWidthMm));
  if (results.layout?.hasCollision) {
    electroAcousticScore -= 35;
    limitingFactors.push('3D driver/port baffle collision');
  }
  if (
    results.speakonReport &&
    (results.speakonReport.hasChannelCapacityWarning ||
      results.speakonReport.isProhibitedConfiguration ||
      results.speakonReport.overallClashStatus !== 'clear')
  ) {
    electroAcousticScore -= 18;
    limitingFactors.push('Rear terminal configuration or depth clash');
  }
  if (acoustics.topology !== 'single') {
    const tweeter = acoustics.driverAssignments.tweeter.driver;
    const idealPadDb = Math.max(0, Math.round((tweeter.splSensitivityDb - woofer.splSensitivityDb) * 10) / 10);
    const padDiff = Math.abs((acoustics.driverAssignments.tweeter.attenuationDb ?? 0) - idealPadDb);
    if (padDiff > 2.5) {
      electroAcousticScore -= Math.min(15, (padDiff - 2.5) * 4);
      limitingFactors.push(`Tweeter L-pad attenuation mismatch (${padDiff.toFixed(1)} dB off target)`);
    } else {
      activeImprovements.push(`Synchronized LR${(acoustics.lowPassOrder || 2) * 2} crossover & Zobel network`);
    }
  }
  electroAcousticScore = Math.max(30, Math.min(100, Math.round(electroAcousticScore * 10) / 10));

  // Weighted Composite Reference Caliber Score (0-100)
  const overallScore =
    Math.round(
      (alignmentScore * 0.24 +
        aeroPortScore * 0.20 +
        thermalHeadroomScore * 0.16 +
        structuralModalScore * 0.16 +
        diffractionDampingScore * 0.12 +
        electroAcousticScore * 0.12) *
        10
    ) / 10;

  let gradeLabel: SpeakerCaliberGrade = 'Master Reference';
  if (overallScore < 70) {
    gradeLabel = 'Sub-Optimal';
  } else if (overallScore < 82) {
    gradeLabel = 'Production Grade';
  } else if (overallScore < 92) {
    gradeLabel = 'Studio Precision';
  }

  return {
    overallScore,
    gradeLabel,
    subScores: {
      alignmentScore,
      aeroPortScore,
      thermalHeadroomScore,
      structuralModalScore,
      diffractionDampingScore,
      electroAcousticScore,
    },
    activeImprovements: activeImprovements.slice(0, 5),
    limitingFactors: limitingFactors.slice(0, 4),
    vbTargetLiters,
    vbDeviationPercent,
    fbTargetHz,
    fbDeviationHz,
    panelEigenfrequencyRatio,
    baffleStepKneeHz,
  };
}


