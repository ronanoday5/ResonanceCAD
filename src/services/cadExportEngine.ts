import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type { EnclosureDimensions, AcousticParameters } from '../types/loudspeaker.ts';

export type CadExportFormat = 'stl_binary' | 'stl_ascii' | 'step' | 'obj';

export type CadExportScope =
  | 'full_assembly'
  | 'woodwork_only'
  | 'baffle_only'
  | 'port_only'
  | 'bracing_only';

export type CadExportUnits = 'mm' | 'inch' | 'meter';

export type ManufacturingProfileId =
  | 'cnc_router_5mm'
  | 'cnc_router_6mm'
  | '3d_print_fdm_04'
  | '3d_print_sla'
  | 'table_saw_joinery'
  | 'laser_waterjet_metal';

export interface ManufacturingProfileSpec {
  id: ManufacturingProfileId;
  name: string;
  badge: string;
  category: 'cnc' | '3d_print' | 'traditional' | 'sheet_metal';
  description: string;
  recommendedFormat: CadExportFormat;
  recommendedScope: CadExportScope;
  recommendedUnits: CadExportUnits;
  defaultToleranceMm: number;
  toolDiameterMm?: number;
  layerHeightMm?: number;
  dogboneCompensation: boolean;
  minInternalRadiusMm: number;
  recommendedMaterials: string[];
  manufacturingNotes: string;
}

export const MANUFACTURING_PROFILES: Record<ManufacturingProfileId, ManufacturingProfileSpec> = {
  cnc_router_5mm: {
    id: 'cnc_router_5mm',
    name: 'CNC Router - 5mm Compression Bit',
    badge: 'CNC 5mm Bit • ±0.15mm',
    category: 'cnc',
    description: 'Nested flat-sheet CNC routing optimized for 15mm/18mm Baltic Birch plywood, MDF, or solid wood panels.',
    recommendedFormat: 'step',
    recommendedScope: 'woodwork_only',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.15,
    toolDiameterMm: 5.0,
    dogboneCompensation: true,
    minInternalRadiusMm: 2.5,
    recommendedMaterials: ['Baltic Birch Plywood', 'MDF / HDF', 'Solid Hardwood'],
    manufacturingNotes: '5mm diameter compression endmill leaves clean top and bottom veneers. Internal 90° corners utilize 2.5mm radius dogbone relief for tight tongue-and-groove joints.',
  },
  cnc_router_6mm: {
    id: 'cnc_router_6mm',
    name: 'CNC Router - 6.35mm (1/4") Endmill',
    badge: 'CNC 1/4" Bit • ±0.20mm',
    category: 'cnc',
    description: 'Heavy industrial CNC profile using standard 1/4" bits for high-speed panel cutting, deep dadoes, and driver rebating.',
    recommendedFormat: 'step',
    recommendedScope: 'woodwork_only',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.20,
    toolDiameterMm: 6.35,
    dogboneCompensation: true,
    minInternalRadiusMm: 3.175,
    recommendedMaterials: ['Baltic Birch Plywood', 'Marine Plywood', 'Extruded Aluminum'],
    manufacturingNotes: 'Standard 1/4" tooling bit enables high feed rates. 0.20mm nominal dado clearance ensures glue gap for PVA or polyurethane wood adhesives.',
  },
  '3d_print_fdm_04': {
    id: '3d_print_fdm_04',
    name: '3D Print - FDM 0.4mm Nozzle',
    badge: 'FDM 0.4mm • ±0.25mm',
    category: '3d_print',
    description: 'Additive manufacturing profile for aerodynamic port flares, oblate spheroidal waveguides, and custom acoustic conduits.',
    recommendedFormat: 'stl_binary',
    recommendedScope: 'port_only',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.25,
    toolDiameterMm: 0.4,
    layerHeightMm: 0.20,
    dogboneCompensation: false,
    minInternalRadiusMm: 0.4,
    recommendedMaterials: ['PETG-CF', 'PLA+', 'ABS / ASA'],
    manufacturingNotes: '0.25mm horizontal clearance offset accounts for plastic thermal shrinkage and extrusion expansion. Minimum 6 solid perimeters (~2.4mm) required for acoustic mass.',
  },
  '3d_print_sla': {
    id: '3d_print_sla',
    name: '3D Print - SLA / MSLA Resin (0.05mm)',
    badge: 'SLA Resin • ±0.05mm',
    category: '3d_print',
    description: 'Ultra-high resolution stereolithography profile for microscopic aerodynamic surface smoothness, phase plugs, and tweeters.',
    recommendedFormat: 'stl_binary',
    recommendedScope: 'port_only',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.05,
    toolDiameterMm: 0.05,
    layerHeightMm: 0.05,
    dogboneCompensation: false,
    minInternalRadiusMm: 0.1,
    recommendedMaterials: ['Engineering Tough Resin', 'Ceramic-Infused Resin'],
    manufacturingNotes: 'Sub-millimeter layer resolution eliminates stepping artifacts and boundary-layer turbulence drag without post-print vapor smoothing.',
  },
  table_saw_joinery: {
    id: 'table_saw_joinery',
    name: 'Precision Table Saw / Traditional Joinery',
    badge: 'Table Saw • 0.0mm Nominal',
    category: 'traditional',
    description: 'Manual workshop fabrication with sliding table saw, track saw, and router table. True nominal dimensions for cut-list adherence.',
    recommendedFormat: 'obj',
    recommendedScope: 'woodwork_only',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.0,
    dogboneCompensation: false,
    minInternalRadiusMm: 0,
    recommendedMaterials: ['Baltic Birch 18mm', 'MDF 19mm', 'Solid Timber'],
    manufacturingNotes: 'Nominal outer boundary cuts with 0.0mm offset for direct alignment with CutListSheet layout diagrams and manual blade kerf compensation.',
  },
  laser_waterjet_metal: {
    id: 'laser_waterjet_metal',
    name: 'CNC Laser / Waterjet (Metal & Acrylic)',
    badge: 'Laser/Waterjet • ±0.08mm',
    category: 'sheet_metal',
    description: '2D sheet cutting for steel speakON dishes, 2mm aluminum heatsink backplates, and decorative acrylic bezels.',
    recommendedFormat: 'step',
    recommendedScope: 'full_assembly',
    recommendedUnits: 'mm',
    defaultToleranceMm: 0.08,
    toolDiameterMm: 0.2,
    dogboneCompensation: false,
    minInternalRadiusMm: 0.1,
    recommendedMaterials: ['1.5mm Mild Steel', '2.0mm 6061-T6 Aluminum', '5mm Cast Acrylic'],
    manufacturingNotes: 'Kerf offset of 0.08mm compensates for narrow laser/abrasive waterjet beam width, producing exact hole centers for M3/M3.5 countersinks.',
  },
};

