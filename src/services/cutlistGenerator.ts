import type {
  AcousticCalculationResult,
  AcousticParameters,
  CutListItem,
  EnclosureDimensions,
  PartMetadata,
} from '../types/loudspeaker.ts';
import { MATERIAL_SPECS } from './acousticEngine.ts';

export function generateCutList(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  results: AcousticCalculationResult
): { cutList: CutListItem[]; partMetadataMap: Record<string, PartMetadata> } {
  const material = MATERIAL_SPECS[dimensions.material];
  const t = material.nominalThicknessMm;
  const baffleT = dimensions.baffleThicknessMm || t;
  const { externalWidthMm: W, externalHeightMm: H, externalDepthMm: D, jointType } = dimensions;

  const cutList: CutListItem[] = [];
  const partMetadataMap: Record<string, PartMetadata> = {};

  const { topology, driverAssignments } = acoustics;
  const woofer = driverAssignments.woofer.driver;
  const tweeter = driverAssignments.tweeter.driver;
  const midrange = driverAssignments.midrange.driver;

  const unitCostM2 = acoustics.materialPricing?.costPerSquareMeter ?? material.defaultCostPerM2;
  const calcPanelCost = (wMm: number, lMm: number, qty: number = 1) =>
    Math.round(((wMm * lMm * 1e-6) * unitCostM2 * qty) * 100) / 100;

  // 1. Front Baffle with Multi-Driver Cutouts (Collision-Free CNC Coordinates)
  const baffleWeight = ((W * H * baffleT) * 1e-9) * material.densityKgM3;
  const layout = results.layout;
  const frontComps = layout?.components.filter((c) => c.panel === 'front') || [];
  const frontCutoutList = frontComps.map((c) => {
    if (c.role === 'port') {
      return c.isSlot
        ? `Slot Port (${c.slotWidthMm}x${c.slotHeightMm}mm @ Y=${Math.round(c.centerY)}mm)`
        : `Aeroport (Ø${Math.round(c.cutoutRadiusMm * 2)}mm @ Y=${Math.round(c.centerY)}mm)`;
    }
    return `${c.role.toUpperCase()} (Ø${Math.round(c.cutoutRadiusMm * 2)}mm @ Y=${Math.round(c.centerY)}mm)`;
  });

  const baffleCutoutDesc = frontCutoutList.length > 0
    ? frontCutoutList.join(', ')
    : (topology === 'two_way'
        ? `Tweeter: Ø${tweeter.cutoutDiameterMm}mm, Woofer: Ø${woofer.cutoutDiameterMm}mm`
        : `Woofer: Ø${woofer.cutoutDiameterMm}mm`);

  const baffleItem: CutListItem = {
    id: 'baffle_front',
    name: baffleT > t ? `Front Baffle (Double-Thick ${baffleT}mm)` : `Front Baffle (${baffleT}mm)`,
    spatialLabel: 'Baffle-01',
    spatialLocation: 'Front Baffle',
    type: 'baffle',
    quantity: 1,
    widthMm: W,
    lengthMm: H,
    thicknessMm: baffleT,
    materialName: material.name,
    weightKg: Math.round(baffleWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(W, H, 1),
    cutNotes: `Cut ${W}mm x ${H}mm face. Grain orientation: Vertical. Topology: ${topology.toUpperCase()}.`,
    machiningNotes: `CNC multi-bore: ${baffleCutoutDesc}. Flush-mount rebates: 8mm depth for driver outer flanges.`,
  };
  cutList.push(baffleItem);

  partMetadataMap['baffle_front'] = {
    id: 'baffle_front',
    name: 'Acoustic Front Baffle',
    spatialLabel: 'Baffle-01',
    spatialLocation: 'Front Baffle',
    category: 'panel',
    dimensionsMm: { w: W, h: H, d: baffleT },
    material: material.name,
    weightKg: baffleItem.weightKg,
    acousticRole: `Rigid multi-transducer mounting platform configured for ${topology.toUpperCase()} alignment. Zero-clash layout verified (${layout?.minBaffleClearanceMm ?? 15}mm clearance).`,
    assemblyNotes: jointType === 'rabbet' ? '9.5mm rabbet rebate along left, right, top, and bottom inner edges.' : 'Butt joint with internal corner cleats and polyurethane wood glue.',
    machiningOperations: [
      `Flush-mount driver rebates: 8mm depth`,
      `Multi-driver through-bores: ${baffleCutoutDesc}`,
      'Rear breathing chamfer: 45° bevel along inside woofer cutout rims',
    ],
  };

  // 2. Rear Panel (with Neutrik speakON D-Shape / G-Shape Cutouts & Mounting Hole Coordinates)
  const rearW = Math.max(50, W - 2 * t);
  const rearH = Math.max(50, H - 2 * t);
  const rearWeight = ((rearW * rearH * t) * 1e-9) * material.densityKgM3;
  const isRearPort = layout?.resolvedPortPlacement === 'rear' && acoustics.alignment === 'ported';
  const rearPortComp = layout?.components.find((c) => c.panel === 'rear' && c.role === 'port');
  const spk = results.speakonReport;

  const spkCutoutSummary = spk
    ? `Neutrik ${spk.partNumber} (${spk.connectorQuantity}x ${spk.flangeType}): Pocket ${spk.dishWidthMm}x${spk.dishHeightMm}mm (${spk.dishPocketDepthMm}mm recess) @ Y=${spk.dishCenterYMm}mm; ${spk.connectorQuantity}x Ø${spk.cutoutBoreDiameterMm}mm through-bores (${spk.connectorSpacingCenterMm}mm C-C) + ${spk.mountingHolesPerConnector.length * spk.connectorQuantity}x Ø${spk.mountingHolesPerConnector[0]?.diameterMm ?? 3.2}mm M3 holes.`
    : 'Recessed speakON terminal dish pocket @ Y=-100mm.';

  const rearMachiningNotes = isRearPort && rearPortComp
    ? `CNC bore: Rear Parametric Port Cutout @ Y=+${Math.round(rearPortComp.centerY)}mm. ${spkCutoutSummary}`
    : `CNC bore: ${spkCutoutSummary}`;

  const rearItem: CutListItem = {
    id: 'panel_rear',
    name: 'Rear Panel',
    spatialLabel: 'Back-01',
    spatialLocation: 'Rear Wall',
    type: 'rear',
    quantity: 1,
    widthMm: rearW,
    lengthMm: rearH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(rearWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(rearW, rearH, 1),
    cutNotes: `Cut ${rearW}mm x ${rearH}mm. Inset between side and top/bottom panels.`,
    machiningNotes: rearMachiningNotes,
  };
  cutList.push(rearItem);

  partMetadataMap['panel_rear'] = {
    id: 'panel_rear',
    name: 'Rear Enclosure Panel',
    spatialLabel: 'Back-01',
    spatialLocation: 'Rear Wall',
    category: 'panel',
    dimensionsMm: { w: rearW, h: rearH, d: t },
    material: material.name,
    weightKg: rearItem.weightKg,
    acousticRole: isRearPort
      ? `Houses rear-firing custom parametric port and recessed Neutrik ${spk?.partNumber || 'NL4MP'} I/O dish.`
      : `Supports passive crossover PCB stack and recessed Neutrik ${spk?.partNumber || 'NL4MP'} (${spk?.poleCount || 4}-Pole) I/O connector dish.`,
    assemblyNotes: `Glued and clamped airtight with ${spk?.gasketPartNumber || 'EPDM'} perimeter sealing gasket.`,
    machiningOperations: [
      ...(isRearPort && rearPortComp
        ? [`Rear parametric port cutout @ Y=+${Math.round(rearPortComp.centerY)}mm`]
        : []),
      spkCutoutSummary,
      '4x M4 standoff pilot holes for crossover PCB stack mounting',
    ],
  };

  // 2.5 Neutrik speakON Input/Output Terminal Dish Assembly
  if (spk) {
    const speakonDishItem: CutListItem = {
      id: 'speakon_terminal_dish',
      name: `Neutrik ${spk.partNumber} I/O Dish (${spk.connectorQuantity}x ${spk.poleCount}-Pole)`,
      spatialLabel: 'Plate-Speakon-01',
      spatialLocation: 'Rear Wall Dish',
      type: 'speakon_plate',
      quantity: 1,
      widthMm: spk.dishWidthMm,
      lengthMm: spk.dishHeightMm,
      thicknessMm: spk.dishPocketDepthMm,
      materialName: `1.5mm Powder-Coated Steel Dish + ${spk.connectorQuantity}x Neutrik ${spk.partNumber}`,
      weightKg: spk.poleCount === 8 ? 0.54 : 0.38,
      estimatedCostUsd: spk.totalHardwareCostUsd,
      cutNotes: `${spk.wiringArchitectureLabel}. Gasket: ${spk.gasketPartNumber}. Crimp Lugs: ${spk.poleCount * spk.connectorQuantity}x NLFASTON.`,
      machiningNotes: `Cutouts: ${spk.connectorQuantity}x ${spk.flangeType} (Ø${spk.cutoutBoreDiameterMm}mm bore). Mounting coords: ${spk.mountingHolesPerConnector.map((h) => `${h.holeId}(${h.xMm >= 0 ? '+' : ''}${h.xMm},${h.yMm >= 0 ? '+' : ''}${h.yMm}mm)`).join(', ')}.`,
    };
    cutList.push(speakonDishItem);

    partMetadataMap['speakon_terminal_dish'] = {
      id: 'speakon_terminal_dish',
      name: `${spk.connectorName} Dish Assembly`,
      spatialLabel: 'Plate-Speakon-01',
      spatialLocation: 'Rear Wall Dish',
      category: 'hardware',
      dimensionsMm: {
        w: spk.dishWidthMm,
        h: spk.dishHeightMm,
        d: spk.internalProjectionDepthMm,
      },
      material: `Neutrik ${spk.partNumber} + ${spk.gasketPartNumber} Gasket + ${spk.crimpTerminalSpec}`,
      weightKg: speakonDishItem.weightKg,
      estimatedCostUsd: spk.totalHardwareCostUsd,
      acousticRole: `${spk.selectionReason} Internal clearance status: ${spk.overallClashStatus.toUpperCase()} (min ${spk.minInternalClearanceMm}mm).`,
      assemblyNotes: `Fasten each ${spk.partNumber} with ${spk.mountingHolesPerConnector[0]?.fastenerSpec || 'M3 countersunk screws'} and ${spk.gasketPartNumber} airtight gasket. Terminate internal OFC loom using ${spk.crimpTerminalSpec}.`,
      machiningOperations: [
        `Recessed rear dish pocket: ${spk.dishWidthMm}×${spk.dishHeightMm}×${spk.dishPocketDepthMm}mm @ Y=${spk.dishCenterYMm}mm`,
        `Chassis through-bores: ${spk.connectorQuantity}× Ø${spk.cutoutBoreDiameterMm}mm (${spk.flangeType}) spaced ${spk.connectorSpacingCenterMm}mm C-C`,
        ...spk.pinAssignments.map(
          (p) => `Pins ${p.pinPair}: ${p.signalRole} [${p.wireGaugeAwg}, ${p.wireColorPositive}/${p.wireColorNegative}]`
        ),
      ],
    };
  }

  // 3. Top & Bottom Panels
  const topBottomD = Math.max(50, D - baffleT);
  const topBottomWeight = ((W * topBottomD * t) * 1e-9) * material.densityKgM3;

  const topItem: CutListItem = {
    id: 'panel_top',
    name: 'Top Panel',
    spatialLabel: 'Top-01',
    spatialLocation: 'Top Plate',
    type: 'top',
    quantity: 1,
    widthMm: W,
    lengthMm: topBottomD,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(topBottomWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(W, topBottomD, 1),
    cutNotes: `Cut ${W}mm x ${topBottomD}mm. Full width roof panel.`,
    machiningNotes: 'Edge square cut at 90.0°.',
  };
  cutList.push(topItem);

  partMetadataMap['panel_top'] = {
    id: 'panel_top',
    name: 'Top Enclosure Panel',
    spatialLabel: 'Top-01',
    spatialLocation: 'Top Plate',
    category: 'panel',
    dimensionsMm: { w: W, h: t, d: topBottomD },
    material: material.name,
    weightKg: topItem.weightKg,
    acousticRole: 'Rigid upper boundary plate capping enclosure ceiling and securing sidewall miters.',
    assemblyNotes: jointType === 'rabbet' ? '9.5mm rabbet rebate along front, left, and right outer edges.' : 'Butt joint with polyurethane wood glue.',
    machiningOperations: ['Edge square cut at 90.0°', 'Optional top perimeter roundover fillet'],
  };

  const bottomItem: CutListItem = {
    id: 'panel_bottom',
    name: 'Bottom Base Panel',
    spatialLabel: 'Bottom-01',
    spatialLocation: 'Bottom Plate',
    type: 'bottom',
    quantity: 1,
    widthMm: W,
    lengthMm: topBottomD,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(topBottomWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(W, topBottomD, 1),
    cutNotes: `Cut ${W}mm x ${topBottomD}mm. Cabinet base panel.`,
    machiningNotes: 'Bore 4x M8 threaded brass inserts for acoustic isolation feet.',
  };
  cutList.push(bottomItem);

  partMetadataMap['panel_bottom'] = {
    id: 'panel_bottom',
    name: 'Bottom Base Panel',
    spatialLabel: 'Bottom-01',
    spatialLocation: 'Bottom Plate',
    category: 'panel',
    dimensionsMm: { w: W, h: t, d: topBottomD },
    material: material.name,
    weightKg: bottomItem.weightKg,
    acousticRole: 'Base floor foundation supporting internal standing waves, pole cup sockets, and acoustic isolation feet.',
    assemblyNotes: 'Interlock with side and rear panels with internal corner glue blocks.',
    machiningOperations: [
      'Bore 4x M8 threaded brass inserts for acoustic isolation feet',
      ...(dimensions.hardware?.showPoleMount ? ['Bore Ø38mm x 80mm blind socket for pole cup mount'] : []),
    ],
  };

  // 4. Side Panels
  const sideH = Math.max(50, H - 2 * t);
  const sideD = Math.max(50, D - baffleT);
  const sideWeight = ((sideH * sideD * t) * 1e-9) * material.densityKgM3;

  const leftSideItem: CutListItem = {
    id: 'panel_left',
    name: 'Left Side Panel',
    spatialLabel: 'Side-Left-01',
    spatialLocation: 'Left Wall',
    type: 'left_side',
    quantity: 1,
    widthMm: sideD,
    lengthMm: sideH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(sideWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(sideD, sideH, 1),
    cutNotes: `Cut ${sideD}mm x ${sideH}mm. Inset between top and bottom panels.`,
    machiningNotes: 'Dado grooves 6mm deep for internal matrix brace placement.',
  };
  cutList.push(leftSideItem);

  partMetadataMap['panel_left'] = {
    id: 'panel_left',
    name: 'Left Enclosure Wall',
    spatialLabel: 'Side-Left-01',
    spatialLocation: 'Left Wall',
    category: 'panel',
    dimensionsMm: { w: t, h: sideH, d: sideD },
    material: material.name,
    weightKg: leftSideItem.weightKg,
    acousticRole: 'Left lateral structural boundary suppressing lateral standing eigenmodes.',
    assemblyNotes: 'CNC dado groove routes 6mm deep at Y=-25mm for matrix brace interlocking.',
    machiningOperations: [
      '6mm dado route for internal matrix brace',
      ...(dimensions.hardware?.showHandles ? ['CNC recessed handle pocket 130mm x 185mm x 40mm'] : []),
    ],
  };

  const rightSideItem: CutListItem = {
    id: 'panel_right',
    name: 'Right Side Panel',
    spatialLabel: 'Side-Right-01',
    spatialLocation: 'Right Wall',
    type: 'right_side',
    quantity: 1,
    widthMm: sideD,
    lengthMm: sideH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(sideWeight * 100) / 100,
    estimatedCostUsd: calcPanelCost(sideD, sideH, 1),
    cutNotes: `Cut ${sideD}mm x ${sideH}mm. Mirrors left side panel.`,
    machiningNotes: 'Dado grooves 6mm deep for internal matrix brace placement.',
  };
  cutList.push(rightSideItem);

  partMetadataMap['panel_right'] = {
    id: 'panel_right',
    name: 'Right Enclosure Wall',
    spatialLabel: 'Side-Right-01',
    spatialLocation: 'Right Wall',
    category: 'panel',
    dimensionsMm: { w: t, h: sideH, d: sideD },
    material: material.name,
    weightKg: rightSideItem.weightKg,
    acousticRole: 'Right lateral structural boundary suppressing lateral standing eigenmodes.',
    assemblyNotes: 'CNC dado groove routes 6mm deep at Y=-25mm for matrix brace interlocking.',
    machiningOperations: [
      '6mm dado route for internal matrix brace',
      ...(dimensions.hardware?.showHandles ? ['CNC recessed handle pocket 130mm x 185mm x 40mm'] : []),
    ],
  };

  // 5. Internal Matrix Window Brace
  const braceW = Math.max(50, W - 2 * t);
  const braceD = Math.max(50, D - baffleT - t);
  const braceWeight = ((braceW * braceD * t) * 1e-9) * material.densityKgM3 * 0.55;
  const braceQuantity = acoustics.bracingLevel === 'heavy' ? 2 : 1;

  for (let b = 1; b <= braceQuantity; b++) {
    const braceSpatialLabel = `Brace-Inner-0${b}`;
    const bracePartId = b === 1 ? 'brace_window' : `brace_window_${b}`;

    const singleBraceItem: CutListItem = {
      id: bracePartId,
      name: braceQuantity > 1 ? `Internal Matrix Window Brace (Tier ${b}/${braceQuantity})` : 'Internal Matrix Window Brace',
      spatialLabel: braceSpatialLabel,
      spatialLocation: `Interior Matrix (Tier ${b})`,
      type: 'window_brace',
      quantity: 1,
      widthMm: braceW,
      lengthMm: braceD,
      thicknessMm: t,
      materialName: material.name,
      weightKg: Math.round(braceWeight * 100) / 100,
      estimatedCostUsd: calcPanelCost(braceW, braceD, 1),
      cutNotes: `Cut ${braceW}mm x ${braceD}mm perimeter. CNC 4x radiused window cutouts.`,
      machiningNotes: 'Four rounded rectangular acoustic pass-through windows with 25mm corner radius fillets.',
    };
    cutList.push(singleBraceItem);

    partMetadataMap[bracePartId] = {
      id: bracePartId,
      name: `Internal Matrix Window Brace (Tier ${b})`,
      spatialLabel: braceSpatialLabel,
      spatialLocation: `Interior Matrix (Tier ${b})`,
      category: 'brace',
      dimensionsMm: { w: braceW, h: t, d: braceD },
      material: material.name,
      weightKg: singleBraceItem.weightKg,
      acousticRole: `Elevates fundamental panel resonant modes f_{1,1} above passband and suppresses cabinet wall bulging under high acoustic SPL.`,
      assemblyNotes: 'Dado interlock into left, right, and rear wall grooves with polyurethane wood adhesive.',
      machiningOperations: [
        'CNC router 4x radiused acoustic window apertures',
        '25mm corner radius interior fillets',
      ],
    };
  }

  // 6. Midrange Sealed Sub-Chamber (if 3-Way)
  if (topology === 'three_way') {
    const midBoxW = Math.max(120, midrange.frameOuterDiameterMm + 20);
    const midBoxH = Math.max(120, midrange.frameOuterDiameterMm + 20);
    const midBoxD = 140;
    const midChamberWeight = ((midBoxW * midBoxH * t * 4) * 1e-9) * material.densityKgM3;

    const midChamberItem: CutListItem = {
      id: 'midrange_chamber',
      name: 'Midrange Sealed Rear Enclosure Chamber',
      spatialLabel: 'Chamber-Mid-01',
      spatialLocation: 'Isolated Mid Chamber',
      type: 'midrange_chamber',
      quantity: 1,
      widthMm: midBoxW,
      lengthMm: midBoxH,
      thicknessMm: t,
      materialName: material.name,
      weightKg: Math.round(midChamberWeight * 100) / 100,
      estimatedCostUsd: calcPanelCost(midBoxW, midBoxH, 4),
      cutNotes: `Airtight isolated rear enclosure (${results.midrangeChamberVolumeLiters}L volume) isolating midrange driver from woofer pressure waves.`,
      machiningNotes: 'Glue and seal 100% airtight with silicone mastic behind midrange baffle cutout.',
    };
    cutList.push(midChamberItem);

    partMetadataMap['midrange_chamber'] = {
      id: 'midrange_chamber',
      name: 'Isolated Midrange Acoustic Chamber',
      spatialLabel: 'Chamber-Mid-01',
      spatialLocation: 'Isolated Mid Chamber',
      category: 'panel',
      dimensionsMm: { w: midBoxW, h: midBoxH, d: midBoxD },
      material: material.name,
      weightKg: midChamberItem.weightKg,
      acousticRole: 'Protects midrange cone from severe internal back-pressure modulation created by woofer excursion.',
      assemblyNotes: 'Interlock into front baffle rear face with dacron polyfill stuffing.',
      machiningOperations: ['Precision miters on sub-chamber box sides'],
    };
  }

  // 7. Crossover PCB Metadata & Bill of Materials Item
  const pcbItem: CutListItem = {
    id: 'crossover_pcb',
    name: 'Passive Crossover Filter PCB Board',
    spatialLabel: 'PCB-Crossover-01',
    spatialLocation: 'Rear Interior Plate',
    type: 'crossover_pcb',
    quantity: 1,
    widthMm: 160,
    lengthMm: 120,
    thicknessMm: 1.6,
    materialName: 'FR4 Fiber Glass with 2oz Copper Traces',
    weightKg: 0.85,
    estimatedCostUsd: 18.50,
    cutNotes: `Populated with ${results.crossover.allComponents.length} passive filter components (${topology.toUpperCase()}).`,
    machiningNotes: results.crossover.allComponents.map(c => `${c.name}: ${c.valueFormatted}`).join(', '),
  };
  cutList.push(pcbItem);

  partMetadataMap['crossover_pcb'] = {
    id: 'crossover_pcb',
    name: 'Crossover Filter Network',
    spatialLabel: 'PCB-Crossover-01',
    spatialLocation: 'Rear Interior Plate',
    category: 'crossover',
    dimensionsMm: { w: 160, h: 120, d: 45 },
    material: 'FR4 Glass Epoxy, Air-Core Inductors, Polypropylene Capacitors, Ceramic Resistors',
    weightKg: 0.85,
    acousticRole: `Separates audio signal into distinct passbands for ${topology.toUpperCase()} transducer alignment (${acoustics.crossoverLowHz}Hz / ${acoustics.crossoverHighHz}Hz).`,
    assemblyNotes: 'Mount with 4x nylon standoffs on rear cabinet panel.',
    machiningOperations: results.crossover.allComponents.map(c => `Solder ${c.name} (${c.valueFormatted})`),
  };

  // 8. Archetype Hardware Metadata
  partMetadataMap['hardware_handle_left'] = {
    id: 'hardware_handle_left',
    name: 'Recessed Left Carry Handle',
    spatialLabel: 'Handle-Left-01',
    spatialLocation: 'Left Exterior Wall',
    category: 'hardware',
    dimensionsMm: { w: 160, h: 220, d: 45 },
    material: 'Stamped 1.5mm Cold-Rolled Steel & Solid Grip Bar',
    weightKg: 0.45,
    acousticRole: 'Tour-grade ergonomic transport handle sealed against internal acoustic back-pressure leaks.',
    assemblyNotes: 'Mount with 8x M4 black oxide wood screws and closed-cell EVA sealing gasket.',
    machiningOperations: ['CNC router pocket: 130mm x 185mm x 40mm depth on left side panel'],
  };

  partMetadataMap['hardware_handle_right'] = {
    id: 'hardware_handle_right',
    name: 'Recessed Right Carry Handle',
    spatialLabel: 'Handle-Right-01',
    spatialLocation: 'Right Exterior Wall',
    category: 'hardware',
    dimensionsMm: { w: 160, h: 220, d: 45 },
    material: 'Stamped 1.5mm Cold-Rolled Steel & Solid Grip Bar',
    weightKg: 0.45,
    acousticRole: 'Tour-grade ergonomic transport handle sealed against internal acoustic back-pressure leaks.',
    assemblyNotes: 'Mount with 8x M4 black oxide wood screws and closed-cell EVA sealing gasket.',
    machiningOperations: ['CNC router pocket: 130mm x 185mm x 40mm depth on right side panel'],
  };

  partMetadataMap['hardware_pole_cup'] = {
    id: 'hardware_pole_cup',
    name: '35mm Subwoofer / Stand Pole Cup',
    spatialLabel: 'Mount-Pole-01',
    spatialLocation: 'Base Floor Socket',
    category: 'hardware',
    dimensionsMm: { w: 110, h: 110, d: 85 },
    material: 'Cast Zinc Alloy & Heavy-Duty Threaded Steel Clamp',
    weightKg: 0.62,
    acousticRole: 'Rigid mechanical mounting socket for loudspeaker stand or sub-to-top extension pole (M20 / 35mm).',
    assemblyNotes: 'Press-fit into bottom cabinet panel and secure with 4x M6 through-bolts and T-nuts.',
    machiningOperations: ['CNC Forstner bore: Ø38mm x 80mm blind bore centered on bottom panel floor'],
  };

  partMetadataMap['hardware_corner_guards'] = {
    id: 'hardware_corner_guards',
    name: 'Touring Steel Ball Corner Protectors',
    spatialLabel: 'Guard-Corner-01',
    spatialLocation: 'Cabinet Perimeter Corners',
    category: 'hardware',
    dimensionsMm: { w: 45, h: 45, d: 45 },
    material: '14-Gauge Chrome/Black Nickel Plated Heavy Steel',
    weightKg: 0.72,
    acousticRole: 'Protects outer joint miters/rabbets from drop impact and mechanical splitting during concert staging.',
    assemblyNotes: 'Fasten with 3x countersunk steel rivets or wood screws per corner bracket (8 corners).',
    machiningOperations: ['Corner edge roundover: 12.7mm (1/2") radius on cabinet perimeter corners'],
  };

  partMetadataMap['hardware_isolation_feet'] = {
    id: 'hardware_isolation_feet',
    name: 'Acoustic Decoupling Isolation Feet (Set of 4)',
    spatialLabel: 'Foot-Decouple-01',
    spatialLocation: 'Base Plate Perimeter',
    category: 'hardware',
    dimensionsMm: { w: 40, h: 20, d: 40 },
    material: '50-Durometer Viscoelastic Sorbothane & Brushed Aluminum Collar',
    weightKg: 0.32,
    acousticRole: 'Mechanically decouples enclosure from desk/floor surface, attenuating cabinet vibration transmission by up to 22 dB.',
    assemblyNotes: 'Screw into bottom panel corners with M4 threaded brass inserts.',
    machiningOperations: ['Pre-drill 4x 8mm insert holes at bottom panel perimeter corners'],
  };

  partMetadataMap['hardware_plate_amp'] = {
    id: 'hardware_plate_amp',
    name: 'Commercial Class-D Plate Amplifier Module',
    spatialLabel: 'Amp-Plate-01',
    spatialLocation: 'Lower Rear Exterior Wall',
    category: 'hardware',
    dimensionsMm: { w: 180, h: 280, d: 55 },
    material: 'Anodized Extruded Aluminum Faceplate & Heavy Aluminum Heat Sink Fins',
    weightKg: 2.4,
    acousticRole: 'Integrated commercial active amplifier module providing 1000W continuous drive with isolated electronics back-can (-2.4L net displacement).',
    assemblyNotes: 'Mount with 8x M4 black machine screws and perimeter neoprene airtight gasket.',
    machiningOperations: ['CNC router pocket: 155mm x 255mm through-cut on lower rear panel'],
  };

  // 9. Front Baffle Transducers (Woofers, Midranges, Tweeters)
  const frontDrivers = layout?.components.filter((c) => c.panel === 'front' && c.role !== 'port') || [];
  frontDrivers.forEach((dp, idx) => {
    const drvPreset = dp.role === 'tweeter' ? tweeter : (dp.role === 'midrange' ? midrange : woofer);
    const key = `driver_${dp.role}_${idx}`;
    const spatialLabel = dp.role === 'tweeter'
      ? `Driver-HF-0${idx + 1}`
      : dp.role === 'midrange'
      ? `Driver-MF-0${idx + 1}`
      : `Driver-LF-0${idx + 1}`;

    partMetadataMap[key] = {
      id: key,
      name: `${drvPreset.brand} ${drvPreset.model} (${dp.role.toUpperCase()})`,
      spatialLabel,
      spatialLocation: `Front Baffle (${dp.role.toUpperCase()})`,
      category: 'driver',
      dimensionsMm: {
        w: drvPreset.frameOuterDiameterMm,
        h: drvPreset.frameOuterDiameterMm,
        d: Math.round(drvPreset.mountingDepthMm + drvPreset.magnetDepthMm),
      },
      material: `${drvPreset.nominalDiameterInch}" ${dp.role.toUpperCase()} Transducer Assembly`,
      weightKg: Math.round((drvPreset.magnetDiameterMm * drvPreset.magnetDepthMm * 0.00002) * 100) / 100 || 2.5,
      acousticRole: `Primary ${dp.role} transducer mounted on front baffle at Y=${Math.round(dp.centerY)}mm. Cutout: Ø${Math.round(dp.cutoutRadiusMm * 2)}mm.`,
      assemblyNotes: `Mount with ${drvPreset.nominalDiameterInch >= 8 ? '8x' : '4x'} M4/M5 machine bolts into rear-installed T-nuts with 3mm closed-cell EVA sealing gasket.`,
      machiningOperations: [
        `Baffle cutout: Ø${Math.round(dp.cutoutRadiusMm * 2)}mm`,
        `Flush rebate depth: 8.0mm (outer Ø${drvPreset.frameOuterDiameterMm}mm)`,
        'Rear breathing chamfer: 45° bevel along inside cutout rim',
      ],
      tsParameters: {
        brand: drvPreset.brand,
        model: drvPreset.model,
        role: dp.role.toUpperCase(),
        fsHz: drvPreset.fs,
        qts: drvPreset.qts,
        qes: drvPreset.qes,
        qms: drvPreset.qms,
        vasLiters: drvPreset.vas,
        xmaxMm: drvPreset.xmax,
        peWatts: drvPreset.pe,
        sensitivityDb: drvPreset.splSensitivityDb,
        impedanceOhm: (dp.role === 'tweeter' || dp.role === 'midrange' || dp.role === 'woofer') ? acoustics.driverAssignments[dp.role].impedanceOhm : 8,
      },
    };
  });

  // 10. Custom Parametric Helmholtz Port (Synthesized Arbitrary Cross-Section / Folded Conduit)
  if (acoustics.alignment === 'ported') {
    const isRearPort = layout?.resolvedPortPlacement === 'rear';
    const paramPort = results.parametricPort;
    const profileType =
      paramPort?.profileType ||
      (acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth');
    const isSlotOrFolded =
      profileType === 'rectilinear_slot' ||
      profileType === 'folded_l_conduit' ||
      profileType === 'folded_u_conduit';

    if (!isSlotOrFolded) {
      const envW = Math.round(paramPort?.envelopeDimensionsMm.widthMm || acoustics.portDiameterMm + 36);
      const envH = Math.round(paramPort?.envelopeDimensionsMm.heightMm || acoustics.portDiameterMm + 36);
      const envD = Math.round(paramPort?.effectiveLengthMm || results.portLengthMm);

      const portCutItem: CutListItem = {
        id: 'port_tube',
        name: `Synthesized ${paramPort?.profileLabel || 'Parametric Bell-Mouth Port'} (${acoustics.numberOfPorts}x)`,
        spatialLabel: 'Port-Tube-01',
        spatialLocation: isRearPort ? 'Rear Resonator Port' : 'Front Resonator Port',
        type: 'port_board',
        quantity: acoustics.numberOfPorts || 1,
        widthMm: envW,
        lengthMm: envD,
        thicknessMm: paramPort?.structuralWallThicknessMm || 4.0,
        materialName: 'Custom 3D-Printed PETG-CF / CNC Synthesized Polymer Conduit',
        weightKg: Math.round(0.42 * (acoustics.numberOfPorts || 1) * 100) / 100,
        estimatedCostUsd: Math.round(14.5 * (acoustics.numberOfPorts || 1) * 100) / 100,
        cutNotes: `${paramPort?.synthesisSummary || `Custom synthesized port tuned to Fb=${results.tuningFrequencyFb}Hz.`}`,
        machiningNotes: `Throat Area: ${paramPort?.crossSection.throatAreaCm2 ?? 44} cm², Hydraulic Ø: ${paramPort?.crossSection.hydraulicDiameterMm ?? acoustics.portDiameterMm}mm, Flare r_f=${paramPort?.crossSection.flareRadiusMm ?? 16}mm.`,
      };
      cutList.push(portCutItem);

      partMetadataMap['port_tube'] = {
        id: 'port_tube',
        name: `${paramPort?.profileLabel || 'Custom Parametric Port'} (${paramPort?.crossSection.widthMm ?? acoustics.portDiameterMm}×${paramPort?.crossSection.heightMm ?? acoustics.portDiameterMm}mm)`,
        spatialLabel: 'Port-Tube-01',
        spatialLocation: isRearPort ? 'Rear Resonator Port' : 'Front Resonator Port',
        category: 'port',
        dimensionsMm: {
          w: envW,
          h: envH,
          d: envD,
        },
        material: 'Application-Synthesized Parametric Manifold (PETG-CF / Composite)',
        weightKg: portCutItem.weightKg,
        estimatedCostUsd: portCutItem.estimatedCostUsd,
        acousticRole: `Custom parametric resonator tuned to Fb = ${results.tuningFrequencyFb}Hz (D_h = ${paramPort?.crossSection.hydraulicDiameterMm ?? acoustics.portDiameterMm}mm, k_end = ${paramPort?.endCorrectionFactorK ?? 0.732}). Peak air velocity: ${results.portAirVelocityMs} m/s (${paramPort?.exceedsSonicLimit34Ms ? 'EXCEEDS 34 m/s SONIC LIMIT' : results.isChuffingRisk ? 'Turbulence Warning' : 'Laminar Verified'}).`,
        assemblyNotes: `Flush-mount synthesized collar into ${isRearPort ? 'rear' : 'front'} baffle CNC rebate with closed-cell gasket.`,
        machiningOperations: [
          `Baffle aperture bore: ${paramPort?.crossSection.widthMm ?? acoustics.portDiameterMm}×${paramPort?.crossSection.heightMm ?? acoustics.portDiameterMm}mm on ${isRearPort ? 'rear' : 'front'} panel`,
          `3D print / CNC mill manifold conduit to L_p = ${envD}mm (${paramPort?.needsSegmentedPrint ? `${paramPort.segmentCount} interlocking segments` : 'single-piece manifold'})`,
        ],
      };
    } else {
      const slotW = Math.round(paramPort?.crossSection.widthMm || acoustics.slotWidthMm || rearW);
      const slotH = Math.round(paramPort?.crossSection.heightMm || acoustics.slotHeightMm || 45);
      const legs = paramPort?.legLengthsMm || [Math.round(results.portLengthMm)];

      legs.forEach((legLenMm, idx) => {
        const spatialLabel = idx === 0 ? 'Port-Shelf-01' : idx === 1 ? 'Port-Riser-02' : 'Port-Shelf-03';
        const spatialLocation = idx === 0 ? 'Lower Port Shelf' : idx === 1 ? 'Vertical Port Riser' : 'Upper Port Shelf';

        const legItem: CutListItem = {
          id: idx === 0 ? 'port_slot_board' : `port_folded_leg_${idx + 1}`,
          name:
            legs.length > 1
              ? `${paramPort?.profileLabel || 'Folded Port'} — Leg ${idx + 1} (${idx === 1 ? 'Vertical Riser' : 'Horizontal Shelf'})`
              : `Parametric Rectilinear Slot Port Board (${slotW}×${slotH}mm Aperture)`,
          spatialLabel,
          spatialLocation,
          type: 'port_board',
          quantity: acoustics.numberOfPorts || 1,
          widthMm: slotW,
          lengthMm: legLenMm,
          thicknessMm: t,
          materialName: material.name,
          weightKg: Math.round(((slotW * legLenMm * t * 1e-9) * material.densityKgM3) * 100) / 100,
          estimatedCostUsd: calcPanelCost(slotW, legLenMm, acoustics.numberOfPorts || 1),
          cutNotes: `Synthesized ${paramPort?.profileLabel || 'Slot Conduit'} Leg ${idx + 1}/${legs.length} (Total L_p=${results.portLengthMm}mm, D_h=${paramPort?.crossSection.hydraulicDiameterMm ?? 75}mm).`,
          machiningNotes: `Radius entry/exit lips (R=${acoustics.slotLipRadiusMm || 12}mm) and install 45° corner turning fillets at folded elbows.`,
        };
        cutList.push(legItem);
      });

      partMetadataMap['port_slot_board'] = {
        id: 'port_slot_board',
        name: `${paramPort?.profileLabel || 'Parametric Slot Conduit'} (${slotW}×${slotH}mm)`,
        spatialLabel: 'Port-Shelf-01',
        spatialLocation: 'Lower Port Shelf',
        category: 'port',
        dimensionsMm: {
          w: slotW,
          h: slotH,
          d: Math.round(results.portLengthMm),
        },
        material: material.name,
        weightKg: 0.95,
        acousticRole: `Synthesized ${paramPort?.profileLabel || 'slot port'} tuned to Fb = ${results.tuningFrequencyFb}Hz (Hydraulic Ø ${paramPort?.crossSection.hydraulicDiameterMm ?? 75}mm, v_peak = ${results.portAirVelocityMs} m/s).`,
        assemblyNotes:
          legs.length > 1
            ? `Assemble ${legs.length}-leg folded conduit (${legs.join('mm + ')}mm) into side panel dado grooves with 45° internal corner turning vanes.`
            : 'Glue into internal side panel dado grooves and seal 100% airtight.',
        machiningOperations: [
          ...legs.map((l, i) => `Cut conduit leg ${i + 1}: ${slotW}mm × ${l}mm`),
          `Machine aerodynamic bell-mouth roundover lip: R=${acoustics.slotLipRadiusMm || 12}mm`,
        ],
      };
    }
  }

  // 11. Acoustic Damping Treatment & Integral 3D-Printed Matrix
  if (results.additiveAcousticReport && results.additiveAcousticReport.enabled) {
    const rep = results.additiveAcousticReport;
    partMetadataMap['integral_damping_matrix'] = {
      id: 'integral_damping_matrix',
      name: `Integral 3D-Printed Dampening (${rep.latticeLabel} + ${rep.trapLabel})`,
      spatialLabel: 'Matrix-Acoustic-01',
      spatialLocation: 'Integral Sandwich Core & Rear Labyrinth Trap',
      category: 'acoustic',
      dimensionsMm: { w: Math.max(50, W - 2 * t), h: Math.max(50, H - 2 * t), d: 45 },
      material: `Monolithic 3D Printed ${rep.latticeLabel} (Porosity: ${Math.round(rep.jca.openPorosity * 100)}%)`,
      weightKg: rep.addedFilamentMassKg,
      acousticRole: `100% foam-free viscous acoustic energy dissipation (Flow resistivity: ${rep.jca.flowResistivityRaylsM} Rayls/m, NRC: ${rep.nrcScore}). Attenuates back-wave reflection by ${Math.abs(rep.backWaveAttenuationDb)} dB and suppresses cavity standing waves by ${Math.abs(rep.standingWaveMitigationDb)} dB.`,
      assemblyNotes: `Direct monolithic print. Self-supporting ${rep.maxMeasuredOverhangDeg}° overhangs require zero internal support material. Includes ${rep.drainPathCount}x drainage conduits.`,
      machiningOperations: [
        `3D slice with 0.4mm nozzle / ${rep.latticeLabel} infill`,
        `Sandwich core flexural rigidity (EI) gain: ${rep.stiffnessGainFactor}x`,
        `Integrated rear labyrinth acoustic trap behind woofer diaphragm`,
      ],
    };

    const matrixCutItem: CutListItem = {
      id: 'integral_damping_matrix',
      name: `Integral 3D-Printed Acoustic Matrix (${rep.latticeLabel})`,
      spatialLabel: 'Matrix-Acoustic-01',
      spatialLocation: 'Integral Sandwich Core & Rear Labyrinth Trap',
      type: 'cleat',
      quantity: 1,
      widthMm: Math.max(50, W - 2 * t),
      lengthMm: Math.max(50, H - 2 * t),
      thicknessMm: 45,
      materialName: `3D Printed ${rep.latticeLabel} Matrix`,
      weightKg: rep.addedFilamentMassKg,
      estimatedCostUsd: Math.round(rep.addedFilamentMassKg * 28),
      cutNotes: `Additive geometry: ${rep.displacedSolidVolumeLiters}L solid volume. Overhang: ${rep.maxMeasuredOverhangDeg}°.`,
      machiningNotes: `Viscous JCA resistivity: ${rep.jca.flowResistivityRaylsM} Rayls/m, NRC: ${rep.nrcScore}, EI Gain: ${rep.stiffnessGainFactor}x.`,
    };
    cutList.push(matrixCutItem);
  }

  partMetadataMap['damping_treatment'] = {
    id: 'damping_treatment',
    name: `Internal Acoustic Damping Treatment (${acoustics.dampingFillPercent}% Fill)`,
    spatialLabel: 'Acoustic-Foam-01',
    spatialLocation: 'Interior Absorptive Lining',
    category: 'acoustic',
    dimensionsMm: { w: Math.max(50, W - 2 * t), h: Math.max(50, H - 2 * t), d: 35 },
    material: 'Convoluted Open-Cell Acoustic Polyurethane Foam & Polyfill Fiber',
    weightKg: 0.28,
    acousticRole: `Suppresses internal standing wave eigenmodes and expands virtual acoustic volume by ~${Math.round((results.netVolumeLiters * (acoustics.dampingFillPercent / 100) * 0.15) * 10) / 10}L through isothermal heat dissipation.`,
    assemblyNotes: 'Adhere convoluted foam panels to inner rear and side walls using spray adhesive. Keep port intake throat unobstructed.',
    machiningOperations: ['Cut foam sheets to size', 'Apply spray contact cement to interior walls'],
  };

  return { cutList, partMetadataMap };
}

export function exportCutListToCSV(cutList: CutListItem[], dimensions: EnclosureDimensions): string {
  const headers = [
    'Spatial ID',
    'Spatial Location',
    'Part Name',
    'Type',
    'Quantity',
    'Width (mm)',
    'Length (mm)',
    'Thickness (mm)',
    'Width (in)',
    'Length (in)',
    'Material',
    'Est. Weight (kg)',
    'Cut Notes',
    'Machining Notes',
  ];
  
  const rows = cutList.map(item => [
    `"${item.spatialLabel}"`,
    `"${item.spatialLocation}"`,
    `"${item.name}"`,
    `"${item.type}"`,
    item.quantity,
    item.widthMm,
    item.lengthMm,
    item.thicknessMm,
    (item.widthMm / 25.4).toFixed(3),
    (item.lengthMm / 25.4).toFixed(3),
    `"${item.materialName}"`,
    item.weightKg,
    `"${item.cutNotes}"`,
    `"${item.machiningNotes}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
