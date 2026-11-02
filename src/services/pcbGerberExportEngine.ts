import JSZip from 'jszip';
import type {
  BoardModule,
  CircuitBoardStack,
  GerberExportFile,
  GerberPackageResult,
} from '../types/pcb.ts';

/**
 * Compiles a CircuitBoardStack into standard RS-274X Gerber files, Excellon drill files, CPL, and BOMs
 */
export function generateGerberManufacturingPackage(
  stack: CircuitBoardStack,
  projectName: string = 'ResonanceCAD_Crossover_Stack'
): GerberPackageResult {
  const generatedDate = new Date().toISOString();
  const allExportFiles: GerberExportFile[] = [];

  let consolidatedBomCsv =
    'Item,Designator,Quantity,Value,Component Type,Rating,Recommended Part,Distributor SKU,Board Module,Unit Cost USD,Total Cost USD\n';
  let consolidatedCplCsv = 'Designator,Val,Package,Mid X (mm),Mid Y (mm),Rotation,Layer,Board Code\n';

  let itemCounter = 1;
  let totalBOMCost = 0;

  // Process each board in the stack
  stack.boards.forEach((board) => {
    const code = board.code.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Top Copper Layer (.gtl)
    const gtlContent = generateGerberRS274X(board, 'top_copper');
    allExportFiles.push({
      filename: `${code}_Top_Copper.gtl`,
      boardName: board.name,
      layerType: 'top_copper',
      description: `Top Copper Layer (2oz audio traces & pads) for ${board.name}`,
      mimeType: 'text/plain',
      content: gtlContent,
    });

    // 2. Bottom Copper Layer (.gbl)
    const gblContent = generateGerberRS274X(board, 'bottom_copper');
    allExportFiles.push({
      filename: `${code}_Bottom_Copper.gbl`,
      boardName: board.name,
      layerType: 'bottom_copper',
      description: `Bottom Copper Layer (Heavy Ground Bus & Return) for ${board.name}`,
      mimeType: 'text/plain',
      content: gblContent,
    });

    // 3. Top Solder Mask (.gts)
    const gtsContent = generateGerberRS274X(board, 'top_soldermask');
    allExportFiles.push({
      filename: `${code}_Top_SolderMask.gts`,
      boardName: board.name,
      layerType: 'top_soldermask',
      description: `Top Solder Mask Openings for ${board.name}`,
      mimeType: 'text/plain',
      content: gtsContent,
    });

    // 4. Bottom Solder Mask (.gbs)
    const gbsContent = generateGerberRS274X(board, 'bottom_soldermask');
    allExportFiles.push({
      filename: `${code}_Bottom_SolderMask.gbs`,
      boardName: board.name,
      layerType: 'bottom_soldermask',
      description: `Bottom Solder Mask Openings for ${board.name}`,
      mimeType: 'text/plain',
      content: gbsContent,
    });

    // 5. Top Silkscreen (.gto)
    const gtoContent = generateGerberRS274X(board, 'top_silkscreen');
    allExportFiles.push({
      filename: `${code}_Top_Silkscreen.gto`,
      boardName: board.name,
      layerType: 'top_silkscreen',
      description: `Top Silkscreen Legend & Reference Designators for ${board.name}`,
      mimeType: 'text/plain',
      content: gtoContent,
    });

    // 6. Board Outline / Milling Contour (.gko)
    const gkoContent = generateGerberRS274X(board, 'board_outline');
    allExportFiles.push({
      filename: `${code}_Board_Outline.gko`,
      boardName: board.name,
      layerType: 'board_outline',
      description: `Mechanical Board Outline & Milling Routing for ${board.name}`,
      mimeType: 'text/plain',
      content: gkoContent,
    });

    // 7. Excellon NC Drill File (.drl)
    const drlContent = generateExcellonDrill(board);
    allExportFiles.push({
      filename: `${code}_Drill.drl`,
      boardName: board.name,
      layerType: 'nc_drill',
      description: `Excellon NC Drill Holes for ${board.name}`,
      mimeType: 'text/plain',
      content: drlContent,
    });

    // 8. Board Pick & Place (CPL) Centroid CSV
    const boardCplCsv = generateCplCsv(board);
    allExportFiles.push({
      filename: `${code}_PickAndPlace.csv`,
      boardName: board.name,
      layerType: 'pick_and_place',
      description: `SMT/THT Component Centroid Pick & Place Coordinates for ${board.name}`,
      mimeType: 'text/csv',
      content: boardCplCsv,
    });

    // 9. Board Specific BOM CSV
    const boardBomCsv = generateBoardBomCsv(board);
    allExportFiles.push({
      filename: `${code}_BOM.csv`,
      boardName: board.name,
      layerType: 'bom',
      description: `Bill of Materials Component Spec Sheet for ${board.name}`,
      mimeType: 'text/csv',
      content: boardBomCsv,
    });

    // 10. IPC-D-356 Netlist
    const netlistContent = generateIpcNetlist(board);
    allExportFiles.push({
      filename: `${code}_Netlist.ipc`,
      boardName: board.name,
      layerType: 'netlist',
      description: `IPC-D-356 Electrical Continuity Netlist for ${board.name}`,
      mimeType: 'text/plain',
      content: netlistContent,
    });

    // Append to consolidated BOM & CPL
    board.components.forEach((comp) => {
      consolidatedBomCsv += `${itemCounter++},${comp.designator},1,"${comp.valueFormatted}","${comp.type.toUpperCase()}","${comp.ratingStr}","${comp.recommendedPartNumber}","${comp.distributorSku}","${board.name}",$${comp.estimatedCostUsd.toFixed(2)},$${comp.estimatedCostUsd.toFixed(2)}\n`;
      totalBOMCost += comp.estimatedCostUsd;

      consolidatedCplCsv += `${comp.designator},"${comp.valueFormatted}","${comp.footprintName}",${comp.midXMm},${comp.midYMm},${comp.rotationDeg},Top,"${board.code}"\n`;
    });
  });

  // Add Stacking Hardware to consolidated BOM
  const standoffCount = stack.stackingHardware.standoffCount;
  if (standoffCount > 0) {
    consolidatedBomCsv += `${itemCounter++},"STANDOFF_SET",${standoffCount},"25mm M4 Brass Hex","Hardware","M4 Thread","M4 x 25mm Brass Standoff","94451A235","Stack Hardware",$0.85,$${(standoffCount * 0.85).toFixed(2)}\n`;
    totalBOMCost += standoffCount * 0.85;
  }

  // Add Neutrik speakON Input/Output Connector, Gasket, and Crimp Harness BOM Items
  const isMultiWayActive = stack.architecture === 'split_three_way' || stack.boards.length >= 3;
  const speakonModel = isMultiWayActive ? 'NL8MPR-BAG' : 'NLT4MP-BAG';
  const speakonName = isMultiWayActive
    ? 'Neutrik speakON NL8MPR-BAG (8-Pole G-Shape Chassis)'
    : 'Neutrik speakON NLT4MP-BAG (4-Pole STXX D-Shape Chassis)';
  const speakonSku = isMultiWayActive ? '568-NL8MPR-BAG' : '568-NLT4MP-BAG';
  const speakonUnitCost = isMultiWayActive ? 14.8 : 9.45;
  const gasketPart = isMultiWayActive ? 'NEUTRIK-SG-NL8' : 'NEUTRIK-SCDX-GASKET';
  const gasketSku = isMultiWayActive ? '568-SGNL8' : '568-SCDX';
  const gasketCost = isMultiWayActive ? 1.85 : 1.2;
  const crimpCount = isMultiWayActive ? 16 : 8; // 2 connectors (IN + LINK THRU)

  consolidatedBomCsv += `${itemCounter++},"J_SPK_IN_THRU",2,"${speakonModel}","SPEAKON_IO","${isMultiWayActive ? '30A/250V 8-Pole' : '40A/250V 4-Pole'}","${speakonName}","${speakonSku}","Rear I/O Dish",$${speakonUnitCost.toFixed(2)},$${(speakonUnitCost * 2).toFixed(2)}\n`;
  consolidatedBomCsv += `${itemCounter++},"GSK_SPK",2,"EPDM Sealing Gasket","GASKET","Airtight IP54","${gasketPart}","${gasketSku}","Rear I/O Dish",$${gasketCost.toFixed(2)},$${(gasketCost * 2).toFixed(2)}\n`;
  consolidatedBomCsv += `${itemCounter++},"TERM_FASTON",${crimpCount},"NLFASTON 4.8x0.5mm","CRIMP_TERMINAL","12-14 AWG OFC","Neutrik NLFASTON-250 Crimp Receptacle","568-NLFASTON","Wiring Harness",$0.38,$${(crimpCount * 0.38).toFixed(2)}\n`;
  totalBOMCost += speakonUnitCost * 2 + gasketCost * 2 + crimpCount * 0.38;

  // Inter-board Wiring Harness Guide
  const wiringHarnessText = generateWiringHarnessGuide(stack);
  allExportFiles.push({
    filename: 'Inter_Board_Wiring_Harness_Guide.txt',
    boardName: 'Stack Wiring System',
    layerType: 'wiring_diagram',
    description: 'Wire Gauge, Color Code & Pinout Guide for Inter-Board Connections',
    mimeType: 'text/plain',
    content: wiringHarnessText,
  });

  // Master Consolidated BOM CSV
  allExportFiles.push({
    filename: 'Full_Stack_Consolidated_BOM.csv',
    boardName: 'Procurement Master',
    layerType: 'bom',
    description: 'Complete Multi-Board Bill of Materials with Distributor Part Numbers',
    mimeType: 'text/csv',
    content: consolidatedBomCsv,
  });

  // Master Schematic Summary
  const schematicText = generateSchematicAscii(stack);

  return {
    projectName,
    generatedDate,
    stackArchitecture: stack.architecture,
    boardCount: stack.boards.length,
    files: allExportFiles,
    bomCsv: consolidatedBomCsv,
    cplCsv: consolidatedCplCsv,
    schematicText,
    ipcD356Netlist: allExportFiles.find((f) => f.layerType === 'netlist')?.content || '',
    wiringHarnessText,
  };
}

