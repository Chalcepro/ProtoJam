import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { useLayoutHint } from '../../lib/layoutHint';

// The spaces of an auto layout frame drawn on the canvas while the side panel
// points at them: its padding, or the gaps between what is in it (between
// columns and rows, in a grid). Pink stripes with the value, as in Figma.

type R = { x: number; y: number; w: number; h: number; label?: string };
const STRIPES = 'repeating-linear-gradient(45deg, rgba(255,62,138,0.45) 0 2px, rgba(255,62,138,0.14) 2px 7px)';

const measure = (id: string, part: 'gap' | 'padding'): R[] => {
  const st = useProjectStore.getState();
  const frame = st.frames.find(f => f.id === id);
  const el = st.elements.find(e => e.id === id);
  const al = frame ? frame.autoLayout : el?.style.autoLayout;
  const host = document.querySelector(`[data-frame-body="${id}"]`) || document.querySelector(`[data-el-id="${id}"]`);
  if (!al?.enabled || !host) return [];
  const z = st.viewport.zoom || 1;
  const c = host.getBoundingClientRect();
  const p = al.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  if (part === 'padding') {
    return [
      { x: c.left, y: c.top, w: c.width, h: p.top * z, label: p.top ? String(p.top) : undefined },
      { x: c.left, y: c.bottom - p.bottom * z, w: c.width, h: p.bottom * z, label: p.bottom ? String(p.bottom) : undefined },
      { x: c.left, y: c.top + p.top * z, w: p.left * z, h: c.height - (p.top + p.bottom) * z, label: p.left ? String(p.left) : undefined },
      { x: c.right - p.right * z, y: c.top + p.top * z, w: p.right * z, h: c.height - (p.top + p.bottom) * z, label: p.right ? String(p.right) : undefined }
    ].filter(r => r.w > 0 && r.h > 0);
  }
  const kids = st.elements.filter(e => e.parentId === id && !e.hidden && !e.style.absolutePosition)
    .map(e => document.querySelector(`[data-el-id="${e.id}"]`)?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
  const inL = c.left + p.left * z, inR = c.right - p.right * z;
  const out: R[] = [];
  const rowsOf = () => {
    const rows: DOMRect[][] = [];
    for (const r of [...kids].sort((a, b) => a.top - b.top || a.left - b.left)) {
      const row = rows.find(rw => Math.abs(rw[0].top - r.top) < 2);
      if (row) row.push(r); else rows.push([r]);
    }
    return rows.map(r => r.sort((a, b) => a.left - b.left));
  };
  if (al.direction === 'vertical') {
    const s = [...kids].sort((a, b) => a.top - b.top);
    // a negative gap is the overlap between them
    s.slice(1).forEach((r, i) => out.push({ x: inL, y: Math.min(s[i].bottom, r.top), w: inR - inL, h: Math.abs(r.top - s[i].bottom), label: String(al.gap) }));
  } else {
    const rows = rowsOf();
    for (const row of rows) row.slice(1).forEach((r, i) => {
      const top = Math.min(r.top, row[i].top), bottom = Math.max(r.bottom, row[i].bottom);
      out.push({ x: Math.min(row[i].right, r.left), y: top, w: Math.abs(r.left - row[i].right), h: bottom - top, label: String(al.gap) });
    });
    // between rows (a grid, or a row that wraps)
    rows.slice(1).forEach((row, i) => {
      const prevBottom = Math.max(...rows[i].map(r => r.bottom)), top = Math.min(...row.map(r => r.top));
      out.push({ x: inL, y: prevBottom, w: inR - inL, h: top - prevBottom, label: String(al.direction === 'grid' ? al.rowGap ?? al.gap : al.gap) });
    });
  }
  return out.filter(r => r.w > 0.5 && r.h > 0.5);
};

export const SpacingHint: React.FC = () => {
  const { id, part } = useLayoutHint();
  const [rects, setRects] = useState<R[]>([]);
  useEffect(() => {
    if (!id || !part) { setRects([]); return; }
    // follows the values live while they are typed or scrubbed
    let raf = 0;
    const tick = () => { setRects(measure(id, part)); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id, part]);
  if (!rects.length) return null;
  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9000]">
      {rects.map((r, i) => (
        <div key={i} className="absolute flex items-center justify-center" style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: STRIPES }}>
          {r.label && i < 4 && <span className="px-1 rounded text-[10px] font-semibold text-white bg-[#ff3e8a]">{r.label}</span>}
        </div>
      ))}
    </div>,
    document.body
  );
};
