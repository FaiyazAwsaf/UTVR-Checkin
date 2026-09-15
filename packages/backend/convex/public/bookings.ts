import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";

export const getLatestForSession = query({
  args: {
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

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId),
      )
      .order("desc")
      .first();

    if (!booking) {
      return null;
    }

    const roomType = await ctx.db.get(booking.roomTypeId);

    return {
      ...booking,
      roomTypeName: roomType?.name ?? "Unknown room",
    };
  },
});

export const getByConfirmationCode = query({
  args: {
    contactSessionId: v.id("contactSessions"),
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_confirmation_code", (q) =>
        q.eq("confirmationCode", args.confirmationCode),
      )
      .unique();

    if (!booking || booking.contactSessionId !== args.contactSessionId) {
      return null;
    }

    const roomType = await ctx.db.get(booking.roomTypeId);

    return {
      ...booking,
      roomTypeName: roomType?.name ?? "Unknown room",
    };
  },
});