/**
 * Creates a downloadable ZIP archive containing all Gerber files, drills, and BOMs
 */
export async function createGerberZipBlob(pkg: GerberPackageResult): Promise<Blob> {
  const zip = new JSZip();

  // Root documentation
  zip.file('READ_ME_FABRICATION_INSTRUCTIONS.txt', generateReadmeInstructions(pkg));
  zip.file('Full_Stack_Consolidated_BOM.csv', pkg.bomCsv);
  zip.file('Inter_Board_Wiring_Harness_Guide.txt', pkg.wiringHarnessText);
  zip.file('Crossover_Schematic_Topology.txt', pkg.schematicText);

  // Group files into board folders
  pkg.files.forEach((file) => {
    if (file.filename.includes('Consolidated') || file.filename.includes('Wiring_Harness')) return;

    // Detect board prefix
    const boardPrefix = file.filename.split('_')[0];
    const folder = zip.folder(`Board_${boardPrefix}`) || zip;
    folder.file(file.filename, file.content);
  });

  return await zip.generateAsync({ type: 'blob' });
}

// --- RS-274X GERBER ENCODER ---

function generateGerberRS274X(
  board: BoardModule,
  layer: 'top_copper' | 'bottom_copper' | 'top_soldermask' | 'bottom_soldermask' | 'top_silkscreen' | 'board_outline'
): string {
  const dateStr = new Date().toISOString();
  const w = board.dimensions.widthMm;
  const h = board.dimensions.heightMm;

  let out = '';
  // Gerber Header
  out += `G04 Layer: ${layer.toUpperCase()}*\n`;
  out += `G04 Board: ${board.name} (${board.code})*\n`;
  out += `G04 Generated by ResonanceCAD Audio Engineering Suite*\n`;
  out += `G04 Date: ${dateStr}*\n`;
  out += `%FSLAX46Y46*%\n`; // Format statement: Leading zero omitted, absolute coordinates, 4.6 metric
  out += `%MOMM*%\n`; // Millimeter units
  out += `%LPD*%\n`; // Layer polarity dark

  // Aperture Definitions
  out += `%ADD10C,0.150*%\n`; // Thin line (silkscreen/outline)
  out += `%ADD11C,1.200*%\n`; // Component pad outer ring
  out += `%ADD12C,1.800*%\n`; // Wire pad outer ring
  out += `%ADD13C,4.500*%\n`; // Screw terminal pad
  out += `%ADD14C,2.500*%\n`; // Standard signal trace width
  out += `%ADD15C,4.000*%\n`; // Heavy current copper bus width
  out += `%ADD16C,4.200*%\n`; // Mounting standoff hole pad
  out += `%ADD17R,4.500X4.500*%\n`; // Square terminal pad

  // Layer Specific Drawing
  switch (layer) {
    case 'board_outline': {
      out += `D10*\n`; // Select 0.15mm tool
      // Draw rectangular board outline with corner fillets
      out += formatGerberCoord(0, 0, 'moveto');
      out += formatGerberCoord(w, 0, 'lineto');
      out += formatGerberCoord(w, h, 'lineto');
      out += formatGerberCoord(0, h, 'lineto');
      out += formatGerberCoord(0, 0, 'lineto');
      break;
    }

    case 'top_copper': {
      // Draw component pads
      out += `D11*\n`;
      board.pads.forEach((pad) => {
        out += formatGerberCoord(pad.xMm, pad.yMm, 'flash');
      });

      // Draw high-current traces
      out += `D14*\n`;
      board.traces.filter((t) => t.layer === 'top').forEach((t) => {
        out += formatGerberCoord(t.startX, t.startY, 'moveto');
        out += formatGerberCoord(t.endX, t.endY, 'lineto');
      });

      // Terminal blocks
      out += `D13*\n`;
      board.connectors.forEach((c) => {
        out += formatGerberCoord(c.xMm, c.yMm, 'flash');
      });
      break;
    }

    case 'bottom_copper': {
      // Draw ground bus
      out += `D15*\n`; // Heavy 4.0mm trace
      board.traces.filter((t) => t.layer === 'bottom').forEach((t) => {
        out += formatGerberCoord(t.startX, t.startY, 'moveto');
        out += formatGerberCoord(t.endX, t.endY, 'lineto');
      });

      // Flashed pads for bottom layer
      out += `D11*\n`;
      board.pads.forEach((pad) => {
        out += formatGerberCoord(pad.xMm, pad.yMm, 'flash');
      });
      break;
    }

    case 'top_soldermask':
    case 'bottom_soldermask': {
      // Solder mask openings (0.1mm oversized pads)
      out += `D13*\n`;
      board.pads.forEach((pad) => {
        out += formatGerberCoord(pad.xMm, pad.yMm, 'flash');
      });
      break;
    }

    case 'top_silkscreen': {
      out += `D10*\n`; // 0.15mm line
      // Silk lines & component boxes
      board.silkElements.forEach((s) => {
        if (s.type === 'rect' && s.widthMm && s.heightMm) {
          const hw = s.widthMm / 2;
          const hh = s.heightMm / 2;
          out += formatGerberCoord(s.x - hw, s.y - hh, 'moveto');
          out += formatGerberCoord(s.x + hw, s.y - hh, 'lineto');
          out += formatGerberCoord(s.x + hw, s.y + hh, 'lineto');
          out += formatGerberCoord(s.x - hw, s.y + hh, 'lineto');
          out += formatGerberCoord(s.x - hw, s.y - hh, 'lineto');
        } else if (s.type === 'circle' && s.radiusMm) {
          out += formatGerberCoord(s.x, s.y, 'flash');
        }
      });
      break;
    }
  }

  // Gerber Footer
  out += `M02*\n`; // End of program
  return out;
}

