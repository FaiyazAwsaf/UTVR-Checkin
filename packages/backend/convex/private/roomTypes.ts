import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";

const getOrganizationId = async (ctx: QueryCtx | MutationCtx) => {
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

const validateRoomTypeFields = (args: {
  name: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  totalUnits: number;
}) => {
  if (!args.name.trim() || !args.description.trim()) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Name and description are required",
    });
  }

  if (args.basePrice <= 0) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Base price must be greater than zero",
    });
  }

  if (args.maxOccupancy <= 0) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Max occupancy must be greater than zero",
    });
  }

  if (args.totalUnits <= 0) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Total units must be greater than zero",
    });
  }
};

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    return await ctx.db
      .query("roomTypes")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getOne = query({
  args: {
    roomTypeId: v.id("roomTypes"),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const roomType = await ctx.db.get(args.roomTypeId);

    if (!roomType) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Room type not found",
      });
    }

    if (roomType.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    return roomType;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    maxOccupancy: v.number(),
    totalUnits: v.number(),
    imageUrl: v.optional(v.string()),
    amenities: v.array(v.string()),
    smokingAllowed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    validateRoomTypeFields(args);

    return await ctx.db.insert("roomTypes", {
      organizationId,
      name: args.name.trim(),
      description: args.description.trim(),
      basePrice: args.basePrice,
      maxOccupancy: args.maxOccupancy,
      totalUnits: args.totalUnits,
      imageUrl: args.imageUrl?.trim() || undefined,
      amenities: args.amenities.map((a) => a.trim()).filter(Boolean),
      smokingAllowed: args.smokingAllowed,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    roomTypeId: v.id("roomTypes"),
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    maxOccupancy: v.number(),
    totalUnits: v.number(),
    imageUrl: v.optional(v.string()),
    amenities: v.array(v.string()),
    smokingAllowed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const roomType = await ctx.db.get(args.roomTypeId);

    if (!roomType) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Room type not found",
      });
    }

    if (roomType.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    validateRoomTypeFields(args);

    await ctx.db.patch(args.roomTypeId, {
      name: args.name.trim(),
      description: args.description.trim(),
      basePrice: args.basePrice,
      maxOccupancy: args.maxOccupancy,
      totalUnits: args.totalUnits,
      imageUrl: args.imageUrl?.trim() || undefined,
      amenities: args.amenities.map((a) => a.trim()).filter(Boolean),
      smokingAllowed: args.smokingAllowed,
    });
  },
});

export const setActive = mutation({
  args: {
    roomTypeId: v.id("roomTypes"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const roomType = await ctx.db.get(args.roomTypeId);

    if (!roomType) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Room type not found",
      });
    }

    if (roomType.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.patch(args.roomTypeId, { isActive: args.isActive });
  },
});
