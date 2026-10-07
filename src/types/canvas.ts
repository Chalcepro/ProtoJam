export type ToolMode = 
  // Selection
  | 'select' 
  | 'directSelect'
  | 'hand' 
  // Frames & Containers
  | 'frame' 
  | 'section'
  // Shapes & Vectors
  | 'rectangle' 
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arrow'
  | 'pen'
  | 'pencil'
  | 'bucket'
  | 'bend'
  // Text & Semantic
  | 'text' 
  | 'button' 
  | 'input' 
  | 'component' 
  | 'connector' 
  | 'sticky'
  | 'comment'
  | 'prototypeWire';

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface DragState {
  isDragging: boolean;
  type: 'canvas' | 'element' | 'frame' | 'section' | 'resize' | 'wire' | 'selectionBox' | 'guide' | 'drawingShape' | 'drawingFrame' | 'drawingSection';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  handle?: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'se' | 'sw' | 'wireHotspot';
  sourceElementId?: string;
  sourceFrameId?: string;
  drawingShapeType?: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'arrow' | 'frame' | 'section';
}

// A guide line pulled out of a ruler: x is a vertical line at that x, y a
// horizontal one. Saved with the project; things snap to it while dragging.
export interface RulerGuide {
  id: string;
  axis: 'x' | 'y';
  pos: number;          // world coordinate
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export interface CanvasSettings {
  gridType: 'dots' | 'grid' | 'none';
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  showRulers: boolean;
  showMinimap: boolean;
  showFlowWires: boolean;
  theme: 'dark' | 'light';
}
