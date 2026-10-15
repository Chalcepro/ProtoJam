import React from 'react';
import { UIElement } from '../../types/components';
import { SemanticElementRenderer } from './SemanticElementRenderer';
import { BooleanShape } from './BooleanShape';
import { shapeD } from '../../lib/boolean';
import { effectsCss } from '../../lib/styleCss';

// The outline of a frame made from a shape, in its own 0,0 space.
export const frameOutline = (el: UIElement) =>
  el.style.frameShape ? shapeD({ ...el, style: { ...el.style, x: 0, y: 0 } }) : '';

// How a frame cuts what is inside it, with Clip content on: along its shape
// (circle, triangle, star, a drawn path) or its rounded box.
export const clipCss = (el: UIElement): React.CSSProperties => {
  if (!el.style.clipContent) return { overflow: 'visible' };
  const d = frameOutline(el);
  if (d) return { clipPath: `path('${d}')` };
  return { overflow: 'hidden', borderRadius: typeof el.style.borderRadius === 'number' ? el.style.borderRadius : undefined };
};

// A frame's own look under its children: a boolean result, a shape's
// outline, or the plain box.
export const ContainerBox: React.FC<{ el: UIElement; elements: UIElement[]; interactive?: boolean; hidden?: boolean }> = ({ el, elements, interactive, hidden }) => {
  const s = el.style;
  if (s.booleanOp) return hidden ? null : <BooleanShape group={el} elements={elements} />;
  if (s.frameShape) {
    return (
      <svg width="100%" height="100%" overflow="visible" className="absolute inset-0 pointer-events-none"
           style={{ opacity: hidden ? 0 : s.opacity ?? 1, ...effectsCss(s, false), boxShadow: undefined }}>
        <path d={frameOutline(el)} fill={s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : 'none'}
              stroke={s.borderWidth ? (s.borderColor || '#ebebec') : 'none'} strokeWidth={s.borderWidth || 0} />
      </svg>
    );
  }
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: hidden ? 0 : undefined }}>
      <SemanticElementRenderer element={el} isInteractive={!!interactive} />
    </div>
  );
};
