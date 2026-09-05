import React, { useState } from 'react';
import { UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

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
  // In the live player, layer hover/pressed style overrides on top of the base
  // style — an "interactive component" without a full variant-set system.
  const style = isInteractive && element.states
    ? {
        ...element.style,
        ...(isHovering ? element.states.hover : null),
        ...(isPressed ? element.states.pressed : null)
      }
    : element.style;
  const { inlineEditingElementId, setInlineEditingElementId, updateElementSemanticProps } = useProjectStore();

  const [internalValue, setInternalValue] = useState<any>(semanticProps.value ?? '');
  const [internalChecked, setInternalChecked] = useState<boolean>(!!semanticProps.checked);
  const [selectedTab, setSelectedTab] = useState<string>(semanticProps.value?.toString() || 'home');

  const isInlineEditing = inlineEditingElementId === element.id;

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
      transform: style.rotation ? `rotate(${style.rotation}deg)` : undefined,
      color: style.textColor,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      textAlign: style.textAlign,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      boxShadow: style.boxShadow,
      borderWidth: style.borderWidth,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle || (style.borderWidth ? 'solid' : undefined),
      paddingTop: style.padding?.top,
      paddingRight: style.padding?.right,
      paddingBottom: style.padding?.bottom,
      paddingLeft: style.padding?.left,
      backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
      display: style.display,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap
    };

    if (style.fillGradient) {
      const stops = style.fillGradient.stops.map(s => `${s.color} ${s.offset}%`).join(', ');
      css.background = style.fillGradient.type === 'linear' 
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

    return css;
  };

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
      return (
        <div
          style={getCommonStyles()}
          onClick={handleClick}
          className="transition-all"
        />
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
        <div
          style={getCommonStyles()}
          onClick={handleClick}
          className="transition-all"
        />
      );

    // ---------------- ELLIPSE / CIRCLE SHAPE ----------------
    case 'ellipse':
      return (
        <div
          style={{
            ...getCommonStyles(),
            borderRadius: '9999px'
          }}
          onClick={handleClick}
          className="transition-all overflow-hidden"
        />
      );

    // ---------------- LINE SHAPE ----------------
    case 'line':
      return (
        <div
          style={{
            width: '100%',
            height: style.height || 2,
            backgroundColor: style.fillColor || style.borderColor || '#ebebec',
            transform: style.rotation ? `rotate(${style.rotation}deg)` : undefined
          }}
          onClick={handleClick}
        />
      );

    // ---------------- ARROW SHAPE ----------------
    case 'arrow':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transform: style.rotation ? `rotate(${style.rotation}deg)` : undefined
          }}
          onClick={handleClick}
        >
          <div className="flex-1 h-[2px] bg-[rgb(235,235,236)]" />
          <Icons.ChevronRight size={18} className="text-[rgb(235,235,236)] -ml-2 shrink-0" />
        </div>
      );

    // ---------------- POLYGON / TRIANGLE ----------------
    case 'polygon':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" onClick={handleClick}>
          <polygon
            points="50,5 95,95 5,95"
            fill={style.fillColor || '#ebebec'}
            stroke={style.borderColor || 'none'}
            strokeWidth={style.borderWidth || 0}
          />
        </svg>
      );

    // ---------------- STAR ----------------
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" onClick={handleClick}>
          <polygon
            points="50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36"
            fill={style.fillColor || '#ebebec'}
            stroke={style.borderColor || 'none'}
            strokeWidth={style.borderWidth || 0}
          />
        </svg>
      );

    // ---------------- VECTOR PATH (PEN TOOL) ----------------
    case 'vectorPath':
      const vectorData = style.vectorData;
      if (!vectorData || vectorData.points.length === 0) {
        return <div style={getCommonStyles()} />;
      }

      // Generate SVG path string
      let pathD = '';
      vectorData.points.forEach((pt, i) => {
        if (i === 0) {
          pathD += `M ${pt.x} ${pt.y} `;
        } else {
          pathD += `L ${pt.x} ${pt.y} `;
        }
      });
      if (vectorData.isClosed) {
        pathD += 'Z';
      }

      return (
        <svg className="w-full h-full overflow-visible pointer-events-none" onClick={handleClick}>
          {/* Faces */}
          {vectorData.faces.map(face => (
            <path
              key={face.id}
              d={pathD}
              fill={face.filled ? (face.fillColor || style.fillColor || '#ebebec') : 'none'}
              opacity={face.fillOpacity || 1}
            />
          ))}

          {/* Stroke Path */}
          <path
            d={pathD}
            fill={vectorData.faces.length > 0 ? 'none' : (style.fillColor || 'none')}
            stroke={style.borderColor || '#ebebec'}
            strokeWidth={style.borderWidth || 2}
            strokeDasharray={style.borderStyle === 'dashed' ? '6 4' : undefined}
          />

          {/* Points */}
          {vectorData.points.map((pt, i) => (
            <circle
              key={pt.id}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="rgb(235, 235, 236)"
              stroke="rgb(20, 20, 19)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      );

    // ---------------- TEXT / HEADING WITH INLINE EDITING ----------------
    case 'text':
    case 'heading':
      if (isInlineEditing && !isInteractive) {
        return (
          <textarea
            autoFocus
            value={semanticProps.label || ''}
            onChange={(e) => updateElementSemanticProps(element.id, { label: e.target.value })}
            onBlur={() => setInlineEditingElementId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setInlineEditingElementId(null);
            }}
            style={{
              ...getCommonStyles(),
              background: 'rgba(20, 20, 19, 0.9)',
              border: '1px solid rgb(235, 235, 236)',
              outline: 'none',
              resize: 'none',
              color: 'rgb(235, 235, 236)'
            }}
            className="rounded p-1 font-sans shadow-lg select-text"
          />
        );
      }

      {
        // A fixed-size box (drag-created) lets its content spill past the
        // boundary instead of clipping it, and keeps a faint outline visible
        // at all times — not just while selected — so the fixed bounds this
        // will eventually clip/scroll against stay legible.
      }
      return (
        <div
          style={{
            ...getCommonStyles(),
            // width/height:100% (from getCommonStyles) would fight a max-content
            // sized parent in a circular way — auto-size boxes need the inner
            // element to size itself from its own text, not from the parent.
            ...(style.autoSize === true
              ? { width: 'max-content', height: 'max-content', whiteSpace: 'pre', paddingRight: 4 }
              : {
                  overflow: style.clipContent ? 'auto' : 'visible',
                  outline: !style.borderWidth ? '1px dashed rgba(235,235,236,0.3)' : undefined,
                  outlineOffset: '1px'
                })
          }}
          onClick={handleClick}
          onDoubleClick={() => !isInteractive && setInlineEditingElementId(element.id)}
          className="flex items-center select-text cursor-text"
          title="Double-click to edit text"
        >
          {element.isMasterComponent && (
            <span className="text-[10px] text-[rgb(235,235,236)] mr-1 opacity-60">❖</span>
          )}
          {element.isInstance && (
            <span className="text-[10px] text-[rgb(235,235,236)] mr-1 opacity-60">◇</span>
          )}
          {semanticProps.label ? (
            <span>{semanticProps.label}</span>
          ) : (
            <span className="italic opacity-40 select-none">Type something...</span>
          )}
        </div>
      );

    // ---------------- BUTTON ----------------
    case 'button':
    case 'pillButton':
      return (
        <button
          style={getCommonStyles()}
          onClick={handleClick}
          className={`flex items-center justify-center font-bold transition-all ${
            isInteractive ? 'active:scale-95 cursor-pointer hover:brightness-110' : ''
          }`}
        >
          {semanticProps.iconPosition === 'left' && renderIcon(semanticProps.iconName, 18, 'mr-2')}
          <span>{semanticProps.label || 'Button'}</span>
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
        <div style={getCommonStyles()} className="flex flex-col justify-center relative">
          {semanticProps.label && (
            <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] mb-1 pointer-events-none">
              {semanticProps.label}
            </label>
          )}
          <div className="flex items-center gap-2 w-full">
            {semanticProps.iconName && renderIcon(semanticProps.iconName, 16, 'text-[rgba(235,235,236,0.5)] shrink-0')}
            <input
              type="text"
              disabled={!isInteractive}
              value={internalValue}
              onChange={(e) => isInteractive && setInternalValue(e.target.value)}
              placeholder={semanticProps.placeholder || 'Enter text...'}
              className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)] font-normal"
            />
          </div>
        </div>
      );

    // ---------------- PASSWORD INPUT ----------------
    case 'passwordInput':
      return (
        <div style={getCommonStyles()} className="flex flex-col justify-center relative">
          {semanticProps.label && (
            <label className="text-[11px] font-medium text-[rgba(235,235,236,0.55)] mb-1 pointer-events-none">
              {semanticProps.label}
            </label>
          )}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1">
              <Icons.Lock size={15} className="text-[rgba(235,235,236,0.5)] shrink-0" />
              <input
                type="password"
                disabled={!isInteractive}
                value={internalValue}
                onChange={(e) => isInteractive && setInternalValue(e.target.value)}
                placeholder={semanticProps.placeholder || '••••••••'}
                className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)] font-normal"
              />
            </div>
            <Icons.Eye size={16} className="text-[rgba(235,235,236,0.5)] cursor-pointer hover:text-[rgb(235,235,236)]" />
          </div>
        </div>
      );

    // ---------------- SEARCH BAR ----------------
    case 'searchBar':
      return (
        <div style={getCommonStyles()} className="flex items-center gap-2.5">
          <Icons.Search size={16} className="text-[rgba(235,235,236,0.5)] shrink-0" />
          <input
            type="text"
            disabled={!isInteractive}
            value={internalValue}
            onChange={(e) => isInteractive && setInternalValue(e.target.value)}
            placeholder={semanticProps.placeholder || 'Search...'}
            className="bg-transparent border-none outline-none w-full text-[rgb(235,235,236)] text-sm placeholder-[rgba(235,235,236,0.35)]"
          />
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
