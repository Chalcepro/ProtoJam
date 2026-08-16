import React, { useState } from 'react';
import { UIElement, DeviceFrame, SectionFrame } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

interface DesignPropertiesProps {
  element?: UIElement;
  frame?: DeviceFrame;
  section?: SectionFrame;
}

export const DesignProperties: React.FC<DesignPropertiesProps> = ({ element, frame, section }) => {
  const {
    updateElementStyle,
    updateElementSemanticProps,
    updateFrame,
    updateSection,
    alignSelectedElements,
    toggleAutoLayout,
    updateAutoLayout,
    createMasterComponent,
    instantiateComponent,
    detachInstance,
    bringToFront,
    sendToBack
  } = useProjectStore();

  const [fillType, setFillType] = useState<'solid' | 'gradient' | 'image'>('solid');
  const [isIndividualCorners, setIsIndividualCorners] = useState(false);
  const [isIndividualPadding, setIsIndividualPadding] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);

  if (!element && !frame && !section) {
    return (
      <div className="p-6 text-center text-[rgba(235,235,236,0.4)] text-xs space-y-3 select-none">
        <Icons.Sliders size={24} className="mx-auto opacity-30 text-[rgb(235,235,236)]" />
        <p className="font-medium text-[rgb(235,235,236)]">No Selection</p>
        <p className="text-[11px] opacity-70">
          Select a frame, section, shape, or UI component to inspect and edit layout, fills, strokes, effects, and typography.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // 1. FRAME / SCREEN INSPECTOR
  // ----------------------------------------------------
  if (frame) {
    return (
      <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
        {/* Alignment & Screen Geometry */}
        <div>
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            Screen Dimensions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">X</span>
              <input
                type="number"
                value={frame.x}
                onChange={(e) => updateFrame(frame.id, { x: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">Y</span>
              <input
                type="number"
                value={frame.y}
                onChange={(e) => updateFrame(frame.id, { y: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">W</span>
              <input
                type="number"
                value={frame.width}
                onChange={(e) => updateFrame(frame.id, { width: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px] font-mono">H</span>
              <input
                type="number"
                value={frame.height}
                onChange={(e) => updateFrame(frame.id, { height: Number(e.target.value) })}
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Screen Auto Layout */}
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Auto Layout</span>
            <button
              onClick={() => toggleAutoLayout(frame.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                frame.autoLayout?.enabled
                  ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                  : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
              }`}
            >
              {frame.autoLayout?.enabled ? 'Active' : '+ Add'}
            </button>
          </div>

          {frame.autoLayout?.enabled && (
            <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Direction</span>
                <div className="flex bg-[rgba(235,235,236,0.06)] rounded p-0.5 border border-[rgba(235,235,236,0.08)]">
                  <button
                    onClick={() => updateAutoLayout(frame.id, { direction: 'horizontal' })}
                    className={`px-2 py-1 rounded text-[10px] ${
                      frame.autoLayout.direction === 'horizontal' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    onClick={() => updateAutoLayout(frame.id, { direction: 'vertical' })}
                    className={`px-2 py-1 rounded text-[10px] ${
                      frame.autoLayout.direction === 'vertical' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                    }`}
                  >
                    Vertical
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Item Gap</span>
                <input
                  type="number"
                  value={frame.autoLayout.gap}
                  onChange={(e) => updateAutoLayout(frame.id, { gap: Number(e.target.value) })}
                  className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Screen Background Color */}
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            Screen Background
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={frame.backgroundColor || '#141413'}
              onChange={(e) => updateFrame(frame.id, { backgroundColor: e.target.value })}
              className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={frame.backgroundColor || '#141413'}
              onChange={(e) => updateFrame(frame.id, { backgroundColor: e.target.value })}
              className="bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] font-mono text-xs flex-1 outline-none"
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. SECTION INSPECTOR
  // ----------------------------------------------------
  if (section) {
    return (
      <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] select-none">
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
          Section Properties
        </div>
        <div className="space-y-2">
          <label className="text-[11px] text-[rgba(235,235,236,0.55)]">Section Title</label>
          <input
            type="text"
            value={section.name}
            onChange={(e) => updateSection(section.id, { name: e.target.value })}
            className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono">W</span>
            <input
              type="number"
              value={section.width}
              onChange={(e) => updateSection(section.id, { width: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono">H</span>
            <input
              type="number"
              value={section.height}
              onChange={(e) => updateSection(section.id, { height: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. UI ELEMENT & VECTOR DESIGN INSPECTOR
  // ----------------------------------------------------
  const { style } = element!;

  // Copy CSS helper
  const handleCopyCss = () => {
    const cssLines = [
      `width: ${style.width}px;`,
      `height: ${style.height}px;`,
      style.fillColor ? `background-color: ${style.fillColor};` : '',
      style.borderColor ? `border: ${style.borderWidth || 1}px solid ${style.borderColor};` : '',
      style.borderRadius ? `border-radius: ${typeof style.borderRadius === 'number' ? `${style.borderRadius}px` : `${style.borderRadius.tl}px ${style.borderRadius.tr}px ${style.borderRadius.br}px ${style.borderRadius.bl}px`};` : '',
      style.opacity !== undefined ? `opacity: ${style.opacity};` : '',
      style.boxShadow ? `box-shadow: ${style.boxShadow};` : '',
      style.fontSize ? `font-size: ${style.fontSize}px;` : '',
      style.textColor ? `color: ${style.textColor};` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(cssLines);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const cornerRadiusObj = typeof style.borderRadius === 'object' && style.borderRadius !== null
    ? style.borderRadius
    : { tl: Number(style.borderRadius) || 0, tr: Number(style.borderRadius) || 0, br: Number(style.borderRadius) || 0, bl: Number(style.borderRadius) || 0 };

  const paddingObj = style.padding || { top: 12, right: 12, bottom: 12, left: 12 };

  return (
    <div className="p-3.5 space-y-4 text-xs text-[rgb(235,235,236)] overflow-y-auto select-none">
      
      {/* 1. ALIGNMENT & DISTRIBUTION TOOLBAR */}
      <div className="flex items-center justify-between bg-[rgba(235,235,236,0.03)] p-1 rounded-xl border border-[rgba(235,235,236,0.08)]">
        <button
          onClick={() => alignSelectedElements('left')}
          title="Align Left"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignLeft size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('center')}
          title="Align Horizontal Center"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignCenter size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('right')}
          title="Align Right"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignRight size={13} />
        </button>
        <div className="h-3 w-px bg-[rgba(235,235,236,0.1)]" />
        <button
          onClick={() => alignSelectedElements('top')}
          title="Align Top"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignStartVertical size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('middle')}
          title="Align Vertical Center"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignCenterVertical size={13} />
        </button>
        <button
          onClick={() => alignSelectedElements('bottom')}
          title="Align Bottom"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.AlignEndVertical size={13} />
        </button>
        <div className="h-3 w-px bg-[rgba(235,235,236,0.1)]" />
        <button
          onClick={() => bringToFront(element!.id)}
          title="Bring to Front"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.BringToFront size={13} />
        </button>
        <button
          onClick={() => sendToBack(element!.id)}
          title="Send to Back"
          className="p-1.5 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.55)] hover:text-[rgb(235,235,236)]"
        >
          <Icons.SendToBack size={13} />
        </button>
      </div>

      {/* 2. MASTER COMPONENT BAR */}
      <div className="bg-[rgba(235,235,236,0.02)] p-2 rounded-xl border border-[rgba(235,235,236,0.08)]">
        {element?.isMasterComponent ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-[rgb(235,235,236)] text-[11px]">
              <span className="text-sm">❖</span> Master Component
            </span>
            <button
              onClick={() => instantiateComponent(element.id)}
              className="px-2 py-1 rounded bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              + Instance
            </button>
          </div>
        ) : element?.isInstance ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[rgba(235,235,236,0.7)] font-medium text-[11px]">
              <span className="text-sm">◇</span> Component Instance
            </span>
            <button
              onClick={() => detachInstance(element.id)}
              className="px-2 py-1 rounded bg-[rgba(235,235,236,0.08)] hover:bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] text-[10px] transition-colors"
            >
              Detach
            </button>
          </div>
        ) : (
          <button
            onClick={() => createMasterComponent(element!.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[rgba(235,235,236,0.04)] hover:bg-[rgba(235,235,236,0.08)] text-[rgb(235,235,236)] font-bold text-[11px] transition-colors border border-[rgba(235,235,236,0.06)]"
          >
            <span>❖</span>
            <span>Create Master Component</span>
          </button>
        )}
      </div>

      {/* 3. TRANSFORM & GEOMETRY */}
      <div>
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Dimensions & Position</span>
          <div className="flex items-center gap-1">
            {/* Flip Horizontal */}
            <button
              onClick={() => updateElementStyle(element!.id, { rotation: ((style.rotation || 0) + 180) % 360 })}
              title="Rotate 180°"
              className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]"
            >
              <Icons.RotateCw size={11} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">X</span>
            <input
              type="number"
              value={Number(style.x)}
              onChange={(e) => updateElementStyle(element!.id, { x: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">Y</span>
            <input
              type="number"
              value={Number(style.y)}
              onChange={(e) => updateElementStyle(element!.id, { y: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">W</span>
            <input
              type="number"
              value={Number(style.width)}
              onChange={(e) => updateElementStyle(element!.id, { width: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">H</span>
            <input
              type="number"
              value={Number(style.height)}
              onChange={(e) => updateElementStyle(element!.id, { height: Number(e.target.value) })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 font-mono text-[10px]">∠</span>
            <input
              type="number"
              value={style.rotation || 0}
              onChange={(e) => updateElementStyle(element!.id, { rotation: Number(e.target.value) })}
              placeholder="0°"
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
          </div>
          <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
            <span className="text-[rgba(235,235,236,0.4)] mr-2 text-[10px]">Opacity</span>
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round((style.opacity ?? 1) * 100)}
              onChange={(e) => updateElementStyle(element!.id, { opacity: Number(e.target.value) / 100 })}
              className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
            />
            <span className="text-[10px] text-[rgba(235,235,236,0.4)] font-mono">%</span>
          </div>
        </div>

        {/* Corner Radius Controls (Uniform vs Individual) */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[rgba(235,235,236,0.5)]">Corner Radius</span>
            <button
              onClick={() => setIsIndividualCorners(!isIndividualCorners)}
              className={`p-1 rounded text-[10px] transition-colors ${
                isIndividualCorners ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] font-bold' : 'text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]'
              }`}
              title="Toggle Individual Corners"
            >
              <Icons.Square size={11} />
            </button>
          </div>

          {!isIndividualCorners ? (
            <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
              <Icons.CornerUpRight size={12} className="text-[rgba(235,235,236,0.4)] mr-2" />
              <input
                type="number"
                value={typeof style.borderRadius === 'number' ? style.borderRadius : cornerRadiusObj.tl}
                onChange={(e) => updateElementStyle(element!.id, { borderRadius: Number(e.target.value) })}
                placeholder="Radius px"
                className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {(['tl', 'tr', 'br', 'bl'] as const).map(corner => (
                <div key={corner} className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-md px-1.5 py-1 border border-[rgba(235,235,236,0.08)]">
                  <span className="text-[9px] font-mono text-[rgba(235,235,236,0.3)] uppercase mr-1">{corner}</span>
                  <input
                    type="number"
                    value={cornerRadiusObj[corner]}
                    onChange={(e) => updateElementStyle(element!.id, {
                      borderRadius: {
                        ...cornerRadiusObj,
                        [corner]: Number(e.target.value)
                      }
                    })}
                    className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. AUTO LAYOUT CONTROLS */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Auto Layout (Shift+A)</span>
          <button
            onClick={() => toggleAutoLayout(element!.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              style.autoLayout?.enabled
                ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)]'
                : 'bg-[rgba(235,235,236,0.06)] text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]'
            }`}
          >
            {style.autoLayout?.enabled ? 'Active' : '+ Add'}
          </button>
        </div>

        {style.autoLayout?.enabled && (
          <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Direction</span>
              <div className="flex bg-[rgba(235,235,236,0.06)] rounded p-0.5 border border-[rgba(235,235,236,0.08)]">
                <button
                  onClick={() => updateAutoLayout(element!.id, { direction: 'horizontal' })}
                  className={`px-2 py-1 rounded text-[10px] ${
                    style.autoLayout.direction === 'horizontal' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => updateAutoLayout(element!.id, { direction: 'vertical' })}
                  className={`px-2 py-1 rounded text-[10px] ${
                    style.autoLayout.direction === 'vertical' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
                  }`}
                >
                  Vertical
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Gap Spacing</span>
              <input
                type="number"
                value={style.autoLayout.gap}
                onChange={(e) => updateAutoLayout(element!.id, { gap: Number(e.target.value) })}
                className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
              />
            </div>

            {/* Padding Controls */}
            <div className="space-y-1 pt-1 border-t border-[rgba(235,235,236,0.06)]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[rgba(235,235,236,0.5)]">Padding</span>
                <button
                  onClick={() => setIsIndividualPadding(!isIndividualPadding)}
                  className={`p-1 rounded text-[10px] transition-colors ${
                    isIndividualPadding ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] font-bold' : 'text-[rgba(235,235,236,0.4)] hover:text-[rgb(235,235,236)]'
                  }`}
                  title="Toggle Individual Paddings"
                >
                  <Icons.Maximize size={11} />
                </button>
              </div>

              {!isIndividualPadding ? (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[rgba(235,235,236,0.4)]">All Sides</span>
                  <input
                    type="number"
                    value={paddingObj.top}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateAutoLayout(element!.id, { padding: { top: v, right: v, bottom: v, left: v } });
                    }}
                    className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                    <div key={side} className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-md px-1.5 py-1 border border-[rgba(235,235,236,0.08)]">
                      <span className="text-[9px] font-mono text-[rgba(235,235,236,0.3)] uppercase mr-1">{side[0]}</span>
                      <input
                        type="number"
                        value={paddingObj[side]}
                        onChange={(e) => updateAutoLayout(element!.id, {
                          padding: {
                            ...paddingObj,
                            [side]: Number(e.target.value)
                          }
                        })}
                        className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. FILLS & COLORS (SOLID, GRADIENT, IMAGE) */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider">Fill</span>
          <div className="flex bg-[rgba(235,235,236,0.06)] rounded p-0.5 border border-[rgba(235,235,236,0.08)]">
            <button
              onClick={() => setFillType('solid')}
              className={`px-2 py-0.5 rounded text-[10px] ${
                fillType === 'solid' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
              }`}
            >
              Solid
            </button>
            <button
              onClick={() => setFillType('gradient')}
              className={`px-2 py-0.5 rounded text-[10px] ${
                fillType === 'gradient' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
              }`}
            >
              Gradient
            </button>
            <button
              onClick={() => setFillType('image')}
              className={`px-2 py-0.5 rounded text-[10px] ${
                fillType === 'image' ? 'bg-[rgb(235,235,236)] text-[rgb(20,20,19)] font-bold' : 'text-[rgba(235,235,236,0.5)]'
              }`}
            >
              Image
            </button>
          </div>
        </div>

        {fillType === 'solid' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.fillColor || '#ebebec'}
                onChange={(e) => updateElementStyle(element!.id, { fillColor: e.target.value, fillGradient: undefined })}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={style.fillColor || '#ebebec'}
                onChange={(e) => updateElementStyle(element!.id, { fillColor: e.target.value, fillGradient: undefined })}
                className="bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] font-mono text-xs flex-1 outline-none"
              />
            </div>

            {/* Quick Monochrome Palette Swatches */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { hex: '#141413', label: 'Black (Base)' },
                { hex: '#242423', label: 'Dark Charcoal' },
                { hex: '#3d3d3c', label: 'Medium Charcoal' },
                { hex: '#7f7f7f', label: 'Mid Grey' },
                { hex: '#b4b4b5', label: 'Light Grey' },
                { hex: '#ebebec', label: 'White (Inverted)' }
              ].map(swatch => (
                <button
                  key={swatch.hex}
                  onClick={() => updateElementStyle(element!.id, { fillColor: swatch.hex, fillGradient: undefined })}
                  style={{ backgroundColor: swatch.hex }}
                  className="flex-1 h-5 rounded border border-[rgba(235,235,236,0.15)] hover:scale-105 transition-transform"
                  title={swatch.label}
                />
              ))}
            </div>
          </div>
        )}

        {fillType === 'gradient' && (
          <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[rgba(235,235,236,0.5)]">Start Color</span>
              <input
                type="color"
                value="#ebebec"
                onChange={(e) => updateElementStyle(element!.id, {
                  fillGradient: {
                    type: 'linear',
                    angle: 135,
                    stops: [{ offset: 0, color: e.target.value }, { offset: 100, color: '#141413' }]
                  }
                })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[rgba(235,235,236,0.5)]">End Color</span>
              <input
                type="color"
                value="#141413"
                onChange={(e) => updateElementStyle(element!.id, {
                  fillGradient: {
                    type: 'linear',
                    angle: 135,
                    stops: [{ offset: 0, color: '#ebebec' }, { offset: 100, color: e.target.value }]
                  }
                })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent"
              />
            </div>
          </div>
        )}

        {fillType === 'image' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="https://images.unsplash.com/..."
              value={element?.semanticProps.src || ''}
              onChange={(e) => updateElementSemanticProps(element!.id, { src: e.target.value })}
              className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2.5 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs font-mono"
            />
            {/* Quick preset images */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[
                { label: 'Avatar 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
                { label: 'Avatar 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
                { label: 'Minimal', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' }
              ].map(img => (
                <button
                  key={img.label}
                  onClick={() => updateElementSemanticProps(element!.id, { src: img.url })}
                  className="text-[10px] py-1 bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] rounded text-[rgba(235,235,236,0.7)]"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. STROKE & BORDER */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
          Stroke
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={style.borderColor || '#ebebec'}
            onChange={(e) => updateElementStyle(element!.id, { borderColor: e.target.value })}
            className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
          />
          <input
            type="number"
            value={style.borderWidth || 0}
            onChange={(e) => updateElementStyle(element!.id, { borderWidth: Number(e.target.value) })}
            placeholder="Width"
            className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] font-mono text-xs text-right outline-none"
          />
          <select
            value={style.borderStyle || 'solid'}
            onChange={(e) => updateElementStyle(element!.id, { borderStyle: e.target.value as any })}
            className="bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs flex-1 outline-none"
          >
            <option value="solid" className="bg-[rgb(20,20,19)]">Solid</option>
            <option value="dashed" className="bg-[rgb(20,20,19)]">Dashed</option>
            <option value="dotted" className="bg-[rgb(20,20,19)]">Dotted</option>
          </select>
        </div>
      </div>

      {/* 7. EFFECTS & SHADOWS */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
          Effects & Blur
        </div>
        <div className="space-y-2 bg-[rgba(235,235,236,0.02)] p-2.5 rounded-xl border border-[rgba(235,235,236,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Drop Shadow</span>
            <select
              value={style.boxShadow ? 'on' : 'none'}
              onChange={(e) => {
                if (e.target.value === 'on') {
                  updateElementStyle(element!.id, { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)' });
                } else {
                  updateElementStyle(element!.id, { boxShadow: undefined });
                }
              }}
              className="bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-2 py-1 rounded text-xs outline-none"
            >
              <option value="none" className="bg-[rgb(20,20,19)]">None</option>
              <option value="on" className="bg-[rgb(20,20,19)]">Elevation Shadow</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[rgba(235,235,236,0.5)] text-[11px]">Backdrop Blur (Glass)</span>
            <input
              type="number"
              min="0"
              max="40"
              value={style.backdropBlur || 0}
              onChange={(e) => updateElementStyle(element!.id, { backdropBlur: Number(e.target.value) })}
              placeholder="0px"
              className="w-16 bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1 rounded border border-[rgba(235,235,236,0.08)] text-right font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* 8. TYPOGRAPHY (IF TEXT-ENABLED) */}
      {element?.semanticProps.label !== undefined && (
        <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
          <div className="text-[10px] font-bold text-[rgba(235,235,236,0.4)] uppercase tracking-wider mb-2">
            Typography
          </div>
          <div className="space-y-2">
            <select
              value={style.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => updateElementStyle(element!.id, { fontFamily: e.target.value })}
              className="w-full bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs outline-none"
            >
              <option value="Inter, sans-serif" className="bg-[rgb(20,20,19)]">Inter (Modern Sans)</option>
              <option value="Roboto, sans-serif" className="bg-[rgb(20,20,19)]">Roboto</option>
              <option value="Outfit, sans-serif" className="bg-[rgb(20,20,19)]">Outfit (Display)</option>
              <option value="'JetBrains Mono', monospace" className="bg-[rgb(20,20,19)]">JetBrains Mono (Code)</option>
              <option value="Playfair Display, serif" className="bg-[rgb(20,20,19)]">Playfair Display (Serif)</option>
              <option value="'Caveat', cursive" className="bg-[rgb(20,20,19)]">Caveat (Handwritten)</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
                <span className="text-[rgba(235,235,236,0.4)] mr-1.5 text-[10px]">Size</span>
                <input
                  type="number"
                  value={style.fontSize || 16}
                  onChange={(e) => updateElementStyle(element!.id, { fontSize: Number(e.target.value) })}
                  className="bg-transparent text-[rgb(235,235,236)] outline-none w-full font-mono text-xs"
                />
              </div>

              <div className="flex items-center bg-[rgba(235,235,236,0.04)] rounded-lg px-2.5 py-1.5 border border-[rgba(235,235,236,0.08)]">
                <span className="text-[rgba(235,235,236,0.4)] mr-1.5 text-[10px]">Color</span>
                <input
                  type="color"
                  value={style.textColor || '#ebebec'}
                  onChange={(e) => updateElementStyle(element!.id, { textColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent ml-auto"
                />
              </div>
            </div>

            {/* Font Weight & Alignment */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={style.fontWeight || '400'}
                onChange={(e) => updateElementStyle(element!.id, { fontWeight: e.target.value })}
                className="bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg border border-[rgba(235,235,236,0.08)] text-xs outline-none"
              >
                <option value="300" className="bg-[rgb(20,20,19)]">Light (300)</option>
                <option value="400" className="bg-[rgb(20,20,19)]">Regular (400)</option>
                <option value="500" className="bg-[rgb(20,20,19)]">Medium (500)</option>
                <option value="600" className="bg-[rgb(20,20,19)]">SemiBold (600)</option>
                <option value="700" className="bg-[rgb(20,20,19)]">Bold (700)</option>
                <option value="900" className="bg-[rgb(20,20,19)]">Black (900)</option>
              </select>

              <div className="flex items-center justify-around bg-[rgba(235,235,236,0.04)] rounded-lg border border-[rgba(235,235,236,0.08)] px-1">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => updateElementStyle(element!.id, { textAlign: align })}
                    className={`p-1 rounded ${style.textAlign === align ? 'bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)]' : 'text-[rgba(235,235,236,0.4)]'}`}
                  >
                    {align === 'left' && <Icons.AlignLeft size={12} />}
                    {align === 'center' && <Icons.AlignCenter size={12} />}
                    {align === 'right' && <Icons.AlignRight size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. CODE & CSS EXPORT */}
      <div className="border-t border-[rgba(235,235,236,0.08)] pt-3">
        <button
          onClick={handleCopyCss}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[rgba(235,235,236,0.06)] hover:bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)] font-semibold text-xs transition-colors border border-[rgba(235,235,236,0.08)]"
        >
          {copiedCss ? <Icons.Check size={13} className="text-emerald-400" /> : <Icons.Code2 size={13} />}
          <span>{copiedCss ? 'CSS Copied!' : 'Copy CSS Code'}</span>
        </button>
      </div>

    </div>
  );
};
