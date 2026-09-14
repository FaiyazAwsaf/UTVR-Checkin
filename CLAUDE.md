# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Start with `docs/INDEX.md`** — a complete pre-built index of the repo (every route, Convex function, table, prompt, data flow, known bug, and extension seam) written for agent handover; it answers most questions without re-scanning the codebase. `docs/WHITE_LABELING.md` covers rebranding. `docs/uvtr-hotel-os-technical-review.md` is a separate strategic document describing the long-term Hotel OS vision this product is evolving toward — it is not a description of the current repo state.

## What this is

**UVTR Checkin** — an AI customer-support platform (currently being extended toward a hotel AI booking system; the codebase and this doc describe the platform as it exists today). Two Next.js apps share one Convex backend:

- `apps/web` (port 3000) — operator dashboard: conversation inbox, knowledge-base file uploads, per-organization widget branding, Vapi voice-plugin connection. Auth via Clerk with **required organization context**.
- `apps/widget` (port 3001) — embeddable end-customer chat + voice widget. **No Clerk**; identity is a `contactSessions` row keyed by `?organizationId=` in the URL.
- `packages/backend` — the Convex deployment (schema, functions, AI agent, RAG, HTTP routes).
- `packages/ui` — shared shadcn/ui components (`@workspace/ui`), including the brand config (`src/brand.ts`) and the AI chat-UI kit both apps render from.

The root `README.md` describes this project and routes readers to `docs/INDEX.md`. `packages/math` is leftover template scaffolding and is unused.

**This is not yet a git repository.** There is no commit history to consult for "why" — rely on this doc, `docs/INDEX.md`, and reading the code directly.

## Commands

```bash
pnpm dev                 # turbo dev: runs both apps + `convex dev` concurrently
pnpm build               # turbo build
pnpm lint                # turbo lint
pnpm format              # prettier

pnpm --filter web dev            # single app (port 3000)
pnpm --filter widget dev         # single app (port 3001, turbopack)
pnpm --filter web typecheck      # tsc --noEmit (NOT wired into turbo)
pnpm --filter widget typecheck
pnpm --filter web lint:fix
pnpm --filter @workspace/backend setup   # convex dev --until-success (first-time provisioning)
```

There is no test framework in this repo. Typecheck + lint are the only verification gates; run `pnpm --filter <app> typecheck` in **both** apps after changing anything crossing the app/backend boundary, since Convex `_generated` types flow into both. `packages/backend` itself has no `typecheck` script — validate backend changes by letting `convex dev` regenerate `_generated/` without error, then typechecking the apps that consume it.

Add shadcn components from the repo root, targeting an app — they land in `packages/ui/src/components`:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

## Convex backend layout — the directory names are the security model

`packages/backend/convex/` is split by trust level, and this convention must be preserved:

- **`public/`** — callable by the unauthenticated widget. Every handler must authorize by loading the passed `contactSessionId` and rejecting if missing or `expiresAt < Date.now()`. Sessions last 24h (`SESSION_DURATION_MS`, defined in `public/contactSessions.ts`). Handlers that touch a specific conversation must also bind it back to the session (`conversation.contactSessionId === session._id` **and** `conversation.organizationId === session.organizationId`) — see `public/messages.ts` for the reference implementation.
- **`private/`** — callable by the authenticated dashboard. Every handler must `ctx.auth.getUserIdentity()`, read the custom Clerk claim `identity.org_id as string`, reject when either is absent, then verify the target row's `organizationId === orgId` before reading/writing.
- **`system/`** — `internalQuery`/`internalMutation`/`internalAction` only. Not reachable from any client; called via `internal.*` from other Convex functions, HTTP actions, and agent tools. These do **not** re-check auth themselves — the caller owns it.
- **`lib/`** — plain helpers (credential resolution, text extraction, widget-settings defaults/migration), no Convex wrappers, no auth logic.

Errors are thrown as `ConvexError({ code, message })` with codes like `UNAUTHORIZED` / `NOT_FOUND` / `BAD_REQUEST`; clients switch on `code`. ⚠️ `private/conversations.ts` has a live typo — one throw site uses the code `"UNAUTHORZIED"` instead of `"UNAUTHORIZED"`. Don't propagate that typo into new code, and fix it (plus any client-side switch that depends on it) if you touch that file.

Multi-tenancy is enforced entirely in these handlers — `organizationId` is a plain string (the Clerk org id) on every table, with a `by_organization_id` index. There is no row-level DB enforcement, so an unguarded query leaks across tenants.

## Schema (`packages/backend/convex/schema.ts`)

Five tables today: `plugins` (per-org third-party credentials), `conversations` (thread pointer + status), `contactSessions` (widget visitor identity, 24h TTL), `widgetSettings` (per-org branding: name, logo, color, greeting, assistant name, suggestions, attribution toggle), and `users` (dead scaffold — unauthenticated, unused, safe to delete along with `users.ts`). When adding a table: give it an `organizationId: v.string()` field and a `by_organization_id` index at minimum, matching every existing table.

