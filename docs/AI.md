# AI in ProtoJam: the Chat tab and the MCP server

An AI can read and build designs in the ProtoJam window you have open, then
you take over and finish them by hand.

## The Chat tab (left panel, next to Tokens)

- Type a request ("a sign-up flow: welcome, phone number, code, dashboard").
  Screens and layers appear on the canvas while it works, each step listed in
  the chat. **Stop** ends it.
- Select something first and "this" means it ("make this more neo-brutalist").
- **One reply is one Ctrl+Z.**
- Layers it made show a ✨ in Layers until you change them.
- **Model**: Fable 5.1 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5. **Effort**: low to
  max (higher thinks longer). "Local model" is a reserved slot, not built yet.
- It runs **Claude Code on this computer**, on your own Claude plan, so there is
  no API key. It is given **only the ProtoJam tools**: no files, no shell.
- **History** (clock icon): every chat is kept per project, across reloads and
  restarts. Open one and the AI carries on from where it was (same Claude
  Code session). Rename or delete on hover. Chat-tab sessions Claude Code kept
  on disk from before History existed are picked up automatically.
- **Brief** (notebook icon, a dot when set): what the AI always knows about this
  project (brand, colours, fonts, audience, rules), sent with every message
  in every chat, so it is never retyped.
- The pencil icon starts a new chat.

Needs ProtoJam running from the dev server: `npm run dev` or
`npm run electron:dev`. A packaged build has no Chat yet.

## Skills

Instruction files for the AI, in Claude's skill format (a `SKILL.md` with a
`---` header holding `name` and `description`, then the instructions).

- `/skill <path>` in the chat: point at a `SKILL.md`, a skill's folder, or a
  folder of skills. The first time turns them on, pointing at the same path
  again turns them off. `/skill` alone lists what's on. Skills that are on show
  as chips above the box (x turns one off).
- While a skill is on, its instructions go with every message (all of them in
  full while they fit 40k characters, else the rest by name with where to read
  them), and the AI may **read** files in that skill's folder - nothing else:
  ProtoJam's own folder is explicitly denied, the rest isn't allowed.
- `/<name> what you want` asks for one skill by name. Typing `/` lists them
  (Tab completes the first).
- Code: `agent/skills.ts` (finding, reading, the prompt),
  `/__pj/skills/scan` in `agent/vitePlugin.ts`,
  `src/components/sidebar/chatSkills.ts` (which are on, kept in this browser).

## Word correction

The system's own spellchecker (offline), in the chat box: misspelled words are
underlined; right-click one for corrections or "Add to dictionary". The ABC
button turns on auto-correct: a finished word is fixed as you type, and the
whole message when you send. Paths and /commands are left alone. Desktop app
only (needs `electron/preload.cjs`); restart ProtoJam after updating.

## The MCP server (`mcp/server.mjs`)

For any MCP client (Claude Code in a terminal, Claude Desktop...). Already
registered for Claude Code on this laptop:

    claude mcp add protojam -s user -- node C:/Users/Bob/Documents/github/ProtoJam/mcp/server.mjs

Tools: `status`, `get_document`, `get_selection`, `create_screen`,
`update_screen`, `create_element`, `update_element`, `delete`,
`add_interaction`, `select`, `screenshot`, `list_fonts`, `run_script`.

## How it fits together

```
Chat tab --POST /__pj/chat--> dev server --starts--> claude -p (only ProtoJam tools)
                                                         |
MCP client (Claude Code...) ---------------------> mcp/server.mjs
                                                         |  POST /__pj/tool
                                                    dev server (agent/vitePlugin.ts)
                                                         |  Vite websocket
                                          the ProtoJam window used last (src/lib/agentBridge.ts)
```

- The `/__pj/*` endpoints answer only this computer. Requests need the
  `X-PJ-Agent` header, and other websites' origins are refused. (The dev server
  also listens on the network, because `host: true`.)
- With two ProtoJam windows open, commands go to the one you **clicked in
  last**.

## Drafts

Unsaved work is kept in a draft (`protojam-draft` in local storage) and comes
back after a reload or a crash. The dev server reloads the window whenever
ProtoJam's own code changes, which used to lose everything since the last
Ctrl+S.

## Speaking instead of typing

The microphone button in the Chat tab records you (16 kHz mono, in the page)
and the dev server writes it down with whisper.cpp on this computer: no cloud,
no key, about 3 seconds for a sentence. Click to start, click again to stop;
the words land in the box to read over, then Enter sends. Esc cancels.

It uses `..\whisper-dictate\bin\whisper-cli.exe` and
`..\whisper.cpp\models\ggml-base.en.bin` (next to this repo). Point
`PJ_WHISPER_CLI` / `PJ_WHISPER_MODEL` elsewhere to use another build or a
bigger model (small.en is more accurate, slower).
