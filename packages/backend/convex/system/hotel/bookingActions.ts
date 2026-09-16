import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import { pickByLanguage, type GuestLanguage } from "../../lib/hotel/language";
import { getCurrentDate, isValidDateRange } from "../../lib/hotel/date";
import {
  bengaliDigits,
  numberToWords,
  spokenBengaliDate,
  spokenEnglishDate,
} from "../../lib/hotel/spoken";

// Single implementation of each booking action, called by both the text
// tools (system/ai/tools/*) and the voice bridge (system/ai/hotelVoiceBooking.ts)
// so text and voice can never disagree about lock/waitlist state — there is
// exactly one state machine with two thin front-ends.

const differenceInNights = (checkInDate: string, checkOutDate: string) => {
  const start = new Date(checkInDate).getTime();
  const end = new Date(checkOutDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
};

export const checkAvailabilityLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
  args: { roomTypeName: string; checkInDate?: string; checkOutDate?: string },
): Promise<string> => {
  const roomType = await ctx.runQuery(
    internal.system.hotel.roomTypes.getByOrganizationAndName,
    {
      organizationId: conversation.organizationId,
      name: args.roomTypeName,
    },
  );

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

  if (args.checkInDate || args.checkOutDate) {
    const checkInDate = args.checkInDate ?? getCurrentDate();
    const checkOutDate = args.checkOutDate ?? getNextDate(checkInDate);

    if (!isValidDateRange(checkInDate, checkOutDate)) {
      return pickByLanguage(language, {
        bn: "অনুগ্রহ করে চেক-ইন ও চেক-আউট তারিখ YYYY-MM-DD ফরম্যাটে জানান।",
        en: "Please provide valid check-in and check-out dates in YYYY-MM-DD format.",
      });
    }

    const reservedUnits = await ctx.runQuery(
      internal.system.hotel.availability.getReservedUnitsForDates,
      { roomTypeId: roomType._id, checkInDate, checkOutDate },
    );
    const availableUnits = Math.max(roomType.totalUnits - reservedUnits, 0);

    return pickByLanguage(language, {
      bn: availableUnits > 0
        ? `"${roomType.name}" ${checkInDate} থেকে ${checkOutDate} পর্যন্ত খালি আছে। ${availableUnits}টি ইউনিট পাওয়া যাচ্ছে।`
        : `"${roomType.name}" ${checkInDate} থেকে ${checkOutDate} পর্যন্ত খালি নেই।`,
      en: availableUnits > 0
        ? `"${roomType.name}" is available from ${spokenEnglishDate(checkInDate)} to ${spokenEnglishDate(checkOutDate)}. ${numberToWords(availableUnits)} unit(s) available.`
        : `"${roomType.name}" is not available from ${spokenEnglishDate(checkInDate)} to ${spokenEnglishDate(checkOutDate)}.`,
    });
  }

  if (status.state === "available") {
    return pickByLanguage(language, {
      bn: `"${roomType.name}" রুমটি এই মুহূর্তে খালি আছে। প্রতি রাত মূল্য ৳${roomType.basePrice}, সর্বোচ্চ ${roomType.maxOccupancy} জন থাকতে পারবেন।`,
      en: `"${roomType.name}" is currently available. BDT ${numberToWords(roomType.basePrice)} per night, sleeps up to ${numberToWords(roomType.maxOccupancy)} guests.`,
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
};

export const listAvailableRoomsLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
  args: { checkInDate?: string; checkOutDate?: string },
): Promise<string> => {
  const checkInDate = args.checkInDate ?? getCurrentDate();
  const checkOutDate = args.checkOutDate ?? getNextDate(checkInDate);

  if (!isValidDateRange(checkInDate, checkOutDate)) {
    return pickByLanguage(language, {
      bn: "অনুগ্রহ করে চেক-ইন ও চেক-আউট তারিখ YYYY-MM-DD ফরম্যাটে জানান।",
      en: "Please provide valid check-in and check-out dates in YYYY-MM-DD format.",
    });
  }

  const roomTypes = await ctx.runQuery(
    internal.system.hotel.roomTypes.getManyByOrganization,
    { organizationId: conversation.organizationId },
  );

  const rooms = await Promise.all(
    roomTypes.map(async (roomType) => {
      const reservedUnits = await ctx.runQuery(
        internal.system.hotel.availability.getReservedUnitsForDates,
        { roomTypeId: roomType._id, checkInDate, checkOutDate },
      );

      return {
        ...roomType,
        availableUnits: Math.max(roomType.totalUnits - reservedUnits, 0),
      };
    }),
  );

  const availableRooms = rooms.filter((room) => room.availableUnits > 0);

  if (availableRooms.length === 0) {
    return pickByLanguage(language, {
      bn: `${spokenBengaliDate(checkInDate)} থেকে ${spokenBengaliDate(checkOutDate)} পর্যন্ত কোনো রুম খালি নেই।`,
      en: `No rooms are available from ${spokenEnglishDate(checkInDate)} to ${spokenEnglishDate(checkOutDate)}.`,
    });
  }

  const roomListBn = availableRooms
    .map(
      (room) =>
        `${room.name} — ${bengaliDigits(room.availableUnits)}টি রুম খালি আছে। প্রতি রাতের ভাড়া ${bengaliDigits(room.basePrice)} টাকা। সর্বোচ্চ ${bengaliDigits(room.maxOccupancy)} জন থাকতে পারবেন।`,
    )
    .join("\n");

  const roomListEn = availableRooms
    .map(
      (room) =>
        `${room.name} — ${numberToWords(room.availableUnits)} available, BDT ${numberToWords(room.basePrice)} per night, up to ${numberToWords(room.maxOccupancy)} guests`,
    )
    .join("\n");

  return pickByLanguage(language, {
    bn: `${spokenBengaliDate(checkInDate)} থেকে ${spokenBengaliDate(checkOutDate)} পর্যন্ত উপলব্ধ রুম:\n${roomListBn}`,
    en: `Available rooms from ${spokenEnglishDate(checkInDate)} to ${spokenEnglishDate(checkOutDate)}:\n${roomListEn}`,
  });
};

const getNextDate = (date: string) => {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
};

export const quoteRoomLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
  args: {
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    partySize: number;
    packageNames?: string[];
  },
): Promise<string> => {
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
      en: `"${roomType.name}" sleeps up to ${numberToWords(roomType.maxOccupancy)} guests, but your party is ${numberToWords(args.partySize)}. Please consider a different room type.`,
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
  const packageListEnglish = selectedPackages
    .map((p) => `${p.name} (BDT ${numberToWords(p.price)})`)
    .join(", ");

  return pickByLanguage(language, {
    bn: `"${roomType.name}" — ${nights} রাত x ৳${roomType.basePrice} = ৳${roomTotal}${
      selectedPackages.length ? `\nযোগ করা প্যাকেজ: ${packageList}` : ""
    }\nমোট মূল্য: ৳${total}`,
     en: `"${roomType.name}" — ${numberToWords(nights)} nights at BDT ${numberToWords(roomType.basePrice)} per night, totaling BDT ${numberToWords(roomTotal)}${
       selectedPackages.length ? `\nAdded packages: ${packageListEnglish}` : ""
     }\nTotal: BDT ${numberToWords(total)}`,
  });
};

export const holdRoomLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
  args: {
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    partySize: number;
    packageNames?: string[];
    channel: "text" | "voice";
  },
): Promise<string> => {
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
      channel: args.channel,
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
       .map((r) => `${r.name} (BDT ${numberToWords(r.basePrice)} per night)`)
      .join(", ");

    await ctx.runMutation(internal.system.hotel.waitlist.add, {
      organizationId: conversation.organizationId,
      roomTypeId: roomType._id,
      conversationId: conversation._id,
      contactSessionId: conversation.contactSessionId,
      partySize: args.partySize,
    });

    return pickByLanguage(language, {
      bn: `এই রুমটি বর্তমানে অন্য একজন অতিথির সঙ্গে বুকিং আলোচনায় আছে। রুমটি খালি হলে আমরা আপনাকে জানাবো। এর মধ্যে আপনি এই বিকল্পগুলো বিবেচনা করতে পারেন: ${alternativesBn}।`,
      en: `This room is currently under discussion with another guest. We'll let you know as soon as it becomes available. In the meantime, here are some other options you could consider: ${alternativesEn}.`,
    });
  }

  const expiresInMinutes = Math.round(
    (result.expiresAt - Date.now()) / (60 * 1000),
  );

  return pickByLanguage(language, {
    bn: `"${roomType.name}" রুমটি আপনার জন্য হোল্ড করা হয়েছে, মোট মূল্য ৳${quotedTotalPrice}। এই হোল্ডটি প্রায় ${expiresInMinutes} মিনিট পর্যন্ত বৈধ থাকবে — এর মধ্যে বুকিং নিশ্চিত করুন।`,
      en: `"${roomType.name}" has been held for you, total BDT ${numberToWords(quotedTotalPrice)}. This hold is valid for about ${numberToWords(expiresInMinutes)} minutes — please confirm your booking before then.`,
  });
};

