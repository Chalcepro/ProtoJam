import type { VectorData, VectorPoint } from '../types/components';

// SVG path for a pen path. Handles are offsets from their point; a segment
// with a handle at either end is a curve, otherwise a straight line.
export const vectorPathD = (vd: VectorData): string => {
  const pts = vd.points;
  if (!pts.length) return '';
  const seg = (p: VectorPoint, q: VectorPoint) => {
    if (!p.handleOut && !q.handleIn) return `L ${q.x} ${q.y}`;
    const c1 = p.handleOut ? { x: p.x + p.handleOut.x, y: p.y + p.handleOut.y } : p;
    const c2 = q.handleIn ? { x: q.x + q.handleIn.x, y: q.y + q.handleIn.y } : q;
    return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`;
  };
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ' ' + seg(pts[i - 1], pts[i]);
  if (vd.isClosed && pts.length > 2) d += ' ' + seg(pts[pts.length - 1], pts[0]) + ' Z';
  return d;
};

// Box round the points and their handles.
export const vectorBounds = (vd: VectorData) => {
  const xs: number[] = [], ys: number[] = [];
  vd.points.forEach(p => {
    xs.push(p.x); ys.push(p.y);
    [p.handleIn, p.handleOut].forEach(h => { if (h) { xs.push(p.x + h.x); ys.push(p.y + h.y); } });
  });
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x0, y0, w: Math.max(1, Math.max(...xs) - x0), h: Math.max(1, Math.max(...ys) - y0) };
};
