import paper from 'paper/dist/paper-core';
import type { EffectLayer, StrokeLayer, UIElement } from '../types/components';
import { setup, shapeD } from './boolean';
import { paintRgba } from './paint';

// Strokes per side and extruded (solid 3D) shadows. Both are drawn in SVG:
// CSS borders give a box one border per side with no gradient, and a shadow
// with no blur leaves the slanted sides of a 3D block empty.

// Shapes that are drawn as outlines (SvgPaint) rather than boxes: they have
// no sides, so a stroke's sides and radius do not apply to them.
const OUTLINED = new Set(['polygon', 'star', 'vectorPath', 'line', 'arrow', 'connector']);
export const hasSides = (el: UIElement) =>
  !OUTLINED.has(el.type) && el.type !== 'ellipse' && !el.style.frameShape && !el.style.booleanOp;

const allSides = (s: StrokeLayer) => !s.sides || (s.sides.top && s.sides.right && s.sides.bottom && s.sides.left);

// A stroke CSS can draw as a ring (box-shadow / outline). Anything else is
// drawn in SVG by StrokeArt.
export const isPlainStroke = (s: StrokeLayer) =>
  allSides(s) && s.radius === undefined && !s.cap && (!s.paint || s.paint === 'solid');

type Sides = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type Corners = { tl: number; tr: number; br: number; bl: number };

export const cornersOf = (el: UIElement): Corners => {
  const r = el.style.borderRadius;
  if (typeof r === 'object' && r) return r;
  const n = Number(r) || 0;
  return { tl: n, tr: n, br: n, bl: n };
};

// The path of the chosen sides of a w x h box, `inset` in from its edge
// (inside strokes are centred half their weight in, outside ones half out).
// Each side owns its straight part and the half of each rounded corner next
// to it, so two chosen sides meet in a full curve and a lone side tapers
// round its corners the way a CSS border does.
export const sidesD = (w: number, h: number, sides: Sides, radii: Corners, inset: number): string => {
  const L = inset, T = inset, R = w - inset, B = h - inset;
  const cap = Math.max(0, Math.min(R - L, B - T) / 2);
  const rr = (r: number) => (r > 0 ? Math.min(cap, Math.max(0, r - inset)) : 0);
  const r = { tl: rr(radii.tl), tr: rr(radii.tr), br: rr(radii.br), bl: rr(radii.bl) };
  // corner centres; angles in screen space (y down), clockwise = increasing
  const C = {
    tl: [L + r.tl, T + r.tl], tr: [R - r.tr, T + r.tr], br: [R - r.br, B - r.br], bl: [L + r.bl, B - r.bl]
  } as const;
  const at = (k: keyof Corners, deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [C[k][0] + r[k] * Math.cos(a), C[k][1] + r[k] * Math.sin(a)];
  };
  type Seg = { to: [number, number]; arc?: number };
  type Side = { from: [number, number]; segs: Seg[] };
  const order: (keyof Sides)[] = ['top', 'right', 'bottom', 'left'];
  const on = (k: keyof Sides) => sides[k];
  const prev = (k: keyof Sides) => order[(order.indexOf(k) + 3) % 4];
  const next = (k: keyof Sides) => order[(order.indexOf(k) + 1) % 4];

  // one side: half corner before, straight run, half corner after
  const side = (k: keyof Sides): Side => {
    const spec = {
      top: { c0: 'tl', a0: [225, 270], c1: 'tr', a1: [270, 315] },
      right: { c0: 'tr', a0: [315, 360], c1: 'br', a1: [0, 45] },
      bottom: { c0: 'br', a0: [45, 90], c1: 'bl', a1: [90, 135] },
      left: { c0: 'bl', a0: [135, 180], c1: 'tl', a1: [180, 225] }
    }[k] as { c0: keyof Corners; a0: number[]; c1: keyof Corners; a1: number[] };
    let from = at(spec.c0, r[spec.c0] ? spec.a0[0] : spec.a0[1]);
    const segs: Seg[] = [];
    if (r[spec.c0]) segs.push({ to: at(spec.c0, spec.a0[1]), arc: r[spec.c0] });
    let end = at(spec.c1, spec.a1[0]);
    // a sharp corner whose other side is not drawn: run on to the box's edge,
    // as a CSS border does, instead of stopping half a stroke short
    if (!r[spec.c0] && !on(prev(k))) from = stretch(k, from, true);
    if (!r[spec.c1] && !on(next(k))) end = stretch(k, end, false);
    segs.push({ to: end });
    if (r[spec.c1]) segs.push({ to: at(spec.c1, spec.a1[1]), arc: r[spec.c1] });
    return { from, segs };
  };
  const stretch = (k: keyof Sides, p: [number, number], start: boolean): [number, number] => {
    const lo = Math.min(0, inset), hiW = Math.max(w, R), hiH = Math.max(h, B);
    if (k === 'top') return [start ? lo : hiW, p[1]];
    if (k === 'bottom') return [start ? hiW : lo, p[1]];
    if (k === 'right') return [p[0], start ? lo : hiH];
    return [p[0], start ? hiH : lo];
  };

  const f = (n: number) => +n.toFixed(2);
  const draw = (segs: Seg[]) => segs.map(s => s.arc
    ? `A ${f(s.arc)} ${f(s.arc)} 0 0 1 ${f(s.to[0])} ${f(s.to[1])}`
    : `L ${f(s.to[0])} ${f(s.to[1])}`).join(' ');

  if (order.every(on)) {
    const parts = order.map(side);
    return `M ${f(parts[0].from[0])} ${f(parts[0].from[1])} ` + parts.map(p => draw(p.segs)).join(' ') + ' Z';
  }
  // runs of neighbouring sides, each its own open path
  const out: string[] = [];
  for (const k of order) {
    if (!on(k) || on(prev(k))) continue;          // only from the start of a run
    let cur = k;
    const first = side(cur);
    let d = `M ${f(first.from[0])} ${f(first.from[1])} ${draw(first.segs)}`;
    while (on(next(cur)) && next(cur) !== k) { cur = next(cur); d += ' ' + draw(side(cur).segs); }
    out.push(d);
  }
  return out.join(' ');
};

