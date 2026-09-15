import { DemoProfile } from "@/modules/booking/types";

// 5 canned customer profiles for the live pitch demo. "Guest A" and "Guest B"
// exist specifically for the two-tab/two-phone race demo — both point at the
// same scarce (totalUnits: 1) room to showcase the hold/waitlist behavior
// live. The other three are single-profile happy-path/edge-case stories.
export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "rafiq-ahmed",
    displayName: "Rafiq Ahmed",
    email: "rafiq.ahmed@example.com",
    scenario: "Solo traveler, 2 nights — the straightforward happy path.",
    defaultPrompt:
      "আমি একা ২ রাতের জন্য একটা রুম বুক করতে চাই।",
    avatarSeed: "rafiq-ahmed",
  },
  {
    id: "karim-family",
    displayName: "The Karim Family",
    email: "karim.family@example.com",
    scenario: "2 adults + 2 kids, 3 nights — tests party-size room steering.",
    defaultPrompt:
      "আমরা ৪ জন (২ জন প্রাপ্তবয়স্ক, ২ জন বাচ্চা) ৩ রাতের জন্য থাকতে চাই। কোন রুম ভালো হবে?",
    avatarSeed: "karim-family",
  },
  {
    id: "nusrat-tanvir",
    displayName: "Nusrat & Tanvir",
    email: "nusrat.tanvir@example.com",
    scenario: "2 adults, 1 night, anniversary — tests package add-ons.",
    defaultPrompt:
      "আমাদের ম্যারেজ অ্যানিভার্সারি, ১ রাতের জন্য একটা সুন্দর রুম চাই সাথে কিছু স্পেশাল প্যাকেজ থাকলে ভালো হয়।",
    avatarSeed: "nusrat-tanvir",
  },
  {
    id: "farhan-business",
    displayName: "Farhan (Business Traveler)",
    email: "farhan.business@example.com",
    scenario: "Solo, 1 night, price-sensitive — tests FAQ-during-booking.",
    defaultPrompt:
      "হোটেলের চেক-ইন সময় কখন? আর সবচেয়ে সস্তা রুম কোনটা?",
    avatarSeed: "farhan-business",
  },
  {
    id: "guest-a",
    displayName: "Guest A (Race Demo)",
    email: "guest.a@example.com",
    scenario:
      "Race-demo profile — run this alongside Guest B, both targeting the Presidential Suite, to show the live hold/waitlist behavior.",
    defaultPrompt:
      "আমি Presidential Suite বুক করতে চাই, ২ জনের জন্য, আজ থেকে ২ রাত।",
    avatarSeed: "guest-a",
  },
  {
    id: "guest-b",
    displayName: "Guest B (Race Demo)",
    email: "guest.b@example.com",
    scenario:
      "Race-demo profile — run this alongside Guest A, both targeting the Presidential Suite, to show the live hold/waitlist behavior.",
    defaultPrompt:
      "আমি Presidential Suite বুক করতে চাই, ২ জনের জন্য, আজ থেকে ২ রাত।",
    avatarSeed: "guest-b",
  },
];
