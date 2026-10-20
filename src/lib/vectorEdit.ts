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

// ---- segments (the lines between two points) -------------------------------

export type Segment = { a: VectorPoint; b: VectorPoint };

// Every line of the vector, each named by its two end points.
export const segmentsOf = (vd: VectorData): Segment[] =>
  pathsOf(vd).flatMap(p => {
    const n = p.points.length, out: Segment[] = [];
    for (let i = 0; i < (p.isClosed ? n : n - 1) && n > 1; i++) out.push({ a: p.points[i], b: p.points[(i + 1) % n] });
    return out;
  });

export const segmentPoint = (s: Segment, t: number) => {
  const [P0, P1, P2, P3] = ctrl(s.a, s.b);
  return bez(P0, P1, P2, P3, t);
};

export const segmentMid = (s: Segment) => {
  const [P0, P1, P2, P3] = ctrl(s.a, s.b);
  return bez(P0, P1, P2, P3, 0.5);
};

export const segmentD = (s: Segment, map: (x: number, y: number) => [number, number] = (x, y) => [x, y]) => {
  const [P0, P1, P2, P3] = ctrl(s.a, s.b).map(p => map(p.x, p.y));
  return `M ${P0[0]} ${P0[1]} C ${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]} ${P3[0]} ${P3[1]}`;
};

// Take one line out, as Figma does: the path splits there (a closed one
// opens), the end points stay while another line still uses them, and a
// point left with no line at all goes.
export const deleteSegment = (vd: VectorData, aId: string, bId: string): VectorData => {
  const out: Path[] = [];
  for (const p of pathsOf(vd)) {
    const n = p.points.length;
    const i = p.points.findIndex((q, k) => q.id === aId && p.points[(k + 1) % n]?.id === bId && (p.isClosed || k < n - 1));
    if (i < 0) { out.push(p); continue; }
    // the line leaving the end loses its handle there
    const cut = (q: VectorPoint, side: 'handleIn' | 'handleOut') => ({ ...q, [side]: undefined });
    if (p.isClosed) {
      // open it at the line: from b round to a
      const pts = [...p.points.slice(i + 1), ...p.points.slice(0, i + 1)];
      pts[0] = cut(pts[0], 'handleIn'); pts[pts.length - 1] = cut(pts[pts.length - 1], 'handleOut');
      out.push({ points: pts, isClosed: false });
    } else {
      const left = p.points.slice(0, i + 1), right = p.points.slice(i + 1);
      left[left.length - 1] = cut(left[left.length - 1], 'handleOut');
      right[0] = cut(right[0], 'handleIn');
      out.push({ points: left, isClosed: false }, { points: right, isClosed: false });
    }
  }
  // a point on its own is not a line any more
  const kept = out.filter(p => p.points.length > 1);
  const last = kept[kept.length - 1];
  // the last path is the one the pen would carry on; keep it open-ended
  return { ...vd, subpaths: kept.slice(0, -1), points: last ? last.points : [], isClosed: last ? last.isClosed : false, regions: {} };
};

// Ctrl+J: join two end points. The two ends of one open path close it; ends
// of two open paths make one path through a new line between them. Anything
// else (a point in the middle of a path, a closed path) cannot join: null.
export const joinPoints = (vd: VectorData, aId: string, bId: string): VectorData | null => {
  const paths = pathsOf(vd).filter(p => p.points.length);
  const find = (id: string) => {
    const pi = paths.findIndex(p => p.points.some(q => q.id === id));
    if (pi < 0) return null;
    const p = paths[pi], i = p.points.findIndex(q => q.id === id);
    return !p.isClosed && (i === 0 || i === p.points.length - 1) ? { pi, first: i === 0 } : null;
  };
  const A = find(aId), B = find(bId);
  if (!A || !B) return null;
  // walked the other way: order reversed, each point's handles swapped
  const rev = (pts: VectorPoint[]) => [...pts].reverse().map(q => ({ ...q, handleIn: q.handleOut, handleOut: q.handleIn }));
  if (A.pi === B.pi) {
    if (paths[A.pi].points.length < 3) return null;
    paths[A.pi] = { ...paths[A.pi], isClosed: true };
    return fromPaths(vd, paths);
  }
  const P = A.first ? rev(paths[A.pi].points) : paths[A.pi].points;      // ends at a
  const Q = B.first ? paths[B.pi].points : rev(paths[B.pi].points);      // starts at b
  const merged = { points: [...P, ...Q], isClosed: false };
  const out = paths.filter((_, i) => i !== A.pi && i !== B.pi);
  out.push(merged);
  return fromPaths(vd, out);
};

