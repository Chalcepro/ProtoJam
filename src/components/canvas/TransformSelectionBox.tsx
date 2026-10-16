import React, { useRef, useState } from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { vectorAllD } from '../../lib/boolean';
import { pickTarget } from '../../lib/tree';

interface TransformSelectionBoxProps {
  element: UIElement;
  // a press inside the box drags the selection (the canvas's own press)
  onPress?: (el: UIElement, e: React.PointerEvent) => void;
}

// Figma's rotate cursor: a curved double arrow, turned to face its corner
// (and the object's own turn). Drawn for the bottom-left corner.
const rotateCursor = (deg: number) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><g transform='rotate(${Math.round(deg)} 12 12)'>` +
    ['white', 'black'].map((c, i) => `<path d='M6 11 A8 8 0 0 0 13 18' fill='none' stroke='${c}' stroke-width='${i ? 1.5 : 4}'/>` +
      `<path d='M6 6 L2.5 11.5 L9.5 11.5 Z M18 18 L12.5 14.5 L12.5 21.5 Z' fill='${c}' stroke='${c}' stroke-width='${i ? 0 : 2.5}' stroke-linejoin='round'/>`).join('') +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
};

const SELECTION_COLOR = '#ff6b4a'; // Vibrant light red / orange selection stroke

export const TransformSelectionBox: React.FC<TransformSelectionBoxProps> = ({ element, onPress }) => {
  const { style } = element;
  // a frame made from a shape is outlined as that shape
  const type = element.style.frameShape || element.type;
  const { updateElementStyle, viewport, pushHistory } = useProjectStore(useShallow((s) => ({ updateElementStyle: s.updateElementStyle, viewport: s.viewport, pushHistory: s.pushHistory })));

  const [rotationAngle, setRotationAngle] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rot = Number(style.rotation) || 0;
  // while its text is being typed, clicks go to the text (caret, selection)
  const editing = useProjectStore((s) => s.inlineEditingElementId === element.id);

  // What the page has under a point, looking through this box.
  const elUnder = (x: number, y: number) => {
    for (const n of document.elementsFromPoint(x, y)) {
      if (boxRef.current?.contains(n)) continue;
      const h = (n as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
      if (h) return h;
    }
    return null;
  };

  // ---------------- PRESS INSIDE THE BOX: MOVE ----------------
  // As in Figma: anywhere inside a selected object's box drags it - its empty
  // parts, or where something else lies on top. A click that does not move
  // picks what is under the pointer, as a click anywhere would.
  const handleBodyDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !onPress) return;
    e.stopPropagation();
    const under = elUnder(e.clientX, e.clientY);
    const st = useProjectStore.getState();
    const underEl = under && st.elements.find(x => x.id === under.dataset.elId);
    if (e.shiftKey) { if (underEl) onPress(underEl, e); return; }
    onPress(element, e);
    const x0 = e.clientX, y0 = e.clientY;
    const up = (u: PointerEvent) => {
      window.removeEventListener('pointerup', up, true);
      if (!underEl || Math.hypot(u.clientX - x0, u.clientY - y0) > 3) return;
      // after the canvas has finished the press (it may open a text for editing)
      setTimeout(() => {
        const s2 = useProjectStore.getState();
        const id = pickTarget(underEl.id, s2.elements, s2.selectedElementIds);
        if (s2.selectedElementIds.includes(id)) return;
        s2.setInlineEditingElementId(null);
        s2.setSelection([id]);
      });
    };
    window.addEventListener('pointerup', up, true);
  };
  // a double-click goes to what is under the box (enter a frame, edit points / text)
  const handleBodyDouble = (e: React.MouseEvent) => {
    e.stopPropagation();
    const n = document.querySelector(`[data-el-id="${element.id}"]`);
    const under = elUnder(e.clientX, e.clientY);
    (under && n?.contains(under) ? under : n)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
  };

  // ---------------- INTERACTIVE SCALE / RESIZE HANDLER ----------------
  const handleScaleStart = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialElX = Number(style.x);
    const initialElY = Number(style.y);
    const initialW = Number(style.width);
    const initialH = Number(style.height);
    const zoom = viewport.zoom;

    // Which way each axis moves: +1 the right / bottom edge, -1 the left / top.
    const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
    const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;
    const ratio = initialW / (initialH || 1);
    const cx = initialElX + initialW / 2, cy = initialElY + initialH / 2;
    // a turned object is sized along its own sides, not the screen's
    const cos = Math.cos(rot * Math.PI / 180), sin = Math.sin(rot * Math.PI / 180);
    // Pictures keep their shape unless Ctrl is held; anything else keeps it
    // while Shift is held.
    const media = type === 'image' || type === 'video';
    const isText = type === 'text' || type === 'heading';
    // Pulling a text box's size by hand fixes that side, as in Figma:
    // width only -> it wraps and grows down; height too -> fixed box.
    let moved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!moved && isText) updateElementStyle(element.id, { textResize: sy ? 'fixed' : 'autoHeight', autoSize: false });
      moved = true;
      const mx = (moveEvent.clientX - startX) / zoom, my = (moveEvent.clientY - startY) / zoom;
      const dx = mx * cos + my * sin, dy = -mx * sin + my * cos;
      const k = moveEvent.altKey ? 2 : 1;             // Alt: both sides move, centre stays
      let w = Math.max(1, initialW + sx * dx * k);
      let h = Math.max(1, initialH + sy * dy * k);
      const keep = media ? !(moveEvent.ctrlKey || moveEvent.metaKey) : moveEvent.shiftKey;
      if (keep) {
        if (sx && sy) { if (w / initialW > h / initialH) h = w / ratio; else w = h * ratio; }
        else if (sx) h = w / ratio;
        else w = h * ratio;
      }
      // Position: the opposite edge stays put (or the centre, with Alt). A side
      // handle that also changes the other dimension grows it from the middle.
      // The centre moves half the growth, along the object's own sides.
      const lx = moveEvent.altKey ? 0 : sx * (w - initialW) / 2, ly = moveEvent.altKey ? 0 : sy * (h - initialH) / 2;
      const x = cx + lx * cos - ly * sin - w / 2;
      const y = cy + lx * sin + ly * cos - h / 2;
      updateElementStyle(element.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
  };

  // ---------------- INTERACTIVE ROTATION HANDLER ----------------
  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // The turn is about the centre as it is on screen (where the page drew
    // it - inside frames, auto layout, at any zoom), and follows the pointer
    // from where it was grabbed: no jump on the first move.
    const node = document.querySelector(`[data-el-id="${element.id}"]`);
    if (!node) return;
    const r = node.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const angle = (x: number, y: number) => Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    const start = Number(style.rotation) || 0, grab = angle(e.clientX, e.clientY);

    const onPointerMove = (moveEvent: PointerEvent) => {
      let deg = start + angle(moveEvent.clientX, moveEvent.clientY) - grab;
      if (moveEvent.shiftKey) deg = Math.round(deg / 15) * 15;   // Shift: 15-degree steps
      deg = ((Math.round(deg) % 360) + 360) % 360;
      setRotationAngle(deg);
      updateElementStyle(element.id, { rotation: deg });
    };

    const onPointerUp = () => {
      setRotationAngle(null);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
  };

  // ---------------- SIZES IN SCREEN PIXELS ----------------
  // This box sits inside the zoomed canvas, so a fixed 2px border and 12px
  // handles grew and shrank with the zoom - zoomed out, they buried small
  // objects completely. Everything here is divided by the zoom so it is the
  // same size on screen at any zoom, and on a small object the edge handles
  // go and the corners shrink, so the object itself stays visible.
  const z = viewport.zoom || 1;
  const screenW = Number(style.width) * z, screenH = Number(style.height) * z;
  const small = Math.min(screenW, screenH) < 28;
  const tiny = Math.min(screenW, screenH) < 12;
  const stroke = 1.5 / z;                       // outline
  const H = (tiny ? 5 : 8) / z;                 // handle size
  const HB = 1.25 / z;                          // handle border

  // ---------------- SHAPE CONTOURS ----------------
  const renderShapeOutline = () => {
    if (type === 'polygon' || type === 'star') {
      const pts = type === 'polygon' ? '50,5 95,95 5,95' : '50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36';
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <polygon points={pts} fill="none" stroke={SELECTION_COLOR} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    }
    if (type === 'vectorPath') {
      const vectorData = style.vectorData;
      if (vectorData && vectorData.points.length > 0) {
        const pathD = vectorAllD(vectorData);
        return (
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
               viewBox={vectorData.w ? `0 0 ${vectorData.w} ${vectorData.h}` : undefined} preserveAspectRatio="none">
            <path d={pathD} fill="none" stroke={SELECTION_COLOR} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        );
      }
    }
    let radStyle: React.CSSProperties = { borderRadius: 0 };
    if (type === 'ellipse' || type === 'fab' || type === 'pillButton' || type === 'avatar') radStyle = { borderRadius: '9999px' };
    else if (type === 'bottomSheet') radStyle = { borderTopLeftRadius: 24, borderTopRightRadius: 24 };
    else if (typeof style.borderRadius === 'number') radStyle = { borderRadius: style.borderRadius };
    else if (typeof style.borderRadius === 'object' && style.borderRadius !== null) radStyle = {
      borderTopLeftRadius: style.borderRadius.tl, borderTopRightRadius: style.borderRadius.tr,
      borderBottomRightRadius: style.borderRadius.br, borderBottomLeftRadius: style.borderRadius.bl
    };
    return <div style={{ ...radStyle, border: `${stroke}px solid ${SELECTION_COLOR}` }} className="absolute inset-0 pointer-events-none" />;
  };

  const handle = (h: string, cursor: string, pos: React.CSSProperties, title: string) => (
    <div
      data-handle={h}
      onPointerDown={(e) => handleScaleStart(h, e)}
      title={title}
      style={{
        position: 'absolute', width: H, height: H, ...pos, cursor,
        background: 'rgb(235,235,236)', border: `${HB}px solid ${SELECTION_COLOR}`, borderRadius: 1.5 / z,
        boxSizing: 'border-box', pointerEvents: 'auto'
      }}
    />
  );
  const o = -H / 2;                              // a handle centred on the edge
  const mid = `calc(50% - ${H / 2}px)`;

  // Rotate, as in Figma: just outside each corner (no knob). The cursor turns
  // to face its corner and the object's own turn.
  const R = 16 / z;
  const rotZone = (corner: string, base: number, pos: React.CSSProperties) => (
    <div data-handle={`rotate-${corner}`} onPointerDown={handleRotateStart}
         style={{ position: 'absolute', width: R, height: R, ...pos, cursor: rotateCursor(base + rot), pointerEvents: 'auto' }} />
  );

  return (
    <div ref={boxRef} className="absolute inset-0 pointer-events-none select-none">
      {/* the body: a press anywhere in it moves the selection */}
      {onPress && !editing && <div data-sel-body className="absolute inset-0" style={{ pointerEvents: 'auto' }}
                       onPointerDown={handleBodyDown} onDoubleClick={handleBodyDouble} />}
      {renderShapeOutline()}

      {rotZone('sw', 0, { left: -R, bottom: -R })}
      {rotZone('nw', 90, { left: -R, top: -R })}
      {rotZone('ne', 180, { right: -R, top: -R })}
      {rotZone('se', 270, { right: -R, bottom: -R })}
      {/* the angle while turning: upright, under the object as it is on screen */}
      {rotationAngle !== null && (
        <div className="absolute bg-[#ff6b4a] font-mono text-white rounded whitespace-nowrap"
             style={{ left: '50%', top: '50%',
                      transform: `rotate(${-rot}deg) translate(-50%, ${(Math.abs(Number(style.width) * Math.sin(rot * Math.PI / 180)) + Math.abs(Number(style.height) * Math.cos(rot * Math.PI / 180))) / 2 + 16 / z}px)`,
                      transformOrigin: '0 0',
                      fontSize: 11 / z, padding: `${1 / z}px ${5 / z}px` }}>
          {rotationAngle}°
        </div>
      )}

      {/* corners always; edge handles only when there is room for them */}
      {handle('nw', 'nwse-resize', { left: o, top: o }, 'Scale (Shift keeps shape, Alt from centre; pictures: Ctrl stretches)')}
      {handle('ne', 'nesw-resize', { right: o, top: o }, 'Scale top-right')}
      {handle('se', 'nwse-resize', { right: o, bottom: o }, 'Scale bottom-right')}
      {handle('sw', 'nesw-resize', { left: o, bottom: o }, 'Scale bottom-left')}
      {!small && <>
        {handle('n', 'ns-resize', { left: mid, top: o }, 'Scale height (top)')}
        {handle('s', 'ns-resize', { left: mid, bottom: o }, 'Scale height (bottom)')}
        {handle('e', 'ew-resize', { right: o, top: mid }, 'Scale width (right)')}
        {handle('w', 'ew-resize', { left: o, top: mid }, 'Scale width (left)')}
      </>}
    </div>
  );
};
