import { NumberInput } from './NumberInput';
import React, { useState, useRef } from 'react';
import { UIElement, DeviceFrame, SectionFrame } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import * as Icons from 'lucide-react';
import { FontPicker, WeightPicker } from './FontPicker';
import { ExportSection, FillsSection, StrokesSection } from './PaintSections';
import { BlendPicker } from './BlendPicker';
import { PaddingFields } from './PaddingFields';
import { familyOf, findFont, fontStack } from '../../lib/fonts';
import { textResizeOf } from '../../lib/styleCss';
import { inFlow as treeInFlow } from '../../lib/tree';
import { BOOLEANABLE } from '../../lib/boolean';

const BOOL_OPS = [
  ['union', 'Union', Icons.SquaresUnite, 'U'], ['subtract', 'Subtract', Icons.SquaresSubtract, 'S'],
  ['intersect', 'Intersect', Icons.SquaresIntersect, 'I'], ['exclude', 'Exclude', Icons.SquaresExclude, 'X']
] as const;
import { AutoLayoutSettings, EffectLayer } from '../../types/components';


// A small Fixed / Hug / Fill menu, as in Figma's W and H fields.
const SizingSelect: React.FC<{ value: string; options: ('fixed' | 'hug' | 'fill')[]; onChange: (v: 'fixed' | 'hug' | 'fill') => void }> =
  ({ value, options, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value as any)} title="How this side is sized"
          className="bg-transparent text-[10px] text-[rgba(235,235,236,0.55)] outline-none cursor-pointer ml-1 shrink-0">
    {options.map(o => <option key={o} value={o} className="bg-[rgb(20,20,19)]">{o === 'fixed' ? 'Fixed' : o === 'hug' ? 'Hug' : 'Fill'}</option>)}
  </select>
);

// Auto layout alignment as Figma shows it: a 3 x 3 grid - left / centre /
// right by top / middle / bottom - whichever way the row or column runs,
// and "Space between" to spread them along it.
const AlignGrid: React.FC<{ al: AutoLayoutSettings; onChange: (u: Partial<AutoLayoutSettings>) => void }> = ({ al, onChange }) => {
  const row = al.direction === 'horizontal';
  const idx = { start: 0, center: 1, end: 2 } as const;
  const keys = ['start', 'center', 'end'] as const;
  const main = al.align === 'spaceBetween' ? -1 : idx[al.align as 'start'];
  const cross = idx[al.alignCross || 'start'];
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-3 gap-0.5 p-1 rounded-lg bg-[rgba(235,235,236,0.04)] border border-[rgba(235,235,236,0.08)]" title="Where the contents sit in the frame">
        {[0, 1, 2].map(r => [0, 1, 2].map(c => {
          // a row runs left to right (columns = along it); a column runs down
          const m = row ? c : r, x = row ? r : c;
          const on = (main === m || main === -1) && cross === x;
          return (
            <button key={`${r}${c}`} onClick={() => onChange({ align: al.align === 'spaceBetween' ? 'spaceBetween' : keys[m], alignCross: keys[x] })}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[rgba(235,235,236,0.1)]">
              <span className={`rounded-full ${on ? 'w-2 h-2 bg-[#ff6b4a]' : 'w-1 h-1 bg-[rgba(235,235,236,0.35)]'}`} />
            </button>
          );
        }))}
      </div>
      <button onClick={() => onChange({ align: al.align === 'spaceBetween' ? 'start' : 'spaceBetween' })}
              className={`px-2 py-1 rounded text-[10px] font-bold ${al.align === 'spaceBetween' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]'}`}>
        Space between
      </button>
    </div>
  );
};

const EFFECT_LABEL: Record<EffectLayer['type'], string> = {
  dropShadow: 'Drop shadow', innerShadow: 'Inner shadow', layerBlur: 'Layer blur', backgroundBlur: 'Background blur',
  extrude: 'Extrude (solid 3D)'
};