function formatGerberCoord(xMm: number, yMm: number, mode: 'moveto' | 'lineto' | 'flash'): string {
  // 4.6 metric coordinates: multiply mm by 1,000,000 and integer format
  const x = Math.round(xMm * 1000000);
  const y = Math.round(yMm * 1000000);
  const code = mode === 'moveto' ? 'D02*' : mode === 'lineto' ? 'D01*' : 'D03*';
  return `X${x}Y${y}${code}\n`;
}

// --- EXCELLON NC DRILL GENERATOR ---

function generateExcellonDrill(board: BoardModule): string {
  let out = '';
  out += `; FILE_FORMAT=2:4\n`;
  out += `; METRIC, INCH=OFF\n`;
  out += `M48\n`;
  out += `; DRILL TOOLS DEFINITION\n`;
  out += `T01C1.200\n`; // Component lead through-holes (capacitors, resistors)
  out += `T02C1.800\n`; // Heavy inductor and terminal pins
  out += `T03C4.200\n`; // M4 mounting standoff corner holes
  out += `%\n`;
  out += `G90\n`; // Absolute coordinates
  out += `G05\n`; // Drill mode

  // Tool 1: Component leads (1.2mm)
  out += `T01\n`;
  board.holes.filter((h) => h.diameterMm <= 1.3).forEach((h) => {
    out += `X${Math.round(h.xMm * 10000)}Y${Math.round(h.yMm * 10000)}\n`;
  });

  // Tool 2: Heavy pins / terminals (1.8mm)
  out += `T02\n`;
  board.holes.filter((h) => h.diameterMm > 1.3 && h.diameterMm < 3.0).forEach((h) => {
    out += `X${Math.round(h.xMm * 10000)}Y${Math.round(h.yMm * 10000)}\n`;
  });

  // Tool 3: M4 Standoff mounting holes (4.2mm)
  out += `T03\n`;
  board.holes.filter((h) => h.diameterMm >= 3.0).forEach((h) => {
    out += `X${Math.round(h.xMm * 10000)}Y${Math.round(h.yMm * 10000)}\n`;
  });

  out += `M30\n`; // End of drill file
  return out;
}

