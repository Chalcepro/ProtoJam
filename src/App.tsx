import React, { useEffect } from 'react';
import { Topbar } from './components/topbar/Topbar';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { RightInspector } from './components/inspector/RightInspector';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import { PrototypePlayerModal } from './components/player/PrototypePlayerModal';
import { useProjectStore } from './store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import * as Icons from 'lucide-react';

// Zoom keeping the middle of the canvas where it is. `absolute`: set the zoom.
const zoomAround = (f: number, absolute = false) => {
  const s = useProjectStore.getState();
  const r = document.querySelector('[data-canvas]')?.getBoundingClientRect();
  const cx = r ? r.width / 2 : 0, cy = r ? r.height / 2 : 0;
  const { x, y, zoom } = s.viewport;
  const z = Math.min(4, Math.max(0.1, absolute ? f : zoom * f));
  s.setViewport({ zoom: z, x: cx - (cx - x) * z / zoom, y: cy - (cy - y) * z / zoom });
};

export const App: React.FC = () => {
  const {
    isLeftSidebarOpen,
    isRightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useProjectStore(useShallow((s) => ({ isLeftSidebarOpen: s.isLeftSidebarOpen, isRightSidebarOpen: s.isRightSidebarOpen, toggleLeftSidebar: s.toggleLeftSidebar, toggleRightSidebar: s.toggleRightSidebar })));

  // Global Keyboard Shortcuts. Read from the store as the key goes down, so
  // they never act on a stale selection. Letter keys are matched case-blind
  // (Caps Lock, Shift) and never fire with Ctrl / Alt held, so Ctrl+V pastes
  // without also switching tools. The canvas owns the clipboard, Ctrl+A,
  // Ctrl+[ / ] and Shift+R; this owns the rest.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      const s = useProjectStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const done = () => e.preventDefault();

      // the pen owns the plain keys while it is out (see PenOverlay)
      if (s.isVectorEditing && !mod) return;
      if (s.isPlaying) {
        if (e.key === 'Escape' || (!mod && k === 'p')) { done(); s.stopPlaying(); }
        return;
      }

      if (mod) {
        // Ctrl+Alt+U / S / I / X: union, subtract, intersect, exclude
        if (e.altKey && ({ u: 'union', s: 'subtract', i: 'intersect', x: 'exclude' } as const)[k as 'u']) {
          done(); s.booleanSelection(({ u: 'union', s: 'subtract', i: 'intersect', x: 'exclude' } as const)[k as 'u']);
          return;
        }
        if (k === 's') { done(); s.saveCurrentProject(); }
        else if (k === 'o') { done(); s.openProjectMenu(); }
        else if (k === 'z') { done(); if (e.shiftKey) s.redo(); else s.undo(); }
        else if (k === 'y') { done(); s.redo(); }
        else if (k === 'd') {
          done();
          if (s.selectedElementIds.length) s.selectedElementIds.forEach(id => s.duplicateElement(id));
          else s.selectedFrameIds.forEach(id => s.duplicateFrame(id));
        }
        else if (e.code === 'Backslash') { done(); s.toggleLeftSidebar(); }
        else if (e.code === 'Digit1') { done(); s.zoomToFit(); }
        else if (e.code === 'Digit0') { done(); zoomAround(1, true); }
        else if (e.key === '=' || e.key === '+') { done(); zoomAround(1.25); }
        else if (e.key === '-' || e.key === '_') { done(); zoomAround(0.8); }
        return;
      }
      if (e.altKey) return;

      // Arrows nudge the selection 1px, 10px with Shift
      if (e.key.startsWith('Arrow') && (s.selectedElementIds.length || s.selectedFrameIds.length)) {
        done();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        s.selectedElementIds.forEach(id => {
          const el = s.elements.find(x => x.id === id);
          if (el && !el.locked) s.updateElementPosition(id, Number(el.style.x) + dx, Number(el.style.y) + dy);
        });
        s.selectedFrameIds.forEach(id => s.moveFrame(id, dx, dy));
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        done();
        if (s.selectedElementIds.length) s.selectedElementIds.forEach(id => s.deleteElement(id));
        else s.selectedFrameIds.forEach(id => s.deleteFrame(id));
        return;
      }
      if (e.key === 'Escape') {
        if (s.activeTool !== 'select') s.setActiveTool('select');
        else s.clearSelection();
        return;
      }
      if (e.key === 'Tab') {
        done();
        // Zen canvas: both side panels away, or both back
        if (s.isLeftSidebarOpen || s.isRightSidebarOpen) {
          if (s.isLeftSidebarOpen) s.toggleLeftSidebar();
          if (s.isRightSidebarOpen) s.toggleRightSidebar();
        } else { s.toggleLeftSidebar(); s.toggleRightSidebar(); }
        return;
      }

      if (e.shiftKey) {
        if (e.code === 'Digit1') { done(); s.zoomToFit(); }
        else if (e.code === 'Digit0') { done(); zoomAround(1, true); }
        else if (k === 'a') {
          // Shift+A: auto layout - wrap several things in one, or switch it
          // on / off for the selected frame or element
          done();
          if (s.selectedElementIds.length > 1) s.groupSelectedIntoAutoLayout();
          else if (s.selectedElementIds.length === 1) s.toggleAutoLayout(s.selectedElementIds[0]);
          else if (s.selectedFrameIds.length === 1) s.toggleAutoLayout(s.selectedFrameIds[0]);
        }
        else if (k === 'l') s.setActiveTool('arrow');
        return;   // Shift+R (rulers) is the canvas's
      }

      const tools: Record<string, Parameters<typeof s.setActiveTool>[0]> = {
        v: 'select', h: 'hand', t: 'text', a: 'directSelect', r: 'rectangle', o: 'ellipse', l: 'line',
        f: 'frame', s: 'section', b: 'button', i: 'input', c: 'sticky'
      };
      if (k === 'p') { done(); s.startPlaying(); }
      else if (k === 'w') s.setEditorMode(s.editorMode === 'prototype' ? 'design' : 'prototype');
      else if (e.key === 'Enter' && !s.selectedElementIds.length) return;
      else if (tools[k]) s.setActiveTool(tools[k]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Select the entire value whenever any numeric field gains focus, app-wide.
  // Without this, clicking into a "0" and typing "456" produces "0456" —
  // typing always replaces instead of inserting, matching every other design tool.
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        target.select();
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[rgb(20,20,19)] text-[rgb(235,235,236)] overflow-hidden font-sans relative">
      {/* Top Application Header */}
      <Topbar />

      {/* Main Workspace: Collapsible Left Sidebar + Infinite Canvas + Collapsible Right Inspector */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {isLeftSidebarOpen && <LeftSidebar />}
        
        <main className="flex-1 h-full relative overflow-hidden">
          <InfiniteCanvas />
        </main>

        {isRightSidebarOpen && <RightInspector />}
      </div>

      {/* Permanent Bottom-Left Toggle Button (Never vanishes, always accessible) */}
      <button
        onClick={toggleLeftSidebar}
        title={isLeftSidebarOpen ? 'Collapse Left Panel (Ctrl+\\)' : 'Open Left Panel (Layers, Screens, UI Kit)'}
        className={`fixed bottom-4 left-4 z-40 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-2xl backdrop-blur-xl border ${
          isLeftSidebarOpen
            ? 'bg-[rgb(20,20,19)]/95 text-[rgb(235,235,236)] border-[rgba(235,235,236,0.22)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
            : 'bg-[rgb(20,20,19)]/95 text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)] border-[rgba(235,235,236,0.18)] hover:border-[rgba(235,235,236,0.35)] shadow-[0_8px_24px_rgba(0,0,0,0.7)]'
        } active:scale-95`}
      >
        <Icons.PanelLeft size={16} />
      </button>

      {/* Permanent Bottom-Right Toggle Button (Never vanishes, always accessible) */}
      <button
        onClick={toggleRightSidebar}
        title={isRightSidebarOpen ? 'Collapse Inspector' : 'Open Inspector (Design & Prototype)'}
        className={`fixed bottom-4 right-4 z-40 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-2xl backdrop-blur-xl border ${
          isRightSidebarOpen
            ? 'bg-[rgb(20,20,19)]/95 text-[rgb(235,235,236)] border-[rgba(235,235,236,0.22)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
            : 'bg-[rgb(20,20,19)]/95 text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)] border-[rgba(235,235,236,0.18)] hover:border-[rgba(235,235,236,0.35)] shadow-[0_8px_24px_rgba(0,0,0,0.7)]'
        } active:scale-95`}
      >
        <Icons.PanelRight size={16} />
      </button>

      {/* Interactive Prototype Player Modal */}
      <PrototypePlayerModal />
    </div>
  );
};

export default App;
