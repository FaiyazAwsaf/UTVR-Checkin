import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plugins: defineTable({
    organizationId: v.string(),
    service: v.union(v.literal("vapi")),
    credentials: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_service", ["organizationId", "service"]),
  conversations: defineTable({
    threadId: v.string(),
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
    mode: v.optional(v.union(v.literal("support"), v.literal("booking"))),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_thread_id", ["threadId"])
    .index("by_status_and_organization_id", ["status", "organizationId"])
    .index("by_organization_id_and_mode", ["organizationId", "mode"]),
  contactSessions: defineTable({
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    expiresAt: v.number(),
    metadata: v.optional(v.object({
      userAgent: v.optional(v.string()),
      language: v.optional(v.string()),
      languages: v.optional(v.string()),
      platform: v.optional(v.string()),
      vendor: v.optional(v.string()),
      screenResolution: v.optional(v.string()),
      viewportSize: v.optional(v.string()),
      timezone: v.optional(v.string()),
      timezoneOffset: v.optional(v.number()),
      cookieEnabled: v.optional(v.boolean()),
      referrer: v.optional(v.string()),
      currentUrl: v.optional(v.string()),
    }))
  })
  .index("by_organization_id", ["organizationId"])
  .index("by_expires_at", ["expiresAt"]),
  widgetSettings: defineTable({
    organizationId: v.string(),
    brandName: v.string(),
    logoUrl: v.string(),
    primaryColor: v.string(),
    greeting: v.string(),
    assistantName: v.string(),
    suggestions: v.array(v.string()),
    showAttribution: v.boolean(),
  }).index("by_organization_id", ["organizationId"]),
  users: defineTable({
    name: v.string(),
  }),
  hotelProfiles: defineTable({
    organizationId: v.string(),
    name: v.string(),
    description: v.string(),
    address: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
    currency: v.string(),
    amenities: v.array(v.string()),
    policies: v.optional(v.string()),
  }).index("by_organization_id", ["organizationId"]),
  roomTypes: defineTable({
    organizationId: v.string(),
    name: v.string(),
    description: v.string(),
    basePrice: v.number(),
    maxOccupancy: v.number(),
    totalUnits: v.number(),
    imageUrl: v.optional(v.string()),
    amenities: v.array(v.string()),
    smokingAllowed: v.boolean(),
    isActive: v.boolean(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_is_active", ["organizationId", "isActive"]),
  packageAddOns: defineTable({
    organizationId: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    isActive: v.boolean(),
  }).index("by_organization_id", ["organizationId"]),
  roomHolds: defineTable({
    organizationId: v.string(),
    roomTypeId: v.id("roomTypes"),
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal("active"),
      v.literal("confirmed"),
      v.literal("released"),
      v.literal("expired")
    ),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    partySize: v.number(),
    selectedPackageIds: v.array(v.id("packageAddOns")),
    quotedTotalPrice: v.number(),
    expiresAt: v.number(),
    scheduledReleaseJobId: v.optional(v.string()),
    channel: v.union(v.literal("text"), v.literal("voice")),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_room_type_id_and_status", ["roomTypeId", "status"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_expires_at", ["expiresAt"]),
  waitlistEntries: defineTable({
    organizationId: v.string(),
    roomTypeId: v.id("roomTypes"),
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    partySize: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("notified"),
      v.literal("cancelled")
    ),
  })
    .index("by_room_type_id_and_status", ["roomTypeId", "status"])
    .index("by_conversation_id", ["conversationId"]),
  bookings: defineTable({
    organizationId: v.string(),
    roomTypeId: v.id("roomTypes"),
    conversationId: v.id("conversations"),
    contactSessionId: v.id("contactSessions"),
    sourceHoldId: v.id("roomHolds"),
    confirmationCode: v.string(),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    partySize: v.number(),
    selectedPackageIds: v.array(v.id("packageAddOns")),
    totalPrice: v.number(),
    guestName: v.string(),
    guestEmail: v.string(),
    channel: v.union(v.literal("text"), v.literal("voice")),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_room_type_id", ["roomTypeId"])
    .index("by_confirmation_code", ["confirmationCode"])
    .index("by_contact_session_id", ["contactSessionId"]),
});
