import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { pickByLanguage } from "../../../lib/hotel/language";

export const checkAvailability = createTool({
  description:
    "Check whether a specific room type is currently available, held by another guest, or already booked",
  args: z.object({
    roomTypeName: z
      .string()
      .describe("The name of the room type the guest is asking about"),
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

    const roomType = await ctx.runQuery(
      internal.system.hotel.roomTypes.getByOrganizationAndName,
      {
        organizationId: conversation.organizationId,
        name: args.roomTypeName,
      },
    );

    const language = await ctx.runQuery(internal.system.hotel.language.detectForThread, {
      threadId: ctx.threadId,
    });

    if (!roomType) {
      const allRoomTypes = await ctx.runQuery(
        internal.system.hotel.roomTypes.getManyByOrganization,
        { organizationId: conversation.organizationId },
      );

      const names = allRoomTypes.map((r) => r.name).join(", ");
      return pickByLanguage(language, {
        bn: `এই নামে কোনো রুম টাইপ পাওয়া যায়নি। উপলব্ধ রুম টাইপগুলো হলো: ${names}`,
        en: `No room type found by that name. Available room types are: ${names}`,
      });
    }

    const status = await ctx.runQuery(internal.system.hotel.availability.get, {
      roomTypeId: roomType._id,
    });

    if (status.state === "available") {
      return pickByLanguage(language, {
        bn: `"${roomType.name}" রুমটি এই মুহূর্তে খালি আছে। প্রতি রাত মূল্য ৳${roomType.basePrice}, সর্বোচ্চ ${roomType.maxOccupancy} জন থাকতে পারবেন।`,
        en: `"${roomType.name}" is currently available. ৳${roomType.basePrice}/night, sleeps up to ${roomType.maxOccupancy} guests.`,
      });
    }

    if (status.state === "held") {
      return pickByLanguage(language, {
        bn: `"${roomType.name}" রুমটি বর্তমানে অন্য একজন অতিথির সঙ্গে বুকিং আলোচনায় রয়েছে।`,
        en: `"${roomType.name}" is currently under discussion with another guest.`,
      });
    }

    return pickByLanguage(language, {
      bn: `"${roomType.name}" রুমটি বর্তমানে বুক করা আছে।`,
      en: `"${roomType.name}" is currently booked.`,
    });
  },
});
