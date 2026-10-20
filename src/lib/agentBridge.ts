import { create } from 'zustand';
import { toPng } from 'html-to-image';
import { fontCssFor } from './exportImage';
import { useProjectStore, holdHistory } from '../store/useProjectStore';
import type { AutoLayoutSettings, DeviceFrame, ElementStyle, UIElement } from '../types/components';
import type { PrototypeInteraction } from '../types/prototype';

// The page end of the AI link. The dev server (vite.config.ts, agentServer)
// passes on tool calls from the ProtoJam MCP server - used by the Chat tab
// and by any MCP client, such as Claude Code in a terminal - and this carries
// them out on the open project, in whichever ProtoJam window was used last.

type Cmd = { id: string; tool: string; args: Record<string, any> };

// Layers the AI made, marked in the Layers panel until you change them.
export const useAgent = create<{ aiMade: Record<string, true>; linked: boolean }>(() => ({ aiMade: {}, linked: false }));

let agentWriting = false;
const S = () => useProjectStore.getState();

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const text = (e: UIElement) => e.semanticProps?.label;

// A layer as the AI reads it: what it is, where, its main look, and what is in it.
const brief = (e: UIElement, all: UIElement[], full: boolean): Record<string, unknown> => {
  const s = e.style;
  const out: Record<string, unknown> = {
    id: e.id, name: e.name, type: e.type,
    x: s.x, y: s.y, width: s.width, height: s.height,
  };
  if (text(e)) out.text = text(e);
  if (full) out.style = s;
  else {
    const keep: (keyof ElementStyle)[] = ['fillColor', 'textColor', 'fontSize', 'fontWeight', 'fontFamily', 'borderRadius',
      'borderWidth', 'borderColor', 'opacity', 'rotation', 'layoutSizingH', 'layoutSizingV', 'absolutePosition'];
    const st: Record<string, unknown> = {};
    for (const k of keep) if (s[k] !== undefined) st[k] = s[k];
    if (s.autoLayout?.enabled) st.autoLayout = s.autoLayout;
    if (s.fills) st.fills = s.fills.length;
    if (s.strokes) st.strokes = s.strokes.length;
    if (s.effects?.length) st.effects = s.effects.map(x => x.type);
    out.style = st;
  }
  if (e.hidden) out.hidden = true;
  if (e.interactions?.length) out.interactions = e.interactions.map(i => ({ trigger: i.trigger, action: i.action, to: i.targetFrameId }));
  const kids = all.filter(c => c.parentId === e.id);
  if (kids.length) out.children = kids.map(c => brief(c, all, full));
  return out;
};

const frameBrief = (f: DeviceFrame, all: UIElement[], full: boolean) => ({
  id: f.id, name: f.name, kind: 'screen', x: f.x, y: f.y, width: f.width, height: f.height,
  background: f.backgroundColor, ...(f.autoLayout?.enabled ? { autoLayout: f.autoLayout } : {}),
  ...(f.isStartingFrame ? { start: true } : {}),
  children: all.filter(e => e.parentId === f.id).map(e => brief(e, all, full))
});

const findFrame = (id: string) => S().frames.find(f => f.id === id);
const findEl = (id: string) => S().elements.find(e => e.id === id);
const need = <T,>(v: T | undefined, what: string): T => { if (v === undefined || v === null) throw new Error(`No ${what}`); return v; };

const applyLook = (id: string, a: Record<string, any>) => {
  const st = S();
  if (a.style) st.updateElementStyle(id, a.style);
  if (a.text !== undefined) st.updateElementSemanticProps(id, { label: String(a.text) });
  if (a.props) st.updateElementSemanticProps(id, a.props);
  // rich text: the plain label is always the pieces joined
  if (Array.isArray(a.runs)) st.updateElementSemanticProps(id, { label: a.runs.map((r: { text: string }) => r.text).join(''), runs: a.runs });
  if (a.name) st.updateElement(id, { name: String(a.name) });
  if (a.autoLayout) applyAutoLayout(id, a.autoLayout);
};

