import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { hotelBookingAgent } from "../ai/agents/hotelBookingAgent";
import { detectGuestLanguage, type GuestLanguage } from "../../lib/hotel/language";

// Booking tools return fully-formed sentences the agent relays verbatim, so
// the tool itself has to pick the right language — this looks at the guest's
// most recent message in the thread to decide.
export const detectForThread = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<GuestLanguage> => {
    const recent = await hotelBookingAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: { numItems: 10, cursor: null },
    });

    const lastUserMessage = recent.page.find((message) => message.message?.role === "user");

    return detectGuestLanguage(lastUserMessage?.text);
  },
});
