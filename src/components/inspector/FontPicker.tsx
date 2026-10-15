import React, { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { FontCategory, FontEntry, familyOf, fontStack, loadBundledFonts, loadLocalFonts, localFontsSupported } from '../../lib/fonts';

const ROW = 30;          // px per row; the list only draws the rows in view
const LIST_H = 330;
const FILTERS: { id: 'all' | FontCategory; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'sans', label: 'Sans' }, { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' }, { id: 'handwriting', label: 'Script' }, { id: 'mono', label: 'Mono' },
  { id: 'local', label: 'This PC' }
];

// A font menu as in Figma: search, filter, every name drawn in its own font.
export const FontPicker: React.FC<{ value?: string; onPick: (f: FontEntry) => void; onPreview?: (f: FontEntry | null) => void }> = ({ value, onPick, onPreview }) => {
  const [open, setOpen] = useState(false);
  const current = familyOf(value);
  const btn = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] hover:border-[rgba(235,235,236,0.2)] text-[13px] outline-none"
      >
        <span className="truncate" style={{ fontFamily: value }}>{current}</span>
        <Icons.ChevronDown size={13} className="opacity-50 shrink-0" />
      </button>
      {open && btn.current && createPortal(
        <FontMenu anchor={btn.current} current={current} onPreview={onPreview}
                  onPick={(f) => { onPreview?.(null); onPick(f); setOpen(false); }} onClose={() => { onPreview?.(null); setOpen(false); }} />,
        document.body
      )}
    </>
  );
};

const FontMenu: React.FC<{ anchor: HTMLElement; current: string; onPick: (f: FontEntry) => void; onClose: () => void; onPreview?: (f: FontEntry | null) => void }> =
  ({ anchor, current, onPick, onClose, onPreview }) => {
  const [bundled, setBundled] = useState<FontEntry[]>([]);
  const [local, setLocal] = useState<FontEntry[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | FontCategory>('all');
  const [scroll, setScroll] = useState(0);
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => { loadBundledFonts().then(setBundled); }, []);
  // Asking for the PC's fonts needs the click that opened this menu.
  useEffect(() => { loadLocalFonts().then(setLocal); }, []);

  const all = useMemo(() => {
    const seen = new Set(bundled.map(f => f.family));
    return [...bundled, ...(local || []).filter(f => !seen.has(f.family))];
  }, [bundled, local]);

  const shown = useMemo(() => all.filter(f =>
    (filter === 'all' || f.category === filter) && (!q || f.family.toLowerCase().includes(q))
  ), [all, filter, q]);

  // open on the current font
  useLayoutEffect(() => {
    const i = shown.findIndex(f => f.family === current);
    if (i >= 0 && listRef.current && !query) {
      listRef.current.scrollTop = Math.max(0, i * ROW - LIST_H / 2);
      setHi(i);
    }
    // only when the list first fills
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundled.length]);
  useEffect(() => { setHi(0); if (listRef.current) listRef.current.scrollTop = 0; }, [q, filter]);

  // close on a click outside
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', down);
    return () => window.removeEventListener('mousedown', down);
  }, [anchor, onClose]);

  const r = anchor.getBoundingClientRect();
  const W = 280;
  const left = Math.min(window.innerWidth - W - 8, Math.max(8, r.right - W));
  const top = Math.min(r.bottom + 4, window.innerHeight - LIST_H - 110);

  const first = Math.max(0, Math.floor(scroll / ROW) - 4);
  const last = Math.min(shown.length, Math.ceil((scroll + LIST_H) / ROW) + 4);

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' && shown[hi]) { onPick(shown[hi]); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const n = Math.max(0, Math.min(shown.length - 1, hi + (e.key === 'ArrowDown' ? 1 : -1)));
    setHi(n);
    if (shown[n]) onPreview?.(shown[n]);
    const el = listRef.current;
    if (el && (n * ROW < el.scrollTop || (n + 1) * ROW > el.scrollTop + LIST_H)) el.scrollTop = n * ROW - LIST_H / 2;
  };

  return (
    <div ref={menuRef} onKeyDown={keyDown}
         style={{ position: 'fixed', left, top, width: W, zIndex: 10000 }}
         className="bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.15)] rounded-xl shadow-2xl text-[rgb(235,235,236)] overflow-hidden">
      <div className="p-2 border-b border-[rgba(235,235,236,0.08)] space-y-2">
        <div className="flex items-center gap-2 bg-[rgba(235,235,236,0.06)] rounded-lg px-2 py-1.5">
          <Icons.Search size={13} className="opacity-50" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search fonts"
                 className="bg-transparent outline-none text-xs flex-1 min-w-0" />
          {query && <button onClick={() => setQuery('')}><Icons.X size={12} className="opacity-50" /></button>}
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.filter(f => f.id !== 'local' || localFontsSupported()).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={listRef} onScroll={e => setScroll(e.currentTarget.scrollTop)} onMouseLeave={() => onPreview?.(null)}
           style={{ height: LIST_H, overflowY: 'auto', position: 'relative' }}>
        <div style={{ height: shown.length * ROW }} />
        {shown.slice(first, last).map((f, k) => {
          const i = first + k;
          return (
            <button key={f.family} onClick={() => onPick(f)} onMouseEnter={() => { setHi(i); onPreview?.(f); }}
                    style={{ position: 'absolute', top: i * ROW, height: ROW, left: 0, right: 0 }}
                    className={`flex items-center gap-2 px-3 text-left ${i === hi ? 'bg-[rgba(235,235,236,0.08)]' : ''}`}>
              <span className="w-3 shrink-0">{f.family === current && <Icons.Check size={12} />}</span>
              <span className="truncate text-[15px] flex-1" style={{ fontFamily: fontStack(f) }}>{f.family}</span>
              {f.category === 'local' && <Icons.HardDrive size={11} className="opacity-35 shrink-0" />}
            </button>
          );
        })}
        {!shown.length && (
          <div className="absolute inset-x-0 top-8 text-center text-[11px] opacity-40">
            {filter === 'local' && local === null ? 'Reading this PC’s fonts…' : 'No fonts match'}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-[rgba(235,235,236,0.08)] text-[10px] opacity-40">
        {shown.length} fonts{local === null ? '' : ` · ${local.length} on this PC`}
      </div>
    </div>
  );
};

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black'
};

