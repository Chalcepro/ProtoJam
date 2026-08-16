import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

export const LayersPanel: React.FC = () => {
  const {
    frames,
    sections,
    elements,
    selectedFrameIds,
    selectedSectionIds,
    selectedElementIds,
    selectFrame,
    selectSection,
    selectElement,
    deleteFrame,
    deleteSection,
    deleteElement,
    duplicateFrame,
    duplicateElement,
    toggleFrameLock,
    toggleFrameHidden,
    toggleFrameCollapsed,
    toggleElementLock,
    toggleElementHidden,
    bringToFront,
    sendToBack
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Free canvas elements (not inside any frame)
  const freeElements = elements.filter(el => !el.parentId);

  // Filter helpers
  const q = searchQuery.toLowerCase().trim();
  const filteredFrames = q ? frames.filter(f => f.name.toLowerCase().includes(q)) : frames;
  const filteredSections = q ? sections.filter(s => s.name.toLowerCase().includes(q)) : sections;
  const filteredFreeElements = q ? freeElements.filter(e => (e.name || e.type).toLowerCase().includes(q)) : freeElements;

  const totalLayersCount = frames.length + sections.length + elements.length;

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs text-[rgb(235,235,236)] select-none">
      
      {/* Search & Quick Controls Bar */}
      <div className="p-2 border-b border-[rgba(235,235,236,0.06)] space-y-1.5 bg-[rgba(235,235,236,0.01)]">
        <div className="flex items-center gap-1.5 bg-[rgba(235,235,236,0.04)] px-2 py-1 rounded-lg border border-[rgba(235,235,236,0.08)]">
          <Icons.Search size={12} className="text-[rgba(235,235,236,0.4)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${totalLayersCount} layers...`}
            className="bg-transparent border-none outline-none text-[11px] text-[rgb(235,235,236)] placeholder-[rgba(235,235,236,0.3)] w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]">
              <Icons.X size={11} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-[rgba(235,235,236,0.45)] px-0.5">
          <span>{totalLayersCount} Layers Total</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                frames.forEach(f => {
                  if (f.collapsed) toggleFrameCollapsed(f.id);
                });
              }}
              className="hover:text-[rgb(235,235,236)] px-1 py-0.5 rounded hover:bg-[rgba(235,235,236,0.06)]"
              title="Expand All Frames"
            >
              Expand
            </button>
            <span>·</span>
            <button
              onClick={() => {
                frames.forEach(f => {
                  if (!f.collapsed) toggleFrameCollapsed(f.id);
                });
              }}
              className="hover:text-[rgb(235,235,236)] px-1 py-0.5 rounded hover:bg-[rgba(235,235,236,0.06)]"
              title="Collapse All Frames"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Layer Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        
        {/* 1. SECTIONS */}
        {filteredSections.map(sec => {
          const isSecSelected = selectedSectionIds.includes(sec.id);
          return (
            <div
              key={sec.id}
              onClick={(e) => {
                e.stopPropagation();
                selectSection(sec.id, e.shiftKey);
              }}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                isSecSelected
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow-sm'
                  : 'hover:bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                <Icons.LayoutGrid size={13} className={isSecSelected ? 'text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.5)] shrink-0'} />
                <span className="truncate font-bold text-xs">{sec.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSection(sec.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-[rgba(235,235,236,0.4)] hover:text-rose-400"
                title="Delete section"
              >
                <Icons.Trash2 size={11} />
              </button>
            </div>
          );
        })}

        {/* 2. ARTBOARD FRAMES & NESTED ELEMENTS */}
        {filteredFrames.map(frame => {
          const isFrameSelected = selectedFrameIds.includes(frame.id);
          const childElements = elements.filter(el => frame.elementIds.includes(el.id) || el.parentId === frame.id);
          const isCollapsed = !!frame.collapsed;

          return (
            <div key={frame.id} className="space-y-0.5">
              {/* Frame Row */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  selectFrame(frame.id, e.shiftKey);
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                  isFrameSelected
                    ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow-sm'
                    : 'hover:bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)]'
                } ${frame.hidden ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  {/* Chevron Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFrameCollapsed(frame.id);
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      isFrameSelected 
                        ? 'hover:bg-[rgb(20,20,19)]/20 text-[rgb(20,20,19)]' 
                        : 'hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
                    }`}
                    title={isCollapsed ? 'Expand Screen' : 'Collapse Screen'}
                  >
                    {isCollapsed ? <Icons.ChevronRight size={11} /> : <Icons.ChevronDown size={11} />}
                  </button>

                  <Icons.Smartphone size={13} className={isFrameSelected ? 'text-[rgb(20,20,19)]' : 'text-[rgb(235,235,236)] shrink-0'} />
                  <span className="truncate font-semibold text-xs">{frame.name}</span>
                  {childElements.length > 0 && (
                    <span className="text-[10px] opacity-40 font-mono">({childElements.length})</span>
                  )}
                </div>

                {/* Frame Action Controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFrameLock(frame.id);
                    }}
                    title={frame.locked ? 'Unlock' : 'Lock'}
                    className={`p-1 rounded ${isFrameSelected ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
                  >
                    {frame.locked ? <Icons.Lock size={11} /> : <Icons.Unlock size={11} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFrameHidden(frame.id);
                    }}
                    title={frame.hidden ? 'Show' : 'Hide'}
                    className={`p-1 rounded ${isFrameSelected ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
                  >
                    {frame.hidden ? <Icons.EyeOff size={11} /> : <Icons.Eye size={11} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateFrame(frame.id);
                    }}
                    title="Duplicate"
                    className={`p-1 rounded ${isFrameSelected ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
                  >
                    <Icons.Copy size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFrame(frame.id);
                    }}
                    title="Delete"
                    className={`p-1 rounded ${isFrameSelected ? 'hover:bg-black/10' : 'hover:bg-white/10'}`}
                  >
                    <Icons.Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Child Elements inside Frame */}
              {!isCollapsed && childElements.length > 0 && (
                <div className="pl-4 space-y-0.5 border-l border-[rgba(235,235,236,0.08)] ml-2.5">
                  {childElements.map(el => {
                    const isElementSelected = selectedElementIds.includes(el.id);
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectElement(el.id, e.shiftKey);
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer group transition-colors ${
                          isElementSelected
                            ? 'bg-[rgba(235,235,236,0.18)] text-[rgb(235,235,236)] font-semibold border border-[rgba(235,235,236,0.3)]'
                            : 'hover:bg-[rgba(235,235,236,0.05)] text-[rgba(235,235,236,0.75)]'
                        } ${el.hidden ? 'opacity-30' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                          {el.isMasterComponent && <span className="text-[10px] text-[rgb(235,235,236)]">❖</span>}
                          {el.isInstance && <span className="text-[10px] text-[rgba(235,235,236,0.6)]">◇</span>}
                          <span className="text-[9px] font-mono text-[rgba(235,235,236,0.35)] uppercase">
                            {el.type.slice(0, 3)}
                          </span>
                          <span className="truncate text-xs">{el.name || el.type}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElementLock(el.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]"
                          >
                            {el.locked ? <Icons.Lock size={10} /> : <Icons.Unlock size={10} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElementHidden(el.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]"
                          >
                            {el.hidden ? <Icons.EyeOff size={10} /> : <Icons.Eye size={10} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateElement(el.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]"
                          >
                            <Icons.Copy size={10} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]"
                          >
                            <Icons.Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 3. FREE CANVAS ELEMENTS (PLACED DIRECTLY ON INFINITE CANVAS) */}
        {filteredFreeElements.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-bold text-[rgba(235,235,236,0.35)] uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
              <Icons.Layers size={11} />
              <span>Canvas Objects ({filteredFreeElements.length})</span>
            </div>
            <div className="space-y-0.5">
              {filteredFreeElements.map(el => {
                const isElementSelected = selectedElementIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(el.id, e.shiftKey);
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                      isElementSelected
                        ? 'bg-[rgba(235,235,236,0.18)] text-[rgb(235,235,236)] font-semibold border border-[rgba(235,235,236,0.3)]'
                        : 'hover:bg-[rgba(235,235,236,0.05)] text-[rgba(235,235,236,0.75)]'
                    } ${el.hidden ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      {el.isMasterComponent && <span className="text-[10px] text-[rgb(235,235,236)]">❖</span>}
                      {el.isInstance && <span className="text-[10px] text-[rgba(235,235,236,0.6)]">◇</span>}
                      <span className="text-[9px] font-mono text-[rgba(235,235,236,0.35)] uppercase">
                        {el.type.slice(0, 3)}
                      </span>
                      <span className="truncate text-xs">{el.name || el.type}</span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleElementLock(el.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)]"
                      >
                        {el.locked ? <Icons.Lock size={10} /> : <Icons.Unlock size={10} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleElementHidden(el.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)]"
                      >
                        {el.hidden ? <Icons.EyeOff size={10} /> : <Icons.Eye size={10} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteElement(el.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-[rgba(235,235,236,0.6)] hover:text-rose-400"
                      >
                        <Icons.Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalLayersCount === 0 && (
          <div className="text-center text-[rgba(235,235,236,0.4)] py-8">
            <Icons.Layers size={24} className="mx-auto mb-2 opacity-30 text-[rgb(235,235,236)]" />
            <p>No objects on canvas</p>
            <p className="text-[10px] mt-1 text-[rgba(235,235,236,0.3)]">Add frames or UI elements to start</p>
          </div>
        )}

      </div>
    </div>
  );
};
