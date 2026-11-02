import type {
  AcousticParameters,
  EnclosureDimensions,
  SpeakerCategory,
  SpeakerSubcategory,
} from '../types/loudspeaker.ts';
import { DRIVER_PRESETS } from './acousticEngine.ts';

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  category: SpeakerCategory;
  subcategory: SpeakerSubcategory;
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  tags?: string[];
  isFavorite?: boolean;
}

const STORAGE_KEY = 'resonance_cad_projects_v1';
const ACTIVE_PROJECT_KEY = 'resonance_cad_active_project_id';

// Default starter project templates
export const STARTER_PROJECT_TEMPLATES: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Purifi PTT6.5 Nearfield Studio Reference',
    description: 'Ultra-low distortion 2-way reference monitor tuned to 38Hz in an 18mm Baltic Birch cabinet.',
    category: 'studio_monitor',
    subcategory: 'nearfield_2way',
    tags: ['Nearfield', 'Purifi', 'Hi-Fi Reference'],
    dimensions: {
      externalWidthMm: 240,
      externalHeightMm: 380,
      externalDepthMm: 300,
      material: 'baltic_birch_18',
      baffleThicknessMm: 18,
      jointType: 'miter',
      category: 'studio_monitor',
      subcategory: 'nearfield_2way',
    },
    acoustics: {
      topology: 'two_way',
      driverAssignments: {
        woofer: {
          role: 'woofer',
          driver: DRIVER_PRESETS.find((d) => d.id === 'purifi_ptt65') || DRIVER_PRESETS[0],
          quantity: 1,
          impedanceOhm: 4,
          attenuationDb: 0,
        },
        tweeter: {
          role: 'tweeter',
          driver: DRIVER_PRESETS.find((d) => d.id === 'scanspeak_d3004') || DRIVER_PRESETS[4],
          quantity: 1,
          impedanceOhm: 4,
          attenuationDb: 2.5,
        },
        midrange: {
          role: 'midrange',
          driver: DRIVER_PRESETS[6],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
      },
      alignment: 'ported',
      targetQtc: 0.707,
      targetFb: 38,
      portType: 'round',
      portPlacement: 'front_bottom',
      portDiameterMm: 65,
      flareRadiusMm: 16,
      isDoubleFlared: true,
      slotWidthMm: 200,
      slotHeightMm: 30,
      slotLipRadiusMm: 12,
      numberOfPorts: 1,
      dampingFillPercent: 60,
      bracingLevel: 'standard',
      crossoverLowHz: 2200,
      crossoverHighHz: 3500,
      lowPassOrder: 2,
      lowPassType: 'linkwitz_riley',
      highPassOrder: 2,
      highPassType: 'linkwitz_riley',
    },
  },
  {
    name: 'Dayton RSS265HF Sealed Studio Subwoofer 10"',
    description: 'Compact 10-inch sealed active studio subwoofer with Qtc=0.707 critical damping.',
    category: 'studio_sub',
    subcategory: 'sealed_precision',
    tags: ['Subwoofer', 'Sealed', 'Studio Bass'],
    dimensions: {
      externalWidthMm: 360,
      externalHeightMm: 380,
      externalDepthMm: 380,
      material: 'mdf_19',
      baffleThicknessMm: 25,
      jointType: 'rabbet',
      category: 'studio_sub',
      subcategory: 'sealed_precision',
    },
    acoustics: {
      topology: 'single',
      driverAssignments: {
        woofer: {
          role: 'woofer',
          driver: DRIVER_PRESETS.find((d) => d.id === 'dayton_rss265hf') || DRIVER_PRESETS[1],
          quantity: 1,
          impedanceOhm: 4,
          attenuationDb: 0,
        },
        tweeter: {
          role: 'tweeter',
          driver: DRIVER_PRESETS[4],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
        midrange: {
          role: 'midrange',
          driver: DRIVER_PRESETS[6],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
      },
      alignment: 'sealed',
      targetQtc: 0.707,
      targetFb: 32,
      portType: 'round',
      portPlacement: 'auto',
      portDiameterMm: 80,
      flareRadiusMm: 16,
      isDoubleFlared: true,
      slotWidthMm: 290,
      slotHeightMm: 45,
      slotLipRadiusMm: 12,
      numberOfPorts: 1,
      dampingFillPercent: 80,
      bracingLevel: 'heavy',
      crossoverLowHz: 80,
      crossoverHighHz: 120,
      lowPassOrder: 4,
      lowPassType: 'linkwitz_riley',
      highPassOrder: 2,
      highPassType: 'butterworth',
    },
  },
  {
    name: 'B&C 18SW115 High-Output Live Sub 18"',
    description: 'Touring 18-inch bass reflex subwoofer rated for 1700W AES continuous power.',
    category: 'live_sub',
    subcategory: 'single_18_reflex',
    tags: ['Live Rig', '18-Inch', 'PA Sub', 'Touring'],
    dimensions: {
      externalWidthMm: 580,
      externalHeightMm: 780,
      externalDepthMm: 680,
      material: 'baltic_birch_18',
      baffleThicknessMm: 25,
      jointType: 'rabbet',
      category: 'live_sub',
      subcategory: 'single_18_reflex',
    },
    acoustics: {
      topology: 'single',
      driverAssignments: {
        woofer: {
          role: 'woofer',
          driver: DRIVER_PRESETS.find((d) => d.id === 'bc_18sw115') || DRIVER_PRESETS[2],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
        tweeter: {
          role: 'tweeter',
          driver: DRIVER_PRESETS[4],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
        midrange: {
          role: 'midrange',
          driver: DRIVER_PRESETS[6],
          quantity: 1,
          impedanceOhm: 8,
          attenuationDb: 0,
        },
      },
      alignment: 'ported',
      targetQtc: 0.707,
      targetFb: 32,
      portType: 'slot',
      portPlacement: 'front_bottom',
      portDiameterMm: 120,
      flareRadiusMm: 25,
      isDoubleFlared: true,
      slotWidthMm: 520,
      slotHeightMm: 80,
      slotLipRadiusMm: 20,
      numberOfPorts: 1,
      dampingFillPercent: 20,
      bracingLevel: 'heavy',
      crossoverLowHz: 90,
      crossoverHighHz: 120,
      lowPassOrder: 4,
      lowPassType: 'linkwitz_riley',
      highPassOrder: 4,
      highPassType: 'butterworth',
    },
  },
];

export function getProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialProjects: ProjectRecord[] = STARTER_PROJECT_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `project_seed_${idx + 1}`,
        createdAt: new Date(Date.now() - (3 - idx) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - (3 - idx) * 3600000).toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProjects));
      return initialProjects;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load projects from localStorage:', err);
    return [];
  }
}

