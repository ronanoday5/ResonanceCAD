import type {
  AcousticParameters,
  EnclosureDimensions,
  RearTerminalCategory,
  SpeakerCategory,
  SpeakonBomEntry,
  SpeakonClashItem,
  SpeakonConfig,
  SpeakonConnectorModel,
  SpeakonMountingHoleCoord,
  SpeakonPinAssignment,
  SpeakonReport,
  SpeakonWiringArchitecture,
  StudioTerminalSpec,
} from '../types/loudspeaker.ts';
import { MATERIAL_SPECS } from './acousticEngine.ts';

export const DEFAULT_SPEAKON_CONFIG: Required<SpeakonConfig> = {
  selectionMode: 'auto',
  wiringArchitecture: 'auto',
  dualLinkThru: true,
  recessedDishDepthMm: 18,
};

/**
 * Validates rear-panel terminal connector compatibility according to pro-audio industry standards:
 *
 * 1. Live Sound PA Enclosures (`live_top`, `live_sub`):
 *    - Authorized: Neutrik speakON NL4 (4-Pole D-shape) or NL8 (8-Pole G-shape).
 *    - Prohibited: Standard binding posts or consumer terminals are strictly disallowed for high-power touring PA cabinets.
 *
 * 2. Studio Reference Monitors & Subwoofers (`studio_monitor`, `studio_sub`):
 *    - Authorized:
 *      * Passive Studio Monitors: Standard heavy-duty gold-plated binding posts / recessed terminal cups.
 *      * Active/Powered Studio Monitors: Recessed amplifier plate featuring balanced XLR / 1/4-inch TRS combo jacks and IEC power inlet.
 *    - Prohibitions: speakON NL4 and NL8 twist-lock connectors are strictly prohibited on any studio monitor or studio subwoofer configuration.
 */
export function validateTerminalCompatibility(
  category: SpeakerCategory,
  connectorModel: SpeakonConnectorModel,
  hasPlateAmplifier: boolean = false
): {
  isProhibited: boolean;
  prohibitionWarningText?: string;
  recommendedResolutionModel: SpeakonConnectorModel;
} {
  const isStudio = category === 'studio_monitor' || category === 'studio_sub';
  const isLive = category === 'live_top' || category === 'live_sub';

  if (isStudio) {
    if (connectorModel === 'nl4mp' || connectorModel === 'nlt4mp' || connectorModel === 'nl8mpr') {
      const rec = hasPlateAmplifier ? 'active_plate_xlr' : 'binding_posts_gold';
      return {
        isProhibited: true,
        prohibitionWarningText:
          'Neutrik speakON (NL4 / NL8) twist-lock connectors are strictly prohibited on studio reference monitors and studio subwoofers. Professional studio workflow requires standard heavy-duty gold-plated 5-way binding posts (passive monitors) or recessed balanced XLR / 1/4-inch TRS combo plates (active monitors).',
        recommendedResolutionModel: rec,
      };
    }
  }

  if (isLive) {
    if (connectorModel === 'binding_posts_gold' || connectorModel === 'active_plate_xlr') {
      return {
        isProhibited: true,
        prohibitionWarningText:
          'Standard binding posts or consumer terminal cups are strictly prohibited for high-power touring PA enclosures. Professional live sound reinforcement requires secure Neutrik speakON twist-lock connectors (NL4 or NL8) to prevent accidental stage disconnects and safely handle high RMS currents.',
        recommendedResolutionModel: 'nl4mp',
      };
    }
  }

  return {
    isProhibited: false,
    recommendedResolutionModel: connectorModel,
  };
}

/**
 * Automatically flushes invalid connector assignments when switching between
 * Live PA and Studio Monitor archetypes.
 */
export function flushIncompatibleTerminalConfig(
  newCategory: SpeakerCategory,
  currentConfig?: SpeakonConfig
): SpeakonConfig {
  if (!currentConfig || !currentConfig.selectionMode || currentConfig.selectionMode === 'auto') {
    return {
      ...(currentConfig || {}),
      selectionMode: 'auto',
      wiringArchitecture: 'auto',
    };
  }

  const isStudio = newCategory === 'studio_monitor' || newCategory === 'studio_sub';
  const isLive = newCategory === 'live_top' || newCategory === 'live_sub';
  const currentMode = currentConfig.selectionMode;

  if (isStudio && (currentMode === 'nl4mp' || currentMode === 'nlt4mp' || currentMode === 'nl8mpr')) {
    return {
      ...currentConfig,
      selectionMode: 'auto',
      wiringArchitecture: 'auto',
    };
  }

  if (isLive && (currentMode === 'binding_posts_gold' || currentMode === 'active_plate_xlr')) {
    return {
      ...currentConfig,
      selectionMode: 'auto',
      wiringArchitecture: 'auto',
    };
  }

  return currentConfig;
}

/**
 * Resolves the loudspeaker's electrical architecture and connector selection based on
 * cabinet category and multi-way complexity.
 */