// The effects list: any number of shadows and blurs, each with an eye and a remove.
const EffectsSection: React.FC<{ element: UIElement }> = ({ element }) => {
  const { updateElementStyle } = useProjectStore(useShallow((s) => ({ updateElementStyle: s.updateElementStyle })));
  const fx = element.style.effects || [];
  const set = (next: EffectLayer[]) => updateElementStyle(element.id, { effects: next });
  const patch = (id: string, p: Partial<EffectLayer>) => set(fx.map(e => e.id === id ? { ...e, ...p } : e));
  const add = () => set([...fx, { id: `fx-${Date.now()}`, type: 'dropShadow', x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0, 0, 0, 0.25)', visible: true }]);
  const num = (e: EffectLayer, key: 'x' | 'y' | 'blur' | 'spread', label: string) => (
    <label className="flex items-center gap-1 bg-[rgba(235,235,236,0.04)] rounded px-1.5 py-1 border border-[rgba(235,235,236,0.08)]">
      <span className="text-[9px] text-[rgba(235,235,236,0.4)]">{label}</span>
      <NumberInput signed={key === 'x' || key === 'y'} value={(e[key] as number) ?? 0} onChange={ev => patch(e.id, { [key]: Number(ev.target.value) })}
                   className="bg-transparent outline-none w-full font-mono text-[11px] text-[rgb(235,235,236)]" />
    </label>
  );
  return (
    <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Effects</span>
        <button onClick={add} title="Add effect" className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]">
          <Icons.Plus size={13} />
        </button>
      </div>
      <div className="space-y-2">
        {fx.map(e => {
          const shadow = e.type === 'dropShadow' || e.type === 'innerShadow';
          return (
            <div key={e.id} className={`space-y-1.5 bg-[rgba(235,235,236,0.02)] p-2 rounded-lg border border-[rgba(235,235,236,0.08)] ${e.visible ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-1.5">
                <select value={e.type} onChange={ev => {
                          const type = ev.target.value as EffectLayer['type'];
                          // an extrusion starts as a solid, hard-edged block
                          patch(e.id, type === 'extrude' && e.type !== 'extrude'
                            ? { type, x: 6, y: 6, blur: 0, color: '#141413' } : { type });
                        }}
                        className="bg-transparent text-xs text-[rgb(235,235,236)] outline-none flex-1 cursor-pointer">
                  {(Object.keys(EFFECT_LABEL) as EffectLayer['type'][]).map(t => <option key={t} value={t} className="bg-[rgb(20,20,19)]">{EFFECT_LABEL[t]}</option>)}
                </select>
                <button onClick={() => patch(e.id, { visible: !e.visible })} title={e.visible ? 'Hide' : 'Show'}
                        className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)]">
                  {e.visible ? <Icons.Eye size={12} /> : <Icons.EyeOff size={12} />}
                </button>
                <button onClick={() => set(fx.filter(x => x.id !== e.id))} title="Remove"
                        className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)]">
                  <Icons.Minus size={12} />
                </button>
              </div>
              {e.type === 'extrude' ? (
                <>
                  <div className="grid grid-cols-2 gap-1" title="Depth: how far back the block goes, and which way">{num(e, 'x', 'X')}{num(e, 'y', 'Y')}</div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={toHex(parseColorToRgba(e.color))} title="Sides facing left / right"
                           onChange={ev => patch(e.id, { color: ev.target.value })}
                           className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                    <span className="text-[10px] text-[rgba(235,235,236,0.45)]">{e.color2 ? 'Sides' : 'Colour'}</span>
                    {e.color2 ? (
                      <>
                        <input type="color" value={toHex(parseColorToRgba(e.color2))} title="Faces facing up / down"
                               onChange={ev => patch(e.id, { color2: ev.target.value })}
                               className="w-6 h-6 rounded cursor-pointer bg-transparent ml-1" />
                        <span className="text-[10px] text-[rgba(235,235,236,0.45)]">Top / bottom</span>
                        <button onClick={() => patch(e.id, { color2: undefined })} title="One colour all round"
                                className="ml-auto p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.5)]"><Icons.X size={11} /></button>
                      </>
                    ) : (
                      <button onClick={() => patch(e.id, { color2: '#31C3F3' })}
                              className="ml-auto text-[10px] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)] flex items-center gap-1"
                              title="Shade the faces that face up / down in a second colour - curves blend between the two">
                        <Icons.Plus size={10} /> Second colour
                      </button>
                    )}
                  </div>
                </>
              ) : shadow ? (
                <>
                  <div className="grid grid-cols-4 gap-1">{num(e, 'x', 'X')}{num(e, 'y', 'Y')}{num(e, 'blur', 'B')}{num(e, 'spread', 'S')}</div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={toHex(parseColorToRgba(e.color))}
                           onChange={ev => patch(e.id, { color: toRgbaString({ ...parseColorToRgba(ev.target.value), a: parseColorToRgba(e.color).a }) })}
                           className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                    <ColorAlphaSlider color={e.color} onChange={c => patch(e.id, { color: c })} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-1">{num(e, 'blur', 'Blur')}</div>
              )}
            </div>
          );
        })}
        {!fx.length && !element.style.boxShadow && !element.style.backdropBlur && (
          <div className="text-[10px] text-[rgba(235,235,236,0.35)]">Shadows, solid 3D extrusions, layer blur, background (glass) blur</div>
        )}
        {(element.style.boxShadow || element.style.backdropBlur) ? (
          <button onClick={() => updateElementStyle(element.id, { boxShadow: undefined, backdropBlur: undefined })}
                  className="text-[10px] text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]">
            Remove older shadow / glass setting
          </button>
        ) : null}
      </div>
    </div>
  );
};

interface DesignPropertiesProps {
  element?: UIElement;
  frame?: DeviceFrame;
  section?: SectionFrame;
}

// Native <input type="color"> can't express alpha at all — it silently drops
// it. These helpers let fill/stroke colors carry a real alpha channel as an
// rgba() string while still feeding the native picker a plain 6-digit hex.
const parseColorToRgba = (color: string | undefined): { r: number; g: number; b: number; a: number } => {
  if (!color) return { r: 235, g: 235, b: 236, a: 1 };
  const rgbaMatch = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1
    };
  }
  const hex = color.replace('#', '');
  if (hex.length === 6 || hex.length === 3) {
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1
    };
  }
  return { r: 235, g: 235, b: 236, a: 1 };
};

const toHex = ({ r, g, b }: { r: number; g: number; b: number }): string =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

const toRgbaString = ({ r, g, b, a }: { r: number; g: number; b: number; a: number }): string =>
  a >= 1 ? toHex({ r, g, b }) : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 100) / 100})`;

// Compact alpha (opacity) slider shown next to a fill/stroke color picker.
const ColorAlphaSlider: React.FC<{ color: string | undefined; onChange: (next: string) => void }> = ({ color, onChange }) => {
  const { a } = parseColorToRgba(color);
  return (
    <div className="flex items-center gap-1.5 shrink-0" title="Fill opacity (alpha) — not supported by the native color swatch">
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(a * 100)}
        onChange={(e) => {
          const rgba = parseColorToRgba(color);
          onChange(toRgbaString({ ...rgba, a: Number(e.target.value) / 100 }));
        }}
        className="w-14 accent-[rgb(235,235,236)]"
      />
      <span className="text-[10px] text-[rgba(235,235,236,0.45)] font-mono w-8 text-right">
        {Math.round(a * 100)}%
      </span>
    </div>
  );
};

// Small popover button that lets a color field bind to (or unbind from) a
// design variable. Shown next to any color input that supports token binding.
const VariableBindButton: React.FC<{
  elementId: string;
  styleKey: 'fillColor' | 'textColor' | 'borderColor';
  boundVariableId?: string;
}> = ({ elementId, styleKey, boundVariableId }) => {
  const { variables, bindStyleToVariable, unbindStyleVariable } = useProjectStore(useShallow((s) => ({ variables: s.variables, bindStyleToVariable: s.bindStyleToVariable, unbindStyleVariable: s.unbindStyleVariable })));
  const [open, setOpen] = useState(false);
  const colorVars = variables.filter(v => v.type === 'color');
  const boundVar = boundVariableId ? variables.find(v => v.id === boundVariableId) : undefined;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        title={boundVar ? `Bound to "${boundVar.name}"` : 'Bind to a color variable'}
        className={`p-1.5 rounded-lg border transition-colors ${
          boundVar
            ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] border-[rgb(235,235,236)]'
            : 'bg-[rgba(235,235,236,0.04)] text-[rgba(235,235,236,0.5)] border-[rgba(235,235,236,0.08)] hover:text-[rgb(235,235,236)]'
        }`}
      >
        <Icons.Variable size={12} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl p-1.5 z-50 space-y-0.5">
          {colorVars.length === 0 && (
            <div className="text-[10px] text-[rgba(235,235,236,0.4)] px-2 py-2 text-center">
              No color variables yet — add one in the Tokens tab.
            </div>
          )}
          {colorVars.map(v => (
            <button
              key={v.id}
              onClick={() => {
                bindStyleToVariable(elementId, styleKey, v.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                boundVariableId === v.id
                  ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] font-semibold'
                  : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)]'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-[rgba(235,235,236,0.2)] shrink-0"
                style={{ backgroundColor: v.value as string }}
              />
              <span className="truncate">{v.name}</span>
            </button>
          ))}
          {boundVar && (
            <button
              onClick={() => {
                unbindStyleVariable(elementId, styleKey);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:bg-[rgba(235,235,236,0.08)] border-t border-[rgba(235,235,236,0.08)] mt-0.5 pt-1.5"
            >
              <Icons.Unlink size={12} />
              <span>Detach from "{boundVar.name}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Compact editor for hover/pressed style overrides on the selected element.
// These apply automatically in the Prototype player — no wiring required.
const InteractiveStatesSection: React.FC<{ element: UIElement }> = ({ element }) => {
  const { updateElementState, clearElementState } = useProjectStore(useShallow((s) => ({ updateElementState: s.updateElementState, clearElementState: s.clearElementState })));
  const [openState, setOpenState] = useState<'hover' | 'pressed' | null>(null);

  const renderStateEditor = (key: 'hover' | 'pressed') => {
    const override = element.states?.[key] || {};
    const base = element.style;
    return (
      <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)] mt-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Fill Color</span>
          <input
            type="color"
            value={override.fillColor ?? base.fillColor ?? '#ebebec'}
            onChange={(e) => updateElementState(element.id, key, { fillColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer bg-transparent"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Text Color</span>
          <input
            type="color"
            value={override.textColor ?? base.textColor ?? '#ebebec'}
            onChange={(e) => updateElementState(element.id, key, { textColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer bg-transparent"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Opacity</span>
          <NumberInput
            min="0"
            max="100"
            value={Math.round((override.opacity ?? base.opacity ?? 1) * 100)}
            onChange={(e) => updateElementState(element.id, key, { opacity: Number(e.target.value) / 100 })}
            className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
          />
        </div>
        {element.states?.[key] && (
          <button
            onClick={() => clearElementState(element.id, key)}
            className="w-full text-[10px] text-rose-400 hover:text-rose-300 py-1 flex items-center justify-center gap-1"
          >
            <Icons.X size={10} /> Clear {key} override
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
      <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
        Interactive States
      </div>
      <div className="flex bg-[rgba(235,235,236,0.06)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
        {(['hover', 'pressed'] as const).map(key => (
          <button
            key={key}
            onClick={() => setOpenState(openState === key ? null : key)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              openState === key
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                : element.states?.[key]
                ? 'text-[rgb(235,235,236)]'
                : 'text-[rgba(235,235,236,0.5)]'
            }`}
          >
            {element.states?.[key] && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b4a]" />}
            {key === 'hover' ? 'Hover' : 'Pressed'}
          </button>
        ))}
      </div>
      {openState && renderStateEditor(openState)}
    </div>
  );
};

export const DesignProperties: React.FC<DesignPropertiesProps> = ({ element, frame, section }) => {
  const {
    frames,
    variables,
    updateElementStyle,
    updateElementSemanticProps,
    updateFrame,
    updateSection,
    alignSelectedElements,
    toggleAutoLayout,
    updateAutoLayout,
    createMasterComponent,
    instantiateComponent,
    detachInstance,
    bringToFront,
    sendToBack,
    booleanSelection
  } = useProjectStore(useShallow((s) => ({ booleanSelection: s.booleanSelection, frames: s.frames, variables: s.variables, updateElementStyle: s.updateElementStyle, updateElementSemanticProps: s.updateElementSemanticProps, updateFrame: s.updateFrame, updateSection: s.updateSection, alignSelectedElements: s.alignSelectedElements, toggleAutoLayout: s.toggleAutoLayout, updateAutoLayout: s.updateAutoLayout, createMasterComponent: s.createMasterComponent, instantiateComponent: s.instantiateComponent, detachInstance: s.detachInstance, bringToFront: s.bringToFront, sendToBack: s.sendToBack })));

  const [isIndividualCorners, setIsIndividualCorners] = useState(false);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  const handleImageFillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !element) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateElementSemanticProps(element.id, { src: reader.result as string });
    };
    reader.readAsDataURL(file);
  };
  const [copiedCss, setCopiedCss] = useState(false);

  if (!element && !frame && !section) {
    return (
      <div className="p-6 text-center text-[rgba(235,235,236,0.4)] text-xs space-y-3 select-none">
        <Icons.Sliders size={24} className="mx-auto opacity-30 text-[rgb(235,235,236)]" />
        <p className="font-medium text-[rgb(235,235,236)]">No Selection</p>
        <p className="text-[11px] opacity-70">
          Select a frame, section, shape, or UI component to inspect and edit layout, fills, strokes, effects, and typography.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // 1. FRAME / SCREEN INSPECTOR
  // ----------------------------------------------------
  if (frame) {
    return (
      <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
        {/* Alignment & Screen Geometry */}
        <div>
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            {frame.isGroup ? 'Group' : 'Screen Dimensions'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">X</span>
              <NumberInput signed
                value={frame.x}
                onChange={(e) => updateFrame(frame.id, { x: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">Y</span>
              <NumberInput signed
                value={frame.y}
                onChange={(e) => updateFrame(frame.id, { y: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">W</span>
              <NumberInput
                value={frame.width}
                onChange={(e) => { updateFrame(frame.id, { width: Number(e.target.value) }); if (frame.autoLayout?.sizingH === 'hug') updateAutoLayout(frame.id, { sizingH: 'fixed' }); }}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
              {frame.autoLayout?.enabled && (
                <SizingSelect value={frame.autoLayout.sizingH || 'fixed'} options={['fixed', 'hug']} onChange={v => updateAutoLayout(frame.id, { sizingH: v })} />
              )}
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">H</span>
              <NumberInput
                value={frame.height}
                onChange={(e) => { updateFrame(frame.id, { height: Number(e.target.value) }); if (frame.autoLayout?.sizingV === 'hug') updateAutoLayout(frame.id, { sizingV: 'fixed' }); }}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
              {frame.autoLayout?.enabled && (
                <SizingSelect value={frame.autoLayout.sizingV || 'fixed'} options={['fixed', 'hug']} onChange={v => updateAutoLayout(frame.id, { sizingV: v })} />
              )}
            </div>
          </div>
          {frame.autoLayout?.enabled && (
            <PaddingFields key={frame.id} value={frame.autoLayout.padding} onChange={padding => updateAutoLayout(frame.id, { padding })} />
          )}
        </div>

        {/* Screen Auto Layout */}
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Auto Layout</span>
            <button
              onClick={() => toggleAutoLayout(frame.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                frame.autoLayout?.enabled
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                  : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
              }`}
            >
              {frame.autoLayout?.enabled ? 'Active' : '+ Add'}
            </button>
          </div>

          {frame.autoLayout?.enabled && (
            <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Direction</span>
                <div className="flex bg-[rgba(235,235,236,0.06)] rounded p-0.5 border border-[rgba(235,235,236,0.08)]">
                  <button
                    onClick={() => updateAutoLayout(frame.id, { direction: 'horizontal' })}
                    className={`px-2 py-1 rounded text-[10px] ${
                      frame.autoLayout.direction === 'horizontal' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    onClick={() => updateAutoLayout(frame.id, { direction: 'vertical' })}
                    className={`px-2 py-1 rounded text-[10px] ${
                      frame.autoLayout.direction === 'vertical' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                    }`}
                  >
                    Vertical
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Item Gap</span>
                <NumberInput
                  value={frame.autoLayout.gap}
                  onChange={(e) => updateAutoLayout(frame.id, { gap: Number(e.target.value) })}
                  className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Align</span>
                <AlignGrid al={frame.autoLayout} onChange={(u) => updateAutoLayout(frame.id, u)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Wrap</span>
                <button
                  onClick={() => updateAutoLayout(frame.id, { wrap: !frame.autoLayout!.wrap })}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    frame.autoLayout.wrap
                      ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                      : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
                  }`}
                >
                  {frame.autoLayout.wrap ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clip Content */}
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider" title="When off, content extending past this screen's edges stays visible instead of being cut off">
              Clip Content
            </span>
            <button
              onClick={() => updateFrame(frame.id, { clipContent: frame.clipContent === false })}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                frame.clipContent !== false
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                  : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
              }`}
            >
              {frame.clipContent !== false ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <ExportSection name={frame.name} exports={frame.exports} onChange={(ex) => updateFrame(frame.id, { exports: ex })}
                       node={() => document.querySelector(`[data-frame-body="${frame.id}"]`)} background={frame.backgroundColor} />

        {/* Screen Background Color */}
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            {frame.isGroup ? 'Fill' : 'Screen Background'}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={frame.backgroundColor || '#141413'}
              onChange={(e) => updateFrame(frame.id, { backgroundColor: e.target.value })}
              className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={frame.backgroundColor || '#141413'}
              onChange={(e) => updateFrame(frame.id, { backgroundColor: e.target.value })}
              className="bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] font-mono text-xs flex-1 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. SECTION INSPECTOR
  // ----------------------------------------------------
  if (section) {
    return (
      <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
          Section Properties
        </div>
        <div className="space-y-2">
          <label className="text-[11px] text-[rgba(235,235,236,0.55)]">Section Title</label>
          <input
            type="text"
            value={section.name}
            onChange={(e) => updateSection(section.id, { name: e.target.value })}
            className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono">W</span>
            <NumberInput
              value={section.width}
              onChange={(e) => updateSection(section.id, { width: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono">H</span>
            <NumberInput
              value={section.height}
              onChange={(e) => updateSection(section.id, { height: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. UI ELEMENT & VECTOR DESIGN INSPECTOR
  // ----------------------------------------------------
  const { style } = element!;

  // Copy CSS helper
  // Dev-mode CSS generation — reflects auto-layout, bound variables (as CSS
  // custom-property references), and hover/pressed states as real pseudo-classes.
  const generateCss = (): string => {
    if (!element) return '';
    const s = element.style;
    const bound = s.boundVariables || {};
    const varRef = (key: 'fillColor' | 'textColor' | 'borderColor', literal?: string) => {
      const varId = bound[key];
      const v = varId ? variables.find(x => x.id === varId) : null;
      return v ? `var(--${v.name}, ${literal})` : literal;
    };

    const baseLines = [
      `width: ${s.width}px;`,
      `height: ${s.height}px;`,
      s.fillColor ? `background-color: ${varRef('fillColor', s.fillColor)};` : '',
      s.borderColor ? `border: ${s.borderWidth || 1}px solid ${varRef('borderColor', s.borderColor)};` : '',
      s.borderRadius ? `border-radius: ${typeof s.borderRadius === 'number' ? `${s.borderRadius}px` : `${s.borderRadius.tl}px ${s.borderRadius.tr}px ${s.borderRadius.br}px ${s.borderRadius.bl}px`};` : '',
      s.opacity !== undefined ? `opacity: ${s.opacity};` : '',
      s.boxShadow ? `box-shadow: ${s.boxShadow};` : '',
      s.padding ? `padding: ${s.padding.top}px ${s.padding.right}px ${s.padding.bottom}px ${s.padding.left}px;` : '',
      s.display === 'flex' ? 'display: flex;' : '',
      s.display === 'flex' && s.flexDirection ? `flex-direction: ${s.flexDirection};` : '',
      s.display === 'flex' && s.gap ? `gap: ${s.gap}px;` : '',
      s.display === 'flex' && s.justifyContent ? `justify-content: ${s.justifyContent};` : '',
      s.display === 'flex' && s.alignItems ? `align-items: ${s.alignItems};` : '',
      s.fontFamily ? `font-family: ${s.fontFamily};` : '',
      s.fontSize ? `font-size: ${s.fontSize}px;` : '',
      s.fontWeight ? `font-weight: ${s.fontWeight};` : '',
      s.lineHeight ? `line-height: ${s.lineHeight};` : '',
      s.letterSpacing ? `letter-spacing: ${s.letterSpacing}px;` : '',
      s.textColor ? `color: ${varRef('textColor', s.textColor)};` : ''
    ].filter(Boolean);

    const indent = (lines: string[]) => lines.map(l => `  ${l}`).join('\n');
    let css = `.element {\n${indent(baseLines)}\n}`;

    (['hover', 'pressed'] as const).forEach(key => {
      const stateStyle = element.states?.[key];
      if (!stateStyle) return;
      const stateLines = [
        stateStyle.fillColor ? `background-color: ${stateStyle.fillColor};` : '',
        stateStyle.textColor ? `color: ${stateStyle.textColor};` : '',
        stateStyle.borderColor ? `border-color: ${stateStyle.borderColor};` : '',
        stateStyle.opacity !== undefined ? `opacity: ${stateStyle.opacity};` : ''
      ].filter(Boolean);
      if (stateLines.length === 0) return;
      const pseudo = key === 'hover' ? ':hover' : ':active';
      css += `\n\n.element${pseudo} {\n${indent(stateLines)}\n}`;
    });

    return css;
  };

  const handleCopyCss = () => {
    navigator.clipboard.writeText(generateCss());
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const cornerRadiusObj = typeof style.borderRadius === 'object' && style.borderRadius !== null
    ? style.borderRadius
    : { tl: Number(style.borderRadius) || 0, tr: Number(style.borderRadius) || 0, br: Number(style.borderRadius) || 0, bl: Number(style.borderRadius) || 0 };

  // Fill on plain text colours the letters, as in Figma. Only text with auto
  // layout has a box of its own, and then Fill is that box and the letters'
  // colour moves to Typography.
  // show a hovered font / weight on every selected text, without saving it
  const previewStyle = (st: Partial<typeof style> | null) => useProjectStore.setState({
    stylePreview: st ? { ids: useProjectStore.getState().selectedElementIds, style: st } : null
  });

  const textFill = (element!.type === 'text' || element!.type === 'heading') && !style.autoLayout?.enabled;
  const fillKey: 'fillColor' | 'textColor' = textFill ? 'textColor' : 'fillColor';

  // In an auto-layout frame, W and H each say Fixed, Hug (text) or Fill.
  const elements = useProjectStore.getState().elements;
  const inFlow = treeInFlow(element!, elements, frames);
  // a container with auto layout can hug what is inside it
  const ownAL = element!.type === 'container' && style.autoLayout?.enabled ? style.autoLayout : null;
  const isTextEl = element!.type === 'text' || element!.type === 'heading';
  const tMode = textResizeOf(style);
  const sizingOf = (axis: 'H' | 'V'): 'fixed' | 'hug' | 'fill' => {
    const v = axis === 'H' ? style.layoutSizingH : style.layoutSizingV;
    if (v === 'fill' && inFlow) return 'fill';
    if (ownAL && (axis === 'H' ? ownAL.sizingH : ownAL.sizingV) === 'hug') return 'hug';
    if (isTextEl && (tMode === 'auto' || (axis === 'V' && tMode === 'autoHeight'))) return 'hug';
    return 'fixed';
  };
  const setSizing = (axis: 'H' | 'V', v: 'fixed' | 'hug' | 'fill') => {
    if (ownAL) updateAutoLayout(element!.id, axis === 'H' ? { sizingH: v === 'hug' ? 'hug' : 'fixed' } : { sizingV: v === 'hug' ? 'hug' : 'fixed' });
    const upd: Partial<typeof style> = axis === 'H' ? { layoutSizingH: v === 'fill' ? 'fill' : 'fixed' } : { layoutSizingV: v === 'fill' ? 'fill' : 'fixed' };
    if (isTextEl) {
      const h = axis === 'H' ? v : sizingOf('H'), vv = axis === 'V' ? v : sizingOf('V');
      upd.textResize = h === 'hug' ? 'auto' : vv === 'hug' ? 'autoHeight' : 'fixed';
    }
    updateElementStyle(element!.id, upd);
  };
  const sizingOptions = (['fixed', 'hug', 'fill'] as const).filter(o =>
    o === 'fixed' || (o === 'hug' && (isTextEl || !!ownAL)) || (o === 'fill' && inFlow));

  return (
    <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] overflow-y-auto select-none">
      
      {/* 1. ALIGNMENT & DISTRIBUTION TOOLBAR */}
      <div className="flex items-center justify-between bg-[rgba(235,235,236,0.03)] p-1 rounded-xl border border-[rgba(235,235,236,0.08)]">
        <button
          onClick={() => alignSelectedElements('left')}
          title="Align Left"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignLeft size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('center')}
          title="Align Horizontal Center"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignCenter size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('right')}
          title="Align Right"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignRight size={13} />
        </button>
        <div className="h-3 w-px bg-[rgba(235,235,236,0.1)]" />
        <button
          onClick={() => alignSelectedElements('top')}
          title="Align Top"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignStartVertical size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('middle')}
          title="Align Vertical Center"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignCenterVertical size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('bottom')}
          title="Align Bottom"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignEndVertical size={13} />
        </button>
        <div className="h-3 w-px bg-[rgba(235,235,236,0.1)]" />
        <button
          onClick={() => bringToFront(element!.id)}
          title="Bring to Front"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.BringToFront size={13} />
        </button>
        <button
          onClick={() => sendToBack(element!.id)}
          title="Send to Back"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.SendToBack size={13} />
        </button>
      </div>

      {/* 1b. BOOLEANS - two or more shapes selected, or a boolean group */}
      {(() => {
        const st = useProjectStore.getState();
        const shapes = st.elements.filter(e => st.selectedElementIds.includes(e.id) && BOOLEANABLE.has(e.type));
        const op = element?.type === 'container' ? style.booleanOp : undefined;
        if (shapes.length < 2 && !op) return null;
        return (
          <div className="flex items-center gap-1 bg-[rgba(235,235,236,0.03)] p-1 rounded-xl border border-[rgba(235,235,236,0.08)]">
            <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider px-1.5 mr-auto">Boolean</span>
            <button onClick={() => useProjectStore.getState().flattenSelection()} title="Flatten into one editable vector (Ctrl+E)"
                    className="px-1.5 py-1 rounded text-[10px] font-semibold hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] mr-1">
              Flatten
            </button>
            {BOOL_OPS.map(([o, label, Ic, key]) => (
              <button key={o} onClick={() => booleanSelection(o)} title={`${label} (Ctrl+Alt+${key})`}
                      className={`p-1.5 rounded ${op === o ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
                <Ic size={14} />
              </button>
            ))}
          </div>
        );
      })()}

      {/* 2. MASTER COMPONENT BAR */}
      <div className="bg-[rgba(235,235,236,0.02)] p-2 rounded-xl border border-[rgba(235,235,236,0.08)]">
        {element?.isMasterComponent ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-[rgb(235,235,236)] text-[11px]">
              <span className="text-sm">❖</span> Master Component
            </span>
            <button
              onClick={() => instantiateComponent(element.id)}
              className="px-2 py-1 rounded bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              + Instance
            </button>
          </div>
        ) : element?.isInstance ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[rgba(235,235,236,0.7)] font-medium text-[11px]">
              <span className="text-sm">◇</span> Component Instance
            </span>
            <button
              onClick={() => detachInstance(element.id)}
              className="px-2 py-1 rounded bg-[rgba(235,235,236,0.08)] hover:bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] text-[10px] transition-colors"
            >
              Detach
            </button>
          </div>
        ) : (
          <button
            onClick={() => createMasterComponent(element!.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[rgba(235,235,236,0.04)] hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)] font-bold text-[11px] transition-colors border border-[rgba(235,235,236,0.06)]"
          >
            <span>❖</span>
            <span>Create Master Component</span>
          </button>
        )}
      </div>

      {/* 3. TRANSFORM & GEOMETRY */}
      <div>
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Dimensions & Position</span>
          <div className="flex items-center gap-1">
            {/* Flip Horizontal */}
            <button
              onClick={() => updateElementStyle(element!.id, { rotation: ((style.rotation || 0) + 180) % 360 })}
              title="Rotate 180°"
              className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]"
            >
              <Icons.RotateCw size={11} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">X</span>
            <NumberInput signed
              value={Number(style.x)}
              onChange={(e) => updateElementStyle(element!.id, { x: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">Y</span>
            <NumberInput signed
              value={Number(style.y)}
              onChange={(e) => updateElementStyle(element!.id, { y: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">W</span>
            <NumberInput
              value={Number(style.width)}
              onChange={(e) => updateElementStyle(element!.id, { width: Number(e.target.value), layoutSizingH: 'fixed', ...(isTextEl && tMode === 'auto' ? { textResize: 'autoHeight' as const } : {}) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
            {sizingOptions.length > 1 && <SizingSelect value={sizingOf('H')} options={sizingOptions} onChange={v => setSizing('H', v)} />}
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">H</span>
            <NumberInput
              value={Number(style.height)}
              onChange={(e) => updateElementStyle(element!.id, { height: Number(e.target.value), layoutSizingV: 'fixed', ...(isTextEl && tMode !== 'fixed' ? { textResize: 'fixed' as const } : {}) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
            {sizingOptions.length > 1 && <SizingSelect value={sizingOf('V')} options={sizingOptions} onChange={v => setSizing('V', v)} />}
          </div>
        </div>

        {style.autoLayout?.enabled && (
          <PaddingFields key={element!.id} value={style.autoLayout.padding} onChange={padding => updateAutoLayout(element!.id, { padding })} />
        )}

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">∠</span>
            <NumberInput max={360}
              value={style.rotation || 0}
              onChange={(e) => updateElementStyle(element!.id, { rotation: Number(e.target.value) })}
              placeholder="0°"
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">Opacity</span>
            <NumberInput
              min="0"
              max="100"
              value={Math.round((style.opacity ?? 1) * 100)}
              onChange={(e) => updateElementStyle(element!.id, { opacity: Number(e.target.value) / 100 })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
            <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono">%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
          <Icons.Blend size={12} className="text-[rgba(235,235,236,0.4)] shrink-0" />
          <BlendPicker value={style.blendMode} title="Layer blend mode - hover a mode to see it"
                       onPreview={(m) => previewStyle(m ? { blendMode: m } : null)}
                       onPick={(m) => updateElementStyle(element!.id, { blendMode: m })}
                       className="flex-1 text-xs text-[rgb(235,235,236)]" />
        </div>

        {/* Absolute Position — opt this child out of its parent frame's auto-layout flow */}
        {element && (() => {
          const parentFrame = frames.find(f => f.id === element.parentId);
          const parentBox = useProjectStore.getState().elements.find(e => e.id === element.parentId);
          if (!parentFrame?.autoLayout?.enabled && !parentBox?.style.autoLayout?.enabled) return null;
          return (
            <div className="flex items-center justify-between mt-2 bg-[rgba(235,235,236,0.02)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]" title="Take this element out of the auto-layout flow and position it freely with X/Y">
                Absolute Position
              </span>
              <button
                onClick={() => updateElementStyle(element.id, { absolutePosition: !style.absolutePosition })}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  style.absolutePosition
                    ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                    : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
                }`}
              >
                {style.absolutePosition ? 'On' : 'Off'}
              </button>
            </div>
          );
        })()}

        {/* Frames: Convert a shape into one; Clip content cuts what is inside
            at the frame's edge (its shape's edge, for a circle or a star) */}
        {element && (['rectangle', 'ellipse', 'polygon', 'star', 'vectorPath'].includes(element.type) || style.isGroup) && (
          <button onClick={() => useProjectStore.getState().convertToFrame()}
                  title={style.isGroup ? "Turn this group into a frame (Ctrl+Alt+F)" : "Turn this shape into a frame: things can go inside it, cut to its shape (Ctrl+Alt+F)"}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[rgba(235,235,236,0.04)] hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)] text-[11px] font-semibold border border-[rgba(235,235,236,0.08)]">
            <Icons.Frame size={12} /> Convert to frame
          </button>
        )}
        {element?.type === 'container' && !style.booleanOp && (
          <div className="flex items-center justify-between mt-2 bg-[rgba(235,235,236,0.02)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.5)] text-[11px]" title="Cut off anything inside that goes past the frame's edge">Clip content</span>
            <button
              onClick={() => updateElementStyle(element.id, { clipContent: !style.clipContent })}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${style.clipContent ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'}`}
            >
              {style.clipContent ? 'On' : 'Off'}
            </button>
          </div>
        )}

        {/* Clip Content — fixed-size text/heading only: clip + scroll overflow instead of spilling past the box */}
        {element && (element.type === 'text' || element.type === 'heading') && style.autoSize !== true && (
          <div className="flex items-center justify-between mt-2 bg-[rgba(235,235,236,0.02)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.5)] text-[11px]" title="When on, text that overflows this fixed box is clipped and scrollable instead of spilling past its edges">
              Clip Content
            </span>
            <button
              onClick={() => updateElementStyle(element.id, { clipContent: !style.clipContent })}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                style.clipContent
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                  : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
              }`}
            >
              {style.clipContent ? 'On' : 'Off'}
            </button>
          </div>
        )}

        {/* Corner Radius Controls (Uniform vs Individual) */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[rgba(235,235,236,0.5)]">Corner Radius</span>
            <button
              onClick={() => setIsIndividualCorners(!isIndividualCorners)}
              className={`p-1 rounded text-[10px] transition-colors ${
                isIndividualCorners ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] font-bold' : 'text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]'
              }`}
              title="Toggle Individual Corners"
            >
              <Icons.Square size={11} />
            </button>
          </div>

          {!isIndividualCorners ? (
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <Icons.CornerUpRight size={12} className="text-[rgba(235,235,236,0.4)] mr-2" />
              <NumberInput
                min={0}
                value={typeof style.borderRadius === 'number' ? style.borderRadius : cornerRadiusObj.tl}
                onChange={(e) => updateElementStyle(element!.id, { borderRadius: Number(e.target.value) })}
                placeholder="Radius px"
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {(['tl', 'tr', 'br', 'bl'] as const).map(corner => (
                <div key={corner} className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-md px-1.5 py-1 border border-[rgba(235,235,236,0.08)]">
                  <span className="text-[9px] font-mono text-[rgba(235,235,236,0.3)] uppercase mr-1">{corner}</span>
                  <NumberInput
                    min={0}
                    value={cornerRadiusObj[corner]}
                    onChange={(e) => updateElementStyle(element!.id, {
                      borderRadius: {
                        ...cornerRadiusObj,
                        [corner]: Number(e.target.value)
                      }
                    })}
                    className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. AUTO LAYOUT CONTROLS */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Auto Layout (Shift+A)</span>
          <button
            onClick={() => toggleAutoLayout(element!.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              style.autoLayout?.enabled
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {style.autoLayout?.enabled ? 'Active' : '+ Add'}
          </button>
        </div>

        {style.autoLayout?.enabled && (
          <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Direction</span>
              <div className="flex bg-[rgba(235,235,236,0.06)] rounded p-0.5 border border-[rgba(235,235,236,0.08)]">
                <button
                  onClick={() => updateAutoLayout(element!.id, { direction: 'horizontal' })}
                  className={`px-2 py-1 rounded text-[10px] ${
                    style.autoLayout.direction === 'horizontal' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => updateAutoLayout(element!.id, { direction: 'vertical' })}
                  className={`px-2 py-1 rounded text-[10px] ${
                    style.autoLayout.direction === 'vertical' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                  }`}
                >
                  Vertical
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Gap Spacing</span>
              <NumberInput
                value={style.autoLayout.gap}
                onChange={(e) => updateAutoLayout(element!.id, { gap: Number(e.target.value) })}
                className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Align</span>
              <AlignGrid al={style.autoLayout} onChange={(u) => updateAutoLayout(element!.id, u)} />
            </div>
          </div>
        )}
      </div>

      {/* 4b. INTERACTIVE STATES (hover / pressed overrides, live in Play mode) */}
      {element && <InteractiveStatesSection element={element} />}

      {/* 5. FILL - a list of paints, as in Figma */}
      <FillsSection element={element!} update={(st) => updateElementStyle(element!.id, st)}
                    extra={<VariableBindButton elementId={element!.id} styleKey={fillKey} boundVariableId={style.boundVariables?.[fillKey]} />} />

      {/* an image element's own picture */}
      {element!.type === 'image' && (
        <div className="space-y-1.5">
          <button onClick={() => imageUploadInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.1)] text-xs font-semibold">
            <Icons.Upload size={13} /> Replace image
          </button>
          <input ref={imageUploadInputRef} type="file" accept="image/*" onChange={handleImageFillUpload} className="hidden" />
          <input type="text" placeholder="or paste an image URL" value={element!.semanticProps.src?.startsWith('data:') ? '' : element!.semanticProps.src || ''}
                 onChange={(e) => updateElementSemanticProps(element!.id, { src: e.target.value })}
                 className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs font-mono" />
        </div>
      )}

      {/* 6. STROKE - a list too */}
      <StrokesSection element={element!} update={(st) => updateElementStyle(element!.id, st)} />

      {/* 7. EFFECTS */}
      {element && <EffectsSection element={element} />}

      {/* 7b. EXPORT */}
      <ExportSection name={element!.name} exports={style.exports} onChange={(ex) => updateElementStyle(element!.id, { exports: ex })}
                     node={() => document.querySelector(`[data-el-id="${element!.id}"]`)} />

      {/* 8. TYPOGRAPHY (IF TEXT-ENABLED) */}
      {element?.semanticProps.label !== undefined && (
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            Typography
          </div>
          <div className="space-y-2">
            <FontPicker
              value={style.fontFamily || '"Inter", sans-serif'}
              onPreview={(f) => previewStyle(f ? { fontFamily: fontStack(f) } : null)}
              onPick={(f) => {
                // keep the weight if the new font has it, else its nearest
                const w = Number(style.fontWeight) || 400;
                const near = f.weights.length ? f.weights.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a) : w;
                updateElementStyle(element!.id, { fontFamily: fontStack(f), fontWeight: near });
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
                <span className="text-[rgba(235,235,236,0.4)] mr-1.5 text-[10px]">Size</span>
                <NumberInput min={1}
                  value={style.fontSize || 16}
                  onChange={(e) => updateElementStyle(element!.id, { fontSize: Number(e.target.value) })}
                  className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
                />
              </div>

              {!textFill && <div className="flex items-center gap-1 bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]" title="Text colour">
                <span className="text-[rgba(235,235,236,0.4)] mr-1.5 text-[10px]">Text</span>
                <input
                  type="color"
                  value={toHex(parseColorToRgba(style.textColor || '#ebebec'))}
                  onChange={(e) => updateElementStyle(element!.id, { textColor: toRgbaString({ ...parseColorToRgba(e.target.value), a: parseColorToRgba(style.textColor).a }) })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent ml-auto"
                />
                <VariableBindButton elementId={element!.id} styleKey="textColor" boundVariableId={style.boundVariables?.textColor} />
              </div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]" title="Line height (blank = auto)">
                <Icons.ArrowUpDown size={11} className="text-[rgba(235,235,236,0.4)] mr-1.5 shrink-0" />
                <input value={style.lineHeight ?? ''} placeholder="Auto"
                       onChange={(e) => updateElementStyle(element!.id, { lineHeight: e.target.value === '' ? undefined : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) })}
                       className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs" />
              </label>
              <label className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]" title="Letter spacing (px)">
                <Icons.MoveHorizontal size={11} className="text-[rgba(235,235,236,0.4)] mr-1.5 shrink-0" />
                <NumberInput signed value={style.letterSpacing ?? 0} step="0.1"
                             onChange={(e) => updateElementStyle(element!.id, { letterSpacing: Number(e.target.value) })}
                             className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs" />
              </label>
            </div>

            {(element!.type === 'text' || element!.type === 'heading') && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 bg-[rgba(235,235,236,0.04)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
                  {([['auto', 'Auto width', Icons.MoveHorizontal], ['autoHeight', 'Auto height', Icons.MoveVertical], ['fixed', 'Fixed size', Icons.Square]] as const).map(([m, label, Ic]) => (
                    <button key={m} title={label}
                            onClick={() => updateElementStyle(element!.id, { textResize: m, autoSize: m === 'auto' })}
                            className={`flex-1 flex justify-center py-1 rounded ${textResizeOf(style) === m ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.4)]'}`}>
                      <Ic size={12} />
                    </button>
                  ))}
                </div>
                <button title="Vertical trim: box is exactly the text's height, line spacing above and below removed"
                        onClick={() => updateElementStyle(element!.id, { trimText: !style.trimText })}
                        className={`px-2 py-1 rounded-lg border text-[10px] ${style.trimText ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] border-[rgb(235,235,236)] font-bold' : 'border-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.5)]'}`}>
                  Trim
                </button>
              </div>
            )}

            {/* Font Weight & Alignment */}
            <div className="grid grid-cols-2 gap-2">
              <WeightPicker
                family={style.fontFamily}
                weights={findFont(familyOf(style.fontFamily))?.weights || [100, 200, 300, 400, 500, 600, 700, 800, 900]}
                value={Number(style.fontWeight) || 400}
                onPreview={(w) => previewStyle(w ? { fontWeight: w } : null)}
                onPick={(w) => updateElementStyle(element!.id, { fontWeight: w })}
              />

              <div className="flex items-center justify-around bg-[rgba(235,235,236,0.04)] rounded-lg border border-[rgba(235,235,236,0.08)] px-1">
                {(['top', 'middle', 'bottom'] as const).map(v => (
                  <button key={v} title={`Text at the ${v} of its box`}
                          onClick={() => updateElementStyle(element!.id, { textAlignV: v })}
                          className={`p-1 rounded ${(style.textAlignV || 'top') === v ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.4)]'}`}>
                    {v === 'top' ? <Icons.AlignVerticalJustifyStart size={12} /> : v === 'middle' ? <Icons.AlignVerticalJustifyCenter size={12} /> : <Icons.AlignVerticalJustifyEnd size={12} />}
                  </button>
                ))}
                {(['left', 'center', 'right', 'justify'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => updateElementStyle(element!.id, { textAlign: align })}
                    className={`p-1 rounded ${style.textAlign === align ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.4)]'}`}
                  >
                    {align === 'left' && <Icons.AlignLeft size={12} />}
                    {align === 'center' && <Icons.AlignCenter size={12} />}
                    {align === 'right' && <Icons.AlignRight size={12} />}
                    {align === 'justify' && <Icons.AlignJustify size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. DEV MODE — INSPECTABLE CSS (reflects auto-layout, bound tokens, hover/pressed states) */}
      {element && (
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Inspect (CSS)</span>
          </div>
          <pre className="bg-[rgba(235,235,236,0.03)] border border-[rgba(235,235,236,0.08)] rounded-lg p-2.5 text-[10px] leading-relaxed text-[rgba(235,235,236,0.75)] font-mono overflow-x-auto whitespace-pre">
            {generateCss()}
          </pre>
          <button
            onClick={handleCopyCss}
            className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] font-semibold text-xs transition-colors border border-[rgba(235,235,236,0.08)]"
          >
            {copiedCss ? <Icons.Check size={13} className="text-emerald-400" /> : <Icons.Code2 size={13} />}
            <span>{copiedCss ? 'CSS Copied!' : 'Copy CSS Code'}</span>
          </button>
        </div>
      )}

    </div>
  );
};