export function saveProject(
  project: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): ProjectRecord {
  const projects = getProjects();
  const now = new Date().toISOString();

  let savedRecord: ProjectRecord;
  if (project.id) {
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      savedRecord = {
        ...projects[index],
        ...project,
        updatedAt: now,
      };
      projects[index] = savedRecord;
    } else {
      savedRecord = {
        ...project,
        id: project.id,
        createdAt: now,
        updatedAt: now,
      };
      projects.unshift(savedRecord);
    }
  } else {
    savedRecord = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    projects.unshift(savedRecord);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  setActiveProjectId(savedRecord.id);
  return savedRecord;
}

export function deleteProject(id: string): boolean {
  try {
    const projects = getProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    if (getActiveProjectId() === id) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
    return true;
  } catch (err) {
    console.error('Failed to delete project:', err);
    return false;
  }
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function exportProjectFile(project: ProjectRecord): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${safeName}.rescad`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAllProjectsFile(projects: ProjectRecord[]): void {
  const jsonStr = JSON.stringify(projects, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `resonance_cad_all_projects_${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importProjectFromFile(file: File): Promise<ProjectRecord> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
          let lastSaved: ProjectRecord | null = null;
          for (const item of parsed) {
            if (item.dimensions && item.acoustics) {
              lastSaved = saveProject({
                name: item.name || 'Imported Design',
                description: item.description || '',
                category: item.category || item.dimensions.category || 'studio_monitor',
                subcategory: item.subcategory || item.dimensions.subcategory || 'nearfield_2way',
                dimensions: item.dimensions,
                acoustics: item.acoustics,
                tags: item.tags || ['Imported'],
              });
            }
          }
          if (lastSaved) {
            resolve(lastSaved);
            return;
          }
          throw new Error('No valid project entries found in JSON array.');
        }

        if (!parsed.dimensions || !parsed.acoustics) {
          throw new Error('Invalid project file: missing dimensions or acoustics configuration.');
        }

        const projectToSave = {
          name: parsed.name || file.name.replace(/\.(json|rescad)$/i, ''),
          description: parsed.description || 'Imported project configuration',
          category: parsed.category || parsed.dimensions.category || 'studio_monitor',
          subcategory: parsed.subcategory || parsed.dimensions.subcategory || 'nearfield_2way',
          dimensions: parsed.dimensions,
          acoustics: parsed.acoustics,
          tags: parsed.tags || ['Imported'],
        };

        const saved = saveProject(projectToSave);
        resolve(saved);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse project file.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsText(file);
  });
}
