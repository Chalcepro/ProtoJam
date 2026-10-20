import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

// Skills for the Chat tab: instruction files (Claude's SKILL.md format: a
// "---" header with name and description, then the instructions) that the
// designer points the chat at. A path can be one file, a skill's folder, or a
// folder of skills. While a skill is on, the AI is given its instructions with
// every message and may read the other files in its folder.

export interface Skill { name: string; description: string; file: string; dir: string; body: string }

const MAX_BODY = 30000;          // per skill, so one huge file can't crowd out the rest
const BUDGET = 40000;            // all skills' text in one message; past it, the AI reads them as needed
const MAX_DEPTH = 3;

const header = (text: string) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fields: Record<string, string> = {};
  if (m) {
    const lines = m[1].split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const kv = lines[i].match(/^(\w[\w-]*):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      // "key: >" or "key: |": the value is the indented lines after it
      if (/^[>|][-+]?$/.test(v)) {
        const more: string[] = [];
        while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) more.push(lines[++i].trim());
        v = more.join(' ');
      }
      fields[kv[1].toLowerCase()] = v.replace(/^["']|["']$/g, '').trim();
    }
  }
  return { fields, body: m ? text.slice(m[0].length) : text };
};

const readSkill = (file: string): Skill => {
  const { fields, body } = header(readFileSync(file, 'utf8'));
  const isSkillMd = basename(file).toLowerCase() === 'skill.md';
  const name = (fields.name || (isSkillMd ? basename(dirname(file)) : basename(file, extname(file))))
    .toLowerCase().replace(/[^\w-]+/g, '-');
  return { name, description: fields.description || body.trim().split(/\r?\n/)[0].slice(0, 200), file, dir: dirname(file), body: body.trim().slice(0, MAX_BODY) };
};

// Every SKILL.md under a folder (a few levels down); a folder without any
// counts its own .md files as skills.
const findSkillFiles = (dir: string, depth = 0): string[] => {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }
  const own = entries.find(e => e.toLowerCase() === 'skill.md');
  if (own) return [join(dir, own)];
  if (depth >= MAX_DEPTH) return [];
  return entries.filter(e => !e.startsWith('.') && e !== 'node_modules')
    .flatMap(e => { const p = join(dir, e); try { return statSync(p).isDirectory() ? findSkillFiles(p, depth + 1) : []; } catch { return []; } });
};

export const scanSkills = (path: string): Skill[] => {
  const p = path.trim().replace(/^["']|["']$/g, '');
  if (!p || !existsSync(p)) throw new Error(`Nothing at ${p || '(empty path)'}`);
  if (statSync(p).isFile()) return [readSkill(p)];
  let files = findSkillFiles(p);
  if (!files.length) files = readdirSync(p).filter(e => /\.md$/i.test(e)).map(e => join(p, e));
  if (!files.length) throw new Error(`No skill in ${p}: point to a SKILL.md, a skill's folder, or a folder of them`);
  return files.map(readSkill);
};

// What rides along with a chat turn: every skill that is on, in full; the
// one asked for by name (/name) marked to be used now.
export const skillsPrompt = (paths: string[], invoke?: string) => {
  const skills: Skill[] = [];
  const problems: string[] = [];
  for (const p of paths) {
    try { skills.push(...scanSkills(p)); } catch (e) { problems.push(e instanceof Error ? e.message : String(e)); }
  }
  if (!skills.length) return { text: '', dirs: [] as string[], problems };
  const want = invoke?.toLowerCase();
  // in full while they fit (the one asked for always); past that, named with
  // where to read them
  let room = BUDGET;
  const full = new Set([...skills.filter(s => s.name === want), ...skills.filter(s => s.name !== want)]
    .filter(s => { if (s.name !== want && s.body.length > room) return false; room -= s.body.length; return true; }));
  const text = `

Skills the designer has switched on. Follow a skill's instructions whenever the request is the kind it covers.${want ? `
The designer asked for the "${want}" skill for this message: use it.` : ''} Other files a skill mentions are in its folder; you may read them with the Read tool.
${skills.map(s => `
<skill name="${s.name}" folder="${s.dir}">
${s.description ? `Description: ${s.description}\n` : ''}${full.has(s) ? s.body : `(Read ${s.file} before doing a request this skill covers.)`}
</skill>`).join('\n')}`;
  return { text, dirs: [...new Set(skills.map(s => s.dir))], problems };
};
