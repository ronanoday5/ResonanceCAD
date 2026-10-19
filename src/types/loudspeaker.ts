export type AlignmentType = 'sealed' | 'ported' | 'bandpass4';

export type SystemTopology = 'single' | 'two_way' | 'three_way' | 'mtm';

export type FilterType = 'butterworth' | 'linkwitz_riley';
export type FilterOrder = 1 | 2 | 3 | 4; // 6, 12, 18, 24 dB/octave

export type MaterialType =
  | 'baltic_birch_18'
  | 'baltic_birch_15'
  | 'mdf_19'
  | 'mdf_25'
  | 'marine_ply_18'
  | 'solid_hardwood_20';

export interface MaterialSpec {
  id: MaterialType;
  name: string;
  nominalThicknessMm: number;
  densityKgM3: number;
  dampingFactor: number;
  textureColor: string;
  roughness: number;
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
  voiceCoilDiameterMm: number; // mm
  frameOuterDiameterMm: number;
  cutoutDiameterMm: number;
  mountingDepthMm: number;
  magnetDiameterMm: number;
  magnetDepthMm: number;
  displacementLiters: number;
  splSensitivityDb: number; // dB @ 1W/1m
  reOhm?: number; // DC resistance
  leMh?: number; // Voice coil inductance in mH
  description: string;
}

export interface DriverAssignment {
  role: 'tweeter' | 'midrange' | 'woofer';
  driver: DriverPreset;
  quantity: number;
  impedanceOhm: number;
  attenuationDb: number; // L-Pad setting
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
  valueFormatted: string; // e.g., "1.2 mH" or "15.0 µF"
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

export interface AcousticParameters {
  topology: SystemTopology;
  driverAssignments: Record<'tweeter' | 'midrange' | 'woofer', DriverAssignment>;
  alignment: AlignmentType;
  targetQtc: number;
  targetFb: number;
  portType: 'round' | 'slot';
  portDiameterMm: number;
  slotWidthMm: number;
  slotHeightMm: number;
  numberOfPorts: number;
  dampingFillPercent: number;
  bracingLevel: 'minimal' | 'standard' | 'heavy';
  // Crossover settings
  crossoverLowHz: number; // Woofer -> Midrange or Woofer -> Tweeter
  crossoverHighHz: number; // Midrange -> Tweeter (for 3-Way)
  lowPassOrder: FilterOrder;
  lowPassType: FilterType;
  highPassOrder: FilterOrder;
  highPassType: FilterType;
  midPassOrder?: FilterOrder;
  midPassType?: FilterType;
}

export interface EnclosureDimensions {
  externalWidthMm: number;
  externalHeightMm: number;
  externalDepthMm: number;
  material: MaterialType;
  baffleThicknessMm: number;
  jointType: 'butt' | 'rabbet' | 'miter';
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
  cutNotes: string;
  machiningNotes: string;
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
  totalWeightKg: number;
  firstInternalResonanceHz: number;
  crossover: CrossoverNetworkResult;
  frequencyResponse: {
    freq: number;
    dbTotal: number;
    dbWoofer: number;
    dbMidrange?: number;
    dbTweeter: number;
    excursionMm: number;
  }[];
}

export interface PartMetadata {
  id: string;
  name: string;
  category: 'panel' | 'brace' | 'driver' | 'port' | 'acoustic' | 'hardware' | 'crossover';
  dimensionsMm: { w: number; h: number; d: number };
  material: string;
  weightKg?: number;
  acousticRole: string;
  assemblyNotes: string;
  machiningOperations: string[];
}

export type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'cutaway' | 'crossover';
