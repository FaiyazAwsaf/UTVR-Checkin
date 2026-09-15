import { ConvexError } from "convex/values";
import { query, QueryCtx } from "../_generated/server";
import { deriveRoomStatus } from "../lib/hotel/availability";

const getOrganizationId = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const organizationId = identity.org_id as string;

  if (!organizationId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return organizationId;
};

export const getActiveGrid = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);

    const roomTypes = await ctx.db
      .query("roomTypes")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", organizationId).eq("isActive", true),
      )
      .collect();

    const grid = await Promise.all(
      roomTypes.map(async (roomType) => {
        const status = await deriveRoomStatus(ctx, roomType._id);

        if (status.state === "available") {
          return {
            roomType,
            status: "available" as const,
          };
        }

        if (status.state === "held") {
          const contactSession = await ctx.db.get(status.contactSessionId);

          return {
            roomType,
            status: "held" as const,
            expiresAt: status.expiresAt,
            guestName: contactSession?.name ?? "Unknown guest",
          };
        }

        const booking = await ctx.db.get(status.bookingId);

        return {
          roomType,
          status: "confirmed" as const,
          guestName: booking?.guestName ?? "Unknown guest",
          confirmationCode: booking?.confirmationCode ?? "",
        };
      }),
    );

    return grid;
  },
});
