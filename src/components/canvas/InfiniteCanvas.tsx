import React, { useRef, useState, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ArtboardFrame } from './ArtboardFrame';
import { SectionFrame } from './SectionFrame';
import { SemanticElementRenderer } from './SemanticElementRenderer';
import { ShapeSelectionHighlight } from './ShapeSelectionHighlight';
import { FlowConnectorLines } from './FlowConnectorLines';
import { Minimap } from './Minimap';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { CommentPin } from './CommentPin';
import { UIElement, UIElementType } from '../../types/components';
import { CanvasContextMenu, MenuItem } from './CanvasContextMenu';

// What Ctrl+C / Ctrl+X last took. Kept outside React state: it is not
// something anything renders, and it must survive the canvas re-rendering.
let CLIPBOARD: UIElement[] = [];

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

export const InfiniteCanvas: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

  // Pending comment pin — a world-space point awaiting its first message
  const [draftCommentPos, setDraftCommentPos] = useState<{ x: number; y: number } | null>(null);

  // Box select: left-drag on empty canvas. World coordinates.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(null);
  // Space held: left-drag pans, the way Figma does it.
  const spaceDown = useRef(false);
  // Where the pointer last was, in world space - where a paste lands.
  const lastWorld = useRef<{ x: number; y: number } | null>(null);
  // The right-click menu, in container coordinates, plus the world point.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; wx: number; wy: number; w: number; h: number } | null>(null);

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
    addElement,
    addPredefinedElement,
    comments,
    addComment,
    setSelection,
    pasteElements,
    duplicateElement,
    deleteElement,
    bringToFront,
    sendToBack,
    toggleElementHidden,
    toggleElementLock,
    zoomToFit,
    selectedFrameIds,
    deleteFrame,
    duplicateFrame
  } = useProjectStore();

  // An element's position on the canvas, whether it is free or in a frame.
  const absOf = (el: UIElement) => {
    const f = el.parentId ? frames.find(fr => fr.id === el.parentId) : undefined;
    return { x: (f?.x || 0) + Number(el.style.x), y: (f?.y || 0) + Number(el.style.y) };
  };

  // ---- clipboard -----------------------------------------------------------

  const copySelection = () => {
    CLIPBOARD = elements.filter(el => selectedElementIds.includes(el.id))
                        .map(el => JSON.parse(JSON.stringify(el)));
    return CLIPBOARD.length;
  };

  // Paste: with no point, beside the originals (same parent, +20,+20); with a
  // point (right-click > paste here), as free elements with their group's
  // top-left at that point.
  const pasteClipboard = (at?: { x: number; y: number }) => {
    if (!CLIPBOARD.length) return;
    if (!at) {
      pasteElements(CLIPBOARD.map(el => ({
        ...el, style: { ...el.style, x: Number(el.style.x) + 20, y: Number(el.style.y) + 20 }
      })));
      CLIPBOARD = CLIPBOARD.map(el => ({ ...el, style: { ...el.style, x: Number(el.style.x) + 20, y: Number(el.style.y) + 20 } }));
      return;
    }
    const abs = CLIPBOARD.map(absOf);
    const minX = Math.min(...abs.map(a => a.x)), minY = Math.min(...abs.map(a => a.y));
    pasteElements(CLIPBOARD.map((el, i) => ({
      ...el, parentId: undefined,
      style: { ...el.style, x: Math.round(at.x + abs[i].x - minX), y: Math.round(at.y + abs[i].y - minY) }
    })));
  };

  const selectAll = () => setSelection(elements.filter(el => !el.hidden).map(el => el.id));

  // Keys the canvas owns: space to pan, and the clipboard. Skipped while
  // typing in a field, so Ctrl+C in a text box still copies text.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') { spaceDown.current = true; e.preventDefault(); return; }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'c' && selectedElementIds.length) { e.preventDefault(); copySelection(); }
      else if (k === 'x' && selectedElementIds.length) {
        e.preventDefault();
        copySelection();
        selectedElementIds.forEach(id => deleteElement(id));
      }
      else if (k === 'a') { e.preventDefault(); selectAll(); }
      // Ctrl+V is the 'paste' event below, so a copied image can win
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false; };

    // Paste: an image on the system clipboard (a screenshot, an image copied
    // from a browser) lands at the pointer, inside whatever frame is there.
    // Otherwise, whatever Ctrl+C took.
    const paste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const items = Array.from(e.clipboardData?.items || []);
      const images = items.filter(it => it.kind === 'file' && it.type.startsWith('image/'))
                          .map(it => it.getAsFile()).filter((f): f is File => !!f);
      if (images.length) {
        e.preventDefault();
        const at = lastWorld.current || centreWorld();
        images.forEach((file, i) => placeImageFileAt(file, at.x + i * 32, at.y + i * 32));
        return;
      }
      if (CLIPBOARD.length) { e.preventDefault(); pasteClipboard(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('paste', paste);
    };
  });

  const centreWorld = () => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (rect.width / 2 - viewport.x) / viewport.zoom, y: (rect.height / 2 - viewport.y) / viewport.zoom };
  };

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

    if (ctxMenu) setCtxMenu(null);

    // Hand tool, middle mouse button, or space held
    if (e.button === 1 || activeTool === 'hand' || (e.button === 0 && spaceDown.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    // Comment pin placement — single click opens a draft composer; nothing is
    // created until the first message is actually submitted.
    if (activeTool === 'comment') {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      setDraftCommentPos({ x, y });
      setActiveTool('select');
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

    // Clicking truly empty canvas — either the outer container or the
    // pannable stage background itself, never a frame/element/pin (those
    // stop propagation before this handler ever sees the click) — clears
    // whatever was selected or being edited.
    if (e.button === 0 && (e.target === canvasContainerRef.current || e.target === stageRef.current)) {
      // A box, as in Figma: left-drag on empty canvas selects what it touches.
      // Shift keeps what was already selected. (It used to pan; panning is
      // space+drag, the middle button, or the hand tool.)
      if (!e.shiftKey) clearSelection();
      setInlineEditingElementId(null);
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      setMarquee({ x0: x, y0: y, x1: x, y1: y, add: e.shiftKey });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    lastWorld.current = getWorldCoords(e.clientX, e.clientY);

    if (marquee) {
      setMarquee({ ...marquee, x1: lastWorld.current.x, y1: lastWorld.current.y });
      return;
    }

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
      // everything selected moves together, when the dragged one is part of it
      const ids = selectedElementIds.includes(draggingElementId) ? selectedElementIds : [draggingElementId];
      ids.forEach(id => moveElement(id, deltaX, deltaY));
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

    if (marquee) {
      const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1);
      const y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
      if (x1 - x0 > 3 || y1 - y0 > 3) {
        const touches = (ax: number, ay: number, w: number, h: number) =>
          ax < x1 && ax + w > x0 && ay < y1 && ay + h > y0;
        const hitEls = elements.filter(el => {
          if (el.hidden || el.locked) return false;
          const a = absOf(el);
          return touches(a.x, a.y, Number(el.style.width) || 0, Number(el.style.height) || 0);
        }).map(el => el.id);
        // elements first; only when the box holds none does it pick frames
        const hitFrames = hitEls.length ? [] :
          frames.filter(f => !f.hidden && touches(f.x, f.y, f.width, f.height)).map(f => f.id);
        const keepEls = marquee.add ? selectedElementIds : [];
        const keepFrames = marquee.add ? selectedFrameIds : [];
        setSelection(Array.from(new Set([...keepEls, ...hitEls])), Array.from(new Set([...keepFrames, ...hitFrames])));
      }
      setMarquee(null);
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

  // Places a dropped/uploaded image file onto the canvas at the given world coordinates,
  // parenting it into whichever frame occupies that point (mirrors dropComponentAt's frame lookup).
  const placeImageFileAt = (file: File, worldX: number, worldY: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 360;
        const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(20, Math.round(img.naturalWidth * scale));
        const height = Math.max(20, Math.round(img.naturalHeight * scale));

        const targetFrame = frames.find(f =>
          worldX >= f.x && worldX <= f.x + f.width && worldY >= f.y && worldY <= f.y + f.height
        );
        const x = Math.round(targetFrame ? worldX - targetFrame.x : worldX);
        const y = Math.round(targetFrame ? worldY - targetFrame.y : worldY);

        const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        addPredefinedElement({
          id,
          name: file.name.replace(/\.[^/.]+$/, '') || 'Image',
          type: 'image',
          parentId: targetFrame?.id,
          interactions: [],
          style: { x, y, width, height },
          semanticProps: { src, alt: file.name }
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Drag-and-drop from sidebar component library, or image files dragged in from the OS
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      files.forEach((file, i) => placeImageFileAt(file, x + i * 32, y + i * 32));
      return;
    }

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
      onContextMenu={(e) => {
        // ProtoJam's own menu, never the browser's
        e.preventDefault();
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const hit = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
        const id = hit?.dataset.elId;
        if (id && !selectedElementIds.includes(id)) setSelection([id]);
        if (!id && !hit) {
          // right-click on empty canvas keeps the selection, so "paste here"
          // and friends act on it
        }
        const w = getWorldCoords(e.clientX, e.clientY);
        setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, wx: w.x, wy: w.y, w: rect.width, h: rect.height });
      }}
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
        ref={stageRef}
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
              if (e.shiftKey || !selectedElementIds.includes(el.id)) selectElement(el.id, e.shiftKey);
              setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: Number(el.style.x), origY: Number(el.style.y) });
            }}
          />
        ))}

        {/* 3. Free Canvas Elements (Detached / Outside Frames) */}
        {freeElements.map(element => {
          const isSelected = selectedElementIds.includes(element.id);
          const isAutoSizeText = (element.type === 'text' || element.type === 'heading') && element.style.autoSize;
          return (
            <div
              key={element.id}
              onMouseDown={(e) => {
                // Let a drawing/placement tool pass straight through to the canvas
                // instead of this existing element hijacking the click as a move —
                // otherwise you can never draw or place something on top of it.
                if (activeTool !== 'select' || e.button !== 0) return;
                e.stopPropagation();
                if (e.shiftKey || !selectedElementIds.includes(element.id)) selectElement(element.id, e.shiftKey);
                setDraggingElementId(element.id);
                setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: Number(element.style.x), origY: Number(element.style.y) });
              }}
              onClick={(e) => { if (activeTool === 'select') e.stopPropagation(); }}
              data-el-id={element.id}
              style={{
                position: 'absolute',
                left: Number(element.style.x),
                top: Number(element.style.y),
                ...(isAutoSizeText
                  ? { width: 'max-content', height: 'max-content', maxWidth: 'none' as const }
                  : { width: Number(element.style.width), height: Number(element.style.height) }),
                zIndex: isSelected ? 35 : (element.style.zIndex || 5),
                pointerEvents: activeTool !== 'select' ? 'none' : undefined
              }}
              className="cursor-move group relative"
            >
              <SemanticElementRenderer element={element} isInteractive={false} />
              {isSelected && activeTool === 'select' && <ShapeSelectionHighlight element={element} />}
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

        {/* 6. Comment Pins */}
        {comments.map(c => (
          <CommentPin key={c.id} comment={c} />
        ))}

        {/* 7. Draft Comment Composer — pending pin awaiting its first message */}
        {draftCommentPos && (
          <div
            style={{ position: 'absolute', left: draftCommentPos.x, top: draftCommentPos.y }}
            className="z-50"
          >
            <div className="w-7 h-7 rounded-full bg-[#ff6b4a] border-2 border-[rgb(20,20,19)] shadow-lg -translate-x-1/2" />
            <div className="mt-1 w-56 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl p-2">
              <textarea
                rows={2}
                placeholder="Leave a comment... (Enter to post, Esc to cancel)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const text = (e.target as HTMLTextAreaElement).value.trim();
                    if (text) addComment(draftCommentPos.x, draftCommentPos.y, text);
                    setDraftCommentPos(null);
                  } else if (e.key === 'Escape') {
                    setDraftCommentPos(null);
                  }
                }}
                className="w-full bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] text-xs p-2 rounded-lg outline-none border border-[rgba(235,235,236,0.1)] resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag cursor overlay — while actively dragging an element/frame, force a
          consistent grabbing cursor regardless of what's underneath (a text
          element's own cursor-text style would otherwise win mid-drag). */}
      {(draggingElementId || draggingFrameId) && (
        <div
          className="fixed inset-0 z-[9999] cursor-grabbing"
          // This overlay sits inside the canvas, so without stopping here each
          // move also bubbled to the canvas's own handler and every drag went
          // twice as far as the mouse did.
          onMouseMove={(e) => { e.stopPropagation(); handleMouseMove(e); }}
          onMouseUp={(e) => { e.stopPropagation(); handleMouseUp(e); }}
        />
      )}

      {/* Box select */}
      {marquee && (
        <div
          className="absolute pointer-events-none border border-[#ff6b4a] bg-[rgba(255,107,74,0.08)] z-[60]"
          style={{
            left: Math.min(marquee.x0, marquee.x1) * viewport.zoom + viewport.x,
            top: Math.min(marquee.y0, marquee.y1) * viewport.zoom + viewport.y,
            width: Math.abs(marquee.x1 - marquee.x0) * viewport.zoom,
            height: Math.abs(marquee.y1 - marquee.y0) * viewport.zoom
          }}
        />
      )}

      {/* Right-click menu */}
      {ctxMenu && (() => {
        const n = selectedElementIds.length, nf = selectedFrameIds.length;
        const items: MenuItem[] = [];
        if (n) {
          items.push({ label: 'Copy', hint: 'Ctrl+C', run: () => copySelection() });
          items.push({ label: 'Cut', hint: 'Ctrl+X', run: () => { copySelection(); selectedElementIds.forEach(id => deleteElement(id)); } });
        }
        items.push({ label: 'Paste here', hint: 'Ctrl+V', disabled: !CLIPBOARD.length,
                     run: () => pasteClipboard({ x: ctxMenu.wx, y: ctxMenu.wy }) });
        if (n) {
          items.push({ divider: true });
          items.push({ label: n > 1 ? `Duplicate ${n}` : 'Duplicate', hint: 'Ctrl+D', run: () => selectedElementIds.forEach(id => duplicateElement(id)) });
          items.push({ label: 'Bring to front', run: () => selectedElementIds.forEach(id => bringToFront(id)) });
          items.push({ label: 'Send to back', run: () => selectedElementIds.forEach(id => sendToBack(id)) });
          items.push({ label: 'Hide', run: () => selectedElementIds.forEach(id => toggleElementHidden(id)) });
          items.push({ label: 'Lock / unlock', run: () => selectedElementIds.forEach(id => toggleElementLock(id)) });
          items.push({ divider: true });
          items.push({ label: n > 1 ? `Delete ${n}` : 'Delete', hint: 'Del', danger: true, run: () => selectedElementIds.forEach(id => deleteElement(id)) });
        } else if (nf) {
          items.push({ divider: true });
          items.push({ label: 'Duplicate frame', hint: 'Ctrl+D', run: () => selectedFrameIds.forEach(id => duplicateFrame(id)) });
          items.push({ label: 'Delete frame', hint: 'Del', danger: true, run: () => selectedFrameIds.forEach(id => deleteFrame(id)) });
        }
        items.push({ divider: true });
        items.push({ label: 'Select all', hint: 'Ctrl+A', run: selectAll });
        items.push({ label: 'Zoom to fit', hint: 'Ctrl+1', run: () => zoomToFit() });
        return <CanvasContextMenu x={ctxMenu.x} y={ctxMenu.y} roomW={ctxMenu.w} roomH={ctxMenu.h}
                                  items={items} onClose={() => setCtxMenu(null)} />;
      })()}

      {/* Floating Centered Bottom Toolbar */}
      <BottomToolbar />

      {/* Auto-fading 20% Smaller Radar Map (Minimap) */}
      <Minimap />
    </div>
  );
};
