"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BotIcon,
  CheckIcon,
  MicIcon,
  MicOffIcon,
  PhoneCallIcon,
  PhoneOffIcon,
  RadioIcon,
} from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { WidgetFooter } from "../components/widget-footer";
import { WidgetHeader } from "../components/widget-header";
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  widgetSettingsAtom,
} from "../../atoms/widget-atoms";
import { useVapi } from "../../hooks/use-vapi";
import { brand } from "@workspace/ui/brand";

export const WidgetVoiceScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const settings = useAtomValue(widgetSettingsAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
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
  } = useVapi(settings?.brandName || brand.name, contactSessionId);

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
    setScreen("selection");
  };

  const status = isConnecting
    ? "Connecting"
    : isConnected
      ? isSpeaking
        ? `${settings?.assistantName || brand.assistantName} is speaking`
        : "Listening to you"
      : "Ready to talk";

  return (
    <>
      <WidgetHeader className="flex items-center gap-x-3 px-4 py-3">
        <Button
          aria-label="Back to chat options"
          onClick={onBack}
          size="icon"
          variant="transparent"
        >
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-x-2">
            <p className="truncate font-semibold">Voice support</p>
            {isConnected && (
              <span className="flex items-center gap-x-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-primary-foreground/75">{status}</p>
        </div>
        <BotIcon className="size-5 text-primary-foreground/80" />
      </WidgetHeader>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0b2860] via-primary to-[#5e9fff] px-5 pb-7 pt-8 text-primary-foreground">
          <div className="absolute -right-16 -top-20 size-48 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 -left-16 size-56 rounded-full border border-white/10" />
          <div className="relative flex flex-col items-center text-center">
            <img
              alt={`${settings?.brandName || brand.name} logo`}
              className={`size-24 rounded-[30px] object-contain shadow-xl shadow-blue-950/20 ${isSpeaking ? "animate-pulse" : ""}`}
              src={settings?.logoUrl || brand.logo}
            />
            <p className="mt-5 text-xl font-semibold tracking-tight">
              {isConnected
                ? "You're connected"
                : `Talk with ${settings?.assistantName || brand.assistantName}`}
            </p>
            <p className="mt-1 max-w-[260px] text-sm leading-5 text-primary-foreground/75">
              {isConnected
                ? isSpeaking
                  ? `${settings?.assistantName || brand.assistantName} is answering you now.`
                  : `Speak naturally. ${settings?.assistantName || brand.assistantName} is listening.`
                : "Get quick help without typing a message."}
            </p>
            <div className="mt-5 flex items-center gap-x-2 rounded-full bg-black/15 px-3 py-1.5 text-xs text-primary-foreground/85">
              <RadioIcon className="size-3.5" />
              Secure browser call
            </div>
          </div>
        </section>

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
                        {isUser ? "You" : "R"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isUser
                            ? "You"
                            : settings?.assistantName || brand.assistantName}
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
                <p className="font-medium">Voice chat unavailable</p>
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
              {isConnecting ? "Connecting..." : "Start voice chat"}
            </Button>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Your browser will ask for microphone access.
          </p>
        </section>
      </div>

      <WidgetFooter />
    </>
  );
};