function resolveElectricalArchitecture(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  config: Required<SpeakonConfig>
): {
  resolvedArchitecture: Exclude<SpeakonWiringArchitecture, 'auto'>;
  architectureLabel: string;
  requiredAmplifierChannels: number;
  activeConductorCount: number;
  autoModel: SpeakonConnectorModel;
  selectionReason: string;
  terminalCategory: RearTerminalCategory;
} {
  const topology = acoustics.topology || 'two_way';
  const category = dimensions.category || 'studio_monitor';
  const subcategory = dimensions.subcategory || 'nearfield_2way';
  const wooferDriver = acoustics.driverAssignments.woofer.driver;
  const wooferQty = acoustics.driverAssignments.woofer.quantity || 1;
  const totalPowerW = wooferDriver.pe * wooferQty;
  const isStudio = category === 'studio_monitor' || category === 'studio_sub';

  const hasPlateAmp =
    subcategory === 'active_powered_biamp' ||
    (subcategory as string).includes('active') ||
    (subcategory as string) === 'high_output_active';

  // STUDIO ARCHETYPES: Gold Binding Posts (Passive) or XLR/TRS Combo Plate (Active)
  if (isStudio) {
    if (hasPlateAmp || config.selectionMode === 'active_plate_xlr') {
      return {
        resolvedArchitecture: 'bi_amp_2way',
        architectureLabel: 'Studio Active Bi-Amplified (Balanced XLR / 1/4" TRS Combo Line Input)',
        requiredAmplifierChannels: 2,
        activeConductorCount: 3,
        autoModel: 'active_plate_xlr',
        selectionReason:
          'Active studio reference monitor architecture. Recessed aluminum sub-plate featuring balanced Neutrik XLR / 1/4" TRS combo jacks, volume control, and fused IEC C14 power inlet selected.',
        terminalCategory: 'studio_active_plate',
      };
    }

    return {
      resolvedArchitecture: 'passive_fullrange',
      architectureLabel: 'Studio Passive Reference (Dual Heavy-Duty Gold 5-Way Binding Posts)',
      requiredAmplifierChannels: 1,
      activeConductorCount: 2,
      autoModel: 'binding_posts_gold',
      selectionReason:
        'Passive studio reference monitor standard. Heavy-duty gold-plated 5-way binding posts with 4mm banana plug sockets and solid brass bi-wire jumper bars selected. speakON twist-lock connectors are prohibited.',
      terminalCategory: 'studio_passive_binding_posts',
    };
  }

  // LIVE SOUND PA ARCHETYPES: Neutrik speakON NL4 or NL8
  let resolvedArchitecture: Exclude<SpeakonWiringArchitecture, 'auto'> = 'passive_fullrange';

  if (config.wiringArchitecture !== 'auto') {
    resolvedArchitecture = config.wiringArchitecture;
  } else if (subcategory === 'horn_loaded_array') {
    resolvedArchitecture = 'quad_amp_array';
  } else if (
    topology === 'three_way' &&
    (category === 'live_top' || totalPowerW >= 600)
  ) {
    resolvedArchitecture = 'tri_amp_3way';
  } else if (category === 'live_sub') {
    resolvedArchitecture = 'sub_top_pass';
  } else if (
    category === 'live_top' &&
    (topology === 'two_way' || totalPowerW >= 450)
  ) {
    resolvedArchitecture = 'bi_amp_2way';
  } else {
    resolvedArchitecture = 'passive_fullrange';
  }

  switch (resolvedArchitecture) {
    case 'quad_amp_array':
      return {
        resolvedArchitecture,
        architectureLabel: '4-Way Active Line Array / Multi-Driver Hybrid (LF1 + LF2 + MF + HF)',
        requiredAmplifierChannels: 4,
        activeConductorCount: 8,
        autoModel: 'nl8mpr',
        selectionReason:
          'Touring Line Array / 4-Way Multi-Driver architecture requires 8 discrete conductors (4 amplifier channels: LF1, LF2, MF, HF). Mandatory Neutrik speakON NL8MPR (8-Pole G-Shape) selected.',
        terminalCategory: 'touring_pa_speakon',
      };

    case 'tri_amp_3way':
      return {
        resolvedArchitecture,
        architectureLabel: '3-Way Active Tri-Amp System (LF + MF + HF + Aux/Sense)',
        requiredAmplifierChannels: 3,
        activeConductorCount: 6,
        autoModel: 'nl8mpr',
        selectionReason:
          '3-Way Active Tri-Amp enclosure requires 6+ discrete conductors (LF, Midrange, HF channels), exceeding 4-pole NL4 capacity. Mandatory Neutrik speakON NL8MPR (8-Pole G-Shape) selected.',
        terminalCategory: 'touring_pa_speakon',
      };

    case 'bi_amp_2way': {
      const autoModel: SpeakonConnectorModel = totalPowerW >= 500 ? 'nlt4mp' : 'nl4mp';
      return {
        resolvedArchitecture,
        architectureLabel: '2-Way Active Bi-Amp Split (Pins 1+/1- LF, Pins 2+/2- HF)',
        requiredAmplifierChannels: 2,
        activeConductorCount: 4,
        autoModel,
        selectionReason:
          autoModel === 'nlt4mp'
            ? `2-Way Bi-Amp PA Top (${totalPowerW}W AES) requires 4 conductors (LF + HF). Selected heavy-duty all-metal Neutrik speakON NLT4MP-BAG (4-Pole STXX, 40A RMS).`
            : '2-Way Bi-Amp system requires 4 discrete signal paths (Pins 1+/1- LF, Pins 2+/2- HF). Selected standard Neutrik speakON NL4MP (4-Pole D-Shape).',
        terminalCategory: 'touring_pa_speakon',
      };
    }

    case 'sub_top_pass': {
      const autoModel: SpeakonConnectorModel =
        totalPowerW >= 600 || subcategory === 'dual_18_reflex' ? 'nlt4mp' : 'nl4mp';
      return {
        resolvedArchitecture,
        architectureLabel: 'Subwoofer Drive + Satellite Top Pass-Through (1+/1- Sub, 2+/2- Top)',
        requiredAmplifierChannels: 2,
        activeConductorCount: 4,
        autoModel,
        selectionReason:
          autoModel === 'nlt4mp'
            ? `High-output Subwoofer (${totalPowerW}W continuous) with Top Pass-Through loop. Selected high-current metal Neutrik speakON NLT4MP-BAG (40A RMS) for low contact resistance.`
            : 'Subwoofer enclosure with Satellite Top Pass-Through loop (4 conductors). Selected Neutrik speakON NL4MP (4-Pole D-Shape).',
        terminalCategory: 'touring_pa_speakon',
      };
    }

    case 'passive_fullrange':
    default: {
      const autoModel: SpeakonConnectorModel = totalPowerW >= 500 ? 'nlt4mp' : 'nl4mp';
      return {
        resolvedArchitecture: 'passive_fullrange',
        architectureLabel: 'Full-Range Passive Crossover Input + Aux Link (1+/1- Main, 2+/2- Loop)',
        requiredAmplifierChannels: 1,
        activeConductorCount: 2,
        autoModel,
        selectionReason:
          'Standard full-range passive cabinet feeding internal crossover network on Pins 1+/1- with Pins 2+/2- available for auxiliary system pass-through. Neutrik speakON NL4 (4-Pole) selected.',
        terminalCategory: 'touring_pa_speakon',
      };
    }
  }
}

/**
 * Builds pinout and harness assignments for:
 * - Studio Passive Dual Binding Post Cups (HF+/HF-, LF+/LF- with bi-wire jumpers)
 * - Studio Active Plates (XLR Balanced Pin 1 GND, Pin 2 Hot, Pin 3 Cold, IEC AC mains)
 * - Neutrik speakON NL4 (Pins 1+/1- LF, 2+/2- HF)
 * - Neutrik speakON NL8 (Pins 1+/1- LF1, 2+/2- LF2, 3+/3- MF, 4+/4- HF)
 */
