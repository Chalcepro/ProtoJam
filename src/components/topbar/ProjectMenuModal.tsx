import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { STARTER_PROJECTS } from '../../presets/starterProjects';
import * as Icons from 'lucide-react';

export const ProjectMenuModal: React.FC = () => {
  const {
    isProjectMenuOpen,
    closeProjectMenu,
    projectName,
    setProjectName,
    saveCurrentProject,
    saveAsFile,
    createNewProject,
    loadProjectFromData,
    loadSavedProjectById,
    deleteSavedProjectById,
    savedProjects,
    loadStarterProject,
    frames,
    elements,
    isSaved,
    lastSavedAt
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'files' | 'saved' | 'templates' | 'export'>('files');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Click outside modal to dismiss
  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeProjectMenu();
      }
    };
    // Slight delay to avoid catching the opening click
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [isProjectMenuOpen, closeProjectMenu]);

  // Escape key to dismiss
  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProjectMenu();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isProjectMenuOpen, closeProjectMenu]);

  if (!isProjectMenuOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProjectFromData(json);
      } catch (err) {
        alert('Failed to parse ProtoJam project file. Please verify the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectTitle.trim()) {
      createNewProject(newProjectTitle.trim());
      setIsCreatingNew(false);
      setNewProjectTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(20,20,19)]/85 backdrop-blur-xl p-4">
      {/* Modal Container — click-outside dismisses */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.12)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[rgb(235,235,236)] animate-in zoom-in-95 fade-in duration-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[rgb(235,235,236)] text-[rgb(20,20,19)] flex items-center justify-center font-black shadow-sm">
              <Icons.Layers size={15} />
            </div>
            <div>
              <h2 className="font-bold text-[13px] tracking-tight text-[rgb(235,235,236)]">
                ProtoJam
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-[rgba(235,235,236,0.45)]">
                <span className="truncate max-w-[180px] font-medium">{projectName}</span>
                <span className="w-1 h-1 rounded-full bg-[rgba(235,235,236,0.25)]" />
                {isSaved ? (
                  <span className="font-mono text-[rgba(235,235,236,0.4)]">Saved{lastSavedAt ? ` · ${lastSavedAt}` : ''}</span>
                ) : (
                  <span className="font-mono text-[rgba(235,235,236,0.6)]">Unsaved*</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[rgba(235,235,236,0.08)] px-6 bg-[rgba(235,235,236,0.01)] text-[11px]">
          {([
            { id: 'files' as const, label: 'File Actions', icon: Icons.FileCode },
            { id: 'saved' as const, label: 'Saved Projects', icon: Icons.FolderClock, count: savedProjects.length },
            { id: 'templates' as const, label: 'Templates', icon: Icons.Sparkles },
            { id: 'export' as const, label: 'Export', icon: Icons.Share2 },
          ]).map(tab => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 flex items-center gap-1.5 font-medium border-b-2 transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'border-[rgb(235,235,236)] text-[rgb(235,235,236)] font-semibold'
                    : 'border-transparent text-[rgba(235,235,236,0.4)] hover:text-[rgba(235,235,236,0.7)]'
                }`}
              >
                <IconComp size={13} />
                <span>{tab.label}</span>
                {tab.count && tab.count > 0 ? (
                  <span className="px-1.5 py-px rounded-full text-[9px] bg-[rgba(235,235,236,0.12)] text-[rgba(235,235,236,0.7)] font-mono">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          
          {/* TAB 1: FILE ACTIONS */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Save Project */}
                <div
                  onClick={() => saveCurrentProject()}
                  className="p-4 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] hover:border-[rgba(235,235,236,0.2)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.6)] group-hover:text-[rgb(235,235,236)] transition-colors">
                      <Icons.Save size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-[rgba(235,235,236,0.3)]">Ctrl+S</span>
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(235,235,236)] text-xs mb-0.5">Quick Save</div>
                    <div className="text-[10px] text-[rgba(235,235,236,0.4)] leading-relaxed">
                      Save to local workspace storage.
                    </div>
                  </div>
                </div>

                {/* Save as .protojam */}
                <div
                  onClick={() => saveAsFile()}
                  className="p-4 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] hover:border-[rgba(235,235,236,0.2)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.6)] group-hover:text-[rgb(235,235,236)] transition-colors">
                      <Icons.Download size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-[rgba(235,235,236,0.3)]">.protojam</span>
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(235,235,236)] text-xs mb-0.5">Save As File</div>
                    <div className="text-[10px] text-[rgba(235,235,236,0.4)] leading-relaxed">
                      Download standalone project file.
                    </div>
                  </div>
                </div>

                {/* Open File */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] hover:border-[rgba(235,235,236,0.2)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.6)] group-hover:text-[rgb(235,235,236)] transition-colors">
                      <Icons.FolderOpen size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-[rgba(235,235,236,0.3)]">Ctrl+O</span>
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(235,235,236)] text-xs mb-0.5">Open Project</div>
                    <div className="text-[10px] text-[rgba(235,235,236,0.4)] leading-relaxed">
                      Load a <code className="text-[rgba(235,235,236,0.6)]">.protojam</code> or JSON file.
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".protojam,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* New Project */}
                <div
                  onClick={() => setIsCreatingNew(true)}
                  className="p-4 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] hover:border-[rgba(235,235,236,0.2)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.6)] group-hover:text-[rgb(235,235,236)] transition-colors">
                      <Icons.Plus size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-[rgba(235,235,236,0.3)]">New</span>
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(235,235,236)] text-xs mb-0.5">New Blank Canvas</div>
                    <div className="text-[10px] text-[rgba(235,235,236,0.4)] leading-relaxed">
                      Start fresh with an empty workspace.
                    </div>
                  </div>
                </div>
              </div>

              {/* New Project Creator */}
              {isCreatingNew && (
                <form onSubmit={handleCreateSubmit} className="p-3.5 rounded-xl border border-[rgba(235,235,236,0.15)] bg-[rgba(235,235,236,0.03)] space-y-2.5">
                  <div className="font-semibold text-xs text-[rgb(235,235,236)]">Name Your Project</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="e.g. Acme Mobile App v2"
                      autoFocus
                      className="flex-1 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.15)] rounded-lg px-3 py-2 text-xs text-[rgb(235,235,236)] outline-none focus:border-[rgba(235,235,236,0.4)] transition-colors"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-2 rounded-lg bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.7)] text-xs hover:bg-[rgba(235,235,236,0.12)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Workspace Stats */}
              <div className="p-3.5 rounded-xl border border-[rgba(235,235,236,0.06)] bg-[rgba(235,235,236,0.015)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-[rgba(235,235,236,0.3)] uppercase tracking-wider mb-1">
                    Workspace
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <div><strong className="text-[rgb(235,235,236)]">{frames.length}</strong> <span className="text-[rgba(235,235,236,0.4)]">Screens</span></div>
                    <div><strong className="text-[rgb(235,235,236)]">{elements.length}</strong> <span className="text-[rgba(235,235,236,0.4)]">Elements</span></div>
                    <div><strong className="text-[rgb(235,235,236)]">{elements.reduce((acc, el) => acc + (el.interactions?.length || 0), 0)}</strong> <span className="text-[rgba(235,235,236,0.4)]">Links</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SAVED PROJECTS */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">
                  Saved Local Prototypes
                </span>
              </div>

              {savedProjects.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[rgba(235,235,236,0.08)] rounded-xl">
                  <Icons.FolderClock size={24} className="mx-auto mb-2 opacity-20 text-[rgb(235,235,236)]" />
                  <p className="text-[rgba(235,235,236,0.5)] font-medium text-[11px]">No saved projects yet</p>
                  <p className="text-[10px] text-[rgba(235,235,236,0.3)] mt-1">Use Quick Save to store your work.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.04)] transition-all duration-150 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.5)]">
                          <Icons.Smartphone size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-[rgb(235,235,236)] text-[11px]">{p.name}</div>
                          <div className="text-[9px] text-[rgba(235,235,236,0.35)] flex items-center gap-1.5 mt-0.5">
                            <span>{p.frameCount} Screens</span>
                            <span>·</span>
                            <span>{p.elementCount} Elements</span>
                            <span>·</span>
                            <span>{p.updatedAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => loadSavedProjectById(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-semibold text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-sm"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => deleteSavedProjectById(p.id)}
                          className="p-1 rounded-lg text-[rgba(235,235,236,0.3)] hover:text-[rgba(235,235,236,0.7)] hover:bg-[rgba(235,235,236,0.06)] transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <div className="text-[10px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-1">
                Pre-wired Interactive Prototypes
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STARTER_PROJECTS.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      loadStarterProject(proj.id);
                      closeProjectMenu();
                    }}
                    className="p-3.5 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] hover:border-[rgba(235,235,236,0.2)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[rgb(235,235,236)] text-[11px] group-hover:underline">{proj.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.5)] font-semibold uppercase">
                          {proj.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-[rgba(235,235,236,0.4)] leading-relaxed mb-2">
                        {proj.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(235,235,236,0.06)] text-[9px] text-[rgba(235,235,236,0.35)] font-mono">
                      <span>{proj.frames.length} Screens</span>
                      <span className="text-[rgba(235,235,236,0.6)] font-semibold flex items-center gap-1">
                        Load <Icons.ArrowRight size={9} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">
                Export Options
              </div>
              <div
                onClick={() => saveAsFile()}
                className="p-4 rounded-xl border border-[rgba(235,235,236,0.08)] bg-[rgba(235,235,236,0.02)] hover:bg-[rgba(235,235,236,0.05)] transition-all duration-200 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(235,235,236,0.06)] flex items-center justify-center text-[rgba(235,235,236,0.5)] group-hover:text-[rgb(235,235,236)] transition-colors">
                    <Icons.FileJson size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(235,235,236)] text-xs">ProtoJam Bundle (.protojam)</div>
                    <div className="text-[10px] text-[rgba(235,235,236,0.4)]">Complete editable file with all frames, elements, and interactions.</div>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-sm">
                  Download
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer — slim branding only, no close button */}
        <div className="px-6 py-2 border-t border-[rgba(235,235,236,0.06)] bg-[rgba(235,235,236,0.015)] text-[10px] text-[rgba(235,235,236,0.25)]">
          ProtoJam Desktop · Click outside to close
        </div>

      </div>
    </div>
  );
};
