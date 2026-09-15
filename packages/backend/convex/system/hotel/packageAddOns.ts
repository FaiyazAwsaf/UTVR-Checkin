import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

export const getManyByOrganization = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const packages = await ctx.db
      .query("packageAddOns")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    return packages.filter((pkg) => pkg.isActive);
  },
});

export const getManyByIds = internalQuery({
  args: {
    packageAddOnIds: v.array(v.id("packageAddOns")),
  },
  handler: async (ctx, args) => {
    const packages = await Promise.all(
      args.packageAddOnIds.map((id) => ctx.db.get(id)),
    );

    return packages.filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);
  },
});