// An end point of an open path (where a line can be carried on from).
export const isEndPoint = (vd: VectorData, id: string) =>
  pathsOf(vd).some(p => !p.isClosed && p.points.length > 0 && (p.points[0].id === id || p.points[p.points.length - 1].id === id));

// The pen carries on from this end: its path becomes the one being drawn,
// turned round so that end is last.
export const continueFrom = (vd: VectorData, id: string): VectorData => {
  const paths = pathsOf(vd).filter(p => p.points.length);
  const i = paths.findIndex(p => !p.isClosed && (p.points[0].id === id || p.points[p.points.length - 1].id === id));
  if (i < 0) return vd;
  let pts = paths[i].points;
  if (pts[0].id === id && pts.length > 1) pts = [...pts].reverse().map(q => ({ ...q, handleIn: q.handleOut, handleOut: q.handleIn }));
  const rest = paths.filter((_, k) => k !== i);
  return { ...vd, subpaths: rest, points: pts, isClosed: false };
};

// ---- delete and heal --------------------------------------------------------
// Figma's "delete and heal": the point goes, its two neighbours stay where
// they are and their handles are reshaped so one curve follows the two old
// ones as closely as it can - sampled along the old curves and fitted with
// Philip J. Schneider's least-squares method (Graphics Gems), the tangents
// at both ends kept. Lines with no curves stay straight; an end of an open
// path just goes.
type V = { x: number; y: number };
const sub = (a: V, b: V) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y;
const len = (a: V) => Math.hypot(a.x, a.y);
const unit = (a: V) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };

const healOne = (pts: VectorPoint[], closed: boolean, i: number): VectorPoint[] | null => {
  const n = pts.length;
  if (!closed && (i === 0 || i === n - 1)) {
    const out = pts.filter((_, k) => k !== i);
    // the new end has no line beyond it any more
    if (out.length) { if (i === 0) out[0] = { ...out[0], handleIn: undefined }; else out[out.length - 1] = { ...out[out.length - 1], handleOut: undefined }; }
    return out;
  }
  const ia = (i - 1 + n) % n, ib = (i + 1) % n;
  const A = pts[ia], P = pts[i], B = pts[ib];
  const out = [...pts];
  if (!A.handleOut && !P.handleIn && !P.handleOut && !B.handleIn) {
    // all corners: a straight line between the neighbours
    return out.filter((_, k) => k !== i);
  }
  const [a0, a1, a2, a3] = ctrl(A, P), [b0, b1, b2, b3] = ctrl(P, B);
  // the old shape, sampled; parameter by distance along it
  const samples: V[] = [];
  for (let k = 0; k <= 16; k++) samples.push(bez(a0, a1, a2, a3, k / 16));
  for (let k = 1; k <= 16; k++) samples.push(bez(b0, b1, b2, b3, k / 16));
  const d: number[] = [0];
  for (let k = 1; k < samples.length; k++) d.push(d[k - 1] + len(sub(samples[k], samples[k - 1])));
  const total = d[d.length - 1] || 1;
  // tangents leaving A and arriving at B, as the old curves had them
  const tA = unit(len(sub(a1, a0)) > 1e-6 ? sub(a1, a0) : len(sub(a2, a0)) > 1e-6 ? sub(a2, a0) : sub(a3, a0));
  const tB = unit(len(sub(b2, b3)) > 1e-6 ? sub(b2, b3) : len(sub(b1, b3)) > 1e-6 ? sub(b1, b3) : sub(b0, b3));
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  samples.forEach((p, k) => {
    const u = d[k] / total, m = 1 - u;
    const B0 = m * m * m, B1 = 3 * u * m * m, B2 = 3 * u * u * m, B3 = u * u * u;
    const v1 = { x: tA.x * B1, y: tA.y * B1 }, v2 = { x: tB.x * B2, y: tB.y * B2 };
    c00 += dot(v1, v1); c01 += dot(v1, v2); c11 += dot(v2, v2);
    const tmp = { x: p.x - (a0.x * (B0 + B1) + b3.x * (B2 + B3)), y: p.y - (a0.y * (B0 + B1) + b3.y * (B2 + B3)) };
    x0 += dot(v1, tmp); x1 += dot(v2, tmp);
  });
  const det = c00 * c11 - c01 * c01;
  const chord = len(sub(b3, a0));
  let al1 = Math.abs(det) > 1e-9 ? (x0 * c11 - x1 * c01) / det : 0;
  let al2 = Math.abs(det) > 1e-9 ? (c00 * x1 - c01 * x0) / det : 0;
  // degenerate or backwards: the usual fallback, a third of the way
  if (!(al1 > 1e-6 && al2 > 1e-6) || al1 > chord * 3 || al2 > chord * 3) { al1 = al2 = chord / 3; }
  out[ia] = { ...A, handleOut: { x: tA.x * al1, y: tA.y * al1 } };
  out[ib] = { ...B, handleIn: { x: tB.x * al2, y: tB.y * al2 } };
  return out.filter((_, k) => k !== i);
};