function buildStandardPinAssignments(
  connectorModel: SpeakonConnectorModel,
  poleCount: number,
  architecture: Exclude<SpeakonWiringArchitecture, 'auto'>,
  acoustics: AcousticParameters
): SpeakonPinAssignment[] {
  const wooferZ = acoustics.driverAssignments.woofer.impedanceOhm || 8;
  const midZ = acoustics.driverAssignments.midrange.impedanceOhm || 8;
  const tweeterZ = acoustics.driverAssignments.tweeter.impedanceOhm || 8;
  const wooferQty = acoustics.driverAssignments.woofer.quantity || 1;
  const effectiveLfZ = wooferQty === 2 ? `${wooferZ / 2} Ω (Parallel)` : `${wooferZ} Ω`;
  const totalPowerW = acoustics.driverAssignments.woofer.driver.pe * wooferQty;
  const lfGauge = totalPowerW >= 600 ? '12 AWG (4.0 mm²) OFC' : '14 AWG (2.5 mm²) OFC';

  // 1. Studio Passive Gold 5-Way Binding Posts
  if (connectorModel === 'binding_posts_gold') {
    return [
      {
        pinPair: 'HF+/HF-',
        positivePin: 'RED (Top)',
        negativePin: 'BLK (Top)',
        signalRole: 'High Frequency Passband (Tweeter Crossover Network)',
        targetBand: `HF Tweeter Section (${tweeterZ} Ω)`,
        wireGaugeAwg: '16 AWG (1.5 mm²) OFC',
        wireColorPositive: 'Red (+)',
        wireColorNegative: 'Black (-)',
        nominalImpedanceOhm: `${tweeterZ} Ω`,
        isActivePath: true,
        ipcNetNamePositive: 'NET_STUDIO_HF_POS',
        ipcNetNameNegative: 'NET_STUDIO_HF_NEG',
      },
      {
        pinPair: 'LF+/LF-',
        positivePin: 'RED (Btm)',
        negativePin: 'BLK (Btm)',
        signalRole: 'Low Frequency Passband (Woofer Crossover Network)',
        targetBand: `LF Woofer Section (${effectiveLfZ})`,
        wireGaugeAwg: lfGauge,
        wireColorPositive: 'Gold Solid Jumper / Red (+)',
        wireColorNegative: 'Gold Solid Jumper / Black (-)',
        nominalImpedanceOhm: effectiveLfZ,
        isActivePath: true,
        ipcNetNamePositive: 'NET_STUDIO_LF_POS',
        ipcNetNameNegative: 'NET_STUDIO_LF_NEG',
      },
    ];
  }

  // 2. Studio Active Balanced XLR / 1/4" TRS Plate
  if (connectorModel === 'active_plate_xlr') {
    return [
      {
        pinPair: 'XLR-1',
        positivePin: 'Pin 1',
        negativePin: 'Chassis Earth',
        signalRole: 'Chassis & Cable Shield Ground (0V Reference)',
        targetBand: 'Ground / Faraday Shield',
        wireGaugeAwg: '18 AWG Ground Braid',
        wireColorPositive: 'Green/Yellow (PE)',
        wireColorNegative: 'Bare OFC Braid',
        nominalImpedanceOhm: '0 Ω Ground',
        isActivePath: true,
        ipcNetNamePositive: 'NET_GND_CHASSIS',
        ipcNetNameNegative: 'NET_GND_EARTH',
      },
      {
        pinPair: 'XLR-2/3',
        positivePin: 'Pin 2 (Hot)',
        negativePin: 'Pin 3 (Cold)',
        signalRole: 'Balanced Differential Audio Input (+4 dBu / -10 dBV)',
        targetBand: 'Full Audio Band (20Hz–40kHz)',
        wireGaugeAwg: '24 AWG OFC Twisted Pair',
        wireColorPositive: 'Clear/White (+Phase)',
        wireColorNegative: 'Black (-Phase)',
        nominalImpedanceOhm: '10 kΩ Balanced Input',
        isActivePath: true,
        ipcNetNamePositive: 'NET_BAL_AUDIO_HOT',
        ipcNetNameNegative: 'NET_BAL_AUDIO_COLD',
      },
      {
        pinPair: 'AC-IEC',
        positivePin: 'L (Line)',
        negativePin: 'N (Neutral)',
        signalRole: 'AC Mains Power (100–240 VAC 50/60 Hz)',
        targetBand: 'Switch-Mode Power Supply Rail',
        wireGaugeAwg: '16 AWG 300V Rated',
        wireColorPositive: 'Brown (Line)',
        wireColorNegative: 'Blue (Neutral)',
        nominalImpedanceOhm: 'AC Mains 10A Fuse',
        isActivePath: true,
        ipcNetNamePositive: 'NET_AC_MAINS_LINE',
        ipcNetNameNegative: 'NET_AC_MAINS_NEUT',
      },
    ];
  }

  // 3. Neutrik speakON NL4 (4-Pole)
  if (poleCount === 4) {
    if (architecture === 'bi_amp_2way') {
      return [
        {
          pinPair: '1+/1-',
          positivePin: '1+',
          negativePin: '1-',
          signalRole: 'Low Frequency (LF Woofer Direct Drive)',
          targetBand: `LF Transducer (${effectiveLfZ})`,
          wireGaugeAwg: lfGauge,
          wireColorPositive: 'Red (+)',
          wireColorNegative: 'Black (-)',
          nominalImpedanceOhm: effectiveLfZ,
          isActivePath: true,
          ipcNetNamePositive: 'NET_SPK_1P_LF_POS',
          ipcNetNameNegative: 'NET_SPK_1N_LF_NEG',
        },
        {
          pinPair: '2+/2-',
          positivePin: '2+',
          negativePin: '2-',
          signalRole: 'High Frequency (HF Tweeter Direct Drive)',
          targetBand: `HF Compression Driver (${tweeterZ} Ω)`,
          wireGaugeAwg: '14 AWG (2.5 mm²) OFC',
          wireColorPositive: 'Yellow (+)',
          wireColorNegative: 'Blue (-)',
          nominalImpedanceOhm: `${tweeterZ} Ω`,
          isActivePath: true,
          ipcNetNamePositive: 'NET_SPK_2P_HF_POS',
          ipcNetNameNegative: 'NET_SPK_2N_HF_NEG',
        },
      ];
    }

    if (architecture === 'sub_top_pass') {
      return [
        {
          pinPair: '1+/1-',
          positivePin: '1+',
          negativePin: '1-',
          signalRole: 'Low Frequency Subwoofer Transducer Drive',
          targetBand: `Subwoofer LF (${effectiveLfZ})`,
          wireGaugeAwg: '12 AWG (4.0 mm²) OFC',
          wireColorPositive: 'Red (+)',
          wireColorNegative: 'Black (-)',
          nominalImpedanceOhm: effectiveLfZ,
          isActivePath: true,
          ipcNetNamePositive: 'NET_SPK_1P_SUB_POS',
          ipcNetNameNegative: 'NET_SPK_1N_SUB_NEG',
        },
        {
          pinPair: '2+/2-',
          positivePin: '2+',
          negativePin: '2-',
          signalRole: 'Aux Loop / Bi-Amp Top Cabinet Pass-Through Bus',
          targetBand: 'J1 → J2 Pass-Through (Satellite Top)',
          wireGaugeAwg: '14 AWG (2.5 mm²) OFC',
          wireColorPositive: 'Green (+)',
          wireColorNegative: 'White (-)',
          nominalImpedanceOhm: '8 Ω Thru Bus',
          isActivePath: true,
          ipcNetNamePositive: 'NET_SPK_2P_AUX_LOOP_POS',
          ipcNetNameNegative: 'NET_SPK_2N_AUX_LOOP_NEG',
        },
      ];
    }

    // Standard NL4 Full-Range Passive
    return [
      {
        pinPair: '1+/1-',
        positivePin: '1+',
        negativePin: '1-',
        signalRole: 'Low Frequency / Full Range (Passive Crossover Network Input)',
        targetBand: `Passive XO Input (${effectiveLfZ})`,
        wireGaugeAwg: lfGauge,
        wireColorPositive: 'Red (+)',
        wireColorNegative: 'Black (-)',
        nominalImpedanceOhm: effectiveLfZ,
        isActivePath: true,
        ipcNetNamePositive: 'NET_SPK_1P_XO_IN_POS',
        ipcNetNameNegative: 'NET_SPK_1N_XO_IN_NEG',
      },
      {
        pinPair: '2+/2-',
        positivePin: '2+',
        negativePin: '2-',
        signalRole: 'High Frequency / Aux Loop Pass-Through (J1-to-J2 Parallel Bus)',
        targetBand: 'System Link / Sub-Top Split Bus',
        wireGaugeAwg: '14 AWG (2.5 mm²) OFC',
        wireColorPositive: 'Yellow (+)',
        wireColorNegative: 'Blue (-)',
        nominalImpedanceOhm: 'Pass-Through',
        isActivePath: false,
        ipcNetNamePositive: 'NET_SPK_2P_AUX_THRU_POS',
        ipcNetNameNegative: 'NET_SPK_2N_AUX_THRU_NEG',
      },
    ];
  }

  // 4. Neutrik speakON NL8 (8-Pole)
  const isQuadAmp = architecture === 'quad_amp_array';
  return [
    {
      pinPair: '1+/1-',
      positivePin: '1+',
      negativePin: '1-',
      signalRole: 'Subwoofer / Primary Low Frequency Section (LF1)',
      targetBand: `Sub / LF1 Woofer (${effectiveLfZ})`,
      wireGaugeAwg: '12 AWG (4.0 mm²) OFC',
      wireColorPositive: 'Red (+)',
      wireColorNegative: 'Black (-)',
      nominalImpedanceOhm: effectiveLfZ,
      isActivePath: true,
      ipcNetNamePositive: 'NET_NL8_1P_LF1_POS',
      ipcNetNameNegative: 'NET_NL8_1N_LF1_NEG',
    },
    {
      pinPair: '2+/2-',
      positivePin: '2+',
      negativePin: '2-',
      signalRole: 'Low-Mid / Secondary Woofer Section (LF2)',
      targetBand: isQuadAmp ? `Low-Mid / LF2 (${wooferZ} Ω)` : `Mid-Bass / LF2 (${midZ} Ω)`,
      wireGaugeAwg: '12 AWG (4.0 mm²) OFC',
      wireColorPositive: 'Orange (+)',
      wireColorNegative: 'Grey (-)',
      nominalImpedanceOhm: `${wooferZ} Ω`,
      isActivePath: true,
      ipcNetNamePositive: 'NET_NL8_2P_LF2_POS',
      ipcNetNameNegative: 'NET_NL8_2N_LF2_NEG',
    },
    {
      pinPair: '3+/3-',
      positivePin: '3+',
      negativePin: '3-',
      signalRole: 'Midrange / Primary Compression Driver (MF / HF1)',
      targetBand: `Midrange / HF1 (${midZ} Ω)`,
      wireGaugeAwg: '14 AWG (2.5 mm²) OFC',
      wireColorPositive: 'Yellow (+)',
      wireColorNegative: 'Blue (-)',
      nominalImpedanceOhm: `${midZ} Ω`,
      isActivePath: true,
      ipcNetNamePositive: 'NET_NL8_3P_MF_POS',
      ipcNetNameNegative: 'NET_NL8_3N_MF_NEG',
    },
    {
      pinPair: '4+/4-',
      positivePin: '4+',
      negativePin: '4-',
      signalRole: isQuadAmp
        ? 'Highs / Line Array Waveguide Tweeter Array (HF2)'
        : 'Highs / Tweeter Array or Telemetry Sense Loop (Spare)',
      targetBand: isQuadAmp ? `HF2 Array (${tweeterZ} Ω)` : `HF Tweeter / Spare (${tweeterZ} Ω)`,
      wireGaugeAwg: '16 AWG (1.5 mm²) OFC',
      wireColorPositive: 'Green (+)',
      wireColorNegative: 'Violet (-)',
      nominalImpedanceOhm: `${tweeterZ} Ω`,
      isActivePath: isQuadAmp || acoustics.topology === 'three_way',
      ipcNetNamePositive: 'NET_NL8_4P_HF2_POS',
      ipcNetNameNegative: 'NET_NL8_4N_HF2_NEG',
    },
  ];
}

