export type ArrayCurvaturePreset =
  | 'straight'
  | 'j_curve'
  | 'spiral_progressive'
  | 'constant_curvature'
  | 'custom';

export type LineArrayRiggingType = 'flown' | 'ground_stacked';

export interface LineArrayModuleConfig {
  id: string;
  boxIndex: number; // 0 = top box attached to bumper/flybar
  splayAngleDeg: number; // Angle relative to box above (0° to 12°), e.g. 0, 1, 2, 3, 4, 6, 8, 10, 12
  gainTrimDb: number; // Downfill / zone gain shading (0 to -12 dB)
  delayMs: number; // Electronic delay steering (ms)
  hfShadingDb: number; // High frequency air-absorption compensation / shelf (+/- 6 dB)
  isMuted?: boolean;
}

export interface LineArrayVenueConfig {
  trimHeightM: number; // Vertical height from ground to bottom or top of array (e.g. 7.5m)
  bumperTiltDeg: number; // Overall inclination of top flybar (-15° down to +15° up)
  audienceDistanceStartM: number; // Front row listener distance from array footprint (e.g. 4m)
  audienceDistanceEndM: number; // Back row / bleachers distance (e.g. 45m)
  audienceElevationStartM: number; // Front row ear height (e.g. 1.2m seated, 1.6m standing)
  audienceElevationEndM: number; // Back row ear height / balcony elevation (e.g. 4.5m)
  temperatureC: number; // Air temperature in Celsius (default: 20°C)
  relativeHumidityPercent: number; // Relative humidity % (default: 50%)
}

export interface LineArrayConfig {
  enabled: boolean;
  moduleCount: number; // 2 to 24 modules (default: 8)
  curvaturePreset: ArrayCurvaturePreset;
  riggingType: LineArrayRiggingType;

  // Single Enclosure Physical & Acoustic Specs
  boxName: string;
  boxHeightMm: number; // e.g. 280 mm
  boxWidthMm: number; // e.g. 740 mm
  boxDepthMm: number; // e.g. 520 mm
  boxWeightKg: number; // e.g. 32 kg
  driverCenterSpacingMm: number; // Center-to-center distance between adjacent acoustic sources (e.g. 260 mm)
  driverCountPerBox: number; // e.g. 2 woofers
  driverDiameterInch: number; // e.g. 8" or 10" or 12"
  nominalSensitivity1w1mDb: number; // e.g. 102 dB
  powerHandlingRmsW: number; // e.g. 600 W
  horizontalDispersionDeg: number; // e.g. 90° or 110°
  verticalModuleDispersionDeg: number; // Single box vertical dispersion (typically 7° to 10°)
  maxSplayAngleDeg: number; // Physical joint pin limit (typically 10° or 12°)

  // Flybar / Bumper specs
  bumperWeightKg: number; // e.g. 45 kg
  bumperLengthMm: number; // e.g. 800 mm
  maxRiggingLoadWllKg: number; // Working Load Limit e.g. 1200 kg

  // Articulated Box Array Modules
  modules: LineArrayModuleConfig[];

  // Venue & Deployment Geometry
  venue: LineArrayVenueConfig;

  // Real-Time Simulation Controls
  analysisFrequencyHz: number; // e.g. 500, 1000, 2000, 4000, 8000 Hz
  showAcousticRays: boolean; // Ray-tracing dispersion beams in 3D
  showCoverageHeatmap: boolean; // Audience SPL color map in 3D
  showWavefrontIsobars: boolean; // Huygens cylindrical wavefront ribbons
  showRiggingPins: boolean; // Render mechanical rigging hardware in 3D
  audienceResolutionPoints: number; // Samples across audience listening plane (e.g. 50)
}

export interface AudiencePointResult {
  distanceM: number;
  elevationM: number;
  splTotalDb: number;
  splDirectDb: number;
  airLossDb: number;
  primaryContributingBoxIndex: number;
  aimAngleErrorDeg: number;
  isCovered: boolean;
}

export interface LineArraySimulationResult {
  // Acoustic Physics
  speedOfSoundMs: number;
  wavelengthM: number;
  totalArrayLengthM: number; // L = N * boxHeight
  nearFieldTransitionDistanceM: number; // r_trans = L^2 / (2 * lambda)
  couplingCutoffFrequencyHz: number; // f_coupling = c / (2 * driverSpacing)
  isAcousticallyCoupledAtFreq: boolean;
  effectiveVerticalDispersionDeg: number;

  // Spatial Coverage & SPL Telemetry
  frontRowSplDb: number;
  backRowSplDb: number;
  frontToBackSplDeltaDb: number;
  averageAudienceSplDb: number;
  splConsistencyRating: 'excellent' | 'good' | 'moderate' | 'uneven';
  audiencePoints: AudiencePointResult[];

  // Mechanical & Rigging Telemetry
  totalSuspendedWeightKg: number;
  centerOfGravityOffsetMm: number; // relative to bumper center
  frontPinLoadKg: number;
  rearPinLoadKg: number;
  riggingSafetyFactor: number; // e.g. 10.5:1
  isRiggingSafe: boolean;
  recommendedPickPoint: 'front' | 'rear' | 'center' | 'two_point_bridle';

  // Splay Angles & Orientations Summary
  cumulativeBoxAnglesDeg: number[];
  bottomBoxAimAngleDeg: number;
  topBoxAimAngleDeg: number;
}
