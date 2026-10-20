import paper from 'paper/dist/paper-core';
import type { UIElement, VectorData, VectorPoint } from '../types/components';
import { vectorPathD } from './vector';
import { splitCrossings } from './vectorEdit';
import { cornerShapeD } from './corners';

// Shape geometry for booleans (Union / Subtract / Intersect / Exclude) and for
// the fillable regions inside a vector. paper.js does the path maths, offline.

export type BoolOp = 'union' | 'subtract' | 'intersect' | 'exclude';

let ready = false;
export const setup = () => {
  if (!ready) { paper.setup(new paper.Size(1, 1)); ready = true; }
};

// Shapes that have an outline a boolean can work on.
export const BOOLEANABLE = new Set(['rectangle', 'ellipse', 'polygon', 'star', 'vectorPath', 'container']);

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
    case 'star':
      return cornerShapeD(el.type, s, x, y, w, h);
    case 'vectorPath': {
      const vd = s.vectorData;
      if (!vd) return '';
      setup();
      const sx = vd.w ? w / vd.w : 1, sy = vd.h ? h / vd.h : 1;
      const p = new paper.CompoundPath(vectorAllD(vd));
      p.scale(sx, sy, new paper.Point(0, 0));
      p.translate(new paper.Point(x, y));
      const d = p.pathData; p.remove();
      return d;
    }
    case 'container':
      // a frame made from a shape is that shape
      if (s.frameShape) return shapeD({ ...el, type: s.frameShape }, ox, oy, all);
      // a boolean group inside a boolean group: its own result
      return s.booleanOp ? booleanD(s.booleanOp, all.filter(c => c.parentId === el.id && !c.hidden).map(c => shapeD(c, x, y, all))) : cornerShapeD('rect', s, x, y, w, h);
    default:
      return cornerShapeD('rect', s, x, y, w, h);
  }
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

// The areas a vector's lines close off, however they were drawn: a line that
// comes back to one of its own points, lines that meet end to end, a line
// across a shape. The lines meet where points sit on the same spot; each area
// is found by walking round it, always taking the next line clockwise. A
// face's key names its points, so it survives points being moved.
type Half = { from: string; to: string; a: VectorPoint; b: VectorPoint; c1: { x: number; y: number }; c2: { x: number; y: number }; twin: number; ang: number };
const vectorFaces = (vd: VectorData): { ids: string[]; d: string }[] => facesAndInterior(vd).faces;

