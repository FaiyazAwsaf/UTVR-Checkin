# Environment Variables — Complete Reference

> Every key needed to run UVTR Checkin, derived from a full scan of `process.env` usage plus the SDKs that read env implicitly. Companion to [`docs/INDEX.md`](./INDEX.md).

**The critical thing to understand:** secrets live in **two unrelated places**. App keys go in `.env.local` files that Next.js reads at build/runtime. Backend keys go **into the Convex deployment itself** via `npx convex env set` — they are _not_ read from any file, and `packages/backend/.env.local` does **not** hold them.

---

## 1. `apps/web/.env.local` — operator dashboard

Copy from `apps/web/.env.example` and fill in.

| Key                                 | Required | Value / where to get it                                                                                                                                                                       |
| ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | **Yes**  | `http://127.0.0.1:3210` for local dev; the `https://<name>.convex.cloud` URL for a cloud deployment. Printed by `convex dev`, also mirrored in `packages/backend/.env.local` as `CONVEX_URL`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes**  | Clerk Dashboard → API Keys → Publishable key (`pk_test_…` / `pk_live_…`). Read implicitly by `ClerkProvider` and `clerkMiddleware`.                                                           |
| `CLERK_SECRET_KEY`                  | **Yes**  | Clerk Dashboard → API Keys → Secret key (`sk_test_…` / `sk_live_…`). Server-side only.                                                                                                        |
| `NEXT_PUBLIC_WIDGET_URL`            | No       | Public URL of the widget host, used to generate the iframe snippet on `/customization`. Defaults to `http://localhost:3001`.                                                                 |
| `NEXT_PUBLIC_BRAND_NAME`            | No       | Deployment-wide dashboard and widget fallback name (read by `packages/ui/src/brand.ts`). Defaults to `UVTR Checkin`; per-organization `widgetSettings` take precedence in the widget.          |
| `NEXT_PUBLIC_BRAND_PRIMARY_COLOR`   | No       | Deployment-wide fallback hex color. Defaults to `#2563eb`.                                                                                                                                     |
| `NEXT_PUBLIC_BRAND_GRADIENT_COLOR`  | No       | Deployment-wide fallback gradient end color. Defaults to `#1d4ed8`.                                                                                                                           |
| `NEXT_PUBLIC_BRAND_GREETING`        | No       | Deployment-wide fallback widget greeting.                                                                                                                                                     |

`apps/web/components/providers.tsx` **throws at import time** if `NEXT_PUBLIC_CONVEX_URL` is missing — a blank page with a console error means this key.

Optional: `NEXT_PUBLIC_SENTRY_DSN` configures runtime Sentry reporting. `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are only needed for source-map upload on build; without them the build continues without uploading.

## 2. `apps/widget/.env.local` — chat + voice widget

Copy from `apps/widget/.env.example` and fill in.

| Key                             | Required          | Value                                                                  |
| -------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`        | **Yes**            | Same value as the web app.                                             |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY`   | **Yes for voice**  | Vapi public key used by the browser voice client.                      |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | **Yes for voice**  | The Vapi assistant that has the `search_knowledge_base` tool attached. |
| `NEXT_PUBLIC_BRAND_NAME`        | No                 | Deployment-wide fallback name (same as web's).                        |
| `NEXT_PUBLIC_BRAND_PRIMARY_COLOR` | No               | Deployment-wide fallback hex color.                                    |
| `NEXT_PUBLIC_BRAND_GRADIENT_COLOR` | No              | Deployment-wide fallback gradient end color.                           |
| `NEXT_PUBLIC_BRAND_GREETING`    | No                 | Deployment-wide fallback widget greeting.                              |

This app has **no Clerk keys by design** — end-customer identity is a `contactSessions` row keyed by the `?organizationId=` URL parameter. ⚠️ Unlike the web app, a missing `NEXT_PUBLIC_CONVEX_URL` here fails **silently** — `apps/widget/components/providers.tsx` constructs the Convex client with an empty string rather than throwing, so a broken/unresponsive widget with no console error usually means this key is missing.

## 3. `packages/backend/.env.local` — **auto-generated, do not hand-edit**

Written by the Convex CLI on `convex dev`. Contains `CONVEX_DEPLOYMENT` (e.g. `local:…` or `dev:…`) and `CONVEX_URL`. If it's missing, run `pnpm --filter @workspace/backend setup`. There is no `.env.example` for this package — Convex deployment env vars are managed entirely via `npx convex env set` / the Convex dashboard, never a local file.

## 4. Convex deployment env — set with `npx convex env set`

These are stored **in the deployment**, not in the repo. A fresh deployment starts empty, so they must be re-set after `npx convex dev --configure new`. Run from `packages/backend/` with `convex dev` running:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-subdomain>.clerk.accounts.dev
npx convex env set CLERK_SECRET_KEY        sk_test_xxx
npx convex env set OPENAI_API_KEY          sk-proj-xxx
npx convex env set VAPI_KB_TOOL_SECRET     xxx
# optional — dev-wide Vapi fallback for orgs with no plugin row
npx convex env set VAPI_PUBLIC_API_KEY     xxx
npx convex env set VAPI_PRIVATE_API_KEY    xxx
```

