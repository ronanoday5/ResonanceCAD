export type ComplexityMode = 'essentials' | 'master';
export type WorkflowStage = 'design' | 'simulate' | 'fabricate';
export type InspectorTab = 'telemetry' | 'acoustics' | 'topology' | 'dimensions' | 'view3d' | 'physics';

export type ContextActionCategory =
  | 'transducer'
  | 'port'
  | 'terminal'
  | 'enclosure_panel'
  | 'tpms_matrix'
  | 'bracing'
  | 'crossover'
  | 'hardware';

export interface PartInspectionTarget {
  partId: string;
  category: ContextActionCategory;
  categoryBadge: string;
  partTitle: string;
  tab: InspectorTab;
  sectionId: string;
  accordionGroup: 'group1' | 'group2' | 'group3' | null;
  accentColor: 'cyan' | 'amber' | 'purple' | 'emerald' | 'rose';
}

/**
 * Resolves any 3D CAD mesh `partId` clicked in the viewport into the exact
 * Property Inspector tab, sub-accordion group, DOM section anchor ID, and
 * Context-Aware Action Strip category.
 */
export function resolvePartInspectionTarget(partId: string | null | undefined): PartInspectionTarget | null {
  if (!partId) return null;

  const id = partId.toLowerCase();

  // 1. Transducers (Woofer, Midrange, Tweeter)
  if (id.startsWith('driver_woofer')) {
    return {
      partId,
      category: 'transducer',
      categoryBadge: 'LF Transducer',
      partTitle: 'Woofer & Box Alignment',
      tab: 'acoustics',
      sectionId: 'section-driver-alignment',
      accordionGroup: 'group1',
      accentColor: 'cyan',
    };
  }

  if (id.startsWith('driver_midrange') || id.startsWith('driver_tweeter')) {
    return {
      partId,
      category: 'transducer',
      categoryBadge: id.includes('tweeter') ? 'HF Waveguide / Tweeter' : 'MF Transducer',
      partTitle: 'Multi-Driver Passband & Topology',
      tab: 'topology',
      sectionId: 'section-topology-drivers',
      accordionGroup: null,
      accentColor: 'purple',
    };
  }

  // 2. Ports & Aerodynamics
  if (id.startsWith('port_')) {
    return {
      partId,
      category: 'port',
      categoryBadge: 'Helmholtz Resonator Port',
      partTitle: 'Port Profile, Flare & Velocity Tuning',
      tab: 'acoustics',
      sectionId: 'section-port-aerodynamics',
      accordionGroup: 'group2',
      accentColor: 'amber',
    };
  }

  // 3. Rear Panel, Speakon Dish & Plate Amp
  if (id === 'panel_rear' || id.includes('speakon') || id.includes('plate_amp') || id.includes('terminal')) {
    return {
      partId,
      category: 'terminal',
      categoryBadge: 'Rear I/O & Terminal',
      partTitle: 'Speakon NL4/NL8, Binding Posts & Rear Panel',
      tab: 'topology',
      sectionId: 'section-rear-terminals',
      accordionGroup: null,
      accentColor: 'cyan',
    };
  }

  // 4. Integral 3D-Printed TPMS Matrix & Acoustic Damping
  if (id === 'integral_damping_matrix' || id === 'damping_treatment') {
    return {
      partId,
      category: 'tpms_matrix',
      categoryBadge: '3D-Printed Acoustic Matrix',
      partTitle: 'TPMS Gyroid Infill & Labyrinth Back-Wave Trap',
      tab: 'acoustics',
      sectionId: 'section-tpms-matrix',
      accordionGroup: 'group3',
      accentColor: 'emerald',
    };
  }

  // 5. Internal Bracing
  if (id.startsWith('brace_')) {
    return {
      partId,
      category: 'bracing',
      categoryBadge: 'Structural Shear Web',
      partTitle: 'Internal Bracing & Flexural Rigidity (EI)',
      tab: 'dimensions',
      sectionId: 'section-material-library',
      accordionGroup: null,
      accentColor: 'emerald',
    };
  }

  // 6. Crossover PCB
  if (id.includes('crossover')) {
    return {
      partId,
      category: 'crossover',
      categoryBadge: 'Crossover Network',
      partTitle: 'Passive Filter & 3D PCB Stack',
      tab: 'topology',
      sectionId: 'section-topology-drivers',
      accordionGroup: null,
      accentColor: 'purple',
    };
  }

  // 7. Exterior Hardware (Handles, Pole Cup, Corner Guards, Feet, Rear Thermal Ventilation Slots)
  if (id.startsWith('hardware_') || id.includes('thermal_vent')) {
    return {
      partId,
      category: 'hardware',
      categoryBadge: id.includes('thermal_vent') ? 'Rear Thermal Chimney' : 'Enclosure Hardware',
      partTitle: id.includes('thermal_vent')
        ? 'Parametric Rear Thermal Ventilation Slots (Driver Pe Scaled)'
        : 'Handles, Pole Mount, Corner Guards & Feet',
      tab: 'dimensions',
      sectionId: 'section-hardware-rigging',
      accordionGroup: null,
      accentColor: 'amber',
    };
  }

  // 8. Enclosure Structural Walls (Front Baffle, Top, Bottom, Left, Right)
  if (id.startsWith('panel_')) {
    return {
      partId,
      category: 'enclosure_panel',
      categoryBadge: 'Enclosure Structural Wall',
      partTitle: 'Material Library, Wall Thickness & TPMS Core',
      tab: 'dimensions',
      sectionId: 'section-material-library',
      accordionGroup: null,
      accentColor: 'amber',
    };
  }

  // Default fallback
  return {
    partId,
    category: 'enclosure_panel',
    categoryBadge: '3D Component',
    partTitle: 'Cabinet Dimensions & Material',
    tab: 'dimensions',
    sectionId: 'section-cabinet-dimensions',
    accordionGroup: null,
    accentColor: 'cyan',
  };
}
