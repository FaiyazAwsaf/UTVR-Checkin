import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const vapiCredentialsValidator = v.object({
  publicApiKey: v.string(),
  privateApiKey: v.string(),
});

export const upsert = internalMutation({
  args: {
    service: v.union(v.literal("vapi")),
    credentials: vapiCredentialsValidator,
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", args.service),
      )
      .unique();

    if (existingPlugin) {
      await ctx.db.patch(existingPlugin._id, {
        service: args.service,
        credentials: args.credentials,
      });
    } else {
      await ctx.db.insert("plugins", {
        organizationId: args.organizationId,
        service: args.service,
        credentials: args.credentials,
      });
    }
  },
});

export const getByOrganizationIdAndService = internalQuery({
  args: {
    organizationId: v.string(),
    service: v.union(v.literal("vapi")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", args.organizationId).eq("service", args.service),
      )
      .unique();
  },
});
