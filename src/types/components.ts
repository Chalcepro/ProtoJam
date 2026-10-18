import { PrototypeInteraction } from './prototype';

// Design variable — a single named, reusable value (color or number) that other
// elements can bind to. Editing a variable's value propagates live to every
// element bound to it. Deliberately single-mode (no light/dark collections) —
// a focused MVP, not full Figma variable-collection parity.
export interface DesignVariable {
  id: string;
  name: string;
  type: 'color' | 'number';
  value: string | number;
}

// A canvas comment pin — a lightweight review/annotation thread anchored to a
// world-space point, independent of any element (survives elements moving/deleting).
export interface CommentReply {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

export type UIElementType =
  // Structure & Layout
  | 'frame'
  | 'section'
  | 'card'
  | 'container'
  | 'modal'
  | 'bottomSheet'
  | 'drawer'
  | 'divider'
  // Vector & Shapes
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arrow'
  | 'vectorPath'
  // Navigation
  | 'navbar'
  | 'bottomTabs'
  | 'sidebar'
  | 'breadcrumbs'
  | 'segmentedControl'
  | 'stepper'
  // Inputs & Forms
  | 'textInput'
  | 'passwordInput'
  | 'searchBar'
  | 'textarea'
  | 'selectDropdown'
  | 'checkbox'
  | 'radioButton'
  | 'toggleSwitch'
  | 'slider'
  | 'datePicker'
  | 'fileDropzone'
  // Actionables
  | 'button'
  | 'iconButton'
  | 'fab'
  | 'pillButton'
  // Content & Media
  | 'text'
  | 'heading'
  | 'image'
  | 'video'
  | 'avatar'
  | 'avatarGroup'
  | 'badge'
  | 'chip'
  | 'progressBar'
  | 'metricCard'
  | 'rating'
  | 'skeleton'
  // FigJam collaboration / flow
  | 'stickyNote'
  | 'connector'
  | 'annotation'
  | 'stamp';

export interface VectorPoint {
  id: string;
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
  isCorner?: boolean;
}

export interface VectorFace {
  id: string;
  pointIds: string[];
  filled: boolean;
  fillColor?: string;
  fillOpacity?: number;
}

export interface VectorData {
  points: VectorPoint[];
  faces: VectorFace[];
  isClosed: boolean;
  // The size the points were drawn at; the path is scaled from this to the
  // element's width/height, so resizing a finished path stretches it.
  w?: number;
  h?: number;
  // More paths in the same vector, finished ones (points/isClosed above is
  // the one being drawn). Where closed paths overlap they cut each other into
  // regions, and each region can be filled on its own - regions maps a
  // region's key (the paths containing it, "0,2") to its colour.
  subpaths?: { points: VectorPoint[]; isClosed: boolean }[];
  regions?: Record<string, string>;
}

export interface AutoLayoutSettings {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  align: 'start' | 'center' | 'end' | 'spaceBetween';      // along the row / column
  // across it (Figma's 9-point grid with align): start = top of a row / left of a column
  alignCross?: 'start' | 'center' | 'end';
  wrap?: boolean;
  sizingH: 'fixed' | 'hug' | 'fill';
  sizingV: 'fixed' | 'hug' | 'fill';
}

// One paint in a layer's Fill list (top of the list paints on top), as in
// Figma: each with its own type, opacity, blend mode and eye.
export interface FillLayer {
  id: string;
  type: 'solid' | 'linear' | 'radial' | 'angular' | 'diamond' | 'image' | 'video';
  color?: string;
  opacity: number;
  visible: boolean;
  blendMode?: BlendMode;
  gradient?: {
    angle?: number;
    stops: { offset: number; color: string }[];
  };
  imageSrc?: string;
  videoSrc?: string;
  // how an image / video sits in the box
  fit?: 'fill' | 'fit' | 'tile';
}

export interface StrokeLayer {
  id: string;
  color: string;
  width: number;
  position: 'inside' | 'center' | 'outside';
  style: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  visible: boolean;
  blendMode?: BlendMode;
  // Beyond Figma: every stroke in the list picks its own sides of a box, so
  // a top stroke and a bottom stroke can differ in colour, weight and style.
  // Unset = all four.
  sides?: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  // Its own corner rounding where two of its sides meet (top + left rounds
  // the top-left corner). Unset = the shape's corner radius.
  radius?: number;
  // How an open run of sides ends.
  cap?: 'butt' | 'round' | 'square';
  // A gradient along the stroke; unset = solid `color`.
  paint?: 'solid' | 'linear' | 'radial';
  gradient?: { angle?: number; stops: { offset: number; color: string }[] };
}

// One row of a layer's Export list: what to save it as.
export interface ExportSetting {
  id: string;
  scale: number;              // 0.5, 1, 2, 3, 4 (PDF / SVG: 1)
  suffix: string;             // added to the file name, e.g. "@2x"
  format: 'PNG' | 'JPG' | 'SVG' | 'PDF';
}

export type BlendMode =
  | 'normal' | 'darken' | 'multiply' | 'color-burn' | 'lighten' | 'screen' | 'color-dodge'
  | 'overlay' | 'soft-light' | 'hard-light' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export interface EffectLayer {
  id: string;
  // extrude: the shape pushed back by x / y as a solid block, its slanted
  // sides filled in (a drop shadow with no blur leaves them empty) - the
  // neo-brutalist / Trackmania look. Faces facing sideways take `color`,
  // faces facing up / down take `color2`, blended round curves.
  type: 'dropShadow' | 'innerShadow' | 'layerBlur' | 'backgroundBlur' | 'extrude';
  x?: number;
  y?: number;
  blur: number;
  spread?: number;
  color?: string;
  color2?: string;
  visible: boolean;
}

export interface ElementStyle {
  // Dimensions & Position
  width: number | string;
  height: number | string;
  x: number;
  y: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;

