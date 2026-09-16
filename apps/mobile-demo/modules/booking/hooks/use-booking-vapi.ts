import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";
import type { Id } from "@workspace/backend/_generated/dataModel";

interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
}

export type GuestLanguage = "bn" | "en";

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (typeof error === "object" && error !== null && "error" in error) {
    const nestedError = (error as { error?: unknown }).error;

    if (typeof nestedError === "string") {
      return nestedError;
    }

    if (nestedError && typeof nestedError === "object") {
      return getErrorMessage(nestedError);
    }
  }

  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;

    if (typeof statusCode === "number") {
      return `Vapi request failed with status ${statusCode}.`;
    }
  }

  return "Unable to connect to the voice assistant.";
};

const FIRST_MESSAGE: Record<GuestLanguage, string> = {
  en: "Hello! I'm the booking assistant. How can I help you book a room today?",
  bn: "হ্যালো! আমি বুকিং সহকারী। আজ আপনাকে রুম বুক করতে কীভাবে সাহায্য করতে পারি?",
};

// Ported from apps/widget/modules/widget/hooks/use-vapi.ts. Unlike the
// widget's knowledge-search-only assistant, the booking assistant needs both
// contactSessionId and conversationId bound before the call starts (per
// docs/implementation.md's voice-conversation-binding decision) so every
// tool-call the assistant makes during the call carries a real
// conversationId, not just an org. guestLanguage is also passed statically
// since there's no saved user message yet for the backend to detect
// language from (see system/ai/hotelVoiceBooking.ts).
export const useBookingVapi = (
  contactSessionId: Id<"contactSessions"> | null,
  conversationId: Id<"conversations"> | null,
  guestLanguage: GuestLanguage,
) => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) {
      setError("Voice assistant is not configured.");
      return;
    }

    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    vapiInstance.on("call-start", () => {
      setIsConnected(true);
      setIsConnecting(false);
      setIsMuted(false);
      setTranscript([]);
      setError(null);
    });

    vapiInstance.on("call-end", () => {
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
      setIsMuted(false);
    });

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapiInstance.on("error", (error) => {
      console.error(error, "VAPI_ERROR");
      setIsConnecting(false);
      setIsConnected(false);
      setError(getErrorMessage(error));
    });

    vapiInstance.on("message", (message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role === "user" ? "user" : "assistant",
            text: message.transcript,
          },
        ]);
      }
    });

    return () => {
      vapiInstance.stop();
      vapiInstance.removeAllListeners();
    };
  }, []);

  const startCall = async () => {
    if (!VAPI_ASSISTANT_ID) {
      setError("Voice assistant is not configured.");
      return;
    }

    if (!contactSessionId || !conversationId) {
      setError("Your booking session is not ready. Please try again.");
      return;
    }

    if (!vapi) {
      setError("Voice assistant is still loading. Try again in a moment.");
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      await vapi.start(VAPI_ASSISTANT_ID, {
        firstMessage: FIRST_MESSAGE[guestLanguage],
        firstMessageMode: "assistant-speaks-first",
        variableValues: {
          contactSessionId,
          conversationId,
          guestLanguage,
        },
      });
    } catch (error) {
      vapi.stop();
      setIsConnecting(false);
      setIsConnected(false);
      setError(getErrorMessage(error));
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (!vapi || !isConnected) {
      return;
    }

    const nextMuted = !isMuted;

    try {
      vapi.setMuted(nextMuted);
      setIsMuted(nextMuted);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  return {
    error,
    isConfigured: Boolean(VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID),
    isSpeaking,
    isConnecting,
    isConnected,
    isMuted,
    transcript,
    startCall,
    endCall,
    toggleMute,
  };
};
