import type {
  AcousticCalculationResult,
  AcousticParameters,
  AlignmentType,
  CardioidSubwooferConfig,
  DampingAdvisorReport,
  DampingMaterialSpec,
  DampingMaterialType,
  DriverPreset,
  EigenmodePoint,
  EnclosureDimensions,
  EnclosureMechanicsReport,
  GroupDelayCurvePoint,
  InternalReflectorConfig,
  KlippelThermalReport,
  MaterialCostResult,
  MaterialSpec,
  MaterialType,
  OblateSpheroidalWaveguideConfig,
  PortCatalogMatch,
  SpinoramaCurvePoint,
  StandingWaveReport,
  SurfaceFinishSpec,
  SurfaceFinishType,
} from '../types/loudspeaker.ts';
import { calculateCrossoverNetwork } from './crossoverEngine.ts';
import { computeBaffleLayout } from './baffleLayoutEngine.ts';

export const MATERIAL_SPECS: Record<MaterialType, MaterialSpec> = {
  baltic_birch_18: {
    id: 'baltic_birch_18',
    name: '18mm Baltic Birch Plywood (13-ply)',
    category: 'sheet_goods',
    nominalThicknessMm: 18,
    densityKgM3: 680,
    defaultCostPerM2: 68.0,
    flexuralModulusGpa: 12.5,
    dampingFactor: 0.022,
    textureColor: '#d6b88d',
    roughness: 0.65,
    badge: 'Birch 18mm: 12.5 GPa Reference',
  },
  baltic_birch_15: {
    id: 'baltic_birch_15',
    name: '15mm Baltic Birch Plywood (11-ply)',
    category: 'sheet_goods',
    nominalThicknessMm: 15,
    densityKgM3: 680,
    defaultCostPerM2: 58.0,
    flexuralModulusGpa: 12.5,
    dampingFactor: 0.02,
    textureColor: '#dfc49c',
    roughness: 0.65,
    badge: 'Birch 15mm: Light Cabinet',
  },
  mdf_19: {
    id: 'mdf_19',
    name: '19mm Premium MDF (Medium-Density Fibreboard)',
    category: 'sheet_goods',
    nominalThicknessMm: 19,
    densityKgM3: 750,
    defaultCostPerM2: 32.0,
    flexuralModulusGpa: 3.8,
    dampingFactor: 0.035,
    textureColor: '#967958',
    roughness: 0.8,
    badge: 'MDF 19mm: High Damping',
  },
  mdf_25: {
    id: 'mdf_25',
    name: '25mm Heavy Duty MDF (1-inch)',
    category: 'sheet_goods',
    nominalThicknessMm: 25,
    densityKgM3: 770,
    defaultCostPerM2: 45.0,
    flexuralModulusGpa: 4.0,
    dampingFactor: 0.038,
    textureColor: '#8a6e4d',
    roughness: 0.82,
    badge: 'MDF 25mm: High Inertia',
  },
  marine_ply_18: {
    id: 'marine_ply_18',
    name: '18mm Marine Grade Okoume Plywood',
    category: 'sheet_goods',
    nominalThicknessMm: 18,
    densityKgM3: 500,
    defaultCostPerM2: 85.0,
    flexuralModulusGpa: 10.5,
    dampingFactor: 0.025,
    textureColor: '#c59567',
    roughness: 0.6,
    badge: 'Marine Ply: Moisture Resistant',
  },
  solid_hardwood_20: {
    id: 'solid_hardwood_20',
    name: '20mm Solid Black Walnut / Hard Maple',
    category: 'sheet_goods',
    nominalThicknessMm: 20,
    densityKgM3: 720,
    defaultCostPerM2: 120.0,
    flexuralModulusGpa: 13.2,
    dampingFactor: 0.015,
    textureColor: '#5c3a21',
    roughness: 0.55,
    badge: 'Hardwood 20mm: Luxury Solid',
  },
  petg_cf: {
    id: 'petg_cf',
    name: 'Carbon Fiber PETG (PETG-CF)',
    category: 'filaments',
    nominalThicknessMm: 18,
    densityKgM3: 1260,
    defaultCostPerM2: 0,
    costPerKgUsd: 38.0,
    flexuralModulusGpa: 4.8,
    dampingFactor: 0.028,
    textureColor: '#22252a',
    roughness: 0.72,
    badge: 'PETG-CF: 4.8 GPa - High Heat & Toughness',
  },
  pla_standard: {
    id: 'pla_standard',
    name: 'Standard PLA Thermoplastic',
    category: 'filaments',
    nominalThicknessMm: 18,
    densityKgM3: 1240,
    defaultCostPerM2: 0,
    costPerKgUsd: 20.0,
    flexuralModulusGpa: 3.8,
    dampingFactor: 0.018,
    textureColor: '#1e2025',
    roughness: 0.35,
    badge: 'Standard PLA: 3.8 GPa - Low Cost Prototyping',
  },
  pla_cf: {
    id: 'pla_cf',
    name: 'Carbon Fiber PLA (PLA-CF)',
    category: 'filaments',
    nominalThicknessMm: 18,
    densityKgM3: 1250,
    defaultCostPerM2: 0,
    costPerKgUsd: 34.0,
    flexuralModulusGpa: 5.4,
    dampingFactor: 0.024,
    textureColor: '#181a1d',
    roughness: 0.72,
    badge: 'PLA-CF: 5.4 GPa - Maximum Rigidity',
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
    description: 'Compact annular polymer ring diaphragm neodymium compression driver with low distortion and smooth top-end transient response.',
  },
];

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

