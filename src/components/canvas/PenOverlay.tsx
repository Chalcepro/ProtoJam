import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { VectorPoint } from '../../types/components';
import { regionAt, vectorPaths, vectorRegions } from '../../lib/boolean';
import { insertPoint, segmentAt } from '../../lib/vectorEdit';

const ACCENT = '#ff6b4a';
const SNAP = '#3ddc97';     // a handle that just snapped into line / length
const HIT = 8;   // px on screen

// The pen, as in Figma. Laid over the canvas only (the toolbar and panels sit
// above it, so their clicks never land as points).
//   Pen:  click = corner point, click-drag = curve, click the first point =
//         close, Shift = 45 degree steps.
//   Edit: drag points (Shift-click picks several), click a line to add a
//         point there, drag curve handles. The two handles stay in line (lengths
//         free); Alt-drag moves one alone; a broken pair snaps back into line
//         within 3 degrees, and lengths snap equal within 4px (shown green).
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
  const drag = useRef<{ kind: 'new' | 'point' | 'in' | 'out'; id: string; ox: number; oy: number; alt: boolean; linked?: boolean;
                       // moving points: where each selected one started
                       orig?: Map<string, { x: number; y: number }> } | null>(null);
  // what the last handle move snapped to, so the handles can show it
  const [snapped, setSnapped] = useState(false);
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

    if (vectorTool === 'pen') {
      // closing a shape finishes it; the pen carries on with a new one in the
      // same vector (Enter / Esc when done)
      if (points.length > 2 && !vd?.isClosed && near(w, points[0])) { closeVectorPath(); return; }
      const p = snap(w, e.shiftKey);
      addVectorPoint(p.x, p.y);
      const id = useProjectStore.getState().selectedVectorPointIds[0];
      drag.current = { kind: 'new', id, ox: p.x, oy: p.y, alt: false };
      return;
    }

    const hit = pointAt(w);
    if (!hit) {
      if (vectorTool !== 'select' || !vd) return;
      // on a line: a new point there (the curve keeps its shape), ready to drag
      const seg = segmentAt(vd, w.x, w.y, HIT / z);
      if (!seg) { useProjectStore.setState({ selectedVectorPointIds: [] }); return; }
      const r = insertPoint(vd, seg.path, seg.seg, seg.t);
      useProjectStore.getState().setVectorData(r.vd);
      setSelected(r.id);
      const np = vectorPaths(r.vd).flatMap(p => p.points).find(p => p.id === r.id)!;
      drag.current = { kind: 'point', id: r.id, ox: w.x, oy: w.y, alt: false, orig: new Map([[r.id, { x: np.x, y: np.y }]]) };
      return;
    }
    // Shift-click adds a point to the selection (or takes it out)
    if (e.shiftKey && vectorTool === 'select') {
      const cur = useProjectStore.getState().selectedVectorPointIds;
      useProjectStore.setState({ selectedVectorPointIds: cur.includes(hit.id) ? cur.filter(i => i !== hit.id) : [...cur, hit.id] });
      return;
    }
    if (!selectedVectorPointIds.includes(hit.id)) setSelected(hit.id);
    if (vectorTool === 'bend') {
      if (hit.handleIn || hit.handleOut) updateVectorPoint(hit.id, { handleIn: undefined, handleOut: undefined, isCorner: true });
      else {
        // smooth: handles along the line from the previous to the next point
        const path = paths.find(p => p.points.includes(hit))!;
        const pts = path.points, i = pts.indexOf(hit);
        const prev = pts[i - 1] || (path.isClosed ? pts[pts.length - 1] : hit);
        const next = pts[i + 1] || (path.isClosed ? pts[0] : hit);
        const dx = (next.x - prev.x) / 6, dy = (next.y - prev.y) / 6;
        updateVectorPoint(hit.id, { handleIn: { x: -dx, y: -dy }, handleOut: { x: dx, y: dy }, isCorner: false });
      }
      return;
    }
    // every selected point moves together
    const ids = selectedVectorPointIds.includes(hit.id) ? selectedVectorPointIds : [hit.id];
    drag.current = { kind: 'point', id: hit.id, ox: w.x, oy: w.y, alt: false,
                     orig: new Map(allPoints.filter(p => ids.includes(p.id)).map(p => [p.id, { x: p.x, y: p.y }])) };
  };

  const move = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    setCursor(snap(w, e.shiftKey && vectorTool === 'pen' && !drag.current));
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'point') {
      d.orig?.forEach((o, id) => updateVectorPoint(id, { x: Math.round(o.x + w.x - d.ox), y: Math.round(o.y + w.y - d.oy) }));
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

  const up = () => { drag.current = null; setSnapped(false); };

  // keys while the pen is out; caught first so Delete does not delete the path
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || e.ctrlKey || e.metaKey) return;
      const s = useProjectStore.getState();
      const k = e.key.toLowerCase();
      let handled = true;
      if (e.key === 'Enter' || e.key === 'Escape') s.finishVectorEditing();
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
      style={{ cursor: vectorTool === 'pen' ? (closing ? 'pointer' : 'crosshair') : vectorTool === 'bucket' ? 'cell' : 'default' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={() => setCursor(null)}
      onMouseDown={(e) => { if (e.button === 0 && !spaceDown.current) e.stopPropagation(); }}
      onDoubleClick={(e) => { e.stopPropagation(); if (vectorTool === 'pen' && (points.length > 1 || paths.length)) finishVectorEditing(); }}
      onContextMenu={(e) => e.preventDefault()}
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
