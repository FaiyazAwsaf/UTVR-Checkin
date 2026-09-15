import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { pickByLanguage } from "../../../lib/hotel/language";

const differenceInNights = (checkInDate: string, checkOutDate: string) => {
  const start = new Date(checkInDate).getTime();
  const end = new Date(checkOutDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
};

export const holdRoom = createTool({
  description:
    "Place a temporary hold on a room type for the guest, or waitlist them if it's already held by another guest",
  args: z.object({
    roomTypeName: z.string(),
    checkInDate: z.string(),
    checkOutDate: z.string(),
    partySize: z.number(),
    packageNames: z.array(z.string()).optional(),
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

    const language = await ctx.runQuery(internal.system.hotel.language.detectForThread, {
      threadId: ctx.threadId,
    });

    const roomType = await ctx.runQuery(
      internal.system.hotel.roomTypes.getByOrganizationAndName,
      { organizationId: conversation.organizationId, name: args.roomTypeName },
    );

    if (!roomType) {
      return pickByLanguage(language, {
        bn: `"${args.roomTypeName}" নামে কোনো রুম টাইপ পাওয়া যায়নি।`,
        en: `No room type found named "${args.roomTypeName}".`,
      });
    }

    const nights = differenceInNights(args.checkInDate, args.checkOutDate);

    if (nights === null) {
      return pickByLanguage(language, {
        bn: "চেক-ইন ও চেক-আউট তারিখ সঠিকভাবে বোঝা যায়নি, অনুগ্রহ করে তারিখ আবার জানান।",
        en: "I couldn't understand the check-in/check-out dates — could you share them again?",
      });
    }

    const allPackages = await ctx.runQuery(
      internal.system.hotel.packageAddOns.getManyByOrganization,
      { organizationId: conversation.organizationId },
    );

    const requestedNames = (args.packageNames ?? []).map((name) =>
      name.trim().toLowerCase(),
    );

    const selectedPackages = allPackages.filter((pkg) =>
      requestedNames.some(
        (name) =>
          pkg.name.toLowerCase().includes(name) ||
          name.includes(pkg.name.toLowerCase()),
      ),
    );

    const quotedTotalPrice =
      nights * roomType.basePrice +
      selectedPackages.reduce((sum, pkg) => sum + pkg.price, 0);

    const result = await ctx.runMutation(
      internal.system.hotel.scheduling.createHoldWithTimer,
      {
        organizationId: conversation.organizationId,
        roomTypeId: roomType._id,
        conversationId: conversation._id,
        contactSessionId: conversation.contactSessionId,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        partySize: args.partySize,
        selectedPackageIds: selectedPackages.map((pkg) => pkg._id),
        quotedTotalPrice,
        channel: "text",
      },
    );

    if (!result.ok) {
      const allRoomTypes = await ctx.runQuery(
        internal.system.hotel.roomTypes.getManyByOrganization,
        { organizationId: conversation.organizationId },
      );

      const alternativesBn = allRoomTypes
        .filter((r) => r._id !== roomType._id)
        .sort((a, b) => a.basePrice - b.basePrice)
        .slice(0, 2)
        .map((r) => `${r.name} (৳${r.basePrice}/রাত)`)
        .join(", ");

      const alternativesEn = allRoomTypes
        .filter((r) => r._id !== roomType._id)
        .sort((a, b) => a.basePrice - b.basePrice)
        .slice(0, 2)
        .map((r) => `${r.name} (৳${r.basePrice}/night)`)
        .join(", ");

      await ctx.runMutation(internal.system.hotel.waitlist.add, {
        organizationId: conversation.organizationId,
        roomTypeId: roomType._id,
        conversationId: conversation._id,
        contactSessionId: conversation.contactSessionId,
        partySize: args.partySize,
      });

      const message = pickByLanguage(language, {
        bn: `এই রুমটি বর্তমানে অন্য একজন অতিথির সঙ্গে বুকিং আলোচনায় আছে। রুমটি খালি হলে আমরা আপনাকে জানাবো। এর মধ্যে আপনি এই বিকল্পগুলো বিবেচনা করতে পারেন: ${alternativesBn}।`,
        en: `This room is currently under discussion with another guest. We'll let you know as soon as it becomes available. In the meantime, here are some other options you could consider: ${alternativesEn}.`,
      });

      return message;
    }

    const expiresInMinutes = Math.round(
      (result.expiresAt - Date.now()) / (60 * 1000),
    );

    const message = pickByLanguage(language, {
      bn: `"${roomType.name}" রুমটি আপনার জন্য হোল্ড করা হয়েছে, মোট মূল্য ৳${quotedTotalPrice}। এই হোল্ডটি প্রায় ${expiresInMinutes} মিনিট পর্যন্ত বৈধ থাকবে — এর মধ্যে বুকিং নিশ্চিত করুন।`,
      en: `"${roomType.name}" has been held for you, total ৳${quotedTotalPrice}. This hold is valid for about ${expiresInMinutes} minutes — please confirm your booking before then.`,
    });

    return message;
  },
});
