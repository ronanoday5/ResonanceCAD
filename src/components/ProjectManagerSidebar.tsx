import React, { useEffect, useRef, useState } from 'react';
import type {
  AcousticParameters,
  EnclosureDimensions,
  SpeakerCategory,
} from '../types/loudspeaker.ts';
import { CATEGORY_SPECS } from '../types/loudspeaker.ts';
import {
  deleteProject,
  exportAllProjectsFile,
  exportProjectFile,
  getProjects,
  importProjectFromFile,
  saveProject,
  setActiveProjectId,
  type ProjectRecord,
} from '../services/projectStore.ts';
import {
  Box,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FilePlus,
  FolderKanban,
  HardDrive,
  Info,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';

interface ProjectManagerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentDimensions: EnclosureDimensions;
  currentAcoustics: AcousticParameters;
  activeProjectId: string | null;
  onLoadProject: (project: ProjectRecord) => void;
  onSaveSuccess: (msg: string) => void;
  onOpenSetupWizard?: () => void;
}

export const ProjectManagerSidebar: React.FC<ProjectManagerSidebarProps> = ({
  isOpen,
  onClose,
  currentDimensions,
  currentAcoustics,
  activeProjectId,
  onLoadProject,
  onSaveSuccess,
  onOpenSetupWizard,
}) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<SpeakerCategory | 'all'>('all');

  // Modals & form state inside manager
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsDesc, setSaveAsDesc] = useState('');

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshProjects = () => {
    const list = getProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshProjects();
    }
  }, [isOpen]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleQuickSaveActive = () => {
    if (!activeProject) {
      setIsSaveModalOpen(true);
      setSaveAsName(
        `${(currentDimensions.category || 'studio_monitor').replace('_', ' ').toUpperCase()} ${currentDimensions.externalWidthMm}x${currentDimensions.externalHeightMm}`
      );
      setSaveAsDesc('');
      return;
    }

    const updated = saveProject({
      ...activeProject,
      id: activeProject.id,
      dimensions: currentDimensions,
      acoustics: currentAcoustics,
      category: currentDimensions.category || 'studio_monitor',
      subcategory: currentDimensions.subcategory || 'nearfield_2way',
    });

    refreshProjects();
    onSaveSuccess(`Updated project: "${updated.name}"`);
  };

  const handleSaveAsNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsName.trim()) return;

    const saved = saveProject({
      name: saveAsName.trim(),
      description: saveAsDesc.trim(),
      category: currentDimensions.category || 'studio_monitor',
      subcategory: currentDimensions.subcategory || 'nearfield_2way',
      dimensions: currentDimensions,
      acoustics: currentAcoustics,
      tags: ['Custom Design'],
    });

    setIsSaveModalOpen(false);
    refreshProjects();
    onSaveSuccess(`Saved project: "${saved.name}"`);
  };

  const handleDuplicate = (project: ProjectRecord) => {
    const duplicated = saveProject({
      name: `${project.name} (Copy)`,
      description: project.description,
      category: project.category,
      subcategory: project.subcategory,
      dimensions: project.dimensions,
      acoustics: project.acoustics,
      tags: project.tags,
    });

    refreshProjects();
    onSaveSuccess(`Duplicated as "${duplicated.name}"`);
  };

  const handleStartEditing = (project: ProjectRecord) => {
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditDesc(project.description || '');
  };

  const handleSaveEditedDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId || !editName.trim()) return;

    const target = projects.find((p) => p.id === editingProjectId);
    if (target) {
      saveProject({
        ...target,
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setEditingProjectId(null);
      refreshProjects();
      onSaveSuccess(`Updated details for "${editName.trim()}"`);
    }
  };

  const handleDelete = (id: string) => {
    const target = projects.find((p) => p.id === id);
    deleteProject(id);
    setDeleteConfirmId(null);
    refreshProjects();
    onSaveSuccess(`Deleted project: "${target?.name || 'Project'}"`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const imported = await importProjectFromFile(files[0]);
      refreshProjects();
      onLoadProject(imported);
      onSaveSuccess(`Imported & loaded project: "${imported.name}"`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import project file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.acoustics.driverAssignments.woofer.driver.brand.toLowerCase().includes(q) ||
      p.acoustics.driverAssignments.woofer.driver.model.toLowerCase().includes(q);

    return matchesCategory && matchesQuery;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in font-sans">
      {/* Invisible backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sidebar Panel */}
      <div className="relative w-full max-w-xl h-full bg-[#0d1017] border-l border-slate-800 shadow-2xl flex flex-col z-10 text-slate-200">
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#080a0f] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase font-mono text-slate-100 flex items-center gap-2">
                <span>Project Manager</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                  {projects.length} Saved
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Browser-stored enclosure files, custom projects & templates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active CAD Design Ribbon */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-slate-400">Active Design:</span>
            <span className="text-cyan-300 font-bold truncate">
              {activeProject ? activeProject.name : 'Unsaved Enclosure Session'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeProject && (
              <button
                onClick={handleQuickSaveActive}
                className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
                title="Save current CAD adjustments to active project"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            )}

            {onOpenSetupWizard && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onOpenSetupWizard();
                }}
                className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-600/80 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                title="Launch Speaker Setup Wizard to synthesize a new design"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Setup Wizard</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsSaveModalOpen(true);
                setSaveAsName(
                  activeProject
                    ? `${activeProject.name} (Rev 2)`
                    : `${(currentDimensions.category || 'studio_monitor').replace('_', ' ').toUpperCase()} Design`
                );
                setSaveAsDesc(activeProject?.description || '');
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition cursor-pointer flex items-center gap-1"
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save As New...</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-3 border-b border-slate-800/80 space-y-2.5 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects by name, woofer model or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Hidden File Input for Import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".rescad,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import .RESCAD or project JSON file from disk"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono select-none">
            {(
              [
                ['all', 'All Files'],
                ['studio_monitor', 'Monitors'],
                ['studio_sub', 'Studio Subs'],
                ['live_top', 'Live Tops'],
                ['live_sub', 'Live Subs'],
              ] as const
            ).map(([catKey, label]) => (
              <button
                key={catKey}
                onClick={() => setSelectedCategoryFilter(catKey as any)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer shrink-0 ${
                  selectedCategoryFilter === catKey
                    ? 'bg-cyan-950 border border-cyan-600 text-cyan-200 font-bold'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <FolderKanban className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No project files found matching filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('all');
                }}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const isLoaded = activeProjectId === project.id;
              const catSpec = CATEGORY_SPECS[project.category] || CATEGORY_SPECS.studio_monitor;
              const isEditingThis = editingProjectId === project.id;
              const isConfirmingDelete = deleteConfirmId === project.id;

              return (
                <div
                  key={project.id}
                  className={`relative rounded-xl border transition-all overflow-hidden ${
                    isLoaded
                      ? 'bg-slate-900/90 border-cyan-500/80 shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header Bar */}
                  <div className="p-3 pb-2 flex items-start justify-between gap-2 border-b border-slate-800/80">
                    <div className="space-y-1 flex-1 min-w-0">
                      {isEditingThis ? (
                        <form onSubmit={handleSaveEditedDetails} className="space-y-2 py-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-bold font-sans"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="Optional description..."
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-sans"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[10px] font-mono cursor-pointer"
                            >
                              Save Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProjectId(null)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] font-mono cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold font-sans text-slate-100 truncate">
                              {project.name}
                            </h3>

                            {isLoaded && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-700 shrink-0">
                                ACTIVE CAD
                              </span>
                            )}
                          </div>

                          {project.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 border"
                      style={{
                        backgroundColor: `${catSpec.accentColor}18`,
                        borderColor: `${catSpec.accentColor}60`,
                        color: catSpec.accentColor,
                      }}
                    >
                      {catSpec.badge}
                    </span>
                  </div>

                  {/* Telemetry Summary Strip */}
                  <div className="p-2.5 bg-slate-900/40 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] border-b border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block text-[9px]">WOOFER MODEL</span>
                      <span className="text-slate-200 font-bold truncate block">
                        {project.acoustics.driverAssignments.woofer.driver.brand}{' '}
                        {project.acoustics.driverAssignments.woofer.driver.model}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px]">NET VOLUME Vb</span>
                      <span className="text-cyan-300 font-bold">
                        {((project.dimensions.externalWidthMm * project.dimensions.externalHeightMm * project.dimensions.externalDepthMm) / 1000000 * 0.72).toFixed(1)} L
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px]">TUNING Fb</span>
                      <span className="text-amber-300 font-bold">
                        {project.acoustics.alignment === 'ported' ? `${project.acoustics.targetFb} Hz` : 'Sealed'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px]">DIMENSIONS</span>
                      <span className="text-slate-300 text-[10px]">
                        {project.dimensions.externalWidthMm}×{project.dimensions.externalHeightMm}×{project.dimensions.externalDepthMm}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer & Action Buttons */}
                  <div className="p-2 bg-slate-950 flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[10px] text-slate-500">
                      Mod: {new Date(project.updatedAt).toLocaleDateString()} {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/90 p-1 rounded border border-rose-800">
                        <span className="text-[10px] text-rose-200 font-bold px-1">Delete project?</span>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {!isLoaded && (
                          <button
                            onClick={() => {
                              setActiveProjectId(project.id);
                              onLoadProject(project);
                              onSaveSuccess(`Loaded project: "${project.name}"`);
                            }}
                            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-100" />
                            <span>Load into CAD</span>
                          </button>
                        )}

                        {isLoaded && (
                          <button
                            onClick={handleQuickSaveActive}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs transition cursor-pointer flex items-center gap-1"
                            title="Overwrite this saved project file with current CAD parameters"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save Over</span>
                          </button>
                        )}

                        <button
                          onClick={() => exportProjectFile(project)}
                          title="Download .RESCAD JSON file"
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(project)}
                          title="Duplicate this project"
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartEditing(project)}
                          title="Edit name or description"
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(project.id)}
                          title="Delete saved project"
                          className="p-1 rounded bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#080a0f] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Local Storage Active • {projects.length} Files Preserved</span>
          </div>

          <button
            onClick={() => exportAllProjectsFile(projects)}
            className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Backup All (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Save As Modal Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="bg-[#0e121a] border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-100">
                  Save Enclosure Project
                </h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsNewSubmit} className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nearfield Monitor Rev 2"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional design details, target Qtc, room application, or tuning goals..."
                  value={saveAsDesc}
                  onChange={(e) => setSaveAsDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-sans resize-none"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                <div className="text-cyan-400 font-bold">Snapshot Telemetry:</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                  <div>
                    Category: <strong className="text-slate-200">{currentDimensions.category}</strong>
                  </div>
                  <div>
                    Dimensions:{' '}
                    <strong className="text-slate-200">
                      {currentDimensions.externalWidthMm}×{currentDimensions.externalHeightMm}×{currentDimensions.externalDepthMm}mm
                    </strong>
                  </div>
                  <div>
                    Woofer:{' '}
                    <strong className="text-slate-200">
                      {currentAcoustics.driverAssignments.woofer.driver.brand}{' '}
                      {currentAcoustics.driverAssignments.woofer.driver.model}
                    </strong>
                  </div>
                  <div>
                    Tuning:{' '}
                    <strong className="text-slate-200">
                      {currentAcoustics.alignment === 'ported' ? `${currentAcoustics.targetFb} Hz` : 'Sealed'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-xs shadow-md cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
