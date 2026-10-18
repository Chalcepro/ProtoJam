import React, { useId, useMemo } from 'react';
import type { StrokeLayer, UIElement } from '../../types/components';
import { blended, paintRgba } from '../../lib/paint';
import {
  cornersOf, dashOf, extrudeFaces, extrusions, hasSides, isPlainStroke, outlineOf, sidesD, strokeInset
} from '../../lib/strokeArt';
import { shapeD } from '../../lib/boolean';

const isText = (el: UIElement) => el.type === 'text' || el.type === 'heading';

// Extrusions: drawn behind the element (z-index -1 inside its wrapper), the
// first in the Effects list nearest, each further one behind it.
export const ExtrudeArt: React.FC<{ element: UIElement }> = ({ element }) => {
  const fx = extrusions(element);
  const d = fx.length && !isText(element) ? outlineOf(element) : '';
  const layers = useMemo(() => !d ? [] : fx.slice().reverse().map(e =>
    ({ id: e.id, ...extrudeFaces(d, e.x ?? 0, e.y ?? 0, e.color || '#141413', e.color2) })), [d, JSON.stringify(fx)]);
  if (!layers.length) return null;
  return (
    <svg data-extrude className="absolute left-0 top-0 pointer-events-none" width="100%" height="100%" overflow="visible"
         style={{ zIndex: -1, opacity: element.style.opacity ?? 1 }}>
      {layers.map(l => (
        <g key={l.id}>
          <path d={l.cap} fill={l.faces[l.faces.length - 1]?.color || 'transparent'} />
          {/* the same colour round each face hides hairline seams between them */}
          {l.faces.map((f, i) => <path key={i} d={f.d} fill={f.color} stroke={f.color} strokeWidth={0.6} strokeLinejoin="round" />)}
        </g>
      ))}
    </svg>
  );
};

// Strokes CSS cannot draw - chosen sides, their own corner rounding, line
// ends, gradients - laid over a box. Outlined shapes (stars, vectors...) draw
// every stroke themselves in SvgPaint.
export const SideStrokes: React.FC<{ element: UIElement }> = ({ element }) => {
  const uid = useId().replace(/:/g, '');
  const s = element.style;
  if (!s.strokes || (!hasSides(element) && element.type !== 'ellipse')) return null;
  const list = s.strokes.filter(x => x.visible && x.width > 0 && !isPlainStroke(x)).slice().reverse();   // bottom first
  if (!list.length) return null;
  const w = Number(s.width) || 0, h = Number(s.height) || 0;
  const pathOf = (x: StrokeLayer) => {
    if (element.type === 'ellipse') {
      const k = strokeInset(x);
      return shapeD({ ...element, style: { ...s, x: k, y: k, width: Math.max(0, w - 2 * k), height: Math.max(0, h - 2 * k) } });
    }
    const corners = x.radius !== undefined ? { tl: x.radius, tr: x.radius, br: x.radius, bl: x.radius } : cornersOf(element);
    return sidesD(w, h, x.sides || { top: true, right: true, bottom: true, left: true }, corners, strokeInset(x));
  };
  return (
    <svg data-side-strokes className="absolute left-0 top-0 pointer-events-none" width="100%" height="100%" overflow="visible"
         style={{ opacity: s.opacity ?? 1 }}>
      <defs>{list.map((x, i) => <StrokeGradient key={x.id} id={`${uid}-g${i}`} s={x} w={w} h={h} />)}</defs>
      {list.map((x, i) => (
        <path key={x.id} d={pathOf(x)} fill="none"
              stroke={x.paint === 'linear' || x.paint === 'radial' ? `url(#${uid}-g${i})` : paintRgba(x.color, x.opacity)}
              strokeOpacity={x.paint === 'linear' || x.paint === 'radial' ? x.opacity : undefined}
              strokeWidth={x.width} strokeDasharray={dashOf(x)}
              strokeLinecap={x.style === 'dotted' ? 'round' : x.cap || 'butt'} strokeLinejoin="round"
              style={{ mixBlendMode: blended(x) ? x.blendMode : undefined }} />
      ))}
    </svg>
  );
};

// A stroke's gradient across the whole box (not each side's own bounds), so
// it runs continuously round the corners.
export const StrokeGradient: React.FC<{ id: string; s: StrokeLayer; w: number; h: number; box?: boolean }> = ({ id, s, w, h, box }) => {
  if (s.paint !== 'linear' && s.paint !== 'radial') return null;
  const stops = (s.gradient?.stops || []).map((st, k) => <stop key={k} offset={`${st.offset}%`} stopColor={st.color} />);
  // box: the outline's own bounds (SvgPaint shapes); otherwise the element's box
  const units = box ? { gradientUnits: 'objectBoundingBox' as const } : { gradientUnits: 'userSpaceOnUse' as const };
  const W = box ? 1 : w, H = box ? 1 : h;
  if (s.paint === 'radial') return <radialGradient id={id} {...units} cx={W / 2} cy={H / 2} r={Math.max(W, H) / 2}>{stops}</radialGradient>;
  // a CSS angle (0 = up, clockwise), the line long enough to reach the corners
  const a = ((s.gradient?.angle ?? 180) * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const half = Math.abs((W / 2) * dx) + Math.abs((H / 2) * dy);
  return <linearGradient id={id} {...units} x1={W / 2 - dx * half} y1={H / 2 - dy * half} x2={W / 2 + dx * half} y2={H / 2 + dy * half}>{stops}</linearGradient>;
};
