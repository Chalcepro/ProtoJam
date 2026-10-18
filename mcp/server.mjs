#!/usr/bin/env node
// ProtoJam's MCP server: lets an AI (Claude Code, the app's own Chat tab, any
// MCP client) read and build designs in the ProtoJam window that is open.
//
// It holds no state. Each tool call goes to the ProtoJam dev server
// (PJ_URL, default http://127.0.0.1:5173), which hands it to the window you
// used last (agent/vitePlugin.ts -> src/lib/agentBridge.ts).
//
//   claude mcp add protojam -s user -- node <repo>/mcp/server.mjs

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = process.env.PJ_URL || 'http://127.0.0.1:5173';

const call = async (tool, args = {}) => {
  let r;
  try {
    r = await fetch(`${BASE}/__pj/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PJ-Agent': '1' },
      body: JSON.stringify({ tool, args })
    });
  } catch {
    throw new Error(`ProtoJam is not running at ${BASE}. Start it with "npm run dev" or "npm run electron:dev".`);
  }
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'ProtoJam refused that.');
  return d.result;
};

const asText = (v) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 1) }] });
const tool = (name, description, shape, fn) =>
  server.registerTool(name, { description, inputSchema: shape }, async (args) => {
    try { return await fn(args); } catch (e) { return { ...asText(String(e.message || e)), isError: true }; }
  });

const server = new McpServer({ name: 'protojam', version: '1.0.0' });

const TYPES = [
  'container (a frame: holds children, can have auto layout)',
  'icon (from the icon library: props.iconName from find_icons; style.iconWeight thin|light|regular|bold|fill|duotone; its colour is style.fillColor; duotone second colour style.iconColor2)', 'rectangle', 'ellipse', 'polygon', 'star', 'line', 'arrow', 'divider',
  'text', 'heading', 'button', 'pillButton', 'iconButton', 'fab', 'textInput', 'passwordInput', 'searchBar', 'textarea',
  'selectDropdown', 'checkbox', 'radioButton', 'toggleSwitch', 'slider', 'datePicker', 'fileDropzone',
  'navbar', 'bottomTabs', 'sidebar', 'breadcrumbs', 'segmentedControl', 'stepper',
  'card', 'modal', 'bottomSheet', 'drawer', 'image', 'video', 'avatar', 'avatarGroup', 'badge', 'chip', 'progressBar',
  'metricCard', 'rating', 'skeleton', 'stickyNote', 'annotation'
];

const RUNS = z.array(z.object({ text: z.string(), fontWeight: z.number().optional(), fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.string().optional(), textColor: z.string().optional(), fontSize: z.number().optional(),
  fontFamily: z.string().optional(), letterSpacing: z.number().optional() })).optional()
  .describe('rich text instead of text: pieces in order, each with only what differs from the layer, e.g. [{text:"Pay "},{text:"N2,000",fontWeight:800,textColor:"#ff3e8a"}]');
const STYLE_HELP = `style: any ProtoJam ElementStyle keys, e.g. fillColor "#ffd23f", textColor, fontFamily "Inter", fontSize, fontWeight 700, fontStyle "italic", textDecoration "underline",
lineHeight, letterSpacing, textAlign, borderRadius (number or {tl,tr,br,bl}), opacity 0-1, rotation,
layoutSizingH / layoutSizingV ("fixed" | "hug" | "fill" inside an auto-layout parent), absolutePosition,
fills [{id,type:"solid"|"linear"|"radial",color,gradient:{angle,stops:[{offset,color}]},opacity,visible:true}],
strokes [{id,color,width,position:"inside"|"center"|"outside",style:"solid",opacity:1,visible:true, sides?:{top,right,bottom,left}, radius?, cap?, paint?, gradient?}],
effects [{id,type:"dropShadow"|"innerShadow"|"layerBlur"|"backgroundBlur"|"extrude",x,y,blur,spread,color,color2,visible:true}].`;

const AUTO = z.object({
  direction: z.enum(['horizontal', 'vertical']).optional(),
  gap: z.number().optional(),
  padding: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }).optional(),
  align: z.enum(['start', 'center', 'end', 'spaceBetween']).optional().describe('along the row / column'),
  alignCross: z.enum(['start', 'center', 'end']).optional(),
  wrap: z.boolean().optional(),
  sizingH: z.enum(['fixed', 'hug']).optional(),
  sizingV: z.enum(['fixed', 'hug']).optional()
}).partial();

tool('status', 'Is ProtoJam open, the project name, how many screens and layers, what is selected.', {}, async () => asText(await call('status')));

tool('get_document', 'The screens and their layer trees (id, type, name, position, size, text, main style). Pass screenId for one screen, full for every style field.',
  { screenId: z.string().optional(), full: z.boolean().optional() },
  async (a) => asText(await call('get_document', a)));

tool('get_selection', 'What the user has selected, with full styles. "This" in a request usually means the selection.', {},
  async () => asText(await call('get_selection')));

tool('create_screen', 'A new screen (artboard). Phone 390x844, tablet 834x1194, desktop 1440x900. Placed to the right of the others unless x/y are given.',
  { name: z.string(), width: z.number().optional(), height: z.number().optional(), x: z.number().optional(), y: z.number().optional(),
    background: z.string().optional(), autoLayout: AUTO.optional() },
  async (a) => asText(await call('create_screen', a)));

tool('update_screen', 'Rename, move, resize or recolour a screen, make it the prototype start, or set its auto layout (false removes it).',
  { id: z.string(), name: z.string().optional(), x: z.number().optional(), y: z.number().optional(), width: z.number().optional(),
    height: z.number().optional(), background: z.string().optional(), start: z.boolean().optional(),
    autoLayout: z.union([AUTO, z.literal(false)]).optional() },
  async (a) => asText(await call('update_screen', a)));

tool('create_element', `A layer inside a screen or a container. x/y are relative to the parent (ignored in an auto-layout parent, which places children in order).
Types: ${TYPES.join(', ')}.
text sets the visible text (headings, text, button labels). ${STYLE_HELP}
autoLayout turns a container into a Figma-style auto layout frame.`,
  { type: z.string(), parentId: z.string().describe('screen id or container id'), x: z.number().optional(), y: z.number().optional(),
    width: z.number().optional(), height: z.number().optional(), name: z.string().optional(), text: z.string().optional(), runs: RUNS,
    style: z.record(z.string(), z.any()).optional(), props: z.record(z.string(), z.any()).optional().describe('component props: placeholder, value, checked, variant, iconName...'),
    autoLayout: AUTO.optional() },
  async (a) => asText(await call('create_element', a)));

tool('update_element', `Change a layer: style (merged into its style), text, props, name, autoLayout (false removes it). ${STYLE_HELP}`,
  { id: z.string(), name: z.string().optional(), text: z.string().optional(), runs: RUNS, style: z.record(z.string(), z.any()).optional(),
    props: z.record(z.string(), z.any()).optional(), autoLayout: z.union([AUTO, z.literal(false)]).optional() },
  async (a) => asText(await call('update_element', a)));

tool('delete', 'Delete screens or layers (a container goes with what is inside it).', { ids: z.array(z.string()) },
  async (a) => asText(await call('delete', a)));

tool('add_interaction', 'A prototype link: when the layer is clicked (or hovered, or after a delay), go to another screen, open it as an overlay, go back, or open a URL.',
  { id: z.string(), to: z.string().optional().describe('target screen id'),
    trigger: z.enum(['onClick', 'onHover', 'onMouseDown', 'onMouseUp', 'afterDelay']).optional(),
    action: z.enum(['navigate', 'openOverlay', 'closeOverlay', 'back', 'scrollTo', 'openUrl', 'toggleState']).optional(),
    transition: z.enum(['instant', 'dissolve', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'pushLeft', 'pushRight']).optional(),
    durationMs: z.number().optional(), delayMs: z.number().optional(), url: z.string().optional() },
  async (a) => asText(await call('add_interaction', a)));

tool('select', 'Select layers in the editor, to show the user what you mean.', { ids: z.array(z.string()) },
  async (a) => asText(await call('select', a)));

tool('screenshot', 'A picture of a screen or layer as it looks now. Check your work with it.', { id: z.string() },
  async (a) => {
    const r = await call('screenshot', a);
    return { content: [{ type: 'image', data: r.image, mimeType: 'image/png' }, { type: 'text', text: `${r.width}x${r.height}` }] };
  });

tool('find_icons', 'Search the bundled icon library (Phosphor, ~1,500 icons, each in thin / light / regular / bold / fill / duotone). Returns icon names for create_element type "icon" (props.iconName).',
  { query: z.string().describe('words, e.g. "home", "water drop", "wallet"'), category: z.string().optional(), limit: z.number().optional() },
  async (a) => {
    const meta = await (await fetch(`${BASE}/icons/meta.json`)).json();
    const words = a.query.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = meta.filter(m => !a.category || m.c.includes(a.category)).map(m => {
      let score = 0;
      for (const w of words) {
        if (m.n === w) score += 10; else if (m.n.split('-').includes(w)) score += 6; else if (m.n.includes(w)) score += 4;
        else if (m.t.some(t => t.includes(w))) score += 2; else return null;
      }
      return { n: m.n, score };
    }).filter(Boolean).sort((x, y) => y.score - x.score).slice(0, a.limit || 30);
    return asText(hits.length ? hits.map(h => h.n).join(', ') : 'No icon matches; try other words.');
  });

tool('list_fonts', 'Font families bundled with ProtoJam (they work offline), optionally filtered by category: sans, serif, display, handwriting, mono.',
  { category: z.string().optional() },
  async (a) => {
    const r = await fetch(`${BASE}/fonts/manifest.json`);
    const list = (await r.json()).filter(f => !a.category || f.category === a.category);
    return asText(list.map(f => `${f.family} (${f.category}; ${f.files.map(x => x.weight).join(',')})`).join('\n'));
  });

tool('run_script', 'Last resort for what no other tool does: JavaScript run in the editor with the project store as `pj` (pj.getState() has every editor action). Return a value to see it.',
  { code: z.string() },
  async (a) => asText((await call('run_script', a)) ?? 'done'));

await server.connect(new StdioServerTransport());
