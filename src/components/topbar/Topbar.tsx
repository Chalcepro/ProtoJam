import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ProjectMenuModal } from './ProjectMenuModal';
import * as Icons from 'lucide-react';

export const Topbar: React.FC = () => {
  const {
    projectName,
    setProjectName,
    viewport,
    setZoom,
    resetZoom,
    zoomToFit,
    undo,
    redo,
    historyIndex,
    history,
    startPlaying,
    canvasSettings,
    updateCanvasSettings,
    editorMode,
    setEditorMode,
    openProjectMenu,
    saveCurrentProject,
    isSaved,
    lastSavedAt
  } = useProjectStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <>
      <header className="h-11 bg-[rgb(20,20,19)] border-b border-[rgba(235,235,236,0.08)] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0 text-[rgb(235,235,236)]">
        
        {/* LEFT: Brand + Title + Save */}
        <div className="flex items-center gap-2 min-w-0">
          {/* ProtoJam Brand / Project Menu Trigger */}
          <button
            onClick={openProjectMenu}
            title="Project Menu (File, Save, Open)"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[rgba(235,235,236,0.08)] transition-all duration-150 group"
          >
            <div className="w-5 h-5 rounded-md bg-[rgb(235,235,236)] text-[rgb(20,20,19)] flex items-center justify-center font-bold">
              <Icons.Layers size={11} />
            </div>
            <span className="font-extrabold text-[11px] tracking-tight text-[rgb(235,235,236)]">
              PJ
            </span>
            <Icons.ChevronDown size={10} className="text-[rgba(235,235,236,0.3)] group-hover:text-[rgba(235,235,236,0.6)] transition-colors" />
          </button>

          <div className="h-3.5 w-px bg-[rgba(235,235,236,0.08)]" />

          {/* Editable Project Name */}
          {isEditingTitle ? (
            <input
              type="text"
              value={projectName}
              autoFocus
              onBlur={() => setIsEditingTitle(false)}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              className="bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-2 py-0.5 rounded-md border border-[rgba(235,235,236,0.2)] outline-none text-[11px] font-medium w-36"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)] font-medium cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[rgba(235,235,236,0.06)] transition-all duration-150 truncate max-w-[140px] text-[11px]"
              title="Click to rename project"
            >
              {projectName}
            </div>
          )}

          {/* Quick Save */}
          <button
            onClick={() => saveCurrentProject()}
            title={isSaved ? `Saved ${lastSavedAt || ''}` : 'Save (Ctrl+S)'}
            className={`p-1 rounded-md transition-all duration-150 ${
              isSaved
                ? 'text-[rgba(235,235,236,0.25)] hover:text-[rgba(235,235,236,0.6)]'
                : 'text-[rgb(235,235,236)] animate-pulse'
            }`}
          >
            <Icons.Save size={13} />
          </button>
        </div>

        {/* CENTER: Design / Prototype Mode Switcher */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] p-0.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
            <button
              onClick={() => setEditorMode('design')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[11px] font-medium transition-all duration-200 ${
                editorMode === 'design'
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] shadow-sm font-bold'
                  : 'text-[rgba(235,235,236,0.45)] hover:text-[rgba(235,235,236,0.8)]'
              }`}
            >
              <Icons.Paintbrush size={12} />
              <span>Design</span>
            </button>
            <button
              onClick={() => setEditorMode('prototype')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[11px] font-medium transition-all duration-200 ${
                editorMode === 'prototype'
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] shadow-sm font-bold'
                  : 'text-[rgba(235,235,236,0.45)] hover:text-[rgba(235,235,236,0.8)]'
              }`}
            >
              <Icons.Zap size={12} />
              <span>Prototype</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Undo/Redo, Grid, Zoom, Play */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 mr-0.5">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg hover:bg-[rgba(235,235,236,0.08)] disabled:opacity-15 text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] transition-all duration-150"
              title="Undo (Ctrl+Z)"
            >
              <Icons.Undo2 size={13} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg hover:bg-[rgba(235,235,236,0.08)] disabled:opacity-15 text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] transition-all duration-150"
              title="Redo (Ctrl+Y)"
            >
              <Icons.Redo2 size={13} />
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => updateCanvasSettings({
              gridType: canvasSettings.gridType === 'dots' ? 'grid' : canvasSettings.gridType === 'grid' ? 'none' : 'dots'
            })}
            className="p-1.5 rounded-lg hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)] transition-all duration-150"
            title={`Grid: ${canvasSettings.gridType}`}
          >
            <Icons.Grid3X3 size={13} />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg border border-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)] px-0.5 py-0.5 mx-0.5">
            <button
              onClick={() => setZoom(viewport.zoom * 0.85)}
              className="p-1 hover:bg-[rgba(235,235,236,0.08)] rounded text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] transition-colors"
              title="Zoom Out"
            >
              <Icons.Minus size={11} />
            </button>
            <button
              onClick={resetZoom}
              className="text-[10px] font-mono px-1.5 hover:underline text-[rgba(235,235,236,0.7)] min-w-[36px] text-center"
              title="Reset Zoom"
            >
              {Math.round(viewport.zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(viewport.zoom * 1.15)}
              className="p-1 hover:bg-[rgba(235,235,236,0.08)] rounded text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] transition-colors"
              title="Zoom In"
            >
              <Icons.Plus size={11} />
            </button>
            <div className="h-3 w-px bg-[rgba(235,235,236,0.08)] mx-0.5" />
            <button
              onClick={zoomToFit}
              className="p-1 hover:bg-[rgba(235,235,236,0.08)] rounded text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] transition-colors"
              title="Zoom to Fit (Ctrl+1)"
            >
              <Icons.Maximize2 size={11} />
            </button>
          </div>

          {/* Play Prototype Button */}
          <button
            onClick={() => startPlaying()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-extrabold text-[11px] shadow-lg transition-all duration-150 hover:shadow-xl hover:scale-[1.02] active:scale-95 ml-1"
          >
            <Icons.Play size={11} fill="currentColor" />
            <span>PLAY</span>
          </button>
        </div>
      </header>

      {/* Project Menu Modal */}
      <ProjectMenuModal />
    </>
  );
};
