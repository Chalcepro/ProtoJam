import type { ElementStyle } from '../types/components';

// The corners of any straight-sided shape - a box, a polygon, a star - as one
// outline: rounded (with Figma's corner smoothing), or, experimental, scooped
// inward (inverse: a circle centred on the corner bites it out) or cut
// straight (bevel). Drawing, booleans, clipping and flatten all read a
// shape's outline from here, so they always agree.

type Pt = [number, number];
export type CornerStyle = NonNullable<ElementStyle['cornerStyle']>;

// Triangles and stars made before Count existed keep their old outline
// (a 0-100 box); setting Count makes a regular one that fills the box.
const LEGACY: Record<'polygon' | 'star', Pt[]> = {
  polygon: [[50, 5], [95, 95], [5, 95]],
  star: [[50, 5], [64, 36], [98, 38], [72, 60], [80, 94], [50, 75], [20, 94], [28, 60], [2, 38], [36, 36]]
};

// A shape's corner points in a w x h box, clockwise from the top.
export const shapePoints = (type: string, s: ElementStyle, w: number, h: number): Pt[] => {
  if (type !== 'polygon' && type !== 'star') return [[0, 0], [w, 0], [w, h], [0, h]];
  const n = s.pointCount;
  if (!n) return LEGACY[type].map(([x, y]) => [x / 100 * w, y / 100 * h]);
  const star = type === 'star', k = star ? n * 2 : n, ratio = s.starRatio ?? 0.382;
  const raw = Array.from({ length: k }, (_, i): Pt => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / k, r = star && i % 2 ? ratio : 1;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  // stretched to fill the box, as Figma does
  const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), sw = Math.max(...xs) - x0 || 1, sh = Math.max(...ys) - y0 || 1;
  return raw.map(([x, y]) => [(x - x0) / sw * w, (y - y0) / sh * h]);
};

// The radius at each corner point: a box can have one per corner; other
// shapes take one for all.
export const pointRadii = (type: string, s: ElementStyle, n: number): number[] => {
  const r = s.borderRadius;
  if (typeof r === 'object' && r) return type === 'polygon' || type === 'star' ? Array(n).fill(r.tl) : [r.tl, r.tr, r.br, r.bl];
  return Array(n).fill(Number(r) || 0);
};

// The style at each corner point: per corner when set (boxes), else one for all.
export const pointStyles = (s: ElementStyle, n: number): CornerStyle[] => {
  const c = s.cornerStyles, all = s.cornerStyle ?? 'round';
  return c && n === 4 ? [c.tl ?? all, c.tr ?? all, c.br ?? all, c.bl ?? all] : Array(n).fill(all);
};

const f = (v: number) => Math.round(v * 1000) / 1000;
const KAPPA = 0.5523;          // a cubic's handle length for a quarter circle / ellipse

