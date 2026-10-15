import React, { useId } from 'react';
import type { FillLayer, StrokeLayer } from '../../types/components';
import { paintRgba } from '../../lib/paint';

// A list of fills and strokes painted on one outline (path data) in SVG - for
// shapes drawn as outlines: triangles, stars, vectors, boolean results,
// frames made from shapes. Bottom fill first; each its own opacity and blend.
export const SvgPaint: React.FC<{
  d: string; fills: FillLayer[]; strokes: StrokeLayer[];
  fillable?: boolean;          // an open path has no inside to fill
  nonScaling?: boolean;        // strokes keep their width when the shape is stretched
  fillRule?: 'nonzero' | 'evenodd';
}> = ({ d, fills, strokes, fillable = true, nonScaling, fillRule }) => {
  const uid = useId().replace(/:/g, '');
  const vf = fillable ? fills.filter(f => f.visible && f.type !== 'video').slice().reverse() : [];
  const vs = strokes.filter(s => s.visible && s.width > 0).slice().reverse();
  const paintFor = (f: FillLayer, i: number) => f.type === 'solid' ? paintRgba(f.color, f.opacity) : `url(#${uid}-f${i})`;
  const stops = (f: FillLayer) => (f.gradient?.stops || []).map((st, k) =>
    <stop key={k} offset={`${st.offset}%`} stopColor={paintRgba(st.color, f.opacity)} />);
  const ve = nonScaling ? 'non-scaling-stroke' : undefined;

  return (
    <g style={{ isolation: 'isolate' }}>
      <defs>
        {vf.map((f, i) => {
          const id = `${uid}-f${i}`;
          if (f.type === 'linear') {
            // a CSS angle (0 = up, clockwise) as a line across the box
            const a = ((f.gradient?.angle ?? 180) * Math.PI) / 180, dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
            return <linearGradient key={id} id={id} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>{stops(f)}</linearGradient>;
          }
          // angular and diamond are drawn as radial here (SVG has neither)
          if (f.type === 'radial' || f.type === 'angular' || f.type === 'diamond')
            return <radialGradient key={id} id={id} cx="0.5" cy="0.5" r="0.5">{stops(f)}</radialGradient>;
          if (f.type === 'image' && f.imageSrc)
            return (
              <pattern key={id} id={id} patternContentUnits="objectBoundingBox" width="1" height="1">
                <image href={f.imageSrc} width="1" height="1" preserveAspectRatio={f.fit === 'fit' ? 'xMidYMid meet' : 'xMidYMid slice'} opacity={f.opacity} />
              </pattern>
            );
          return null;
        })}
        {vs.some(s => s.position === 'inside') && <clipPath id={`${uid}-in`}><path d={d} fillRule={fillRule} /></clipPath>}
        {vs.some(s => s.position === 'outside') && (
          <mask id={`${uid}-out`} maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000">
            <rect x="-100000" y="-100000" width="200000" height="200000" fill="white" />
            <path d={d} fill="black" fillRule={fillRule} />
          </mask>
        )}
      </defs>
      {vf.map((f, i) => (
        <path key={`f${i}`} d={d} fill={paintFor(f, i)} fillRule={fillRule} stroke="none"
              style={{ mixBlendMode: f.blendMode && f.blendMode !== 'normal' ? f.blendMode : undefined }} />
      ))}
      {vs.map((s, i) => (
        // inside / outside: twice as wide, then the half on the wrong side is cut away
        <path key={`s${i}`} d={d} fill="none" stroke={paintRgba(s.color, s.opacity)}
              strokeWidth={s.position === 'center' ? s.width : s.width * 2}
              strokeDasharray={s.style === 'dashed' ? `${s.width * 3} ${s.width * 2}` : s.style === 'dotted' ? `0 ${s.width * 2}` : undefined}
              strokeLinecap={s.style === 'dotted' ? 'round' : undefined} strokeLinejoin="round" vectorEffect={ve}
              clipPath={s.position === 'inside' ? `url(#${uid}-in)` : undefined}
              mask={s.position === 'outside' ? `url(#${uid}-out)` : undefined} />
      ))}
    </g>
  );
};
