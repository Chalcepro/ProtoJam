import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { withMulti } from '../../lib/multiEdit';
import { ICON_STYLES, alternativesOf, inCategory, searchIcons, swapIcon, useIconMeta, type IconStyle } from '../../lib/icons';
import { IconTile } from '../sidebar/IconsPanel';
import type { UIElement } from '../../types/components';

// The Icon tab (right panel), for a selected icon: change it for any other -
// its counterparts, the rest of its category, or anything in the library -
// change its style, and turn, flip and size it. With several icons selected,
// all of them change.

const head = 'text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider';
const LABEL: Record<IconStyle, string> = { thin: 'Thin', light: 'Light', regular: 'Regular', bold: 'Bold', fill: 'Fill', duotone: 'Duotone' };
const chip = (on: boolean) => `px-2 py-0.5 rounded-full text-[10px] capitalize ${on ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`;

const Grid: React.FC<{ names: string[]; style: IconStyle; current: string; onPick: (n: string) => void; limit?: number }> = ({ names, style, current, onPick, limit = 96 }) => {
  const [shown, setShown] = useState(limit);
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(limit), [names, limit]);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(n => n + limit); });
    io.observe(el);
    return () => io.disconnect();
  }, [names, shown, limit]);
  return (
    <>
      <div className="grid grid-cols-7 gap-0.5">
        {names.slice(0, shown).map(n => (
          <button key={n} title={n} onClick={() => onPick(n)}
                  className={`aspect-square flex items-center justify-center rounded hover:bg-[rgba(235,235,236,0.1)] text-[rgb(235,235,236)] ${n === current ? 'bg-[rgba(49,195,243,0.25)] ring-1 ring-[#31C3F3]' : ''}`}>
            <IconTile name={n} style={style} size={18} />
          </button>
        ))}
      </div>
      {shown < names.length && <div ref={more} className="h-6" />}
    </>
  );
};

export const IconTab: React.FC<{ element: UIElement }> = ({ element }) => {
  const meta = useIconMeta();
  const { updateElementStyle } = withMulti({ updateElementStyle: useProjectStore(s => s.updateElementStyle) });
  const name = element.semanticProps.iconName || 'star';
  const style = element.style;
  const weight = (style.iconWeight || 'regular') as IconStyle;
  const me = meta?.find(m => m.n === name);
  const [cat, setCat] = useState<string>('');
  const [q, setQ] = useState('');
  useEffect(() => { setCat(me?.c[0] || ''); }, [me?.n]);
  const alts = useMemo(() => (meta ? alternativesOf(meta, name) : []), [meta, name]);
  const catIcons = useMemo(() => (meta && cat ? inCategory(meta, cat) : []), [meta, cat]);
  const found = useMemo(() => (meta && q.trim() ? searchIcons(meta, q).map(m => m.n) : []), [meta, q]);
  const pick = (n: string) => swapIcon(element.id, n);
  const size = (px: number) => updateElementStyle(element.id, { width: px, height: px });

  return (
    <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
      {/* the icon, large */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-[rgba(235,235,236,0.06)] border border-[rgba(235,235,236,0.08)] flex items-center justify-center shrink-0"
             style={{ transform: `scale(${style.iconFlipH ? -1 : 1}, ${style.iconFlipV ? -1 : 1}) rotate(${style.rotation || 0}deg)` }}>
          <IconTile name={name} style={weight} size={40} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-[10.5px] text-[rgba(235,235,236,0.45)] capitalize truncate">{me?.c.join(' · ')}</div>
          <div className="text-[10.5px] text-[rgba(235,235,236,0.45)]">{LABEL[weight]} · {Number(style.width)}px</div>
        </div>
      </div>

      {/* style */}
      <div className="space-y-1.5">
        <div className={head}>Style</div>
        <div className="grid grid-cols-6 gap-0.5 bg-[rgba(235,235,236,0.04)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
          {ICON_STYLES.map(s => (
            <button key={s} title={LABEL[s]} onClick={() => updateElementStyle(element.id, { iconWeight: s })}
                    className={`flex justify-center py-1.5 rounded ${weight === s ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
              <IconTile name={name} style={s} size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* transform */}
      <div className="space-y-1.5">
        <div className={head}>Transform</div>
        <div className="flex items-center gap-1">
          {([['Turn left 90°', Icons.RotateCcw, () => updateElementStyle(element.id, { rotation: (((style.rotation || 0) - 90) % 360 + 360) % 360 })],
             ['Turn right 90°', Icons.RotateCw, () => updateElementStyle(element.id, { rotation: ((style.rotation || 0) + 90) % 360 })],
             ['Flip left / right', Icons.FlipHorizontal2, () => updateElementStyle(element.id, { iconFlipH: !style.iconFlipH })],
             ['Flip up / down', Icons.FlipVertical2, () => updateElementStyle(element.id, { iconFlipV: !style.iconFlipV })]] as const).map(([t, Ic, f], i) => (
            <button key={t} title={t} onClick={f}
                    className={`p-1.5 rounded-lg border ${(i === 2 && style.iconFlipH) || (i === 3 && style.iconFlipV) ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] border-[rgb(235,235,236)]' : 'border-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
              <Ic size={13} />
            </button>
          ))}
          <div className="flex-1" />
          {[16, 20, 24, 32, 48, 64].map(px => (
            <button key={px} onClick={() => size(px)} title={`${px} x ${px}`}
                    className={`px-1 py-0.5 rounded text-[10px] font-mono ${Number(style.width) === px && Number(style.height) === px ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]'}`}>
              {px}
            </button>
          ))}
        </div>
      </div>

      {/* counterparts */}
      {alts.length > 0 && (
        <div className="space-y-1.5">
          <div className={head}>Counterparts</div>
          <Grid names={[name, ...alts]} style={weight} current={name} onPick={pick} />
        </div>
      )}

      {/* its category */}
      {me && (
        <div className="space-y-1.5">
          <div className={head}>Same category</div>
          <div className="flex flex-wrap gap-1">
            {me.c.map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
          </div>
          <Grid names={catIcons} style={weight} current={name} onPick={pick} limit={70} />
        </div>
      )}

      {/* anything */}
      <div className="space-y-1.5">
        <div className={head}>Search the library</div>
        <div className="flex items-center gap-1.5 bg-[rgba(235,235,236,0.04)] rounded-lg px-2 py-1.5 border border-[rgba(235,235,236,0.08)]">
          <Icons.Search size={12} className="text-[rgba(235,235,236,0.4)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Swap for any of ${meta?.length ?? ''} icons…`}
                 className="flex-1 bg-transparent outline-none placeholder:text-[rgba(235,235,236,0.35)]" />
          {q && <button onClick={() => setQ('')} className="text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]"><Icons.X size={11} /></button>}
        </div>
        {q.trim() && (found.length ? <Grid names={found} style={weight} current={name} onPick={pick} /> : <div className="text-[rgba(235,235,236,0.4)]">No icon matches “{q}”.</div>)}
      </div>
      <p className="text-[9.5px] text-[rgba(235,235,236,0.3)]">Shift + right-click an icon on the canvas for its counterparts right there.</p>
    </div>
  );
};
