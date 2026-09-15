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

export const quoteRoom = createTool({
  description:
    "Compute a price quote for a room type given check-in/check-out dates, party size, and optional package add-ons. Read-only, no side effects.",
  args: z.object({
    roomTypeName: z.string().describe("The room type to quote"),
    checkInDate: z.string().describe("Check-in date, e.g. 2026-09-20"),
    checkOutDate: z.string().describe("Check-out date, e.g. 2026-09-22"),
    partySize: z.number().describe("Number of guests"),
    packageNames: z
      .array(z.string())
      .optional()
      .describe("Optional package add-on names the guest wants, e.g. Airport Pickup"),
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

    if (args.partySize > roomType.maxOccupancy) {
      return pickByLanguage(language, {
        bn: `"${roomType.name}" রুমে সর্বোচ্চ ${roomType.maxOccupancy} জন থাকতে পারবেন, আপনার দলের সংখ্যা ${args.partySize} জন। অনুগ্রহ করে অন্য রুম টাইপ বিবেচনা করুন।`,
        en: `"${roomType.name}" sleeps up to ${roomType.maxOccupancy} guests, but your party is ${args.partySize}. Please consider a different room type.`,
      });
    }

    const nights = differenceInNights(args.checkInDate, args.checkOutDate);

    if (nights === null) {
      return pickByLanguage(language, {
        bn: "চেক-ইন ও চেক-আউট তারিখ সঠিকভাবে বোঝা যায়নি, অনুগ্রহ করে তারিখ আবার জানান।",
        en: "I couldn't understand the check-in/check-out dates — could you share them again?",
      });
    }

    const roomTotal = nights * roomType.basePrice;

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

    const packagesTotal = selectedPackages.reduce(
      (sum, pkg) => sum + pkg.price,
      0,
    );

    const total = roomTotal + packagesTotal;

    const packageList = selectedPackages
      .map((p) => `${p.name} (৳${p.price})`)
      .join(", ");

    const summary = pickByLanguage(language, {
      bn: `"${roomType.name}" — ${nights} রাত x ৳${roomType.basePrice} = ৳${roomTotal}${
        selectedPackages.length ? `\nযোগ করা প্যাকেজ: ${packageList}` : ""
      }\nমোট মূল্য: ৳${total}`,
      en: `"${roomType.name}" — ${nights} nights x ৳${roomType.basePrice} = ৳${roomTotal}${
        selectedPackages.length ? `\nAdded packages: ${packageList}` : ""
      }\nTotal: ৳${total}`,
    });

    return summary;
  },
});