// Where a stroke's line runs: half its weight in for inside, out for outside.
export const strokeInset = (s: StrokeLayer) =>
  s.position === 'inside' ? s.width / 2 : s.position === 'outside' ? -s.width / 2 : 0;

export const dashOf = (s: StrokeLayer) =>
  s.style === 'dashed' ? `${s.width * 3} ${s.width * 2}` : s.style === 'dotted' ? `0 ${s.width * 2}` : undefined;

// --------------------------------------------------------------- extrusion

const mix = (a: string, b: string, t: number) => {
  const pa = paintRgba(a).match(/[\d.]+/g)?.map(Number), pb = paintRgba(b).match(/[\d.]+/g)?.map(Number);
  if (pa?.length !== 4 || pb?.length !== 4) return t < 0.5 ? a : b;      // a named colour: no blend
  const c = pa.map((v, i) => v + (pb[i] - v) * t);
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+c[3].toFixed(3)})`;
};

export type Face = { d: string; color: string };

const cache = new Map<string, { cap: string; faces: Face[] }>();

// The visible faces of a shape (path data) pushed back by (dx, dy): every
// edge facing the push becomes a slanted face from the shape to its copy.
// Curves are flattened first, so a rounded corner shades smoothly from one
// colour to the other.
export const extrudeFaces = (d: string, dx: number, dy: number, color: string, color2?: string) => {
  const key = `${d}|${dx}|${dy}|${color}|${color2}`;
  const hit = cache.get(key);
  if (hit) return hit;
  setup();
  const shape = new paper.CompoundPath(d);
  shape.reorient(true, true);           // outlines clockwise, holes the other way
  shape.flatten(0.5);
  const len = Math.hypot(dx, dy) || 1;
  const faces: (Face & { k: number })[] = [];
  for (const child of shape.children as paper.Path[]) {
    const pts = child.segments.map(sg => sg.point);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey);
      if (el < 1e-6) continue;
      const nx = ey / el, ny = -ex / el;                 // outward, for a clockwise outline
      const facing = (nx * dx + ny * dy) / len;
      if (facing <= 0) continue;
      // sideways faces take color, up / down ones color2
      const t = color2 ? Math.abs(ny) / (Math.abs(nx) + Math.abs(ny)) : 0;
      faces.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${b.x + dx} ${b.y + dy} L ${a.x + dx} ${a.y + dy} Z`,
        color: color2 ? mix(color, color2, t) : color,
        k: (a.x + b.x) * dx + (a.y + b.y) * dy                  // further along the push: drawn later
      });
    }
  }
  faces.sort((p, q) => p.k - q.k);
  shape.translate(new paper.Point(dx, dy));
  const out = { cap: shape.pathData, faces };
  shape.remove();
  if (cache.size > 300) cache.clear();
  cache.set(key, out);
  return out;
};

export const extrusions = (el: UIElement): EffectLayer[] =>
  (el.style.effects || []).filter(e => e.visible && e.type === 'extrude' && ((e.x ?? 0) || (e.y ?? 0)));

// The outline an extrusion pushes back, in the element's own 0,0 space.
export const outlineOf = (el: UIElement) => {
  const s = el.style;
  if (el.type === 'ellipse') return shapeD({ ...el, style: { ...s, x: 0, y: 0 } });
  const c = cornersOf(el), w = Number(s.width) || 0, h = Number(s.height) || 0;
  if (OUTLINED.has(el.type) || s.frameShape || s.booleanOp) return shapeD({ ...el, style: { ...s, x: 0, y: 0 } });
  return sidesD(w, h, { top: true, right: true, bottom: true, left: true }, c, 0);
};

// Text extrudes as stacked one-pixel text shadows (its letters have no
// outline to push), shading from color to color2 with depth.
export const textExtrudeShadows = (fx: EffectLayer[]): string[] => fx.flatMap(e => {
  const x = e.x ?? 0, y = e.y ?? 0, n = Math.min(200, Math.max(1, Math.round(Math.max(Math.abs(x), Math.abs(y)))));
  const c = e.color || '#141413';
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return `${+(x * t).toFixed(2)}px ${+(y * t).toFixed(2)}px 0 ${e.color2 ? mix(c, e.color2, t) : c}`;
  });
});
