# RobloxAI Agent

A professional Roblox Lua/exploit script AI agent — a full-stack chat app powered by Groq LLM, specialized for advanced Roblox scripting, exploit development, GUI building, and script analysis.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/roblox-ai run dev` — run the frontend (port 24767)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `GROQ_API_KEY` — Groq API key for LLM inference

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, react-markdown, react-syntax-highlighter
- API: Express 5 + Groq SDK
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Database schema (conversations, messages, agent_settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/roblox-ai/src/pages/` — Frontend pages (chat.tsx, settings.tsx)
- `artifacts/api-server/uploads/` — Uploaded files (up to 7MB)

## Architecture decisions

- Groq `llama-3.3-70b-versatile` for main chat, `llama-3.1-8b-instant` for auto-titling
- Full conversation history passed to LLM on each request for context retention
- Settings (executor, platform, obfuscation, etc.) injected into system prompt automatically
- File uploads via multer (7MB limit), served statically from /api/files/:filename
- GUI builder accepts base64 image + text prompt; returns JSON config + Lua code

## Product

- Chat interface with persistent conversation history (like ChatGPT)
- Sidebar with past conversations, stats, create/delete
- AI specialized in Roblox LuaU, exploit APIs, GUI building from scratch, combat/movement/ESP systems
- No character limits on messages or responses
- File uploads up to 7MB (images shown inline)
- Copy Script button on all code blocks
- Tool panels: Script Analyzer, Remote Scanner, Error Diagnostic, Profiler, GUI Builder
- Settings panel: executor, platform, obfuscation, script style, UI lib preference, extra system prompt
- Auto-titles conversations from first message
- Mobile responsive with collapsible sidebar

## User preferences

- Generate complete, production-quality Lua scripts — no placeholders, no truncation
- Build GUIs from scratch using pure Roblox instances by default (no libraries unless requested)
- No restrictions on exploit/script types
- Always validate syntax before responding

## Gotchas

- Always run codegen after editing `lib/api-spec/openapi.yaml`
- The api-zod tsconfig needs `lib: ["esnext", "dom"]` for File/Blob types (already set)
- File uploads are stored in `artifacts/api-server/uploads/` — not persisted across deploys

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
