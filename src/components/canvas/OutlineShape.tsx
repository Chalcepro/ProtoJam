import React, { useMemo } from 'react';
import type { ElementStyle, FillLayer, UIElement } from '../../types/components';
import { shapeD } from '../../lib/boolean';
import { effectsCss } from '../../lib/styleCss';
import { fillsOf, hasLayeredPaint, strokesOf } from '../../lib/paint';
import { SvgPaint } from './SvgPaint';

// Effects for a shape drawn as an outline: drop shadows as drop-shadow
// filters, so they follow the outline (a box-shadow only follows the box).
export const outlineEffectsCss = (s: ElementStyle): React.CSSProperties => {
  const e = effectsCss(s, false);
  const drops = (s.effects || []).filter(x => x.visible && x.type === 'dropShadow')
    .map(x => `drop-shadow(${x.x ?? 0}px ${x.y ?? 4}px ${x.blur}px ${x.color || 'rgba(0,0,0,0.25)'})`);
  return { ...e, boxShadow: undefined, filter: [e.filter, ...drops].filter(Boolean).join(' ') || undefined };
};

// A shape drawn as its outline - a triangle, a star, a frame made from a
// shape, a box whose corners CSS cannot draw - with its fills and strokes.
export const OutlineShape: React.FC<{
  element: UIElement;
  fallbackFill?: string;       // the colour when it has no fill set (new triangles and stars)
  onClick?: (e: React.MouseEvent) => void;
}> = ({ element, fallbackFill, onClick }) => {
  const s = element.style;
  const d = useMemo(() => shapeD({ ...element, style: { ...s, x: 0, y: 0 } }),
    // only the geometry matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element.type, s.width, s.height, s.borderRadius, s.cornerStyle, s.cornerStyles, s.flareAxis, s.cornerSmoothing, s.pointCount, s.starRatio, s.frameShape, s.vectorData]);
  const fills: FillLayer[] = hasLayeredPaint(s) || s.fillColor || !fallbackFill
    ? fillsOf(element) : [{ id: 'default', type: 'solid', color: fallbackFill, opacity: 1, visible: true }];
  return (
    <svg width="100%" height="100%" overflow="visible" className="absolute inset-0" onClick={onClick}
         style={{ opacity: s.opacity ?? 1, ...outlineEffectsCss(s) }}>
      <SvgPaint d={d} fills={fills} strokes={strokesOf(element)} />
    </svg>
  );
};
