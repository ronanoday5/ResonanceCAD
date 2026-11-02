export type AlignmentType = 'sealed' | 'ported' | 'bandpass4';

export type SystemTopology = 'single' | 'two_way' | 'three_way' | 'mtm';

export type FilterType = 'butterworth' | 'linkwitz_riley';
export type FilterOrder = 1 | 2 | 3 | 4;

export type MaterialCategory = 'sheet_goods' | 'filaments';

export type MaterialSubGroup =
  | 'baltic_birch'
  | 'plywood_hardwood'
  | 'mdf_hdf'
  | 'carbon_fiber'
  | 'aluminum_billet';

export type MaterialType =
  | 'baltic_birch_18'
  | 'baltic_birch_15'
  | 'mdf_19'
  | 'mdf_25'
  | 'valchromat_hdf_19'
  | 'marine_ply_18'
  | 'solid_hardwood_20'
  | 'carbon_fiber_12'
  | 'carbon_fiber_18'
  | 'aluminum_6061'
  | 'pa12_cf'
  | 'pa6_cf'
  | 'petg_cf'
  | 'rigid_10k_sla'
  | 'asa_weatherproof'
  | 'pla_standard'
  | 'pla_cf';

export type SurfaceFinishType =
  | 'natural_hardwood_veneer'
  | 'matte_studio_lacquer'
  | 'high_gloss_automotive'
  | 'tour_grade_polyurea';

export interface SurfaceFinishSpec {
  id: SurfaceFinishType;
  name: string;
  nominalThicknessMm: number;
  addedDensityKgM2: number; // added mass in kg/m²
  costPerM2: number; // USD/m²
  lossFactor: number; // mechanical damping eta
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  bumpType: 'none' | 'woodgrain' | 'polyurea_noise';
  description: string;
}

export interface MaterialSpec {
  id: MaterialType;
  name: string;
  category: MaterialCategory;
  subGroup?: MaterialSubGroup;
  nominalThicknessMm: number;
  densityKgM3: number;
  defaultCostPerM2: number; // default cost in USD/m²
  costPerKgUsd?: number; // USD/kg for 3D filaments
  flexuralModulusGpa?: number; // GPa
  poissonRatio?: number; // dimensionless nu
  tensileStrengthMpa?: number; // MPa
  dampingFactor: number; // loss factor eta
  textureColor: string;
  roughness: number;
  badge?: string;
  description?: string;
}

export interface MaterialPricingConfig {
  customDensityKgM3: number;
  costPerSquareMeter: number;
  wastePercentage: number; // e.g. 15% cutting loss
  customFlexuralModulusGpa?: number;
  customDampingFactor?: number;
  customPoissonRatio?: number;
}

export interface MaterialCostResult {
  netSurfaceAreaM2: number;
  grossSurfaceAreaM2: number;
  totalCostUsd: number;
  totalDryWeightKg: number;
}

export type SpeakerCategory = 'studio_monitor' | 'studio_sub' | 'live_top' | 'live_sub';

export type StudioMonitorSub = 'nearfield_2way' | 'midfield_3way' | 'coaxial_point_source';
export type StudioSubSub = 'sealed_precision' | 'vented_high_output' | 'lfe_channel';
export type LiveTopSub = 'active_powered_biamp' | 'passive_point_source' | 'horn_loaded_array';
export type LiveSubSub = 'single_18_reflex' | 'dual_18_reflex' | 'bandpass_horn_hybrid';

export type SpeakerSubcategory = StudioMonitorSub | StudioSubSub | LiveTopSub | LiveSubSub;

export interface CategoryHardwareConfig {
  showHandles: boolean;
  showPoleMount: boolean;
  showCornerProtectors: boolean;
  showIsolationFeet: boolean;
  showThermalVentSlots?: boolean;
}

export type ThermalVentSizingMode = 'auto_driver_pe' | 'manual';
export type ThermalVentPattern = 'convective_dual_bank' | 'vertical_chimney_array';

export interface ThermalVentConfig {
  enabled?: boolean;
  sizingMode?: ThermalVentSizingMode;
  pattern?: ThermalVentPattern;
  manualSlotCount?: number; // 2 to 16 slots
  manualSlotWidthMm?: number; // 30 to 140 mm
  manualSlotHeightMm?: number; // 4 to 14 mm
  hasInternalHermeticHeatExchanger?: boolean; // Sealed aluminum convective chimney to preserve cabinet airtightness
}

export interface ThermalVentSlotPlacement {
  slotIndex: number;
  role: 'intake_lower' | 'exhaust_upper';
  xMm: number; // relative to rear panel center
  yMm: number; // relative to rear panel center
  widthMm: number;
  heightMm: number;
  cornerRadiusMm: number;
}

export interface ThermalVentilationReport {
  enabled: boolean;
  sizingMode: ThermalVentSizingMode;
  pattern: ThermalVentPattern;
  driverContinuousPowerW: number; // Total driver RMS power rating (N_woofer * Pe_woofer + HF/MF)
  thermalDissipationLoadW: number; // ~96% of input electrical power converted to Joule heat
  powerTier: 'compact_low_power' | 'studio_mid_power' | 'pro_high_power' | 'touring_extreme_power';
  powerTierLabel: string;
  slotCount: number;
  intakeSlotCount: number;
  exhaustSlotCount: number;
  slotWidthMm: number;
  slotHeightMm: number;
  slotCornerRadiusMm: number;
  slotPitchMm: number;
  totalNetFreeAreaCm2: number;
  requiredMinFreeAreaCm2: number;
  buoyancyAirflowVelocityMs: number;
  convectiveVolumeFlowLs: number;
  voiceCoilTempDropC: number;
  powerCompressionSavedDb: number;
  hasInternalHermeticHeatExchanger: boolean;
  hermeticSealDescription: string;
  bankEnvelopeWidthMm: number;
  bankEnvelopeHeightMm: number;
  slots: ThermalVentSlotPlacement[];
}

export interface SpeakerCategorySpec {
  id: SpeakerCategory;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  accentColor: string;
  defaultTopology: SystemTopology;
  defaultAlignment: AlignmentType;
  defaultBracing: 'minimal' | 'standard' | 'heavy';
  defaultDampingFillPercent: number;
  defaultAbsorptionMaterial: DampingMaterialType;
  maxRecommendedPortVelocityMs: number;
  targetQtc: number;
  targetFbDefaultHz: number;
  recommendedMaterial: MaterialType;
  recommendedSurfaceFinish: SurfaceFinishType;
  defaultHardware: CategoryHardwareConfig;
  recommendedDriverIds: string[];
  splTargetDescription: string;
  subcategories: SpeakerSubcategory[];
  defaultSubcategory: SpeakerSubcategory;
}

export interface CommercialPlateAmpSpec {
  modelName: string;
  manufacturer: string;
  powerRmsW: number;
  displacementLiters: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  finCount: number;
  ioTypes: string[];
}

export interface SubcategoryConfig {
  id: SpeakerSubcategory;
  parentCategory: SpeakerCategory;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  engineeringBadge: string;
  defaultDimensionsMm: { w: number; h: number; d: number };
  defaultAlignment: AlignmentType;
  targetFbHz: number;
  targetQtc: number;
  targetVbLiters: number;
  wooferQuantity: number;
  defaultWiring: 'parallel' | 'single' | 'series';
  hasMidrangeChamber?: boolean;
  isCoaxial?: boolean;
  hasPlateAmplifier?: boolean;
  isBandpass?: boolean;
  bandpassFrontVbLiters?: number;
  bandpassRearVbLiters?: number;
  commercialPlateAmp?: CommercialPlateAmpSpec;
  recommendedDriverIds: string[];
}

