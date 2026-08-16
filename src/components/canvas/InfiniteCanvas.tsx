import React, { useRef, useState, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ArtboardFrame } from './ArtboardFrame';
import { SectionFrame } from './SectionFrame';
import { SemanticElementRenderer } from './SemanticElementRenderer';
import { ShapeSelectionHighlight } from './ShapeSelectionHighlight';
import { FlowConnectorLines } from './FlowConnectorLines';
import { Minimap } from './Minimap';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { UIElement, UIElementType } from '../../types/components';

export const InfiniteCanvas: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging elements or frames
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ mouseX: 0, mouseY: 0, origX: 0, origY: 0 });

  // Drag-to-draw custom shapes / frames / sections
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  const {
    frames,
    sections,
    elements,
    selectedElementIds,
    viewport,
    setViewport,
    panBy,
    activeTool,
    setActiveTool,
    clearSelection,
    isWiring,
    updateWireMousePos,
    cancelWiring,
    canvasSettings,
    dropComponentAt,
    moveElement,
    moveFrame,
    selectElement,
    selectFrame,
    editorMode,
    finishDrawingShape,
    reparentElement,
    isVectorEditing,
    vectorTool,
    addVectorPoint,
    setInlineEditingElementId,
    addElement
  } = useProjectStore();

  const freeElements = elements.filter(el => !el.parentId && !el.hidden);

  // Prevent native browser zoom and enable trackpad pan / zoom
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.005;
        const newZoom = Math.min(Math.max(viewport.zoom * Math.exp(zoomDelta), 0.1), 4.0);
        
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - viewport.x) / viewport.zoom;
        const worldY = (mouseY - viewport.y) / viewport.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        setViewport({ x: newX, y: newY, zoom: newZoom });
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };

    el.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelEvent);
  }, [viewport, setViewport, panBy]);

  const getWorldCoords = (clientX: number, clientY: number) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    return {
      x: (mouseX - viewport.x) / viewport.zoom,
      y: (mouseY - viewport.y) / viewport.zoom
    };
  };

  // Mouse pan / draw handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Vector Pen tool point adding
    if (isVectorEditing && vectorTool === 'pen') {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      addVectorPoint(x, y);
      return;
    }

    // Hand tool or middle mouse button
    if (e.button === 1 || activeTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    // Drag-to-draw shapes, frames, sections, text
    const shapeDrawTools: string[] = ['rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'frame', 'section', 'text', 'button', 'input', 'sticky'];
    if (shapeDrawTools.includes(activeTool)) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
      return;
    }

    if (e.button === 0 && e.target === canvasContainerRef.current) {
      clearSelection();
      setInlineEditingElementId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDrawing) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      setDrawCurrent({ x, y });
      return;
    }

    // Handle element dragging
    if (draggingElementId) {
      const deltaX = (e.clientX - dragStartPos.mouseX) / viewport.zoom;
      const deltaY = (e.clientY - dragStartPos.mouseY) / viewport.zoom;
      moveElement(draggingElementId, deltaX, deltaY);
      setDragStartPos(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
      return;
    }

    // Handle frame dragging
    if (draggingFrameId) {
      const deltaX = (e.clientX - dragStartPos.mouseX) / viewport.zoom;
      const deltaY = (e.clientY - dragStartPos.mouseY) / viewport.zoom;
      moveFrame(draggingFrameId, deltaX, deltaY);
      setDragStartPos(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
      return;
    }

    // Handle prototype wiring line updates
    if (isWiring) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      updateWireMousePos(x, y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing) {
      setIsDrawing(false);
      const dist = Math.hypot(drawCurrent.x - drawStart.x, drawCurrent.y - drawStart.y);
      if (dist > 15) {
        finishDrawingShape(activeTool, drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y);
        setActiveTool('select');
      } else {
        // Single click placement
        const { x, y } = getWorldCoords(e.clientX, e.clientY);
        if (activeTool === 'text') {
          const elId = addElement('text', Math.round(x), Math.round(y));
          setInlineEditingElementId(elId);
        } else if (activeTool === 'frame') {
          finishDrawingShape('frame', x, y, x + 393, y + 852);
        } else if (activeTool === 'section') {
          finishDrawingShape('section', x, y, x + 800, y + 700);
        } else {
          dropComponentAt(activeTool as UIElementType, x, y);
        }
        setActiveTool('select');
      }
    }

    // Reparenting check on finishing element drag
    if (draggingElementId) {
      const el = elements.find(item => item.id === draggingElementId);
      if (el) {
        const absX = el.parentId 
          ? (frames.find(f => f.id === el.parentId)?.x || 0) + Number(el.style.x)
          : Number(el.style.x);
        const absY = el.parentId 
          ? (frames.find(f => f.id === el.parentId)?.y || 0) + Number(el.style.y)
          : Number(el.style.y);

        // Find which frame the center of element is inside
        const elCenterX = absX + Number(el.style.width) / 2;
        const elCenterY = absY + Number(el.style.height) / 2;

        let targetFrame = frames.find(f => 
          elCenterX >= f.x && elCenterX <= f.x + f.width &&
          elCenterY >= f.y && elCenterY <= f.y + f.height
        );

        if (targetFrame && targetFrame.id !== el.parentId) {
          reparentElement(el.id, targetFrame.id, absX, absY);
        } else if (!targetFrame && el.parentId) {
          // Dragged out to canvas
          reparentElement(el.id, undefined, absX, absY);
        }
      }
      setDraggingElementId(null);
    }

    setDraggingFrameId(null);
  };

  // Drag-and-drop from sidebar component library
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('application/protojam-component') as UIElementType;
    if (!componentType) return;

    const { x, y } = getWorldCoords(e.clientX, e.clientY);
    dropComponentAt(componentType, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div
      ref={canvasContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`w-full h-full relative overflow-hidden select-none bg-[rgb(20,20,19)] ${
        activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : 
        activeTool === 'pen' ? 'cursor-crosshair' :
        ['rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'frame', 'section'].includes(activeTool) ? 'cursor-crosshair' :
        activeTool === 'text' ? 'cursor-text' : 'cursor-default'
      }`}
    >
      {/* Infinite Canvas Background Grid / Dots */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: canvasSettings.gridType === 'dots'
            ? 'radial-gradient(rgba(235, 235, 236, 0.12) 1px, transparent 1px)'
            : canvasSettings.gridType === 'grid'
            ? 'linear-gradient(to right, rgba(235, 235, 236, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(235, 235, 236, 0.05) 1px, transparent 1px)'
            : 'none',
          backgroundSize: `${canvasSettings.gridSize * viewport.zoom}px ${canvasSettings.gridSize * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`
        }}
      />

      {/* Scaled & Transformed Canvas Stage */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
        className="absolute inset-0 pointer-events-auto"
      >
        {/* 1. Organizing Sections (Rendered behind frames) */}
        {sections.map(section => (
          <SectionFrame key={section.id} section={section} />
        ))}

        {/* 2. Device Artboard Frames */}
        {frames.map(frame => (
          <ArtboardFrame
            key={frame.id}
            frame={frame}
            elements={elements}
            onStartDragFrame={(e) => {
              setDraggingFrameId(frame.id);
              setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: frame.x, origY: frame.y });
            }}
            onStartDragElement={(el, e) => {
              setDraggingElementId(el.id);
              selectElement(el.id, e.shiftKey);
              setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: Number(el.style.x), origY: Number(el.style.y) });
            }}
          />
        ))}

        {/* 3. Free Canvas Elements (Detached / Outside Frames) */}
        {freeElements.map(element => {
          const isSelected = selectedElementIds.includes(element.id);
          return (
            <div
              key={element.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                selectElement(element.id, e.shiftKey);
                setDraggingElementId(element.id);
                setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: Number(element.style.x), origY: Number(element.style.y) });
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: Number(element.style.x),
                top: Number(element.style.y),
                width: Number(element.style.width),
                height: Number(element.style.height),
                zIndex: isSelected ? 35 : (element.style.zIndex || 5)
              }}
              className="cursor-move group relative"
            >
              <SemanticElementRenderer element={element} isInteractive={false} />
              {isSelected && <ShapeSelectionHighlight element={element} />}
            </div>
          );
        })}

        {/* 4. Prototype Wire Connecting Lines */}
        {(editorMode === 'prototype' || isWiring) && (
          <FlowConnectorLines frames={frames} elements={elements} />
        )}

        {/* 5. Live Shape / Frame / Section Drawing Box Preview */}
        {isDrawing && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(drawStart.x, drawCurrent.x),
              top: Math.min(drawStart.y, drawCurrent.y),
              width: Math.abs(drawCurrent.x - drawStart.x),
              height: Math.abs(drawCurrent.y - drawStart.y)
            }}
            className="border-2 border-[rgb(235,235,236)] bg-[rgba(235,235,236,0.08)] rounded border-dashed pointer-events-none z-50 flex items-center justify-center text-[10px] font-mono text-[rgb(235,235,236)]"
          >
            <span>{Math.round(Math.abs(drawCurrent.x - drawStart.x))} × {Math.round(Math.abs(drawCurrent.y - drawStart.y))}</span>
          </div>
        )}
      </div>

      {/* Floating Centered Bottom Toolbar */}
      <BottomToolbar />

      {/* Auto-fading 20% Smaller Radar Map (Minimap) */}
      <Minimap />
    </div>
  );
};
