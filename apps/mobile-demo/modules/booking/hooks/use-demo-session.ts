"use client";

import { useMutation } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtomFamily,
  conversationIdAtomFamily,
  errorMessageAtom,
} from "@/modules/booking/atoms/booking-atoms";
import { DemoProfile } from "@/modules/booking/types";

const HOTEL_ORG_ID = process.env.NEXT_PUBLIC_HOTEL_ORG_ID || "";

// Ensures the selected demo profile has a contact session + booking-mode
// conversation, creating them on first use and reusing them on every later
// visit (so re-running a demo continues the same conversation instead of
// starting fresh each time).
export const useDemoSession = (profile: DemoProfile | null) => {
  const profileId = profile?.id ?? "";

  const contactSessionId = useAtomValue(contactSessionIdAtomFamily(profileId));
  const setContactSessionId = useSetAtom(contactSessionIdAtomFamily(profileId));
  const conversationId = useAtomValue(conversationIdAtomFamily(profileId));
  const setConversationId = useSetAtom(conversationIdAtomFamily(profileId));
  const setErrorMessage = useSetAtom(errorMessageAtom);

  const createContactSession = useMutation(api.public.contactSessions.create);
  const createBooking = useMutation(api.public.conversations.createBooking);

  const [isReady, setIsReady] = useState(false);
  const isBootstrapping = useRef(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (contactSessionId && conversationId) {
      setIsReady(true);
      return;
    }

    if (isBootstrapping.current) {
      return;
    }

    if (!HOTEL_ORG_ID) {
      setErrorMessage("NEXT_PUBLIC_HOTEL_ORG_ID is not configured");
      return;
    }

    isBootstrapping.current = true;
    setIsReady(false);

    (async () => {
      try {
        let sessionId = contactSessionId;

        if (!sessionId) {
          sessionId = await createContactSession({
            name: profile.displayName,
            email: profile.email,
            organizationId: HOTEL_ORG_ID,
          });
          setContactSessionId(sessionId);
        }

        if (!conversationId) {
          const newConversationId = await createBooking({
            organizationId: HOTEL_ORG_ID,
            contactSessionId: sessionId,
          });
          setConversationId(newConversationId);
        }

        setIsReady(true);
      } catch {
        setErrorMessage("Unable to start the demo session. Check the org id and try again.");
      } finally {
        isBootstrapping.current = false;
      }
    })();
  }, [
    profile,
    contactSessionId,
    conversationId,
    createContactSession,
    createBooking,
    setContactSessionId,
    setConversationId,
    setErrorMessage,
  ]);

  return {
    isReady,
    contactSessionId,
    conversationId,
    organizationId: HOTEL_ORG_ID,
  };
};