export const SUBCATEGORY_CONFIGS: Record<SpeakerSubcategory, SubcategoryConfig> = {
  nearfield_2way: {
    id: 'nearfield_2way',
    parentCategory: 'studio_monitor',
    name: 'Nearfield 2-Way Reference',
    shortName: 'Nearfield 2-Way',
    tagline: 'Console Bridge / Desktop Critical Monitoring',
    description:
      'Compact reference monitor engineered for 1–1.5m listening distance. Features diffraction-suppressed baffle chamfering, ruler-flat on-axis response, and silent laminar port air travel.',
    engineeringBadge: 'Nearfield 2-Way • 14L Sealed/Laminar',
    defaultDimensionsMm: { w: 220, h: 360, d: 260 },
    defaultAlignment: 'sealed',
    targetFbHz: 55,
    targetQtc: 0.707,
    targetVbLiters: 14,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['purifi_ptt65', 'scanspeak_18w8531', 'sb_acoustics_17nbac'],
  },
  midfield_3way: {
    id: 'midfield_3way',
    parentCategory: 'studio_monitor',
    name: 'Midfield 3-Way Reference',
    shortName: 'Midfield 3-Way',
    tagline: 'Full-Range Main Studio Acoustic Analysis',
    description:
      'Extended full-range 3-way studio monitor for 2–3m midfield listening. Incorporates an isolated sealed acoustic midrange sub-chamber and dedicated woofer loading for maximum clarity.',
    engineeringBadge: 'Midfield 3-Way • Isolated Mid-Chamber',
    defaultDimensionsMm: { w: 340, h: 620, d: 380 },
    defaultAlignment: 'ported',
    targetFbHz: 35,
    targetQtc: 0.707,
    targetVbLiters: 48,
    wooferQuantity: 1,
    defaultWiring: 'single',
    hasMidrangeChamber: true,
    recommendedDriverIds: ['purifi_ptt65', 'scanspeak_18w8531', 'jbl_2169h', 'scanspeak_12mu'],
  },
  coaxial_point_source: {
    id: 'coaxial_point_source',
    parentCategory: 'studio_monitor',
    name: 'Coaxial Point-Source Monitor',
    shortName: 'Coaxial Point-Source',
    tagline: 'Zero-Delay Concentric Time Coincidence',
    description:
      'Coincident transducer geometry integrating high-frequency waveguide throat within the woofer dustcap. Eliminates vertical lobing and phase anomalies across a symmetrical 90° polar field.',
    engineeringBadge: 'Concentric Coaxial • Symmetrical Polar 90°',
    defaultDimensionsMm: { w: 260, h: 420, d: 300 },
    defaultAlignment: 'ported',
    targetFbHz: 42,
    targetQtc: 0.707,
    targetVbLiters: 20,
    wooferQuantity: 1,
    defaultWiring: 'single',
    isCoaxial: true,
    recommendedDriverIds: ['purifi_ptt65', 'sb_acoustics_17nbac'],
  },
  sealed_precision: {
    id: 'sealed_precision',
    parentCategory: 'studio_sub',
    name: 'Sealed Precision Studio Sub',
    shortName: 'Sealed Precision',
    tagline: 'Ultra-Low Group Delay Reference Bass',
    description:
      'Acoustic suspension sealed enclosure optimized for surgical transient decay and minimum group delay (< 10ms at 30Hz). Ideal for critical mastering and small studio calibration.',
    engineeringBadge: 'Critical Sealed • τ_g < 10ms @ 30Hz',
    defaultDimensionsMm: { w: 360, h: 420, d: 380 },
    defaultAlignment: 'sealed',
    targetFbHz: 32,
    targetQtc: 0.707,
    targetVbLiters: 35,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['dayton_rss265hf4', 'jbl_2268h'],
  },
  vented_high_output: {
    id: 'vented_high_output',
    parentCategory: 'studio_sub',
    name: 'Vented High-Output Studio Sub',
    shortName: 'Vented High-Output',
    tagline: 'Infra-Bass Deep Extension to 20Hz',
    description:
      'Bass reflex sub tuned for infrasonic depth (F3 ≤ 22Hz). Utilizes oversized low-velocity aeroports with bellmouth flares to prevent compression and thermal chuffing.',
    engineeringBadge: 'Extended Infra-Bass • F3 ≤ 22Hz',
    defaultDimensionsMm: { w: 440, h: 560, d: 480 },
    defaultAlignment: 'ported',
    targetFbHz: 22,
    targetQtc: 0.707,
    targetVbLiters: 70,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['dayton_rss265hf4', 'jbl_2268h', 'jbl_2242h'],
  },
  lfe_channel: {
    id: 'lfe_channel',
    parentCategory: 'studio_sub',
    name: 'Dedicated Cinema / Mastering LFE Sub',
    shortName: 'LFE Channel',
    tagline: '115dB Clean Headroom & Massive Inertia',
    description:
      'Heavy-inertia 25mm enclosure built to deliver continuous 115dB dynamic headroom for Low-Frequency Effects (LFE) channels in Dolby Atmos and film dubbing stages.',
    engineeringBadge: 'LFE Channel • 115dB Peak Continuous',
    defaultDimensionsMm: { w: 500, h: 640, d: 520 },
    defaultAlignment: 'ported',
    targetFbHz: 25,
    targetQtc: 0.707,
    targetVbLiters: 98,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['jbl_2268h', 'jbl_2242h', 'jbl_2241h'],
  },
  passive_point_source: {
    id: 'passive_point_source',
    parentCategory: 'live_top',
    name: 'Touring Passive Point-Source Top',
    shortName: 'Passive Point-Source',
    tagline: '2-Way Live Reinforcement on Pole Stand',
    description:
      'Ruggedized 15mm birch enclosure with 90°×60° high-frequency horn, high-order passive crossover network, integrated side handles, and 35mm stand pole socket.',
    engineeringBadge: 'Tour Passive Top • 90°×60° Horn • 35mm Pole',
    defaultDimensionsMm: { w: 380, h: 640, d: 370 },
    defaultAlignment: 'ported',
    targetFbHz: 60,
    targetQtc: 0.707,
    targetVbLiters: 52,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['jbl_2265h', 'jbl_2206h', 'jbl_2226h', 'jbl_2426h'],
  },
  active_powered_biamp: {
    id: 'active_powered_biamp',
    parentCategory: 'live_top',
    name: 'Active Powered Bi-Amp Top',
    shortName: 'Active Powered Bi-Amp',
    tagline: 'Commercial Plate Amp Module with Heat Sink',
    description:
      'Active live reinforcement top featuring a commercially available plate amplifier module recessed into the rear panel, with extruded aluminum heatsink fins and standard XLR/PowerCON I/O.',
    engineeringBadge: 'Commercial Bi-Amp Plate • Heatsink & XLR',
    defaultDimensionsMm: { w: 380, h: 650, d: 390 },
    defaultAlignment: 'ported',
    targetFbHz: 58,
    targetQtc: 0.707,
    targetVbLiters: 50,
    wooferQuantity: 1,
    defaultWiring: 'single',
    hasPlateAmplifier: true,
    commercialPlateAmp: {
      modelName: 'Pascal Pro-BiAmp 1000W',
      manufacturer: 'Commercial Pro Audio Module',
      powerRmsW: 1000,
      displacementLiters: 2.4,
      widthMm: 165,
      heightMm: 310,
      depthMm: 65,
      finCount: 12,
      ioTypes: ['XLR In', 'XLR Thru', 'PowerCON Mains', 'Gain Rotary'],
    },
    recommendedDriverIds: ['jbl_2265h', 'jbl_2206h', 'jbl_2450h'],
  },
  horn_loaded_array: {
    id: 'horn_loaded_array',
    parentCategory: 'live_top',
    name: 'Horn-Loaded Constant Directivity Array',
    shortName: 'Horn-Loaded Array',
    tagline: 'High-Throw Directivity & Rigging Hardware',
    description:
      'Constant directivity horn-loaded enclosure engineered for long-throw projection and line-array column stacking, with high directivity index (DI) and acoustic boundary control.',
    engineeringBadge: 'High-Q Horn Array • High DI Index',
    defaultDimensionsMm: { w: 460, h: 520, d: 420 },
    defaultAlignment: 'ported',
    targetFbHz: 75,
    targetQtc: 0.707,
    targetVbLiters: 42,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['jbl_2206h', 'jbl_2169h', 'jbl_2450h'],
  },
  single_18_reflex: {
    id: 'single_18_reflex',
    parentCategory: 'live_sub',
    name: 'Single-18" Tour Bass Reflex',
    shortName: 'Single-18" Reflex',
    tagline: 'Industry Standard Concert Touring Sub',
    description:
      'Industry workhorse concert subwoofer in an 18mm Baltic Birch cabinet with matrix cross-bracing, dual recessed handles, steel ball corners, and large laminar corner ports.',
    engineeringBadge: 'Single 18" Reflex • 150L • Choke ≤ 25 m/s',
    defaultDimensionsMm: { w: 540, h: 720, d: 620 },
    defaultAlignment: 'ported',
    targetFbHz: 34,
    targetQtc: 0.707,
    targetVbLiters: 150,
    wooferQuantity: 1,
    defaultWiring: 'single',
    recommendedDriverIds: ['jbl_2242h', 'jbl_2241h', 'jbl_2268h'],
  },
  dual_18_reflex: {
    id: 'dual_18_reflex',
    parentCategory: 'live_sub',
    name: 'Dual-18" Concert Touring Sub',
    shortName: 'Dual-18" Reflex',
    tagline: 'Twin 18" Woofers in Parallel 4-Ohm Concert Rig',
    description:
      'High-impact concert subwoofer equipped with twin 18" drivers in parallel wiring (4Ω nominal), delivering 2× displacement volume (Vd), 1600W continuous capacity, and dual symmetrical ports.',
    engineeringBadge: 'Dual 18" Parallel • 320L • 1600W Continuous',
    defaultDimensionsMm: { w: 600, h: 1180, d: 720 },
    defaultAlignment: 'ported',
    targetFbHz: 32,
    targetQtc: 0.707,
    targetVbLiters: 310,
    wooferQuantity: 2,
    defaultWiring: 'parallel',
    recommendedDriverIds: ['jbl_2242h', 'jbl_2241h', 'jbl_2268h'],
  },
  bandpass_horn_hybrid: {
    id: 'bandpass_horn_hybrid',
    parentCategory: 'live_sub',
    name: 'Bandpass-Horn Subwoofer Hybrid',
    shortName: 'Bandpass-Horn Hybrid',
    tagline: 'Acoustic Chamber Transformer with Horn Loading',
    description:
      'Dual-chamber compound enclosure combining a rear sealed acoustic spring chamber with a front vented acoustic chamber loading into an exponential horn throat for maximum acoustic efficiency.',
    engineeringBadge: '4th-Order Bandpass-Horn • High Acoustic Gain',
    defaultDimensionsMm: { w: 580, h: 860, d: 740 },
    defaultAlignment: 'bandpass4',
    targetFbHz: 45,
    targetQtc: 0.707,
    targetVbLiters: 230,
    wooferQuantity: 1,
    defaultWiring: 'single',
    isBandpass: true,
    bandpassFrontVbLiters: 80,
    bandpassRearVbLiters: 150,
    recommendedDriverIds: ['jbl_2242h', 'jbl_2241h', 'jbl_2268h'],
  },
};

