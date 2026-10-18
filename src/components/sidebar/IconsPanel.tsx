import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useRightTab } from '../inspector/RightInspector';
import { ICON_STYLES, searchIcons, useIconMeta, useIconSvg, type IconStyle } from '../../lib/icons';

// The icon library (Phosphor, ~1,500 icons, offline). Click: into the view's
// centre - or, with an icon selected, swapped into it (size, colour and style
// kept). Drag onto the canvas to place one.

const STYLE_LABEL: Record<IconStyle, string> = { thin: 'Thin', light: 'Light', regular: 'Regular', bold: 'Bold', fill: 'Fill', duotone: 'Duotone' };
const PAGE = 120;

export const IconTile: React.FC<{ name: string; style: IconStyle; size?: number; className?: string }> = ({ name, style, size = 22, className }) => {
  const svg = useIconSvg(name, style);
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="currentColor" className={className}>
      {svg && <g dangerouslySetInnerHTML={{ __html: svg }} />}
    </svg>
  );
};

// Place a new icon at a canvas point, inside whatever frame is there.
export const placeIcon = (name: string, weight: IconStyle, x: number, y: number) => {
  const st = useProjectStore.getState();
  const id = st.dropComponentAt('icon', x - 16, y - 16);
  st.updateElementSemanticProps(id, { iconName: name });
  st.updateElementStyle(id, { iconWeight: weight });
  st.updateElement(id, { name: name.replace(/-/g, ' ') });
  st.setSelection([id]);
  // its options (counterparts, category, transform) open beside it
  useRightTab.setState({ tab: 'icon' });
  return id;
};

export const IconsPanel: React.FC = () => {
  const meta = useIconMeta();
  const [q, setQ] = useState('');
  const [style, setStyle] = useState<IconStyle>('regular');
  const [cat, setCat] = useState<string>('');
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);
  const selectedIcon = useProjectStore(s => {
    const el = s.selectedElementIds.length === 1 ? s.elements.find(e => e.id === s.selectedElementIds[0]) : undefined;
    return el?.type === 'icon' ? el : undefined;
  });

  const cats = useMemo(() => (meta ? [...new Set(meta.flatMap(m => m.c))].sort() : []), [meta]);
  const list = useMemo(() => (meta ? searchIcons(meta, q, cat || undefined) : []), [meta, q, cat]);
  useEffect(() => setShown(PAGE), [q, cat, style]);
  // more as the end of the grid scrolls into view
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(n => n + PAGE); });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, shown]);

  const pick = (name: string) => {
    const st = useProjectStore.getState();
    if (selectedIcon) {
      st.updateElementSemanticProps(selectedIcon.id, { iconName: name });
      st.updateElement(selectedIcon.id, { name: name.replace(/-/g, ' ') });
      return;
    }
    const el = document.querySelector('main')?.getBoundingClientRect();
    const vp = st.viewport;
    const cx = el ? (el.width / 2 - vp.x) / vp.zoom : 0, cy = el ? (el.height / 2 - vp.y) / vp.zoom : 0;
    placeIcon(name, style, cx, cy);
  };

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="p-2 space-y-2 border-b border-[rgba(235,235,236,0.08)]">
        <div className="flex items-center gap-1.5 bg-[rgba(235,235,236,0.04)] rounded-lg px-2 py-1.5 border border-[rgba(235,235,236,0.08)]">
          <Icons.Search size={12} className="text-[rgba(235,235,236,0.4)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${meta?.length ?? ''} icons…`}
                 className="flex-1 bg-transparent outline-none text-[rgb(235,235,236)] placeholder:text-[rgba(235,235,236,0.35)]" />
          {q && <button onClick={() => setQ('')} className="text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]"><Icons.X size={11} /></button>}
        </div>
        <div className="grid grid-cols-6 gap-0.5 bg-[rgba(235,235,236,0.04)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
          {ICON_STYLES.map(s => (
            <button key={s} title={STYLE_LABEL[s]} onClick={() => setStyle(s)}
                    className={`flex justify-center py-1 rounded ${style === s ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]'}`}>
              <IconTile name="star" style={s} size={14} />
            </button>
          ))}
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)}
                className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-1.5 py-1 rounded border border-[rgba(235,235,236,0.08)] text-[11px] outline-none capitalize">
          <option value="" className="bg-[rgb(20,20,19)]">All categories</option>
          {cats.map(c => <option key={c} value={c} className="bg-[rgb(20,20,19)]">{c}</option>)}
        </select>
        {selectedIcon && (
          <div className="text-[10.5px] text-[#31C3F3] bg-[rgba(49,195,243,0.1)] rounded px-2 py-1">
            Click an icon to swap it into “{selectedIcon.semanticProps.iconName}” (size, colour and style kept)
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!meta ? <div className="text-[rgba(235,235,236,0.4)] p-2">Loading icons…</div> : (
          <>
            <div className="grid grid-cols-6 gap-1">
              {list.slice(0, shown).map(m => (
                <button key={m.n} title={m.n} onClick={() => pick(m.n)} draggable
                        onDragStart={e => { e.dataTransfer.setData('application/protojam-icon', JSON.stringify({ name: m.n, style })); e.dataTransfer.effectAllowed = 'copy'; }}
                        className={`aspect-square flex items-center justify-center rounded-md hover:bg-[rgba(235,235,236,0.1)] text-[rgb(235,235,236)] ${selectedIcon?.semanticProps.iconName === m.n ? 'bg-[rgba(49,195,243,0.2)]' : ''}`}>
                  <IconTile name={m.n} style={style} />
                </button>
              ))}
            </div>
            {shown < list.length && <div ref={more} className="h-8" />}
            {!list.length && <div className="text-[rgba(235,235,236,0.4)] p-2">No icon matches “{q}”.</div>}
            <p className="text-[9.5px] text-[rgba(235,235,236,0.3)] mt-3">Phosphor Icons, MIT licence.</p>
          </>
        )}
      </div>
    </div>
  );
};
