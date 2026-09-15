import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

export const getActiveByRoomType = internalQuery({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roomHolds")
      .withIndex("by_room_type_id_and_status", (q) =>
        q.eq("roomTypeId", args.roomTypeId).eq("status", "active"),
      )
      .first();
  },
});

export const getByConversation = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const holds = await ctx.db
      .query("roomHolds")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    return holds.find((hold) => hold.status === "active") ?? null;
  },
});

export const getById = internalQuery({
  args: {
    holdId: v.id("roomHolds"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.holdId);
  },
});