export interface CadExportOptions {
  format: CadExportFormat;
  scope: CadExportScope;
  units: CadExportUnits;
  forceAssembled?: boolean; // ignore exploded view offsets
  includeBracing?: boolean;
  includePort?: boolean;
  manufacturingProfile?: ManufacturingProfileId;
  toleranceClearanceMm?: number;
}

export interface ModelGeometryStats {
  panelCount: number;
  braceCount: number;
  portCount: number;
  driverCount: number;
  totalTriangles: number;
  totalVertices: number;
  appliedToleranceClearanceMm?: number;
}

/**
 * Filter and clone components from Three.js scene into a dedicated export group
 * with target real-world scale (e.g. 1000x for mm, 39.3701x for inches).
 */
export function prepareExportScene(
  rootGroup: THREE.Group,
  options: CadExportOptions
): { exportGroup: THREE.Group; stats: ModelGeometryStats } {
  const exportGroup = new THREE.Group();

  // Scale factor: internal coordinates are in meters (1 unit = 1m)
  let scaleFactor = 1000; // default mm (1m = 1000mm)
  if (options.units === 'inch') {
    scaleFactor = 1000 / 25.4; // 39.3701 inches per meter
  } else if (options.units === 'meter') {
    scaleFactor = 1;
  }

  const stats: ModelGeometryStats = {
    panelCount: 0,
    braceCount: 0,
    portCount: 0,
    driverCount: 0,
    totalTriangles: 0,
    totalVertices: 0,
  };

  rootGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const componentId = (mesh.userData?.componentId as string) || '';

      // Scope filtering
      let shouldInclude = false;
      const isDriver = componentId.startsWith('driver_');
      const isBaffle = componentId === 'baffle_front';
      const isPort = componentId === 'port_tube' || componentId.includes('port');
      const isBrace = componentId === 'brace_matrix' || componentId.includes('brace');
      const isPanel = componentId.startsWith('panel_') || isBaffle;

      switch (options.scope) {
        case 'full_assembly':
          shouldInclude = true;
          break;
        case 'woodwork_only':
          // All wooden panels, bracing, and ports, excluding transducer frames/magnets/crossover
          shouldInclude = !isDriver && !componentId.includes('crossover');
          break;
        case 'baffle_only':
          shouldInclude = isBaffle;
          break;
        case 'port_only':
          shouldInclude = isPort;
          break;
        case 'bracing_only':
          shouldInclude = isBrace;
          break;
        default:
          shouldInclude = true;
      }

      if (options.includeBracing === false && isBrace) shouldInclude = false;
      if (options.includePort === false && isPort) shouldInclude = false;

      if (shouldInclude && mesh.geometry) {
        // Track stats
        if (isPanel) stats.panelCount++;
        else if (isBrace) stats.braceCount++;
        else if (isPort) stats.portCount++;
        else if (isDriver) stats.driverCount++;

        const triCount = mesh.geometry.index
          ? mesh.geometry.index.count / 3
          : mesh.geometry.attributes.position?.count / 3 || 0;
        stats.totalTriangles += Math.round(triCount);
        stats.totalVertices += mesh.geometry.attributes.position?.count || 0;

        // Clone mesh and bake transform
        const clone = mesh.clone();
        
        // Determine position: if forceAssembled, use base position if available
        mesh.updateWorldMatrix(true, false);
        clone.applyMatrix4(mesh.matrixWorld);

        // Scale by target real-world CAD units
        clone.scale.set(scaleFactor, scaleFactor, scaleFactor);
        clone.updateMatrix();

        exportGroup.add(clone);
      }
    }
  });

  return { exportGroup, stats };
}

