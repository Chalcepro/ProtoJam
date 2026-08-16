import React, { useState } from 'react';
import { SectionFrame as ISectionFrame } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

interface SectionFrameProps {
  section: ISectionFrame;
}

export const SectionFrame: React.FC<SectionFrameProps> = ({ section }) => {
  const {
    selectedSectionIds,
    selectSection,
    updateSection,
    deleteSection,
    activeTool,
    viewport,
    pushHistory
  } = useProjectStore();

  const isSelected = selectedSectionIds.includes(section.id);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(section.name);

  // Smooth global pointer drag
  const handleSectionDragStart = (e: React.PointerEvent) => {
    if (section.locked || activeTool === 'hand') return;
    e.stopPropagation();
    selectSection(section.id, e.shiftKey);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const initialSecX = section.x;
    const initialSecY = section.y;
    const zoom = viewport.zoom;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startMouseX) / zoom;
      const dy = (moveEvt.clientY - startMouseY) / zoom;
      updateSection(section.id, {
        x: Math.round(initialSecX + dx),
        y: Math.round(initialSecY + dy)
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Smooth global pointer resize
  const handleSectionResizeStart = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    selectSection(section.id);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const initialX = section.x;
    const initialY = section.y;
    const initialW = section.width;
    const initialH = section.height;
    const zoom = viewport.zoom;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startMouseX) / zoom;
      const dy = (moveEvt.clientY - startMouseY) / zoom;

      let newW = initialW;
      let newH = initialH;
      let newX = initialX;
      let newY = initialY;

      if (handle.includes('e')) newW = Math.max(100, initialW + dx);
      if (handle.includes('s')) newH = Math.max(100, initialH + dy);
      if (handle.includes('w')) {
        const pW = initialW - dx;
        if (pW > 100) {
          newW = pW;
          newX = initialX + dx;
        }
      }
      if (handle.includes('n')) {
        const pH = initialH - dy;
        if (pH > 100) {
          newH = pH;
          newY = initialY + dy;
        }
      }

      updateSection(section.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH)
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (section.hidden) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: section.x,
        top: section.y,
        width: section.width,
        height: section.height,
        zIndex: 2
      }}
      className={`group select-none transition-all ${section.locked ? 'pointer-events-none' : ''}`}
    >
      {/* Section Header Label Bar */}
      <div
        onPointerDown={handleSectionDragStart}
        className="absolute -top-10 left-0 flex items-center gap-2 cursor-grab active:cursor-grabbing"
      >
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-bold border transition-colors ${
            isSelected
              ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] border-[rgb(235,235,236)] shadow-md'
              : 'bg-[rgb(20,20,19)] text-[rgba(235,235,236,0.85)] border-[rgba(235,235,236,0.2)] hover:border-[rgba(235,235,236,0.4)]'
          }`}
        >
          <Icons.LayoutGrid size={13} className="opacity-75" />
          {isEditingName ? (
            <input
              type="text"
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => {
                setIsEditingName(false);
                if (nameVal.trim()) updateSection(section.id, { name: nameVal.trim() });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingName(false);
                  if (nameVal.trim()) updateSection(section.id, { name: nameVal.trim() });
                }
              }}
              className="bg-transparent border-none outline-none font-bold text-xs w-36 text-inherit"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className="cursor-text"
              title="Double click to rename section"
            >
              {section.name}
            </span>
          )}
        </div>
      </div>

      {/* Section Boundary Container */}
      <div
        onPointerDown={handleSectionDragStart}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: section.backgroundColor || 'rgba(235, 235, 236, 0.03)'
        }}
        className={`rounded-2xl border-2 transition-all cursor-move ${
          isSelected
            ? 'border-[rgb(235,235,236)] ring-4 ring-[rgba(235,235,236,0.1)] border-solid'
            : 'border-[rgba(235,235,236,0.18)] hover:border-[rgba(235,235,236,0.35)] border-dashed'
        }`}
      />

      {/* Resize handles if selected */}
      {isSelected && !section.locked && (
        <>
          <div
            onPointerDown={(e) => handleSectionResizeStart('nw', e)}
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nwse-resize z-30 shadow-sm"
          />
          <div
            onPointerDown={(e) => handleSectionResizeStart('ne', e)}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nesw-resize z-30 shadow-sm"
          />
          <div
            onPointerDown={(e) => handleSectionResizeStart('sw', e)}
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nesw-resize z-30 shadow-sm"
          />
          <div
            onPointerDown={(e) => handleSectionResizeStart('se', e)}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nwse-resize z-30 shadow-sm"
          />
        </>
      )}
    </div>
  );
};
