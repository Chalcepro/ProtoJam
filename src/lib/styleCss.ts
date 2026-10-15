import type React from 'react';
import type { ElementStyle, EffectLayer, UIElement } from '../types/components';

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