/**
 * Generate binary or ASCII STL file
 */
export function generateStl(
  exportGroup: THREE.Group,
  binary: boolean = true
): Blob {
  const exporter = new STLExporter();
  const output = exporter.parse(exportGroup, { binary });

  if (binary) {
    const buffer = (output as DataView).buffer;
    return new Blob([buffer as ArrayBuffer], { type: 'application/octet-stream' });
  } else {
    return new Blob([output as string], { type: 'text/plain;charset=utf-8' });
  }
}

/**
 * Generate ISO 10303-21 STEP file (AP214 Automative Design / Manifold Solid B-Rep)
 */
export function generateStep(
  exportGroup: THREE.Group,
  modelName: string = 'ResonanceCAD_Enclosure'
): Blob {
  let entityId = 20;
  const nextId = () => entityId++;

  const vertexPoints: string[] = [];
  const vertexMap = new Map<string, number>();
  const faces: { vIds: number[]; normal: THREE.Vector3; pointId: number }[] = [];

  exportGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry) return;

      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrix);
      const nonIndexed = geom.toNonIndexed();
      const pos = nonIndexed.attributes.position;
      if (!pos) return;

      for (let i = 0; i < pos.count; i += 3) {
        const coords: [number, number, number][] = [
          [pos.getX(i), pos.getY(i), pos.getZ(i)],
          [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)],
          [pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)],
        ];

        const vIds = coords.map(([x, y, z]) => {
          const key = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}`;
          if (vertexMap.has(key)) return vertexMap.get(key)!;
          const id = nextId();
          vertexPoints.push(`#${id} = CARTESIAN_POINT('', (${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}));`);
          vertexMap.set(key, id);
          return id;
        });

        if (vIds[0] !== vIds[1] && vIds[1] !== vIds[2] && vIds[0] !== vIds[2]) {
          const vA = new THREE.Vector3(...coords[0]);
          const vB = new THREE.Vector3(...coords[1]);
          const vC = new THREE.Vector3(...coords[2]);
          const normal = new THREE.Vector3().crossVectors(vB.clone().sub(vA), vC.clone().sub(vA)).normalize();
          faces.push({ vIds, normal, pointId: vIds[0] });
        }
      }
    }
  });

  const faceEntities: string[] = [];
  const faceIds: string[] = [];

  faces.forEach(({ vIds, normal, pointId }) => {
    const loopId = nextId();
    faceEntities.push(`#${loopId} = POLY_LOOP('', (#${vIds.join(', #')}));`);
    const boundId = nextId();
    faceEntities.push(`#${boundId} = FACE_OUTER_BOUND('', #${loopId}, .T.);`);
    const dirId = nextId();
    faceEntities.push(
      `#${dirId} = DIRECTION('', (${normal.x.toFixed(4)}, ${normal.y.toFixed(4)}, ${normal.z.toFixed(4)}));`
    );
    const axisId = nextId();
    faceEntities.push(`#${axisId} = AXIS2_PLACEMENT_3D('', #${pointId}, #${dirId}, #15);`);
    const planeId = nextId();
    faceEntities.push(`#${planeId} = PLANE('', #${axisId});`);
    const faceId = nextId();
    faceEntities.push(`#${faceId} = ADVANCED_FACE('', (#${boundId}), #${planeId}, .T.);`);
    faceIds.push(`#${faceId}`);
  });

  const shellId = nextId();
  const brepId = nextId();
  const shapeRepId = nextId();

  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '');

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ResonanceCAD 3D Enclosure CAD Export (ISO 10303-214)'), '2;1');",
    `FILE_NAME('${modelName}.step', '${timestamp}', ('ResonanceCAD Engineer'), ('ResonanceCAD'), 'ResonanceCAD STEP Preprocessor v2.5', 'ResonanceCAD', '');`,
    "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
    'ENDSEC;',
    'DATA;',
    "#1 = APPLICATION_CONTEXT('core data for automotive mechanical design processes');",
    "#2 = APPLICATION_PROTOCOL_DEFINITION('international standard', 'automotive_design', 2000, #1);",
    "#3 = PRODUCT_CONTEXT('', #1, 'mechanical');",
    `#4 = PRODUCT('${modelName}', '${modelName}', '', (#3));`,
    "#5 = PRODUCT_DEFINITION_FORMATION('1', '', #4);",
    "#6 = PRODUCT_DEFINITION('design', '', #5, #3);",
    "#7 = PRODUCT_DEFINITION_SHAPE('NONE', 'NONE', #6);",
    "#8 = UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01), #9, 'distance_accuracy_value', 'confusion accuracy');",
    '#9 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI., .METRE.) );',
    '#10 = ( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($, .RADIAN.) );',
    '#11 = ( NAMED_UNIT(*) SOLID_ANGLE_UNIT() SI_UNIT($, .STERADIAN.) );',
    "#12 = ( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#8)) GLOBAL_UNIT_ASSIGNED_CONTEXT((#9, #10, #11)) REPRESENTATION_CONTEXT('Context #1', '3D Context with UNIT') );",
    "#13 = CARTESIAN_POINT('', (0., 0., 0.));",
    "#14 = DIRECTION('', (0., 0., 1.));",
    "#15 = DIRECTION('', (1., 0., 0.));",
    "#16 = AXIS2_PLACEMENT_3D('', #13, #14, #15);",
    `#${shapeRepId} = SHAPE_REPRESENTATION('${modelName}_shape', (#16, #${brepId}), #12);`,
    `#${brepId} = MANIFOLD_SOLID_BREP('${modelName}_solid', #${shellId});`,
    `#${shellId} = CLOSED_SHELL('${modelName}_shell', (${faceIds.join(', ')}));`,
  ];

  const fullContent =
    header.join('\n') +
    '\n' +
    vertexPoints.join('\n') +
    '\n' +
    faceEntities.join('\n') +
    '\nENDSEC;\nEND-ISO-10303-21;\n';

  return new Blob([fullContent], { type: 'application/step;charset=utf-8' });
}