| Key                       | Required                 | Used by                            | Notes                                                                                                                                                                      |
| -------------------------- | ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN` | **Yes**                  | `convex/auth.config.ts`            | The **Issuer** URL from your Clerk JWT template named `convex`. Without it every authenticated dashboard function fails — there is no guard, `domain` is just `undefined`. |
| `CLERK_SECRET_KEY`        | **Yes**                  | `convex/public/organizations.ts`   | Same value as the web app's. Falls back to `""`, so the failure appears only when the widget validates an org.                                                             |
| `OPENAI_API_KEY`          | **Yes**                  | agent, RAG, tools, file extraction | Read implicitly by `@ai-sdk/openai` (never referenced by an explicit `process.env` literal in this codebase, but required by every `openai(...)`/`openai.chat(...)`/`openai.embedding(...)` call). Without it: no AI replies, no embeddings, no file uploads. Needs access to `gpt-4o-mini`, `gpt-4o`, and `text-embedding-3-small`.     |
| `VAPI_KB_TOOL_SECRET`     | **Yes for voice bridge** | `convex/http.ts`                   | Shared secret Vapi must send when calling the `/vapi/knowledge-search` HTTP action (as `Authorization: Bearer <secret>`, `x-vapi-tool-secret`, or `x-vapi-secret`). Keep it out of app `.env.local` files.                                                              |
| `VAPI_PUBLIC_API_KEY`     | No                       | `convex/lib/secrets.ts`            | Deployment-wide fallback used only when an org has no `plugins` row.                                                                                                       |
| `VAPI_PRIVATE_API_KEY`    | No                       | `convex/lib/secrets.ts`            | Both Vapi keys must be present together or the fallback is ignored.                                                                                                       |

Verify with `npx convex env list` (requires the deployment to be running).

---

## 5. Clerk dashboard prerequisites (not env vars, but required)

1. **JWT template named exactly `convex`** — Clerk → JWT Templates → New → Convex. Its Issuer URL is `CLERK_JWT_ISSUER_DOMAIN`. `auth.config.ts` pins `applicationID: "convex"`.
2. **Organizations enabled** — Clerk → Organizations → Enable. The dashboard hard-requires an org context; `middleware.ts` redirects org-less users to `/org-selection`.

## 6. From zero to running

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local          # fill in Clerk keys
cp apps/widget/.env.example apps/widget/.env.local
pnpm --filter @workspace/backend setup                # provisions Convex, writes its .env.local
# then, from packages/backend, set the deployment vars listed in §4
pnpm dev                                              # both apps + convex dev
```

Web on :3000, widget on :3001 (open it as `http://localhost:3001/?organizationId=<clerkOrgId>`). The local Convex deployment only exists while `convex dev` runs — the apps cannot reach the backend without it.

## 7. Failure symptom → missing key

| Symptom                                                      | Cause                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Web app blank, console throws about `NEXT_PUBLIC_CONVEX_URL` | Missing in `apps/web/.env.local`                                                                                           |
| Widget stuck/silent, requests go nowhere                     | Missing `NEXT_PUBLIC_CONVEX_URL` in `apps/widget/.env.local` (fails silently, no console error)                            |
| Signed in, but every dashboard query is unauthorized         | `CLERK_JWT_ISSUER_DOMAIN` unset in the **deployment**, or no JWT template named `convex`                                   |
| Widget shows "Unable to verify organization"                 | `CLERK_SECRET_KEY` unset in the deployment (or a genuinely invalid org id)                                                 |
| Chat sends but the AI never replies; uploads fail            | `OPENAI_API_KEY` unset in the deployment                                                                                   |
| Vapi page: "Credentials incomplete" / "Plugin not found"     | No plugin row for the org and no `VAPI_*` fallback pair set                                                                |
| Voice call connects but does not answer from files           | The assistant is missing the `search_knowledge_base` tool, its tool credential (`VAPI_KB_TOOL_SECRET`), or the static `contactSessionId` parameter — see `docs/VAPI_BANGLA_PROMPT.md` for the exact checklist |
| `Local backend isn't running` from a convex command          | `convex dev` isn't running                                                                                                 |
