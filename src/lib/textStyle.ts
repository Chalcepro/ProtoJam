import { useProjectStore } from '../store/useProjectStore';
import { familyOf, findFont } from './fonts';
import type { ElementStyle, UIElement } from '../types/components';
import { dropFromRuns, look, runsIn, runsOf, styleSelection, textSel } from './richText';

// Bold, italic, underline and strikethrough: on the words selected while
// typing (rich text), else on whole text layers (anything with a label:
// text, headings, buttons...). Ctrl+B / I / U and Ctrl+Shift+X,
// and the B I U S buttons in Typography. As in Figma: if any of them is not
// yet bold, all become bold; if all are, none are.

export type TextToggle = 'bold' | 'italic' | 'underline' | 'strike';

const LINE = { underline: 'underline', strike: 'line-through' } as const;
const lines = (s: ElementStyle) => new Set((s.textDecoration || '').split(/\s+/).filter(l => l && l !== 'none'));

export const isOn = (s: ElementStyle, t: TextToggle) =>
  t === 'bold' ? (Number(s.fontWeight) || 400) >= 600
    : t === 'italic' ? s.fontStyle === 'italic'
      : lines(s).has(LINE[t]);

// the font's own weight nearest to the one wanted, so nothing is faked
const weightFor = (s: ElementStyle, want: number) => {
  const ws = findFont(familyOf(s.fontFamily))?.weights;
  return ws?.length ? ws.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a)) : want;
};

const hasText = (e: UIElement) => e.semanticProps?.label !== undefined;

// Returns false when none of ids is a text layer, so the key can go on to
// whatever else uses it.
export const toggleText = (ids: string[], t: TextToggle): boolean => {
  const st = useProjectStore.getState();
  // words selected in one text: just them
  const sel = textSel();
  if (sel && ids.includes(sel.id)) {
    const el = st.elements.find(e => e.id === sel.id)!;
    const on = !runsIn(runsOf(el), sel.start, sel.end).every(r => isOn(look(r, el.style) as ElementStyle, t));
    return styleSelection((r, e) => {
      const cur = look(r, e.style) as ElementStyle;
      if (t === 'bold') return { fontWeight: weightFor(cur, on ? 700 : 400) };
      if (t === 'italic') return { fontStyle: on ? 'italic' : 'normal' };
      const l = lines(cur);
      if (on) l.add(LINE[t]); else l.delete(LINE[t]);
      return { textDecoration: l.size ? [...l].join(' ') : 'none' };
    });
  }
  const els = st.elements.filter(e => ids.includes(e.id) && hasText(e));
  if (!els.length) return false;
  const on = !els.every(e => isOn(e.style, t));
  for (const e of els) {
    // the whole layer: no word keeps its own value of it
    dropFromRuns(e.id, t === 'bold' ? ['fontWeight'] : t === 'italic' ? ['fontStyle'] : ['textDecoration']);
    if (t === 'bold') st.updateElementStyle(e.id, { fontWeight: weightFor(e.style, on ? 700 : 400) });
    else if (t === 'italic') st.updateElementStyle(e.id, { fontStyle: on ? 'italic' : undefined });
    else {
      const l = lines(e.style);
      if (on) l.add(LINE[t]); else l.delete(LINE[t]);
      st.updateElementStyle(e.id, { textDecoration: l.size ? [...l].join(' ') : undefined });
    }
  }
  return true;
};

// The text layers a shortcut means: the one being typed in, else the selection.
export const textTargets = () => {
  const s = useProjectStore.getState();
  return s.inlineEditingElementId ? [s.inlineEditingElementId] : s.selectedElementIds;
};