export const confirmBookingLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
): Promise<string> => {
  const hold = await ctx.runQuery(
    internal.system.hotel.roomHolds.getByConversation,
    { conversationId: conversation._id },
  );

  if (!hold) {
    return pickByLanguage(language, {
      bn: "এই মুহূর্তে আপনার কোনো সক্রিয় হোল্ড নেই। প্রথমে একটি রুম হোল্ড করুন।",
      en: "You don't have an active hold right now. Please hold a room first.",
    });
  }

  const contactSession = await ctx.runQuery(
    internal.system.contactSessions.getOne,
    { contactSessionId: conversation.contactSessionId },
  );

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

  return pickByLanguage(language, {
    bn: `বুকিং নিশ্চিত হয়েছে! আপনার কনফার্মেশন কোড: ${result.confirmationCode}। বিস্তারিত ও QR কোড আপনার অ্যাপ/ইমেইলে পাঠানো হয়েছে।`,
    en: `Booking confirmed! Your confirmation code is: ${result.confirmationCode}. Details and your QR code are available in your app/email.`,
  });
};

export const cancelHoldLogic = async (
  ctx: ActionCtx,
  conversation: Doc<"conversations">,
  language: GuestLanguage,
): Promise<string> => {
  const hold = await ctx.runQuery(
    internal.system.hotel.roomHolds.getByConversation,
    { conversationId: conversation._id },
  );

  if (!hold) {
    return pickByLanguage(language, {
      bn: "এই মুহূর্তে আপনার কোনো সক্রিয় হোল্ড নেই।",
      en: "You don't have an active hold right now.",
    });
  }

  await ctx.runMutation(internal.system.hotel.scheduling.releaseHold, {
    holdId: hold._id,
  });

  await ctx.runMutation(internal.system.hotel.waitlist.cancelForConversation, {
    conversationId: conversation._id,
  });

  return pickByLanguage(language, {
    bn: "আপনার হোল্ডটি বাতিল করা হয়েছে। অন্য কোনোভাবে সাহায্য প্রয়োজন হলে জানান।",
    en: "Your hold has been cancelled. Let me know if there's anything else I can help with.",
  });
};
