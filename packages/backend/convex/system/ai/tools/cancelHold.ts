import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { pickByLanguage } from "../../../lib/hotel/language";

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

    const hold = await ctx.runQuery(internal.system.hotel.roomHolds.getByConversation, {
      conversationId: conversation._id,
    });

    if (!hold) {
      return pickByLanguage(language, {
        bn: "এই মুহূর্তে আপনার কোনো সক্রিয় হোল্ড নেই।",
        en: "You don't have an active hold right now.",
      });
    }

    await ctx.runMutation(internal.system.hotel.scheduling.releaseHold, {
      holdId: hold._id,
    });

    await ctx.runMutation(internal.system.hotel.waitlist.cancelForConversation, {
      conversationId: conversation._id,
    });

    const message = pickByLanguage(language, {
      bn: "আপনার হোল্ডটি বাতিল করা হয়েছে। অন্য কোনোভাবে সাহায্য প্রয়োজন হলে জানান।",
      en: "Your hold has been cancelled. Let me know if there's anything else I can help with.",
    });

    return message;
  },
});
