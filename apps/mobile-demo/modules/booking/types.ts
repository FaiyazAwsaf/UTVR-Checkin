import { BOOKING_SCREENS } from "@/modules/booking/constants";

export type BookingScreen = (typeof BOOKING_SCREENS)[number];

export interface DemoProfile {
  id: string;
  displayName: string;
  email: string;
  defaultPrompt: string;
  scenario: string;
  avatarSeed: string;
}
