import { create } from 'zustand';
import { useProjectStore } from '../store/useProjectStore';
import type { ElementStyle, TextRun, UIElement } from '../types/components';

// Rich text: a text layer's words can each have their own weight, italic,
// underline / strikethrough, colour, size, font and letter spacing.
//
// semanticProps.label is always the plain text (search, the MCP, buttons and
// everything else read it). semanticProps.runs, when there is mixed styling,
// is the same text cut into pieces, each with only what differs from the
// layer's own style. All one style: no runs.

export type RunStyle = Omit<TextRun, 'text'>;
const KEYS: (keyof RunStyle)[] = ['fontWeight', 'fontStyle', 'textDecoration', 'textColor', 'fontSize', 'fontFamily', 'letterSpacing'];

const S = () => useProjectStore.getState();
const clean = (r: RunStyle): RunStyle => {
  const o: RunStyle = {};
  for (const k of KEYS) if (r[k] !== undefined && r[k] !== '') (o as any)[k] = r[k];
  return o;
};
const same = (a: RunStyle, b: RunStyle) => KEYS.every(k => a[k] === b[k]);

export const runsOf = (el: UIElement): TextRun[] => {
  const label = el.semanticProps.label || '';
  const runs = el.semanticProps.runs;
  return runs && runs.map(r => r.text).join('') === label ? runs : [{ text: label }];
};

// merge neighbours that look the same; undefined when it is all one style
export const normalize = (runs: TextRun[]): TextRun[] | undefined => {
  const out: TextRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const st = clean(r);
    const last = out[out.length - 1];
    if (last && same(clean(last), st)) last.text += r.text;
    else out.push({ text: r.text, ...st });
  }
  return out.length > 1 || (out[0] && Object.keys(clean(out[0])).length) ? out : undefined;
};

// cut the runs so start and end fall between pieces, then change the pieces between
const split = (runs: TextRun[], at: number): TextRun[] => {
  let pos = 0;
  const out: TextRun[] = [];
  for (const r of runs) {
    const end = pos + r.text.length;
    if (at > pos && at < end) out.push({ ...r, text: r.text.slice(0, at - pos) }, { ...r, text: r.text.slice(at - pos) });
    else out.push(r);
    pos = end;
  }
  return out;
};
export const styleRange = (runs: TextRun[], start: number, end: number, f: (r: TextRun) => RunStyle): TextRun[] => {
  let pos = 0;
  return split(split(runs, start), end).map(r => {
    const a = pos;
    pos += r.text.length;
    return a >= start && pos <= end ? { ...r, ...f(r) } : r;
  });
};

// what a run looks like: its own style over the layer's
export const look = (r: RunStyle, s: ElementStyle): RunStyle => ({
  fontWeight: r.fontWeight ?? (Number(s.fontWeight) || 400), fontStyle: r.fontStyle ?? s.fontStyle,
  textDecoration: r.textDecoration ?? s.textDecoration, textColor: r.textColor ?? s.textColor,
  fontSize: r.fontSize ?? s.fontSize, fontFamily: r.fontFamily ?? s.fontFamily, letterSpacing: r.letterSpacing ?? s.letterSpacing
});
export const runsIn = (runs: TextRun[], start: number, end: number) => {
  let pos = 0;
  return split(split(runs, start), end).filter(r => { const a = pos; pos += r.text.length; return a >= start && pos <= end && r.text; });
};

// ---- the text selected while typing ---------------------------------------
// Kept after typing stops when the click went into the side panel, so the
// Typography fields style just those words.
type Sel = { id: string; start: number; end: number; text: string } | null;
export const useTextSel = create<{ sel: Sel }>(() => ({ sel: null }));
export const textSel = () => {
  const s = useTextSel.getState().sel;
  return s && s.end > s.start && S().elements.some(e => e.id === s.id) ? s : null;
};
export const clearTextSel = () => useTextSel.setState({ sel: null });
// picking something else on the canvas forgets it
useProjectStore.subscribe((s, p) => {
  const sel = useTextSel.getState().sel;
  if (sel && s.selectedElementIds !== p.selectedElementIds && !(s.selectedElementIds.length === 1 && s.selectedElementIds[0] === sel.id)) clearTextSel();
});

// The editor on the canvas, to redraw itself after a change made from outside it.
type Redraw = (runs: TextRun[], start?: number, end?: number) => void;
const editors = new Map<string, Redraw>();
export const registerEditor = (id: string, fn: Redraw) => {
  editors.set(id, fn);
  return () => { if (editors.get(id) === fn) editors.delete(id); };
};

// Apply to the selected words: f gives each run's new style.
export const styleSelection = (f: (r: TextRun, el: UIElement) => RunStyle): boolean => {
  const sel = textSel();
  const el = sel && S().elements.find(e => e.id === sel.id);
  if (!sel || !el) return false;
  // a value the same as the layer's own is no override at all
  const base = look({}, el.style);
  const runs = styleRange(runsOf(el), sel.start, sel.end, r => {
    const st = f(r, el);
    for (const k of KEYS) {
      const v = st[k], b = base[k];
      if (k in st && (v === b || ((v === 'none' || v === 'normal') && !b))) (st as any)[k] = undefined;
    }
    return st;
  });
  const norm = normalize(runs);
  S().updateElementSemanticProps(el.id, { runs: norm });
  editors.get(el.id)?.(norm || [{ text: el.semanticProps.label || '' }], sel.start, sel.end);
  return true;
};

