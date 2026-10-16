import type React from 'react';
import type { ElementStyle, FillLayer, StrokeLayer, UIElement } from '../types/components';

// Fills and strokes as Figma lists them: any number, top of the list on top,
// each with its own type, opacity, blend mode and eye. Older layers only have
// fillColor / fillGradient / textColor / border* - those read as a one-item
// list, so nothing changes until the Fill or Stroke list is edited.

const rgba = (c: string | undefined, k = 1): string => {
  if (!c) return `rgba(0,0,0,${k})`;
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${(m[4] !== undefined ? Number(m[4]) : 1) * k})`;
  const h = c.replace('#', '');
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  if (f.length < 6) return c;
  return `rgba(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(f.slice(4, 6), 16)},${(f.length === 8 ? parseInt(f.slice(6, 8), 16) / 255 : 1) * k})`;
};
export { rgba as paintRgba };

const isText = (el: UIElement) => el.type === 'text' || el.type === 'heading';
// Text without auto layout is painted in its letters; everything else in its box.
export const paintsLetters = (el: UIElement) => isText(el) && !el.style.autoLayout?.enabled;

export const fillsOf = (el: UIElement): FillLayer[] => {
  const s = el.style;
  if (s.fills) return s.fills;
  const g = s.fillGradient;
  const grad = (): FillLayer[] => g ? [{ id: 'legacy-g', type: g.type === 'radial' ? 'radial' : 'linear', opacity: 1, visible: true, gradient: { angle: g.angle, stops: g.stops } }] : [];
  if (paintsLetters(el)) return g ? grad() : [{ id: 'legacy', type: 'solid', color: s.textColor || '#ebebec', opacity: 1, visible: true }];
  if (g) return grad();
  return s.fillColor && s.fillColor !== 'transparent' ? [{ id: 'legacy', type: 'solid', color: s.fillColor, opacity: 1, visible: true }] : [];
};

export const strokesOf = (el: UIElement): StrokeLayer[] => {
  const s = el.style;
  if (s.strokes) return s.strokes;
  return s.borderWidth ? [{ id: 'legacy', color: s.borderColor || '#ebebec', width: s.borderWidth, position: 'inside', style: s.borderStyle || 'solid', opacity: 1, visible: true }] : [];
};

const stopsCss = (f: FillLayer, scale = 1) =>
  (f.gradient?.stops || []).map(st => `${rgba(st.color, f.opacity)} ${st.offset * scale}%`).join(', ');

type Layer = { image: string; size: string; position: string; repeat: string; blend: string };

// One fill as CSS background layers (a diamond takes four).
export const fillLayers = (f: FillLayer): Layer[] => {
  const blend = f.blendMode && f.blendMode !== 'normal' ? f.blendMode : 'normal';
  const one = (image: string, size = '100% 100%', position = '0 0', repeat = 'no-repeat'): Layer => ({ image, size, position, repeat, blend });
  const angle = f.gradient?.angle ?? 180;
  switch (f.type) {
    case 'solid': { const c = rgba(f.color, f.opacity); return [one(`linear-gradient(${c}, ${c})`)]; }
    case 'linear': return [one(`linear-gradient(${angle}deg, ${stopsCss(f)})`)];
    case 'radial': return [one(`radial-gradient(farthest-side, ${stopsCss(f)})`)];
    case 'angular': return [one(`conic-gradient(from ${angle}deg, ${stopsCss(f)})`)];
    case 'diamond': {
      // four quarters, each a gradient from the middle out to its corner:
      // halfway along it is the edge, so the stops are squeezed into 0-50%
      const st = stopsCss(f, 0.5);
      return [
        one(`linear-gradient(to top left, ${st})`, '50% 50%', '0 0'),
        one(`linear-gradient(to top right, ${st})`, '50% 50%', '100% 0'),
        one(`linear-gradient(to bottom left, ${st})`, '50% 50%', '0 100%'),
        one(`linear-gradient(to bottom right, ${st})`, '50% 50%', '100% 100%')
      ];
    }
    case 'image':
      if (!f.imageSrc) return [];
      return [one(`url("${f.imageSrc}")`, f.fit === 'fit' ? 'contain' : f.fit === 'tile' ? 'auto' : 'cover', 'center', f.fit === 'tile' ? 'repeat' : 'no-repeat')];
    default:
      return [];          // video: drawn as a <video> (see FillStack)
  }
};

// A fill list as one CSS background (top fill first, as CSS lists them).
export const fillsCss = (fills: FillLayer[]): React.CSSProperties => {
  const layers = fills.filter(f => f.visible).flatMap(fillLayers);
  if (!layers.length) return { backgroundImage: 'none', backgroundColor: 'transparent' };
  return {
    backgroundColor: 'transparent',
    backgroundImage: layers.map(l => l.image).join(', '),
    backgroundSize: layers.map(l => l.size).join(', '),
    backgroundPosition: layers.map(l => l.position).join(', '),
    backgroundRepeat: layers.map(l => l.repeat).join(', '),
    backgroundBlendMode: layers.map(l => l.blend).join(', ') as React.CSSProperties['backgroundBlendMode']
  };
};

// Painting the letters of a text: the same background, cut to the glyphs.
export const lettersCss = (fills: FillLayer[]): React.CSSProperties => ({
  ...fillsCss(fills),
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent'
});

// Strokes of a box as shadows (inside / centre / outside, any number); a
// dashed or dotted one uses the outline, which can only draw one.
export const strokesCss = (strokes: StrokeLayer[]): { boxShadow?: string; outline?: string; outlineOffset?: number } => {
  const vis = strokes.filter(s => s.visible && s.width > 0);
  const shadows: string[] = [];
  let outline: string | undefined, outlineOffset: number | undefined;
  for (const s of vis) {
    const c = rgba(s.color, s.opacity);
    if (s.style !== 'solid' && !outline) {
      outline = `${s.width}px ${s.style} ${c}`;
      outlineOffset = s.position === 'inside' ? -s.width : s.position === 'center' ? -s.width / 2 : 0;
      continue;
    }
    if (s.position === 'inside') shadows.push(`inset 0 0 0 ${s.width}px ${c}`);
    else if (s.position === 'outside') shadows.push(`0 0 0 ${s.width}px ${c}`);
    else shadows.push(`inset 0 0 0 ${s.width / 2}px ${c}`, `0 0 0 ${s.width / 2}px ${c}`);
  }
  return { boxShadow: shadows.length ? shadows.join(', ') : undefined, outline, outlineOffset };
};

// a paint with its own blend mode (not Normal)
export const blended = (p: { blendMode?: string }) => !!p.blendMode && p.blendMode !== 'normal';

export const hasLayeredPaint = (s: ElementStyle) => !!(s.fills || s.strokes);
