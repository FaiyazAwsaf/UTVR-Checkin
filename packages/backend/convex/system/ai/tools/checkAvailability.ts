import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { checkAvailabilityLogic } from "../../hotel/bookingActions";

export const checkAvailability = createTool({
  description:
    "Check whether a specific room type is currently available, held by another guest, or already booked",
  args: z.object({
    roomTypeName: z
      .string()
      .describe("The name of the room type the guest is asking about"),
  }),
  handler: async (ctx, args): Promise<string> => {
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

    return checkAvailabilityLogic(ctx, conversation, language, args);
  },
});
