import { create } from 'zustand';

// Skills in the Chat tab. Point at a skill (a SKILL.md, a skill's folder, or a
// folder of skills) with "/skill <path>": the first time turns it on, the
// second time off. While on, its instructions go with every message (see
// agent/skills.ts), and "/<name> ..." asks for it by name.

export interface SkillRef { path: string; names: { name: string; description: string }[] }

const KEY = 'pj-chat-skills';
const read = (): SkillRef[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const useSkills = create<{ on: SkillRef[] }>(() => ({ on: read() }));
const save = (on: SkillRef[]) => {
  useSkills.setState({ on });
  try { localStorage.setItem(KEY, JSON.stringify(on)); } catch { /* private window */ }
};

const bare = (p: string) => p.trim().replace(/^["']|["']$/g, '');
const same = (a: string, b: string) => {
  const n = (p: string) => bare(p).replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
  return n(a) === n(b);
};
export const label = (s: SkillRef) => s.names.map(n => n.name).join(', ');

export const toggleSkill = async (path: string): Promise<string> => {
  const at = bare(path);
  const on = useSkills.getState().on;
  const had = on.find(s => same(s.path, at));
  if (had) { save(on.filter(s => s !== had)); return `Skill off: ${label(had)}.`; }
  const r = await fetch('/__pj/skills/scan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PJ-Agent': '1' }, body: JSON.stringify({ path: at }) });
  const found = await r.json();
  if (!r.ok) throw new Error(found.error || 'That skill could not be read.');
  const ref: SkillRef = { path: at, names: found.map(({ name, description }: { name: string; description: string }) => ({ name, description })) };
  save([...on, ref]);
  return `Skill on: ${label(ref)}. The AI follows it from now on; type /${ref.names[0].name} to ask for it by name. Point at the same path again to turn it off.`;
};

export const turnOff = (ref: SkillRef) => save(useSkills.getState().on.filter(s => s !== ref));

export const skillsList = () => {
  const on = useSkills.getState().on;
  return on.length
    ? `Skills on:\n${on.map(s => s.names.map(n => `/${n.name} - ${n.description || '(no description)'}`).join('\n')).join('\n')}\n\nTurn one off: /skill <the same path> again, or the x on its chip.`
    : 'No skills on. Turn one on with /skill <path to a SKILL.md, its folder, or a folder of skills>.';
};

// ---- Word correction: the system's own spellchecker, on this computer ------
type Spell = { misspelled: (w: string) => boolean; suggestions: (w: string) => string[] };
export const spell = (): Spell | null => (window as unknown as { electronAPI?: { spell?: Spell } }).electronAPI?.spell ?? null;

const matchCase = (orig: string, fix: string) =>
  orig === orig.toUpperCase() && orig.length > 1 ? fix.toUpperCase()
    : orig[0] === orig[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;

// One word, corrected if the spellchecker is sure of nothing better than its
// first suggestion. Paths, commands, numbers, names with dots are left alone.
export const correctWord = (w: string) => {
  const sp = spell();
  if (!sp || w.length < 3 || !/^[A-Za-z']+$/.test(w) || !sp.misspelled(w)) return w;
  const s = sp.suggestions(w)[0];
  return s ? matchCase(w, s) : w;
};

export const correctText = (t: string) =>
  t.split(/(\s+)/).map(tok => /^[A-Za-z']+[.,!?;:]?$/.test(tok) ? tok.replace(/^[A-Za-z']+/, correctWord) : tok).join('');
