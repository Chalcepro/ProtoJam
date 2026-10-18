import { useProjectStore } from '../store/useProjectStore';
import type { AutoLayoutSettings, DeviceFrame, ElementStyle, SemanticProperties } from '../types/components';

// With several layers (or several screens) selected, an edit in the
// inspector goes to all of them, as in Figma. X / Y move them together, by
// the same amount, so their arrangement keeps; every other value is set on
// each one. The inspector shows the first and edits through these.

const S = () => useProjectStore.getState();

export const targetsOf = (id: string): string[] => {
  const s = S();
  if (s.selectedElementIds.length > 1 && s.selectedElementIds.includes(id)) return s.selectedElementIds;
  if (s.selectedFrameIds.length > 1 && s.selectedFrameIds.includes(id)) return s.selectedFrameIds;
  return [id];
};

type Edits = {
  updateElementStyle: (id: string, upd: Partial<ElementStyle>) => void;
  updateElementSemanticProps: (id: string, upd: Partial<SemanticProperties>) => void;
  updateAutoLayout: (id: string, upd: Partial<AutoLayoutSettings>) => void;
  updateFrame: (id: string, upd: Partial<DeviceFrame>) => void;
};

export const withMulti = <T extends Partial<Edits>>(fns: T): T => {
  const out: Partial<Edits> = { ...fns };
  const style = fns.updateElementStyle, frame = fns.updateFrame;
  if (style) out.updateElementStyle = (id, upd) => {
    const ids = targetsOf(id);
    const base = S().elements.find(e => e.id === id);
    if (ids.length === 1 || !base) return style(id, upd);
    const dx = upd.x !== undefined ? Number(upd.x) - Number(base.style.x) : 0;
    const dy = upd.y !== undefined ? Number(upd.y) - Number(base.style.y) : 0;
    for (const t of ids) {
      const el = S().elements.find(e => e.id === t);
      if (!el) continue;
      const u = { ...upd };
      if (upd.x !== undefined) u.x = Number(el.style.x) + dx;
      if (upd.y !== undefined) u.y = Number(el.style.y) + dy;
      style(t, u);
    }
  };
  if (frame) out.updateFrame = (id, upd) => {
    const ids = targetsOf(id);
    const base = S().frames.find(f => f.id === id);
    if (ids.length === 1 || !base) return frame(id, upd);
    for (const t of ids) {
      const f = S().frames.find(x => x.id === t);
      if (!f) continue;
      const u = { ...upd };
      if (upd.x !== undefined) u.x = f.x + upd.x - base.x;
      if (upd.y !== undefined) u.y = f.y + upd.y - base.y;
      frame(t, u);
    }
  };
  for (const k of ['updateElementSemanticProps', 'updateAutoLayout'] as const) {
    const fn = fns[k] as ((id: string, u: unknown) => void) | undefined;
    if (fn) (out as Record<string, unknown>)[k] = (id: string, u: unknown) => targetsOf(id).forEach(t => fn(t, u));
  }
  return out as T;
};

// One value across the selection: the shared one, or undefined when they differ
// (shown as "Mixed").
export const shared = <V,>(values: V[]): V | undefined =>
  values.every(v => v === values[0]) ? values[0] : undefined;
