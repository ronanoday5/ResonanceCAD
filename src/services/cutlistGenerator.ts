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

  // 1. Front Baffle with Multi-Driver Cutouts
  const baffleWeight = ((W * H * baffleT) * 1e-9) * material.densityKgM3;
  let baffleCutoutDesc = `Woofer: Ø${woofer.cutoutDiameterMm}mm`;
  if (topology === 'two_way') {
    baffleCutoutDesc = `Tweeter: Ø${tweeter.cutoutDiameterMm}mm, Woofer: Ø${woofer.cutoutDiameterMm}mm`;
  } else if (topology === 'mtm') {
    baffleCutoutDesc = `Tweeter Center: Ø${tweeter.cutoutDiameterMm}mm, Dual Woofers: 2x Ø${woofer.cutoutDiameterMm}mm`;
  } else if (topology === 'three_way') {
    baffleCutoutDesc = `Tweeter: Ø${tweeter.cutoutDiameterMm}mm, Midrange: Ø${midrange.cutoutDiameterMm}mm, Woofer: Ø${woofer.cutoutDiameterMm}mm`;
  }

  const baffleItem: CutListItem = {
    id: 'baffle_front',
    name: baffleT > t ? `Front Baffle (Double-Thick ${baffleT}mm)` : `Front Baffle (${baffleT}mm)`,
    type: 'baffle',
    quantity: 1,
    widthMm: W,
    lengthMm: H,
    thicknessMm: baffleT,
    materialName: material.name,
    weightKg: Math.round(baffleWeight * 100) / 100,
    cutNotes: `Cut ${W}mm x ${H}mm face. Grain orientation: Vertical. Topology: ${topology.toUpperCase()}.`,
    machiningNotes: `CNC multi-bore: ${baffleCutoutDesc}. Flush-mount rebates: 8mm depth for driver outer flanges.`,
  };
  cutList.push(baffleItem);

  partMetadataMap['baffle_front'] = {
    id: 'baffle_front',
    name: 'Acoustic Front Baffle',
    category: 'panel',
    dimensionsMm: { w: W, h: H, d: baffleT },
    material: material.name,
    weightKg: baffleItem.weightKg,
    acousticRole: `Rigid multi-transducer mounting platform configured for ${topology.toUpperCase()} alignment. Resists driver motor reaction forces.`,
    assemblyNotes: jointType === 'rabbet' ? '9.5mm rabbet rebate along left, right, top, and bottom inner edges.' : 'Butt joint with internal corner cleats and polyurethane wood glue.',
    machiningOperations: [
      `Flush-mount driver rebates: 8mm depth`,
      `Multi-driver through-bores: ${baffleCutoutDesc}`,
      'Rear breathing chamfer: 45° bevel along inside woofer cutout rims',
    ],
  };

  // 2. Rear Panel
  const rearW = Math.max(50, W - 2 * t);
  const rearH = Math.max(50, H - 2 * t);
  const rearWeight = ((rearW * rearH * t) * 1e-9) * material.densityKgM3;
  const rearItem: CutListItem = {
    id: 'panel_rear',
    name: 'Rear Panel',
    type: 'rear',
    quantity: 1,
    widthMm: rearW,
    lengthMm: rearH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(rearWeight * 100) / 100,
    cutNotes: `Cut ${rearW}mm x ${rearH}mm. Inset between side and top/bottom panels.`,
    machiningNotes: 'Bore Ø78mm hole or recess for crossover terminal cup mounting plate.',
  };
  cutList.push(rearItem);

  partMetadataMap['panel_rear'] = {
    id: 'panel_rear',
    name: 'Rear Enclosure Panel',
    category: 'panel',
    dimensionsMm: { w: rearW, h: rearH, d: t },
    material: material.name,
    weightKg: rearItem.weightKg,
    acousticRole: 'Supports heavy passive crossover PCB board and terminal binding posts.',
    assemblyNotes: 'Glued and clamped airtight with neoprene gasket sealing.',
    machiningOperations: ['Terminal cup cutout: Ø78mm', '4x standoff pilot holes for crossover PCB mounting'],
  };

  // 3. Top & Bottom Panels
  const topBottomD = Math.max(50, D - baffleT);
  const topBottomWeight = ((W * topBottomD * t) * 1e-9) * material.densityKgM3;

  const topItem: CutListItem = {
    id: 'panel_top',
    name: 'Top Panel',
    type: 'top',
    quantity: 1,
    widthMm: W,
    lengthMm: topBottomD,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(topBottomWeight * 100) / 100,
    cutNotes: `Cut ${W}mm x ${topBottomD}mm. Full width roof panel.`,
    machiningNotes: 'Edge square cut at 90.0°.',
  };
  cutList.push(topItem);

  const bottomItem: CutListItem = {
    id: 'panel_bottom',
    name: 'Bottom Base Panel',
    type: 'bottom',
    quantity: 1,
    widthMm: W,
    lengthMm: topBottomD,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(topBottomWeight * 100) / 100,
    cutNotes: `Cut ${W}mm x ${topBottomD}mm. Cabinet base panel.`,
    machiningNotes: 'Bore 4x M8 threaded brass inserts for acoustic isolation feet.',
  };
  cutList.push(bottomItem);

  // 4. Side Panels
  const sideH = Math.max(50, H - 2 * t);
  const sideD = Math.max(50, D - baffleT);
  const sideWeight = ((sideH * sideD * t) * 1e-9) * material.densityKgM3;

  const leftSideItem: CutListItem = {
    id: 'panel_left',
    name: 'Left Side Panel',
    type: 'left_side',
    quantity: 1,
    widthMm: sideD,
    lengthMm: sideH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(sideWeight * 100) / 100,
    cutNotes: `Cut ${sideD}mm x ${sideH}mm. Inset between top and bottom panels.`,
    machiningNotes: 'Dado grooves 6mm deep for internal matrix brace placement.',
  };
  cutList.push(leftSideItem);

  const rightSideItem: CutListItem = {
    id: 'panel_right',
    name: 'Right Side Panel',
    type: 'right_side',
    quantity: 1,
    widthMm: sideD,
    lengthMm: sideH,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(sideWeight * 100) / 100,
    cutNotes: `Cut ${sideD}mm x ${sideH}mm. Mirrors left side panel.`,
    machiningNotes: 'Dado grooves 6mm deep for internal matrix brace placement.',
  };
  cutList.push(rightSideItem);

  // 5. Internal Matrix Window Brace
  const braceW = Math.max(50, W - 2 * t);
  const braceD = Math.max(50, D - baffleT - t);
  const braceWeight = ((braceW * braceD * t) * 1e-9) * material.densityKgM3 * 0.55;
  const braceQuantity = acoustics.bracingLevel === 'heavy' ? 2 : 1;

  const braceItem: CutListItem = {
    id: 'brace_window',
    name: `Internal Matrix Window Brace (${braceQuantity}x)`,
    type: 'window_brace',
    quantity: braceQuantity,
    widthMm: braceW,
    lengthMm: braceD,
    thicknessMm: t,
    materialName: material.name,
    weightKg: Math.round(braceWeight * braceQuantity * 100) / 100,
    cutNotes: `Cut ${braceW}mm x ${braceD}mm perimeter. CNC 4x radiused window cutouts.`,
    machiningNotes: 'Four rounded rectangular acoustic pass-through windows with 25mm corner radius fillets.',
  };
  cutList.push(braceItem);

  // 6. Midrange Sealed Sub-Chamber (if 3-Way)
  if (topology === 'three_way') {
    const midBoxW = Math.max(120, midrange.frameOuterDiameterMm + 20);
    const midBoxH = Math.max(120, midrange.frameOuterDiameterMm + 20);
    const midBoxD = 140;
    const midChamberWeight = ((midBoxW * midBoxH * t * 4) * 1e-9) * material.densityKgM3;

    const midChamberItem: CutListItem = {
      id: 'midrange_chamber',
      name: 'Midrange Sealed Rear Enclosure Chamber',
      type: 'midrange_chamber',
      quantity: 1,
      widthMm: midBoxW,
      lengthMm: midBoxH,
      thicknessMm: t,
      materialName: material.name,
      weightKg: Math.round(midChamberWeight * 100) / 100,
      cutNotes: `Airtight isolated rear enclosure (${results.midrangeChamberVolumeLiters}L volume) isolating midrange driver from woofer pressure waves.`,
      machiningNotes: 'Glue and seal 100% airtight with silicone mastic behind midrange baffle cutout.',
    };
    cutList.push(midChamberItem);

    partMetadataMap['midrange_chamber'] = {
      id: 'midrange_chamber',
      name: 'Isolated Midrange Acoustic Chamber',
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
    type: 'crossover_pcb',
    quantity: 1,
    widthMm: 160,
    lengthMm: 120,
    thicknessMm: 1.6,
    materialName: 'FR4 Fiber Glass with 2oz Copper Traces',
    weightKg: 0.85,
    cutNotes: `Populated with ${results.crossover.allComponents.length} passive filter components (${topology.toUpperCase()}).`,
    machiningNotes: results.crossover.allComponents.map(c => `${c.name}: ${c.valueFormatted}`).join(', '),
  };
  cutList.push(pcbItem);

  partMetadataMap['crossover_pcb'] = {
    id: 'crossover_pcb',
    name: 'Crossover Filter Network',
    category: 'crossover',
    dimensionsMm: { w: 160, h: 120, d: 45 },
    material: 'FR4 Glass Epoxy, Air-Core Inductors, Polypropylene Capacitors, Ceramic Resistors',
    weightKg: 0.85,
    acousticRole: `Separates audio signal into distinct passbands for ${topology.toUpperCase()} transducer alignment (${acoustics.crossoverLowHz}Hz / ${acoustics.crossoverHighHz}Hz).`,
    assemblyNotes: 'Mount with 4x nylon standoffs on rear cabinet panel.',
    machiningOperations: results.crossover.allComponents.map(c => `Solder ${c.name} (${c.valueFormatted})`),
  };

  return { cutList, partMetadataMap };
}

export function exportCutListToCSV(cutList: CutListItem[], dimensions: EnclosureDimensions): string {
  const headers = ['Part Name', 'Type', 'Quantity', 'Width (mm)', 'Length (mm)', 'Thickness (mm)', 'Width (in)', 'Length (in)', 'Material', 'Est. Weight (kg)', 'Cut Notes', 'Machining Notes'];
  
  const rows = cutList.map(item => [
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
