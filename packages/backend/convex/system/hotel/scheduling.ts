import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { hotelBookingAgent } from "../ai/agents/hotelBookingAgent";
import { pickByLanguage } from "../../lib/hotel/language";

export const HOLD_TTL_MS = 7 * 60 * 1000;

const releaseHoldIfStillActive = async (
  ctx: MutationCtx,
  holdId: Id<"roomHolds">,
  nextStatus: "released" | "expired",
) => {
  const hold = await ctx.db.get(holdId);

  if (!hold || hold.status !== "active") {
    return;
  }

  await ctx.db.patch(holdId, { status: nextStatus });

  const roomType = await ctx.db.get(hold.roomTypeId);
  const nextWaiter: {
    _id: Id<"waitlistEntries">;
    conversationId: Id<"conversations">;
    contactSessionId: Id<"contactSessions">;
    partySize: number;
  } | null = await ctx.runMutation(internal.system.hotel.waitlist.popNext, {
    roomTypeId: hold.roomTypeId,
  });

  if (!nextWaiter || !roomType) {
    return;
  }

  const conversation = await ctx.db.get(nextWaiter.conversationId);

  if (!conversation) {
    return;
  }

  const language = await ctx.runQuery(internal.system.hotel.language.detectForThread, {
    threadId: conversation.threadId,
  });

  const message = pickByLanguage(language, {
    bn: `সুখবর! "${roomType.name}" রুমটি এখন খালি হয়েছে। আপনি কি এখনই বুকিং এগিয়ে নিতে চান? চাইলে আমি এখনই আপনার জন্য রুমটি হোল্ড করে দিচ্ছি।`,
    en: `Good news! "${roomType.name}" is now available. Would you like to proceed with booking it? I can hold it for you right now.`,
  });

  await hotelBookingAgent.saveMessage(ctx, {
    threadId: conversation.threadId,
    message: {
      role: "assistant",
      content: message,
    },
  });
};

export const createHoldWithTimer = internalMutation({
  args: {
    organizationId: v.string(),
    roomTypeId: v.id("roomTypes"),
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    partySize: v.number(),
    selectedPackageIds: v.array(v.id("packageAddOns")),
    quotedTotalPrice: v.number(),
    channel: v.union(v.literal("text"), v.literal("voice")),
  },
  handler: async (ctx, args) => {
    const existingActive = await ctx.db
      .query("roomHolds")
      .withIndex("by_room_type_id_and_status", (q) =>
        q.eq("roomTypeId", args.roomTypeId).eq("status", "active"),
      )
      .first();

    if (existingActive && existingActive.conversationId !== args.conversationId) {
      return { ok: false as const, reason: "already_held" as const };
    }

    if (existingActive) {
      // Re-entrant edit from the same conversation: cancel the old timer's
      // effect by expiring this row, then fall through to insert a fresh hold.
      await ctx.db.patch(existingActive._id, { status: "released" });
    }

    const expiresAt = Date.now() + HOLD_TTL_MS;

    const holdId = await ctx.db.insert("roomHolds", {
      organizationId: args.organizationId,
      roomTypeId: args.roomTypeId,
      conversationId: args.conversationId,
      contactSessionId: args.contactSessionId,
      status: "active",
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      partySize: args.partySize,
      selectedPackageIds: args.selectedPackageIds,
      quotedTotalPrice: args.quotedTotalPrice,
      expiresAt,
      channel: args.channel,
    });

    const jobId = await ctx.scheduler.runAfter(
      HOLD_TTL_MS,
      internal.system.hotel.scheduling.releaseExpiredHold,
      { holdId },
    );

    await ctx.db.patch(holdId, { scheduledReleaseJobId: jobId });

    return { ok: true as const, holdId, expiresAt };
  },
});

export const releaseExpiredHold = internalMutation({
  args: {
    holdId: v.id("roomHolds"),
  },
  handler: async (ctx, args) => {
    await releaseHoldIfStillActive(ctx, args.holdId, "expired");
  },
});

export const releaseHold = internalMutation({
  args: {
    holdId: v.id("roomHolds"),
  },
  handler: async (ctx, args) => {
    const hold = await ctx.db.get(args.holdId);

    if (hold?.scheduledReleaseJobId) {
      await ctx.scheduler.cancel(
        hold.scheduledReleaseJobId as Id<"_scheduled_functions">,
      );
    }

    await releaseHoldIfStillActive(ctx, args.holdId, "released");
  },
});

export const sweepExpiredHolds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const candidates = await ctx.db
      .query("roomHolds")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .collect();

    for (const hold of candidates) {
      if (hold.status === "active") {
        await releaseHoldIfStillActive(ctx, hold._id, "expired");
      }
    }
  },
});
