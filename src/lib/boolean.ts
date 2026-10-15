import paper from 'paper/dist/paper-core';
import type { UIElement, VectorData, VectorPoint } from '../types/components';
import { vectorPathD } from './vector';

// Shape geometry for booleans (Union / Subtract / Intersect / Exclude) and for
// the fillable regions inside a vector. paper.js does the path maths, offline.

export type BoolOp = 'union' | 'subtract' | 'intersect' | 'exclude';

let ready = false;
const setup = () => {
  if (!ready) { paper.setup(new paper.Size(1, 1)); ready = true; }
};

// Shapes that have an outline a boolean can work on.
export const BOOLEANABLE = new Set(['rectangle', 'ellipse', 'polygon', 'star', 'vectorPath', 'container']);

const STAR = '50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36';
const TRIANGLE = '50,5 95,95 5,95';

// One element's outline as SVG path data, at offset (ox, oy), in its own size.
export const shapeD = (el: UIElement, ox = 0, oy = 0, all: UIElement[] = []): string => {
  const s = el.style;
  const x = ox + Number(s.x), y = oy + Number(s.y), w = Number(s.width) || 0, h = Number(s.height) || 0;
  switch (el.type) {
    case 'ellipse': {
      const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case 'polygon':
    case 'star': {
      const pts = (el.type === 'star' ? STAR : TRIANGLE).split(' ').map(p => p.split(',').map(Number));
      return 'M ' + pts.map(([px, py]) => `${x + px / 100 * w} ${y + py / 100 * h}`).join(' L ') + ' Z';
    }
    case 'vectorPath': {
      const vd = s.vectorData;
      if (!vd) return '';
      const sx = vd.w ? w / vd.w : 1, sy = vd.h ? h / vd.h : 1;
      const p = new paper.CompoundPath(vectorAllD(vd));
      p.scale(sx, sy, new paper.Point(0, 0));
      p.translate(new paper.Point(x, y));
      const d = p.pathData; p.remove();
      return d;
    }
    case 'container':
      // a boolean group inside a boolean group: its own result
      return s.booleanOp ? booleanD(s.booleanOp, all.filter(c => c.parentId === el.id && !c.hidden).map(c => shapeD(c, x, y, all))) : rectD(x, y, w, h, s.borderRadius);
    default:
      return rectD(x, y, w, h, s.borderRadius);
  }
};

const rectD = (x: number, y: number, w: number, h: number, r: UIElement['style']['borderRadius']) => {
  const rr = typeof r === 'number' ? Math.min(r, w / 2, h / 2) : 0;
  if (!rr) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  return `M ${x + rr} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} ` +
         `H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`;
};

const toPath = (d: string) => new paper.CompoundPath(d);

const cache = new Map<string, string>();
// The boolean of shapes (bottom first), as path data. Subtract takes the
// others away from the bottom one; the rest combine all of them.
export const booleanD = (op: BoolOp, ds: string[]): string => {
  const parts = ds.filter(Boolean);
  if (!parts.length) return '';
  const key = op + '|' + parts.join('|');
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  setup();
  let acc: paper.PathItem = toPath(parts[0]);
  for (const d of parts.slice(1)) {
    const next = toPath(d);
    const r: paper.PathItem = op === 'union' ? acc.unite(next) : op === 'subtract' ? acc.subtract(next) : op === 'intersect' ? acc.intersect(next) : acc.exclude(next);
    acc.remove(); next.remove(); acc = r;
  }
  const out = acc.pathData; acc.remove();
  if (cache.size > 500) cache.clear();
  cache.set(key, out);
  return out;
};

// ---- inside a vector -------------------------------------------------------

// Every path of a vector: the finished ones, then the one being drawn.
export const vectorPaths = (vd: VectorData): { points: VectorPoint[]; isClosed: boolean }[] =>
  [...(vd.subpaths || []), { points: vd.points, isClosed: vd.isClosed }].filter(p => p.points.length);

export const vectorAllD = (vd: VectorData) =>
  vectorPaths(vd).map(p => vectorPathD({ points: p.points, isClosed: p.isClosed, faces: [] })).join(' ');

// The areas the closed paths of a vector cut each other into. A region's key
// lists the paths that contain it ("0,2"), so it survives point edits.
export const vectorRegions = (vd: VectorData): { key: string; d: string }[] => {
  const closed = vectorPaths(vd).filter(p => p.isClosed && p.points.length > 2)
    .map(p => vectorPathD({ points: p.points, isClosed: true, faces: [] }));
  if (!closed.length || closed.length > 8) return closed.length ? [{ key: '0', d: closed[0] }] : [];
  const ck = 'regions|' + closed.join('|');
  const hit = cache.get(ck);
  if (hit !== undefined) return JSON.parse(hit);
  setup();
  const out: { key: string; d: string }[] = [];
  for (let mask = 1; mask < 1 << closed.length; mask++) {
    let acc: paper.PathItem | null = null;
    closed.forEach((d, i) => {
      if (!(mask & (1 << i))) return;
      const p = toPath(d);
      if (!acc) { acc = p; return; }
      const r: paper.PathItem = (acc as paper.PathItem).intersect(p); (acc as paper.PathItem).remove(); p.remove(); acc = r;
    });
    closed.forEach((d, i) => {
      if (mask & (1 << i) || !acc) return;
      const p = toPath(d);
      const r: paper.PathItem = (acc as paper.PathItem).subtract(p); (acc as paper.PathItem).remove(); p.remove(); acc = r;
    });
    const a = acc as paper.PathItem | null;
    if (a && Math.abs((a as any).area) > 0.5) out.push({ key: closed.map((_, i) => i).filter(i => mask & (1 << i)).join(','), d: a.pathData });
    a?.remove();
  }
  cache.set(ck, JSON.stringify(out));
  return out;
};

// Which region a point is in (canvas units of the vector's own points).
export const regionAt = (regions: { key: string; d: string }[], x: number, y: number): string | null => {
  setup();
  for (const r of regions) {
    const p = toPath(r.d);
    const inside = p.contains(new paper.Point(x, y));
    p.remove();
    if (inside) return r.key;
  }
  return null;
};

// Path data back into editable vector points, one path per outline (holes
// included), each point with its curve handles.
export const dToVectorData = (d: string): VectorData => {
  setup();
  const item = new paper.CompoundPath(d);
  const paths = (item.children as paper.Path[]).map((c, ci) => ({
    isClosed: c.closed,
    points: c.segments.map((sg, i) => ({
      id: `pt-${Date.now()}-${ci}-${i}`,
      x: Math.round(sg.point.x * 100) / 100, y: Math.round(sg.point.y * 100) / 100,
      handleIn: sg.handleIn.isZero() ? undefined : { x: sg.handleIn.x, y: sg.handleIn.y },
      handleOut: sg.handleOut.isZero() ? undefined : { x: sg.handleOut.x, y: sg.handleOut.y },
      isCorner: sg.handleIn.isZero() && sg.handleOut.isZero()
    }))
  })).filter(p => p.points.length);
  item.remove();
  const last = paths.pop() || { points: [], isClosed: false };
  return { points: last.points, isClosed: last.isClosed, subpaths: paths, faces: [] };
};
