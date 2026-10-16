import React, { useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { NumberInput } from './NumberInput';
import { BlendPicker } from './BlendPicker';
import { useProjectStore } from '../../store/useProjectStore';
import { blended, fillsOf, paintRgba, paintsLetters, strokesOf, fillsCss } from '../../lib/paint';
import { putAsset } from '../../lib/assets';
import { exportLayer } from '../../lib/exportImage';
import type { ElementStyle, ExportSetting, FillLayer, StrokeLayer, UIElement } from '../../types/components';

// Fill, Stroke and Export as lists, the way Figma lays them out: + to add a
// row, an eye and a minus on each, a paint's own editor under its swatch.

const head = 'text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider';
const iconBtn = 'p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]';
const sel = 'bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-1.5 py-1 rounded border border-[rgba(235,235,236,0.08)] text-[11px] outline-none';
const uid = () => `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const hex6 = (c?: string) => {
  const m = paintRgba(c).match(/rgba\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)/);
  if (!m) return '#ebebec';
  return '#' + [m[1], m[2], m[3]].map(v => Math.round(Number(v)).toString(16).padStart(2, '0')).join('');
};
const TYPES: [FillLayer['type'], string][] = [['solid', 'Solid'], ['linear', 'Linear'], ['radial', 'Radial'], ['angular', 'Angular'], ['diamond', 'Diamond'], ['image', 'Image'], ['video', 'Video']];
const LABEL: Record<FillLayer['type'], string> = Object.fromEntries(TYPES) as any;

const Section: React.FC<{ title: string; onAdd: () => void; addTitle: string; children: React.ReactNode; extra?: React.ReactNode }> = ({ title, onAdd, addTitle, children, extra }) => (
  <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
    <div className="flex items-center justify-between mb-2">
      <span className={head}>{title}</span>
      <div className="flex items-center gap-1">{extra}<button onClick={onAdd} title={addTitle} className={iconBtn}><Icons.Plus size={13} /></button></div>
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

// ------------------------------------------------------------------ fills

export const FillsSection: React.FC<{ element: UIElement; update: (s: Partial<ElementStyle>) => void; extra?: React.ReactNode }> = ({ element, update, extra }) => {
  const [open, setOpen] = useState<string | null>(null);
  const fills = fillsOf(element);
  const letters = paintsLetters(element);
  // Saved as a list; a single plain colour stays the simple fill/text colour
  // so variables, components and everything else keep working with it.
  const save = (next: FillLayer[]) => {
    const one = next.length === 1 && next[0].type === 'solid' && next[0].opacity >= 1 && next[0].visible && !blended(next[0]);
    if (one) update({ fills: undefined, fillGradient: undefined, [letters ? 'textColor' : 'fillColor']: next[0].color });
    else update({ fills: next, fillGradient: undefined, ...(letters ? {} : { fillColor: next.length ? undefined : 'transparent' }) });
  };
  const patch = (id: string, p: Partial<FillLayer>) => save(fills.map(f => f.id === id ? { ...f, ...p } : f));
  const add = () => {
    const f: FillLayer = { id: uid(), type: 'solid', color: fills.length ? '#31C3F3' : '#d9d9d9', opacity: 1, visible: true };
    save([f, ...fills]);        // new paints go on top, as in Figma
  };
  return (
    <Section title={letters ? 'Fill (text)' : 'Fill'} onAdd={add} addTitle="Add a fill on top" extra={element.style.fills ? null : extra}>
      {fills.map((f, i) => (
        <div key={f.id}>
          <div className={`flex items-center gap-1.5 ${f.visible ? '' : 'opacity-45'}`}>
            <button onClick={() => setOpen(open === f.id ? null : f.id)} title="Edit this paint"
                    className="w-6 h-6 rounded border border-[rgba(235,235,236,0.2)] shrink-0"
                    style={{ ...fillsCss([{ ...f, visible: true, blendMode: 'normal' }]), backgroundColor: f.type === 'video' ? '#333' : undefined }} />
            {f.type === 'solid'
              ? <input value={f.color || ''} onChange={e => patch(f.id, { color: e.target.value })}
                       className="flex-1 min-w-0 bg-transparent text-[rgb(235,235,236)] font-mono text-xs outline-none" />
              : <button onClick={() => setOpen(open === f.id ? null : f.id)} className="flex-1 text-left text-xs text-[rgb(235,235,236)]">{LABEL[f.type]}</button>}
            <div className="flex items-center w-14 bg-[rgba(235,235,236,0.04)] rounded px-1 border border-[rgba(235,235,236,0.08)]" title="Opacity of this paint">
              <NumberInput min={0} max={100} value={Math.round(f.opacity * 100)} onChange={e => patch(f.id, { opacity: Number(e.target.value) / 100 })}
                           className="w-full bg-transparent text-[rgb(235,235,236)] font-mono text-[11px] outline-none text-right" />
              <span className="text-[9px] text-[rgba(235,235,236,0.4)]">%</span>
            </div>
            <BlendPicker icon value={f.blendMode} onPick={m => patch(f.id, { blendMode: m })} className={iconBtn}
                         onPreview={m => useProjectStore.setState({ stylePreview: m ? { ids: [element.id], style: { fills: fills.map(x => x.id === f.id ? { ...x, blendMode: m } : x) } } : null })}
                         title="This colour's blend mode - hover a mode to see it" />
            <button onClick={() => patch(f.id, { visible: !f.visible })} className={iconBtn} title={f.visible ? 'Hide' : 'Show'}>
              {f.visible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
            </button>
            <button onClick={() => save(fills.filter(x => x.id !== f.id))} className={iconBtn} title="Remove"><Icons.Minus size={12} /></button>
          </div>
          {open === f.id && (
            <PaintEditor f={f} onChange={p => patch(f.id, p)} letters={letters}
                         // a change shown on the canvas but not saved (hovering a menu)
                         preview={p => useProjectStore.setState({ stylePreview: p ? { ids: [element.id], style: { fills: fills.map(x => x.id === f.id ? { ...x, ...p } : x) } } : null })}
                         canUp={i > 0} canDown={i < fills.length - 1}
                         move={(dir) => { const n = [...fills]; const j = i + dir; [n[i], n[j]] = [n[j], n[i]]; save(n); }} />
          )}
        </div>
      ))}
      {!fills.length && <div className="text-[10px] text-[rgba(235,235,236,0.35)]">No fill - + adds one</div>}
    </Section>
  );
};

const PaintEditor: React.FC<{ f: FillLayer; onChange: (p: Partial<FillLayer>) => void; preview: (p: Partial<FillLayer> | null) => void; letters: boolean; canUp: boolean; canDown: boolean; move: (d: -1 | 1) => void }> =
  ({ f, onChange, preview, letters, canUp, canDown, move }) => {
  const file = useRef<HTMLInputElement>(null);
  const isGrad = f.type === 'linear' || f.type === 'radial' || f.type === 'angular' || f.type === 'diamond';
  const stops = f.gradient?.stops || [];
  const setType = (t: FillLayer['type']) => {
    const base = f.color || stops[0]?.color || '#31C3F3';
    const g = f.gradient || { angle: 180, stops: [{ offset: 0, color: base }, { offset: 100, color: '#165C74' }] };
    onChange({ type: t, ...(t === 'solid' ? { color: base } : {}), ...(['linear', 'radial', 'angular', 'diamond'].includes(t) ? { gradient: g } : {}) });
  };
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    e.target.value = '';
    if (!fl) return;
    if (f.type === 'video') { putAsset(fl).then(src => onChange({ videoSrc: src })); return; }
    const r = new FileReader();
    r.onload = () => onChange({ imageSrc: r.result as string });
    r.readAsDataURL(fl);
  };
  return (
    <div className="mt-1.5 mb-1 space-y-2 bg-[rgba(235,235,236,0.02)] p-2 rounded-lg border border-[rgba(235,235,236,0.08)]">
      <div className="flex flex-wrap gap-1">
        {TYPES.filter(([t]) => !(letters && t === 'video')).map(([t, label]) => (
          <button key={t} onClick={() => setType(t)}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${f.type === t ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Icons.Blend size={12} className="text-[rgba(235,235,236,0.4)] shrink-0" />
        <BlendPicker value={f.blendMode} onPick={m => onChange({ blendMode: m })} onPreview={m => preview(m ? { blendMode: m } : null)}
                     className={`${sel} flex-1`} title="This paint's blend mode - hover a mode to see it" />
        <button disabled={!canUp} onClick={() => move(-1)} className={`${iconBtn} disabled:opacity-25`} title="Move up (paints over)"><Icons.ArrowUp size={12} /></button>
        <button disabled={!canDown} onClick={() => move(1)} className={`${iconBtn} disabled:opacity-25`} title="Move down"><Icons.ArrowDown size={12} /></button>
      </div>

      {f.type === 'solid' && (
        <div className="flex items-center gap-2">
          <input type="color" value={hex6(f.color)} onChange={e => onChange({ color: e.target.value })} className="w-7 h-7 rounded cursor-pointer bg-transparent" />
          <input value={f.color || ''} onChange={e => onChange({ color: e.target.value })} className={`${sel} flex-1 font-mono`} />
        </div>
      )}

      {isGrad && (
        <>
          {(f.type === 'linear' || f.type === 'angular') && (
            <label className="flex items-center gap-2 text-[11px] text-[rgba(235,235,236,0.5)]">
              Angle
              <NumberInput max={360} value={f.gradient?.angle ?? 180} onChange={e => onChange({ gradient: { stops, angle: Number(e.target.value) } })} className={`${sel} w-16 font-mono`} />
              <span>°</span>
            </label>
          )}
          {/* the stops, left to right */}
          <div className="h-3 rounded" style={{ background: `linear-gradient(90deg, ${stops.map(st => `${st.color} ${st.offset}%`).join(', ')})` }} />
          {stops.map((st, k) => (
            <div key={k} className="flex items-center gap-1.5">
              <input type="color" value={hex6(st.color)} onChange={e => onChange({ gradient: { ...f.gradient, stops: stops.map((x, j) => j === k ? { ...x, color: e.target.value } : x) } })}
                     className="w-6 h-6 rounded cursor-pointer bg-transparent" />
              <input value={st.color} onChange={e => onChange({ gradient: { ...f.gradient, stops: stops.map((x, j) => j === k ? { ...x, color: e.target.value } : x) } })}
                     className={`${sel} flex-1 min-w-0 font-mono`} />
              <NumberInput min={0} max={100} value={st.offset} title="Position (%)"
                           onChange={e => onChange({ gradient: { ...f.gradient, stops: stops.map((x, j) => j === k ? { ...x, offset: Number(e.target.value) } : x).sort((a, b) => a.offset - b.offset) } })}
                           className={`${sel} w-12 font-mono text-right`} />
              <button disabled={stops.length < 3} onClick={() => onChange({ gradient: { ...f.gradient, stops: stops.filter((_, j) => j !== k) } })}
                      className={`${iconBtn} disabled:opacity-25`} title="Remove stop"><Icons.Minus size={11} /></button>
            </div>
          ))}
          <button onClick={() => onChange({ gradient: { ...f.gradient, stops: [...stops, { offset: 50, color: '#ffffff' }].sort((a, b) => a.offset - b.offset) } })}
                  className="text-[10px] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)] flex items-center gap-1">
            <Icons.Plus size={11} /> Add stop
          </button>
        </>
      )}

      {(f.type === 'image' || f.type === 'video') && (
        <>
          <div className="flex items-center gap-2">
            <button onClick={() => file.current?.click()} className={`${sel} flex-1 flex items-center justify-center gap-1.5 py-1.5`}>
              <Icons.Upload size={12} /> {(f.type === 'image' ? f.imageSrc : f.videoSrc) ? 'Replace' : 'Choose'} {f.type}
            </button>
            <select value={f.fit || 'fill'} onChange={e => onChange({ fit: e.target.value as FillLayer['fit'] })} className={sel} title="How it sits in the box">
              <option value="fill" className="bg-[rgb(20,20,19)]">Fill</option>
              <option value="fit" className="bg-[rgb(20,20,19)]">Fit</option>
              {f.type === 'image' && <option value="tile" className="bg-[rgb(20,20,19)]">Tile</option>}
            </select>
          </div>
          <input ref={file} type="file" accept={f.type === 'image' ? 'image/*' : 'video/*'} onChange={upload} className="hidden" />
          {f.type === 'image' && (
            <input placeholder="or paste an image URL" value={f.imageSrc?.startsWith('data:') ? '' : f.imageSrc || ''}
                   onChange={e => onChange({ imageSrc: e.target.value })} className={`${sel} w-full font-mono`} />
          )}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- strokes

export const StrokesSection: React.FC<{ element: UIElement; update: (s: Partial<ElementStyle>) => void }> = ({ element, update }) => {
  const strokes = strokesOf(element);
  // one plain inside stroke stays the simple border; more are a list
  const save = (next: StrokeLayer[]) => {
    const one = next.length === 1 && next[0].visible && next[0].opacity >= 1 && next[0].position === 'inside' && !blended(next[0]);
    if (!next.length) update({ strokes: undefined, borderWidth: 0 });
    else if (one) update({ strokes: undefined, borderWidth: next[0].width, borderColor: next[0].color, borderStyle: next[0].style });
    else update({ strokes: next, borderWidth: 0 });
  };
  const patch = (id: string, p: Partial<StrokeLayer>) => save(strokes.map(s => s.id === id ? { ...s, ...p } : s));
  return (
    <Section title="Stroke" addTitle="Add a stroke on top"
             onAdd={() => save([{ id: uid(), color: '#ebebec', width: 1, position: 'inside', style: 'solid', opacity: 1, visible: true }, ...strokes])}>
      {strokes.map(s => (
        <div key={s.id} className={`space-y-1 ${s.visible ? '' : 'opacity-45'}`}>
          <div className="flex items-center gap-1.5">
            <input type="color" value={hex6(s.color)} onChange={e => patch(s.id, { color: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent shrink-0" />
            <input value={s.color} onChange={e => patch(s.id, { color: e.target.value })} className="flex-1 min-w-0 bg-transparent text-[rgb(235,235,236)] font-mono text-xs outline-none" />
            <div className="flex items-center w-14 bg-[rgba(235,235,236,0.04)] rounded px-1 border border-[rgba(235,235,236,0.08)]" title="Opacity">
              <NumberInput min={0} max={100} value={Math.round(s.opacity * 100)} onChange={e => patch(s.id, { opacity: Number(e.target.value) / 100 })}
                           className="w-full bg-transparent text-[rgb(235,235,236)] font-mono text-[11px] outline-none text-right" />
              <span className="text-[9px] text-[rgba(235,235,236,0.4)]">%</span>
            </div>
            <BlendPicker icon value={s.blendMode} onPick={m => patch(s.id, { blendMode: m })} className={iconBtn}
                         onPreview={m => useProjectStore.setState({ stylePreview: m ? { ids: [element.id], style: { strokes: strokes.map(x => x.id === s.id ? { ...x, blendMode: m } : x) } } : null })}
                         title="This stroke's blend mode - hover a mode to see it" />
            <button onClick={() => patch(s.id, { visible: !s.visible })} className={iconBtn} title={s.visible ? 'Hide' : 'Show'}>
              {s.visible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
            </button>
            <button onClick={() => save(strokes.filter(x => x.id !== s.id))} className={iconBtn} title="Remove"><Icons.Minus size={12} /></button>
          </div>
          <div className="flex items-center gap-1.5 pl-7">
            <select value={s.position} onChange={e => patch(s.id, { position: e.target.value as StrokeLayer['position'] })} className={sel} title="Where the stroke sits on the edge">
              <option value="inside" className="bg-[rgb(20,20,19)]">Inside</option>
              <option value="center" className="bg-[rgb(20,20,19)]">Center</option>
              <option value="outside" className="bg-[rgb(20,20,19)]">Outside</option>
            </select>
            <div className="flex items-center w-14 bg-[rgba(235,235,236,0.04)] rounded px-1 border border-[rgba(235,235,236,0.08)]" title="Weight">
              <Icons.Minus size={10} className="text-[rgba(235,235,236,0.4)]" />
              <NumberInput min={0} value={s.width} onChange={e => patch(s.id, { width: Number(e.target.value) })}
                           className="w-full bg-transparent text-[rgb(235,235,236)] font-mono text-[11px] outline-none text-right" />
            </div>
            <select value={s.style} onChange={e => patch(s.id, { style: e.target.value as StrokeLayer['style'] })} className={`${sel} flex-1`}>
              <option value="solid" className="bg-[rgb(20,20,19)]">Solid</option>
              <option value="dashed" className="bg-[rgb(20,20,19)]">Dashed</option>
              <option value="dotted" className="bg-[rgb(20,20,19)]">Dotted</option>
            </select>
          </div>
        </div>
      ))}
    </Section>
  );
};

// ----------------------------------------------------------------- export

const SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4];

export const ExportSection: React.FC<{ name: string; exports?: ExportSetting[]; onChange: (e: ExportSetting[]) => void; node: () => HTMLElement | null; background?: string }> =
  ({ name, exports = [], onChange, node, background }) => {
  const [busy, setBusy] = useState(false);
  const patch = (id: string, p: Partial<ExportSetting>) => onChange(exports.map(x => x.id === id ? { ...x, ...p } : x));
  const go = async () => {
    const n = node();
    if (!n || !exports.length) return;
    setBusy(true);
    try { await exportLayer(n, name, exports, background); } finally { setBusy(false); }
  };
  return (
    <Section title="Export" addTitle="Add an export size / format"
             onAdd={() => onChange([...exports, { id: uid(), scale: exports.length ? 2 : 1, suffix: exports.length ? '@2x' : '', format: 'PNG' }])}>
      {exports.map(x => (
        <div key={x.id} className="flex items-center gap-1.5">
          <select value={x.format === 'PDF' || x.format === 'SVG' ? 1 : x.scale} disabled={x.format === 'PDF' || x.format === 'SVG'}
                  onChange={e => patch(x.id, { scale: Number(e.target.value) })} className={`${sel} w-16`} title="Scale">
            {SCALES.map(s => <option key={s} value={s} className="bg-[rgb(20,20,19)]">{s}x</option>)}
          </select>
          <input value={x.suffix} placeholder="Suffix" onChange={e => patch(x.id, { suffix: e.target.value })} className={`${sel} flex-1 min-w-0`} />
          <select value={x.format} onChange={e => patch(x.id, { format: e.target.value as ExportSetting['format'] })} className={sel}>
            {['PNG', 'JPG', 'SVG', 'PDF'].map(f => <option key={f} value={f} className="bg-[rgb(20,20,19)]">{f}</option>)}
          </select>
          <button onClick={() => onChange(exports.filter(e => e.id !== x.id))} className={iconBtn} title="Remove"><Icons.Minus size={12} /></button>
        </div>
      ))}
      {exports.length > 0 && (
        <button onClick={go} disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] text-xs font-semibold border border-[rgba(235,235,236,0.08)] disabled:opacity-50">
          <Icons.Download size={13} /> {busy ? 'Exporting…' : `Export ${name}`}
        </button>
      )}
    </Section>
  );
};
