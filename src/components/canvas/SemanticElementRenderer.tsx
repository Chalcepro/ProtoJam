import React, { useLayoutEffect, useRef, useState } from 'react';
import { effectsCss, textResizeOf } from '../../lib/styleCss';
import { VideoView } from './VideoView';
import { SvgPaint } from './SvgPaint';
import { IconView } from './IconView';
import { OutlineShape } from './OutlineShape';
import { needsOutline } from '../../lib/corners';
import { blended, fillsCss, fillsOf, hasLayeredPaint, lettersCss, paintRgba, paintsLetters, strokesCss, strokesOf } from '../../lib/paint';
import { cornerOf, radiusOf, roundCornersD, smoothOf, vectorAllD, vectorRegions } from '../../lib/boolean';
import { isPlainStroke } from '../../lib/strokeArt';
import { clearTextSel, fillEditor, normalize, readRuns, registerEditor, runCss, runsOf, selectionOffsets, setSelectionOffsets, useTextSel } from '../../lib/richText';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import * as Icons from 'lucide-react';
import { measured } from '../../store/useProjectStore';

interface SemanticElementRendererProps {
  element: UIElement;
  isInteractive?: boolean; // When in Player mode vs Canvas mode
  isHovering?: boolean; // Player mode only: pointer is currently over this element
  isPressed?: boolean; // Player mode only: mouse button is currently down on this element
  onTriggerInteraction?: (element: UIElement, trigger: string) => void;
}

