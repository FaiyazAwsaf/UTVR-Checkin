# UVTR Checkin — Agent Handover Index

> **Purpose of this file.** This is the complete, pre-built index of the repository, written for a coding agent (or developer) taking over the project. It is designed so you do **not** need to re-index the codebase: every route, Convex function, table, prompt, data flow, known bug, and extension seam is catalogued here with file paths. Treat it as the source of truth for Q&A and as the map for any code change. Verified against the working tree on 2026-09-14. Companion docs: [`docs/WHITE_LABELING.md`](./WHITE_LABELING.md) for rebranding, [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md) for every env var, [`docs/uvtr-hotel-os-technical-review.md`](./uvtr-hotel-os-technical-review.md) for the long-term hotel-AI product vision (a strategic document, not a description of current code).
>
> Line numbers are not cited in this version of the doc — trust file paths and symbol names, which don't drift.

---

## 1. What this is

**UVTR Checkin** is a multi-tenant AI customer-support platform, currently being extended toward an AI hotel-booking product:

- Operators (businesses) sign into a **dashboard** (`apps/web`, port 3000), manage an inbox of customer conversations, upload knowledge-base files, brand their widget, and connect a voice provider (Vapi).
- End customers talk to an **embeddable chat + voice widget** (`apps/widget`, port 3001) that answers from the org's knowledge base via a RAG-backed GPT-4o-mini agent, and can escalate to a human operator.
- Everything is backed by one **Convex** deployment (`packages/backend`) — database, serverless functions, AI agent, RAG, file storage, one HTTP route.

Tenancy = Clerk **organizations**. `organizationId` (a Clerk org id string) is stamped on every row and enforced _only_ in function handlers — there is no row-level DB security.

**This repository is not currently a git repository** — there is no commit history, `.git` directory, or prior version to diff against. Treat the working tree as the single source of truth.

### The "two frontends"

| Surface       | What it is                                                                 | Auth                                               |
| ------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web`    | Operator dashboard (Next.js 15, App Router)                                | Clerk, **org required**                            |
| `apps/widget` | End-customer chat + voice widget (Next.js 15, single route)                | None — `contactSessions` row, 24h capability token |

`packages/ui` is a shared shadcn/ui component library (`@workspace/ui`) both apps render from — not a deployed app.

There is **no third deployed app**. The widget is consumed as a plain URL (`https://<widget-host>/?organizationId=<clerkOrgId>`) intended for an iframe; the `/customization` dashboard page generates the iframe snippet.

---

## 2. Repo map & tooling

```
hotel-os/                         bun@1.3.13 + Turborepo, Node >= 20
├── apps/
│   ├── web/                      dashboard  (next dev --port 3000)
│   └── widget/                   widget     (next dev --turbopack --port 3001)
├── packages/
│   ├── backend/                  Convex deployment (@workspace/backend)
│   ├── ui/                       shadcn library + brand config (@workspace/ui)
│   ├── eslint-config/            shared lint config
│   └── typescript-config/        shared tsconfigs
├── docs/                         this file + companions (see header)
├── CLAUDE.md                     agent instructions (accurate, keep in sync)
├── README.md                     project overview, routes readers to docs/INDEX.md
└── turbo.json                    tasks: build / lint / check-types / dev (no cache)
```

### Commands

```bash
bun run dev                              # turbo: both apps + convex dev concurrently
bun run build | bun run lint | bun run format
bun run --filter web dev                 # single app (port 3000)
bun run --filter widget dev              # single app (port 3001, turbopack)
bun run --filter web typecheck           # tsc --noEmit — NOT wired into turbo, run manually
bun run --filter widget typecheck
bun run --filter @workspace/backend setup  # convex dev --until-success (first provisioning)
bunx shadcn@latest add <comp> -c apps/web   # lands in packages/ui/src/components
```