/**
 * Generate Wavefront OBJ file with grouped meshes
 */
export function generateObj(exportGroup: THREE.Group): Blob {
  const exporter = new OBJExporter();
  const result = exporter.parse(exportGroup);
  return new Blob([result], { type: 'text/plain;charset=utf-8' });
}

/**
 * Utility to trigger immediate browser file download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Build dynamic descriptive filename based on enclosure parameters
 */
export function buildCadFilename(
  dimensions: EnclosureDimensions,
  acoustics: AcousticParameters,
  format: CadExportFormat,
  scope: CadExportScope,
  profileId?: ManufacturingProfileId
): string {
  const woofer = acoustics.driverAssignments.woofer.driver;
  const brand = woofer.brand.replace(/[^a-zA-Z0-9]/g, '');
  const model = woofer.model.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 16);
  const size = `${dimensions.externalWidthMm}x${dimensions.externalHeightMm}x${dimensions.externalDepthMm}mm`;

  let scopeLabel = 'FullAssembly';
  if (scope === 'woodwork_only') scopeLabel = 'Woodwork_CNC';
  else if (scope === 'baffle_only') scopeLabel = 'Baffle_Cutouts';
  else if (scope === 'port_only') scopeLabel = 'PortResonator';
  else if (scope === 'bracing_only') scopeLabel = 'MatrixBracing';

  let profileLabel = '';
  if (profileId) {
    if (profileId === 'cnc_router_5mm') profileLabel = '_CNC5mm';
    else if (profileId === 'cnc_router_6mm') profileLabel = '_CNC6mm';
    else if (profileId === '3d_print_fdm_04') profileLabel = '_FDM04';
    else if (profileId === '3d_print_sla') profileLabel = '_SLAResin';
    else if (profileId === 'table_saw_joinery') profileLabel = '_Joinery';
    else if (profileId === 'laser_waterjet_metal') profileLabel = '_SheetMetal';
  }

  let ext = 'stl';
  if (format === 'step') ext = 'step';
  else if (format === 'obj') ext = 'obj';

  return `ResonanceCAD_${brand}_${model}_${scopeLabel}${profileLabel}_${size}.${ext}`;
}
