import React, { useLayoutEffect, useRef } from 'react';
import { DeviceFrame, UIElement } from '../../types/components';
import { ElementNode } from './ElementNode';
import { flexLayoutCss } from '../../lib/styleCss';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import * as Icons from 'lucide-react';
import { startGesture } from '../../lib/gesture';

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
    isWiring,
    finishWiring,
    updateFrameDimensions,
    viewport,
    pushHistory,
    updateAutoLayout
  } = useProjectStore(useShallow((s) => ({ selectedFrameIds: s.selectedFrameIds, selectedElementIds: s.selectedElementIds, selectFrame: s.selectFrame, selectElement: s.selectElement, deleteFrame: s.deleteFrame, duplicateFrame: s.duplicateFrame, toggleFrameOrientation: s.toggleFrameOrientation, toggleFrameLock: s.toggleFrameLock, toggleFrameHidden: s.toggleFrameHidden, setStartingFrame: s.setStartingFrame, startPlaying: s.startPlaying, isWiring: s.isWiring, finishWiring: s.finishWiring, updateFrameDimensions: s.updateFrameDimensions, updateAutoLayout: s.updateAutoLayout, viewport: s.viewport, pushHistory: s.pushHistory })));

  const isFrameSelected = selectedFrameIds.includes(frame.id);
  // its direct children; things inside containers are drawn by those
  const frameElements = elements.filter(el => el.parentId === frame.id || (!el.parentId && frame.elementIds.includes(el.id)));

  const autoLayout = frame.autoLayout?.enabled ? frame.autoLayout : null;
  const hugW = autoLayout?.sizingH === 'hug', hugH = autoLayout?.sizingV === 'hug';
  const outerRef = useRef<HTMLDivElement>(null);
  const isGroup = !!frame.isGroup || frame.name === 'Auto Layout Group';

  // Auto layout decides some sizes - a frame hugging its contents, a child
  // filling the frame. Whatever it drew is written back, so the W/H fields,
  // snapping and the selection box tell the truth.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!autoLayout || !outer) return;
    if (hugW || hugH) {
      const w = hugW ? outer.offsetWidth : frame.width, h = hugH ? outer.offsetHeight : frame.height;
      if (Math.abs(w - frame.width) >= 1 || Math.abs(h - frame.height) >= 1) updateFrameDimensions(frame.id, w, h);
    }
  });

  if (frame.hidden) return null;
  // the same flex layout frames inside screens use (both axes aligned)
  const frameBodyLayoutStyle: React.CSSProperties = autoLayout ? flexLayoutCss(autoLayout) : {};

  const handleFrameBodyPointerDown = (e: React.PointerEvent) => {
    // a right-press opens the context menu; it used to start dragging the frame
    if (frame.locked || e.button !== 0) return;
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
    if (hugW || hugH) updateAutoLayout(frame.id, { sizingH: 'fixed', sizingV: 'fixed' });

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = (moveEvt.clientX - startX) / zoom;
      const dy = (moveEvt.clientY - startY) / zoom;
      updateFrameDimensions(
        frame.id,
        Math.max(200, Math.round(initialW + dx)),
        Math.max(200, Math.round(initialH + dy))
      );
    };

    const off = () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };
    const onPointerUp = () => { off(); end(); pushHistory(); };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    // right-click or Esc mid-drag puts it all back (src/lib/gesture.ts)
    const end = startGesture(off);
  };

  return (
    <div
      ref={outerRef}
      data-frame-id={frame.id}
      style={{
        position: 'absolute',
        left: frame.x,
        top: frame.y,
        width: hugW ? 'max-content' : frame.width,
        height: hugH ? 'max-content' : frame.height
      }}
      className={`group select-none transition-shadow ${
        frame.locked ? 'cursor-default' : ''
      }`}
    >
      {/* Frame Header Bar with Title & Quick Action Icons */}
      <div
        onPointerDown={(e) => {
          if (frame.locked || e.button !== 0) return;
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
          {frame.isStartingFrame && !isGroup && (
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
        {/* a group is an object, not a screen: no screen buttons */}
        <div className={`${isGroup ? 'hidden' : 'flex'} items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
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
        data-frame-body={frame.id}
        onPointerDown={handleFrameBodyPointerDown}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: frame.backgroundColor || '#141413',
          borderRadius: isGroup ? 0 : frame.deviceType === 'mobile' ? 44 : frame.deviceType === 'tablet' ? 24 : 12,
          overflow: frame.clipContent === false ? 'visible' : 'hidden',
          ...frameBodyLayoutStyle
        }}
        className={`relative transition-shadow ${isGroup ? '' : 'shadow-2xl'} ${
          isFrameSelected 
            ? (isGroup ? 'ring-[1.5px] ring-[#ff6b4a]' : 'ring-2 ring-[rgb(235,235,236)] ring-offset-2 ring-offset-[rgb(20,20,19)]') 
            : (isGroup ? '' : 'ring-1 ring-[rgba(235,235,236,0.15)]')
        } ${isWiring ? 'hover:ring-4 hover:ring-[rgb(235,235,236)] cursor-crosshair' : ''}`}
      >
        {/* Dynamic Island / Notch Mockup for Mobile */}
        {frame.deviceType === 'mobile' && (
          <div data-export-skip className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-[rgb(20,20,19)] rounded-full z-40 flex items-center justify-between px-2.5 border border-[rgba(235,235,236,0.15)] pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.1)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.05)] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[rgb(235,235,236)] animate-pulse" />
            </div>
          </div>
        )}

        {/* Desktop Top Bezel Header */}
        {frame.deviceType === 'desktop' && (
          <div data-export-skip className="h-7 w-full bg-[rgba(235,235,236,0.04)] border-b border-[rgba(235,235,236,0.1)] flex items-center px-3 gap-1.5 pointer-events-none z-40">
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(235,235,236,0.2)]" />
            <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono ml-3 truncate">
              https://app.protojam.internal/prototype
            </span>
          </div>
        )}

        {/* Child Elements inside Frame (containers draw their own children) */}
        {frameElements.map((element, layer) => (
          <ElementNode
            key={element.id}
            element={element}
            parentLayout={autoLayout}
            layer={layer}
            boxInside={false}
            frameId={frame.id}
            onPress={(el, e) => {
              // an old-style group frame: a click picks the group until
              // something inside it is selected
              if (isGroup && !frameElements.some(fe => selectedElementIds.includes(fe.id))) {
                handleFrameBodyPointerDown(e);
                return;
              }
              if (onStartDragElement) onStartDragElement(el, e);
              else selectElement(el.id, e.shiftKey);
            }}
          />
        ))}

        {/* Mobile Bottom Home Indicator */}
        {frame.deviceType === 'mobile' && (
          <div data-export-skip className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-[rgba(235,235,236,0.3)] rounded-full z-40 pointer-events-none" />
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
