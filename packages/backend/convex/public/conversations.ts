import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { ConvexError, v } from "convex/values";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { hotelBookingAgent } from "../system/ai/agents/hotelBookingAgent";
import { MessageDoc, saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import {
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from "../lib/widgetSettings";

export const getMany = query({
  args: {
    contactSessionId: v.id("contactSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_contact_session_id", (q) => 
        q.eq("contactSessionId", args.contactSessionId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const conversationsWithLastMessage = await Promise.all(
      conversations.page.map(async (conversation) => {
        let lastMessage: MessageDoc | null = null;

        const messages = await supportAgent.listMessages(ctx, {
          threadId: conversation.threadId,
          paginationOpts: { numItems: 1, cursor: null },
        });

        if (messages.page.length > 0) {
          lastMessage = messages.page[0] ?? null;
        }

        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          status: conversation.status,
          organizationId: conversation.organizationId,
          threadId: conversation.threadId,
          lastMessage,
        };
      })
    );

    return {
      ...conversations,
      page: conversationsWithLastMessage,
    };
  },
});

export const getOne = query({
  args: {
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.contactSessionId !== session._id) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Incorrect session",
      });
    }

    if (conversation.organizationId !== session.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization mismatch",
      });
    }

    return {
      _id: conversation._id,
      status: conversation.status,
      threadId: conversation.threadId,
    };
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (session.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization mismatch",
      });
    }

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    const { threadId } = await supportAgent.createThread(ctx, {
      userId: args.organizationId,
    });

    const resolvedWidgetSettings = widgetSettings
      ? normalizeWidgetSettings(widgetSettings)
      : DEFAULT_WIDGET_SETTINGS;

    await saveMessage(ctx, components.agent, {
      threadId,
      message: {
        role: "assistant",
        content: resolvedWidgetSettings.greeting,
      },
    });

    const conversationId = await ctx.db.insert("conversations", {
      contactSessionId: session._id,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
      mode: "support",
    });

    return conversationId;
  },
});

export const createBooking = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    if (session.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization mismatch",
      });
    }

    const hotelProfile = await ctx.db
      .query("hotelProfiles")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    const { threadId } = await hotelBookingAgent.createThread(ctx, {
      userId: args.organizationId,
    });

    const hotelName = hotelProfile?.name ?? "our hotel";

    await saveMessage(ctx, components.agent, {
      threadId,
      message: {
        role: "assistant",
        content: `Hello! I'm the booking assistant for ${hotelName}. Let me know your check-in and check-out dates, party size, and any room preference, and I can help right away.\n\nহ্যালো! আমি ${hotelName}-এর বুকিং সহকারী। আপনার চেক-ইন ও চেক-আউট তারিখ, কতজন থাকবেন, এবং কোন ধরনের রুম পছন্দ করবেন জানালে আমি এখনই সাহায়তা করতে পারব।`,
      },
    });

    const conversationId = await ctx.db.insert("conversations", {
      contactSessionId: session._id,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
      mode: "booking",
    });

    return conversationId;
  },
});
