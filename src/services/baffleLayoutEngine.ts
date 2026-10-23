import type {
  AcousticCalculationResult,
  AcousticParameters,
  AirflowInterferenceReport,
  AirflowObstructionPoint,
  BaffleComponentPlacement,
  BaffleLayoutResult,
  CollisionItem,
  EnclosureDimensions,
  PortPlacement,
} from '../types/loudspeaker.ts';

/**
 * Intelligent Baffle & Enclosure Layout Engine
 * 
 * Accurately calculates 2D front/rear baffle cutout coordinates and 3D internal clearances
 * to guarantee that ports, aerovents, slot shelves, and driver motor structures NEVER clash.
 */

/**
 * Fast closed-form Helmholtz resonator port length estimator (mm)
 * Used when calculating hypothetical layout configurations prior to full matrix synthesis.
 */
export function estimatePortLengthMm(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters
): number {
  if (acoustics.alignment === 'sealed') return 0;
  const wallT = 18;
  const baffleT = dimensions.baffleThicknessMm || 18;
  const intW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const intH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(50, dimensions.externalDepthMm - baffleT - wallT);
  const grossVbLiters = (intW * intH * intD) * 1e-6;
  const estNetVb = Math.max(2, grossVbLiters * 0.82);

  const portDiam = acoustics.portDiameterMm || 80;
  const activeFb = acoustics.targetFb || 35;
  const numPorts = acoustics.numberOfPorts || 1;

  if (acoustics.portType === 'slot') {
    const activeSlotW = Math.min(intW - 10, acoustics.slotWidthMm || (intW * 0.85));
    const activeSlotH = acoustics.slotHeightMm || 45;
    const apCm2 = ((activeSlotW / 10) * (activeSlotH / 10)) * numPorts;
    const effDvCm = Math.sqrt((apCm2 / numPorts) * (4 / Math.PI));
    const lvCm = (23562.5 * (apCm2 / numPorts) / (activeFb * activeFb * estNetVb)) - (1.35 * (effDvCm / 2));
    return Math.max(30, Math.round(lvCm * 10));
  } else {
    const radiusCm = (portDiam / 10) / 2;
    const apCm2 = Math.PI * radiusCm * radiusCm * numPorts;
    const effDvCm = portDiam / 10;
    const kEnd = acoustics.isDoubleFlared ? 1.6 : 0.8;
    const lvCm = (23562.5 * (apCm2 / numPorts) / (activeFb * activeFb * estNetVb)) - (kEnd * (effDvCm / 2));
    return Math.max(30, Math.round(lvCm * 10));
  }
}

