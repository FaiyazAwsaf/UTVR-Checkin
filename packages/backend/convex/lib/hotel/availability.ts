import type { Id } from "../../_generated/dataModel";

export type RoomStatus =
  | { state: "available" }
  | {
      state: "held";
      holdId: Id<"roomHolds">;
      conversationId: Id<"conversations">;
      contactSessionId: Id<"contactSessions">;
      expiresAt: number;
    }
  | { state: "confirmed"; bookingId: Id<"bookings"> };

// Single source of truth for room availability: called by both the
// operator dashboard grid and the guest-facing public listing so the
// two views can never disagree about whether a room is bookable.
export const deriveRoomStatus = async (
  ctx: { db: any },
  roomTypeId: Id<"roomTypes">,
): Promise<RoomStatus> => {
  const activeHold = await ctx.db
    .query("roomHolds")
    .withIndex("by_room_type_id_and_status", (q: any) =>
      q.eq("roomTypeId", roomTypeId).eq("status", "active"),
    )
    .first();

  if (activeHold) {
    return {
      state: "held",
      holdId: activeHold._id,
      conversationId: activeHold.conversationId,
      contactSessionId: activeHold.contactSessionId,
      expiresAt: activeHold.expiresAt,
    };
  }

  const confirmedHold = await ctx.db
    .query("roomHolds")
    .withIndex("by_room_type_id_and_status", (q: any) =>
      q.eq("roomTypeId", roomTypeId).eq("status", "confirmed"),
    )
    .first();

  if (confirmedHold) {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_room_type_id", (q: any) =>
        q.eq("roomTypeId", roomTypeId),
      )
      .filter((q: any) => q.eq(q.field("sourceHoldId"), confirmedHold._id))
      .first();

    if (booking) {
      return { state: "confirmed", bookingId: booking._id };
    }
  }

  return { state: "available" };
};
