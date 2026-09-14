# White-Labeling & Branding Guide

> How to rebrand UVTR Checkin — instantly for a one-off skin, or properly via a brand-config layer. Companion to [`docs/INDEX.md`](./INDEX.md). Every touchpoint below was verified by a full-tree scan (2026-08-30); line numbers may drift, symbols won't.
>
> **Headline:** the brand surface is thin. There is exactly **one** user-visible "UVTR Checkin" string, **no** `metadata` exports (both apps ship the Next.js default tab title), one logo SVG duplicated across both apps, and a brand blue that appears as **four independent, untokenized copies** (`oklch(0.6231 0.188 259.8145)` in the theme, `#0b63f3` in gradients ×5 sites, `#377FF6` inside `logo.svg`, plus stock Clerk blue). Retint those and you've rebranded 90% of the product.

---

## 1. The 15-minute rebrand (ordered by leverage)

Do these in order; each step lists every file.

### Step 1 — Theme tokens (`packages/ui/src/styles/globals.css`)
One file themes both apps (config-less Tailwind v4; 32 OKLCH color tokens × light/dark + radius/shadows/fonts).

- Retint the 4 brand tokens — identical value `oklch(0.6231 0.188 259.8145)`: `--primary` (L17), `--ring` (L29), `--sidebar-primary` (L37), `--sidebar-ring` (L42), and their `.dark` twins (L70, L82, L90, L95).
- Regenerate the derived blues: `--chart-1..5` (L30–34, L83–87 — a monochrome ramp off the same hue) and dark `--accent`/`--sidebar-accent` (L76, L92 = `oklch(0.3791 0.1378 265.5222)`).
- **Fix the pre-existing bug while there:** L20 `--secondary-foreground: oklch(...) a;` — the trailing ` a` invalidates the declaration in light mode.
- Radius: single source `--radius: 0.475rem` (L46). Body baseline is `font-weight: 500` (L181) — a deliberate typographic choice; keep or change consciously.

### Step 2 — Hoist and retint the hardcoded gradient hex
`#0b63f3` is pasted in **5 places, 3 files** and does not track `--primary`. Add a token (e.g. `--brand-gradient-to`) in `globals.css` + `@theme inline`, then replace:

