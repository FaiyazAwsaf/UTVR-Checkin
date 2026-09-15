import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const add = internalMutation({
  args: {
    organizationId: v.string(),
    roomTypeId: v.id("roomTypes"),
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    partySize: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("roomTypeId"), args.roomTypeId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("waitlistEntries", {
      organizationId: args.organizationId,
      roomTypeId: args.roomTypeId,
      conversationId: args.conversationId,
      contactSessionId: args.contactSessionId,
      partySize: args.partySize,
      status: "waiting",
    });
  },
});

export const popNext = internalMutation({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    const next = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_room_type_id_and_status", (q) =>
        q.eq("roomTypeId", args.roomTypeId).eq("status", "waiting"),
      )
      .order("asc")
      .first();

    if (!next) {
      return null;
    }

    await ctx.db.patch(next._id, { status: "notified" });

    return next;
  },
});

export const cancelForConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    await Promise.all(
      entries
        .filter((entry) => entry.status === "waiting")
        .map((entry) => ctx.db.patch(entry._id, { status: "cancelled" })),
    );
  },
});