export const SemanticElementRenderer: React.FC<SemanticElementRendererProps> = ({
  element,
  isInteractive = false,
  isHovering = false,
  isPressed = false,
  onTriggerInteraction
}) => {
  const { type, semanticProps } = element;
  // a font / weight being hovered in a menu shows here before it is chosen
  const preview = useProjectStore((s) => s.stylePreview && s.stylePreview.ids.includes(element.id) ? s.stylePreview.style : null);
  // In the live player, layer hover/pressed style overrides on top of the base
  // style — an "interactive component" without a full variant-set system.
  let style = isInteractive && element.states
    ? {
        ...element.style,
        ...(isHovering ? element.states.hover : null),
        ...(isPressed ? element.states.pressed : null)
      }
    : element.style;
  if (preview) style = { ...style, ...preview };
  const { inlineEditingElementId, setInlineEditingElementId, updateElementSemanticProps, updateElementStyle, deleteElement } = useProjectStore(useShallow((s) => ({ inlineEditingElementId: s.inlineEditingElementId, setInlineEditingElementId: s.setInlineEditingElementId, updateElementSemanticProps: s.updateElementSemanticProps, updateElementStyle: s.updateElementStyle, deleteElement: s.deleteElement })));

  const [internalValue, setInternalValue] = useState<any>(semanticProps.value ?? '');
  const [internalChecked, setInternalChecked] = useState<boolean>(!!semanticProps.checked);
  const [selectedTab, setSelectedTab] = useState<string>(semanticProps.value?.toString() || 'home');

  const isInlineEditing = inlineEditingElementId === element.id;

  // Text that sizes itself writes its drawn size back into width/height, so
  // the selection box, snapping and the W/H fields match the text - bigger
  // font, bigger box. Watched, so a font finishing loading counts too.
  const textRef = useRef<HTMLDivElement>(null);
  const isText = type === 'text' || type === 'heading';
  const resizeMode = isText ? textResizeOf(element.style) : 'fixed';
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!isText || isInteractive || resizeMode === 'fixed' || !el) return;
    const sync = () => {
      const st = useProjectStore.getState();
      const cur = st.elements.find(x => x.id === element.id);
      // a hover preview changes the drawn size; it is not the text's size
      if (!cur || st.stylePreview?.ids.includes(element.id)) return;
      const upd: { width?: number; height?: number } = {};
      if (resizeMode === 'auto' && Math.abs(el.offsetWidth - Number(cur.style.width)) >= 1) upd.width = el.offsetWidth;
      if (Math.abs(el.offsetHeight - Number(cur.style.height)) >= 1) upd.height = el.offsetHeight;
      if (upd.width !== undefined || upd.height !== undefined) measured(() => updateElementStyle(element.id, upd));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el, { box: 'border-box' });   // padding counts too (text with auto layout)
    return () => ro.disconnect();
  }, [isText, isInteractive, resizeMode, element.id, isInlineEditing]);

  // Going into editing: the text in, focused, all of it selected - so typing
  // replaces it and Ctrl+A / a click work as in any text field.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!isText || !isInlineEditing || isInteractive || !el) return;
    fillEditor(el, runsOf(element));
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // the words selected while typing: Ctrl+B and the Typography panel style just them
    const track = () => {
      const o = selectionOffsets(el);
      if (!o) return;
      const text = readRuns(el).map(r => r.text).join('');
      useTextSel.setState({ sel: o.end > o.start ? { id: element.id, ...o, text: text.slice(o.start, o.end) } : null });
    };
    document.addEventListener('selectionchange', track);
    // a change made from outside (Ctrl+B, the panel): redrawn, selection kept
    const off = registerEditor(element.id, (runs, start, end) => {
      const keep = start === undefined ? selectionOffsets(el) : { start, end: end ?? start };
      fillEditor(el, runs);
      if (keep) setSelectionOffsets(el, keep.start, keep.end);
    });
    return () => { document.removeEventListener('selectionchange', track); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInlineEditing]);

  // Double-click a field, a search bar or a button in design mode to type its
  // text right there - the placeholder of a field, the label of a button.
  // They were drawn disabled with no way in, so their text could only be
  // changed from the side panel.
  const inlineText = (which: 'placeholder' | 'label', fallback: string) => (
    <input
      autoFocus
      // focused by hand as it appears: autoFocus alone did not take here, and
      // an edit box you have to click into again is not much of one
      ref={(el) => { if (el && document.activeElement !== el) requestAnimationFrame(() => el.focus()); }}
      onFocus={(e) => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }}
      value={(semanticProps as any)[which] ?? ''}
      placeholder={fallback}
      onChange={(e) => updateElementSemanticProps(element.id, { [which]: e.target.value } as any)}
      onBlur={() => setInlineEditingElementId(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEditingElementId(null); }}
      onMouseDown={(e) => e.stopPropagation()}
      className="bg-[rgba(20,20,19,0.9)] border border-[rgb(235,235,236)] rounded px-1 outline-none w-full text-[rgb(235,235,236)] text-sm"
    />
  );
  const editOnDoubleClick = () => { if (!isInteractive) setInlineEditingElementId(element.id); };

  // Dynamic Lucide icon helper
  const renderIcon = (name?: string, size = 18, className = '') => {
    if (!name) return null;
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
  };

  const getCommonStyles = (): React.CSSProperties => {
    const css: React.CSSProperties = {
      width: '100%',
      height: '100%',
      opacity: style.opacity ?? 1,
      color: style.textColor,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      textAlign: style.textAlign,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      ...effectsCss(style, type === 'text' || type === 'heading'),
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle || (style.borderWidth ? 'solid' : undefined),
      paddingTop: style.padding?.top,
      paddingRight: style.padding?.right,
      paddingBottom: style.padding?.bottom,
      paddingLeft: style.padding?.left,
      display: style.display,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap
    };

    // (plain text paints its letters instead - see the text case)
    if (paintsLetters(element)) { /* no box paint */ }
    else if (style.fillGradient) {
      const stops = style.fillGradient.stops.map(s => `${s.color} ${s.offset}%`).join(', ');
      css.backgroundImage = style.fillGradient.type === 'linear' 
        ? `linear-gradient(${style.fillGradient.angle ?? 90}deg, ${stops})`
        : `radial-gradient(circle, ${stops})`;
    } else if (style.fillColor) {
      css.backgroundColor = style.fillColor;
    }

    if (typeof style.borderRadius === 'number') {
      css.borderRadius = style.borderRadius;
    } else if (typeof style.borderRadius === 'object') {
      css.borderTopLeftRadius = style.borderRadius.tl;
      css.borderTopRightRadius = style.borderRadius.tr;
      css.borderBottomRightRadius = style.borderRadius.br;
      css.borderBottomLeftRadius = style.borderRadius.bl;
    }

    // Figma-style Fill / Stroke lists (once edited): layered backgrounds, and
    // strokes as rings that never change the box's size
    if (style.fills && !paintsLetters(element)) { delete css.background; Object.assign(css, fillsCss(style.fills)); }
    if (style.strokes) {
      // blended ones are drawn on top (strokeOverlays); per-side / gradient ones by SideStrokes
      const sc = strokesCss(style.strokes.filter(x => !blended(x) && isPlainStroke(x)));
      css.borderWidth = 0; css.borderStyle = undefined;
      css.boxShadow = [sc.boxShadow, css.boxShadow].filter(Boolean).join(', ') || undefined;
      css.outline = sc.outline; css.outlineOffset = sc.outlineOffset;
    }

    return css;
  };

  // A box whose fills include a video: each fill its own layer (a video
  // cannot be a CSS background), stacked bottom up, each with its blend.
  const videoFills = (style.fills || []).some(f => f.visible && f.type === 'video');
  const fillStack = () => !videoFills ? null : (style.fills || []).filter(f => f.visible).slice().reverse().map(f => (
    <div key={f.id} className="absolute inset-0 overflow-hidden pointer-events-none"
         style={{ borderRadius: 'inherit', opacity: f.type === 'video' || f.type === 'image' ? f.opacity : undefined,
                  mixBlendMode: blended(f) ? f.blendMode : undefined, ...(f.type === 'video' ? {} : fillsCss([f])) }}>
      {f.type === 'video' && <VideoView element={{ ...element, semanticProps: { videoSrc: f.videoSrc } }}
                                        style={{ width: '100%', height: '100%', objectFit: f.fit === 'fit' ? 'contain' : 'cover' }} />}
    </div>
  ));
  // A stroke with its own blend mode: a ring of its own laid over the box, so
  // it blends with the fill and whatever is under the layer.
  const strokeOverlays = (radius?: React.CSSProperties['borderRadius']) => (style.strokes || []).filter(x => x.visible && x.width > 0 && blended(x) && isPlainStroke(x)).map(x => {
    const c = getCommonStyles();
    const corners = radius != null || c.borderRadius != null ? { borderRadius: radius ?? c.borderRadius }
      : { borderTopLeftRadius: c.borderTopLeftRadius, borderTopRightRadius: c.borderTopRightRadius,
          borderBottomRightRadius: c.borderBottomRightRadius, borderBottomLeftRadius: c.borderBottomLeftRadius };
    return (
      <div key={x.id} className="absolute inset-0 pointer-events-none"
           style={{ ...corners, ...strokesCss([x]), mixBlendMode: x.blendMode }} />
    );
  });
  const boxStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    ...getCommonStyles(), ...extra,
    ...(videoFills ? { backgroundImage: 'none', backgroundColor: 'transparent', position: 'relative', isolation: 'isolate' } : null)
  });

  const handleClick = (e: React.MouseEvent) => {
    if (isInteractive && onTriggerInteraction) {
      e.stopPropagation();
      onTriggerInteraction(element, 'onClick');
    }
  };

  // Render specific semantic UI/UX elements
  switch (type) {
    // ---------------- RECTANGLE SHAPE ----------------
    case 'rectangle':
      // scooped, cut or smoothed corners: drawn as an outline
      if (needsOutline(style)) return <OutlineShape element={{ ...element, style }} onClick={handleClick} />;
      return (
        <><div style={boxStyle()} onClick={handleClick}>{fillStack()}</div>{strokeOverlays()}</>
      );

    // ---------------- DIVIDER ----------------
    case 'divider':
      return (
        <div
          style={getCommonStyles()}
          onClick={handleClick}
        />
      );

    // ---------------- CONTAINER (plain auto-layout grouping box) ----------------
    case 'container':
      return (
        <><div style={boxStyle()} onClick={handleClick}>{fillStack()}</div>{strokeOverlays()}</>
      );

    // ---------------- ELLIPSE / CIRCLE SHAPE ----------------
    case 'ellipse':
      return (
        <><div style={boxStyle({ borderRadius: '9999px' })} onClick={handleClick} className="overflow-hidden">{fillStack()}</div>{strokeOverlays('9999px')}</>
      );

    // ---------------- LINE / ARROW ----------------
    // A stroke along the middle of its box, end to end (the box is turned to
    // the line's angle). Its colour and weight are the stroke's; an arrow has
    // a head at its end. A wide invisible stroke makes it easy to click.
    case 'line':
    case 'arrow': {
      const w = Number(style.width) || 0, mid = (Number(style.height) || 0) / 2;
      const weight = style.strokes?.find(s => s.visible !== false)?.width ?? style.borderWidth ?? 2;
      const colour = style.strokes?.find(s => s.visible !== false)?.color || style.borderColor || style.fillColor || '#ebebec';
      const head = element.type === 'arrow' ? Math.max(8, weight * 4) : 0;
      return (
        <svg width="100%" height="100%" overflow="visible" onClick={handleClick} style={{ display: 'block', opacity: style.opacity ?? 1 }}>
          <line x1={0} y1={mid} x2={w} y2={mid} stroke="transparent" strokeWidth={Math.max(10, weight + 8)} />
          <line x1={0} y1={mid} x2={Math.max(0, w - head * 0.8)} y2={mid} stroke={colour} strokeWidth={weight}
                strokeLinecap={style.strokeCap || 'round'} />
          {head > 0 && <path d={`M ${w - head} ${mid - head / 2} L ${w} ${mid} L ${w - head} ${mid + head / 2} Z`} fill={colour} />}
        </svg>
      );
    }

    // ---------------- POLYGON / TRIANGLE ----------------
    // ---------------- STAR ----------------
    // both drawn as their outline: sides / points, rounded or shaped corners
    case 'polygon':
    case 'star':
      return <OutlineShape element={{ ...element, style }} fallbackFill="#ebebec" onClick={handleClick} />;

    // ---------------- VECTOR PATH (PEN TOOL) ----------------
    // Drawn at the size it was made (vectorData.w/h) and stretched to the
    // element's box, the stroke staying its own width. Points and handles are
    // drawn by the pen overlay while editing, never here.
    case 'vectorPath': {
      const vd = style.vectorData;
      if (!vd || (!vd.points.length && !vd.subpaths?.length)) return <div />;
      const anyClosed = vd.isClosed || !!vd.subpaths?.some(sp => sp.isClosed);
      const filled = anyClosed && style.fillColor && style.fillColor !== 'transparent';
      const regionKeys = Object.keys(vd.regions || {});
      // corner radius rounds every sharp corner of the drawing; drawn at vd's own
      // size and stretched, so the radius is given in those units
      const scale = vd.w && vd.h ? (Number(style.width) / vd.w + Number(style.height) / vd.h) / 2 || 1 : 1;
      const rr = radiusOf(style) / scale;
      const corner = cornerOf(style);
      const soft = smoothOf(style);
      const allD = vectorAllD(vd, rr, corner, soft);
      const regions = regionKeys.length ? vectorRegions(vd).filter(r => vd.regions![r.key]).map(r => ({ ...r, d: roundCornersD(r.d, rr, corner, soft) })) : [];
      return (
        <svg width="100%" height="100%" overflow="visible" onClick={handleClick}
             viewBox={vd.w ? `0 0 ${vd.w} ${vd.h}` : undefined} preserveAspectRatio="none"
             style={{ display: 'block', opacity: style.opacity ?? 1, ...effectsCss(style, false), boxShadow: undefined }}>
          {/* regions filled one by one (paint bucket), each its own colour */}
          {regions.map(r => <path key={r.key} d={r.d} fill={vd.regions![r.key]} stroke="none" />)}
          {hasLayeredPaint(style) ? (
            <SvgPaint d={allD} fills={fillsOf(element)} strokes={strokesOf(element)} fillable={anyClosed && !regions.length} nonScaling />
          ) : <path
            d={allD}
            fill={filled && !regions.length ? style.fillColor : 'none'}
            stroke={style.borderWidth === 0 ? 'none' : (style.borderColor || '#ebebec')}
            strokeWidth={style.borderWidth ?? 2}
            strokeLinecap={style.strokeCap || 'round'}
            strokeLinejoin={style.strokeJoin || 'round'}
            strokeDasharray={style.borderStyle === 'dashed' ? '6 4' : style.borderStyle === 'dotted' ? '1 4' : undefined}
            vectorEffect="non-scaling-stroke"
          />}
        </svg>
      );
    }

    // ---------------- TEXT / HEADING ----------------
    // Edited in place, in its own font and size - the box you see is the box
    // you type in. Ctrl+A inside selects its text only.
    case 'text':
    case 'heading': {
      const mode = textResizeOf(style);
      // Text with auto layout is a box: its fill is the background and its
      // auto-layout padding goes round the words. Plain text has no box - its
      // fill is the letters (textColor), a gradient fill included.
      const boxed = !!style.autoLayout?.enabled;
      const pad = style.autoLayout?.padding;
      const grad = style.fillGradient
        ? (style.fillGradient.type === 'linear'
            ? `linear-gradient(${style.fillGradient.angle ?? 90}deg, ${style.fillGradient.stops.map(x => `${x.color} ${x.offset}%`).join(', ')})`
            : `radial-gradient(circle, ${style.fillGradient.stops.map(x => `${x.color} ${x.offset}%`).join(', ')})`)
        : undefined;
      const textBox: React.CSSProperties = {
        ...getCommonStyles(),
        ...(boxed
          ? { paddingTop: pad?.top, paddingRight: pad?.right, paddingBottom: pad?.bottom, paddingLeft: pad?.left, display: 'block' }
          : { backgroundColor: undefined,
              ...(style.fills ? lettersCss(style.fills)
                  : grad ? { backgroundImage: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : null) }),
        ...(() => {
          const st = style.strokes?.find(x => x.visible && x.width > 0);
          return st && !boxed ? { WebkitTextStroke: `${st.width}px ${paintRgba(st.color, st.opacity)}`, paintOrder: 'stroke fill', boxShadow: undefined, outline: undefined } : null;
        })(),
        ...(mode === 'auto'
          ? { width: 'max-content', height: 'max-content', whiteSpace: 'pre', minWidth: 2 }
          : mode === 'autoHeight'
          ? { width: '100%', height: 'max-content', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }
          : { whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: style.clipContent ? 'hidden' : 'visible' }),
        // up / down in a box taller than the text (a fixed box, or text with
        // auto layout): a column the text sits at the top, middle or bottom of
        ...((mode === 'fixed' || boxed) && style.textAlignV && style.textAlignV !== 'top'
          ? { display: 'flex', flexDirection: 'column' as const, justifyContent: style.textAlignV === 'middle' ? 'center' : 'flex-end' }
          : null),
        // vertical trim: the box is exactly cap height to baseline
        ...(style.trimText ? ({ textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } as React.CSSProperties) : null)
      };
      if (isInlineEditing && !isInteractive) {
        return (
          <div
            key="edit"
            ref={textRef}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            onInput={(e) => {
              const runs = readRuns(e.currentTarget);
              updateElementSemanticProps(element.id, { label: runs.map(r => r.text).join(''), runs: normalize(runs) });
            }}
            onBlur={(e) => {
              // clicking into the side panel keeps the selected words, for Typography
              if (!(e.relatedTarget as HTMLElement | null)?.closest?.('aside')) clearTextSel();
              setInlineEditingElementId(null);
              // as in Figma, text left empty goes away
              if (!e.currentTarget.innerText.trim()) deleteElement(element.id);
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ ...textBox, outline: 'none', cursor: 'text', userSelect: 'text', caretColor: style.textColor }}
          />
        );
      }
      return (
        <div
          key="view"
          ref={textRef}
          style={textBox}
          onClick={handleClick}
          // edits only once selected: in a group, the first double-click
          // steps into the group and selects this text
          onDoubleClick={() => {
            if (!isInteractive && useProjectStore.getState().selectedElementIds.includes(element.id)) setInlineEditingElementId(element.id);
          }}
          title="Double-click to edit text"
        >
          {element.isMasterComponent && (
            <span className="text-[10px] text-[rgb(235,235,236)] mr-1 opacity-60">❖</span>
          )}
          {element.isInstance && (
            <span className="text-[10px] text-[rgb(235,235,236)] mr-1 opacity-60">◇</span>
          )}
          {semanticProps.label ? (semanticProps.runs
            ? runsOf(element).map((r, i) => <span key={i} style={runCss(r)}>{r.text}</span>)
            : semanticProps.label) : (
            <span className="italic opacity-40 select-none">Type something...</span>
          )}
        </div>
      );
    }

    // ---------------- ICON (the icon library) ----------------
    case 'icon':
      return <div style={{ width: '100%', height: '100%' }} onClick={handleClick}><IconView element={element} style={style} /></div>;

    // ---------------- BUTTON ----------------
    case 'button':
    case 'pillButton':
      return (
        <button
          style={getCommonStyles()}
          onClick={handleClick}
          onDoubleClick={editOnDoubleClick}
          className={`flex items-center justify-center font-bold transition-[filter,transform] ${
            isInteractive ? 'active:scale-95 cursor-pointer hover:brightness-110' : ''
          }`}
        >
          {semanticProps.iconPosition === 'left' && renderIcon(semanticProps.iconName, 18, 'mr-2')}
          {isInlineEditing && !isInteractive ? inlineText('label', 'Button') : <span>{semanticProps.label || 'Button'}</span>}
          {semanticProps.iconPosition === 'right' && renderIcon(semanticProps.iconName, 18, 'ml-2')}
        </button>
      );

    // ---------------- FAB (Floating Action Button) ----------------
    case 'fab':
      return (
        <button
          style={getCommonStyles()}
          onClick={handleClick}
          className={`flex items-center justify-center rounded-full transition-transform ${
            isInteractive ? 'active:scale-90 cursor-pointer hover:scale-105' : ''
          }`}
        >
          {renderIcon(semanticProps.iconName || 'Plus', 24)}
        </button>
      );

    // ---------------- TEXT INPUT ----------------
    case 'textInput':
      return (
        <div style={getCommonStyles()} onDoubleClick={editOnDoubleClick} className="flex flex-col justify-center relative">
          {semanticProps.label && (
            <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] mb-1 pointer-events-none">
              {semanticProps.label}
            </label>
          )}
          <div className="flex items-center gap-2 w-full">
            {semanticProps.iconName && renderIcon(semanticProps.iconName, 16, 'text-[rgba(235,235,236,0.5)] shrink-0')}
            {isInlineEditing && !isInteractive ? inlineText('placeholder', 'Enter text...') : <input
              type="text"
              disabled={!isInteractive}
              style={isInteractive ? undefined : { pointerEvents: 'none' }}
              value={internalValue}
              onChange={(e) => isInteractive && setInternalValue(e.target.value)}
              placeholder={semanticProps.placeholder || 'Enter text...'}
              className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)] font-normal"
            />}
          </div>
        </div>
      );

    // ---------------- PASSWORD INPUT ----------------
    case 'passwordInput':
      return (
        <div style={getCommonStyles()} onDoubleClick={editOnDoubleClick} className="flex flex-col justify-center relative">
          {semanticProps.label && (
            <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] mb-1 pointer-events-none">
              {semanticProps.label}
            </label>
          )}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              <Icons.Lock size={15} className="text-[rgba(235,235,236,0.5)] shrink-0" />
              {isInlineEditing && !isInteractive ? inlineText('placeholder', '••••••••') : <input
                type="password"
                disabled={!isInteractive}
              style={isInteractive ? undefined : { pointerEvents: 'none' }}
                value={internalValue}
                onChange={(e) => isInteractive && setInternalValue(e.target.value)}
                placeholder={semanticProps.placeholder || '••••••••'}
                className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)] font-normal"
              />}
            </div>
            <Icons.Eye size={16} className="text-[rgba(235,235,236,0.5)] cursor-pointer hover:text-[rgb(235,235,236)]" />
          </div>
        </div>
      );

    // ---------------- SEARCH BAR ----------------
    case 'searchBar':
      return (
        <div style={getCommonStyles()} onDoubleClick={editOnDoubleClick} className="flex items-center gap-2.5">
          <Icons.Search size={16} className="text-[rgba(235,235,236,0.5)] shrink-0" />
          {isInlineEditing && !isInteractive ? inlineText('placeholder', 'Search...') : <input
            type="text"
            disabled={!isInteractive}
              style={isInteractive ? undefined : { pointerEvents: 'none' }}
            value={internalValue}
            onChange={(e) => isInteractive && setInternalValue(e.target.value)}
            placeholder={semanticProps.placeholder || 'Search...'}
            className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)]"
          />}
          {internalValue && (
            <Icons.X 
              size={14} 
              className="text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)] cursor-pointer" 
              onClick={() => isInteractive && setInternalValue('')}
            />
          )}
        </div>
      );

    // ---------------- TOGGLE SWITCH ----------------
    case 'toggleSwitch':
      return (
        <div 
          style={getCommonStyles()} 
          onClick={() => {
            if (isInteractive) {
              setInternalChecked(!internalChecked);
              handleClick({} as any);
            }
          }}
          className={`flex items-center justify-between ${isInteractive ? 'cursor-pointer' : ''}`}
        >
          <span className="text-sm font-medium text-[rgb(235,235,236)]">{semanticProps.label || 'Toggle Option'}</span>
          <div className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
            internalChecked ? 'bg-[rgb(235,235,236)] justify-end' : 'bg-[rgba(235,235,236,0.15)] justify-start'
          }`}>
            <div className={`w-5 h-5 rounded-full shadow-md transition-transform ${
              internalChecked ? 'bg-[rgb(20,20,19)]' : 'bg-[rgba(235,235,236,0.6)]'
            }`} />
          </div>
        </div>
      );

    // ---------------- SLIDER ----------------
    case 'slider':
      return (
        <div style={getCommonStyles()} className="flex flex-col justify-center">
          <div className="flex justify-between items-center text-xs font-medium text-[rgb(235,235,236)] mb-1.5">
            <span>{semanticProps.label || 'Slider Value'}</span>
            <span className="text-[rgb(235,235,236)] font-bold">{internalValue}%</span>
          </div>
          <input
            type="range"
            min={semanticProps.min ?? 0}
            max={semanticProps.max ?? 100}
            value={internalValue || 50}
            disabled={!isInteractive}
              style={isInteractive ? undefined : { pointerEvents: 'none' }}
            onChange={(e) => isInteractive && setInternalValue(Number(e.target.value))}
            className="w-full accent-[rgb(235,235,236)] cursor-pointer h-1.5 bg-[rgba(235,235,236,0.2)] rounded-lg appearance-none"
          />
        </div>
      );

    // ---------------- SELECT DROPDOWN ----------------
    case 'selectDropdown':
      return (
        <div style={getCommonStyles()} className="flex flex-col justify-center">
          {semanticProps.label && (
            <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] mb-0.5 pointer-events-none">
              {semanticProps.label}
            </label>
          )}
          <div className="flex items-center justify-between text-sm text-[rgb(235,235,236)]">
            <span>{internalValue || semanticProps.value || 'Select option...'}</span>
            <Icons.ChevronDown size={16} className="text-[rgba(235,235,236,0.5)]" />
          </div>
        </div>
      );

    // ---------------- NAVBAR ----------------
    case 'navbar':
      return (
        <div style={getCommonStyles()} className="flex items-center justify-between">
          <div 
            className={`flex items-center gap-2 ${isInteractive ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={handleClick}
          >
            {semanticProps.iconName && renderIcon(semanticProps.iconName, 20, 'text-[rgb(235,235,236)]')}
            <span className="font-bold text-base text-[rgb(235,235,236)]">{semanticProps.label || 'Navigation'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Icons.Bell size={18} className="text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] cursor-pointer" />
            <Icons.MoreVertical size={18} className="text-[rgba(235,235,236,0.6)] hover:text-[rgb(235,235,236)] cursor-pointer" />
          </div>
        </div>
      );

    // ---------------- BOTTOM TABS ----------------
    case 'bottomTabs':
      const tabs = semanticProps.options || [
        { label: 'Home', value: 'home', icon: 'Home' },
        { label: 'Search', value: 'search', icon: 'Search' },
        { label: 'Profile', value: 'profile', icon: 'User' }
      ];
      return (
        <div style={getCommonStyles()} className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  if (isInteractive) {
                    setSelectedTab(tab.value);
                    handleClick({} as any);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-[rgb(235,235,236)] font-bold' : 'text-[rgba(235,235,236,0.45)] hover:text-[rgb(235,235,236)]'
                }`}
              >
                {renderIcon(tab.icon || 'Circle', 20, isActive ? 'text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.45)]')}
                <span className="text-[11px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      );

    // ---------------- SEGMENTED CONTROL ----------------
    case 'segmentedControl':
      const segments = semanticProps.options || [
        { label: 'Tab 1', value: '1' },
        { label: 'Tab 2', value: '2' }
      ];
      return (
        <div style={getCommonStyles()} className="flex items-center p-1 bg-[rgba(235,235,236,0.06)] rounded-xl border border-[rgba(235,235,236,0.1)]">
          {segments.map((seg) => {
            const isActive = selectedTab === seg.value;
            return (
              <button
                key={seg.value}
                onClick={() => isInteractive && setSelectedTab(seg.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center transition-all ${
                  isActive 
                    ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] shadow-md font-bold' 
                    : 'text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      );

    // ---------------- CARD ----------------
    case 'card':
      return (
        <div style={getCommonStyles()} onClick={handleClick} className="overflow-hidden">
          {semanticProps.label && (
            <div className="text-xs uppercase tracking-wider font-semibold text-[rgba(235,235,236,0.5)] mb-1">
              {semanticProps.label}
            </div>
          )}
          {semanticProps.value && (
            <div className="text-2xl font-black text-[rgb(235,235,236)] tracking-tight my-0.5">
              {semanticProps.value}
            </div>
          )}
          {semanticProps.placeholder && (
            <div className="text-xs font-medium text-[rgba(235,235,236,0.65)]">
              {semanticProps.placeholder}
            </div>
          )}
        </div>
      );

    // ---------------- MODAL / DIALOG ----------------
    case 'modal':
      return (
        <div style={getCommonStyles()} onClick={handleClick} className="overflow-hidden relative">
          <Icons.X size={16} className="absolute top-0 right-0 text-[rgba(235,235,236,0.4)]" />
          <div className="text-base font-bold text-[rgb(235,235,236)] pr-6">
            {semanticProps.label || 'Dialog Title'}
          </div>
          {semanticProps.placeholder && (
            <div className="text-xs font-medium text-[rgba(235,235,236,0.6)] mt-1.5 leading-relaxed">
              {semanticProps.placeholder}
            </div>
          )}
        </div>
      );

    // ---------------- BOTTOM SHEET ----------------
    case 'bottomSheet':
      return (
        <div style={getCommonStyles()} onClick={handleClick} className="overflow-hidden">
          <div className="w-10 h-1 rounded-full bg-[rgba(235,235,236,0.25)] mx-auto mb-3" />
          <div className="text-sm font-bold text-[rgb(235,235,236)]">
            {semanticProps.label || 'Bottom Sheet'}
          </div>
        </div>
      );

    // ---------------- FLOW CONNECTOR (FigJam) ----------------
    case 'connector':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }} onClick={handleClick}>
          {semanticProps.connectorLabel && (
            <div className="absolute inset-x-0 top-0 text-center text-[11px] font-semibold text-[rgba(235,235,236,0.7)]">
              {semanticProps.connectorLabel}
            </div>
          )}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
            <path
              d={semanticProps.connectorType === 'straight' ? 'M2,50 L94,50' : 'M2,50 Q50,10 94,50'}
              fill="none"
              stroke={style.borderColor || 'rgb(235,235,236)'}
              strokeWidth={style.borderWidth || 2}
              vectorEffect="non-scaling-stroke"
            />
            {semanticProps.connectorEndArrow !== false && (
              <polygon points="88,44 98,50 88,56" fill={style.borderColor || 'rgb(235,235,236)'} />
            )}
            {semanticProps.connectorStartArrow && (
              <polygon points="12,44 2,50 12,56" fill={style.borderColor || 'rgb(235,235,236)'} />
            )}
          </svg>
        </div>
      );

    // ---------------- METRIC CARD ----------------
    case 'metricCard':
      return (
        <div style={getCommonStyles()} className="flex flex-col justify-between">
          <div className="text-xs font-medium text-[rgba(235,235,236,0.5)]">{semanticProps.label || 'Metric'}</div>
          <div className="text-xl font-black text-[rgb(235,235,236)] tracking-tight">{semanticProps.value || '$0.00'}</div>
          <div className="flex items-center gap-1 text-xs text-[rgb(235,235,236)] font-semibold">
            <Icons.TrendingUp size={13} />
            <span>{semanticProps.placeholder || '+12.5%'}</span>
          </div>
        </div>
      );

    // ---------------- IMAGE ----------------
    case 'image':
      return (
        <img
          src={semanticProps.src || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80'}
          alt={semanticProps.alt || semanticProps.label || 'Image'}
          style={{ ...getCommonStyles(), objectFit: 'contain', backgroundColor: undefined }}
          className="pointer-events-none select-none"
          draggable={false}
          onClick={handleClick}
        />
      );

    // ---------------- VIDEO ----------------
    case 'video':
      return <VideoView element={element} style={getCommonStyles()} />;

    // ---------------- AVATAR ----------------
    case 'avatar':
      return (
        <div style={getCommonStyles()} className="relative inline-block overflow-hidden">
          <img
            src={semanticProps.src || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={semanticProps.label || 'User'}
            className="w-full h-full object-cover rounded-full"
          />
          {semanticProps.checked && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[rgb(235,235,236)] border-2 border-[rgb(20,20,19)] rounded-full" />
          )}
        </div>
      );

    // ---------------- BADGE ----------------
    case 'badge':
    case 'chip':
      return (
        <div style={getCommonStyles()} className="flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-bold">
          {semanticProps.iconName && renderIcon(semanticProps.iconName, 14)}
          <span>{semanticProps.label || 'Badge'}</span>
        </div>
      );

    // ---------------- FIGJAM STICKY NOTE ----------------
    case 'stickyNote':
      return (
        <div 
          style={getCommonStyles()} 
          className="flex flex-col justify-between select-text shadow-figjam font-figjam transform -rotate-1 hover:rotate-0 transition-transform"
        >
          <div className="whitespace-pre-wrap leading-relaxed text-sm font-semibold">
            {semanticProps.label || '💡 Ideation note...'}
          </div>
          {semanticProps.author && (
            <div className="text-[11px] opacity-75 font-sans font-medium text-right mt-2">
              — {semanticProps.author}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div style={getCommonStyles()} onClick={handleClick} className="flex items-center text-[rgb(235,235,236)]">
          {semanticProps.label || 'Element'}
        </div>
      );
  }
};
