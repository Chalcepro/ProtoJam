import React, { useState, useEffect } from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';

interface TransformSelectionBoxProps {
  element: UIElement;
  parentFrameOffset?: { x: number; y: number };
}

const SELECTION_COLOR = '#ff6b4a'; // Vibrant light red / orange selection stroke

export const TransformSelectionBox: React.FC<TransformSelectionBoxProps> = ({
  element,
  parentFrameOffset = { x: 0, y: 0 }
}) => {
  const { type, style } = element;
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

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

      let newX = initialElX;
      let newY = initialElY;
      let newW = initialW;
      let newH = initialH;

      // Calculate new dimensions based on handle dragged
      if (handle.includes('e')) {
        newW = Math.max(10, initialW + dx);
      }
      if (handle.includes('s')) {
        newH = Math.max(10, initialH + dy);
      }
      if (handle.includes('w')) {
        const potentialW = initialW - dx;
        if (potentialW > 10) {
          newW = potentialW;
          newX = initialElX + dx;
        } else {
          newW = 10;
          newX = initialElX + initialW - 10;
        }
      }
      if (handle.includes('n')) {
        const potentialH = initialH - dy;
        if (potentialH > 10) {
          newH = potentialH;
          newY = initialElY + dy;
        } else {
          newH = 10;
          newY = initialElY + initialH - 10;
        }
      }

      // Proportional scaling if Shift key is pressed
      if (moveEvent.shiftKey && (handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw')) {
        const aspect = initialW / (initialH || 1);
        if (newW / aspect > newH) {
          newH = newW / aspect;
        } else {
          newW = newH * aspect;
        }
      }

      updateElementStyle(element.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH)
      });
    };

    const onPointerUp = () => {
      setActiveHandle(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ---------------- INTERACTIVE ROTATION HANDLER ----------------
  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle('rotate');

    // Calculate center point of element in world/screen coordinates
    const elLeft = parentFrameOffset.x + Number(style.x);
    const elTop = parentFrameOffset.y + Number(style.y);
    const elW = Number(style.width);
    const elH = Number(style.height);

    const centerWorldX = elLeft + elW / 2;
    const centerWorldY = elTop + elH / 2;

    const screenCenterX = viewport.x + centerWorldX * viewport.zoom;
    const screenCenterY = viewport.y + centerWorldY * viewport.zoom;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const mouseX = moveEvent.clientX;
      const mouseY = moveEvent.clientY;

      const rad = Math.atan2(mouseY - screenCenterY, mouseX - screenCenterX);
      let deg = Math.round(rad * (180 / Math.PI)) + 90; // Top is 0 deg
      if (deg < 0) deg += 360;
      if (deg >= 360) deg -= 360;

      // 15-degree snap with Shift key
      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      setRotationAngle(deg);
      updateElementStyle(element.id, { rotation: deg });
    };

    const onPointerUp = () => {
      setActiveHandle(null);
      setRotationAngle(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pushHistory();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
        let pathD = '';
        vectorData.points.forEach((pt, i) => { pathD += (i === 0 ? 'M ' : 'L ') + `${pt.x} ${pt.y} `; });
        if (vectorData.isClosed) pathD += 'Z';
        return (
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
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
      {handle('nw', 'nwse-resize', { left: o, top: o }, 'Scale top-left')}
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
