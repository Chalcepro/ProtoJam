import { toJpeg, toPng, toSvg } from 'html-to-image';
import type { ExportSetting } from '../types/components';

// Export a layer as Figma's Export list does: PNG / JPG at a scale, SVG, or
// PDF (1x). Drawn from the canvas itself, without selection boxes and device
// decorations (anything marked data-export-skip).

const skip = (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && 'exportSkip' in n.dataset);

// The fonts a picture needs, inlined. Left to itself html-to-image fetches
// every @font-face on the page - all of the ~600 bundled font files - for
// each picture, which takes minutes. Only the families the layer uses go in.
const inlined = new Map<string, Promise<string>>();
const asDataUrl = (url: string) => {
  if (!inlined.has(url)) inlined.set(url, fetch(url).then(r => r.blob()).then(b => new Promise<string>((ok, bad) => {
    const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.onerror = bad; fr.readAsDataURL(b);
  })));
  return inlined.get(url)!;
};
const unquote = (f: string) => f.trim().replace(/^["']|["']$/g, '').toLowerCase();
export const fontCssFor = async (node: HTMLElement): Promise<string> => {
  const used = new Set<string>();
  for (const el of [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))])
    for (const f of getComputedStyle(el).fontFamily.split(',')) used.add(unquote(f));
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try { list = sheet.cssRules; } catch { continue; }          // another site's sheet
    for (const r of Array.from(list)) {
      if (!(r instanceof CSSFontFaceRule) || !used.has(unquote(r.style.getPropertyValue('font-family')))) continue;
      let css = r.cssText;
      for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        try { css = css.replace(m[1], await asDataUrl(new URL(m[1], location.href).href)); } catch { /* left as a link */ }
      }
      rules.push(css);
    }
  }
  return rules.join('\n');
};

const save = (url: string, name: string) => {
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
};

// The smallest PDF that holds one picture: a page the picture's size (in
// points), the JPEG embedded as it is.
const pdfFromJpeg = (jpegDataUrl: string, w: number, h: number): Blob => {
  const bin = atob(jpegDataUrl.split(',')[1]);
  const img = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
  const enc = new TextEncoder();
  const parts: (Uint8Array)[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array) => { parts.push(b); len += b.length; };
  const text = (t: string) => push(enc.encode(t));
  // the picture's own size in pixels, from its JPEG header (SOFn marker)
  let pw = 0, ph = 0;
  for (let i = 2; i < img.length - 9;) {
    if (img[i] !== 0xff) { i++; continue; }
    const m = img[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { ph = (img[i + 5] << 8) | img[i + 6]; pw = (img[i + 7] << 8) | img[i + 8]; break; }
    i += 2 + ((img[i + 2] << 8) | img[i + 3]);
  }
  text('%PDF-1.4\n');
  const obj = (n: number, body: () => void) => { offsets[n] = len; text(`${n} 0 obj\n`); body(); text('\nendobj\n'); };
  const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  obj(1, () => text('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => text('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => text(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    text(`<< /Type /XObject /Subtype /Image /Width ${pw} /Height ${ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img); text('\nendstream');
  });
  obj(5, () => text(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  const xref = len;
  text(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map(n => String(offsets[n]).padStart(10, '0') + ' 00000 n \n').join('')}`);
  text(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
};

export const exportLayer = async (node: HTMLElement, name: string, settings: ExportSetting[], background?: string) => {
  const w = node.offsetWidth, h = node.offsetHeight;
  const base = (name || 'export').replace(/[\\/:*?"<>|]+/g, '-');
  const fontEmbedCSS = await fontCssFor(node);
  for (const s of settings) {
    const file = `${base}${s.suffix || ''}`;
    if (s.format === 'PNG') save(await toPng(node, { pixelRatio: s.scale, filter: skip, fontEmbedCSS }), `${file}.png`);
    else if (s.format === 'JPG') save(await toJpeg(node, { pixelRatio: s.scale, filter: skip, quality: 0.95, backgroundColor: background || '#ffffff', fontEmbedCSS }), `${file}.jpg`);
    else if (s.format === 'SVG') save(await toSvg(node, { filter: skip, fontEmbedCSS }), `${file}.svg`);
    else {
      // a PDF page the layer's size, its picture drawn at 2x so it stays sharp
      const jpg = await toJpeg(node, { pixelRatio: 2, filter: skip, quality: 0.95, backgroundColor: background || '#ffffff', fontEmbedCSS });
      const url = URL.createObjectURL(pdfFromJpeg(jpg, w, h));
      save(url, `${file}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
};
