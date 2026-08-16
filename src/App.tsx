import React, { useEffect } from 'react';
import { Topbar } from './components/topbar/Topbar';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { RightInspector } from './components/inspector/RightInspector';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import { PrototypePlayerModal } from './components/player/PrototypePlayerModal';
import { useProjectStore } from './store/useProjectStore';
import * as Icons from 'lucide-react';

export const App: React.FC = () => {
  const {
    undo,
    redo,
    deleteElement,
    deleteFrame,
    selectedElementIds,
    selectedFrameIds,
    duplicateElement,
    duplicateFrame,
    startPlaying,
    isPlaying,
    stopPlaying,
    zoomToFit,
    setActiveTool,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    setEditorMode,
    editorMode,
    saveCurrentProject,
    openProjectMenu
  } = useProjectStore();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing inside an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Save Project (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveCurrentProject();
        return;
      }

      // Open Project Menu (Ctrl+O / Cmd+O)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openProjectMenu();
        return;
      }

      // Prototyping Play toggle (P)
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (isPlaying) {
          stopPlaying();
        } else {
          startPlaying();
        }
        return;
      }

      // Exit Play mode (Escape)
      if (e.key === 'Escape' && isPlaying) {
        stopPlaying();
        return;
      }

      // Toggle Panels (Ctrl+\ or Tab for Zen mode)
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleLeftSidebar();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        // Zen canvas toggle: collapse/expand both sidebars together
        if (isLeftSidebarOpen || isRightSidebarOpen) {
          if (isLeftSidebarOpen) toggleLeftSidebar();
          if (isRightSidebarOpen) toggleRightSidebar();
        } else {
          toggleLeftSidebar();
          toggleRightSidebar();
        }
        return;
      }

      // Mode Switch: D for Design, W for Prototype
      if (e.key === 'w' || e.key === 'W') {
        setEditorMode(editorMode === 'prototype' ? 'design' : 'prototype');
      }

      // Undo (Ctrl+Z) / Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => duplicateElement(id));
        } else if (selectedFrameIds.length > 0) {
          selectedFrameIds.forEach(id => duplicateFrame(id));
        }
        return;
      }

      // Delete (Backspace or Delete)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => deleteElement(id));
        } else if (selectedFrameIds.length > 0) {
          selectedFrameIds.forEach(id => deleteFrame(id));
        }
        return;
      }

      // Zoom to fit (Ctrl+1)
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        zoomToFit();
        return;
      }

      // Tool shortcuts: V (Select), H (Hand), T (Text)
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, redo, deleteElement, deleteFrame, selectedElementIds, selectedFrameIds,
    duplicateElement, duplicateFrame, startPlaying, isPlaying, stopPlaying, zoomToFit, setActiveTool,
    isLeftSidebarOpen, isRightSidebarOpen, toggleLeftSidebar, toggleRightSidebar, setEditorMode, editorMode,
    saveCurrentProject, openProjectMenu
  ]);

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
