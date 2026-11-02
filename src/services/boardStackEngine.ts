import type {
  AcousticParameters,
  CrossoverComponent,
  CrossoverNetworkResult,
} from '../types/loudspeaker.ts';
import type {
  BoardModule,
  BoardModuleRole,
  BoardStackArchitecture,
  CircuitBoardStack,
  InterBoardJumper,
  PcbComponentPlacement,
  PcbConnectorTerminal,
  PcbHole,
  PcbPad,
  PcbSilkElement,
  PcbTrace,
} from '../types/pcb.ts';

/**
 * Manufacturer SKU catalog recommendations for audio-grade crossover components
 */
const COMPONENT_CATALOG: Record<string, { sku: string; partNumber: string; costUsd: number }> = {
  // Capacitors
  cap_small: { sku: 'DMPC-2.2', partNumber: 'Dayton Audio DMPC 2.2µF 400V Polypropylene Film', costUsd: 3.45 },
  cap_med: { sku: 'DMPC-6.8', partNumber: 'Dayton Audio DMPC 6.8µF 400V Polypropylene Film', costUsd: 5.25 },
  cap_large: { sku: 'DMPC-15', partNumber: 'Dayton Audio DMPC 15µF 400V Polypropylene Film', costUsd: 8.80 },
  cap_zobel: { sku: '027-350', partNumber: 'Jantzen Non-Polarized Electrolytic 22µF 100V', costUsd: 2.10 },

  // Inductors
  ind_air_small: { sku: 'AC14-0.30', partNumber: 'Jantzen Audio 0.30mH 14AWG Air Core Inductor', costUsd: 11.20 },
  ind_air_med: { sku: 'AC14-1.20', partNumber: 'Jantzen Audio 1.20mH 14AWG Air Core Inductor', costUsd: 16.50 },
  ind_iron_large: { sku: 'IC14-3.30', partNumber: 'Dayton Audio Super Aranfert 3.30mH Iron Core', costUsd: 24.80 },

  // Resistors
  res_lpad: { sku: 'DNR-4.7', partNumber: 'Dayton Audio DNR-4.7 4.7Ω 10W Non-Inductive Resistor', costUsd: 2.15 },
  res_zobel: { sku: 'DNR-8.2', partNumber: 'Dayton Audio DNR-8.2 8.2Ω 20W Non-Inductive Resistor', costUsd: 3.50 },
};

/**
 * Automatically synthesizes a multi-board circuit board stack from an acoustic crossover network
 */
