import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";
import { brand } from "@workspace/ui/brand";
import type { Id } from "@workspace/backend/_generated/dataModel";

interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
}

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

export const useVapi = (
  brandName = brand.name,
  contactSessionId: Id<"contactSessions"> | null = null,
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

    if (!contactSessionId) {
      setError("Your contact session is not ready. Please try again.");
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
        firstMessage: `হ্যালো! আমি ${brandName} থেকে বলছি। কীভাবে আপনাকে সাহায্য করতে পারি?`,
        firstMessageMode: "assistant-speaks-first",
        variableValues: {
          contactSessionId,
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