// A layer-wide style change takes that property off every word, so the
// whole text really changes.
export const dropFromRuns = (id: string, keys: (keyof RunStyle)[]) => {
  const el = S().elements.find(e => e.id === id);
  if (!el?.semanticProps.runs) return;
  const runs = normalize(el.semanticProps.runs.map(r => {
    const c = { ...r };
    for (const k of keys) delete c[k];
    return c;
  }));
  S().updateElementSemanticProps(id, { runs });
  editors.get(id)?.(runs || [{ text: el.semanticProps.label || '' }]);
};

// ---- the editor's text <-> runs --------------------------------------------

const styleCss = (r: RunStyle): Partial<CSSStyleDeclaration> => ({
  ...(r.fontWeight !== undefined ? { fontWeight: String(r.fontWeight) } : {}),
  ...(r.fontStyle ? { fontStyle: r.fontStyle } : {}),
  ...(r.textDecoration !== undefined ? { textDecoration: r.textDecoration || 'none' } : {}),
  // a coloured word in text painted with a gradient: its own solid colour
  ...(r.textColor ? { color: r.textColor, webkitTextFillColor: r.textColor } as any : {}),
  ...(r.fontSize ? { fontSize: `${r.fontSize}px` } : {}),
  ...(r.fontFamily ? { fontFamily: r.fontFamily } : {}),
  ...(r.letterSpacing !== undefined ? { letterSpacing: `${r.letterSpacing}px` } : {})
});
// the same, for React (which spells the vendor prefix with a capital)
export const runCss = (r: RunStyle): Record<string, string> => {
  const o = { ...(styleCss(clean(r)) as Record<string, string>) };
  if (o.webkitTextFillColor) { o.WebkitTextFillColor = o.webkitTextFillColor; delete o.webkitTextFillColor; }
  return o;
};

// Fill the editor with spans; each carries its style, read back by readRuns.
export const fillEditor = (root: HTMLElement, runs: TextRun[]) => {
  root.textContent = '';
  for (const r of runs) {
    const st = clean(r);
    if (!Object.keys(st).length) { root.appendChild(document.createTextNode(r.text)); continue; }
    const span = document.createElement('span');
    span.dataset.run = JSON.stringify(st);
    Object.assign(span.style, styleCss(st));
    span.textContent = r.text;
    root.appendChild(span);
  }
};

// Read the editor back into runs. Line breaks the browser makes (<br>, or a
// <div> per line) are "\n".
export const readRuns = (root: Node): TextRun[] => {
  const out: TextRun[] = [];
  const walk = (n: Node, st: RunStyle, first: boolean) => {
    n.childNodes.forEach((c, i) => {
      if (c.nodeType === Node.TEXT_NODE) out.push({ text: c.textContent || '', ...st });
      else if (c instanceof HTMLBRElement) out.push({ text: '\n', ...st });
      else if (c instanceof HTMLElement) {
        if ((c.tagName === 'DIV' || c.tagName === 'P') && !(first && i === 0)) out.push({ text: '\n', ...st });
        let own = st;
        if (c.dataset.run) { try { own = { ...st, ...JSON.parse(c.dataset.run) }; } catch { /* a broken mark: plain */ } }
        walk(c, own, false);
      }
    });
  };
  walk(root, {}, true);
  // a lone trailing <br> is the browser's placeholder for an empty last line
  if (out.length && out[out.length - 1].text === '\n' && root.lastChild instanceof HTMLBRElement) out.pop();
  return out;
};

// Character offsets of the selection inside the editor, and back.
export const selectionOffsets = (root: HTMLElement): { start: number; end: number } | null => {
  const s = window.getSelection();
  if (!s || !s.rangeCount) return null;
  const r = s.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  const upTo = (node: Node, off: number) => {
    const pre = document.createRange();
    pre.selectNodeContents(root);
    pre.setEnd(node, off);
    return readRuns(pre.cloneContents()).map(x => x.text).join('').length;
  };
  return { start: upTo(r.startContainer, r.startOffset), end: upTo(r.endContainer, r.endOffset) };
};
export const setSelectionOffsets = (root: HTMLElement, start: number, end: number) => {
  const point = (want: number): [Node, number] => {
    let pos = 0;
    // text, and <br> line breaks counted as one character, as readRuns does
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n: Node | null;
    let last: [Node, number] = [root, root.childNodes.length];
    while ((n = walker.nextNode())) {
      if (n instanceof HTMLBRElement) {
        if (want <= pos) return [n.parentNode!, Array.prototype.indexOf.call(n.parentNode!.childNodes, n)];
        pos += 1;
        continue;
      }
      if (n.nodeType !== Node.TEXT_NODE) continue;
      const len = n.textContent?.length || 0;
      if (want <= pos + len) return [n, want - pos];
      pos += len;
      last = [n, len];
    }
    return last;
  };
  const r = document.createRange();
  const [a, ao] = point(start), [b, bo] = point(end);
  r.setStart(a, ao);
  r.setEnd(b, bo);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
};
