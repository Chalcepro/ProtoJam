import React, { useLayoutEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { AutoLayoutSettings, UIElement } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { SemanticElementRenderer } from './SemanticElementRenderer';
import { ContainerBox, clipCss } from './ContainerBox';
import { TransformSelectionBox } from './TransformSelectionBox';
import { ExtrudeArt, SideStrokes } from './StrokeArt';
import { flexLayoutCss, nodeSize, rotateCss } from '../../lib/styleCss';
import { isContainer, pickTarget, stepInto } from '../../lib/tree';

interface Props {
  element: UIElement;
  // the parent's auto layout, when it lays this one out
  parentLayout: AutoLayoutSettings | null;
  layer: number;
  // a press on this element (the deepest one under the pointer)
  onPress: (el: UIElement, e: React.PointerEvent) => void;
  // draw the selection box here, not on the canvas's top layer - for things
  // whose place only the layout knows (in auto layout, or inside something
  // that is); everything else gets its handles on top, never clipped
  boxInside: boolean;
  frameId?: string;
  // inside a boolean group: drawn unseen (the group draws the result) but
  // still there to click, drag and show a selection box
  ghost?: boolean;
}

// One element on the canvas - and, for a container (a frame inside a frame),
// everything inside it, laid out by its own auto layout or placed by x/y.
export const ElementNode: React.FC<Props> = ({ element, parentLayout, layer, onPress, boxInside, frameId, ghost }) => {
  const { elements, selectedElementIds, activeTool, editorMode, isWiring, finishWiring, startWiring, updateElementStyle, setSelection } =
    useProjectStore(useShallow((s) => ({ elements: s.elements, selectedElementIds: s.selectedElementIds, activeTool: s.activeTool, editorMode: s.editorMode, isWiring: s.isWiring, finishWiring: s.finishWiring, startWiring: s.startWiring, updateElementStyle: s.updateElementStyle, setSelection: s.setSelection })));
  const ref = useRef<HTMLDivElement>(null);
  // a blend mode being hovered in a menu shows before it is chosen
  const preview = useProjectStore((s) => s.stylePreview?.ids.includes(element.id) ? s.stylePreview.style : null);
  const flow = !!parentLayout && !element.style.absolutePosition;
  const isSelected = selectedElementIds.includes(element.id);
  const container = isContainer(element);
  const ownLayout = container && element.style.autoLayout?.enabled ? element.style.autoLayout : null;
  const size = nodeSize(element, parentLayout);

  // Sizes the layout decides - filling the parent, hugging the children - are
  // written back so W/H, snapping and the selection box tell the truth.
  useLayoutEffect(() => {
    const n = ref.current;
    if (!n) return;
    const s = element.style;
    const fillW = flow && s.layoutSizingH === 'fill', fillH = flow && s.layoutSizingV === 'fill';
    const hugW = ownLayout?.sizingH === 'hug', hugH = ownLayout?.sizingV === 'hug';
    const upd: { width?: number; height?: number } = {};
    if ((fillW || hugW) && Math.abs(n.offsetWidth - Number(s.width)) >= 1) upd.width = n.offsetWidth;
    if ((fillH || hugH) && Math.abs(n.offsetHeight - Number(s.height)) >= 1) upd.height = n.offsetHeight;
    if (upd.width !== undefined || upd.height !== undefined) updateElementStyle(element.id, upd);
    // a group's box follows what is in it
    if (s.isGroup && !ownLayout) useProjectStore.getState().fitGroup(element.id);
  });

  if (element.hidden) return null;
  const kids = container ? elements.filter(e => e.parentId === element.id) : [];
  const bool = container && !!element.style.booleanOp;
  const shownBlend = preview?.blendMode ?? element.style.blendMode;
  const blend = shownBlend && shownBlend !== 'normal' ? shownBlend : undefined;
  const position: React.CSSProperties = flow
    ? { position: 'relative', flexShrink: 0 }
    : { position: 'absolute', left: Number(element.style.x), top: Number(element.style.y) };

  return (
    <div
      ref={ref}
      data-el-id={element.id}
      data-container={container ? '' : undefined}
      data-flow-child={flow ? '' : undefined}
      // hover: outline what a click here would pick (drawn by the canvas)
      onPointerMove={(e) => {
        // the deepest element under the pointer decides; the event itself goes
        // on (stopping it starved drags that listen on the window - resizing)
        if (activeTool !== 'select' || (e.nativeEvent as any).__hoverDone) return;
        (e.nativeEvent as any).__hoverDone = true;
        const st = useProjectStore.getState();
        const id = (e.ctrlKey || e.metaKey) ? element.id : pickTarget(element.id, st.elements, st.selectedElementIds);
        if (st.hoveredElementId !== id) st.setHoveredElement(id);
      }}
      onPointerLeave={() => { const st = useProjectStore.getState(); if (st.hoveredElementId) st.setHoveredElement(null); }}
      onPointerDown={(e) => {
        // drawing tools pass through; a right-click is the context menu's
        if (activeTool !== 'select' || e.button !== 0) return;
        e.stopPropagation();
        if (isWiring) { if (frameId) finishWiring(frameId); return; }
        onPress(element, e);
      }}
      // double-click steps one level into a container, toward what was clicked
      onDoubleClick={(e) => {
        e.stopPropagation();
        const st = useProjectStore.getState();
        // a selected shape: double-click opens its points (it becomes a vector)
        if (st.selectedElementIds.length === 1 && st.selectedElementIds[0] === element.id &&
            ['rectangle', 'ellipse', 'polygon', 'star'].includes(element.type)) { st.editShapePoints(element.id); return; }
        const from = element.id;
        const next = stepInto(from, st.elements, st.selectedElementIds);
        if (!st.selectedElementIds.includes(next)) setSelection([next]);
      }}
      style={{
        ...position, ...size,
        zIndex: 10 + layer,      // strictly by layer order, selected or not
        mixBlendMode: blend,
        // turned here, not in its look: the selection box and anything inside turn with it
        transform: rotateCss(element),
        pointerEvents: activeTool !== 'select' ? 'none' : undefined
      }}
      className={`group/el ${element.locked ? 'cursor-default' : 'cursor-move'}`}
    >
      {!ghost && <ExtrudeArt element={element} />}
      {container ? (
        <>
          {/* the frame's own look: its box, a shape's outline, or a boolean result */}
          <ContainerBox el={element} elements={elements} hidden={ghost} />
          {/* its children */}
          <div
            style={{
              position: 'relative',
              width: ownLayout?.sizingH === 'hug' ? 'max-content' : '100%',
              height: ownLayout?.sizingV === 'hug' ? 'max-content' : '100%',
              ...clipCss(element),
              ...(ownLayout ? flexLayoutCss(ownLayout) : {})
            }}
          >
            {kids.map((k, i) => (
              <ElementNode key={k.id} element={k} parentLayout={ownLayout} layer={i} onPress={onPress}
                           boxInside={boxInside || flow} frameId={frameId} ghost={ghost || bool} />
            ))}
          </div>
        </>
      ) : (
        ghost
          ? <div style={{ width: '100%', height: '100%', opacity: 0 }}><SemanticElementRenderer element={element} isInteractive={false} /></div>
          : <SemanticElementRenderer element={element} isInteractive={false} />
      )}
      {!ghost && <SideStrokes element={element} />}

      {isSelected && activeTool === 'select' && (boxInside || flow) && (
        <div data-export-skip className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000, visibility: 'visible' }}>
          <TransformSelectionBox element={element} onPress={onPress} />
        </div>
      )}

      {/* wire a prototype link from here */}
      {isSelected && frameId && (editorMode === 'prototype' || isWiring) && (
        <div
          data-export-skip
          title="Drag to wire interaction"
          onPointerDown={(e) => { e.stopPropagation(); startWiring(element.id, frameId); }}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#ff6b4a] rounded-full border-2 border-[rgb(20,20,19)] shadow-lg cursor-crosshair flex items-center justify-center hotspot-handle z-50 hover:scale-125 transition-transform"
        >
          <Icons.Plus size={10} className="text-[rgb(235,235,236)]" />
        </div>
      )}
    </div>
  );
};
