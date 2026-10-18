import type React from 'react';
import type { AutoLayoutSettings, ElementStyle, EffectLayer, UIElement } from '../types/components';
import { textExtrudeShadows } from './strokeArt';

// How a text box sizes itself. Old projects only have autoSize.
export const textResizeOf = (s: ElementStyle): 'auto' | 'autoHeight' | 'fixed' =>
  s.textResize ?? (s.autoSize ? 'auto' : 'fixed');

export const isTextEl = (el: UIElement) => el.type === 'text' || el.type === 'heading';

// The size the canvas wrapper of an element should take. Text that sizes
// itself takes its content's size; everything else its stored size.
export const wrapperSize = (el: UIElement): React.CSSProperties => {
  const w = Number(el.style.width), h = Number(el.style.height);
  if (isTextEl(el)) {
    const mode = textResizeOf(el.style);
    if (mode === 'auto') return { width: 'max-content', height: 'max-content', maxWidth: 'none' };
    if (mode === 'autoHeight') return { width: w, height: 'max-content' };
  }
  return { width: w, height: h };
};

// Effects (drop / inner shadow, layer blur, background blur) as CSS, plus the
// older single boxShadow / backdropBlur fields so old projects keep theirs.
// Text gets its drop shadows as text-shadow, so they follow the letters.
export const effectsCss = (s: ElementStyle, isText: boolean): React.CSSProperties => {
  const fx = (s.effects || []).filter(e => e.visible);
  const shadow = (e: EffectLayer, inset: boolean) =>
    `${inset ? 'inset ' : ''}${e.x ?? 0}px ${e.y ?? 4}px ${e.blur}px ${isText ? '' : `${e.spread ?? 0}px `}${e.color || 'rgba(0,0,0,0.25)'}`;
  const drops = fx.filter(e => e.type === 'dropShadow').map(e => shadow(e, false));
  // text has no outline to push back, so it extrudes as stacked text shadows
  if (isText) drops.push(...textExtrudeShadows(fx.filter(e => e.type === 'extrude')));
  const inner = isText ? [] : fx.filter(e => e.type === 'innerShadow').map(e => shadow(e, true));
  const box = [...(s.boxShadow && !isText ? [s.boxShadow] : []), ...(isText ? [] : drops), ...inner];
  const layerBlur = fx.filter(e => e.type === 'layerBlur').reduce((a, e) => a + e.blur, 0) || s.blur || 0;
  const bgBlur = fx.filter(e => e.type === 'backgroundBlur').reduce((a, e) => a + e.blur, 0) || s.backdropBlur || 0;
  return {
    boxShadow: box.length ? box.join(', ') : undefined,
    textShadow: isText && drops.length ? drops.join(', ') : undefined,
    filter: layerBlur ? `blur(${layerBlur}px)` : undefined,
    backdropFilter: bgBlur ? `blur(${bgBlur}px)` : undefined,
  };
};

export const BLEND_MODES = [
  ['normal', 'Normal'], ['darken', 'Darken'], ['multiply', 'Multiply'], ['color-burn', 'Color burn'],
  ['lighten', 'Lighten'], ['screen', 'Screen'], ['color-dodge', 'Color dodge'],
  ['overlay', 'Overlay'], ['soft-light', 'Soft light'], ['hard-light', 'Hard light'],
  ['difference', 'Difference'], ['exclusion', 'Exclusion'],
  ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity'],
] as const;

// The flex box an auto-layout parent (screen or container) lays its
// children out with.
export const flexLayoutCss = (al: AutoLayoutSettings): React.CSSProperties => al.direction === 'grid' ? {
  // rows of `columns` cells; a frame that hugs its width sizes them to their
  // contents, a fixed one shares its width between them
  display: 'grid',
  gridTemplateColumns: `repeat(${Math.max(1, al.columns || 2)}, ${al.sizingH === 'hug' ? 'max-content' : 'minmax(0, 1fr)'})`,
  columnGap: al.gap, rowGap: al.rowGap ?? al.gap,
  justifyItems: ({ start: 'start', center: 'center', end: 'end', spaceBetween: 'stretch' } as const)[al.align] || 'start',
  alignItems: ({ start: 'start', center: 'center', end: 'end' } as const)[al.alignCross || 'start'],
  paddingTop: al.padding?.top, paddingRight: al.padding?.right,
  paddingBottom: al.padding?.bottom, paddingLeft: al.padding?.left
} : ({
  display: 'flex',
  flexDirection: al.direction === 'horizontal' ? 'row' : 'column',
  flexWrap: al.wrap ? 'wrap' : 'nowrap',
  // wrapped rows can have their own gap between them (CSS gap: rows, columns)
  gap: al.wrap && al.rowGap !== undefined ? `${al.rowGap}px ${al.gap}px` : al.gap,
  justifyContent: ({ start: 'flex-start', center: 'center', end: 'flex-end', spaceBetween: 'space-between' } as const)[al.align] || 'flex-start',
  alignItems: ({ start: 'flex-start', center: 'center', end: 'flex-end' } as const)[al.alignCross || 'start'],
  paddingTop: al.padding?.top, paddingRight: al.padding?.right,
  paddingBottom: al.padding?.bottom, paddingLeft: al.padding?.left
});

// The wrapper size of a child, with Fill container applied when its parent
// lays it out, and Hug when it is a container that hugs its own children.
// An element's turn, about its centre.
export const rotateCss = (el: UIElement) => el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined;

export const nodeSize = (el: UIElement, parentLayout: AutoLayoutSettings | null): React.CSSProperties => {
  const size: React.CSSProperties = wrapperSize(el);
  const al = el.type === 'container' && el.style.autoLayout?.enabled ? el.style.autoLayout : null;
  if (al?.sizingH === 'hug') size.width = 'max-content';
  if (al?.sizingV === 'hug') size.height = 'max-content';
  if (parentLayout?.direction === 'grid' && !el.style.absolutePosition) {
    // in a grid, Fill is the whole cell
    if (el.style.layoutSizingH === 'fill') Object.assign(size, { width: 'auto', justifySelf: 'stretch', minWidth: 0 });
    if (el.style.layoutSizingV === 'fill') Object.assign(size, { height: 'auto', alignSelf: 'stretch' });
  } else if (parentLayout && !el.style.absolutePosition) {
    const row = parentLayout.direction === 'horizontal';
    const fillMain = row ? el.style.layoutSizingH === 'fill' : el.style.layoutSizingV === 'fill';
    const fillCross = row ? el.style.layoutSizingV === 'fill' : el.style.layoutSizingH === 'fill';
    if (fillMain) Object.assign(size, { flex: '1 1 0', [row ? 'width' : 'height']: 'auto', [row ? 'minWidth' : 'minHeight']: 0 });
    if (fillCross) Object.assign(size, { alignSelf: 'stretch', [row ? 'height' : 'width']: 'auto' });
  }
  return size;
};
