import React, { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { create } from 'zustand';
import { useProjectStore } from '../../store/useProjectStore';
import { beginTurn, endTurn, useAgent } from '../../lib/agentBridge';
import { ago, newChatId, openChatOf, removeChat, renameChat, saveChat, setBrief, setOpenChat, useBriefs, useChats, type Chat, type Msg } from '../../lib/chatHistory';

// The Chat tab: ask for screens or changes and watch them appear on the
// canvas. Each turn runs Claude Code on this computer (your own Claude plan,
// no API key) with only the ProtoJam tools - it cannot touch your files.
// One reply is one Ctrl+Z. Every chat is kept (History), and the project's
// Brief goes with every message, so nothing has to be typed twice.

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
type View = 'chat' | 'history' | 'brief';
const useChat = create<{ msgs: Msg[]; busy: boolean; model: string; effort: string; session: string | null; chatId: string | null; view: View }>(() => ({
  msgs: [], busy: false, model: saved('pj-chat-model', 'sonnet'), effort: saved('pj-chat-effort', 'medium'),
  session: null, chatId: null, view: 'chat'
}));
const projectId = () => useProjectStore.getState().projectId;

// Open a chat: its messages back on screen, its Claude session carried on.
const openChat = (c: Chat | null) => {
  useChat.setState(c
    ? { chatId: c.id, msgs: c.msgs, session: c.session, model: c.model, effort: c.effort, view: 'chat' }
    : { chatId: null, msgs: [], session: null, view: 'chat' });
  setOpenChat(projectId(), c?.id ?? null);
};
// the chat last open in this project comes back on start, and when the project changes
const restore = () => openChat(useChats.getState().chats.find(c => c.id === openChatOf(projectId())) ?? null);
restore();
useProjectStore.subscribe((s, p) => { if (s.projectId !== p.projectId && !useChat.getState().busy) restore(); });

// every change to the open chat is saved (a moment after it settles)
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useChat.subscribe((s, p) => {
  if (!s.chatId || (s.msgs === p.msgs && s.session === p.session)) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = useChat.getState();
    const old = useChats.getState().chats.find(c => c.id === st.chatId);
    if (!st.chatId) return;
    saveChat({
      id: st.chatId, projectId: old?.projectId ?? projectId(), created: old?.created ?? Date.now(), updated: Date.now(),
      title: old?.title ?? (st.msgs.find(m => m.role === 'user')?.text.slice(0, 60) || 'New chat'),
      model: st.model, effort: st.effort, session: st.session, msgs: st.msgs
    });
  }, 300);
});

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

// The little markdown replies use: **bold** and `code`.
const md = (t: string) => t.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, i) =>
  part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <b key={i}>{part.slice(2, -2)}</b>
    : part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i} className="px-1 rounded bg-[rgba(235,235,236,0.1)] font-mono text-[10.5px]">{part.slice(1, -1)}</code>
      : part);

const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PJ-Agent': '1' }, body: JSON.stringify(body), signal });

