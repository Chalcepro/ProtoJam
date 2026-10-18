import React from 'react';
import * as Icons from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { ICON_STYLES, alternativesOf, useIconMeta, type IconStyle } from '../../lib/icons';
import { IconTile } from '../sidebar/IconsPanel';
import { useRightTab } from './RightInspector';
import { NumberInput } from './NumberInput';
import type { ElementStyle, UIElement } from '../../types/components';

// A selected icon: its style in one click (each button shows this icon drawn
// that way), its alternatives, a duotone's second colour, and - what Figma
// needs variant sets for - a different style on hover and on press, live in
// Play. Its colour is the Fill section.

const head = 'text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider';
const LABEL: Record<IconStyle, string> = { thin: 'Thin', light: 'Light', regular: 'Regular', bold: 'Bold', fill: 'Fill', duotone: 'Duotone' };

export const IconSection: React.FC<{ element: UIElement; update: (s: Partial<ElementStyle>) => void }> = ({ element, update }) => {
  const meta = useIconMeta();
  const { updateElementSemanticProps, updateElement, updateElementState } = useProjectStore(useShallow(s => ({
    updateElementSemanticProps: s.updateElementSemanticProps, updateElement: s.updateElement, updateElementState: s.updateElementState })));
  const name = element.semanticProps.iconName || 'star';
  const weight = (element.style.iconWeight || 'regular') as IconStyle;
  const alts = meta ? alternativesOf(meta, name) : [];
  const swap = (n: string) => { updateElementSemanticProps(element.id, { iconName: n }); updateElement(element.id, { name: n.replace(/-/g, ' ') }); };
  const stateSel = (key: 'hover' | 'pressed', label: string) => (
    <label className="flex items-center gap-1.5 bg-[rgba(235,235,236,0.04)] rounded-lg px-2 py-1 border border-[rgba(235,235,236,0.08)]">
      <span className="text-[10px] text-[rgba(235,235,236,0.45)] shrink-0">{label}</span>
      <select value={(element.states?.[key]?.iconWeight as string) || ''}
              onChange={e => updateElementState(element.id, key, { iconWeight: (e.target.value || undefined) as ElementStyle['iconWeight'] })}
              className="flex-1 min-w-0 bg-transparent text-[11px] text-[rgb(235,235,236)] outline-none cursor-pointer">
        <option value="" className="bg-[rgb(20,20,19)]">Same</option>
        {ICON_STYLES.map(s => <option key={s} value={s} className="bg-[rgb(20,20,19)]">{LABEL[s]}</option>)}
      </select>
    </label>
  );

  return (
    <div className="border-t border-[rgba(235,235,236,0.08)] pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className={head}>Icon</span>
        <button onClick={() => useRightTab.setState({ tab: 'icon' })} title="Change it - counterparts, its category, the whole library (Icon tab)"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.7)] hover:text-[rgb(235,235,236)]">
          <Icons.Replace size={11} /> Swap
        </button>
      </div>
      <div className="text-[11px] text-[rgb(235,235,236)] truncate">{name}</div>

      {/* this icon in each style */}
      <div className="grid grid-cols-6 gap-0.5 bg-[rgba(235,235,236,0.04)] rounded-lg p-0.5 border border-[rgba(235,235,236,0.08)]">
        {ICON_STYLES.map(s => (
          <button key={s} title={LABEL[s]} onClick={() => update({ iconWeight: s })}
                  className={`flex justify-center py-1.5 rounded ${weight === s ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]' : 'text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)]'}`}>
            <IconTile name={name} style={s} size={16} />
          </button>
        ))}
      </div>

      {weight === 'duotone' && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[rgba(235,235,236,0.45)]">Second colour</span>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(element.style.iconColor2 || '') ? element.style.iconColor2 : '#31c3f3'}
                 onChange={e => update({ iconColor2: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
          <div className="flex items-center w-16 bg-[rgba(235,235,236,0.04)] rounded px-1 border border-[rgba(235,235,236,0.08)]" title="Strength of the second colour">
            <NumberInput min={0} max={100} value={Math.round((element.style.iconOpacity2 ?? 0.2) * 100)}
                         onChange={e => update({ iconOpacity2: Number(e.target.value) / 100 })}
                         className="w-full bg-transparent text-[rgb(235,235,236)] font-mono text-[11px] outline-none text-right" />
            <span className="text-[9px] text-[rgba(235,235,236,0.4)]">%</span>
          </div>
          {element.style.iconColor2 && (
            <button onClick={() => update({ iconColor2: undefined })} title="Back to the icon's own colour"
                    className="text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]"><Icons.X size={11} /></button>
          )}
        </div>
      )}

      {alts.length > 0 && (
        <div>
          <div className="text-[10px] text-[rgba(235,235,236,0.45)] mb-1">Alternatives</div>
          <div className="flex flex-wrap gap-0.5">
            {alts.map(a => (
              <button key={a} title={a} onClick={() => swap(a)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[rgba(235,235,236,0.1)] text-[rgb(235,235,236)]">
                <IconTile name={a} style={weight} size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* in Play: e.g. an outline tab icon that fills in when pressed */}
      <div className="grid grid-cols-2 gap-1.5" title="A different style when hovered or pressed, in Play">
        {stateSel('hover', 'On hover')}
        {stateSel('pressed', 'On press')}
      </div>
    </div>
  );
};
