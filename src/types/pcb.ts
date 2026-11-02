export type PcbCopperWeightOz = 1 | 2 | 3; // 2oz is standard for audiophile passive crossovers (high current)
export type PcbSolderMaskColor = 'green' | 'black' | 'blue' | 'red' | 'white' | 'matte_black';
export type PcbSurfaceFinish = 'HASL_lead_free' | 'ENIG_gold' | 'OSP';

export type BoardStackArchitecture =
  | 'unified_single' // All-in-one crossover PCB
  | 'split_two_way' // Separate Woofer LP + Tweeter HP boards (Bi-Amp / Bi-Wire ready)
  | 'split_three_way'; // Separate Woofer LP + Midrange BP + Tweeter HP boards (Tri-Amp ready)

export type BoardModuleRole =
  | 'woofer_lowpass'
  | 'tweeter_highpass'
  | 'midrange_bandpass'
  | 'unified_crossover'
  | 'biwire_input_distributor';

export interface PcbHole {
  id: string;
  xMm: number;
  yMm: number;
  diameterMm: number;
  isPlated: boolean;
  netName?: string;
  type: 'mounting' | 'component_pin' | 'wire_pad' | 'tie_wrap_slot';
}

export interface PcbPad {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  shape: 'round' | 'rect' | 'obround';
  holeDiameterMm?: number;
  netName: string;
  layer: 'top' | 'bottom' | 'both';
  pinNumber?: number;
}

export interface PcbTrace {
  id: string;
  netName: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  widthMm: number; // e.g. 2.5mm or 3.8mm for high current woofer lines
  layer: 'top' | 'bottom';
}

export interface PcbSilkElement {
  id: string;
  text?: string;
  x: number;
  y: number;
  fontSizeMm?: number;
  type: 'text' | 'line' | 'rect' | 'circle';
  x2?: number;
  y2?: number;
  widthMm?: number;
  heightMm?: number;
  radiusMm?: number;
}

export interface PcbConnectorTerminal {
  id: string;
  label: string; // e.g. "IN+", "IN-", "W+", "W-", "T+", "T-", "J_BUS+"
  netName: string;
  xMm: number;
  yMm: number;
  screwTerminalPitchMm: number; // 5.08mm or 7.62mm pitch high-current block
  wireGaugeAwg: number;
}

export interface PcbComponentPlacement {
  id: string; // e.g. "L1", "C1", "R1"
  componentId: string;
  designator: string;
  type: 'inductor' | 'capacitor' | 'resistor' | 'terminal';
  valueFormatted: string;
  valueNumeric: number;
  unit: string;
  footprintName: string;
  midXMm: number;
  midYMm: number;
  rotationDeg: number; // 0, 90, 180, 270 (critical for 90° inductor anti-crosstalk!)
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  pads: PcbPad[];
  holes: PcbHole[];
  silkOutlines: PcbSilkElement[];
  tolerancePercent: number; // 1% or 5%
  ratingStr: string; // e.g. "400V MKP" or "10W Non-Inductive"
  recommendedPartNumber: string; // e.g. "Dayton Audio DMPC-6.8"
  distributorSku: string;
  estimatedCostUsd: number;
  magneticAxisDeg?: number; // Orientation of electromagnetic field
}

export interface InterBoardJumper {
  id: string;
  fromBoardId: string;
  toBoardId: string;
  signalName: string; // e.g. "INPUT_BUS_POS", "COMMON_GND", "BIAMP_LINK"
  fromPadLabel: string;
  toPadLabel: string;
  recommendedWireAwg: number; // e.g. 14 AWG for woofers, 18 AWG for tweeters
  wireColorHex: string;
  lengthMm: number;
}

export interface BoardModule {
  boardId: string;
  name: string;
  code: string; // e.g. "PCB-LP-01", "PCB-HP-01"
  role: BoardModuleRole;
  tierIndex: number; // 0 = bottom tier, 1 = mid tier, 2 = top tier
  dimensions: {
    widthMm: number;
    heightMm: number;
    thicknessMm: number;
  };
  copperWeightOz: PcbCopperWeightOz;
  solderMaskColor: PcbSolderMaskColor;
  surfaceFinish: PcbSurfaceFinish;
  cornerFilletRadiusMm: number;
  mountingHoleDiameterMm: number;
  mountingHoleInsetMm: number;
  components: PcbComponentPlacement[];
  traces: PcbTrace[];
  pads: PcbPad[];
  holes: PcbHole[];
  silkElements: PcbSilkElement[];
  connectors: PcbConnectorTerminal[];
  estimatedMassGrams: number;
  estimatedBOMCostUsd: number;
}

export interface CircuitBoardStack {
  stackId: string;
  stackName: string;
  architecture: BoardStackArchitecture;
  boards: BoardModule[];
  jumpers: InterBoardJumper[];
  totalBoardCount: number;
  totalBOMCostUsd: number;
  totalMassGrams: number;
  stackingHardware: {
    standoffHeightMm: number; // e.g. 25mm brass hex standoffs
    standoffThread: string; // "M4" or "4-40"
    standoffCount: number;
    tierCount: number;
  };
  cabinetFootprintMm: {
    widthMm: number;
    depthMm: number;
    maxStackHeightMm: number;
  };
}

export interface PickAndPlaceItem {
  designator: string;
  value: string;
  package: string;
  midX: number;
  midY: number;
  rotation: number;
  layer: 'Top' | 'Bottom';
}

export interface GerberExportFile {
  filename: string;
  boardName: string;
  layerType:
    | 'top_copper'
    | 'bottom_copper'
    | 'top_soldermask'
    | 'bottom_soldermask'
    | 'top_silkscreen'
    | 'bottom_silkscreen'
    | 'board_outline'
    | 'nc_drill'
    | 'bom'
    | 'pick_and_place'
    | 'netlist'
    | 'wiring_diagram';
  description: string;
  mimeType: string;
  content: string;
  isBinary?: boolean;
}

export interface GerberPackageResult {
  projectName: string;
  generatedDate: string;
  stackArchitecture: BoardStackArchitecture;
  boardCount: number;
  files: GerberExportFile[];
  bomCsv: string;
  cplCsv: string;
  schematicText: string;
  ipcD356Netlist: string;
  wiringHarnessText: string;
}
