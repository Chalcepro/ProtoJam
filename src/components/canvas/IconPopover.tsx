import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import * as Icons from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { ICON_STYLES, alternativesOf, inCategory, swapIcon, useIconMeta, type IconStyle } from '../../lib/icons';
import { IconTile } from '../sidebar/IconsPanel';
import { useRightTab } from '../inspector/RightInspector';

// Shift + right-click on an icon: a small version of the Icon tab, there at
// the pointer - its styles, its counterparts and some of its category, for a
// quick swap. Everything else (search, transform) is in the Icon tab.

export const useIconPop = create<{ pop: { id: string; x: number; y: number } | null }>(() => ({ pop: null }));

export const IconPopover: React.FC = () => {
  const pop = useIconPop(s => s.pop);
  const el = useProjectStore(s => (pop ? s.elements.find(e => e.id === pop.id) : undefined));
  const meta = useIconMeta();
  const box = useRef<HTMLDivElement>(null);
  const close = () => useIconPop.setState({ pop: null });

  useEffect(() => {
    if (!pop) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    // next tick: the right-click that opened it is not a click away
    const t = setTimeout(() => window.addEventListener('pointerdown', away, true));
    window.addEventListener('keydown', esc, true);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', away, true); window.removeEventListener('keydown', esc, true); };
  }, [pop]);

  const name = el?.semanticProps.iconName || 'star';
  const weight = (el?.style.iconWeight || 'regular') as IconStyle;
  const alts = useMemo(() => (meta ? alternativesOf(meta, name) : []), [meta, name]);
  const cat = meta?.find(m => m.n === name)?.c[0];
  const near = useMemo(() => (meta && cat ? inCategory(meta, cat).filter(n => n !== name && !alts.includes(n)).slice(0, 21) : []), [meta, cat, name, alts]);
  if (!pop || !el) return null;

  // kept on screen
  const W = 248, x = Math.min(pop.x, window.innerWidth - W - 8), y = Math.min(pop.y, window.innerHeight - 330);
  const tile = (n: string) => (
    <button key={n} title={n} onClick={() => swapIcon(el.id, n)}
            className={`aspect-square flex items-center justify-center rounded hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] ${n === name ? 'bg-[rgba(49,195,243,0.25)] ring-1 ring-[#31C3F3]' : ''}`}>
      <IconTile name={n} style={weight} size={18} />
    </button>
  );
  return createPortal(
    <div ref={box} onContextMenu={e => e.preventDefault()}
         className="fixed z-[9500] rounded-xl bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.14)] shadow-2xl p-2.5 space-y-2 text-xs text-[rgb(235,235,236)]"
         style={{ left: x, top: Math.max(8, y), width: W }}>
      <div className="flex items-center gap-2">
        <IconTile name={name} style={weight} size={18} />
        <span className="font-semibold truncate flex-1">{name}</span>
        <button onClick={close} className="text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]"><Icons.X size={12} /></button>
      </div>
      <div className="grid grid-cols-6 gap-0.5 bg-[rgba(235,235,236,0.04)] rounded-lg p-0.5">
        {ICON_STYLES.map(s => (
          <button key={s} title={s} onClick={() => useProjectStore.getState().updateElementStyle(el.id, { iconWeight: s })}
                  className={`flex justify-center py-1 rounded ${weight === s ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
            <IconTile name={name} style={s} size={14} />
          </button>
        ))}
      </div>
      {alts.length > 0 && <div className="grid grid-cols-7 gap-0.5">{[name, ...alts].slice(0, 14).map(tile)}</div>}
      {near.length > 0 && (
        <>
          <div className="text-[10px] text-[rgba(235,235,236,0.45)] capitalize">{cat}</div>
          <div className="grid grid-cols-7 gap-0.5">{near.map(tile)}</div>
        </>
      )}
      <button onClick={() => { useRightTab.setState({ tab: 'icon' }); close(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[11px] font-semibold">
        <Icons.PanelRight size={12} /> More in the Icon tab
      </button>
    </div>,
    document.body
  );
};
