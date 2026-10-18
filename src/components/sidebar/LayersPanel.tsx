import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import * as Icons from 'lucide-react';
import { chainOf, isContainer, subtreeIds } from '../../lib/tree';
import { UIElement } from '../../types/components';
import { useAgent } from '../../lib/agentBridge';
import { startGesture } from '../../lib/gesture';

// Frames, groups and auto layouts inside a screen open only when asked (or
// when something inside them is selected). Kept outside the panel so it
// survives switching sidebar tabs.
const OPEN = new Set<string>();

// Where a dragged layer would land: above / below a row, or into a frame,
// group or screen ('in'). 'canvas' = loose on the canvas.
type Drop = { id: string; kind: 'el' | 'frame' | 'canvas'; where: 'before' | 'after' | 'in' };
const BLUE = '#31C3F3';

export const LayersPanel: React.FC = () => {
  // layers the AI made, until you change them
  const aiMade = useAgent(s => s.aiMade);
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
    toggleSectionCollapsed,
    toggleElementLock,
    toggleElementHidden,
    bringToFront,
    sendToBack
  } = useProjectStore(useShallow((s) => ({ frames: s.frames, sections: s.sections, elements: s.elements, selectedFrameIds: s.selectedFrameIds, selectedSectionIds: s.selectedSectionIds, selectedElementIds: s.selectedElementIds, selectFrame: s.selectFrame, selectSection: s.selectSection, selectElement: s.selectElement, deleteFrame: s.deleteFrame, deleteSection: s.deleteSection, deleteElement: s.deleteElement, duplicateFrame: s.duplicateFrame, duplicateElement: s.duplicateElement, toggleFrameLock: s.toggleFrameLock, toggleFrameHidden: s.toggleFrameHidden, toggleFrameCollapsed: s.toggleFrameCollapsed, toggleSectionCollapsed: s.toggleSectionCollapsed, toggleElementLock: s.toggleElementLock, toggleElementHidden: s.toggleElementHidden, bringToFront: s.bringToFront, sendToBack: s.sendToBack })));

  const [searchQuery, setSearchQuery] = useState('');
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const toggleOpen = (id: string) => { if (!OPEN.delete(id)) OPEN.add(id); redraw(); };
  // what is selected on the canvas shows in the list: open everything around it
  useEffect(() => {
    let added = false;
    selectedElementIds.forEach(id => chainOf(id, elements).slice(0, -1).forEach(a => { if (!OPEN.has(a.id)) { OPEN.add(a.id); added = true; } }));
    if (added) redraw();
  }, [selectedElementIds]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Drag rows to reorder, or to move things into / out of frames and groups
  const [drop, setDrop] = useState<Drop | null>(null);
  const [dragOn, setDragOn] = useState(false);
  const dragged = useRef(false);
  const dropAt = (x: number, y: number, ids: string[]): Drop | null => {
    const row = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-layer-id]');
    if (!row) return null;
    const id = row.dataset.layerId!, kind = row.dataset.layerKind as Drop['kind'];
    if (kind !== 'el') return { id, kind, where: 'in' };
    const st = useProjectStore.getState().elements;
    // never into itself or something inside it
    if (ids.some(m => subtreeIds(m, st).includes(id))) return null;
    const r = row.getBoundingClientRect(), f = (y - r.top) / r.height;
    const holds = isContainer(st.find(e => e.id === id));
    return { id, kind, where: holds ? (f < 0.25 ? 'before' : f > 0.75 ? 'after' : 'in') : (f < 0.5 ? 'before' : 'after') };
  };
  const startDrag = (e: React.PointerEvent, el: UIElement) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const ids = selectedElementIds.includes(el.id) ? selectedElementIds : [el.id];
    const x0 = e.clientX, y0 = e.clientY;
    let on = false, last: Drop | null = null, hoverAt = 0;
    dragged.current = false;
    const move = (ev: PointerEvent) => {
      if (!on && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
      if (!on) setDragOn(true);
      on = dragged.current = true;
      const d = dropAt(ev.clientX, ev.clientY, ids);
      // resting over a closed frame opens it
      if (d?.where !== 'in' || d.id !== last?.id || last?.where !== 'in') hoverAt = Date.now();
      else if (d.kind === 'el' && !OPEN.has(d.id) && Date.now() - hoverAt > 600) { OPEN.add(d.id); redraw(); }
      last = d; setDrop(d);
    };
    const off = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      setDrop(null); setDragOn(false);
    };
    const up = () => {
      off();
      end();
      if (!on || !last) return;
      const s = useProjectStore.getState();
      if (last.where === 'in') s.moveLayers(ids, last.kind === 'canvas' ? undefined : last.id);
      else s.moveLayers(ids, s.elements.find(x => x.id === last!.id)?.parentId, last.id, last.where);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    // right-click or Esc mid-drag puts it all back (src/lib/gesture.ts)
    const end = startGesture(off);
  };
  const dropLook = (id: string): React.CSSProperties | undefined =>
    drop?.id !== id ? undefined
      : drop.where === 'in' ? { boxShadow: `inset 0 0 0 1.5px ${BLUE}` }
      : { boxShadow: `inset 0 ${drop.where === 'before' ? 2 : -2}px 0 ${BLUE}` };

  // Free canvas elements (not inside any frame)
  const freeElements = elements.filter(el => !el.parentId);

  // Frames nested inside a section render only under that section, not flat at the top level
  const framesInSections = new Set(sections.flatMap(s => s.frameIds));
  const topLevelFrames = frames.filter(f => !framesInSections.has(f.id));

  // Filter helpers
  const q = searchQuery.toLowerCase().trim();
  const filteredFrames = q ? topLevelFrames.filter(f => f.name.toLowerCase().includes(q)) : topLevelFrames;
  const filteredSections = q ? sections.filter(s => s.name.toLowerCase().includes(q)) : sections;
  const filteredFreeElements = q ? freeElements.filter(e => (e.name || e.type).toLowerCase().includes(q)) : freeElements;

  const totalLayersCount = frames.length + sections.length + elements.length;

  // One layer row, and - for a frame inside a frame - the rows inside it.
  const elementRow = (el: UIElement): React.ReactNode => {
    const isElementSelected = selectedElementIds.includes(el.id);
    const kids = isContainer(el) ? elements.filter(k => k.parentId === el.id) : [];
    const open = OPEN.has(el.id);
    return (
      <React.Fragment key={el.id}>
      <div
        data-layer-id={el.id} data-layer-kind="el"
        onPointerDown={(e) => startDrag(e, el)}
        style={dropLook(el.id)}
        onClick={(e) => {
          e.stopPropagation();
          if (dragged.current) { dragged.current = false; return; }
          selectElement(el.id, e.shiftKey);
        }}
        className={`flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer group transition-colors ${
          isElementSelected
            ? 'bg-[rgba(235,235,236,0.18)] text-[rgb(235,235,236)] font-semibold border border-[rgba(235,235,236,0.3)]'
            : 'hover:bg-[rgba(235,235,236,0.05)] text-[rgba(235,235,236,0.75)]'
        } ${el.hidden ? 'opacity-30' : ''}`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {kids.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleOpen(el.id); }}
              className="p-0.5 -ml-1 rounded hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] shrink-0"
              title={open ? 'Collapse' : 'Expand'}
            >
              {open ? <Icons.ChevronDown size={11} /> : <Icons.ChevronRight size={11} />}
            </button>
          ) : isContainer(el) && <span className="w-4 shrink-0" />}
          {el.isMasterComponent && <span className="text-[10px] text-[rgb(235,235,236)]">❖</span>}
          {el.isInstance && <span className="text-[10px] text-[rgba(235,235,236,0.6)]">◇</span>}
          <span className="text-[9px] font-mono text-[rgba(235,235,236,0.35)] uppercase">
            {el.type.slice(0, 3)}
          </span>
          <span className="truncate text-xs">{el.name || el.type}</span>
          {aiMade[el.id] && <span title="Made by the AI - goes once you change it" className="shrink-0"><Icons.Sparkles size={10} className="text-[#31C3F3]" /></span>}
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
      {open && kids.length > 0 && (
        <div className="pl-3 space-y-0.5 border-l border-[rgba(235,235,236,0.08)] ml-2.5">
          {kids.map(elementRow)}
        </div>
      )}
      </React.Fragment>
    );
  };

  // Renders one artboard frame row plus its (optionally collapsed) child elements.
  // Shared by the top-level frame list and by frames nested inside a section.
  const renderFrameRow = (frame: typeof frames[number]) => {
    const isFrameSelected = selectedFrameIds.includes(frame.id);
    const childElements = elements.filter(el => el.parentId === frame.id || (!el.parentId && frame.elementIds.includes(el.id)));
    const isCollapsed = !!frame.collapsed;

    return (
      <div key={frame.id} className="space-y-0.5">
        {/* Frame Row */}
        <div
          data-layer-id={frame.id} data-layer-kind="frame" style={dropLook(frame.id)}
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
            {childElements.map(elementRow)}
          </div>
        )}
      </div>
    );
  };

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
          const isSecCollapsed = !!sec.collapsed;
          const childFrames = frames.filter(f => sec.frameIds.includes(f.id));
          const childElements = elements.filter(el => sec.elementIds.includes(el.id) || el.parentId === sec.id);
          const childCount = childFrames.length + childElements.length;

          return (
            <div key={sec.id} className="space-y-0.5">
              <div
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
                  {/* Chevron Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSectionCollapsed(sec.id);
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      isSecSelected
                        ? 'hover:bg-[rgb(20,20,19)]/20 text-[rgb(20,20,19)]'
                        : 'hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
                    }`}
                    title={isSecCollapsed ? 'Expand Section' : 'Collapse Section'}
                  >
                    {isSecCollapsed ? <Icons.ChevronRight size={11} /> : <Icons.ChevronDown size={11} />}
                  </button>

                  <Icons.LayoutGrid size={13} className={isSecSelected ? 'text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.5)] shrink-0'} />
                  <span className="truncate font-bold text-xs">{sec.name}</span>
                  {childCount > 0 && (
                    <span className="text-[10px] opacity-40 font-mono">({childCount})</span>
                  )}
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

              {/* Nested Frames & Elements inside Section */}
              {!isSecCollapsed && childCount > 0 && (
                <div className="pl-4 space-y-0.5 border-l border-[rgba(235,235,236,0.08)] ml-2.5">
                  {childFrames.map(f => renderFrameRow(f))}
                  {childElements.map(elementRow)}
                </div>
              )}
            </div>
          );
        })}

        {/* 2. ARTBOARD FRAMES & NESTED ELEMENTS */}
        {filteredFrames.map(frame => renderFrameRow(frame))}

        {/* 3. FREE CANVAS ELEMENTS (PLACED DIRECTLY ON INFINITE CANVAS) */}
        {(filteredFreeElements.length > 0 || dragOn) && (
          <div className="pt-2">
            <div data-layer-id="canvas" data-layer-kind="canvas" style={dropLook('canvas')} title="Drop a layer here to take it out onto the canvas"
                 className="text-[10px] font-bold text-[rgba(235,235,236,0.35)] uppercase tracking-wider mb-1 px-1 py-0.5 rounded flex items-center gap-1">
              <Icons.Layers size={11} />
              <span>Canvas Objects ({filteredFreeElements.length})</span>
            </div>
            <div className="space-y-0.5">
              {filteredFreeElements.map(elementRow)}
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
