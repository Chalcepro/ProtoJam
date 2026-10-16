import React, { useState, useEffect } from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { vectorAllD } from '../../lib/boolean';

interface TransformSelectionBoxProps {
  element: UIElement;
}

const SELECTION_COLOR = '#ff6b4a'; // Vibrant light red / orange selection stroke

export const TransformSelectionBox: React.FC<TransformSelectionBoxProps> = ({ element }) => {
  const { style } = element;
  // a frame made from a shape is outlined as that shape
  const type = element.style.frameShape || element.type;
  const { updateElementStyle, viewport, pushHistory } = useProjectStore(useShallow((s) => ({ updateElementStyle: s.updateElementStyle, viewport: s.viewport, pushHistory: s.pushHistory })));

  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number | null>(null);

  // ---------------- INTERACTIVE SCALE / RESIZE HANDLER ----------------
  const handleScaleStart = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);

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
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
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
      const x = moveEvent.altKey ? cx - w / 2 : sx === 1 ? initialElX : sx === -1 ? initialElX + initialW - w : cx - w / 2;
      const y = moveEvent.altKey ? cy - h / 2 : sy === 1 ? initialElY : sy === -1 ? initialElY + initialH - h : cy - h / 2;
      updateElementStyle(element.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
    };

    const onPointerUp = () => {
      setActiveHandle(null);
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
    setActiveHandle('rotate');

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
      setActiveHandle(null);
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

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {renderShapeOutline()}

      {/* rotation stalk and knob, above the top edge */}
      {!tiny && (
        <div className="absolute flex flex-col items-center pointer-events-auto"
             style={{ left: '50%', top: -22 / z, transform: 'translateX(-50%)' }}>
          <div
            onPointerDown={handleRotateStart}
            title="Drag to rotate (Shift snaps to 15°)"
            style={{ width: 10 / z, height: 10 / z, borderRadius: '50%', background: SELECTION_COLOR,
                     border: `${1.5 / z}px solid rgb(20,20,19)`, cursor: 'grab', boxSizing: 'border-box' }}
          />
          <div style={{ width: 1 / z, height: 10 / z, background: SELECTION_COLOR }} />
          {rotationAngle !== null && (
            <div className="absolute bg-[rgb(20,20,19)] border border-[#ff6b4a] font-mono text-[rgb(235,235,236)] rounded shadow-lg whitespace-nowrap"
                 style={{ top: -20 / z, fontSize: 10 / z, padding: `${1 / z}px ${5 / z}px` }}>
              {rotationAngle}°
            </div>
          )}
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
