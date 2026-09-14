import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { searchKnowledgeBase } from "./knowledgeSearch";

export const search = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const contactSession = await ctx.runQuery(
      internal.system.contactSessions.getOne,
      {
        contactSessionId: args.contactSessionId,
      },
    );

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid contact session",
      });
    }

    const query = args.query.trim();

    if (!query) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Search query is required",
      });
    }

    return await searchKnowledgeBase(ctx, contactSession.organizationId, query);
  },
});
