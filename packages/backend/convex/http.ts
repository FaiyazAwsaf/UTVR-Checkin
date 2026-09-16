import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

type VapiToolCall = {
  id?: unknown;
  name?: unknown;
  parameters?: unknown;
  arguments?: unknown;
  function?: {
    name?: unknown;
    arguments?: unknown;
    parameters?: unknown;
  };
};

type VapiToolWithCall = {
  toolCall?: VapiToolCall;
};

type VapiMessage = {
  toolCallList?: VapiToolCall[];
  toolWithToolCallList?: VapiToolWithCall[];
  call?: {
    assistantOverrides?: {
      variableValues?: Record<string, unknown>;
    };
  };
};

type VapiRequest = VapiMessage & {
  message?: VapiMessage;
  assistantOverrides?: {
    variableValues?: Record<string, unknown>;
  };
};

const unauthorizedResponse = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

const parseArguments = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
};

const hotelBookingToolNames = [
  "check_availability",
  "quote_room",
  "hold_room",
  "confirm_booking",
  "cancel_hold",
  "hotel_faq_search",
] as const;

type HotelBookingToolName = (typeof hotelBookingToolNames)[number];

const isHotelBookingToolName = (value: unknown): value is HotelBookingToolName =>
  typeof value === "string" &&
  (hotelBookingToolNames as readonly string[]).includes(value);

http.route({
  path: "/vapi/knowledge-search",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = process.env.VAPI_KB_TOOL_SECRET;
    const authorization = request.headers.get("authorization");
    const bearerSecret = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    const providedSecret =
      request.headers.get("x-vapi-tool-secret") ??
      request.headers.get("x-vapi-secret") ??
      bearerSecret;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return unauthorizedResponse();
    }

    let body: VapiRequest;

    try {
      body = (await request.json()) as VapiRequest;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const message = body.message ?? body;
    const toolCalls = message.toolCallList;

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return Response.json({ error: "No tool calls found" }, { status: 400 });
    }

    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const toolCallId =
          typeof toolCall.id === "string" ? toolCall.id : "unknown";
        const nestedToolCall = message.toolWithToolCallList?.find(
          (item) => item.toolCall?.id === toolCall.id,
        )?.toolCall;
        const args = parseArguments(
          toolCall.arguments ??
            toolCall.parameters ??
            toolCall.function?.arguments ??
            toolCall.function?.parameters,
        );
        const staticArgs = parseArguments(nestedToolCall?.function?.parameters);
        const query = args?.query ?? staticArgs?.query;
        const contactSessionId =
          message.call?.assistantOverrides?.variableValues?.contactSessionId ??
          body.call?.assistantOverrides?.variableValues?.contactSessionId ??
          body.assistantOverrides?.variableValues?.contactSessionId ??
          staticArgs?.contactSessionId;
        const toolName =
          typeof toolCall.name === "string"
            ? toolCall.name
            : toolCall.function?.name;

        if (
          toolName !== "search_knowledge_base" ||
          typeof query !== "string" ||
          typeof contactSessionId !== "string"
        ) {
          return {
            toolCallId,
            result: "এই অনুরোধটি প্রক্রিয়া করা যাচ্ছে না।",
          };
        }

        try {
          const result = await ctx.runAction(
            internal.system.ai.voiceSearch.search,
            {
              contactSessionId: contactSessionId as Id<"contactSessions">,
              query,
            },
          );

          return { toolCallId, result };
        } catch {
          return {
            toolCallId,
            result:
              "এই মুহূর্তে জ্ঞানভান্ডার থেকে তথ্য পাওয়া যাচ্ছে না। চাইলে আমি আপনাকে একজন সাপোর্ট প্রতিনিধির সঙ্গে যুক্ত করতে পারি।",
          };
        }
      }),
    );

    return Response.json({ results });
  }),
});

