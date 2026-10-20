import React, { useMemo } from 'react';
import { UIElement } from '../../types/components';
import { booleanD, cornerOf, radiusOf, roundCornersD, shapeD, smoothOf } from '../../lib/boolean';
import { effectsCss } from '../../lib/styleCss';
import { fillsOf, hasLayeredPaint, strokesOf } from '../../lib/paint';
import { SvgPaint } from './SvgPaint';
import { useProjectStore } from '../../store/useProjectStore';

// A boolean group drawn as its result: the shapes inside it, united /
// subtracted / intersected / excluded, in the group's own fill and stroke.
// Live - edit a shape inside and the result follows.
export const BooleanShape: React.FC<{ group: UIElement; elements: UIElement[] }> = ({ group: g0, elements }) => {
  // a paint being hovered in a menu shows before it is chosen
  const preview = useProjectStore((st) => st.stylePreview?.ids.includes(g0.id) ? st.stylePreview.style : null);
  const group = preview ? { ...g0, style: { ...g0.style, ...preview } } : g0;
  const s = group.style;
  const kids = elements.filter(e => e.parentId === group.id && !e.hidden);
  const d = useMemo(
    () => roundCornersD(booleanD(s.booleanOp!, kids.map(k => shapeD(k, 0, 0, elements))), radiusOf(s), cornerOf(s), smoothOf(s)),
    // the shapes' geometry is all that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.booleanOp, JSON.stringify(s.borderRadius), s.cornerStyle, s.cornerSmoothing, JSON.stringify(kids.map(k => [k.type, k.style.x, k.style.y, k.style.width, k.style.height, k.style.borderRadius, k.style.cornerStyle, k.style.cornerStyles, k.style.flareAxis, k.style.cornerSmoothing, k.style.pointCount, k.style.starRatio, k.style.vectorData, k.style.booleanOp, k.style.frameShape])), kids.length]
  );
  return (
    <svg width="100%" height="100%" overflow="visible" className="absolute inset-0 pointer-events-none"
         style={{ opacity: s.opacity ?? 1, ...effectsCss(s, false), boxShadow: undefined }}>
      {hasLayeredPaint(s)
        ? <SvgPaint d={d} fills={fillsOf(group)} strokes={strokesOf(group)} fillRule="evenodd" />
        : <path d={d} fill={s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : 'none'} fillRule="evenodd"
                stroke={s.borderWidth ? (s.borderColor || '#ebebec') : 'none'} strokeWidth={s.borderWidth || 0}
                style={{ pointerEvents: 'visiblePainted' }} />}
    </svg>
  );
};
