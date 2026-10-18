import { create } from 'zustand';
import { useProjectStore } from '../store/useProjectStore';

// The icon library: Phosphor's ~1,500 icons (MIT), each in six styles,
// bundled in public/icons (scripts/build-icons.mjs) so it works offline. A
// style's file loads the first time something uses it.
//
// An icon's style is a style property (iconWeight), not a different icon, so
// one click turns an outline into a filled or duotone one - and hover /
// pressed states can change it, which Figma needs whole variant sets for.

export const ICON_STYLES = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const;
export type IconStyle = typeof ICON_STYLES[number];
export type IconMeta = { n: string; c: string[]; t: string[] };

const BASE = `${import.meta.env.BASE_URL}icons/`;
const loading = new Map<string, Promise<unknown>>();
export const useIconSets = create<{ sets: Partial<Record<IconStyle, Record<string, string>>>; meta: IconMeta[] | null }>(() => ({ sets: {}, meta: null }));

export const loadStyle = (style: IconStyle) => {
  if (!loading.has(style)) loading.set(style, fetch(`${BASE}${style}.json`).then(r => r.json())
    .then((set: Record<string, string>) => useIconSets.setState(s => ({ sets: { ...s.sets, [style]: set } }))));
  return loading.get(style)!;
};
export const loadMeta = () => {
  if (!loading.has('meta')) loading.set('meta', fetch(`${BASE}meta.json`).then(r => r.json())
    .then((meta: IconMeta[]) => useIconSets.setState({ meta })));
  return loading.get('meta')!;
};

// The SVG inside an icon's 0 0 256 256 box, or null while its style loads.
export const useIconSvg = (name: string | undefined, style: IconStyle = 'regular') => {
  const set = useIconSets(s => s.sets[style]);
  if (!set) { loadStyle(style); return null; }
  return name ? set[name] ?? null : null;
};
export const useIconMeta = () => {
  const meta = useIconSets(s => s.meta);
  if (!meta) loadMeta();
  return meta;
};

// Words typed: the best names first, then tags and categories.
export const searchIcons = (meta: IconMeta[], q: string, category?: string) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = category ? meta.filter(m => m.c.includes(category)) : meta;
  if (!words.length) return pool;
  return pool
    .map(m => {
      let score = 0;
      for (const w of words) {
        if (m.n === w) score += 10;
        else if (m.n.split('-').includes(w)) score += 6;
        else if (m.n.includes(w)) score += 4;
        else if (m.t.some(t => t.includes(w))) score += 2;
        else if (m.c.some(c => c.includes(w))) score += 1;
        else return null;
      }
      return { m, score };
    })
    .filter((x): x is { m: IconMeta; score: number } => !!x)
    .sort((a, b) => b.score - a.score || a.m.n.length - b.m.n.length)
    .map(x => x.m);
};

// Its alternatives: the same thing drawn other ways - house, house-line,
// house-simple; arrow-left, arrow-circle-left, arrow-fat-left...
export const alternativesOf = (meta: IconMeta[], name: string) => {
  const parts = name.split('-');
  const head = parts[0], rest = parts.slice(1).filter(p => !['simple', 'line', 'circle', 'square', 'fat', 'bold'].includes(p));
  return meta
    .filter(m => m.n !== name && m.n.split('-')[0] === head && rest.every(r => m.n.split('-').includes(r)))
    .slice(0, 24)
    .map(m => m.n);
};

// A colour safe to write into SVG markup.
export const safeColor = (c: string | undefined, fallback: string) =>
  c && /^[#a-zA-Z0-9(),.%\s-]+$/.test(c) ? c : fallback;

// A duotone icon's light layer, in its own colour and strength.
export const tintDuotone = (svg: string, color2?: string, opacity2?: number) =>
  svg.replace(/opacity="0\.2"/g, `${color2 ? `fill="${safeColor(color2, 'currentColor')}" ` : ''}opacity="${opacity2 ?? 0.2}"`);

// The icons in a category, its own first.
export const inCategory = (meta: IconMeta[], cat: string) => meta.filter(m => m.c.includes(cat)).map(m => m.n);

// Swap the selected icons (or just this one) for another: size, colour and
// style stay. The layer takes the icon's name.
export const swapIcon = (id: string, name: string) => {
  const st = useProjectStore.getState();
  const ids = st.selectedElementIds.includes(id) ? st.selectedElementIds : [id];
  for (const i of ids) {
    if (st.elements.find(e => e.id === i)?.type !== 'icon') continue;
    st.updateElementSemanticProps(i, { iconName: name });
    st.updateElement(i, { name: name.replace(/-/g, ' ') });
  }
};
