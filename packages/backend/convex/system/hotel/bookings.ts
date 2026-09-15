import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { generateConfirmationCode } from "../../lib/hotel/confirmationCode";

export const create = internalMutation({
  args: {
    holdId: v.id("roomHolds"),
    guestName: v.string(),
    guestEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const hold = await ctx.db.get(args.holdId);

    if (!hold || hold.status !== "active") {
      return { ok: false as const, reason: "hold_not_active" as const };
    }

    if (hold.scheduledReleaseJobId) {
      await ctx.scheduler.cancel(
        hold.scheduledReleaseJobId as Id<"_scheduled_functions">,
      );
    }

    const confirmationCode = generateConfirmationCode();

    const bookingId = await ctx.db.insert("bookings", {
      organizationId: hold.organizationId,
      roomTypeId: hold.roomTypeId,
      conversationId: hold.conversationId,
      contactSessionId: hold.contactSessionId,
      sourceHoldId: hold._id,
      confirmationCode,
      checkInDate: hold.checkInDate,
      checkOutDate: hold.checkOutDate,
      partySize: hold.partySize,
      selectedPackageIds: hold.selectedPackageIds,
      totalPrice: hold.quotedTotalPrice,
      guestName: args.guestName,
      guestEmail: args.guestEmail,
      channel: hold.channel,
      status: "confirmed",
    });

    await ctx.db.patch(hold._id, { status: "confirmed" });

    return { ok: true as const, bookingId, confirmationCode };
  },
});

export const getByConfirmationCode = internalQuery({
  args: {
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_confirmation_code", (q) =>
        q.eq("confirmationCode", args.confirmationCode),
      )
      .unique();
  },
});
