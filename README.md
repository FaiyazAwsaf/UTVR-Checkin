# UVTR Checkin

UVTR Checkin is an AI customer-support platform. Operators manage an inbox and knowledge base in a dashboard; end customers chat with a RAG-backed AI agent through an embeddable widget that can escalate to a human. Two Next.js apps share one Convex backend. Multi-tenant, keyed on Clerk organizations.

---

Working: auth and org gating, conversation inbox, live chat with the RAG agent, shared Convex-RAG answers for text and Vapi voice, escalate/resolve, knowledge-base upload and search, Vapi credential storage and assistant listing, per-organization widget branding, and embed-code generation.

Not yet built: provider-agnostic voice adapters, and the `/integrations` and `/billing` pages. `docs/INDEX.md` §7 and §9 detail the remaining gaps, and §9 lists security findings that should be addressed before any public deployment.
