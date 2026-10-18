import { create } from 'zustand';

// Which spacing the side panel is pointing at - a frame's gaps or its
// padding - so the canvas can show those spaces (SpacingHint), as Figma
// does. Shown while the field is hovered, or while its value is being typed
// or dragged; gone a moment after the last change once the pointer is away.
export type HintPart = 'gap' | 'padding';
export const useLayoutHint = create<{ id: string | null; part: HintPart | null }>(() => ({ id: null, part: null }));

let hovering = false, dragging = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const show = (id: string, part: HintPart) => { clearTimeout(timer); useLayoutHint.setState({ id, part }); };
const hide = () => { clearTimeout(timer); useLayoutHint.setState({ id: null, part: null }); };
// after a change: stays a moment so the new value is seen, then goes
const hideSoon = () => { clearTimeout(timer); timer = setTimeout(() => { if (!hovering && !dragging) hide(); }, 700); };

export const hintProps = (id: string, part: HintPart) => ({
  onMouseEnter: () => { hovering = true; show(id, part); },
  onMouseLeave: () => { hovering = false; if (!dragging) hide(); },
  // typing, or the arrow keys
  onInput: () => { show(id, part); hideSoon(); },
  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { show(id, part); hideSoon(); } },
  // dragging a value: kept while the button is down, even off the field
  onPointerDown: () => {
    dragging = true;
    show(id, part);
    window.addEventListener('pointerup', () => { dragging = false; hideSoon(); }, { once: true, capture: true });
  },
  onBlur: () => { if (!hovering) hide(); },
  'data-hint': part
});
