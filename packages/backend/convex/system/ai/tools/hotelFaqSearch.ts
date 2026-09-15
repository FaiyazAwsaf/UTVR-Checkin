import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { searchKnowledgeBase } from "../knowledgeSearch";

export const hotelFaqSearch = createTool({
  description:
    "Search the hotel's knowledge base for policies, amenities, and general questions",
  args: z.object({
    query: z.string().describe("The search query to find relevant information"),
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

    const response = await searchKnowledgeBase(
      ctx,
      conversation.organizationId,
      args.query,
    );

    return response;
  },
});
