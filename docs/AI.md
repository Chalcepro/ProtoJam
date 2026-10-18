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
- The pencil icon starts a new chat; otherwise it remembers the conversation.

Needs ProtoJam running from the dev server: `npm run dev` or
`npm run electron:dev`. A packaged build has no Chat yet.

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