export function generateCircuitBoardStack(
  acoustics: AcousticParameters,
  crossoverResults: CrossoverNetworkResult,
  architecture: BoardStackArchitecture = 'split_two_way'
): CircuitBoardStack {
  const { topology } = acoustics;

  let boards: BoardModule[] = [];
  let jumpers: InterBoardJumper[] = [];

  // Rebalance architecture if requested split_three_way but topology is two_way
  const effectiveArch: BoardStackArchitecture =
    architecture === 'split_three_way' && topology !== 'three_way'
      ? 'split_two_way'
      : architecture;

  switch (effectiveArch) {
    case 'unified_single': {
      const unifiedBoard = buildBoardModule({
        boardId: 'pcb_unified',
        name: 'Master Passive Crossover Board (Unified)',
        code: 'PCB-UNI-01',
        role: 'unified_crossover',
        tierIndex: 0,
        components: crossoverResults.allComponents,
        boardWidthMm: topology === 'three_way' ? 180 : 160,
        boardHeightMm: topology === 'three_way' ? 130 : 110,
        solderMaskColor: 'matte_black',
      });
      boards = [unifiedBoard];
      break;
    }

    case 'split_two_way': {
      // Board A: Woofer Low-Pass Filter & Zobel Impedance Equalizer
      const wooferComps = [
        ...crossoverResults.wooferLowPass,
        ...(crossoverResults.zobelWoofer
          ? crossoverResults.allComponents.filter((c) => c.id.startsWith('zobel_'))
          : []),
      ];

      const boardA = buildBoardModule({
        boardId: 'pcb_tier0_woofer_lp',
        name: 'Board A: Low-Frequency Filter & Zobel Module',
        code: 'PCB-LF-01',
        role: 'woofer_lowpass',
        tierIndex: 0, // Bottom tier (closest to cabinet bottom for heavy inductors)
        components: wooferComps,
        boardWidthMm: 150,
        boardHeightMm: 95,
        solderMaskColor: 'black',
      });

      // Board B: Tweeter High-Pass Filter & L-Pad Attenuator
      const tweeterComps = [
        ...crossoverResults.tweeterHighPass,
        ...crossoverResults.allComponents.filter((c) => c.id.startsWith('lpad_tw_')),
      ];

      const boardB = buildBoardModule({
        boardId: 'pcb_tier1_tweeter_hp',
        name: 'Board B: High-Frequency Filter & L-Pad Module',
        code: 'PCB-HF-01',
        role: 'tweeter_highpass',
        tierIndex: 1, // Upper tier mounted via 25mm brass standoffs
        components: tweeterComps,
        boardWidthMm: 150,
        boardHeightMm: 95,
        solderMaskColor: 'blue',
      });

      boards = [boardA, boardB];

      // Jumpers between Board A and Board B
      jumpers = [
        {
          id: 'jmp_in_pos',
          fromBoardId: boardA.boardId,
          toBoardId: boardB.boardId,
          signalName: 'INPUT_BUS_POS (+)',
          fromPadLabel: 'TB_IN_LINK+',
          toPadLabel: 'TB_IN+',
          recommendedWireAwg: 14,
          wireColorHex: '#ef4444', // Red
          lengthMm: 65,
        },
        {
          id: 'jmp_gnd_neg',
          fromBoardId: boardA.boardId,
          toBoardId: boardB.boardId,
          signalName: 'COMMON_GND (-)',
          fromPadLabel: 'TB_IN_LINK-',
          toPadLabel: 'TB_IN-',
          recommendedWireAwg: 14,
          wireColorHex: '#0f172a', // Black
          lengthMm: 65,
        },
        {
          id: 'jmp_biamp_sense',
          fromBoardId: boardA.boardId,
          toBoardId: boardB.boardId,
          signalName: 'BI_AMP_BUS_GROUND',
          fromPadLabel: 'J_SHIELD_A',
          toPadLabel: 'J_SHIELD_B',
          recommendedWireAwg: 18,
          wireColorHex: '#eab308', // Yellow
          lengthMm: 65,
        },
      ];
      break;
    }

    case 'split_three_way': {
      // Board A: Woofer Low-Pass + Zobel
      const wooferComps = [
        ...crossoverResults.wooferLowPass,
        ...crossoverResults.allComponents.filter((c) => c.id.startsWith('zobel_')),
      ];
      const boardA = buildBoardModule({
        boardId: 'pcb_tier0_woofer_lp',
        name: 'Board A: Woofer Low-Pass & Zobel Filter',
        code: 'PCB-LF-3WAY',
        role: 'woofer_lowpass',
        tierIndex: 0,
        components: wooferComps,
        boardWidthMm: 155,
        boardHeightMm: 95,
        solderMaskColor: 'black',
      });

      // Board B: Midrange Band-Pass Filter
      const midComps = crossoverResults.midrangeBandPass || [];
      const boardB = buildBoardModule({
        boardId: 'pcb_tier1_mid_bp',
        name: 'Board B: Midrange Band-Pass Filter',
        code: 'PCB-MF-3WAY',
        role: 'midrange_bandpass',
        tierIndex: 1,
        components: midComps,
        boardWidthMm: 155,
        boardHeightMm: 95,
        solderMaskColor: 'green',
      });

      // Board C: Tweeter High-Pass Filter & L-Pad
      const tweeterComps = [
        ...crossoverResults.tweeterHighPass,
        ...crossoverResults.allComponents.filter((c) => c.id.startsWith('lpad_')),
      ];
      const boardC = buildBoardModule({
        boardId: 'pcb_tier2_tweeter_hp',
        name: 'Board C: Tweeter High-Pass & L-Pad Module',
        code: 'PCB-HF-3WAY',
        role: 'tweeter_highpass',
        tierIndex: 2,
        components: tweeterComps,
        boardWidthMm: 155,
        boardHeightMm: 95,
        solderMaskColor: 'blue',
      });

      boards = [boardA, boardB, boardC];

      jumpers = [
        {
          id: 'jmp_ab_pos',
          fromBoardId: boardA.boardId,
          toBoardId: boardB.boardId,
          signalName: 'MAIN_IN_POS (+)',
          fromPadLabel: 'TB_IN_LINK+',
          toPadLabel: 'TB_IN+',
          recommendedWireAwg: 14,
          wireColorHex: '#ef4444',
          lengthMm: 60,
        },
        {
          id: 'jmp_ab_neg',
          fromBoardId: boardA.boardId,
          toBoardId: boardB.boardId,
          signalName: 'COMMON_GND (-)',
          fromPadLabel: 'TB_IN_LINK-',
          toPadLabel: 'TB_IN-',
          recommendedWireAwg: 14,
          wireColorHex: '#0f172a',
          lengthMm: 60,
        },
        {
          id: 'jmp_bc_pos',
          fromBoardId: boardB.boardId,
          toBoardId: boardC.boardId,
          signalName: 'HF_BUS_POS (+)',
          fromPadLabel: 'TB_MID_LINK+',
          toPadLabel: 'TB_TW_IN+',
          recommendedWireAwg: 16,
          wireColorHex: '#ef4444',
          lengthMm: 60,
        },
        {
          id: 'jmp_bc_neg',
          fromBoardId: boardB.boardId,
          toBoardId: boardC.boardId,
          signalName: 'COMMON_GND (-)',
          fromPadLabel: 'TB_MID_LINK-',
          toPadLabel: 'TB_TW_IN-',
          recommendedWireAwg: 16,
          wireColorHex: '#0f172a',
          lengthMm: 60,
        },
      ];
      break;
    }
  }

  // Calculate stack aggregate metrics
  const totalBOMCostUsd = Math.round(
    boards.reduce((acc, b) => acc + b.estimatedBOMCostUsd, 0) * 100
  ) / 100;
  const totalMassGrams = boards.reduce((acc, b) => acc + b.estimatedMassGrams, 0);

  // Cabinet mounting footprint calculations
  const maxWidthMm = Math.max(...boards.map((b) => b.dimensions.widthMm));
  const maxHeightMm = Math.max(...boards.map((b) => b.dimensions.heightMm));
  const tierCount = boards.length;
  const standoffHeightMm = 25; // 25mm spacing between board tiers
  const maxStackHeightMm = Math.round(tierCount * 1.6 + (tierCount - 1) * standoffHeightMm + 30); // 30mm for tallest inductor

  return {
    stackId: `stack_${effectiveArch}_${Date.now()}`,
    stackName:
      effectiveArch === 'unified_single'
        ? 'Unified Audiophile Master Crossover Board'
        : effectiveArch === 'split_two_way'
        ? 'Modular 2-Way Stack (Bi-Amp / Bi-Wire Isolated)'
        : 'Audiophile 3-Way Tri-Amp Tiered Board Stack',
    architecture: effectiveArch,
    boards,
    jumpers,
    totalBoardCount: boards.length,
    totalBOMCostUsd,
    totalMassGrams,
    stackingHardware: {
      standoffHeightMm,
      standoffThread: 'M4 Brass Hex Standoffs (Female-Female)',
      standoffCount: (tierCount - 1) * 4,
      tierCount,
    },
    cabinetFootprintMm: {
      widthMm: maxWidthMm,
      depthMm: maxHeightMm,
      maxStackHeightMm,
    },
  };
}

