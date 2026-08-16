import React from 'react';
import { DeviceFrame, UIElement } from '../../types/components';
import { SemanticElementRenderer } from './SemanticElementRenderer';
import { TransformSelectionBox } from './TransformSelectionBox';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

interface ArtboardFrameProps {
  frame: DeviceFrame;
  elements: UIElement[];
  onStartDragFrame?: (e: React.PointerEvent) => void;
  onStartDragElement?: (element: UIElement, e: React.PointerEvent) => void;
}

export const ArtboardFrame: React.FC<ArtboardFrameProps> = ({
  frame,
  elements,
  onStartDragFrame,
  onStartDragElement
}) => {
  const {
    selectedFrameIds,
    selectedElementIds,
    selectFrame,
    selectElement,
    deleteFrame,
    duplicateFrame,
    toggleFrameOrientation,
    toggleFrameLock,
    toggleFrameHidden,
    setStartingFrame,
    startPlaying,
    editorMode,
    isWiring,
    finishWiring,
    startWiring,
    updateFrameDimensions,
    viewport,
    pushHistory
  } = useProjectStore();

  const isFrameSelected = selectedFrameIds.includes(frame.id);
  const frameElements = elements.filter(el => frame.elementIds.includes(el.id) || el.parentId === frame.id);

  if (frame.hidden) return null;

  const handleFrameBodyPointerDown = (e: React.PointerEvent) => {
    if (frame.locked) return;
    e.stopPropagation();
    if (isWiring) {
      finishWiring(frame.id);
      return;
    }
    selectFrame(frame.id, e.shiftKey);
    if (onStartDragFrame) onStartDragFrame(e);
  };

  // Smooth frame scaling/resizing handle at bottom-right
  const handleFrameResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = frame.width;
    const initialH = frame.height;
    const zoom = viewport.zoom;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startX) / zoom;
      const dy = (moveEvt.clientY - startY) / zoom;
      updateFrameDimensions(
        frame.id,
        Math.max(200, Math.round(initialW + dx)),
        Math.max(200, Math.round(initialH + dy))
      );
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height
      }}
      className={`group select-none transition-shadow ${
        frame.locked ? 'cursor-default' : ''
      }`}
    >
      {/* Frame Header Bar with Title & Quick Action Icons */}
      <div
        onPointerDown={(e) => {
          if (frame.locked) return;
          e.stopPropagation();
          selectFrame(frame.id, e.shiftKey);
          if (onStartDragFrame) onStartDragFrame(e);
        }}
        className={`absolute -top-9 left-0 right-0 h-8 flex items-center justify-between px-2.5 rounded-t-lg transition-colors cursor-grab active:cursor-grabbing ${
          isFrameSelected 
            ? 'text-[rgb(235,235,236)] bg-[rgba(235,235,236,0.1)]' 
            : 'text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] hover:bg-[rgba(235,235,236,0.04)]'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-xs">
          {frame.locked && (
            <Icons.Lock size={12} className="text-[rgb(235,235,236)]" />
          )}
          {frame.isStartingFrame && (
            <span className="flex items-center gap-1 text-[10px] bg-[rgb(235,235,236)] text-[rgb(20,20,19)] px-1.5 py-0.2 rounded font-bold">
              <Icons.Play size={9} fill="currentColor" /> Flow Start
            </span>
          )}
          <span className="truncate max-w-[180px]">{frame.name}</span>
          <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono font-normal">
            ({frame.width} × {frame.height})
          </span>
        </div>

        {/* Action icons on header */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title={frame.locked ? 'Unlock Frame' : 'Lock Frame'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFrameLock(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            {frame.locked ? <Icons.Lock size={12} /> : <Icons.Unlock size={12} />}
          </button>
          <button
            title="Hide Frame"
            onClick={(e) => {
              e.stopPropagation();
              toggleFrameHidden(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            <Icons.Eye size={12} />
          </button>
          <button
            title="Rotate Orientation"
            onClick={(e) => {
              e.stopPropagation();
              toggleFrameOrientation(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            <Icons.RotateCw size={12} />
          </button>
          <button
            title="Set as Flow Starting Screen"
            onClick={(e) => {
              e.stopPropagation();
              setStartingFrame(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            <Icons.Flag size={12} />
          </button>
          <button
            title="Play Prototype From Here"
            onClick={(e) => {
              e.stopPropagation();
              startPlaying(frame.id);
            }}
            className="p-1 hover:bg-[rgb(235,235,236)] hover:text-[rgb(20,20,19)] rounded text-[rgb(235,235,236)] transition-colors"
          >
            <Icons.Play size={12} fill="currentColor" />
          </button>
          <button
            title="Duplicate Frame (Ctrl+D)"
            onClick={(e) => {
              e.stopPropagation();
              duplicateFrame(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            <Icons.Copy size={12} />
          </button>
          <button
            title="Delete Frame"
            onClick={(e) => {
              e.stopPropagation();
              deleteFrame(frame.id);
            }}
            className="p-1 hover:bg-[rgba(235,235,236,0.1)] rounded text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]"
          >
            <Icons.Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Frame Artboard Body */}
      <div
        onPointerDown={handleFrameBodyPointerDown}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: frame.backgroundColor || '#141413',
          borderRadius: frame.deviceType === 'mobile' ? 44 : frame.deviceType === 'tablet' ? 24 : 12
        }}
        className={`relative overflow-hidden transition-shadow shadow-2xl ${
          isFrameSelected 
            ? 'ring-2 ring-[rgb(235,235,236)] ring-offset-2 ring-offset-[rgb(20,20,19)]' 
            : 'border border-[rgba(235,235,236,0.15)]'
        } ${isWiring ? 'hover:ring-4 hover:ring-[rgb(235,235,236)] cursor-crosshair' : ''}`}
      >
        {/* Dynamic Island / Notch Mockup for Mobile */}
        {frame.deviceType === 'mobile' && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-[rgb(20,20,19)] rounded-full z-40 flex items-center justify-between px-2.5 border border-[rgba(235,235,236,0.15)] pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.1)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.05)] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[rgb(235,235,236)] animate-pulse" />
            </div>
          </div>
        )}

        {/* Desktop Top Bezel Header */}
        {frame.deviceType === 'desktop' && (
          <div className="h-7 w-full bg-[rgba(235,235,236,0.04)] border-b border-[rgba(235,235,236,0.1)] flex items-center px-3 gap-1.5 pointer-events-none z-40">
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono ml-3 truncate">
              https://app.protojam.internal/prototype
            </span>
          </div>
        )}

        {/* Child Elements inside Frame */}
        {frameElements.map(element => {
          const isSelected = selectedElementIds.includes(element.id);
          return (
            <div
              key={element.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (isWiring) {
                  finishWiring(frame.id);
                  return;
                }
                if (onStartDragElement) {
                  onStartDragElement(element, e);
                } else {
                  selectElement(element.id, e.shiftKey);
                }
              }}
              style={{
                position: 'absolute',
                left: Number(element.style.x),
                top: Number(element.style.y),
                width: Number(element.style.width),
                height: Number(element.style.height),
                zIndex: isSelected ? 35 : (element.style.zIndex || 10)
              }}
              className={`group/el relative ${element.locked ? 'cursor-default' : 'cursor-move'} transition-all`}
            >
              <SemanticElementRenderer element={element} isInteractive={false} />

              {/* Interactive Transform, Scale & Rotate Box */}
              {isSelected && (
                <TransformSelectionBox
                  element={element}
                  parentFrameOffset={{ x: frame.x, y: frame.y }}
                />
              )}

              {/* Wire Hotspot Connector Handle */}
              {isSelected && (editorMode === 'prototype' || isWiring) && (
                <div
                  title="Drag to wire interaction"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startWiring(element.id, frame.id);
                  }}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#ff6b4a] rounded-full border-2 border-[rgb(20,20,19)] shadow-lg cursor-crosshair flex items-center justify-center hotspot-handle z-50 hover:scale-125 transition-transform"
                >
                  <Icons.Plus size={10} className="text-[rgb(235,235,236)]" />
                </div>
              )}
            </div>
          );
        })}

        {/* Mobile Bottom Home Indicator */}
        {frame.deviceType === 'mobile' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-[rgba(235,235,236,0.3)] rounded-full z-40 pointer-events-none" />
        )}
      </div>

      {/* Frame Resize Handle (Bottom-Right) */}
      {isFrameSelected && !frame.locked && (
        <div
          onPointerDown={handleFrameResizeStart}
          title="Drag to resize screen frame"
          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nwse-resize z-50 hover:scale-125 transition-transform shadow-md"
        />
      )}
    </div>
  );
};
