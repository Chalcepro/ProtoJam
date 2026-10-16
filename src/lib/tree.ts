import type { DeviceFrame, UIElement } from '../types/components';

// The layer tree. Screens (DeviceFrame) are the roots; inside them - or loose
// on the canvas - a 'container' element is a frame that holds other elements
// (its children have parentId = its id), to any depth. Children's x/y are
// relative to their parent; inside an auto-layout parent they flow instead.

export const isContainer = (el?: UIElement) => el?.type === 'container';

// Somewhere a drop or a new shape can land: a frame. A group (or a boolean
// group) never takes things in - its box is only the extent of what it holds,
// often far bigger than anything seen there - as in Figma.
export const takesDrops = (el?: UIElement) => isContainer(el) && !el!.style.isGroup && !el!.style.booleanOp;

// The frame or screen a group sits in (through any groups around it).
export const frameAbove = (id: string | undefined, elements: UIElement[]): string | undefined => {
  let el = elements.find(e => e.id === id);
  while (el && !takesDrops(el)) { id = el.parentId; el = elements.find(e => e.id === id); }
  return id;
};

export const childrenOf = (parentId: string, elements: UIElement[]) =>
  elements.filter(e => e.parentId === parentId);

// The element and everything inside it, parents before children.
export const subtreeIds = (id: string, elements: UIElement[]): string[] => {
  const out = [id];
  for (let i = 0; i < out.length; i++) elements.forEach(e => { if (e.parentId === out[i]) out.push(e.id); });
  return out;
};

// From the outermost container down to the element itself (screens excluded).
export const chainOf = (id: string, elements: UIElement[]): UIElement[] => {
  const chain: UIElement[] = [];
  let el = elements.find(e => e.id === id);
  while (el) {
    chain.unshift(el);
    el = el.parentId ? elements.find(e => e.id === el!.parentId) : undefined;
  }
  return chain;
};

// Lays out its children in a row / column (so their x/y are not used).
export const flowsChildren = (parentId: string | undefined, elements: UIElement[], frames: DeviceFrame[]) => {
  if (!parentId) return false;
  const f = frames.find(fr => fr.id === parentId);
  if (f) return !!f.autoLayout?.enabled;
  return !!elements.find(e => e.id === parentId)?.style.autoLayout?.enabled;
};

export const inFlow = (el: UIElement, elements: UIElement[], frames: DeviceFrame[]) =>
  !el.style.absolutePosition && flowsChildren(el.parentId, elements, frames);

// Where a parent's 0,0 is on the canvas. Exact unless something on the way
// is laid out by auto layout - only the page knows those (see worldRectOf).
export const originOf = (parentId: string | undefined, elements: UIElement[], frames: DeviceFrame[]): { x: number; y: number } => {
  if (!parentId) return { x: 0, y: 0 };
  const f = frames.find(fr => fr.id === parentId);
  if (f) return { x: f.x, y: f.y };
  const p = elements.find(e => e.id === parentId);
  if (!p) return { x: 0, y: 0 };
  const o = originOf(p.parentId, elements, frames);
  return { x: o.x + Number(p.style.x), y: o.y + Number(p.style.y) };
};

export const absBoxOf = (el: UIElement, elements: UIElement[], frames: DeviceFrame[]) => {
  const o = originOf(el.parentId, elements, frames);
  return { x: o.x + Number(el.style.x), y: o.y + Number(el.style.y), w: Number(el.style.width) || 0, h: Number(el.style.height) || 0 };
};

// What a click on `id` picks, as in Figma: the outermost container not yet
// "entered". A container is entered once something inside it is selected, so
// after a double-click steps in, plain clicks pick its children.
export const pickTarget = (id: string, elements: UIElement[], selected: string[]): string => {
  const chain = chainOf(id, elements);
  const entered = (c: UIElement) =>
    selected.some(s => s !== c.id && chainOf(s, elements).some(a => a.id === c.id));
  // walk in through every container already stepped into
  let i = 0;
  while (i < chain.length - 1 && entered(chain[i])) i++;
  return chain[i]?.id ?? id;
};

// One level deeper than what is selected, toward `id` (double-click).
export const stepInto = (id: string, elements: UIElement[], selected: string[]): string => {
  const chain = chainOf(id, elements);
  const at = chain.findIndex(c => selected.includes(c.id));
  return chain[Math.min(chain.length - 1, at + 1)]?.id ?? id;
};
