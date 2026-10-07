import React, { useEffect, useRef, useState } from 'react';

export type MenuItem =
  | { divider: true }
  | {
      divider?: false; label: string; hint?: string; run: () => void;
      disabled?: boolean; danger?: boolean;
      children?: MenuItem[];   // a submenu, opened on hover (Align, ...)
    };

const ITEM_H = 28, DIV_H = 9, MENU_W = 210;
const height = (items: MenuItem[]) => items.reduce((s, it) => s + (it.divider ? DIV_H : ITEM_H), 8);

// ProtoJam's own right-click menu, in place of the browser's. Positioned in
// the canvas container's coordinates and kept inside it; closes on a click
// elsewhere, on Escape, or after an item runs. An item with children opens
// a submenu beside it on hover.
export const CanvasContextMenu: React.FC<{
  x: number; y: number; roomW: number; roomH: number; items: MenuItem[]; onClose: () => void;
}> = ({ x, y, roomW, roomH, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', away);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('mousedown', away); window.removeEventListener('keydown', key); };
  }, [onClose]);

  // keep it on screen: flip left / up when it would run off the canvas
  const h = height(items);
  const left = x + MENU_W > roomW ? Math.max(4, x - MENU_W) : x;
  const top = y + h > roomH ? Math.max(4, Math.min(y - h, roomH - h - 4)) : y;

  const panel = (list: MenuItem[], style: React.CSSProperties, sub: boolean) => {
    let yAt = 4;
    return (
      <div
        style={{ ...style, width: MENU_W }}
        className="absolute py-1 rounded-lg bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.14)] shadow-2xl text-[12px] text-[rgb(235,235,236)] select-none"
      >
        {list.map((it, i) => {
          const rowTop = yAt;
          yAt += it.divider ? DIV_H : ITEM_H;
          if (it.divider) return <div key={i} className="my-1 h-px bg-[rgba(235,235,236,0.1)]" />;
          const hasSub = !!it.children?.length;
          return (
            <div key={i} className="relative" onMouseEnter={() => { if (!sub) setOpen(hasSub ? i : null); }}>
              <button
                disabled={it.disabled}
                onClick={() => { if (hasSub) { setOpen(i); return; } it.run(); onClose(); }}
                className={`w-full flex items-center justify-between px-3 h-7 text-left ${
                  it.disabled ? 'opacity-35 cursor-default'
                  : it.danger ? 'hover:bg-[rgba(255,107,74,0.18)] text-[#ff8a70]'
                  : 'hover:bg-[rgba(235,235,236,0.08)]'
                }`}
              >
                <span>{it.label}</span>
                <span className="text-[10px] opacity-45 font-mono">{hasSub ? '>' : it.hint}</span>
              </button>
              {hasSub && open === i && it.children && (() => {
                // beside the item, on whichever side has room
                const sx = left + MENU_W * 2 > roomW ? -MENU_W + 2 : MENU_W - 2;
                const sh = height(it.children);
                const sy = top + rowTop + sh > roomH ? roomH - top - sh - rowTop - 4 : -4;
                return panel(it.children, { left: sx, top: sy }, true);
              })()}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left, top }}
      className="absolute z-[100]"
    >
      {panel(items, { left: 0, top: 0 }, false)}
    </div>
  );
};
