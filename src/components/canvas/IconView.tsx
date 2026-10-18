import React, { useId } from 'react';
import type { ElementStyle, UIElement } from '../../types/components';
import { safeColor, tintDuotone, useIconSvg, type IconStyle } from '../../lib/icons';
import { paintRgba } from '../../lib/paint';

// An icon from the library, drawn in its style (style.iconWeight - which
// hover / pressed states can change), coloured by its Fill: a solid colour or
// a gradient. A duotone's light layer can take a colour of its own.
export const IconView: React.FC<{ element: UIElement; style: ElementStyle }> = ({ element, style }) => {
  const gid = useId().replace(/:/g, '');
  const weight = (style.iconWeight || 'regular') as IconStyle;
  const svg = useIconSvg(element.semanticProps.iconName, weight);
  const fill = (style.fills || []).find(f => f.visible);
  const grad = fill && (fill.type === 'linear' || fill.type === 'radial') ? fill : null;
  const color = grad ? `url(#${gid})` : fill ? paintRgba(fill.color, fill.opacity) : safeColor(style.fillColor, '#141413');
  // drop shadows follow the icon's outline, not its box
  const shadows = (style.effects || []).filter(e => e.visible && e.type === 'dropShadow')
    .map(e => `drop-shadow(${e.x ?? 0}px ${e.y ?? 4}px ${e.blur}px ${e.color || 'rgba(0,0,0,0.25)'})`).join(' ');
  const stops = grad?.gradient?.stops || [];
  const a = ((grad?.gradient?.angle ?? 180) * Math.PI) / 180, dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
  return (
    <svg viewBox="0 0 256 256" width="100%" height="100%" fill={color}
         style={{ display: 'block', overflow: 'visible', opacity: style.opacity ?? 1, filter: shadows || undefined }}>
      {grad && (
        <defs>
          {grad.type === 'linear'
            ? <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={128 - dx * 256} y1={128 - dy * 256} x2={128 + dx * 256} y2={128 + dy * 256}>
                {stops.map((s, i) => <stop key={i} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={grad.opacity} />)}
              </linearGradient>
            : <radialGradient id={gid} gradientUnits="userSpaceOnUse" cx="128" cy="128" r="128">
                {stops.map((s, i) => <stop key={i} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={grad.opacity} />)}
              </radialGradient>}
        </defs>
      )}
      {svg && <g transform={`matrix(${style.iconFlipH ? -1 : 1} 0 0 ${style.iconFlipV ? -1 : 1} ${style.iconFlipH ? 256 : 0} ${style.iconFlipV ? 256 : 0})`}
                 dangerouslySetInnerHTML={{ __html: weight === 'duotone' ? tintDuotone(svg, style.iconColor2, style.iconOpacity2) : svg }} />}
    </svg>
  );
};
