import React, { useRef, useState, useEffect } from 'react';
import { useProjectStore, toolToElementType, ZOOM_MAX, ZOOM_MIN } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { ArtboardFrame } from './ArtboardFrame';
import { SectionFrame } from './SectionFrame';
import { TransformSelectionBox } from './TransformSelectionBox';
import { FlowConnectorLines } from './FlowConnectorLines';
import { Minimap } from './Minimap';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { CommentPin } from './CommentPin';
import { UIElement, UIElementType } from '../../types/components';
import { CanvasContextMenu, MenuItem } from './CanvasContextMenu';
import { Rulers, RULER } from './Rulers';
import { isTextEl, rotateCss } from '../../lib/styleCss';
import { putAsset } from '../../lib/assets';
import { PenOverlay } from './PenOverlay';
import { BOOLEANABLE, vectorAllD } from '../../lib/boolean';
import { ElementNode } from './ElementNode';
import { absBoxOf, chainOf, frameAbove, inFlow, originOf, pickTarget, subtreeIds, takesDrops } from '../../lib/tree';

type Box = { x0: number; y0: number; x1: number; y1: number };
// A smart guide drawn while dragging: a line in canvas space, and the gap to
// the thing it lined up with when there is one.
type SnapLine = { axis: 'x' | 'y'; at: number; from: number; to: number; gap?: { value: number; mid: number } };

// What Ctrl+C / Ctrl+X last took. Kept outside React state: it is not
// something anything renders, and it must survive the canvas re-rendering.
let CLIPBOARD: UIElement[] = [];