// The outline through `pts` with each corner shaped, offset by (ox, oy).
// smooth (0-1) stretches a round corner along its sides with the same depth,
// so the curve eases in (Figma's corner smoothing, iOS's squircle); on a
// flare it makes the ramp longer.
// A flare grows OUTSIDE the box: one side carries on past the corner by r
// (the tip) and the other side ramps up into it - the box itself, its W and H,
// stay as they are. flareIn[i]: the side carried on is the one coming into
// corner i (else the one leaving it).
export const cornerD = (pts: Pt[], radii: number[], styles: CornerStyle[], smooth = 0, ox = 0, oy = 0, flareIn?: boolean[]): string => {
  const n = pts.length;
  if (n < 3) return '';
  const out: string[] = [];
  const P = (p: Pt) => `${f(p[0] + ox)} ${f(p[1] + oy)}`;
  for (let i = 0; i < n; i++) {
    const v = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - v[0], a[1] - v[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const r = Math.max(0, radii[i] || 0), style = styles[i] || 'round';
    if (!r || !la || !lb) { out.push(`${i ? 'L' : 'M'} ${P(v)}`); continue; }
    const ua: Pt = [(a[0] - v[0]) / la, (a[1] - v[1]) / la], ub: Pt = [(b[0] - v[0]) / lb, (b[1] - v[1]) / lb];
    const th = Math.acos(Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1])));   // angle between the sides
    // which way the outline turns here (screen y is down): clockwise = 1
    const cw = (v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]) > 0 ? 1 : 0;
    // a corner may use up to half of each side next to it
    const max = Math.min(la, lb) / 2;
    const at = (t: number): [Pt, Pt] => [[v[0] + ua[0] * t, v[1] + ua[1] * t], [v[0] + ub[0] * t, v[1] + ub[1] * t]];
    const go = (p: Pt) => `${i ? 'L' : 'M'} ${P(p)}`;

    if (style === 'flare') {
      const inward = flareIn ? flareIn[i] : true;
      // e: out along the side that carries on; w: along the side that ramps up
      const e: Pt = inward ? [-ua[0], -ua[1]] : [-ub[0], -ub[1]], w = inward ? ub : ua;
      const len = Math.min(r * (1 + smooth), (inward ? lb : la) / 2);
      const T: Pt = [v[0] + e[0] * r, v[1] + e[1] * r], E: Pt = [v[0] + w[0] * len, v[1] + w[1] * len];
      const cT: Pt = [T[0] - e[0] * r * KAPPA, T[1] - e[1] * r * KAPPA], cE: Pt = [E[0] - w[0] * len * KAPPA, E[1] - w[1] * len * KAPPA];
      out.push(...(inward ? [go(T), `C ${P(cT)} ${P(cE)} ${P(E)}`] : [go(E), `C ${P(cE)} ${P(cT)} ${P(T)}`]));
      continue;
    }
    if (style === 'inverse' || style === 'bevel') {
      // r is how far along each side the corner is taken out
      const t = Math.min(r, max), [A, B] = at(t);
      out.push(go(A), style === 'bevel' ? `L ${P(B)}` : `A ${f(t)} ${f(t)} 0 0 ${1 - cw} ${P(B)}`);
      continue;
    }
    // round: the circle of radius r touching both sides, t along each from the corner
    const tan = Math.tan(th / 2);
    let t = r / tan, rr = r;
    if (t > max) { t = max; rr = t * tan; }
    if (!smooth) {
      const [A, B] = at(t);
      out.push(go(A), `A ${f(rr)} ${f(rr)} 0 0 ${cw} ${P(B)}`);
      continue;
    }
    // smoothed: start further out, one curve as deep as the circle's at the middle
    const ts = Math.min(t * (1 + smooth), max);
    const depth = rr / Math.sin(th / 2) - rr;                      // corner to the circle's middle
    const k = Math.max(0, Math.min(1, (4 - (4 * depth) / (Math.cos(th / 2) * ts)) / 3));
    const [A, B] = at(ts), [C1, C2] = at(ts * (1 - k));
    out.push(go(A), `C ${P(C1)} ${P(C2)} ${P(B)}`);
  }
  return out.join(' ') + ' Z';
};

// A box whose corners CSS cannot draw (scooped, cut, flared, smoothed) is
// drawn by its outline instead.
export const needsOutline = (s: ElementStyle) => {
  const r = s.borderRadius;
  const any = typeof r === 'object' && r ? r.tl || r.tr || r.br || r.bl : Number(r) || 0;
  return !!any && (pointStyles(s, 4).some(x => x !== 'round') || !!s.cornerSmoothing);
};

// A box's corners, clockwise from top-left: which side a flare carries on.
// Vertical: the left / right walls rise past the top and bottom (ears);
// horizontal: the top / bottom edges run out past the sides (a tab's feet).
const BOX_FLARE_IN = { vertical: [true, false, true, false], horizontal: [false, true, false, true] };

// A shape's outline in a w x h box at (x, y).
export const cornerShapeD = (type: string, s: ElementStyle, x: number, y: number, w: number, h: number) => {
  const pts = shapePoints(type, s, w, h);
  return cornerD(pts, pointRadii(type, s, pts.length), pointStyles(s, pts.length), s.cornerSmoothing ?? 0, x, y,
    pts.length === 4 && type !== 'polygon' ? BOX_FLARE_IN[s.flareAxis ?? 'vertical'] : undefined);
};