/**
 * Generates mounting hole coordinates for the selected chassis connector or terminal cup.
 */
function buildMountingHolesPerConnector(
  connectorModel: SpeakonConnectorModel
): SpeakonMountingHoleCoord[] {
  if (connectorModel === 'binding_posts_gold') {
    // 4-corner countersunk wood screws for standard recessed terminal cup
    return [
      { holeId: 'TC_TL', xMm: -34, yMm: 34, diameterMm: 3.8, fastenerSpec: 'M3.5×19mm Black Countersunk Wood Screw' },
      { holeId: 'TC_TR', xMm: 34, yMm: 34, diameterMm: 3.8, fastenerSpec: 'M3.5×19mm Black Countersunk Wood Screw' },
      { holeId: 'TC_BL', xMm: -34, yMm: -34, diameterMm: 3.8, fastenerSpec: 'M3.5×19mm Black Countersunk Wood Screw' },
      { holeId: 'TC_BR', xMm: 34, yMm: -34, diameterMm: 3.8, fastenerSpec: 'M3.5×19mm Black Countersunk Wood Screw' },
    ];
  }

  if (connectorModel === 'active_plate_xlr') {
    // 6-perimeter screws for recessed active aluminum backplate
    return [
      { holeId: 'AP_TL', xMm: -55, yMm: 80, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
      { holeId: 'AP_TR', xMm: 55, yMm: 80, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
      { holeId: 'AP_ML', xMm: -55, yMm: 0, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
      { holeId: 'AP_MR', xMm: 55, yMm: 0, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
      { holeId: 'AP_BL', xMm: -55, yMm: -80, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
      { holeId: 'AP_BR', xMm: 55, yMm: -80, diameterMm: 3.2, fastenerSpec: 'M3×12mm Torx T10 Machine Screw + Threaded Insert' },
    ];
  }

  if (connectorModel === 'nl8mpr') {
    // Neutrik NL8MPR G-size square flange (51.8 × 51.8 mm): 4 corner countersunk holes at ±19.75 mm
    return [
      { holeId: 'M1_TL', xMm: -19.75, yMm: 19.75, diameterMm: 3.5, fastenerSpec: 'M3.5×16mm Countersunk Torx (DIN 7991 Black Zinc)' },
      { holeId: 'M2_TR', xMm: 19.75, yMm: 19.75, diameterMm: 3.5, fastenerSpec: 'M3.5×16mm Countersunk Torx (DIN 7991 Black Zinc)' },
      { holeId: 'M3_BL', xMm: -19.75, yMm: -19.75, diameterMm: 3.5, fastenerSpec: 'M3.5×16mm Countersunk Torx (DIN 7991 Black Zinc)' },
      { holeId: 'M4_BR', xMm: 19.75, yMm: -19.75, diameterMm: 3.5, fastenerSpec: 'M3.5×16mm Countersunk Torx (DIN 7991 Black Zinc)' },
    ];
  }

  // Neutrik NL4MP / NLT4MP D-size flange (26 × 31 mm): 2 diagonal countersunk M3 holes at (-9.5, +12.0) and (+9.5, -12.0)
  return [
    { holeId: 'M1_DIAG_TL', xMm: -9.5, yMm: 12.0, diameterMm: 3.2, fastenerSpec: 'M3×12mm Countersunk Torx T10 (ISO 10642 Black Oxide)' },
    { holeId: 'M2_DIAG_BR', xMm: 9.5, yMm: -12.0, diameterMm: 3.2, fastenerSpec: 'M3×12mm Countersunk Torx T10 (ISO 10642 Black Oxide)' },
  ];
}

/**
 * Spatial clash validation against internal braces, acoustic chamber walls,
 * crossover standoffs, and rear ports.
 */
function evaluateSpatialClashes(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  portLengthMm: number,
  resolvedPortPlacement: 'front_bottom' | 'front_top' | 'rear',
  dishHeightMm: number,
  dishCenterYMm: number,
  internalProjectionDepthMm: number
): {
  overallClashStatus: 'clear' | 'caution' | 'clash';
  minInternalClearanceMm: number;
  clashChecks: SpeakonClashItem[];
} {
  const matSpec = MATERIAL_SPECS[dimensions.material] || MATERIAL_SPECS.baltic_birch_18;
  const wallT = matSpec.nominalThicknessMm;
  const baffleT = dimensions.baffleThicknessMm || wallT;
  const intH = Math.max(60, dimensions.externalHeightMm - 2 * wallT);
  const intD = Math.max(60, dimensions.externalDepthMm - wallT - baffleT);

  const clashChecks: SpeakonClashItem[] = [];

  // 1. Internal Matrix Window Bracing Check
  const braceCenterYMm = -dimensions.externalHeightMm * 0.05;
  const braceVerticalClearanceMm = Math.round(
    Math.abs(dishCenterYMm - braceCenterYMm) - dishHeightMm / 2 - wallT / 2
  );
  const braceDepthMarginMm =
    acoustics.bracingLevel === 'heavy'
      ? Math.round(intD * 0.22 - internalProjectionDepthMm)
      : Math.round(intD * 0.35 - internalProjectionDepthMm);
  const effectiveBraceClearanceMm = Math.max(braceVerticalClearanceMm, braceDepthMarginMm);

  const braceStatus: 'clear' | 'caution' | 'clash' =
    effectiveBraceClearanceMm < 8
      ? 'clash'
      : effectiveBraceClearanceMm < 20
      ? 'caution'
      : 'clear';

  clashChecks.push({
    targetComponent: `Internal ${acoustics.bracingLevel.toUpperCase()} Matrix Brace`,
    clearanceMm: effectiveBraceClearanceMm,
    minRequiredMm: 18,
    status: braceStatus,
    description:
      braceStatus === 'clear'
        ? `Clears internal matrix window brace web by ${effectiveBraceClearanceMm} mm.`
        : 'Recessed dish pocket approaches window brace aperture; verify CNC rebate depth.',
  });

  // 2. Midrange Sealed Chamber / Driver Motor Check
  if (acoustics.topology === 'three_way' && dimensions.subcategory === 'midfield_3way') {
    const chamberDepthMm = Math.min(180, intD * 0.55);
    const chamberClearanceMm = Math.round(intD - chamberDepthMm - internalProjectionDepthMm);
    const chamberStatus: 'clear' | 'caution' | 'clash' =
      chamberClearanceMm < 15 ? 'clash' : chamberClearanceMm < 30 ? 'caution' : 'clear';

    clashChecks.push({
      targetComponent: 'Sealed Midrange Acoustic Chamber Sub-Enclosure',
      clearanceMm: chamberClearanceMm,
      minRequiredMm: 20,
      status: chamberStatus,
      description:
        chamberStatus === 'clear'
          ? `Maintains ${chamberClearanceMm} mm isolation from sealed midrange sub-enclosure wall.`
          : 'Terminal lugs infringe on sealed chamber boundary; route wiring around perimeter.',
    });
  }

  // 3. Passive Crossover PCB Standoff Check
  const pcbClearanceMm = Math.round(intD * 0.25 - internalProjectionDepthMm);
  const pcbStatus: 'clear' | 'caution' | 'clash' =
    pcbClearanceMm < 10 ? 'clash' : pcbClearanceMm < 22 ? 'caution' : 'clear';

  clashChecks.push({
    targetComponent: 'Internal Crossover PCB Standoff Perimeter',
    clearanceMm: pcbClearanceMm,
    minRequiredMm: 15,
    status: pcbStatus,
    description:
      pcbStatus === 'clear'
        ? `Internal wiring lugs clear crossover PCB components by ${pcbClearanceMm} mm.`
        : 'Crossover network inductors within magnetic coupling radius; adjust PCB mounting.',
  });

  // 4. Rear Reflex Port Flare Termination Check
  if (acoustics.alignment === 'ported') {
    const isRearPort = resolvedPortPlacement === 'rear';
    const portClearanceMm = isRearPort
      ? Math.round(intH * 0.36 - dishHeightMm / 2 - acoustics.portDiameterMm / 2)
      : Math.round(intD - portLengthMm - internalProjectionDepthMm);
    const portStatus: 'clear' | 'caution' | 'clash' =
      portClearanceMm < 12 ? 'clash' : portClearanceMm < 28 ? 'caution' : 'clear';

    clashChecks.push({
      targetComponent: isRearPort
        ? 'Rear-Firing Aeroport Flange Cutout'
        : 'Internal Reflex Port Flare Termination',
      clearanceMm: portClearanceMm,
      minRequiredMm: 25,
      status: portStatus,
      description:
        portStatus === 'clear'
          ? `Port flare maintains ${portClearanceMm} mm separation from terminal harness.`
          : 'Secure internal OFC speaker harness with P-clips away from port intake mouth to prevent air turbulence.',
    });
  }

  const minInternalClearanceMm = Math.min(...clashChecks.map((c) => c.clearanceMm));
  const overallClashStatus: 'clear' | 'caution' | 'clash' = clashChecks.some(
    (c) => c.status === 'clash'
  )
    ? 'clash'
    : clashChecks.some((c) => c.status === 'caution')
    ? 'caution'
    : 'clear';

  return {
    overallClashStatus,
    minInternalClearanceMm,
    clashChecks,
  };
}

/**
 * Builds BOM entries for the active rear terminal hardware.
 */
function buildRearTerminalBom(
  connectorModel: SpeakonConnectorModel,
  partNumber: string,
  connectorQuantity: number
): {
  bomItems: SpeakonBomEntry[];
  totalHardwareCostUsd: number;
  crimpTerminalSpec: string;
  gasketPartNumber: string;
} {
  const bomItems: SpeakonBomEntry[] = [];

  // A. Studio Passive Gold 5-Way Binding Post Cup
  if (connectorModel === 'binding_posts_gold') {
    bomItems.push({
      partNumber: 'BPA-38G-DUAL',
      manufacturer: 'Dayton Audio / ResonanceCAD',
      description:
        'Recessed Heavy-Duty Gold-Plated 5-Way Binding Post Terminal Cup with Solid Brass Bi-Wire Jumper Straps & Banana Plug Sockets',
      quantity: 1,
      unitCostUsd: 8.95,
      totalCostUsd: 8.95,
      category: 'connector',
      distributorSku: 'DAY-BPA-38G',
    });

    bomItems.push({
      partNumber: 'GASKET-TC75-EPDM',
      manufacturer: 'ResonanceCAD Fab',
      description: 'Die-Cut Closed-Cell EPDM Foam Acoustic Airtight Gasket (75mm Bore)',
      quantity: 1,
      unitCostUsd: 1.25,
      totalCostUsd: 1.25,
      category: 'gasket',
      distributorSku: 'GSK-TC75-EPDM',
    });

    bomItems.push({
      partNumber: 'LUG-0205-GOLD',
      manufacturer: 'TE Connectivity / Molex',
      description: 'High-Purity OFC 0.205" Gold-Plated Crimp Terminals (12–16 AWG)',
      quantity: 4,
      unitCostUsd: 0.35,
      totalCostUsd: 1.4,
      category: 'crimp_terminal',
      distributorSku: 'MOL-0205-GOLD',
    });

    bomItems.push({
      partNumber: 'WOOD-M35-19BLK',
      manufacturer: 'Wurth',
      description: 'M3.5×19mm Black Countersunk Deep-Thread Cabinet Fasteners',
      quantity: 4,
      unitCostUsd: 0.15,
      totalCostUsd: 0.6,
      category: 'fastener',
      distributorSku: 'WUR-M35-19B',
    });

    const totalHardwareCostUsd =
      Math.round(bomItems.reduce((sum, item) => sum + item.totalCostUsd, 0) * 100) / 100;

    return {
      bomItems,
      totalHardwareCostUsd,
      crimpTerminalSpec: 'OFC 0.205" Gold-Plated Crimp Terminals (12–16 AWG)',
      gasketPartNumber: 'GASKET-TC75-EPDM',
    };
  }

  // B. Studio Active Plate with Balanced XLR / TRS Combo
  if (connectorModel === 'active_plate_xlr') {
    bomItems.push({
      partNumber: 'NCJ6FI-S',
      manufacturer: 'Neutrik AG',
      description:
        'Neutrik Combo XLR Female & 1/4" TRS Jack Hybrid Chassis Connector, Balanced Line Input / Loop Out',
      quantity: 2,
      unitCostUsd: 4.2,
      totalCostUsd: 8.4,
      category: 'connector',
      distributorSku: 'NEU-NCJ6FI-S',
    });

    bomItems.push({
      partNumber: 'IEC-C14-6200',
      manufacturer: 'Schurter',
      description: 'Fused IEC C14 Panel Mount AC Power Inlet (10A 250V) with RF Line Filter Drawer',
      quantity: 1,
      unitCostUsd: 5.8,
      totalCostUsd: 5.8,
      category: 'connector',
      distributorSku: 'SCH-6200-C14',
    });

    bomItems.push({
      partNumber: 'PLATE-ALU-ACTIVE',
      manufacturer: 'ResonanceCAD Hardware',
      description: 'CNC Milled 2.0mm Black Anodized Aluminum Recessed Sub-Plate with Neoprene Perimeter Gasket',
      quantity: 1,
      unitCostUsd: 14.5,
      totalCostUsd: 14.5,
      category: 'dish_plate',
      distributorSku: 'RCAD-PLT-ACT130',
    });

    bomItems.push({
      partNumber: 'HARN-XLR-OFC',
      manufacturer: 'Mogami / Canare',
      description: 'Shielded Twisted Pair 24 AWG OFC Internal Audio Harness + 18 AWG Ground Straps',
      quantity: 1,
      unitCostUsd: 3.75,
      totalCostUsd: 3.75,
      category: 'crimp_terminal',
      distributorSku: 'MOG-W2944-HRN',
    });

    bomItems.push({
      partNumber: 'ISO10642-M3x12-BLK',
      manufacturer: 'Bossard',
      description: 'M3×12mm Countersunk Torx Machine Screws + Brass Threaded Inserts',
      quantity: 6,
      unitCostUsd: 0.18,
      totalCostUsd: 1.08,
      category: 'fastener',
      distributorSku: 'FAST-M30-12CSK',
    });

    const totalHardwareCostUsd =
      Math.round(bomItems.reduce((sum, item) => sum + item.totalCostUsd, 0) * 100) / 100;

    return {
      bomItems,
      totalHardwareCostUsd,
      crimpTerminalSpec: 'Mogami 24 AWG Shielded Balanced Harness + Molex Micro-Fit Headers',
      gasketPartNumber: 'GSK-NEO-130X180',
    };
  }

  // C. Touring PA Neutrik speakON (NL4 / NL8)
  const isNl8 = connectorModel === 'nl8mpr';
  const isStxx = connectorModel === 'nlt4mp';
  const poleCount = isNl8 ? 8 : 4;

  const unitConnCost = isNl8 ? 14.85 : isStxx ? 9.4 : 4.65;
  const connDesc = isNl8
    ? 'Neutrik speakON 8-Pole Male Chassis Connector, G-Shape Square Flange (51.8×51.8mm), Black Metal Housing, 30A RMS'
    : isStxx
    ? 'Neutrik speakON STXX 4-Pole Male Chassis Connector, D-Shape All-Metal Touring Housing, 1/4" Flat Tabs, 40A RMS'
    : 'Neutrik speakON 4-Pole Male Chassis Connector, D-Shape Standard Flange (26×31mm), Glass-Reinforced Polyamide, 30A RMS';
  const connSku = isNl8 ? 'NEU-NL8MPR-BAG' : isStxx ? 'NEU-NLT4MP-BAG' : 'NEU-NL4MP';

  bomItems.push({
    partNumber,
    manufacturer: 'Neutrik AG',
    description: connDesc,
    quantity: connectorQuantity,
    unitCostUsd: unitConnCost,
    totalCostUsd: Math.round(unitConnCost * connectorQuantity * 100) / 100,
    category: 'connector',
    distributorSku: connSku,
  });

  const gasketPartNumber = isNl8 ? 'NEUTRIK-SG-NL8' : 'NEUTRIK-SCDX-GASKET';
  const gasketUnitCost = isNl8 ? 1.85 : 0.95;
  bomItems.push({
    partNumber: gasketPartNumber,
    manufacturer: 'Neutrik AG',
    description: isNl8
      ? 'G-Size EPDM Closed-Cell Acoustic Sealing Gasket (51.8×51.8mm, 2mm thick) for NL8MPR'
      : 'D-Size EPDM Acoustic Flange Sealing Gasket (26×31mm, 2mm thick) for NL4MP / NLT4MP',
    quantity: connectorQuantity,
    unitCostUsd: gasketUnitCost,
    totalCostUsd: Math.round(gasketUnitCost * connectorQuantity * 100) / 100,
    category: 'gasket',
    distributorSku: isNl8 ? 'NEU-SGNL8' : 'NEU-SCDX-G',
  });

  const totalTerminals = poleCount * connectorQuantity;
  const crimpTerminalSpec = isStxx
    ? 'Neutrik NLFASTON 6.3×0.8mm (0.250") Positive-Lock Female Crimp Receptacle (12–14 AWG)'
    : 'Neutrik NLFASTON 4.8×0.5mm (0.187") Positive-Lock Female Crimp Receptacle (12–16 AWG)';
  const crimpUnitCost = 0.42;

  bomItems.push({
    partNumber: 'NLFASTON',
    manufacturer: 'Neutrik AG / TE Connectivity',
    description: `${crimpTerminalSpec} with Insulating Sleeve`,
    quantity: totalTerminals,
    unitCostUsd: crimpUnitCost,
    totalCostUsd: Math.round(crimpUnitCost * totalTerminals * 100) / 100,
    category: 'crimp_terminal',
    distributorSku: 'NEU-NLFASTON-100',
  });

  const dishPart = isNl8 ? 'DISH-2X-NL8G-STL' : 'DISH-2X-NL4D-STL';
  const dishCost = isNl8 ? 8.5 : 5.75;
  bomItems.push({
    partNumber: dishPart,
    manufacturer: 'Penn Elcom / ResonanceCAD Fab',
    description: isNl8
      ? 'Recessed 1.5mm Powder-Coated Steel Input Dish Punched for Dual G-Size NL8MPR Connectors'
      : 'Recessed 1.5mm Powder-Coated Steel Input Dish Punched for Dual D-Size NL4MP/NLT4MP Connectors',
    quantity: 1,
    unitCostUsd: dishCost,
    totalCostUsd: dishCost,
    category: 'dish_plate',
    distributorSku: isNl8 ? 'PENN-D1548-NL8' : 'PENN-D1542-NL4',
  });

  const screwsPerConnector = isNl8 ? 4 : 2;
  const totalScrews = screwsPerConnector * connectorQuantity;
  const screwUnitCost = 0.18;
  bomItems.push({
    partNumber: isNl8 ? 'DIN7991-M3.5x16-BLK' : 'ISO10642-M3x12-BLK',
    manufacturer: 'Bossard / Wurth',
    description: isNl8
      ? 'M3.5×16mm Countersunk Hex/Torx Machine Screw + Nyloc Nut (Black Zinc)'
      : 'M3×12mm Countersunk Torx T10 Machine Screw + Nyloc Nut (Black Oxide)',
    quantity: totalScrews,
    unitCostUsd: screwUnitCost,
    totalCostUsd: Math.round(screwUnitCost * totalScrews * 100) / 100,
    category: 'fastener',
    distributorSku: isNl8 ? 'FAST-M35-16CSK' : 'FAST-M30-12CSK',
  });

  const totalHardwareCostUsd =
    Math.round(bomItems.reduce((sum, item) => sum + item.totalCostUsd, 0) * 100) / 100;

  return {
    bomItems,
    totalHardwareCostUsd,
    crimpTerminalSpec,
    gasketPartNumber,
  };
}

/**
 * Primary Rear-Panel Input/Output Port Selection & Wiring Engine
 * Enforces strict categorization rules between Live PA and Studio Monitors.
 */
export function calculateSpeakonReport(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  portLengthMm: number = 150,
  resolvedPortPlacement: 'front_bottom' | 'front_top' | 'rear' = 'front_bottom'
): SpeakonReport {
  const userCfg: Required<SpeakonConfig> = {
    ...DEFAULT_SPEAKON_CONFIG,
    ...(dimensions.speakonConfig || {}),
  };

  const category = dimensions.category || 'studio_monitor';
  const subcategory = dimensions.subcategory || 'nearfield_2way';
  const hasPlateAmp =
    subcategory === 'active_powered_biamp' ||
    (subcategory as string).includes('active') ||
    (subcategory as string) === 'high_output_active';

  const {
    resolvedArchitecture,
    architectureLabel,
    requiredAmplifierChannels,
    activeConductorCount,
    autoModel,
    selectionReason,
    terminalCategory,
  } = resolveElectricalArchitecture(dimensions, acoustics, userCfg);

  const isAutoSelected = userCfg.selectionMode === 'auto';
  const connectorModel: SpeakonConnectorModel = isAutoSelected
    ? autoModel
    : (userCfg.selectionMode as SpeakonConnectorModel);

  // Validate strict hardware categorization rules
  const validation = validateTerminalCompatibility(category, connectorModel, hasPlateAmp);
  const isProhibitedConfiguration = validation.isProhibited;
  const prohibitionWarningText = validation.prohibitionWarningText;
  const recommendedResolutionModel = validation.recommendedResolutionModel;

  // Resolve pole / terminal count
  const poleCount: number =
    connectorModel === 'nl8mpr'
      ? 8
      : connectorModel === 'active_plate_xlr'
      ? 3
      : connectorModel === 'binding_posts_gold'
      ? 4
      : 4;

  // Channel capacity warning for live PA (NL4 on >4 conductors)
  const hasChannelCapacityWarning =
    terminalCategory === 'touring_pa_speakon' && poleCount === 4 && activeConductorCount > 4;
  const channelCapacityWarningText = hasChannelCapacityWarning
    ? `Selected 4-Pole (${connectorModel.toUpperCase()}) provides only 4 conductors, but ${architectureLabel} requires ${activeConductorCount} conductors (${requiredAmplifierChannels} discrete amp channels). Switch to Neutrik NL8MPR (8-Pole).`
    : undefined;

  let partNumber = 'NL4MP';
  let connectorName = 'Neutrik speakON NL4MP (4-Pole D-Series)';
  let flangeType = 'D-Shape (26×31mm)';
  let cutoutBoreDiameterMm = 24.0;
  let flangeWidthMm = 26.0;
  let flangeHeightMm = 31.0;
  let dishWidthMm = 116;
  let dishHeightMm = 82;
  let dishPocketDepthMm = userCfg.recessedDishDepthMm || 18;
  let connectorSpacingCenterMm = 44;
  let connectorQuantity = userCfg.dualLinkThru ? 2 : 1;
  let internalProjectionDepthMm = 44;

  if (connectorModel === 'nl8mpr') {
    partNumber = 'NL8MPR-BAG';
    connectorName = 'Neutrik speakON NL8MPR-BAG (8-Pole G-Series)';
    flangeType = 'G-Shape Square (51.8×51.8mm)';
    cutoutBoreDiameterMm = 38.5;
    flangeWidthMm = 51.8;
    flangeHeightMm = 51.8;
    dishWidthMm = connectorQuantity === 2 ? 162 : 92;
    dishHeightMm = 98;
    connectorSpacingCenterMm = 68;
    internalProjectionDepthMm = 53;
  } else if (connectorModel === 'nlt4mp') {
    partNumber = 'NLT4MP-BAG';
    connectorName = 'Neutrik speakON NLT4MP-BAG (4-Pole STXX All-Metal)';
    flangeType = 'D-Shape Heavy-Duty Metal';
    cutoutBoreDiameterMm = 24.0;
    flangeWidthMm = 26.0;
    flangeHeightMm = 31.0;
    dishWidthMm = connectorQuantity === 2 ? 116 : 68;
    dishHeightMm = 82;
    connectorSpacingCenterMm = 44;
    internalProjectionDepthMm = 46;
  } else if (connectorModel === 'binding_posts_gold') {
    partNumber = 'BPA-38G-DUAL';
    connectorName = 'Dual Heavy-Duty Gold 5-Way Binding Post Recessed Terminal Cup';
    flangeType = 'Recessed Cup (92×92mm, 75mm Bore)';
    cutoutBoreDiameterMm = 75.0;
    flangeWidthMm = 92.0;
    flangeHeightMm = 92.0;
    dishWidthMm = 92;
    dishHeightMm = 92;
    dishPocketDepthMm = 20;
    connectorQuantity = 1; // single dual-pair cup
    connectorSpacingCenterMm = 30;
    internalProjectionDepthMm = 26;
  } else if (connectorModel === 'active_plate_xlr') {
    partNumber = 'PLATE-ALU-ACTIVE';
    connectorName = 'Recessed Active Amplifier Plate (Neutrik Combo XLR/TRS + Schurter IEC C14)';
    flangeType = 'CNC Aluminum Plate (130×180mm)';
    cutoutBoreDiameterMm = 110.0;
    flangeWidthMm = 130.0;
    flangeHeightMm = 180.0;
    dishWidthMm = 130;
    dishHeightMm = 180;
    dishPocketDepthMm = 25;
    connectorQuantity = 1;
    connectorSpacingCenterMm = 42;
    internalProjectionDepthMm = 48;
  } else {
    // nl4mp default
    dishWidthMm = connectorQuantity === 2 ? 116 : 68;
  }

  // Position dish on lower rear panel (avoiding rear port if active)
  const isRearPort = resolvedPortPlacement === 'rear' && acoustics.alignment === 'ported';
  const dishCenterYMm = isRearPort
    ? -Math.round(dimensions.externalHeightMm * 0.28)
    : -Math.round(dimensions.externalHeightMm * 0.22);

  const mountingHolesPerConnector = buildMountingHolesPerConnector(connectorModel);
  const pinAssignments = buildStandardPinAssignments(
    connectorModel,
    poleCount,
    resolvedArchitecture,
    acoustics
  );

  const { overallClashStatus, minInternalClearanceMm, clashChecks } = evaluateSpatialClashes(
    dimensions,
    acoustics,
    portLengthMm,
    resolvedPortPlacement,
    dishHeightMm,
    dishCenterYMm,
    internalProjectionDepthMm
  );

  const { bomItems, totalHardwareCostUsd, crimpTerminalSpec, gasketPartNumber } =
    buildRearTerminalBom(connectorModel, partNumber, connectorQuantity);

  let studioTerminalSpec: StudioTerminalSpec | undefined = undefined;
  if (connectorModel === 'binding_posts_gold') {
    studioTerminalSpec = {
      terminalType: 'binding_posts_gold',
      title: 'Studio Passive Bi-Wire Reference Terminal Cup',
      bindingPostMaterial: '24K Gold-Plated Solid Tellurium Copper / Brass Knurled Posts',
      bananaPlugCompatible: true,
      biWireJumperIncluded: true,
      xlrComboCount: 0,
      iecInletType: 'None (Passive)',
      acVoltageSpec: 'Unpowered (External Studio Power Amplifier)',
    };
  } else if (connectorModel === 'active_plate_xlr') {
    studioTerminalSpec = {
      terminalType: 'active_plate_xlr',
      title: 'Studio Active Monitor Recessed Aluminum Subplate',
      bindingPostMaterial: 'N/A (Line Level Balanced)',
      bananaPlugCompatible: false,
      biWireJumperIncluded: false,
      xlrComboCount: 2,
      iecInletType: 'Schurter 6200 C14 with 5×20mm Fuse Drawer & RF Filter',
      acVoltageSpec: 'Universal SMPS 100–240 VAC 50/60Hz',
    };
  }

  return {
    terminalCategory,
    isProhibitedConfiguration,
    prohibitionWarningText,
    recommendedResolutionModel,
    connectorModel,
    partNumber,
    connectorName,
    poleCount,
    flangeType,
    selectionReason,
    isAutoSelected,
    hasChannelCapacityWarning,
    channelCapacityWarningText,
    wiringArchitecture: resolvedArchitecture,
    wiringArchitectureLabel: architectureLabel,
    requiredAmplifierChannels,
    activeConductorCount,
    dualLinkThru: userCfg.dualLinkThru ?? true,
    connectorQuantity,
    cutoutBoreDiameterMm,
    flangeWidthMm,
    flangeHeightMm,
    connectorSpacingCenterMm,
    dishWidthMm,
    dishHeightMm,
    dishPocketDepthMm,
    dishCenterYMm,
    internalProjectionDepthMm,
    mountingHolesPerConnector,
    pinAssignments,
    crimpTerminalSpec,
    gasketPartNumber,
    overallClashStatus,
    minInternalClearanceMm,
    clashChecks,
    bomItems,
    totalHardwareCostUsd,
    studioTerminalSpec,
  };
}
