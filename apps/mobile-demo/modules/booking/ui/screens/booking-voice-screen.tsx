"use client";

import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  MicIcon,
  MicOffIcon,
  PhoneCallIcon,
  PhoneOffIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { brand } from "@workspace/ui/brand";
import {
  activeProfileIdAtom,
  confirmationCodeAtom,
  contactSessionIdAtomFamily,
  conversationIdAtomFamily,
  customProfileAtomFamily,
  screenAtom,
} from "@/modules/booking/atoms/booking-atoms";
import { DEMO_PROFILES } from "@/modules/booking/data/demo-profiles";
import {
  useBookingVapi,
} from "@/modules/booking/hooks/use-booking-vapi";

// Ported from apps/widget/modules/widget/ui/screens/widget-voice-screen.tsx's
// visual pattern, adapted for a full-viewport mobile app screen instead of an
// Voice booking is intentionally Bangla-only. Chat remains multilingual and
// continues to detect the guest's language independently.
export const BookingVoiceScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConfirmationCode = useSetAtom(confirmationCodeAtom);
  const activeProfileId = useAtomValue(activeProfileIdAtom);
  const customProfile = useAtomValue(customProfileAtomFamily(activeProfileId ?? ""));

  const profile =
    DEMO_PROFILES.find((p) => p.id === activeProfileId) ?? customProfile ?? null;

  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(activeProfileId ?? ""),
  );
  const conversationId = useAtomValue(
    conversationIdAtomFamily(activeProfileId ?? ""),
  );

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    endCall,
    error,
    isConfigured,
    isConnected,
    isMuted,
    isSpeaking,
    isConnecting,
    startCall,
    toggleMute,
    transcript,
  } = useBookingVapi(contactSessionId, conversationId, "bn");

  const latestBooking = useQuery(
    api.public.bookings.getLatestForSession,
    contactSessionId ? { contactSessionId } : "skip",
  );

  useEffect(() => {
    if (latestBooking) {
      setConfirmationCode(latestBooking.confirmationCode);
      setScreen("confirmation");
    }
  }, [latestBooking, setConfirmationCode, setScreen]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  }, [transcript.length]);

  const onBack = () => {
    endCall();
    setScreen("chat");
  };

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No profile selected.
      </div>
    );
  }

  const status = isConnecting
    ? "Connecting"
    : isConnected
      ? isSpeaking
        ? "Assistant is speaking"
        : "Listening to you"
      : "Ready to call";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 bg-gradient-to-b from-primary to-brand-gradient p-4 text-primary-foreground">
        <Button onClick={onBack} size="icon" variant="transparent">
          <ArrowLeftIcon />
        </Button>
        <DicebearAvatar seed={profile.avatarSeed} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile.displayName}</p>
          <p className="text-xs opacity-80">{status}</p>
        </div>
        {isConnected && (
          <span className="flex items-center gap-x-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Live
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
        <section
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col px-4 py-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Live transcript</p>
              <p className="text-xs text-muted-foreground">
                {transcript.length === 0
                  ? "Your conversation will appear here"
                  : `${transcript.length} ${transcript.length === 1 ? "line" : "lines"}`}
              </p>
            </div>
            {transcript.length > 0 && (
              <span className="flex items-center gap-x-1.5 text-xs text-emerald-600">
                <CheckIcon className="size-3.5" />
                Live
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-background p-3 shadow-sm">
            {transcript.length === 0 ? (
              <div className="flex h-full min-h-28 flex-col items-center justify-center text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MicIcon className="size-5" />
                </div>
                <p className="mt-3 text-sm font-medium">Nothing recorded yet</p>
                <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
                  Start the call and your spoken conversation will show here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((message, index) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      className="flex items-start gap-2.5"
                      key={`${message.role}-${index}`}
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${isUser ? "bg-primary text-primary-foreground" : "bg-slate-900 text-white"}`}
                      >
                        {isUser ? "You" : "AI"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isUser ? "You" : "Booking Assistant"}
                        </p>
                        <p className="text-sm leading-5 text-foreground">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </section>

        <section className="border-t bg-background px-4 pb-4 pt-3">
          {error && (
            <div
              className="mb-3 flex items-start gap-x-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Voice call unavailable</p>
                <p className="mt-1 text-xs leading-4">{error}</p>
              </div>
            </div>
          )}

          {isConnected ? (
            <div className="grid grid-cols-[1fr_1.25fr] gap-2">
              <Button
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                className="h-11"
                onClick={toggleMute}
                variant="outline"
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button className="h-11" onClick={endCall} variant="destructive">
                <PhoneOffIcon />
                End call
              </Button>
            </div>
          ) : (
            <Button
              className="h-12 w-full rounded-xl"
              disabled={!isConfigured || isConnecting}
              onClick={() => void startCall()}
              size="lg"
            >
              <PhoneCallIcon />
              {isConnecting ? "Connecting..." : "Call to book"}
            </Button>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Your browser will ask for microphone access.
          </p>
        </section>
      </div>

      <p className="border-t bg-background py-2 text-center text-xs text-muted-foreground">
        {brand.name}
      </p>
    </div>
  );
};