export const ChatPanel: React.FC = () => {
  const { msgs, busy, model, effort, view, chatId } = useChat();
  const pid = useProjectStore(s => s.projectId);
  const brief = useBriefs(s => s.briefs[pid] || '');
  const setView = (v: View) => useChat.setState({ view: view === v ? 'chat' : v });
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
    if (!useChat.getState().chatId) { const id = newChatId(); useChat.setState({ chatId: id }); setOpenChat(projectId(), id); }
    useChat.setState(s => ({ busy: true, msgs: [...s.msgs, { role: 'user', text, steps: [] }, { role: 'assistant', text: '', steps: [] }] }));
    abort.current = new AbortController();
    beginTurn();
    let streamed = false;
    try {
      const brief = useBriefs.getState().briefs[projectId()] || '';
      const r = await post('/__pj/chat', { message, model, effort, session: useChat.getState().session, brief }, abort.current.signal);
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
          if (ev.session_id && ev.session_id !== useChat.getState().session) useChat.setState({ session: ev.session_id });
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
  const fresh = () => { if (!busy) openChat(null); };
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
        <button onClick={() => setView('brief')} title="Project brief: what the AI always knows about this project"
                className={`relative p-1 rounded hover:bg-[rgba(235,235,236,0.08)] ${view === 'brief' ? 'text-[#31C3F3]' : 'text-[rgba(235,235,236,0.6)]'}`}>
          <Icons.NotebookPen size={13} />
          {brief.trim() && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#31C3F3]" />}
        </button>
        <button onClick={() => setView('history')} title="History: earlier chats"
                className={`p-1 rounded hover:bg-[rgba(235,235,236,0.08)] ${view === 'history' ? 'text-[#31C3F3]' : 'text-[rgba(235,235,236,0.6)]'}`}>
          <Icons.History size={13} />
        </button>
        <button onClick={fresh} disabled={busy} title="New chat" className="p-1 rounded hover:bg-[rgba(235,235,236,0.08)] text-[rgba(235,235,236,0.6)] disabled:opacity-30">
          <Icons.SquarePen size={13} />
        </button>
      </div>

      {view === 'history' && <HistoryView current={chatId} busy={busy} />}
      {view === 'brief' && <BriefView projectId={pid} />}

      <div ref={list} className={`flex-1 overflow-y-auto p-2.5 space-y-3 text-xs ${view === 'chat' ? '' : 'hidden'}`}>
        {!msgs.length && (
          <div className="text-[rgba(235,235,236,0.45)] text-[11px] leading-relaxed space-y-2 p-1">
            <p>Ask for screens or changes, and watch them appear on the canvas.</p>
            <p>“A sign-up flow for Brim: welcome, phone number, code, dashboard.”</p>
            <p>Select something first and “this” means it: “make this more neo-brutalist”.</p>
            <p>{brief.trim() ? 'Your project brief goes with every message.' : 'Put what the AI should always know (brand, colours, fonts) in the Brief, top right.'}</p>
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
            {m.text && <div className="text-[rgb(235,235,236)] whitespace-pre-wrap leading-relaxed">{md(m.text)}</div>}
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

// Earlier chats: this project's first, then the rest. Click to open (the AI
// carries on from where it was); rename and delete on each.
const HistoryView: React.FC<{ current: string | null; busy: boolean }> = ({ current, busy }) => {
  const chats = useChats(s => s.chats);
  const pid = useProjectStore(s => s.projectId);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const mine = chats.filter(c => c.projectId === pid), other = chats.filter(c => c.projectId !== pid);
  // chats Claude Code kept that are not in History yet (from before it existed)
  useEffect(() => {
    fetch('/__pj/chat/sessions', { headers: { 'X-PJ-Agent': '1' } }).then(r => (r.ok ? r.json() : []))
      .then((found: { session: string; updated: number; msgs: Msg[] }[]) => {
        const known = new Set(useChats.getState().chats.map(c => c.session));
        for (const f of found) if (!known.has(f.session)) saveChat({
          id: newChatId(), projectId: pid, session: f.session, msgs: f.msgs, model: 'sonnet', effort: 'medium',
          title: f.msgs.find(m => m.role === 'user')?.text.slice(0, 60) || 'Earlier chat', created: f.updated, updated: f.updated
        });
      }).catch(() => { /* no dev server: nothing to find */ });
  }, [pid]);
  const row = (c: Chat) => (
    <div key={c.id} className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${c.id === current ? 'bg-[rgba(49,195,243,0.14)]' : 'hover:bg-[rgba(235,235,236,0.06)]'}`}>
      {editing === c.id ? (
        <input autoFocus defaultValue={c.title} onBlur={e => { renameChat(c.id, e.target.value); setEditing(null); }}
               onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
               className="flex-1 min-w-0 bg-[rgba(235,235,236,0.08)] rounded px-1 outline-none text-[rgb(235,235,236)]" />
      ) : (
        <button disabled={busy} onClick={() => openChat(c)} className="flex-1 min-w-0 text-left disabled:opacity-50">
          <div className="truncate text-[rgb(235,235,236)]">{c.title}</div>
          <div className="text-[10px] text-[rgba(235,235,236,0.4)]">{ago(c.updated)} · {c.msgs.filter(m => m.role === 'user').length} messages · {c.model}</div>
        </button>
      )}
      <button onClick={() => setEditing(c.id)} title="Rename" className="opacity-0 group-hover:opacity-100 p-0.5 text-[rgba(235,235,236,0.5)] hover:text-[rgb(235,235,236)]"><Icons.Pencil size={11} /></button>
      {confirm === c.id ? (
        <button onClick={() => { removeChat(c.id); setConfirm(null); if (c.id === current) openChat(null); }}
                className="px-1.5 py-0.5 rounded bg-[#c0392b] text-white text-[10px] font-bold">Delete</button>
      ) : (
        <button onClick={() => setConfirm(c.id)} title="Delete" className="opacity-0 group-hover:opacity-100 p-0.5 text-[rgba(235,235,236,0.5)] hover:text-[#ff7b72]"><Icons.Trash2 size={11} /></button>
      )}
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto p-2 text-xs space-y-1" onMouseLeave={() => setConfirm(null)}>
      {!chats.length && <p className="text-[rgba(235,235,236,0.45)] p-2">No chats yet. Every chat is kept here.</p>}
      {mine.map(row)}
      {other.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-[rgba(235,235,236,0.4)] px-2">Other projects ({other.length})</summary>
          <div className="mt-1 space-y-1">{other.map(row)}</div>
        </details>
      )}
    </div>
  );
};

// What the AI always knows about this project, sent with every message.
const BriefView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const brief = useBriefs(s => s.briefs[projectId] || '');
  const name = useProjectStore(s => s.projectName);
  return (
    <div className="flex-1 flex flex-col p-2.5 gap-2 text-xs">
      <div className="text-[rgba(235,235,236,0.55)] leading-relaxed">
        The brief for <b className="text-[rgb(235,235,236)]">{name}</b>: the AI gets it with every message, in every chat of this project. Saved as you type.
      </div>
      <textarea value={brief} onChange={e => setBrief(projectId, e.target.value)}
                placeholder={'e.g.\nBrim - a water-billing app for Nigerian estates.\nColours: deep teal #165c74, sky blue #31c3f3, cream #f4efe6.\nFont: Inter; headings 800.\nPeople: residents of all ages, many not used to apps - big, clear, few words.\nIcons: Phosphor, fill style.'}
                className="flex-1 min-h-48 resize-none bg-[rgba(235,235,236,0.04)] rounded-lg border border-[rgba(235,235,236,0.1)] p-2 outline-none text-[rgb(235,235,236)] placeholder:text-[rgba(235,235,236,0.3)] leading-relaxed" />
      <div className="text-[10px] text-[rgba(235,235,236,0.35)] text-right">{brief.length} / 8000</div>
    </div>
  );
};