export const CATEGORY_SPECS: Record<SpeakerCategory, SpeakerCategorySpec> = {
  studio_monitor: {
    id: 'studio_monitor',
    name: 'Studio Reference Monitor',
    tagline: 'Nearfield / Midfield Critical Listening',
    description:
      'Engineered for maximum acoustic transparency, linear phase response, and razor-sharp stereo imaging. Emphasizes tight step-response (Qtc ≈ 0.58-0.707), front baffle diffraction beveling, and whisper-quiet port air velocity (≤ 12 m/s) to eliminate room coloration.',
    badge: 'Nearfield Precision • ≤ 12 m/s Air Limit',
    accentColor: '#38bdf8', // Sky / Cyan
    defaultTopology: 'two_way',
    defaultAlignment: 'sealed',
    defaultBracing: 'standard',
    defaultDampingFillPercent: 60,
    defaultAbsorptionMaterial: 'sheep_wool',
    maxRecommendedPortVelocityMs: 12.0,
    targetQtc: 0.707,
    targetFbDefaultHz: 45,
    recommendedMaterial: 'mdf_19',
    recommendedSurfaceFinish: 'matte_studio_lacquer',
    defaultHardware: {
      showHandles: false,
      showPoleMount: false,
      showCornerProtectors: false,
      showIsolationFeet: true,
    },
    recommendedDriverIds: [
      'purifi_ptt65',
      'scanspeak_18w8531',
      'sb_acoustics_17nbac',
      'scanspeak_d3004',
      'peerless_xt25bg',
      'scanspeak_12mu',
    ],
    splTargetDescription: '85 dB SPL @ 2m (105 dB peak headroom)',
    subcategories: ['nearfield_2way', 'midfield_3way', 'coaxial_point_source'],
    defaultSubcategory: 'nearfield_2way',
  },
  studio_sub: {
    id: 'studio_sub',
    name: 'Studio Subwoofer',
    tagline: 'Infra-Bass Reference Extension',
    description:
      'Engineered for true sub-bass extension (F3 ≤ 25 Hz), minimal group delay below 40 Hz, and zero mechanical enclosure ringing. Uses balanced acoustic decoupling feet and heavy absorptive lining (35-50% fiber/foam) for surgical monitoring of bottom octaves.',
    badge: 'Deep Extension (F3 ≤ 25Hz) • Low Group Delay',
    accentColor: '#a855f7', // Purple
    defaultTopology: 'single',
    defaultAlignment: 'ported',
    defaultBracing: 'heavy',
    defaultDampingFillPercent: 45,
    defaultAbsorptionMaterial: 'pu_foam',
    maxRecommendedPortVelocityMs: 17.0,
    targetQtc: 0.707,
    targetFbDefaultHz: 24,
    recommendedMaterial: 'mdf_25',
    recommendedSurfaceFinish: 'matte_studio_lacquer',
    defaultHardware: {
      showHandles: false,
      showPoleMount: false,
      showCornerProtectors: false,
      showIsolationFeet: true,
    },
    recommendedDriverIds: ['dayton_rss265hf4', 'jbl_2268h', 'jbl_2242h'],
    splTargetDescription: '110 dB SPL @ 1m continuous (in-room)',
    subcategories: ['sealed_precision', 'vented_high_output', 'lfe_channel'],
    defaultSubcategory: 'sealed_precision',
  },
  live_top: {
    id: 'live_top',
    name: 'Live Sound PA Top',
    tagline: 'High-Efficiency Pro Reinforcement',
    description:
      'Engineered for maximum sound pressure level (SPL), controlled high-frequency dispersion via waveguides/horns, and 80 Hz high-pass boundaries for clean subwoofer pairing. Built with ruggedized tour-grade 15-18mm birch/polyurea, integrated ergonomic side carry handles, and a 35mm bottom pole socket.',
    badge: 'High Efficiency • Waveguide • Pole Mount',
    accentColor: '#f59e0b', // Amber
    defaultTopology: 'two_way',
    defaultAlignment: 'ported',
    defaultBracing: 'standard',
    defaultDampingFillPercent: 35,
    defaultAbsorptionMaterial: 'pu_foam',
    maxRecommendedPortVelocityMs: 22.0,
    targetQtc: 0.707,
    targetFbDefaultHz: 65,
    recommendedMaterial: 'baltic_birch_15',
    recommendedSurfaceFinish: 'tour_grade_polyurea',
    defaultHardware: {
      showHandles: true,
      showPoleMount: true,
      showCornerProtectors: false,
      showIsolationFeet: false,
    },
    recommendedDriverIds: [
      'jbl_2265h',
      'jbl_2206h',
      'jbl_2226h',
      'jbl_2169h',
      'jbl_2450h',
      'jbl_2426h',
      'jbl_2408h1',
    ],
    splTargetDescription: '128+ dB SPL peak @ 1m (AES Continuous)',
    subcategories: ['passive_point_source', 'active_powered_biamp', 'horn_loaded_array'],
    defaultSubcategory: 'passive_point_source',
  },
  live_sub: {
    id: 'live_sub',
    name: 'Concert Touring Subwoofer',
    tagline: 'High-SPL Extreme Impact',
    description:
      'Tour-grade high-power bass reflex / bandpass enclosure designed for massive punch and sustained concert power. Accommodates high aerodynamic port air velocity limits (≤ 25 m/s) with large bellmouth flares, heavy matrix cross-bracing, steel corner guards, and dual recessed handles.',
    badge: 'Tour-Grade High-SPL • Choke Limit ≤ 25 m/s',
    accentColor: '#ef4444', // Red
    defaultTopology: 'single',
    defaultAlignment: 'ported',
    defaultBracing: 'heavy',
    defaultDampingFillPercent: 30,
    defaultAbsorptionMaterial: 'recycled_denim',
    maxRecommendedPortVelocityMs: 25.0,
    targetQtc: 0.707,
    targetFbDefaultHz: 35,
    recommendedMaterial: 'baltic_birch_18',
    recommendedSurfaceFinish: 'tour_grade_polyurea',
    defaultHardware: {
      showHandles: true,
      showPoleMount: false,
      showCornerProtectors: true,
      showIsolationFeet: false,
    },
    recommendedDriverIds: ['jbl_2242h', 'jbl_2241h', 'jbl_2268h', 'jbl_2226h'],
    splTargetDescription: '134+ dB SPL peak @ 1m (Extreme Concert SPL)',
    subcategories: ['single_18_reflex', 'dual_18_reflex', 'bandpass_horn_hybrid'],
    defaultSubcategory: 'single_18_reflex',
  },
};

export interface ImpedanceCurvePoint {
  freq: number;
  magnitudeOhm: number;
  phaseDeg: number;
  reOhm?: number;
  imOhm?: number;
}

export interface DriverImpedanceDataset {
  source: 'dats_measurement' | 'clio_measurement' | 'analytic_model' | 'uploaded_file';
  filename?: string;
  measuredReOhm?: number;
  measuredLeMh?: number;
  measuredFsHz?: number;
  peakImpedanceOhm?: number;
  minImpedanceOhm?: number;
  points: ImpedanceCurvePoint[];
}

export interface SystemImpedanceReport {
  alignment: AlignmentType;
  minimumImpedanceOhm: number;
  minImpedanceFreqHz: number;
  nominalImpedanceOhm: number;
  freeAirResonanceFsHz: number;
  boxResonanceFcHz?: number; // for sealed
  portTuningFbHz?: number; // for ported
  lowerPeakFlHz?: number; // for ported
  upperPeakFhHz?: number; // for ported
  peakImpedanceOhm: number;
  zeroPhaseCrossingHz?: number; // exact tuning point where electrical phase crosses 0 deg
  points: ImpedanceCurvePoint[];
  freeAirPoints: ImpedanceCurvePoint[];
}

export interface DriverPreset {
  id: string;
  brand: string;
  model: string;
  nominalDiameterInch: number;
  fs: number; // Hz
  qts: number;
  qes: number;
  qms: number;
  vas: number; // Liters
  xmax: number; // mm
  pe: number; // Watts RMS
  sd: number; // cm^2
  voiceCoilDiameterMm: number;
  frameOuterDiameterMm: number;
  cutoutDiameterMm: number;
  mountingDepthMm: number;
  magnetDiameterMm: number;
  magnetDepthMm: number;
  displacementLiters: number;
  splSensitivityDb: number;
  reOhm?: number;
  leMh?: number;
  categoryTags?: SpeakerCategory[];
  description: string;
  measuredImpedance?: DriverImpedanceDataset;
}

export interface DriverCompatibilityReport {
  status: 'optimal' | 'suboptimal' | 'incompatible';
  reasons: string[];
  recommendedAlternatives: string[];
}

export interface DriverAssignment {
  role: 'tweeter' | 'midrange' | 'woofer';
  driver: DriverPreset;
  quantity: number;
  impedanceOhm: number;
  attenuationDb: number;
  isPhaseInverted?: boolean;
}

export interface CrossoverBandConfig {
  crossoverFreqHz: number;
  filterOrder: FilterOrder;
  filterType: FilterType;
  hasZobelNetwork: boolean;
  hasLPad: boolean;
}

export interface CrossoverComponent {
  id: string;
  name: string;
  type: 'inductor' | 'capacitor' | 'resistor';
  valueFormatted: string;
  valueNumeric: number;
  unit: string;
  voltagePowerRating: string;
  purpose: string;
}

export interface CrossoverNetworkResult {
  tweeterHighPass: CrossoverComponent[];
  midrangeBandPass?: CrossoverComponent[];
  wooferLowPass: CrossoverComponent[];
  lpadTweeter?: { rSeriesOhm: number; rParallelOhm: number };
  lpadMidrange?: { rSeriesOhm: number; rParallelOhm: number };
  zobelWoofer?: { rZobelOhm: number; cZobelUf: number };
  fsNotchWoofer?: { rcOhm: number; ccUf: number; lcMh: number; rMaxOhm: number };
  baffleStepWoofer?: { fStepHz: number; rBscOhm: number; lBscMh: number };
  cdHornBypassTweeter?: { cbUf: number; fMassBreakpointHz: number };
  allComponents: CrossoverComponent[];
  estimatedPcbAreaCm2: number;
}

