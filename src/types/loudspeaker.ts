export type AlignmentType = 'sealed' | 'ported' | 'bandpass4';

export type SystemTopology = 'single' | 'two_way' | 'three_way' | 'mtm';

export type FilterType = 'butterworth' | 'linkwitz_riley';
export type FilterOrder = 1 | 2 | 3 | 4;

export type MaterialCategory = 'sheet_goods' | 'filaments';

export type MaterialType =
  | 'baltic_birch_18'
  | 'baltic_birch_15'
  | 'mdf_19'
  | 'mdf_25'
  | 'marine_ply_18'
  | 'solid_hardwood_20'
  | 'petg_cf'
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
  nominalThicknessMm: number;
  densityKgM3: number;
  defaultCostPerM2: number; // default cost in USD/m²
  costPerKgUsd?: number; // USD/kg for 3D filaments
  flexuralModulusGpa?: number; // GPa
  dampingFactor: number;
  textureColor: string;
  roughness: number;
  badge?: string;
}

export interface MaterialPricingConfig {
  customDensityKgM3: number;
  costPerSquareMeter: number;
  wastePercentage: number; // e.g. 15% cutting loss
}

export interface MaterialCostResult {
  netSurfaceAreaM2: number;
  grossSurfaceAreaM2: number;
  totalCostUsd: number;
  totalDryWeightKg: number;
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
  description: string;
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
  allComponents: CrossoverComponent[];
  estimatedPcbAreaCm2: number;
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

export interface AcousticParameters {
  topology: SystemTopology;
  driverAssignments: Record<'tweeter' | 'midrange' | 'woofer', DriverAssignment>;
  alignment: AlignmentType;
  targetQtc: number;
  targetFb: number;
  portType: 'round' | 'slot';
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
  // Advanced Electroacoustic & Physics Parameters (from Training Data)
  thermalDriveLevel?: 'small_signal' | 'nominal_aes' | 'max_continuous';
  operatingTemperatureC?: number;
  subwooferArrayMode?: 'omni' | 'cardioid_gradient' | 'end_fire';
  waveguideCoverageAngleDeg?: number;
  baffleEdgeRadiusMm?: number;
  hasConstrainedLayerDamping?: boolean;
  absorptionMaterialType?: DampingMaterialType;
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
}

export interface CutListItem {
  id: string;
  name: string;
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
  spoolCount?: number;
  spoolCostUsd?: number;
  wallComplianceWarning?: string;
  balticBirchReferenceModeHz?: number;
}

export interface PortCatalogMatch {
  status: 'cots_available' | 'custom_3d_print';
  cotsPartName?: string;
  cotsInnerDiameterMm?: number;
  cotsCutLengthMm?: number;
  printDimensionsMm: { widthMm: number; heightMm: number; depthMm: number };
  needsModularSplit: boolean;
  splitSegmentCount: number;
  structuralWallThicknessMm: number;
  mountingCollarDiameterMm: number;
  salvattiFlareRadiusMm: number;
  peakVelocityMs: number;
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
}

export interface PartMetadata {
  id: string;
  name: string;
  category: 'panel' | 'brace' | 'driver' | 'port' | 'acoustic' | 'hardware' | 'crossover';
  dimensionsMm: { w: number; h: number; d: number };
  material: string;
  weightKg?: number;
  estimatedCostUsd?: number;
  acousticRole: string;
  assemblyNotes: string;
  machiningOperations: string[];
}

export type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'cutaway' | 'crossover';
