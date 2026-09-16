import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { confirmBookingLogic } from "../../hotel/bookingActions";

export const confirmBooking = createTool({
  description:
    "Confirm the guest's currently held room as a booking, after they agree to the (simulated) payment step",
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

    return confirmBookingLogic(ctx, conversation, language);
  },
});