| File | Lines |
|---|---|
| `apps/widget/modules/widget/ui/components/widget-header.tsx` | 12 (`from-primary to-[#0b63f3]` — the widget's signature gradient) |
| `packages/ui/src/components/ai/message.tsx` | 33 (user chat bubbles — customer-facing) |
| `apps/web/modules/dashboard/ui/components/dashboard-sidebar.tsx` | 117, 143, 169 (active nav item, 3× verbatim) |

### Step 3 — Logo + favicon (4 files, 2 byte-identical pairs)
- `apps/web/public/logo.svg` and `apps/widget/public/logo.svg` — identical; replace **both**. Note the SVG hardcodes `fill="#377FF6"` (a 4th copy of the old blue) and `id="logo-52"`.
- `apps/web/app/favicon.ico` and `apps/widget/app/favicon.ico` — identical; replace both.
- Logo consumers (no changes needed if you keep the filename): `conversations-view.tsx:7` (dashboard empty state), `plugin-card.tsx:44` ("your platform" side of the integration graphic), `widget-chat-screen.tsx:147` — **the AI assistant's avatar in the customer widget**.

### Step 4 — The wordmark
`apps/web/modules/dashboard/ui/views/conversations-view.tsx:8` — the dashboard wordmark. **The only visible brand name in the product.**

### Step 5 — Add page metadata (currently absent, not editable)
Neither `apps/web/app/layout.tsx` nor `apps/widget/app/layout.tsx` exports `metadata` — tabs show the Next.js default. Add to both:
```ts
export const metadata: Metadata = {
  title: { default: "YourBrand", template: "%s · YourBrand" },
  description: "…",
};
```
There is also no manifest, OG image, robots, or sitemap anywhere — add if shipping publicly.

### Step 6 — AI persona & tone (`packages/backend/convex/system/ai/constants.ts`)
No brand name is embedded (good), but the persona/voice is the brand customers actually talk to:
- `SUPPORT_AGENT_PROMPT` L5 ("You are a friendly, knowledgeable AI support assistant") + Style & Tone block L41–46.
- `SEARCH_INTERPRETER_PROMPT` L95–101 and `OPERATOR_MESSAGE_ENHANCEMENT_PROMPT` L145–152 contain **fictional few-shot pricing ("$29.99/month", "Professional plan")** — replace with your product's real examples or neutral ones, or the model may echo fake plans at customers.
- The greeting `"Hello, how can I help you today?"` is hardcoded in `packages/backend/convex/public/conversations.ts` (thread seed), and the "Hi there! 👋 / Let's get you started" block is **duplicated 3×** in the widget (`widget-auth-screen.tsx:77`, `widget-selection-screen.tsx:58`, `widget-loading-screen.tsx:108`).

### Step 7 — Clerk surfaces (stock Clerk blue today)
`ClerkProvider` (`apps/web/app/layout.tsx:28`) has **no `appearance` prop**. Add:
```tsx
<ClerkProvider appearance={{ variables: { colorPrimary: "<brand>" }, layout: { logoImageUrl: "/logo.svg" } }}>
```
Sign-in/sign-up/org-selection views are bare Clerk components; `auth-layout.tsx` is an empty centering div — the natural place for a wordmark above the Clerk card. (Only `dashboard-sidebar.tsx:89–98, 189–197` currently themes Clerk elements.)

### Step 8 — Fonts (two edit sites + one dead block)
Both `layout.tsx` files load **Geist / Geist_Mono** via `next/font` and inject `--font-sans`/`--font-mono`, which **overrides** the `globals.css` font declarations (L43–45 claim Inter/JetBrains Mono — inert, never fetched). To change fonts: edit both layout files; keep `globals.css` in agreement to avoid confusion.

### Step 9 — Copy sweep (dashboard)
`dashboard-sidebar.tsx`: nav labels L32–67 incl. **"Knowldge Base" typo (L37, ships to users)**; group labels L108/134/160. `(dashboard)/page.tsx:13` renders literal "apps/web" (template debris). Delete Sentry demo scaffolding: `app/sentry-example-page/`, `app/api/sentry-example-api/`. Rewrite `README.md` (still shadcn template boilerplate).

### Step 10 — Infra identifiers (deploy-time, not visual)
- Sentry: `org: "enra-doo-o7"`, `project: "echo-tutorial"` in `next.config.mjs:12–13`; **DSN hardcoded in 3 files** (`instrumentation-client.ts:8`, `sentry.server.config.ts:8`, `sentry.edge.config.ts:9`) — move to `NEXT_PUBLIC_SENTRY_DSN`.
- Storage keys (brand-derived, **breaking**): `echo_contact_session` (`apps/widget/modules/widget/constants.ts:12` — renaming logs out every widget visitor) and `echo-status-filter` (`apps/web/modules/dashboard/constants.ts:1`). Either keep them, or migrate (read-old-write-new).
- Package names (`shadcn-ui-monorepo`, `@workspace/*`) are internal-only; renaming the scope touches every import — skip unless required.

---

## 2. Secondary palette details (non-blue brand colors)

`packages/ui/src/components/button.tsx` custom variants: `tertiary` green gradient `from-[#3FB62F] to-[#318d25]` (L24, = "resolved"), `warning` `from-yellow-500 to-[#be8b00]` (L25), `transparent` (L23, widget header buttons). `conversation-status-icon.tsx`: resolved `bg-[#3FB62F]` (L12), escalated `bg-yellow-500`, unresolved `bg-destructive`. These status colors appear in both the dashboard and (via buttons) the widget — retint alongside Step 2 if your palette clashes with the green/yellow.

**Avatars:** `packages/ui/src/components/dicebear-avatar.tsx` — the DiceBear `glass` style (L3) is a brand choice; swap the collection import to restyle every generated avatar. `imageUrl` prop short-circuits generation (how `/logo.svg` becomes the assistant avatar).

---

## 3. "Powered by" attribution

Does not exist anywhere. If your white-label tiers need an optional attribution mark, build it into `apps/widget/modules/widget/ui/components/widget-footer.tsx` (currently just Home/Inbox tabs) and gate it on the future widget-settings record (below).

---

## 4. Making it *instant*: the brand-config layer (recommended architecture)

Today every brand value is a hardcoded literal — a rebrand is an edit-and-redeploy. Two tiers of "instant":

### Tier A — single-brand deployment config (hours of work)
Create `packages/ui/src/brand.ts` (or JSON) as the single source:
```ts
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "UVTR Checkin",
  logo: "/logo.svg",
  colors: { primary: "…", gradientTo: "…" },   // consumed by a small CSS-var injector
  greeting: "Hi there! 👋",
  assistantPersona: "friendly, knowledgeable AI support assistant",
};
```
Point every touchpoint from §1 at it (the wordmark, metadata, greeting ×3, Clerk `colorPrimary`, gradient token). Now a rebrand = one file + two logo/favicon swaps + redeploy. This is the right scope if each white-label customer gets their own deployment.

### Tier B — per-organization runtime branding (the SaaS way)
Since the widget already boots per-org (`?organizationId=`), brand can be **data, not code**:
1. New Convex table `widgetSettings` (`organizationId`, `brandName`, `logoUrl`, `primaryColor`, `greeting`, `suggestions`, `showAttribution`, …) with `by_organization_id` — follow the `private/` recipe in INDEX.md §4.5 for the write path, plus a session-gated `public/widgetSettings.get` for the widget.
2. Widget boot: the loading screen's declared-but-unused `"settings"` InitStep (`widget-loading-screen.tsx`, `InitStep` union) is the designed insertion point — fetch settings there into a `widgetSettingsAtom`.
3. Apply at runtime: set CSS variables on the widget root (`<main style={{ "--primary": settings.primaryColor }}>` — the whole theme already reads CSS vars, so this Just Works), render `settings.logoUrl` as the avatar, `settings.greeting` in the 3 greeting blocks, and pass the greeting into `public/conversations.create` (replacing the hardcoded thread seed — the TODO comment there already says "from widget settings").
4. The operator UI for all of this is the `/customization` dashboard page — currently a stub that both the sidebar and the Vapi connected-view "Configure" button already link to.

Tier B makes the **widget** per-customer instantly; the dashboard itself usually stays your master brand (Tier A).

---

## 5. Rebrand verification checklist

```bash
pnpm --filter web typecheck && pnpm --filter widget typecheck && pnpm lint
grep -rn --include='*.tsx' --include='*.ts' -e 'UVTR Checkin' -e '#0b63f3' -e '#377FF6' apps packages --exclude-dir=node_modules --exclude-dir=.next
```
Then eyeball: dashboard sidebar active-item gradient, widget header gradient, user chat bubble, sign-in page (Clerk primary), browser tab titles, assistant avatar in the widget, status buttons (resolved/escalated), generated avatars, and one full chat round-trip to hear the AI's tone.