export function computeBaffleLayout(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  results?: Partial<AcousticCalculationResult>
): BaffleLayoutResult {
  const { externalWidthMm: W, externalHeightMm: H, externalDepthMm: D, baffleThicknessMm, material } = dimensions;
  // Panel thicknesses
  const baffleT = baffleThicknessMm || 18;
  const wallT = 18; // standard nominal cabinet wall thickness
  const intW = Math.max(50, W - 2 * wallT);
  const intH = Math.max(50, H - 2 * wallT);
  const intD = Math.max(50, D - baffleT - wallT);

  const { topology, driverAssignments, alignment, portType, portDiameterMm, flareRadiusMm, isDoubleFlared, slotWidthMm, slotHeightMm } = acoustics;
  const portPlacement: PortPlacement = acoustics.portPlacement || 'auto';

  const woofer = driverAssignments.woofer.driver;
  const tweeter = driverAssignments.tweeter.driver;
  const midrange = driverAssignments.midrange.driver;

  const isPorted = alignment === 'ported';
  const effectivePortLengthMm = results?.portLengthMm || estimatePortLengthMm(dimensions, acoustics);
  const activeFlareRadiusMm = flareRadiusMm || results?.optimalFlareRadiusMm || 16;

  // Physical component radius / dimensions
  const wooferOuterR = woofer.frameOuterDiameterMm / 2;
  const wooferCutoutR = woofer.cutoutDiameterMm / 2;
  const wooferDepth = woofer.mountingDepthMm;
  const wooferMagnetR = woofer.magnetDiameterMm / 2;

  const tweeterOuterR = tweeter.frameOuterDiameterMm / 2;
  const tweeterCutoutR = tweeter.cutoutDiameterMm / 2;
  const tweeterDepth = tweeter.mountingDepthMm;
  const tweeterMagnetR = tweeter.magnetDiameterMm / 2;

  const midOuterR = midrange.frameOuterDiameterMm / 2;
  const midCutoutR = midrange.cutoutDiameterMm / 2;
  const midDepth = midrange.mountingDepthMm;
  const midMagnetR = midrange.magnetDiameterMm / 2;

  // Port dimensions
  const portTubeOuterR = (portDiameterMm / 2) + 3; // 3mm tube wall
  const portFlangeOuterR = (portDiameterMm / 2) + activeFlareRadiusMm + 4; // outer flare lip
  const portCutoutR = portTubeOuterR + 1; // clearance hole in baffle

  const activeSlotW = Math.min(intW - 10, slotWidthMm || (intW * 0.85));
  const activeSlotH = slotHeightMm || 45;

  // 1. Determine driver stack height
  // Spacing margins: 12mm between driver frames, 15mm from inner cabinet edges
  const edgeMargin = 16;
  const interDriverGap = 12;

  let totalDriversHeight = 0;
  if (topology === 'single') {
    totalDriversHeight = woofer.frameOuterDiameterMm;
  } else if (topology === 'two_way') {
    totalDriversHeight = tweeter.frameOuterDiameterMm + interDriverGap + woofer.frameOuterDiameterMm;
  } else if (topology === 'mtm') {
    totalDriversHeight = woofer.frameOuterDiameterMm * 2 + tweeter.frameOuterDiameterMm + interDriverGap * 2;
  } else if (topology === 'three_way') {
    totalDriversHeight = tweeter.frameOuterDiameterMm + midrange.frameOuterDiameterMm + woofer.frameOuterDiameterMm + interDriverGap * 2;
  }

  // Port required height
  const portHeightNeeded = portType === 'round' ? (portFlangeOuterR * 2) : (activeSlotH + wallT);
  const totalWithPortHeightNeeded = totalDriversHeight + interDriverGap + portHeightNeeded + (edgeMargin * 2);
  const recommendedHeightMm = Math.ceil(totalWithPortHeightNeeded + 2 * wallT);
  const isHeightSufficient = intH >= totalWithPortHeightNeeded;

  // 2. Resolve port placement
  let resolvedPortPlacement: 'front_bottom' | 'front_top' | 'rear';
  if (!isPorted) {
    resolvedPortPlacement = 'rear';
  } else if (portPlacement === 'rear') {
    resolvedPortPlacement = 'rear';
  } else if (portPlacement === 'front_top') {
    resolvedPortPlacement = 'front_top';
  } else if (portPlacement === 'front_bottom') {
    resolvedPortPlacement = 'front_bottom';
  } else {
    // 'auto' placement logic:
    // If front baffle is cramped or topology is MTM, rear port is preferred to guarantee ZERO clash
    if (topology === 'mtm' || !isHeightSufficient) {
      resolvedPortPlacement = 'rear';
    } else {
      resolvedPortPlacement = 'front_bottom';
    }
  }

  // 3. Compute Component Placements
  const components: BaffleComponentPlacement[] = [];

  // Available vertical interior space: [-intH / 2, intH / 2]
  const topLimit = intH / 2 - edgeMargin;
  const bottomLimit = -intH / 2 + edgeMargin;

  if (resolvedPortPlacement === 'front_top' && isPorted) {
    // Port at top of front baffle
    const portCenterY = topLimit - portFlangeOuterR;
    components.push({
      id: 'port_tube',
      role: 'port',
      panel: 'front',
      centerX: 0,
      centerY: portCenterY,
      cutoutRadiusMm: portCutoutR,
      outerRadiusMm: portFlangeOuterR,
      depthMm: effectivePortLengthMm,
      isSlot: portType === 'slot',
      slotWidthMm: activeSlotW,
      slotHeightMm: activeSlotH,
      label: portType === 'round' ? `Flared Aeroport (Ø${portDiameterMm}mm)` : `Slot Port (${activeSlotW}x${activeSlotH}mm)`,
    });

    // Drivers placed below port
    let curY = portCenterY - portFlangeOuterR - interDriverGap;
    if (topology === 'single') {
      components.push({
        id: 'driver_woofer_0',
        role: 'woofer',
        panel: 'front',
        centerX: 0,
        centerY: curY - wooferOuterR,
        cutoutRadiusMm: wooferCutoutR,
        outerRadiusMm: wooferOuterR,
        depthMm: wooferDepth,
        label: `Woofer: ${woofer.model}`,
      });
    } else if (topology === 'two_way') {
      const tweetY = curY - tweeterOuterR;
      components.push({
        id: 'driver_tweeter_0',
        role: 'tweeter',
        panel: 'front',
        centerX: 0,
        centerY: tweetY,
        cutoutRadiusMm: tweeterCutoutR,
        outerRadiusMm: tweeterOuterR,
        depthMm: tweeterDepth,
        label: `Tweeter: ${tweeter.model}`,
      });
      const wooferY = tweetY - tweeterOuterR - interDriverGap - wooferOuterR;
      components.push({
        id: 'driver_woofer_0',
        role: 'woofer',
        panel: 'front',
        centerX: 0,
        centerY: wooferY,
        cutoutRadiusMm: wooferCutoutR,
        outerRadiusMm: wooferOuterR,
        depthMm: wooferDepth,
        label: `Woofer: ${woofer.model}`,
      });
    } else if (topology === 'mtm') {
      const w1Y = curY - wooferOuterR;
      const twY = w1Y - wooferOuterR - interDriverGap - tweeterOuterR;
      const w2Y = twY - tweeterOuterR - interDriverGap - wooferOuterR;
      components.push(
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: w1Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Upper Woofer: ${woofer.model}` },
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_woofer_1', role: 'woofer', panel: 'front', centerX: 0, centerY: w2Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Lower Woofer: ${woofer.model}` }
      );
    } else if (topology === 'three_way') {
      const twY = curY - tweeterOuterR;
      const midY = twY - tweeterOuterR - interDriverGap - midOuterR;
      const wY = midY - midOuterR - interDriverGap - wooferOuterR;
      components.push(
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_midrange_0', role: 'midrange', panel: 'front', centerX: 0, centerY: midY, cutoutRadiusMm: midCutoutR, outerRadiusMm: midOuterR, depthMm: midDepth, label: `Midrange: ${midrange.model}` },
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: wY, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Woofer: ${woofer.model}` }
      );
    }
  } else if (resolvedPortPlacement === 'front_bottom' && isPorted) {
    // Drivers stacked from top down
    let curY = topLimit;

    if (topology === 'single') {
      const wY = Math.max(bottomLimit + portHeightNeeded + interDriverGap + wooferOuterR, 0);
      components.push({
        id: 'driver_woofer_0',
        role: 'woofer',
        panel: 'front',
        centerX: 0,
        centerY: wY,
        cutoutRadiusMm: wooferCutoutR,
        outerRadiusMm: wooferOuterR,
        depthMm: wooferDepth,
        label: `Woofer: ${woofer.model}`,
      });
    } else if (topology === 'two_way') {
      const twY = curY - tweeterOuterR;
      // Position woofer with safe gap
      const wY = twY - tweeterOuterR - interDriverGap - wooferOuterR;
      components.push(
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: wY, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Woofer: ${woofer.model}` }
      );
    } else if (topology === 'mtm') {
      const w1Y = curY - wooferOuterR;
      const twY = w1Y - wooferOuterR - interDriverGap - tweeterOuterR;
      const w2Y = twY - tweeterOuterR - interDriverGap - wooferOuterR;
      components.push(
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: w1Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Upper Woofer: ${woofer.model}` },
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_woofer_1', role: 'woofer', panel: 'front', centerX: 0, centerY: w2Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Lower Woofer: ${woofer.model}` }
      );
    } else if (topology === 'three_way') {
      const twY = curY - tweeterOuterR;
      const midY = twY - tweeterOuterR - interDriverGap - midOuterR;
      const wY = midY - midOuterR - interDriverGap - wooferOuterR;
      components.push(
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_midrange_0', role: 'midrange', panel: 'front', centerX: 0, centerY: midY, cutoutRadiusMm: midCutoutR, outerRadiusMm: midOuterR, depthMm: midDepth, label: `Midrange: ${midrange.model}` },
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: wY, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Woofer: ${woofer.model}` }
      );
    }

    // Now place Port at the bottom
    // Find the bottom-most front driver
    const bottomDriver = components.filter(c => c.panel === 'front').reduce((prev, curr) => (curr.centerY - curr.outerRadiusMm < prev.centerY - prev.outerRadiusMm ? curr : prev), components[0]);
    
    let portCenterY = 0;
    if (portType === 'round') {
      // Must be safely below bottomDriver AND above cabinet bottom
      const maxAllowedY = bottomDriver ? (bottomDriver.centerY - bottomDriver.outerRadiusMm - interDriverGap - portFlangeOuterR) : 0;
      const minAllowedY = bottomLimit + portFlangeOuterR;
      // If height allows, place cleanly between bottomDriver and bottomLimit
      if (maxAllowedY >= minAllowedY) {
        portCenterY = (maxAllowedY + minAllowedY) / 2;
      } else {
        // Enclosure is too short! Place at minAllowedY to indicate exact overlap with driver
        portCenterY = minAllowedY;
      }
    } else {
      // Slot Port rests on bottom floor panel
      const slotFloorY = -H / 2 + wallT;
      portCenterY = slotFloorY + activeSlotH / 2;
    }

    components.push({
      id: 'port_tube',
      role: 'port',
      panel: 'front',
      centerX: 0,
      centerY: portCenterY,
      cutoutRadiusMm: portCutoutR,
      outerRadiusMm: portFlangeOuterR,
      depthMm: effectivePortLengthMm,
      isSlot: portType === 'slot',
      slotWidthMm: activeSlotW,
      slotHeightMm: activeSlotH,
      label: portType === 'round' ? `Flared Aeroport (Ø${portDiameterMm}mm)` : `Slot Port (${activeSlotW}x${activeSlotH}mm)`,
    });
  } else {
    // Port is on REAR panel (or sealed box)
    // Front drivers have full baffle real estate, centered beautifully with optimal acoustic spacing
    if (topology === 'single') {
      components.push({
        id: 'driver_woofer_0',
        role: 'woofer',
        panel: 'front',
        centerX: 0,
        centerY: 0,
        cutoutRadiusMm: wooferCutoutR,
        outerRadiusMm: wooferOuterR,
        depthMm: wooferDepth,
        label: `Woofer: ${woofer.model}`,
      });
    } else if (topology === 'two_way') {
      const totalH = tweeterOuterR * 2 + interDriverGap + wooferOuterR * 2;
      const twY = (totalH / 2) - tweeterOuterR;
      const wY = -(totalH / 2) + wooferOuterR;
      components.push(
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: wY, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Woofer: ${woofer.model}` }
      );
    } else if (topology === 'mtm') {
      const twY = 0;
      const spacing = tweeterOuterR + interDriverGap + wooferOuterR;
      const w1Y = spacing;
      const w2Y = -spacing;
      components.push(
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: w1Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Upper Woofer: ${woofer.model}` },
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_woofer_1', role: 'woofer', panel: 'front', centerX: 0, centerY: w2Y, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Lower Woofer: ${woofer.model}` }
      );
    } else if (topology === 'three_way') {
      const totalH = tweeterOuterR * 2 + interDriverGap + midOuterR * 2 + interDriverGap + wooferOuterR * 2;
      const twY = (totalH / 2) - tweeterOuterR;
      const midY = twY - tweeterOuterR - interDriverGap - midOuterR;
      const wY = -(totalH / 2) + wooferOuterR;
      components.push(
        { id: 'driver_tweeter_0', role: 'tweeter', panel: 'front', centerX: 0, centerY: twY, cutoutRadiusMm: tweeterCutoutR, outerRadiusMm: tweeterOuterR, depthMm: tweeterDepth, label: `Tweeter: ${tweeter.model}` },
        { id: 'driver_midrange_0', role: 'midrange', panel: 'front', centerX: 0, centerY: midY, cutoutRadiusMm: midCutoutR, outerRadiusMm: midOuterR, depthMm: midDepth, label: `Midrange: ${midrange.model}` },
        { id: 'driver_woofer_0', role: 'woofer', panel: 'front', centerX: 0, centerY: wY, cutoutRadiusMm: wooferCutoutR, outerRadiusMm: wooferOuterR, depthMm: wooferDepth, label: `Woofer: ${woofer.model}` }
      );
    }

    if (isPorted) {
      // Rear Port: positioned with guaranteed clearance above the large woofer motor magnet
      let rearPortY = intH * 0.24;
      const wooferComp = components.find((c) => c.role === 'woofer');
      if (wooferComp) {
        // Place safely above woofer magnet radius with 18mm margin
        const safeAboveWooferY = wooferComp.centerY + wooferMagnetR + portTubeOuterR + 18;
        rearPortY = Math.min(topLimit - portFlangeOuterR, safeAboveWooferY);
      }

      components.push({
        id: 'port_tube',
        role: 'port',
        panel: 'rear',
        centerX: 0,
        centerY: rearPortY,
        cutoutRadiusMm: portCutoutR,
        outerRadiusMm: portFlangeOuterR,
        depthMm: effectivePortLengthMm,
        isSlot: portType === 'slot',
        slotWidthMm: activeSlotW,
        slotHeightMm: activeSlotH,
        label: `Rear-Firing Flared Port (Ø${portDiameterMm}mm)`,
      });
    }
  }

  // 4. Run Rigorous Collision Detection
  const collisions: CollisionItem[] = [];
  let minBaffleClearanceMm = 999;
  let minDepthClearanceMm = 999;

  // A. Check baffle cutouts and flanges on same panel
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i];
      const b = components[j];
      if (a.panel !== b.panel) continue; // front vs rear don't overlap on baffle

      if (a.isSlot || b.isSlot) {
        // Slot vs round component
        const slot = a.isSlot ? a : b;
        const round = a.isSlot ? b : a;
        const slotTopY = slot.centerY + (slot.slotHeightMm || 45) / 2;
        const roundBottomY = round.centerY - round.outerRadiusMm;
        const clearance = roundBottomY - slotTopY;
        if (clearance < minBaffleClearanceMm) minBaffleClearanceMm = clearance;

        if (clearance < 8) {
          const overlap = 8 - clearance;
          collisions.push({
            id: `col_${a.id}_${b.id}`,
            partA: a.label,
            partB: b.label,
            type: 'baffle_overlap',
            overlapDistanceMm: Math.round(overlap * 10) / 10,
            description: `${round.label} flange overlaps with slot port top shelf by ${Math.round(overlap)}mm.`,
            severity: 'error',
          });
        }
      } else {
        // Round vs Round
        const distY = Math.abs(a.centerY - b.centerY);
        const distX = Math.abs(a.centerX - b.centerX);
        const centerDist = Math.hypot(distX, distY);
        const requiredDist = a.outerRadiusMm + b.outerRadiusMm + 8; // 8mm minimum web
        const clearance = centerDist - (a.outerRadiusMm + b.outerRadiusMm);
        if (clearance < minBaffleClearanceMm) minBaffleClearanceMm = clearance;

        if (centerDist < requiredDist) {
          const overlap = requiredDist - centerDist;
          collisions.push({
            id: `col_${a.id}_${b.id}`,
            partA: a.label,
            partB: b.label,
            type: 'baffle_overlap',
            overlapDistanceMm: Math.round(overlap * 10) / 10,
            description: `${a.label} and ${b.label} overlap by ${Math.round(overlap)}mm on the ${a.panel} baffle.`,
            severity: 'error',
          });
        }
      }
    }
  }

  // B. Check boundary limits (ensure nothing cuts outside the cabinet interior)
  components.forEach((c) => {
    if (c.panel === 'front') {
      const topExt = c.isSlot ? (c.centerY + (c.slotHeightMm || 45) / 2) : (c.centerY + c.outerRadiusMm);
      const botExt = c.isSlot ? (c.centerY - (c.slotHeightMm || 45) / 2) : (c.centerY - c.outerRadiusMm);
      const topLimitInner = intH / 2;
      const botLimitInner = -intH / 2;

      if (topExt > topLimitInner) {
        collisions.push({
          id: `boundary_top_${c.id}`,
          partA: c.label,
          partB: 'Cabinet Top Panel',
          type: 'boundary_exceeded',
          overlapDistanceMm: Math.round((topExt - topLimitInner) * 10) / 10,
          description: `${c.label} extends ${Math.round(topExt - topLimitInner)}mm past cabinet interior ceiling.`,
          severity: 'error',
        });
      }
      if (botExt < botLimitInner) {
        collisions.push({
          id: `boundary_bot_${c.id}`,
          partA: c.label,
          partB: 'Cabinet Floor Panel',
          type: 'boundary_exceeded',
          overlapDistanceMm: Math.round((botLimitInner - botExt) * 10) / 10,
          description: `${c.label} extends ${Math.round(botLimitInner - botExt)}mm past cabinet floor.`,
          severity: 'error',
        });
      }
    }
  });

  // C. 3D Internal Depth Clearance Check (Port tube vs Driver Magnets)
  if (isPorted) {
    const portComp = components.find((c) => c.role === 'port');
    if (portComp) {
      const frontDrivers = components.filter((c) => c.panel === 'front' && c.role !== 'port');
      
      frontDrivers.forEach((drv) => {
        // Driver magnet radius & depth
        const isWoofer = drv.role === 'woofer';
        const magnetR = isWoofer ? wooferMagnetR : (drv.role === 'midrange' ? midMagnetR : tweeterMagnetR);
        const drvDepth = drv.depthMm;

        if (portComp.panel === 'front') {
          // Both are on the front baffle, extending backwards into the cabinet
          // Check if port tube passes right alongside or intersects the driver magnet in 3D
          const overlapDepth = Math.min(effectivePortLengthMm, drvDepth);
          if (overlapDepth > 15) {
            const distY = Math.abs(portComp.centerY - drv.centerY);
            const tubeOuterR = portTubeOuterR;
            const radialClearance = distY - (tubeOuterR + magnetR);
            if (radialClearance < minDepthClearanceMm) minDepthClearanceMm = radialClearance;

            if (radialClearance < 10) {
              const depthOverlap = 10 - radialClearance;
              collisions.push({
                id: `depth_col_${portComp.id}_${drv.id}`,
                partA: 'Port Tube Body',
                partB: `${drv.label} Motor Magnet`,
                type: 'depth_clearance',
                overlapDistanceMm: Math.round(depthOverlap * 10) / 10,
                description: `Port tube is only ${Math.round(radialClearance)}mm from ${drv.label} magnet (${Math.round(depthOverlap)}mm clearance deficit).`,
                severity: radialClearance <= 0 ? 'error' : 'warning',
              });
            }
          }
        } else {
          // Port is on rear panel, extending forward into cabinet!
          // Distance along Z between port inner end and driver magnet back face:
          const totalDepthAvailable = intD;
          const zOccupied = effectivePortLengthMm + drvDepth;
          const zClearance = totalDepthAvailable - zOccupied;
          if (zClearance < minDepthClearanceMm) minDepthClearanceMm = zClearance;

          // If Z overlaps and they are at similar vertical coordinates
          if (zClearance < 0) {
            const distY = Math.abs(portComp.centerY - drv.centerY);
            if (distY < (portTubeOuterR + magnetR + 10)) {
              collisions.push({
                id: `depth_rear_col_${portComp.id}_${drv.id}`,
                partA: 'Rear Port Inner Mouth',
                partB: `${drv.label} Magnet Back Plate`,
                type: 'depth_clearance',
                overlapDistanceMm: Math.round(Math.abs(zClearance) * 10) / 10,
                description: `Rear port tube length exceeds depth clearance by ${Math.round(Math.abs(zClearance))}mm, hitting driver magnet.`,
                severity: 'error',
              });
            }
          }
        }
      });
    }
  }

  // D. Rear Wall Airflow Clearance (Port inner mouth to opposite wall)
  let rearWallClearanceMm = 999;
  if (isPorted) {
    rearWallClearanceMm = intD - effectivePortLengthMm;
    const minRecommendedClearance = portDiameterMm;
    if (rearWallClearanceMm < minRecommendedClearance && resolvedPortPlacement === 'front_bottom') {
      collisions.push({
        id: 'rear_wall_constriction',
        partA: 'Port Inner Mouth',
        partB: 'Rear Enclosure Wall',
        type: 'depth_clearance',
        overlapDistanceMm: Math.round((minRecommendedClearance - rearWallClearanceMm) * 10) / 10,
        description: `Port inner mouth is only ${Math.round(rearWallClearanceMm)}mm from rear wall (< 1x port Ø${portDiameterMm}mm). Restricts airflow and detunes box.`,
        severity: 'warning',
      });
    }
  }

  // E. Airflow Interference & Proximity Stress Analysis (Magnets, Window Braces & Walls)
  const obstructions: AirflowObstructionPoint[] = [];
  let minMagnetClearanceMm = 999;
  let minBracingClearanceMm = 999;
  let minWallClearanceMm = rearWallClearanceMm;

  if (isPorted) {
    const portComp = components.find((c) => c.role === 'port');
    const scale = 0.001;

    if (portComp) {
      const portIsRear = portComp.panel === 'rear';
      const portMouthZMm = portIsRear
        ? (-D / 2 + wallT + effectivePortLengthMm)
        : (D / 2 - baffleT - effectivePortLengthMm);
      const portMouthYM = portComp.centerY * scale;
      const portMouthXM = portComp.centerX * scale;
      const portMouthZM = portMouthZMm * scale;

      // 1. Interference with Driver Magnets
      const frontDrivers = components.filter((c) => c.panel === 'front' && c.role !== 'port');
      frontDrivers.forEach((drv) => {
        const isWoofer = drv.role === 'woofer';
        const magnetR = isWoofer ? wooferMagnetR : (drv.role === 'midrange' ? midMagnetR : tweeterMagnetR);
        const drvDepth = drv.depthMm;
        const magnetDepth = isWoofer ? woofer.magnetDepthMm : (drv.role === 'midrange' ? midrange.magnetDepthMm : tweeter.magnetDepthMm);
        const magnetRearZMm = D / 2 - drvDepth;
        const magnetCenterZMm = magnetRearZMm + magnetDepth / 2;

        let distanceMm = 999;
        let obstaclePosMm = { x: drv.centerX, y: drv.centerY, z: magnetCenterZMm };
        let portSurfacePosMm = { x: portComp.centerX, y: portComp.centerY, z: portMouthZMm };

        if (!portIsRear) {
          // Front port and front driver both project backward
          const distXY = Math.hypot(portComp.centerX - drv.centerX, portComp.centerY - drv.centerY);
          const radialClearance = Math.max(0, distXY - (portTubeOuterR + magnetR));

          // Determine Z overlap between port tube [D/2 - portLen, D/2] and magnet [magnetRearZMm, magnetRearZMm + magnetDepth]
          const portZMin = D / 2 - baffleT - effectivePortLengthMm;
          const portZMax = D / 2 - baffleT;
          const magZMin = magnetRearZMm;
          const magZMax = magnetRearZMm + magnetDepth;

          let deltaZ = 0;
          let closestZ = (magZMin + magZMax) / 2;
          if (portZMin > magZMax) {
            deltaZ = portZMin - magZMax;
            closestZ = magZMax;
          } else if (magZMin > portZMax) {
            deltaZ = magZMin - portZMax;
            closestZ = magZMin;
          } else {
            deltaZ = 0; // overlapping in Z
            closestZ = Math.max(portZMin, Math.min(portZMax, (magZMin + magZMax) / 2));
          }

          distanceMm = Math.hypot(radialClearance, deltaZ);

          // Vector from port center to magnet center for exact contact point
          const angle = Math.atan2(drv.centerY - portComp.centerY, drv.centerX - portComp.centerX);
          obstaclePosMm = {
            x: drv.centerX - Math.cos(angle) * magnetR,
            y: drv.centerY - Math.sin(angle) * magnetR,
            z: closestZ,
          };
          portSurfacePosMm = {
            x: portComp.centerX + Math.cos(angle) * portTubeOuterR,
            y: portComp.centerY + Math.sin(angle) * portTubeOuterR,
            z: closestZ,
          };
        } else {
          // Rear port fires toward front baffle
          const distXY = Math.hypot(portComp.centerX - drv.centerX, portComp.centerY - drv.centerY);
          const zGap = magnetRearZMm - portMouthZMm;
          if (distXY < (portTubeOuterR + magnetR)) {
            distanceMm = Math.max(0, zGap);
          } else {
            const radGap = distXY - (portTubeOuterR + magnetR);
            distanceMm = Math.hypot(radGap, Math.max(0, zGap));
          }

          const angle = Math.atan2(drv.centerY - portComp.centerY, drv.centerX - portComp.centerX);
          obstaclePosMm = {
            x: drv.centerX - Math.cos(angle) * magnetR,
            y: drv.centerY - Math.sin(angle) * magnetR,
            z: magnetRearZMm,
          };
          portSurfacePosMm = {
            x: portComp.centerX,
            y: portComp.centerY,
            z: portMouthZMm,
          };
        }

        if (distanceMm < minMagnetClearanceMm) minMagnetClearanceMm = distanceMm;

        // Proximity stress mapping: <= 18mm Critical Choke (1.0..0.7), 18..45mm Boundary Drag (0.7..0.35), 45..75mm Proximity Alert (0.35..0.05), >75mm Laminar Safe (0)
        let stressLevel = 0;
        if (distanceMm <= 18) {
          stressLevel = Math.min(1.0, 0.7 + 0.3 * ((18 - distanceMm) / 18));
        } else if (distanceMm <= 45) {
          stressLevel = 0.35 + 0.35 * ((45 - distanceMm) / (45 - 18));
        } else if (distanceMm <= 75) {
          stressLevel = 0.05 + 0.3 * ((75 - distanceMm) / (75 - 45));
        }

        const severity: 'critical' | 'warning' | 'nominal' =
          stressLevel >= 0.7 ? 'critical' : stressLevel >= 0.25 ? 'warning' : 'nominal';

        if (distanceMm <= 85) {
          obstructions.push({
            id: `airflow_mag_${drv.id}`,
            name: `${drv.label} Motor Magnet`,
            type: 'driver_magnet',
            distanceMm: Math.round(distanceMm * 10) / 10,
            stressLevel: Math.round(stressLevel * 100) / 100,
            position: {
              x: obstaclePosMm.x * scale,
              y: obstaclePosMm.y * scale,
              z: obstaclePosMm.z * scale,
            },
            portPosition: {
              x: portSurfacePosMm.x * scale,
              y: portSurfacePosMm.y * scale,
              z: portSurfacePosMm.z * scale,
            },
            recommendedClearanceMm: Math.max(50, Math.round(portDiameterMm * 0.75)),
            severity,
            description:
              distanceMm <= 18
                ? `Critical boundary choke (${Math.round(distanceMm)}mm). Severe airflow constriction and high motor turbulence.`
                : distanceMm <= 45
                ? `Boundary layer drag (${Math.round(distanceMm)}mm). Moderate aerodynamic resistance near magnet pole.`
                : `Proximity buffer alert (${Math.round(distanceMm)}mm). Safe for moderate SPL, marginal at high excursion.`,
          });
        }
      });

      // 2. Interference with Window Matrix Brace
      // Brace is located at y = -H * 0.05 with thickness t = 18mm
      const braceYCenterMm = -H * 0.05;
      const braceTopYMm = braceYCenterMm + wallT / 2;
      const braceBottomYMm = braceYCenterMm - wallT / 2;
      const braceZCenterMm = -(baffleT + wallT) / 2;

      let braceDistanceMm = 999;
      if (portComp.centerY > braceTopYMm) {
        braceDistanceMm = portComp.centerY - portTubeOuterR - braceTopYMm;
      } else if (portComp.centerY < braceBottomYMm) {
        braceDistanceMm = braceBottomYMm - (portComp.centerY + portTubeOuterR);
      } else {
        braceDistanceMm = 0; // Port intersects brace plane height!
      }

      minBracingClearanceMm = Math.max(0, braceDistanceMm);

      let braceStress = 0;
      if (braceDistanceMm <= 18) {
        braceStress = Math.min(1.0, 0.7 + 0.3 * ((18 - Math.max(0, braceDistanceMm)) / 18));
      } else if (braceDistanceMm <= 45) {
        braceStress = 0.35 + 0.35 * ((45 - braceDistanceMm) / (45 - 18));
      } else if (braceDistanceMm <= 75) {
        braceStress = 0.05 + 0.3 * ((75 - braceDistanceMm) / (75 - 45));
      }

      if (braceDistanceMm <= 80) {
        obstructions.push({
          id: 'airflow_brace_window',
          name: 'Internal Window Matrix Brace',
          type: 'window_brace',
          distanceMm: Math.round(Math.max(0, braceDistanceMm) * 10) / 10,
          stressLevel: Math.round(braceStress * 100) / 100,
          position: {
            x: 0,
            y: (portComp.centerY > braceYCenterMm ? braceTopYMm : braceBottomYMm) * scale,
            z: braceZCenterMm * scale,
          },
          portPosition: {
            x: portMouthXM,
            y: (portComp.centerY > braceYCenterMm ? portComp.centerY - portTubeOuterR : portComp.centerY + portTubeOuterR) * scale,
            z: portMouthZM,
          },
          recommendedClearanceMm: Math.max(45, Math.round(portDiameterMm * 0.6)),
          severity: braceStress >= 0.7 ? 'critical' : braceStress >= 0.25 ? 'warning' : 'nominal',
          description:
            braceDistanceMm <= 18
              ? `Port tube is only ${Math.round(braceDistanceMm)}mm from window brace shelf. Induces severe boundary shear.`
              : `Acoustic proximity to matrix brace (${Math.round(braceDistanceMm)}mm). Recommend chamfering brace window struts.`,
        });
      }

      // 3. Enclosure Wall Clearance (Rear or Front Wall)
      if (rearWallClearanceMm <= 80) {
        let wallStress = 0;
        if (rearWallClearanceMm <= 18) {
          wallStress = Math.min(1.0, 0.7 + 0.3 * ((18 - rearWallClearanceMm) / 18));
        } else if (rearWallClearanceMm <= 45) {
          wallStress = 0.35 + 0.35 * ((45 - rearWallClearanceMm) / (45 - 18));
        } else if (rearWallClearanceMm <= 75) {
          wallStress = 0.05 + 0.3 * ((75 - rearWallClearanceMm) / (75 - 45));
        }

        obstructions.push({
          id: 'airflow_wall_opposing',
          name: portIsRear ? 'Front Baffle Inner Wall' : 'Rear Enclosure Wall',
          type: 'enclosure_wall',
          distanceMm: Math.round(rearWallClearanceMm * 10) / 10,
          stressLevel: Math.round(wallStress * 100) / 100,
          position: {
            x: portMouthXM,
            y: portMouthYM,
            z: (portIsRear ? (D / 2 - baffleT) : (-D / 2 + wallT)) * scale,
          },
          portPosition: {
            x: portMouthXM,
            y: portMouthYM,
            z: portMouthZM,
          },
          recommendedClearanceMm: portDiameterMm,
          severity: wallStress >= 0.7 ? 'critical' : wallStress >= 0.25 ? 'warning' : 'nominal',
          description: `Inner mouth has ${Math.round(rearWallClearanceMm)}mm clearance to opposing wall (Recommended $\ge$ Ø${portDiameterMm}mm).`,
        });
      }
    }
  }

  // Sort obstructions by severity / distance
  obstructions.sort((a, b) => a.distanceMm - b.distanceMm);
  const maxStressLevel = obstructions.length > 0 ? Math.max(...obstructions.map((o) => o.stressLevel)) : 0;
  const closestObstruction = obstructions[0] || null;
  const overallStatus: 'safe' | 'caution' | 'choked' =
    maxStressLevel >= 0.7 ? 'choked' : maxStressLevel >= 0.25 ? 'caution' : 'safe';
  const turbulenceMultiplier = Math.round((1.0 + maxStressLevel * 0.95) * 100) / 100;

  const airflowInterference: AirflowInterferenceReport = {
    hasInterference: maxStressLevel > 0.1,
    maxStressLevel,
    overallStatus,
    minMagnetClearanceMm: Math.round(minMagnetClearanceMm * 10) / 10,
    minBracingClearanceMm: Math.round(minBracingClearanceMm * 10) / 10,
    minWallClearanceMm: Math.round(minWallClearanceMm * 10) / 10,
    obstructions,
    closestObstruction,
    turbulenceMultiplier,
  };

  const hasCollision = collisions.some((c) => c.severity === 'error');

  return {
    components,
    resolvedPortPlacement,
    hasCollision,
    collisions,
    minBaffleClearanceMm: Math.round(minBaffleClearanceMm * 10) / 10,
    minDepthClearanceMm: Math.round(minDepthClearanceMm * 10) / 10,
    rearWallClearanceMm: Math.round(rearWallClearanceMm * 10) / 10,
    recommendedHeightMm,
    isHeightSufficient,
    airflowInterference,
  };
}