## AI stack

- `system/ai/agents/supportAgent.ts` — a `@convex-dev/agent` `Agent` over `openai.chat("gpt-4o-mini")`. It owns conversation messages; the `conversations` table stores only a `threadId` pointing into the agent component. To list/save messages, go through `supportAgent.listMessages` / `saveMessage` / `generateText`, never `ctx.db`.
- `system/ai/rag.ts` — `@convex-dev/rag` with `text-embedding-3-small` (1536 dims). **Namespace is always the `organizationId`** — that's what keeps knowledge bases tenant-isolated. Uploaded files live in RAG entries, not in a Convex table.
- `system/ai/knowledgeSearch.ts` — `searchKnowledgeBase(ctx, organizationId, query)`, a plain helper (not a Convex function) shared by both the text and voice paths: rewrites non-ASCII queries to English, runs `rag.search`, then synthesizes a reply.
- `system/ai/tools/` — `search`, `escalateConversation`, `resolveConversation`, wired via `createTool` (zod args, not `convex/values`). Tools derive the org by resolving `ctx.threadId` → conversation → `organizationId`; they never trust an org passed in as an argument. Tools return plain strings on failure — they do not throw `ConvexError` (that's reserved for the public/private trust boundary).
- `system/ai/voiceSearch.ts` — an `internalAction` entry point for the Vapi voice bridge (see below); validates the contact session, then calls the same `searchKnowledgeBase` helper as the text `search` tool, so voice and text answer from the identical knowledge base.
- `system/ai/constants.ts` — all system prompts live here as exported string constants (`SUPPORT_AGENT_PROMPT`, `SEARCH_QUERY_REWRITE_PROMPT`, `SEARCH_INTERPRETER_PROMPT`, `OPERATOR_MESSAGE_ENHANCEMENT_PROMPT`). Edit prompts there, not inline. **Every customer-facing reply is currently mandated to be in Bangla (বাংলা), regardless of the input language** — this is an explicit, deliberate prompt rule, not an accident; preserve it when adding new agents/prompts unless a task explicitly says otherwise.
- Components are registered in `convex.config.ts` (`agent`, `rag`); `playground.ts` exposes the `@convex-dev/agent-playground` API bound to `supportAgent`, authenticated by a separate playground API key (not Clerk) — it bypasses organization scoping by design, so treat it as a dev-only tool, never expose it to end users.
- `http.ts` defines the deployment's only HTTP route today: `POST /vapi/knowledge-search`, a shared-secret-authenticated (`VAPI_KB_TOOL_SECRET`) webhook that lets a Vapi voice assistant call `search_knowledge_base` and get an answer from the same RAG namespace as text chat. This is the pattern to copy for any future Vapi tool-call bridge (booking actions, etc.) — see `docs/INDEX.md` for the full request/response shape.

Third-party credentials (currently Vapi) are stored on the org's row in the `plugins` table (`credentials: { publicApiKey, privateApiKey }`), written via `private/secrets.ts` → `internal.system.plugins.upsert`. `lib/secrets.ts` provides a deployment-wide fallback: when an org has no plugin row, `getCredentialsFromEnv("vapi")` reads `VAPI_PUBLIC_API_KEY` / `VAPI_PRIVATE_API_KEY` from the Convex environment, so one dev account can exercise the flow without per-tenant setup. `private/vapi.ts`'s internal `resolveVapiCredentials` helper is the single place that resolves DB-then-env; add new consumers through it.

This is deliberately a development-grade arrangement — credentials sit in plaintext in the Convex table. Any move to production wants envelope encryption or a real secrets manager behind the same `lib/secrets.ts` interface.

## Widget branding (`widgetSettings`)

Per-organization widget branding (name, logo, primary color, greeting, assistant name, suggestion chips, attribution toggle) lives in the `widgetSettings` table, edited by operators at `/customization` (`private/widgetSettings.ts`) and read by the widget through a session-gated `public/widgetSettings.get`. `lib/widgetSettings.ts` holds `DEFAULT_WIDGET_SETTINGS` plus `normalizeWidgetSettings`/`isLegacyGreeting` — normalization helpers that rewrite old stored brand names/greetings (from a prior product name) forward to the current default on read. **If the product name or default greeting changes again, extend these regex/string checks rather than replacing them**, so organizations still holding old stored values get migrated forward instead of stuck displaying a stale brand.

## Frontend conventions

Both apps use a `modules/<feature>/{atoms.ts, constants.ts, hooks/, ui/{views,components,layouts,screens}}` layout (not every module has every subfolder — `ui/layouts` is web-only, `ui/screens` is widget-only). Route files under `app/` stay thin — they render a view from `modules/`. Shared UI is imported as `@workspace/ui/components/*`; backend types as `@workspace/backend/_generated/dataModel` (mapped in each app's `tsconfig.json` to `packages/backend/convex/*`).

- **State**: Jotai. Cross-screen widget state (current screen, org id, contact session, conversation id, widget settings) lives in `apps/widget/modules/widget/atoms/widget-atoms.ts`. The contact session is persisted per-org via `atomWithStorage` + `atomFamily` — one localStorage key per organization, so a widget embedded for two orgs keeps separate identities.
- **Widget flow**: `screenAtom` is a state machine over the `WIDGET_SCREENS` tuple (`error, loading, selection, voice, auth, inbox, chat, contact`), rendered via an object-literal map keyed by screen name in `widget-view.tsx` (not a switch statement). Adding a screen means extending the tuple and adding a key to that map. The `contact` screen is declared but unreachable (renders a TODO placeholder).
- **Providers**: web wraps `ConvexProviderWithClerk`; widget wraps bare `ConvexProvider` + Jotai `Provider` — do not add Clerk to the widget.
- **Auth gating** in web is layered: `middleware.ts` (Clerk, redirects org-less users to `/org-selection`) plus `auth-guard.tsx` / `organization-guard.tsx` components in layouts.
- `apps/web` has Sentry (`next.config.mjs` wrapper, `instrumentation*.ts`, `sentry.*.config.ts`); `apps/widget` does not.
- Tailwind v4, config-less: theme lives in `packages/ui/src/styles/globals.css`. Apps must keep `transpilePackages: ["@workspace/ui"]`.
- Deployment-wide brand fallbacks (used when an org has no `widgetSettings` row, and for dashboard-side chrome that isn't per-organization) live in `packages/ui/src/brand.ts`, sourced from `NEXT_PUBLIC_BRAND_*` env vars with hardcoded defaults.

## Environment

Secrets live in two distinct places, and the split matters:

**Convex deployment** (`npx convex env set …` from `packages/backend` — *not* a `.env` file the apps read): `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `VAPI_KB_TOOL_SECRET` (required for the voice knowledge-search webhook), and optionally `VAPI_PUBLIC_API_KEY` / `VAPI_PRIVATE_API_KEY` (deployment-wide fallback for orgs with no plugin row).

**App `.env.local`**: `apps/web` needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`; `apps/widget` needs `NEXT_PUBLIC_CONVEX_URL` plus `NEXT_PUBLIC_VAPI_PUBLIC_KEY`/`NEXT_PUBLIC_VAPI_ASSISTANT_ID` for voice. Both apps also accept optional `NEXT_PUBLIC_BRAND_*` overrides. `apps/web/components/providers.tsx` throws at import time if `NEXT_PUBLIC_CONVEX_URL` is missing; `apps/widget/components/providers.tsx` fails **silently** on the same condition (constructs the Convex client with an empty string) — a blank/broken widget with no console error usually means this.

The dev deployment is **local** (Convex beta local deployments), so `NEXT_PUBLIC_CONVEX_URL` is `http://127.0.0.1:3210` and the backend only exists while `convex dev` is running — the apps cannot reach Convex unless `pnpm dev` (or a standalone `convex dev`) is up. `packages/backend/.env.local` holds `CONVEX_DEPLOYMENT` and is generated by the CLI.

Convex env vars are stored in the deployment, not the repo. A fresh local deployment starts empty, so they must be re-set after `npx convex dev --configure new`. See `docs/ENVIRONMENT.md` for the complete reference.

## Renaming/rebranding conventions

The product has been renamed before (an earlier name to "UVTR Checkin") and may be renamed again as it evolves toward the hotel AI booking product described in `docs/uvtr-hotel-os-technical-review.md`. When renaming:
- Update `packages/ui/src/brand.ts` and `packages/backend/convex/lib/widgetSettings.ts`'s `DEFAULT_WIDGET_SETTINGS`, and **extend** (don't replace) `isLegacyGreeting`/`normalizeWidgetSettings`'s pattern matching to also catch the outgoing name, so existing stored `widgetSettings` rows migrate forward instead of displaying a stale brand.
- Do the same for the duplicated legacy-greeting filter in `apps/widget/modules/widget/ui/screens/widget-chat-screen.tsx` (hides stale greeting messages from already-seeded threads).
- Update both `.env.example` files' `NEXT_PUBLIC_BRAND_NAME`/`NEXT_PUBLIC_BRAND_GREETING` sample values.
- Leave `@workspace/*` package names, directory names (`apps/web`, `apps/widget`), and localStorage key literals (e.g. `echo-status-filter`, `echo_contact_session`) alone unless a rename is explicitly requested — they're internal identifiers, not user-visible branding, and `docs/WHITE_LABELING.md` documents why changing the storage keys is a breaking change for existing sessions.