const applyAutoLayout = (id: string, al: Partial<AutoLayoutSettings> | false) => {
  const st = S();
  const on = findFrame(id)?.autoLayout?.enabled ?? findEl(id)?.style.autoLayout?.enabled ?? false;
  if (al === false) { if (on) st.toggleAutoLayout(id); return; }
  if (!on) st.toggleAutoLayout(id);
  st.updateAutoLayout(id, al);
};

// Where a new screen goes: to the right of everything there is.
const nextScreenX = () => {
  const fs = S().frames;
  return fs.length ? Math.max(...fs.map(f => f.x + f.width)) + 120 : 0;
};

const nodeFor = (id: string) =>
  document.querySelector<HTMLElement>(`[data-frame-body="${id}"]`) || document.querySelector<HTMLElement>(`[data-el-id="${id}"]`);

const TOOLS: Record<string, (a: Record<string, any>) => unknown | Promise<unknown>> = {
  status: () => {
    const st = S();
    return { project: st.projectName, screens: st.frames.length, layers: st.elements.length,
             selection: [...st.selectedFrameIds, ...st.selectedElementIds] };
  },

  get_document: (a) => {
    const st = S();
    const frames = a.screenId ? [need(findFrame(a.screenId), 'screen ' + a.screenId)] : st.frames;
    return { project: st.projectName, screens: frames.map(f => frameBrief(f, st.elements, !!a.full)) };
  },

  get_selection: () => {
    const st = S();
    return {
      screens: st.frames.filter(f => st.selectedFrameIds.includes(f.id)).map(f => frameBrief(f, st.elements, true)),
      layers: st.elements.filter(e => st.selectedElementIds.includes(e.id)).map(e => brief(e, st.elements, true))
    };
  },

  create_screen: (a) => {
    const st = S();
    const id = st.addCustomFrame(a.x ?? nextScreenX(), a.y ?? 0, num(a.width) || 390, num(a.height) || 844, a.name || 'Screen');
    st.updateFrame(id, { backgroundColor: a.background || '#ffffff', collapsed: false });
    // a phone screen keeps its size with auto layout unless asked to hug
    if (a.autoLayout) applyAutoLayout(id, { sizingH: 'fixed', sizingV: 'fixed', ...a.autoLayout });
    return { id };
  },

  update_screen: (a) => {
    const f = need(findFrame(a.id), 'screen ' + a.id);
    const st = S();
    const upd: Partial<DeviceFrame> = {};
    for (const k of ['name', 'x', 'y', 'width', 'height'] as const) if (a[k] !== undefined) (upd as any)[k] = a[k];
    if (a.background) upd.backgroundColor = a.background;
    if (a.start) st.setStartingFrame(f.id);
    st.updateFrame(f.id, upd);
    if (a.autoLayout !== undefined) applyAutoLayout(f.id, a.autoLayout);
    return { id: f.id };
  },

  create_element: (a) => {
    const st = S();
    const parent = need(a.parentId, 'parentId (a screen or a frame/container id)');
    if (!findFrame(parent) && !findEl(parent)) throw new Error('No screen or layer ' + parent);
    const id = st.createShapeAt(a.type, num(a.x), num(a.y), num(a.width) || 100, num(a.height) || 40, parent);
    // text hugs its words unless given a size: no width = auto, a width only = grows down
    if ((a.type === 'text' || a.type === 'heading') && !a.style?.textResize)
      st.updateElementStyle(id, { textResize: !num(a.width) ? 'auto' : !num(a.height) ? 'autoHeight' : 'fixed' });
    applyLook(id, a);
    useAgent.setState(s => ({ aiMade: { ...s.aiMade, [id]: true } }));
    return { id };
  },

  update_element: (a) => {
    need(findEl(a.id), 'layer ' + a.id);
    applyLook(a.id, a);
    return { id: a.id };
  },

  delete: (a) => {
    const st = S();
    for (const id of a.ids || []) {
      if (findFrame(id)) st.deleteFrame(id);
      else if (findEl(id)) st.deleteElement(id);
    }
    return { deleted: (a.ids || []).length };
  },

  add_interaction: (a) => {
    need(findEl(a.id), 'layer ' + a.id);
    const it: PrototypeInteraction = {
      id: `ix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trigger: a.trigger || 'onClick', action: a.action || 'navigate', targetFrameId: a.to,
      transition: a.transition || 'slideLeft', durationMs: a.durationMs ?? 300, easing: 'ease-in-out',
      ...(a.delayMs ? { delayMs: a.delayMs } : {}), ...(a.url ? { url: a.url } : {})
    };
    S().addInteraction(a.id, it);
    return { id: it.id };
  },

  select: (a) => {
    const st = S();
    const ids: string[] = a.ids || [];
    st.setSelection(ids.filter(i => findEl(i)));
    return { selected: ids };
  },

  // A picture of a screen or layer, so the AI can see what it made.
  screenshot: async (a) => {
    const node = nodeFor(need(a.id, 'id'));
    if (!node) throw new Error('Not on the canvas: ' + a.id);
    const w = node.offsetWidth, h = node.offsetHeight;
    const ratio = Math.min(2, 1200 / Math.max(w, h, 1));
    // the picture is of the thing itself, not of where it sits on the canvas
    const png = await toPng(node, { pixelRatio: ratio, fontEmbedCSS: await fontCssFor(node), style: { left: '0', top: '0', margin: '0' },
                                    filter: n => !(n instanceof HTMLElement && 'exportSkip' in n.dataset) });
    return { image: png.split(',')[1], width: Math.round(w * ratio), height: Math.round(h * ratio) };
  },

  // Anything the other tools cannot do: JavaScript with the project store as
  // `pj` (its getState() has every action the editor uses).
  run_script: (a) => {
    const fn = new Function('pj', `"use strict"; return (async () => { ${a.code} })();`);
    return fn(useProjectStore);
  },
};

// The whole of one AI reply undoes as one step.
export const beginTurn = () => holdHistory(true);
export const endTurn = () => holdHistory(false);

const run = async (c: Cmd) => {
  const tool = TOOLS[c.tool];
  if (!tool) throw new Error(`Unknown tool ${c.tool}`);
  const st = S();
  const keep = { el: st.selectedElementIds, fr: st.selectedFrameIds };
  agentWriting = true;
  try {
    return await tool(c.args || {});
  } finally {
    agentWriting = false;
    // creating selects the new layer; the AI should not move your selection
    if (c.tool !== 'select') useProjectStore.setState({ selectedElementIds: keep.el.filter(i => findEl(i)), selectedFrameIds: keep.fr.filter(i => findFrame(i)) });
  }
};

if (import.meta.hot) {
  const hot = import.meta.hot;
  const hello = () => hot.send('pj:hello', { focused: document.hasFocus(), electron: navigator.userAgent.includes('Electron') });
  hello();
  window.addEventListener('focus', () => hot.send('pj:focus', {}));
  hot.on('vite:ws:connect', hello);
  hot.on('pj:linked', (d: { linked: boolean }) => useAgent.setState({ linked: d.linked }));
  hot.on('pj:cmd', async (c: Cmd) => {
    try {
      hot.send('pj:result', { id: c.id, ok: true, result: await run(c) });
    } catch (e) {
      hot.send('pj:result', { id: c.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  // A layer the AI made loses its marker once you change it.
  useProjectStore.subscribe((s, prev) => {
    if (agentWriting || s.elements === prev.elements) return;
    const marks = useAgent.getState().aiMade;
    if (!Object.keys(marks).length) return;
    const before = new Map(prev.elements.map(e => [e.id, e]));
    let changed = false;
    const next = { ...marks };
    for (const e of s.elements) {
      if (marks[e.id] && before.get(e.id) !== e && s.selectedElementIds.includes(e.id)) { delete next[e.id]; changed = true; }
    }
    for (const id of Object.keys(next)) if (!s.elements.some(e => e.id === id)) { delete next[id]; changed = true; }
    if (changed) useAgent.setState({ aiMade: next });
  });
}
