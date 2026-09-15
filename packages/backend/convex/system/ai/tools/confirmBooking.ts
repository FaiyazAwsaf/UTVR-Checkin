import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { hotelBookingAgent } from "../agents/hotelBookingAgent";
import { pickByLanguage } from "../../../lib/hotel/language";

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

    const hold = await ctx.runQuery(internal.system.hotel.roomHolds.getByConversation, {
      conversationId: conversation._id,
    });

    if (!hold) {
      return pickByLanguage(language, {
        bn: "এই মুহূর্তে আপনার কোনো সক্রিয় হোল্ড নেই। প্রথমে একটি রুম হোল্ড করুন।",
        en: "You don't have an active hold right now. Please hold a room first.",
      });
    }

    const contactSession = await ctx.runQuery(internal.system.contactSessions.getOne, {
      contactSessionId: conversation.contactSessionId,
    });

    const result = await ctx.runMutation(internal.system.hotel.bookings.create, {
      holdId: hold._id,
      guestName: contactSession?.name ?? "Guest",
      guestEmail: contactSession?.email ?? "",
    });

    if (!result.ok) {
      return pickByLanguage(language, {
        bn: "হোল্ডটি আর সক্রিয় নেই — এটি মেয়াদোত্তীর্ণ বা বাতিল হয়ে গেছে। অনুগ্রহ করে আবার রুম হোল্ড করুন।",
        en: "That hold is no longer active — it expired or was cancelled. Please hold the room again.",
      });
    }

    const message = pickByLanguage(language, {
      bn: `বুকিং নিশ্চিত হয়েছে! আপনার কনফার্মেশন কোড: ${result.confirmationCode}। বিস্তারিত ও QR কোড আপনার অ্যাপ/ইমেইলে পাঠানো হয়েছে।`,
      en: `Booking confirmed! Your confirmation code is: ${result.confirmationCode}. Details and your QR code are available in your app/email.`,
    });

    await hotelBookingAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: { role: "assistant", content: message },
    });

    return message;
  },
});
