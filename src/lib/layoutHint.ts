import { create } from 'zustand';

// Which spacing the side panel is pointing at - a frame's gaps or its
// padding - so the canvas can show those spaces (SpacingHint), as Figma
// does while you hover or edit them.
export type HintPart = 'gap' | 'padding';
export const useLayoutHint = create<{ id: string | null; part: HintPart | null }>(() => ({ id: null, part: null }));

export const hintProps = (id: string, part: HintPart) => ({
  onMouseEnter: () => useLayoutHint.setState({ id, part }),
  onMouseLeave: () => { if (!document.activeElement?.closest?.('[data-hint]')) useLayoutHint.setState({ id: null, part: null }); },
  onFocus: () => useLayoutHint.setState({ id, part }),
  onBlur: () => useLayoutHint.setState({ id: null, part: null }),
  'data-hint': part
});
