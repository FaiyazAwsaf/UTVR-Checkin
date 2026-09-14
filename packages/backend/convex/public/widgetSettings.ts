import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import {
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from "../lib/widgetSettings";

export const get = query({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (session.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization mismatch",
      });
    }

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (!settings) {
      return DEFAULT_WIDGET_SETTINGS;
    }

    return normalizeWidgetSettings({
      brandName: settings.brandName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      greeting: settings.greeting,
      assistantName: settings.assistantName,
      suggestions: settings.suggestions,
      showAttribution: settings.showAttribution,
    });
  },
});
