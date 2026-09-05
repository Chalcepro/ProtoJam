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
}

export interface AutoLayoutSettings {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  align: 'start' | 'center' | 'end' | 'spaceBetween';
  wrap?: boolean;
  sizingH: 'fixed' | 'hug' | 'fill';
  sizingV: 'fixed' | 'hug' | 'fill';
}

export interface FillLayer {
  id: string;
  type: 'solid' | 'linear' | 'radial' | 'image' | 'video';
  color?: string;
  opacity: number;
  visible: boolean;
  gradient?: {
    angle?: number;
    stops: { offset: number; color: string }[];
  };
  imageSrc?: string;
  videoSrc?: string;
}

export interface StrokeLayer {
  id: string;
  color: string;
  width: number;
  position: 'inside' | 'center' | 'outside';
  style: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  visible: boolean;
}

export interface EffectLayer {
  id: string;
  type: 'dropShadow' | 'innerShadow' | 'layerBlur' | 'backgroundBlur';
  x?: number;
  y?: number;
  blur: number;
  spread?: number;
  color?: string;
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
  textColor?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Text sizing behaviour: true = hug content (single-click creation), false =
  // fixed box that content can overflow (drag-to-size creation). Text/heading only.
  autoSize?: boolean;
  // When true on a fixed-size (non-autoSize) element, overflowing content is
  // clipped and scrollable instead of spilling past the boundary.
  clipContent?: boolean;

  // Auto Layout
  autoLayout?: AutoLayoutSettings;
  // When true, this child opts out of its parent frame's auto-layout flow and
  // reverts to free x/y positioning (Figma's "Absolute position" toggle).
  absolutePosition?: boolean;
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