const isMedia = (type: string) => type.startsWith('image/') || type.startsWith('video/');

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
  // Alt while drawing: from the centre out
  const [drawFromCentre, setDrawFromCentre] = useState(false);
  // the box being drawn, Alt (centre) included
  const drawBox = () => {
    const dx = drawCurrent.x - drawStart.x, dy = drawCurrent.y - drawStart.y;
    return drawFromCentre
      ? { x0: drawStart.x - dx, y0: drawStart.y - dy, x1: drawStart.x + dx, y1: drawStart.y + dy }
      : { x0: drawStart.x, y0: drawStart.y, x1: drawCurrent.x, y1: drawCurrent.y };
  };

  // Pending comment pin — a world-space point awaiting its first message
  const [draftCommentPos, setDraftCommentPos] = useState<{ x: number; y: number } | null>(null);

  // Box select: left-drag on empty canvas. World coordinates.
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(null);
  // A press on an element only becomes a drag once the mouse has moved a few
  // pixels. Until then nothing is laid over the canvas, so the second click
  // of a double-click still reaches the element (double-click to edit text).
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  // Where each dragged element started, so a drag places them absolutely
  // (start + offset) - adding a rounded step per mouse move drifted, and
  // snapping needs the true offset to work from.
  const dragOrig = useRef<Map<string, { x: number; y: number }> | null>(null);
  // The press was on a text that was already the only thing selected: let go
  // without dragging and it opens for editing, as in Figma.
  const pressedSelectedText = useRef(false);
  // a laid-out element's box when its drag began
  const flowStart = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  // Dragging over an auto-layout row / column: where it would go in, and the
  // line that shows it (canvas units). index -1: dropped by position instead.
  const [flowDrop, setFlowDrop] = useState<{ parentId?: string; index: number; line?: { x: number; y: number; w: number; h: number } } | null>(null);
  // a laid-out element being dragged: an outline follows the pointer
  const [flowGhost, setFlowGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // For the rulers: the pointer in canvas space, and the canvas's size.
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
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
    duplicateFrame,
    toggleFrameLock,
    toggleFrameHidden,
    alignSelectedElements,
    groupSelectedIntoAutoLayout,
    createMasterComponent,
    bringForward,
    sendBackward,
    guides,
    hoveredElementId: hoverId,
    updateElementPosition,
    updateCanvasSettings
  } = useProjectStore(useShallow((s) => ({ frames: s.frames, sections: s.sections, elements: s.elements, selectedElementIds: s.selectedElementIds, viewport: s.viewport, setViewport: s.setViewport, panBy: s.panBy, activeTool: s.activeTool, setActiveTool: s.setActiveTool, clearSelection: s.clearSelection, isWiring: s.isWiring, updateWireMousePos: s.updateWireMousePos, cancelWiring: s.cancelWiring, canvasSettings: s.canvasSettings, dropComponentAt: s.dropComponentAt, moveElement: s.moveElement, moveFrame: s.moveFrame, selectElement: s.selectElement, selectFrame: s.selectFrame, editorMode: s.editorMode, finishDrawingShape: s.finishDrawingShape, reparentElement: s.reparentElement, isVectorEditing: s.isVectorEditing, setInlineEditingElementId: s.setInlineEditingElementId, addElement: s.addElement, addPredefinedElement: s.addPredefinedElement, comments: s.comments, addComment: s.addComment, setSelection: s.setSelection, pasteElements: s.pasteElements, duplicateElement: s.duplicateElement, deleteElement: s.deleteElement, bringToFront: s.bringToFront, sendToBack: s.sendToBack, toggleElementHidden: s.toggleElementHidden, toggleElementLock: s.toggleElementLock, zoomToFit: s.zoomToFit, selectedFrameIds: s.selectedFrameIds, deleteFrame: s.deleteFrame, duplicateFrame: s.duplicateFrame, toggleFrameLock: s.toggleFrameLock, toggleFrameHidden: s.toggleFrameHidden, alignSelectedElements: s.alignSelectedElements, groupSelectedIntoAutoLayout: s.groupSelectedIntoAutoLayout, createMasterComponent: s.createMasterComponent, bringForward: s.bringForward, sendBackward: s.sendBackward, guides: s.guides, hoveredElementId: s.hoveredElementId, updateElementPosition: s.updateElementPosition, updateCanvasSettings: s.updateCanvasSettings })));

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- smart guides ------------------------------------------------------
  //
  // While dragging, the moving selection's left / centre / right and top /
  // middle / bottom snap to the same lines of every other element, every
  // frame, and every ruler guide, within 6 screen pixels. Ctrl held: no snap.
  const boxOf = (el: UIElement, at?: { x: number; y: number }): Box => {
    const o = originOf(el.parentId, elements, frames);
    const x = o.x + (at ? at.x : Number(el.style.x));
    const y = o.y + (at ? at.y : Number(el.style.y));
    return { x0: x, y0: y, x1: x + (Number(el.style.width) || 0), y1: y + (Number(el.style.height) || 0) };
  };
  // Placed by x/y all the way up - its box can be worked out without the page.
  const placed = (el: UIElement) => chainOf(el.id, elements).every(c => !inFlow(c, elements, frames));

  const computeSnap = (ids: string[], dx: number, dy: number) => {
    let m: Box | null = null;
    for (const id of ids) {
      const el = elements.find(x => x.id === id); const o = dragOrig.current?.get(id);
      if (!el || !o) continue;
      const w = Number(el.style.width) || 0, h = Number(el.style.height) || 0;
      const b = { x0: o.x + dx, y0: o.y + dy, x1: o.x + dx + w, y1: o.y + dy + h };
      m = m ? { x0: Math.min(m.x0, b.x0), y0: Math.min(m.y0, b.y0), x1: Math.max(m.x1, b.x1), y1: Math.max(m.y1, b.y1) } : b;
    }
    if (!m) return { dx: 0, dy: 0, lines: [] as SnapLine[] };
    const others: Box[] = [
      ...elements.filter(el => !el.hidden && placed(el) && !ids.some(id => subtreeIds(id, elements).includes(el.id))).map(el => boxOf(el)),
      ...frames.filter(f => !f.hidden).map(f => ({ x0: f.x, y0: f.y, x1: f.x + f.width, y1: f.y + f.height }))
    ];
    const thr = 6 / viewport.zoom;
    type Hit = { d: number; line: number; box: Box | null };
    const best = (mine: number[], axis: 'x' | 'y'): Hit | null => {
      let hit: Hit | null = null;
      const consider = (line: number, box: Box | null) => {
        for (const v of mine) {
          const d = line - v;
          if (Math.abs(d) <= thr && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, line, box };
        }
      };
      for (const b of others) {
        const ls = axis === 'x' ? [b.x0, (b.x0 + b.x1) / 2, b.x1] : [b.y0, (b.y0 + b.y1) / 2, b.y1];
        ls.forEach(l => consider(l, b));
      }
      guides.filter(g => g.axis === axis).forEach(g => consider(g.pos, null));
      return hit;
    };
    const hx = best([m.x0, (m.x0 + m.x1) / 2, m.x1], 'x');
    const hy = best([m.y0, (m.y0 + m.y1) / 2, m.y1], 'y');
    const sdx = hx ? hx.d : 0, sdy = hy ? hy.d : 0;
    const s: Box = { x0: m.x0 + sdx, y0: m.y0 + sdy, x1: m.x1 + sdx, y1: m.y1 + sdy };
    const lines: SnapLine[] = [];
    const span = 1e5;
    if (hx) {
      const b = hx.box;
      let gap: SnapLine['gap'];
      if (b && b.y0 >= s.y1) gap = { value: b.y0 - s.y1, mid: (b.y0 + s.y1) / 2 };
      else if (b && s.y0 >= b.y1) gap = { value: s.y0 - b.y1, mid: (s.y0 + b.y1) / 2 };
      lines.push({ axis: 'x', at: hx.line, from: b ? Math.min(s.y0, b.y0) : -span, to: b ? Math.max(s.y1, b.y1) : span, gap });
    }
    if (hy) {
      const b = hy.box;
      let gap: SnapLine['gap'];
      if (b && b.x0 >= s.x1) gap = { value: b.x0 - s.x1, mid: (b.x0 + s.x1) / 2 };
      else if (b && s.x0 >= b.x1) gap = { value: s.x0 - b.x1, mid: (s.x0 + b.x1) / 2 };
      lines.push({ axis: 'y', at: hy.line, from: b ? Math.min(s.x0, b.x0) : -span, to: b ? Math.max(s.x1, b.x1) : span, gap });
    }
    return { dx: sdx, dy: sdy, lines };
  };

  // The selection's extent, for the rulers.
  const selectionBox = (): Box | null => {
    let m: Box | null = null;
    const add = (b: Box) => { m = m ? { x0: Math.min(m.x0, b.x0), y0: Math.min(m.y0, b.y0), x1: Math.max(m.x1, b.x1), y1: Math.max(m.y1, b.y1) } : b; };
    elements.filter(el => selectedElementIds.includes(el.id)).forEach(el => add(boxOf(el)));
    frames.filter(f => selectedFrameIds.includes(f.id)).forEach(f => add({ x0: f.x, y0: f.y, x1: f.x + f.width, y1: f.y + f.height }));
    return m;
  };

  // An element's position on the canvas, whether it is free or in a frame.
  const absOf = (el: UIElement) => { const b = absBoxOf(el, elements, frames); return { x: b.x, y: b.y }; };

  // Where an element really is on the canvas - from the page, so auto layout
  // is counted. Falls back to the stored position.
  const worldBoxOf = (id: string) => {
    const n = document.querySelector(`[data-el-id="${id}"]`);
    if (!n) { const el = elements.find(e => e.id === id); return el ? absBoxOf(el, elements, frames) : null; }
    // its own box before any turn: the centre from the page, the size from layout
    const r = n.getBoundingClientRect(), c = getWorldCoords(r.left + r.width / 2, r.top + r.height / 2);
    const w = (n as HTMLElement).offsetWidth, h = (n as HTMLElement).offsetHeight;
    return { x: c.x - w / 2, y: c.y - h / 2, w, h };
  };

  // The deepest frame (container or screen) at a canvas point, not one of `own`.
  const holderAt = (px: number, py: number, own: Set<string>) => {
    const c = elements
      .filter(x => takesDrops(x) && !x.hidden && !own.has(x.id))
      .map(x => ({ x, r: worldBoxOf(x.id), depth: chainOf(x.id, elements).length }))
      .filter(({ r }) => r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h)
      .sort((p, q) => q.depth - p.depth)[0]?.x;
    if (c) return { id: c.id as string | undefined, layout: c.style.autoLayout?.enabled ? c.style.autoLayout : null };
    const f = frames.find(fr => !fr.hidden && px >= fr.x && px <= fr.x + fr.width && py >= fr.y && py <= fr.y + fr.height);
    return { id: f?.id, layout: f?.autoLayout?.enabled ? f.autoLayout : null };
  };

  // Where in a row / column a point falls: the index among the laid-out
  // children, and a line between them to show it.
  const flowSlot = (parentId: string, layout: NonNullable<ReturnType<typeof holderAt>['layout']>, px: number, py: number, skip: string) => {
    const row = layout.direction === 'horizontal';
    const sibs = elements.filter(x => x.parentId === parentId && x.id !== skip && !x.hidden && !x.style.absolutePosition)
      .map(x => worldBoxOf(x.id)!).filter(Boolean);
    const p = row ? px : py;
    const index = sibs.filter(b => (row ? b.x + b.w / 2 : b.y + b.h / 2) < p).length;
    const pr = worldBoxOf(parentId) || (() => { const f = frames.find(fr => fr.id === parentId)!; return { x: f.x, y: f.y, w: f.width, h: f.height }; })();
    const g = (layout.gap || 0) / 2;
    const T = 2 / viewport.zoom;
    let at: number;
    if (!sibs.length) at = row ? pr.x + (layout.padding?.left || 0) : pr.y + (layout.padding?.top || 0);
    else if (index < sibs.length) at = (row ? sibs[index].x : sibs[index].y) - g;
    else { const l = sibs[sibs.length - 1]; at = (row ? l.x + l.w : l.y + l.h) + g; }
    const c0 = sibs.length ? Math.min(...sibs.map(b => row ? b.y : b.x)) : (row ? pr.y : pr.x);
    const c1 = sibs.length ? Math.max(...sibs.map(b => row ? b.y + b.h : b.x + b.w)) : (row ? pr.y + pr.h : pr.x + pr.w);
    return { index, line: row ? { x: at - T / 2, y: c0, w: T, h: c1 - c0 } : { x: c0, y: at - T / 2, w: c1 - c0, h: T } };
  };

  // ---- clipboard -----------------------------------------------------------

  const copySelection = () => {
    const ids = new Set(selectedElementIds.flatMap(id => subtreeIds(id, elements)));
    CLIPBOARD = elements.filter(el => ids.has(el.id)).map(el => JSON.parse(JSON.stringify(el)));
    return CLIPBOARD.length;
  };
  // the copied things themselves, not what is inside them
  const clipRoots = () => CLIPBOARD.filter(el => !CLIPBOARD.some(o => o.id === el.parentId));

  // Paste: with no point, beside the originals (same parent, +20,+20); with a
  // point (right-click > paste here), as free elements with their group's
  // top-left at that point.
  const pasteClipboard = (at?: { x: number; y: number }) => {
    if (!CLIPBOARD.length) return;
    const roots = new Set(clipRoots().map(el => el.id));
    if (!at) {
      const shift = (el: UIElement) => roots.has(el.id) ? { ...el, style: { ...el.style, x: Number(el.style.x) + 20, y: Number(el.style.y) + 20 } } : el;
      pasteElements(CLIPBOARD.map(shift));
      CLIPBOARD = CLIPBOARD.map(shift);
      return;
    }
    const abs = CLIPBOARD.map(absOf);
    const rootAbs = abs.filter((_, i) => roots.has(CLIPBOARD[i].id));
    const minX = Math.min(...rootAbs.map(a => a.x)), minY = Math.min(...rootAbs.map(a => a.y));
    pasteElements(CLIPBOARD.map((el, i) => roots.has(el.id) ? {
      ...el, parentId: undefined,
      style: { ...el.style, x: Math.round(at.x + abs[i].x - minX), y: Math.round(at.y + abs[i].y - minY) }
    } : el));
  };

  const selectAll = () => {
    const level = selectedElementIds.length ? elements.find(e => e.id === selectedElementIds[0])?.parentId : undefined;
    const top = (el: UIElement) => !el.parentId || frames.some(f => f.id === el.parentId);
    setSelection(elements.filter(el => !el.hidden && (level && !frames.some(f => f.id === level) ? el.parentId === level : top(el))).map(el => el.id));
  };

  // Keys the canvas owns: space to pan, and the clipboard. Skipped while
  // typing in a field, so Ctrl+C in a text box still copies text.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space') { spaceDown.current = true; e.preventDefault(); return; }
      const mod = e.ctrlKey || e.metaKey;
      // Shift+R: rulers on / off, as in Figma
      if (!mod && e.shiftKey && e.code === 'KeyR') {
        e.preventDefault();
        updateCanvasSettings({ showRulers: !canvasSettings.showRulers });
        return;
      }
      // Enter or Ctrl+A on one selected text: edit it, all its text selected -
      // not select everything in the project
      const one = selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) : undefined;
      if (one && isTextEl(one) && (e.key === 'Enter' || (mod && e.key.toLowerCase() === 'a'))) {
        e.preventDefault();
        setInlineEditingElementId(one.id);
        return;
      }
      if (!mod) return;
      // Ctrl+] / Ctrl+[ one step forward / back; with Shift, all the way
      if (e.code === 'BracketRight' || e.code === 'BracketLeft') {
        e.preventDefault();
        const up = e.code === 'BracketRight';
        // stepping several: front-most first going up, back-most first going down
        const order = elements.map(el => el.id).filter(id => selectedElementIds.includes(id));
        (up ? [...order].reverse() : order).forEach(id =>
          e.shiftKey ? (up ? bringToFront(id) : sendToBack(id)) : (up ? bringForward(id) : sendBackward(id)));
        return;
      }
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
      const media = items.filter(it => it.kind === 'file' && isMedia(it.type))
                         .map(it => it.getAsFile()).filter((f): f is File => !!f);
      if (media.length) {
        e.preventDefault();
        const at = lastWorld.current || centreWorld();
        media.forEach((file, i) => placeMediaFileAt(file, at.x + i * 32, at.y + i * 32));
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

  // A press on an element (the deepest under the pointer): pick what Figma
  // would - the outermost container not yet stepped into - and drag that.
  const pressElement = (el: UIElement, e: React.PointerEvent) => {
    const st = useProjectStore.getState();
    const id = pickTarget(el.id, st.elements, st.selectedElementIds);
    const target = st.elements.find(x => x.id === id) || el;
    pressedSelectedText.current = isTextEl(target) && !e.shiftKey &&
      st.selectedElementIds.length === 1 && st.selectedElementIds[0] === id;
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    setDraggingElementId(id);
    if (e.shiftKey || !st.selectedElementIds.includes(id)) selectElement(id, e.shiftKey);
    setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: Number(target.style.x), origY: Number(target.style.y) });
  };

  // Prevent native browser zoom and enable trackpad pan / zoom
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.005;
        const newZoom = Math.min(Math.max(viewport.zoom * Math.exp(zoomDelta), ZOOM_MIN), ZOOM_MAX);
        
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
      let { x, y } = getWorldCoords(e.clientX, e.clientY);
      // Shift: a square / circle / even shape - a line in 45-degree steps
      if (e.shiftKey) {
        const dx = x - drawStart.x, dy = y - drawStart.y;
        if (activeTool === 'line' || activeTool === 'arrow') {
          const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy);
          x = drawStart.x + Math.cos(a) * len; y = drawStart.y + Math.sin(a) * len;
        } else {
          const m = Math.max(Math.abs(dx), Math.abs(dy));
          x = drawStart.x + (dx < 0 ? -m : m); y = drawStart.y + (dy < 0 ? -m : m);
        }
      }
      setDrawFromCentre(e.altKey);
      setDrawCurrent({ x, y });
      return;
    }

    if ((draggingElementId || draggingFrameId) && !dragMoved && dragOrigin.current &&
        Math.hypot(e.clientX - dragOrigin.current.x, e.clientY - dragOrigin.current.y) > 3)
      setDragMoved(true);

    // Handle element dragging: start + offset, snapped to smart guides
    if (draggingElementId && dragOrigin.current) {
      // everything selected moves together, when the dragged one is part of it
      const ids = selectedElementIds.includes(draggingElementId) ? selectedElementIds : [draggingElementId];
      if (!dragOrig.current) {
        dragOrig.current = new Map();
        ids.forEach(id => {
          const el = elements.find(x => x.id === id);
          // where it starts on the canvas: its parent may move under it while it
          // is dragged (a group's box refits round what is in it), so each step
          // is placed from the canvas, never from the parent's corner
          if (el && !el.locked) { const b = absBoxOf(el, elements, frames); dragOrig.current!.set(id, { x: b.x, y: b.y }); }
        });
      }
      let dx = (e.clientX - dragOrigin.current.x) / viewport.zoom;
      let dy = (e.clientY - dragOrigin.current.y) / viewport.zoom;
      const dragged = elements.find(x => x.id === draggingElementId);
      const p = lastWorld.current!;
      const own = new Set(subtreeIds(draggingElementId, elements));
      if (dragged && inFlow(dragged, elements, frames)) {
        // stays in its row; an outline follows the pointer and a line shows the spot
        if (!dragMoved) return;
        if (!flowStart.current) flowStart.current = worldBoxOf(dragged.id);
        const b = flowStart.current!;
        setFlowGhost({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });
        const h = holderAt(p.x, p.y, own);
        setFlowDrop(h.id && h.layout ? { parentId: h.id, ...flowSlot(h.id, h.layout, p.x, p.y, dragged.id) } : { parentId: h.id, index: -1 });
        return;
      }
      // a placed element over an auto-layout frame: show where it would go in
      if (dragMoved && dragged) {
        const h = holderAt(p.x, p.y, own);
        setFlowDrop(h.id && h.layout ? { parentId: h.id, ...flowSlot(h.id, h.layout, p.x, p.y, dragged.id) } : null);
      }
      if (dragMoved && !e.ctrlKey && !e.metaKey && canvasSettings.snapToObjects !== false) {
        const snap = computeSnap(ids, dx, dy);
        dx += snap.dx; dy += snap.dy;
        setSnapLines(snap.lines);
      } else if (snapLines.length) setSnapLines([]);
      const now = useProjectStore.getState();
      dragOrig.current.forEach((o, id) => {
        const p0 = originOf(now.elements.find(x => x.id === id)?.parentId, now.elements, now.frames);
        updateElementPosition(id, Math.round(o.x + dx - p0.x), Math.round(o.y + dy - p0.y));
      });
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
          if (el.parentId && !frames.some(f => f.id === el.parentId)) return false;   // inside a container
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
      setDrawFromCentre(false);
      if (dist > 15) {
        const b = drawBox();
        finishDrawingShape(activeTool, b.x0, b.y0, b.x1, b.y1);
        if (activeTool === 'text') setInlineEditingElementId(useProjectStore.getState().selectedElementIds[0] ?? null);
        setActiveTool('select');
      } else {
        // Single click placement
        const { x, y } = getWorldCoords(e.clientX, e.clientY);
        if (activeTool === 'text') {
          const p = useProjectStore.getState().parentAt(x, y);
          const elId = addElement('text', Math.round(x - p.x), Math.round(y - p.y), p.id);
          setInlineEditingElementId(elId);
        } else if (activeTool === 'frame') {
          // inside a screen: a 100x100 frame there; on the canvas: a phone
          if (useProjectStore.getState().parentAt(x, y).id) finishDrawingShape('frame', x, y, x + 100, y + 100);
          else finishDrawingShape('frame', x, y, x + 393, y + 852);
        } else if (activeTool === 'section') {
          finishDrawingShape('section', x, y, x + 800, y + 700);
        } else {
          dropComponentAt(toolToElementType(activeTool), x, y);
        }
        setActiveTool('select');
      }
    }

    // Reparenting check on finishing element drag - a real drag only: a
    // plain click used to move whatever was clicked into the frame under it
    if (draggingElementId && !dragMoved && pressedSelectedText.current) setInlineEditingElementId(draggingElementId);
    pressedSelectedText.current = false;
    if (draggingElementId && dragMoved && flowDrop) {
      const el = elements.find(item => item.id === draggingElementId);
      if (el && flowDrop.parentId && flowDrop.index >= 0) useProjectStore.getState().moveToFlow(el.id, flowDrop.parentId, flowDrop.index);
      // out of its row: placed where the outline was
      else if (el && flowGhost && flowDrop.parentId !== el.parentId) reparentElement(el.id, flowDrop.parentId, flowGhost.x, flowGhost.y);
      setDraggingElementId(null);
    } else if (draggingElementId) {
      const el = dragMoved ? elements.find(item => item.id === draggingElementId) : undefined;
      if (el) {
        const b = worldBoxOf(el.id);
        if (b) {
          const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
          const own = new Set(subtreeIds(el.id, elements));
          // containers on the page, deepest first
          const holder = elements
            .filter(c => takesDrops(c) && !c.hidden && !own.has(c.id))
            .map(c => ({ c, r: worldBoxOf(c.id), depth: chainOf(c.id, elements).length }))
            .filter(({ r }) => r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h)
            .sort((p, q) => q.depth - p.depth)[0]?.c;
          const frame = holder ? undefined : frames.find(f => !f.hidden &&
            cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height);
          const target = holder?.id ?? frame?.id;
          // still over the frame its group is in: it stays in the group
          if (target !== el.parentId && target !== frameAbove(el.parentId, elements)) reparentElement(el.id, target, b.x, b.y);
        }
      }
      setDraggingElementId(null);
    }

    setDraggingFrameId(null);
    setFlowDrop(null); setFlowGhost(null); flowStart.current = null;
    setDragMoved(false);
    dragOrigin.current = null;
    dragOrig.current = null;
    if (snapLines.length) setSnapLines([]);
  };

  // Places a dropped / pasted image or video at the given world point, inside
  // whichever frame is there, at most 360px on its long side. Images go into
  // the project as data; videos are too big for that and go to the asset store.
  const placeMediaFileAt = async (file: File, worldX: number, worldY: number) => {
    const video = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    const size = await new Promise<{ w: number; h: number }>((resolve) => {
      if (video) {
        const v = document.createElement('video');
        v.onloadedmetadata = () => resolve({ w: v.videoWidth || 640, h: v.videoHeight || 360 });
        v.onerror = () => resolve({ w: 640, h: 360 });
        v.src = url;
      } else {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 200, h: 200 });
        img.src = url;
      }
    });
    URL.revokeObjectURL(url);
    const src = video ? await putAsset(file) : await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const MAX_DIM = 360;
    const scale = Math.min(1, MAX_DIM / Math.max(size.w, size.h));
    const width = Math.max(20, Math.round(size.w * scale));
    const height = Math.max(20, Math.round(size.h * scale));
    const holder = useProjectStore.getState().parentAt(worldX, worldY);
    addPredefinedElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name.replace(/\.[^/.]+$/, '') || (video ? 'Video' : 'Image'),
      type: video ? 'video' : 'image',
      parentId: holder.id,
      interactions: [],
      style: {
        x: Math.round(worldX - holder.x),
        y: Math.round(worldY - holder.y),
        width, height
      },
      semanticProps: video ? { videoSrc: src, alt: file.name } : { src, alt: file.name }
    });
  };

  // Drag-and-drop from sidebar component library, or image files dragged in from the OS
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files || []).filter(f => isMedia(f.type));
    if (files.length > 0) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);
      files.forEach((file, i) => placeMediaFileAt(file, x + i * 32, y + i * 32));
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
      data-canvas
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      // Ctrl+click: select the shape under the pointer itself, however deep
      // it sits - through any frame, group or section around it - as in
      // Figma. Ctrl+Shift+click adds it to the selection. Caught on the way
      // down so nothing in between gets the click first.
      onPointerDownCapture={(e) => {
        if (!(e.ctrlKey || e.metaKey) || e.button !== 0 || activeTool !== 'select') return;
        if ((e.target as HTMLElement).closest('[data-handle]')) return;   // Ctrl+drag on a handle stretches
        const hit = document.elementsFromPoint(e.clientX, e.clientY)
          .find(n => (n as HTMLElement).dataset?.elId) as HTMLElement | undefined;
        if (!hit) return;
        e.stopPropagation(); e.preventDefault();
        const id = hit.dataset.elId!;
        if (e.shiftKey) selectElement(id, true);
        else setSelection([id]);
      }}
      onContextMenu={(e) => {
        // ProtoJam's own menu, never the browser's
        e.preventDefault();
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        // What was right-clicked becomes the selection (unless it already is
        // part of it): an element first, else the frame it is in. Empty canvas
        // keeps the selection, so "paste here" and friends still act on it.
        const tgt = e.target as HTMLElement;
        const id = (tgt.closest('[data-el-id]') as HTMLElement | null)?.dataset.elId;
        const fid = (tgt.closest('[data-frame-id]') as HTMLElement | null)?.dataset.frameId;
        if (id) { if (!selectedElementIds.includes(id)) setSelection([id]); }
        else if (fid) { if (!selectedFrameIds.includes(fid)) selectFrame(fid, false); }
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
          transformOrigin: '0 0',
          // close in, show an image's real pixels rather than a blur
          imageRendering: viewport.zoom >= 4 ? 'pixelated' : undefined
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
              dragOrigin.current = { x: e.clientX, y: e.clientY };
              setDraggingFrameId(frame.id);
              setDragStartPos({ mouseX: e.clientX, mouseY: e.clientY, origX: frame.x, origY: frame.y });
            }}
            onStartDragElement={pressElement}
          />
        ))}

        {/* 3. Free Canvas Elements (Detached / Outside Frames) */}
        {freeElements.map((element, layer) => (
          <ElementNode key={element.id} element={element} parentLayout={null} layer={layer}
                       onPress={pressElement} boxInside={false} />
        ))}

        {/* 3b. Selection handles, above everything (as in Figma): a selected
            shape under another keeps its handles visible and grabbable, and
            frames do not clip them. */}
        {activeTool === 'select' && !isVectorEditing && elements
          .filter(el => selectedElementIds.includes(el.id) && !el.hidden)
          .map(el => {
            // drawn by the element itself when only the layout knows where it is
            if (!placed(el)) return null;
            const b = boxOf(el);
            return (
              <div key={`sel-${el.id}`} className="pointer-events-none"
                   style={{ position: 'absolute', left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, zIndex: 1000, transform: rotateCss(el) }}>
                <TransformSelectionBox element={el} onPress={pressElement} />
              </div>
            );
          })}

        {/* 3c. Hover: the outline of what a click would pick, in its own shape */}
        {activeTool === 'select' && !isVectorEditing && hoverId && !selectedElementIds.includes(hoverId) && (() => {
          const el = elements.find(x => x.id === hoverId);
          const b = el && worldBoxOf(el.id);
          if (!el || !b) return null;
          const z = viewport.zoom, t = el.style.frameShape || el.type;
          const vd = el.style.vectorData;
          return (
            <div className="absolute pointer-events-none" data-export-skip style={{ left: b.x, top: b.y, width: b.w, height: b.h, zIndex: 999, transform: rotateCss(el) }}>
              {t === 'vectorPath' && vd ? (
                <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={vd.w ? `0 0 ${vd.w} ${vd.h}` : undefined} preserveAspectRatio="none">
                  <path d={vectorAllD(vd)} fill="none" stroke="#ff6b4a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                </svg>
              ) : t === 'polygon' || t === 'star' ? (
                <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points={t === 'star' ? '50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36' : '50,5 95,95 5,95'} fill="none" stroke="#ff6b4a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <div className="absolute inset-0" style={{ border: `${1.5 / z}px solid #ff6b4a`, borderRadius: t === 'ellipse' ? '9999px' : typeof el.style.borderRadius === 'number' ? el.style.borderRadius : 0 }} />
              )}
            </div>
          );
        })()}

        {/* 4. Prototype Wire Connecting Lines */}
        {(editorMode === 'prototype' || isWiring) && (
          <FlowConnectorLines frames={frames} elements={elements} />
        )}

        {/* 5. What is being drawn, in its own shape, with its size */}
        {isDrawing && (() => {
          const d = drawBox();
          const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
          const z = viewport.zoom, line = activeTool === 'line' || activeTool === 'arrow';
          const stroke = 'rgb(235,235,236)', fill = 'rgba(235,235,236,0.08)';
          const poly = activeTool === 'star' ? '50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36' : '50,5 95,95 5,95';
          return (
            <div className="absolute pointer-events-none z-50" style={{ left: x, top: y, width: w, height: h }}>
              {line ? (
                <svg className="absolute inset-0 overflow-visible" width="100%" height="100%">
                  <line x1={d.x0 - x} y1={d.y0 - y} x2={d.x1 - x} y2={d.y1 - y} stroke={stroke} strokeWidth={2 / z} strokeDasharray={`${6 / z} ${4 / z}`} />
                </svg>
              ) : activeTool === 'polygon' || activeTool === 'star' ? (
                <svg className="absolute inset-0 overflow-visible" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points={poly} fill={fill} stroke={stroke} strokeWidth={2 / z} strokeDasharray={`${6 / z} ${4 / z}`} vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <div className={`absolute inset-0 border-dashed ${activeTool === 'ellipse' ? 'rounded-full' : 'rounded'}`}
                     style={{ borderWidth: 2 / z, borderColor: stroke, background: fill }} />
              )}
              <span className="absolute left-1/2 -translate-x-1/2 font-mono text-white bg-[#ff6b4a] rounded whitespace-nowrap"
                    style={{ top: h + 6 / z, fontSize: 10 / z, padding: `${1 / z}px ${4 / z}px` }}>
                {line ? Math.round(Math.hypot(d.x1 - d.x0, d.y1 - d.y0)) : `${Math.round(w)} × ${Math.round(h)}`}
              </span>
            </div>
          );
        })()}

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
      {(draggingElementId || draggingFrameId) && dragMoved && (
        <div
          className="fixed inset-0 z-[9999] cursor-grabbing"
          // This overlay sits inside the canvas, so without stopping here each
          // move also bubbled to the canvas's own handler and every drag went
          // twice as far as the mouse did.
          onMouseMove={(e) => { e.stopPropagation(); handleMouseMove(e); }}
          onMouseUp={(e) => { e.stopPropagation(); handleMouseUp(e); }}
        />
      )}

      {/* Pixel grid from 800%: one cell per canvas pixel, for icon work */}
      {viewport.zoom >= 8 && (
        <div className="absolute inset-0 pointer-events-none z-[30]"
             style={{
               backgroundImage: 'linear-gradient(to right, rgba(235,235,236,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(235,235,236,0.09) 1px, transparent 1px)',
               backgroundSize: `${viewport.zoom}px ${viewport.zoom}px`,
               backgroundPosition: `${viewport.x}px ${viewport.y}px`
             }} />
      )}

      {/* Auto layout: where the dragged thing will go, and its outline */}
      {flowDrop?.line && (
        <div className="absolute pointer-events-none z-[59] bg-[#ff6b4a] rounded-full"
             style={{ left: flowDrop.line.x * viewport.zoom + viewport.x, top: flowDrop.line.y * viewport.zoom + viewport.y,
                      width: Math.max(2, flowDrop.line.w * viewport.zoom), height: Math.max(2, flowDrop.line.h * viewport.zoom) }} />
      )}
      {flowGhost && (
        <div className="absolute pointer-events-none z-[59] border border-dashed border-[#ff6b4a] bg-[rgba(255,107,74,0.08)]"
             style={{ left: flowGhost.x * viewport.zoom + viewport.x, top: flowGhost.y * viewport.zoom + viewport.y,
                      width: flowGhost.w * viewport.zoom, height: flowGhost.h * viewport.zoom }} />
      )}

      {/* Smart guides while dragging */}
      {snapLines.map((l, i) => {
        const z = viewport.zoom;
        const at = l.axis === 'x' ? l.at * z + viewport.x : l.at * z + viewport.y;
        const a = l.from * z + (l.axis === 'x' ? viewport.y : viewport.x);
        const b = l.to * z + (l.axis === 'x' ? viewport.y : viewport.x);
        const mid = l.gap ? l.gap.mid * z + (l.axis === 'x' ? viewport.y : viewport.x) : 0;
        return (
          <React.Fragment key={i}>
            <div className="absolute pointer-events-none z-[58] bg-[#ff4fa3]"
                 style={l.axis === 'x'
                   ? { left: at, top: Math.max(-10, a), width: 1, height: Math.min(1e4, b - a) }
                   : { top: at, left: Math.max(-10, a), height: 1, width: Math.min(1e4, b - a) }} />
            {l.gap && l.gap.value > 0.5 && (
              <span className="absolute pointer-events-none z-[58] text-[10px] font-mono text-white bg-[#ff4fa3] px-1 rounded"
                    style={l.axis === 'x' ? { left: at + 4, top: mid - 8 } : { top: at + 4, left: mid - 10 }}>
                {Math.round(l.gap.value)}
              </span>
            )}
          </React.Fragment>
        );
      })}

      {/* Rulers and their guides (Shift+R) */}
      {canvasSettings.showRulers && canvasSize.w > 0 && (
        <Rulers width={canvasSize.w} height={canvasSize.h} selection={selectionBox()} />
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
          if (n > 1) {
            const al = (a: Parameters<typeof alignSelectedElements>[0]) => () => alignSelectedElements(a);
            const align: MenuItem[] = [
              { label: 'Left', run: al('left') }, { label: 'Centre', run: al('center') }, { label: 'Right', run: al('right') },
              { divider: true },
              { label: 'Top', run: al('top') }, { label: 'Middle', run: al('middle') }, { label: 'Bottom', run: al('bottom') }
            ];
            if (n > 2) align.push({ divider: true },
              { label: 'Distribute horizontally', run: al('distributeH') },
              { label: 'Distribute vertically', run: al('distributeV') });
            items.push({ label: 'Align', run: () => {}, children: align });
          }
          items.push({ label: 'Bring forward', hint: 'Ctrl+]', run: () => [...selectedElementIds].reverse().forEach(id => bringForward(id)) });
          items.push({ label: 'Send backward', hint: 'Ctrl+[', run: () => selectedElementIds.forEach(id => sendBackward(id)) });
          items.push({ label: 'Bring to front', hint: 'Ctrl+Shift+]', run: () => selectedElementIds.forEach(id => bringToFront(id)) });
          items.push({ label: 'Send to back', hint: 'Ctrl+Shift+[', run: () => selectedElementIds.forEach(id => sendToBack(id)) });
          items.push({ divider: true });
          items.push({ label: 'Group', hint: 'Ctrl+G', run: () => useProjectStore.getState().wrapSelection('group') });
          items.push({ label: 'Frame selection', hint: 'Ctrl+Alt+G', run: () => useProjectStore.getState().wrapSelection('frame') });
          if (elements.some(e => selectedElementIds.includes(e.id) && e.type === 'container' && !e.style.booleanOp))
            items.push({ label: 'Ungroup', hint: 'Ctrl+Shift+G', run: () => useProjectStore.getState().ungroupSelection() });
          items.push({ label: 'Add auto layout', hint: 'Shift+A', run: () => groupSelectedIntoAutoLayout() });
          if (n > 1) {
            const b = (op: 'union' | 'subtract' | 'intersect' | 'exclude') => () => useProjectStore.getState().booleanSelection(op);
            items.push({ label: 'Boolean', run: () => {}, children: [
              { label: 'Union', hint: 'Ctrl+Alt+U', run: b('union') }, { label: 'Subtract', hint: 'Ctrl+Alt+S', run: b('subtract') },
              { label: 'Intersect', hint: 'Ctrl+Alt+I', run: b('intersect') }, { label: 'Exclude', hint: 'Ctrl+Alt+X', run: b('exclude') }
            ] });
          }
          const flat = elements.filter(e => selectedElementIds.includes(e.id) && BOOLEANABLE.has(e.type));
          if (elements.some(e => selectedElementIds.includes(e.id) && (['rectangle', 'ellipse', 'polygon', 'star', 'vectorPath'].includes(e.type) || e.style.isGroup)))
            items.push({ label: 'Convert to frame', hint: 'Ctrl+Alt+F', run: () => useProjectStore.getState().convertToFrame() });
          if (flat.length && (n > 1 || flat[0].style.booleanOp || flat[0].type !== 'vectorPath'))
            items.push({ label: 'Flatten', hint: 'Ctrl+E', run: () => useProjectStore.getState().flattenSelection() });
          if (n === 1) items.push({ label: 'Create component', run: () => createMasterComponent(selectedElementIds[0]) });
          items.push({ label: 'Hide', run: () => selectedElementIds.forEach(id => toggleElementHidden(id)) });
          items.push({ label: 'Lock / unlock', run: () => selectedElementIds.forEach(id => toggleElementLock(id)) });
          items.push({ divider: true });
          items.push({ label: n > 1 ? `Delete ${n}` : 'Delete', hint: 'Del', danger: true, run: () => selectedElementIds.forEach(id => deleteElement(id)) });
        } else if (nf) {
          items.push({ divider: true });
          items.push({ label: nf > 1 ? `Duplicate ${nf} frames` : 'Duplicate frame', hint: 'Ctrl+D', run: () => selectedFrameIds.forEach(id => duplicateFrame(id)) });
          items.push({ label: 'Lock / unlock', run: () => selectedFrameIds.forEach(id => toggleFrameLock(id)) });
          items.push({ label: 'Hide', run: () => selectedFrameIds.forEach(id => toggleFrameHidden(id)) });
          items.push({ divider: true });
          items.push({ label: nf > 1 ? `Delete ${nf} frames` : 'Delete frame', hint: 'Del', danger: true, run: () => selectedFrameIds.forEach(id => deleteFrame(id)) });
        }
        items.push({ divider: true });
        items.push({ label: 'Select all', hint: 'Ctrl+A', run: selectAll });
        items.push({ label: 'Zoom to fit', hint: 'Ctrl+1', run: () => zoomToFit() });
        return <CanvasContextMenu x={ctxMenu.x} y={ctxMenu.y} roomW={ctxMenu.w} roomH={ctxMenu.h}
                                  items={items} onClose={() => setCtxMenu(null)} />;
      })()}

      {/* The pen: over the canvas, under the toolbar */}
      {isVectorEditing && <PenOverlay toWorld={getWorldCoords} spaceDown={spaceDown} />}

      {/* Floating Centered Bottom Toolbar */}
      <BottomToolbar />

      {/* Auto-fading 20% Smaller Radar Map (Minimap) */}
      <Minimap containerRef={canvasContainerRef} />
    </div>
  );
};
