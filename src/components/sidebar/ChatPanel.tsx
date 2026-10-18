import React, { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { create } from 'zustand';
import { useProjectStore } from '../../store/useProjectStore';
import { beginTurn, endTurn, useAgent } from '../../lib/agentBridge';

// The Chat tab: ask for screens or changes and watch them appear on the
// canvas. Each turn runs Claude Code on this computer (your own Claude plan,
// no API key) with only the ProtoJam tools - it cannot touch your files.
// One reply is one Ctrl+Z.

type Msg = { role: 'user' | 'assistant'; text: string; steps: string[]; error?: string };

const MODELS = [
  { id: 'fable', label: 'Fable 5.1' },
  { id: 'opus', label: 'Opus 5.5' },
  { id: 'sonnet', label: 'Sonnet 5.5' },
  { id: 'haiku', label: 'Haiku 5.5' },
  { id: 'local', label: 'Local model (coming)', disabled: true },
];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

const saved = (k: string, d: string) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const keep = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private window */ } };

// kept outside the component: switching tabs unmounts the panel
const useChat = create<{ msgs: Msg[]; busy: boolean; model: string; effort: string; session: string | null }>(() => ({
  msgs: [], busy: false, model: saved('pj-chat-model', 'sonnet'), effort: saved('pj-chat-effort', 'medium'),
  session: saved('pj-chat-session', '') || null
}));

// a tool call as a line in the chat
const stepLabel = (name: string, input: any): string => {
  const t = name.replace(/^mcp__protojam__/, '');
  const q = (s?: string) => (s ? ` “${String(s).slice(0, 40)}”` : '');
  switch (t) {
    case 'create_screen': return `Made screen${q(input?.name)}`;
    case 'create_element': return `Added ${input?.type || 'a layer'}${q(input?.text || input?.name)}`;
    case 'update_element': return `Changed${q(input?.name) || ' a layer'}`;
    case 'update_screen': return `Changed screen${q(input?.name)}`;
    case 'delete': return `Deleted ${input?.ids?.length || ''} item${input?.ids?.length === 1 ? '' : 's'}`;
    case 'add_interaction': return 'Linked a prototype step';
    case 'screenshot': return 'Looked at the result';
    case 'get_document': return 'Read the project';
    case 'get_selection': return 'Read your selection';
    case 'list_fonts': return 'Looked through the fonts';
    case 'run_script': return 'Ran a script in the editor';
    case 'select': return 'Selected layers to show you';
    default: return t.replace(/_/g, ' ');
  }
};

const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PJ-Agent': '1' }, body: JSON.stringify(body), signal });

