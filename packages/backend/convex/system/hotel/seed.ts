import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const seedDemoHotel = internalMutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hotelProfiles")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (existing) {
      return { ok: false as const, reason: "already_seeded" as const };
    }

    await ctx.db.insert("hotelProfiles", {
      organizationId: args.organizationId,
      name: "UVTR Grand Dhaka",
      description:
        "A premium hotel in the heart of Dhaka, suited for both business and leisure travelers.",
      address: "123 Gulshan Avenue, Dhaka 1212",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      currency: "BDT",
      amenities: [
        "Free WiFi",
        "Swimming Pool",
        "Fitness Center",
        "Free Parking",
        "Room Service",
        "Airport Shuttle",
      ],
      policies:
        "A valid photo ID is required at check-in. Smoking is permitted only in designated rooms.",
    });

    const roomTypeIds = await Promise.all([
      ctx.db.insert("roomTypes", {
        organizationId: args.organizationId,
        name: "Standard Room",
        description: "A comfortable, well-equipped room suited for solo or paired travelers.",
        basePrice: 4500,
        maxOccupancy: 2,
        totalUnits: 8,
        amenities: ["Free WiFi", "Air Conditioning", "TV"],
        smokingAllowed: false,
        isActive: true,
      }),
      ctx.db.insert("roomTypes", {
        organizationId: args.organizationId,
        name: "Deluxe King",
        description: "A spacious room with a king-size bed and city views.",
        basePrice: 7500,
        maxOccupancy: 3,
        totalUnits: 5,
        amenities: ["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "City View"],
        smokingAllowed: false,
        isActive: true,
      }),
      ctx.db.insert("roomTypes", {
        organizationId: args.organizationId,
        name: "Family Suite",
        description: "A large suite with two bedrooms, ideal for families traveling together.",
        basePrice: 12000,
        maxOccupancy: 5,
        totalUnits: 3,
        amenities: ["Free WiFi", "Air Conditioning", "TV", "Mini Bar", "Sofa Corner", "Two Bathrooms"],
        smokingAllowed: false,
        isActive: true,
      }),
      ctx.db.insert("roomTypes", {
        organizationId: args.organizationId,
        name: "Executive Business Room",
        description: "A room set up for business travelers, with a work desk and high-speed internet.",
        basePrice: 6500,
        maxOccupancy: 2,
        totalUnits: 4,
        amenities: ["Free WiFi", "Air Conditioning", "Work Desk", "Coffee Maker"],
        smokingAllowed: false,
        isActive: true,
      }),
      ctx.db.insert("roomTypes", {
        organizationId: args.organizationId,
        name: "Presidential Suite",
        description:
          "The hotel's most luxurious suite — only one unit, ideal for special occasions.",
        basePrice: 25000,
        maxOccupancy: 4,
        totalUnits: 1,
        amenities: [
          "Free WiFi",
          "Air Conditioning",
          "Private Butler",
          "Jacuzzi",
          "Panoramic View",
          "Mini Bar",
        ],
        smokingAllowed: false,
        isActive: true,
      }),
    ]);

    await Promise.all([
      ctx.db.insert("packageAddOns", {
        organizationId: args.organizationId,
        name: "Airport Pickup",
        description: "Private car transfer from the airport to the hotel.",
        price: 1500,
        isActive: true,
      }),
      ctx.db.insert("packageAddOns", {
        organizationId: args.organizationId,
        name: "Swimming Pool Access",
        description: "Unlimited pool access for the duration of your stay.",
        price: 800,
        isActive: true,
      }),
      ctx.db.insert("packageAddOns", {
        organizationId: args.organizationId,
        name: "Late Check-out",
        description: "Keep your room until 4 PM.",
        price: 1200,
        isActive: true,
      }),
      ctx.db.insert("packageAddOns", {
        organizationId: args.organizationId,
        name: "Breakfast Package",
        description: "Daily buffet breakfast.",
        price: 1000,
        isActive: true,
      }),
    ]);

    return { ok: true as const, roomTypeIds };
  },
});
