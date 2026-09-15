"use client";

import { useSetAtom } from "jotai";
import { ArrowLeftIcon, PhoneCallIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { screenAtom } from "@/modules/booking/atoms/booking-atoms";

// Voice booking is built in Step 7 (the /vapi/hotel-booking bridge doesn't
// exist yet) — this screen is a placeholder so the chat screen's "Call to
// book" button has somewhere to go instead of a dead link. Once Step 7 is
// done, this becomes a real "Call to book" flow ported from
// apps/widget/modules/widget/hooks/use-vapi.ts, passing both
// contactSessionId and conversationId as Vapi variableValues.
export const BookingVoiceScreen = () => {
  const setScreen = useSetAtom(screenAtom);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 bg-gradient-to-b from-primary to-brand-gradient p-4 text-primary-foreground">
        <Button onClick={() => setScreen("chat")} size="icon" variant="transparent">
          <ArrowLeftIcon />
        </Button>
        <p className="font-medium">Call to book</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <PhoneCallIcon className="size-12 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Voice booking is coming soon</p>
          <p className="text-sm text-muted-foreground">
            This demo currently supports text booking. Voice booking (talk to the same AI on a phone
            call) is the next piece to be built.
          </p>
        </div>
        <Button onClick={() => setScreen("chat")} variant="outline">
          Back to chat
        </Button>
      </div>
    </div>
  );
};
