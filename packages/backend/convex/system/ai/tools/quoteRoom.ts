import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { quoteRoomLogic } from "../../hotel/bookingActions";

export const quoteRoom = createTool({
  description:
    "Compute a price quote for a room type given check-in/check-out dates, party size, and optional package add-ons. Read-only, no side effects.",
  args: z.object({
    roomTypeName: z.string().describe("The room type to quote"),
    checkInDate: z.string().describe("Check-in date, e.g. 2026-09-20"),
    checkOutDate: z.string().describe("Check-out date, e.g. 2026-09-22"),
    partySize: z.number().describe("Number of guests"),
    packageNames: z
      .array(z.string())
      .optional()
      .describe("Optional package add-on names the guest wants, e.g. Airport Pickup"),
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

    return quoteRoomLogic(ctx, conversation, language, args);
  },
});