export const ChatPanel: React.FC = () => {
  const { msgs, busy, model, effort, session } = useChat();
  const linked = useAgent(s => s.linked);
  const [draft, setDraft] = useState('');
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs]);

  const patchLast = (f: (m: Msg) => Msg) => useChat.setState(s => ({ msgs: [...s.msgs.slice(0, -1), f(s.msgs[s.msgs.length - 1])] }));

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    // "this" means the selection: say what it is
    const st = useProjectStore.getState();
    const sel = [
      ...st.frames.filter(f => st.selectedFrameIds.includes(f.id)).map(f => `${f.id} (screen "${f.name}")`),
      ...st.elements.filter(e => st.selectedElementIds.includes(e.id)).map(e => `${e.id} (${e.type} "${e.name}")`)
    ];
    const message = sel.length ? `${text}\n\n[Selected in ProtoJam: ${sel.join(', ')}]` : text;
    useChat.setState(s => ({ busy: true, msgs: [...s.msgs, { role: 'user', text, steps: [] }, { role: 'assistant', text: '', steps: [] }] }));
    abort.current = new AbortController();
    beginTurn();
    let streamed = false;
    try {
      const r = await post('/__pj/chat', { message, model, effort, session: useChat.getState().session }, abort.current.signal);
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || `The chat could not start (${r.status}).`);
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: any;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.session_id && ev.session_id !== useChat.getState().session) { useChat.setState({ session: ev.session_id }); keep('pj-chat-session', ev.session_id); }
          if (ev.type === 'stream_event' && ev.event?.type === 'content_block_delta' && ev.event.delta?.type === 'text_delta') {
            streamed = true;
            patchLast(m => ({ ...m, text: m.text + ev.event.delta.text }));
          } else if (ev.type === 'stream_event' && ev.event?.type === 'message_start' && streamed) {
            patchLast(m => (m.text && !m.text.endsWith('\n\n') ? { ...m, text: m.text + '\n\n' } : m));
          } else if (ev.type === 'assistant') {
            for (const c of ev.message?.content || []) {
              if (c.type === 'tool_use') patchLast(m => ({ ...m, steps: [...m.steps, stepLabel(c.name, c.input)] }));
              else if (c.type === 'text' && !streamed) patchLast(m => ({ ...m, text: m.text + c.text }));
            }
          } else if (ev.type === 'result' && ev.is_error) {
            patchLast(m => ({ ...m, error: ev.result || 'Something went wrong.' }));
          } else if (ev.type === 'pj_error') {
            patchLast(m => ({ ...m, error: ev.error }));
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        patchLast(m => ({ ...m, error: e instanceof Error ? e.message : String(e) }));
      else patchLast(m => ({ ...m, error: 'Stopped.' }));
    } finally {
      endTurn();
      useChat.setState({ busy: false });
      abort.current = null;
    }
  };

  const stop = () => { post('/__pj/chat/stop', {}); abort.current?.abort(); };
  const fresh = () => { if (busy) return; useChat.setState({ msgs: [], session: null }); keep('pj-chat-session', null); };
  const setModel = (v: string) => { useChat.setState({ model: v }); keep('pj-chat-model', v); };
  const setEffort = (v: string) => { useChat.setState({ effort: v }); keep('pj-chat-effort', v); };

  const sel = 'bg-[rgba(235,235,236,0.04)] text-[rgb(235,235,236)] px-1.5 py-1 rounded border border-[rgba(235,235,236,0.08)] text-[11px] outline-none';
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 p-2 border-b border-[rgba(235,235,236,0.08)]">
        <span title={linked ? 'Connected to this window' : 'Not connected - run ProtoJam with npm run dev or electron:dev'}
              className={`w-2 h-2 rounded-full shrink-0 ${linked ? 'bg-[#3fb950]' : 'bg-[rgba(235,235,236,0.25)]'}`} />
        <select value={model} onChange={e => setModel(e.target.value)} className={`${sel} flex-1 min-w-0`} title="Model">
          {MODELS.map(m => <option key={m.id} value={m.id} disabled={m.disabled} className="bg-[rgb(20,20,19)]">{m.label}</option>)}
        </select>
        <select value={effort} onChange={e => setEffort(e.target.value)} className={sel} title="Effort: how hard it thinks (higher is slower)">
          {EFFORTS.map(x => <option key={x} value={x} className="bg-[rgb(20,20,19)]">{x}</option>)}
        </select>
        <button onClick={fresh} disabled={busy} title="New chat" className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] disabled:opacity-30">
          <Icons.SquarePen size={13} />
        </button>
      </div>

      <div ref={list} className="flex-1 overflow-y-auto p-2.5 space-y-3 text-xs">
        {!msgs.length && (
          <div className="text-[rgba(235,235,236,0.45)] text-[11px] leading-relaxed space-y-2 p-1">
            <p>Ask for screens or changes, and watch them appear on the canvas.</p>
            <p>“A sign-up flow for Brim: welcome, phone number, code, dashboard.”</p>
            <p>Select something first and “this” means it: “make this more neo-brutalist”.</p>
            <p>A whole reply is one Ctrl+Z. Layers it makes show <Icons.Sparkles size={10} className="inline text-[#31C3F3]" /> until you change them.</p>
          </div>
        )}
        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="ml-6 rounded-lg px-2.5 py-2 bg-[rgba(49,195,243,0.14)] text-[rgb(235,235,236)] whitespace-pre-wrap">{m.text}</div>
        ) : (
          <div key={i} className="space-y-1.5">
            {m.steps.length > 0 && (
              <div className="space-y-0.5">
                {m.steps.map((s, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-[10.5px] text-[rgba(235,235,236,0.5)]">
                    <Icons.Check size={10} className="text-[#3fb950] shrink-0" /><span className="truncate">{s}</span>
                  </div>
                ))}
              </div>
            )}
            {m.text && <div className="text-[rgb(235,235,236)] whitespace-pre-wrap leading-relaxed">{m.text}</div>}
            {m.error && <div className="text-[#ff7b72] text-[11px]">{m.error}</div>}
            {busy && i === msgs.length - 1 && <div className="flex items-center gap-1.5 text-[rgba(235,235,236,0.45)] text-[10.5px]"><Icons.Loader2 size={11} className="animate-spin" /> Working…</div>}
          </div>
        ))}
      </div>

      {/* kept clear of the floating panel button in the bottom-left corner */}
      <div className="p-2 pb-14 border-t border-[rgba(235,235,236,0.08)]">
        <div className="flex items-end gap-1.5 bg-[rgba(235,235,236,0.04)] rounded-lg border border-[rgba(235,235,236,0.1)] p-1.5">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} placeholder={linked ? 'Ask for a screen or a change…' : 'Start ProtoJam with npm run dev to chat'}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="flex-1 bg-transparent resize-none outline-none text-xs text-[rgb(235,235,236)] placeholder:text-[rgba(235,235,236,0.35)] max-h-40" />
          {busy
            ? <button onClick={stop} title="Stop" className="p-1.5 rounded bg-[rgba(235,235,236,0.12)] text-[rgb(235,235,236)]"><Icons.Square size={12} /></button>
            : <button onClick={send} disabled={!draft.trim()} title="Send (Enter)" className="p-1.5 rounded bg-[#31C3F3] text-[rgb(20,20,19)] disabled:opacity-30"><Icons.ArrowUp size={12} /></button>}
        </div>
      </div>
    </div>
  );
};