export const healDelete = (vd: VectorData, ids: string[]): VectorData => {
  let paths = pathsOf(vd).filter(p => p.points.length);
  for (const id of ids) {
    paths = paths.map(p => {
      const i = p.points.findIndex(q => q.id === id);
      if (i < 0) return p;
      const pts = healOne(p.points, p.isClosed, i) || p.points;
      return { points: pts, isClosed: p.isClosed && pts.length > 2 };
    }).filter(p => p.points.length > 1 || (p.points.length === 1 && !p.isClosed && pathsOf(vd).length === 1));
  }
  return fromPaths(vd, paths);
};

// ---- crossings ---------------------------------------------------------------

type Pt = { x: number; y: number };
type Bez = [Pt, Pt, Pt, Pt];
const lerp = (u: Pt, v: Pt, t: number): Pt => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });
const cut = ([P0, P1, P2, P3]: Bez, t: number): [Bez, Bez] => {
  const a = lerp(P0, P1, t), b = lerp(P1, P2, t), c = lerp(P2, P3, t), d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t);
  return [[P0, a, d, m], [m, e, c, P3]];
};
const boxOf = (c: Bez) => {
  const xs = c.map(p => p.x), ys = c.map(p => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
type Box4 = ReturnType<typeof boxOf>;
const apart = (a: Box4, b: Box4) => a.x1 < b.x0 - 1e-6 || b.x1 < a.x0 - 1e-6 || a.y1 < b.y0 - 1e-6 || b.y1 < a.y0 - 1e-6;

// Where two lines cross, as [t on A, t on B]. Straight lines exactly; curves
// by halving both until the pieces are tiny (a budget stops lines lying on
// top of each other, which touch everywhere).
const crossings = (A: Bez, B: Bez, straight: boolean): [number, number][] => {
  if (straight) {
    const r = { x: A[3].x - A[0].x, y: A[3].y - A[0].y }, s = { x: B[3].x - B[0].x, y: B[3].y - B[0].y };
    const den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-9) return [];
    const qx = B[0].x - A[0].x, qy = B[0].y - A[0].y;
    const t = (qx * s.y - qy * s.x) / den, u = (qx * r.y - qy * r.x) / den;
    return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 ? [[t, u]] : [];
  }
  const out: [number, number][] = [];
  let budget = 6000;
  const go = (a: Bez, a0: number, a1: number, b: Bez, b0: number, b1: number) => {
    if (--budget < 0) return;
    const ba = boxOf(a), bb = boxOf(b);
    if (apart(ba, bb)) return;
    const sa = Math.max(ba.x1 - ba.x0, ba.y1 - ba.y0), sb = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
    if (sa < 0.01 && sb < 0.01) { out.push([(a0 + a1) / 2, (b0 + b1) / 2]); return; }
    if (sa >= sb) { const [l, r] = cut(a, 0.5), m = (a0 + a1) / 2; go(l, a0, m, b, b0, b1); go(r, m, a1, b, b0, b1); }
    else { const [l, r] = cut(b, 0.5), m = (b0 + b1) / 2; go(a, a0, a1, l, b0, m); go(a, a0, a1, r, m, b1); }
  };
  go(A, 0, 1, B, 0, 1);
  return budget < 0 ? [] : out;
};

// Lines that cross get a point where they cross - one on each line, on the
// very same spot, so they meet there (as joined points do) and the areas
// between them can be filled. A line whose end lands on another line's
// middle splits that one too. Curves keep their shape.
// changed: the points just made or moved. Only lines touching one of them are
// checked (against every line); two lines that were both there before have
// been checked already, so a drawing doesn't get slower to draw as it grows.
export const splitCrossings = (vd: VectorData, changed?: Set<string>): VectorData => {
  const paths = pathsOf(vd);
  const segs: { pi: number; si: number; c: Bez; box: Box4; straight: boolean; fresh: boolean }[] = [];
  paths.forEach((p, pi) => {
    const n = p.points.length;
    for (let si = 0; si < (p.isClosed ? n : n - 1) && n > 1; si++) {
      const a = p.points[si], b = p.points[(si + 1) % n], straight = !a.handleOut && !b.handleIn;
      // a straight line as a curve with its controls at the thirds, so t runs evenly along it
      const c: Bez = straight ? [a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b] : ctrl(a, b) as unknown as Bez;
      segs.push({ pi, si, c, box: boxOf(c), straight, fresh: !changed || changed.has(a.id) || changed.has(b.id) });
    }
  });
  const END = 0.5;                                        // this close to an end point is the end point
  const cuts = new Map<number, { t: number; at: Pt }[]>();
  const add = (k: number, t: number, at: Pt) => {
    const l = cuts.get(k) || [];
    if (!l.some(c => Math.hypot(c.at.x - at.x, c.at.y - at.y) < END)) l.push({ t, at });
    cuts.set(k, l);
  };
  const endOf = (c: Bez, p: Pt) => [c[0], c[3]].find(q => Math.hypot(q.x - p.x, q.y - p.y) < END);
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const A = segs[i], B = segs[j];
    if (!A.fresh && !B.fresh) continue;                    // both unchanged: done before
    if (apart(A.box, B.box)) continue;
    for (const [ta, tb] of crossings(A.c, B.c, A.straight && B.straight)) {
      const pa = cut(A.c, Math.min(1, Math.max(0, ta)))[0][3];
      const ea = endOf(A.c, pa), eb = endOf(B.c, pa);
      if (ea && eb) continue;                             // they already meet at a point
      const at = ea || eb || { x: Math.round(pa.x * 100) / 100, y: Math.round(pa.y * 100) / 100 };
      if (!ea) add(i, ta, at);
      if (!eb) add(j, tb, at);
    }
  }
  if (!cuts.size) return vd;
  const h = (u: Pt, v: Pt) => (Math.hypot(u.x - v.x, u.y - v.y) < 1e-6 ? undefined : { x: u.x - v.x, y: u.y - v.y });
  let made = 0;
  const out = paths.map((p, pi) => {
    const n = p.points.length, pts = p.points.map(q => ({ ...q })), extra: VectorPoint[][] = pts.map(() => []);
    segs.forEach((sg, k) => {
      const list = sg.pi === pi ? cuts.get(k) : undefined;
      if (!list) return;
      list.sort((a, b) => a.t - b.t);
      // a straight line just gets the points; a curve is cut so it keeps its shape
      if (sg.straight) { extra[sg.si].push(...list.map(({ at }) => ({ id: newId(made++), x: at.x, y: at.y, isCorner: true }))); return; }
      let c = sg.c, prev = 0;
      for (const { t, at } of list) {
        const [l, r] = cut(c, (t - prev) / (1 - prev));
        const before = extra[sg.si][extra[sg.si].length - 1] || pts[sg.si];
        before.handleOut = h(l[1], l[0]);
        extra[sg.si].push({ id: newId(made++), x: at.x, y: at.y, handleIn: h(l[2], l[3]), isCorner: false });
        c = r; prev = t;
      }
      extra[sg.si][extra[sg.si].length - 1].handleOut = h(c[1], c[0]);
      pts[(sg.si + 1) % n].handleIn = h(c[2], c[3]);
    });
    return { ...p, points: pts.flatMap((q, i) => [q, ...extra[i]]) };
  });
  const last = out[out.length - 1];
  return { ...vd, subpaths: out.slice(0, -1), points: last.points, isClosed: last.isClosed };
};
