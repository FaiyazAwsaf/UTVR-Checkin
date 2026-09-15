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

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    return await ctx.db
      .query("packageAddOns")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getOne = query({
  args: {
    packageAddOnId: v.id("packageAddOns"),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const packageAddOn = await ctx.db.get(args.packageAddOnId);

    if (!packageAddOn) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Package add-on not found",
      });
    }

    if (packageAddOn.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    return packageAddOn;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const name = args.name.trim();
    const description = args.description.trim();

    if (!name || !description) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Name and description are required",
      });
    }

    if (args.price <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Price must be greater than zero",
      });
    }

    return await ctx.db.insert("packageAddOns", {
      organizationId,
      name,
      description,
      price: args.price,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    packageAddOnId: v.id("packageAddOns"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const packageAddOn = await ctx.db.get(args.packageAddOnId);

    if (!packageAddOn) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Package add-on not found",
      });
    }

    if (packageAddOn.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    const name = args.name.trim();
    const description = args.description.trim();

    if (!name || !description) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Name and description are required",
      });
    }

    if (args.price <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Price must be greater than zero",
      });
    }

    await ctx.db.patch(args.packageAddOnId, {
      name,
      description,
      price: args.price,
    });
  },
});

export const setActive = mutation({
  args: {
    packageAddOnId: v.id("packageAddOns"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);

    const packageAddOn = await ctx.db.get(args.packageAddOnId);

    if (!packageAddOn) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Package add-on not found",
      });
    }

    if (packageAddOn.organizationId !== organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.patch(args.packageAddOnId, { isActive: args.isActive });
  },
});