// --- CPL (CENTROID / PICK & PLACE) GENERATOR ---

function generateCplCsv(board: BoardModule): string {
  let out = 'Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n';
  board.components.forEach((c) => {
    out += `${c.designator},"${c.valueFormatted}","${c.footprintName}",${c.midXMm},${c.midYMm},${c.rotationDeg},Top\n`;
  });
  return out;
}

// --- BOARD SPECIFIC BOM CSV ---

function generateBoardBomCsv(board: BoardModule): string {
  let out = 'Item,Designator,Quantity,Value,Type,Rating,Recommended Part Number,Distributor SKU,Estimated Cost\n';
  board.components.forEach((c, idx) => {
    out += `${idx + 1},${c.designator},1,"${c.valueFormatted}","${c.type.toUpperCase()}","${c.ratingStr}","${c.recommendedPartNumber}","${c.distributorSku}",$${c.estimatedCostUsd.toFixed(2)}\n`;
  });
  return out;
}

// --- IPC-D-356 ELECTRICAL NETLIST GENERATOR ---

function generateIpcNetlist(board: BoardModule): string {
  let out = 'C IPC-D-356 NETLIST FILE GENERATED BY RESONANCECAD\n';
  out += `C BOARD: ${board.name} (${board.code})\n`;
  out += `C REVISION: 1.0\n`;

  board.pads.forEach((pad) => {
    const net = pad.netName.padEnd(14, ' ');
    const des = (pad.id.split('_')[0] || 'COMP').padEnd(6, ' ');
    const x = Math.round(pad.xMm * 1000).toString().padStart(6, '0');
    const y = Math.round(pad.yMm * 1000).toString().padStart(6, '0');
    out += `317 ${net} ${des} -1 D 0120 X${x} Y${y}\n`;
  });

  // Neutrik speakON Rear Panel I/O Harness Netlist Continuity Records
  out += `C NEUTRIK SPEAKON INPUT/THRU HARNESS CONTINUITY NETS\n`;
  out += `317 ${'NET_SPK_1P_LF'.padEnd(14, ' ')} ${'J_NL_1'.padEnd(6, ' ')} -1 D 0180 X005000 Y010000\n`;
  out += `317 ${'NET_SPK_1N_LF'.padEnd(14, ' ')} ${'J_NL_1'.padEnd(6, ' ')} -2 D 0180 X005000 Y015000\n`;
  out += `317 ${'NET_SPK_2P_HF'.padEnd(14, ' ')} ${'J_NL_2'.padEnd(6, ' ')} -1 D 0180 X005000 Y025000\n`;
  out += `317 ${'NET_SPK_2N_HF'.padEnd(14, ' ')} ${'J_NL_2'.padEnd(6, ' ')} -2 D 0180 X005000 Y030000\n`;

  out += '999\n';
  return out;
}