// --- AUDIO FIR FILTERING & DSP TYPES (Eclipse Audio FIR Guide) ---
export type FirPhaseMode = 'linear_phase' | 'minimum_phase' | 'mixed_phase';
export type FirTapCount = 256 | 512 | 1024 | 2048 | 4096;
export type FirDspSampleRate = 48000 | 96000;
export type FirWindowType = 'blackman_harris' | 'hann' | 'kaiser' | 'rectangular';
export type FirDspPlatform = 'generic_csv' | 'minidsp' | 'hypex_fusion' | 'powersoft' | 'camilladsp';

export interface FirFilterConfig {
  enabled: boolean;
  phaseMode: FirPhaseMode;
  tapCount: FirTapCount;
  sampleRate: FirDspSampleRate;
  windowType: FirWindowType;
  platformPreset: FirDspPlatform;
  unrollExcessPhase: boolean; // unwrap crossover all-pass rotation
  lowPassShape: 'brickwall' | 'linear_phase_lr4' | 'subwoofer_unwrap';
}

export interface FirSimulationReport {
  enabled: boolean;
  phaseMode: FirPhaseMode;
  tapCount: number;
  sampleRate: number;
  frequencyResolutionHz: number; // fs / N
  minControllableFreqHz: number; // 3 * (fs / N)
  bulkDelaySamples: number;
  latencyMs: number;
  multiplicationsPerSecond: number; // N * fs
  ratioVsIirBiquad: number; // (N * fs) / (24 * 5 * fs)
  status: 'optimal' | 'live_latency_warning' | 'subwoofer_low_res_warning';
  advisoryTitle: string;
  advisoryDescription: string;
  wooferTaps: number[];
  midrangeTaps?: number[];
  tweeterTaps: number[];
  impulseResponsePoints: { sample: number; woofer: number; midrange?: number; tweeter: number }[];
  phaseResponsePoints: { freq: number; iirPhaseDeg: number; firPhaseDeg: number; excessPhaseUnwrappedDeg: number }[];
  groupDelayPoints: { freq: number; iirGroupDelayMs: number; firGroupDelayMs: number }[];
}

export type PortPlacement = 'auto' | 'front_bottom' | 'front_top' | 'rear';

export interface BaffleComponentPlacement {
  id: string;
  role: 'tweeter' | 'midrange' | 'woofer' | 'port';
  panel: 'front' | 'rear';
  centerX: number;
  centerY: number;
  cutoutRadiusMm: number;
  outerRadiusMm: number;
  depthMm: number;
  isSlot?: boolean;
  slotWidthMm?: number;
  slotHeightMm?: number;
  label: string;
}

export interface CollisionItem {
  id: string;
  partA: string;
  partB: string;
  type: 'baffle_overlap' | 'depth_clearance' | 'boundary_exceeded';
  overlapDistanceMm: number;
  description: string;
  severity: 'error' | 'warning';
}

export interface AirflowObstructionPoint {
  id: string;
  name: string;
  type: 'driver_magnet' | 'window_brace' | 'enclosure_wall';
  distanceMm: number; // minimum distance from port airflow boundary
  stressLevel: number; // 0.0 (safe) to 1.0 (severe choking / critical proximity)
  position: { x: number; y: number; z: number }; // 3D coordinates in cabinet (m)
  portPosition: { x: number; y: number; z: number }; // 3D coordinates on port mouth/tube (m)
  recommendedClearanceMm: number;
  severity: 'critical' | 'warning' | 'nominal';
  description: string;
}

export interface AirflowInterferenceReport {
  hasInterference: boolean;
  maxStressLevel: number; // 0.0 to 1.0
  overallStatus: 'safe' | 'caution' | 'choked';
  minMagnetClearanceMm: number;
  minBracingClearanceMm: number;
  minWallClearanceMm: number;
  obstructions: AirflowObstructionPoint[];
  closestObstruction: AirflowObstructionPoint | null;
  turbulenceMultiplier: number; // e.g. 1.0 to 2.2x airflow impedance
}

export interface BaffleLayoutResult {
  components: BaffleComponentPlacement[];
  resolvedPortPlacement: 'front_bottom' | 'front_top' | 'rear';
  hasCollision: boolean;
  collisions: CollisionItem[];
  minBaffleClearanceMm: number;
  minDepthClearanceMm: number;
  rearWallClearanceMm: number;
  recommendedHeightMm: number;
  isHeightSufficient: boolean;
  airflowInterference: AirflowInterferenceReport;
}

export type ParametricPortProfileType =
  | 'circular_bellmouth'
  | 'elliptical_aperture'
  | 'rectilinear_slot'
  | 'flared_exponential_horn'
  | 'folded_l_conduit'
  | 'folded_u_conduit';

export interface ParametricPortConfig {
  profileType: ParametricPortProfileType;
  ellipseAspectRatio?: number; // a/b ratio for elliptical_aperture (default 1.6)
  hornExpansionFactor?: number; // mouth-to-throat area ratio for flared_exponential_horn (default 2.2)
  wallThicknessMm?: number; // synthesized conduit wall thickness (default 4.0mm)
  cornerRadiusMm?: number; // internal fillet radius for slot/folded conduits (default 12mm)
  autoFoldWhenLong?: boolean; // automatically fold into L/U conduit if Lp > internal depth
}

export interface AcousticParameters {
  topology: SystemTopology;
  driverAssignments: Record<'tweeter' | 'midrange' | 'woofer', DriverAssignment>;
  alignment: AlignmentType;
  targetQtc: number;
  targetFb: number;
  bandpassFrontVbLiters?: number;
  bandpassRearVbLiters?: number;
  portType: 'round' | 'slot';
  parametricPortConfig?: ParametricPortConfig;
  portPlacement?: PortPlacement;
  portDiameterMm: number;
  flareRadiusMm?: number; // aeroport bellmouth flare radius (mm)
  isDoubleFlared?: boolean; // flare both ends vs exit only
  slotWidthMm?: number;
  slotHeightMm?: number;
  slotLipRadiusMm?: number; // slot entry/exit roundover radius (mm)
  numberOfPorts: number;
  dampingFillPercent: number;
  bracingLevel: 'minimal' | 'standard' | 'heavy';
  braceApertureChamferDeg?: number;
  // Material custom economics
  materialPricing?: MaterialPricingConfig;
  // Crossover settings
  crossoverLowHz: number;
  crossoverHighHz: number;
  lowPassOrder: FilterOrder;
  lowPassType: FilterType;
  highPassOrder: FilterOrder;
  highPassType: FilterType;
  midPassOrder?: FilterOrder;
  midPassType?: FilterType;
  // Passive Conjugate & Compensation Network Toggles
  enableZobelNetwork?: boolean;
  enableFsNotchTank?: boolean;
  enableBaffleStepComp?: boolean;
  enableCdHornBypass?: boolean;
  // Advanced Electroacoustic & Physics Parameters (from Training Data)
  thermalDriveLevel?: 'small_signal' | 'nominal_aes' | 'max_continuous';
  operatingTemperatureC?: number;
  subwooferArrayMode?: 'omni' | 'cardioid_gradient' | 'end_fire';
  waveguideCoverageAngleDeg?: number;
  baffleEdgeRadiusMm?: number;
  hasConstrainedLayerDamping?: boolean;
  absorptionMaterialType?: DampingMaterialType;
  // Real-Time Max SPL Calculator User Controls
  splCalcDistanceM?: number; // Target measurement/listening distance in meters (default 1.0m)
  splCalcInputPowerW?: number; // User amplifier drive power input (Watts)
  splCalcBoundarySpace?: 'free_space_4pi' | 'half_space_2pi' | 'corner_bound_1pi'; // Acoustic boundary loading
  firConfig?: FirFilterConfig;
  diffuserConfig?: ProceduralDiffuserConfig;
  integralMatrixConfig?: IntegralMatrixConfig;
}

export type DampingMaterialType =
  | 'dacron_polyfill'
  | 'pu_foam'
  | 'sheep_wool'
  | 'melamine_basotect'
  | 'recycled_denim';

export interface DampingMaterialSpec {
  id: DampingMaterialType;
  name: string;
  category: 'fiber' | 'foam' | 'wool' | 'cotton';
  typicalDensityGPerL: number;
  airflowResistivityRaylsM: number;
  maxIsothermalExpansionPercent: number;
  absorptionCoefficientMid: number;
  costPerKgUsd: number;
  description: string;
  bestSuitedFor: string;
}

export interface DampingAdvisorReport {
  recommendedMaterial: DampingMaterialType;
  recommendedMaterialSpec: DampingMaterialSpec;
  recommendedFillPercent: number;
  recommendedMassGrams: number;
  recommendedLiningAreaM2: number;
  virtualVolumeExpansionLiters: number;
  effectiveVolumeLiters: number;
  rawQtc: number;
  predictedQtc: number;
  targetQtc: number;
  alignment: AlignmentType;
  applicationMethod: 'chamber_stuffing' | 'perimeter_lining' | 'selective_rear_lining';
  placementGuidelines: string[];
  alternatives: {
    material: DampingMaterialType;
    spec: DampingMaterialSpec;
    massGrams: number;
    advantage: string;
    tradeoff: string;
  }[];
}

export type RearTerminalCategory =
  | 'touring_pa_speakon'
  | 'studio_passive_binding_posts'
  | 'studio_active_plate';

