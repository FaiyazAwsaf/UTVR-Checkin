import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { normalizeWidgetSettings } from "../lib/widgetSettings";

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const isAllowedLogoUrl = (value: string) =>
  (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("https://");

const getOrganizationId = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const organizationId = identity.org_id as string;

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return organizationId;
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);

    const settings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();

    return settings ? normalizeWidgetSettings(settings) : null;
  },
});

export const upsert = mutation({
  args: {
    brandName: v.string(),
    logoUrl: v.string(),
    primaryColor: v.string(),
    greeting: v.string(),
    assistantName: v.string(),
    suggestions: v.array(v.string()),
    showAttribution: v.boolean(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    const brandName = args.brandName.trim();
    const logoUrl = args.logoUrl.trim();
    const greeting = args.greeting.trim();
    const assistantName = args.assistantName.trim();
    const suggestions = args.suggestions
      .map((suggestion) => suggestion.trim())
      .filter(Boolean);

    if (!brandName || !greeting || !assistantName) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Brand name, greeting, and assistant name are required",
      });
    }

    if (!isHexColor(args.primaryColor)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Primary color must be a six-digit hex color",
      });
    }

    if (!isAllowedLogoUrl(logoUrl)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Logo URL must be a relative path or use https",
      });
    }

    if (suggestions.length > 4 || suggestions.some((suggestion) => suggestion.length > 120)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Use up to four suggestions of 120 characters or fewer",
      });
    }

    const existingSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();

    const settings = {
      organizationId,
      brandName,
      logoUrl,
      primaryColor: args.primaryColor,
      greeting,
      assistantName,
      suggestions,
      showAttribution: args.showAttribution,
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, settings);
      return existingSettings._id;
    }

    return await ctx.db.insert("widgetSettings", settings);
  },
});
