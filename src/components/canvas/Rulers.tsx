import React, { useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const RULER = 20;                // thickness, px
const GUIDE = '#ff4fa3';               // guides and their labels
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

// Figma-style rulers along the top and left of the canvas.
//   - numbers in canvas units that follow pan and zoom
//   - the selection's extent shaded on both, with its edges numbered
//   - a hairline where the pointer is
//   - drag out of a ruler to make a guide; drag a guide to move it; drag it
//     back onto its ruler to delete it. Things snap to guides while dragged.
export const Rulers: React.FC<{
  width: number; height: number;
  selection: { x0: number; y0: number; x1: number; y1: number } | null;
  pointer: { x: number; y: number } | null;
}> = ({ width, height, selection, pointer }) => {
  const { viewport, guides, addGuide, moveGuide, removeGuide } = useProjectStore();
  const [dragging, setDragging] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { x: vx, y: vy, zoom } = viewport;

  const sx = (wx: number) => wx * zoom + vx;          // canvas -> screen
  const sy = (wy: number) => wy * zoom + vy;

  // a step whose labels land at least ~60px apart
  const step = STEPS.find(s => s * zoom >= 60) ?? STEPS[STEPS.length - 1];
  const minor = step / 5;

  const ticks = (axisLen: number, origin: number) => {
    const out: { pos: number; v: number; major: boolean }[] = [];
    const first = Math.floor((-origin) / zoom / minor) * minor;
    const last = (axisLen - origin) / zoom;
    for (let v = first; v <= last; v += minor) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      out.push({ pos: v * zoom + origin, v: Math.round(v), major });
    }
    return out;
  };

  // Moving a guide: follow the pointer; let go over its own ruler and it goes.
  const dragGuide = (id: string, axis: 'x' | 'y', start: PointerEvent | React.PointerEvent) => {
    setDragging(id);
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const at = (e: PointerEvent | React.PointerEvent) =>
      axis === 'x' ? (e.clientX - rect.left - vx) / zoom : (e.clientY - rect.top - vy) / zoom;
    moveGuide(id, at(start));
    const move = (e: PointerEvent) => moveGuide(id, at(e));
    const up = (e: PointerEvent) => {
      const onRuler = axis === 'x' ? e.clientX - rect.left < RULER : e.clientY - rect.top < RULER;
      if (onRuler) removeGuide(id);
      setDragging(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pullGuide = (axis: 'x' | 'y') => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    const id = addGuide(axis, 0);
    dragGuide(id, axis, e);
  };

  const label = (text: string, style: React.CSSProperties) => (
    <span style={{ position: 'absolute', fontSize: 9, fontFamily: 'ui-monospace, monospace', ...style }}>{text}</span>
  );

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none z-[55]">
      {/* guides, across the whole canvas */}
      {guides.map(g => {
        const p = g.axis === 'x' ? sx(g.pos) : sy(g.pos);
        const vertical = g.axis === 'x';
        if (p < RULER - 2 || p > (vertical ? width : height)) return null;
        return (
          <div
            key={g.id}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); dragGuide(g.id, g.axis, e); }}
            className="absolute pointer-events-auto group/guide"
            style={vertical
              ? { left: p - 3, top: RULER, width: 7, height: height - RULER, cursor: 'col-resize' }
              : { top: p - 3, left: RULER, height: 7, width: width - RULER, cursor: 'row-resize' }}
          >
            <div style={vertical
              ? { position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, background: GUIDE }
              : { position: 'absolute', top: 3, left: 0, right: 0, height: 1, background: GUIDE }} />
            {(dragging === g.id) && label(String(g.pos), vertical
              ? { left: 8, top: 6, background: GUIDE, color: '#fff', padding: '0 3px', borderRadius: 3 }
              : { top: 8, left: 6, background: GUIDE, color: '#fff', padding: '0 3px', borderRadius: 3 })}
          </div>
        );
      })}

      {/* top ruler */}
      <div onPointerDown={pullGuide('y')} title="Drag down to make a guide"
           className="absolute pointer-events-auto bg-[rgb(26,26,25)] border-b border-[rgba(235,235,236,0.12)] overflow-hidden cursor-row-resize"
           style={{ left: RULER, top: 0, right: 0, height: RULER }}>
        {selection && (
          <div className="absolute top-0 bottom-0 bg-[rgba(255,107,74,0.18)]"
               style={{ left: sx(selection.x0) - RULER, width: Math.max(1, (selection.x1 - selection.x0) * zoom) }} />
        )}
        {ticks(width, vx).map((t, i) => (
          <React.Fragment key={i}>
            <div className="absolute bottom-0 bg-[rgba(235,235,236,0.35)]"
                 style={{ left: t.pos - RULER, width: 1, height: t.major ? 8 : 4 }} />
            {t.major && label(String(t.v), { left: t.pos - RULER + 3, top: 2, color: 'rgba(235,235,236,0.55)' })}
          </React.Fragment>
        ))}
        {selection && <>
          {label(String(Math.round(selection.x0)), { left: sx(selection.x0) - RULER + 2, top: 2, color: '#ff8a70', background: 'rgb(26,26,25)' })}
          {label(String(Math.round(selection.x1)), { left: sx(selection.x1) - RULER + 2, top: 2, color: '#ff8a70', background: 'rgb(26,26,25)' })}
        </>}
        {pointer && <div className="absolute top-0 bottom-0 bg-[rgba(235,235,236,0.8)]" style={{ left: sx(pointer.x) - RULER, width: 1 }} />}
      </div>

      {/* left ruler */}
      <div onPointerDown={pullGuide('x')} title="Drag right to make a guide"
           className="absolute pointer-events-auto bg-[rgb(26,26,25)] border-r border-[rgba(235,235,236,0.12)] overflow-hidden cursor-col-resize"
           style={{ left: 0, top: RULER, bottom: 0, width: RULER }}>
        {selection && (
          <div className="absolute left-0 right-0 bg-[rgba(255,107,74,0.18)]"
               style={{ top: sy(selection.y0) - RULER, height: Math.max(1, (selection.y1 - selection.y0) * zoom) }} />
        )}
        {ticks(height, vy).map((t, i) => (
          <React.Fragment key={i}>
            <div className="absolute right-0 bg-[rgba(235,235,236,0.35)]"
                 style={{ top: t.pos - RULER, height: 1, width: t.major ? 8 : 4 }} />
            {t.major && label(String(t.v), {
              top: t.pos - RULER + 3, left: 2, color: 'rgba(235,235,236,0.55)',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)'
            })}
          </React.Fragment>
        ))}
        {pointer && <div className="absolute left-0 right-0 bg-[rgba(235,235,236,0.8)]" style={{ top: sy(pointer.y) - RULER, height: 1 }} />}
      </div>

      {/* the corner */}
      <div className="absolute left-0 top-0 bg-[rgb(26,26,25)] border-r border-b border-[rgba(235,235,236,0.12)]"
           style={{ width: RULER, height: RULER }} />
    </div>
  );
};
