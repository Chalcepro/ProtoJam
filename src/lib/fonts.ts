// Fonts: the Google Fonts bundled in public/fonts (offline), plus the fonts
// installed on this computer (Local Font Access API).
//
// Nothing is downloaded up front. Every bundled face is declared once with
// @font-face; the browser only reads a file when some text actually uses that
// family - so only the fonts in use, and the rows visible in the picker, load.

export type FontCategory = 'sans' | 'serif' | 'display' | 'handwriting' | 'mono' | 'local';

export interface FontEntry {
  family: string;
  category: FontCategory;
  weights: number[];          // weights offered in the weight menu
}

type ManifestFont = { family: string; category: FontCategory; files: { weight: string; file: string }[] };

const BASE = `${import.meta.env.BASE_URL}fonts/`;
const FALLBACK: Record<FontCategory, string> = {
  sans: 'sans-serif', serif: 'serif', display: 'sans-serif', handwriting: 'cursive', mono: 'monospace', local: 'sans-serif'
};

let bundled: FontEntry[] | null = null;
let bundledLoading: Promise<FontEntry[]> | null = null;
let local: FontEntry[] | null = null;

const weightsOf = (spec: string): number[] => {
  const [a, b] = spec.split(' ').map(Number);
  if (!b) return [a];
  return [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(w => w >= a && w <= b);
};

export const loadBundledFonts = (): Promise<FontEntry[]> => {
  if (bundled) return Promise.resolve(bundled);
  if (bundledLoading) return bundledLoading;
  bundledLoading = fetch(`${BASE}manifest.json`)
    .then(r => r.json() as Promise<ManifestFont[]>)
    .then(list => {
      const css = list.flatMap(f => f.files.map(x =>
        `@font-face{font-family:"${f.family}";src:url("${BASE}${x.file}") format("woff2");font-weight:${x.weight};font-display:swap}`
      )).join('\n');
      const tag = document.createElement('style');
      tag.dataset.protojamFonts = '';
      tag.textContent = css;
      document.head.appendChild(tag);
      bundled = list.map(f => ({
        family: f.family, category: f.category,
        weights: Array.from(new Set(f.files.flatMap(x => weightsOf(x.weight)))).sort((a, b) => a - b)
      }));
      return bundled;
    })
    .catch(() => (bundled = []));
  return bundledLoading;
};

const STYLE_WEIGHT: [RegExp, number][] = [
  [/thin|hairline/i, 100], [/extra ?light|ultra ?light/i, 200], [/light/i, 300], [/medium/i, 500],
  [/semi ?bold|demi ?bold/i, 600], [/extra ?bold|ultra ?bold/i, 800], [/bold/i, 700], [/black|heavy/i, 900]
];

export const localFontsSupported = () => typeof (window as any).queryLocalFonts === 'function';

// Needs a click to have just happened (the browser asks permission once).
export const loadLocalFonts = async (): Promise<FontEntry[]> => {
  if (local) return local;
  if (!localFontsSupported()) return (local = []);
  try {
    const faces: { family: string; style: string }[] = await (window as any).queryLocalFonts();
    const map = new Map<string, Set<number>>();
    faces.forEach(f => {
      const w = STYLE_WEIGHT.find(([re]) => re.test(f.style))?.[1] ?? 400;
      if (!map.has(f.family)) map.set(f.family, new Set());
      map.get(f.family)!.add(w);
    });
    local = Array.from(map, ([family, ws]) => ({ family, category: 'local' as const, weights: Array.from(ws).sort((a, b) => a - b) }))
      .sort((a, b) => a.family.localeCompare(b.family));
  } catch {
    local = [];
  }
  return local;
};

// The CSS font-family value stored on an element.
export const fontStack = (f: FontEntry) => `"${f.family}", ${FALLBACK[f.category]}`;

// The family name out of a stored font-family value.
export const familyOf = (stack?: string) =>
  (stack || 'Inter').split(',')[0].trim().replace(/^["']|["']$/g, '');

export const findFont = (family: string): FontEntry | undefined =>
  bundled?.find(f => f.family === family) || local?.find(f => f.family === family);
