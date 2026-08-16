import React from 'react';
import { UIElement } from '../../types/components';

interface ShapeSelectionHighlightProps {
  element: UIElement;
}

// Light red / orange selection color (Figma / Adobe XD style crisp selection)
const SELECTION_COLOR = '#ff6b4a'; // or vibrant orange/light-red: rgb(255, 107, 74)

export const ShapeSelectionHighlight: React.FC<ShapeSelectionHighlightProps> = ({ element }) => {
  const { type, style } = element;

  // 1. POLYGON (Triangle) Selection Outline
  if (type === 'polygon') {
    return (
      <div className="absolute inset-0 pointer-events-none z-30">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <polygon
            points="50,5 95,95 5,95"
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Corner anchor points */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
      </div>
    );
  }

  // 2. STAR Selection Outline
  if (type === 'star') {
    return (
      <div className="absolute inset-0 pointer-events-none z-30">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <polygon
            points="50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36"
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }

  // 3. VECTOR PATH (Pen Tool) Selection Outline
  if (type === 'vectorPath') {
    const vectorData = style.vectorData;
    if (vectorData && vectorData.points.length > 0) {
      let pathD = '';
      vectorData.points.forEach((pt, i) => {
        pathD += (i === 0 ? 'M ' : 'L ') + `${pt.x} ${pt.y} `;
      });
      if (vectorData.isClosed) pathD += 'Z';

      return (
        <div className="absolute inset-0 pointer-events-none z-30">
          <svg className="w-full h-full overflow-visible">
            <path
              d={pathD}
              fill="none"
              stroke={SELECTION_COLOR}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      );
    }
  }

  // 4. LINE Selection Outline
  if (type === 'line') {
    return (
      <div className="absolute inset-0 pointer-events-none z-30">
        <div
          style={{
            width: '100%',
            height: Math.max(Number(style.height) || 2, 2),
            outline: `2px solid ${SELECTION_COLOR}`,
            outlineOffset: '1px'
          }}
          className="rounded-sm"
        />
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
      </div>
    );
  }

  // 5. ELLIPSE / CIRCLE Selection Outline
  if (type === 'ellipse') {
    return (
      <div
        style={{
          borderRadius: '9999px',
          border: `2px solid ${SELECTION_COLOR}`
        }}
        className="absolute inset-0 pointer-events-none z-30 shadow-[0_0_8px_rgba(255,107,74,0.3)]"
      >
        {/* Cardinal anchor points */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm" />
      </div>
    );
  }

  // 6. GENERAL CONTAINER & UI ELEMENTS (CONFORMING TO ELEMENT'S BORDER-RADIUS)
  const getRadiusStyle = (): React.CSSProperties => {
    if (type === 'fab' || type === 'pillButton' || type === 'avatar') {
      return { borderRadius: '9999px' };
    }
    if (type === 'bottomSheet') {
      return { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
    }
    if (typeof style.borderRadius === 'number') {
      return { borderRadius: style.borderRadius };
    }
    if (typeof style.borderRadius === 'object' && style.borderRadius !== null) {
      return {
        borderTopLeftRadius: style.borderRadius.tl,
        borderTopRightRadius: style.borderRadius.tr,
        borderBottomRightRadius: style.borderRadius.br,
        borderBottomLeftRadius: style.borderRadius.bl
      };
    }
    return { borderRadius: 8 };
  };

  return (
    <div
      style={{
        ...getRadiusStyle(),
        border: `2px solid ${SELECTION_COLOR}`
      }}
      className="absolute inset-0 pointer-events-none z-30 shadow-[0_0_6px_rgba(255,107,74,0.25)]"
    >
      {/* 4 Discrete Corner Handles for precision selection */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm shadow-sm" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm shadow-sm" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm shadow-sm" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[rgb(235,235,236)] border border-[#ff6b4a] rounded-sm shadow-sm" />
    </div>
  );
};
