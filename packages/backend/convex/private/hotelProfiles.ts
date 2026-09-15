import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";

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

    return await ctx.db
      .query("hotelProfiles")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    address: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
    currency: v.string(),
    amenities: v.array(v.string()),
    policies: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const name = args.name.trim();
    const description = args.description.trim();
    const address = args.address.trim();
    const checkInTime = args.checkInTime.trim();
    const checkOutTime = args.checkOutTime.trim();
    const currency = args.currency.trim();
    const amenities = args.amenities
      .map((amenity) => amenity.trim())
      .filter(Boolean);
    const policies = args.policies?.trim() || undefined;

    if (!name || !address || !checkInTime || !checkOutTime || !currency) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Name, address, check-in/out time, and currency are required",
      });
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Check-in/out time must be in HH:MM (24-hour) format",
      });
    }

    const existing = await ctx.db
      .query("hotelProfiles")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .unique();

    const profile = {
      organizationId,
      name,
      description,
      address,
      checkInTime,
      checkOutTime,
      currency,
      amenities,
      policies,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profile);
      return existing._id;
    }

    return await ctx.db.insert("hotelProfiles", profile);
  },
});