export type SpeakonConnectorModel =
  | 'nl4mp'
  | 'nlt4mp'
  | 'nl8mpr'
  | 'binding_posts_gold'
  | 'active_plate_xlr';

export type SpeakonSelectionMode = 'auto' | SpeakonConnectorModel;
export type SpeakonWiringArchitecture =
  | 'auto'
  | 'passive_fullrange'
  | 'bi_amp_2way'
  | 'sub_top_pass'
  | 'tri_amp_3way'
  | 'quad_amp_array';

export interface SpeakonConfig {
  selectionMode?: SpeakonSelectionMode; // 'auto' | 'nl4mp' | 'nlt4mp' | 'nl8mpr' | 'binding_posts_gold' | 'active_plate_xlr'
  wiringArchitecture?: SpeakonWiringArchitecture;
  dualLinkThru?: boolean; // Default true (Input + Parallel Link/Thru)
  recessedDishDepthMm?: number; // Default 18mm recessed rear pocket
}

export interface SpeakonPinAssignment {
  pinPair: string; // '1+/1-' | '2+/2-' | '3+/3-' | '4+/4-' | 'HF+/HF-' | 'LF+/LF-' | 'XLR-1/2/3'
  positivePin: string;
  negativePin: string;
  signalRole: string;
  targetBand: string;
  wireGaugeAwg: string;
  wireColorPositive: string;
  wireColorNegative: string;
  nominalImpedanceOhm: string;
  isActivePath: boolean;
  ipcNetNamePositive: string;
  ipcNetNameNegative: string;
}

export interface SpeakonMountingHoleCoord {
  holeId: string;
  xMm: number; // relative to connector center
  yMm: number; // relative to connector center
  diameterMm: number;
  fastenerSpec: string;
}

export interface SpeakonClashItem {
  targetComponent: string;
  clearanceMm: number;
  minRequiredMm: number;
  status: 'clear' | 'caution' | 'clash';
  description: string;
}

export interface SpeakonBomEntry {
  partNumber: string;
  manufacturer: string;
  description: string;
  quantity: number;
  unitCostUsd: number;
  totalCostUsd: number;
  category: 'connector' | 'gasket' | 'crimp_terminal' | 'fastener' | 'dish_plate';
  distributorSku: string;
}

export interface StudioTerminalSpec {
  terminalType: 'binding_posts_gold' | 'active_plate_xlr';
  title: string;
  bindingPostMaterial: string;
  bananaPlugCompatible: boolean;
  biWireJumperIncluded: boolean;
  xlrComboCount: number;
  iecInletType: string;
  acVoltageSpec: string;
}

export interface SpeakonReport {
  terminalCategory: RearTerminalCategory;
  isProhibitedConfiguration: boolean;
  prohibitionWarningText?: string;
  recommendedResolutionModel?: SpeakonConnectorModel;
  connectorModel: SpeakonConnectorModel;
  partNumber: string;
  connectorName: string;
  poleCount: number;
  flangeType: string;
  selectionReason: string;
  isAutoSelected: boolean;
  hasChannelCapacityWarning: boolean;
  channelCapacityWarningText?: string;
  wiringArchitecture: Exclude<SpeakonWiringArchitecture, 'auto'>;
  wiringArchitectureLabel: string;
  requiredAmplifierChannels: number;
  activeConductorCount: number;
  dualLinkThru: boolean;
  connectorQuantity: number;
  // Cutout & CNC Geometry
  cutoutBoreDiameterMm: number;
  flangeWidthMm: number;
  flangeHeightMm: number;
  connectorSpacingCenterMm: number;
  dishWidthMm: number;
  dishHeightMm: number;
  dishPocketDepthMm: number;
  dishCenterYMm: number;
  internalProjectionDepthMm: number;
  mountingHolesPerConnector: SpeakonMountingHoleCoord[];
  // Pinout & Harness
  pinAssignments: SpeakonPinAssignment[];
  crimpTerminalSpec: string;
  gasketPartNumber: string;
  // Spatial Clash Checks
  overallClashStatus: 'clear' | 'caution' | 'clash';
  minInternalClearanceMm: number;
  clashChecks: SpeakonClashItem[];
  // Manufacturing & BOM
  bomItems: SpeakonBomEntry[];
  totalHardwareCostUsd: number;
  // Studio Specific Specifications
  studioTerminalSpec?: StudioTerminalSpec;
}

export interface EnclosureDimensions {
  externalWidthMm: number;
  externalHeightMm: number;
  externalDepthMm: number;
  material: MaterialType;
  materialCategory?: MaterialCategory;
  baffleThicknessMm: number;
  jointType: 'butt' | 'rabbet' | 'miter';
  surfaceFinish?: SurfaceFinishType;
  finishColorHex?: string;
  // 3D Print Slicing Configuration
  infillPercent?: number; // Default 40% (Gyroid isotropic)
  perimeterShells?: number; // Default 6 perimeters (~2.4 mm solid wall boundary)
  // Loudspeaker Archetype & Hardware Additions
  category?: SpeakerCategory;
  subcategory?: SpeakerSubcategory;
  hardware?: CategoryHardwareConfig;
  thermalVentConfig?: ThermalVentConfig;
  speakonConfig?: SpeakonConfig;
  diffuserConfig?: ProceduralDiffuserConfig;
  integralMatrixConfig?: IntegralMatrixConfig;
}

export interface CutListItem {
  id: string;
  name: string;
  spatialLabel: string;
  spatialLocation: string;
  type:
    | 'baffle'
    | 'rear'
    | 'top'
    | 'bottom'
    | 'left_side'
    | 'right_side'
    | 'window_brace'
    | 'shelf_brace'
    | 'port_board'
    | 'midrange_chamber'
    | 'crossover_pcb'
    | 'speakon_plate'
    | 'cleat';
  quantity: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  materialName: string;
  weightKg: number;
  estimatedCostUsd?: number;
  cutNotes: string;
  machiningNotes: string;
}

export interface SpinoramaCurvePoint {
  freq: number;
  onAxis: number; // On-Axis Response (ON)
  listeningWindow: number; // Listening Window (LW) average (±10° V, ±30° H)
  earlyReflections: number; // Early Reflections (ER) average
  soundPower: number; // Sound Power (SP) 70-point spherical average
  erdi: number; // Early Reflections Directivity Index (LW - ER)
  spdi: number; // Sound Power Directivity Index (LW - SP)
}

export interface GroupDelayCurvePoint {
  freq: number;
  groupDelayMs: number;
  cycleThresholdMs: number; // 1.5 / f * 1000
  isAudible: boolean;
}

export interface KlippelThermalReport {
  ambientTempC: number;
  voiceCoilTempC: number;
  tempRiseC: number;
  coldReOhm: number;
  hotReOhm: number;
  powerCompressionDb: number; // 20 * log10(1 + alpha * deltaT)
  largeSignalQes: number;
  largeSignalQts: number;
  largeSignalFs: number;
  linearExcursionXmaxMm: number;
  damageExcursionXmechMm: number;
}

export interface OblateSpheroidalWaveguideConfig {
  throatRadiusMm: number;
  coverageHalfAngleDeg: number;
  lengthMm: number;
  profilePoints: { zMm: number; radiusMm: number }[];
  minBaffleEdgeRadiusMm: number; // c / (8 * f_crossover)
  actualBaffleEdgeRadiusMm: number;
  isDiffractionSuppressed: boolean;
}

export interface CardioidSubwooferConfig {
  mode: 'omni' | 'cardioid_gradient' | 'end_fire';
  spacingMm: number;
  delayMs: number;
  temperatureC: number;
  soundSpeedMs: number;
  rearCancellationDb: number;
  endFireDelaysMs: number[];
}

export interface EnclosureMechanicsReport {
  bendingStiffnessNm: number; // E * h^3 / [12 * (1 - nu^2)]
  fundamentalPanelModeHz: number; // f_{1,1}
  bracedPanelModeHz: number; // with 125mm matrix grid
  matrixBraceSpanMm: number;
  cldLossFactor: number; // eta_sys with constrained layer damping
  wllDguv10to1Kg: number; // DGUV Vorschrift 17 certified WLL (10:1 safety factor)
  wllAnsi7to1Kg: number; // ANSI E1.8 WLL (7:1 safety factor)
  absorptionMaterial: string;
  staticAirflowResistivityRaylsM: number; // ISO 9053 sigma (Pa*s/m^2)
  isothermalVolumeEnhancementFactor: number; // 1.15 to 1.25
  // Surface Finish Acoustic Telemetry
  finishSpec?: SurfaceFinishSpec;
  addedFinishMassKg: number;
  addedFinishCostUsd: number;
  rawPanelModeHz: number;
  finishPanelModeHz: number;
  panelRingingAttenuationDb: number;
  compositeLossFactor: number;
  // 3D Print Filament Telemetry
  isFilamentMaterial?: boolean;
  effectiveDensityKgM3?: number;
  flexuralModulusGpa?: number;
  poissonRatio?: number;
  dampingLossFactor?: number;
  longitudinalWaveSpeedMs?: number;
  spoolCount?: number;
  spoolCostUsd?: number;
  wallComplianceWarning?: string;
  balticBirchReferenceModeHz?: number;
}

export interface ParametricPortCrossSectionSpec {
  profileType: ParametricPortProfileType;
  profileLabel: string;
  throatAreaCm2: number;
  mouthAreaCm2: number;
  wettedPerimeterMm: number;
  hydraulicDiameterMm: number;
  perimeterToAreaRatioMmInv: number;
  widthMm: number;
  heightMm: number;
  flareRadiusMm: number;
  hornFlareConstantM?: number;
}

