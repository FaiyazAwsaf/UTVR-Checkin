# UVTR Checkin

UVTR Checkin is an AI customer-support platform. Operators manage an inbox and knowledge base in a dashboard; end customers chat with a RAG-backed AI agent through an embeddable widget that can escalate to a human. Two Next.js apps share one Convex backend. Multi-tenant, keyed on Clerk organizations.

---

## 📍 Start here (humans and coding agents)

**Read [`docs/INDEX.md`](./docs/INDEX.md) before exploring the codebase.** It is a complete, pre-built index of this repository — maintained specifically so you do not need to re-scan the code to answer questions or plan a change.

| Doc                                                      | What it covers                                                                                                                                                                                                                                                                          | Read it when                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **[`docs/INDEX.md`](./docs/INDEX.md)**                   | Architecture and end-to-end data flow · every Convex function (args, auth, quirks) · schema, tables, indexes · both apps' routes, modules, state · AI agent, RAG, prompts, tools · voice/Vapi status and gaps · known bugs and security findings · recipes for writing custom functions | **Any** code question or change. This is the map.      |
| **[`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md)**       | Every env key for both apps and the Convex deployment · Clerk prerequisites · zero-to-running steps · symptom→missing-key table                                                                                                                                                         | Setting up, or debugging a "nothing works" failure     |
| **[`docs/WHITE_LABELING.md`](./docs/WHITE_LABELING.md)** | Every brand touchpoint with file paths · ordered rebrand checklist · theme token structure · per-org runtime branding architecture                                                                                                                                                      | Rebranding, theming, or white-labeling                 |
| **[`CLAUDE.md`](./CLAUDE.md)**                           | Conventions that must be preserved (backend trust-level directories, frontend module layout, env split)                                                                                                                                                                                 | Before writing code — these are rules, not suggestions |

**Suggested agent workflow:** read `CLAUDE.md` for the rules → search `docs/INDEX.md` for the subsystem you're touching → open only the files it points you to. The index has a Q&A section (§10) covering the questions that come up most often. If you change code that the index describes, update the corresponding section in the same commit.

Note: `docs/INDEX.md` cites line numbers. Trust file paths and symbol names over exact line numbers — the latter drift.

---

## Layout

```
apps/web         Operator dashboard  — Next.js 15, port 3000, Clerk auth (org required)
apps/widget      Customer chat widget — Next.js 15, port 3001, no Clerk (contactSessions)
packages/backend Convex deployment    — schema, functions, AI agent, RAG  (@workspace/backend)
packages/ui      Shared shadcn/ui + Tailwind v4 theme                     (@workspace/ui)
packages/math    Dead template scaffolding — unused
```

The widget is embedded as a URL: `https://<widget-host>/?organizationId=<clerkOrgId>`.

## Quick start

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local        # fill in Clerk keys
cp apps/widget/.env.example apps/widget/.env.local
pnpm --filter @workspace/backend setup              # first run only: provisions the Convex deployment
# then set the Convex deployment vars — see docs/ENVIRONMENT.md §4
pnpm dev                                            # both apps + convex dev
```

Requires Node >= 20 and pnpm 10. The dev Convex deployment is **local** — the apps cannot reach the backend unless `convex dev` is running. Environment variables live in two unrelated places: app `.env.local` files, and the **Convex deployment itself** (set with `npx convex env set`, not read from any file). **[`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) is the complete reference**, including the Clerk prerequisites (a JWT template named `convex`, organizations enabled).

## Commands

```bash
pnpm dev | pnpm build | pnpm lint | pnpm format
pnpm --filter web dev                 # single app
pnpm --filter web typecheck           # tsc --noEmit — NOT wired into turbo, run manually
pnpm dlx shadcn@latest add button -c apps/web   # components land in packages/ui/src/components
```

**There is no test framework.** Typecheck and lint are the only verification gates — run typecheck in both apps after changing anything that crosses the app/backend boundary, since Convex `_generated` types flow into them.

## Status

Working: auth and org gating, conversation inbox, live chat with the RAG agent, shared Convex-RAG answers for text and Vapi voice, escalate/resolve, knowledge-base upload and search, Vapi credential storage and assistant listing, per-organization widget branding, and embed-code generation.

Not yet built: provider-agnostic voice adapters, and the `/integrations` and `/billing` pages. `docs/INDEX.md` §7 and §9 detail the remaining gaps, and §9 lists security findings that should be addressed before any public deployment.
