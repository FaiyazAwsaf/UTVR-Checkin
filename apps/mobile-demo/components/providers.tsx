"use client"

import * as React from "react"
import { Provider } from "jotai";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// See apps/widget/components/providers.tsx for why this isn't "" —
// an empty string crashes `next build`'s static prerendering of /_not-found.
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