http.route({
  path: "/vapi/hotel-booking",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = process.env.VAPI_KB_TOOL_SECRET;
    const authorization = request.headers.get("authorization");
    const bearerSecret = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    const providedSecret =
      request.headers.get("x-vapi-tool-secret") ??
      request.headers.get("x-vapi-secret") ??
      bearerSecret;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return unauthorizedResponse();
    }

    let body: VapiRequest;

    try {
      body = (await request.json()) as VapiRequest;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const message = body.message ?? body;
    const toolCalls = message.toolCallList;

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return Response.json({ error: "No tool calls found" }, { status: 400 });
    }

    const variableValues =
      message.call?.assistantOverrides?.variableValues ??
      body.call?.assistantOverrides?.variableValues ??
      body.assistantOverrides?.variableValues ??
      {};

    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const toolCallId =
          typeof toolCall.id === "string" ? toolCall.id : "unknown";
        const nestedToolCall = message.toolWithToolCallList?.find(
          (item) => item.toolCall?.id === toolCall.id,
        )?.toolCall;
        const args =
          parseArguments(
            toolCall.arguments ??
              toolCall.parameters ??
              toolCall.function?.arguments ??
              toolCall.function?.parameters,
          ) ?? {};
        const staticArgs =
          parseArguments(nestedToolCall?.function?.parameters) ?? {};

        const toolName =
          typeof toolCall.name === "string" ? toolCall.name : toolCall.function?.name;

        const contactSessionId =
          variableValues.contactSessionId ??
          args.contactSessionId ??
          staticArgs.contactSessionId;
        const conversationId =
          variableValues.conversationId ??
          args.conversationId ??
          staticArgs.conversationId;
        const guestLanguage =
          variableValues.guestLanguage ??
          args.guestLanguage ??
          staticArgs.guestLanguage ??
          "en";

        if (
          !isHotelBookingToolName(toolName) ||
          typeof contactSessionId !== "string" ||
          typeof conversationId !== "string" ||
          (guestLanguage !== "bn" && guestLanguage !== "en")
        ) {
          return {
            toolCallId,
            result: "This request could not be processed.",
          };
        }

        const baseArgs = {
          contactSessionId: contactSessionId as Id<"contactSessions">,
          conversationId: conversationId as Id<"conversations">,
          guestLanguage: guestLanguage as "bn" | "en",
        };

        try {
          let result: string;

          switch (toolName) {
            case "check_availability": {
              const roomTypeName = args.roomTypeName;
              if (typeof roomTypeName !== "string") {
                throw new Error("Missing roomTypeName");
              }
              result = await ctx.runAction(
                internal.system.ai.hotelVoiceBooking.checkAvailability,
                { ...baseArgs, roomTypeName },
              );
              break;
            }
            case "quote_room": {
              const { roomTypeName, checkInDate, checkOutDate, partySize, packageNames } =
                args;
              if (
                typeof roomTypeName !== "string" ||
                typeof checkInDate !== "string" ||
                typeof checkOutDate !== "string" ||
                typeof partySize !== "number"
              ) {
                throw new Error("Missing required quote_room arguments");
              }
              result = await ctx.runAction(internal.system.ai.hotelVoiceBooking.quoteRoom, {
                ...baseArgs,
                roomTypeName,
                checkInDate,
                checkOutDate,
                partySize,
                packageNames: Array.isArray(packageNames)
                  ? packageNames.filter((name): name is string => typeof name === "string")
                  : undefined,
              });
              break;
            }
            case "hold_room": {
              const { roomTypeName, checkInDate, checkOutDate, partySize, packageNames } =
                args;
              if (
                typeof roomTypeName !== "string" ||
                typeof checkInDate !== "string" ||
                typeof checkOutDate !== "string" ||
                typeof partySize !== "number"
              ) {
                throw new Error("Missing required hold_room arguments");
              }
              result = await ctx.runAction(internal.system.ai.hotelVoiceBooking.holdRoom, {
                ...baseArgs,
                roomTypeName,
                checkInDate,
                checkOutDate,
                partySize,
                packageNames: Array.isArray(packageNames)
                  ? packageNames.filter((name): name is string => typeof name === "string")
                  : undefined,
              });
              break;
            }
            case "confirm_booking": {
              result = await ctx.runAction(
                internal.system.ai.hotelVoiceBooking.confirmBooking,
                baseArgs,
              );
              break;
            }
            case "cancel_hold": {
              result = await ctx.runAction(
                internal.system.ai.hotelVoiceBooking.cancelHold,
                baseArgs,
              );
              break;
            }
            case "hotel_faq_search": {
              const query = args.query;
              if (typeof query !== "string") {
                throw new Error("Missing query");
              }
              result = await ctx.runAction(
                internal.system.ai.hotelVoiceBooking.hotelFaqSearch,
                { ...baseArgs, query },
              );
              break;
            }
          }

          return { toolCallId, result };
        } catch {
          return {
            toolCallId,
            result:
              guestLanguage === "bn"
                ? "এই মুহূর্তে অনুরোধটি প্রক্রিয়া করা যাচ্ছে না। আমি আপনাকে একজন সাপোর্ট প্রতিনিধির সঙ্গে যুক্ত করতে পারি।"
                : "I'm unable to process that request right now. I can connect you with a support representative.",
          };
        }
      }),
    );

    return Response.json({ results });
  }),
});

export default http;