export interface ParametricPortReport {
  profileType: ParametricPortProfileType;
  profileLabel: string;
  synthesisSummary: string;
  // Acoustic & Fluid Dynamics
  effectiveLengthMm: number;
  physicalCenterlineLengthMm: number;
  endCorrectionFactorK: number;
  endCorrectionMm: number;
  crossSection: ParametricPortCrossSectionSpec;
  // Fluid Velocity & Turbulence Telemetry
  peakAirVelocityMs: number;
  ratedPowerAirVelocityMs: number;
  machNumber: number;
  reynoldsNumber: number;
  viscousBoundaryLayerMm: number;
  velocityStatus: 'laminar_optimal' | 'transitional_caution' | 'chuffing_critical';
  exceedsSonicLimit34Ms: boolean;
  // Folding & Spatial Path Geometry
  isFolded: boolean;
  foldBendCount: 0 | 1 | 2;
  legLengthsMm: number[];
  clearInternalDepthMarginMm: number;
  // Aeroacoustic Bend & Quarter-Wave Trap Telemetry (Blueprint Subsystem 2)
  deanNumber?: number;
  elbowEffectiveLengthFactorKl?: number;
  elbowImpedanceFactorKzc?: number;
  hasCoaxialTurningVanes?: boolean;
  organPipeFundamentalFreqHz?: number;
  midpointTrapNeckDiaMm?: number;
  midpointTrapVolumeCm3?: number;
  midpointTrapAttenuationDb?: number;
  // CAD & Manufacturing Synthesis
  fabricationMethod: 'additive_3d_print' | 'cnc_laminated_wood' | 'hybrid_flared_slot';
  structuralWallThicknessMm: number;
  envelopeDimensionsMm: { widthMm: number; heightMm: number; depthMm: number };
  needsSegmentedPrint: boolean;
  segmentCount: number;
  manifoldVertexCountEstimate: number;
}

export interface PortCatalogMatch {
  status: 'parametric_synthesized' | 'custom_3d_print';
  synthesizedProfileName: string;
  printDimensionsMm: { widthMm: number; heightMm: number; depthMm: number };
  needsModularSplit: boolean;
  splitSegmentCount: number;
  structuralWallThicknessMm: number;
  mountingCollarDiameterMm: number;
  salvattiFlareRadiusMm: number;
  hydraulicDiameterMm: number;
  wettedPerimeterMm: number;
  peakVelocityMs: number;
  ratedPowerVelocityMs: number;
  exceeds34MsLimit: boolean;
  isLaminar: boolean;
  reason: string;
}

export interface EigenmodePoint {
  axis: 'Height (Longitudinal)' | 'Width (Transverse)' | 'Depth (Axial)';
  modeOrder: number; // 1st, 2nd, 3rd harmonic
  frequencyHz: number;
  wavelengthMm: number;
  severity: 'high' | 'moderate' | 'low';
  description: string;
}

export interface InternalReflectorConfig {
  type: 'angled_baffle_deflector' | 'pyramid_diffuser' | 'corner_chamfer';
  angleDeg: number;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  placementYMm: number; // vertical height offset from cabinet floor
  placementZMm: number; // depth offset from front baffle
  materialName: string;
  benefits: string[];
  installationGuide: string;
}

// --- PROCEDURAL DIFFUSER & ACOUSTIC WAVEFORM SCATTERING TYPES ---
export type DiffuserType = 'qrd_1d' | 'skyline_2d';
export type DiffuserTargetWall = 'rear' | 'sides' | 'top_bottom' | 'all';
export type DiffuserPrimeNumber = 7 | 11 | 13 | 17 | 19 | 23;
export type DiffuserMaterialType = 'petg_cf' | 'pla_cf' | 'mdf_wood' | 'rigid_pu_resin';

export interface ProceduralDiffuserConfig {
  enabled: boolean;
  type: DiffuserType;
  targetWall: DiffuserTargetWall;
  primeN: DiffuserPrimeNumber;
  designFreqHz: number;
  wellWidthMm: number;
  finThicknessMm: number;
  materialType: DiffuserMaterialType;
  wellCountOverride?: number;
}

export interface DiffuserTargetedEigenmode {
  axis: 'Depth (Axial)' | 'Width (Transverse)' | 'Height (Longitudinal)';
  harmonicModeHz: number;
  rawQ: number;
  dampedQ: number;
  attenuationDb: number;
  mitigationStatus: 'suppressed' | 'diffused' | 'unaffected';
}

export interface ProceduralDiffuserReport {
  enabled: boolean;
  type: DiffuserType;
  typeLabel: string;
  targetWall: DiffuserTargetWall;
  targetWallLabel: string;
  primeN: DiffuserPrimeNumber;
  designFreqHz: number;
  // Acoustic Bandwidth (ISO 17497)
  lowCutoffFreqHz: number; // c / (2 * d_max)
  highCutoffFreqHz: number; // c / (2 * wellWidth)
  bandwidthOctaves: number;
  // Coefficients
  diffusionCoefficientMid: number; // ISO 17497-2 delta
  scatteringCoefficientMid: number; // ISO 17497-1 s
  backWaveAbsorptionGainDb: number; // suppression of back-wave cone coloration
  primaryAttenuatedModeHz: number;
  primaryAttenuationDb: number; // e.g. -7.8 dB
  targetedModes: DiffuserTargetedEigenmode[];
  // Physical & Procedural Geometry
  maxWellDepthMm: number;
  wellDepthsMm: number[]; // 1D array of well depths
  skylineMatrixMm?: number[][]; // 2D array of block heights for skyline
  totalCoveredWalls: number;
  panelWidthMm: number;
  panelHeightMm: number;
  wellWidthMm: number;
  finThicknessMm: number;
  // Volumetric & Weight Impact
  displacedVolumeLiters: number; // volume subtracted from net Vb
  totalMassKg: number;
  materialName: string;
  materialDensityKgM3: number;
  // Spatial Clearance
  clearanceToDriverMagnetMm: number;
  hasMagnetClash: boolean;
  recommendations: string[];
}

// --- INTEGRAL 3D-PRINTED ACOUSTIC DAMPENING & MATRIX GEOMETRY TYPES ---
export type TpmsLatticeType = 'gyroid_minimal' | 'schwarz_diamond' | 'schwarz_primitive' | 'neovius';
export type AcousticTrapGeometry = 'tortuous_labyrinth' | 'quarter_wave_baffles' | 'micro_perforated_wedge';
export type AmFabricationMethod = 'fdm_self_supporting' | 'sls_powder_drain' | 'sla_resin_evacuation';

export interface IntegralMatrixConfig {
  enabled: boolean;
  latticeType: TpmsLatticeType; // default 'gyroid_minimal'
  trapGeometry: AcousticTrapGeometry; // default 'tortuous_labyrinth'
  fabricationMethod: AmFabricationMethod; // default 'fdm_self_supporting'
  unitCellSizeMm: number; // 6mm to 18mm, default 10mm
  relativeDensityPercent: number; // 20% to 55%, default 32%
  coreThicknessMm: number; // 8mm to 20mm, default 12mm
  outerSkinThicknessMm: number; // default 2.4mm
  innerSkinThicknessMm: number; // default 1.6mm micro-perforated
  rearTrapDepthMm: number; // 20mm to 65mm, default 35mm
  rearTrapWidthMm?: number;
  rearTrapHeightMm?: number;
  maxOverhangAngleDeg: number; // default 45 degrees
  drainChannelDiameterMm: number; // default 4.5mm
  eliminateExternalLiners: boolean; // default true (no foam/fiberglass required)
}

export interface JcaAcousticParameters {
  flowResistivityRaylsM: number; // sigma (Pa*s/m^2) e.g. 24,000
  tortuosity: number; // alpha_infinity e.g. 1.48
  viscousCharacteristicLengthUm: number; // Lambda (microns) e.g. 120
  thermalCharacteristicLengthUm: number; // Lambda_prime (microns) e.g. 240
  openPorosity: number; // phi e.g. 0.68
}

export interface AdditiveAcousticReport {
  enabled: boolean;
  latticeType: TpmsLatticeType;
  latticeLabel: string;
  trapGeometry: AcousticTrapGeometry;
  trapLabel: string;
  fabricationMethod: AmFabricationMethod;
  fabricationLabel: string;
  // Acoustic dissipation & absorption
  jca: JcaAcousticParameters;
  absorptionCoefficient100Hz: number;
  absorptionCoefficient500Hz: number;
  absorptionCoefficient1000Hz: number;
  absorptionCoefficient4000Hz: number;
  nrcScore: number; // Noise Reduction Coefficient
  backWaveAttenuationDb: number; // e.g. -14.2 dB
  cavityQDampingFactor: number; // e.g. Q reduced by 68%
  standingWaveMitigationDb: number; // e.g. -9.5 dB
  foamEliminated: boolean;
  // Structural Stiffness & Mechanics (EI)
  solidWallStiffnessNm: number;
  sandwichStiffnessNm: number;
  stiffnessGainFactor: number; // e.g. 2.4x (EI increase)
  panelResonanceShiftPercent: number; // e.g. +38% push into higher inaudible band
  shearWebBucklingSafetyFactor: number; // e.g. 4.2:1
  // Additive Manufacturing & Volumetric Metrics
  overhangAngleCompliant: boolean;
  maxMeasuredOverhangDeg: number;
  drainPathCount: number;
  displacedSolidVolumeLiters: number;
  coreVolumeLiters: number;
  trapVolumeLiters: number;
  addedFilamentMassKg: number;
  printTimeEstimateHours: number;
  meshManifoldStatus: 'watertight_manifold' | 'self_supporting_verified';
  engineeringAdvisories: string[];
}

