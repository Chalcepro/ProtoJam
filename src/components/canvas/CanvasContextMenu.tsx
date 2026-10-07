import React, { useEffect, useRef } from 'react';

export type MenuItem =
  | { divider: true }
  | { divider?: false; label: string; hint?: string; run: () => void; disabled?: boolean; danger?: boolean };

// ProtoJam's own right-click menu, in place of the browser's. Positioned in
// the canvas container's coordinates and kept inside it; closes on a click
// elsewhere, on Escape, or after an item runs.
export const CanvasContextMenu: React.FC<{
  x: number; y: number; roomW: number; roomH: number; items: MenuItem[]; onClose: () => void;
}> = ({ x, y, roomW, roomH, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', away);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('mousedown', away); window.removeEventListener('keydown', key); };
  }, [onClose]);

  // keep it on screen: flip left / up when it would run off the canvas
  const w = 200, h = items.reduce((s, it) => s + (it.divider ? 9 : 28), 8);
  const left = x + w > roomW ? Math.max(4, x - w) : x;
  const top = y + h > roomH ? Math.max(4, Math.min(y - h, roomH - h - 4)) : y;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left, top, width: w }}
      className="absolute z-[100] py-1 rounded-lg bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.14)] shadow-2xl text-[12px] text-[rgb(235,235,236)] select-none"
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="my-1 h-px bg-[rgba(235,235,236,0.1)]" />
        ) : (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => { it.run(); onClose(); }}
            className={`w-full flex items-center justify-between px-3 h-7 text-left ${
              it.disabled ? 'opacity-35 cursor-default'
              : it.danger ? 'hover:bg-[rgba(255,107,74,0.18)] text-[#ff8a70]'
              : 'hover:bg-[rgba(235,235,236,0.08)]'
            }`}
          >
            <span>{it.label}</span>
            {it.hint && <span className="text-[10px] opacity-45 font-mono">{it.hint}</span>}
          </button>
        )
      )}
    </div>
  );
};
