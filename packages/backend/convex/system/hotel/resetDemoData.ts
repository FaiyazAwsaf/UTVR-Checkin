import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

// One-off dev/demo utility: wipes all hotel-related rows for an org so the
// seed script can be re-run cleanly (e.g. after re-seeding in a different
// language). Not part of the booking flow — never called from a tool/agent.
export const resetDemoData = internalMutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const row of bookings) {
      await ctx.db.delete(row._id);
    }

    const roomHolds = await ctx.db
      .query("roomHolds")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const row of roomHolds) {
      await ctx.db.delete(row._id);
    }

    const waitlistEntries = await ctx.db
      .query("waitlistEntries")
      .collect();
    for (const row of waitlistEntries) {
      if (row.organizationId === args.organizationId) {
        await ctx.db.delete(row._id);
      }
    }

    const packageAddOns = await ctx.db
      .query("packageAddOns")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const row of packageAddOns) {
      await ctx.db.delete(row._id);
    }

    const roomTypes = await ctx.db
      .query("roomTypes")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const row of roomTypes) {
      await ctx.db.delete(row._id);
    }

    const hotelProfiles = await ctx.db
      .query("hotelProfiles")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const row of hotelProfiles) {
      await ctx.db.delete(row._id);
    }

    return {
      bookings: bookings.length,
      roomHolds: roomHolds.length,
      waitlistEntries: waitlistEntries.length,
      packageAddOns: packageAddOns.length,
      roomTypes: roomTypes.length,
      hotelProfiles: hotelProfiles.length,
    };
  },
});
