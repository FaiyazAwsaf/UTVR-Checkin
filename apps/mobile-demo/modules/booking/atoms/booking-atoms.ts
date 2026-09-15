import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { Id } from "@workspace/backend/_generated/dataModel";
import { CONTACT_SESSION_KEY } from "@/modules/booking/constants";
import { BookingScreen, DemoProfile } from "@/modules/booking/types";

export const screenAtom = atom<BookingScreen>("profile-select");
export const activeProfileIdAtom = atom<string | null>(null);

// Guests who "sign up" on the spot (not one of the static DEMO_PROFILES) get
// their profile data persisted here, keyed by the same id used everywhere
// else (contactSessionIdAtomFamily, conversationIdAtomFamily). One entry per
// custom guest, so re-opening the app resumes their session instead of
// asking them to sign up again.
export const customProfileAtomFamily = atomFamily((profileId: string) => {
  return atomWithStorage<DemoProfile | null>(
    `${CONTACT_SESSION_KEY}_custom_profile_${profileId}`,
    null,
  );
});

// One localStorage key per demo profile, so switching profiles (or running
// two profiles in two tabs) keeps completely separate guest identities and
// conversation history — mirrors the widget's per-organization session
// pattern, but keyed by profile instead since this app targets one fixed org.
export const contactSessionIdAtomFamily = atomFamily((profileId: string) => {
  return atomWithStorage<Id<"contactSessions"> | null>(
    `${CONTACT_SESSION_KEY}_${profileId}`,
    null,
  );
});

export const conversationIdAtomFamily = atomFamily((profileId: string) => {
  return atomWithStorage<Id<"conversations"> | null>(
    `${CONTACT_SESSION_KEY}_conversation_${profileId}`,
    null,
  );
});

export const errorMessageAtom = atom<string | null>(null);
export const confirmationCodeAtom = atom<string | null>(null);
