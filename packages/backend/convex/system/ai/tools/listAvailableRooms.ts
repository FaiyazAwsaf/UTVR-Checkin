import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { listAvailableRoomsLogic } from "../../hotel/bookingActions";

export const listAvailableRooms = createTool({
  description:
    "List every active room type with available unit count, price, and occupancy for optional check-in/check-out dates. Use this when the guest asks what rooms are available or wants room choices.",
  args: z.object({
    checkInDate: z.string().optional().describe("Check-in date in YYYY-MM-DD format"),
    checkOutDate: z.string().optional().describe("Check-out date in YYYY-MM-DD format"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.threadId) return "Missing thread ID";

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId },
    );
    if (!conversation) return "Conversation not found";

    const language = await ctx.runQuery(
      internal.system.hotel.language.detectForThread,
      { threadId: ctx.threadId },
    );

    return listAvailableRoomsLogic(ctx, conversation, language, args);
  },
});
