"use client";

import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckCircle2Icon } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { brand } from "@workspace/ui/brand";
import {
  activeProfileIdAtom,
  confirmationCodeAtom,
  contactSessionIdAtomFamily,
  conversationIdAtomFamily,
  screenAtom,
} from "@/modules/booking/atoms/booking-atoms";
import { QrCodeDisplay } from "@/modules/booking/ui/components/qr-code-display";

export const ConfirmationScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setActiveProfileId = useSetAtom(activeProfileIdAtom);
  const activeProfileId = useAtomValue(activeProfileIdAtom);
  const confirmationCode = useAtomValue(confirmationCodeAtom);

  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(activeProfileId ?? ""),
  );
  const setConversationId = useSetAtom(
    conversationIdAtomFamily(activeProfileId ?? ""),
  );

  const booking = useQuery(
    api.public.bookings.getByConfirmationCode,
    contactSessionId && confirmationCode
      ? { contactSessionId, confirmationCode }
      : "skip",
  );

  const handleDone = () => {
    setActiveProfileId(null);
    setConversationId(null);
    setScreen("profile-select");
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <CheckCircle2Icon className="size-16 text-emerald-500" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Booking confirmed!</h1>
        <p className="text-sm text-muted-foreground">
          In a real stay, this QR code and confirmation would also be emailed
          to the guest. Here, it&apos;s rendered directly in the app.
        </p>
      </div>

      {confirmationCode && <QrCodeDisplay value={confirmationCode} />}

      {booking && (
        <div className="w-full max-w-xs space-y-2 rounded-xl border bg-muted/30 p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confirmation</span>
            <span className="font-mono font-medium">{booking.confirmationCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium">{booking.roomTypeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guest</span>
            <span className="font-medium">{booking.guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates</span>
            <span className="font-medium">
              {booking.checkInDate} &rarr; {booking.checkOutDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">৳{booking.totalPrice}</span>
          </div>
        </div>
      )}

      <Button onClick={handleDone} size="lg">
        Done — back to profiles
      </Button>

      <p className="text-xs text-muted-foreground">{brand.name}</p>
    </div>
  );
};
