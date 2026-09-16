import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { cancelHoldLogic } from "../../hotel/bookingActions";

export const cancelHold = createTool({
  description: "Cancel the guest's currently active room hold",
  args: z.object({}),
  handler: async (ctx): Promise<string> => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId },
    );

    if (!conversation) {
      return "Conversation not found";
    }

    const language = await ctx.runQuery(internal.system.hotel.language.detectForThread, {
      threadId: ctx.threadId,
    });

    return cancelHoldLogic(ctx, conversation, language);
  },
});
