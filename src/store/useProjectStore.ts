import { create } from 'zustand';
import { 
  DeviceFrame, 
  SectionFrame, 
  UIElement, 
  UIElementType, 
  ElementStyle, 
  SemanticProperties, 
  VectorData, 
  VectorPoint, 
  VectorFace, 
  AutoLayoutSettings 
} from '../types/components';
import { ToolMode, ViewportTransform, CanvasSettings, DragState, SnapGuide } from '../types/canvas';
import { PrototypeInteraction, PrototypeFlow } from '../types/prototype';
import { STARTER_PROJECTS } from '../presets/starterProjects';
import { DevicePreset, DEVICE_PRESETS } from '../presets/devicePresets';
import { COMPONENT_TEMPLATES } from '../presets/uiComponentDefs';

export interface HistorySnapshot {
  frames: DeviceFrame[];
  sections: SectionFrame[];
  elements: UIElement[];
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  frameCount: number;
  elementCount: number;
}

export interface ProjectState {
  // Project Meta
  projectId: string;
  projectName: string;
  isSaved: boolean;
  lastSavedAt: string | null;
  activeProjectId: string;
  editorMode: 'design' | 'prototype';
  isProjectMenuOpen: boolean;
  savedProjects: SavedProjectMeta[];

  // Sidebar visibility
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;

  // Canvas Data
  frames: DeviceFrame[];
  sections: SectionFrame[];
  elements: UIElement[];
  prototypeFlows: PrototypeFlow[];

  // Selection & Interactions
  selectedFrameIds: string[];
  selectedSectionIds: string[];
  selectedElementIds: string[];
  selectedVectorPointIds: string[];
  hoveredElementId: string | null;
  hoveredFrameId: string | null;
  activeTool: ToolMode;
  viewport: ViewportTransform;
  canvasSettings: CanvasSettings;
  dragState: DragState;
  snapGuides: SnapGuide[];

  // Vector / Pen Tool Mode State
  isVectorEditing: boolean;
  editingVectorId: string | null;
  vectorTool: 'pen' | 'select' | 'bucket' | 'bend';
  activeVectorData: VectorData | null;

  // Direct Inline Text Editing
  inlineEditingElementId: string | null;

  // Prototype Wiring State
  isWiring: boolean;
  wireSourceElementId: string | null;
  wireSourceFrameId: string | null;
  wireMousePos: { x: number; y: number } | null;

  // Live Prototype Player State
  isPlaying: boolean;
  currentPlayingFrameId: string | null;
  activeOverlays: { frameId?: string; elementId?: string; type: string }[];
  prototypeNavigationHistory: string[];

  // Undo / Redo History
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions
  setProjectName: (name: string) => void;
  setEditorMode: (mode: 'design' | 'prototype') => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleProjectMenu: () => void;
  openProjectMenu: () => void;
  closeProjectMenu: () => void;
  setActiveTool: (tool: ToolMode) => void;
  setViewport: (transform: Partial<ViewportTransform>) => void;
  setZoom: (zoom: number) => void;
  panBy: (dx: number, dy: number) => void;
  resetZoom: () => void;
  zoomToFit: () => void;
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;

  // Selection Actions
  selectElement: (id: string, multi?: boolean) => void;
  selectFrame: (id: string, multi?: boolean) => void;
  selectSection: (id: string, multi?: boolean) => void;
  selectVectorPoint: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setHoveredElement: (id: string | null) => void;
  setHoveredFrame: (id: string | null) => void;

  // Inline Text Editing
  setInlineEditingElementId: (id: string | null) => void;

  // Frame CRUD & Layer Controls
  addFrame: (preset: DevicePreset, x?: number, y?: number) => string;
  addCustomFrame: (x: number, y: number, width: number, height: number, name?: string) => string;
  updateFrame: (id: string, updates: Partial<DeviceFrame>) => void;
  deleteFrame: (id: string) => void;
  duplicateFrame: (id: string) => void;
  toggleFrameOrientation: (id: string) => void;
  toggleFrameLock: (id: string) => void;
  toggleFrameHidden: (id: string) => void;
  toggleFrameCollapsed: (id: string) => void;
  moveFrame: (id: string, dx: number, dy: number) => void;
  updateFramePosition: (id: string, x: number, y: number) => void;

  // Section CRUD
  addSection: (x: number, y: number, width?: number, height?: number, name?: string) => string;
  updateSection: (id: string, updates: Partial<SectionFrame>) => void;
  deleteSection: (id: string) => void;
  moveSection: (id: string, dx: number, dy: number) => void;