  // Design-variable bindings: maps a style property name to the variable id
  // driving it. The property itself (e.g. fillColor) still holds the live
  // resolved literal value, kept in sync whenever the bound variable updates —
  // rendering never needs to know a binding exists.
  boundVariables?: Partial<Record<'fillColor' | 'textColor' | 'borderColor', string>>;

  // Background / Fill
  fillColor?: string;
  fillGradient?: {
    type: 'linear' | 'radial';
    angle?: number;
    stops: { offset: number; color: string }[];
  };
  backgroundImage?: string;
  fills?: FillLayer[];

  // Border & Stroke
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number | { tl: number; tr: number; br: number; bl: number };
  strokes?: StrokeLayer[];

  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  // where the text sits up / down in a box taller than it
  textAlignV?: 'top' | 'middle' | 'bottom';
  textColor?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Text sizing behaviour: true = hug content (single-click creation), false =
  // fixed box that content can overflow (drag-to-size creation). Text/heading only.
  // Superseded by textResize when that is set; kept so old projects still load.
  autoSize?: boolean;
  // As in Figma: 'auto' grows both ways with the text, 'autoHeight' keeps the
  // width and grows down, 'fixed' keeps both. See textResizeOf().
  textResize?: 'auto' | 'autoHeight' | 'fixed';
  // Vertical trim: the box is exactly the height of the capitals/baseline,
  // with the line spacing above and below removed.
  trimText?: boolean;
  // When true on a fixed-size (non-autoSize) element, overflowing content is
  // clipped and scrollable instead of spilling past the boundary.
  clipContent?: boolean;

  // Auto Layout
  autoLayout?: AutoLayoutSettings;
  // When true, this child opts out of its parent frame's auto-layout flow and
  // reverts to free x/y positioning (Figma's "Absolute position" toggle).
  absolutePosition?: boolean;
  // How this child sizes inside an auto-layout parent, per axis.
  layoutSizingH?: 'fixed' | 'hug' | 'fill';
  layoutSizingV?: 'fixed' | 'hug' | 'fill';
  display?: 'block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };

  // Shadows & Effects
  boxShadow?: string;
  backdropBlur?: number;
  blur?: number;
  effects?: EffectLayer[];
  blendMode?: BlendMode;
  exports?: ExportSetting[];
  // A group (Ctrl+G): a container whose box always fits what is in it.
  isGroup?: boolean;
  // A frame made from a shape keeps the shape's outline: drawn as it, and
  // with Clip content on, what is inside is cut to it.
  frameShape?: 'ellipse' | 'polygon' | 'star' | 'vectorPath';

  // Vector / Pen tool data
  vectorData?: VectorData;
  strokeCap?: 'butt' | 'round' | 'square';
  strokeJoin?: 'miter' | 'round' | 'bevel';

  // Boolean & Mask
  booleanOp?: 'union' | 'subtract' | 'intersect' | 'exclude';
  isMask?: boolean;
}

export interface SemanticProperties {
  label?: string;
  placeholder?: string;
  value?: string | number | boolean;
  checked?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  iconName?: string;
  iconPosition?: 'left' | 'right' | 'only';
  badgeCount?: number;
  options?: { label: string; value: string; icon?: string }[];
  currentStep?: number;
  totalSteps?: number;
  min?: number;
  max?: number;
  step?: number;
  src?: string;
  videoSrc?: string;
  alt?: string;
  // Specific FigJam sticky note
  stickyColor?: 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'orange' | 'white' | 'dark';
  author?: string;
  connectorType?: 'straight' | 'curved' | 'orthogonal';
  connectorStartArrow?: boolean;
  connectorEndArrow?: boolean;
  connectorLabel?: string;
  sourceElementId?: string;
  targetElementId?: string;
  pointCount?: number; // for star or polygon
  innerRadius?: number; // for star
}

// Style overrides applied automatically on hover/press, live in the Prototype
// player — an "interactive component" without needing a full variant set.
export interface InteractiveStates {
  hover?: Partial<Pick<ElementStyle, 'fillColor' | 'textColor' | 'borderColor' | 'borderWidth' | 'opacity'>>;
  pressed?: Partial<Pick<ElementStyle, 'fillColor' | 'textColor' | 'borderColor' | 'borderWidth' | 'opacity'>>;
}

export interface UIElement {
  id: string;
  name: string;
  type: UIElementType;
  style: ElementStyle;
  semanticProps: SemanticProperties;
  parentId?: string; // If nested in a Frame or Section
  childrenIds?: string[];
  locked?: boolean;
  hidden?: boolean;
  interactions: PrototypeInteraction[];
  // Component Master & Instance
  isMasterComponent?: boolean;
  masterComponentId?: string;
  isInstance?: boolean;
  // Hover/Pressed visual states, applied live in the Prototype player
  states?: InteractiveStates;
}

export interface DeviceFrame {
  id: string;
  name: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'watch' | 'custom';
  presetName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  backgroundColor: string;
  showDeviceMockupBezel?: boolean;
  elementIds: string[]; // Top-level child elements inside this frame
  isStartingFrame?: boolean;
  locked?: boolean;
  hidden?: boolean;
  collapsed?: boolean;
  // Whether content extending past the frame's edges is hidden. Defaults to
  // true (matches prior hardcoded behavior) when unset.
  clipContent?: boolean;
  autoLayout?: AutoLayoutSettings;
  exports?: ExportSetting[];
  // Made by Shift+A around a selection: it behaves as one object - a click
  // picks the group, a double-click (or Ctrl+click) the thing inside.
  isGroup?: boolean;
}

export interface SectionFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  frameIds: string[]; // Artboard frames organized within this section
  elementIds: string[]; // Direct elements in this section
  locked?: boolean;
  hidden?: boolean;
  collapsed?: boolean;
}
