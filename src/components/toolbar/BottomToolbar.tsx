import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ToolMode } from '../../types/canvas';
import * as Icons from 'lucide-react';

export const BottomToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    isVectorEditing,
    vectorTool,
    setVectorTool,
    finishVectorEditing,
    cancelVectorEditing,
    fillVectorFace,
    closeVectorPath,
    addFrame,
    addSection,
    activeVectorData
  } = useProjectStore();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectTools: { id: ToolMode; label: string; icon: any; hotkey: string }[] = [
    { id: 'select', label: 'Move', icon: Icons.MousePointer2, hotkey: 'V' },
    { id: 'directSelect', label: 'Direct Point Select', icon: Icons.Pointer, hotkey: 'A' },
    { id: 'hand', label: 'Hand Tool', icon: Icons.Hand, hotkey: 'H' }
  ];

  const frameTools: { id: ToolMode; label: string; icon: any; hotkey: string }[] = [
    { id: 'frame', label: 'Screen Frame', icon: Icons.Smartphone, hotkey: 'F' },
    { id: 'section', label: 'Organizing Section', icon: Icons.LayoutGrid, hotkey: 'S' }
  ];

  const shapeTools: { id: ToolMode; label: string; icon: any; hotkey: string }[] = [
    { id: 'rectangle', label: 'Rectangle', icon: Icons.Square, hotkey: 'R' },
    { id: 'ellipse', label: 'Ellipse', icon: Icons.Circle, hotkey: 'O' },
    { id: 'line', label: 'Line', icon: Icons.Minus, hotkey: 'L' },
    { id: 'arrow', label: 'Arrow', icon: Icons.ArrowRight, hotkey: 'Shift+L' },
    { id: 'polygon', label: 'Polygon / Triangle', icon: Icons.Triangle, hotkey: '' },
    { id: 'star', label: 'Star', icon: Icons.Star, hotkey: '' }
  ];

  // Active icons helper
  const getCurrentSelectIcon = () => {
    const found = selectTools.find(t => t.id === activeTool);
    const Comp = found ? found.icon : Icons.MousePointer2;
    return <Comp size={16} />;
  };

  const getCurrentFrameIcon = () => {
    const found = frameTools.find(t => t.id === activeTool);
    const Comp = found ? found.icon : Icons.Smartphone;
    return <Comp size={16} />;
  };

  const getCurrentShapeIcon = () => {
    const found = shapeTools.find(t => t.id === activeTool);
    const Comp = found ? found.icon : Icons.Square;
    return <Comp size={16} />;
  };

  // ---------------- VECTOR PEN TOOLBAR MODE ----------------
  if (isVectorEditing) {
    return (
      <div
        ref={toolbarRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[rgb(20,20,19)]/95 backdrop-blur-2xl border border-[rgba(235,235,236,0.2)] rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 text-xs select-none text-[rgb(235,235,236)] animate-in slide-in-from-bottom-3 duration-200"
      >
        <div className="px-3 py-1 bg-[rgba(235,235,236,0.1)] rounded-lg font-bold text-[11px] text-[rgb(235,235,236)] flex items-center gap-1.5">
          <Icons.PenTool size={13} />
          <span>VECTOR EDIT</span>
        </div>

        <div className="h-4 w-px bg-[rgba(235,235,236,0.15)] mx-1" />

        {/* Vector Pen Tool */}
        <button
          onClick={() => setVectorTool('pen')}
          title="Pen (Add Points & Segments)"
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            vectorTool === 'pen'
              ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
              : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.PenTool size={16} />
        </button>

        {/* Point Select Tool */}
        <button
          onClick={() => setVectorTool('select')}
          title="Point Select (Move Vertices)"
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            vectorTool === 'select'
              ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
              : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.Pointer size={16} />
        </button>

        {/* Paint Bucket Tool (B / F) */}
        <button
          onClick={() => {
            setVectorTool('bucket');
            fillVectorFace();
          }}
          title="Paint Bucket (Fill/Unfill Faces - B or F)"
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            vectorTool === 'bucket'
              ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
              : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.PaintBucket size={16} />
        </button>

        {/* Bend / Curve Tool */}
        <button
          onClick={() => setVectorTool('bend')}
          title="Bend Tool (Convert Corner to Bezier Curve)"
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            vectorTool === 'bend'
              ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
              : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
          }`}
        >
          <Icons.Spline size={16} />
        </button>

        {/* Close Path Action */}
        <button
          onClick={closeVectorPath}
          title="Close Vector Path & Fill Face"
          className="px-2.5 py-1.5 rounded-xl hover:bg-[rgba(235,235,236,0.1)] text-[rgb(235,235,236)] font-semibold flex items-center gap-1.5"
        >
          <Icons.CheckCircle2 size={14} />
          <span>Close Path</span>
        </button>

        <div className="h-4 w-px bg-[rgba(235,235,236,0.15)] mx-1" />

        {/* Done Editing Vector */}
        <button
          onClick={finishVectorEditing}
          className="px-3.5 py-1.5 rounded-xl bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold hover:brightness-110 shadow transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Icons.Check size={14} />
          <span>Done</span>
        </button>

        {/* Cancel Vector Editing */}
        <button
          onClick={cancelVectorEditing}
          className="p-2 rounded-xl hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]"
          title="Cancel (Esc)"
        >
          <Icons.X size={15} />
        </button>
      </div>
    );
  }

  // ---------------- STANDARD BOTTOM TOOLBAR ----------------
  return (
    <div
      ref={toolbarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[rgb(20,20,19)]/95 backdrop-blur-2xl border border-[rgba(235,235,236,0.18)] rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 text-xs select-none text-[rgb(235,235,236)] transition-all"
    >
      {/* 1. SELECT TOOL GROUP WITH DROPDOWN */}
      <div className="relative">
        <div className="flex items-center rounded-xl overflow-hidden bg-[rgba(235,235,236,0.04)] border border-[rgba(235,235,236,0.1)]">
          <button
            onClick={() => setActiveTool(activeTool === 'select' || activeTool === 'directSelect' || activeTool === 'hand' ? activeTool : 'select')}
            title="Select & Move (V)"
            className={`p-2 transition-all flex items-center gap-1 ${
              activeTool === 'select' || activeTool === 'directSelect' || activeTool === 'hand'
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
                : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {getCurrentSelectIcon()}
          </button>
          <button
            onClick={() => setOpenDropdown(openDropdown === 'select' ? null : 'select')}
            className={`px-1 py-2 hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] ${
              openDropdown === 'select' ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : ''
            }`}
          >
            <Icons.ChevronDown size={11} />
          </button>
        </div>

        {openDropdown === 'select' && (
          <div className="absolute bottom-12 left-0 w-48 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl p-1.5 z-50 glass-dropdown space-y-0.5">
            {selectTools.map(t => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    activeTool === t.id
                      ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold'
                      : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp size={14} />
                    <span>{t.label}</span>
                  </div>
                  <span className="text-[10px] opacity-40 font-mono">{t.hotkey}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. FRAME & SECTION TOOL GROUP WITH DROPDOWN */}
      <div className="relative">
        <div className="flex items-center rounded-xl overflow-hidden bg-[rgba(235,235,236,0.04)] border border-[rgba(235,235,236,0.1)]">
          <button
            onClick={() => setActiveTool(activeTool === 'frame' || activeTool === 'section' ? activeTool : 'frame')}
            title="Screen Frame (F) / Section (S)"
            className={`p-2 transition-all flex items-center gap-1 ${
              activeTool === 'frame' || activeTool === 'section'
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
                : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {getCurrentFrameIcon()}
          </button>
          <button
            onClick={() => setOpenDropdown(openDropdown === 'frame' ? null : 'frame')}
            className={`px-1 py-2 hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] ${
              openDropdown === 'frame' ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : ''
            }`}
          >
            <Icons.ChevronDown size={11} />
          </button>
        </div>

        {openDropdown === 'frame' && (
          <div className="absolute bottom-12 left-0 w-52 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl p-1.5 z-50 glass-dropdown space-y-0.5">
            {frameTools.map(t => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    activeTool === t.id
                      ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold'
                      : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp size={14} />
                    <span>{t.label}</span>
                  </div>
                  <span className="text-[10px] opacity-40 font-mono">{t.hotkey}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SHAPE TOOLS WITH DROPDOWN */}
      <div className="relative">
        <div className="flex items-center rounded-xl overflow-hidden bg-[rgba(235,235,236,0.04)] border border-[rgba(235,235,236,0.1)]">
          <button
            onClick={() => setActiveTool(shapeTools.some(s => s.id === activeTool) ? activeTool : 'rectangle')}
            title="Geometric Shapes & Lines (R, O, L)"
            className={`p-2 transition-all flex items-center gap-1 ${
              shapeTools.some(s => s.id === activeTool)
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
                : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {getCurrentShapeIcon()}
          </button>
          <button
            onClick={() => setOpenDropdown(openDropdown === 'shape' ? null : 'shape')}
            className={`px-1 py-2 hover:bg-[rgba(235,235,236,0.1)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] ${
              openDropdown === 'shape' ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : ''
            }`}
          >
            <Icons.ChevronDown size={11} />
          </button>
        </div>

        {openDropdown === 'shape' && (
          <div className="absolute bottom-12 left-0 w-52 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl p-1.5 z-50 glass-dropdown space-y-0.5">
            {shapeTools.map(t => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    activeTool === t.id
                      ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold'
                      : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp size={14} />
                    <span>{t.label}</span>
                  </div>
                  {t.hotkey && <span className="text-[10px] opacity-40 font-mono">{t.hotkey}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PEN TOOL (P) */}
      <button
        onClick={() => setActiveTool('pen')}
        title="Vector Pen Tool (P) - Draw & Edit Bezier Paths"
        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
          activeTool === 'pen'
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
            : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.PenTool size={16} />
      </button>

      {/* 5. TEXT TOOL (T) */}
      <button
        onClick={() => setActiveTool('text')}
        title="Typography / Text Tool (T)"
        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
          activeTool === 'text'
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
            : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.Type size={16} />
      </button>

      {/* 6. BUTTON / ACTIONS TOOL (B) */}
      <button
        onClick={() => setActiveTool('button')}
        title="Interactive Button (B)"
        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
          activeTool === 'button'
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
            : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.SquareDot size={16} />
      </button>

      {/* 7. FORM INPUT TOOL (I) */}
      <button
        onClick={() => setActiveTool('input')}
        title="Form Input (I)"
        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
          activeTool === 'input'
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
            : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.FormInput size={16} />
      </button>

      {/* 8. FIGJAM STICKY NOTE (C) */}
      <button
        onClick={() => setActiveTool('sticky')}
        title="FigJam Sticky Note (C)"
        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
          activeTool === 'sticky'
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold shadow'
            : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.StickyNote size={16} />
      </button>
    </div>
  );
};