// Weights of the current font, each drawn in itself; hovering one previews it.
export const WeightPicker: React.FC<{ family?: string; weights: number[]; value: number; onPick: (w: number) => void; onPreview?: (w: number | null) => void }> =
  ({ family, weights, value, onPick, onPreview }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  useEffect(() => {
    if (!open) return;
    const onPreview = (w: number | null) => previewRef.current?.(w);
    const down = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) { onPreview?.(null); setOpen(false); }
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onPreview?.(null); setOpen(false); } };
    window.addEventListener('mousedown', down);
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('keydown', key, true); onPreview?.(null); };
  }, [open]);
  const r = btn.current?.getBoundingClientRect();
  return (
    <>
      <button ref={btn} onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] hover:border-[rgba(235,235,236,0.2)] text-xs outline-none">
        <span className="truncate" style={{ fontFamily: family, fontWeight: value }}>{WEIGHT_NAMES[value] || value}</span>
        <Icons.ChevronDown size={12} className="opacity-50 shrink-0" />
      </button>
      {open && r && createPortal(
        <div ref={menu} onMouseLeave={() => onPreview?.(null)}
             style={{ position: 'fixed', left: r.left, top: Math.min(r.bottom + 4, window.innerHeight - weights.length * 30 - 16), width: Math.max(r.width, 170), zIndex: 10000 }}
             className="bg-[rgb(28,28,27)] border border-[rgba(235,235,236,0.15)] rounded-xl shadow-2xl py-1 text-[rgb(235,235,236)]">
          {weights.map(w => (
            <button key={w} onMouseEnter={() => onPreview?.(w)} onClick={() => { onPreview?.(null); onPick(w); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 h-[30px] text-left hover:bg-[rgba(235,235,236,0.08)]">
              <span className="w-3 shrink-0">{w === value && <Icons.Check size={12} />}</span>
              <span className="flex-1 text-[14px]" style={{ fontFamily: family, fontWeight: w }}>{WEIGHT_NAMES[w] || w}</span>
              <span className="text-[10px] opacity-40 font-mono">{w}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};
