import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { VectorPoint } from '../../types/components';
import { regionAt, vectorPaths, vectorRegions } from '../../lib/boolean';

const ACCENT = '#ff6b4a';
const HIT = 8;   // px on screen

// The pen, as in Figma. Laid over the canvas only (the toolbar and panels sit
// above it, so their clicks never land as points).
//   Pen:  click = corner point, click-drag = curve, click the first point =
//         close, Shift = 45 degree steps.
//   Edit: drag points and curve handles; Alt-drag a handle breaks the mirror.
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
  const drag = useRef<{ kind: 'new' | 'point' | 'in' | 'out'; id: string; ox: number; oy: number; alt: boolean } | null>(null);
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

    // handles of the selected point first, then points
    if (selected) {
      for (const kind of ['in', 'out'] as const) {
        const h = kind === 'in' ? selected.handleIn : selected.handleOut;
        if (h && near(w, { x: selected.x + h.x, y: selected.y + h.y })) {
          drag.current = { kind, id: selected.id, ox: selected.x, oy: selected.y, alt: e.altKey };
          return;
        }
      }
    }
    const hit = pointAt(w);
    if (!hit) return;
    setSelected(hit.id);
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
    drag.current = { kind: 'point', id: hit.id, ox: w.x - hit.x, oy: w.y - hit.y, alt: false };
  };

  const move = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    setCursor(snap(w, e.shiftKey && vectorTool === 'pen' && !drag.current));
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'point') {
      updateVectorPoint(d.id, { x: Math.round(w.x - d.ox), y: Math.round(w.y - d.oy) });
      return;
    }
    const hx = w.x - d.ox, hy = w.y - d.oy;
    if (d.kind === 'new') {
      // dragging out of a new point pulls a smooth curve through it
      if (Math.hypot(hx, hy) * z < 3) return;
      updateVectorPoint(d.id, { handleOut: { x: hx, y: hy }, handleIn: { x: -hx, y: -hy }, isCorner: false });
      return;
    }
    // a handle: its twin mirrors it unless Alt broke them apart
    const mirror = !d.alt && !e.altKey;
    if (d.kind === 'out') updateVectorPoint(d.id, { handleOut: { x: hx, y: hy }, ...(mirror ? { handleIn: { x: -hx, y: -hy } } : {}) });
    else updateVectorPoint(d.id, { handleIn: { x: hx, y: hy }, ...(mirror ? { handleOut: { x: -hx, y: -hy } } : {}) });
  };

  const up = () => { drag.current = null; };

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
        const id = s.selectedVectorPointIds[0] || pts[pts.length - 1]?.id;
        if (id) s.removeVectorPoint(id);
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
        <line x1={sx(p.x)} y1={sy(p.y)} x2={sx(p.x + h.x)} y2={sy(p.y + h.y)} stroke={ACCENT} strokeWidth={1} />
        <circle cx={sx(p.x + h.x)} cy={sy(p.y + h.y)} r={3.5} fill="rgb(20,20,19)" stroke={ACCENT} strokeWidth={1.25} />
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
          const sel = p.id === selectedVectorPointIds[0];
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
