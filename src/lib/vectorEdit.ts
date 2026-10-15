import type { VectorData, VectorPoint } from '../types/components';

// Edits on a vector's points that work across all of its paths.

type Path = { points: VectorPoint[]; isClosed: boolean };
const pathsOf = (vd: VectorData): Path[] => [...(vd.subpaths || []), { points: vd.points, isClosed: vd.isClosed }];
// back from a list of paths: the last is the one being drawn
const fromPaths = (vd: VectorData, paths: Path[]): VectorData => {
  const last = paths[paths.length - 1] || { points: [], isClosed: false };
  // a closed last path is finished: the pen starts a new one after it
  if (last.isClosed) return { ...vd, subpaths: paths, points: [], isClosed: false };
  return { ...vd, subpaths: paths.slice(0, -1), points: last.points, isClosed: last.isClosed };
};
const newId = (i: number) => `pt-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

// Line up the points: their left / centre / right edge, or top / middle / bottom.
export const alignPoints = (vd: VectorData, ids: string[], how: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): VectorData => {
  const sel = pathsOf(vd).flatMap(p => p.points).filter(p => ids.includes(p.id));
  if (sel.length < 2) return vd;
  const xs = sel.map(p => p.x), ys = sel.map(p => p.y);
  const v = { left: Math.min(...xs), right: Math.max(...xs), center: (Math.min(...xs) + Math.max(...xs)) / 2,
              top: Math.min(...ys), bottom: Math.max(...ys), middle: (Math.min(...ys) + Math.max(...ys)) / 2 }[how];
  const horiz = how === 'left' || how === 'center' || how === 'right';
  return fromPaths(vd, pathsOf(vd).map(p => ({ ...p, points: p.points.map(q => ids.includes(q.id) ? { ...q, [horiz ? 'x' : 'y']: Math.round(v) } : q) })));
};

// Symmetrize: draw one half, get the whole. The path is mirrored across its
// outer edge - the left or right edge for 'x' (whichever has more points on
// it), top or bottom for 'y'. An open half whose ends sit on that edge joins
// its mirror into one closed shape; anything else gets a mirrored copy.
export const symmetrize = (vd: VectorData, axis: 'x' | 'y'): VectorData => {
  const all = pathsOf(vd).flatMap(p => p.points);
  if (!all.length) return vd;
  const k = axis === 'x' ? 'x' : 'y';
  const lo = Math.min(...all.map(p => p[k])), hi = Math.max(...all.map(p => p[k]));
  const onLo = all.filter(p => Math.abs(p[k] - lo) < 1).length, onHi = all.filter(p => Math.abs(p[k] - hi) < 1).length;
  const a = onLo > onHi ? lo : hi;
  const flipH = (h?: { x: number; y: number }) => h && (axis === 'x' ? { x: -h.x, y: h.y } : { x: h.x, y: -h.y });
  // mirrored and walked backwards (so the winding, and so the fill, matches)
  const mirror = (pts: VectorPoint[]) => [...pts].reverse().map((p, i) => ({
    ...p, id: newId(i),
    x: axis === 'x' ? 2 * a - p.x : p.x, y: axis === 'y' ? 2 * a - p.y : p.y,
    handleIn: flipH(p.handleOut), handleOut: flipH(p.handleIn)
  }));
  const on = (p: VectorPoint) => Math.abs(p[k] - a) < 1;
  const out: Path[] = [];
  for (const p of pathsOf(vd)) {
    if (!p.points.length) continue;
    const m = mirror(p.points);
    const first = p.points[0], last = p.points[p.points.length - 1];
    if (!p.isClosed && p.points.length > 1 && on(first) && on(last)) {
      // join: the ends on the edge are shared, their handles completed by the mirror
      const body = p.points.map((q, i) =>
        i === p.points.length - 1 ? { ...q, [k]: a, handleOut: m[0].handleOut }
        : i === 0 ? { ...q, [k]: a, handleIn: m[m.length - 1].handleIn } : q);
      out.push({ points: [...body, ...m.slice(1, -1)], isClosed: true });
    } else if (!p.isClosed && p.points.length > 1 && on(last)) {
      out.push({ points: [...p.points.slice(0, -1), { ...last, [k]: a, handleOut: m[0].handleOut }, ...m.slice(1)], isClosed: false });
    } else {
      out.push(p, { points: m, isClosed: p.isClosed });
    }
  }
  return fromPaths(vd, out);
};

// The point on a segment nearest (x, y), as the segment and its t, within maxDist.
export const segmentAt = (vd: VectorData, x: number, y: number, maxDist: number) => {
  let best: { path: number; seg: number; t: number; d: number } | null = null;
  pathsOf(vd).forEach((p, pi) => {
    const n = p.points.length, segs = p.isClosed ? n : n - 1;
    for (let si = 0; si < segs; si++) {
      const [P0, P1, P2, P3] = ctrl(p.points[si], p.points[(si + 1) % n]);
      for (let s = 0; s <= 60; s++) {
        const t = s / 60, b = bez(P0, P1, P2, P3, t), d = Math.hypot(b.x - x, b.y - y);
        if (d <= maxDist && (!best || d < best.d)) best = { path: pi, seg: si, t, d };
      }
    }
  });
  return best as { path: number; seg: number; t: number; d: number } | null;
};

// A new point on a segment at t, splitting a curve so its shape is kept.
export const insertPoint = (vd: VectorData, path: number, seg: number, t: number): { vd: VectorData; id: string } => {
  const paths = pathsOf(vd);
  const p = paths[path], n = p.points.length;
  const a = p.points[seg], b = p.points[(seg + 1) % n];
  const id = newId(0);
  let A = a, B = b, mid: VectorPoint;
  if (!a.handleOut && !b.handleIn) {
    mid = { id, x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t), isCorner: true };
  } else {
    // de Casteljau
    const [P0, P1, P2, P3] = ctrl(a, b);
    const L = (u: { x: number; y: number }, v: { x: number; y: number }) => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });
    const q0 = L(P0, P1), q1 = L(P1, P2), q2 = L(P2, P3), r0 = L(q0, q1), r1 = L(q1, q2), s = L(r0, r1);
    A = { ...a, handleOut: { x: q0.x - a.x, y: q0.y - a.y } };
    B = { ...b, handleIn: { x: q2.x - b.x, y: q2.y - b.y } };
    mid = { id, x: s.x, y: s.y, isCorner: false, handleIn: { x: r0.x - s.x, y: r0.y - s.y }, handleOut: { x: r1.x - s.x, y: r1.y - s.y } };
  }
  const pts = [...p.points];
  pts[seg] = A; pts[(seg + 1) % n] = B;
  pts.splice(seg + 1, 0, mid);
  paths[path] = { ...p, points: pts };
  return { vd: fromPaths(vd, paths), id };
};

const ctrl = (a: VectorPoint, b: VectorPoint) => [
  a, a.handleOut ? { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y } : a,
  b.handleIn ? { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y } : b, b
] as const;
const bez = (P0: { x: number; y: number }, P1: { x: number; y: number }, P2: { x: number; y: number }, P3: { x: number; y: number }, t: number) => {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y
  };
};
