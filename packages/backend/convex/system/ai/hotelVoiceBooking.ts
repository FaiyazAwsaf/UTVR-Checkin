import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { hotelBookingAgent } from "./agents/hotelBookingAgent";
import { searchKnowledgeBase } from "./knowledgeSearch";
import {
  cancelHoldLogic,
  checkAvailabilityLogic,
  confirmBookingLogic,
  holdRoomLogic,
  listAvailableRoomsLogic,
  quoteRoomLogic,
} from "../hotel/bookingActions";
import { pickByLanguage, type GuestLanguage } from "../../lib/hotel/language";
import { getCurrentDate } from "../../lib/hotel/date";
import { spokenBengaliDate, spokenEnglishDate } from "../../lib/hotel/spoken";

// Voice front-end for the same booking state machine the text tools use
// (system/hotel/bookingActions.ts) — bridged from Vapi via the
// /vapi/hotel-booking HTTP route in http.ts. Every action here does its own
// session/conversation/mode validation (this is reachable from an HTTP
// action, not a Convex client, but the same binding discipline as
// public/messages.ts's reference implementation applies), then defers all
// business logic to the shared *Logic functions so text and voice can never
// disagree about lock/waitlist state.

const guestLanguageValidator = v.union(v.literal("bn"), v.literal("en"));

const bilingualFallback = (language: GuestLanguage) =>
  pickByLanguage(language, {
    bn: "এই মুহূর্তে অনুরোধটি প্রক্রিয়া করা যাচ্ছে না। আমি আপনাকে একজন সাপোর্ট প্রতিনিধির সঙ্গে যুক্ত করতে পারি।",
    en: "I'm unable to process that request right now. I can connect you with a support representative.",
  });

// Resolves + validates the (contactSession, conversation) pair shared by
// every bridged tool call. Mirrors voiceSearch.ts's session-expiry check,
// plus public/messages.ts's conversation-binding check (contactSessionId AND
// organizationId must match) and additionally requires mode === "booking",
// since this bridge only ever drives the booking agent's tools.
const resolveBookingContext = async (
  ctx: ActionCtx,
  args: {
    contactSessionId: Doc<"contactSessions">["_id"];
    conversationId: Doc<"conversations">["_id"];
  },
): Promise<{
  contactSession: Doc<"contactSessions">;
  conversation: Doc<"conversations">;
}> => {
  const contactSession = await ctx.runQuery(
    internal.system.contactSessions.getOne,
    { contactSessionId: args.contactSessionId },
  );

  if (!contactSession || contactSession.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid contact session",
    });
  }

  const conversation = await ctx.runQuery(internal.system.conversations.getById, {
    conversationId: args.conversationId,
  });

  if (
    !conversation ||
    conversation.contactSessionId !== contactSession._id ||
    conversation.organizationId !== contactSession.organizationId
  ) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Conversation does not match session",
    });
  }

  if (conversation.mode !== "booking") {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Conversation is not in booking mode",
    });
  }

  return { contactSession, conversation };
};

const saveExchange = async (
  ctx: ActionCtx,
  threadId: string,
  userSummary: string,
  assistantReply: string,
) => {
  await hotelBookingAgent.saveMessage(ctx, {
    threadId,
    message: { role: "user", content: userSummary },
  });

  await hotelBookingAgent.saveMessage(ctx, {
    threadId,
    message: { role: "assistant", content: assistantReply },
  });
};

export const checkAvailability = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
    roomTypeName: v.string(),
    checkInDate: v.optional(v.string()),
    checkOutDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await checkAvailabilityLogic(
        ctx,
        conversation,
        args.guestLanguage,
        {
          roomTypeName: args.roomTypeName,
          checkInDate: args.checkInDate,
          checkOutDate: args.checkOutDate,
        },
      );

      await saveExchange(
        ctx,
        conversation.threadId,
        `Checking availability for: ${args.roomTypeName}`,
        reply,
      );

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const currentDate = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
  },
  handler: async (ctx, args): Promise<string> => {
    const { conversation } = await resolveBookingContext(ctx, args);
    const date = getCurrentDate();
    const reply = pickByLanguage(args.guestLanguage, {
      bn: `আজকের তারিখ ${spokenBengaliDate(date)}।`,
      en: `Today's date is ${spokenEnglishDate(date)}.`,
    });
    await saveExchange(ctx, conversation.threadId, "Checking today's date", reply);
    return reply;
  },
});

export const listAvailableRooms = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
    checkInDate: v.optional(v.string()),
    checkOutDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);
      const reply = await listAvailableRoomsLogic(ctx, conversation, args.guestLanguage, {
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
      });
      await saveExchange(
        ctx,
        conversation.threadId,
        `Listing available rooms${args.checkInDate ? ` from ${args.checkInDate}` : ""}`,
        reply,
      );
      return reply;
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const quoteRoom = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
    roomTypeName: v.string(),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    partySize: v.number(),
    packageNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await quoteRoomLogic(ctx, conversation, args.guestLanguage, {
        roomTypeName: args.roomTypeName,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        partySize: args.partySize,
        packageNames: args.packageNames,
      });

      const packagesSuffix = args.packageNames?.length
        ? ` with packages: ${args.packageNames.join(", ")}`
        : "";

      await saveExchange(
        ctx,
        conversation.threadId,
        `Requesting a quote: ${args.roomTypeName}, ${args.checkInDate} to ${args.checkOutDate}, ${args.partySize} guest(s)${packagesSuffix}`,
        reply,
      );

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const holdRoom = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
    roomTypeName: v.string(),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    partySize: v.number(),
    packageNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await holdRoomLogic(ctx, conversation, args.guestLanguage, {
        roomTypeName: args.roomTypeName,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        partySize: args.partySize,
        packageNames: args.packageNames,
        channel: "voice",
      });

      const packagesSuffix = args.packageNames?.length
        ? ` with packages: ${args.packageNames.join(", ")}`
        : "";

      await saveExchange(
        ctx,
        conversation.threadId,
        `Requesting hold: ${args.roomTypeName}, ${args.checkInDate} to ${args.checkOutDate}, ${args.partySize} guest(s)${packagesSuffix}`,
        reply,
      );

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const confirmBooking = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await confirmBookingLogic(ctx, conversation, args.guestLanguage);

      await saveExchange(
        ctx,
        conversation.threadId,
        "Requesting booking confirmation",
        reply,
      );

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const cancelHold = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await cancelHoldLogic(ctx, conversation, args.guestLanguage);

      await saveExchange(
        ctx,
        conversation.threadId,
        "Requesting hold cancellation",
        reply,
      );

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});

export const hotelFaqSearch = internalAction({
  args: {
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    guestLanguage: guestLanguageValidator,
    query: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      const { conversation } = await resolveBookingContext(ctx, args);

      const reply = await searchKnowledgeBase(
        ctx,
        conversation.organizationId,
        args.query,
      );

      await saveExchange(ctx, conversation.threadId, args.query, reply);

      return reply;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }

      return bilingualFallback(args.guestLanguage);
    }
  },
});
