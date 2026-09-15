import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { hotelBookingAgent } from "../system/ai/agents/hotelBookingAgent";
import { paginationOptsValidator } from "convex/server";
import { escalateConversation } from "../system/ai/tools/escalateConversation";
import { resolveConversation } from "../system/ai/tools/resolveConversation";
import { saveMessage } from "@convex-dev/agent";
import { search } from "../system/ai/tools/search";
import { checkAvailability } from "../system/ai/tools/checkAvailability";
import { quoteRoom } from "../system/ai/tools/quoteRoom";
import { holdRoom } from "../system/ai/tools/holdRoom";
import { confirmBooking } from "../system/ai/tools/confirmBooking";
import { cancelHold } from "../system/ai/tools/cancelHold";
import { hotelFaqSearch } from "../system/ai/tools/hotelFaqSearch";

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      {
        contactSessionId: args.contactSessionId,
      }
    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      {
        threadId: args.threadId,
      },
    );

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (
      conversation.contactSessionId !== contactSession._id ||
      conversation.organizationId !== contactSession.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Incorrect session",
      });
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    // TODO: Implement subscription check
    const shouldTriggerAgent =
      conversation.status === "unresolved";

    if (shouldTriggerAgent) {
      if (conversation.mode === "booking") {
        await hotelBookingAgent.generateText(
          ctx,
          { threadId: args.threadId },
          {
            prompt: args.prompt,
            tools: {
              checkAvailabilityTool: checkAvailability,
              quoteRoomTool: quoteRoom,
              holdRoomTool: holdRoom,
              confirmBookingTool: confirmBooking,
              cancelHoldTool: cancelHold,
              hotelFaqSearchTool: hotelFaqSearch,
              escalateConversationTool: escalateConversation,
              resolveConversationTool: resolveConversation,
            },
          },
        );
      } else {
        await supportAgent.generateText(
          ctx,
          { threadId: args.threadId },
          {
            prompt: args.prompt,
            tools: {
              escalateConversationTool: escalateConversation,
              resolveConversationTool: resolveConversation,
              searchTool: search,
            }
          },
        )
      }
    } else {
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        prompt: args.prompt,
      });
    }
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (
      !conversation ||
      conversation.contactSessionId !== contactSession._id ||
      conversation.organizationId !== contactSession.organizationId
    ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Incorrect session",
      });
    }

    const paginated = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});
