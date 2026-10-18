import { useProjectStore } from '../store/useProjectStore';

// Blender's habit: while dragging - moving, resizing, rotating, drawing a
// shape, scrubbing a number, dragging a guide or a layer - a right-click (or
// Esc) cancels it and puts everything back as it was when the drag began.
//
// A drag calls startGesture(stop) when it begins, where stop() ends it (takes
// its listeners off, clears its state); it calls the returned end() when it
// finishes normally.

type Gesture = { cancel: () => void };
let current: Gesture | null = null;
let swallowRight = false;          // the right-button events after a cancel

export const startGesture = (stop: () => void): (() => void) => {
  const s = useProjectStore.getState();
  const snap = {
    frames: s.frames, elements: s.elements, sections: s.sections, guides: s.guides,
    selectedElementIds: s.selectedElementIds, selectedFrameIds: s.selectedFrameIds
  };
  const g: Gesture = { cancel: () => { stop(); useProjectStore.setState(snap); } };
  current = g;
  return () => { if (current === g) current = null; };
};

const cancel = (e: Event, right = true) => {
  const g = current;
  current = null;
  // the right button's release and menu follow; if they never come, the
  // next right-click must still open the menu
  if (right) {
    swallowRight = true;
    setTimeout(() => { swallowRight = false; }, 1500);
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  g?.cancel();
};

if (typeof window !== 'undefined') {
  // With the left button held, pressing the right one is a "chord": no new
  // pointerdown, but a mousedown and a pointermove with button 2.
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 2) return;
    if (current) { cancel(e); }
    else if (swallowRight) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('pointerdown', (e) => {
    if (e.button === 2 && current) { cancel(e); }
  }, true);
  window.addEventListener('pointermove', (e) => {
    if (e.button === 2 && current) { cancel(e); }
  }, true);
  // the menu a right-click would open, and the button's release, go nowhere
  for (const type of ['mouseup', 'pointerup', 'auxclick', 'contextmenu'] as const) {
    window.addEventListener(type, (e) => {
      if (!swallowRight || (e as MouseEvent).button !== 2) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === 'contextmenu') swallowRight = false;
    }, true);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) cancel(e, false); }, true);
}
