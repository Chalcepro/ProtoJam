import type { AutoLayoutSettings } from '../types/components';

// Reading an auto layout off things as they already stand, the way Figma
// does when you add one: which way they run (a row, a column, or a grid), the
// gaps between them, how they line up across, and - inside a frame - the
// padding round them. So adding auto layout moves nothing.

export type Box = { x: number; y: number; w: number; h: number };
export type Inferred = Pick<AutoLayoutSettings, 'direction' | 'gap' | 'align' | 'alignCross' | 'wrap' | 'columns' | 'rowGap'> & {
  order: number[];          // the boxes' indexes in flow order
};

const TOL = 2;
const avg = (v: number[]) => (v.length ? Math.max(0, Math.round(v.reduce((a, b) => a + b, 0) / v.length)) : 0);
const level = (v: number[]) => Math.max(...v) - Math.min(...v) <= TOL;

// how they line up across the flow: by their starts, middles or ends
const lineUp = (lo: number[], hi: number[]): 'start' | 'center' | 'end' =>
  level(lo) ? 'start' : level(lo.map((l, i) => (l + hi[i]) / 2)) ? 'center' : level(hi) ? 'end' : 'start';

// Boxes in bands along an axis: those whose spans overlap share a band
// (a row, for y). Bands in order, each its boxes' indexes.
const bands = (boxes: Box[], axis: 'x' | 'y'): number[][] => {
  const start = (b: Box) => (axis === 'y' ? b.y : b.x), size = (b: Box) => (axis === 'y' ? b.h : b.w);
  const idx = boxes.map((_, i) => i).sort((a, b) => start(boxes[a]) - start(boxes[b]));
  const out: number[][] = [];
  let end = -Infinity;
  for (const i of idx) {
    const b = boxes[i];
    if (!out.length || start(b) >= end - TOL) { out.push([i]); end = start(b) + size(b); }
    else { out[out.length - 1].push(i); end = Math.max(end, start(b) + size(b)); }
  }
  return out;
};

export const inferLayout = (boxes: Box[]): Inferred => {
  const all = boxes.map((_, i) => i);
  if (boxes.length < 2) return { direction: 'vertical', gap: 0, align: 'start', alignCross: 'start', order: all };
  const rows = bands(boxes, 'y'), cols = bands(boxes, 'x');
  const byX = (ids: number[]) => [...ids].sort((a, b) => boxes[a].x - boxes[b].x);
  const byY = (ids: number[]) => [...ids].sort((a, b) => boxes[a].y - boxes[b].y);
  const gapsAlong = (ids: number[], axis: 'x' | 'y') => ids.slice(1).map((id, k) => {
    const p = boxes[ids[k]], c = boxes[id];
    return axis === 'x' ? c.x - (p.x + p.w) : c.y - (p.y + p.h);
  });

  if (rows.length === 1) {
    const order = byX(all);
    return { direction: 'horizontal', gap: avg(gapsAlong(order, 'x')), align: 'start', order,
             alignCross: lineUp(order.map(i => boxes[i].y), order.map(i => boxes[i].y + boxes[i].h)) };
  }
  if (cols.length === 1) {
    const order = byY(all);
    return { direction: 'vertical', gap: avg(gapsAlong(order, 'y')), align: 'start', order,
             alignCross: lineUp(order.map(i => boxes[i].x), order.map(i => boxes[i].x + boxes[i].w)) };
  }
  // a grid: two or more rows of the same count
  if (rows.every(r => r.length === rows[0].length) && rows[0].length >= 2) {
    const sorted = rows.map(byX);
    const order = sorted.flat();
    const rowGaps = sorted.slice(1).map((r, k) =>
      Math.min(...r.map(i => boxes[i].y)) - Math.max(...sorted[k].map(i => boxes[i].y + boxes[i].h)));
    return { direction: 'grid', columns: rows[0].length, gap: avg(sorted.flatMap(r => gapsAlong(r, 'x'))),
             rowGap: avg(rowGaps), align: 'start', alignCross: 'start', order };
  }
  // ragged rows: a row that wraps
  const order = rows.map(byX).flat();
  return { direction: 'horizontal', wrap: true, gap: avg(rows.flatMap(r => gapsAlong(byX(r), 'x'))), align: 'start', alignCross: 'start', order };
};

// The room left round boxes inside a w x h frame (boxes in its own 0,0 space).
export const paddingAround = (boxes: Box[], w: number, h: number) => {
  if (!boxes.length) return { top: 0, right: 0, bottom: 0, left: 0 };
  const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
  const x1 = Math.max(...boxes.map(b => b.x + b.w)), y1 = Math.max(...boxes.map(b => b.y + b.h));
  const r = (v: number) => Math.max(0, Math.round(v));
  return { top: r(y0), left: r(x0), right: r(w - x1), bottom: r(h - y1) };
};

// Is a sits wholly over b (the shape behind is "b")?
export const inside = (a: Box, b: Box) =>
  a.x >= b.x - TOL && a.y >= b.y - TOL && a.x + a.w <= b.x + b.w + TOL && a.y + a.h <= b.y + b.h + TOL;
