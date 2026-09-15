"use client"

import * as React from "react"
import { Provider } from "jotai";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Falls back to a syntactically valid placeholder (never a live backend)
// instead of "" — an empty string makes ConvexReactClient throw "Provided
// address was not an absolute URL", which crashes static prerendering of
// pages like /_not-found during `next build` (e.g. a fresh Vercel project
// with NEXT_PUBLIC_CONVEX_URL not yet configured). The widget still fails
// silently at runtime as documented, since this placeholder can't reach a
// real deployment.
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud",
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <Provider>
        {children}
      </Provider>
    </ConvexProvider>
  );
};