// The faces, and the lines with a face on both sides (inside the drawing),
// named "aId>bId" both ways round.
const facesAndInterior = (vd: VectorData): { faces: { ids: string[]; d: string }[]; interior: Set<string> } => {
  const at = (p: { x: number; y: number }) => `${Math.round(p.x * 2) / 2},${Math.round(p.y * 2) / 2}`;
  const half: Half[] = [];
  for (const path of vectorPaths(vd)) {
    const pts = path.points, n = pts.length;
    for (let i = 0; i < (path.isClosed ? n : n - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      if (at(a) === at(b)) continue;
      const c1 = { x: a.x + (a.handleOut?.x || 0), y: a.y + (a.handleOut?.y || 0) };
      const c2 = { x: b.x + (b.handleIn?.x || 0), y: b.y + (b.handleIn?.y || 0) };
      // which way each end leaves: along its handle, else straight at the other end
      const dir = (p: { x: number; y: number }, c: { x: number; y: number }, q: { x: number; y: number }) =>
        Math.hypot(c.x - p.x, c.y - p.y) > 0.01 ? Math.atan2(c.y - p.y, c.x - p.x) : Math.atan2(q.y - p.y, q.x - p.x);
      const k = half.length;
      half.push({ from: at(a), to: at(b), a, b, c1, c2, twin: k + 1, ang: dir(a, c1, b) },
                { from: at(b), to: at(a), a: b, b: a, c1: c2, c2: c1, twin: k, ang: dir(b, c2, a) });
    }
  }
  const out = new Map<string, number[]>();
  half.forEach((h, i) => { const l = out.get(h.from); if (l) l.push(i); else out.set(h.from, [i]); });
  out.forEach(l => l.sort((p, q) => half[p].ang - half[q].ang));
  const used = new Set<number>(), faces: { ids: string[]; d: string }[] = [], inner = new Set<number>();
  for (let s = 0; s < half.length; s++) {
    if (used.has(s)) continue;
    const loop: number[] = [];
    for (let h = s, guard = 0; !used.has(h) && guard < 4000; guard++) {
      used.add(h); loop.push(h);
      // at the far end: the line just before the way back, going round
      const l = out.get(half[h].to)!, back = l.indexOf(half[h].twin);
      h = l[(back - 1 + l.length) % l.length];
    }
    // the inside of an area goes round one way; the outside of a drawing the other
    let area = 0;
    for (const i of loop) {
      const { a, b, c1, c2 } = half[i];
      const q = [a, c1, c2, b];
      for (let j = 0; j < 3; j++) area += q[j].x * q[j + 1].y - q[j + 1].x * q[j].y;
    }
    if (area / 2 > 0.5) {
      loop.forEach(i => inner.add(i));
      const f = half[loop[0]].a;
      const d = `M ${f.x} ${f.y} ` + loop.map(i => { const { c1, c2, b } = half[i]; return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`; }).join(' ') + ' Z';
      faces.push({ ids: Array.from(new Set(loop.map(i => half[i].a.id))).sort(), d });
    }
  }
  const interior = new Set<string>();
  half.forEach((h, i) => { if (inner.has(i) && inner.has(h.twin)) { interior.add(`${h.a.id}>${h.b.id}`); interior.add(`${h.b.id}>${h.a.id}`); } });
  return { faces, interior };
};
export const interiorLines = (vd: VectorData) => facesAndInterior(vd).interior;

// a short, stable name for a set of point ids
const hashIds = (ids: string[]) => {
  let h = 5381;
  for (const c of ids.join('|')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return 'f' + h.toString(36);
};

// The areas the closed paths and closed-off faces of a vector cut each other
// into. A region's key lists the outlines that contain it ("0,2"; a face is
// "f..." by its points), so it survives point edits.
export const vectorRegions = (vd: VectorData): { key: string; d: string }[] => {
  const closedPaths = vectorPaths(vd).filter(p => p.isClosed && p.points.length > 2);
  const loops = closedPaths.map((p, i) => ({ key: String(i), d: vectorPathD({ points: p.points, isClosed: true, faces: [] }) }));
  // faces that are not just one of the closed paths again
  const own = new Set(closedPaths.map(p => p.points.map(q => q.id).sort().join('|')));
  for (const f of vectorFaces(vd)) if (!own.has(f.ids.join('|'))) loops.push({ key: hashIds(f.ids), d: f.d });
  const closed = loops.map(l => l.d);
  if (!closed.length) return [];
  const ck = 'regions|' + closed.join('|');
  const hit = cache.get(ck);
  if (hit !== undefined) return JSON.parse(hit);
  setup();
  // too many to work out every overlap (2^n): each outline less the outlines
  // inside it - right when the lines meet at points where they cross
  if (closed.length > 8) {
    const items = loops.map(l => { const p = toPath(l.d); return { key: l.key, p, area: Math.abs((p as any).area), inner: p.interiorPoint }; });
    const out: { key: string; d: string }[] = [];
    for (const L of items) {
      let acc: paper.PathItem = L.p.clone() as paper.PathItem;
      for (const G of items) {
        if (G === L || G.area >= L.area || !L.p.contains(G.inner)) continue;
        const r = acc.subtract(G.p); acc.remove(); acc = r;
      }
      if (Math.abs((acc as any).area) > 0.5) out.push({ key: L.key, d: acc.pathData });
      acc.remove();
    }
    items.forEach(i => i.p.remove());
    cache.set(ck, JSON.stringify(out));
    return out;
  }
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
    if (a && Math.abs((a as any).area) > 0.5) out.push({ key: loops.filter((_, i) => mask & (1 << i)).map(l => l.key).join(','), d: a.pathData });
    a?.remove();
  }
  cache.set(ck, JSON.stringify(out));
  return out;
};

// Points where lines cross (splitCrossings), keeping the fills: each new
// area takes the colour of the area it lies in.
export const withCrossings = (vd: VectorData): VectorData => {
  const next = splitCrossings(vd);
  if (next === vd || !vd.regions || !Object.keys(vd.regions).length) return next;
  const before = vectorRegions(vd), regions: Record<string, string> = {};
  setup();
  for (const r of vectorRegions(next)) {
    const p = toPath(r.d), inner = p.interiorPoint;
    p.remove();
    const was = regionAt(before, inner.x, inner.y), colour = was && vd.regions[was];
    if (colour) regions[r.key] = colour;
  }
  return { ...next, regions };
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
  })).map(p => {
    // paper can leave two points on one spot (where an arc meets a line, or
    // a closed path's start repeated at its end): one point, both handles
    const out: typeof p.points = [];
    for (const q of p.points) {
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev.x - q.x) < 0.01 && Math.abs(prev.y - q.y) < 0.01) out[out.length - 1] = { ...prev, handleOut: q.handleOut, isCorner: prev.isCorner && q.isCorner };
      else out.push(q);
    }
    if (p.isClosed && out.length > 1) {
      const f = out[0], l = out[out.length - 1];
      if (Math.abs(f.x - l.x) < 0.01 && Math.abs(f.y - l.y) < 0.01) { out[0] = { ...f, handleIn: l.handleIn }; out.pop(); }
    }
    return { ...p, points: out };
  }).filter(p => p.points.length);
  item.remove();
  const last = paths.pop() || { points: [], isClosed: false };
  return { points: last.points, isClosed: last.isClosed, subpaths: paths, faces: [] };
};

// The closed path of a vector under a point (the smallest, when they nest),
// as the ids of its points - for dragging a shape by its inside.
export const closedPathAt = (vd: VectorData, x: number, y: number): string[] | null => {
  setup();
  let best: { ids: string[]; area: number } | null = null;
  for (const p of vectorPaths(vd)) {
    if (!p.isClosed || p.points.length < 3) continue;
    const item = new paper.Path(vectorPathD({ points: p.points, isClosed: true, faces: [] }));
    const inside = item.contains(new paper.Point(x, y)), area = Math.abs(item.area);
    item.remove();
    if (inside && (!best || area < best.area)) best = { ids: p.points.map(q => q.id), area };
  }
  return best?.ids ?? null;
};
