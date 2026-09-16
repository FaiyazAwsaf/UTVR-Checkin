import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

// Centralized so both the agent-tool path (escalate/resolve) and the
// dashboard's private/conversations.updateStatus mutation release any
// active room hold (and pop the waitlist) the same way, no matter which
// path a conversation's status change comes from.
const releaseActiveHoldIfAny = async (
  ctx: { runQuery: any; runMutation: any },
  conversationId: any,
) => {
  const hold = await ctx.runQuery(internal.system.hotel.roomHolds.getByConversation, {
    conversationId,
  });

  if (hold) {
    await ctx.runMutation(internal.system.hotel.scheduling.releaseHold, {
      holdId: hold._id,
    });
  }
};

export const escalate = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    await ctx.db.patch(conversation._id, { status: "escalated" });
    await releaseActiveHoldIfAny(ctx, conversation._id);
  },
});

export const resolve = internalMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    await ctx.db.patch(conversation._id, { status: "resolved" });
    await releaseActiveHoldIfAny(ctx, conversation._id);
  },
});

export const releaseHoldForConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await releaseActiveHoldIfAny(ctx, args.conversationId);
  },
});

export const getByThreadId = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    return conversation;
  },
});

export const getById = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
