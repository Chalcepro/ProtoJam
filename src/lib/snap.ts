import { create } from 'zustand';
import { useProjectStore } from '../store/useProjectStore';
import { absBoxOf, chainOf, inFlow, subtreeIds } from './tree';

// Snapping, shared by moving, resizing and point editing. A moving edge or
// middle snaps, within 6 screen pixels, to the edges and middles of every
// other layer and screen and to ruler guides - and, with Snap to grid on, to
// the ruler's marks (finer as you zoom in). Ctrl held: no snapping (callers).

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type SnapLine = { axis: 'x' | 'y'; at: number; from: number; to: number; gap?: { value: number; mid: number } };
type Target = { at: number; box: Box | null };
export type Hit = { d: number; line: number; box: Box | null; mark?: boolean };

// The pink lines showing what was snapped to (drawn by the canvas).
export const useSnapLines = create<{ lines: SnapLine[] }>(() => ({ lines: [] }));
export const showSnap = (lines: SnapLine[]) => {
  if (lines.length || useSnapLines.getState().lines.length) useSnapLines.setState({ lines });
};

// The rulers' numbered step at a zoom (labels at least ~60px apart), and
// the marks between them: a fifth of it.
export const RULER_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
export const rulerStep = (zoom: number) => RULER_STEPS.find(s => s * zoom >= 60) ?? RULER_STEPS[RULER_STEPS.length - 1];
export const rulerMark = (zoom: number) => rulerStep(zoom) / 5;

// What can be snapped to, in canvas units, leaving out `exclude` and what is inside them.
export const snapTargets = (exclude: string[]): { x: Target[]; y: Target[] } => {
  const { elements, frames, guides } = useProjectStore.getState();
  const skip = new Set(exclude.flatMap(id => subtreeIds(id, elements)));
  // placed by x / y all the way up: its box can be worked out without the page
  const placed = (id: string) => chainOf(id, elements).every(c => !inFlow(c, elements, frames));
  const boxes: Box[] = [
    ...elements.filter(el => !el.hidden && !skip.has(el.id) && placed(el.id)).map(el => {
      const b = absBoxOf(el, elements, frames);
      return { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
    }),
    ...frames.filter(f => !f.hidden && !skip.has(f.id)).map(f => ({ x0: f.x, y0: f.y, x1: f.x + f.width, y1: f.y + f.height }))
  ];
  const along = (axis: 'x' | 'y'): Target[] => [
    ...boxes.flatMap(b => (axis === 'x' ? [b.x0, (b.x0 + b.x1) / 2, b.x1] : [b.y0, (b.y0 + b.y1) / 2, b.y1]).map(at => ({ at, box: b }))),
    ...guides.filter(g => g.axis === axis).map(g => ({ at: g.pos, box: null }))
  ];
  return { x: along('x'), y: along('y') };
};

// The nearest snap for any of `mine` (positions on one axis): a layer or a
// guide first, the ruler's marks only when nothing else is near.
export const snapAxis = (mine: number[], targets: Target[], zoom: number): Hit | null => {
  const thr = 6 / zoom;
  let hit: Hit | null = null;
  for (const t of targets) for (const v of mine) {
    const d = t.at - v;
    if (Math.abs(d) <= thr && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, line: t.at, box: t.box };
  }
  if (hit || useProjectStore.getState().canvasSettings.snapToGrid === false) return hit;
  const m = rulerMark(zoom);
  for (const v of mine) {
    const at = Math.round(v / m) * m, d = at - v;
    if (Math.abs(d) <= thr && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, line: at, box: null, mark: true };
  }
  return hit;
};

// The line to draw for a hit, `s` being the snapped box: from it to what it
// met (with the gap between them), or right across for a guide / ruler mark.
export const snapLine = (axis: 'x' | 'y', hit: Hit, s: Box): SnapLine => {
  const b = hit.box, span = 1e5;
  let gap: SnapLine['gap'];
  const [a0, a1, b0, b1] = axis === 'x' ? [s.y0, s.y1, b?.y0, b?.y1] : [s.x0, s.x1, b?.x0, b?.x1];
  if (b && b0! >= a1) gap = { value: b0! - a1, mid: (b0! + a1) / 2 };
  else if (b && a0 >= b1!) gap = { value: a0 - b1!, mid: (a0 + b1!) / 2 };
  return { axis, at: hit.line, from: b ? Math.min(a0, b0!) : -span, to: b ? Math.max(a1, b1!) : span, gap };
};