  // Element CRUD & Reparenting
  addElement: (type: UIElementType, x: number, y: number, parentFrameId?: string) => string;
  createShapeAt: (type: UIElementType, x: number, y: number, width: number, height: number, parentId?: string) => string;
  dropComponentAt: (type: UIElementType, canvasX: number, canvasY: number) => string;
  addPredefinedElement: (element: UIElement) => void;
  updateElement: (id: string, updates: Partial<UIElement>) => void;
  updateElementStyle: (id: string, styleUpdates: Partial<ElementStyle>) => void;
  updateElementSemanticProps: (id: string, propUpdates: Partial<SemanticProperties>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  toggleElementLock: (id: string) => void;
  toggleElementHidden: (id: string) => void;
  moveElement: (id: string, dx: number, dy: number) => void;
  updateElementPosition: (id: string, x: number, y: number) => void;
  reparentElement: (elementId: string, newParentId?: string, absCanvasX?: number, absCanvasY?: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  alignSelectedElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV') => void;

  // Auto Layout
  toggleAutoLayout: (targetId: string) => void;
  updateAutoLayout: (targetId: string, updates: Partial<AutoLayoutSettings>) => void;
  groupSelectedIntoAutoLayout: () => void;

  // Master Components & Instances
  createMasterComponent: (elementId: string) => void;
  instantiateComponent: (masterId: string, x?: number, y?: number, parentId?: string) => string;
  detachInstance: (instanceId: string) => void;

  // Vector / Pen Tool Actions
  startVectorEditing: (elementId?: string, initialX?: number, initialY?: number) => void;
  setVectorTool: (tool: 'pen' | 'select' | 'bucket' | 'bend') => void;
  addVectorPoint: (x: number, y: number) => void;
  updateVectorPoint: (pointId: string, updates: Partial<VectorPoint>) => void;
  closeVectorPath: () => void;
  fillVectorFace: (pointIds?: string[], color?: string) => void;
  toggleFaceFill: (faceId?: string) => void;
  finishVectorEditing: () => void;
  cancelVectorEditing: () => void;

  // Prototype Actions
  startWiring: (sourceElementId: string, sourceFrameId?: string) => void;
  updateWireMousePos: (x: number, y: number) => void;
  finishWiring: (targetFrameId: string) => void;
  cancelWiring: () => void;
  addInteraction: (elementId: string, interaction: PrototypeInteraction) => void;
  removeInteraction: (elementId: string, interactionId: string) => void;
  setStartingFrame: (frameId: string) => void;

  // Player Actions
  startPlaying: (startFrameId?: string) => void;
  stopPlaying: () => void;
  navigateInPlayer: (targetFrameId: string) => void;
  navigateBackInPlayer: () => void;
  openOverlayInPlayer: (overlay: { frameId?: string; elementId?: string; type: string }) => void;
  closeOverlayInPlayer: () => void;

  // Drag State Actions
  setDragState: (state: Partial<DragState>) => void;
  setSnapGuides: (guides: SnapGuide[]) => void;
  finishDrawingShape: (type: string, startX: number, startY: number, endX: number, endY: number) => void;

  // History & Storage
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  loadStarterProject: (projectId: string) => void;
  loadProjectFromData: (projectData: any) => void;
  exportProjectData: () => any;
  createNewProject: (name?: string, templateId?: string) => void;
  saveCurrentProject: (customName?: string) => void;
  saveAsFile: () => void;
  loadSavedProjectById: (id: string) => void;
  deleteSavedProjectById: (id: string) => void;
  refreshSavedProjectsList: () => void;
}

const STORAGE_KEY_SAVED_LIST = 'protojam_saved_projects_list';
const STORAGE_KEY_PROJECT_PREFIX = 'protojam_project_';

const getInitialSavedProjects = (): SavedProjectMeta[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_LIST);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading saved projects', e);
  }
  return [];
};