export interface StandingWaveReport {
  longitudinalHz: number; // 1st height mode f_1,0,0
  transverseHz: number; // 1st width mode f_0,1,0
  axialDepthHz: number; // 1st depth mode f_0,0,1
  eigenmodes: EigenmodePoint[];
  aspectRatioQuality: 'optimal_golden_ratio' | 'favorable' | 'problematic_cube' | 'problematic_square';
  aspectRatioText: string;
  standingWaveRiskLevel: 'low' | 'moderate' | 'high';
  primaryResonantPeakHz: number;
  reflectorAdvisor: InternalReflectorConfig;
  diffuserActive?: boolean;
  diffuserAttenuatedPeakHz?: number;
  diffuserAttenuationDb?: number;
}

export interface AcousticCalculationResult {
  netVolumeLiters: number;
  grossInternalVolumeLiters: number;
  driverDisplacementLiters: number;
  bracingDisplacementLiters: number;
  portDisplacementLiters: number;
  midrangeChamberVolumeLiters: number;
  effectiveAcousticVolumeLiters: number;
  boxQtc: number;
  tuningFrequencyFb: number;
  f3CutoffHz: number;
  f6CutoffHz: number;
  f10CutoffHz: number;
  portLengthMm: number;
  portAirVelocityMs: number;
  isChuffingRisk: boolean;
  recommendedMinimumPortDiameterMm: number;
  optimalFlareRadiusMm: number;
  portMatch: PortCatalogMatch;
  parametricPort?: ParametricPortReport;
  standingWaves: StandingWaveReport;
  totalWeightKg: number;
  firstInternalResonanceHz: number;
  materialCost: MaterialCostResult;
  crossover: CrossoverNetworkResult;
  frequencyResponse: {
    freq: number;
    dbTotal: number;
    dbWoofer: number;
    dbMidrange?: number;
    dbTweeter: number;
    excursionMm: number;
    airVelocityMs?: number;
  }[];
  layout: BaffleLayoutResult;
  // Advanced Electroacoustic Metrics from Training Data
  spinorama: SpinoramaCurvePoint[];
  groupDelay: GroupDelayCurvePoint[];
  klippelThermal: KlippelThermalReport;
  waveguide: OblateSpheroidalWaveguideConfig;
  cardioid: CardioidSubwooferConfig;
  mechanics: EnclosureMechanicsReport;
  dampingAdvisor: DampingAdvisorReport;
  // Archetype System Telemetry
  categoryTelemetry?: {
    category: SpeakerCategory;
    maxSplDbAt1m: number;
    maxContinuousPowerW: number;
    portNoiseMargin: string;
    portNoiseStatus: 'nominal' | 'caution' | 'critical';
    categoryRecommendation: string;
    powerCompressionDb: number;
  };
  // Subcategory System Telemetry
  subcategoryTelemetry?: {
    subcategory: SpeakerSubcategory;
    name: string;
    engineeringBadge: string;
    targetDescription: string;
    wooferQuantity: number;
    wiring: 'single' | 'parallel';
    combinedSdCm2: number;
    combinedVdCm3: number;
    isDualWoofer: boolean;
    isCoaxial: boolean;
    isBandpass: boolean;
    hasPlateAmplifier: boolean;
    plateAmpDisplacementLiters?: number;
    plateAmpContinuousPowerW?: number;
    bandpassFrontVbLiters?: number;
    bandpassRearVbLiters?: number;
  };
  // Real-Time Physics Max SPL Calculator Report
  maxSplReport?: MaxSplCalculationReport;
  driverCompatibility?: DriverCompatibilityReport;
  firReport?: FirSimulationReport;
  speakonReport?: SpeakonReport;
  diffuserReport?: ProceduralDiffuserReport;
  additiveAcousticReport?: AdditiveAcousticReport;
  systemImpedance?: SystemImpedanceReport;
  multiphysicsBlueprint?: MultiphysicsBlueprintReport;
  thermalVentReport?: ThermalVentilationReport;
  caliberReport?: SpeakerCaliberReport;
}

export interface CoOptimizationConfig {
  enabled: boolean;
  lockCabinetDimensions: boolean;
  lockPortGeometry: boolean;
  lockThermalVents: boolean;
  lockStructuralBracing: boolean;
  lockCrossoverNetwork: boolean;
}

export type SpeakerCaliberGrade =
  | 'Master Reference'
  | 'Studio Precision'
  | 'Production Grade'
  | 'Sub-Optimal';

export interface SpeakerCaliberSubScores {
  alignmentScore: number; // 0-100: Vb & Fb/Qtc fidelity to optimal Thiele-Small alignment
  aeroPortScore: number; // 0-100: Port Mach laminar margin, flare radius & Karal-Fok brace relief
  thermalHeadroomScore: number; // 0-100: Voice-coil steady-state ΔTv & thermal compression < 1.0 dB
  structuralModalScore: number; // 0-100: Rayleigh-Ritz f11 / f_xo separation >= 2.0 & wall compliance
  diffractionDampingScore: number; // 0-100: Baffle edge radius r >= lambda/8 & standing-wave mitigation
  electroAcousticScore: number; // 0-100: Crossover driver bandwidth, baffle-step & Zobel conjugation
}

export interface SpeakerCaliberReport {
  overallScore: number; // 0-100 composite reference caliber score (1 decimal)
  gradeLabel: SpeakerCaliberGrade;
  subScores: SpeakerCaliberSubScores;
  activeImprovements: string[];
  limitingFactors: string[];
  vbTargetLiters: number;
  vbDeviationPercent: number;
  fbTargetHz: number;
  fbDeviationHz: number;
  panelEigenfrequencyRatio: number; // f11_braced / f_xo
  baffleStepKneeHz: number;
}

export interface CaliberDeltaEvent {
  timestamp: number;
  previousScore: number;
  currentScore: number;
  deltaScore: number;
  triggerDescription: string;
  coOptimizedActions: string[];
  vbDriftLiters: number;
  compressionDeltaDb: number;
}

// --- ARCHITECTURAL BLUEPRINT FOR RESONANCECAD: 7-SUBSYSTEM MULTIPHYSICS TYPES ---

export interface KaralFokBraceVirtualMassReport {
  braceCount: number;
  openAreaRatioPhi: number; // phi = S_open / S_cab (0.20 to 0.65)
  constrictionRatioXi: number; // xi = sqrt(phi)
  jaouenChevillotteInteractionFactorPsi: number; // Psi(phi) = 0.8216 - 1.34*xi + 0.13*xi^2 + 0.39*xi^3
  twoSidedAttachedLengthMm: number; // delta_end = (16 * r_open / (3 * pi)) * Psi(phi)
  singleBraceAcousticMassKgM4: number; // M_brace (kg/m^4)
  totalSeriesBraceMassKgM4: number; // N_b * kappa_v^2 * M_brace
  uncompensatedFbHz: number;
  shiftedActualFbHz: number; // fb_actual downward shift (1.5% to 7.0%)
  tuningFrequencyShiftPercent: number; // e.g. -3.05%
  portPreShorteningCompensationMm: number; // physical cut length reduction to hold target Fb
  helmholtzNumberKa: number; // k * L_max
  tmmThroatImpedanceMagPasM3: number;
}

export interface DeanVortexPortAeroReport {
  terminationRegime:
    | 'unobstructed_intruded_pipe'
    | 'flush_internal_partition'
    | 'parallel_wall_dihedral'
    | 'normal_rear_wall_magnet';
  terminationRegimeLabel: string;
  interiorEndCorrectionRatioDeltaLOverR: number;
  bendRadiusRatioRbOverR: number; // r_b / r (e.g. 1.50 standard, 2.00 moderate sweep)
  curvatureRatioROverRb: number; // r / r_b
  deanNumber: number; // De = Re * sqrt(r / r_b)
  effectiveLengthFactorKl: number; // K_L = 1 - 0.143 * (r / r_b)^2.02
  characteristicImpedanceFactorKzc: number; // K_Zc = 1 - 0.138 * (r / r_b)^2.20
  elbowArcLengthCompensationMm: number; // L_geom,arc - L_acoust,arc
  hasCoaxialTurningVanes: boolean;
  turningVaneCount: number;
  // Midpoint Side-Branch Helmholtz Quarter-Wave Trap
  organPipeFundamentalFreqHz: number; // f_pipe,1 = c_0 / (2 * L_eff)
  trapPositionMidpointMm: number; // x = L_p / 2
  trapNeckDiameterMm: number;
  trapNeckPhysicalLengthMm: number;
  trapNeckEffectiveLengthMm: number; // Ji BEM side-branch polynomial
  trapCavityVolumeCm3: number;
  trapTransmissionLossDb: number; // > 20 dB at f_pipe,1
}

export interface PorousAbsorptionZoningReport {
  activeModel: 'jca_5param' | 'garai_pompoli_dacron' | 'miki_positive_real' | 'delany_bazley';
  activeModelLabel: string;
  bulkDensityKgM3: number;
  flowResistivityPasM2: number; // sigma
  normalizedFreqRatioX: number; // X = f / sigma at 250 Hz
  passivityThresholdXCrit: number; // 0.00633 m^3/kg for Miki, enforced via JCA below 65 Hz
  isPassivityCompliant: boolean;
  normalizedImpedanceReal250Hz: number;
  normalizedImpedanceImag250Hz: number;
  normalizedWavenumberReal250Hz: number;
  normalizedWavenumberImag250Hz: number;
  effectivePhaseSpeed250HzMs: number; // c_eff at 250 Hz (119.2 - 243.3 m/s vs 343 m/s)
  normalAbsorptionCoeff250Hz: number;
  normalAbsorptionCoeff1000Hz: number;
  quarterWaveAntinodeOffsetMm: number; // lambda/4 velocity antinode distance from rigid wall
  portIntakeKeepOutRadiusMm: number; // R_keepout >= 2.0 * D_port
  velocityToPressureEnergyRatioEta: number; // eta_{v/p} >= 1.5 in core
}

