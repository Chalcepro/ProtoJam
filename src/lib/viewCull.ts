import { create } from 'zustand';

// The canvas draws only what is in view (InfiniteCanvas). Something that needs
// a layer that may be out of view on the page itself - the AI's screenshots -
// asks for everything to be drawn for a moment.
export const useDrawAll = create<{ n: number }>(() => ({ n: 0 }));

export const withEverythingDrawn = async <T,>(f: () => Promise<T>): Promise<T> => {
  useDrawAll.setState(s => ({ n: s.n + 1 }));
  // two frames: React draws it, the browser lays it out
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try { return await f(); } finally { useDrawAll.setState(s => ({ n: s.n - 1 })); }
};