**There are no tests.** Typecheck + lint are the only gates. `packages/backend` has no `typecheck` script of its own — validate backend edits by confirming `convex dev` regenerates `_generated/` cleanly, then running typecheck in both apps (Convex types flow into them via each app's `tsconfig.json` path mapping).

### Environment (two distinct secret stores — full detail in `docs/ENVIRONMENT.md`)

1. **Convex deployment env** (`npx convex env set X` from `packages/backend`; _not_ a file): `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `VAPI_KB_TOOL_SECRET` (voice knowledge-search webhook), optional `VAPI_PUBLIC_API_KEY` / `VAPI_PRIVATE_API_KEY` (dev fallback for orgs with no plugin row).
2. **App `.env.local`** (copy from each app's `.env.example`): web needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, optional `NEXT_PUBLIC_WIDGET_URL`/`NEXT_PUBLIC_BRAND_*`; widget needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`/`NEXT_PUBLIC_VAPI_ASSISTANT_ID` for voice, optional `NEXT_PUBLIC_BRAND_*`.

Dev uses a **local Convex deployment** (`NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210`) that exists only while `convex dev` runs. `packages/backend/.env.local` (`CONVEX_DEPLOYMENT`) is CLI-generated. A fresh deployment (`npx convex dev --configure new`) starts with an **empty** env — re-set all vars. Clerk needs a JWT template named `convex` and organizations enabled.

---

## 3. Architecture — how it works end to end

```
┌────────────────┐   Clerk JWT (template "convex")   ┌─────────────────────────────┐
│  apps/web      │──────────────────────────────────▶│  Convex deployment           │
│  (operator)    │   api.private.* / api.users.*     │                              │
└────────────────┘                                   │  convex/                     │
                                                     │   ├ public/    widget surface│
┌────────────────┐   contactSessionId capability     │   ├ private/   dashboard     │
│  apps/widget   │──────────────────────────────────▶│   ├ system/    internal only │
│  (?orgId= URL) │   api.public.*                    │   └ lib/       pure helpers  │
└────────────────┘                                   │  components: agent, rag      │
        │                                            └──────┬───────────┬───────────┘
        │ Vapi voice call                                    │           │
        ▼                                       @convex-dev/agent    @convex-dev/rag
   Vapi platform ───POST /vapi/knowledge-search──▶ gpt-4o-mini chat     text-embedding-3-small
   (SIP/telephony,       (http.ts, shared secret)  (owns all messages)  (namespace = orgId)
    speech-to-text)                                          │
                                                       OpenAI API      Vapi API (dashboard actions)
```

**Core conversation loop (text):**

1. Widget boots with `?organizationId=`, validates the org via Clerk (`public/organizations.validate`), creates/validates a `contactSessions` row (24h expiry, persisted in localStorage per org), and fetches per-org branding (`public/widgetSettings.get`).
2. "Start chat" → `public/conversations.create`: creates an agent **thread** (`supportAgent.createThread`), seeds the org's configured (or default) greeting, inserts a `conversations` row (`status: "unresolved"`, stores only the `threadId` — **messages live in the agent component, never in `ctx.db`**).
3. Customer message → `public/messages.create` (action). If `unresolved`, runs `supportAgent.generateText` with three tools: `search` (RAG over the org namespace + a query-rewrite + interpreter pass), `escalateConversation`, `resolveConversation`. If `escalated`/`resolved`, just saves the message (no further AI reply).
4. Operators watch the inbox (`private/conversations.getMany`, reactive), reply via `private/messages.create` — replies are saved as `role: "assistant"` (distinguished only by `agentName`), and an operator reply auto-escalates an `unresolved` conversation. An "Enhance" button rewrites drafts via `private/messages.enhanceResponse`.
5. Knowledge base: dashboard uploads (`private/files.addFile`) → text extraction (`lib/extractTextContent.ts`, GPT-4o for PDFs/images/HTML) → `rag.add` under `namespace = orgId`. Files live **only** in RAG entries + Convex `_storage`, no app table.

**Core voice loop:** the widget starts a Vapi call (browser SDK, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`/`NEXT_PUBLIC_VAPI_ASSISTANT_ID`), passing the contact session id as a static call variable. When the Vapi assistant needs knowledge, it calls its `search_knowledge_base` tool, which Vapi's platform posts to this deployment's `POST /vapi/knowledge-search` HTTP route (`http.ts`), authenticated by a shared secret (`VAPI_KB_TOOL_SECRET`). That route resolves the contact session → organization and calls the same `searchKnowledgeBase` helper the text `search` tool uses — voice and text answer from one knowledge base.

**Reactivity:** everything renders through Convex `useQuery`/`usePaginatedQuery`/`useThreadMessages` subscriptions — no manual refetching, no token streaming (the widget awaits `generateText` and re-renders when the thread updates).

---

## 4. Backend deep dive (`packages/backend/convex/`)

### 4.1 Trust model — directory names ARE the security model

| Dir        | Constructors                                | Authorization required in EVERY handler                                                                                                                    |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/`  | `query`/`mutation`/`action`                  | Load `args.contactSessionId`, throw `UNAUTHORIZED` if missing or `expiresAt < Date.now()`; handlers touching a specific conversation must also bind it to the session (`contactSessionId` + `organizationId` match). |
| `private/` | `query`/`mutation`/`action`                  | `ctx.auth.getUserIdentity()` → custom Clerk claim `identity.org_id as string`; throw if either absent; then verify target row's `organizationId === orgId` |
| `system/`  | `internalQuery`/`internalMutation`/`internalAction` only | None — unreachable from clients; callers (other Convex functions, HTTP actions, agent tools) own the org check                                |
| `lib/`     | plain TS, no Convex wrappers                 | n/a                                                                                                                                                        |

Errors: `throw new ConvexError({ code, message })` with codes `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`; clients switch on `err.data.code`. ⚠️ One live typo: `"UNAUTHORZIED"` in `private/conversations.ts` — fix this (and any client switch that depends on it) if you touch that file.

### 4.2 Schema (`schema.ts`) — 5 tables

| Table             | Fields                                                                                                                                                                                                                                            | Indexes                                                                                        | Notes                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `plugins`         | `organizationId: string`, `service: v.union(v.literal("vapi"))`, `credentials: { publicApiKey, privateApiKey }`                                                                                                                                   | `by_organization_id`, `by_organization_id_and_service`                                         | Credentials **plaintext**. Closed credential object — a new provider shape needs a schema change.                                  |
| `conversations`   | `threadId: string` (agent-component FK), `organizationId`, `contactSessionId: v.id("contactSessions")`, `status: unresolved\|escalated\|resolved`                                                                                                 | `by_organization_id`, `by_contact_session_id`, `by_thread_id`, `by_status_and_organization_id` | `by_thread_id` read with `.unique()`.                                                                                               |
| `contactSessions` | `name`, `email`, `organizationId`, `expiresAt: number`, `metadata?` (12 optional browser fields: userAgent, language, languages, platform, vendor, screenResolution, viewportSize, timezone, timezoneOffset, cookieEnabled, referrer, currentUrl) | `by_organization_id`, `by_expires_at`                                                          | 24h TTL (`SESSION_DURATION_MS` in `public/contactSessions.ts`). **No cron reaper** — expired rows accumulate; only lazily rejected. |
| `widgetSettings`  | `organizationId`, `brandName`, `logoUrl`, `primaryColor`, `greeting`, `assistantName`, `suggestions: string[]`, `showAttribution: boolean`                                                                                                        | `by_organization_id`                                                                            | One row per org; per-organization widget branding, edited at `/customization`.                                                     |
| `users`           | `name`                                                                                                                                                                                                                                             | —                                                                                               | Dead scaffold (with `users.ts` root functions, one of which unconditionally throws). Safe to delete.                               |

`organizationId` is always `v.string()` (Clerk org id) — never a Convex `Id`.

### 4.3 Function index (complete)

**`public/contactSessions.ts`**

- `create` (mutation) — `{name, email, organizationId, metadata?}` → session id. Inserts with `expiresAt = now + 24h`. No validation that the org exists (that's the separate `organizations.validate` call).
- `validate` (mutation — _should be a query_, does no writes) — `{contactSessionId}` → `{valid:false, reason} | {valid:true, contactSession}`.

**`public/conversations.ts`**

- `getMany` (query) — `{contactSessionId, paginationOpts}` → paginated conversations + `lastMessage` (N+1: one `supportAgent.listMessages` per row).
- `getOne` (query) — `{conversationId, contactSessionId}` → `{_id, status, threadId}`; checks session and org binding.
- `create` (mutation) — `{organizationId, contactSessionId}` → conversation id. Verifies `session.organizationId === args.organizationId`, creates a thread, seeds the org's `widgetSettings` greeting (or the default) as the first assistant message.

**`public/messages.ts`**

- `create` (action) — `{prompt, threadId, contactSessionId}`. Resolves session + conversation, binds both (`contactSessionId` and `organizationId` match), rejects `resolved`; `unresolved` → `supportAgent.generateText` with the three tools; otherwise plain `saveMessage`, no AI reply. Has a `// TODO: Implement subscription check` comment.
- `getMany` (query) — `{threadId, paginationOpts, contactSessionId}` → agent messages, with the same session/conversation binding check.

**`public/organizations.ts`**

- `validate` (action) — `{organizationId}` → `{valid} | {valid:false, reason}` via `@clerk/backend` `organizations.getOrganization`. ⚠️ Clerk SDK **throws** for unknown orgs, so the `{valid:false}` branch is effectively dead; widget shows a generic error.

**`public/widgetSettings.ts`**

- `get` (query) — `{organizationId, contactSessionId}`, session-gated. Returns the org's normalized `widgetSettings` row, or `DEFAULT_WIDGET_SETTINGS` if none exists yet.

**`private/conversations.ts`**

- `updateStatus` (mutation) — `{conversationId, status}`; org check (⚠️ the `"UNAUTHORZIED"` typo lives here).
- `getOne` (query) — conversation + full `contactSession` doc.
- `getMany` (query) — `{paginationOpts, status?}`; picks `by_status_and_organization_id` or `by_organization_id`, desc. Per row: contact session `db.get` + `listMessages(1)` (N+1); null-session rows filtered **after** pagination → short pages.

**`private/messages.ts`**

- `enhanceResponse` (action) — `{prompt}` → rewritten string via `OPERATOR_MESSAGE_ENHANCEMENT_PROMPT` on gpt-4o-mini.
- `create` (mutation) — `{prompt, conversationId}`; org check; `resolved` → `BAD_REQUEST`; **auto-escalates `unresolved` on operator reply**; saves as `role:"assistant"` with `agentName: identity.familyName` (may be undefined — has a TODO comment about this).
- `getMany` (query) — `{threadId, paginationOpts}`; resolves conversation via `by_thread_id` and enforces org — the reference implementation for correct thread scoping.

**`private/files.ts`**

- `addFile` (action) — `{filename, mimeType, bytes, category?}`. MIME guess → `ctx.storage.store` → `extractTextContent` → `rag.add({namespace: orgId, key: filename, contentHash, metadata: {storageId, uploadedBy: orgId, filename, category}})`. Same-filename re-upload replaces the entry; identical content dedupes (and deletes the just-stored duplicate blob, then still returns a URL for it). No size/MIME allowlist before spending an OpenAI extraction call.
- `list` (query) — RAG list under the org namespace, mapped to `PublicFile` (`{id, name, type, size, status, url, category?}`). Category filtered in JS post-pagination → short pages.
- `deleteFile` (mutation) — namespace check + `entry.metadata.uploadedBy === orgId`, deletes storage blob + `rag.deleteAsync`.

**`private/plugins.ts`**

- `getOne` (query) — `{service}` → plugin row **with `credentials` stripped** (the one deliberate secret-withholding point; keep it that way).
- `remove` (mutation) — deletes the org's plugin row.

**`private/secrets.ts`**

- `upsert` (mutation) — `{service: "vapi", credentials}` → delegates to `internal.system.plugins.upsert` with server-derived orgId (never client-supplied). Has a `// TODO: Check for subscription` comment.

**`private/vapi.ts`** — see §7.

- `getAssistants` (action) — `{}` → `Vapi.Assistant[]`, via `resolveVapiCredentials` (DB-then-env) + `@vapi-ai/server-sdk`.
- `getPhoneNumbers` (action) — `{}` → `Vapi.PhoneNumbersListResponseItem[]`, same credential resolution.

**`private/widgetSettings.ts`**

- `get` (query) — `{}` → the org's normalized settings row, or `null` if none exists.
- `upsert` (mutation) — `{brandName, logoUrl, primaryColor, greeting, assistantName, suggestions, showAttribution}`, with validation (non-empty trimmed strings, `#rrggbb` color, root-relative or `https://` logo URL, ≤4 suggestions of ≤120 chars). Patches or inserts.

**`system/`**

- `contactSessions.getOne` (internalQuery) — plain `ctx.db.get`, no auth check.
- `conversations.getByThreadId` / `escalate` / `resolve` (internal; via `by_thread_id`), no auth check.
- `plugins.upsert` / `getByOrganizationIdAndService` (internal; the latter returns **full plaintext credentials** — internal-only by design).

**Root files**

- `users.ts` — dead scaffold: unauthenticated `getMany` table scan; `add` requires identity/org but then unconditionally `throw new Error("Tracking test")` before ever inserting. Delete when convenient (with the table).
- `playground.ts` — `definePlaygroundAPI(components.agent, {agents: [supportAgent]})`. Auth = agent-component apiKey (`npx convex run --component agent apiKeys:issue`), **bypasses org scoping** — dev-only tool, unconditionally exported.
- `http.ts` — `httpRouter()` with one route: `POST /vapi/knowledge-search` (see §4.4 and §7). Shared-secret auth via `VAPI_KB_TOOL_SECRET`, checked against an `Authorization: Bearer`, `x-vapi-tool-secret`, or `x-vapi-secret` header.
- `auth.config.ts` — single Clerk provider, `applicationID: "convex"`, domain from `CLERK_JWT_ISSUER_DOMAIN`.
- `convex.config.ts` — `app.use(agent)`, `app.use(rag)`.

No `crons.ts` and no `ctx.scheduler` usage exist anywhere in this deployment today.

### 4.4 AI stack

- **`system/ai/agents/supportAgent.ts`** — `new Agent(components.agent, { chat: openai.chat("gpt-4o-mini"), instructions: SUPPORT_AGENT_PROMPT })`. No `tools` and no `textEmbeddingModel` configured on the agent itself — tools are injected per-call only in `public/messages.create`, so the playground runs the "always search first" prompt with no search tool available.
- **`system/ai/rag.ts`** — `new RAG(components.rag, { textEmbeddingModel: openai.embedding("text-embedding-3-small"), embeddingDimension: 1536 })`. **`namespace` = raw Clerk orgId everywhere** — this is the _entire_ tenant isolation for knowledge bases. No `filterNames` → no vector-level filtered search (why category filtering is post-hoc JS).
- **`system/ai/knowledgeSearch.ts`** — `searchKnowledgeBase(ctx, organizationId, query)`, a plain (non-Convex-function) helper: rewrites non-ASCII queries to English via `gpt-4o-mini` + `SEARCH_QUERY_REWRITE_PROMPT`, runs `rag.search` (namespace = org, limit 5), then synthesizes a Bangla answer via `gpt-4o-mini` + `SEARCH_INTERPRETER_PROMPT`. Shared by both the text `search` tool and the voice bridge.
- **`system/ai/voiceSearch.ts`** — `search` (internalAction), `{contactSessionId, query}` → validates session, delegates to `searchKnowledgeBase`. Called from `http.ts`'s Vapi webhook.
- **`system/ai/constants.ts`** — ALL prompts live here as exported constants. Edit prompts here, never inline:
  - `SUPPORT_AGENT_PROMPT` — persona + tool-routing playbook (search on any product question; escalate on frustration/"real person"; resolve on "that's all"; never invent facts). **Mandates every customer-facing reply be in Bangla, regardless of the customer's input language** — deliberate, not a bug.
  - `SEARCH_QUERY_REWRITE_PROMPT` — rewrites a (possibly Bangla) user question into an English RAG search query.
  - `SEARCH_INTERPRETER_PROMPT` — turns raw RAG hits into a conversational Bangla answer (with fixed no-hits wording).
  - `OPERATOR_MESSAGE_ENHANCEMENT_PROMPT` — grammar/tone rewrite preserving intent/numbers/commitments.
- **`system/ai/tools/`** — `createTool` (zod args). All derive org **from `ctx.threadId`** → `internal.system.conversations.getByThreadId` → `conversation.organizationId`; never trust an org passed in as an argument.
  - `search.ts` — calls `searchKnowledgeBase`, saves the answer as an assistant message **and** returns it as the tool result (the outer agent usually restates it: duplicated content in threads — known quirk).
  - `escalateConversation.ts` / `resolveConversation.ts` — empty args; patch `conversations.status` via internal mutations; save a confirmation message.
- **`lib/extractTextContent.ts`** — `extractTextContent(ctx, {storageId, filename, bytes?, mimeType})`. Images (jpeg/png/webp/gif) → gpt-4o-mini vision; PDFs → gpt-4o file input; text/\* → raw if `text/plain` else gpt-4o → markdown. Sends **signed storage URLs** to OpenAI, not bytes. Unsupported MIME throws plain `Error` (opaque to clients).
- **`lib/widgetSettings.ts`** — `DEFAULT_WIDGET_SETTINGS`, `isLegacyGreeting`, `normalizeWidgetSettings`: migrates old stored brand name/greeting values forward to the current default on every read, so a past product-name change doesn't leave stale branding stuck in the database. Extend this (don't replace it) on any future rename.
- **`lib/secrets.ts`** — `getCredentialsFromEnv(service)`, `areCredentialsComplete(service, credentials)`; deployment-wide env fallback for third-party credentials, currently only `"vapi"`.
- AI SDK is **v4** (`ai@^4.3.19`, `@ai-sdk/openai@^1.3.23`, zod pinned `3.25.67` for peer compat). Don't casually bump to v5 — call shapes differ.

### 4.5 How to write a custom Convex function (recipes)

Pick the directory by caller, copy the matching auth preamble, use an index, throw `ConvexError`:

**Private (dashboard) query:**

```ts
// convex/private/things.ts
import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";

export const getMany = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    const orgId = identity.org_id as string;
    if (!orgId)
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    return await ctx.db
      .query("things")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

**Public (widget) function:** take `contactSessionId: v.id("contactSessions")`, `ctx.db.get` it, reject if `!session || session.expiresAt < Date.now()`, and **bind every other id you touch back to that session/org** (see `public/messages.ts` for the reference implementation).

**System function:** `internalQuery`/`internalMutation`/`internalAction` in `system/`, called as `internal.system.foo.bar` — never trust-check inside; the caller must.

Rules of thumb:

- New table → `schema.ts` with an `organizationId` field + `by_organization_id` index (compound `by_X_and_organization_id` if you'll filter).
- Actions (not mutations) for anything hitting external APIs (OpenAI, Vapi, Clerk); actions call back into the DB via `internal.system.*`.
- Messages: always `supportAgent.listMessages` / `saveMessage` / `generateText` — never `ctx.db` (they're in the agent component).
- RAG: always pass `namespace: orgId` on read _and_ write; omitting it on write makes the entry global (cross-tenant leak).
- After editing: `convex dev` regenerates `_generated/`; run `bun run --filter web typecheck && bun run --filter widget typecheck`.
- Client wiring: `useQuery`/`useMutation`/`useAction`/`usePaginatedQuery` from `convex/react` with `api.private.*` (web) or `api.public.*` (widget); thread messages via `useThreadMessages` + `toUIMessages` from `@convex-dev/agent/react`.

---

## 5. Frontend: `apps/web` (operator dashboard)

### Routes (App Router)

| URL                               | Renders                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `/sign-in`, `/sign-up`            | Clerk components (`routing="hash"`)                                                |
| `/org-selection`                  | Clerk `OrganizationList` (hidePersonal)                                            |
| `/`                               | Redirects to `/conversations`                                                      |
| `/conversations`                  | `ConversationsView` — inbox split view (`ResizablePanelGroup` 30/70)               |
| `/conversations/[conversationId]` | `ConversationIdView` — thread + composer                                          |
| `/files`                          | `FilesView` — knowledge base table + upload dialog                                |
| `/plugins/vapi`                   | `VapiView` (connect/manage voice provider)                                         |
| `/customization`                  | `CustomizationView` — per-organization widget branding editor, preview, embed snippet |
| `/integrations`, `/billing`       | **Stub placeholders** (`<div>Integrations</div>` / `<div>Billing</div>`) — not implemented |

### Auth layering

1. `middleware.ts` — `clerkMiddleware`; public: `/sign-in`, `/sign-up`, and the Sentry `/monitoring` tunnel (+ `/org-selection` org-free). Logged-in but org-less → redirect `/org-selection?redirectUrl=…`.
2. `app/layout.tsx` → `ClerkProvider` → `components/providers.tsx` (throws at import if `NEXT_PUBLIC_CONVEX_URL` missing; `ConvexProviderWithClerk`).
3. `DashboardLayout` (async server component; reads `sidebar_state` cookie) → `AuthGuard` (Convex `<Authenticated>`/`<Unauthenticated>`) → `OrganizationGuard` (Clerk `useOrganization`) → Jotai Provider → Sidebar + main.

### Modules (`apps/web/modules/`)

- **`auth/`** — `auth-guard.tsx`, `organization-guard.tsx`, `auth-layout.tsx` (empty centering div), thin Clerk view wrappers (`sign-in-view.tsx`, `sign-up-view.tsx`, `org-selection-view.tsx`).
- **`dashboard/`** — `atoms.ts` (`statusFilterAtom`, localStorage key `echo-status-filter`); `constants.ts`; `dashboard-sidebar.tsx` (nav groups); `conversations-panel.tsx` (paginated inbox, Dicebear avatars seeded by session id, country flag from `metadata.timezone` via `lib/country-utils.ts` + flagcdn.com); `conversation-id-view.tsx` (thread view — **roles inverted for display** since the operator sees from the assistant's seat — status cycle button, Enhance button, react-hook-form + zod composer, disabled when resolved); `conversations-view.tsx`; `conversation-status-button.tsx`; layouts `dashboard-layout.tsx` and `conversations-layout.tsx`.
- **`customization/`** — `customization-view.tsx` edits per-organization widget name, logo URL, primary color, greeting, assistant name, suggestions, and optional attribution, and generates the iframe snippet; `data/demo-knowledge-base.ts` holds a sample Bangla knowledge-base doc used somewhere in the upload/demo flow.
- **`files/`** — `files-view.tsx`, `upload-dialog.tsx` (Category required, Dropzone: pdf/csv/txt, maxFiles 1, sends `bytes: ArrayBuffer`), `delete-file-dialog.tsx`.
- **`plugins/`** — see §7. `vapi-view.tsx`, `plugin-card.tsx`, `vapi-connected-view.tsx`, `vapi-assistants-tab.tsx`, `vapi-phone-numbers-tab.tsx`, `hooks/use-vapi-data.ts`.

Non-`modules/` app-level dirs worth knowing: `components/providers.tsx` (Convex+Clerk wiring), `lib/country-utils.ts` (`getCountryFromTimezone`, `getCountryFlagUrl`, wraps `countries-and-timezones`).

### Convex call sites (web, complete)

`api.private.conversations.{getMany,getOne,updateStatus}` · `api.private.messages.{getMany,create,enhanceResponse}` · `api.private.files.{list,addFile,deleteFile}` · `api.private.plugins.{getOne,remove}` · `api.private.widgetSettings.{get,upsert}` · `api.private.secrets.upsert` · `api.private.vapi.{getAssistants,getPhoneNumbers}` · `api.users.add` (dead scaffold).

### Sentry

`withSentryConfig` in `next.config.mjs` (org/project identifiers, tunnel `/monitoring`); `instrumentation.ts`, `instrumentation-client.ts` (replay, traces 1.0), `sentry.server/edge.config.ts`. Runtime DSN comes from `NEXT_PUBLIC_SENTRY_DSN`. No `SENTRY_AUTH_TOKEN` → sourcemap upload no-ops.

---

## 6. Frontend: `apps/widget` (embeddable chat + voice)

Single route: `app/page.tsx` reads `?organizationId=` → `WidgetView`. Providers: bare `ConvexProvider` + Jotai — **no Clerk here, ever**. ⚠️ Falls back to `""` (not a throw) when `NEXT_PUBLIC_CONVEX_URL` is missing — a broken widget with no console error usually means this.

### State (Jotai, `modules/widget/atoms/widget-atoms.ts`)

- `screenAtom` (`"loading"` initial), `organizationIdAtom`, `conversationIdAtom`, `errorMessageAtom`, `loadingMessageAtom`, `widgetSettingsAtom` — ephemeral.
- `contactSessionIdAtomFamily(orgId)` — `atomFamily` × `atomWithStorage`, localStorage key `echo_contact_session_<orgId>` (`CONTACT_SESSION_KEY` in `modules/widget/constants.ts`). One identity per org per browser.

### Screen state machine (`WIDGET_SCREENS` in `constants.ts`, object-literal map in `ui/views/widget-view.tsx`)

`["error","loading","selection","voice","auth","inbox","chat","contact"]`, rendered via `const screenComponents = { loading: <.../>, error: <.../>, ... }; return <main>{screenComponents[screen]}</main>;` — **not** a switch statement.

```
loading ──no orgId / org invalid──▶ error
loading ──no/invalid stored session──▶ auth ──contactSessions.create──▶ selection
loading ──stored session valid──▶ selection
selection ──conversations.create──▶ chat        selection ◀──back── chat
selection ──Talk to AI──▶ voice
selection ◀──footer tabs──▶ inbox ──row click──▶ chat
contact ── DECLARED BUT UNREACHABLE (renders a TODO placeholder)
```

### Screens (`ui/screens/`)

`widget-{loading,auth,error,selection,inbox,chat,voice}-screen.tsx`. Auth screen: react-hook-form + zod (name, email) + a 12-field browser-metadata blob → `contactSessions.create`. Chat screen: `useThreadMessages(api.public.messages.getMany, …, {initialNumItems: 10})` + upward infinite scroll (`useInfiniteScroll` from `@workspace/ui`); send via `useAction(api.public.messages.create)`; resolved → composer disabled; filters out legacy-greeting messages via a locally duplicated `isLegacyGreeting` check. Assistant avatar uses the organization logo from `widgetSettingsAtom`. Voice screen uses `hooks/use-vapi.ts` (the `@vapi-ai/web` browser client) and passes the validated contact-session ID into the call's variable values.

Other files: `hooks/use-widget-settings.ts` (fetches + caches `widgetSettingsAtom`), `types.ts`, `ui/components/{widget-header,widget-footer,widget-welcome}.tsx`.

### Widget Convex surface (complete)

`api.public.organizations.validate` (action) · `api.public.contactSessions.{create,validate}` · `api.public.widgetSettings.get` · `api.public.conversations.{create,getMany,getOne}` · `api.public.messages.{create,getMany}`.

---

## 7. Voice AI — current state, exactly

**TL;DR: voice uses Vapi for audio orchestration and Convex RAG for knowledge.** The dashboard can store Vapi credentials and _list_ assistants/phone numbers. The widget starts the configured assistant and passes its contact-session ID as a dynamic variable. Vapi calls the `search_knowledge_base` custom tool, which reaches this deployment's `POST /vapi/knowledge-search` HTTP action and searches the same organization namespace used by text chat. Voice assistant language, voice, and model still live in the Vapi dashboard. See `docs/VAPI_BANGLA_PROMPT.md` for the exact assistant setup (system prompt, tool wiring) used today.

### What works today (dashboard)

```
vapi-view.tsx form (publicApiKey/privateApiKey, password inputs)
  └▶ api.private.secrets.upsert ─▶ internal.system.plugins.upsert ─▶ plugins row (plaintext)

VapiAssistantsTab / VapiPhoneNumbersTab
  └▶ use-vapi-data.ts (useAction + useEffect fetch-once)
      └▶ api.private.vapi.getAssistants|getPhoneNumbers  (Convex actions)
          └▶ resolveVapiCredentials(ctx)      ← THE seam: identity → org plugin row
              └▶ ?? getCredentialsFromEnv("vapi")  ← env fallback VAPI_*_API_KEY
          └▶ new VapiClient({token: privateApiKey}).assistants.list() / phoneNumbers.list()
          └▶ raw Vapi SDK objects returned to the browser (no DTO mapping)
```

- `private/vapi.ts`'s internal `resolveVapiCredentials` helper is **the single place that resolves DB-then-env; add new consumers through it.**
- The private key never leaves Convex. `private/plugins.getOne` strips credentials, so the browser only learns connected/not-connected.
- The plugin-row `publicApiKey` is stored but not used by the current widget; the browser voice client uses the deployment-level `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
- The widget's browser-side SDK uses `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`; the voice tool endpoint uses `VAPI_KB_TOOL_SECRET` on the Convex deployment.

### The Vapi HTTP bridge (`http.ts`)

`POST /vapi/knowledge-search`:
1. Auth: shared secret from `process.env.VAPI_KB_TOOL_SECRET`, accepted via `Authorization: Bearer <secret>`, `x-vapi-tool-secret`, or `x-vapi-secret` header — 401 if missing/mismatched.
2. Parses Vapi's tool-call webhook payload (handles both flat `toolCallList` and nested `toolWithToolCallList` shapes).
3. Extracts `query` and `contactSessionId` (the latter typically arrives via `assistantOverrides.variableValues`, set at call start by the widget).
4. For each tool call named `search_knowledge_base`, calls `internal.system.ai.voiceSearch.search({contactSessionId, query})`.
5. Returns Bangla fallback strings on failure/invalid input rather than an error the caller can't use conversationally.

This is the pattern to copy for any future Vapi tool-call bridge (e.g. booking actions): one HTTP route, shared-secret auth, dispatch by tool name, delegate to a `system/` internal action that does the same session/org validation every other entry point does.

### Remaining voice limitations

1. Vapi assistant selection is deployment-wide via `NEXT_PUBLIC_VAPI_ASSISTANT_ID`; there is no per-organization assistant selection in the dashboard.
2. Voice transcripts are currently local to the widget and are not saved into the Convex conversation thread.
3. Vapi tool and assistant configuration is still managed outside this repository (in the Vapi dashboard directly).
4. Voice can only answer from the knowledge base today — it cannot take any booking/transactional action (no Vapi tool bridge exists yet for anything beyond `search_knowledge_base`).

The current voice event loop is implemented in `use-vapi.ts`: `call-start`/`call-end`/`speech-start`/`speech-end`/`error`/`message` (transcript accumulation on `type === "transcript" && transcriptType === "final"`), state `{isConnected, isConnecting, isSpeaking, isMuted, transcript, error}`.

---

## 8. `packages/ui` (shared library)

`@workspace/ui`, imported as `@workspace/ui/components/*` (tsconfig-mapped, `transpilePackages` in both apps). Contents: shadcn "new-york" components (added via `bunx shadcn@latest add <c> -c apps/web`), AI chat primitives (`components/ai/{conversation,input,message,response,suggestion}` — used by both the operator thread view and the widget chat), `DicebearAvatar`, `Dropzone`, `Hint`, `InfiniteScrollTrigger`, hook `use-infinite-scroll.ts`, `src/brand.ts` (deployment-wide brand fallback config, sourced from `NEXT_PUBLIC_BRAND_*` env vars), a dormant shadcn `chart.tsx` (recharts wrapper — a real dependency, but no current view consumes it yet), and **the entire Tailwind v4 theme** in `src/styles/globals.css` (config-less Tailwind; all design tokens are CSS custom properties there — see `docs/WHITE_LABELING.md`).

---

## 9. Known bugs, gaps & security findings

**Security (fix before anything public):**

1. Vapi credentials plaintext in `plugins` (acknowledged dev-grade; envelope-encrypt behind `lib/secrets.ts` for prod).
2. `playground.ts` exported unconditionally; apiKey auth bypasses org scoping.
3. `users.getMany` — unauthenticated full table scan (dead scaffold).
4. No `X-Frame-Options`/`frame-ancestors` policy on the widget; any site can embed any org's widget (may be intended, but undocumented).
5. Check `.env.local` files in both apps before any public deployment — copy fresh secrets from your own Clerk/Convex projects rather than committing real keys.

**Bugs:** 6. `"UNAUTHORZIED"` typo (`private/conversations.ts`) breaks client error-code switches that depend on the exact string. 7. `private/files.addFile` dedupe path returns a URL for a just-deleted blob. 8. `public/organizations.validate` — Clerk throws for unknown orgs; `{valid:false}` branch dead. 9. Widget chat form resets before the send await — failed sends lose the draft (verify current behavior before relying on this). 10. `use-vapi.ts`: `isConnecting` may not clear correctly if `vapi` is still null in some races — verify before shipping voice-dependent flows.

**Gaps / dead code / paper cuts:** `/integrations` and `/billing` are unimplemented stub pages · widget's `contact` screen is unreachable (TODO placeholder) · no session reaper cron (expired `contactSessions` rows accumulate) · N+1 `listMessages` in both conversation lists · post-pagination category filters → short pages · `search` tool double-writes its answer (saves it directly, then the outer agent often restates it) · `contactSessions.validate` is a mutation not a query · `users.ts`/`users` table is entirely dead scaffold, including a handler that unconditionally throws before its insert · no `crons.ts` or `ctx.scheduler` usage anywhere yet — introduce this file fresh if any feature needs scheduled/delayed execution.

---

## 10. Q&A quick answers (anticipated questions)

- **Where are chat messages stored?** In the `@convex-dev/agent` component, keyed by `threadId`. `conversations` only stores the pointer. Never query messages via `ctx.db`.
- **How is tenant isolation enforced?** Handler code only: `organizationId` string checks in `private/`, session checks in `public/`, RAG `namespace = orgId`. No DB-level enforcement.
- **How do I change the AI's behavior/persona?** `packages/backend/convex/system/ai/constants.ts` — nothing else.
- **How do I change the AI model?** `supportAgent.ts` (chat), `rag.ts` (embeddings — changing dims requires re-embedding), `extractTextContent.ts` (extraction models), `private/messages.enhanceResponse` (enhance model).
- **Why doesn't the widget stream tokens?** `public/messages.create` uses `generateText`, awaited; UI re-renders reactively when the thread updates. Streaming would mean `supportAgent.streamText` + `syncStreams` wiring — not built.
- **Where do widget settings live?** `widgetSettings` table stores per-organization branding and copy; `private/widgetSettings.ts` writes it for operators, `public/widgetSettings.get` exposes a safe session-gated view, the widget's loading flow fetches it into `widgetSettingsAtom`, and `/customization` edits it.
- **How does an operator reply reach the customer?** `private/messages.create` saves an assistant-role message into the same thread; the widget's `useThreadMessages` subscription picks it up live.
- **What runs where?** Queries/mutations = Convex runtime (deterministic, DB access). Actions = Node-ish runtime for external APIs (OpenAI, Clerk, Vapi); they touch the DB only via `internal.*` calls.
- **Can I add another HTTP webhook endpoint?** Yes — add another route to `http.ts`'s existing `httpRouter()`, following the `/vapi/knowledge-search` route's shared-secret-auth + dispatch-by-name pattern.
- **How do I rename the product again?** See CLAUDE.md's "Renaming/rebranding conventions" section — update `packages/ui/src/brand.ts`, `lib/widgetSettings.ts`'s defaults, extend (don't replace) the legacy-value migration regexes in both `lib/widgetSettings.ts` and `widget-chat-screen.tsx`, and update both `.env.example` files.
