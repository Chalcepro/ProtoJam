import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

// The dev server's side of the AI link (see src/lib/agentBridge.ts).
//
//   POST /__pj/tool  {tool, args}   run one tool in the ProtoJam window last used
//   POST /__pj/chat  {message, model, effort, session}
//                                   one Chat-tab turn: Claude Code, headless, with
//                                   only the ProtoJam tools; its events stream back
//   GET  /__pj/status
//
// Only this computer may call these: the dev server also listens on the
// network (host: true), and a web page in a browser could otherwise post here.

type Client = { send: (event: string, payload?: unknown) => void };
const ROOT = resolve(process.cwd());          // npm scripts run from the repo

const claudeExe = () => {
  if (process.env.PJ_CLAUDE) return process.env.PJ_CLAUDE;
  const npmExe = join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  return existsSync(npmExe) ? npmExe : 'claude';
};

const SYSTEM = `You are the design assistant inside ProtoJam, a Figma-like prototyping app. You change the open project only through the protojam tools.
- Start by reading what is there (get_document, get_selection). If the user has something selected, "this" means the selection.
- Build real, complete screens: a screen (create_screen, 390x844 for a phone unless asked), then frames/containers with auto layout for structure, then text, buttons, inputs, images. Positions are relative to the parent.
- Text content goes in "text". Styles are ProtoJam ElementStyle keys (fillColor, textColor, fontSize, fontWeight, fontFamily, borderRadius, padding via autoLayout, strokes, effects including {type:"extrude", x, y, color, color2} for solid 3D blocks).
- Link screens for the prototype with add_interaction.
- After building, take a screenshot of each screen you made and fix what looks wrong before you answer.
- Answer in a few short sentences: what you made, and anything you were unsure about. No long lists.`;

const loopback = (req: IncomingMessage) => {
  const ip = req.socket.remoteAddress || '';
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return false;
  // a browser page from another site sends its Origin; only ProtoJam's own may
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return false;
  return req.headers['x-pj-agent'] === '1';
};

const body = (req: IncomingMessage) => new Promise<any>((ok, bad) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 5e6) req.destroy(); });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
});

const json = (res: ServerResponse, code: number, data: unknown) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

export const protojamAgent = (): Plugin => ({
  name: 'protojam-agent',
  apply: 'serve',
  configureServer(server: ViteDevServer) {
    // windows in the order they were last used; only live ones count (a
    // reload leaves its old connection behind)
    let order: Client[] = [];
    const live = (c: Client) => (server.ws as unknown as { clients: Set<unknown> }).clients.has(c);
    const touch = (c: Client) => { order = [...order.filter(x => x !== c && live(x)), c]; };
    const target = () => [...order].reverse().find(live) || null;
    const waiting = new Map<string, (r: any) => void>();
    let seq = 0;

    server.ws.on('pj:hello', (d: { focused?: boolean }, client: Client) => {
      if (d?.focused || !target()) touch(client);
      else order = [client, ...order.filter(x => x !== client && live(x))];   // known, but not the one in use
      client.send('pj:linked', { linked: true });
    });
    server.ws.on('pj:focus', (_d: unknown, client: Client) => touch(client));
    server.ws.on('pj:result', (d: { id: string }) => { waiting.get(d.id)?.(d); waiting.delete(d.id); });

    const runTool = (tool: string, args: unknown) => new Promise<any>((ok) => {
      const to = target();
      if (!to) return ok({ ok: false, error: 'ProtoJam is not open. Start it (npm run dev or electron:dev) and open the editor.' });
      const id = `c${++seq}`;
      const timer = setTimeout(() => { waiting.delete(id); ok({ ok: false, error: 'ProtoJam did not answer in time.' }); }, 60000);
      waiting.set(id, (r) => { clearTimeout(timer); ok(r); });
      try { to.send('pj:cmd', { id, tool, args }); }
      catch { order = order.filter(x => x !== to); clearTimeout(timer); waiting.delete(id); ok({ ok: false, error: 'Lost the ProtoJam window; click into it and try again.' }); }
    });

    // The MCP server Claude Code starts for the Chat tab: this repo's, aimed here.
    const port = () => (server.httpServer?.address() as { port?: number } | null)?.port || 5173;
    const mcpConfig = () => {
      const file = join(tmpdir(), 'protojam-mcp.json');
      writeFileSync(file, JSON.stringify({ mcpServers: { protojam: {
        command: process.execPath, args: [join(ROOT, 'mcp', 'server.mjs')], env: { PJ_URL: `http://127.0.0.1:${port()}` }
      } } }));
      return file;
    };

    const MODELS = new Set(['fable', 'opus', 'sonnet', 'haiku']);
    const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
    let chat: ChildProcess | null = null;

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__pj/')) return next();
      if (!loopback(req)) return json(res, 403, { error: 'Only ProtoJam on this computer may use this.' });
      try {
        if (req.url === '/__pj/status') return json(res, 200, { pages: order.filter(live).length, claude: claudeExe() });

        if (req.url === '/__pj/tool' && req.method === 'POST') {
          const { tool, args } = await body(req);
          return json(res, 200, await runTool(String(tool), args || {}));
        }

        if (req.url === '/__pj/chat/stop' && req.method === 'POST') {
          chat?.kill();
          return json(res, 200, { stopped: true });
        }

        if (req.url === '/__pj/chat' && req.method === 'POST') {
          const { message, model, effort, session } = await body(req);
          const args = ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
            '--model', MODELS.has(model) ? model : 'sonnet', '--effort', EFFORTS.has(effort) ? effort : 'medium',
            '--tools', '',                                     // no files, no shell: ProtoJam only
            '--mcp-config', mcpConfig(), '--strict-mcp-config',
            '--allowedTools', 'mcp__protojam', '--permission-mode', 'dontAsk',
            '--append-system-prompt', SYSTEM];
          if (typeof session === 'string' && /^[\w-]{8,}$/.test(session)) args.push('--resume', session);
          chat?.kill();
          const child = spawn(claudeExe(), args, { cwd: ROOT, windowsHide: true });
          chat = child;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.setHeader('Cache-Control', 'no-cache');
          child.stdout.on('data', (b) => res.write(b));
          let err = '';
          child.stderr.on('data', (b) => { err += b; });
          child.on('error', (e) => { res.write(JSON.stringify({ type: 'pj_error', error: `Could not start Claude Code: ${e.message}` }) + '\n'); res.end(); });
          child.on('close', (code) => {
            if (code && err.trim()) res.write(JSON.stringify({ type: 'pj_error', error: err.trim().slice(-600) }) + '\n');
            if (chat === child) chat = null;
            res.end();
          });
          // the prompt goes in on stdin: no quoting, any length
          child.stdin.end(String(message || ''));
          // the page went away mid-reply (or pressed Stop): end the run
          res.on('close', () => { if (!res.writableEnded) child.kill(); });
          return;
        }
        json(res, 404, { error: 'No such endpoint' });
      } catch (e) {
        json(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
    });
  }
});
