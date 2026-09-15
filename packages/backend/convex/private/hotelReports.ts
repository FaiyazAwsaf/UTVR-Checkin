import { ConvexError, v } from "convex/values";
import { query, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

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

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 10);
};

const buildDayBuckets = (rangeDays: number) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const buckets: { date: string; timestamp: number }[] = [];

  for (let i = rangeDays - 1; i >= 0; i--) {
    const timestamp = today.getTime() - i * DAY_MS;
    buckets.push({ date: dateKey(timestamp), timestamp });
  }

  return buckets;
};

export const getSignupsOverTime = query({
  args: {
    rangeDays: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    const rangeDays = Math.max(1, Math.min(args.rangeDays, 90));
    const since = Date.now() - rangeDays * DAY_MS;

    const sessions = await ctx.db
      .query("contactSessions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.gte(q.field("_creationTime"), since))
      .collect();

    const buckets = buildDayBuckets(rangeDays);
    const counts = new Map(buckets.map((bucket) => [bucket.date, 0]));

    for (const session of sessions) {
      const key = dateKey(session._creationTime);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return buckets.map((bucket) => ({
      date: bucket.date,
      signups: counts.get(bucket.date) ?? 0,
    }));
  },
});

export const getConversationVolume = query({
  args: {
    rangeDays: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = await getOrganizationId(ctx);
    const rangeDays = Math.max(1, Math.min(args.rangeDays, 90));
    const since = Date.now() - rangeDays * DAY_MS;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q) => q.gte(q.field("_creationTime"), since))
      .collect();

    const buckets = buildDayBuckets(rangeDays);
    const support = new Map(buckets.map((bucket) => [bucket.date, 0]));
    const booking = new Map(buckets.map((bucket) => [bucket.date, 0]));

    for (const conversation of conversations) {
      const key = dateKey(conversation._creationTime);
      const target = conversation.mode === "booking" ? booking : support;

      if (target.has(key)) {
        target.set(key, (target.get(key) ?? 0) + 1);
      }
    }

    return buckets.map((bucket) => ({
      date: bucket.date,
      support: support.get(bucket.date) ?? 0,
      booking: booking.get(bucket.date) ?? 0,
    }));
  },
});

export const getMostBookedRoomTypes = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await getOrganizationId(ctx);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();

    const counts = new Map<Id<"roomTypes">, number>();

    for (const booking of bookings) {
      const key = booking.roomTypeId;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const results = await Promise.all(
      Array.from(counts.entries()).map(async ([roomTypeId, count]) => {
        const roomType = await ctx.db.get(roomTypeId);

        return {
          name: roomType?.name ?? "Unknown room",
          count,
        };
      }),
    );

    return results.sort((a, b) => b.count - a.count);
  },
});
