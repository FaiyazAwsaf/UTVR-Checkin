import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

export const getById = internalQuery({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomTypeId);
  },
});

export const getManyByOrganization = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roomTypes")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();
  },
});

export const getByOrganizationAndName = internalQuery({
  args: {
    organizationId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const roomTypes = await ctx.db
      .query("roomTypes")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();

    const target = args.name.trim().toLowerCase();

    const exact = roomTypes.find(
      (roomType) => roomType.name.toLowerCase() === target,
    );

    if (exact) {
      return exact;
    }

    const partial = roomTypes.find(
      (roomType) =>
        roomType.name.toLowerCase().includes(target) ||
        target.includes(roomType.name.toLowerCase()),
    );

    return partial ?? null;
  },
});