export const COTS_PORT_CATALOG = [
  { name: 'Precision Port 2" Flared Aeroport Kit', innerDiameterMm: 50.8, maxCutLengthMm: 350, type: 'round' },
  { name: 'Precision Port 3" Flared Aeroport Kit', innerDiameterMm: 76.2, maxCutLengthMm: 450, type: 'round' },
  { name: 'Precision Port 4" Flared Aeroport Kit', innerDiameterMm: 101.6, maxCutLengthMm: 500, type: 'round' },
  { name: 'Precision Port 6" Flared Aeroport Kit', innerDiameterMm: 152.4, maxCutLengthMm: 600, type: 'round' },
  { name: 'Schedule 40 2" PVC Pipe', innerDiameterMm: 52.5, maxCutLengthMm: 600, type: 'round' },
  { name: 'Schedule 40 3" PVC Pipe', innerDiameterMm: 77.9, maxCutLengthMm: 600, type: 'round' },
  { name: 'Schedule 40 4" PVC Pipe', innerDiameterMm: 102.3, maxCutLengthMm: 600, type: 'round' },
  { name: 'Schedule 40 6" PVC Pipe', innerDiameterMm: 154.1, maxCutLengthMm: 600, type: 'round' },
];

function evaluatePortCatalogMatch(
  portType: 'round' | 'slot',
  portDiameterMm: number,
  portLengthMm: number,
  portAirVelocityMs: number,
  optimalFlareRadiusMm: number,
  intD: number
): PortCatalogMatch {
  const isLaminar = portAirVelocityMs <= 17;
  const salvattiFlareRadiusMm = Math.max(14, Math.round((portDiameterMm / 2) * 0.5)); // Salvatti criterion: rf >= 0.5 * r_inner
  const mountingCollarDiameterMm = Math.round((portDiameterMm + 2 * salvattiFlareRadiusMm + 14) * 10) / 10;

  const needsModularSplit = portLengthMm > 220;
  const splitSegmentCount = needsModularSplit ? Math.ceil(portLengthMm / 180) : 1;
  const printDimensionsMm = {
    widthMm: mountingCollarDiameterMm,
    heightMm: mountingCollarDiameterMm,
    depthMm: portLengthMm,
  };

  if (portType === 'round' && isLaminar) {
    const cotsMatch = COTS_PORT_CATALOG.find((item) => {
      const dev = Math.abs(item.innerDiameterMm - portDiameterMm) / portDiameterMm;
      return dev <= 0.05 && portLengthMm <= item.maxCutLengthMm && portLengthMm <= (intD - 35);
    });

    if (cotsMatch) {
      return {
        status: 'cots_available',
        cotsPartName: cotsMatch.name,
        cotsInnerDiameterMm: cotsMatch.innerDiameterMm,
        cotsCutLengthMm: portLengthMm,
        printDimensionsMm,
        needsModularSplit: false,
        splitSegmentCount: 1,
        structuralWallThicknessMm: 3.0,
        mountingCollarDiameterMm,
        salvattiFlareRadiusMm,
        peakVelocityMs: Math.round(portAirVelocityMs * 10) / 10,
        isLaminar: true,
        reason: `Standard commercial match found (${cotsMatch.name}). Requires standard tube cutting to ${portLengthMm}mm.`,
      };
    }
  }

  let reason = 'Custom aerodynamic geometry required for zero-chuffing laminar boundary conditions.';
  if (portAirVelocityMs > 17) {
    reason = `Air velocity (${Math.round(portAirVelocityMs * 10) / 10} m/s) exceeds 17 m/s boundary layer threshold; custom Salvatti flared bellmouth required.`;
  } else if (portType === 'slot') {
    reason = 'Custom slot port architecture optimized for cabinet structural shelf bracing.';
  } else if (needsModularSplit) {
    reason = `Port length (${portLengthMm}mm) exceeds standard 220mm printer Z-height; parametric split into ${splitSegmentCount} interlocking slip-fit segments.`;
  }

  return {
    status: 'custom_3d_print',
    printDimensionsMm,
    needsModularSplit,
    splitSegmentCount,
    structuralWallThicknessMm: 3.0,
    mountingCollarDiameterMm,
    salvattiFlareRadiusMm,
    peakVelocityMs: Math.round(portAirVelocityMs * 10) / 10,
    isLaminar,
    reason,
  };
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

  // Internal dimensions (mm)
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - (baffleT + wallT));

  const grossVolumeLiters = (intW * intH * intD) / 1000000;

  // Woofer volume displacement
  const wooferAssign = driverAssignments.woofer;
  const wooferQuantity = topology === 'mtm' ? 2 : (wooferAssign.quantity || 1);
  const wooferSingle = wooferAssign.driver;
  const driverDisplacementLiters = (wooferSingle.displacementLiters || 1.5) * wooferQuantity;

  // Midrange isolated chamber
  let midrangeChamberVolumeLiters = 0;
  if (topology === 'three_way') {
    const midDrv = driverAssignments.midrange.driver;
    midrangeChamberVolumeLiters = Math.max(1.2, (midDrv.vas || 6.5) * 0.25);
  }

  // Bracing displacement
  let bracingMultiplier = 0.04;
  if (bracingLevel === 'standard') bracingMultiplier = 0.08;
  if (bracingLevel === 'heavy') bracingMultiplier = 0.14;
  const bracingDisplacementLiters = grossVolumeLiters * bracingMultiplier;

  // Damping virtual volume factor using material-specific isothermal conversion rate
  const activeDampingMatKey = acousticParams.absorptionMaterialType || 'dacron_polyfill';
  const activeDampingMatSpec = DAMPING_MATERIAL_SPECS[activeDampingMatKey] || DAMPING_MATERIAL_SPECS.dacron_polyfill;
  const dampingVirtualFactor = 1 + (dampingFillPercent / 100) * (activeDampingMatSpec.maxIsothermalExpansionPercent / 100);

  // Port area & end correction factor
  let portAreaCm2 = 0;
  let effectiveDvCm = 0;
  let kEndCorrection = 0.732;

  // Optimal flare radius recommendation (Salvatti criterion: rf >= 0.5 * r_inner)
  const optimalFlareRadiusMm = Math.max(14, Math.round((portDiameterMm / 2) * 0.5));
  const activeFlareRadiusMm = flareRadiusMm || optimalFlareRadiusMm;

  if (portType === 'round') {
    const radiusCm = (portDiameterMm / 10) / 2;
    portAreaCm2 = Math.PI * radiusCm * radiusCm * numberOfPorts;
    effectiveDvCm = (portDiameterMm / 10);
    // Flare end-correction modifier
    // Flared termination increases effective end correction length
    const flareRatio = (activeFlareRadiusMm / 10) / radiusCm;
    const singleFlareCorrection = 0.732 + 0.5 * Math.min(1.2, flareRatio);
    kEndCorrection = isDoubleFlared ? singleFlareCorrection * 1.8 : singleFlareCorrection;
  } else {
    // Slot Port: slotWidthMm x slotHeightMm
    const activeSlotW = slotWidthMm || Math.max(100, intW);
    const activeSlotH = slotHeightMm || 45;
    const wCm = activeSlotW / 10;
    const hCm = activeSlotH / 10;
    portAreaCm2 = wCm * hCm * numberOfPorts;
    // Hydraulic diameter: Dh = 2 * W * H / (W + H)
    const dhCm = (2 * wCm * hCm) / Math.max(0.1, wCm + hCm);
    effectiveDvCm = Math.sqrt((portAreaCm2 / numberOfPorts) * 4 / Math.PI);
    // Slot port on floor has half-space boundary termination: k ~ 1.25 to 1.5
    kEndCorrection = 1.35;
  }

  let activeFb = targetFb;
  if (alignment === 'sealed') {
    activeFb = wooferSingle.fs * (targetQtc / wooferSingle.qts);
  }

  let estNetVb = grossVolumeLiters - driverDisplacementLiters - bracingDisplacementLiters - midrangeChamberVolumeLiters;
  if (estNetVb <= 1) estNetVb = 1;

  let portLengthMm = 0;
  let portDisplacementLiters = 0;

  if (alignment !== 'sealed' && portAreaCm2 > 0 && activeFb > 10) {
    const effectiveApPerPort = portAreaCm2 / numberOfPorts;
    let currentVb = estNetVb;

    for (let iter = 0; iter < 3; iter++) {
      // Lv (cm) = (23562.5 * Ap / (Fb^2 * Vb)) - (k * Dv)
      const lvCm = (23562.5 * effectiveApPerPort / (activeFb * activeFb * currentVb)) - (kEndCorrection * (effectiveDvCm / 2));
      const computedLengthCm = Math.max(4, lvCm);
      const outerRadiusCm = (effectiveDvCm / 2) + (portType === 'round' ? 0.35 : 1.8);
      const outerApCm2 = Math.PI * outerRadiusCm * outerRadiusCm;
      portDisplacementLiters = ((outerApCm2 * computedLengthCm * numberOfPorts) / 1000);
      currentVb = Math.max(1, estNetVb - portDisplacementLiters);
      portLengthMm = Math.round(computedLengthCm * 10);
    }
  }

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

  // Richard Small air velocity formula:
  // Vd = peak volume displacement in m^3
  const totalSdM2 = (wooferSingle.sd * wooferQuantity) * 1e-4;
  const xmaxM = wooferSingle.xmax * 1e-3;
  const vdM3 = totalSdM2 * xmaxM;
  const portAreaM2 = portAreaCm2 * 1e-4;

  let portAirVelocityMs = 0;
  if (portAreaM2 > 0 && activeFb > 0) {
    portAirVelocityMs = (2 * Math.PI * activeFb * vdM3) / portAreaM2;
  }

  const vdLiters = (totalSdM2 * 1e4 * wooferSingle.xmax) / 10000;
  const recommendedMinimumPortDiameterMm = Math.round(0.83 * Math.sqrt(vdLiters * activeFb) * 25.4 * 10) / 10;
  // If flared, chuffing threshold is extended from 15 m/s to 19 m/s
  const turbulenceThreshold = (portType === 'round' && activeFlareRadiusMm >= 12) ? 19 : 16;
  const isChuffingRisk = portAirVelocityMs > turbulenceThreshold;

  const portMatch = evaluatePortCatalogMatch(
    portType,
    portDiameterMm,
    Math.round(portLengthMm),
    portAirVelocityMs,
    optimalFlareRadiusMm,
    intD
  );

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
    acousticParams.absorptionMaterialType
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

  // Crossover
  const crossover = calculateCrossoverNetwork(acousticParams);

  // Multi-band frequency response curves
  const freqResponse = generateMultiBandFrequencyCurve(alignment, acousticParams, effectiveAcousticVolumeLiters, activeFb, calculatedQtc, portAirVelocityMs);

  const standingWaves = calculateStandingWaves(dimensions, acousticParams);

  return {
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
    standingWaves,
    totalWeightKg,
    firstInternalResonanceHz,
    materialCost,
    crossover,
    frequencyResponse: freqResponse,
    layout: computeBaffleLayout(dimensions, acousticParams, {
      portLengthMm: Math.round(portLengthMm),
      optimalFlareRadiusMm,
    }),
    // Advanced Electroacoustic Metrics from Training Data
    spinorama: generateSpinoramaCurves(freqResponse, acousticParams, dimensions),
    groupDelay: calculateGroupDelay(
      alignment,
      wooferSingle.fs * Math.sqrt(1 + (wooferSingle.vas * wooferQuantity) / effectiveAcousticVolumeLiters),
      calculatedQtc,
      activeFb
    ),
    klippelThermal: calculateKlippelThermalShift(wooferSingle, acousticParams.thermalDriveLevel),
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
 * Klippel Large-Signal State-Space & Thermal Power Compression Engine
 * Models Re(Tv) resistance rise, power compression Delta L_pc, and dynamic Qes/Qts/Fs shifts
 */
function calculateKlippelThermalShift(
  driver: DriverPreset,
  driveLevel: 'small_signal' | 'nominal_aes' | 'max_continuous' = 'small_signal'
): KlippelThermalReport {
  const ambientTempC = 20;
  const tempRiseC = driveLevel === 'max_continuous' ? 135 : driveLevel === 'nominal_aes' ? 75 : 0;
  const voiceCoilTempC = ambientTempC + tempRiseC;

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
  absorptionType = 'recycled_denim'
): EnclosureMechanicsReport {
  const spec = MATERIAL_SPECS[materialType] || MATERIAL_SPECS.baltic_birch_18;
  const isFilament = spec.category === 'filaments';
  const infill = dimensions.infillPercent ?? 40;
  const rhoSolid = spec.densityKgM3;
  const effectiveDensityKgM3 = isFilament ? Math.round(rhoSolid * (0.35 + 0.65 * (infill / 100))) : rhoSolid;

  const isPlywood = materialType.includes('birch') || materialType.includes('marine');
  const isMDF = materialType.includes('mdf');
  const flexuralModulusGpa = spec.flexuralModulusGpa || (isPlywood ? 8.5 : isMDF ? 3.4 : 12.5);
  const youngsModulusPa = flexuralModulusGpa * 1e9; // Pa
  const nu = isFilament ? 0.35 : 0.3; // Poisson's ratio (~0.35 for thermoplastics, ~0.3 for wood)
  const hM = (dimensions.baffleThicknessMm || 18) * 1e-3;

  // Plate bending stiffness: D_bend = E * h^3 / [12 * (1 - nu^2)]
  const bendingStiffnessNm = Math.round((youngsModulusPa * Math.pow(hM, 3)) / (12 * (1 - nu * nu)));

  // Fundamental unbraced panel resonance f_1,1 = (pi * h / [4 * sqrt(3 * (1 - nu^2))]) * (1/a^2 + 1/b^2) * sqrt(E / rho_eff)
  const aM = dimensions.externalHeightMm * 1e-3;
  const bM = dimensions.externalWidthMm * 1e-3;
  const plateConst = (Math.PI * hM) / (4 * Math.sqrt(3 * (1 - nu * nu)));
  const f11Raw = plateConst * (1 / (aM * aM) + 1 / (bM * bM)) * Math.sqrt(youngsModulusPa / effectiveDensityKgM3);
  const fundamentalPanelModeHz = Math.round(f11Raw);

  // Baltic Birch 18mm Reference fundamental mode (E = 12.5 GPa, rho = 680 kg/m³)
  const refPlateConst = (Math.PI * 0.018) / (4 * Math.sqrt(3 * (1 - 0.09)));
  const balticBirchReferenceModeHz = Math.round(refPlateConst * (1 / (aM * aM) + 1 / (bM * bM)) * Math.sqrt(12.5e9 / 680));

  // Matrix bracing grid shifts unbraced spans down to 100-150mm
  const targetSpanMm = bracingLevel === 'heavy' ? 110 : bracingLevel === 'standard' ? 135 : 180;
  const bracedSpanM = targetSpanMm * 1e-3;
  const bracedF11 = plateConst * (2 / (bracedSpanM * bracedSpanM)) * Math.sqrt(youngsModulusPa / effectiveDensityKgM3);
  const bracedPanelModeHz = Math.round(bracedF11);

  // Diagnostic warning for thin 3D printed panel walls
  let wallComplianceWarning: string | undefined = undefined;
  if (isFilament && (dimensions.baffleThicknessMm || 18) < 15) {
    wallComplianceWarning = 'Warning: 3D printed panel wall thickness < 15mm will induce flexural compliance bass losses under peak SPL enclosure pressure.';
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

  // CLD system loss factor
  const cldLossFactor = hasCLD ? 0.32 : isFilament ? spec.dampingFactor : isMDF ? 0.028 : 0.016;

  // Rigging certified WLL (DGUV Vorschrift 17 / BGV C1 10:1 vs ANSI E1.8 7:1)
  const ultimateBreakingLoadKg = isFilament ? 500 : 850;
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
  const panelRingingAttenuationDb = Math.round((20 * Math.log10(rawPanelModeHz / Math.max(1, finishPanelModeHz)) + 10 * Math.log10(1 + finishSpec.lossFactor / Math.max(0.001, cldLossFactor))) * 10) / 10;

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
