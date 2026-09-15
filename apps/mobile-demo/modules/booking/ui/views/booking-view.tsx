"use client";

import { useAtomValue } from "jotai";
import { brand } from "@workspace/ui/brand";
import { errorMessageAtom, screenAtom } from "@/modules/booking/atoms/booking-atoms";
import { ProfileSelectScreen } from "@/modules/booking/ui/screens/profile-select-screen";
import { SignUpScreen } from "@/modules/booking/ui/screens/sign-up-screen";
import { BookingChatScreen } from "@/modules/booking/ui/screens/booking-chat-screen";
import { BookingVoiceScreen } from "@/modules/booking/ui/screens/booking-voice-screen";
import { ConfirmationScreen } from "@/modules/booking/ui/screens/confirmation-screen";

export const BookingView = () => {
  const screen = useAtomValue(screenAtom);
  const errorMessage = useAtomValue(errorMessageAtom);

  const screenComponents = {
    "profile-select": <ProfileSelectScreen />,
    "sign-up": <SignUpScreen />,
    chat: <BookingChatScreen />,
    voice: <BookingVoiceScreen />,
    confirmation: <ConfirmationScreen />,
  };

  return (
    <main
      className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:border sm:shadow-2xl"
      style={
        {
          "--primary": brand.colors.primary,
          "--ring": brand.colors.primary,
          "--sidebar-primary": brand.colors.primary,
          "--sidebar-ring": brand.colors.primary,
          "--brand-gradient-to": brand.colors.gradientTo,
        } as React.CSSProperties
      }
    >
      {errorMessage ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-medium text-destructive">Configuration error</p>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      ) : (
        screenComponents[screen]
      )}
    </main>
  );
};