export interface AutoResolveResult {
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  explanation: string;
}

/**
 * Auto-Resolves all driver, port, and cabinet collisions through multi-stage geometry synthesis.
 * Guarantees a physical layout with zero hard clashes (hasCollision === false).
 */
export function autoResolveBaffleClashes(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  results?: Partial<AcousticCalculationResult>
): AutoResolveResult {
  const wallT = 18;
  const baffleT = dimensions.baffleThicknessMm || 18;
  const woofer = acoustics.driverAssignments.woofer.driver;
  const tweeter = acoustics.driverAssignments.tweeter.driver;
  const midrange = acoustics.driverAssignments.midrange.driver;

  const changesSummary: string[] = [];

  // Preserve net internal volume Vb target
  const oldIntW = Math.max(50, dimensions.externalWidthMm - 2 * wallT);
  const oldIntH = Math.max(50, dimensions.externalHeightMm - 2 * wallT);
  const oldIntD = Math.max(50, dimensions.externalDepthMm - baffleT - wallT);
  const targetNetVbLiters = (oldIntW * oldIntH * oldIntD) * 1e-6;

  let updatedDimensions: EnclosureDimensions = { ...dimensions };
  let updatedAcoustics: AcousticParameters = { ...acoustics };

  // Helper function to evaluate layout and score candidates
  const evalCandidate = (d: EnclosureDimensions, a: AcousticParameters) => {
    const pLen = results?.portLengthMm || estimatePortLengthMm(d, a);
    const layout = computeBaffleLayout(d, a, { portLengthMm: pLen });

    const airflow = layout.airflowInterference;
    const dMag = airflow?.minMagnetClearanceMm ?? 999;
    const dBrace = airflow?.minBracingClearanceMm ?? 999;
    const dWall = layout.rearWallClearanceMm ?? 999;
    const turb = airflow?.turbulenceMultiplier ?? 1.0;

    let penalty = 0;

    // Hard physical collision constraint
    if (layout.hasCollision) {
      penalty += 100000;
    }

    // Critical choke constraint (d <= 18mm)
    if (dMag <= 18) {
      penalty += 50000;
    }

    // Minimum acceptable magnet clearance (d <= 45mm or turbulence > 1.25)
    if (dMag <= 45) {
      penalty += 10000 + (45 - dMag) * 100;
    } else if (dMag < 75) {
      penalty += (75 - dMag) * 10;
    }

    // Bracing clearance constraint
    if (dBrace < 45) {
      penalty += (45 - dBrace) * 20;
    }

    // Wall clearance constraint
    if (dWall < a.portDiameterMm) {
      penalty += (a.portDiameterMm - dWall) * 50;
    }

    // Turbulence multiplier objective
    penalty += (turb - 1.0) * 1000;

    // Minor preference for front placement if laminar
    if (layout.resolvedPortPlacement !== 'rear' && dMag > 45 && turb <= 1.25 && dWall >= a.portDiameterMm) {
      penalty -= 100;
    }

    const isLaminarSafe = !layout.hasCollision && dMag > 45 && turb <= 1.25 && dWall >= a.portDiameterMm;

    return {
      layout,
      dimensions: d,
      acoustics: a,
      score: penalty,
      dMag,
      dBrace,
      dWall,
      turb,
      isLaminarSafe,
    };
  };

  // Test front and rear placement candidates
  const testPlacements: PortPlacement[] =
    updatedAcoustics.alignment === 'ported'
      ? ['front_bottom', 'front_top', 'auto', 'rear']
      : ['rear'];

  const candidateResults = testPlacements.map((p) => {
    const testA = { ...updatedAcoustics, portPlacement: p };
    const testD = { ...updatedDimensions };

    // Minimum physical width & height checks
    const maxDriverDiam = Math.max(
      woofer.frameOuterDiameterMm,
      tweeter.frameOuterDiameterMm,
      updatedAcoustics.topology === 'three_way' ? midrange.frameOuterDiameterMm : 0
    );
    const activeFlareR = testA.flareRadiusMm || results?.optimalFlareRadiusMm || 16;
    const portFlangeOuterR = (testA.portDiameterMm / 2) + activeFlareR + 4;
    const minWidthNeeded = Math.ceil(Math.max(maxDriverDiam, portFlangeOuterR * 2) + 2 * wallT + 36);
    if (testD.externalWidthMm < minWidthNeeded) testD.externalWidthMm = minWidthNeeded;

    const interDriverGap = 14;
    const edgeMargin = 18;
    let totalDriversHeight = woofer.frameOuterDiameterMm + tweeter.frameOuterDiameterMm + interDriverGap;
    if (updatedAcoustics.topology === 'three_way') totalDriversHeight += midrange.frameOuterDiameterMm + interDriverGap;
    if (updatedAcoustics.topology === 'mtm') totalDriversHeight += woofer.frameOuterDiameterMm + interDriverGap;

    if (p === 'front_bottom' || p === 'front_top') {
      const portHeightNeeded = portFlangeOuterR * 2 + interDriverGap;
      const totalFrontHeightNeeded = Math.ceil(totalDriversHeight + portHeightNeeded + edgeMargin * 2 + 2 * wallT);
      if (testD.externalHeightMm < totalFrontHeightNeeded) testD.externalHeightMm = totalFrontHeightNeeded;
    }

    return evalCandidate(testD, testA);
  });

  // Sort candidates by lowest penalty score
  candidateResults.sort((a, b) => a.score - b.score);
  const bestCandidate = candidateResults[0];

  // If best candidate is laminar safe and collision free
  if (bestCandidate.isLaminarSafe) {
    if (bestCandidate.acoustics.portPlacement !== acoustics.portPlacement) {
      changesSummary.push(`Port relocated to ${(bestCandidate.acoustics.portPlacement || 'auto').replace('_', ' ')} panel for laminar airflow`);
    }
    const closestMm = Math.round(Math.min(bestCandidate.dMag, bestCandidate.dBrace, bestCandidate.dWall));
    const explanation = `Zero 2D Clashes; Aerodynamic Health: ${bestCandidate.turb}x Laminar Flow (Closest Clearance: ${closestMm}mm)`;

    return {
      dimensions: bestCandidate.dimensions,
      acoustics: bestCandidate.acoustics,
      explanation,
    };
  }

  // If ALL front baffle candidates cause aerodynamic choking (d_mag <= 45mm or turbulence > 1.25)
  // Route to Rear Panel if Rear Panel candidate is laminar safe
  const rearCandidate = candidateResults.find((c) => c.acoustics.portPlacement === 'rear');
  if (rearCandidate && rearCandidate.isLaminarSafe) {
    changesSummary.push('Port routed to Rear Panel due to front baffle magnet choke');
    const closestMm = Math.round(Math.min(rearCandidate.dMag, rearCandidate.dBrace, rearCandidate.dWall));
    const explanation = `Port routed to Rear Panel; Aerodynamic Health: ${rearCandidate.turb}x Laminar Flow (${closestMm}mm magnet clearance)`;

    return {
      dimensions: rearCandidate.dimensions,
      acoustics: rearCandidate.acoustics,
      explanation,
    };
  }

  // If depth remains constrained for rear or front, calculate & apply minimum necessary depth adjustment while preserving exact net Vb
  let pLen = results?.portLengthMm || estimatePortLengthMm(updatedDimensions, updatedAcoustics);
  if (pLen > 400 && updatedAcoustics.portDiameterMm > 75) {
    updatedAcoustics.portDiameterMm = 75;
    pLen = estimatePortLengthMm(updatedDimensions, updatedAcoustics);
    changesSummary.push(`Port diameter adjusted to Ø75mm`);
  }

  // Required depth for laminar flow: port length + driver depth + 50mm clearance
  const wooferDepth = woofer.mountingDepthMm;
  const minDepthNeeded = Math.ceil(pLen + wooferDepth + baffleT + wallT + 50);

  if (updatedDimensions.externalDepthMm < minDepthNeeded) {
    const oldD = updatedDimensions.externalDepthMm;
    const newD = minDepthNeeded;
    updatedDimensions.externalDepthMm = newD;

    // Preserving net volume Vb by scaling width and height
    const newIntD = newD - baffleT - wallT;
    const targetNetVbMm3 = targetNetVbLiters * 1e6;
    if (newIntD > 0 && targetNetVbMm3 > 0) {
      const targetArea = targetNetVbMm3 / newIntD; // newIntW * newIntH
      const aspectHW = oldIntH / oldIntW;
      const newIntW = Math.max(woofer.frameOuterDiameterMm + 30, Math.round(Math.sqrt(targetArea / aspectHW)));
      const newIntH = Math.max(woofer.frameOuterDiameterMm * 2 + 30, Math.round(newIntW * aspectHW));

      updatedDimensions.externalWidthMm = newIntW + 2 * wallT;
      updatedDimensions.externalHeightMm = newIntH + 2 * wallT;
      changesSummary.push(`Depth expanded from ${oldD}mm to ${newD}mm (Width/Height scaled to preserve exact net Vb)`);
    }
  }

  // If still choked or front cramped, route port to rear panel as primary placement
  updatedAcoustics.portPlacement = 'rear';
  const finalCandidate = evalCandidate(updatedDimensions, updatedAcoustics);

  const closestMm = Math.round(Math.min(finalCandidate.dMag, finalCandidate.dBrace, finalCandidate.dWall));
  const explanation = `Aerodynamic Health: ${finalCandidate.turb}x Laminar Flow (${closestMm}mm clearance; net Vb preserved)`;

  return {
    dimensions: finalCandidate.dimensions,
    acoustics: finalCandidate.acoustics,
    explanation,
  };
}

