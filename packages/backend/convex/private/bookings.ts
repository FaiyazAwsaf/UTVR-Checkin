import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, QueryCtx } from "../_generated/server";

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

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const bookingsWithRoomType = await Promise.all(
      bookings.page.map(async (booking) => {
        const roomType = await ctx.db.get(booking.roomTypeId);

        return {
          ...booking,
          roomTypeName: roomType?.name ?? "Unknown room",
        };
      }),
    );

    return {
      ...bookings,
      page: bookingsWithRoomType,
    };
  },
});

export const getOne = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const booking = await ctx.db.get(args.bookingId);

    if (!booking) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    }

    if (booking.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    const roomType = await ctx.db.get(booking.roomTypeId);

    return {
      ...booking,
      roomTypeName: roomType?.name ?? "Unknown room",
    };
  },
});