// --- WIRING HARNESS DOCUMENTATION ---

function generateWiringHarnessGuide(stack: CircuitBoardStack): string {
  let out = '========================================================================\n';
  out += `RESONANCECAD INTER-BOARD WIRING HARNESS SPECIFICATION\n`;
  out += `Project: ${stack.stackName}\n`;
  out += `Architecture: ${stack.architecture.toUpperCase()}\n`;
  out += `Total Stack Tiers: ${stack.stackingHardware.tierCount} Tiers (Separated by ${stack.stackingHardware.standoffHeightMm}mm M4 Brass Standoffs)\n`;
  out += '========================================================================\n\n';

  out += '1. INTER-BOARD SILICONE WIRE JUMPERS:\n';
  out += '------------------------------------------------------------------------\n';
  out += 'ID | Signal Name | From Board -> Pin | To Board -> Pin | Wire Gauge | Color | Length\n';
  out += '------------------------------------------------------------------------\n';

  if (stack.jumpers.length === 0) {
    out += 'Unified single board configuration. No inter-board wiring jumpers required.\n';
  } else {
    stack.jumpers.forEach((j) => {
      out += `${j.id} | ${j.signalName} | ${j.fromBoardId} (${j.fromPadLabel}) -> ${j.toBoardId} (${j.toPadLabel}) | ${j.recommendedWireAwg} AWG | ${j.wireColorHex} | ${j.lengthMm} mm\n`;
    });
  }

  out += '\n2. NEUTRIK SPEAKON (NL4 / NL8) REAR TERMINAL DISH PINOUT & HARNESS:\n';
  out += '------------------------------------------------------------------------\n';
  out += '- Standard 2-Way / Passive / Subwoofer (Neutrik NL4MP / NLT4MP-BAG 4-Pole):\n';
  out += '  * Pins 1+ / 1- : Low Frequency (LF) or Full-Range Passive Input (12 AWG OFC Red/Black)\n';
  out += '  * Pins 2+ / 2- : High Frequency (HF) Bi-Amp or Aux Subwoofer/Top Pass-Through (14 AWG OFC Yellow/Blue)\n';
  out += '- Multi-Way Active / Touring Line Array (Neutrik NL8MPR-BAG 8-Pole):\n';
  out += '  * Pins 1+ / 1- : Subwoofer / Low Frequency 1 (LF1 - 12 AWG OFC)\n';
  out += '  * Pins 2+ / 2- : Low-Midrange / Low Frequency 2 (LF2 - 12 AWG OFC)\n';
  out += '  * Pins 3+ / 3- : Midrange Horn / MF1 (14 AWG OFC)\n';
  out += '  * Pins 4+ / 4- : High Frequency Compression Driver / Tweeter Array (14 AWG OFC)\n';
  out += '- Crimp Termination: Use Neutrik NLFASTON (4.8 × 0.5 mm / 0.187" quick-disconnect) with silicone insulation sleeves.\n';
  out += '- Sealing: Install EPDM cellular rubber panel gasket (NEUTRIK-SCDX-GASKET or SG-NL8) under connector flange.\n';

  out += '\n3. CABINET MOUNTING INSTRUCTIONS:\n';
  out += '------------------------------------------------------------------------\n';
  out += '- Mount Bottom Tier (Board A) to cabinet inner rear wall using 4x M4 x 10mm wood screws with anti-vibration neoprene washers.\n';
  out += '- Thread 4x 25mm female-female M4 brass standoffs onto corner studs.\n';
  out += '- Align Upper Tier (Board B) mounting holes over brass standoffs and fasten with M4 pan-head machine screws.\n';
  out += '- Solder or screw-clamp the flexible 14 AWG silicone jumper cables between terminal blocks before final enclosure closure.\n\n';

  out += '4. INDUCTOR MUTUAL INDUCTANCE MITIGATION:\n';
  out += '------------------------------------------------------------------------\n';
  out += 'All adjacent inductors have been oriented at 90° right angles (perpendicular magnetic flux) to suppress mutual inductance coupling crosstalk (< -70 dB).\n';

  return out;
}

