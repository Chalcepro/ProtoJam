import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { VectorPoint } from '../../types/components';
import { closedPathAt, regionAt, vectorPaths, vectorRegions } from '../../lib/boolean';
import { continueFrom, deleteSegment, isEndPoint, joinPoints, insertPoint, segmentPoint, segmentAt, segmentD, segmentMid, segmentsOf } from '../../lib/vectorEdit';

type Grip = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type Xform = {
  kind: 'scale' | 'rotate';
  grip?: Grip;                     // a box handle; none = S / R with the mouse
  modal: boolean;                  // S / R: runs until a click, Enter or Esc
  axis?: 'x' | 'y';
  start: { x: number; y: number };
  box: { x0: number; y0: number; x1: number; y1: number };
  pivot: { x: number; y: number } | null;     // one point alone: itself
  orig: Map<string, { x: number; y: number; hi?: { x: number; y: number }; ho?: { x: number; y: number } }>;
};
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>')}") 10 10, alias`;
const GRIP_CURSOR: Record<Grip | 'rotate', string> = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  rotate: ROTATE_CURSOR
};
const ACCENT = '#ff6b4a';
const SNAP = '#3ddc97';     // a handle that just snapped into line / length
const HIT = 8;   // px on screen

// The pen, as in Figma. Laid over the canvas only (the toolbar and panels sit
// above it, so their clicks never land as points).
//   Pen:  click = corner point, click-drag = curve, click the first point =
//         close, Shift = 45 degree steps.
//   Edit: click a point to pick and move it, Shift-click or drag a box for
//         several. Ctrl-click a point: sharp <-> smooth; Ctrl-drag: pull out
//         its curve. The dot mid-line adds a point; click a line to pick it,
//         Delete takes it out (the path splits there). Drag a line to move
//         it; drag inside a closed shape to move the shape (or its picked part). The two handles stay in line (lengths
//         free); Alt-drag moves one alone; a broken pair snaps back into line
//         within 3 degrees, and lengths snap equal within 4px (shown green).
//         Two or more points picked (or one with handles): a box round them -
//         drag a side or corner to scale (Shift: evenly, Alt: from the middle),
//         just outside a corner to rotate (Shift: 15 degree steps). As in
//         Blender, S scales and R rotates with the mouse, X / Y keep it to one
//         axis, click or Enter keeps it, Esc or right-click puts it back. One
//         point alone turns and stretches its handles round itself.
//   Bend: click a point to switch it between sharp and smooth.
//   Bucket: click a region where closed shapes overlap to fill it (again to empty).
//   Enter / Esc: done.  Backspace / Delete: remove the selected point.
//   P / V / B: pen / edit / bucket.
export const PenOverlay: React.FC<{ toWorld: (cx: number, cy: number) => { x: number; y: number }; spaceDown: React.MutableRefObject<boolean> }> = ({ toWorld, spaceDown }) => {
  const { elements, editingVectorId, vectorTool, viewport, selectedVectorPointIds,
          addVectorPoint, updateVectorPoint, closeVectorPath, finishVectorEditing } =
    useProjectStore(useShallow((s) => ({ elements: s.elements, editingVectorId: s.editingVectorId, vectorTool: s.vectorTool, viewport: s.viewport, selectedVectorPointIds: s.selectedVectorPointIds, addVectorPoint: s.addVectorPoint, updateVectorPoint: s.updateVectorPoint, closeVectorPath: s.closeVectorPath, finishVectorEditing: s.finishVectorEditing })));
  const vd = elements.find(e => e.id === editingVectorId)?.style.vectorData;
  const points = vd?.points || [];          // the path being drawn
  const paths = vd ? vectorPaths(vd) : [];   // every path, finished ones too
  const allPoints = paths.flatMap(p => p.points);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ kind: 'new' | 'point' | 'in' | 'out' | 'pull'; id: string; ox: number; oy: number; alt: boolean; linked?: boolean;
                       // moving points: where each selected one started
                       orig?: Map<string, { x: number; y: number }> } | null>(null);
  // what the last handle move snapped to, so the handles can show it
  const [snapped, setSnapped] = useState(false);
  // a line picked in Edit (to delete), named by its two end points
  const [segSel, setSegSel] = useState<{ a: string; b: string } | null>(null);
  // box select of points, canvas units
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(null);
  const segs = vd && vectorTool === 'select' ? segmentsOf(vd) : [];
  // The pen snaps to a point near the pointer (a bit wider than a click), or
  // else onto a line; the target is ringed so it is plain what a click does.
  const penSnap = (w: { x: number; y: number }): { x: number; y: number; point?: VectorPoint } | null => {
    if (vectorTool !== 'pen' || !vd) return null;
    const near2 = allPoints.filter(p => p !== points[points.length - 1]).map(p => ({ p, d: Math.hypot(p.x - w.x, p.y - w.y) * z }))
      .filter(c => c.d <= HIT * 1.6).sort((a, b) => a.d - b.d)[0];
    if (near2) return { x: near2.p.x, y: near2.p.y, point: near2.p };
    const on = segmentAt(vd, w.x, w.y, (HIT * 1.2) / z);
    if (on) {
      const sg = segsOfPath(on.path)[on.seg];
      if (sg) { const m = segmentPoint(sg, on.t); return { x: Math.round(m.x), y: Math.round(m.y) }; }
    }
    return null;
  };
  // the pen lines up with other points across / down (guides shown)
  const penAlign = (w: { x: number; y: number }) => {
    const thr = 6 / z, g: { x?: number; y?: number } = {};
    const nx = allPoints.map(p => p.x).sort((a, b) => Math.abs(a - w.x) - Math.abs(b - w.x))[0];
    const ny = allPoints.map(p => p.y).sort((a, b) => Math.abs(a - w.y) - Math.abs(b - w.y))[0];
    let { x, y } = w;
    if (nx !== undefined && Math.abs(nx - w.x) <= thr) { x = nx; g.x = nx; }
    if (ny !== undefined && Math.abs(ny - w.y) <= thr) { y = ny; g.y = ny; }
    return { x, y, g };
  };
  // alignment guides while moving points (canvas units): a line at x / at y
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  // Points sitting on the very same spot are one point to the eye (where
  // lines were joined): they move together.
  const welded = (ids: string[]) => {
    const pick = allPoints.filter(p => ids.includes(p.id));
    return Array.from(new Set([...ids, ...allPoints.filter(q => pick.some(p => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01)).map(q => q.id)]));
  };
  // scaling / rotating the picked points (box handles, or S / R as in Blender)
  const xf = useRef<Xform | null>(null);
  const lastW = useRef<{ x: number; y: number } | null>(null);
  const [gripCursor, setGripCursor] = useState<string | null>(null);
  const [penTarget, setPenTarget] = useState<{ x: number; y: number; point?: VectorPoint } | null>(null);
  // Edit: what the pointer is over, for the cursor (a line or a shape can be dragged)
  const [overMovable, setOverMovable] = useState(false);
  const z = viewport.zoom;
  const sx = (x: number) => x * z + viewport.x, sy = (y: number) => y * z + viewport.y;
  const selected = allPoints.find(p => p.id === selectedVectorPointIds[0]);

  const near = (w: { x: number; y: number }, p: { x: number; y: number }) => Math.hypot(w.x - p.x, w.y - p.y) * z <= HIT;
  const pointAt = (w: { x: number; y: number }) => allPoints.find(p => near(w, p));
  const setSelected = (id: string) => useProjectStore.setState({ selectedVectorPointIds: [id] });

  // Shift: the new point lies at a 45-degree step from the last one
  const snap = (w: { x: number; y: number }, shift: boolean) => {
    const last = points[points.length - 1];
    if (!shift || !last) return w;
    const dx = w.x - last.x, dy = w.y - last.y, len = Math.hypot(dx, dy);
    const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    return { x: last.x + Math.cos(a) * len, y: last.y + Math.sin(a) * len };
  };

  const down = (e: React.PointerEvent) => {
    // S / R running: a click keeps it, a right-click puts it back
    if (xf.current?.modal) {
      e.stopPropagation();
      if (e.button === 2) cancelXform(); else xf.current = null;
      return;
    }
    // middle button / space pans: leave it to the canvas
    if (e.button !== 0 || spaceDown.current) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);

    if (vectorTool === 'bucket') {
      // fill the region under the pointer with the bucket colour; again to empty it
      if (!vd) return;
      const key = regionAt(vectorRegions(vd), w.x, w.y);
      if (!key) return;
      const st = useProjectStore.getState();
      st.setVectorRegion(key, vd.regions?.[key] === st.vectorBucketColor ? null : st.vectorBucketColor);
      return;
    }

    // the selected point's handles first - in the pen too, for the last point
    const grabHandle = () => {
      if (!selected) return false;
      for (const kind of ['in', 'out'] as const) {
        const h = kind === 'in' ? selected.handleIn : selected.handleOut;
        if (h && near(w, { x: selected.x + h.x, y: selected.y + h.y })) {
          drag.current = { kind, id: selected.id, ox: selected.x, oy: selected.y, alt: e.altKey, linked: collinear(selected) };
          return true;
        }
      }
      return false;
    };
    if (grabHandle()) return;
    // the box round the picked points: a side / corner scales, outside a corner turns
    if (vectorTool === 'select') {
      const g = xfGrip(w);
      if (g) { startXform(g === 'rotate' ? 'rotate' : 'scale', w, false, g === 'rotate' ? undefined : g); return; }
    }

    if (vectorTool === 'pen') {
      // closing a shape finishes it; the pen carries on with a new one in the
      // same vector (Enter / Esc when done)
      if (points.length > 2 && !vd?.isClosed && near(w, points[0])) { closeVectorPath(); return; }
      const tgt = penSnap(w);
      // on the free end of a line: carry on from it - or, mid-line, join the
      // line being drawn to it (that line is then done)
      if (tgt?.point && vd && isEndPoint(vd, tgt.point.id) && !points.includes(tgt.point)) {
        if (!points.length) { useProjectStore.getState().setVectorData(continueFrom(vd, tgt.point.id)); setSelected(tgt.point.id); return; }
        const j = joinPoints(vd, points[points.length - 1].id, tgt.point.id);
        if (j) {
          // the joined line is finished; the next click starts a new one
          const merged = { points: j.points, isClosed: j.isClosed };
          useProjectStore.getState().setVectorData({ ...j, subpaths: [...(j.subpaths || []), merged], points: [], isClosed: false });
          useProjectStore.setState({ selectedVectorPointIds: [] });
          return;
        }
      }
      const p = tgt ? { x: tgt.x, y: tgt.y } : e.shiftKey ? snap(w, true) : (e.ctrlKey || e.metaKey) ? w : penAlign(w);
      addVectorPoint(p.x, p.y);
      const id = useProjectStore.getState().selectedVectorPointIds[0];
      drag.current = { kind: 'new', id, ox: p.x, oy: p.y, alt: false };
      return;
    }

    const hit = pointAt(w);
    if (!hit) {
      if (vectorTool !== 'select' || !vd) return;
      // the dot at the middle of a line: a new point there, ready to drag
      const midSeg = segs.find(sg => near(w, segmentMid(sg)));
      if (midSeg) {
        const at = segmentAt(vd, segmentMid(midSeg).x, segmentMid(midSeg).y, 0.5);
        if (at) {
          const r = insertPoint(vd, at.path, at.seg, 0.5);
          useProjectStore.getState().setVectorData(r.vd);
          setSelected(r.id); setSegSel(null);
          const np = vectorPaths(r.vd).flatMap(p => p.points).find(p => p.id === r.id)!;
          drag.current = { kind: 'point', id: r.id, ox: w.x, oy: w.y, alt: false, orig: new Map([[r.id, { x: np.x, y: np.y }]]) };
        }
        return;
      }
      // elsewhere on a line: pick that line (Delete takes it out) - and drag
      // it: its two ends move, with the other picked points when it lies
      // between picked ones
      const on = segmentAt(vd, w.x, w.y, HIT / z);
      if (on) {
        const sg = segsOfPath(on.path)[on.seg];
        if (sg) {
          setSegSel({ a: sg.a.id, b: sg.b.id });
          const both = selectedVectorPointIds.includes(sg.a.id) && selectedVectorPointIds.includes(sg.b.id);
          const ids = both ? selectedVectorPointIds : [sg.a.id, sg.b.id];
          if (!both) useProjectStore.setState({ selectedVectorPointIds: [] });
          dragPoints(ids, w);
        }
        return;
      }
      // inside a closed shape: drag the shape - or, when two or more of its
      // points are picked, just that part of it
      const inShape = closedPathAt(vd, w.x, w.y);
      if (inShape) {
        setSegSel(null);
        const picked = selectedVectorPointIds.filter(id => inShape.includes(id));
        const ids = picked.length > 1 ? selectedVectorPointIds : inShape;
        useProjectStore.setState({ selectedVectorPointIds: ids });
        dragPoints(ids, w);
        return;
      }
      // empty: a box picks the points inside it (Shift keeps the ones picked)
      setSegSel(null);
      if (!e.shiftKey) useProjectStore.setState({ selectedVectorPointIds: [] });
      setBox({ x0: w.x, y0: w.y, x1: w.x, y1: w.y, add: e.shiftKey });
      return;
    }
    setSegSel(null);
    // Ctrl on a point: the curve tool - click switches sharp / smooth, drag
    // pulls the curve handles out of it
    if ((e.ctrlKey || e.metaKey) && vectorTool === 'select') {
      setSelected(hit.id);
      drag.current = { kind: 'pull', id: hit.id, ox: hit.x, oy: hit.y, alt: false };
      return;
    }
    // Shift-click adds a point to the selection (or takes it out)
    if (e.shiftKey && vectorTool === 'select') {
      const cur = useProjectStore.getState().selectedVectorPointIds;
      useProjectStore.setState({ selectedVectorPointIds: cur.includes(hit.id) ? cur.filter(i => i !== hit.id) : [...cur, hit.id] });
      return;
    }
    if (!selectedVectorPointIds.includes(hit.id)) setSelected(hit.id);
    if (vectorTool === 'bend') { toggleSmooth(hit); return; }
    // every selected point moves together
    const ids = selectedVectorPointIds.includes(hit.id) ? selectedVectorPointIds : [hit.id];
    dragPoints(ids, w);
    if (drag.current) drag.current.id = hit.id;
  };

  // a point between sharp (no handles) and smooth (handles along the line
  // from the point before to the point after)
  const toggleSmooth = (hit: VectorPoint) => {
    if (hit.handleIn || hit.handleOut) { updateVectorPoint(hit.id, { handleIn: undefined, handleOut: undefined, isCorner: true }); return; }
    const path = paths.find(p => p.points.includes(hit))!;
    const pts = path.points, i = pts.indexOf(hit);
    const prev = pts[i - 1] || (path.isClosed ? pts[pts.length - 1] : hit);
    const next = pts[i + 1] || (path.isClosed ? pts[0] : hit);
    const dx = (next.x - prev.x) / 6, dy = (next.y - prev.y) / 6;
    updateVectorPoint(hit.id, { handleIn: { x: -dx, y: -dy }, handleOut: { x: dx, y: dy }, isCorner: false });
  };
  // start moving these points together from the pointer at w
  const dragPoints = (ids: string[], w: { x: number; y: number }) => {
    const all = welded(ids);
    drag.current = { kind: 'point', id: ids[0], ox: w.x, oy: w.y, alt: false,
                     orig: new Map(allPoints.filter(p => all.includes(p.id)).map(p => [p.id, { x: p.x, y: p.y }])) };
  };
  const segsOfPath = (pi: number) => {
    const p = paths[pi];
    if (!p) return [];
    const n = p.points.length;
    return Array.from({ length: p.isClosed ? n : n - 1 }, (_, i) => ({ a: p.points[i], b: p.points[(i + 1) % n] }));
  };

  const move = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    lastW.current = w;
    if (xf.current) { applyXform(w, e.shiftKey, e.altKey); return; }
    const ps = !drag.current ? penSnap(w) : null;
    if (vectorTool === 'pen' && !drag.current && !ps && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
      const a = penAlign(w); setCursor({ x: a.x, y: a.y }); setGuides(a.g);
    } else {
      setCursor(ps ? { x: ps.x, y: ps.y } : snap(w, e.shiftKey && vectorTool === 'pen' && !drag.current));
      if (!drag.current) setGuides({});
    }
    setPenTarget(ps);
    if (box) { setBox({ ...box, x1: w.x, y1: w.y }); return; }
    const d = drag.current;
    if (!d) {
      if (vectorTool === 'select') { const g = xfGrip(w); setGripCursor(g ? GRIP_CURSOR[g] : null); if (g) return; }
      if (vectorTool === 'select' && vd) setOverMovable(!pointAt(w) && (!!segmentAt(vd, w.x, w.y, HIT / z) || !!closedPathAt(vd, w.x, w.y)));
      return;
    }
    if (d.kind === 'pull') {
      // Ctrl-drag from a point: pull its curve handles out, both sides
      const hx = w.x - d.ox, hy = w.y - d.oy;
      if (Math.hypot(hx, hy) * z < 3) return;
      d.alt = true;   // marks it as a drag, not a click
      updateVectorPoint(d.id, { handleOut: { x: hx, y: hy }, handleIn: { x: -hx, y: -hy }, isCorner: false });
      return;
    }
    if (d.kind === 'point') {
      let dx = w.x - d.ox, dy = w.y - d.oy;
      const g: { x?: number; y?: number } = {};
      const lead = d.orig?.get(d.id);
      if (lead && !(e.ctrlKey || e.metaKey)) {
        // line up with any other point, across or down, within 6px (Ctrl: off)
        const others = allPoints.filter(p => !d.orig!.has(p.id));
        const thr = 6 / z;
        const nx = others.map(p => p.x).sort((a, b) => Math.abs(a - (lead.x + dx)) - Math.abs(b - (lead.x + dx)))[0];
        const ny = others.map(p => p.y).sort((a, b) => Math.abs(a - (lead.y + dy)) - Math.abs(b - (lead.y + dy)))[0];
        if (nx !== undefined && Math.abs(nx - (lead.x + dx)) <= thr) { dx = nx - lead.x; g.x = nx; }
        if (ny !== undefined && Math.abs(ny - (lead.y + dy)) <= thr) { dy = ny - lead.y; g.y = ny; }
      }
      setGuides(g);
      d.orig?.forEach((o, id) => updateVectorPoint(id, { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }));
      return;
    }
    const hx = w.x - d.ox, hy = w.y - d.oy;
    if (d.kind === 'new') {
      // dragging out of a new point pulls a smooth curve through it, both
      // sides; with Alt, only the side the line goes on to
      if (Math.hypot(hx, hy) * z < 3) return;
      updateVectorPoint(d.id, e.altKey ? { handleOut: { x: hx, y: hy }, isCorner: false }
                                       : { handleOut: { x: hx, y: hy }, handleIn: { x: -hx, y: -hy }, isCorner: false });
      return;
    }
    // A handle. Alt: this side alone, no snapping. Otherwise the two sides
    // stay in one straight line (each keeping its own length), and a broken
    // pair snaps back into line within 3 degrees; a length within 4px of the
    // other side's snaps to it.
    const pt = allPoints.find(p => p.id === d.id);
    if (!pt) return;
    const mine = d.kind === 'out' ? 'handleOut' : 'handleIn', twin = d.kind === 'out' ? 'handleIn' : 'handleOut';
    const other = pt[twin];
    let h = { x: hx, y: hy };
    let snapHit = false;
    if (!(d.alt || e.altKey) && other) {
      const len = Math.hypot(h.x, h.y), olen = Math.hypot(other.x, other.y);
      const opp = Math.atan2(-other.y, -other.x);
      let ang = Math.atan2(h.y, h.x);
      const diff = Math.abs(((ang - opp + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const inLine = d.linked || diff < (3 * Math.PI) / 180;
      if (inLine && !d.linked) { ang = opp; snapHit = true; }
      let L = len;
      if (Math.abs(len - olen) * z < 4) { L = olen; snapHit = true; }
      h = { x: Math.cos(ang) * L, y: Math.sin(ang) * L };
      if (d.linked || snapHit) {
        const nh = { [mine]: h } as Partial<VectorPoint>;
        // linked: the other side turns with it, its length unchanged
        if (d.linked) nh[twin] = { x: -Math.cos(ang) * olen, y: -Math.sin(ang) * olen };
        updateVectorPoint(d.id, { ...nh, isCorner: false });
        setSnapped(snapHit);
        return;
      }
    }
    setSnapped(false);
    updateVectorPoint(d.id, { [mine]: h });
  };

  // the two handles of a point lie on one straight line
  const collinear = (p: VectorPoint) => {
    if (!p.handleIn || !p.handleOut) return false;
    const a = Math.atan2(p.handleOut.y, p.handleOut.x), b = Math.atan2(-p.handleIn.y, -p.handleIn.x);
    return Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < (0.5 * Math.PI) / 180;
  };

  const up = () => {
    if (xf.current && !xf.current.modal) { xf.current = null; return; }
    const d = drag.current;
    // Ctrl-click without a drag: sharp <-> smooth
    if (d?.kind === 'pull' && !d.alt) { const pt = allPoints.find(p => p.id === d.id); if (pt) toggleSmooth(pt); }
    if (box) {
      const x0 = Math.min(box.x0, box.x1), x1 = Math.max(box.x0, box.x1), y0 = Math.min(box.y0, box.y1), y1 = Math.max(box.y0, box.y1);
      const inside = allPoints.filter(p => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1).map(p => p.id);
      const cur = box.add ? useProjectStore.getState().selectedVectorPointIds : [];
      useProjectStore.setState({ selectedVectorPointIds: Array.from(new Set([...cur, ...inside])) });
      setBox(null);
    }
    drag.current = null; setSnapped(false); setGuides({});
  };

  // ---- scale / rotate the picked points --------------------------------------
  const pickedPts = allPoints.filter(p => selectedVectorPointIds.includes(p.id));
  // one point alone: its handles turn and stretch round it
  const lone = pickedPts.length === 1 && (pickedPts[0].handleIn || pickedPts[0].handleOut) ? pickedPts[0] : null;
  const xfBox = (() => {
    if (vectorTool !== 'select' || (pickedPts.length < 2 && !lone)) return null;
    const xs: number[] = [], ys: number[] = [];
    for (const p of pickedPts) {
      xs.push(p.x); ys.push(p.y);
      if (lone) for (const h of [p.handleIn, p.handleOut]) if (h) { xs.push(p.x + h.x); ys.push(p.y + h.y); }
    }
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  })();
  // the box is drawn a little outside the points, so its handles never sit on one
  const PAD = 10;
  const grips = (b: NonNullable<typeof xfBox>): Record<Grip, { x: number; y: number }> => {
    const p = PAD / z, L = b.x0 - p, R = b.x1 + p, T = b.y0 - p, B = b.y1 + p, cx = (L + R) / 2, cy = (T + B) / 2;
    return { nw: { x: L, y: T }, n: { x: cx, y: T }, ne: { x: R, y: T }, e: { x: R, y: cy }, se: { x: R, y: B }, s: { x: cx, y: B }, sw: { x: L, y: B }, w: { x: L, y: cy } };
  };
  const xfGrip = (w: { x: number; y: number }): Grip | 'rotate' | null => {
    if (!xfBox) return null;
    const g = grips(xfBox);
    for (const k of Object.keys(g) as Grip[]) if (Math.hypot(w.x - g[k].x, w.y - g[k].y) * z <= 6) return k;
    // just outside a corner: turn
    const outside = w.x < g.nw.x || w.x > g.se.x || w.y < g.nw.y || w.y > g.se.y;
    for (const k of ['nw', 'ne', 'se', 'sw'] as const)
      if (outside && Math.hypot(w.x - g[k].x, w.y - g[k].y) * z <= 22) return 'rotate';
    return null;
  };
  const startXform = (kind: 'scale' | 'rotate', w: { x: number; y: number }, modal: boolean, grip?: Grip) => {
    if (!xfBox) return;
    const ids = lone ? [lone.id] : welded(pickedPts.map(p => p.id));
    const orig = new Map(allPoints.filter(p => ids.includes(p.id)).map(p => [p.id, { x: p.x, y: p.y, hi: p.handleIn, ho: p.handleOut }]));
    xf.current = { kind, grip, modal, start: w, box: xfBox, orig, pivot: lone ? { x: lone.x, y: lone.y } : null };
  };
  const cancelXform = () => {
    const x = xf.current;
    if (!x) return;
    x.orig.forEach((o, id) => updateVectorPoint(id, { x: o.x, y: o.y, handleIn: o.hi, handleOut: o.ho }));
    xf.current = null;
  };
  const applyXform = (w: { x: number; y: number }, shift: boolean, alt: boolean) => {
    const x = xf.current;
    if (!x) return;
    const b = x.box, mid = x.pivot || { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    const r2 = (v: number) => Math.round(v * 100) / 100;
    let fx = 1, fy = 1, ang = 0, piv = mid;
    if (x.kind === 'rotate') {
      ang = Math.atan2(w.y - mid.y, w.x - mid.x) - Math.atan2(x.start.y - mid.y, x.start.x - mid.x);
      if (shift) ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
    } else if (!x.grip) {
      // S: by how far the mouse is from the middle, against where it started
      const f = Math.hypot(w.x - mid.x, w.y - mid.y) / (Math.hypot(x.start.x - mid.x, x.start.y - mid.y) || 1);
      fx = x.axis === 'y' ? 1 : f; fy = x.axis === 'x' ? 1 : f;
    } else {
      // a side / corner of the box: the opposite one stays put (Alt, or one point: the middle)
      const g = x.grip, centred = alt || !!x.pivot;
      const ax = centred ? mid.x : g.includes('w') ? b.x1 : b.x0, ay = centred ? mid.y : g.includes('n') ? b.y1 : b.y0;
      const ex = g.includes('w') ? b.x0 : b.x1, ey = g.includes('n') ? b.y0 : b.y1;
      const dx = w.x - x.start.x, dy = w.y - x.start.y;
      // points all in one line across have no height to stretch (and the other way)
      if ((g.includes('e') || g.includes('w')) && Math.abs(ex - ax) > 0.01) fx = (ex + dx - ax) / (ex - ax);
      if ((g.includes('n') || g.includes('s')) && Math.abs(ey - ay) > 0.01) fy = (ey + dy - ay) / (ey - ay);
      if (shift && g.length === 2) { const f = Math.abs(fx) > Math.abs(fy) ? fx : fy; fx = f; fy = f; }
      piv = { x: ax, y: ay };
    }
    const c = Math.cos(ang), sn = Math.sin(ang);
    const tf = (vx: number, vy: number) => ({ x: (vx * c - vy * sn) * fx, y: (vx * sn + vy * c) * fy });
    x.orig.forEach((o, id) => {
      const p = tf(o.x - piv.x, o.y - piv.y), hi = o.hi && tf(o.hi.x, o.hi.y), ho = o.ho && tf(o.ho.x, o.ho.y);
      updateVectorPoint(id, { x: r2(piv.x + p.x), y: r2(piv.y + p.y),
        handleIn: hi ? { x: r2(hi.x), y: r2(hi.y) } : undefined, handleOut: ho ? { x: r2(ho.x), y: r2(ho.y) } : undefined });
    });
  };
  // for the key handler, which is set up once
  const xfApi = useRef({ startXform, cancelXform, applyXform, canXform: !!xfBox });
  xfApi.current = { startXform, cancelXform, applyXform, canXform: !!xfBox };

  const segSelRef = useRef(segSel);
  segSelRef.current = segSel;
  // keys while the pen is out; caught first so Delete does not delete the path
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      const s = useProjectStore.getState();
      // S / R as in Blender, and while one runs: X / Y one axis, Enter keeps, Esc puts back
      const run = xf.current?.modal ? xf.current : null;
      const kk = e.key.toLowerCase();
      if (run) {
        if (e.key === 'Escape') xfApi.current.cancelXform();
        else if (e.key === 'Enter') xf.current = null;
        else if ((kk === 'x' || kk === 'y') && run.kind === 'scale') {
          run.axis = run.axis === kk ? undefined : kk;
          if (lastW.current) xfApi.current.applyXform(lastW.current, e.shiftKey, false);
        } else return;
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if ((kk === 's' || kk === 'r') && !e.ctrlKey && !e.metaKey && !e.altKey && s.vectorTool === 'select' && xfApi.current.canXform && lastW.current) {
        xfApi.current.startXform(kk === 's' ? 'scale' : 'rotate', lastW.current, true);
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      const vdNow = s.elements.find(x => x.id === s.editingVectorId)?.style.vectorData;
      const allNow = vdNow ? vectorPaths(vdNow).flatMap(p => p.points) : [];
      if (e.ctrlKey || e.metaKey) {
        const k2 = e.key.toLowerCase();
        // Ctrl+J: join the two picked end points; Ctrl+A: pick every point
        if (k2 === 'j' && vdNow && s.selectedVectorPointIds.length >= 2) {
          const sel = s.selectedVectorPointIds;
          const j = sel.length === 2 ? joinPoints(vdNow, sel[0], sel[1]) : null;
          if (j) s.setVectorData(j);
          else {
            // not two loose ends: a new line through the picked points, in the
            // order they were picked; its ends sit on them and move with them
            const pts = sel.map(id => allNow.find(p => p.id === id)!).filter(Boolean)
              .map((p, i) => ({ id: `pt-${Date.now()}-j${i}`, x: p.x, y: p.y, isCorner: true }));
            const paths = vectorPaths(vdNow);
            s.setVectorData({ ...vdNow, subpaths: [...paths, { points: pts, isClosed: false }], points: [], isClosed: false });
          }
        } else if (k2 === 'a') {
          useProjectStore.setState({ selectedVectorPointIds: allNow.map(p => p.id), vectorTool: 'select' });
        } else return;     // Ctrl+Z and the rest go on to the app
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      // arrows nudge the picked points: 1px, 10 with Shift
      if (e.key.startsWith('Arrow') && s.selectedVectorPointIds.length) {
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        // points on the same spot as a picked one go with it
        const pick = allNow.filter(p => s.selectedVectorPointIds.includes(p.id));
        allNow.filter(q => pick.some(p => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01))
          .forEach(p => s.updateVectorPoint(p.id, { x: p.x + dx, y: p.y + dy }));
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      const k = e.key.toLowerCase();
      let handled = true;
      if (e.key === 'Enter' || e.key === 'Escape') s.finishVectorEditing();
      else if ((e.key === 'Backspace' || e.key === 'Delete') && segSelRef.current) {
        const vd2 = s.elements.find(x => x.id === s.editingVectorId)?.style.vectorData;
        if (vd2) {
          s.setVectorData(deleteSegment(vd2, segSelRef.current.a, segSelRef.current.b));
          // an opened shape loses its fill; with no stroke its lines would
          // vanish too - give it a stroke in its fill colour so they stay
          const el = s.elements.find(x => x.id === s.editingVectorId)!;
          const stroked = (el.style.strokes || []).some(x => x.visible && x.width > 0) || (!el.style.strokes && (el.style.borderWidth ?? 2) > 0);
          if (!stroked) s.updateElementStyle(el.id, { borderWidth: 2, borderColor: el.style.fillColor && el.style.fillColor !== 'transparent' ? el.style.fillColor : '#ebebec', strokes: undefined });
        }
        setSegSel(null);
      }
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        const pts = s.elements.find(x => x.id === s.editingVectorId)?.style.vectorData?.points || [];
        const ids = s.selectedVectorPointIds.length ? s.selectedVectorPointIds : pts.length ? [pts[pts.length - 1].id] : [];
        ids.forEach(id => s.removeVectorPoint(id));
      }
      else if (k === 'p') s.setVectorTool('pen');
      else if (k === 'v' || k === 'a') s.setVectorTool('select');
      else if (k === 'b' || k === 'f') s.setVectorTool('bucket');
      else handled = false;
      if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);

  const last = points[points.length - 1];
  const closing = vectorTool === 'pen' && cursor && points.length > 2 && !vd?.isClosed && near(cursor, points[0]);
  const handleLines = (p: VectorPoint) => (['handleIn', 'handleOut'] as const).map(k => {
    const h = p[k];
    if (!h) return null;
    return (
      <g key={k}>
        <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(p.x + h.x)} y2={sy(p.y + h.y)} stroke={snapped ? SNAP : ACCENT} strokeWidth={snapped ? 1.5 : 1} />
        <circle cx={sx(p.x + h.x)} cy={sy(p.y + h.y)} r={3.5} fill="rgb(20,20,19)" stroke={snapped ? SNAP : ACCENT} strokeWidth={1.25} />
      </g>
    );
  });

  return (
    <div
      className="absolute inset-0 z-[35]"
      style={{ cursor: vectorTool === 'pen' ? (closing ? 'pointer' : 'crosshair') : vectorTool === 'bucket' ? 'cell' : gripCursor || (overMovable ? 'move' : 'default') }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={() => setCursor(null)}
      onMouseDown={(e) => { if (e.button === 0 && !spaceDown.current) e.stopPropagation(); }}
      onDoubleClick={(e) => { e.stopPropagation(); if (vectorTool === 'pen' && (points.length > 1 || paths.length)) finishVectorEditing(); }}
      onContextMenu={(e) => { e.preventDefault(); if (xf.current?.modal) cancelXform(); }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {/* where the next segment will go */}
        {vectorTool === 'pen' && cursor && last && !vd?.isClosed && !drag.current && (
          <path
            d={last.handleOut
              ? `M ${sx(last.x)} ${sy(last.y)} Q ${sx(last.x + last.handleOut.x)} ${sy(last.y + last.handleOut.y)} ${sx(cursor.x)} ${sy(cursor.y)}`
              : `M ${sx(last.x)} ${sy(last.y)} L ${sx(cursor.x)} ${sy(cursor.y)}`}
            fill="none" stroke={ACCENT} strokeWidth={1} strokeDasharray="4 3" />
        )}
        {/* Edit: a dot at the middle of each line - click it for a new point */}
        {segs.map(sg => {
          const m = segmentMid(sg);
          return <circle key={sg.a.id + sg.b.id} cx={sx(m.x)} cy={sy(m.y)} r={2.5} fill="rgb(20,20,19)" stroke={ACCENT} strokeWidth={1} opacity={0.85} />;
        })}
        {segSel && (() => {
          const sg = segs.find(x => x.a.id === segSel.a && x.b.id === segSel.b);
          return sg ? <path d={segmentD(sg, (x, y) => [sx(x), sy(y)])} fill="none" stroke={ACCENT} strokeWidth={3} /> : null;
        })()}
        {box && (
          <rect x={sx(Math.min(box.x0, box.x1))} y={sy(Math.min(box.y0, box.y1))} width={Math.abs(box.x1 - box.x0) * z} height={Math.abs(box.y1 - box.y0) * z}
                fill="rgba(255,107,74,0.08)" stroke={ACCENT} strokeWidth={1} />
        )}
        {/* alignment guides */}
        {guides.x !== undefined && <line x1={sx(guides.x)} x2={sx(guides.x)} y1={-1e5} y2={1e5} stroke="#ff4fa3" strokeWidth={1} />}
        {guides.y !== undefined && <line y1={sy(guides.y)} y2={sy(guides.y)} x1={-1e5} x2={1e5} stroke="#ff4fa3" strokeWidth={1} />}
        {/* where the pen will land: a point, or onto a line */}
        {vectorTool === 'pen' && penTarget && (
          <circle cx={sx(penTarget.x)} cy={sy(penTarget.y)} r={penTarget.point ? 8 : 5} fill="none" stroke={SNAP} strokeWidth={2} />
        )}
        {/* the scale / rotate box round the picked points */}
        {xfBox && !box && (() => {
          const g = grips(xfBox);
          return (
            <g>
              <rect x={sx(g.nw.x)} y={sy(g.nw.y)} width={(g.se.x - g.nw.x) * z} height={(g.se.y - g.nw.y) * z}
                    fill="none" stroke={ACCENT} strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
              {(Object.keys(g) as Grip[]).map(k => (
                <rect key={k} x={sx(g[k].x) - 3.5} y={sy(g[k].y) - 3.5} width={7} height={7} fill="rgb(235,235,236)" stroke={ACCENT} strokeWidth={1.25} />
              ))}
            </g>
          );
        })()}
        {selected && handleLines(selected)}
        {vectorTool === 'pen' && last && last !== selected && handleLines(last)}
        {allPoints.map((p) => {
          const sel = selectedVectorPointIds.includes(p.id);
          const first = p === points[0] && closing;
          return (
            <rect key={p.id} x={sx(p.x) - (first ? 5 : 4)} y={sy(p.y) - (first ? 5 : 4)}
                  width={first ? 10 : 8} height={first ? 10 : 8} rx={p.isCorner === false ? 5 : 1.5}
                  fill={sel || first ? ACCENT : 'rgb(235,235,236)'} stroke={sel || first ? 'rgb(235,235,236)' : ACCENT} strokeWidth={1.25} />
          );
        })}
      </svg>
      {vectorTool === 'pen' && !points.length && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] text-[rgba(235,235,236,0.7)] bg-[rgba(20,20,19,0.9)] border border-[rgba(235,235,236,0.12)] rounded-lg px-3 py-1.5 pointer-events-none">
          {paths.length
            ? 'Draw another shape in this vector, or Enter / Esc when done. Overlaps make regions the paint bucket can fill.'
            : 'Click to place points, drag for curves. Click the first point to close a shape; Enter or Esc when done.'}
        </div>
      )}
    </div>
  );
};