/**
 * Automates layout, footprint synthesis, anti-crosstalk rotation, and trace routing for a single board module
 */
function buildBoardModule(options: {
  boardId: string;
  name: string;
  code: string;
  role: BoardModuleRole;
  tierIndex: number;
  components: CrossoverComponent[];
  boardWidthMm: number;
  boardHeightMm: number;
  solderMaskColor: any;
}): BoardModule {
  const {
    boardId,
    name,
    code,
    role,
    tierIndex,
    components,
    boardWidthMm,
    boardHeightMm,
    solderMaskColor,
  } = options;

  const mountingHoleInsetMm = 6.0;
  const mountingHoleDiameterMm = 4.2; // M4 clearance

  // 1. Four corner mounting holes for brass standoffs
  const holes: PcbHole[] = [
    {
      id: `${boardId}_hole_tl`,
      xMm: mountingHoleInsetMm,
      yMm: mountingHoleInsetMm,
      diameterMm: mountingHoleDiameterMm,
      isPlated: false,
      type: 'mounting',
    },
    {
      id: `${boardId}_hole_tr`,
      xMm: boardWidthMm - mountingHoleInsetMm,
      yMm: mountingHoleInsetMm,
      diameterMm: mountingHoleDiameterMm,
      isPlated: false,
      type: 'mounting',
    },
    {
      id: `${boardId}_hole_bl`,
      xMm: mountingHoleInsetMm,
      yMm: boardHeightMm - mountingHoleInsetMm,
      diameterMm: mountingHoleDiameterMm,
      isPlated: false,
      type: 'mounting',
    },
    {
      id: `${boardId}_hole_br`,
      xMm: boardWidthMm - mountingHoleInsetMm,
      yMm: boardHeightMm - mountingHoleInsetMm,
      diameterMm: mountingHoleDiameterMm,
      isPlated: false,
      type: 'mounting',
    },
  ];

  const pads: PcbPad[] = [];
  const traces: PcbTrace[] = [];
  const silkElements: PcbSilkElement[] = [];
  const placements: PcbComponentPlacement[] = [];
  const connectors: PcbConnectorTerminal[] = [];

  // Board Title Silk Screen
  silkElements.push({
    id: `${boardId}_silk_title`,
    text: `RESONANCE CAD • ${code}`,
    x: 18,
    y: 8,
    fontSizeMm: 2.2,
    type: 'text',
  });
  silkElements.push({
    id: `${boardId}_silk_desc`,
    text: name.toUpperCase(),
    x: 18,
    y: 12,
    fontSizeMm: 1.4,
    type: 'text',
  });
  silkElements.push({
    id: `${boardId}_silk_rev`,
    text: 'REV 1.0 • 2OZ COPPER • AUDIO GRADE',
    x: boardWidthMm - 70,
    y: 8,
    fontSizeMm: 1.3,
    type: 'text',
  });

  // 2. High-Current Screw Terminal Blocks
  // Input terminal on the left edge
  const inTerminalY = boardHeightMm / 2;
  connectors.push({
    id: `${boardId}_term_in_pos`,
    label: 'IN+',
    netName: 'NET_IN_POS',
    xMm: 12,
    yMm: inTerminalY - 6,
    screwTerminalPitchMm: 5.08,
    wireGaugeAwg: 14,
  });
  connectors.push({
    id: `${boardId}_term_in_neg`,
    label: 'IN-',
    netName: 'GND',
    xMm: 12,
    yMm: inTerminalY + 6,
    screwTerminalPitchMm: 5.08,
    wireGaugeAwg: 14,
  });

  // Output terminal on the right edge
  const outLabelPrefix =
    role === 'woofer_lowpass' ? 'W' : role === 'tweeter_highpass' ? 'T' : role === 'midrange_bandpass' ? 'M' : 'OUT';
  connectors.push({
    id: `${boardId}_term_out_pos`,
    label: `${outLabelPrefix}+`,
    netName: 'NET_OUT_POS',
    xMm: boardWidthMm - 12,
    yMm: inTerminalY - 6,
    screwTerminalPitchMm: 5.08,
    wireGaugeAwg: 14,
  });
  connectors.push({
    id: `${boardId}_term_out_neg`,
    label: `${outLabelPrefix}-`,
    netName: 'GND',
    xMm: boardWidthMm - 12,
    yMm: inTerminalY + 6,
    screwTerminalPitchMm: 5.08,
    wireGaugeAwg: 14,
  });

  // Terminal pads
  connectors.forEach((conn) => {
    pads.push({
      id: `${conn.id}_pad`,
      xMm: conn.xMm,
      yMm: conn.yMm,
      widthMm: 4.5,
      heightMm: 4.5,
      shape: 'round',
      holeDiameterMm: 1.8,
      netName: conn.netName,
      layer: 'both',
    });
    holes.push({
      id: `${conn.id}_hole`,
      xMm: conn.xMm,
      yMm: conn.yMm,
      diameterMm: 1.8,
      isPlated: true,
      netName: conn.netName,
      type: 'wire_pad',
    });
    silkElements.push({
      id: `${conn.id}_silk`,
      text: conn.label,
      x: conn.xMm > boardWidthMm / 2 ? conn.xMm - 8 : conn.xMm + 4,
      y: conn.yMm + 1,
      fontSizeMm: 1.8,
      type: 'text',
    });
  });

  // 3. Automated Component Layout with 90° Inductor Anti-Crosstalk Rule
  let inductorCount = 0;
  const startX = 35;
  const endX = boardWidthMm - 35;
  const usableWidth = endX - startX;
  const spacingX = usableWidth / Math.max(1, components.length);

  let boardBOMCost = 0;
  let boardMassGrams = 45; // baseline board + terminals

  components.forEach((comp, idx) => {
    const posX = Math.round(startX + idx * spacingX + spacingX / 2);
    // Alternate components along two rows (upper signal rail and lower shunt rail)
    const isShunt = comp.name.toLowerCase().includes('shunt') || comp.id.includes('c1') || comp.id.includes('l2') || comp.id.startsWith('zobel_');
    const posY = isShunt ? Math.round(boardHeightMm * 0.65) : Math.round(boardHeightMm * 0.35);

    let footprintWidthMm = 25;
    let footprintLengthMm = 25;
    let rotationDeg = 0;
    let footprintName = 'CAP_AXIAL_POLY_32MM';
    let skuInfo = COMPONENT_CATALOG.cap_med;

    if (comp.type === 'inductor') {
      inductorCount++;
      footprintWidthMm = 42;
      footprintLengthMm = 42;
      // CRITICAL AUDIO RULE: When more than one inductor is on the same board,
      // orient the magnetic axis orthogonal by 90° to eliminate mutual inductance!
      rotationDeg = inductorCount % 2 === 0 ? 90 : 0;
      footprintName = 'IND_AIR_TOROID_45MM';
      skuInfo = comp.valueNumeric > 2.0 ? COMPONENT_CATALOG.ind_iron_large : COMPONENT_CATALOG.ind_air_med;
      boardMassGrams += 180;
    } else if (comp.type === 'capacitor') {
      footprintWidthMm = 18;
      footprintLengthMm = comp.valueNumeric > 10 ? 42 : 32;
      rotationDeg = 0;
      footprintName = comp.valueNumeric > 10 ? 'CAP_AXIAL_LARGE_42MM' : 'CAP_AXIAL_FILM_32MM';
      skuInfo = comp.valueNumeric > 10 ? COMPONENT_CATALOG.cap_large : COMPONENT_CATALOG.cap_med;
      boardMassGrams += 45;
    } else if (comp.type === 'resistor') {
      footprintWidthMm = 14;
      footprintLengthMm = 38;
      rotationDeg = 0;
      footprintName = 'RES_CERAMIC_10W_38MM';
      skuInfo = comp.id.includes('zobel') ? COMPONENT_CATALOG.res_zobel : COMPONENT_CATALOG.res_lpad;
      boardMassGrams += 35;
    }

    boardBOMCost += skuInfo.costUsd;

    // Component Through-Hole Pads (Pin 1 and Pin 2)
    const halfLen = footprintLengthMm / 2 - 2;
    const pad1X = rotationDeg === 90 ? posX : posX - halfLen;
    const pad1Y = rotationDeg === 90 ? posY - halfLen : posY;
    const pad2X = rotationDeg === 90 ? posX : posX + halfLen;
    const pad2Y = rotationDeg === 90 ? posY + halfLen : posY;

    const netPin1 = isShunt ? 'GND' : idx === 0 ? 'NET_IN_POS' : `NET_NODE_${idx}`;
    const netPin2 = isShunt ? `NET_NODE_${idx}` : idx === components.length - 1 ? 'NET_OUT_POS' : `NET_NODE_${idx + 1}`;

    const pad1: PcbPad = {
      id: `${comp.id}_pad1`,
      xMm: pad1X,
      yMm: pad1Y,
      widthMm: 3.5,
      heightMm: 3.5,
      shape: 'round',
      holeDiameterMm: 1.2,
      netName: netPin1,
      layer: 'both',
      pinNumber: 1,
    };

    const pad2: PcbPad = {
      id: `${comp.id}_pad2`,
      xMm: pad2X,
      yMm: pad2Y,
      widthMm: 3.5,
      heightMm: 3.5,
      shape: 'round',
      holeDiameterMm: 1.2,
      netName: netPin2,
      layer: 'both',
      pinNumber: 2,
    };

    pads.push(pad1, pad2);
    holes.push(
      {
        id: `${comp.id}_hole1`,
        xMm: pad1X,
        yMm: pad1Y,
        diameterMm: 1.2,
        isPlated: true,
        netName: netPin1,
        type: 'component_pin',
      },
      {
        id: `${comp.id}_hole2`,
        xMm: pad2X,
        yMm: pad2Y,
        diameterMm: 1.2,
        isPlated: true,
        netName: netPin2,
        type: 'component_pin',
      }
    );

    // Component Silkscreen outline
    const silkBox: PcbSilkElement = {
      id: `${comp.id}_silk_box`,
      type: comp.type === 'inductor' ? 'circle' : 'rect',
      x: posX,
      y: posY,
      widthMm: footprintLengthMm - 4,
      heightMm: footprintWidthMm - 4,
      radiusMm: (footprintWidthMm - 6) / 2,
    };

    const silkRef: PcbSilkElement = {
      id: `${comp.id}_silk_ref`,
      text: `${comp.id.toUpperCase()} (${comp.valueFormatted})`,
      x: posX - 10,
      y: posY - footprintWidthMm / 2 - 2,
      fontSizeMm: 1.4,
      type: 'text',
    };

    silkElements.push(silkBox, silkRef);

    // Inductor 90° Axis Marker silkscreen
    if (comp.type === 'inductor') {
      silkElements.push({
        id: `${comp.id}_silk_axis`,
        text: rotationDeg === 90 ? '⤡ 90° DECOUPLED' : '⤢ 0° AXIS',
        x: posX - 8,
        y: posY + footprintWidthMm / 2 + 3,
        fontSizeMm: 1.1,
        type: 'text',
      });
    }

    placements.push({
      id: comp.id,
      componentId: comp.id,
      designator: comp.id.toUpperCase(),
      type: comp.type,
      valueFormatted: comp.valueFormatted,
      valueNumeric: comp.valueNumeric,
      unit: comp.unit,
      footprintName,
      midXMm: posX,
      midYMm: posY,
      rotationDeg,
      widthMm: footprintWidthMm,
      lengthMm: footprintLengthMm,
      heightMm: comp.type === 'inductor' ? 32 : 18,
      pads: [pad1, pad2],
      holes: [],
      silkOutlines: [silkBox, silkRef],
      tolerancePercent: comp.type === 'resistor' ? 1 : comp.type === 'capacitor' ? 1 : 3,
      ratingStr: comp.voltagePowerRating,
      recommendedPartNumber: skuInfo.partNumber,
      distributorSku: skuInfo.sku,
      estimatedCostUsd: skuInfo.costUsd,
      magneticAxisDeg: rotationDeg,
    });
  });

  // 4. Automated Copper Trace Routing
  // High Current Ground Bus (Bottom Layer 4.0mm trace along bottom edge)
  traces.push({
    id: `${boardId}_tr_gnd_main`,
    netName: 'GND',
    startX: 12,
    startY: boardHeightMm - 14,
    endX: boardWidthMm - 12,
    endY: boardHeightMm - 14,
    widthMm: 4.0, // 4mm heavy copper bus for low DCR
    layer: 'bottom',
  });

  // Input Positive Signal Rail (Top Layer 3.0mm trace from terminal to 1st component)
  if (pads.length > 0) {
    traces.push({
      id: `${boardId}_tr_in_feed`,
      netName: 'NET_IN_POS',
      startX: 12,
      startY: inTerminalY - 6,
      endX: pads[0].xMm,
      endY: pads[0].yMm,
      widthMm: 3.0,
      layer: 'top',
    });

    // Output Feed Trace
    traces.push({
      id: `${boardId}_tr_out_feed`,
      netName: 'NET_OUT_POS',
      startX: pads[pads.length - 1].xMm,
      startY: pads[pads.length - 1].yMm,
      endX: boardWidthMm - 12,
      endY: inTerminalY - 6,
      widthMm: 3.0,
      layer: 'top',
    });
  }

  return {
    boardId,
    name,
    code,
    role,
    tierIndex,
    dimensions: {
      widthMm: boardWidthMm,
      heightMm: boardHeightMm,
      thicknessMm: 1.6,
    },
    copperWeightOz: 2, // 2oz standard
    solderMaskColor,
    surfaceFinish: 'ENIG_gold',
    cornerFilletRadiusMm: 5.0,
    mountingHoleDiameterMm,
    mountingHoleInsetMm,
    components: placements,
    traces,
    pads,
    holes,
    silkElements,
    connectors,
    estimatedMassGrams: boardMassGrams,
    estimatedBOMCostUsd: Math.round(boardBOMCost * 100) / 100,
  };
}