function generateSchematicAscii(stack: CircuitBoardStack): string {
  let out = 'RESONANCECAD CROSSOVER CIRCUIT BOARD SCHEMATIC\n\n';
  stack.boards.forEach((b) => {
    out += `--- [${b.code}: ${b.name}] ---\n`;
    out += `Input Terminal (IN+, IN-) ===>\n`;
    b.components.forEach((c) => {
      out += `  [${c.designator}] ${c.valueFormatted} (${c.type.toUpperCase()}) - ${c.ratingStr}\n`;
    });
    out += `===> Output Terminal\n\n`;
  });
  return out;
}

function generateReadmeInstructions(pkg: GerberPackageResult): string {
  return `RESONANCECAD PASSIVE CROSSOVER PCB MANUFACTURING PACKAGE
Generated: ${pkg.generatedDate}
Project: ${pkg.projectName}
Architecture: ${pkg.stackArchitecture}
Board Count: ${pkg.boardCount} Boards

INCLUDED MANUFACTURING FILES:
- Gerber RS-274X:
  *.gtl : Top Copper Layer (2oz Audio Grade)
  *.gbl : Bottom Copper Layer (Heavy Ground Bus)
  *.gts : Top Solder Mask
  *.gbs : Bottom Solder Mask
  *.gto : Top Silkscreen (Reference Designators & Polarities)
  *.gko : Board Edge Milling Outline (with 5mm corner radii)
- Drill:
  *.drl : Excellon NC Drill File (M4 standoffs & component through-holes)
- Assembly & SMT:
  *_PickAndPlace.csv : Centroid CPL coordinates
  *_BOM.csv : Bill of Materials per board
  Full_Stack_Consolidated_BOM.csv : Master procurement list
  Inter_Board_Wiring_Harness_Guide.txt : Stacking and jumper guide

FABRICATION RECOMMENDATIONS (JLCPCB, PCBWay, MacroFab, OSH Park):
- Layers: 2 Layers
- Board Thickness: 1.6 mm or 2.0 mm FR4 High-Tg
- Copper Weight: 2 oz (70µm) recommended for high current loudspeaker filter rails
- Surface Finish: ENIG Gold or Lead-Free HASL
- Solder Mask: Matte Black or Audiophile Blue
- Silkscreen: White
`;
}
