import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { deriveRoomStatus } from "../../lib/hotel/availability";

const overlaps = (
  checkInDate: string,
  checkOutDate: string,
  reservedCheckInDate: string,
  reservedCheckOutDate: string,
) => checkInDate < reservedCheckOutDate && checkOutDate > reservedCheckInDate;

export const get = internalQuery({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    return await deriveRoomStatus(ctx, args.roomTypeId);
  },
});

export const getReservedUnitsForDates = internalQuery({
  args: {
    roomTypeId: v.id("roomTypes"),
    checkInDate: v.string(),
    checkOutDate: v.string(),
  },
  handler: async (ctx, args) => {
    const activeHolds = await ctx.db
      .query("roomHolds")
      .withIndex("by_room_type_id_and_status", (q) =>
        q.eq("roomTypeId", args.roomTypeId).eq("status", "active"),
      )
      .collect();

    const confirmedBookings = await ctx.db
      .query("bookings")
      .withIndex("by_room_type_id", (q) => q.eq("roomTypeId", args.roomTypeId))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    const reservedHolds = activeHolds.filter(
      (hold) =>
        hold.expiresAt > Date.now() &&
        overlaps(args.checkInDate, args.checkOutDate, hold.checkInDate, hold.checkOutDate),
    ).length;
    const reservedBookings = confirmedBookings.filter((booking) =>
      overlaps(
        args.checkInDate,
        args.checkOutDate,
        booking.checkInDate,
        booking.checkOutDate,
      ),
    ).length;

    return reservedHolds + reservedBookings;
  },
});
