import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import type { BlendMode } from '../../types/components';
import { BLEND_MODES } from '../../lib/styleCss';

// Figma's grouping: normal | darken | lighten | contrast | difference | colour
const GROUPS: BlendMode[][] = [
  ['normal'],
  ['darken', 'multiply', 'color-burn'],
  ['lighten', 'screen', 'color-dodge'],
  ['overlay', 'soft-light', 'hard-light'],
  ['difference', 'exclusion'],
  ['hue', 'saturation', 'color', 'luminosity']
];
const NAME = Object.fromEntries(BLEND_MODES) as Record<BlendMode, string>;

// A blend mode menu that shows each mode on the canvas while it is hovered;
// leaving the menu puts the chosen one back, a click keeps the hovered one.
// `icon`: just a blend icon (lit when not Normal), for a fill / stroke row.
export const BlendPicker: React.FC<{ value?: BlendMode; onPick: (m: BlendMode) => void; onPreview?: (m: BlendMode | null) => void; className?: string; title?: string; icon?: boolean }> =
  ({ value = 'normal', onPick, onPreview, className, title, icon }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = () => { onPreview?.(null); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close();
    };
    // Esc closes the menu only - caught first, so it does not also drop the selection
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
    window.addEventListener('mousedown', down);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key, true);
      onPreview?.(null);      // however it closes (even the panel going away), no preview is left behind
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const r = btn.current?.getBoundingClientRect();
  const H = 18 * 30 + 6 * 9;
  return (
    <>
      <button ref={btn} onClick={() => (open ? close() : setOpen(true))} title={icon ? `${title} (now: ${NAME[value] || 'Normal'})` : title}
              className={`flex items-center justify-between gap-1 text-left outline-none ${className || ''}`}>
        {icon
          ? <Icons.Blend size={12} className={value === 'normal' ? 'opacity-45' : 'text-[#31C3F3]'} />
          : <><span className="truncate">{NAME[value] || 'Normal'}</span><Icons.ChevronDown size={12} className="opacity-50 shrink-0" /></>}
      </button>
      {open && r && createPortal(
        <div ref={menu} onMouseLeave={() => onPreview?.(null)}
             style={{ position: 'fixed', left: Math.min(r.left, window.innerWidth - 188), top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - H - 8)), width: 180, zIndex: 10000 }}
             className="bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.15)] rounded-xl shadow-2xl py-1 text-[rgb(235,235,236)]">
          {GROUPS.map((g, gi) => (
            <div key={gi} className={gi ? 'border-t border-[rgba(235,235,236,0.08)] mt-1 pt-1' : ''}>
              {g.map(m => (
                <button key={m} onMouseEnter={() => onPreview?.(m)} onClick={() => { onPreview?.(null); onPick(m); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 h-[28px] text-left text-xs hover:bg-[rgba(235,235,236,0.08)]">
                  <span className="w-3 shrink-0">{m === value && <Icons.Check size={12} />}</span>
                  {NAME[m]}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};
