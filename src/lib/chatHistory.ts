import { create } from 'zustand';

// The Chat tab's memory, on this computer (local storage):
// - every conversation, per project - its messages and its Claude Code
//   session, so reopening one carries on where it left off;
// - each project's brief - notes the AI gets with every message (brand,
//   colours, fonts, audience...), so they are never typed twice.

export type Msg = { role: 'user' | 'assistant'; text: string; steps: string[]; error?: string };
export type Chat = {
  id: string; projectId: string; title: string; model: string; effort: string;
  session: string | null; msgs: Msg[]; created: number; updated: number;
};

const KEY = 'pj-chats', MAX = 60;
const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } };

export const useChats = create<{ chats: Chat[] }>(() => ({ chats: read<Chat[]>(KEY, []) }));
const persist = (chats: Chat[]) => {
  // the newest are kept when there are too many
  const kept = [...chats].sort((a, b) => b.updated - a.updated).slice(0, MAX);
  useChats.setState({ chats: kept });
  write(KEY, kept);
};

export const saveChat = (c: Chat) => persist([c, ...useChats.getState().chats.filter(x => x.id !== c.id)]);
export const removeChat = (id: string) => persist(useChats.getState().chats.filter(x => x.id !== id));
export const renameChat = (id: string, title: string) => {
  const c = useChats.getState().chats.find(x => x.id === id);
  if (c) saveChat({ ...c, title: title.trim() || c.title });
};
export const newChatId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// which chat was last open in a project
export const openChatOf = (projectId: string) => read<string | null>(`pj-chat-open:${projectId}`, null);
export const setOpenChat = (projectId: string, id: string | null) => write(`pj-chat-open:${projectId}`, id);

export const useBriefs = create<{ briefs: Record<string, string> }>(() => ({ briefs: read<Record<string, string>>('pj-briefs', {}) }));
export const setBrief = (projectId: string, text: string) => {
  const briefs = { ...useBriefs.getState().briefs, [projectId]: text };
  useBriefs.setState({ briefs });
  write('pj-briefs', briefs);
};

export const ago = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });
};
