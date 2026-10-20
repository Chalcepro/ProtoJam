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
  [...(vd.subpaths || []).flatMap(sp => sp.points), ...vd.points].forEach(p => {
    xs.push(p.x); ys.push(p.y);
    [p.handleIn, p.handleOut].forEach(h => { if (h) { xs.push(p.x + h.x); ys.push(p.y + h.y); } });
  });
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x0, y0, w: Math.max(1, Math.max(...xs) - x0), h: Math.max(1, Math.max(...ys) - y0) };
};

// ---- Rounding any sharp corner -------------------------------------------
// Corner radius for any outline, not just boxes: wherever two segments meet
// at an angle (straight or curved ones), the corner is cut back along both
// segments and, by the corner style, a circular arc of radius r put in its
// place (round), a straight cut (bevel), or a bite centred on the corner
// (inverse). Where the outline
// already runs smoothly through a point, nothing changes. A corner may use at
// most half of each segment next to it, so tight corners get the biggest
// radius that fits. Open paths keep their two ends as they are.
type V = { x: number; y: number };
type Cubic = [V, V, V, V];
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: V, b: V, k = 1): V => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const len = (a: V) => Math.hypot(a.x, a.y);
const unit = (a: V): V => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
const lerp = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const at = ([p0, c1, c2, p3]: Cubic, t: number): V => {
  const a = lerp(p0, c1, t), b = lerp(c1, c2, t), c = lerp(c2, p3, t);
  return lerp(lerp(a, b, t), lerp(b, c, t), t);
};
// the part of a cubic between t0 and t1
const part = (cu: Cubic, t0: number, t1: number): Cubic => {
  const split = ([p0, c1, c2, p3]: Cubic, t: number): [Cubic, Cubic] => {
    const a = lerp(p0, c1, t), b = lerp(c1, c2, t), c = lerp(c2, p3, t), d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t);
    return [[p0, a, d, m], [m, e, c, p3]];
  };
  const right = t0 > 0 ? split(cu, t0)[1] : cu;
  return t1 < 1 ? split(right, (t1 - t0) / (1 - t0))[0] : right;
};
// arc length along a cubic, sampled
const SAMPLES = 24;
const lengths = (cu: Cubic) => {
  const out = [0];
  let prev = cu[0];
  for (let i = 1; i <= SAMPLES; i++) { const p = at(cu, i / SAMPLES); out.push(out[i - 1] + len(sub(p, prev))); prev = p; }
  return out;
};
const tAt = (ls: number[], d: number) => {
  const total = ls[SAMPLES];
  if (d <= 0) return 0;
  if (d >= total) return 1;
  let i = 1;
  while (ls[i] < d) i++;
  return (i - 1 + (d - ls[i - 1]) / ((ls[i] - ls[i - 1]) || 1)) / SAMPLES;
};
const near = (a: V, b: V) => len(sub(a, b)) < 1e-6;
const startDir = ([p0, c1, c2, p3]: Cubic) => unit(sub(!near(c1, p0) ? c1 : !near(c2, p0) ? c2 : p3, p0));
const endDir = ([p0, c1, c2, p3]: Cubic) => unit(sub(p3, !near(c2, p3) ? c2 : !near(c1, p3) ? c1 : p0));
const f3 = (v: number) => Math.round(v * 1000) / 1000;

export type PathCorner = 'round' | 'bevel' | 'inverse' | 'flare';
export const roundedPathD = (pts: VectorPoint[], isClosed: boolean, r: number, style: PathCorner = 'round'): string => {
  const n = pts.length;
  if (!n) return '';
  const segs: Cubic[] = [];
  const last = isClosed && n > 2 ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    segs.push([p, p.handleOut ? add(p, p.handleOut) : p, q.handleIn ? add(q, q.handleIn) : q, q]);
  }
  if (!segs.length || r <= 0) return vectorPathD({ points: pts, isClosed, faces: [] });
  const ls = segs.map(lengths);
  const trimStart = segs.map(() => 0), trimEnd = segs.map(() => 0);
  const corners: { into: number; outOf: number; rr: number; th: number }[] = [];
  // corner k sits where segment k-1 ends and segment k starts
  for (let k = isClosed ? 0 : 1; k < segs.length; k++) {
    const into = (k + segs.length - 1) % segs.length, outOf = k;
    const back = unit(sub({ x: 0, y: 0 }, endDir(segs[into]))), on = startDir(segs[outOf]);
    const th = Math.acos(Math.max(-1, Math.min(1, back.x * on.x + back.y * on.y)));   // angle between the two sides
    if (th > Math.PI - 0.03 || th < 1e-3) continue;           // runs straight through: not a corner
    const cut = Math.min(r / Math.tan(th / 2), ls[into][SAMPLES] / 2, ls[outOf][SAMPLES] / 2);
    trimEnd[into] = cut; trimStart[outOf] = cut;
    corners[k] = { into, outOf, rr: cut * Math.tan(th / 2), th };
  }
  const pieces: Cubic[] = segs.map((cu, i) => part(cu, tAt(ls[i], trimStart[i]), tAt(ls[i], ls[i][SAMPLES] - trimEnd[i])));
  const out: Cubic[] = [];
  const fillet = (k: number) => {
    const c = corners[k];
    if (!c) return;
    const a = pieces[c.into][3], b = pieces[c.outOf][0];
    if (style === 'bevel') { out.push([a, a, b, b]); return; }
    if (style === 'inverse') {
      // an arc round the old corner point, biting in
      const v = segs[c.into][3], va = sub(a, v), vb = sub(b, v), cut = len(va);
      const perp = (p: V, q: V) => { const u = unit(p), k = q.x * u.x + q.y * u.y; return unit(sub(q, { x: u.x * k, y: u.y * k })); };
      const h = (4 / 3) * Math.tan(c.th / 4) * cut;
      out.push([a, add(a, perp(va, vb), h), add(b, perp(vb, va), h), b]);
      return;
    }
    const h = (4 / 3) * Math.tan((Math.PI - c.th) / 4) * c.rr;   // a circular arc's handle length
    out.push([a, add(a, endDir(pieces[c.into]), h), add(b, startDir(pieces[c.outOf]), -h), b]);
  };
  pieces.forEach((pc, i) => { if (i > 0) fillet(i); out.push(pc); });
  if (isClosed) fillet(0);
  const P = (v: V) => `${f3(v.x)} ${f3(v.y)}`;
  return `M ${P(out[0][0])} ` + out.map(([, c1, c2, p3]) => `C ${P(c1)} ${P(c2)} ${P(p3)}`).join(' ') + (isClosed ? ' Z' : '');
};