export interface ImplicitSdfMonocoqueReport {
  sminBlendingRadiusMm: number; // k
  sminSeamFilletThicknessMm: number; // k / 4
  fglBossSolidDensityPercent: number; // 70 - 100% within R_boss
  fglCoreRelativeDensityPercent: number; // 15 - 30% in low-stress wall core
  // 3.5 kN Structural Boss Calibration
  recommendedInsertSpec: string; // e.g. 'M6 Long-Engagement Brass/Steel Heat-Set in PA12-CF'
  bossOuterDiameterMm: number; // 2.2 * D_insert
  concentricPerimeterCount: number; // 6 solid perimeters
  pilotHoleDiameterMm: number;
  reliefWellExtraDepthMm: number; // +1.5 mm
  predictedAxialPullOutForceKn: number; // >= 3.50 kN (vs 0.2-0.4 kN standard M3 PLA)
  meets35KnRiggingTarget: boolean;
  // Modal Antinode Granular Particle Damping (PD) Pockets
  particleDampingPocketCount: number;
  wallVolumeFractionPercent: number; // 4% to 20%
  volumetricPackingRatioPercent: number; // 75% (60-85% optimal headspace)
  dampingImprovementFactor: number; // up to 5.64x (+564% modal damping)
  // Manifold Dual Contouring & .3MF Export
  meshingAlgorithm: 'Manifold Dual Contouring (Hermite QEF)';
  exportFormatSpec: '.3MF Archive with slic3rpe Modifier Volumes';
  estimatedDualContouringVertices: number;
}

export interface SubtractiveCncCamLayerSpec {
  layerName:
    | 'DRILL_PILOT_M6'
    | 'POCKET_DADO_6MM'
    | 'RABBET_DRIVER_FLUSH'
    | 'CHAMFER_45DEG'
    | 'THROUGH_CUT';
  toolpathType: string;
  recommendedTooling: string;
  targetZDepthMm: number;
  cutterOffsetFormula: string;
}

export interface SubtractiveCncJoineryReport {
  caliperStockThicknessMm: number; // t_cal
  engagementDepthMm: number; // d_eng (0.33 to 0.50 t_cal)
  glueReliefClearanceMm: number; // c_d = 0.5 mm
  lateralWidthClearanceMm: number; // c_w = 0.15 mm
  routedDadoWidthMm: number; // t_cal + c_w
  routedDadoDepthMm: number; // d_eng + c_d
  matingBraceCutLengthMm: number; // L_in + 2 * d_eng
  cutterDiameterMm: number; // 6.35 mm (1/4" end mill)
  dogboneBisectorOffsetMm: number; // R_tool * (1 - 1/sqrt(2)) = 0.930 mm
  dogboneDiagonalOvercutMm: number; // R_tool * (sqrt(2) - 1) = 1.315 mm
  maxSafePocketDepthMm: number; // <= 4 * D_cutter
  dxfLayers: SubtractiveCncCamLayerSpec[];
}

export interface InternalSubChambersThermalReport {
  // Exponentially Tapered Nautilus Midrange Spine
  hasTaperedNautilusSpine: boolean;
  nautilusLengthMm: number;
  throatRadiusMm: number; // r_0
  apexRadiusMm: number; // r_end
  exponentialFlareConstantAlphaMInv: number; // alpha_t = (1/L) * ln(r_0 / r_end)
  hornCutoffFreqHz: number; // f_c = alpha_t * c_eff / (2 * pi)
  gradedFlowResistivityRangePasM2: string; // '3,000 (throat) -> 20,000 (apex) Pa·s/m²'
  // Hermetic Wire Conduits
  wireConduitType: string; // 'Co-Printed Ø9mm Wall Conduit + IP68 M16 EPDM Gland + Epoxy Potting Trap'
  pressureLeakageRisk: 'zero_hermetic';
  // Oscillating-Flow Convective Thermal Chimney
  voiceCoilThermalTimeConstantSec: number; // ~15.4 s
  magnetThermalTimeConstantSec: number; // ~1625 s
  convectionCoolingCoeffRv: number; // 0.702 Ws/(K*m)
  oscillatingNusseltMultiplier: number; // e.g. 2.35x heat transfer vs stagnant air
  thermalCompressionReductionDb: number; // e.g. -1.15 dB reduction in power compression
}

export interface LeachWrightNonlinearDspReport {
  // Hilbert Transform Minimum/Excess Phase
  acousticCenterDelayUs: number; // tau_delay (microseconds)
  baffleStepPhysicalOffsetMm: number;
  // Leach & Wright Semi-Inductive Voice-Coil Eddy-Current Model
  leachL0: number;
  leachExponentN: number; // typically 0.65 - 0.72
  wrightKr: number;
  wrightEr: number;
  wrightKi: number;
  wrightEi: number;
  effectiveInductance100HzMh: number;
  effectiveInductance1kHzMh: number;
  effectiveInductance10kHzMh: number;
  eddyCurrentResistance10kHzOhm: number;
  // Passive Conjugate & IPC-2152/2221 PCB Specs
  zobelRzOhm: number;
  zobelCzUf: number;
  conjugateNotchResOhm: number;
  conjugateNotchCrcUf: number;
  conjugateNotchLrcMh: number;
  bridgedTAllPassLapUh: number;
  bridgedTAllPassCapUf: number;
  ipc2221TraceWidth1OzMm: number;
  ipc2221TraceWidth2OzMm: number;
  iec62368CreepageSpacingMm: number;
  // Active Mixed IIR/FIR & Klippel KCS Limiter
  firPreRingingMs: number; // < 1.2 ms (below 5-20 ms human pre-masking)
  totalSystemLatencyMs: number; // ~3.15 ms
}

export interface MultiphysicsBlueprintReport {
  karalBraceMass: KaralFokBraceVirtualMassReport;
  portAeroAndTrap: DeanVortexPortAeroReport;
  porousAbsorption: PorousAbsorptionZoningReport;
  implicitSdfMonocoque: ImplicitSdfMonocoqueReport;
  subtractiveCncJoinery: SubtractiveCncJoineryReport;
  subChambersAndThermal: InternalSubChambersThermalReport;
  driverEddyAndNonlinear: LeachWrightNonlinearDspReport;
}

export interface MaxSplCalculationReport {
  systemSensitivity1w1mMm: number; // Voltage sensitivity in dB SPL @ 1m
  inputPowerWatts: number; // Actual applied input power in Watts
  maxContinuousPowerW: number; // Driver continuous Pe thermal power handling
  maxPeakPowerW: number; // Peak power capacity (Watts)
  thermalMaxSplAt1m: number; // Thermal limited Max SPL dB @ 1m
  displacementMaxSplAt1m: number; // Displacement/Xmax limited Max SPL dB @ 1m at bass cutoff
  displacementLimitedFreqHz: number; // Frequency at which Xmax displacement bottleneck occurs (Hz)
  limitingFactor: 'thermal_power' | 'excursion_displacement' | 'port_chuffing';
  limitingFactorDescription: string;
  boundarySpace: 'free_space_4pi' | 'half_space_2pi' | 'corner_bound_1pi';
  boundaryGainDb: number;
  targetDistanceM: number;
  distanceLossDb: number;
  effectiveContinuousSplDb: number; // Continuous SPL dB at distance & boundary
  effectivePeakSplDb: number; // Peak transient SPL dB (+6dB crest factor)
  powerCompressionLossDb: number; // Thermal compression loss
  archetypeTargetSplDb: number; // Recommended target SPL for active archetype
  archetypeHeadroomDb: number; // Headroom relative to archetype target
  archetypeStatus: 'optimal_headroom' | 'adequate' | 'underpowered';
  archetypeRecommendation: string;
}

export interface PartMetadata {
  id: string;
  name: string;
  spatialLabel?: string;
  spatialLocation?: string;
  category: 'panel' | 'brace' | 'driver' | 'port' | 'acoustic' | 'hardware' | 'crossover';
  dimensionsMm: { w: number; h: number; d: number };
  material: string;
  weightKg?: number;
  estimatedCostUsd?: number;
  acousticRole: string;
  assemblyNotes: string;
  machiningOperations: string[];
  tsParameters?: {
    brand: string;
    model: string;
    role: string;
    fsHz: number;
    qts: number;
    qes: number;
    qms: number;
    vasLiters: number;
    xmaxMm: number;
    peWatts: number;
    sensitivityDb: number;
    impedanceOhm: number;
  };
}

export type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'cutaway' | 'crossover';

export type WizardStep = 'category' | 'performance_goals' | 'transducers' | 'enclosure_waveguide' | 'review';

export interface SpeakerWizardState {
  step: WizardStep;
  category: SpeakerCategory;
  subcategory: SpeakerSubcategory;
  targetPeakSplDb: number;
  listeningDistanceM: number;
  boundarySpace: 'free' | 'half' | 'corner';
  wooferCount: number;
  selectedWooferId: string;
  selectedTweeterId?: string;
  hasTweeterOrHorn: boolean;
  hornType?: 'conical' | 'exponential' | 'exponential_tractrix' | 'constant_directivity';
  coverageAngleDeg?: number;
  cabinetMaterial: MaterialType;
  alignment: AlignmentType;
  targetVolumeL: number;
}
