import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { holdRoomLogic } from "../../hotel/bookingActions";

export const holdRoom = createTool({
  description:
    "Place a temporary hold on a room type for the guest, or waitlist them if it's already held by another guest",
  args: z.object({
    roomTypeName: z.string(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    partySize: z.number(),
    packageNames: z.array(z.string()).optional(),
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

    return holdRoomLogic(ctx, conversation, language, {
      ...args,
      channel: "text",
    });
  },
});
