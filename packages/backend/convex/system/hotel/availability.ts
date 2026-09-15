import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { deriveRoomStatus } from "../../lib/hotel/availability";

export const get = internalQuery({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    return await deriveRoomStatus(ctx, args.roomTypeId);
  },
});