const defaultStarter = STARTER_PROJECTS[0];

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: 'proj-default-1',
  projectName: defaultStarter.name,
  isSaved: true,
  lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  activeProjectId: defaultStarter.id,
  editorMode: 'design',
  isProjectMenuOpen: false,
  savedProjects: getInitialSavedProjects(),

  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,

  frames: JSON.parse(JSON.stringify(defaultStarter.frames)),
  sections: [],
  elements: JSON.parse(JSON.stringify(defaultStarter.elements)),
  prototypeFlows: JSON.parse(JSON.stringify(defaultStarter.flows)),

  selectedFrameIds: [],
  selectedSectionIds: [],
  selectedElementIds: ['el-action-row'],
  selectedVectorPointIds: [],
  hoveredElementId: null,
  hoveredFrameId: null,
  activeTool: 'select',
  viewport: { x: 100, y: 50, zoom: 0.85 },
  canvasSettings: {
    gridType: 'dots',
    gridSize: 24,
    snapToGrid: true,
    snapToObjects: true,
    showRulers: true,
    showMinimap: true,
    showFlowWires: false,
    theme: 'dark'
  },
  dragState: {
    isDragging: false,
    type: 'canvas',
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  },
  snapGuides: [],

  // Vector editing
  isVectorEditing: false,
  editingVectorId: null,
  vectorTool: 'pen',
  activeVectorData: null,

  // Inline text
  inlineEditingElementId: null,

  isWiring: false,
  wireSourceElementId: null,
  wireSourceFrameId: null,
  wireMousePos: null,

  isPlaying: false,
  currentPlayingFrameId: 'frame-screen-1',
  activeOverlays: [],
  prototypeNavigationHistory: ['frame-screen-1'],

  history: [
    {
      frames: JSON.parse(JSON.stringify(defaultStarter.frames)),
      sections: [],
      elements: JSON.parse(JSON.stringify(defaultStarter.elements))
    }
  ],
  historyIndex: 0,

  setProjectName: (name) => set({ projectName: name, isSaved: false }),
  setEditorMode: (mode) => set((state) => ({
    editorMode: mode,
    canvasSettings: {
      ...state.canvasSettings,
      showFlowWires: mode === 'prototype'
    }
  })),

  toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
  toggleProjectMenu: () => set((state) => ({ isProjectMenuOpen: !state.isProjectMenuOpen })),
  openProjectMenu: () => {
    get().refreshSavedProjectsList();
    set({ isProjectMenuOpen: true });
  },
  closeProjectMenu: () => set({ isProjectMenuOpen: false }),

  setActiveTool: (tool) => {
    if (tool === 'pen' && !get().isVectorEditing) {
      get().startVectorEditing();
      return;
    }
    set({ activeTool: tool });
  },

  setViewport: (transform) => set((state) => ({ viewport: { ...state.viewport, ...transform } })),
  setZoom: (zoom) => set((state) => ({ viewport: { ...state.viewport, zoom: Math.min(Math.max(zoom, 0.1), 4.0) } })),
  panBy: (dx, dy) => set((state) => ({ viewport: { ...state.viewport, x: state.viewport.x + dx, y: state.viewport.y + dy } })),
  resetZoom: () => set((state) => ({ viewport: { ...state.viewport, zoom: 1 } })),
  zoomToFit: () => {
    const { frames, sections, elements } = get();
    const allItems = [
      ...frames.map(f => ({ x: f.x, y: f.y, width: f.width, height: f.height })),
      ...sections.map(s => ({ x: s.x, y: s.y, width: s.width, height: s.height })),
      ...elements.filter(e => !e.parentId).map(e => ({ x: Number(e.style.x), y: Number(e.style.y), width: Number(e.style.width), height: Number(e.style.height) }))
    ];

    if (allItems.length === 0) {
      set({ viewport: { x: 100, y: 100, zoom: 1 } });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allItems.forEach(f => {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    });

    const totalW = maxX - minX + 240;
    const totalH = maxY - minY + 240;
    const availW = window.innerWidth - (get().isLeftSidebarOpen ? 300 : 40) - (get().isRightSidebarOpen ? 340 : 40);
    const availH = window.innerHeight - 120;
    const zoom = Math.min(Math.max(Math.min(availW / totalW, availH / totalH), 0.15), 1.2);
    const x = (availW - totalW * zoom) / 2 + (get().isLeftSidebarOpen ? 300 : 40) - minX * zoom;
    const y = (availH - totalH * zoom) / 2 + 70 - minY * zoom;
    set({ viewport: { x, y, zoom } });
  },

  updateCanvasSettings: (settings) => set((state) => ({
    canvasSettings: { ...state.canvasSettings, ...settings }
  })),

  selectElement: (id, multi = false) => set((state) => ({
    selectedElementIds: multi 
      ? state.selectedElementIds.includes(id) 
        ? state.selectedElementIds.filter(i => i !== id) 
        : [...state.selectedElementIds, id]
      : [id],
    selectedFrameIds: [],
    selectedSectionIds: []
  })),

  selectFrame: (id, multi = false) => set((state) => ({
    selectedFrameIds: multi 
      ? state.selectedFrameIds.includes(id) 
        ? state.selectedFrameIds.filter(i => i !== id) 
        : [...state.selectedFrameIds, id]
      : [id],
    selectedElementIds: [],
    selectedSectionIds: []
  })),

  selectSection: (id, multi = false) => set((state) => ({
    selectedSectionIds: multi
      ? state.selectedSectionIds.includes(id)
        ? state.selectedSectionIds.filter(i => i !== id)
        : [...state.selectedSectionIds, id]
      : [id],
    selectedFrameIds: [],
    selectedElementIds: []
  })),

  selectVectorPoint: (id, multi = false) => set((state) => ({
    selectedVectorPointIds: multi
      ? state.selectedVectorPointIds.includes(id)
        ? state.selectedVectorPointIds.filter(i => i !== id)
        : [...state.selectedVectorPointIds, id]
      : [id]
  })),

  clearSelection: () => set({ selectedElementIds: [], selectedFrameIds: [], selectedSectionIds: [], selectedVectorPointIds: [] }),
  setHoveredElement: (id) => set({ hoveredElementId: id }),
  setHoveredFrame: (id) => set({ hoveredFrameId: id }),
  setInlineEditingElementId: (id) => set({ inlineEditingElementId: id }),

  // Frame Actions
  addFrame: (preset, x, y) => {
    const { frames, pushHistory } = get();
    const id = `frame-${Date.now()}`;
    const posX = x ?? (frames.length > 0 ? frames[frames.length - 1].x + frames[frames.length - 1].width + 120 : 100);
    const posY = y ?? 100;

    const newFrame: DeviceFrame = {
      id,
      name: `${preset.name} ${frames.length + 1}`,
      deviceType: preset.category as any,
      presetName: preset.name,
      x: posX,
      y: posY,
      width: preset.width,
      height: preset.height,
      orientation: 'portrait',
      backgroundColor: '#141413',
      showDeviceMockupBezel: true,
      elementIds: [],
      isStartingFrame: frames.length === 0,
      locked: false,
      hidden: false,
      collapsed: false
    };

    set((state) => ({
      frames: [...state.frames, newFrame],
      selectedFrameIds: [id],
      selectedElementIds: [],
      selectedSectionIds: [],
      isSaved: false
    }));
    pushHistory();
    return id;
  },

  addCustomFrame: (x, y, width, height, name) => {
    const { frames, pushHistory } = get();
    const id = `frame-${Date.now()}`;
    const newFrame: DeviceFrame = {
      id,
      name: name || `Custom Frame ${frames.length + 1}`,
      deviceType: 'custom',
      presetName: 'Custom Frame',
      x,
      y,
      width: Math.max(width, 100),
      height: Math.max(height, 100),
      orientation: width > height ? 'landscape' : 'portrait',
      backgroundColor: '#141413',
      showDeviceMockupBezel: false,
      elementIds: [],
      isStartingFrame: frames.length === 0,
      locked: false,
      hidden: false,
      collapsed: false
    };

    set((state) => ({
      frames: [...state.frames, newFrame],
      selectedFrameIds: [id],
      selectedElementIds: [],
      selectedSectionIds: [],
      activeTool: 'select',
      isSaved: false
    }));
    pushHistory();
    return id;
  },

  updateFrame: (id, updates) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, ...updates } : f),
      isSaved: false
    }));
  },

  deleteFrame: (id) => {
    const { pushHistory } = get();
    set((state) => {
      const frameToDelete = state.frames.find(f => f.id === id);
      const childIds = frameToDelete?.elementIds || [];
      return {
        frames: state.frames.filter(f => f.id !== id),
        elements: state.elements.filter(el => !childIds.includes(el.id) && el.parentId !== id),
        selectedFrameIds: state.selectedFrameIds.filter(i => i !== id),
        isSaved: false
      };
    });
    pushHistory();
  },

  duplicateFrame: (id) => {
    const { frames, elements, pushHistory } = get();
    const frame = frames.find(f => f.id === id);
    if (!frame) return;

    const newFrameId = `frame-${Date.now()}`;
    const clonedElements: UIElement[] = [];
    const newElementIds: string[] = [];

    frame.elementIds.forEach((elId) => {
      const el = elements.find(e => e.id === elId);
      if (el) {
        const newElId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        clonedElements.push({
          ...JSON.parse(JSON.stringify(el)),
          id: newElId,
          parentId: newFrameId
        });
        newElementIds.push(newElId);
      }
    });

    const newFrame: DeviceFrame = {
      ...JSON.parse(JSON.stringify(frame)),
      id: newFrameId,
      name: `${frame.name} (Copy)`,
      x: frame.x + frame.width + 80,
      elementIds: newElementIds,
      isStartingFrame: false
    };

    set((state) => ({
      frames: [...state.frames, newFrame],
      elements: [...state.elements, ...clonedElements],
      selectedFrameIds: [newFrameId],
      selectedElementIds: [],
      isSaved: false
    }));
    pushHistory();
  },

  toggleFrameOrientation: (id) => {
    const { pushHistory } = get();
    set((state) => ({
      frames: state.frames.map(f => {
        if (f.id === id) {
          const nextOri = f.orientation === 'portrait' ? 'landscape' : 'portrait';
          return {
            ...f,
            orientation: nextOri,
            width: f.height,
            height: f.width
          };
        }
        return f;
      }),
      isSaved: false
    }));
    pushHistory();
  },

  toggleFrameLock: (id) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, locked: !f.locked } : f)
    }));
  },

  toggleFrameHidden: (id) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, hidden: !f.hidden } : f)
    }));
  },

  toggleFrameCollapsed: (id) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, collapsed: !f.collapsed } : f)
    }));
  },

  moveFrame: (id, dx, dy) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, x: Math.round(f.x + dx), y: Math.round(f.y + dy) } : f),
      isSaved: false
    }));
  },

  updateFramePosition: (id, x, y) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === id ? { ...f, x: Math.round(x), y: Math.round(y) } : f),
      isSaved: false
    }));
  },

  // Section Actions
  addSection: (x, y, width = 800, height = 700, name) => {
    const { sections, pushHistory } = get();
    const id = `section-${Date.now()}`;
    const newSection: SectionFrame = {
      id,
      name: name || `Section ${sections.length + 1}`,
      x,
      y,
      width,
      height,
      backgroundColor: 'rgba(235, 235, 236, 0.03)',
      frameIds: [],
      elementIds: [],
      locked: false,
      hidden: false
    };

    set((state) => ({
      sections: [...state.sections, newSection],
      selectedSectionIds: [id],
      selectedFrameIds: [],
      selectedElementIds: [],
      activeTool: 'select',
      isSaved: false
    }));
    pushHistory();
    return id;
  },

  updateSection: (id, updates) => {
    set((state) => ({
      sections: state.sections.map(s => s.id === id ? { ...s, ...updates } : s),
      isSaved: false
    }));
  },

  deleteSection: (id) => {
    const { pushHistory } = get();
    set((state) => ({
      sections: state.sections.filter(s => s.id !== id),
      selectedSectionIds: state.selectedSectionIds.filter(i => i !== id),
      isSaved: false
    }));
    pushHistory();
  },

  moveSection: (id, dx, dy) => {
    const { sections, frames } = get();
    const sec = sections.find(s => s.id === id);
    if (!sec) return;

    // Move section along with nested frames
    set((state) => ({
      sections: state.sections.map(s => s.id === id ? { ...s, x: Math.round(s.x + dx), y: Math.round(s.y + dy) } : s),
      frames: state.frames.map(f => sec.frameIds.includes(f.id) ? { ...f, x: Math.round(f.x + dx), y: Math.round(f.y + dy) } : f),
      isSaved: false
    }));
  },

  // Element Actions
  addElement: (type, x, y, parentFrameId) => {
    const { pushHistory } = get();
    const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const template = COMPONENT_TEMPLATES.find(t => t.type === type) || COMPONENT_TEMPLATES[0];
    const newElement = template.createDefaultElement(id, x, y, parentFrameId);

    set((state) => {
      let updatedFrames = state.frames;
      if (parentFrameId) {
        updatedFrames = state.frames.map(f => 
          f.id === parentFrameId 
            ? { ...f, elementIds: [...f.elementIds, id] }
            : f
        );
      }
      return {
        elements: [...state.elements, newElement],
        frames: updatedFrames,
        selectedElementIds: [id],
        selectedFrameIds: [],
        selectedSectionIds: [],
        activeTool: 'select',
        isSaved: false
      };
    });
    pushHistory();
    return id;
  },

  createShapeAt: (type, x, y, width, height, parentId) => {
    const { pushHistory } = get();
    const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const template = COMPONENT_TEMPLATES.find(t => t.type === type) || COMPONENT_TEMPLATES[0];
    const defaultEl = template.createDefaultElement(id, x, y, parentId);
    
    defaultEl.style.width = width;
    defaultEl.style.height = height;

    set((state) => {
      let updatedFrames = state.frames;
      if (parentId) {
        updatedFrames = state.frames.map(f => 
          f.id === parentId 
            ? { ...f, elementIds: [...f.elementIds, id] }
            : f
        );
      }
      return {
        elements: [...state.elements, defaultEl],
        frames: updatedFrames,
        selectedElementIds: [id],
        selectedFrameIds: [],
        selectedSectionIds: [],
        activeTool: 'select',
        isSaved: false
      };
    });
    pushHistory();
    return id;
  },

  dropComponentAt: (type, canvasX, canvasY) => {
    const { frames, addElement } = get();
    let targetFrame: DeviceFrame | undefined;
    for (const f of frames) {
      if (canvasX >= f.x && canvasX <= f.x + f.width && canvasY >= f.y && canvasY <= f.y + f.height) {
        targetFrame = f;
        break;
      }
    }

    if (targetFrame) {
      const relX = Math.max(10, Math.round(canvasX - targetFrame.x));
      const relY = Math.max(10, Math.round(canvasY - targetFrame.y));
      return addElement(type, relX, relY, targetFrame.id);
    } else {
      return addElement(type, Math.round(canvasX), Math.round(canvasY), undefined);
    }
  },

  addPredefinedElement: (element) => {
    const { pushHistory } = get();
    set((state) => {
      let updatedFrames = state.frames;
      if (element.parentId) {
        updatedFrames = state.frames.map(f => 
          f.id === element.parentId 
            ? { ...f, elementIds: [...f.elementIds, element.id] }
            : f
        );
      }
      return {
        elements: [...state.elements, element],
        frames: updatedFrames,
        selectedElementIds: [element.id],
        isSaved: false
      };
    });
    pushHistory();
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map(el => el.id === id ? { ...el, ...updates } : el),
      isSaved: false
    }));
  },

  updateElementStyle: (id, styleUpdates) => {
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === id 
          ? { ...el, style: { ...el.style, ...styleUpdates } }
          : el
      ),
      isSaved: false
    }));
  },

  updateElementSemanticProps: (id, propUpdates) => {
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === id 
          ? { ...el, semanticProps: { ...el.semanticProps, ...propUpdates } }
          : el
      ),
      isSaved: false
    }));
  },

  deleteElement: (id) => {
    const { pushHistory } = get();
    set((state) => ({
      elements: state.elements.filter(el => el.id !== id),
      frames: state.frames.map(f => ({
        ...f,
        elementIds: f.elementIds.filter(elId => elId !== id)
      })),
      selectedElementIds: state.selectedElementIds.filter(i => i !== id),
      isSaved: false
    }));
    pushHistory();
  },

  duplicateElement: (id) => {
    const { elements, pushHistory } = get();
    const el = elements.find(e => e.id === id);
    if (!el) return;

    const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const cloned: UIElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: newId,
      name: `${el.name} (Copy)`,
      style: {
        ...el.style,
        x: Number(el.style.x) + 20,
        y: Number(el.style.y) + 20
      }
    };

    set((state) => {
      let updatedFrames = state.frames;
      if (el.parentId) {
        updatedFrames = state.frames.map(f => 
          f.id === el.parentId 
            ? { ...f, elementIds: [...f.elementIds, newId] }
            : f
        );
      }
      return {
        elements: [...state.elements, cloned],
        frames: updatedFrames,
        selectedElementIds: [newId],
        isSaved: false
      };
    });
    pushHistory();
  },

  toggleElementLock: (id) => {
    set((state) => ({
      elements: state.elements.map(el => el.id === id ? { ...el, locked: !el.locked } : el)
    }));
  },

  toggleElementHidden: (id) => {
    set((state) => ({
      elements: state.elements.map(el => el.id === id ? { ...el, hidden: !el.hidden } : el)
    }));
  },

  moveElement: (id, dx, dy) => {
    set((state) => ({
      elements: state.elements.map(el => {
        if (el.id === id) {
          return {
            ...el,
            style: {
              ...el.style,
              x: Math.round(Number(el.style.x) + dx),
              y: Math.round(Number(el.style.y) + dy)
            }
          };
        }
        return el;
      }),
      isSaved: false
    }));
  },

  updateElementPosition: (id, x, y) => {
    set((state) => ({
      elements: state.elements.map(el => {
        if (el.id === id) {
          return {
            ...el,
            style: {
              ...el.style,
              x: Math.round(x),
              y: Math.round(y)
            }
          };
        }
        return el;
      }),
      isSaved: false
    }));
  },

  // Reparent element when dragged into or out of a Frame
  reparentElement: (elementId, newParentId, absCanvasX, absCanvasY) => {
    const { elements, frames, pushHistory } = get();
    const el = elements.find(e => e.id === elementId);
    if (!el) return;

    const oldParentId = el.parentId;
    if (oldParentId === newParentId) return;

    let targetX = absCanvasX ?? Number(el.style.x);
    let targetY = absCanvasY ?? Number(el.style.y);

    if (newParentId) {
      const targetFrame = frames.find(f => f.id === newParentId);
      if (targetFrame) {
        targetX = targetX - targetFrame.x;
        targetY = targetY - targetFrame.y;
      }
    }

    set((state) => {
      const updatedFrames = state.frames.map(f => {
        if (f.id === oldParentId) {
          return { ...f, elementIds: f.elementIds.filter(id => id !== elementId) };
        }
        if (f.id === newParentId) {
          return { ...f, elementIds: [...f.elementIds, elementId] };
        }
        return f;
      });

      const updatedElements = state.elements.map(e => {
        if (e.id === elementId) {
          return {
            ...e,
            parentId: newParentId,
            style: {
              ...e.style,
              x: Math.round(targetX),
              y: Math.round(targetY)
            }
          };
        }
        return e;
      });

      return {
        frames: updatedFrames,
        elements: updatedElements,
        isSaved: false
      };
    });
    pushHistory();
  },

  bringToFront: (id) => {
    set((state) => {
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx === -1) return state;
      const el = state.elements[idx];
      const rest = state.elements.filter(e => e.id !== id);
      return { elements: [...rest, el], isSaved: false };
    });
  },

  sendToBack: (id) => {
    set((state) => {
      const idx = state.elements.findIndex(e => e.id === id);
      if (idx === -1) return state;
      const el = state.elements[idx];
      const rest = state.elements.filter(e => e.id !== id);
      return { elements: [el, ...rest], isSaved: false };
    });
  },

  alignSelectedElements: (alignment) => {
    const { elements, selectedElementIds, pushHistory } = get();
    if (selectedElementIds.length < 2) return;

    const selected = elements.filter(e => selectedElementIds.includes(e.id));
    let minX = Math.min(...selected.map(e => Number(e.style.x)));
    let maxX = Math.max(...selected.map(e => Number(e.style.x) + Number(e.style.width)));
    let minY = Math.min(...selected.map(e => Number(e.style.y)));
    let maxY = Math.max(...selected.map(e => Number(e.style.y) + Number(e.style.height)));

    set((state) => ({
      elements: state.elements.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        const w = Number(el.style.width);
        const h = Number(el.style.height);
        let newX = Number(el.style.x);
        let newY = Number(el.style.y);

        if (alignment === 'left') newX = minX;
        if (alignment === 'right') newX = maxX - w;
        if (alignment === 'center') newX = minX + (maxX - minX) / 2 - w / 2;
        if (alignment === 'top') newY = minY;
        if (alignment === 'bottom') newY = maxY - h;
        if (alignment === 'middle') newY = minY + (maxY - minY) / 2 - h / 2;

        return { ...el, style: { ...el.style, x: newX, y: newY } };
      }),
      isSaved: false
    }));
    pushHistory();
  },

  // Auto-Layout Actions
  toggleAutoLayout: (targetId) => {
    const { frames, elements, pushHistory } = get();
    const isFrame = frames.some(f => f.id === targetId);

    if (isFrame) {
      set((state) => ({
        frames: state.frames.map(f => {
          if (f.id === targetId) {
            const cur = f.autoLayout?.enabled;
            return {
              ...f,
              autoLayout: {
                enabled: !cur,
                direction: f.autoLayout?.direction || 'vertical',
                gap: f.autoLayout?.gap ?? 16,
                padding: f.autoLayout?.padding || { top: 16, right: 16, bottom: 16, left: 16 },
                align: f.autoLayout?.align || 'start',
                sizingH: f.autoLayout?.sizingH || 'fixed',
                sizingV: f.autoLayout?.sizingV || 'hug'
              }
            };
          }
          return f;
        }),
        isSaved: false
      }));
    } else {
      set((state) => ({
        elements: state.elements.map(e => {
          if (e.id === targetId) {
            const cur = e.style.autoLayout?.enabled;
            return {
              ...e,
              style: {
                ...e.style,
                autoLayout: {
                  enabled: !cur,
                  direction: e.style.autoLayout?.direction || 'horizontal',
                  gap: e.style.autoLayout?.gap ?? 12,
                  padding: e.style.autoLayout?.padding || { top: 12, right: 12, bottom: 12, left: 12 },
                  align: e.style.autoLayout?.align || 'center',
                  sizingH: e.style.autoLayout?.sizingH || 'hug',
                  sizingV: e.style.autoLayout?.sizingV || 'hug'
                }
              }
            };
          }
          return e;
        }),
        isSaved: false
      }));
    }
    pushHistory();
  },

  updateAutoLayout: (targetId, updates) => {
    set((state) => ({
      frames: state.frames.map(f => f.id === targetId && f.autoLayout ? { ...f, autoLayout: { ...f.autoLayout, ...updates } } : f),
      elements: state.elements.map(e => e.id === targetId && e.style.autoLayout ? { ...e, style: { ...e.style, autoLayout: { ...e.style.autoLayout, ...updates } } } : e),
      isSaved: false
    }));
  },

  groupSelectedIntoAutoLayout: () => {
    const { elements, selectedElementIds, addElement, pushHistory } = get();
    if (selectedElementIds.length < 2) return;

    const selected = elements.filter(e => selectedElementIds.includes(e.id));
    const minX = Math.min(...selected.map(e => Number(e.style.x)));
    const minY = Math.min(...selected.map(e => Number(e.style.y)));
    const maxX = Math.max(...selected.map(e => Number(e.style.x) + Number(e.style.width)));
    const maxY = Math.max(...selected.map(e => Number(e.style.y) + Number(e.style.height)));
    const parentId = selected[0]?.parentId;

    const frameId = get().addCustomFrame(minX, minY, maxX - minX + 24, maxY - minY + 24, 'Auto Layout Group');
    
    // Reparent all selected into this frame
    selected.forEach(el => {
      get().reparentElement(el.id, frameId, Number(el.style.x), Number(el.style.y));
    });

    get().toggleAutoLayout(frameId);
    pushHistory();
  },

  // Component Master & Instance System
  createMasterComponent: (elementId) => {
    const { pushHistory } = get();
    set((state) => ({
      elements: state.elements.map(el => el.id === elementId ? { ...el, isMasterComponent: true, name: `❖ ${el.name.replace(/^❖ /, '')}` } : el),
      isSaved: false
    }));
    pushHistory();
  },

  instantiateComponent: (masterId, x, y, parentId) => {
    const { elements, pushHistory } = get();
    const master = elements.find(e => e.id === masterId);
    if (!master) return '';

    const newId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const instance: UIElement = {
      ...JSON.parse(JSON.stringify(master)),
      id: newId,
      name: `◇ ${master.name.replace(/^❖ /, '')}`,
      isMasterComponent: false,
      masterComponentId: masterId,
      isInstance: true,
      parentId,
      style: {
        ...master.style,
        x: x ?? Number(master.style.x) + 30,
        y: y ?? Number(master.style.y) + 30
      }
    };

    set((state) => ({
      elements: [...state.elements, instance],
      selectedElementIds: [newId],
      isSaved: false
    }));
    pushHistory();
    return newId;
  },

  detachInstance: (instanceId) => {
    set((state) => ({
      elements: state.elements.map(el => el.id === instanceId ? { ...el, isInstance: false, masterComponentId: undefined, name: el.name.replace(/^◇ /, '') } : el),
      isSaved: false
    }));
  },

  // Vector / Pen Tool Mode
  startVectorEditing: (elementId, initialX, initialY) => {
    const { elements, viewport } = get();
    let existingVector = elementId ? elements.find(e => e.id === elementId && e.type === 'vectorPath') : null;

    if (!existingVector) {
      // Create new vector element
      const id = `vector-${Date.now()}`;
      const defaultPt: VectorPoint = {
        id: 'pt-1',
        x: initialX ?? 100,
        y: initialY ?? 100,
        isCorner: true
      };

      const initialData: VectorData = {
        points: [defaultPt],
        faces: [],
        isClosed: false
      };

      const newEl: UIElement = {
        id,
        name: 'Vector Path',
        type: 'vectorPath',
        interactions: [],
        style: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          borderColor: '#ebebec',
          borderWidth: 2,
          fillColor: 'transparent',
          vectorData: initialData
        },
        semanticProps: {}
      };

      set((state) => ({
        elements: [...state.elements, newEl],
        isVectorEditing: true,
        editingVectorId: id,
        vectorTool: 'pen',
        activeVectorData: initialData,
        selectedElementIds: [id],
        selectedVectorPointIds: ['pt-1'],
        activeTool: 'pen'
      }));
    } else {
      set({
        isVectorEditing: true,
        editingVectorId: elementId!,
        vectorTool: 'select',
        activeVectorData: existingVector.style.vectorData || { points: [], faces: [], isClosed: false },
        selectedElementIds: [elementId!],
        activeTool: 'pen'
      });
    }
  },

  setVectorTool: (tool) => set({ vectorTool: tool }),

  addVectorPoint: (x, y) => {
    const { editingVectorId, activeVectorData, updateElementStyle } = get();
    if (!editingVectorId || !activeVectorData) return;

    const newPtId = `pt-${Date.now()}`;
    const newPt: VectorPoint = {
      id: newPtId,
      x: Math.round(x),
      y: Math.round(y),
      isCorner: true
    };

    const updatedData: VectorData = {
      ...activeVectorData,
      points: [...activeVectorData.points, newPt]
    };

    set({
      activeVectorData: updatedData,
      selectedVectorPointIds: [newPtId]
    });

    updateElementStyle(editingVectorId, { vectorData: updatedData });
  },

  updateVectorPoint: (pointId, updates) => {
    const { editingVectorId, activeVectorData, updateElementStyle } = get();
    if (!editingVectorId || !activeVectorData) return;

    const updatedData: VectorData = {
      ...activeVectorData,
      points: activeVectorData.points.map(p => p.id === pointId ? { ...p, ...updates } : p)
    };

    set({ activeVectorData: updatedData });
    updateElementStyle(editingVectorId, { vectorData: updatedData });
  },

  closeVectorPath: () => {
    const { editingVectorId, activeVectorData, updateElementStyle } = get();
    if (!editingVectorId || !activeVectorData || activeVectorData.points.length < 3) return;

    // Auto-create closed face
    const faceId = `face-${Date.now()}`;
    const newFace: VectorFace = {
      id: faceId,
      pointIds: activeVectorData.points.map(p => p.id),
      filled: true,
      fillColor: '#ebebec'
    };

    const updatedData: VectorData = {
      ...activeVectorData,
      isClosed: true,
      faces: [...activeVectorData.faces, newFace]
    };

    set({ activeVectorData: updatedData });
    updateElementStyle(editingVectorId, { vectorData: updatedData, fillColor: '#ebebec' });
  },

  fillVectorFace: (pointIds, color = '#ebebec') => {
    const { editingVectorId, activeVectorData, updateElementStyle } = get();
    if (!editingVectorId || !activeVectorData) return;

    const targetPoints = pointIds || activeVectorData.points.map(p => p.id);
    const faceId = `face-${Date.now()}`;
    const newFace: VectorFace = {
      id: faceId,
      pointIds: targetPoints,
      filled: true,
      fillColor: color
    };

    const updatedData: VectorData = {
      ...activeVectorData,
      isClosed: true,
      faces: [...activeVectorData.faces, newFace]
    };

    set({ activeVectorData: updatedData });
    updateElementStyle(editingVectorId, { vectorData: updatedData, fillColor: color });
  },

  toggleFaceFill: (faceId) => {
    const { editingVectorId, activeVectorData, updateElementStyle } = get();
    if (!editingVectorId || !activeVectorData) return;

    const updatedData: VectorData = {
      ...activeVectorData,
      faces: activeVectorData.faces.map(f => !faceId || f.id === faceId ? { ...f, filled: !f.filled } : f)
    };

    set({ activeVectorData: updatedData });
    updateElementStyle(editingVectorId, { vectorData: updatedData });
  },

  finishVectorEditing: () => {
    set({
      isVectorEditing: false,
      editingVectorId: null,
      activeVectorData: null,
      selectedVectorPointIds: [],
      activeTool: 'select'
    });
    get().pushHistory();
  },

  cancelVectorEditing: () => {
    set({
      isVectorEditing: false,
      editingVectorId: null,
      activeVectorData: null,
      selectedVectorPointIds: [],
      activeTool: 'select'
    });
  },

  // Prototype Actions
  startWiring: (sourceElementId, sourceFrameId) => {
    set({
      isWiring: true,
      wireSourceElementId: sourceElementId,
      wireSourceFrameId: sourceFrameId || null,
      activeTool: 'prototypeWire'
    });
  },

  updateWireMousePos: (x, y) => set({ wireMousePos: { x, y } }),

  finishWiring: (targetFrameId) => {
    const { wireSourceElementId, pushHistory } = get();
    if (!wireSourceElementId) return;

    const newInteraction: PrototypeInteraction = {
      id: `interaction-${Date.now()}`,
      trigger: 'onClick',
      action: 'navigate',
      targetFrameId,
      transition: 'slideLeft',
      durationMs: 300,
      easing: 'spring'
    };

    set((state) => ({
      elements: state.elements.map(el => 
        el.id === wireSourceElementId 
          ? { ...el, interactions: [...el.interactions, newInteraction] }
          : el
      ),
      isWiring: false,
      wireSourceElementId: null,
      wireSourceFrameId: null,
      wireMousePos: null,
      activeTool: 'select',
      isSaved: false
    }));
    pushHistory();
  },

  cancelWiring: () => {
    set({
      isWiring: false,
      wireSourceElementId: null,
      wireSourceFrameId: null,
      wireMousePos: null,
      activeTool: 'select'
    });
  },

  addInteraction: (elementId, interaction) => {
    const { pushHistory } = get();
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === elementId 
          ? { ...el, interactions: [...el.interactions, interaction] }
          : el
      ),
      isSaved: false
    }));
    pushHistory();
  },

  removeInteraction: (elementId, interactionId) => {
    const { pushHistory } = get();
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === elementId 
          ? { ...el, interactions: el.interactions.filter(i => i.id !== interactionId) }
          : el
      ),
      isSaved: false
    }));
    pushHistory();
  },

  setStartingFrame: (frameId) => {
    set((state) => ({
      frames: state.frames.map(f => ({
        ...f,
        isStartingFrame: f.id === frameId
      })),
      isSaved: false
    }));
  },

  // Interactive Live Player
  startPlaying: (startFrameId) => {
    const { frames } = get();
    const target = startFrameId 
      ? startFrameId 
      : frames.find(f => f.isStartingFrame)?.id || frames[0]?.id || null;

    if (!target) return;

    set({
      isPlaying: true,
      currentPlayingFrameId: target,
      activeOverlays: [],
      prototypeNavigationHistory: [target]
    });
  },

  stopPlaying: () => {
    set({
      isPlaying: false,
      activeOverlays: []
    });
  },

  navigateInPlayer: (targetFrameId) => {
    set((state) => ({
      currentPlayingFrameId: targetFrameId,
      prototypeNavigationHistory: [...state.prototypeNavigationHistory, targetFrameId],
      activeOverlays: []
    }));
  },

  navigateBackInPlayer: () => {
    const { prototypeNavigationHistory } = get();
    if (prototypeNavigationHistory.length > 1) {
      const newHistory = [...prototypeNavigationHistory];
      newHistory.pop();
      const prevFrameId = newHistory[newHistory.length - 1];
      set({
        currentPlayingFrameId: prevFrameId,
        prototypeNavigationHistory: newHistory,
        activeOverlays: []
      });
    }
  },

  openOverlayInPlayer: (overlay) => {
    set((state) => ({
      activeOverlays: [...state.activeOverlays, overlay]
    }));
  },

  closeOverlayInPlayer: () => {
    set((state) => ({
      activeOverlays: state.activeOverlays.slice(0, -1)
    }));
  },

  setDragState: (state) => set((prev) => ({ dragState: { ...prev.dragState, ...state } })),
  setSnapGuides: (guides) => set({ snapGuides: guides }),

  finishDrawingShape: (type, startX, startY, endX, endY) => {
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.max(Math.abs(endX - startX), 20);
    const height = Math.max(Math.abs(endY - startY), 20);

    if (type === 'frame') {
      get().addCustomFrame(x, y, width, height);
    } else if (type === 'section') {
      get().addSection(x, y, width, height);
    } else {
      get().createShapeAt(type as UIElementType, x, y, width, height);
    }
  },

  // History Undo / Redo
  pushHistory: () => {
    const { frames, sections, elements, history, historyIndex } = get();
    const newSnapshot: HistorySnapshot = {
      frames: JSON.parse(JSON.stringify(frames)),
      sections: JSON.parse(JSON.stringify(sections)),
      elements: JSON.parse(JSON.stringify(elements))
    };
    const sliced = history.slice(0, historyIndex + 1);
    set({
      history: [...sliced, newSnapshot],
      historyIndex: sliced.length
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        frames: JSON.parse(JSON.stringify(prev.frames)),
        sections: JSON.parse(JSON.stringify(prev.sections || [])),
        elements: JSON.parse(JSON.stringify(prev.elements)),
        historyIndex: historyIndex - 1,
        selectedElementIds: [],
        selectedFrameIds: [],
        selectedSectionIds: [],
        isSaved: false
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({
        frames: JSON.parse(JSON.stringify(next.frames)),
        sections: JSON.parse(JSON.stringify(next.sections || [])),
        elements: JSON.parse(JSON.stringify(next.elements)),
        historyIndex: historyIndex + 1,
        selectedElementIds: [],
        selectedFrameIds: [],
        selectedSectionIds: [],
        isSaved: false
      });
    }
  },

  // Project Management Methods
  loadStarterProject: (projectId) => {
    const project = STARTER_PROJECTS.find(p => p.id === projectId) || STARTER_PROJECTS[0];
    const newProjId = `proj-${Date.now()}`;
    set({
      projectId: newProjId,
      projectName: project.name,
      activeProjectId: project.id,
      frames: JSON.parse(JSON.stringify(project.frames)),
      sections: [],
      elements: JSON.parse(JSON.stringify(project.elements)),
      prototypeFlows: JSON.parse(JSON.stringify(project.flows)),
      selectedFrameIds: [],
      selectedSectionIds: [],
      selectedElementIds: [],
      isSaved: true,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      history: [{
        frames: JSON.parse(JSON.stringify(project.frames)),
        sections: [],
        elements: JSON.parse(JSON.stringify(project.elements))
      }],
      historyIndex: 0,
      viewport: { x: 100, y: 50, zoom: 0.85 }
    });
  },

  createNewProject: (name = 'Untitled Prototype', templateId) => {
    if (templateId) {
      get().loadStarterProject(templateId);
      set({ projectName: name, isProjectMenuOpen: false });
      return;
    }

    const newProjId = `proj-${Date.now()}`;
    set({
      projectId: newProjId,
      projectName: name,
      activeProjectId: 'custom',
      frames: [],
      sections: [],
      elements: [],
      prototypeFlows: [],
      selectedFrameIds: [],
      selectedSectionIds: [],
      selectedElementIds: [],
      isSaved: true,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      history: [{ frames: [], sections: [], elements: [] }],
      historyIndex: 0,
      viewport: { x: 100, y: 100, zoom: 1 },
      isProjectMenuOpen: false
    });
  },

  saveCurrentProject: (customName) => {
    const { projectId, projectName, frames, sections, elements, prototypeFlows } = get();
    const finalName = customName || projectName;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    const fullData = {
      version: '1.0.0',
      appName: 'ProtoJam',
      projectId,
      projectName: finalName,
      updatedAt: `${dateStr} at ${timeStr}`,
      frames,
      sections,
      elements,
      prototypeFlows
    };

    try {
      localStorage.setItem(`${STORAGE_KEY_PROJECT_PREFIX}${projectId}`, JSON.stringify(fullData));

      const existingList = getInitialSavedProjects();
      const metaItem: SavedProjectMeta = {
        id: projectId,
        name: finalName,
        updatedAt: `${dateStr} at ${timeStr}`,
        frameCount: frames.length,
        elementCount: elements.length
      };

      const updatedList = [metaItem, ...existingList.filter(p => p.id !== projectId)].slice(0, 20);
      localStorage.setItem(STORAGE_KEY_SAVED_LIST, JSON.stringify(updatedList));

      set({
        projectName: finalName,
        isSaved: true,
        lastSavedAt: timeStr,
        savedProjects: updatedList
      });
    } catch (err) {
      console.error('Failed to save project to localStorage', err);
    }
  },

  saveAsFile: () => {
    const { exportProjectData, projectName } = get();
    const data = exportProjectData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
    a.download = `${safeName}.protojam`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    get().saveCurrentProject();
  },

  loadProjectFromData: (projectData) => {
    const newProjId = projectData.projectId || `proj-${Date.now()}`;
    const name = projectData.projectName || 'Imported Prototype';
    const frames = projectData.frames || [];
    const sections = projectData.sections || [];
    const elements = projectData.elements || [];
    const flows = projectData.prototypeFlows || [];

    set({
      projectId: newProjId,
      projectName: name,
      frames: JSON.parse(JSON.stringify(frames)),
      sections: JSON.parse(JSON.stringify(sections)),
      elements: JSON.parse(JSON.stringify(elements)),
      prototypeFlows: JSON.parse(JSON.stringify(flows)),
      selectedFrameIds: [],
      selectedSectionIds: [],
      selectedElementIds: [],
      isSaved: true,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      history: [{
        frames: JSON.parse(JSON.stringify(frames)),
        sections: JSON.parse(JSON.stringify(sections)),
        elements: JSON.parse(JSON.stringify(elements))
      }],
      historyIndex: 0,
      isProjectMenuOpen: false
    });

    get().zoomToFit();
  },

  loadSavedProjectById: (id) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PROJECT_PREFIX}${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        get().loadProjectFromData(parsed);
      }
    } catch (e) {
      console.error('Failed to load project from storage', e);
    }
  },

  deleteSavedProjectById: (id) => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PROJECT_PREFIX}${id}`);
      const list = getInitialSavedProjects().filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY_SAVED_LIST, JSON.stringify(list));
      set({ savedProjects: list });
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  },

  refreshSavedProjectsList: () => {
    set({ savedProjects: getInitialSavedProjects() });
  },

  exportProjectData: () => {
    const { projectId, projectName, frames, sections, elements, prototypeFlows } = get();
    return {
      version: '1.0.0',
      appName: 'ProtoJam Desktop',
      projectId,
      projectName,
      exportDate: new Date().toISOString(),
      frames,
      sections,
      elements,
      prototypeFlows
    };
  }
}));
