import React, { useState, useEffect } from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';

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
  const { updateElementStyle, viewport, pushHistory } = useProjectStore();

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

  // ---------------- SHAPE CONTOURS ----------------
  const renderShapeOutline = () => {
    if (type === 'polygon') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible pointer-events-none">
          <polygon
            points="50,5 95,95 5,95"
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }

    if (type === 'star') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible pointer-events-none">
          <polygon
            points="50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36"
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }

    if (type === 'vectorPath') {
      const vectorData = style.vectorData;
      if (vectorData && vectorData.points.length > 0) {
        let pathD = '';
        vectorData.points.forEach((pt, i) => {
          pathD += (i === 0 ? 'M ' : 'L ') + `${pt.x} ${pt.y} `;
        });
        if (vectorData.isClosed) pathD += 'Z';

        return (
          <svg className="w-full h-full overflow-visible pointer-events-none">
            <path
              d={pathD}
              fill="none"
              stroke={SELECTION_COLOR}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        );
      }
    }

    if (type === 'ellipse' || type === 'fab' || type === 'pillButton' || type === 'avatar') {
      return (
        <div
          style={{ borderRadius: '9999px', border: `2px solid ${SELECTION_COLOR}` }}
          className="absolute inset-0 pointer-events-none shadow-[0_0_8px_rgba(255,107,74,0.3)]"
        />
      );
    }

    // Default container / rectangle with matching border radius
    let radStyle: React.CSSProperties = { borderRadius: 8 };
    if (type === 'bottomSheet') {
      radStyle = { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
    } else if (typeof style.borderRadius === 'number') {
      radStyle = { borderRadius: style.borderRadius };
    } else if (typeof style.borderRadius === 'object' && style.borderRadius !== null) {
      radStyle = {
        borderTopLeftRadius: style.borderRadius.tl,
        borderTopRightRadius: style.borderRadius.tr,
        borderBottomRightRadius: style.borderRadius.br,
        borderBottomLeftRadius: style.borderRadius.bl
      };
    }

    return (
      <div
        style={{ ...radStyle, border: `2px solid ${SELECTION_COLOR}` }}
        className="absolute inset-0 pointer-events-none shadow-[0_0_6px_rgba(255,107,74,0.25)]"
      />
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {/* 1. Shape-conforming Outline */}
      {renderShapeOutline()}

      {/* 2. Rotation Stalk & Handle (Top Center) */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        <div
          onPointerDown={handleRotateStart}
          title="Drag to Rotate (Hold Shift to snap 15°)"
          className="w-3.5 h-3.5 rounded-full bg-[#ff6b4a] border-2 border-[rgb(20,20,19)] cursor-grab active:cursor-grabbing hover:scale-125 transition-transform shadow-md flex items-center justify-center"
        >
          <div className="w-1 h-1 rounded-full bg-[rgb(235,235,236)]" />
        </div>
        <div className="w-0.5 h-2.5 bg-[#ff6b4a]" />

        {/* Live Rotation Degree Tooltip */}
        {rotationAngle !== null && (
          <div className="absolute -top-6 bg-[rgb(20,20,19)] border border-[#ff6b4a] text-[10px] font-mono text-[rgb(235,235,236)] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
            {rotationAngle}°
          </div>
        )}
      </div>

      {/* 3. 8 Interactive Scale / Resize Handles */}
      {/* Top-Left */}
      <div
        onPointerDown={(e) => handleScaleStart('nw', e)}
        title="Scale Top-Left"
        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Top-Center */}
      <div
        onPointerDown={(e) => handleScaleStart('n', e)}
        title="Scale Height (Top)"
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Top-Right */}
      <div
        onPointerDown={(e) => handleScaleStart('ne', e)}
        title="Scale Top-Right"
        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Middle-Right */}
      <div
        onPointerDown={(e) => handleScaleStart('e', e)}
        title="Scale Width (Right)"
        className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Bottom-Right */}
      <div
        onPointerDown={(e) => handleScaleStart('se', e)}
        title="Scale Bottom-Right"
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Bottom-Center */}
      <div
        onPointerDown={(e) => handleScaleStart('s', e)}
        title="Scale Height (Bottom)"
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Bottom-Left */}
      <div
        onPointerDown={(e) => handleScaleStart('sw', e)}
        title="Scale Bottom-Left"
        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
      {/* Middle-Left */}
      <div
        onPointerDown={(e) => handleScaleStart('w', e)}
        title="Scale Width (Left)"
        className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[#ff6b4a] rounded-sm cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform shadow-sm"
      />
    </div>
  );
};
